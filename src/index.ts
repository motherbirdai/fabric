import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { PORT, HOST, LOG_LEVEL, CORS_ORIGIN, IS_PROD } from './config.js';
import { authPlugin } from './middleware/auth.js';
import { usagePlugin } from './middleware/usage.js';
import { rateLimitPlugin } from './middleware/rate-limit.js';
import { securityPlugin } from './middleware/security.js';
import { sentryPlugin, initSentry } from './services/monitoring/sentry.js';
import { discoverRoutes } from './routes/v1/discover.js';
import { evaluateRoutes } from './routes/v1/evaluate.js';
import { routeRoutes } from './routes/v1/route.js';
import { feedbackRoutes } from './routes/v1/feedback.js';
import { budgetRoutes } from './routes/v1/budget.js';
import { favoritesRoutes } from './routes/v1/favorites.js';
import { walletRoutes } from './routes/v1/wallets.js';
import { chainRoutes } from './routes/v1/chain.js';
import { billingRoutes } from './routes/v1/billing.js';
import { providerRoutes } from './routes/v1/providers.js';
import { webmcpRoutes } from './routes/v1/webmcp.js';
import { siweRoutes } from './routes/auth/siwe.js';
import { websocketRoutes } from './services/events/websocket.js';
import { mcpRoutes } from './routes/mcp/handler.js';
import { wellKnownWebMCPRoutes } from './routes/wellknown/webmcp.js';
import { webhookRoutes } from './routes/webhooks.js';
import { healthRoutes } from './routes/health.js';
import { metricsRoutes } from './routes/metrics.js';
import { prisma } from './db/client.js';
import { redis } from './services/cache/redis.js';
import { startReputationBatcher, stopReputationBatcher } from './services/identity/reputation.js';
import { startBudgetResetJob, stopBudgetResetJob } from './services/billing/budget-reset.js';

// ─── Init monitoring ───
initSentry();

// ─── Create server ───
const app = Fastify({
  logger: {
    level: LOG_LEVEL,
    ...(IS_PROD
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss' },
          },
        }),
  },
  trustProxy: IS_PROD, // Trust X-Forwarded-For in production (behind reverse proxy)
});

// ─── Global plugins ───
await app.register(cors, {
  origin: IS_PROD ? CORS_ORIGIN : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'x-api-key'],
});

await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

await app.register(sensible);

// ─── Middleware (order matters) ───
await app.register(securityPlugin);     // Request ID, security headers, timing
await app.register(sentryPlugin);       // Error tracking
await app.register(rateLimitPlugin);    // Sliding window rate limiting
await app.register(authPlugin);         // API key → account lookup
await app.register(usagePlugin);        // Daily usage counting + overage

// ─── Routes ───
await app.register(healthRoutes, { prefix: '/' });        // /health, /healthz, /ready
await app.register(metricsRoutes, { prefix: '/' });       // /metrics (Prometheus)
await app.register(webhookRoutes, { prefix: '/' });       // /webhooks/stripe
await app.register(discoverRoutes, { prefix: '/v1' });
await app.register(evaluateRoutes, { prefix: '/v1' });
await app.register(routeRoutes, { prefix: '/v1' });
await app.register(feedbackRoutes, { prefix: '/v1' });
await app.register(budgetRoutes, { prefix: '/v1' });
await app.register(favoritesRoutes, { prefix: '/v1' });
await app.register(walletRoutes, { prefix: '/v1' });
await app.register(chainRoutes, { prefix: '/v1' });
await app.register(billingRoutes, { prefix: '/v1' });
await app.register(providerRoutes, { prefix: '/v1' });
await app.register(webmcpRoutes, { prefix: '/v1' });      // /v1/webmcp/*
await app.register(siweRoutes, { prefix: '/' });          // /auth/siwe/*
await app.register(websocketRoutes, { prefix: '/' });     // /ws, /events (SSE)
await app.register(mcpRoutes, { prefix: '/' });           // /mcp/tools, /mcp/execute
await app.register(wellKnownWebMCPRoutes, { prefix: '/' }); // /.well-known/webmcp

// ─── Background jobs ───
startReputationBatcher();
startBudgetResetJob();

// ─── Graceful shutdown ───
const shutdown = async (signal: string) => {
  app.log.info(`${signal} received — shutting down`);
  stopReputationBatcher();
  stopBudgetResetJob();
  await app.close();
  await prisma.$disconnect();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// ─── Unhandled rejections ───
process.on('unhandledRejection', (reason) => {
  app.log.error({ reason }, 'Unhandled rejection');
});

// ─── Start ───
try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`🧵 Fabric Gateway running on http://${HOST}:${PORT}`);
  app.log.info(`   Environment: ${IS_PROD ? 'production' : 'development'}`);
  app.log.info(`   Metrics:     http://${HOST}:${PORT}/metrics`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export { app };
