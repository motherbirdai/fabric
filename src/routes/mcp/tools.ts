/**
 * MCP (Model Context Protocol) tool definitions for Fabric.
 * These are served at GET /mcp/tools and used by Claude, GPT, Gemini, etc.
 *
 * Each tool maps 1:1 to a REST endpoint:
 *   fabric_discover   → GET  /v1/discover
 *   fabric_route      → POST /v1/route
 *   fabric_evaluate   → GET  /v1/evaluate/:id
 *   fabric_feedback   → POST /v1/feedback
 *   fabric_budget     → GET  /v1/budget (list) / POST /v1/budget (create)
 *   fabric_favorites  → GET/POST/DELETE /v1/favorites
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const FABRIC_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'fabric_discover',
    description:
      'Find AI service providers by category. Returns a ranked list scored by trust, reliability, and price. Use this to explore what providers are available before routing a request.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description:
            'Service category to search (e.g. "image-generation", "code-review", "translation", "transcription", "data-analysis")',
        },
        limit: {
          type: 'number',
          description: 'Maximum results to return (1–50, default 5)',
        },
        minTrustScore: {
          type: 'number',
          description: 'Minimum trust score filter (0–5)',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum price per request in USD',
        },
      },
      required: ['category'],
    },
  },
  {
    name: 'fabric_route',
    description:
      'Route a request to the best available provider. Fabric selects the optimal provider based on trust scores, your preferences, and favorites — then executes the request and handles payment via x402 on Base L2. Returns the provider response and a payment receipt.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Your agent ID (from account setup)',
        },
        category: {
          type: 'string',
          description: 'Service category to route to',
        },
        input: {
          type: 'object',
          description:
            'Request payload to send to the provider (shape depends on the category/provider)',
        },
        preferences: {
          type: 'object',
          description: 'Optional routing preferences',
          properties: {
            maxPrice: {
              type: 'number',
              description: 'Max price in USD',
            },
            minTrustScore: {
              type: 'number',
              description: 'Min trust score (0–5)',
            },
            preferredProviders: {
              type: 'array',
              items: { type: 'string' },
              description: 'Provider IDs to prefer',
            },
            maxLatencyMs: {
              type: 'number',
              description: 'Max acceptable latency in ms',
            },
          },
        },
        budget: {
          type: 'string',
          description: 'Budget ID to charge against (optional)',
        },
      },
      required: ['agentId', 'category', 'input'],
    },
  },
  {
    name: 'fabric_evaluate',
    description:
      'Get a detailed trust profile for a specific provider. Includes trust score breakdown (7 signals), recent feedback, latency stats (p50/p95/p99), circuit breaker status, and transaction history. Use this to inspect a provider before routing to it.',
    inputSchema: {
      type: 'object',
      properties: {
        providerId: {
          type: 'string',
          description: 'Provider ID or registry ID to evaluate',
        },
      },
      required: ['providerId'],
    },
  },
  {
    name: 'fabric_feedback',
    description:
      'Submit a quality rating after a routed request completes. Feedback improves trust scores for future routing. Score from 1 (terrible) to 5 (excellent). Optionally tag and comment.',
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: {
          type: 'string',
          description: 'Transaction ID from the route response',
        },
        score: {
          type: 'number',
          description: 'Quality rating 1–5 (1 = terrible, 5 = excellent)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional tags (e.g. "fast", "accurate", "slow", "wrong-output")',
        },
        comment: {
          type: 'string',
          description: 'Optional free-text comment (max 1000 chars)',
        },
      },
      required: ['transactionId', 'score'],
    },
  },
  {
    name: 'fabric_budget',
    description:
      'Manage spend controls. List existing budgets or create a new one. Budgets can be account-level or agent-level, with daily/weekly/monthly periods and optional hard caps that block requests when exceeded.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create', 'status'],
          description: 'Action to perform',
        },
        budgetId: {
          type: 'string',
          description: 'Budget ID (required for "status" action)',
        },
        agentId: {
          type: 'string',
          description: 'Agent ID (optional for "create" — omit for account-level)',
        },
        limitUsd: {
          type: 'number',
          description: 'Spend limit in USD (required for "create")',
        },
        periodType: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly'],
          description: 'Budget reset period (default "daily")',
        },
        hardCap: {
          type: 'boolean',
          description: 'If true, block requests when budget exceeded',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'fabric_webmcp_discover',
    description:
      'Discover WebMCP tools — browser-native tool contracts registered by websites via the W3C WebMCP spec (navigator.modelContext). These tools run client-side in the browser with Fabric trust scoring and x402 payment wrapping. Filter by category, origin, price, or trust score.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Tool category (e.g. "travel", "ecommerce", "finance", "productivity")',
        },
        origin: {
          type: 'string',
          description: 'Filter by origin domain (e.g. "https://flights.example.com")',
        },
        toolName: {
          type: 'string',
          description: 'Partial name match filter',
        },
        minTrustScore: {
          type: 'number',
          description: 'Minimum trust score (0–5)',
        },
        maxPrice: {
          type: 'number',
          description: 'Maximum price per call in USD (0 = free only)',
        },
        limit: {
          type: 'number',
          description: 'Max results (default 20)',
        },
      },
    },
  },
  {
    name: 'fabric_webmcp_execute',
    description:
      'Execute a WebMCP tool through Fabric\'s trust and payment layer. Resolves the tool, verifies the provider\'s trust score, handles x402 payment settlement on Base, and returns the result. Use fabric_webmcp_discover first to find available tools.',
    inputSchema: {
      type: 'object',
      properties: {
        tool: {
          type: 'string',
          description: 'Tool ID or qualified name (origin:toolName)',
        },
        arguments: {
          type: 'object',
          description: 'Arguments matching the tool\'s inputSchema',
        },
        agentId: {
          type: 'string',
          description: 'Your agent ID',
        },
        budgetId: {
          type: 'string',
          description: 'Budget ID to charge against (optional)',
        },
      },
      required: ['tool', 'agentId'],
    },
  },
  {
    name: 'fabric_webmcp_register',
    description:
      'Register WebMCP tool contracts from a website origin. Sites publish tools via navigator.modelContext.registerTool() — this indexes them in Fabric\'s registry with trust scoring and payment support.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: {
          type: 'string',
          description: 'Origin domain (e.g. "https://shop.example.com")',
        },
        tools: {
          type: 'array',
          description: 'Array of tool contracts with name, description, inputSchema',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              inputSchema: { type: 'object' },
              category: { type: 'string' },
              pricePerCall: { type: 'number' },
            },
            required: ['name', 'description', 'inputSchema'],
          },
        },
        paymentAddress: {
          type: 'string',
          description: 'Wallet address for x402 payments (optional)',
        },
      },
      required: ['origin', 'tools'],
    },
  },
  {
    name: 'fabric_favorites',
    description:
      'Manage preferred providers. Favorited providers get a ranking boost during routing. Higher priority = bigger boost.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add', 'remove'],
          description: 'Action to perform',
        },
        agentId: {
          type: 'string',
          description: 'Agent ID (required for "list" and "add")',
        },
        providerId: {
          type: 'string',
          description: 'Provider ID (required for "add" and "remove")',
        },
        priority: {
          type: 'number',
          description: 'Priority boost 0–100 (default 0, required for "add")',
        },
        favoriteId: {
          type: 'string',
          description: 'Favorite ID (required for "remove")',
        },
      },
      required: ['action'],
    },
  },
];
