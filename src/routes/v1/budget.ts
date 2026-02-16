import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { budgetCreateSchema } from '../../utils/validation.js';
import {
  PlanFeatureError,
  ValidationError,
  NotFoundError,
  toErrorResponse,
} from '../../utils/errors.js';

export async function budgetRoutes(app: FastifyInstance) {
  // ─── List budgets ───
  app.get('/budget', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canBudget) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('budget controls'))
      );
    }

    const budgets = await prisma.budget.findMany({
      where: { accountId: request.account!.id },
      orderBy: { createdAt: 'desc' },
    });

    return { budgets };
  });

  // ─── Create budget ───
  app.post('/budget', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canBudget) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('budget controls'))
      );
    }

    const parsed = budgetCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { agentId, limitUsd, periodType, hardCap, alertThreshold } = parsed.data;

    // If agent-level, verify ownership
    if (agentId) {
      const agent = await prisma.agent.findFirst({
        where: { id: agentId, accountId: request.account!.id },
      });
      if (!agent) {
        return reply.status(404).send(
          toErrorResponse(new NotFoundError('Agent'))
        );
      }
    }

    // Calculate next reset time
    const now = new Date();
    let resetAt: Date;
    switch (periodType) {
      case 'weekly':
        resetAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default: // daily
        resetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    }

    const budget = await prisma.budget.create({
      data: {
        accountId: request.account!.id,
        agentId,
        limitUsd,
        periodType,
        hardCap,
        alertThreshold,
        resetAt,
      },
    });

    return reply.status(201).send({ budget });
  });

  // ─── Budget status ───
  app.get('/budget/:id/status', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.account?.config.canBudget) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('budget controls'))
      );
    }

    const { id } = request.params as { id: string };

    const budget = await prisma.budget.findFirst({
      where: { id, accountId: request.account!.id },
    });

    if (!budget) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError('Budget'))
      );
    }

    const utilization = budget.limitUsd > 0 ? budget.spentUsd / budget.limitUsd : 0;
    const remaining = Math.max(0, budget.limitUsd - budget.spentUsd);

    return {
      id: budget.id,
      limitUsd: budget.limitUsd,
      spentUsd: budget.spentUsd,
      remaining,
      utilization: Math.round(utilization * 1000) / 1000,
      hardCap: budget.hardCap,
      alertTriggered: utilization >= budget.alertThreshold,
      resetAt: budget.resetAt,
    };
  });
}
