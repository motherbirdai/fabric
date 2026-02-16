import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FABRIC_MCP_TOOLS } from './tools.js';
import { prisma } from '../../db/client.js';
import { discoverAndScore } from '../../services/routing/selector.js';
import { selectProvider } from '../../services/routing/selector.js';
import { executeProvider } from '../../services/routing/executor.js';
import { recordFailure, recordSuccess, selectFallback } from '../../services/routing/fallback.js';
import { recordLatency } from '../../services/routing/latency.js';
import { invalidateScores } from '../../services/cache/scores.js';
import { queueReputationUpdate } from '../../services/identity/reputation.js';
import { computeTrustScore } from '../../services/trust/scorer.js';
import { decayedFeedbackAvg } from '../../services/trust/decay.js';
import { getCircuitInfo } from '../../services/routing/fallback.js';
import { getLatencyStats } from '../../services/routing/latency.js';
import {
  PlanFeatureError,
  NotFoundError,
  toErrorResponse,
} from '../../utils/errors.js';
import { increment, observe } from '../../utils/metrics.js';
import {
  discoverWebMCPTools,
  registerWebMCPTools,
} from '../../services/webmcp/registry.js';
import {
  executeWebMCPTool,
} from '../../services/webmcp/bridge.js';

export async function mcpRoutes(app: FastifyInstance) {
  // ─── Tool listing ───
  app.get('/mcp/tools', async () => ({
    tools: FABRIC_MCP_TOOLS,
    version: '2024-11-05',
    protocol: 'mcp',
  }));

  // ─── Tool execution ───
  app.post('/mcp/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tool, arguments: args } = request.body as {
      tool: string;
      arguments: Record<string, any>;
    };

    if (!tool || !args) {
      return reply.status(400).send({
        error: { code: 'INVALID_REQUEST', message: 'Missing tool or arguments' },
      });
    }

    increment('mcp.calls');
    increment(`mcp.tool.${tool}`);

    try {
      switch (tool) {
        case 'fabric_discover':
          return await handleDiscover(args);

        case 'fabric_route':
          return await handleRoute(args, request);

        case 'fabric_evaluate':
          return await handleEvaluate(args);

        case 'fabric_feedback':
          return await handleFeedback(args, request);

        case 'fabric_budget':
          return await handleBudget(args, request);

        case 'fabric_favorites':
          return await handleFavorites(args, request);

        case 'fabric_webmcp_discover':
          return await handleWebMCPDiscover(args);

        case 'fabric_webmcp_execute':
          return await handleWebMCPExecute(args, request);

        case 'fabric_webmcp_register':
          return await handleWebMCPRegister(args, request);

        default:
          return reply.status(400).send({
            error: {
              code: 'UNKNOWN_TOOL',
              message: `Unknown tool: ${tool}. Available: ${FABRIC_MCP_TOOLS.map((t) => t.name).join(', ')}`,
            },
          });
      }
    } catch (err) {
      increment('mcp.errors');
      return reply.status(500).send({
        error: {
          code: 'EXECUTION_ERROR',
          message: (err as Error).message,
        },
      });
    }
  });
}

// ─── Tool Handlers ───

