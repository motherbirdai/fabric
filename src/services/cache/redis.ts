import Redis from 'ioredis';
import { REDIS_URL, IS_PROD } from '../../config.js';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying
    return Math.min(times * 200, 5000);
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  if (!IS_PROD) console.error('[Redis] Connection error:', err.message);
});

redis.on('connect', () => {
  if (!IS_PROD) console.log('[Redis] Connected');
});

// Attempt connection (non-blocking — app works without Redis, just no caching)
redis.connect().catch(() => {
  console.warn('[Redis] Could not connect — running without cache');
});
