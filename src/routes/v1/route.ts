import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/client.js';
import { routeBodySchema } from '../../utils/validation.js';
import {
  PlanFeatureError,
  ValidationError,
  NotFoundError,
  BudgetExceededError,
  ProviderError,
  toErrorResponse,
} from '../../utils/errors.js';
import { selectProvider } from '../../services/routing/selector.js';
import { executeProvider, type ExecutionResult } from '../../services/routing/executor.js';
import { recordFailure, recordSuccess, selectFallback } from '../../services/routing/fallback.js';
import { recordLatency } from '../../services/routing/latency.js';
import { increment, observe } from '../../utils/metrics.js';

const MAX_RETRIES = 2;

export async function routeRoutes(app: FastifyInstance) {
  app.post('/route', async (request: FastifyRequest, reply: FastifyReply) => {
    const routeStart = Date.now();

    // ─── Plan check ───
    if (!request.account?.config.canRoute) {
      return reply.status(403).send(
        toErrorResponse(new PlanFeatureError('routing'))
      );
    }

    // ─── Validate body ───
    const parsed = routeBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError(parsed.error.issues[0].message))
      );
    }

    const { agentId, category, input, preferences, budget: budgetId } = parsed.data;

    // ─── Verify agent belongs to account ───
    const agent = await prisma.agent.findFirst({
      where: { id: agentId, accountId: request.account!.id },
    });

    if (!agent) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError('Agent'))
      );
    }

    // ─── Budget check ───
    if (budgetId) {
      const budget = await prisma.budget.findFirst({
        where: { id: budgetId, accountId: request.account!.id },
      });

      if (budget && budget.hardCap && budget.spentUsd >= budget.limitUsd) {
        return reply.status(402).send(
          toErrorResponse(new BudgetExceededError(budgetId))
        );
      }
    }

    // ─── Select provider ───
    const customWeights = request.account!.config.customWeights
      ? (request.body as any)?.trustWeights
      : undefined;

    const selection = await selectProvider(
      category,
      agentId,
      request.account!.id,
      preferences,
      customWeights
    );

    if (!selection) {
      return reply.status(404).send(
        toErrorResponse(new NotFoundError(`No providers found for category: ${category}`))
      );
    }

    // ─── Execute with retry/fallback ───
    const triedIds = new Set<string>();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const provider =
        attempt === 0
          ? selection.provider
          : await selectFallback(selection.candidates, triedIds);

      if (!provider) break;
      triedIds.add(provider.id);

      try {
        // ─── Execute via provider executor (x402 / direct / mock) ───
        const execResult: ExecutionResult = await executeProvider({
          agentId: agent.id,
          provider,
          input,
          routingFeePct: request.account!.routingFeePct,
        });

        // ─── Record success ───
        await recordSuccess(provider.id);
        await recordLatency(provider.id, category, execResult.latencyMs, true);

        // ─── Write transaction ───
        const transaction = await prisma.transaction.create({
          data: {
            agentId: agent.id,
            accountId: request.account!.id,
            providerId: provider.id,
            category,
            providerCost: execResult.payment.costs.providerCost,
            routingFee: execResult.payment.costs.routingFee,
            gasCost: execResult.payment.costs.gasCost,
            totalCost: execResult.payment.costs.totalCost,
            x402TxHash: execResult.payment.providerTxHash ?? undefined,
            paymentStatus: execResult.payment.settled ? 'COMPLETED' : 'PENDING',
            latencyMs: execResult.latencyMs,
            success: true,
          },
        });

        // ─── Update budget ───
        if (budgetId) {
          await prisma.budget.update({
            where: { id: budgetId },
            data: { spentUsd: { increment: execResult.payment.costs.totalCost } },
          }).catch(() => {});
        }

        // ─── Metrics ───
        increment('routes.total');
        increment('routes.success');
        increment(`routes.payment.${execResult.payment.mode}`);
        observe('routes.latency_ms', Date.now() - routeStart);
        observe('provider.exec_latency_ms', execResult.latencyMs);

        return {
          transactionId: transaction.id,
          provider: {
            id: provider.id,
            registryId: provider.registryId,
            name: provider.name,
            trustScore: provider.trustScore,
            compositeScore: provider.compositeScore,
          },
          result: execResult.result,
          payment: {
            providerCost: execResult.payment.costs.providerCost,
            routingFee: execResult.payment.costs.routingFee,
            gasCost: execResult.payment.costs.gasCost,
            total: execResult.payment.costs.totalCost,
            providerTxHash: execResult.payment.providerTxHash,
            feeTxHash: execResult.payment.feeTxHash,
            chain: execResult.payment.chain,
            settled: execResult.payment.settled,
            mode: execResult.payment.mode,
          },
          routing: {
            selectionReason: selection.selectionReason,
            candidatesConsidered: selection.candidates.length,
            attempt: attempt + 1,
            isFavorite: provider.isFavorite,
          },
          latencyMs: Date.now() - routeStart,
        };
      } catch (err) {
        lastError = err as Error;
        const execLatency = Date.now() - routeStart;

        await recordFailure(provider.id);
        await recordLatency(provider.id, category, execLatency, false);

        await prisma.transaction.create({
          data: {
            agentId: agent.id,
            accountId: request.account!.id,
            providerId: provider.id,
            category,
            providerCost: provider.basePrice,
            routingFee: 0,
            gasCost: 0,
            totalCost: provider.basePrice,
            paymentStatus: 'FAILED',
            latencyMs: execLatency,
            success: false,
            errorCode: 'PROVIDER_ERROR',
            errorMessage: (err as Error).message?.slice(0, 500),
          },
        }).catch(() => {});

        increment('routes.failure');

        request.log.warn(
          { providerId: provider.id, attempt, error: (err as Error).message },
          'Provider execution failed, trying fallback'
        );

        continue;
      }
    }

    increment('routes.exhausted');

    return reply.status(502).send(
      toErrorResponse(
        new ProviderError(
          `All providers failed after ${triedIds.size} attempts. Last error: ${lastError?.message ?? 'unknown'}`
        )
      )
    );
  });
}