async function handleDiscover(args: Record<string, any>) {
  const scored = await discoverAndScore(args.category, {
    limit: args.limit,
    minTrustScore: args.minTrustScore,
    maxPrice: args.maxPrice,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            providers: scored.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              trustScore: p.trustScore,
              price: p.basePrice,
              currency: p.currency,
              successRate: p.successRate,
              avgLatencyMs: p.avgLatencyMs,
            })),
            count: scored.length,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleRoute(args: Record<string, any>, request: FastifyRequest) {
  if (!request.account?.config.canRoute) {
    throw new PlanFeatureError('routing');
  }

  const agent = await prisma.agent.findFirst({
    where: { id: args.agentId, accountId: request.account!.id },
  });

  if (!agent) throw new NotFoundError('Agent');

  const selection = await selectProvider(
    args.category,
    args.agentId,
    request.account!.id,
    args.preferences
  );

  if (!selection) throw new NotFoundError(`No providers for: ${args.category}`);

  const execResult = await executeProvider({
    agentId: agent.id,
    provider: selection.provider,
    input: args.input,
    routingFeePct: request.account!.routingFeePct,
  });

  await recordSuccess(selection.provider.id);
  await recordLatency(selection.provider.id, args.category, execResult.latencyMs, true);

  const transaction = await prisma.transaction.create({
    data: {
      agentId: agent.id,
      accountId: request.account!.id,
      providerId: selection.provider.id,
      category: args.category,
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

  increment('routes.total');
  increment('routes.success');

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            transactionId: transaction.id,
            provider: {
              id: selection.provider.id,
              name: selection.provider.name,
              trustScore: selection.provider.trustScore,
            },
            result: execResult.result,
            payment: {
              total: execResult.payment.costs.totalCost,
              settled: execResult.payment.settled,
              mode: execResult.payment.mode,
              txHash: execResult.payment.providerTxHash,
            },
            latencyMs: execResult.latencyMs,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleEvaluate(args: Record<string, any>) {
  const provider = await prisma.provider.findFirst({
    where: { OR: [{ id: args.providerId }, { registryId: args.providerId }] },
  });

  if (!provider) throw new NotFoundError('Provider');

  const feedbackEntries = await prisma.feedback.findMany({
    where: { providerId: provider.id },
    select: { score: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const fbAvg = feedbackEntries.length > 0
    ? decayedFeedbackAvg(feedbackEntries)
    : undefined;

  const trustBreakdown = computeTrustScore(provider, undefined, fbAvg);
  const latency = await getLatencyStats(provider.id);
  const circuit = await getCircuitInfo(provider.id);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            provider: {
              id: provider.id,
              name: provider.name,
              category: provider.category,
              price: provider.basePrice,
            },
            trust: {
              score: trustBreakdown.total,
              penalties: trustBreakdown.penalties,
              feedbackAvg: fbAvg ?? null,
            },
            stats: {
              successRate: provider.successRate,
              avgLatencyMs: provider.avgLatencyMs,
              uptimePercent: provider.uptimePercent,
              totalRequests: provider.totalRequests,
            },
            latency,
            circuit: { state: circuit.state, failures: circuit.failures },
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleFeedback(args: Record<string, any>, request: FastifyRequest) {
  if (!request.account?.config.canFeedback) {
    throw new PlanFeatureError('feedback');
  }

  const transaction = await prisma.transaction.findFirst({
    where: { id: args.transactionId, accountId: request.account!.id },
    include: { provider: { select: { category: true, registryId: true } } },
  });

  if (!transaction) throw new NotFoundError('Transaction');

  const existing = await prisma.feedback.findUnique({
    where: { transactionId: args.transactionId },
  });

  if (existing) {
    return {
      content: [{ type: 'text', text: 'Feedback already submitted for this transaction.' }],
    };
  }

  const feedback = await prisma.feedback.create({
    data: {
      transactionId: args.transactionId,
      agentId: transaction.agentId,
      providerId: transaction.providerId,
      score: args.score,
      tags: args.tags || [],
      comment: args.comment,
    },
  });

  await invalidateScores(transaction.provider.category);
  await queueReputationUpdate(
    transaction.providerId,
    transaction.provider.registryId,
    args.score
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          id: feedback.id,
          score: args.score,
          message: 'Feedback recorded',
        }),
      },
    ],
  };
}

async function handleBudget(args: Record<string, any>, request: FastifyRequest) {
  if (!request.account?.config.canBudget) {
    throw new PlanFeatureError('budget controls');
  }

  switch (args.action) {
    case 'list': {
      const budgets = await prisma.budget.findMany({
        where: { accountId: request.account!.id },
      });
      return { content: [{ type: 'text', text: JSON.stringify({ budgets }, null, 2) }] };
    }

    case 'create': {
      const now = new Date();
      let resetAt: Date;
      switch (args.periodType || 'daily') {
        case 'weekly':
          resetAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          break;
        default:
          resetAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }

      const budget = await prisma.budget.create({
        data: {
          accountId: request.account!.id,
          agentId: args.agentId,
          limitUsd: args.limitUsd,
          periodType: args.periodType || 'daily',
          hardCap: args.hardCap || false,
          alertThreshold: 0.8,
          resetAt,
        },
      });
      return { content: [{ type: 'text', text: JSON.stringify({ budget }, null, 2) }] };
    }

    case 'status': {
      const budget = await prisma.budget.findFirst({
        where: { id: args.budgetId, accountId: request.account!.id },
      });
      if (!budget) throw new NotFoundError('Budget');
      const util = budget.limitUsd > 0 ? budget.spentUsd / budget.limitUsd : 0;
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              id: budget.id,
              limitUsd: budget.limitUsd,
              spentUsd: budget.spentUsd,
              remaining: Math.max(0, budget.limitUsd - budget.spentUsd),
              utilization: Math.round(util * 1000) / 1000,
            }, null, 2),
          },
        ],
      };
    }

    default:
      return { content: [{ type: 'text', text: 'Unknown budget action. Use: list, create, status' }] };
  }
}

