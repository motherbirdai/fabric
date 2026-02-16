import type Stripe from 'stripe';
import { getStripe, isStripeConfigured } from './stripe-client.js';
import { prisma } from '../../db/client.js';
import {
  STRIPE_PRICE_IDS,
  PLAN_CONFIG,
  PLAN_PRICES_USD,
  type PlanName,
} from '../../config.js';

// ─── Customer Management ───

/**
 * Get or create a Stripe customer for an account.
 */
export async function ensureStripeCustomer(accountId: string): Promise<string> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  if (account.stripeCustomerId) return account.stripeCustomerId;

  if (!isStripeConfigured()) {
    throw new Error('Stripe not configured');
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: account.email,
    metadata: {
      fabricAccountId: accountId,
      plan: account.plan,
    },
  });

  await prisma.account.update({
    where: { id: accountId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// ─── Checkout ───

/**
 * Create a Stripe Checkout session for subscribing to a plan.
 * Returns the checkout URL.
 */
export async function createCheckoutSession(
  accountId: string,
  plan: PlanName,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; sessionId: string }> {
  if (plan === 'FREE') {
    throw new Error('Cannot subscribe to FREE plan via Stripe');
  }

  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(accountId);
  const priceId = STRIPE_PRICE_IDS[plan as keyof typeof STRIPE_PRICE_IDS];

  if (!priceId) {
    throw new Error(`No Stripe price configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      fabricAccountId: accountId,
      plan,
    },
    subscription_data: {
      metadata: {
        fabricAccountId: accountId,
        plan,
      },
    },
  });

  return {
    url: session.url!,
    sessionId: session.id,
  };
}

/**
 * Create a billing portal session for self-service management.
 */
export async function createPortalSession(
  accountId: string,
  returnUrl: string
): Promise<{ url: string }> {
  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(accountId);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

// ─── Plan Changes ───

/**
 * Upgrade or downgrade a subscription.
 * Prorated by default — charges/credits the difference immediately.
 */
export async function changePlan(
  accountId: string,
  newPlan: PlanName
): Promise<{ subscription: any; prorationAmount: number }> {
  if (newPlan === 'FREE') {
    return cancelSubscription(accountId);
  }

  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  if (!account.stripeSubscriptionId) {
    throw new Error('No active subscription — use checkout to subscribe');
  }

  const stripe = getStripe();
  const priceId = STRIPE_PRICE_IDS[newPlan as keyof typeof STRIPE_PRICE_IDS];

  // Get current subscription
  const sub = await stripe.subscriptions.retrieve(account.stripeSubscriptionId);
  const currentItem = sub.items.data[0];

  if (!currentItem) {
    throw new Error('Subscription has no items');
  }

  // Preview proration
  const proration = await stripe.invoices.createPreview({
    customer: account.stripeCustomerId!,
    subscription: account.stripeSubscriptionId,
    subscription_details: {
      items: [{ id: currentItem.id, price: priceId }],
      proration_behavior: 'always_invoice',
    },
  });

  const prorationAmount = (proration.amount_due || 0) / 100;

  // Execute plan change
  const updated = await stripe.subscriptions.update(account.stripeSubscriptionId, {
    items: [{ id: currentItem.id, price: priceId }],
    proration_behavior: 'always_invoice',
    metadata: { plan: newPlan, fabricAccountId: accountId },
  });

  // Update local DB
  const planConfig = PLAN_CONFIG[newPlan];
  await prisma.account.update({
    where: { id: accountId },
    data: {
      plan: newPlan,
      dailyLimit: planConfig.dailyLimit,
      routingFeePct: planConfig.routingFeePct,
    },
  });

  await prisma.subscription.update({
    where: { accountId },
    data: {
      plan: newPlan,
      stripePriceId: priceId,
    },
  });

  return { subscription: updated, prorationAmount };
}

/**
 * Cancel a subscription at period end.
 */
export async function cancelSubscription(
  accountId: string
): Promise<{ subscription: any; prorationAmount: number }> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  if (!account.stripeSubscriptionId) {
    throw new Error('No active subscription');
  }

  const stripe = getStripe();

  const updated = await stripe.subscriptions.update(account.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  await prisma.subscription.update({
    where: { accountId },
    data: { cancelAtPeriodEnd: true },
  });

  return { subscription: updated, prorationAmount: 0 };
}

/**
 * Reactivate a subscription that was set to cancel at period end.
 */
export async function reactivateSubscription(
  accountId: string
): Promise<{ subscription: any }> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  if (!account.stripeSubscriptionId) {
    throw new Error('No subscription to reactivate');
  }

  const stripe = getStripe();

  const updated = await stripe.subscriptions.update(account.stripeSubscriptionId, {
    cancel_at_period_end: false,
  });

  await prisma.subscription.update({
    where: { accountId },
    data: { cancelAtPeriodEnd: false },
  });

  return { subscription: updated };
}

// ─── Queries ───

/**
 * Get subscription details for an account.
 */
export async function getSubscription(accountId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { accountId },
  });

  if (!sub) return null;

  return {
    id: sub.id,
    plan: sub.plan,
    status: sub.status,
    currentPeriodStart: sub.currentPeriodStart,
    currentPeriodEnd: sub.currentPeriodEnd,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    trialEnd: sub.trialEnd,
    overageEnabled: sub.overageEnabled,
  };
}
