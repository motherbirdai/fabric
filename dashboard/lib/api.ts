// Typed API client for the Fabric gateway
// All calls go through /api/... which Vercel proxies to api.fabriclayer.dev

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body?: unknown,
  ) {
    super(`${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fabric_api_key');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const key = getApiKey();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string>),
  };
  if (key) {
    headers['Authorization'] = `Bearer ${key}`;
  }

  const res = await fetch(`/api${path}`, { ...opts, headers });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, res.statusText, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types (matching real gateway responses) ─────────────────────

export interface Provider {
  id: string;
  registryId: string;
  name: string;
  category: string;
  endpoint: string;
  description: string | null;
  priceUsd: number;
  trustScore: number;
  totalInteractions: number;
  active: boolean;
  walletAddress: string;
  createdAt: string;
  pricingModel?: string;
  basePrice?: number;
  [key: string]: unknown;
}

export interface ProvidersResponse {
  providers: Provider[];
  total: number;
}

export interface TrustBreakdownItem {
  weight: number;
  raw: number;
  weighted: number;
}

export interface ProviderEvaluation {
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
    breakdown: Record<string, TrustBreakdownItem>;
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
  latency: unknown;
  circuit: { state: string; failures: number };
  recentFeedback: unknown[];
}

export interface WalletItem {
  agentId: string;
  agentName: string;
  address: string | null;
}

export interface WalletsResponse {
  wallets: WalletItem[];
  maxWallets: number;
  used: number;
}

export interface WalletBalance {
  agentId: string;
  address: string;
  balances: {
    usdc: string;
    eth: string;
  };
}

export interface Budget {
  id: string;
  agentId: string | null;
  limitUsd: number;
  spentUsd: number;
  period: string;
  capType?: string;
  alertThresholdPct?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface BudgetsResponse {
  budgets: Budget[];
}

export interface Favorite {
  id: string;
  providerId: string;
  providerName?: string;
  category?: string;
  trustScore?: number;
  createdAt?: string;
  [key: string]: unknown;
}

export interface FavoritesResponse {
  favorites: Favorite[];
}

export interface Subscription {
  plan: string;
  priceUsd: number;
  subscription: unknown;
  stripeConfigured: boolean;
  [key: string]: unknown;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

export interface InvoicesResponse {
  invoices: Invoice[];
}

export interface HealthCheck {
  status: string;
  latencyMs?: number;
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
  memory: { rss: number; heapUsed: number };
}

export interface DiscoverResult {
  providers: Provider[];
  [key: string]: unknown;
}

// ─── API Functions ───────────────────────────────────────────────

export function listProviders(): Promise<ProvidersResponse> {
  return request<ProvidersResponse>('/v1/providers/list');
}

export function getProvider(id: string): Promise<Provider> {
  return request<Provider>(`/v1/providers/${encodeURIComponent(id)}`);
}

export function evaluateProvider(id: string): Promise<ProviderEvaluation> {
  return request<ProviderEvaluation>(`/v1/evaluate/${encodeURIComponent(id)}`);
}

export function listWallets(): Promise<WalletsResponse> {
  return request<WalletsResponse>('/v1/wallets');
}

export function getWalletBalance(agentId: string): Promise<WalletBalance> {
  return request<WalletBalance>(`/v1/wallets/${encodeURIComponent(agentId)}/balance`);
}

export function listBudgets(): Promise<BudgetsResponse> {
  return request<BudgetsResponse>('/v1/budget');
}

export function listFavorites(agentId: string): Promise<FavoritesResponse> {
  return request<FavoritesResponse>(`/v1/favorites/${encodeURIComponent(agentId)}`);
}

export function getSubscription(): Promise<Subscription> {
  return request<Subscription>('/v1/billing/subscription');
}

export function listInvoices(): Promise<InvoicesResponse> {
  return request<InvoicesResponse>('/v1/billing/invoices');
}

export function registerProvider(data: {
  name: string;
  category: string;
  description?: string;
  endpoint: string;
  health_check_path?: string;
  requires_auth?: boolean;
  pricing_model: string;
  price: number;
}): Promise<Provider> {
  return request<Provider>('/v1/providers/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function discover(params?: { category?: string }): Promise<DiscoverResult> {
  const qs = params?.category ? `?category=${encodeURIComponent(params.category)}` : '';
  return request<DiscoverResult>(`/v1/discover${qs}`);
}

export function health(): Promise<HealthStatus> {
  return request<HealthStatus>('/health');
}
