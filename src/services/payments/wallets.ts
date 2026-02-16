import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { publicClient, createAgentWalletClient } from '../chain/client.js';
import { ERC20_ABI } from '../chain/abis.js';
import { USDC_ADDRESS } from '../../config.js';
import { prisma } from '../../db/client.js';
import { redis } from '../cache/redis.js';

// ─── IMPORTANT: In production, private keys should be stored in a KMS (AWS KMS, ───
// ─── HashiCorp Vault, etc.), NOT in the database. This implementation uses Redis ───
// ─── for development speed. Replace with proper key management before mainnet.   ───

const WALLET_KEY_PREFIX = 'wallet:key:';
const WALLET_KEY_TTL = 0; // persistent

export interface ManagedWallet {
  address: `0x${string}`;
  agentId: string;
  createdAt: Date;
}

/**
 * Create a new managed wallet for an agent.
 * Generates a private key, derives the address, and stores both.
 */
export async function createManagedWallet(agentId: string): Promise<ManagedWallet> {
  // Check if agent already has a wallet
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (agent?.walletAddress) {
    return {
      address: agent.walletAddress as `0x${string}`,
      agentId,
      createdAt: agent.createdAt,
    };
  }

  // Generate new key pair
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);

  // Store private key in Redis (encrypted in production)
  // TODO: Replace with KMS in production
  await redis.set(`${WALLET_KEY_PREFIX}${agentId}`, privateKey);

  // Update agent with wallet address
  await prisma.agent.update({
    where: { id: agentId },
    data: { walletAddress: account.address },
  });

  return {
    address: account.address,
    agentId,
    createdAt: new Date(),
  };
}

/**
 * Get the wallet client for an agent (for signing transactions).
 * Returns null if no managed wallet exists.
 */
export async function getAgentWalletClient(agentId: string) {
  const privateKey = await redis.get(`${WALLET_KEY_PREFIX}${agentId}`);
  if (!privateKey) return null;

  return createAgentWalletClient(privateKey as `0x${string}`);
}

/**
 * Get the wallet address for an agent.
 */
export async function getAgentWalletAddress(
  agentId: string
): Promise<`0x${string}` | null> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { walletAddress: true },
  });

  return (agent?.walletAddress as `0x${string}`) ?? null;
}

/**
 * Get USDC balance for an agent's wallet.
 */
export async function getWalletBalance(
  agentId: string
): Promise<{ usdc: number; usdcRaw: bigint; eth: number } | null> {
  const address = await getAgentWalletAddress(agentId);
  if (!address) return null;

  try {
    const [usdcRaw, ethBalance] = await Promise.all([
      publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      }) as Promise<bigint>,
      publicClient.getBalance({ address }),
    ]);

    return {
      usdc: Number(usdcRaw) / 1e6, // USDC has 6 decimals
      usdcRaw,
      eth: Number(ethBalance) / 1e18,
    };
  } catch {
    return null;
  }
}

/**
 * Check if agent wallet has sufficient USDC for a payment.
 */
export async function hasSufficientBalance(
  agentId: string,
  amountUsd: number
): Promise<{ sufficient: boolean; balance: number; required: number }> {
  const balances = await getWalletBalance(agentId);
  const balance = balances?.usdc ?? 0;

  return {
    sufficient: balance >= amountUsd,
    balance,
    required: amountUsd,
  };
}

/**
 * List all managed wallets for an account.
 */
export async function listAccountWallets(
  accountId: string
): Promise<Array<{ agentId: string; agentName: string; address: string | null }>> {
  const agents = await prisma.agent.findMany({
    where: { accountId },
    select: { id: true, name: true, walletAddress: true },
  });

  return agents.map((a) => ({
    agentId: a.id,
    agentName: a.name,
    address: a.walletAddress,
  }));
}
