import {
  createPublicClient,
  createWalletClient,
  http,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN_RPC_URL, CHAIN_ID, USE_TESTNET, FABRIC_OPERATOR_KEY } from '../../config.js';

// ─── Chain selection ───
const chain: Chain = USE_TESTNET ? baseSepolia : base;

// ─── Public client (reads — no key required) ───
export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(CHAIN_RPC_URL),
  batch: {
    multicall: true, // batch multiple reads into one RPC call
  },
});

// ─── Operator account (for Fabric fee collection + identity minting) ───
let operatorAccount: Account | null = null;
let operatorWalletClient: WalletClient | null = null;

if (FABRIC_OPERATOR_KEY) {
  try {
    operatorAccount = privateKeyToAccount(
      (FABRIC_OPERATOR_KEY.startsWith('0x')
        ? FABRIC_OPERATOR_KEY
        : `0x${FABRIC_OPERATOR_KEY}`) as `0x${string}`
    );

    operatorWalletClient = createWalletClient({
      account: operatorAccount,
      chain,
      transport: http(CHAIN_RPC_URL),
    });
  } catch (err) {
    console.warn('[Chain] Invalid operator key — write operations will be unavailable');
  }
}

export { operatorAccount, operatorWalletClient };

/**
 * Create a wallet client for an agent's managed wallet.
 * Used for signing x402 payments on behalf of an agent.
 */
export function createAgentWalletClient(privateKey: `0x${string}`): WalletClient {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain,
    transport: http(CHAIN_RPC_URL),
  });
}

/**
 * Get current block number.
 */
export async function getBlockNumber(): Promise<bigint> {
  return publicClient.getBlockNumber();
}

/**
 * Get current gas price in gwei.
 */
export async function getGasPrice(): Promise<bigint> {
  return publicClient.getGasPrice();
}

/**
 * Estimate gas cost in USD for a transaction.
 * Base L2 gas is very cheap — typically ~$0.00025.
 */
export async function estimateGasCostUsd(gasUnits: bigint = 65_000n): Promise<number> {
  const gasPrice = await getGasPrice();
  const gasCostWei = gasPrice * gasUnits;
  // Convert wei to ETH, then to USD (rough estimate: 1 ETH ≈ $3000)
  const ethPrice = parseFloat(process.env.ETH_PRICE_USD || '3000');
  const gasCostEth = Number(gasCostWei) / 1e18;
  return gasCostEth * ethPrice;
}

export { chain };
