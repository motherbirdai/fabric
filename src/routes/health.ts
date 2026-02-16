import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../db/client.js';
import { redis } from '../services/cache/redis.js';
import { isStripeConfigured } from '../services/billing/stripe-client.js';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs?: number;
  error?: string;
}

async function checkPostgres(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'unhealthy', latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

async function checkRedis(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await redis.ping();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (err) {
    return { status: 'degraded', latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

export async function healthRoutes(app: FastifyInstance) {
  // ─── Shallow health (for load balancers) ───
  app.get('/healthz', async () => ({ status: 'ok' }));

  // ─── Readiness (for k8s) — checks deps ───
  app.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    const pg = await checkPostgres();
    const rd = await checkRedis();

    const ready = pg.status === 'healthy'; // DB is required, Redis is optional
    const status = ready ? 'ok' : 'not_ready';

    reply.status(ready ? 200 : 503);
    return { status, postgres: pg.status, redis: rd.status };
  });

  // ─── Deep health (for monitoring) ───
  app.get('/health', async () => {
    const [pg, rd] = await Promise.all([checkPostgres(), checkRedis()]);

    const overall =
      pg.status === 'unhealthy' ? 'unhealthy'
      : rd.status === 'unhealthy' ? 'degraded'
      : 'healthy';

    return {
      status: overall,
      service: 'fabric-gateway',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      checks: {
        postgres: pg,
        redis: rd,
        stripe: { status: isStripeConfigured() ? 'configured' : 'not_configured' },
      },
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    };
  });

  // Root
  app.get('/', async () => ({
    name: 'Fabric Gateway',
    version: '0.1.0',
    docs: 'https://fabric.computer/docs',
  }));
}
