import { describe, it, expect } from 'vitest';
import { calculateCosts, calculateRoutingFee, validatePaymentAmount } from '../src/services/payments/fees.js';

describe('calculateCosts', () => {
  it('calculates correct cost breakdown', async () => {
    const costs = await calculateCosts(0.02, 0.5, false);
    expect(costs.providerCost).toBe(0.02);
    expect(costs.routingFee).toBe(0.0001); // 0.02 × 0.5%
    expect(costs.gasCost).toBe(0.00025);
    expect(costs.totalCost).toBeCloseTo(0.02 + 0.0001 + 0.00025, 5);
    expect(costs.routingFeePct).toBe(0.5);
  });

  it('handles different fee tiers', async () => {
    const builder = await calculateCosts(1.0, 0.5, false);
    const pro = await calculateCosts(1.0, 0.4, false);
    const team = await calculateCosts(1.0, 0.3, false);

    expect(builder.routingFee).toBe(0.005);
    expect(pro.routingFee).toBe(0.004);
    expect(team.routingFee).toBe(0.003);
  });

  it('handles zero price', async () => {
    const costs = await calculateCosts(0, 0.5, false);
    expect(costs.providerCost).toBe(0);
    expect(costs.routingFee).toBe(0);
    expect(costs.totalCost).toBe(costs.gasCost);
  });

  it('handles very small prices', async () => {
    const costs = await calculateCosts(0.001, 0.5, false);
    expect(costs.routingFee).toBe(0.000005);
    expect(costs.totalCost).toBeGreaterThan(costs.providerCost);
  });

  it('handles large prices', async () => {
    const costs = await calculateCosts(100, 0.3, false);
    expect(costs.routingFee).toBe(0.3);
    expect(costs.totalCost).toBeCloseTo(100.30025, 4);
  });
});

describe('calculateRoutingFee', () => {
  it('returns correct fee', () => {
    expect(calculateRoutingFee(10, 0.5)).toBe(0.05);
    expect(calculateRoutingFee(10, 0.4)).toBe(0.04);
    expect(calculateRoutingFee(10, 0.3)).toBe(0.03);
  });

  it('handles zero', () => {
    expect(calculateRoutingFee(0, 0.5)).toBe(0);
    expect(calculateRoutingFee(10, 0)).toBe(0);
  });
});

describe('validatePaymentAmount', () => {
  it('accepts valid amounts', () => {
    expect(validatePaymentAmount(0.01).valid).toBe(true);
    expect(validatePaymentAmount(1).valid).toBe(true);
    expect(validatePaymentAmount(9999).valid).toBe(true);
  });

  it('rejects zero', () => {
    expect(validatePaymentAmount(0).valid).toBe(false);
  });

  it('rejects negative', () => {
    expect(validatePaymentAmount(-1).valid).toBe(false);
  });

  it('rejects over max', () => {
    expect(validatePaymentAmount(10001).valid).toBe(false);
  });

  it('rejects Infinity', () => {
    expect(validatePaymentAmount(Infinity).valid).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validatePaymentAmount(NaN).valid).toBe(false);
  });
});
