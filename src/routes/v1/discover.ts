import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { discoverQuerySchema } from '../../utils/validation.js';
import { ValidationError, toErrorResponse } from '../../utils/errors.js';
import { discoverAndScore } from '../../services/routing/selector.js';

export async function discoverRoutes(app: FastifyInstance) {
  app.get('/discover', async (request: FastifyRequest, reply: FastifyReply) => {
    // ─── Validate query params ───
    const parsed = discoverQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { category, limit, minTrustScore, maxPrice } = parsed.data;

    // ─── Discover and score via selector service ───
    const scored = await discoverAndScore(category, {
      limit,
      minTrustScore,
      maxPrice,
    });

    return {
      providers: scored.map((p) => ({
        id: p.id,
        registryId: p.registryId,
        name: p.name,
        category: p.category,
        trustScore: p.trustScore,
        compositeScore: p.compositeScore,
        price: p.basePrice,
        currency: p.currency,
        pricingModel: p.pricingModel,
        successRate: p.successRate,
        avgLatencyMs: p.avgLatencyMs,
        uptimePercent: p.uptimePercent,
        totalRequests: p.totalRequests,
      })),
      count: scored.length,
      registryBlock: null, // TODO: Phase 3 — real ERC-8004 block
      cached: scored.length > 0, // if we got results, they may be cached
      ttl: 300,
    };
  });
}
