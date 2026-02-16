"""Fabric SDK — Python client for the Fabric trust layer."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional

import httpx


DEFAULT_BASE_URL = "https://api.fabric.computer"
DEFAULT_TIMEOUT = 30.0


@dataclass
class FabricConfig:
    api_key: str
    base_url: str = DEFAULT_BASE_URL
    timeout: float = DEFAULT_TIMEOUT
    agent_id: Optional[str] = None


class FabricError(Exception):
    """Raised when the Fabric API returns an error."""

    def __init__(self, code: str, message: str, status: int):
        super().__init__(message)
        self.code = code
        self.status = status


class Fabric:
    """Synchronous Fabric client."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        agent_id: Optional[str] = None,
    ):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._agent_id = agent_id
        self._client = httpx.Client(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "fabric-sdk-python/0.1.0",
            },
        )

    def close(self):
        self._client.close()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    # ─── Discover ───

    def discover(
        self,
        category: str,
        *,
        limit: int = 5,
        min_trust_score: Optional[float] = None,
        max_price: Optional[float] = None,
    ) -> dict:
        params: dict[str, Any] = {"category": category, "limit": limit}
        if min_trust_score is not None:
            params["minTrustScore"] = min_trust_score
        if max_price is not None:
            params["maxPrice"] = max_price
        return self._get("/v1/discover", params=params)

    # ─── Route ───

    def route(
        self,
        category: str,
        input: dict,
        *,
        agent_id: Optional[str] = None,
        preferences: Optional[dict] = None,
        budget: Optional[str] = None,
    ) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        body: dict[str, Any] = {
            "agentId": aid,
            "category": category,
            "input": input,
        }
        if preferences:
            body["preferences"] = preferences
        if budget:
            body["budget"] = budget
        return self._post("/v1/route", json=body)

    # ─── Evaluate ───

    def evaluate(self, provider_id: str) -> dict:
        return self._get(f"/v1/evaluate/{provider_id}")

    # ─── Feedback ───

    def feedback(
        self,
        transaction_id: str,
        score: int,
        *,
        tags: Optional[list[str]] = None,
        comment: Optional[str] = None,
    ) -> dict:
        body: dict[str, Any] = {
            "transactionId": transaction_id,
            "score": score,
        }
        if tags:
            body["tags"] = tags
        if comment:
            body["comment"] = comment
        return self._post("/v1/feedback", json=body)

    # ─── Budget ───

    def list_budgets(self) -> dict:
        return self._get("/v1/budget")

    def create_budget(
        self,
        limit_usd: float,
        *,
        agent_id: Optional[str] = None,
        period_type: str = "daily",
        hard_cap: bool = False,
    ) -> dict:
        body: dict[str, Any] = {
            "limitUsd": limit_usd,
            "periodType": period_type,
            "hardCap": hard_cap,
        }
        if agent_id:
            body["agentId"] = agent_id
        return self._post("/v1/budget", json=body)

    def budget_status(self, budget_id: str) -> dict:
        return self._get(f"/v1/budget/{budget_id}/status")

    # ─── Favorites ───

    def list_favorites(self, agent_id: Optional[str] = None) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        return self._get(f"/v1/favorites/{aid}")

    def add_favorite(
        self,
        provider_id: str,
        *,
        agent_id: Optional[str] = None,
        priority: int = 0,
    ) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        return self._post(
            "/v1/favorites",
            json={"agentId": aid, "providerId": provider_id, "priority": priority},
        )

    def remove_favorite(self, favorite_id: str) -> dict:
        return self._delete(f"/v1/favorites/{favorite_id}")

    # ─── Wallets ───

    def list_wallets(self) -> dict:
        return self._get("/v1/wallets")

    def create_wallet(self, agent_id: Optional[str] = None) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        return self._post("/v1/wallets", json={"agentId": aid})

    def wallet_balance(self, agent_id: Optional[str] = None) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        return self._get(f"/v1/wallets/{aid}/balance")

    # ─── Chain ───

    def chain_status(self) -> dict:
        return self._get("/v1/chain/status")

    # ─── MCP ───

    def mcp_tools(self) -> dict:
        return self._get("/mcp/tools")

    def mcp_execute(self, tool: str, arguments: dict) -> dict:
        return self._post("/mcp/execute", json={"tool": tool, "arguments": arguments})

    # ─── Convenience ───

    def route_and_rate(
        self,
        category: str,
        input: dict,
        rate_fn: Callable[[Any], int],
    ) -> dict:
        result = self.route(category, input)
        score = rate_fn(result.get("result"))
        try:
            fb = self.feedback(result["transactionId"], score)
            result["feedbackId"] = fb.get("id")
        except Exception:
            pass
        return result

    # ─── HTTP ───

    def _get(self, path: str, **kwargs) -> dict:
        resp = self._client.get(path, **kwargs)
        return self._handle(resp)

    def _post(self, path: str, **kwargs) -> dict:
        resp = self._client.post(path, **kwargs)
        return self._handle(resp)

    def _delete(self, path: str, **kwargs) -> dict:
        resp = self._client.delete(path, **kwargs)
        return self._handle(resp)

    @staticmethod
    def _handle(resp: httpx.Response) -> dict:
        data = resp.json()
        if resp.is_error:
            err = data.get("error", {})
            raise FabricError(
                code=err.get("code", "UNKNOWN"),
                message=err.get("message", f"HTTP {resp.status_code}"),
                status=resp.status_code,
            )
        return data


