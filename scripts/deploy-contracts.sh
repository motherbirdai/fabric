#!/bin/bash
#
# Deploy Fabric smart contracts to Base Sepolia testnet.
#
# Prerequisites:
#   - Foundry installed: curl -L https://foundry.paradigm.xyz | bash && foundryup
#   - DEPLOYER_PRIVATE_KEY exported
#   - ETH on Base Sepolia (faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
#
# Usage:
#   DEPLOYER_PRIVATE_KEY=0x... ./scripts/deploy-contracts.sh
#
# Optional:
#   BASESCAN_API_KEY=...  # For contract verification
#   RPC_URL=...           # Override default RPC
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$ROOT_DIR/contracts"

# ─── Config ───

RPC_URL="${RPC_URL:-https://sepolia.base.org}"
CHAIN_ID="${CHAIN_ID:-84532}"
ETHERSCAN_API_KEY="${BASESCAN_API_KEY:-}"

# ─── Validate ───

command -v forge >/dev/null 2>&1 || { echo "❌ Foundry not installed. Run: curl -L https://foundry.paradigm.xyz | bash && foundryup"; exit 1; }
command -v cast  >/dev/null 2>&1 || { echo "❌ cast not found. Run: foundryup"; exit 1; }
command -v jq    >/dev/null 2>&1 || { echo "❌ jq not installed. Run: brew install jq / apt install jq"; exit 1; }

if [ -z "${DEPLOYER_PRIVATE_KEY:-}" ]; then
  echo "❌ DEPLOYER_PRIVATE_KEY not set"
  echo ""
  echo "   export DEPLOYER_PRIVATE_KEY=0x..."
  echo "   ./scripts/deploy-contracts.sh"
  exit 1
fi

DEPLOYER=$(cast wallet address "$DEPLOYER_PRIVATE_KEY" 2>/dev/null || echo "unknown")
OPERATOR="$DEPLOYER"

echo ""
echo "🧵 Fabric Contract Deployment"
echo "   Chain:    Base Sepolia ($CHAIN_ID)"
echo "   RPC:      $RPC_URL"
echo "   Deployer: $DEPLOYER"
echo "   Operator: $OPERATOR"

