// ─── Config ───
export interface FabricConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  agentId?: string; // default agent for convenience
}

// ─── Discover ───
export interface DiscoverOptions {
  category: string;
  limit?: number;
  minTrustScore?: number;
  maxPrice?: number;
}

export interface DiscoverProvider {
  id: string;
  registryId: string;
  name: string;
  category: string;
  trustScore: number;
  compositeScore: number;
  price: number;
  currency: string;
  pricingModel: string;
  successRate: number;
  avgLatencyMs: number;
  uptimePercent: number;
  totalRequests: number;
}

export interface DiscoverResponse {
  providers: DiscoverProvider[];
  count: number;
  cached: boolean;
  ttl: number;
}

// ─── Route ───
export interface RouteOptions {
  agentId?: string;
  category: string;
  input: Record<string, unknown>;
  preferences?: {
    maxPrice?: number;
    minTrustScore?: number;
    preferredProviders?: string[];
    maxLatencyMs?: number;
  };
  budget?: string;
}

export interface RouteResponse {
  transactionId: string;
  provider: {
    id: string;
    registryId: string;
    name: string;
    trustScore: number;
    compositeScore: number;
  };
  result: unknown;
  payment: {
    providerCost: number;
    routingFee: number;
    gasCost: number;
    total: number;
    providerTxHash: string | null;
    feeTxHash: string | null;
    chain: string;
    settled: boolean;
    mode: 'x402' | 'direct' | 'mock';
  };
  routing: {
    selectionReason: string;
    candidatesConsidered: number;
    attempt: number;
    isFavorite: boolean;
  };
  latencyMs: number;
}

// ─── Evaluate ───
export interface EvaluateResponse {
  provider: {
    id: string;
    registryId: string;
    name: string;
    category: string;
    endpoint: string;
    pricingModel: string;
    basePrice: number;
    currency: string;
  };
  trust: {
    score: number;
    breakdown: Record<string, { weight: number; raw: number; weighted: number }>;
    penalties: string[];
    feedbackAvg: number | null;
    feedbackCount: number;
  };
  stats: {
    totalRequests: number;
    last30dRequests: number;
    last30dFailures: number;
    successRate: number;
    avgLatencyMs: number;
    uptimePercent: number;
    lastSeen: string | null;
  };
  latency: {
    count: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null;
  circuit: {
    state: 'closed' | 'open' | 'half-open';
    failures: number;
  };
  recentFeedback: Array<{
    score: number;
    tags: string[];
    comment: string | null;
    createdAt: string;
  }>;
}

// ─── Feedback ───
export interface FeedbackOptions {
  transactionId: string;
  score: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
  comment?: string;
}

export interface FeedbackResponse {
  id: string;
  transactionId: string;
  score: number;
  tags: string[];
  message: string;
}

// ─── Budget ───
export interface BudgetCreateOptions {
  agentId?: string;
  limitUsd: number;
  periodType?: 'daily' | 'weekly' | 'monthly';
  hardCap?: boolean;
  alertThreshold?: number;
}

export interface Budget {
  id: string;
  accountId: string;
  agentId: string | null;
  limitUsd: number;
  spentUsd: number;
  periodType: string;
  hardCap: boolean;
  alertThreshold: number;
  resetAt: string;
  createdAt: string;
}

export interface BudgetStatus {
  id: string;
  limitUsd: number;
  spentUsd: number;
  remaining: number;
  utilization: number;
  hardCap: boolean;
  alertTriggered: boolean;
  resetAt: string;
}

// ─── Favorites ───
export interface FavoriteCreateOptions {
  agentId: string;
  providerId: string;
  priority?: number;
}

export interface Favorite {
  id: string;
  agentId: string;
  providerId: string;
  priority: number;
  provider?: {
    id: string;
    name: string;
    category: string;
    trustScore: number;
    basePrice: number;
  };
}

// ─── Wallets ───
export interface WalletInfo {
  address: string;
  agentId: string;
  createdAt: string;
  chain: string;
}

export interface WalletBalance {
  agentId: string;
  address: string;
  chain: string;
  balances: {
    usdc: number;
    eth: number;
  };
}

// ─── Errors ───
export interface FabricError {
  error: {
    code: string;
    message: string;
  };
}
