import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { favoriteCreateSchema } from '../../utils/validation.js';
import {
  PlanFeatureError,
  ValidationError,
  NotFoundError,
  toErrorResponse,
} from '../../utils/errors.js';

export async function favoritesRoutes(app: FastifyInstance) {
  // ─── List favorites for an agent ───
  app.get('/favorites/:agentId', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canFavorites) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('favorites'))
      );
    }

    const { agentId } = request.params as { agentId: string };

    // Verify agent belongs to account
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, accountId: request.account!.id },
    });

    if (!agent) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError('Agent'))
      );
    }

    const favorites = await prisma.favorite.findMany({
      where: { agentId },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            category: true,
            trustScore: true,
            basePrice: true,
          },
        },
      },
      orderBy: { priority: 'desc' },
    });

    return { favorites };
  });

  // ─── Add favorite ───
  app.post('/favorites', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canFavorites) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('favorites'))
      );
    }

    const parsed = favoriteCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { agentId, providerId, priority } = parsed.data;

    // Verify agent
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, accountId: request.account!.id },
    });
    if (!agent) {
      return reply.status(404).send(toErrorResponse(new NotFoundError('Agent')));
    }

    // Verify provider
    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) {
      return reply.status(404).send(toErrorResponse(new NotFoundError('Provider')));
    }

    const favorite = await prisma.favorite.upsert({
      where: { agentId_providerId: { agentId, providerId } },
      update: { priority },
      create: { agentId, providerId, priority },
    });

    return reply.status(201).send({ favorite });
  });

  // ─── Remove favorite ───
  app.delete('/favorites/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canFavorites) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('favorites'))
      );
    }

    const { id } = request.params as { id: string };

    // Verify ownership through agent
    const favorite = await prisma.favorite.findUnique({
      where: { id },
      include: { agent: { select: { accountId: true } } },
    });

    if (!favorite || favorite.agent.accountId !== request.account!.id) {
      return reply.status(404).send(toErrorResponse(new NotFoundError('Favorite')));
    }

    await prisma.favorite.delete({ where: { id } });

    return { deleted: true, id };
  });
}
