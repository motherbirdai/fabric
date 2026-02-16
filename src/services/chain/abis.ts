/**
 * ABIs for on-chain interactions.
 * Aligned to FabricRegistry.sol and FabricIdentity.sol contracts.
 */

// ─── ERC-20 (USDC) ───
export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// ─── ERC-8004 Agent Registry (FabricRegistry.sol) ───
// Uses uint256 agentId (auto-incrementing)
export const ERC8004_REGISTRY_ABI = [
  // ─── Write functions ───

  // Register a new agent — returns uint256 agentId
  {
    name: 'registerAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'category', type: 'string' },
      { name: 'endpoint', type: 'string' },
    ],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  // Update agent endpoint
  {
    name: 'updateAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newEndpoint', type: 'string' },
    ],
    outputs: [],
  },
  // Deactivate agent
  {
    name: 'deactivateAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [],
  },
  // Reactivate agent
  {
    name: 'reactivateAgent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [],
  },
  // Update reputation (operator only)
  {
    name: 'updateReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'newScore', type: 'uint256' },
      { name: 'additionalInteractions', type: 'uint256' },
    ],
    outputs: [],
  },
  // Batch update reputation (operator only)
  {
    name: 'batchUpdateReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentIds', type: 'uint256[]' },
      { name: 'scores', type: 'uint256[]' },
      { name: 'interactions', type: 'uint256[]' },
    ],
    outputs: [],
  },

  // ─── Read functions ───

  // Get agent by ID
  {
    name: 'getAgent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'endpoint', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'reputationScore', type: 'uint256' },
          { name: 'totalInteractions', type: 'uint256' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  // Get agents by category (paginated)
  {
    name: 'getAgentsByCategory',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'category', type: 'string' },
      { name: 'offset', type: 'uint256' },
      { name: 'limit', type: 'uint256' },
    ],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'endpoint', type: 'string' },
          { name: 'category', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'reputationScore', type: 'uint256' },
          { name: 'totalInteractions', type: 'uint256' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'active', type: 'bool' },
        ],
      },
    ],
  },
  // Get agents owned by address
  {
    name: 'getAgentsByOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'ownerAddr', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  // Total registered agents
  {
    name: 'totalAgents',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },

  // ─── Events ───

  {
    name: 'AgentRegistered',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'category', type: 'string', indexed: false },
      { name: 'endpoint', type: 'string', indexed: false },
    ],
  },
  {
    name: 'AgentUpdated',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'newEndpoint', type: 'string', indexed: false },
    ],
  },
  {
    name: 'ReputationUpdated',
    type: 'event',
    inputs: [
      { name: 'agentId', type: 'uint256', indexed: true },
      { name: 'newScore', type: 'uint256', indexed: false },
      { name: 'totalInteractions', type: 'uint256', indexed: false },
    ],
  },
] as const;

// ─── Fabric Identity NFT (FabricIdentity.sol, ERC-721) ───
export const FABRIC_IDENTITY_ABI = [
  // Mint new identity token (operator only)
  {
    name: 'mintIdentity',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'registryId', type: 'uint256' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  // Get registry ID for a token
  {
    name: 'registryIdOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Get token for a registry ID
  {
    name: 'tokenOfRegistryId',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'registryId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Standard ERC-721
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // Events
  {
    name: 'IdentityMinted',
    type: 'event',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'registryId', type: 'uint256', indexed: true },
    ],
  },
] as const;