async function handleFavorites(args: Record<string, any>, request: FastifyRequest) {
  if (!request.account?.config.canFavorites) {
    throw new PlanFeatureError('favorites');
  }

  switch (args.action) {
    case 'list': {
      const agent = await prisma.agent.findFirst({
        where: { id: args.agentId, accountId: request.account!.id },
      });
      if (!agent) throw new NotFoundError('Agent');

      const favorites = await prisma.favorite.findMany({
        where: { agentId: args.agentId },
        include: {
          provider: {
            select: { id: true, name: true, category: true, trustScore: true, basePrice: true },
          },
        },
        orderBy: { priority: 'desc' },
      });
      return { content: [{ type: 'text', text: JSON.stringify({ favorites }, null, 2) }] };
    }

    case 'add': {
      const agent = await prisma.agent.findFirst({
        where: { id: args.agentId, accountId: request.account!.id },
      });
      if (!agent) throw new NotFoundError('Agent');

      const fav = await prisma.favorite.upsert({
        where: { agentId_providerId: { agentId: args.agentId, providerId: args.providerId } },
        update: { priority: args.priority || 0 },
        create: { agentId: args.agentId, providerId: args.providerId, priority: args.priority || 0 },
      });
      return { content: [{ type: 'text', text: JSON.stringify({ favorite: fav }, null, 2) }] };
    }

    case 'remove': {
      const fav = await prisma.favorite.findUnique({
        where: { id: args.favoriteId },
        include: { agent: { select: { accountId: true } } },
      });
      if (!fav || fav.agent.accountId !== request.account!.id) {
        throw new NotFoundError('Favorite');
      }
      await prisma.favorite.delete({ where: { id: args.favoriteId } });
      return { content: [{ type: 'text', text: JSON.stringify({ deleted: true }) }] };
    }

    default:
      return { content: [{ type: 'text', text: 'Unknown favorites action. Use: list, add, remove' }] };
  }
}

// ─── WebMCP Handlers ───

async function handleWebMCPDiscover(args: Record<string, any>) {
  const tools = await discoverWebMCPTools({
    category: args.category,
    origin: args.origin,
    toolName: args.toolName,
    minTrustScore: args.minTrustScore,
    maxPrice: args.maxPrice,
    limit: args.limit,
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            tools: tools.map((t) => ({
              id: t.id,
              name: t.name,
              qualifiedName: t.qualifiedName,
              description: t.description,
              origin: t.origin,
              category: t.category,
              pricePerCall: t.pricePerCall,
              trustScore: t.trustScore,
              successRate: t.successRate,
              inputSchema: t.inputSchema,
            })),
            count: tools.length,
            protocol: 'webmcp',
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleWebMCPExecute(args: Record<string, any>, request: FastifyRequest) {
  if (!request.account?.config.canRoute) {
    throw new PlanFeatureError('routing');
  }

  const result = await executeWebMCPTool(
    {
      tool: args.tool,
      arguments: args.arguments ?? {},
      agentId: args.agentId,
      budgetId: args.budgetId,
    },
    {
      accountId: request.account!.id,
      routingFeePct: request.account!.routingFeePct,
      canRoute: true,
    }
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            toolId: result.toolId,
            toolName: result.toolName,
            origin: result.origin,
            result: result.result,
            payment: result.payment,
            trust: result.trust,
            transactionId: result.transactionId,
            latencyMs: result.latencyMs,
            protocol: 'webmcp',
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleWebMCPRegister(args: Record<string, any>, request: FastifyRequest) {
  const result = await registerWebMCPTools(
    {
      origin: args.origin,
      tools: args.tools,
      paymentAddress: args.paymentAddress,
    },
    request.account!.id
  );

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            providerId: result.providerId,
            origin: result.origin,
            tools: result.tools,
            trustScore: result.trustScore,
            message: `Registered ${result.tools.length} WebMCP tools from ${result.origin}`,
          },
          null,
          2
        ),
      },
    ],
  };
}
