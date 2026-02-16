import { getStripe, isStripeConfigured } from './stripe-client.js';
import { prisma } from '../../db/client.js';
import {
  OVERAGE_COST_PER_REQUEST,
  STRIPE_OVERAGE_PRICE_ID,
  PLAN_CONFIG,
  type PlanName,
} from '../../config.js';
import { redis } from '../cache/redis.js';

const OVERAGE_KEY_PREFIX = 'overage:daily:';

/**
 * Check if a request is an overage and track it.
 * Returns true if the request is within the plan limit, false if overage.
 */
export async function checkAndTrackOverage(
  accountId: string,
  plan: PlanName,
  currentCount: number
): Promise<{ allowed: boolean; isOverage: boolean; overageCount: number }> {
  const planConfig = PLAN_CONFIG[plan];
  const isOverage = currentCount > planConfig.dailyLimit;

  if (!isOverage) {
    return { allowed: true, isOverage: false, overageCount: 0 };
  }

  // Track daily overage count
  const today = new Date().toISOString().split('T')[0];
  const key = `${OVERAGE_KEY_PREFIX}${accountId}:${today}`;

  const count = await redis.incr(key);
  if (count === 1) {
    // Set expiry for 48 hours (safety buffer past midnight)
    await redis.expire(key, 172800);
  }

  // Check if account has an active subscription with overage enabled
  const sub = await prisma.subscription.findUnique({
    where: { accountId },
  });

  if (!sub || !sub.overageEnabled || sub.status !== 'ACTIVE') {
    return { allowed: false, isOverage: true, overageCount: count };
  }

  // Allowed via overage — will be billed
  return { allowed: true, isOverage: true, overageCount: count };
}

/**
 * Get overage count for an account today.
 */
export async function getDailyOverageCount(accountId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const key = `${OVERAGE_KEY_PREFIX}${accountId}:${today}`;
  const count = await redis.get(key);
  return count ? parseInt(count, 10) : 0;
}

/**
 * Report overage usage to Stripe for metered billing.
 * Called periodically (e.g. every hour or at end of day).
 */
export async function reportOverageToStripe(
  accountId: string,
  overageCount: number
): Promise<{ reported: boolean; usageRecordId?: string }> {
  if (!isStripeConfigured() || overageCount === 0) {
    return { reported: false };
  }

  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { stripeSubscriptionId: true },
  });

  if (!account?.stripeSubscriptionId) {
    return { reported: false };
  }

  const stripe = getStripe();

  try {
    // Get the subscription item for the overage price
    const sub = await stripe.subscriptions.retrieve(account.stripeSubscriptionId);
    const overageItem = sub.items.data.find(
      (item) => item.price.id === STRIPE_OVERAGE_PRICE_ID
    );

    if (!overageItem) {
      // Add overage line item to subscription
      const newItem = await stripe.subscriptionItems.create({
        subscription: account.stripeSubscriptionId,
        price: STRIPE_OVERAGE_PRICE_ID,
      });

      // Report usage
      const record = await stripe.subscriptionItems.createUsageRecord(newItem.id, {
        quantity: overageCount,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      });

      return { reported: true, usageRecordId: record.id };
    }

    // Report usage against existing item
    const record = await stripe.subscriptionItems.createUsageRecord(overageItem.id, {
      quantity: overageCount,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    });

    return { reported: true, usageRecordId: record.id };
  } catch (err) {
    console.error('[Overage] Stripe reporting failed:', (err as Error).message);
    return { reported: false };
  }
}

/**
 * Calculate overage cost for a period.
 */
export function calculateOverageCost(overageCount: number): number {
  return Math.round(overageCount * OVERAGE_COST_PER_REQUEST * 1_000_000) / 1_000_000;
}

/**
 * Get overage summary for the current billing period.
 */
export async function getOverageSummary(accountId: string): Promise<{
  dailyLimit: number;
  todayTotal: number;
  todayOverage: number;
  overageCost: number;
  periodOverageTotal: number;
  periodOverageCost: number;
}> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  const planConfig = PLAN_CONFIG[account.plan as PlanName];
  const todayOverage = await getDailyOverageCount(accountId);

  // Get today's total from usage log
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const usageLog = await prisma.usageLog.findUnique({
    where: { accountId_date: { accountId, date: today } },
  });

  const todayTotal = usageLog?.requestCount ?? 0;

  // Get period overage total from usage logs
  const sub = await prisma.subscription.findUnique({ where: { accountId } });
  const periodStart = sub?.currentPeriodStart ?? today;

  const periodLogs = await prisma.usageLog.findMany({
    where: { accountId, date: { gte: periodStart } },
    select: { overageCount: true },
  });

  const periodOverageTotal = periodLogs.reduce((sum, l) => sum + l.overageCount, 0);

  return {
    dailyLimit: planConfig.dailyLimit,
    todayTotal,
    todayOverage: todayOverage,
    overageCost: calculateOverageCost(todayOverage),
    periodOverageTotal,
    periodOverageCost: calculateOverageCost(periodOverageTotal),
  };
}
