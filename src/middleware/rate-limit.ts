import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { redis } from '../services/cache/redis.js';
import { RATE_LIMIT_WINDOW, RATE_LIMIT_MAX, IS_PROD } from '../config.js';

interface RateLimitConfig {
  /** Max requests per window per API key */
  perKey: number;
  /** Max requests per window per IP (unauthenticated) */
  perIp: number;
  /** Window size in ms */
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  perKey: RATE_LIMIT_MAX,     // 100/min per key
  perIp: 20,                   // 20/min per IP (unauthenticated)
  windowMs: RATE_LIMIT_WINDOW, // 60s
};

const SKIP_PATHS = new Set(['/', '/health', '/healthz', '/ready', '/metrics']);

/**
 * Sliding window rate limiter using Redis sorted sets.
 * More accurate than fixed-window counters — no boundary burst issues.
 */
async function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const key = `rl:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipe = redis.pipeline();

    // Remove expired entries
    pipe.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    pipe.zcard(key);

    // Add current request (score = timestamp, member = unique)
    pipe.zadd(key, now, `${now}:${Math.random().toString(36).slice(2, 8)}`);

    // Set TTL
    pipe.pexpire(key, windowMs + 1000);

    const results = await pipe.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    if (currentCount >= limit) {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetMs = oldest.length >= 2
        ? parseInt(oldest[1], 10) + windowMs - now
        : windowMs;

      return {
        allowed: false,
        remaining: 0,
        resetMs: Math.max(0, resetMs),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, limit - currentCount - 1),
      resetMs: windowMs,
    };
  } catch {
    // Redis down — allow the request
    return { allowed: true, remaining: limit, resetMs: windowMs };
  }
}

async function rateLimitPluginFn(app: FastifyInstance) {
  const config = DEFAULT_CONFIG;

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];
    if (SKIP_PATHS.has(path)) return;

    // Determine identifier and limit
    let identifier: string;
    let limit: number;

    if (request.account) {
      identifier = `key:${request.account.id}`;
      limit = config.perKey;
    } else {
      const ip = request.ip || request.headers['x-forwarded-for'] as string || 'unknown';
      identifier = `ip:${ip}`;
      limit = config.perIp;
    }

    const result = await checkRateLimit(identifier, limit, config.windowMs);

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil((Date.now() + result.resetMs) / 1000));

    if (!result.allowed) {
      reply.header('Retry-After', Math.ceil(result.resetMs / 1000));
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${Math.ceil(result.resetMs / 1000)}s`,
        },
      });
    }
  });
}

export const rateLimitPlugin = fp(rateLimitPluginFn, {
  name: 'fabric-rate-limit',
});
