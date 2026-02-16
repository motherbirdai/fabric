#!/bin/bash
#
# Pre-flight checks before deployment.
# Run this before deploying to catch issues early.
#
# Usage: ./scripts/preflight.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

PASS=0
FAIL=0
WARN=0

check() {
  if eval "$2" >/dev/null 2>&1; then
    echo "  ✓ $1"
    ((PASS++))
  else
    echo "  ✗ $1"
    ((FAIL++))
  fi
}

warn() {
  if eval "$2" >/dev/null 2>&1; then
    echo "  ✓ $1"
    ((PASS++))
  else
    echo "  ⚠ $1 (optional)"
    ((WARN++))
  fi
}

echo ""
echo "🧵 Fabric Gateway — Pre-flight Checks"
echo ""

# ─── Dependencies ───
echo "─── Dependencies ───"
check "Node.js ≥20"          "node -v | grep -E 'v2[0-9]'"
check "npm installed"        "command -v npm"
check "node_modules exist"   "test -d node_modules"
warn  "Docker installed"     "command -v docker"
warn  "flyctl installed"     "command -v fly || command -v flyctl"
warn  "Foundry installed"    "command -v forge"
echo ""

# ─── Environment ───
echo "─── Environment ───"
if [ -f .env ]; then
  source <(grep -v '^#' .env | grep '=' | sed 's/^/export /' 2>/dev/null) 2>/dev/null || true
  check ".env file exists" "true"
else
  echo "  ✗ .env file missing (copy from .env.example)"
  ((FAIL++))
fi

check "DATABASE_URL set"       "test -n '${DATABASE_URL:-}'"
check "REDIS_URL set"          "test -n '${REDIS_URL:-}'"
warn  "STRIPE_SECRET_KEY set"  "test -n '${STRIPE_SECRET_KEY:-}'"
warn  "FABRIC_OPERATOR_KEY set" "test -n '${FABRIC_OPERATOR_KEY:-}'"
warn  "FABRIC_REGISTRY_ADDRESS set" "test -n '${FABRIC_REGISTRY_ADDRESS:-}' && test '${FABRIC_REGISTRY_ADDRESS:-}' != '0x0000000000000000000000000000000000000000'"
echo ""

# ─── Build ───
echo "─── Build ───"
check "TypeScript compiles"    "npx tsc --noEmit 2>&1"
check "Prisma client generated" "test -d node_modules/.prisma/client"
echo ""

# ─── Tests ───
echo "─── Tests ───"
check "Unit tests pass"        "npx vitest run --reporter=dot 2>&1 | tail -1 | grep -v 'FAIL'"
echo ""

# ─── Contracts ───
echo "─── Contracts ───"
if command -v forge >/dev/null 2>&1; then
  check "Contracts build"      "cd contracts && forge build 2>&1 && cd .."
  check "Contract tests pass"  "cd contracts && forge test 2>&1 | grep -v 'FAIL' && cd .."
else
  echo "  ⚠ Foundry not installed — skipping contract checks"
  ((WARN++))
fi

if [ -f .deployment.json ]; then
  check ".deployment.json exists" "true"
  REG=$(jq -r '.contracts.FabricRegistry.address // empty' .deployment.json 2>/dev/null)
  if [ -n "$REG" ]; then
    echo "  ✓ FabricRegistry: $REG"
    ((PASS++))
  fi
else
  echo "  ⚠ .deployment.json missing — run deploy-contracts.sh first"
  ((WARN++))
fi
echo ""

# ─── Docker ───
echo "─── Docker ───"
if command -v docker >/dev/null 2>&1; then
  check "Dockerfile valid"     "docker build --check . 2>&1 || docker build -t fabric-test --target build . 2>&1 | tail -1"
else
  echo "  ⚠ Docker not available — skipping"
  ((WARN++))
fi
echo ""

# ─── Results ───
TOTAL=$((PASS + FAIL + WARN))
echo "═══════════════════════════════════════════════════"
echo "  $TOTAL checks: $PASS passed, $FAIL failed, $WARN warnings"
echo "═══════════════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "  ❌ Fix failures before deploying"
  exit 1
else
  echo ""
  echo "  ✅ Ready to deploy"
  echo ""
  echo "  Deployment order:"
  echo "    1. Deploy contracts:  ./scripts/deploy-contracts.sh"
  echo "    2. Deploy to Fly.io:  ./scripts/deploy-fly.sh"
  echo ""
fi
