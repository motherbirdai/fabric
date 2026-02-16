import { parseUnits, type Hash } from 'viem';
import { publicClient, chain } from '../chain/client.js';
import { ERC20_ABI } from '../chain/abis.js';
import { USDC_ADDRESS } from '../../config.js';
import { getAgentWalletClient } from './wallets.js';

const USDC_DECIMALS = 6;

export interface TransferResult {
  txHash: Hash;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: number;       // USD
  amountRaw: bigint;    // USDC smallest unit
  confirmed: boolean;
  blockNumber: bigint;
  gasUsed: bigint;
}

/**
 * Transfer USDC from an agent's managed wallet to a destination.
 * This is the core payment primitive used by x402 and direct transfers.
 */
export async function transferUsdc(
  agentId: string,
  to: `0x${string}`,
  amountUsd: number
): Promise<TransferResult> {
  const walletClient = await getAgentWalletClient(agentId);
  if (!walletClient) {
    throw new Error(`No managed wallet found for agent ${agentId}`);
  }

  const account = walletClient.account;
  if (!account) {
    throw new Error('Wallet client has no account');
  }

  const amountRaw = parseUnits(amountUsd.toFixed(USDC_DECIMALS), USDC_DECIMALS);

  // Execute USDC transfer
  const txHash = await walletClient.writeContract({
    chain,
    account: account,
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [to, amountRaw],
  });

  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    confirmations: 1,
  });

  return {
    txHash,
    from: account.address,
    to,
    amount: amountUsd,
    amountRaw,
    confirmed: receipt.status === 'success',
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed,
  };
}

/**
 * Execute a split payment: provider gets their cut, Fabric gets the routing fee.
 * Both transfers happen in sequence (could be batched via multicall in future).
 */
export async function splitPayment(
  agentId: string,
  providerAddress: `0x${string}`,
  feeAddress: `0x${string}`,
  providerAmount: number,
  routingFee: number
): Promise<{
  providerTx: TransferResult;
  feeTx: TransferResult | null;
}> {
  // 1. Pay provider
  const providerTx = await transferUsdc(agentId, providerAddress, providerAmount);

  // 2. Pay routing fee (skip if negligible)
  let feeTx: TransferResult | null = null;
  if (routingFee >= 0.000001) {
    try {
      feeTx = await transferUsdc(agentId, feeAddress, routingFee);
    } catch (err) {
      // Fee collection failure is non-fatal — log but don't block the route
      console.error('[USDC] Routing fee collection failed:', (err as Error).message);
    }
  }

  return { providerTx, feeTx };
}

/**
 * Check USDC allowance and approve if needed.
 * Used when Fabric needs to spend USDC on behalf of an agent via transferFrom.
 */
export async function ensureAllowance(
  agentId: string,
  spender: `0x${string}`,
  amount: number
): Promise<Hash | null> {
  const walletClient = await getAgentWalletClient(agentId);
  if (!walletClient?.account) return null;

  const currentAllowance = (await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [walletClient.account.address, spender],
  })) as bigint;

  const amountRaw = parseUnits(amount.toFixed(USDC_DECIMALS), USDC_DECIMALS);

  if (currentAllowance >= amountRaw) return null; // Already approved

  // Approve max to avoid repeated approvals
  const txHash = await walletClient.writeContract({
    chain,
    account: walletClient.account!,
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, parseUnits('1000000', USDC_DECIMALS)], // 1M USDC max approval
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

  return txHash;
}
