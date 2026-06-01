"""
Hotmart HotConnect API client.

Handles:
- OAuth2 client_credentials token acquisition (cached in-memory)
- Subscription cancellation
- Subscription summary fetching

Docs: https://developers.hotmart.com/docs/en/
"""
from __future__ import annotations

import os
import time
import logging
from typing import Optional, Dict, Any

import httpx

logger = logging.getLogger(__name__)


class HotmartClient:
    """Lightweight async client for Hotmart's HotConnect API."""

    def __init__(self):
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    # ---- internal ----
    @property
    def _client_id(self) -> str:
        return os.environ.get("HOTMART_CLIENT_ID", "")

    @property
    def _client_secret(self) -> str:
        return os.environ.get("HOTMART_CLIENT_SECRET", "")

    @property
    def _basic_token(self) -> str:
        return os.environ.get("HOTMART_BASIC_TOKEN", "")

    @property
    def _oauth_url(self) -> str:
        return os.environ.get(
            "HOTMART_OAUTH_TOKEN_URL",
            "https://api-sec-vlc.hotmart.com/security/oauth/token",
        )

    @property
    def _api_base(self) -> str:
        return os.environ.get(
            "HOTMART_API_BASE",
            "https://developers.hotmart.com",
        )

    def _is_configured(self) -> bool:
        return bool(self._client_id and self._client_secret and self._basic_token)

    async def _fetch_token(self) -> str:
        if not self._is_configured():
            raise RuntimeError(
                "Hotmart not configured (missing HOTMART_CLIENT_ID / HOTMART_CLIENT_SECRET / HOTMART_BASIC_TOKEN)"
            )
        params = {
            "grant_type": "client_credentials",
            "client_id": self._client_id,
            "client_secret": self._client_secret,
        }
        headers = {"Authorization": f"Basic {self._basic_token}"}
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(self._oauth_url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        self._access_token = data["access_token"]
        # Token TTL minus safety margin
        ttl = int(data.get("expires_in", 3600))
        self._token_expires_at = time.time() + ttl - 60
        return self._access_token

    async def _get_token(self) -> str:
        if not self._access_token or time.time() >= self._token_expires_at:
            return await self._fetch_token()
        return self._access_token

    async def _auth_headers(self) -> Dict[str, str]:
        token = await self._get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ---- public ----
    async def cancel_subscription(self, subscriber_code: str) -> Dict[str, Any]:
        """Cancel a recurring subscription by its subscriber_code."""
        url = f"{self._api_base}/payments/api/v1/subscriptions/{subscriber_code}/cancel"
        headers = await self._auth_headers()
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, headers=headers, json={"send_email": True})
        if resp.status_code >= 400:
            logger.warning("Hotmart cancel failed (%s): %s", resp.status_code, resp.text)
            resp.raise_for_status()
        return resp.json() if resp.content else {"status": "ok"}

    async def get_subscription_summary(self, subscriber_code: str) -> Dict[str, Any]:
        """Fetch current subscription state from Hotmart."""
        url = f"{self._api_base}/payments/api/v1/subscriptions/summary"
        headers = await self._auth_headers()
        params = {"subscriber_code": subscriber_code}
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.get(url, headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


# Singleton instance reused across routers
hotmart_client = HotmartClient()
