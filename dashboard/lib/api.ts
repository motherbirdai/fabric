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

// ─── Mutation Functions ─────────────────────────────────────────

// Wallets
export function createWallet(agentId: string): Promise<{ wallet: WalletItem & { chain: string; note: string } }> {
  return request('/v1/wallets', {
    method: 'POST',
    body: JSON.stringify({ agentId }),
  });
}

// Budgets
export interface CreateBudgetInput {
  agentId?: string;
  limitUsd: number;
  periodType: 'daily' | 'weekly' | 'monthly';
  hardCap: boolean;
  alertThreshold: number;
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

export function createBudget(data: CreateBudgetInput): Promise<{ budget: Budget }> {
  return request('/v1/budget', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getBudgetStatus(id: string): Promise<BudgetStatus> {
  return request(`/v1/budget/${encodeURIComponent(id)}/status`);
}

// Favorites
export interface CreateFavoriteInput {
  agentId: string;
  providerId: string;
  priority?: number;
}

export function createFavorite(data: CreateFavoriteInput): Promise<{ favorite: Favorite }> {
  return request('/v1/favorites', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function deleteFavorite(id: string): Promise<{ deleted: boolean; id: string }> {
  return request(`/v1/favorites/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// Billing / Stripe
export interface CheckoutResponse {
  url: string;
  sessionId: string;
}

export function createCheckout(plan: string, successUrl: string, cancelUrl: string): Promise<CheckoutResponse> {
  return request('/v1/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ plan, successUrl, cancelUrl }),
  });
}

export function createPortalSession(returnUrl?: string): Promise<{ url: string }> {
  return request('/v1/billing/portal', {
    method: 'POST',
    body: JSON.stringify({ returnUrl }),
  });
}

export function changePlan(plan: string): Promise<{ plan: string; prorationAmount: number; message: string }> {
  return request('/v1/billing/plan', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

export function cancelSubscription(): Promise<{ message: string; note: string }> {
  return request('/v1/billing/cancel', { method: 'POST' });
}

export function reactivateSubscription(): Promise<{ message: string }> {
  return request('/v1/billing/reactivate', { method: 'POST' });
}

export function getOverage(): Promise<{ overage: { requestsOverLimit: number; overageCost: number; overage_enabled: boolean } }> {
  return request('/v1/billing/overage');
}
