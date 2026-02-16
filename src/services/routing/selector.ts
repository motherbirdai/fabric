import { prisma } from '../../db/client.js';
import { computeTrustScore, type TrustBreakdown } from '../trust/scorer.js';
import { decayedFeedbackAvg } from '../trust/decay.js';
import { DEFAULT_WEIGHTS, normaliseWeights, type TrustWeightConfig } from '../trust/weights.js';
import { getCachedScores, setCachedScores, type CachedScoredProvider } from '../cache/scores.js';
import type { Provider, Favorite } from '@prisma/client';

// ─── Selection preferences from the route request ───
export interface SelectionPreferences {
  maxPrice?: number;
  minTrustScore?: number;
  preferredProviders?: string[];
  maxLatencyMs?: number;
}

// ─── The result of provider selection ───
export interface SelectionResult {
  provider: ScoredProvider;
  candidates: ScoredProvider[];
  selectionReason: string;
}

export interface ScoredProvider {
  id: string;
  registryId: string;
  name: string;
  category: string;
  endpoint: string;
  pricingModel: string;
  basePrice: number;
  currency: string;
  walletAddress: string;
  trustScore: number;
  compositeScore: number;
  trustBreakdown: TrustBreakdown;
  successRate: number;
  avgLatencyMs: number;
  uptimePercent: number;
  totalRequests: number;
  isFavorite: boolean;
  favoritePriority: number;
}

/**
 * Discover and score providers for a category.
 * Uses Redis cache on the hot path, falls back to DB + live scoring.
 */
export async function discoverAndScore(
  category: string,
  options?: {
    limit?: number;
    minTrustScore?: number;
    maxPrice?: number;
    weights?: Partial<TrustWeightConfig>;
  }
): Promise<ScoredProvider[]> {
  const limit = options?.limit ?? 10;

  // ─── Try cache ───
  const cached = await getCachedScores(category);
  if (cached) {
    let results = cached;
    if (options?.minTrustScore) {
      results = results.filter((p) => p.trustScore >= options.minTrustScore!);
    }
    if (options?.maxPrice) {
      results = results.filter((p) => p.basePrice <= options.maxPrice!);
    }
    return results.slice(0, limit);
  }

  // ─── Fetch from DB ───
  const where: any = { category };
  if (options?.maxPrice) where.basePrice = { lte: options.maxPrice };

  const providers = await prisma.provider.findMany({
    where,
    orderBy: { trustScore: 'desc' },
    take: 50, // fetch more than needed, we'll re-rank
  });

  if (providers.length === 0) return [];

  // ─── Score each provider with live feedback data ───
  const weights = options?.weights
    ? normaliseWeights(options.weights)
    : DEFAULT_WEIGHTS;

  const scored = await scoreProviders(providers, weights);

  // ─── Sort by composite score descending ───
  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  // ─── Filter by min trust ───
  let filtered = scored;
  if (options?.minTrustScore) {
    filtered = filtered.filter((p) => p.trustScore >= options.minTrustScore!);
  }

  // ─── Cache the full scored list for this category ───
  await setCachedScores(category, scored);

  return filtered.slice(0, limit);
}

/**
 * Full provider selection for routing.
 * Applies trust scoring, preferences, favorites boost, and returns the best pick.
 */
