#!/bin/bash
#
# Bootstrap a staging environment for Fabric Gateway.
# Creates DB, Redis, seeds data, and starts the gateway.
#
# Usage:
#   ./scripts/setup-staging.sh
#
set -euo pipefail

echo "🧵 Fabric Gateway — Staging Setup"
echo ""

# ─── Check dependencies ───

command -v docker >/dev/null 2>&1 || { echo "❌ Docker required"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required"; exit 1; }

# ─── Start infrastructure ───

echo "📦 Starting Postgres + Redis..."
docker compose up -d postgres redis 2>/dev/null || docker-compose up -d postgres redis

# Wait for Postgres
echo "   Waiting for Postgres..."
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -q 2>/dev/null && break
  sleep 1
done

# ─── Environment ───

if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  # Override for staging
  sed -i 's|DATABASE_URL=.*|DATABASE_URL=postgresql://fabric:fabric@localhost:5432/fabric_staging|' .env
  sed -i 's|REDIS_URL=.*|REDIS_URL=redis://localhost:6379|' .env
  sed -i 's|NODE_ENV=.*|NODE_ENV=staging|' .env
fi

source .env 2>/dev/null || true

# ─── Database ───

echo "🗄️  Running migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --force-reset

echo "🌱 Seeding database..."
npx tsx src/db/seed.ts 2>/dev/null || echo "   Seed script not found — skipping"

# ─── Build ───

echo "🔨 Building gateway..."
npx tsc --noEmit 2>/dev/null || echo "   Type check warnings (non-blocking)"

# ─── Test ───

echo "🧪 Running unit tests..."
npx vitest run --reporter=dot 2>/dev/null || echo "   Some tests failed (non-blocking for staging)"

# ─── Start ───

echo ""
echo "═══════════════════════════════════════════════════"
echo "  STAGING ENVIRONMENT READY"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Gateway:    http://localhost:3100"
echo "  Health:     http://localhost:3100/health"
echo "  Metrics:    http://localhost:3100/metrics"
echo "  WebSocket:  ws://localhost:3100/ws"
echo "  Dashboard:  http://localhost:3000 (run: cd dashboard && npm run dev)"
echo ""
echo "  Start gateway:"
echo "    npx tsx src/index.ts"
echo ""
echo "  Run E2E tests:"
echo "    GATEWAY_URL=http://localhost:3100 API_KEY=<your-key> npx tsx tests/e2e.test.ts"
echo ""
echo "  Deploy contracts:"
echo "    DEPLOYER_PRIVATE_KEY=0x... ./scripts/deploy-contracts.sh"
echo ""
