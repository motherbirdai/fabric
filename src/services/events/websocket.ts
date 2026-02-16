import { FastifyInstance } from 'fastify';
import websocket from '@fastify/websocket';
import { WebSocket } from 'ws';

// ─── Event types ───

export type FabricEvent =
  | { type: 'route.completed'; data: { routeId: string; providerId: string; providerName: string; cost: number; latencyMs: number; paymentMode: string; txHash?: string } }
  | { type: 'route.failed'; data: { routeId: string; providerId: string; error: string } }
  | { type: 'trust.updated'; data: { providerId: string; providerName: string; oldScore: number; newScore: number } }
  | { type: 'budget.warning'; data: { budgetId: string; label: string; spentUsd: number; limitUsd: number; pct: number } }
  | { type: 'budget.exceeded'; data: { budgetId: string; label: string; spentUsd: number; limitUsd: number } }
  | { type: 'provider.registered'; data: { providerId: string; name: string; category: string; txHash?: string } }
  | { type: 'overage.triggered'; data: { count: number; costUsd: number } }
  | { type: 'wallet.funded'; data: { walletId: string; address: string; amount: number; txHash: string } }
  | { type: 'health.changed'; data: { component: string; status: string; latencyMs?: number } };

// ─── Connection registry (keyed by API key) ───

interface Client {
  ws: WebSocket;
  apiKey: string;
  subscribedEvents: Set<string>;
}

const clients = new Map<WebSocket, Client>();

/**
 * Emit an event to all connected clients (or filtered by API key).
 */
export function emitEvent(event: FabricEvent, apiKey?: string) {
  const payload = JSON.stringify({ ...event, timestamp: Date.now() });

  for (const [, client] of clients) {
    // Filter by API key if specified
    if (apiKey && client.apiKey !== apiKey) continue;

    // Filter by subscription
    if (client.subscribedEvents.size > 0 && !client.subscribedEvents.has(event.type) && !client.subscribedEvents.has('*')) {
      continue;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      try { client.ws.send(payload); } catch {}
    }
  }
}

/**
 * Broadcast to ALL connected clients (system events).
 */
export function broadcastEvent(event: FabricEvent) {
  emitEvent(event);
}

/**
 * Get count of connected clients.
 */
export function getConnectedClients(): number {
  return clients.size;
}

// ─── Fastify plugin ───

export async function websocketRoutes(app: FastifyInstance) {
  await app.register(websocket);

  app.get('/ws', { websocket: true }, (socket, req) => {
    // Extract API key from query or headers
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const apiKey = url.searchParams.get('key') || (req.headers['x-api-key'] as string) || '';

    const client: Client = {
      ws: socket as any,
      apiKey,
      subscribedEvents: new Set(['*']), // Subscribe to all by default
    };

    clients.set(socket as any, client);

    // Send welcome
    try {
      (socket as any).send(JSON.stringify({
        type: 'connected',
        timestamp: Date.now(),
        message: 'Connected to Fabric event stream',
      }));
    } catch {}

    // Handle incoming messages (subscriptions)
    (socket as any).on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'subscribe' && Array.isArray(msg.events)) {
          client.subscribedEvents = new Set(msg.events);
          (socket as any).send(JSON.stringify({
            type: 'subscribed',
            events: msg.events,
            timestamp: Date.now(),
          }));
        }
        if (msg.type === 'ping') {
          (socket as any).send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        }
      } catch {}
    });

    // Cleanup on close
    (socket as any).on('close', () => {
      clients.delete(socket as any);
    });

    (socket as any).on('error', () => {
      clients.delete(socket as any);
    });
  });

  // SSE fallback for environments that don't support WebSockets
  app.get('/events', async (request, reply) => {
    const apiKey = (request.query as any).key || request.headers['x-api-key'] || '';

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    reply.raw.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    // Create a pseudo-client for SSE
    const pseudoWs = {
      readyState: WebSocket.OPEN,
      send: (data: string) => {
        try {
          reply.raw.write(`data: ${data}\n\n`);
        } catch {}
      },
    } as any;

    const client: Client = {
      ws: pseudoWs,
      apiKey,
      subscribedEvents: new Set(['*']),
    };

    clients.set(pseudoWs, client);

    // Heartbeat
    const heartbeat = setInterval(() => {
      try { reply.raw.write(`: heartbeat\n\n`); } catch {}
    }, 30000);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(pseudoWs);
    });
  });
}
