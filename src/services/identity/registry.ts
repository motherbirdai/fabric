import { publicClient } from '../chain/client.js';
import { ERC8004_REGISTRY_ABI } from '../chain/abis.js';
import { FABRIC_REGISTRY_ADDRESS } from '../../config.js';
import { redis } from '../cache/redis.js';
import { prisma } from '../../db/client.js';

const REGISTRY_CACHE_PREFIX = 'registry:';
const REGISTRY_CACHE_TTL = 300; // 5 min
const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

export interface OnChainAgent {
  id: number;           // uint256 agentId (auto-incrementing)
  owner: string;        // address
  endpoint: string;
  category: string;
  name: string;
  reputationScore: number;  // 0-5.0 (stored as basis points × 100 on-chain)
  totalInteractions: number;
  registeredAt: number; // unix timestamp
  active: boolean;
}

const isDeployed = () => FABRIC_REGISTRY_ADDRESS !== ZERO_ADDR;

/**
 * Read a single agent from the ERC-8004 registry.
 * Falls back to local DB if contract not deployed.
 */
export async function getRegistryAgent(agentId: number | string): Promise<OnChainAgent | null> {
  const numId = typeof agentId === 'string' ? parseInt(agentId, 10) : agentId;
  const cacheKey = `${REGISTRY_CACHE_PREFIX}agent:${numId}`;

  // Check cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  // Attempt on-chain read
  if (isDeployed()) {
    try {
      const result = await publicClient.readContract({
        address: FABRIC_REGISTRY_ADDRESS,
        abi: ERC8004_REGISTRY_ABI,
        functionName: 'getAgent',
        args: [BigInt(numId)],
      });

      const agent = parseOnChainAgent(numId, result as any);

      try {
        await redis.set(cacheKey, JSON.stringify(agent), 'EX', REGISTRY_CACHE_TTL);
      } catch {}

      return agent;
    } catch {
      // Contract call failed — fall through to DB
    }
  }

  // Fallback: local DB (match by registryId containing on-chain ID)
  const provider = await prisma.provider.findFirst({
    where: {
      OR: [
        { registryId: { contains: String(numId) } },
        { id: String(agentId) },
      ],
    },
  });

  if (!provider) return null;

  return {
    id: numId,
    owner: provider.walletAddress || ZERO_ADDR,
    endpoint: provider.endpoint,
    category: provider.category,
    name: provider.name,
    reputationScore: provider.trustScore,
    totalInteractions: provider.totalRequests,
    registeredAt: Math.floor(provider.createdAt.getTime() / 1000),
    active: provider.active,
  };
}

/**
 * Read agents by category from registry.
 */
export async function getRegistryAgentsByCategory(
  category: string,
  offset = 0,
  limit = 20
): Promise<OnChainAgent[]> {
  const cacheKey = `${REGISTRY_CACHE_PREFIX}category:${category}:${offset}:${limit}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  if (isDeployed()) {
    try {
      const result = await publicClient.readContract({
        address: FABRIC_REGISTRY_ADDRESS,
        abi: ERC8004_REGISTRY_ABI,
        functionName: 'getAgentsByCategory',
        args: [category, BigInt(offset), BigInt(limit)],
      });

      const agents = (result as any[])
        .map((raw, i) => parseOnChainAgent(offset + i, raw))
        .filter((a) => a.active);

      try {
        await redis.set(cacheKey, JSON.stringify(agents), 'EX', REGISTRY_CACHE_TTL);
      } catch {}

      return agents;
    } catch {}
  }

  // Fallback: local DB
  const providers = await prisma.provider.findMany({
    where: { category, active: true },
    skip: offset,
    take: limit,
    orderBy: { trustScore: 'desc' },
  });

  return providers.map((p, i) => ({
    id: offset + i,
    owner: p.walletAddress || ZERO_ADDR,
    endpoint: p.endpoint,
    category: p.category,
    name: p.name,
    reputationScore: p.trustScore,
    totalInteractions: p.totalRequests,
    registeredAt: Math.floor(p.createdAt.getTime() / 1000),
    active: true,
  }));
}

/**
 * Read on-chain reputation for a provider.
 */
export async function getOnChainReputation(
  agentId: number
): Promise<{ score: number; interactions: number; lastUpdated: number } | null> {
  if (!isDeployed()) return null;

  try {
    const agent = await publicClient.readContract({
      address: FABRIC_REGISTRY_ADDRESS,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'getAgent',
      args: [BigInt(agentId)],
    }) as any;

    return {
      score: Number(agent.reputationScore) / 10000, // basis points × 100 → 0-5.0
      interactions: Number(agent.totalInteractions),
      lastUpdated: Number(agent.registeredAt), // approximate
    };
  } catch {
    return null;
  }
}

/**
 * Get total agents registered on-chain.
 */
export async function getTotalRegisteredAgents(): Promise<number> {
  if (!isDeployed()) {
    return prisma.provider.count({ where: { active: true } });
  }

  try {
    const count = await publicClient.readContract({
      address: FABRIC_REGISTRY_ADDRESS,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'totalAgents',
    });
    return Number(count);
  } catch {
    return prisma.provider.count({ where: { active: true } });
  }
}

// ─── Helpers ───

function parseOnChainAgent(id: number, raw: any): OnChainAgent {
  return {
    id,
    owner: raw.owner,
    endpoint: raw.endpoint,
    category: raw.category,
    name: raw.name,
    reputationScore: Number(raw.reputationScore) / 10000, // → 0-5.0
    totalInteractions: Number(raw.totalInteractions),
    registeredAt: Number(raw.registeredAt),
    active: raw.active,
  };
}
