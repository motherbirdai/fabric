/**
 * WebMCP Registry — indexes WebMCP tool contracts from browser origins
 * and maps them into Fabric's trust + discovery layer.
 *
 * Tools registered here are discoverable alongside traditional MCP providers,
 * but execute through the browser-native navigator.modelContext API with
 * Fabric trust scoring and x402 payment wrapping.
 */

import { prisma } from '../../db/client.js';
import { redis } from '../cache/redis.js';
import { computeTrustScore } from '../trust/scorer.js';
import { increment } from '../../utils/metrics.js';
import type {
  WebMCPToolContract,
  WebMCPRegistrationRequest,
  WebMCPRegistrationResult,
  WebMCPDiscoveryQuery,
  RegisteredWebMCPTool,
  WebMCPManifest,
} from './types.js';

const CACHE_PREFIX = 'webmcp:tools:';
const CACHE_TTL = 300; // 5 min

// ─── Register tools from a WebMCP origin ───

export async function registerWebMCPTools(
  req: WebMCPRegistrationRequest,
  accountId: string
): Promise<WebMCPRegistrationResult> {
  const origin = normaliseOrigin(req.origin);

  // Upsert the provider (one provider per origin per account)
  const provider = await prisma.provider.upsert({
    where: {
      // Use a composite-ish lookup: find by endpoint = origin
      id: await findProviderIdByOrigin(origin, accountId) ?? 'new',
    },
    update: {
      name: req.metadata?.name ?? originToName(origin),
      endpoint: origin,
      walletAddress: req.paymentAddress ?? '',
      updatedAt: new Date(),
    },
    create: {
      accountId,
      name: req.metadata?.name ?? originToName(origin),
      category: 'webmcp',
      endpoint: origin,
      pricingModel: 'per_call',
      basePrice: 0,
      currency: 'USD',
      walletAddress: req.paymentAddress ?? '',
      registryId: `webmcp:${origin}`,
      trustScore: 0.5,
      successRate: 1.0,
      avgLatencyMs: 0,
      uptimePercent: 100,
      totalRequests: 0,
      verified: false,
    },
  });

  // Register each tool as metadata on the provider
  // Store in Redis as structured tool index
  const registeredTools: WebMCPRegistrationResult['tools'] = [];

  for (const tool of req.tools) {
    const qualifiedName = `${origin}:${tool.name}`;
    const toolId = generateToolId(origin, tool.name);

    const toolRecord: RegisteredWebMCPTool = {
      id: toolId,
      providerId: provider.id,
      name: tool.name,
      qualifiedName,
      description: tool.description,
      inputSchema: tool.inputSchema,
      origin,
      category: tool.category ?? 'webmcp',
      pricePerCall: tool.pricePerCall ?? 0,
      paymentAddress: tool.paymentAddress ?? req.paymentAddress ?? null,
      trustScore: provider.trustScore,
      totalCalls: 0,
      successRate: 1.0,
      avgLatencyMs: 0,
      active: true,
      requiresUserConfirmation: tool.requiresUserConfirmation ?? false,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in Redis
    await redis.set(
      `${CACHE_PREFIX}${toolId}`,
      JSON.stringify(toolRecord),
      'EX',
      86400 // 24h TTL
    );

    // Add to origin index
    await redis.sadd(`webmcp:origin:${origin}`, toolId);

    // Add to category index
    await redis.sadd(`webmcp:category:${toolRecord.category}`, toolId);

    // Add to global tool index
    await redis.sadd('webmcp:all_tools', toolId);

    registeredTools.push({
      name: tool.name,
      qualifiedName,
      id: toolId,
    });
  }

  // Invalidate discovery cache
  await redis.del(`${CACHE_PREFIX}discover:*`);

  increment('webmcp.registrations');
  increment(`webmcp.tools_registered`, req.tools.length);

  return {
    providerId: provider.id,
    origin,
    tools: registeredTools,
    trustScore: provider.trustScore,
  };
}

// ─── Register from manifest URL ───

export async function registerFromManifest(
  manifestUrl: string,
  accountId: string
): Promise<WebMCPRegistrationResult> {
  const response = await fetch(manifestUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
  }

  const manifest: WebMCPManifest = await response.json();

  if (manifest.version !== '1.0') {
    throw new Error(`Unsupported manifest version: ${manifest.version}`);
  }

  return registerWebMCPTools(
    {
      origin: manifest.origin,
      tools: manifest.tools,
      paymentAddress: manifest.provider.paymentAddress,
      metadata: {
        name: manifest.provider.name,
        description: manifest.provider.description,
      },
    },
    accountId
  );
}

// ─── Discover WebMCP tools ───

export async function discoverWebMCPTools(
  query: WebMCPDiscoveryQuery
): Promise<RegisteredWebMCPTool[]> {
  const limit = query.limit ?? 20;

  // Determine which tool IDs to scan
  let toolIds: string[];

  if (query.origin) {
    toolIds = await redis.smembers(`webmcp:origin:${normaliseOrigin(query.origin)}`);
  } else if (query.category) {
    toolIds = await redis.smembers(`webmcp:category:${query.category}`);
  } else {
    toolIds = await redis.smembers('webmcp:all_tools');
  }

  if (toolIds.length === 0) return [];

  // Batch fetch tools
  const pipeline = redis.pipeline();
  for (const id of toolIds) {
    pipeline.get(`${CACHE_PREFIX}${id}`);
  }
  const results = await pipeline.exec();

  let tools: RegisteredWebMCPTool[] = [];

  for (const [err, data] of results ?? []) {
    if (err || !data) continue;
    try {
      const tool: RegisteredWebMCPTool = JSON.parse(data as string);
      if (!tool.active) continue;

      // Apply filters
      if (query.toolName && !tool.name.includes(query.toolName)) continue;
      if (query.minTrustScore && tool.trustScore < query.minTrustScore) continue;
      if (query.maxPrice !== undefined && tool.pricePerCall > query.maxPrice) continue;

      tools.push(tool);
    } catch {
      continue;
    }
  }

  // Sort by trust score descending
  tools.sort((a, b) => b.trustScore - a.trustScore);

  return tools.slice(0, limit);
}

// ─── Get a single tool by ID or qualified name ───

export async function getWebMCPTool(
  toolIdOrName: string
): Promise<RegisteredWebMCPTool | null> {
  // Try direct ID lookup
  const direct = await redis.get(`${CACHE_PREFIX}${toolIdOrName}`);
  if (direct) {
    return JSON.parse(direct);
  }

  // Try qualified name lookup (origin:toolName)
  if (toolIdOrName.includes(':')) {
    const [origin, name] = toolIdOrName.split(':');
    const toolId = generateToolId(origin, name);
    const byName = await redis.get(`${CACHE_PREFIX}${toolId}`);
    if (byName) {
      return JSON.parse(byName);
    }
  }

  return null;
}

// ─── Update tool stats after execution ───

export async function recordWebMCPExecution(
  toolId: string,
  success: boolean,
  latencyMs: number
): Promise<void> {
  const raw = await redis.get(`${CACHE_PREFIX}${toolId}`);
  if (!raw) return;

  const tool: RegisteredWebMCPTool = JSON.parse(raw);
  const total = tool.totalCalls + 1;
  const successes = Math.round(tool.successRate * tool.totalCalls) + (success ? 1 : 0);

  tool.totalCalls = total;
  tool.successRate = total > 0 ? successes / total : 1;
  tool.avgLatencyMs = Math.round(
    (tool.avgLatencyMs * (total - 1) + latencyMs) / total
  );
  tool.updatedAt = new Date().toISOString();

  // Update trust score from provider
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: tool.providerId },
    });
    if (provider) {
      tool.trustScore = provider.trustScore;
    }
  } catch {}

  await redis.set(
    `${CACHE_PREFIX}${toolId}`,
    JSON.stringify(tool),
    'EX',
    86400
  );

  increment('webmcp.executions');
  increment(success ? 'webmcp.executions.success' : 'webmcp.executions.failure');
}

