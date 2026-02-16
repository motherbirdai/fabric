export interface TrustWeightConfig {
  successRate: number;
  latency: number;
  uptime: number;
  feedback: number;
  onChainRep: number;
  longevity: number;
  volumeConsistency: number;
}

export const DEFAULT_WEIGHTS: TrustWeightConfig = {
  successRate: 0.3,
  latency: 0.15,
  uptime: 0.15,
  feedback: 0.2,
  onChainRep: 0.1,
  longevity: 0.05,
  volumeConsistency: 0.05,
};

/**
 * Validate and normalise custom weights.
 * All values must be >= 0 and sum should be > 0.
 */
export function normaliseWeights(custom: Partial<TrustWeightConfig>): TrustWeightConfig {
  const merged = { ...DEFAULT_WEIGHTS, ...custom };

  // Ensure no negative
  for (const key of Object.keys(merged) as (keyof TrustWeightConfig)[]) {
    if (merged[key] < 0) merged[key] = 0;
  }

  return merged;
}
