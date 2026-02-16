import { describe, it, expect } from 'vitest';
import { computeTrustScore } from '../src/services/trust/scorer.js';
import { DEFAULT_WEIGHTS, normaliseWeights } from '../src/services/trust/weights.js';

// ─── Helper ───
function makeProvider(overrides: Record<string, any> = {}) {
  return {
    trustScore: 4.0,
    successRate: 0.95,
    avgLatencyMs: 1000,
    uptimePercent: 99.0,
    totalRequests: 5000,
    lastSeen: new Date(),
    createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    ...overrides,
  };
}

describe('Provider ranking by trust score', () => {
  it('ranks high success rate above low', () => {
    const good = computeTrustScore(makeProvider({ successRate: 0.999 }));
    const bad = computeTrustScore(makeProvider({ successRate: 0.8 }));
    expect(good.total).toBeGreaterThan(bad.total);
  });

  it('ranks low latency above high', () => {
    const fast = computeTrustScore(makeProvider({ avgLatencyMs: 100 }));
    const slow = computeTrustScore(makeProvider({ avgLatencyMs: 4000 }));
    expect(fast.total).toBeGreaterThan(slow.total);
  });

  it('ranks high uptime above low', () => {
    const up = computeTrustScore(makeProvider({ uptimePercent: 99.99 }));
    const down = computeTrustScore(makeProvider({ uptimePercent: 85 }));
    expect(up.total).toBeGreaterThan(down.total);
  });

  it('ranks good feedback above bad', () => {
    const loved = computeTrustScore(makeProvider(), DEFAULT_WEIGHTS, 4.9);
    const hated = computeTrustScore(makeProvider(), DEFAULT_WEIGHTS, 1.2);
    expect(loved.total).toBeGreaterThan(hated.total);
  });

  it('correctly orders a list of mixed providers', () => {
    const providers = [
      { label: 'Excellent', score: computeTrustScore(makeProvider({ successRate: 0.999, avgLatencyMs: 200, uptimePercent: 99.99 }), DEFAULT_WEIGHTS, 4.8) },
      { label: 'Good', score: computeTrustScore(makeProvider({ successRate: 0.98, avgLatencyMs: 800, uptimePercent: 99.0 }), DEFAULT_WEIGHTS, 4.0) },
      { label: 'Average', score: computeTrustScore(makeProvider({ successRate: 0.92, avgLatencyMs: 2000, uptimePercent: 95.0 }), DEFAULT_WEIGHTS, 3.0) },
      { label: 'Poor', score: computeTrustScore(makeProvider({ successRate: 0.7, avgLatencyMs: 4000, uptimePercent: 85.0 }), DEFAULT_WEIGHTS, 1.5) },
    ];

    const sorted = [...providers].sort((a, b) => b.score.total - a.score.total);
    expect(sorted.map((p) => p.label)).toEqual(['Excellent', 'Good', 'Average', 'Poor']);
  });

  it('custom weights can flip ranking', () => {
    // Provider A: very fast, mediocre success rate
    const provA = makeProvider({ avgLatencyMs: 50, successRate: 0.85 });
    // Provider B: slow, excellent success rate
    const provB = makeProvider({ avgLatencyMs: 3000, successRate: 0.999 });

    // Default weights: successRate dominates → B wins
    const defaultA = computeTrustScore(provA, DEFAULT_WEIGHTS);
    const defaultB = computeTrustScore(provB, DEFAULT_WEIGHTS);
    expect(defaultB.total).toBeGreaterThan(defaultA.total);

    // Custom: latency dominates → A wins
    const latencyWeights = normaliseWeights({
      latency: 0.7,
      successRate: 0.1,
      feedback: 0.05,
      uptime: 0.05,
      onChainRep: 0.05,
      longevity: 0.025,
      volumeConsistency: 0.025,
    });

    const customA = computeTrustScore(provA, latencyWeights);
    const customB = computeTrustScore(provB, latencyWeights);
    expect(customA.total).toBeGreaterThan(customB.total);
  });

  it('new provider penalty creates meaningful ranking disadvantage', () => {
    const established = computeTrustScore(
      makeProvider({ totalRequests: 10000 })
    );
    const newbie = computeTrustScore(
      makeProvider({ totalRequests: 5 })
    );

    // Same metrics except volume, but new provider gets 0.8× penalty
    expect(established.total).toBeGreaterThan(newbie.total);
    // The penalty should be roughly 20% (0.8×)
    const ratio = newbie.total / established.total;
    expect(ratio).toBeLessThan(0.85);
    expect(ratio).toBeGreaterThan(0.7);
  });
});
