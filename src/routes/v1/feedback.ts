import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { feedbackBodySchema } from '../../utils/validation.js';
import {
  PlanFeatureError,
  ValidationError,
  NotFoundError,
  toErrorResponse,
} from '../../utils/errors.js';
import { invalidateScores } from '../../services/cache/scores.js';
import { queueReputationUpdate } from '../../services/identity/reputation.js';

export async function feedbackRoutes(app: FastifyInstance) {
  app.post('/feedback', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canFeedback) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('feedback'))
      );
    }

    const parsed = feedbackBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { transactionId, score, tags, comment } = parsed.data;

    // Verify transaction belongs to this account
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, accountId: request.account!.id },
      include: { provider: { select: { category: true, registryId: true } } },
    });

    if (!transaction) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError('Transaction'))
      );
    }

    // Check if feedback already exists
    const existing = await prisma.feedback.findUnique({
      where: { transactionId },
    });

    if (existing) {
      return reply.status(409).send({
        error: {
          code: 'FEEDBACK_EXISTS',
          message: 'Feedback already submitted for this transaction',
        },
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        transactionId,
        agentId: transaction.agentId,
        providerId: transaction.providerId,
        score,
        tags: tags || [],
        comment,
      },
    });

    // Invalidate trust score cache
    await invalidateScores(transaction.provider.category);

    // Queue on-chain reputation update (batched)
    await queueReputationUpdate(
      transaction.providerId,
      transaction.provider.registryId,
      score
    );

    return {
      id: feedback.id,
      transactionId,
      score,
      tags: feedback.tags,
      message: 'Feedback recorded — trust scores update within 5 minutes, on-chain reputation batched every 100 entries',
    };
  });
}
