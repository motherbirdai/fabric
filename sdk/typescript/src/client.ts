import type {
  FabricConfig,
  DiscoverOptions,
  DiscoverResponse,
  RouteOptions,
  RouteResponse,
  EvaluateResponse,
  FeedbackOptions,
  FeedbackResponse,
  BudgetCreateOptions,
  Budget,
  BudgetStatus,
  FavoriteCreateOptions,
  Favorite,
  WalletInfo,
  WalletBalance,
  FabricError,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.fabric.computer';
const DEFAULT_TIMEOUT = 30_000;

export class Fabric {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;
  private defaultAgentId?: string;

  constructor(config: FabricConfig) {
    if (!config.apiKey) throw new Error('Fabric: apiKey is required');

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.defaultAgentId = config.agentId;
  }

  // ─── Discover ───

  async discover(options: DiscoverOptions): Promise<DiscoverResponse> {
    const params = new URLSearchParams({ category: options.category });
    if (options.limit) params.set('limit', String(options.limit));
    if (options.minTrustScore) params.set('minTrustScore', String(options.minTrustScore));
    if (options.maxPrice) params.set('maxPrice', String(options.maxPrice));

    return this.get(`/v1/discover?${params}`);
  }

  // ─── Route ───

  async route(options: RouteOptions): Promise<RouteResponse> {
    const agentId = options.agentId || this.defaultAgentId;
    if (!agentId) throw new Error('Fabric.route: agentId is required');

    return this.post('/v1/route', {
      agentId,
      category: options.category,
      input: options.input,
      preferences: options.preferences,
      budget: options.budget,
    });
  }

  // ─── Evaluate ───

  async evaluate(providerId: string): Promise<EvaluateResponse> {
    return this.get(`/v1/evaluate/${encodeURIComponent(providerId)}`);
  }

  // ─── Feedback ───

  async feedback(options: FeedbackOptions): Promise<FeedbackResponse> {
    return this.post('/v1/feedback', options);
  }

  // ─── Budget ───

  async listBudgets(): Promise<{ budgets: Budget[] }> {
    return this.get('/v1/budget');
  }

  async createBudget(options: BudgetCreateOptions): Promise<{ budget: Budget }> {
    return this.post('/v1/budget', options);
  }

  async budgetStatus(budgetId: string): Promise<BudgetStatus> {
    return this.get(`/v1/budget/${encodeURIComponent(budgetId)}/status`);
  }

  // ─── Favorites ───

  async listFavorites(agentId?: string): Promise<{ favorites: Favorite[] }> {
    const id = agentId || this.defaultAgentId;
    if (!id) throw new Error('Fabric.listFavorites: agentId is required');
    return this.get(`/v1/favorites/${encodeURIComponent(id)}`);
  }

  async addFavorite(options: FavoriteCreateOptions): Promise<{ favorite: Favorite }> {
    return this.post('/v1/favorites', options);
  }

  async removeFavorite(favoriteId: string): Promise<{ deleted: boolean }> {
    return this.delete(`/v1/favorites/${encodeURIComponent(favoriteId)}`);
  }

  // ─── Wallets ───

  async listWallets(): Promise<{ wallets: any[]; maxWallets: number; used: number }> {
    return this.get('/v1/wallets');
  }

  async createWallet(agentId?: string): Promise<{ wallet: WalletInfo }> {
    const id = agentId || this.defaultAgentId;
    if (!id) throw new Error('Fabric.createWallet: agentId is required');
    return this.post('/v1/wallets', { agentId: id });
  }

  async walletBalance(agentId?: string): Promise<WalletBalance> {
    const id = agentId || this.defaultAgentId;
    if (!id) throw new Error('Fabric.walletBalance: agentId is required');
    return this.get(`/v1/wallets/${encodeURIComponent(id)}/balance`);
  }

  // ─── Chain ───

  async chainStatus(): Promise<Record<string, unknown>> {
    return this.get('/v1/chain/status');
  }

  // ─── MCP Tools ───

  async mcpTools(): Promise<{ tools: any[]; version: string; protocol: string }> {
    return this.get('/mcp/tools');
  }

  async mcpExecute(tool: string, args: Record<string, unknown>): Promise<any> {
    return this.post('/mcp/execute', { tool, arguments: args });
  }

  // ─── Convenience: discover → route → feedback in one flow ───

  async routeAndRate(
    category: string,
    input: Record<string, unknown>,
    rateResult: (result: unknown) => 1 | 2 | 3 | 4 | 5
  ): Promise<RouteResponse & { feedbackId?: string }> {
    const result = await this.route({ category, input });
    const score = rateResult(result.result);

    let feedbackId: string | undefined;
    try {
      const fb = await this.feedback({
        transactionId: result.transactionId,
        score,
      });
      feedbackId = fb.id;
    } catch {
      // feedback failure is non-fatal
    }

    return { ...result, feedbackId };
  }

  // ─── HTTP methods ───

  private async get<T>(path: string): Promise<T> {
    return this.request('GET', path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request('POST', path, body);
  }

  private async delete<T>(path: string): Promise<T> {
    return this.request('DELETE', path);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': '@fabric-protocol/sdk/0.1.0',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    });

    const data = await response.json();

    if (!response.ok) {
      const err = data as FabricError;
      const error = new Error(err.error?.message || `HTTP ${response.status}`);
      (error as any).code = err.error?.code || 'UNKNOWN';
      (error as any).status = response.status;
      throw error;
    }

    return data as T;
  }
}