// ─── Deactivate tools for an origin ───

export async function deactivateOriginTools(origin: string): Promise<number> {
  const normalised = normaliseOrigin(origin);
  const toolIds = await redis.smembers(`webmcp:origin:${normalised}`);
  let count = 0;

  for (const id of toolIds) {
    const raw = await redis.get(`${CACHE_PREFIX}${id}`);
    if (!raw) continue;
    const tool: RegisteredWebMCPTool = JSON.parse(raw);
    tool.active = false;
    tool.updatedAt = new Date().toISOString();
    await redis.set(`${CACHE_PREFIX}${id}`, JSON.stringify(tool), 'EX', 86400);
    count++;
  }

  return count;
}

// ─── Helpers ───

function normaliseOrigin(origin: string): string {
  try {
    const url = new URL(origin.startsWith('http') ? origin : `https://${origin}`);
    return url.origin;
  } catch {
    return origin.toLowerCase().trim();
  }
}

function originToName(origin: string): string {
  try {
    return new URL(origin).hostname;
  } catch {
    return origin;
  }
}

function generateToolId(origin: string, toolName: string): string {
  const normalised = normaliseOrigin(origin);
  // Deterministic hash-like ID
  const raw = `${normalised}:${toolName}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `wmcp_${Math.abs(hash).toString(36)}_${toolName.replace(/[^a-zA-Z0-9]/g, '_')}`;
}

async function findProviderIdByOrigin(
  origin: string,
  accountId: string
): Promise<string | null> {
  const provider = await prisma.provider.findFirst({
    where: {
      accountId,
      endpoint: origin,
      registryId: { startsWith: 'webmcp:' },
    },
    select: { id: true },
  });
  return provider?.id ?? null;
}
