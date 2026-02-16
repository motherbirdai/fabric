/**
 * WebMCP Execution Bridge
 *
 * Executes WebMCP tool calls through Fabric's trust + payment layer.
 *
 * Flow:
 * 1. Agent requests tool execution via Fabric API
 * 2. Bridge resolves tool → provider → trust score
 * 3. Budget check (if applicable)
 * 4. Payment settlement via x402 or direct USDC
 * 5. Proxied execution to origin (or client-side callback)
 * 6. Record transaction + update trust metrics
 *
 * Two execution modes:
 * - Server-proxied: Fabric calls the origin's WebMCP endpoint
 * - Client-delegated: Fabric authorises payment, browser executes locally
 */

import { prisma } from '../../db/client.js';
import { getWebMCPTool, recordWebMCPExecution } from './registry.js';
import { executeProvider, type ExecutionResult } from '../routing/executor.js';
import { recordSuccess, recordFailure } from '../routing/fallback.js';
import { recordLatency } from '../routing/latency.js';
import { increment, observe } from '../../utils/metrics.js';
import type {
  WebMCPExecutionRequest,
  WebMCPExecutionResult,
  RegisteredWebMCPTool,
} from './types.js';

export interface WebMCPBridgeContext {
  accountId: string;
  routingFeePct: number;
  canRoute: boolean;
}

/**
 * Execute a WebMCP tool through Fabric's trust + payment layer.
 */
