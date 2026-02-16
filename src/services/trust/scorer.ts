import { DEFAULT_WEIGHTS, type TrustWeightConfig } from './weights.js';
import { applyDecay } from './decay.js';

// ─── Provider shape (from Prisma) ───
interface ProviderMetrics {
  trustScore: number;
  successRate: number;
  avgLatencyMs: number;
  uptimePercent: number;
  totalRequests: number;
  lastSeen: Date | null;
  createdAt: Date;
}

export interface TrustBreakdown {
  total: number;
  signals: Record<string, { weight: number; raw: number; weighted: number }>;
  penalties: string[];
}

/**
 * Compute a trust score from 0–5 based on weighted signals.
 *
 * TrustScore = Σ(weight_i × normalised_signal_i) / Σ(weight_i) × 5
 */
export function computeTrustScore(
  provider: ProviderMetrics,
  weights: TrustWeightConfig = DEFAULT_WEIGHTS,
  feedbackAvg?: number
): TrustBreakdown {
  const signals: TrustBreakdown['signals'] = {};
  const penalties: string[] = [];

  // ─── 1. Success rate (0–1) ───
  const sr = Math.min(1, Math.max(0, provider.successRate));
  signals.successRate = {
    weight: weights.successRate,
    raw: sr,
    weighted: sr * weights.successRate,
  };

  // ─── 2. Latency (normalised: lower = better) ───
  // 0ms = 1.0, 5000ms+ = 0.0
  const latencyNorm = Math.max(0, 1 - provider.avgLatencyMs / 5000);
  signals.latency = {
    weight: weights.latency,
    raw: latencyNorm,
    weighted: latencyNorm * weights.latency,
  };

  // ─── 3. Uptime (0–1) ───
  const uptime = Math.min(1, Math.max(0, provider.uptimePercent / 100));
  signals.uptime = {
    weight: weights.uptime,
    raw: uptime,
    weighted: uptime * weights.uptime,
  };

  // ─── 4. Feedback (0–1, from 1–5 scale) ───
  const fb = feedbackAvg ? (feedbackAvg - 1) / 4 : 0.5; // default to neutral
  signals.feedback = {
    weight: weights.feedback,
    raw: fb,
    weighted: fb * weights.feedback,
  };

  // ─── 5. On-chain reputation (use existing trust score as proxy for now) ───
  const onChain = Math.min(1, Math.max(0, provider.trustScore / 5));
  signals.onChainRep = {
    weight: weights.onChainRep,
    raw: onChain,
    weighted: onChain * weights.onChainRep,
  };

  // ─── 6. Longevity ───
  const ageMs = Date.now() - new Date(provider.createdAt).getTime();
  const ageDays = ageMs / (24 * 60 * 60 * 1000);
  const longevity = Math.min(1, ageDays / 365); // 1 year = max
  signals.longevity = {
    weight: weights.longevity,
    raw: longevity,
    weighted: longevity * weights.longevity,
  };

  // ─── 7. Volume consistency ───
  const volNorm = Math.min(1, provider.totalRequests / 10000);
  signals.volumeConsistency = {
    weight: weights.volumeConsistency,
    raw: volNorm,
    weighted: volNorm * weights.volumeConsistency,
  };

  // ─── Sum ───
  const totalWeight = Object.values(signals).reduce((s, v) => s + v.weight, 0);
  const totalWeighted = Object.values(signals).reduce((s, v) => s + v.weighted, 0);
  let score = totalWeight > 0 ? (totalWeighted / totalWeight) * 5 : 0;

  // ─── Penalties ───
  // New provider penalty
  if (provider.totalRequests < 10) {
    score *= 0.8;
    penalties.push('new_provider (0.8×) — fewer than 10 transactions');
  }

  // Inactive penalty
  if (provider.lastSeen) {
    const daysSinceActive =
      (Date.now() - new Date(provider.lastSeen).getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceActive > 7) {
      score *= 0.7;
      penalties.push(`inactive (0.7×) — last seen ${Math.round(daysSinceActive)}d ago`);
    }
  }

  return {
    total: Math.round(score * 100) / 100,
    signals,
    penalties,
  };
}
