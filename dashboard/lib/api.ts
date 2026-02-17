// Typed API client for the Fabric gateway
// All calls go through /api/v1/... which Next.js proxies to FABRIC_API_URL

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

  // Handle 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json();
}

// ─── Types ───────────────────────────────────────────────────────

export interface Provider {
  id: string;
  name: string;
  category: string;
  description?: string;
  endpoint?: string;
  price_per_request?: number;
  price_per_token?: number;
  pricing_model?: string;
  trust_score?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface ProviderEvaluation {
  provider_id: string;
  trust_score: number;
  breakdown: Record<string, number>;
  [key: string]: unknown;
}

export interface Wallet {
  id: string;
  agent_id?: string;
  address: string;
  network?: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface WalletBalance {
  address: string;
  balance: string;
  symbol?: string;
  [key: string]: unknown;
}

export interface Budget {
  id: string;
  agent_id?: string;
  limit_usd: number;
  spent_usd: number;
  period: string;
  cap_type?: string;
  alert_threshold_pct?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface Favorite {
  id: string;
  provider_id: string;
  provider_name?: string;
  category?: string;
  trust_score?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface Subscription {
  plan: string;
  status?: string;
  requests_today?: number;
  requests_limit?: number;
  wallets_limit?: number;
  agents_limit?: number;
  [key: string]: unknown;
}

export interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

export interface HealthStatus {
  status: string;
  version?: string;
  uptime?: number;
  checks?: Record<string, { status: string; latency_ms?: number }>;
  [key: string]: unknown;
}

export interface DiscoverResult {
  providers: Provider[];
  [key: string]: unknown;
}

// ─── API Functions ───────────────────────────────────────────────

export function listProviders(): Promise<Provider[]> {
  return request<Provider[]>('/v1/providers');
}

export function getProvider(id: string): Promise<Provider> {
  return request<Provider>(`/v1/providers/${encodeURIComponent(id)}`);
}

export function evaluateProvider(id: string): Promise<ProviderEvaluation> {
  return request<ProviderEvaluation>(`/v1/evaluate/${encodeURIComponent(id)}`);
}

export function listWallets(): Promise<Wallet[]> {
  return request<Wallet[]>('/v1/wallets');
}

export function getWalletBalance(address: string): Promise<WalletBalance> {
  return request<WalletBalance>(`/v1/wallets/${encodeURIComponent(address)}/balance`);
}

export function listBudgets(): Promise<Budget[]> {
  return request<Budget[]>('/v1/budgets');
}

export function listFavorites(agentId: string): Promise<Favorite[]> {
  return request<Favorite[]>(`/v1/favorites?agent_id=${encodeURIComponent(agentId)}`);
}

export function getSubscription(): Promise<Subscription> {
  return request<Subscription>('/v1/subscription');
}

export function listInvoices(): Promise<Invoice[]> {
  return request<Invoice[]>('/v1/invoices');
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
  return request<Provider>('/v1/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function discover(params?: { category?: string }): Promise<DiscoverResult> {
  const qs = params?.category ? `?category=${encodeURIComponent(params.category)}` : '';
  return request<DiscoverResult>(`/v1/discover${qs}`);
}

export function health(): Promise<HealthStatus> {
  return request<HealthStatus>('/v1/health');
}
