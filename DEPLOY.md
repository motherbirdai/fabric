# Deployment Guide

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- PostgreSQL 16
- Redis 7
- Stripe account (for billing)
- Base Sepolia ETH (for contract deployment)

## Local Development

```bash
# Start infrastructure
docker compose up -d postgres redis

# Setup database
cp .env.example .env    # Edit with your values
npx prisma db push
npx tsx src/db/seed.ts

# Start gateway
npm run dev             # → http://localhost:3100

# Start dashboard (separate terminal)
cd dashboard && npm install && npm run dev  # → http://localhost:3000
```

## Staging

```bash
# Automated setup
./scripts/setup-staging.sh

# Or manual steps:
docker compose up -d postgres redis
npx prisma migrate deploy
npm run dev
```

## Contract Deployment (Base Sepolia)

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Deploy
export DEPLOYER_PRIVATE_KEY="0x..."
./scripts/deploy-contracts.sh

# Output:
#   FabricRegistry:  0x...
#   FabricIdentity:  0x...
#
# Add to .env:
#   FABRIC_REGISTRY_ADDRESS=0x...
#   FABRIC_IDENTITY_ADDRESS=0x...
#   FABRIC_OPERATOR_KEY=0x...
```

Get testnet ETH: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

## Fly.io

```bash
# Install CLI
curl -L https://fly.io/install.sh | sh

# Launch (first time)
fly launch --config fly.toml

# Set secrets
fly secrets set \
  DATABASE_URL="postgresql://..." \
  REDIS_URL="redis://..." \
  STRIPE_SECRET_KEY="sk_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  FABRIC_OPERATOR_KEY="0x..." \
  FABRIC_REGISTRY_ADDRESS="0x..." \
  FABRIC_IDENTITY_ADDRESS="0x..."

# Deploy
fly deploy

# Scale
fly scale count 2 --region iad,sjc

# Logs
fly logs
```

## Railway

```bash
# Install CLI
npm i -g @railway/cli

# Login + deploy
railway login
railway init
railway up

# Add env vars via Railway dashboard
```

## Docker (Self-hosted)

```bash
# Production stack with monitoring
docker compose -f docker-compose.prod.yml up -d

# Includes:
#   - Gateway (port 3100)
#   - PostgreSQL (port 5432)
#   - Redis (port 6379)
#   - Prometheus (port 9090)
#   - Grafana (port 3001)
```

## Stripe Setup

1. Create products and prices in Stripe Dashboard
2. Set price IDs in `.env`:
   ```
   STRIPE_PRICE_BUILDER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_TEAM=price_...
   STRIPE_OVERAGE_PRICE=price_...
   ```
3. Configure webhook endpoint: `https://your-domain.com/webhooks/stripe`
4. Set `STRIPE_WEBHOOK_SECRET` from the webhook signing secret

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis connection string |
| `STRIPE_SECRET_KEY` | For billing | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `FABRIC_OPERATOR_KEY` | For chain | Private key for on-chain operations |
| `FABRIC_REGISTRY_ADDRESS` | For chain | FabricRegistry contract address |
| `FABRIC_IDENTITY_ADDRESS` | For chain | FabricIdentity contract address |
| `CHAIN_RPC_URL` | No | Base RPC URL (default: sepolia.base.org) |
| `CORS_ORIGIN` | No | Dashboard origin (default: http://localhost:3000) |
| `SENTRY_DSN` | No | Sentry error tracking DSN |

## Monitoring

- **Health check**: `GET /health`
- **Prometheus metrics**: `GET /metrics`
- **Grafana dashboard**: `monitoring/grafana/dashboards/gateway.json`
- **WebSocket events**: `ws://host:3100/ws`
- **SSE fallback**: `GET /events`

## Testing

```bash
# Unit tests
npm test

# E2E integration tests
GATEWAY_URL=http://localhost:3100 API_KEY=fab_sk_... npm run test:e2e

# Contract tests
npm run test:contracts

# Load test
node scripts/load-test.mjs
```