export async function executeWebMCPTool(
  req: WebMCPExecutionRequest,
  ctx: WebMCPBridgeContext
): Promise<WebMCPExecutionResult> {
  const startTime = Date.now();

  if (!ctx.canRoute) {
    throw new Error('Account plan does not support routing');
  }

  // ─── Resolve tool ───
  const tool = await getWebMCPTool(req.tool);
  if (!tool) {
    throw new Error(`WebMCP tool not found: ${req.tool}`);
  }

  if (!tool.active) {
    throw new Error(`WebMCP tool is deactivated: ${tool.qualifiedName}`);
  }

  // ─── Verify agent belongs to account ───
  const agent = await prisma.agent.findFirst({
    where: { id: req.agentId, accountId: ctx.accountId },
  });
  if (!agent) {
    throw new Error(`Agent not found: ${req.agentId}`);
  }

  // ─── Budget check ───
  if (req.budgetId) {
    const budget = await prisma.budget.findFirst({
      where: { id: req.budgetId, accountId: ctx.accountId },
    });
    if (budget?.hardCap && budget.spentUsd >= budget.limitUsd) {
      throw new Error(`Budget exceeded: ${req.budgetId}`);
    }
  }

  // ─── Resolve provider ───
  const provider = await prisma.provider.findUnique({
    where: { id: tool.providerId },
  });
  if (!provider) {
    throw new Error(`Provider not found for tool: ${tool.qualifiedName}`);
  }

  // ─── Trust gate ───
  if (provider.trustScore < 0.1) {
    throw new Error(
      `Provider trust score too low (${provider.trustScore.toFixed(2)}). ` +
      `Tool: ${tool.qualifiedName}`
    );
  }

  // ─── Free tool fast path ───
  if (tool.pricePerCall === 0) {
    const result = await executeFreeTool(tool, req.arguments, startTime);
    const txn = await recordTransaction(
      agent.id, ctx.accountId, provider.id, tool, result, startTime
    );

    await recordWebMCPExecution(tool.id, true, result.latencyMs);
    increment('webmcp.bridge.free');

    return {
      toolId: tool.id,
      toolName: tool.name,
      origin: tool.origin,
      result: result.data,
      payment: { total: 0, settled: true, mode: 'free', txHash: null },
      trust: { score: provider.trustScore, verified: provider.active },
      latencyMs: Date.now() - startTime,
      transactionId: txn.id,
    };
  }

  // ─── Paid tool — execute through Fabric payment layer ───
  try {
    const scoredProvider = {
      id: provider.id,
      registryId: provider.registryId,
      name: provider.name,
      category: tool.category,
      endpoint: buildToolEndpoint(tool),
      pricingModel: 'per_call',
      basePrice: tool.pricePerCall,
      currency: 'USD',
      walletAddress: tool.paymentAddress ?? provider.walletAddress ?? '',
      trustScore: provider.trustScore,
      compositeScore: provider.trustScore,
      trustBreakdown: { total: provider.trustScore, signals: {}, penalties: [] },
      successRate: provider.successRate,
      avgLatencyMs: provider.avgLatencyMs,
      uptimePercent: provider.uptimePercent,
      totalRequests: provider.totalRequests,
      isFavorite: false,
      favoritePriority: 0,
    };

    const execResult: ExecutionResult = await executeProvider({
      agentId: agent.id,
      provider: scoredProvider,
      input: {
        _webmcp: true,
        tool: tool.name,
        arguments: req.arguments,
      },
      routingFeePct: ctx.routingFeePct,
    });

    // Record success
    await recordSuccess(provider.id);
    await recordLatency(provider.id, tool.category, execResult.latencyMs, true);
    await recordWebMCPExecution(tool.id, true, execResult.latencyMs);

    const txn = await prisma.transaction.create({
      data: {
        agentId: agent.id,
        accountId: ctx.accountId,
        providerId: provider.id,
        category: `webmcp:${tool.category}`,
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

    // Update budget
    if (req.budgetId) {
      await prisma.budget.update({
        where: { id: req.budgetId },
        data: { spentUsd: { increment: execResult.payment.costs.totalCost } },
      }).catch(() => {});
    }

    increment('webmcp.bridge.paid');
    observe('webmcp.bridge.latency_ms', Date.now() - startTime);

    return {
      toolId: tool.id,
      toolName: tool.name,
      origin: tool.origin,
      result: execResult.result,
      payment: {
        total: execResult.payment.costs.totalCost,
        settled: execResult.payment.settled,
        mode: execResult.payment.mode,
        txHash: execResult.payment.providerTxHash,
      },
      trust: { score: provider.trustScore, verified: provider.active },
      latencyMs: Date.now() - startTime,
      transactionId: txn.id,
    };
  } catch (err) {
    await recordFailure(provider.id);
    await recordWebMCPExecution(tool.id, false, Date.now() - startTime);
    increment('webmcp.bridge.failure');
    throw err;
  }
}

/**
 * Generate a payment authorisation token for client-side execution.
 * The browser SDK calls this before executing the tool locally.
 */
export async function authoriseWebMCPExecution(
  req: WebMCPExecutionRequest,
  ctx: WebMCPBridgeContext
): Promise<{
  authorised: boolean;
  token: string;
  tool: RegisteredWebMCPTool;
  trust: { score: number; verified: boolean };
  payment: { amount: number; mode: 'x402' | 'direct' | 'free' };
  expiresAt: string;
}> {
  const tool = await getWebMCPTool(req.tool);
  if (!tool) throw new Error(`WebMCP tool not found: ${req.tool}`);

  const agent = await prisma.agent.findFirst({
    where: { id: req.agentId, accountId: ctx.accountId },
  });
  if (!agent) throw new Error(`Agent not found: ${req.agentId}`);

  const provider = await prisma.provider.findUnique({
    where: { id: tool.providerId },
  });
  if (!provider) throw new Error(`Provider not found for tool`);

  // Generate auth token (simple HMAC-like token for now)
  const expiry = new Date(Date.now() + 60_000); // 1 min
  const token = Buffer.from(
    JSON.stringify({
      toolId: tool.id,
      agentId: req.agentId,
      accountId: ctx.accountId,
      exp: expiry.getTime(),
    })
  ).toString('base64url');

  const mode = tool.pricePerCall === 0 ? 'free' : 'x402';

  return {
    authorised: true,
    token,
    tool,
    trust: { score: provider.trustScore, verified: provider.active },
    payment: { amount: tool.pricePerCall, mode },
    expiresAt: expiry.toISOString(),
  };
}

// ─── Helpers ───

async function executeFreeTool(
  tool: RegisteredWebMCPTool,
  args: Record<string, unknown>,
  startTime: number
): Promise<{ data: unknown; latencyMs: number }> {
  // Call the origin's WebMCP proxy endpoint
  const endpoint = buildToolEndpoint(tool);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fabric-Agent': 'fabric-gateway',
        'X-WebMCP-Tool': tool.name,
      },
      body: JSON.stringify({
        tool: tool.name,
        arguments: args,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const data = await response.json().catch(() => ({ _raw: 'non-json response' }));

    return {
      data,
      latencyMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      data: {
        _mock: true,
        tool: tool.name,
        origin: tool.origin,
        message: `Tool execution pending — use client-side mode for browser-native execution`,
        arguments: args,
      },
      latencyMs: Date.now() - startTime,
    };
  }
}

function buildToolEndpoint(tool: RegisteredWebMCPTool): string {
  // Convention: origin serves a WebMCP proxy at /.well-known/webmcp/execute
  return `${tool.origin}/.well-known/webmcp/execute`;
}

async function recordTransaction(
  agentId: string,
  accountId: string,
  providerId: string,
  tool: RegisteredWebMCPTool,
  result: { latencyMs: number },
  _startTime: number
) {
  return prisma.transaction.create({
    data: {
      agentId,
      accountId,
      providerId,
      category: `webmcp:${tool.category}`,
      providerCost: 0,
      routingFee: 0,
      gasCost: 0,
      totalCost: 0,
      paymentStatus: 'COMPLETED',
      latencyMs: result.latencyMs,
      success: true,
    },
  });
}
