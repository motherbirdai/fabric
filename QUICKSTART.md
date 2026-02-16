# Fabric Gateway — Quickstart

Get the gateway running locally in 5 minutes.

## Prerequisites

- **Node.js 20+** (`node -v`)
- **Docker** (for Postgres + Redis)
- **pnpm** or **npm**

## 1. Start infrastructure

```bash
docker compose up -d
```

This starts Postgres (port 5432) and Redis (port 6379).

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment

```bash
cp .env.example .env
```

The defaults work for local dev — Postgres at `localhost:5432`, Redis at `localhost:6379`.

Optional: add your Brave Search API key to `.env`:
```
BRAVE_API_KEY=BSAvdaxnEDgGcs8Ul_z3Psrro6_nuvl
```

## 4. Setup database

```bash
npx prisma generate        # Generate Prisma client
npx prisma migrate dev     # Run migrations
npm run db:seed            # Seed test data
```

The seed creates:
- **Test account** (PRO plan) — prints API key to console, save it
- **Test agent** (`agent_seed_001`)
- **8 providers** (2 real Motherbird wrappers + 6 mock)

## 5. Start the gateway

```bash
npm run dev
```

Gateway runs at **http://localhost:3100**.

## 6. Test it

```bash
# Health check
curl http://localhost:3100/health

# Discover providers (needs API key from seed output)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3100/v1/discover

# Discover by category
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "http://localhost:3100/v1/discover?category=search"

# Route a request (mock mode — no wallet needed)
curl -X POST http://localhost:3100/v1/route \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_seed_001",
    "category": "image-generation",
    "input": { "prompt": "a robot painting" }
  }'

# Evaluate a provider's trust score
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3100/v1/evaluate/reg_flux_pro
```

## What works out of the box

| Feature | Status |
|---------|--------|
| Auth (API key) | ✅ |
| Provider discovery | ✅ |
| Trust scoring | ✅ |
| Provider selection | ✅ |
| Route with mock execution | ✅ |
| Feedback | ✅ |
| Budgets | ✅ |
| Favorites | ✅ |
| MCP tool interface | ✅ |
| WebSocket events | ✅ |
| Redis caching | ✅ (optional — works without) |
| Prometheus metrics | ✅ |

## What needs external config

| Feature | Needs |
|---------|-------|
| Real payments | Base Sepolia USDC + wallet keys |
| Stripe billing | Stripe API keys |
| On-chain identity | Deployed contracts + addresses |
| Error tracking | Sentry DSN |
| Dashboard | `cd dashboard && npm run dev` |

## Deploy to Railway

1. Push to GitHub (`motherbird/fabric`)
2. Go to [railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Add services: **PostgreSQL** + **Redis**
5. Railway auto-detects `Dockerfile` and provides `DATABASE_URL` + `REDIS_URL`
6. Set remaining env vars from `.env.example`
7. Deploy

## Project structure

```
src/
├── index.ts                  # Fastify entry point
├── config.ts                 # Environment config
├── db/                       # Prisma client + seed
├── middleware/                # Auth, rate limit, usage, security
├── routes/
│   ├── v1/                   # REST API endpoints
│   ├── mcp/                  # MCP tool interface
│   ├── auth/                 # SIWE wallet auth
│   └── wellknown/            # /.well-known/webmcp
└── services/
    ├── trust/                # Scoring algorithm
    ├── routing/              # Provider selection + execution
    ├── payments/             # x402, USDC, wallets, fees
    ├── billing/              # Stripe subscriptions
    ├── identity/             # ERC-8004 registry
    ├── cache/                # Redis
    ├── events/               # WebSocket
    └── webmcp/               # Browser agent bridge
```
