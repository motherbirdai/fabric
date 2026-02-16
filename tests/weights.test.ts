import { describe, it, expect } from 'vitest';
import { DEFAULT_WEIGHTS, normaliseWeights } from '../src/services/trust/weights.js';

describe('DEFAULT_WEIGHTS', () => {
  it('sums to 1.0', () => {
    const sum = Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it('has all positive values', () => {
    for (const [key, value] of Object.entries(DEFAULT_WEIGHTS)) {
      expect(value).toBeGreaterThan(0);
    }
  });
});

describe('normaliseWeights', () => {
  it('merges partial overrides with defaults', () => {
    const result = normaliseWeights({ successRate: 0.5 });
    expect(result.successRate).toBe(0.5);
    expect(result.latency).toBe(DEFAULT_WEIGHTS.latency); // unchanged
  });

  it('clamps negative values to 0', () => {
    const result = normaliseWeights({ latency: -1 });
    expect(result.latency).toBe(0);
  });

  it('preserves valid custom weights', () => {
    const custom = {
      successRate: 0.4,
      latency: 0.3,
      uptime: 0.1,
      feedback: 0.1,
      onChainRep: 0.05,
      longevity: 0.025,
      volumeConsistency: 0.025,
    };
    const result = normaliseWeights(custom);
    expect(result).toEqual(custom);
  });

  it('returns defaults when given empty object', () => {
    const result = normaliseWeights({});
    expect(result).toEqual(DEFAULT_WEIGHTS);
  });
});
