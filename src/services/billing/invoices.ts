import { prisma } from '../../db/client.js';
import { PLAN_PRICES_USD, OVERAGE_COST_PER_REQUEST, type PlanName } from '../../config.js';
import { calculateOverageCost } from './overage.js';

/**
 * Generate a billing summary for the current period.
 * Does NOT create a Stripe invoice — that happens via Stripe's subscription billing.
 * This creates a local record for display/reference.
 */
export async function generatePeriodSummary(
  accountId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{
  subscriptionCost: number;
  overageCount: number;
  overageCost: number;
  routingFees: number;
  totalCost: number;
  transactionCount: number;
}> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
  });

  // Subscription base cost
  const subscriptionCost = PLAN_PRICES_USD[account.plan as PlanName] ?? 0;

  // Overage from usage logs
  const usageLogs = await prisma.usageLog.findMany({
    where: {
      accountId,
      date: { gte: periodStart, lt: periodEnd },
    },
    select: { overageCount: true },
  });
  const overageCount = usageLogs.reduce((sum, l) => sum + l.overageCount, 0);
  const overageCost = calculateOverageCost(overageCount);

  // Routing fees from transactions
  const txnAgg = await prisma.transaction.aggregate({
    where: {
      accountId,
      createdAt: { gte: periodStart, lt: periodEnd },
      success: true,
    },
    _sum: { routingFee: true },
    _count: true,
  });

  const routingFees = txnAgg._sum.routingFee ?? 0;
  const transactionCount = txnAgg._count;

  return {
    subscriptionCost,
    overageCount,
    overageCost,
    routingFees: Math.round(routingFees * 1_000_000) / 1_000_000,
    totalCost:
      Math.round(
        (subscriptionCost + overageCost + routingFees) * 100
      ) / 100,
    transactionCount,
  };
}

/**
 * Create a local invoice record (mirrors Stripe invoice).
 */
export async function createInvoiceRecord(
  accountId: string,
  stripeInvoiceId: string | null,
  periodStart: Date,
  periodEnd: Date,
  subscriptionUsd: number,
  overageUsd: number,
  overageCount: number,
  routingFeesUsd: number,
  totalUsd: number,
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID' = 'DRAFT'
) {
  return prisma.invoice.create({
    data: {
      accountId,
      stripeInvoiceId,
      periodStart,
      periodEnd,
      subscriptionUsd,
      overageUsd,
      overageCount,
      routingFeesUsd,
      totalUsd,
      status,
    },
  });
}

/**
 * List invoices for an account.
 */
export async function listInvoices(
  accountId: string,
  limit = 12
): Promise<
  Array<{
    id: string;
    periodStart: Date;
    periodEnd: Date;
    subscriptionUsd: number;
    overageUsd: number;
    overageCount: number;
    routingFeesUsd: number;
    totalUsd: number;
    status: string;
    paidAt: Date | null;
    createdAt: Date;
  }>
> {
  return prisma.invoice.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Get upcoming invoice estimate.
 */
export async function getUpcomingEstimate(accountId: string) {
  const sub = await prisma.subscription.findUnique({ where: { accountId } });

  if (!sub) return null;

  const summary = await generatePeriodSummary(
    accountId,
    sub.currentPeriodStart,
    sub.currentPeriodEnd
  );

  const daysInPeriod = Math.ceil(
    (sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const daysElapsed = Math.ceil(
    (Date.now() - sub.currentPeriodStart.getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(0, daysInPeriod - daysElapsed);

  // Project overages for the rest of the period
  const dailyOverageRate =
    daysElapsed > 0 ? summary.overageCount / daysElapsed : 0;
  const projectedOverage = Math.round(
    summary.overageCount + dailyOverageRate * daysRemaining
  );
  const projectedOverageCost = calculateOverageCost(projectedOverage);

  return {
    ...summary,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
    daysRemaining,
    projectedOverageCount: projectedOverage,
    projectedOverageCost,
    projectedTotal:
      Math.round(
        (summary.subscriptionCost + projectedOverageCost + summary.routingFees) * 100
      ) / 100,
  };
}
