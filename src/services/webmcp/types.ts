/**
 * WebMCP types for Fabric Gateway.
 *
 * Maps the W3C WebMCP spec (navigator.modelContext) into Fabric's
 * trust + payment + discovery layer.
 *
 * Key concept: WebMCP tools are browser-native tool contracts that
 * websites publish via registerTool(). Fabric indexes these contracts,
 * scores the providing origins for trust, and wraps execution with
 * x402 payment rails.
 */

// ─── WebMCP Tool Schema (mirrors W3C spec) ───

export interface WebMCPToolSchema {
  type: 'object';
  properties: Record<string, WebMCPPropertySchema>;
  required?: string[];
}

export interface WebMCPPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'integer' | 'array' | 'object';
  description?: string;
  enum?: (string | number)[];
  pattern?: string;
  default?: unknown;
  items?: WebMCPPropertySchema;
}

// ─── Tool Contract (what a website publishes) ───

export interface WebMCPToolContract {
  name: string;
  description: string;
  inputSchema: WebMCPToolSchema;
  /** Origin domain that registered this tool */
  origin: string;
  /** Category for Fabric discovery (e.g. 'travel', 'ecommerce', 'finance') */
  category?: string;
  /** Pricing per call in USD (0 = free) */
  pricePerCall?: number;
  /** Payment wallet for x402 settlement */
  paymentAddress?: string;
  /** Whether this tool requires user confirmation (WebMCP elicitation) */
  requiresUserConfirmation?: boolean;
}

// ─── Registered Tool (stored in Fabric) ───

export interface RegisteredWebMCPTool {
  id: string;
  providerId: string;
  name: string;
  qualifiedName: string; // origin:toolName
  description: string;
  inputSchema: WebMCPToolSchema;
  origin: string;
  category: string;
  pricePerCall: number;
  paymentAddress: string | null;
  trustScore: number;
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  active: boolean;
  requiresUserConfirmation: boolean;
  registeredAt: string;
  updatedAt: string;
}

// ─── Registration Request ───

export interface WebMCPRegistrationRequest {
  /** Origin domain (e.g. 'https://flights.example.com') */
  origin: string;
  /** Tools to register */
  tools: WebMCPToolContract[];
  /** Provider wallet for x402 payments */
  paymentAddress?: string;
  /** Provider metadata */
  metadata?: {
    name?: string;
    description?: string;
    iconUrl?: string;
    termsUrl?: string;
    privacyUrl?: string;
  };
}

export interface WebMCPRegistrationResult {
  providerId: string;
  origin: string;
  tools: {
    name: string;
    qualifiedName: string;
    id: string;
  }[];
  trustScore: number;
}

// ─── Discovery ───

export interface WebMCPDiscoveryQuery {
  category?: string;
  origin?: string;
  toolName?: string;
  minTrustScore?: number;
  maxPrice?: number;
  limit?: number;
}

// ─── Execution ───

export interface WebMCPExecutionRequest {
  /** Tool ID or qualified name (origin:toolName) */
  tool: string;
  /** Arguments matching the tool's inputSchema */
  arguments: Record<string, unknown>;
  /** Agent ID (for trust + billing) */
  agentId: string;
  /** Budget ID (optional) */
  budgetId?: string;
}

export interface WebMCPExecutionResult {
  toolId: string;
  toolName: string;
  origin: string;
  result: unknown;
  payment: {
    total: number;
    settled: boolean;
    mode: 'x402' | 'direct' | 'mock' | 'free';
    txHash: string | null;
  };
  trust: {
    score: number;
    verified: boolean;
  };
  latencyMs: number;
  transactionId: string;
}

// ─── Manifest (for static tool declaration) ───

export interface WebMCPManifest {
  /** Spec version */
  version: '1.0';
  /** Origin */
  origin: string;
  /** Provider info */
  provider: {
    name: string;
    description?: string;
    paymentAddress?: string;
  };
  /** Tool definitions */
  tools: WebMCPToolContract[];
}
