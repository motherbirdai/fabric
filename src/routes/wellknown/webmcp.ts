/**
 * /.well-known/webmcp routes
 *
 * Standard endpoints for WebMCP interoperability:
 *   GET  /.well-known/webmcp          — Tool manifest for this gateway
 *   GET  /.well-known/webmcp/tools    — List all registered tools
 *   POST /.well-known/webmcp/execute  — Execute a tool (used by Fabric bridge)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { discoverWebMCPTools, getWebMCPTool } from '../../services/webmcp/registry.js';
import { increment } from '../../utils/metrics.js';

export async function wellKnownWebMCPRoutes(app: FastifyInstance) {
  // ─── Manifest ───
  app.get('/.well-known/webmcp', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Content-Type', 'application/json');
    reply.header('Access-Control-Allow-Origin', '*');

    const tools = await discoverWebMCPTools({ limit: 100 });

    return {
      version: '1.0',
      origin: 'https://fabric-gateway.fly.dev',
      provider: {
        name: 'Fabric Gateway',
        description: 'Trust layer for the agent economy — discover, verify, and pay AI services',
      },
      tools: tools.map((t) => ({
        name: t.qualifiedName,
        description: t.description,
        inputSchema: t.inputSchema,
        category: t.category,
        pricePerCall: t.pricePerCall,
        trustScore: t.trustScore,
      })),
      meta: {
        protocol: 'webmcp',
        fabricVersion: '1.0',
        totalTools: tools.length,
      },
    };
  });

  // ─── List tools (simpler format) ───
  app.get('/.well-known/webmcp/tools', async () => {
    const tools = await discoverWebMCPTools({ limit: 100 });
    increment('webmcp.wellknown.tools');

    return {
      tools: tools.map((t) => ({
        name: t.name,
        qualifiedName: t.qualifiedName,
        description: t.description,
        origin: t.origin,
        category: t.category,
        pricePerCall: t.pricePerCall,
        trustScore: t.trustScore,
        inputSchema: t.inputSchema,
      })),
      count: tools.length,
    };
  });

  // ─── Execute tool (called by Fabric bridge or external agents) ───
  app.post('/.well-known/webmcp/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as {
      tool?: string;
      arguments?: Record<string, unknown>;
    };

    if (!body?.tool) {
      return reply.status(400).send({
        error: { code: 'MISSING_TOOL', message: 'Required: tool (name or qualifiedName)' },
      });
    }

    const tool = await getWebMCPTool(body.tool);
    if (!tool) {
      return reply.status(404).send({
        error: { code: 'TOOL_NOT_FOUND', message: `Tool not found: ${body.tool}` },
      });
    }

    increment('webmcp.wellknown.execute');

    // This endpoint is for tool metadata / routing.
    // Actual execution happens client-side via navigator.modelContext
    // or server-side via the origin's own endpoint.
    return {
      tool: {
        id: tool.id,
        name: tool.name,
        qualifiedName: tool.qualifiedName,
        origin: tool.origin,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      trust: {
        score: tool.trustScore,
        successRate: tool.successRate,
        totalCalls: tool.totalCalls,
      },
      execution: {
        mode: 'delegate_to_origin',
        originEndpoint: `${tool.origin}/.well-known/webmcp/execute`,
        message: 'Execute this tool at the origin endpoint or via client-side navigator.modelContext',
      },
    };
  });
}
