# 🧵 Fabric Gateway

**The trust layer for the agent economy.** Fabric is a decentralised routing gateway that enables AI agents to discover, evaluate, and pay for services from other agents — with trust scoring, budget controls, and on-chain settlement on Base L2.

## Architecture

```
Agent SDK → Gateway API → Trust Scorer → Provider Selection → x402 Payment → Base L2
     ↕            ↕            ↕              ↕                    ↕
  Dashboard   Rate Limit    Redis Cache   Circuit Breaker     FabricRegistry
              Billing       Score Decay   Fallback Chain      FabricIdentity
```

## Quick Start

```bash
# 1. Clone & install
git clone <repo>
cd fabric-gateway
npm install

# 2. Start infrastructure
docker compose up -d postgres redis

# 3. Setup database
cp .env.example .env
npx prisma db push
npx tsx src/db/seed.ts

# 4. Start gateway
npm run dev                    # http://localhost:3100

# 5. Start dashboard
cd dashboard && npm install && npm run dev  # http://localhost:3000
```

## Gateway API

All endpoints require `x-api-key` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check + system status |
| GET | `/v1/discover` | Find providers by category, trust, price |
| POST | `/v1/evaluate` | Evaluate a provider's trust score |
| POST | `/v1/route` | Route a request to the best provider |
| POST | `/v1/feedback` | Submit quality feedback for a provider |
| GET/POST | `/v1/budget` | Get/set spending budget controls |
| GET/POST/DELETE | `/v1/favorites` | Manage favorite providers |
| GET/POST | `/v1/wallets` | List/create managed agent wallets |
| GET | `/v1/chain/status` | Base L2 chain status |
| POST | `/v1/providers/register` | Register a new provider |
| GET | `/v1/providers/list` | List all providers |
| GET | `/v1/providers/:id` | Get provider details |
| PATCH | `/v1/providers/:id` | Update provider |
| DELETE | `/v1/providers/:id` | Deactivate provider |
| GET | `/v1/billing/subscription` | Current plan + usage |
| POST | `/v1/billing/checkout` | Create Stripe checkout |
| POST | `/v1/billing/portal` | Open Stripe customer portal |
| GET | `/v1/billing/invoices` | Invoice history |
| GET | `/v1/billing/overage` | Overage summary |
| GET | `/auth/siwe/nonce` | Get SIWE nonce for wallet auth |
| POST | `/auth/siwe/verify` | Verify SIWE signature |
| POST | `/mcp/tools` | MCP tool discovery |
| POST | `/mcp/execute` | MCP tool execution |
| WS | `/ws` | WebSocket real-time events |
| GET | `/events` | SSE event stream (fallback) |
| GET | `/metrics` | Prometheus metrics |

## Trust Scoring

Providers are scored across five weighted dimensions:

- **Uptime** (25%) — endpoint availability from periodic probes
- **Latency** (20%) — response time vs category median
- **Success rate** (25%) — percentage of non-error responses
- **Feedback** (20%) — aggregated user ratings (1-5)
- **Stake** (10%) — on-chain reputation from FabricRegistry

Scores decay over time to reflect recency — a provider with no recent interactions gradually reverts toward the baseline.

## Billing Plans

| Plan | Price | Daily Limit | Routing Fee | Wallets |
|------|-------|-------------|-------------|---------|
| Free | $0/mo | 50 | 0% | 0 |
| Builder | $9/mo | 5,000 | 0.5% | 3 |
| Pro | $39/mo | 15,000 | 0.4% | 10 |
| Team | $149/mo | 50,000 | 0.3% | 50 |

Overage: $0.001 per additional request. Managed via Stripe.

## Dashboard

Next.js 15 dashboard at `http://localhost:3000`:

| Page | Description |
|------|-------------|
| `/login` | API key + SIWE wallet authentication |
| `/dashboard` | Live overview: plan usage, system health, budgets |
| `/dashboard/providers` | Browse registry, filter by category/trust, favorites |
| `/dashboard/providers/register` | 3-step provider onboarding flow |
| `/dashboard/providers/[id]` | Provider detail: trust breakdown, feedback, stats |
| `/dashboard/agents` | Managed wallets on Base L2 |
| `/dashboard/analytics` | Usage, cost projections, wallet balances |
| `/dashboard/budgets` | Create/view spending limits (hard/soft caps) |
| `/dashboard/events` | Real-time WebSocket event stream with filters |
| `/dashboard/billing` | Plan management, Stripe checkout, invoices |
| `/dashboard/keys` | API key generation, viewing, revocation |
| `/dashboard/settings` | Account info, chain status, resources |

## Smart Contracts (Base L2)

Solidity contracts deployed on Base Sepolia:

- **FabricRegistry** — ERC-8004 agent registry with reputation scores
- **FabricIdentity** — ERC-721 identity NFTs for registered agents

```bash
# Deploy to Base Sepolia
DEPLOYER_PRIVATE_KEY=0x... ./scripts/deploy-contracts.sh

# Run Foundry tests
cd contracts && forge test -vvv
```

## SDKs

### TypeScript

