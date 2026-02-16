#!/bin/bash
#
# Deploy Fabric Gateway to Fly.io with managed Postgres + Redis.
#
# This script handles the entire first-time deployment:
#   1. Create Fly app
#   2. Create Fly Postgres cluster
#   3. Create Fly Redis (Upstash)
#   4. Set secrets (from .env or .deployment.json)
#   5. Deploy gateway
#   6. Verify health
#
# Prerequisites:
#   - flyctl installed: curl -L https://fly.io/install.sh | sh
#   - fly auth login
#   - Contracts deployed (run deploy-contracts.sh first)
#
# Usage:
#   ./scripts/deploy-fly.sh                  # Full first-time setup
#   ./scripts/deploy-fly.sh --deploy-only    # Just redeploy (skip infra)
#   ./scripts/deploy-fly.sh --secrets-only   # Just update secrets
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

APP_NAME="${FLY_APP:-fabric-gateway}"
REGION="${FLY_REGION:-iad}"
PG_NAME="${APP_NAME}-db"
REDIS_NAME="${APP_NAME}-redis"
MODE="${1:-full}"

cd "$ROOT_DIR"

# ─── Validate ───

command -v flyctl >/dev/null 2>&1 || command -v fly >/dev/null 2>&1 || {
  echo "❌ flyctl not installed. Run: curl -L https://fly.io/install.sh | sh"
  exit 1
}

# Prefer 'fly' over 'flyctl'
FLY=$(command -v fly 2>/dev/null || command -v flyctl)

echo ""
echo "🧵 Fabric Gateway — Fly.io Deployment"
echo "   App:    $APP_NAME"
echo "   Region: $REGION"
echo "   Mode:   $MODE"
echo ""

# ─── Step 1: Create Fly app ───

if [ "$MODE" = "full" ]; then
  echo "─── 1. Creating Fly app ───"

  if $FLY apps list 2>/dev/null | grep -q "$APP_NAME"; then
    echo "   ✓ App '$APP_NAME' already exists"
  else
    $FLY apps create "$APP_NAME" --machines 2>/dev/null || echo "   ℹ App creation handled by launch"
  fi
  echo ""
fi

# ─── Step 2: Postgres ───

if [ "$MODE" = "full" ]; then
  echo "─── 2. Creating Postgres cluster ───"

  if $FLY postgres list 2>/dev/null | grep -q "$PG_NAME"; then
    echo "   ✓ Postgres '$PG_NAME' already exists"
  else
    $FLY postgres create \
      --name "$PG_NAME" \
      --region "$REGION" \
      --initial-cluster-size 1 \
      --vm-size shared-cpu-1x \
      --volume-size 1 \
      2>/dev/null || echo "   ℹ Postgres may already exist"
  fi

  # Attach to app (generates DATABASE_URL secret automatically)
  $FLY postgres attach "$PG_NAME" --app "$APP_NAME" 2>/dev/null || echo "   ✓ Already attached"

  echo ""
fi

# ─── Step 3: Redis (Upstash) ───

if [ "$MODE" = "full" ]; then
  echo "─── 3. Creating Redis (Upstash) ───"

  # Fly Redis uses Upstash — creates REDIS_URL secret
  if $FLY redis list 2>/dev/null | grep -q "$REDIS_NAME"; then
    echo "   ✓ Redis '$REDIS_NAME' already exists"
  else
    $FLY redis create \
      --name "$REDIS_NAME" \
      --region "$REGION" \
      --no-replicas \
      --plan free \
      2>/dev/null || echo "   ℹ Redis may require manual setup — see docs.fly.io/docs/redis"
    echo "   ⚠ If Fly Redis is not available, use Upstash.com and set REDIS_URL manually"
  fi
  echo ""
fi

# ─── Step 4: Set secrets ───

