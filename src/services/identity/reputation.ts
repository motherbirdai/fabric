import { prisma } from '../../db/client.js';
import { redis } from '../cache/redis.js';
import { batchUpdateReputationOnChain } from '../chain/writer.js';
import { emitEvent, broadcastEvent } from '../events/websocket.js';

const BATCH_QUEUE_KEY = 'reputation:batch:queue';
const BATCH_THRESHOLD = 100;
const BATCH_INTERVAL_MS = 300_000; // 5 minutes

let batchTimer: ReturnType<typeof setInterval> | null = null;

interface QueueEntry {
  providerId: string;
  onChainId: number | null; // uint256 on-chain agent ID
  feedbackScore: number;
  queuedAt: number;
}

/**
 * Queue a provider reputation update.
 */
export async function queueReputationUpdate(
  providerId: string,
  onChainId: number | null,
  feedbackScore: number
): Promise<void> {
  try {
    const entry: QueueEntry = { providerId, onChainId, feedbackScore, queuedAt: Date.now() };
    await redis.rpush(BATCH_QUEUE_KEY, JSON.stringify(entry));

    const queueLen = await redis.llen(BATCH_QUEUE_KEY);
    if (queueLen >= BATCH_THRESHOLD) {
      flushReputationBatch().catch((err) =>
        console.error('[Reputation] Batch flush failed:', err.message)
      );
    }
  } catch {
    // Queue failure is non-fatal — scores still update on next batch
  }
}

/**
 * Flush the reputation queue — update DB + on-chain.
 */
export async function flushReputationBatch(): Promise<{
  processed: number;
  txHash: string | null;
}> {
  // Pop all queued items
  const items: string[] = [];
  let item: string | null;
  while ((item = await redis.lpop(BATCH_QUEUE_KEY))) {
    items.push(item);
  }

  if (items.length === 0) return { processed: 0, txHash: null };

  // Aggregate by provider
  const aggregated = new Map<
    string,
    { onChainId: number | null; scores: number[]; count: number; oldScore: number }
  >();

  for (const raw of items) {
    try {
      const entry: QueueEntry = JSON.parse(raw);
      const existing = aggregated.get(entry.providerId) || {
        onChainId: entry.onChainId,
        scores: [],
        count: 0,
        oldScore: 0,
      };
      existing.scores.push(entry.feedbackScore);
      existing.count++;
      if (entry.onChainId) existing.onChainId = entry.onChainId;
      aggregated.set(entry.providerId, existing);
    } catch {}
  }

  // Update local DB
  for (const [providerId, data] of aggregated) {
    const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
    const newScore = Math.round(avgScore * 100) / 100;

    try {
      const provider = await prisma.provider.findUnique({ where: { id: providerId } });
      if (provider) {
        data.oldScore = provider.trustScore;
        await prisma.provider.update({
          where: { id: providerId },
          data: {
            trustScore: newScore,
            totalRequests: { increment: data.count },
            totalInteractions: { increment: data.count },
          },
        });

        // Emit trust update event
        try {
          emitEvent({
            type: 'trust.updated',
            data: {
              providerId,
              providerName: provider.name,
              oldScore: data.oldScore,
              newScore,
            },
          });
        } catch {}
      }
    } catch {}
  }

  // Batch write to chain via writer
  let txHash: string | null = null;

  const chainUpdates = [...aggregated.entries()]
    .filter(([, data]) => data.onChainId !== null && data.onChainId > 0)
    .map(([, data]) => ({
      agentId: BigInt(data.onChainId!),
      score: data.scores.reduce((a, b) => a + b, 0) / data.scores.length,
      interactions: data.count,
    }));

  if (chainUpdates.length > 0) {
    txHash = await batchUpdateReputationOnChain(chainUpdates);
    if (txHash) {
      console.log(`[Reputation] Batch write: ${chainUpdates.length} providers, tx: ${txHash}`);
    }
  }

  return { processed: items.length, txHash };
}

/**
 * Start the periodic batch flush timer.
 */
export function startReputationBatcher(): void {
  if (batchTimer) return;

  batchTimer = setInterval(() => {
    flushReputationBatch().catch((err) =>
      console.error('[Reputation] Periodic flush failed:', err.message)
    );
  }, BATCH_INTERVAL_MS);

  console.log(
    `[Reputation] Batcher started (threshold: ${BATCH_THRESHOLD}, interval: ${BATCH_INTERVAL_MS / 1000}s)`
  );
}

/**
 * Stop the periodic batch flush timer.
 */
export function stopReputationBatcher(): void {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
}

/**
 * Get current queue depth (for monitoring).
 */
export async function getQueueDepth(): Promise<number> {
  try {
    return await redis.llen(BATCH_QUEUE_KEY);
  } catch {
    return 0;
  }
}
