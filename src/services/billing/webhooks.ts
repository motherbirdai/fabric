import type Stripe from 'stripe';
import { getStripe } from './stripe-client.js';
import { prisma } from '../../db/client.js';
import { PLAN_CONFIG, PLAN_PRICES_USD, type PlanName } from '../../config.js';
import { createInvoiceRecord } from './invoices.js';
import { increment } from '../../utils/metrics.js';

type StripeEvent = Stripe.Event;

/**
 * Process a Stripe webhook event.
 * Returns the event type for logging.
 */
export async function handleWebhookEvent(event: StripeEvent): Promise<string> {
  increment('stripe.webhooks');
  increment(`stripe.event.${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpsert(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case 'invoice.paid':
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Unhandled event type — ignore
      break;
  }

  return event.type;
}

// ─── Handlers ───

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const accountId = session.metadata?.fabricAccountId;
  const plan = session.metadata?.plan as PlanName | undefined;

  if (!accountId || !plan) return;

  // Update account with Stripe IDs
  await prisma.account.update({
    where: { id: accountId },
    data: {
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      plan,
      dailyLimit: PLAN_CONFIG[plan].dailyLimit,
      routingFeePct: PLAN_CONFIG[plan].routingFeePct,
    },
  });
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const accountId = sub.metadata?.fabricAccountId;
  if (!accountId) return;

  const plan = (sub.metadata?.plan as PlanName) || 'BUILDER';
  const priceId = sub.items.data[0]?.price.id || '';

  // Map Stripe status to our enum
  const statusMap: Record<string, string> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    trialing: 'TRIALING',
    incomplete: 'INCOMPLETE',
    paused: 'PAUSED',
  };

  const status = (statusMap[sub.status] || 'ACTIVE') as any;

  await prisma.subscription.upsert({
    where: { accountId },
    update: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
    create: {
      accountId,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
      plan,
      status,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
    },
  });

  // Update account plan
  if (status === 'ACTIVE' || status === 'TRIALING') {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        plan,
        dailyLimit: PLAN_CONFIG[plan].dailyLimit,
        routingFeePct: PLAN_CONFIG[plan].routingFeePct,
        stripeSubscriptionId: sub.id,
      },
    });
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const accountId = sub.metadata?.fabricAccountId;
  if (!accountId) return;

  // Downgrade to FREE
  await prisma.account.update({
    where: { id: accountId },
    data: {
      plan: 'FREE',
      dailyLimit: PLAN_CONFIG.FREE.dailyLimit,
      routingFeePct: PLAN_CONFIG.FREE.routingFeePct,
      stripeSubscriptionId: null,
    },
  });

  await prisma.subscription.update({
    where: { accountId },
    data: { status: 'CANCELED' },
  }).catch(() => {});
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  // Find account by subscription ID
  const account = await prisma.account.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!account) return;

  const periodStart = new Date((invoice.period_start || 0) * 1000);
  const periodEnd = new Date((invoice.period_end || 0) * 1000);

  // Break down invoice lines
  let subscriptionUsd = 0;
  let overageUsd = 0;
  let overageCount = 0;

  if (invoice.lines?.data) {
    for (const line of invoice.lines.data) {
      if (line.price?.recurring) {
        subscriptionUsd += (line.amount || 0) / 100;
      } else {
        overageUsd += (line.amount || 0) / 100;
        overageCount += line.quantity || 0;
      }
    }
  }

  const totalUsd = (invoice.amount_paid || 0) / 100;
  const routingFeesUsd = Math.max(0, totalUsd - subscriptionUsd - overageUsd);

  await createInvoiceRecord(
    account.id,
    invoice.id,
    periodStart,
    periodEnd,
    subscriptionUsd,
    overageUsd,
    overageCount,
    routingFeesUsd,
    totalUsd,
    'PAID'
  );

  // Update existing draft invoice if present
  if (invoice.id) {
    await prisma.invoice.updateMany({
      where: { stripeInvoiceId: invoice.id, status: { not: 'PAID' } },
      data: { status: 'PAID', paidAt: new Date() },
    }).catch(() => {});
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const account = await prisma.account.findFirst({
    where: { stripeSubscriptionId: invoice.subscription as string },
  });

  if (!account) return;

  // Mark subscription as past due
  await prisma.subscription.update({
    where: { accountId: account.id },
    data: { status: 'PAST_DUE' },
  }).catch(() => {});

  console.warn(
    `[Billing] Payment failed for account ${account.id} (${account.email})`
  );
}
