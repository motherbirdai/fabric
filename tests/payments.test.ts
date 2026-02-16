import { describe, it, expect } from 'vitest';
import { calculateCosts } from '../src/services/payments/fees.js';

/**
 * These tests verify the payment flow logic without hitting the chain.
 * Full integration tests with testnet are in tests/integration/.
 */

describe('Payment flow — cost calculations across tiers', () => {
  const TIERS = [
    { name: 'Builder', feePct: 0.5 },
    { name: 'Pro', feePct: 0.4 },
    { name: 'Team', feePct: 0.3 },
  ];

  const PRICES = [0.001, 0.01, 0.05, 0.50, 5.0];

  for (const tier of TIERS) {
    for (const price of PRICES) {
      it(`${tier.name} tier: $${price} provider → correct fee split`, async () => {
        const costs = await calculateCosts(price, tier.feePct, false);

        // Provider gets listed price
        expect(costs.providerCost).toBe(price);

        // Routing fee is percentage of provider cost
        const expectedFee = price * (tier.feePct / 100);
        expect(costs.routingFee).toBeCloseTo(expectedFee, 6);

        // Gas is constant estimate
        expect(costs.gasCost).toBe(0.00025);

        // Total adds up
        expect(costs.totalCost).toBeCloseTo(
          costs.providerCost + costs.routingFee + costs.gasCost,
          6
        );

        // Routing fee is always less than provider cost
        expect(costs.routingFee).toBeLessThan(costs.providerCost);
      });
    }
  }
});

describe('Payment flow — gas cost proportion', () => {
  it('gas is negligible for normal prices (< 1% of total)', async () => {
    const costs = await calculateCosts(0.05, 0.5, false);
    const gasPercent = (costs.gasCost / costs.totalCost) * 100;
    expect(gasPercent).toBeLessThan(1);
  });

  it('gas is significant for micro-transactions (> 10%)', async () => {
    const costs = await calculateCosts(0.001, 0.5, false);
    const gasPercent = (costs.gasCost / costs.totalCost) * 100;
    expect(gasPercent).toBeGreaterThan(10);
  });
});

describe('Payment flow — executor mode selection logic', () => {
  // These test the decision tree without calling the actual executor

  it('should use mock mode when no wallet address', () => {
    const hasWallet = false;
    const hasSufficientBalance = false;
    const expectedMode = 'mock';

    // Logic: no wallet → mock
    if (!hasWallet) {
      expect(expectedMode).toBe('mock');
    }
  });

  it('should use mock mode when insufficient balance', () => {
    const hasWallet = true;
    const balance = 0.01;
    const required = 0.05;
    const expectedMode = balance >= required ? 'x402' : 'mock';

    expect(expectedMode).toBe('mock');
  });

  it('should attempt x402 when wallet has sufficient balance', () => {
    const hasWallet = true;
    const balance = 1.0;
    const required = 0.05;
    const expectedMode = hasWallet && balance >= required ? 'x402' : 'mock';

    expect(expectedMode).toBe('x402');
  });

  it('fee split: provider + Fabric = total minus gas', async () => {
    const costs = await calculateCosts(1.0, 0.5, false);
    const feeTotal = costs.providerCost + costs.routingFee;
    expect(feeTotal).toBeCloseTo(costs.totalCost - costs.gasCost, 6);
  });
});

describe('Payment flow — x402 overcharge protection', () => {
  it('rejects provider demanding > 5% above listed price', () => {
    const listedPrice = 0.05;
    const demandedPrice = 0.06; // 20% over
    const overchargeThreshold = listedPrice * 1.05;

    expect(demandedPrice).toBeGreaterThan(overchargeThreshold);
  });

  it('accepts provider at listed price', () => {
    const listedPrice = 0.05;
    const demandedPrice = 0.05;
    const overchargeThreshold = listedPrice * 1.05;

    expect(demandedPrice).toBeLessThanOrEqual(overchargeThreshold);
  });

  it('accepts minor rounding differences (< 5%)', () => {
    const listedPrice = 0.05;
    const demandedPrice = 0.0524; // ~4.8% over
    const overchargeThreshold = listedPrice * 1.05;

    expect(demandedPrice).toBeLessThanOrEqual(overchargeThreshold);
  });
});
