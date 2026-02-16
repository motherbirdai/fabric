import { describe, it, expect } from 'vitest';
import {
  PLAN_CONFIG,
  PLAN_PRICES_USD,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  OVERAGE_COST_PER_REQUEST,
  ESTIMATED_GAS_USD,
  GAS_BUFFER_MULTIPLIER,
} from '../src/config.js';

describe('Production config validation', () => {
  it('all plan tiers have required fields', () => {
    const required = ['dailyLimit', 'routingFeePct', 'canRoute', 'canBudget', 'canFeedback', 'canFavorites', 'maxWallets', 'customWeights'];
    for (const [plan, config] of Object.entries(PLAN_CONFIG)) {
      for (const field of required) {
        expect(config).toHaveProperty(field);
      }
    }
  });

  it('plan daily limits are positive', () => {
    for (const [plan, config] of Object.entries(PLAN_CONFIG)) {
      expect(config.dailyLimit).toBeGreaterThan(0);
    }
  });

  it('routing fee percentages are within 0-10%', () => {
    for (const [plan, config] of Object.entries(PLAN_CONFIG)) {
      expect(config.routingFeePct).toBeGreaterThanOrEqual(0);
      expect(config.routingFeePct).toBeLessThanOrEqual(10);
    }
  });

  it('plan prices are non-negative', () => {
    for (const [plan, price] of Object.entries(PLAN_PRICES_USD)) {
      expect(price).toBeGreaterThanOrEqual(0);
    }
  });

  it('rate limit window is reasonable (10s - 5min)', () => {
    expect(RATE_LIMIT_WINDOW).toBeGreaterThanOrEqual(10_000);
    expect(RATE_LIMIT_WINDOW).toBeLessThanOrEqual(300_000);
  });

  it('rate limit max is reasonable (10 - 10000)', () => {
    expect(RATE_LIMIT_MAX).toBeGreaterThanOrEqual(10);
    expect(RATE_LIMIT_MAX).toBeLessThanOrEqual(10_000);
  });

  it('overage cost is reasonable ($0.0001 - $1)', () => {
    expect(OVERAGE_COST_PER_REQUEST).toBeGreaterThan(0.0001);
    expect(OVERAGE_COST_PER_REQUEST).toBeLessThan(1);
  });

  it('gas estimates are reasonable', () => {
    expect(ESTIMATED_GAS_USD).toBeGreaterThan(0);
    expect(ESTIMATED_GAS_USD).toBeLessThan(1);
    expect(GAS_BUFFER_MULTIPLIER).toBeGreaterThanOrEqual(1);
    expect(GAS_BUFFER_MULTIPLIER).toBeLessThanOrEqual(3);
  });
});

describe('Security constraints', () => {
  it('FREE plan cannot route', () => {
    expect(PLAN_CONFIG.FREE.canRoute).toBe(false);
  });

  it('FREE plan has no wallets', () => {
    expect(PLAN_CONFIG.FREE.maxWallets).toBe(0);
  });

  it('FREE plan has no custom weights', () => {
    expect(PLAN_CONFIG.FREE.customWeights).toBe(false);
  });

  it('all paid plans can route', () => {
    expect(PLAN_CONFIG.BUILDER.canRoute).toBe(true);
    expect(PLAN_CONFIG.PRO.canRoute).toBe(true);
    expect(PLAN_CONFIG.TEAM.canRoute).toBe(true);
  });

  it('wallet limits scale with plan', () => {
    expect(PLAN_CONFIG.BUILDER.maxWallets).toBeLessThan(PLAN_CONFIG.PRO.maxWallets);
    expect(PLAN_CONFIG.PRO.maxWallets).toBeLessThan(PLAN_CONFIG.TEAM.maxWallets);
  });
});

describe('Tier economics', () => {
  it('cost per request decreases with tier', () => {
    const builderCostPerReq = PLAN_PRICES_USD.BUILDER / PLAN_CONFIG.BUILDER.dailyLimit / 30;
    const proCostPerReq = PLAN_PRICES_USD.PRO / PLAN_CONFIG.PRO.dailyLimit / 30;
    const teamCostPerReq = PLAN_PRICES_USD.TEAM / PLAN_CONFIG.TEAM.dailyLimit / 30;

    expect(proCostPerReq).toBeLessThan(builderCostPerReq);
    expect(teamCostPerReq).toBeLessThan(proCostPerReq);
  });

  it('overage is always more expensive than upgrading at high volume', () => {
    // At BUILDER limit + 1000 overages/day for 30 days
    const overageCost = 1000 * OVERAGE_COST_PER_REQUEST * 30;
    const upgradeCost = PLAN_PRICES_USD.PRO - PLAN_PRICES_USD.BUILDER;

    // Upgrading should be cheaper
    expect(upgradeCost).toBeLessThan(overageCost);
  });
});
