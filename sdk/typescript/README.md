# @fabric-protocol/sdk

TypeScript SDK for the Fabric trust layer.

## Install

```bash
npm install @fabric-protocol/sdk
```

## Quick Start

```typescript
import { Fabric } from '@fabric-protocol/sdk';

const fabric = new Fabric({
  apiKey: 'fab_your_key_here',
  agentId: 'agent_001', // default agent
});

// Discover providers
const { providers } = await fabric.discover({
  category: 'image-generation',
  limit: 5,
  minTrustScore: 4.0,
});

// Route a request (selects best provider, pays, executes)
const result = await fabric.route({
  category: 'image-generation',
  input: { prompt: 'A cyberpunk cityscape at sunset' },
  preferences: { maxPrice: 0.05 },
});

console.log(result.result);           // provider response
console.log(result.payment.total);    // cost in USD
console.log(result.payment.settled);  // on-chain settlement

// Submit feedback
await fabric.feedback({
  transactionId: result.transactionId,
  score: 5,
  tags: ['fast', 'high-quality'],
});

// One-liner: route + auto-rate
const rated = await fabric.routeAndRate(
  'translation',
  { text: 'Hello world', target: 'es' },
  (result) => 5 // rate the output
);
```

## API

| Method | Description |
|--------|-------------|
| `discover(opts)` | Find providers by category |
| `route(opts)` | Route, pay, and execute |
| `evaluate(id)` | Detailed trust profile |
| `feedback(opts)` | Post-transaction rating |
| `listBudgets()` | List spend controls |
| `createBudget(opts)` | Create a budget |
| `budgetStatus(id)` | Check budget utilisation |
| `listFavorites(agentId?)` | List preferred providers |
| `addFavorite(opts)` | Add a favorite |
| `removeFavorite(id)` | Remove a favorite |
| `listWallets()` | List managed wallets |
| `createWallet(agentId?)` | Create managed wallet |
| `walletBalance(agentId?)` | Check USDC + ETH balance |
| `chainStatus()` | Chain info + contracts |
| `mcpTools()` | Get MCP tool definitions |
| `mcpExecute(tool, args)` | Execute an MCP tool |
| `routeAndRate(cat, input, fn)` | Route + feedback in one call |
