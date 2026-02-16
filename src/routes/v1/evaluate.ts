import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { evaluateParamsSchema } from '../../utils/validation.js';
import { NotFoundError, ValidationError, toErrorResponse } from '../../utils/errors.js';
import { computeTrustScore } from '../../services/trust/scorer.js';
import { decayedFeedbackAvg } from '../../services/trust/decay.js';
import { getCircuitInfo } from '../../services/routing/fallback.js';
import { getLatencyStats } from '../../services/routing/latency.js';

export async function evaluateRoutes(app: FastifyInstance) {
  app.get('/evaluate/:providerId', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = evaluateParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('Invalid provider ID'))
      );
    }

    const { providerId } = parsed.data;

    const provider = await prisma.provider.findFirst({
      where: { OR: [{ id: providerId }, { registryId: providerId }] },
    });

    if (!provider) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError('Provider'))
      );
    }

    // ─── Load feedback for decayed average ───
    const feedbackEntries = await prisma.feedback.findMany({
      where: { providerId: provider.id },
      select: { score: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const fbAvg = feedbackEntries.length > 0
      ? decayedFeedbackAvg(feedbackEntries)
      : undefined;

    // ─── Compute live trust breakdown ───
    const trustBreakdown = computeTrustScore(provider, undefined, fbAvg);

    // ─── Recent feedback samples ───
    const recentFeedback = await prisma.feedback.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        score: true,
        tags: true,
        comment: true,
        createdAt: true,
      },
    });

    // ─── Transaction stats ───
    const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalTxns, recentTxns, failedTxns] = await Promise.all([
      prisma.transaction.count({ where: { providerId: provider.id } }),
      prisma.transaction.count({
        where: { providerId: provider.id, createdAt: { gte: last30d } },
      }),
      prisma.transaction.count({
        where: { providerId: provider.id, success: false, createdAt: { gte: last30d } },
      }),
    ]);

    // ─── Live latency stats from Redis ───
    const latencyStats = await getLatencyStats(provider.id);

    // ─── Circuit breaker status ───
    const circuit = await getCircuitInfo(provider.id);

    return {
      provider: {
        id: provider.id,
        registryId: provider.registryId,
        name: provider.name,
        category: provider.category,
        endpoint: provider.endpoint,
        pricingModel: provider.pricingModel,
        basePrice: provider.basePrice,
        currency: provider.currency,
      },
      trust: {
        score: trustBreakdown.total,
        breakdown: trustBreakdown.signals,
        penalties: trustBreakdown.penalties,
        feedbackAvg: fbAvg ?? null,
        feedbackCount: feedbackEntries.length,
      },
      stats: {
        totalRequests: totalTxns,
        last30dRequests: recentTxns,
        last30dFailures: failedTxns,
        successRate: provider.successRate,
        avgLatencyMs: provider.avgLatencyMs,
        uptimePercent: provider.uptimePercent,
        lastSeen: provider.lastSeen,
      },
      latency: latencyStats,
      circuit: {
        state: circuit.state,
        failures: circuit.failures,
      },
      recentFeedback,
    };
  });
}