# Check balance
BALANCE_WEI=$(cast balance "$DEPLOYER" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
BALANCE_ETH=$(cast from-wei "$BALANCE_WEI" 2>/dev/null || echo "0")
echo "   Balance:  $BALANCE_ETH ETH"

if [ "$BALANCE_WEI" = "0" ]; then
  echo ""
  echo "⚠️  Deployer has no ETH. Get testnet ETH:"
  echo "   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
  echo "   https://faucet.quicknode.com/base/sepolia"
  exit 1
fi

echo ""

# ─── Build ───

echo "📦 Building contracts..."
cd "$CONTRACTS_DIR"
forge build --root . 2>&1 | tail -3
echo ""

# ─── Deploy FabricRegistry ───
# constructor(address _operator)

echo "🚀 Deploying FabricRegistry..."

REGISTRY_DEPLOY=$(forge create \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --json \
  src/FabricRegistry.sol:FabricRegistry \
  --constructor-args "$OPERATOR" \
  2>&1)

REGISTRY_ADDRESS=$(echo "$REGISTRY_DEPLOY" | jq -r '.deployedTo // empty')
REGISTRY_TX=$(echo "$REGISTRY_DEPLOY" | jq -r '.transactionHash // empty')

if [ -z "$REGISTRY_ADDRESS" ]; then
  echo "❌ FabricRegistry deployment failed:"
  echo "$REGISTRY_DEPLOY"
  exit 1
fi

echo "   ✓ FabricRegistry: $REGISTRY_ADDRESS"
echo "     TX: $REGISTRY_TX"
echo "     https://sepolia.basescan.org/tx/$REGISTRY_TX"
echo ""

# ─── Deploy FabricIdentity ───
# constructor(address _operator)  ← single arg, NOT (registry, operator)

echo "🚀 Deploying FabricIdentity..."

IDENTITY_DEPLOY=$(forge create \
  --rpc-url "$RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --json \
  src/FabricIdentity.sol:FabricIdentity \
  --constructor-args "$OPERATOR" \
  2>&1)

IDENTITY_ADDRESS=$(echo "$IDENTITY_DEPLOY" | jq -r '.deployedTo // empty')
IDENTITY_TX=$(echo "$IDENTITY_DEPLOY" | jq -r '.transactionHash // empty')

if [ -z "$IDENTITY_ADDRESS" ]; then
  echo "❌ FabricIdentity deployment failed:"
  echo "$IDENTITY_DEPLOY"
  exit 1
fi

echo "   ✓ FabricIdentity: $IDENTITY_ADDRESS"
echo "     TX: $IDENTITY_TX"
echo "     https://sepolia.basescan.org/tx/$IDENTITY_TX"
echo ""

# ─── Verify on BaseScan (optional) ───

if [ -n "$ETHERSCAN_API_KEY" ]; then
  echo "🔍 Verifying on BaseScan..."

  forge verify-contract \
    --chain-id "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    "$REGISTRY_ADDRESS" \
    src/FabricRegistry.sol:FabricRegistry \
    --constructor-args "$(cast abi-encode 'constructor(address)' "$OPERATOR")" \
    --root . 2>/dev/null && echo "   ✓ Registry verified" || echo "   ⚠ Registry verification pending"

  forge verify-contract \
    --chain-id "$CHAIN_ID" \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    "$IDENTITY_ADDRESS" \
    src/FabricIdentity.sol:FabricIdentity \
    --constructor-args "$(cast abi-encode 'constructor(address)' "$OPERATOR")" \
    --root . 2>/dev/null && echo "   ✓ Identity verified" || echo "   ⚠ Identity verification pending"

  echo ""
fi

# ─── Save deployment info ───

cat > "$ROOT_DIR/.deployment.json" <<EOF
{
  "network": "base-sepolia",
  "chainId": $CHAIN_ID,
  "rpc": "$RPC_URL",
  "deployer": "$DEPLOYER",
  "operator": "$OPERATOR",
  "contracts": {
    "FabricRegistry": {
      "address": "$REGISTRY_ADDRESS",
      "txHash": "$REGISTRY_TX"
    },
    "FabricIdentity": {
      "address": "$IDENTITY_ADDRESS",
      "txHash": "$IDENTITY_TX"
    }
  },
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# ─── Output ───

echo "═══════════════════════════════════════════════════"
echo "  ✅ DEPLOYMENT COMPLETE"
echo "═══════════════════════════════════════════════════"
echo ""
echo "  FabricRegistry:  $REGISTRY_ADDRESS"
echo "  FabricIdentity:  $IDENTITY_ADDRESS"
echo "  Operator:        $OPERATOR"
echo "  Chain:           Base Sepolia ($CHAIN_ID)"
echo ""
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  Add to .env or Fly secrets:                │"
echo "  │                                             │"
echo "  │  FABRIC_REGISTRY_ADDRESS=$REGISTRY_ADDRESS  │"
echo "  │  FABRIC_IDENTITY_ADDRESS=$IDENTITY_ADDRESS  │"
echo "  │  FABRIC_OPERATOR_KEY=\$DEPLOYER_PRIVATE_KEY  │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  BaseScan:"
echo "    https://sepolia.basescan.org/address/$REGISTRY_ADDRESS"
echo "    https://sepolia.basescan.org/address/$IDENTITY_ADDRESS"
echo ""
echo "  Saved: .deployment.json"
echo ""
echo "  Next: Set secrets on Fly.io:"
echo "    fly secrets set FABRIC_REGISTRY_ADDRESS=$REGISTRY_ADDRESS"
echo "    fly secrets set FABRIC_IDENTITY_ADDRESS=$IDENTITY_ADDRESS"
echo ""
