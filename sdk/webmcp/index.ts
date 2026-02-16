/**
 * @usefabric/webmcp — Browser SDK
 *
 * Bridges the W3C WebMCP spec (navigator.modelContext) with Fabric's
 * trust scoring, discovery, and x402 payment layer.
 *
 * Usage:
 *
 *   import { FabricWebMCP } from '@usefabric/webmcp';
 *
 *   const fabric = new FabricWebMCP({
 *     apiKey: 'fab_...',
 *     gateway: 'https://fabric-gateway.fly.dev',
 *   });
 *
 *   // Register a tool that gets Fabric trust scoring + payment
 *   fabric.registerTool({
 *     name: 'searchProducts',
 *     description: 'Search the product catalog',
 *     inputSchema: {
 *       type: 'object',
 *       properties: {
 *         query: { type: 'string', description: 'Search query' },
 *         maxResults: { type: 'number', description: 'Max results' },
 *       },
 *       required: ['query'],
 *     },
 *     category: 'ecommerce',
 *     pricePerCall: 0, // free tool
 *     async execute(params) {
 *       const results = await myProductSearch(params.query, params.maxResults);
 *       return { products: results };
 *     },
 *   });
 *
 *   // Sync all registered tools with Fabric gateway
 *   await fabric.sync();
 */

// ─── Types ───

export interface FabricWebMCPConfig {
  /** Fabric API key */
  apiKey: string;
  /** Gateway URL (default: https://fabric-gateway.fly.dev) */
  gateway?: string;
  /** Origin override (default: window.location.origin) */
  origin?: string;
  /** Payment wallet address for paid tools */
  paymentAddress?: string;
  /** Provider metadata */
  metadata?: {
    name?: string;
    description?: string;
  };
  /** Auto-sync on registration (default: true) */
  autoSync?: boolean;
}

export interface FabricToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  category?: string;
  pricePerCall?: number;
  paymentAddress?: string;
  requiresUserConfirmation?: boolean;
  execute: (params: Record<string, any>) => Promise<any>;
}

export interface FabricToolRegistration {
  id: string;
  name: string;
  qualifiedName: string;
}

export interface TrustInfo {
  score: number;
  verified: boolean;
}

// ─── Main Class ───

export class FabricWebMCP {
  private config: Required<
    Pick<FabricWebMCPConfig, 'apiKey' | 'gateway'>
  > & FabricWebMCPConfig;
  private tools: Map<string, FabricToolDefinition> = new Map();
  private registrations: Map<string, FabricToolRegistration> = new Map();
  private synced = false;

  constructor(config: FabricWebMCPConfig) {
    this.config = {
      ...config,
      gateway: config.gateway ?? 'https://fabric-gateway.fly.dev',
      autoSync: config.autoSync ?? true,
    };
  }

  /**
   * Register a tool with both WebMCP (browser-native) and Fabric (trust+payment).
   */
  registerTool(tool: FabricToolDefinition): void {
    this.tools.set(tool.name, tool);

    // Register with browser's navigator.modelContext if available
    if (typeof navigator !== 'undefined' && (navigator as any).modelContext) {
      this.registerWithBrowser(tool);
    }

    this.synced = false;

    // Auto-sync with Fabric gateway
    if (this.config.autoSync) {
      this.sync().catch((err) => {
        console.warn('[Fabric WebMCP] Auto-sync failed:', err.message);
      });
    }
  }

