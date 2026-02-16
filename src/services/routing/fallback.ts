import { redis } from '../cache/redis.js';
import type { ScoredProvider } from './selector.js';

const CIRCUIT_PREFIX = 'circuit:';
const FAILURE_THRESHOLD = 3; // failures before circuit opens
const CIRCUIT_RESET_SEC = 300; // 5 min cooldown

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitInfo {
  state: CircuitState;
  failures: number;
  lastFailure: number | null;
}

/**
 * Check if a provider's circuit breaker is open (i.e. should be skipped).
 */
export async function isCircuitOpen(providerId: string): Promise<boolean> {
  try {
    const key = `${CIRCUIT_PREFIX}${providerId}`;
    const data = await redis.get(key);
    if (!data) return false;

    const info: CircuitInfo = JSON.parse(data);

    if (info.state === 'open') {
      // Check if cooldown has elapsed → move to half-open
      if (info.lastFailure && Date.now() - info.lastFailure > CIRCUIT_RESET_SEC * 1000) {
        await redis.set(
          key,
          JSON.stringify({ ...info, state: 'half-open' }),
          'EX',
          CIRCUIT_RESET_SEC * 2
        );
        return false; // allow one attempt
      }
      return true; // still open
    }

    return false;
  } catch {
    return false; // Redis down → assume healthy
  }
}

/**
 * Record a failure for a provider. Opens circuit after threshold.
 */
export async function recordFailure(providerId: string): Promise<void> {
  try {
    const key = `${CIRCUIT_PREFIX}${providerId}`;
    const data = await redis.get(key);
    const info: CircuitInfo = data
      ? JSON.parse(data)
      : { state: 'closed', failures: 0, lastFailure: null };

    info.failures += 1;
    info.lastFailure = Date.now();

    if (info.failures >= FAILURE_THRESHOLD) {
      info.state = 'open';
    }

    await redis.set(key, JSON.stringify(info), 'EX', CIRCUIT_RESET_SEC * 2);
  } catch {
    // Non-fatal
  }
}

/**
 * Record a success. Resets circuit to closed.
 */
export async function recordSuccess(providerId: string): Promise<void> {
  try {
    const key = `${CIRCUIT_PREFIX}${providerId}`;
    await redis.del(key);
  } catch {
    // Non-fatal
  }
}

/**
 * Get circuit breaker info for debugging/evaluate endpoint.
 */
export async function getCircuitInfo(providerId: string): Promise<CircuitInfo> {
  try {
    const key = `${CIRCUIT_PREFIX}${providerId}`;
    const data = await redis.get(key);
    if (!data) return { state: 'closed', failures: 0, lastFailure: null };
    return JSON.parse(data);
  } catch {
    return { state: 'closed', failures: 0, lastFailure: null };
  }
}

/**
 * Filter out providers with open circuits, returning healthy candidates in order.
 * If all circuits are open, returns the original list (degraded mode).
 */
export async function filterHealthy(
  providers: ScoredProvider[]
): Promise<ScoredProvider[]> {
  const checks = await Promise.all(
    providers.map(async (p) => ({
      provider: p,
      open: await isCircuitOpen(p.id),
    }))
  );

  const healthy = checks.filter((c) => !c.open).map((c) => c.provider);

  // Degraded mode: if everything is tripped, allow all
  if (healthy.length === 0) return providers;

  return healthy;
}

/**
 * Select the next fallback from a ranked list, skipping tripped circuits.
 * Returns null if no viable fallback exists.
 */
export async function selectFallback(
  candidates: ScoredProvider[],
  excludeIds: Set<string>
): Promise<ScoredProvider | null> {
  for (const candidate of candidates) {
    if (excludeIds.has(candidate.id)) continue;
    const open = await isCircuitOpen(candidate.id);
    if (!open) return candidate;
  }
  return null;
}
