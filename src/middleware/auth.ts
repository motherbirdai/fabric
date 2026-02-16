import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { prisma } from '../db/client.js';
import { AuthError, toErrorResponse } from '../utils/errors.js';
import { PLAN_CONFIG, type PlanName } from '../config.js';

// ─── Augment Fastify request with account ───
declare module 'fastify' {
  interface FastifyRequest {
    account?: {
      id: string;
      email: string;
      plan: PlanName;
      apiKey: string;
      dailyLimit: number;
      routingFeePct: number;
      config: (typeof PLAN_CONFIG)[PlanName];
    };
  }
}

// ─── Public routes that don't need auth ───
const PUBLIC_PATHS = new Set(['/', '/health', '/healthz', '/ready']);

async function authPluginFn(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public paths
    if (PUBLIC_PATHS.has(request.url.split('?')[0])) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send(toErrorResponse(new AuthError()));
      return;
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      reply.status(401).send(toErrorResponse(new AuthError()));
      return;
    }

    // Look up account by API key
    const account = await prisma.account.findUnique({
      where: { apiKey },
      select: {
        id: true,
        email: true,
        plan: true,
        apiKey: true,
        dailyLimit: true,
        routingFeePct: true,
      },
    });

    if (!account) {
      reply.status(401).send(toErrorResponse(new AuthError()));
      return;
    }

    const plan = account.plan as PlanName;

    request.account = {
      ...account,
      plan,
      config: PLAN_CONFIG[plan],
    };
  });
}

export const authPlugin = fp(authPluginFn, {
  name: 'fabric-auth',
});
