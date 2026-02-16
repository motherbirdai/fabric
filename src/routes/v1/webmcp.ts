/**
 * WebMCP API Routes
 *
 * POST /v1/webmcp/register    — Register tools from an origin
 * POST /v1/webmcp/manifest    — Register tools from a manifest URL
 * GET  /v1/webmcp/discover    — Discover registered WebMCP tools
 * GET  /v1/webmcp/tools/:id   — Get a single tool by ID
 * POST /v1/webmcp/execute     — Execute a tool through Fabric trust+payment
 * POST /v1/webmcp/authorise   — Get payment auth for client-side execution
 * DELETE /v1/webmcp/origin    — Deactivate all tools from an origin
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  registerWebMCPTools,
  registerFromManifest,
  discoverWebMCPTools,
  getWebMCPTool,
  deactivateOriginTools,
} from '../../services/webmcp/registry.js';
import {
  executeWebMCPTool,
  authoriseWebMCPExecution,
} from '../../services/webmcp/bridge.js';
import {
  ValidationError,
  NotFoundError,
  toErrorResponse,
} from '../../utils/errors.js';
import { increment } from '../../utils/metrics.js';

export async function webmcpRoutes(app: FastifyInstance) {
  // ─── Register tools ───
  app.post('/webmcp/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body?.origin || !Array.isArray(body?.tools) || body.tools.length === 0) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('Required: origin (string), tools (array of tool contracts)'))
      );
    }

    // Validate each tool has name + description + inputSchema
    for (const tool of body.tools) {
      if (!tool.name || !tool.description || !tool.inputSchema) {
        return reply.status(400).send(
          toErrorResponse(new ValidationError(
            `Each tool requires: name, description, inputSchema. Missing on: ${tool.name ?? 'unnamed'}`
          ))
        );
      }
    }

    try {
      const result = await registerWebMCPTools(body, request.account!.id);
      increment('webmcp.api.register');

      return reply.status(201).send({
        success: true,
        ...result,
      });
    } catch (err) {
      return reply.status(500).send(
        toErrorResponse(new Error(`Registration failed: ${(err as Error).message}`))
      );
    }
  });

  // ─── Register from manifest ───
  app.post('/webmcp/manifest', async (request: FastifyRequest, reply: FastifyReply) => {
    const { url } = request.body as { url?: string };

    if (!url) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('Required: url (manifest URL)'))
      );
    }

    try {
      const result = await registerFromManifest(url, request.account!.id);
      increment('webmcp.api.manifest');

      return reply.status(201).send({
        success: true,
        ...result,
      });
    } catch (err) {
      return reply.status(500).send(
        toErrorResponse(new Error(`Manifest registration failed: ${(err as Error).message}`))
      );
    }
  });

  // ─── Discover tools ───
  app.get('/webmcp/discover', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      category?: string;
      origin?: string;
      toolName?: string;
      minTrustScore?: string;
      maxPrice?: string;
      limit?: string;
    };

    const tools = await discoverWebMCPTools({
      category: query.category,
      origin: query.origin,
      toolName: query.toolName,
      minTrustScore: query.minTrustScore ? parseFloat(query.minTrustScore) : undefined,
      maxPrice: query.maxPrice ? parseFloat(query.maxPrice) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });

    increment('webmcp.api.discover');

    return {
      tools: tools.map((t) => ({
        id: t.id,
        name: t.name,
        qualifiedName: t.qualifiedName,
        description: t.description,
        origin: t.origin,
        category: t.category,
        pricePerCall: t.pricePerCall,
        trustScore: t.trustScore,
        successRate: t.successRate,
        avgLatencyMs: t.avgLatencyMs,
        totalCalls: t.totalCalls,
        requiresUserConfirmation: t.requiresUserConfirmation,
        inputSchema: t.inputSchema,
      })),
      count: tools.length,
    };
  });

  // ─── Get single tool ───
  app.get('/webmcp/tools/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tool = await getWebMCPTool(id);

    if (!tool) {
      return reply.status(404).send(toErrorResponse(new NotFoundError('WebMCP tool')));
    }

    return { tool };
  });

  // ─── Execute tool ───
  app.post('/webmcp/execute', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body?.tool || !body?.agentId) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('Required: tool (ID or qualifiedName), agentId'))
      );
    }

    try {
      const result = await executeWebMCPTool(
        {
          tool: body.tool,
          arguments: body.arguments ?? {},
          agentId: body.agentId,
          budgetId: body.budgetId,
        },
        {
          accountId: request.account!.id,
          routingFeePct: request.account!.routingFeePct,
          canRoute: request.account!.config.canRoute,
        }
      );

      increment('webmcp.api.execute');

      return result;
    } catch (err) {
      increment('webmcp.api.execute.error');
      return reply.status(500).send(
        toErrorResponse(new Error(`Execution failed: ${(err as Error).message}`))
      );
    }
  });

  // ─── Authorise client-side execution ───
  app.post('/webmcp/authorise', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as any;

    if (!body?.tool || !body?.agentId) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('Required: tool (ID or qualifiedName), agentId'))
      );
    }

    try {
      const auth = await authoriseWebMCPExecution(
        {
          tool: body.tool,
          arguments: body.arguments ?? {},
          agentId: body.agentId,
          budgetId: body.budgetId,
        },
        {
          accountId: request.account!.id,
          routingFeePct: request.account!.routingFeePct,
          canRoute: request.account!.config.canRoute,
        }
      );

      increment('webmcp.api.authorise');

      return auth;
    } catch (err) {
      return reply.status(500).send(
        toErrorResponse(new Error(`Authorisation failed: ${(err as Error).message}`))
      );
    }
  });

  // ─── Deactivate origin ───
  app.delete('/webmcp/origin', async (request: FastifyRequest, reply: FastifyReply) => {
    const { origin } = request.body as { origin?: string };

    if (!origin) {
      return reply.status(400).send(
        toErrorResponse(new ValidationError('Required: origin'))
      );
    }

    const count = await deactivateOriginTools(origin);
    increment('webmcp.api.deactivate');

    return { deactivated: count, origin };
  });
}
