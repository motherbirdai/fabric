import 'dotenv/config';

// ─── Server ───
export const PORT = parseInt(process.env.PORT || '3100', 10);
export const HOST = process.env.HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';
export const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PROD ? 'info' : 'debug');

// ─── Database ───
export const DATABASE_URL = process.env.DATABASE_URL!;

// ─── Redis ───
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ─── Chain ───
export const CHAIN_RPC_URL = process.env.CHAIN_RPC_URL || 'https://sepolia.base.org';
export const CHAIN_ID = parseInt(process.env.CHAIN_ID || '84532', 10);
export const USE_TESTNET = process.env.USE_TESTNET !== 'false';

// ─── Contract Addresses ───
// Base Sepolia testnet defaults — override for mainnet
export const USDC_ADDRESS = (process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e') as `0x${string}`; // Base Sepolia USDC
export const FABRIC_IDENTITY_ADDRESS = (process.env.FABRIC_IDENTITY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const FABRIC_REGISTRY_ADDRESS = (process.env.FABRIC_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// ─── Wallet Management ───
export const FABRIC_OPERATOR_KEY = process.env.FABRIC_OPERATOR_KEY || ''; // Private key for fee collection
export const FABRIC_FEE_WALLET = (process.env.FABRIC_FEE_WALLET || '0x0000000000000000000000000000000000000000') as `0x${string}`;

// ─── Gas ───
export const ESTIMATED_GAS_USD = 0.00025; // Base L2 avg gas per tx
export const GAS_BUFFER_MULTIPLIER = 1.2; // 20% buffer on gas estimates

// ─── API Key ───
export const API_KEY_PREFIX = process.env.API_KEY_PREFIX || 'fab';

// ─── CORS ───
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ─── Plan Limits ───
export const PLAN_CONFIG = {
  FREE: {
    dailyLimit: 50,
    routingFeePct: 0,
    canRoute: false,
    canBudget: false,
    canFeedback: false,
    canFavorites: false,
    maxWallets: 0,
    customWeights: false,
  },
  BUILDER: {
    dailyLimit: 5_000,
    routingFeePct: 0.5,
    canRoute: true,
    canBudget: true,
    canFeedback: true,
    canFavorites: true,
    maxWallets: 3,
    customWeights: false,
  },
  PRO: {
    dailyLimit: 15_000,
    routingFeePct: 0.4,
    canRoute: true,
    canBudget: true,
    canFeedback: true,
    canFavorites: true,
    maxWallets: 10,
    customWeights: true,
  },
  TEAM: {
    dailyLimit: 50_000,
    routingFeePct: 0.3,
    canRoute: true,
    canBudget: true,
    canFeedback: true,
    canFavorites: true,
    maxWallets: 50,
    customWeights: true,
  },
} as const;

export type PlanName = keyof typeof PLAN_CONFIG;

// ─── Overage ───
export const OVERAGE_COST_PER_REQUEST = 0.001; // $0.001

// ─── Stripe ───
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
export const STRIPE_PRICE_IDS = {
  BUILDER: process.env.STRIPE_PRICE_BUILDER || 'price_builder_monthly',
  PRO: process.env.STRIPE_PRICE_PRO || 'price_pro_monthly',
  TEAM: process.env.STRIPE_PRICE_TEAM || 'price_team_monthly',
} as const;
export const STRIPE_OVERAGE_PRICE_ID = process.env.STRIPE_OVERAGE_PRICE || 'price_overage_per_request';
export const PLAN_PRICES_USD = { FREE: 0, BUILDER: 9, PRO: 39, TEAM: 149 } as const;

// ─── Trust Score Cache ───
export const TRUST_SCORE_TTL = 300; // 5 minutes in seconds
export const TRUST_SCORE_PREFIX = 'trust:score:';

// ─── Rate Limit ───
export const RATE_LIMIT_WINDOW = 60_000; // 1 minute
export const RATE_LIMIT_MAX = 100; // max requests per window (burst protection)
