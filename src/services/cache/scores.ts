import { redis } from './redis.js';
import { TRUST_SCORE_TTL, TRUST_SCORE_PREFIX } from '../../config.js';

// ─── Cached shape (subset of ScoredProvider, JSON-safe) ───
export interface CachedScoredProvider {
  id: string;
  registryId: string;
  name: string;
  category: string;
  endpoint: string;
  pricingModel: string;
  basePrice: number;
  currency: string;
  walletAddress: string | null;
  trustScore: number;
  compositeScore: number;
  trustBreakdown: any; // serialised TrustBreakdown
  successRate: number;
  avgLatencyMs: number;
  uptimePercent: number;
  totalRequests: number;
  isFavorite: boolean;
  favoritePriority: number;
}

/**
 * Get cached scored providers for a category.
 * Returns null on miss or Redis failure.
 */
export async function getCachedScores(
  category: string
): Promise<CachedScoredProvider[] | null> {
  try {
    const key = `${TRUST_SCORE_PREFIX}${category}`;
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

/**
 * Store scored providers in cache with TTL.
 */
export async function setCachedScores(
  category: string,
  providers: CachedScoredProvider[]
): Promise<void> {
  try {
    const key = `${TRUST_SCORE_PREFIX}${category}`;
    await redis.set(key, JSON.stringify(providers), 'EX', TRUST_SCORE_TTL);
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Invalidate cache for a category (e.g. after new feedback or latency update).
 */
export async function invalidateScores(category: string): Promise<void> {
  try {
    const key = `${TRUST_SCORE_PREFIX}${category}`;
    await redis.del(key);
  } catch {
    // Non-fatal
  }
}

/**
 * Invalidate ALL category caches (e.g. after bulk update).
 */
export async function invalidateAllScores(): Promise<void> {
  try {
    const keys = await redis.keys(`${TRUST_SCORE_PREFIX}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-fatal
  }
}