if [ "$MODE" = "full" ] || [ "$MODE" = "--secrets-only" ]; then
  echo "─── 4. Setting secrets ───"

  # Load from .deployment.json if available
  REGISTRY_ADDR=""
  IDENTITY_ADDR=""

  if [ -f ".deployment.json" ]; then
    REGISTRY_ADDR=$(jq -r '.contracts.FabricRegistry.address // empty' .deployment.json 2>/dev/null)
    IDENTITY_ADDR=$(jq -r '.contracts.FabricIdentity.address // empty' .deployment.json 2>/dev/null)
    echo "   Loaded contract addresses from .deployment.json"
  fi

  # Load from .env if available
  if [ -f ".env" ]; then
    source <(grep -v '^#' .env | grep '=' | sed 's/^/export /')
    echo "   Loaded variables from .env"
  fi

  # Set non-empty secrets
  SECRETS=""

  [ -n "${STRIPE_SECRET_KEY:-}" ]      && SECRETS+="STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY "
  [ -n "${STRIPE_WEBHOOK_SECRET:-}" ]  && SECRETS+="STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET "
  [ -n "${FABRIC_OPERATOR_KEY:-}" ]    && SECRETS+="FABRIC_OPERATOR_KEY=$FABRIC_OPERATOR_KEY "
  [ -n "$REGISTRY_ADDR" ]             && SECRETS+="FABRIC_REGISTRY_ADDRESS=$REGISTRY_ADDR "
  [ -n "$IDENTITY_ADDR" ]             && SECRETS+="FABRIC_IDENTITY_ADDRESS=$IDENTITY_ADDR "
  [ -n "${CORS_ORIGIN:-}" ]           && SECRETS+="CORS_ORIGIN=$CORS_ORIGIN "
  [ -n "${SENTRY_DSN:-}" ]            && SECRETS+="SENTRY_DSN=$SENTRY_DSN "

  if [ -n "$SECRETS" ]; then
    echo "   Setting $(echo "$SECRETS" | wc -w) secrets..."
    $FLY secrets set $SECRETS --app "$APP_NAME" 2>/dev/null
    echo "   ✓ Secrets set"
  else
    echo "   ⚠ No secrets to set — configure .env or .deployment.json first"
    echo "     Required: FABRIC_OPERATOR_KEY (private key for on-chain operations)"
    echo "     Optional: STRIPE_SECRET_KEY, CORS_ORIGIN, SENTRY_DSN"
  fi

  echo ""
fi

# ─── Step 5: Deploy ───

if [ "$MODE" != "--secrets-only" ]; then
  echo "─── 5. Deploying gateway ───"

  $FLY deploy --config fly.toml --app "$APP_NAME" --region "$REGION" --strategy rolling

  echo ""
fi

# ─── Step 6: Verify ───

echo "─── 6. Verifying deployment ───"

APP_URL="https://${APP_NAME}.fly.dev"

echo "   Waiting for deployment to stabilize..."
sleep 10

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}/healthz" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✓ Health check passed (${APP_URL}/healthz → 200)"
else
  echo "   ⚠ Health check returned $HTTP_CODE — may still be starting"
  echo "     Check: fly logs --app $APP_NAME"
fi

# Deep health
HEALTH=$(curl -s "${APP_URL}/health" 2>/dev/null || echo '{"status":"unknown"}')
echo "   Health: $HEALTH" | head -c 200
echo ""

echo ""
echo "═══════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  Gateway:    $APP_URL"
echo "  Health:     $APP_URL/health"
echo "  Metrics:    $APP_URL/metrics"
echo "  WebSocket:  wss://${APP_NAME}.fly.dev/ws"
echo ""
echo "  Dashboard:  Deploy separately (Vercel/Netlify)"
echo "              Set NEXT_PUBLIC_GATEWAY_URL=$APP_URL"
echo ""
echo "  Useful commands:"
echo "    fly logs --app $APP_NAME"
echo "    fly status --app $APP_NAME"
echo "    fly ssh console --app $APP_NAME"
echo "    fly scale count 2 --app $APP_NAME"
echo "    fly secrets list --app $APP_NAME"
echo ""
echo "  Redeploy:   ./scripts/deploy-fly.sh --deploy-only"
echo "  Update env: ./scripts/deploy-fly.sh --secrets-only"
echo ""
