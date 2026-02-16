import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { redis } from '../services/cache/redis.js';
import { PlanLimitError, toErrorResponse } from '../utils/errors.js';
import { OVERAGE_COST_PER_REQUEST, type PlanName } from '../config.js';
import { checkAndTrackOverage } from '../services/billing/overage.js';
import { prisma } from '../db/client.js';

// ─── Public paths (no usage tracking) ───
const SKIP_PATHS = new Set(['/', '/health', '/healthz', '/ready', '/webhooks/stripe']);

// ─── Paths that don't count toward limits ───
const FREE_PATHS = new Set(['/v1/budget', '/mcp/tools', '/v1/chain/status']);

function todayKey(accountId: string): string {
  const d = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `usage:${accountId}:${d}`;
}

async function usagePluginFn(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];
    if (SKIP_PATHS.has(path) || FREE_PATHS.has(path)) return;
    if (!request.account) return;

    const { id: accountId, dailyLimit, plan } = request.account;
    const key = todayKey(accountId);

    try {
      // Increment counter in Redis (TTL 48h for safety)
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, 172_800);
      }

      // Attach to request
      (request as any).usageCount = count;

      // Free tier: hard block at limit
      if (plan === 'FREE' && count > dailyLimit) {
        reply.status(429).send(toErrorResponse(new PlanLimitError()));
        return;
      }

      // Paid tiers: check overage via billing service
      if (count > dailyLimit) {
        const overage = await checkAndTrackOverage(
          accountId,
          plan as PlanName,
          count
        );

        (request as any).isOverage = true;
        (request as any).overageCost = OVERAGE_COST_PER_REQUEST;

        if (!overage.allowed) {
          reply.status(429).send({
            error: {
              code: 'OVERAGE_BLOCKED',
              message: 'Daily limit exceeded and overage is not enabled. Upgrade your plan or enable overage billing.',
            },
          });
          return;
        }
      }
    } catch {
      // Redis/billing service down — continue without rate limiting
    }
  });

  // ─── Track usage in DB after response ───
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const path = request.url.split('?')[0];
    if (SKIP_PATHS.has(path) || FREE_PATHS.has(path)) return;
    if (!request.account) return;

    const isOverage = (request as any).isOverage === true;

    // Determine request type
    const isRoute = path === '/v1/route' || path === '/mcp/execute';
    const isDiscover = path === '/v1/discover';
    const isEvaluate = path.startsWith('/v1/evaluate');

    // Write to usage log (async, non-blocking)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    prisma.usageLog.upsert({
      where: {
        accountId_date: { accountId: request.account!.id, date: today },
      },
      update: {
        requestCount: { increment: 1 },
        ...(isRoute ? { routeCount: { increment: 1 } } : {}),
        ...(isDiscover ? { discoverCount: { increment: 1 } } : {}),
        ...(isEvaluate ? { evaluateCount: { increment: 1 } } : {}),
        ...(isOverage ? { overageCount: { increment: 1 } } : {}),
      },
      create: {
        accountId: request.account!.id,
        date: today,
        requestCount: 1,
        routeCount: isRoute ? 1 : 0,
        discoverCount: isDiscover ? 1 : 0,
        evaluateCount: isEvaluate ? 1 : 0,
        overageCount: isOverage ? 1 : 0,
      },
    }).catch(() => {}); // non-fatal
  });
}

export const usagePlugin = fp(usagePluginFn, {
  name: 'fabric-usage',
  dependencies: ['fabric-auth'],
});
