import { publicClient, operatorWalletClient, operatorAccount, chain } from '../chain/client.js';
import { ERC8004_REGISTRY_ABI, FABRIC_IDENTITY_ABI } from '../chain/abis.js';
import { FABRIC_REGISTRY_ADDRESS, FABRIC_IDENTITY_ADDRESS } from '../../config.js';

const ZERO_ADDR = '0x0000000000000000000000000000000000000000';
const isDeployed = (addr: string) => addr !== ZERO_ADDR;

/**
 * Register an agent on-chain via FabricRegistry.registerAgent().
 * Uses the operator wallet to submit the transaction.
 * Returns the on-chain agentId and transaction hash.
 */
export async function registerAgentOnChain(
  name: string,
  category: string,
  endpoint: string
): Promise<{ onChainId: bigint; txHash: string } | null> {
  if (!isDeployed(FABRIC_REGISTRY_ADDRESS) || !operatorWalletClient || !operatorAccount) {
    return null; // Contract not deployed or no operator key
  }

  try {
    const txHash = await operatorWalletClient.writeContract({
      chain,
      account: operatorAccount!,
      address: FABRIC_REGISTRY_ADDRESS,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'registerAgent',
      args: [name, category, endpoint],
    });

    // Wait for receipt to get the emitted event with agentId
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    // Parse AgentRegistered event to get the on-chain agentId
    let onChainId = 0n;
    for (const log of receipt.logs) {
      try {
        // AgentRegistered event topic
        if (log.topics[0] && log.topics[1]) {
          onChainId = BigInt(log.topics[1]);
          break;
        }
      } catch {}
    }

    return { onChainId, txHash };
  } catch (err) {
    console.error('[OnChain] registerAgent failed:', err);
    return null;
  }
}

/**
 * Update on-chain reputation for a single agent.
 */
export async function updateReputationOnChain(
  agentId: bigint,
  score: number,
  additionalInteractions: number
): Promise<string | null> {
  if (!isDeployed(FABRIC_REGISTRY_ADDRESS) || !operatorWalletClient) {
    return null;
  }

  try {
    // Score stored as basis points × 100: 4.5 → 45000
    const scoreScaled = BigInt(Math.round(score * 10000));
    const txHash = await operatorWalletClient.writeContract({
      chain,
      account: operatorAccount!,
      address: FABRIC_REGISTRY_ADDRESS,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'updateReputation',
      args: [agentId, scoreScaled, BigInt(additionalInteractions)],
    });
    return txHash;
  } catch (err) {
    console.error('[OnChain] updateReputation failed:', err);
    return null;
  }
}

/**
 * Batch update reputation for multiple agents in one tx.
 */
export async function batchUpdateReputationOnChain(
  updates: { agentId: bigint; score: number; interactions: number }[]
): Promise<string | null> {
  if (!isDeployed(FABRIC_REGISTRY_ADDRESS) || !operatorWalletClient || updates.length === 0) {
    return null;
  }

  try {
    const agentIds = updates.map((u) => u.agentId);
    const scores = updates.map((u) => BigInt(Math.round(u.score * 10000)));
    const interactions = updates.map((u) => BigInt(u.interactions));

    const txHash = await operatorWalletClient.writeContract({
      chain,
      account: operatorAccount!,
      address: FABRIC_REGISTRY_ADDRESS,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'batchUpdateReputation',
      args: [agentIds, scores, interactions],
    });
    return txHash;
  } catch (err) {
    console.error('[OnChain] batchUpdateReputation failed:', err);
    return null;
  }
}

/**
 * Mint an identity NFT for a registered agent.
 */
export async function mintIdentityOnChain(
  toAddress: `0x${string}`,
  registryId: bigint
): Promise<{ tokenId: bigint; txHash: string } | null> {
  if (!isDeployed(FABRIC_IDENTITY_ADDRESS) || !operatorWalletClient) {
    return null;
  }

  try {
    const txHash = await operatorWalletClient.writeContract({
      chain,
      account: operatorAccount!,
      address: FABRIC_IDENTITY_ADDRESS,
      abi: FABRIC_IDENTITY_ABI,
      functionName: 'mintIdentity',
      args: [toAddress, registryId],
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    let tokenId = 0n;
    for (const log of receipt.logs) {
      if (log.topics[0] && log.topics[1]) {
        tokenId = BigInt(log.topics[1]);
        break;
      }
    }

    return { tokenId, txHash };
  } catch (err) {
    console.error('[OnChain] mintIdentity failed:', err);
    return null;
  }
}

/**
 * Read total registered agents from chain.
 */
export async function getTotalAgentsOnChain(): Promise<number | null> {
  if (!isDeployed(FABRIC_REGISTRY_ADDRESS)) return null;
  try {
    const count = await publicClient.readContract({
      address: FABRIC_REGISTRY_ADDRESS,
      abi: ERC8004_REGISTRY_ABI,
      functionName: 'totalAgents',
    });
    return Number(count);
  } catch {
    return null;
  }
}