```typescript
import { FabricClient } from '@fabric-gateway/sdk';

const fabric = new FabricClient({ apiKey: 'fab_sk_...' });

const providers = await fabric.discover({ category: 'image-generation' });
const result = await fabric.route({ capability: 'image-generation', input: { prompt: '...' } });
await fabric.feedback({ providerId: result.providerId, score: 5 });
```

### Python

```python
from fabric_sdk import FabricClient

client = FabricClient(api_key="fab_sk_...")

providers = client.discover(category="image-generation")
result = client.route(capability="image-generation", input={"prompt": "..."})
client.feedback(provider_id=result.provider_id, score=5)
```

### MCP (Model Context Protocol)

9 tools available via MCP for LLM agents:
`fabric_discover`, `fabric_route`, `fabric_evaluate`, `fabric_feedback`, `fabric_budget`, `fabric_favorites`, `fabric_webmcp_discover`, `fabric_webmcp_execute`, `fabric_webmcp_register`

### WebMCP (Browser SDK)

Bridge W3C WebMCP (`navigator.modelContext`) with Fabric trust + x402 payments:

```typescript
import { FabricWebMCP } from '@usefabric/webmcp';

const fabric = new FabricWebMCP({
  apiKey: 'fab_sk_...',
  gateway: 'https://fabric-gateway.fly.dev',
});

// Register a tool — bridges browser-native WebMCP with Fabric trust+payment
fabric.registerTool({
  name: 'searchProducts',
  description: 'Search the product catalog',
  inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  category: 'ecommerce',
  pricePerCall: 0.01,
  async execute(params) { return await productSearch(params.query); },
});

// Discover WebMCP tools across all origins
const tools = await fabric.discover({ category: 'travel', minTrustScore: 0.7 });

// Execute through Fabric trust+payment
const result = await fabric.execute('searchProducts', { query: 'shoes' }, agentId);
```

## WebSocket Events

Connect to `ws://localhost:3100/ws?key=fab_sk_...` for real-time events:

```
route.completed    — Successful request routing
route.failed       — Failed routing attempt
trust.updated      — Provider trust score change
budget.warning     — Budget approaching limit
budget.exceeded    — Budget limit reached
provider.registered — New provider registered
overage.triggered  — Overage request charged
wallet.funded      — Wallet received funds
health.changed     — System health change
```

## Deployment

```bash
# Docker
docker compose up -d

# Fly.io
fly deploy --config fly.toml

# Railway
railway up

# Full staging setup
./scripts/setup-staging.sh

# E2E tests
GATEWAY_URL=http://localhost:3100 API_KEY=fab_sk_... npx tsx tests/e2e.test.ts
```

## CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):

1. **Lint** — TypeScript type check
2. **Test** — Vitest unit tests with Postgres + Redis
3. **Contracts** — Foundry build + test
4. **E2E** — Full integration test against live gateway
5. **Docker** — Build and push to GHCR
6. **Deploy** — Fly.io staging/production

## Project Structure

```
fabric-gateway/
├── src/
│   ├── index.ts                 # Fastify server entry
│   ├── config.ts                # Environment config
│   ├── routes/
│   │   ├── v1/                  # API routes (discover, route, billing, providers...)
│   │   ├── auth/siwe.ts         # SIWE wallet authentication
│   │   ├── mcp/                 # MCP handler + tools
│   │   ├── health.ts            # Health + readiness checks
│   │   └── metrics.ts           # Prometheus exporter
│   ├── services/
│   │   ├── trust/               # Scorer, weights, decay
│   │   ├── routing/             # Selector, executor, fallback, latency
│   │   ├── payments/            # x402, USDC, fees, wallets
│   │   ├── chain/               # viem client, ABIs, writer
│   │   ├── identity/            # Registry, resolver, NFT, reputation
│   │   ├── billing/             # Stripe, subscriptions, invoices, overage
│   │   ├── events/              # WebSocket + SSE real-time events
│   │   ├── cache/               # Redis cache + score cache
│   │   ├── security/            # KMS key management
│   │   └── monitoring/          # Sentry integration
│   ├── middleware/               # Auth, rate limit, security, usage
│   ├── db/                      # Prisma client + seed
│   └── utils/                   # Errors, validation, metrics
├── dashboard/                   # Next.js 15 dashboard
│   ├── app/                     # App router pages (13 pages)
│   ├── components/              # Sidebar, event feed
│   └── lib/                     # API client, auth, hooks, events
├── contracts/                   # Solidity (Foundry)
│   ├── src/                     # FabricRegistry, FabricIdentity
│   ├── test/                    # 40 Foundry tests
│   └── script/                  # Deployment scripts
├── sdk/                         # TypeScript + Python SDKs
├── tests/                       # Unit + E2E tests (10 files)
├── monitoring/                  # Grafana dashboards, Prometheus
├── scripts/                     # Deploy, staging, load test
├── .github/workflows/ci.yml    # CI/CD pipeline
├── fly.toml                     # Fly.io config
├── railway.json                 # Railway config
├── docker-compose.yml           # Dev infrastructure
├── docker-compose.prod.yml      # Production stack
└── Dockerfile                   # Multi-stage build
```

## License

MIT — Fabric Technology Ltd.
