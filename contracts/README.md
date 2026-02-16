# Fabric Smart Contracts

Solidity contracts for the Fabric trust layer, deployed on Base L2.

## Contracts

### `FabricRegistry.sol` — ERC-8004 Agent Registry
On-chain registry for AI agent/provider identities. Stores endpoint, category, name, and reputation scores.

| Function | Access | Description |
|----------|--------|-------------|
| `registerAgent` | Anyone | Register a new provider |
| `updateAgent` | Agent owner | Update endpoint or active status |
| `deactivateAgent` | Agent owner | Set agent inactive |
| `batchUpdateReputation` | Operator | Batch update reputation scores |
| `getAgent` | View | Get agent by ID |
| `getAgentsByCategory` | View | Paginated category query |
| `getReputation` | View | Get reputation + interaction count |
| `totalAgents` | View | Total registered count |
| `categoryCount` | View | Agents in a category |

### `FabricIdentity.sol` — ERC-721 Agent Identity NFT
Non-fungible identity tokens for agents. Each token links to a registry entry. One NFT per registry ID (deduped).

| Function | Access | Description |
|----------|--------|-------------|
| `mint` | Operator | Mint identity for an agent wallet |
| `getAgentData` | View | Get name, registryId, createdAt |
| ERC-721 standard | — | `balanceOf`, `ownerOf`, `transferFrom`, `approve`, etc. |
| ERC-721 Enumerable | — | `totalSupply`, `tokenByIndex`, `tokenOfOwnerByIndex` |
| ERC-165 | — | `supportsInterface` |

## Setup

```bash
cd contracts

# Install forge-std
forge install foundry-rs/forge-std --no-commit

# Build
forge build

# Test
forge test -vvv

# Gas report
forge test --gas-report
```

## Deploy

```bash
# Set env
export BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
export PRIVATE_KEY="0x..."

# Deploy both contracts
forge script script/Deploy.s.sol:DeployFabric \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvvv

# Seed providers (testnet)
export FABRIC_REGISTRY_ADDRESS="0x..."
forge script script/Deploy.s.sol:SeedProviders \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast

# Mint identity NFTs (testnet)
export FABRIC_IDENTITY_ADDRESS="0x..."
forge script script/Deploy.s.sol:MintIdentities \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌────────────────┐
│ Agent Wallet │────▶│ FabricIdentity  │     │ FabricRegistry │
│ (EOA)        │     │ (ERC-721 NFT)   │────▶│ (ERC-8004)     │
└─────────────┘     └─────────────────┘     └────────────────┘
                           │                        │
                     owns identity           stores reputation
                     (1 NFT per agent)       (batched by operator)
```

**Flow:**
1. Provider calls `registry.registerAgent()` with endpoint + category
2. Operator mints identity NFT via `identity.mint()` linking to registry ID
3. Gateway reads provider data from registry for discovery + routing
4. Operator periodically calls `registry.batchUpdateReputation()` with aggregated feedback

## Test Coverage

| Contract | Tests | Focus |
|----------|-------|-------|
| FabricRegistry | 20 | Registration, updates, deactivation, batch reputation, category queries, pagination, access control, enumeration |
| FabricIdentity | 20 | Minting, agent data, transfers, approvals, enumerable, ERC-165, dedup, access control |

## Gas Estimates (Base L2)

| Operation | Gas | ~Cost at 0.01 gwei |
|-----------|-----|---------------------|
| Register agent | ~200k | < $0.01 |
| Batch reputation (10) | ~150k | < $0.01 |
| Batch reputation (100) | ~800k | < $0.01 |
| Mint identity | ~180k | < $0.01 |
| Transfer identity | ~80k | < $0.01 |

Base L2 gas is extremely cheap — batch operations are practical for hundreds of updates per tx.
