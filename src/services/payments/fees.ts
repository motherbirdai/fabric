import { estimateGasCostUsd } from '../chain/client.js';
import { ESTIMATED_GAS_USD, GAS_BUFFER_MULTIPLIER } from '../../config.js';

export interface CostBreakdown {
  providerCost: number;   // What the provider charges
  routingFee: number;     // Fabric's percentage cut
  gasCost: number;        // Base L2 gas estimate (USD)
  totalCost: number;      // Sum of all costs
  routingFeePct: number;  // The percentage used
}

/**
 * Calculate the full cost breakdown for a route.
 *
 * @param providerPrice - Provider's base price in USD
 * @param routingFeePct - Account's routing fee percentage (0.3, 0.4, or 0.5)
 * @param useEstimatedGas - If true, use live gas estimation; if false, use constant
 */
export async function calculateCosts(
  providerPrice: number,
  routingFeePct: number,
  useEstimatedGas = false
): Promise<CostBreakdown> {
  const providerCost = providerPrice;
  const routingFee = providerCost * (routingFeePct / 100);

  let gasCost: number;
  if (useEstimatedGas) {
    try {
      // Two transfers: provider payment + fee collection
      const rawGas = await estimateGasCostUsd(130_000n); // ~65k gas per transfer × 2
      gasCost = rawGas * GAS_BUFFER_MULTIPLIER;
    } catch {
      gasCost = ESTIMATED_GAS_USD * 2; // fallback
    }
  } else {
    gasCost = ESTIMATED_GAS_USD;
  }

  return {
    providerCost,
    routingFee: round6(routingFee),
    gasCost: round6(gasCost),
    totalCost: round6(providerCost + routingFee + gasCost),
    routingFeePct,
  };
}

/**
 * Calculate routing fee only.
 */
export function calculateRoutingFee(providerCost: number, feePct: number): number {
  return round6(providerCost * (feePct / 100));
}

/**
 * Validate that a payment amount is reasonable.
 */
export function validatePaymentAmount(amount: number): {
  valid: boolean;
  reason?: string;
} {
  if (amount <= 0) return { valid: false, reason: 'Amount must be positive' };
  if (amount > 10000) return { valid: false, reason: 'Amount exceeds maximum ($10,000)' };
  if (!isFinite(amount)) return { valid: false, reason: 'Amount must be finite' };
  return { valid: true };
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
