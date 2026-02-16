import { prisma } from '../../db/client.js';

let resetTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Reset budgets that have passed their resetAt date.
 * Runs periodically (every 5 minutes).
 */
export async function resetExpiredBudgets(): Promise<number> {
  const now = new Date();

  // Find and reset budgets past their reset date
  const expired = await prisma.budget.findMany({
    where: { resetAt: { lte: now } },
  });

  let resetCount = 0;

  for (const budget of expired) {
    let nextReset: Date;
    switch (budget.periodType) {
      case 'weekly':
        nextReset = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default: // daily
        nextReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    await prisma.budget.update({
      where: { id: budget.id },
      data: { spentUsd: 0, resetAt: nextReset },
    });

    resetCount++;
  }

  return resetCount;
}

/**
 * Start the budget reset timer.
 */
export function startBudgetResetJob(): void {
  if (resetTimer) return;

  // Run every 5 minutes
  resetTimer = setInterval(async () => {
    try {
      const count = await resetExpiredBudgets();
      if (count > 0) {
        console.log(`[Budget] Reset ${count} expired budgets`);
      }
    } catch (err) {
      console.error('[Budget] Reset job failed:', (err as Error).message);
    }
  }, 5 * 60 * 1000);

  console.log('[Budget] Reset job started (every 5 minutes)');
}

/**
 * Stop the budget reset timer.
 */
export function stopBudgetResetJob(): void {
  if (resetTimer) {
    clearInterval(resetTimer);
    resetTimer = null;
  }
}