  /**
   * Register tool with browser's navigator.modelContext (WebMCP native).
   */
  private registerWithBrowser(tool: FabricToolDefinition): void {
    const mc = (navigator as any).modelContext;
    if (!mc?.registerTool) return;

    mc.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      async execute(params: Record<string, any>) {
        const result = await tool.execute(params);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result),
            },
          ],
        };
      },
    });

    console.log(`[Fabric WebMCP] Registered "${tool.name}" with navigator.modelContext`);
  }

  /**
   * Sync all registered tools with Fabric gateway for trust scoring + discovery.
   */
  async sync(): Promise<FabricToolRegistration[]> {
    const origin =
      this.config.origin ??
      (typeof window !== 'undefined' ? window.location.origin : 'unknown');

    const toolContracts = Array.from(this.tools.values()).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      category: t.category,
      pricePerCall: t.pricePerCall ?? 0,
      paymentAddress: t.paymentAddress,
      requiresUserConfirmation: t.requiresUserConfirmation ?? false,
    }));

    const response = await fetch(`${this.config.gateway}/v1/webmcp/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        origin,
        tools: toolContracts,
        paymentAddress: this.config.paymentAddress,
        metadata: this.config.metadata,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Fabric sync failed: ${JSON.stringify(err)}`);
    }

    const result = await response.json();

    for (const t of result.tools) {
      this.registrations.set(t.name, t);
    }

    this.synced = true;
    console.log(
      `[Fabric WebMCP] Synced ${result.tools.length} tools (trust: ${result.trustScore})`
    );

    return result.tools;
  }

  /**
   * Execute a tool through Fabric's trust+payment bridge.
   * Use this for server-proxied execution (Fabric calls the tool for you).
   */
  async execute(
    toolName: string,
    args: Record<string, any>,
    agentId: string,
    budgetId?: string
  ): Promise<{
    result: any;
    payment: { total: number; settled: boolean; mode: string; txHash: string | null };
    trust: TrustInfo;
    transactionId: string;
    latencyMs: number;
  }> {
    const reg = this.registrations.get(toolName);
    const toolId = reg?.id ?? toolName;

    const response = await fetch(`${this.config.gateway}/v1/webmcp/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        tool: toolId,
        arguments: args,
        agentId,
        budgetId,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown' }));
      throw new Error(`Execution failed: ${JSON.stringify(err)}`);
    }

    return response.json();
  }

  /**
   * Get payment authorisation for client-side execution.
   * The browser executes the tool locally; Fabric handles trust+payment.
   */
  async authorise(
    toolName: string,
    args: Record<string, any>,
    agentId: string
  ): Promise<{
    authorised: boolean;
    token: string;
    trust: TrustInfo;
    payment: { amount: number; mode: string };
    expiresAt: string;
  }> {
    const reg = this.registrations.get(toolName);
    const toolId = reg?.id ?? toolName;

    const response = await fetch(`${this.config.gateway}/v1/webmcp/authorise`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
      },
      body: JSON.stringify({
        tool: toolId,
        arguments: args,
        agentId,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Unknown' }));
      throw new Error(`Authorisation failed: ${JSON.stringify(err)}`);
    }

    return response.json();
  }

  /**
   * Execute a tool locally with Fabric trust verification.
   * 1. Gets authorisation from Fabric (trust check + payment settlement)
   * 2. Executes the tool function locally in the browser
   * 3. Returns result with trust+payment metadata
   */
  async executeLocal(
    toolName: string,
    args: Record<string, any>,
    agentId: string
  ): Promise<{
    result: any;
    trust: TrustInfo;
    payment: { amount: number; mode: string };
    local: true;
  }> {
    const tool = this.tools.get(toolName);
    if (!tool) throw new Error(`Tool not found locally: ${toolName}`);

    // Get Fabric authorisation (trust check + payment)
    const auth = await this.authorise(toolName, args, agentId);

    if (!auth.authorised) {
      throw new Error('Fabric authorisation denied');
    }

    // Execute locally
    const result = await tool.execute(args);

    return {
      result,
      trust: auth.trust,
      payment: auth.payment,
      local: true,
    };
  }

  /**
   * Discover WebMCP tools registered across all origins.
   */
  async discover(query?: {
    category?: string;
    origin?: string;
    minTrustScore?: number;
    maxPrice?: number;
    limit?: number;
  }): Promise<any[]> {
    const params = new URLSearchParams();
    if (query?.category) params.set('category', query.category);
    if (query?.origin) params.set('origin', query.origin);
    if (query?.minTrustScore) params.set('minTrustScore', String(query.minTrustScore));
    if (query?.maxPrice !== undefined) params.set('maxPrice', String(query.maxPrice));
    if (query?.limit) params.set('limit', String(query.limit));

    const response = await fetch(
      `${this.config.gateway}/v1/webmcp/discover?${params}`,
      {
        headers: { 'x-api-key': this.config.apiKey },
      }
    );

    if (!response.ok) throw new Error('Discovery failed');
    const data = await response.json();
    return data.tools;
  }

  /** Get all locally registered tool names */
  get toolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /** Check if synced with Fabric */
  get isSynced(): boolean {
    return this.synced;
  }
}

// ─── Static helper: register from existing WebMCP tools on page ───

/**
 * Auto-discover tools already registered with navigator.modelContext
 * and sync them to Fabric for trust scoring.
 */
export async function syncPageToolsToFabric(
  config: FabricWebMCPConfig
): Promise<FabricToolRegistration[]> {
  const mc = (navigator as any)?.modelContext;
  if (!mc?.getTools) {
    console.warn('[Fabric WebMCP] navigator.modelContext.getTools not available');
    return [];
  }

  const pageTools = await mc.getTools();
  const fabric = new FabricWebMCP({ ...config, autoSync: false });

  for (const tool of pageTools) {
    fabric.registerTool({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: tool.execute,
    });
  }

  return fabric.sync();
}

// Default export
export default FabricWebMCP;
