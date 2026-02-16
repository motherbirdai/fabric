/**
 * Fabric Gateway API client for the dashboard.
 * All methods return typed responses from the real gateway.
 */

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100';

class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, opts: {
  method?: string;
  body?: unknown;
  apiKey?: string;
} = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = opts.apiKey || getStoredApiKey();
  if (key) headers['x-api-key'] = key;

  const res = await fetch(`${GATEWAY_URL}${path}`, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code || 'UNKNOWN', data?.error?.message || `HTTP ${res.status}`);
  return data as T;
}

// ─── Session ───

export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fabric_api_key');
}

export function setStoredApiKey(key: string) {
  localStorage.setItem('fabric_api_key', key);
}

export function clearStoredApiKey() {
  localStorage.removeItem('fabric_api_key');
}

// ─── API methods ───

export const api = {
  // Health
  health: () => request<{
    status: string;
    checks: Record<string, { status: string; latencyMs?: number }>;
    uptime: number;
    memoryMb: number;
  }>('/health'),

  // Discovery
  discover: (params: { category?: string; minTrust?: number; limit?: number }) =>
    request<{ providers: Provider[]; total: number }>(`/v1/discover?${qs(params)}`),

  // Routing
  route: (body: { capability: string; input: unknown; priority?: string; maxCost?: number }) =>
    request<RouteResult>('/v1/route', { method: 'POST', body }),

  // Evaluation
  evaluate: (body: { providerId: string }) =>
    request<{ providerId: string; trustScore: number; breakdown: Record<string, number> }>('/v1/evaluate', { method: 'POST', body }),

  // Budgets
  getBudgets: () => request<{ budgets: Budget[] }>('/v1/budget'),
  setBudget: (body: { agentId?: string; limitUsd: number; periodType: string; hardCap?: boolean }) =>
    request<Budget>('/v1/budget', { method: 'POST', body }),

  // Feedback
  submitFeedback: (body: { providerId: string; routeId: string; score: number; comment?: string }) =>
    request<{ id: string }>('/v1/feedback', { method: 'POST', body }),

  // Favorites
  getFavorites: () => request<{ favorites: Favorite[] }>('/v1/favorites'),
  addFavorite: (providerId: string) => request<Favorite>('/v1/favorites', { method: 'POST', body: { providerId } }),
  removeFavorite: (providerId: string) => request<void>(`/v1/favorites/${providerId}`, { method: 'DELETE' }),

  // Wallets
  getWallets: () => request<{ wallets: Wallet[] }>('/v1/wallets'),
  createWallet: (body: { label: string }) => request<Wallet>('/v1/wallets', { method: 'POST', body }),

  // Billing
  getSubscription: () => request<Subscription>('/v1/billing/subscription'),
  createCheckout: (body: { plan: string; successUrl: string; cancelUrl: string }) =>
    request<{ url: string }>('/v1/billing/checkout', { method: 'POST', body }),
  createPortal: (body: { returnUrl: string }) =>
    request<{ url: string }>('/v1/billing/portal', { method: 'POST', body }),
  changePlan: (body: { plan: string }) =>
    request<{ prorationPreview: number }>('/v1/billing/plan', { method: 'POST', body }),
  cancelSubscription: () => request<void>('/v1/billing/cancel', { method: 'POST' }),
  reactivateSubscription: () => request<void>('/v1/billing/reactivate', { method: 'POST' }),
  getInvoices: () => request<{ invoices: Invoice[] }>('/v1/billing/invoices'),
  getUpcomingInvoice: () => request<UpcomingInvoice>('/v1/billing/upcoming'),
  getOverage: () => request<OverageSummary>('/v1/billing/overage'),

  // Chain
  getChainStatus: () => request<{ chainId: number; blockNumber: number; gasPrice: string }>('/v1/chain/status'),

  // Auth check — validate API key against health endpoint
  validateKey: (apiKey: string) =>
    request<{ status: string }>('/health', { apiKey }),
};

// ─── Types ───

export interface Provider {
  id: string;
  name: string;
  category: string;
  endpoint: string;
  trustScore: number;
  totalInteractions: number;
  priceUsd: number;
  active: boolean;
  registryId?: string;
}

export interface RouteResult {
  id: string;
  providerId: string;
  providerName: string;
  result: unknown;
  cost: number;
  latencyMs: number;
  paymentMode: string;
  txHash?: string;
}

export interface Budget {
  id: string;
  label: string;
  agentId: string | null;
  limitUsd: number;
  spentUsd: number;
  periodType: string;
  hardCap: boolean;
  resetAt: string;
}

export interface Favorite {
  id: string;
  providerId: string;
  providerName: string;
  category: string;
  addedAt: string;
}

export interface Wallet {
  id: string;
  address: string;
  label: string;
  balanceUsdc: number;
  createdAt: string;
}

export interface Subscription {
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  dailyLimit: number;
  usedToday: number;
  routingFeePct: number;
  maxWallets: number;
}

export interface Invoice {
  id: string;
  amount: number;
  status: string;
  periodStart: string;
  periodEnd: string;
  overageCount: number;
  paidAt: string | null;
}

export interface UpcomingInvoice {
  subscriptionCost: number;
  estimatedOverage: number;
  routingFees: number;
  estimatedTotal: number;
  daysRemaining: number;
}

export interface OverageSummary {
  todayCount: number;
  periodCount: number;
  periodCost: number;
  dailyRate: number;
  projectedPeriodCost: number;
}

// ─── Helpers ───

function qs(params: Record<string, unknown>): string {
  return Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
}
