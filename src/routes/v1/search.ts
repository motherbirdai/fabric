import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { searchBodySchema } from '../../utils/validation.js';
import { ValidationError, toErrorResponse } from '../../utils/errors.js';
import { prisma } from '../../db/client.js';

export async function searchRoutes(app: FastifyInstance) {
  app.post('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = searchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { query, category, limit, minTrustScore, maxPrice } = parsed.data;

    // Build where clause with text search across name, category, and description
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const where: any = { active: true };

    if (category) {
      where.category = category;
    }
    if (maxPrice !== undefined) {
      where.basePrice = { lte: maxPrice };
    }

    // Match providers where name, category, or description contain any query word
    where.OR = words.flatMap((word) => [
      { name: { contains: word, mode: 'insensitive' } },
      { category: { contains: word, mode: 'insensitive' } },
      { description: { contains: word, mode: 'insensitive' } },
    ]);

    const providers = await prisma.provider.findMany({
      where,
      orderBy: { trustScore: 'desc' },
      take: limit,
    });

    // Apply optional trust score filter
    const filtered = minTrustScore
      ? providers.filter((p) => p.trustScore >= minTrustScore)
      : providers;

    return {
      providers: filtered.map((p) => ({
        id: p.id,
        registryId: p.registryId,
        name: p.name,
        category: p.category,
        description: p.description,
        trustScore: p.trustScore,
        price: p.basePrice,
        currency: p.currency,
        pricingModel: p.pricingModel,
        successRate: p.successRate,
        avgLatencyMs: p.avgLatencyMs,
        uptimePercent: p.uptimePercent,
        totalRequests: p.totalRequests,
      })),
      count: filtered.length,
      query,
    };
  });
}