export async function selectProvider(
  category: string,
  agentId: string,
  accountId: string,
  preferences?: SelectionPreferences,
  customWeights?: Partial<TrustWeightConfig>
): Promise<SelectionResult | null> {
  // ─── Discover and score ───
  const candidates = await discoverAndScore(category, {
    limit: 20,
    maxPrice: preferences?.maxPrice,
    weights: customWeights,
  });

  if (candidates.length === 0) return null;

  // ─── Load favorites for this agent ───
  const favorites = await prisma.favorite.findMany({
    where: { agentId },
    select: { providerId: true, priority: true },
  });

  const favMap = new Map(favorites.map((f) => [f.providerId, f.priority]));

  // ─── Apply favorites boost and preferences ───
  let ranked = candidates.map((p) => {
    const favPriority = favMap.get(p.id) ?? 0;
    const isFav = favPriority > 0;

    // Favorites get a composite score boost (up to +0.5 for priority 100)
    const favBoost = isFav ? (favPriority / 100) * 0.5 : 0;

    // Preferred providers get an additional boost
    const prefBoost =
      preferences?.preferredProviders?.includes(p.id) ? 0.3 : 0;

    return {
      ...p,
      isFavorite: isFav,
      favoritePriority: favPriority,
      compositeScore: p.compositeScore + favBoost + prefBoost,
    };
  });

  // ─── Filter by latency preference ───
  if (preferences?.maxLatencyMs) {
    ranked = ranked.filter((p) => p.avgLatencyMs <= preferences.maxLatencyMs!);
  }

  // ─── Filter by min trust ───
  if (preferences?.minTrustScore) {
    ranked = ranked.filter((p) => p.trustScore >= preferences.minTrustScore!);
  }

  if (ranked.length === 0) return null;

  // ─── Re-sort by boosted composite score ───
  ranked.sort((a, b) => b.compositeScore - a.compositeScore);

  // ─── Pick the winner ───
  const winner = ranked[0];
  const reason = buildSelectionReason(winner, favorites.length > 0, preferences);

  return {
    provider: winner,
    candidates: ranked,
    selectionReason: reason,
  };
}

// ─── Helpers ───

async function scoreProviders(
  providers: Provider[],
  weights: TrustWeightConfig
): Promise<ScoredProvider[]> {
  // Batch-load feedback averages for all providers
  const providerIds = providers.map((p) => p.id);
  const feedbackData = await loadFeedbackAverages(providerIds);

  return providers.map((p) => {
    const fbAvg = feedbackData.get(p.id);
    const breakdown = computeTrustScore(p, weights, fbAvg);

    return {
      id: p.id,
      registryId: p.registryId,
      name: p.name,
      category: p.category,
      endpoint: p.endpoint,
      pricingModel: p.pricingModel,
      basePrice: p.basePrice,
      currency: p.currency,
      walletAddress: p.walletAddress,
      trustScore: breakdown.total,
      compositeScore: breakdown.total, // base score, boosted later
      trustBreakdown: breakdown,
      successRate: p.successRate,
      avgLatencyMs: p.avgLatencyMs,
      uptimePercent: p.uptimePercent,
      totalRequests: p.totalRequests,
      isFavorite: false,
      favoritePriority: 0,
    };
  });
}

/**
 * Load time-decayed feedback averages for a batch of providers.
 * Single query, O(1) round-trips regardless of provider count.
 */
async function loadFeedbackAverages(
  providerIds: string[]
): Promise<Map<string, number>> {
  const feedback = await prisma.feedback.findMany({
    where: { providerId: { in: providerIds } },
    select: {
      providerId: true,
      score: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500, // cap to avoid huge queries
  });

  // Group by provider
  const grouped = new Map<string, Array<{ score: number; createdAt: Date }>>();
  for (const f of feedback) {
    const list = grouped.get(f.providerId) ?? [];
    list.push({ score: f.score, createdAt: f.createdAt });
    grouped.set(f.providerId, list);
  }

  // Compute decayed averages
  const result = new Map<string, number>();
  for (const [pid, entries] of grouped) {
    result.set(pid, decayedFeedbackAvg(entries));
  }

  return result;
}

function buildSelectionReason(
  winner: ScoredProvider,
  hasFavorites: boolean,
  prefs?: SelectionPreferences
): string {
  const parts: string[] = [];

  parts.push(`trust_score=${winner.trustScore}`);

  if (winner.isFavorite) {
    parts.push(`favorite(priority=${winner.favoritePriority})`);
  }
  if (prefs?.preferredProviders?.includes(winner.id)) {
    parts.push('preferred');
  }

  parts.push(`latency=${winner.avgLatencyMs}ms`);
  parts.push(`price=$${winner.basePrice}`);

  return parts.join(', ');
}
