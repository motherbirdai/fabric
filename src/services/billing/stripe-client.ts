import Stripe from 'stripe';
import { STRIPE_SECRET_KEY } from '../../config.js';

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripe) {
    if (!STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });
  }
  return stripe;
}

/**
 * Check if Stripe is configured.
 */
export function isStripeConfigured(): boolean {
  return !!STRIPE_SECRET_KEY;
}
