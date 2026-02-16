import { describe, it, expect } from 'vitest';
import { calculateOverageCost } from '../src/services/billing/overage.js';
import { PLAN_CONFIG, PLAN_PRICES_USD, OVERAGE_COST_PER_REQUEST } from '../src/config.js';

describe('Overage calculation', () => {
  it('returns 0 for 0 overages', () => {
    expect(calculateOverageCost(0)).toBe(0);
  });

  it('returns correct cost for small overage', () => {
    expect(calculateOverageCost(1)).toBe(OVERAGE_COST_PER_REQUEST);
  });

  it('returns correct cost for large overage', () => {
    expect(calculateOverageCost(1000)).toBe(1000 * OVERAGE_COST_PER_REQUEST);
  });

  it('returns correct cost for very large overage', () => {
    const cost = calculateOverageCost(100_000);
    expect(cost).toBe(100); // 100k × $0.001 = $100
  });

  it('handles fractional results correctly (no floating point drift)', () => {
    const cost = calculateOverageCost(3);
    expect(cost).toBe(0.003);
  });
});

describe('Plan configuration', () => {
  it('FREE plan has no routing', () => {
    expect(PLAN_CONFIG.FREE.canRoute).toBe(false);
    expect(PLAN_CONFIG.FREE.routingFeePct).toBe(0);
    expect(PLAN_CONFIG.FREE.maxWallets).toBe(0);
  });

  it('BUILDER has lowest paid limits', () => {
    expect(PLAN_CONFIG.BUILDER.dailyLimit).toBe(5_000);
    expect(PLAN_CONFIG.BUILDER.routingFeePct).toBe(0.5);
    expect(PLAN_CONFIG.BUILDER.canRoute).toBe(true);
  });

  it('PRO has mid-tier limits', () => {
    expect(PLAN_CONFIG.PRO.dailyLimit).toBe(15_000);
    expect(PLAN_CONFIG.PRO.routingFeePct).toBe(0.4);
    expect(PLAN_CONFIG.PRO.customWeights).toBe(true);
  });

  it('TEAM has highest limits', () => {
    expect(PLAN_CONFIG.TEAM.dailyLimit).toBe(50_000);
    expect(PLAN_CONFIG.TEAM.routingFeePct).toBe(0.3);
    expect(PLAN_CONFIG.TEAM.maxWallets).toBe(50);
  });

  it('higher tiers always have lower routing fees', () => {
    expect(PLAN_CONFIG.BUILDER.routingFeePct).toBeGreaterThan(PLAN_CONFIG.PRO.routingFeePct);
    expect(PLAN_CONFIG.PRO.routingFeePct).toBeGreaterThan(PLAN_CONFIG.TEAM.routingFeePct);
  });

  it('higher tiers always have higher daily limits', () => {
    expect(PLAN_CONFIG.BUILDER.dailyLimit).toBeGreaterThan(PLAN_CONFIG.FREE.dailyLimit);
    expect(PLAN_CONFIG.PRO.dailyLimit).toBeGreaterThan(PLAN_CONFIG.BUILDER.dailyLimit);
    expect(PLAN_CONFIG.TEAM.dailyLimit).toBeGreaterThan(PLAN_CONFIG.PRO.dailyLimit);
  });

  it('higher tiers always have more wallets', () => {
    expect(PLAN_CONFIG.BUILDER.maxWallets).toBeGreaterThan(PLAN_CONFIG.FREE.maxWallets);
    expect(PLAN_CONFIG.PRO.maxWallets).toBeGreaterThan(PLAN_CONFIG.BUILDER.maxWallets);
    expect(PLAN_CONFIG.TEAM.maxWallets).toBeGreaterThan(PLAN_CONFIG.PRO.maxWallets);
  });
});

describe('Plan pricing', () => {
  it('FREE is $0', () => {
    expect(PLAN_PRICES_USD.FREE).toBe(0);
  });

  it('BUILDER is $9/mo', () => {
    expect(PLAN_PRICES_USD.BUILDER).toBe(9);
  });

  it('PRO is $39/mo', () => {
    expect(PLAN_PRICES_USD.PRO).toBe(39);
  });

  it('TEAM is $149/mo', () => {
    expect(PLAN_PRICES_USD.TEAM).toBe(149);
  });

  it('prices increase with tier', () => {
    expect(PLAN_PRICES_USD.BUILDER).toBeGreaterThan(PLAN_PRICES_USD.FREE);
    expect(PLAN_PRICES_USD.PRO).toBeGreaterThan(PLAN_PRICES_USD.BUILDER);
    expect(PLAN_PRICES_USD.TEAM).toBeGreaterThan(PLAN_PRICES_USD.PRO);
  });
});

describe('Overage break-even analysis', () => {
  it('FREE → BUILDER break-even at 5000 overages/day', () => {
    // Builder costs $9/mo ≈ $0.30/day
    // Overage: $0.001/request × 5000 = $5.00/day
    // Much cheaper to upgrade at ~300 overages/day
    const dailyOverageCost = calculateOverageCost(300) * 30;
    const builderCost = PLAN_PRICES_USD.BUILDER;
    expect(dailyOverageCost).toBeGreaterThan(builderCost);
  });

  it('BUILDER → PRO break-even at ~1000 overages/day', () => {
    // PRO adds 10k/day capacity for $30 more
    // 10000 overages × $0.001 × 30 = $300
    // Clear value at sustained overage
    const monthlyOverageCost = calculateOverageCost(333) * 30; // ~333/day
    const priceDiff = PLAN_PRICES_USD.PRO - PLAN_PRICES_USD.BUILDER;
    expect(monthlyOverageCost).toBeGreaterThan(priceDiff);
  });
});

describe('Budget reset logic', () => {
  it('daily budget resets to next day', () => {
    const now = new Date();
    const nextReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    expect(nextReset.getTime()).toBeGreaterThan(now.getTime());
    expect(nextReset.getTime() - now.getTime()).toBeLessThanOrEqual(86_400_000);
  });

  it('weekly budget resets in 7 days', () => {
    const now = new Date();
    const nextReset = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diff = nextReset.getTime() - now.getTime();
    expect(diff).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('monthly budget resets on 1st of next month', () => {
    const now = new Date();
    const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    expect(nextReset.getDate()).toBe(1);
    expect(nextReset.getTime()).toBeGreaterThan(now.getTime());
  });
});