class FabricAsync:
    """Async Fabric client (same interface, uses httpx.AsyncClient)."""

    def __init__(
        self,
        api_key: str,
        *,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = DEFAULT_TIMEOUT,
        agent_id: Optional[str] = None,
    ):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._agent_id = agent_id
        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=timeout,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "User-Agent": "fabric-sdk-python/0.1.0",
            },
        )

    async def close(self):
        await self._client.aclose()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self.close()

    async def discover(self, category: str, **kwargs) -> dict:
        params: dict[str, Any] = {"category": category}
        params.update({k: v for k, v in kwargs.items() if v is not None})
        return await self._get("/v1/discover", params=params)

    async def route(self, category: str, input: dict, **kwargs) -> dict:
        aid = kwargs.pop("agent_id", None) or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        body: dict[str, Any] = {"agentId": aid, "category": category, "input": input}
        body.update({k: v for k, v in kwargs.items() if v is not None})
        return await self._post("/v1/route", json=body)

    async def evaluate(self, provider_id: str) -> dict:
        return await self._get(f"/v1/evaluate/{provider_id}")

    async def feedback(self, transaction_id: str, score: int, **kwargs) -> dict:
        body: dict[str, Any] = {"transactionId": transaction_id, "score": score}
        body.update({k: v for k, v in kwargs.items() if v is not None})
        return await self._post("/v1/feedback", json=body)

    async def list_budgets(self) -> dict:
        return await self._get("/v1/budget")

    async def create_budget(self, limit_usd: float, **kwargs) -> dict:
        body: dict[str, Any] = {"limitUsd": limit_usd}
        body.update({k: v for k, v in kwargs.items() if v is not None})
        return await self._post("/v1/budget", json=body)

    async def list_wallets(self) -> dict:
        return await self._get("/v1/wallets")

    async def create_wallet(self, agent_id: Optional[str] = None) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        return await self._post("/v1/wallets", json={"agentId": aid})

    async def wallet_balance(self, agent_id: Optional[str] = None) -> dict:
        aid = agent_id or self._agent_id
        if not aid:
            raise ValueError("agent_id is required")
        return await self._get(f"/v1/wallets/{aid}/balance")

    async def chain_status(self) -> dict:
        return await self._get("/v1/chain/status")

    async def mcp_tools(self) -> dict:
        return await self._get("/mcp/tools")

    async def mcp_execute(self, tool: str, arguments: dict) -> dict:
        return await self._post("/mcp/execute", json={"tool": tool, "arguments": arguments})

    # ─── HTTP ───

    async def _get(self, path: str, **kwargs) -> dict:
        resp = await self._client.get(path, **kwargs)
        return Fabric._handle(resp)

    async def _post(self, path: str, **kwargs) -> dict:
        resp = await self._client.post(path, **kwargs)
        return Fabric._handle(resp)

    async def _delete(self, path: str, **kwargs) -> dict:
        resp = await self._client.delete(path, **kwargs)
        return Fabric._handle(resp)
