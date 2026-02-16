# fabric-sdk

Python SDK for the Fabric trust layer.

## Install

```bash
pip install fabric-sdk
```

## Quick Start

```python
from fabric_sdk import Fabric

fabric = Fabric("fab_your_key_here", agent_id="agent_001")

# Discover providers
result = fabric.discover("image-generation", min_trust_score=4.0)
for p in result["providers"]:
    print(f"{p['name']}: trust={p['trustScore']}, price=${p['price']}")

# Route a request
result = fabric.route(
    "image-generation",
    {"prompt": "A cyberpunk cityscape at sunset"},
    preferences={"maxPrice": 0.05},
)
print(result["result"])
print(f"Cost: ${result['payment']['total']}")

# Submit feedback
fabric.feedback(result["transactionId"], score=5, tags=["fast"])
```

## Async Usage

```python
from fabric_sdk import FabricAsync

async with FabricAsync("fab_your_key_here", agent_id="agent_001") as fabric:
    result = await fabric.route("translation", {"text": "Hello", "target": "es"})
    print(result["result"])
```

## API

| Method | Description |
|--------|-------------|
| `discover(category, **opts)` | Find providers |
| `route(category, input, **opts)` | Route + pay + execute |
| `evaluate(provider_id)` | Trust profile |
| `feedback(txn_id, score, **opts)` | Rate a transaction |
| `list_budgets()` | List budgets |
| `create_budget(limit_usd, **opts)` | Create budget |
| `budget_status(budget_id)` | Check utilisation |
| `list_favorites(agent_id?)` | List favorites |
| `add_favorite(provider_id, **opts)` | Add favorite |
| `remove_favorite(favorite_id)` | Remove favorite |
| `list_wallets()` | List wallets |
| `create_wallet(agent_id?)` | Create wallet |
| `wallet_balance(agent_id?)` | Check balance |
| `chain_status()` | Chain info |
| `mcp_tools()` | MCP tool list |
| `mcp_execute(tool, args)` | Execute MCP tool |
