import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getCounters, getAll as getAllMetrics } from '../utils/metrics.js';
import { prisma } from '../db/client.js';
import { redis } from '../services/cache/redis.js';

/**
 * Prometheus-compatible metrics endpoint.
 * Exports all in-memory counters + system stats in OpenMetrics format.
 */
export async function metricsRoutes(app: FastifyInstance) {
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    const counters = getCounters();
    const lines: string[] = [];

    // ─── Application counters ───
    lines.push('# HELP fabric_requests_total Total requests by type');
    lines.push('# TYPE fabric_requests_total counter');
    for (const [key, value] of Object.entries(counters)) {
      const sanitized = key.replace(/[^a-zA-Z0-9_]/g, '_');
      lines.push(`fabric_${sanitized} ${value}`);
    }

    // ─── Process stats ───
    const mem = process.memoryUsage();
    lines.push('');
    lines.push('# HELP fabric_memory_rss_bytes Process RSS memory');
    lines.push('# TYPE fabric_memory_rss_bytes gauge');
    lines.push(`fabric_memory_rss_bytes ${mem.rss}`);

    lines.push('# HELP fabric_memory_heap_used_bytes Heap used memory');
    lines.push('# TYPE fabric_memory_heap_used_bytes gauge');
    lines.push(`fabric_memory_heap_used_bytes ${mem.heapUsed}`);

    lines.push('# HELP fabric_memory_heap_total_bytes Heap total memory');
    lines.push('# TYPE fabric_memory_heap_total_bytes gauge');
    lines.push(`fabric_memory_heap_total_bytes ${mem.heapTotal}`);

    lines.push('# HELP fabric_uptime_seconds Process uptime');
    lines.push('# TYPE fabric_uptime_seconds gauge');
    lines.push(`fabric_uptime_seconds ${Math.floor(process.uptime())}`);

    // ─── DB connection pool (best effort) ───
    try {
      const dbCheck = await prisma.$queryRaw<[{ count: bigint }]>`SELECT 1 as count`;
      lines.push('');
      lines.push('# HELP fabric_db_connected Database connection status');
      lines.push('# TYPE fabric_db_connected gauge');
      lines.push(`fabric_db_connected 1`);
    } catch {
      lines.push(`fabric_db_connected 0`);
    }

    // ─── Redis connection ───
    try {
      await redis.ping();
      lines.push('# HELP fabric_redis_connected Redis connection status');
      lines.push('# TYPE fabric_redis_connected gauge');
      lines.push(`fabric_redis_connected 1`);
    } catch {
      lines.push(`fabric_redis_connected 0`);
    }

    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return lines.join('\n') + '\n';
  });
}
