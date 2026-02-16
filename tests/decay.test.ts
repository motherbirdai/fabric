import { describe, it, expect } from 'vitest';
import { applyDecay, decayedFeedbackAvg } from '../src/services/trust/decay.js';

describe('applyDecay', () => {
  it('returns full score for feedback < 90 days old', () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    expect(applyDecay(5, recent)).toBe(5);
  });

  it('returns 50% for feedback 90–180 days old', () => {
    const d = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000);
    expect(applyDecay(4, d)).toBe(2);
  });

  it('returns 20% for feedback > 180 days old', () => {
    const d = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    expect(applyDecay(5, d)).toBe(1);
  });

  it('boundary: exactly 90 days returns full (≤ 90)', () => {
    const d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(applyDecay(4, d)).toBe(4);
  });

  it('boundary: exactly 180 days returns 50% (≤ 180)', () => {
    const d = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    expect(applyDecay(4, d)).toBe(2);
  });
});

describe('decayedFeedbackAvg', () => {
  it('returns 0 for empty feedback', () => {
    expect(decayedFeedbackAvg([])).toBe(0);
  });

  it('returns exact score for single recent feedback', () => {
    const result = decayedFeedbackAvg([
      { score: 4, createdAt: new Date() },
    ]);
    expect(result).toBe(4);
  });

  it('averages multiple recent entries equally', () => {
    const now = new Date();
    const result = decayedFeedbackAvg([
      { score: 5, createdAt: now },
      { score: 3, createdAt: now },
    ]);
    expect(result).toBe(4);
  });

  it('weights recent feedback more than old', () => {
    const recent = new Date();
    const old = new Date(Date.now() - 150 * 24 * 60 * 60 * 1000); // 150d → 0.5×

    // Recent 5, old 1
    const result = decayedFeedbackAvg([
      { score: 5, createdAt: recent },
      { score: 1, createdAt: old },
    ]);

    // (5×1.0 + 1×0.5) / (1.0 + 0.5) = 5.5 / 1.5 ≈ 3.67
    expect(result).toBeCloseTo(3.667, 1);
  });

  it('heavily discounts very old feedback', () => {
    const recent = new Date();
    const veryOld = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 365d → 0.2×

    const result = decayedFeedbackAvg([
      { score: 5, createdAt: recent },  // weight 1.0
      { score: 1, createdAt: veryOld }, // weight 0.2
    ]);

    // (5×1.0 + 1×0.2) / (1.0 + 0.2) = 5.2 / 1.2 ≈ 4.33
    expect(result).toBeCloseTo(4.333, 1);
  });

  it('all-old feedback still returns a value', () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    const result = decayedFeedbackAvg([
      { score: 3, createdAt: old },
      { score: 4, createdAt: old },
    ]);

    // Both at 0.2×: (3×0.2 + 4×0.2) / (0.2 + 0.2) = 1.4 / 0.4 = 3.5
    expect(result).toBe(3.5);
  });
});
