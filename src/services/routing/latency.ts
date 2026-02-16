import { prisma } from '../../db/client.js';
import { redis } from '../cache/redis.js';
import { invalidateScores } from '../cache/scores.js';

const LATENCY_PREFIX = 'latency:';
const LATENCY_WINDOW = 100; // keep last N observations

/**
 * Record a latency observation for a provider.
 * Updates both the Redis rolling window and the Postgres cached metric.
 */
export async function recordLatency(
  providerId: string,
  category: string,
  latencyMs: number,
  success: boolean
): Promise<void> {
  // ─── Push to Redis rolling window ───
  try {
    const key = `${LATENCY_PREFIX}${providerId}`;
    await redis.lpush(key, JSON.stringify({ ms: latencyMs, ok: success, t: Date.now() }));
    await redis.ltrim(key, 0, LATENCY_WINDOW - 1);
    await redis.expire(key, 86_400); // 24h TTL
  } catch {
    // Non-fatal
  }

  // ─── Update Postgres cached metrics (async, non-blocking) ───
  updateProviderMetrics(providerId, category).catch(() => {});
}

/**
 * Get rolling latency stats from Redis.
 */
export async function getLatencyStats(
  providerId: string
): Promise<{ count: number; avg: number; p50: number; p95: number; p99: number } | null> {
  try {
    const key = `${LATENCY_PREFIX}${providerId}`;
    const raw = await redis.lrange(key, 0, -1);
    if (!raw || raw.length === 0) return null;

    const values = raw
      .map((r) => {
        try { return JSON.parse(r); } catch { return null; }
      })
      .filter(Boolean)
      .map((r: any) => r.ms as number)
      .sort((a: number, b: number) => a - b);

    if (values.length === 0) return null;

    const sum = values.reduce((a: number, b: number) => a + b, 0);

    return {
      count: values.length,
      avg: Math.round(sum / values.length),
      p50: values[Math.floor(values.length * 0.5)],
      p95: values[Math.floor(values.length * 0.95)],
      p99: values[Math.floor(values.length * 0.99)],
    };
  } catch {
    return null;
  }
}

/**
 * Recalculate and update cached provider metrics from recent transactions.
 */
async function updateProviderMetrics(
  providerId: string,
  category: string
): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [stats, totalCount] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        providerId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _avg: { latencyMs: true },
      _count: { id: true },
    }),
    prisma.transaction.count({
      where: { providerId },
    }),
  ]);

  const successCount = await prisma.transaction.count({
    where: {
      providerId,
      success: true,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const recentCount = stats._count.id || 1;
  const successRate = recentCount > 0 ? successCount / recentCount : 0;
  const avgLatencyMs = Math.round(stats._avg.latencyMs ?? 0);

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      successRate: Math.round(successRate * 1000) / 1000,
      avgLatencyMs,
      totalRequests: totalCount,
      lastSeen: new Date(),
    },
  });

  // Invalidate trust score cache for this category
  await invalidateScores(category);
}
