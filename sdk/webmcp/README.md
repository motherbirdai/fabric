# @usefabric/webmcp

Bridge the [W3C WebMCP spec](https://github.com/nicolo-ribaudo/webmcp) (`navigator.modelContext`) with Fabric's trust scoring, discovery, and x402 payment layer.

WebMCP lets websites expose structured tools to AI agents natively in the browser. Fabric adds the missing pieces: **trust verification**, **autonomous payments**, and **cross-origin discovery**.

## Quick Start

```bash
npm install @usefabric/webmcp
```

```typescript
import { FabricWebMCP } from '@usefabric/webmcp';

const fabric = new FabricWebMCP({
  apiKey: process.env.FABRIC_KEY,
  gateway: 'https://fabric-gateway.fly.dev',
});

// Register a tool — goes to both navigator.modelContext AND Fabric
fabric.registerTool({
  name: 'searchFlights',
  description: 'Search available flights by route and date',
  inputSchema: {
    type: 'object',
    properties: {
      origin: { type: 'string', description: 'Airport code (e.g. SYD)' },
      destination: { type: 'string', description: 'Airport code (e.g. LAX)' },
      date: { type: 'string', description: 'YYYY-MM-DD' },
    },
    required: ['origin', 'destination', 'date'],
  },
  category: 'travel',
  pricePerCall: 0.01, // $0.01 per search
  async execute(params) {
    const results = await flightAPI.search(params);
    return { flights: results };
  },
});

// Tools auto-sync to Fabric on registration
```

## How It Works

```
Browser (your site)          Fabric Gateway            Base L2
─────────────────           ───────────────           ─────────
registerTool()  ──────────► Index tool contract
                            Compute trust score
                            
Agent calls tool ──────────► Verify trust ≥ threshold
                            Settle x402 payment ─────► USDC transfer
                            Proxy to origin    ◄─────  Confirmation
                ◄──────────  Return result + receipt
```

## Two Execution Modes

### Server-Proxied (default)
Fabric calls your origin's WebMCP endpoint, handles payment, returns the result:

```typescript
const result = await fabric.execute('searchFlights', {
  origin: 'SYD', destination: 'LAX', date: '2026-03-15'
}, agentId);
// result.payment.settled === true
```

### Client-Delegated
Fabric authorises the payment, your browser executes the tool locally:

```typescript
const result = await fabric.executeLocal('searchFlights', {
  origin: 'SYD', destination: 'LAX', date: '2026-03-15'
}, agentId);
// result.local === true, result.trust.verified === true
```

## Discovery

Find WebMCP tools across all registered origins:

```typescript
const tools = await fabric.discover({
  category: 'travel',
  minTrustScore: 0.7,
  maxPrice: 0.05,
});
```

## Auto-Sync Existing Page Tools

If your page already registers tools with `navigator.modelContext`, sync them to Fabric:

```typescript
import { syncPageToolsToFabric } from '@usefabric/webmcp';

await syncPageToolsToFabric({
  apiKey: 'fab_...',
  gateway: 'https://fabric-gateway.fly.dev',
});
```

## WebMCP vs MCP

| Feature | MCP (Anthropic) | WebMCP (W3C) | Fabric |
|---------|-----------------|--------------|--------|
| Runtime | Server-side | Browser-native | Both |
| Protocol | JSON-RPC | navigator.modelContext | REST + MCP |
| Trust | None built-in | None built-in | ✅ 7-signal scoring |
| Payments | None built-in | None built-in | ✅ x402 / USDC on Base |
| Discovery | Per-server | Per-page | ✅ Cross-origin registry |
| Human-in-loop | Optional | Required | Configurable |

Fabric is the trust + payment layer that sits between agents and both MCP servers and WebMCP tools.

## API Reference

### `FabricWebMCP(config)`
- `apiKey` — Fabric API key (required)
- `gateway` — Gateway URL (default: `https://fabric-gateway.fly.dev`)
- `origin` — Override origin domain
- `paymentAddress` — Wallet for receiving x402 payments
- `autoSync` — Auto-sync on registerTool (default: true)

### `.registerTool(tool)`
Register a tool with both WebMCP and Fabric.

### `.sync()`
Manually sync all tools to Fabric gateway.

### `.execute(toolName, args, agentId, budgetId?)`
Execute through Fabric (server-proxied).

### `.executeLocal(toolName, args, agentId)`
Execute locally with Fabric trust+payment authorisation.

### `.authorise(toolName, args, agentId)`
Get payment authorisation token for client-side execution.

### `.discover(query?)`
Search registered WebMCP tools across all origins.
