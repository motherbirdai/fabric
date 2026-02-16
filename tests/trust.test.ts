import { describe, it, expect } from 'vitest';
import { computeTrustScore, type TrustBreakdown } from '../src/services/trust/scorer.js';
import { DEFAULT_WEIGHTS, normaliseWeights } from '../src/services/trust/weights.js';

// ─── Helper: create a provider with defaults ───
function makeProvider(overrides: Partial<Parameters<typeof computeTrustScore>[0]> = {}) {
  return {
    trustScore: 4.5,
    successRate: 0.99,
    avgLatencyMs: 1000,
    uptimePercent: 99.5,
    totalRequests: 50000,
    lastSeen: new Date(),
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
    ...overrides,
  };
}

describe('computeTrustScore', () => {
  it('returns a score between 0 and 5', () => {
    const result = computeTrustScore(makeProvider());
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(5);
  });

  it('returns all 7 signal breakdowns', () => {
    const result = computeTrustScore(makeProvider());
    const keys = Object.keys(result.signals);
    expect(keys).toContain('successRate');
    expect(keys).toContain('latency');
    expect(keys).toContain('uptime');
    expect(keys).toContain('feedback');
    expect(keys).toContain('onChainRep');
    expect(keys).toContain('longevity');
    expect(keys).toContain('volumeConsistency');
    expect(keys.length).toBe(7);
  });

  it('gives high score to excellent provider', () => {
    const result = computeTrustScore(
      makeProvider({
        successRate: 0.999,
        avgLatencyMs: 200,
        uptimePercent: 99.99,
        totalRequests: 100000,
      }),
      DEFAULT_WEIGHTS,
      4.8 // excellent feedback
    );
    expect(result.total).toBeGreaterThan(4.0);
    expect(result.penalties).toHaveLength(0);
  });

  it('gives low score to poor provider', () => {
    const result = computeTrustScore(
      makeProvider({
        successRate: 0.5,
        avgLatencyMs: 4500,
        uptimePercent: 80,
        totalRequests: 100,
        trustScore: 1.5,
      }),
      DEFAULT_WEIGHTS,
      1.5 // bad feedback
    );
    expect(result.total).toBeLessThan(2.5);
  });

  // ─── Penalties ───

  it('applies new provider penalty for < 10 txns', () => {
    const result = computeTrustScore(makeProvider({ totalRequests: 5 }));
    expect(result.penalties).toHaveLength(1);
    expect(result.penalties[0]).toContain('new_provider');
    expect(result.penalties[0]).toContain('0.8×');

    // Compare with same provider but enough txns
    const nopenalty = computeTrustScore(makeProvider({ totalRequests: 10 }));
    expect(nopenalty.total).toBeGreaterThan(result.total);
  });

  it('applies inactive penalty for > 7d since last seen', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore(makeProvider({ lastSeen: tenDaysAgo }));
    expect(result.penalties.some((p) => p.includes('inactive'))).toBe(true);
  });

  it('does NOT apply inactive penalty for recent providers', () => {
    const result = computeTrustScore(makeProvider({ lastSeen: new Date() }));
    expect(result.penalties.some((p) => p.includes('inactive'))).toBe(false);
  });

  it('stacks both penalties when applicable', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore(
      makeProvider({ totalRequests: 3, lastSeen: tenDaysAgo })
    );
    expect(result.penalties).toHaveLength(2);
    // Combined penalty: 0.8 × 0.7 = 0.56×
    const noPenalty = computeTrustScore(
      makeProvider({ totalRequests: 1000, lastSeen: new Date() })
    );
    expect(result.total).toBeLessThan(noPenalty.total * 0.6);
  });

  // ─── Signal weighting ───

  it('successRate has highest weight by default', () => {
    const result = computeTrustScore(makeProvider());
    const sr = result.signals.successRate;
    const others = Object.entries(result.signals).filter(([k]) => k !== 'successRate');
    for (const [, signal] of others) {
      expect(sr.weight).toBeGreaterThanOrEqual(signal.weight);
    }
  });

  it('respects custom weights', () => {
    // Make latency the dominant signal
    const latencyFirst = normaliseWeights({
      latency: 0.8,
      successRate: 0.05,
      uptime: 0.05,
      feedback: 0.05,
      onChainRep: 0.025,
      longevity: 0.0125,
      volumeConsistency: 0.0125,
    });

    // Fast provider with bad success rate
    const fast = computeTrustScore(
      makeProvider({ avgLatencyMs: 100, successRate: 0.7 }),
      latencyFirst
    );

    // Slow provider with great success rate
    const reliable = computeTrustScore(
      makeProvider({ avgLatencyMs: 4000, successRate: 0.999 }),
      latencyFirst
    );

    // With latency-heavy weights, fast should win
    expect(fast.total).toBeGreaterThan(reliable.total);
  });

  // ─── Normalisation edge cases ───

  it('handles 0ms latency (perfect score)', () => {
    const result = computeTrustScore(makeProvider({ avgLatencyMs: 0 }));
    expect(result.signals.latency.raw).toBe(1);
  });

  it('handles extremely high latency', () => {
    const result = computeTrustScore(makeProvider({ avgLatencyMs: 10000 }));
    expect(result.signals.latency.raw).toBe(0);
  });

  it('clamps success rate to 0-1', () => {
    const result = computeTrustScore(makeProvider({ successRate: 1.5 }));
    expect(result.signals.successRate.raw).toBe(1);

    const low = computeTrustScore(makeProvider({ successRate: -0.5 }));
    expect(low.signals.successRate.raw).toBe(0);
  });

  it('handles brand-new provider (createdAt = now)', () => {
    const result = computeTrustScore(makeProvider({ createdAt: new Date() }));
    expect(result.signals.longevity.raw).toBeCloseTo(0, 1);
  });

  it('caps longevity at 1 year', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
    const result = computeTrustScore(makeProvider({ createdAt: twoYearsAgo }));
    expect(result.signals.longevity.raw).toBe(1);
  });

  // ─── Feedback integration ───

  it('uses provided feedback average when given', () => {
    const withFb = computeTrustScore(makeProvider(), DEFAULT_WEIGHTS, 5.0);
    const lowFb = computeTrustScore(makeProvider(), DEFAULT_WEIGHTS, 1.0);
    expect(withFb.total).toBeGreaterThan(lowFb.total);
  });

  it('defaults to neutral (0.5) when no feedback provided', () => {
    const result = computeTrustScore(makeProvider());
    expect(result.signals.feedback.raw).toBe(0.5);
  });

  it('handles feedback at boundaries (1 and 5)', () => {
    const low = computeTrustScore(makeProvider(), DEFAULT_WEIGHTS, 1.0);
    expect(low.signals.feedback.raw).toBe(0); // (1-1)/4

    const high = computeTrustScore(makeProvider(), DEFAULT_WEIGHTS, 5.0);
    expect(high.signals.feedback.raw).toBe(1); // (5-1)/4
  });

  // ─── Null / missing lastSeen ───

  it('does not apply inactive penalty when lastSeen is null', () => {
    const result = computeTrustScore(makeProvider({ lastSeen: null }));
    expect(result.penalties.some((p) => p.includes('inactive'))).toBe(false);
  });
});
