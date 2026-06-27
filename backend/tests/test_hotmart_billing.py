"""
Backend tests for Hotmart billing integration — FASE 1 (placeholders, env not configured).

Covers:
 - GET  /api/billing/hotmart/config
 - POST /api/billing/hotmart/checkout (valid + invalid tier; auth required)
 - GET  /api/billing/hotmart/subscription
 - POST /api/billing/hotmart/cancel
 - POST /api/webhooks/hotmart (Hottok validation)
 - Regression: /api/auth/login, /api/dashboard/stats, /api/athletes,
   /api/periodization, /api/admin/hierarchy, /api/admin/finance
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
TEST_EMAIL = "test@train.com"
TEST_PASSWORD = "test123456"


# ─── Fixtures ─────────────────────────────────────────
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=15)
    if r.status_code != 200:
        pytest.skip(f"Auth failed: {r.status_code} {r.text[:200]}")
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# ─── 1. Hotmart Config (public) ───────────────────────
class TestHotmartConfig:
    def test_config_returns_disabled(self, api):
        r = api.get(f"{BASE_URL}/api/billing/hotmart/config", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "enabled" in data
        assert data["enabled"] is False, "Hotmart should be disabled in FASE 1"
        assert "tiers_configured" in data
        tiers = data["tiers_configured"]
        # 4 tiers × 2 cycles = 8 keys; all should be False
        assert len(tiers) == 8, f"Expected 8 tier keys, got {len(tiers)}: {list(tiers.keys())}"
        for k, v in tiers.items():
            assert v is False, f"Tier {k} should be False in FASE 1 (got {v})"
        # Prices present
        assert "prices_usd_monthly" in data
        assert set(data["prices_usd_monthly"].keys()) >= {"starter", "basic", "pro", "enterprise"}


# ─── 2. Hotmart Checkout ──────────────────────────────
class TestHotmartCheckout:
    def test_checkout_requires_auth(self, api):
        r = api.post(
            f"{BASE_URL}/api/billing/hotmart/checkout",
            json={"tier": "basic", "cycle": "monthly"},
            timeout=15,
        )
        assert r.status_code in (401, 403), f"Expected auth required, got {r.status_code}"

    def test_checkout_valid_tier_returns_503(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/billing/hotmart/checkout",
            json={"tier": "basic", "cycle": "monthly"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 503, f"Expected 503, got {r.status_code}: {r.text[:300]}"
        detail = (r.json().get("detail") or "").lower()
        assert "aún no está configurado en hotmart" in detail or "configurado" in detail

    def test_checkout_invalid_tier_returns_400(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/billing/hotmart/checkout",
            json={"tier": "xyz", "cycle": "monthly"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text[:300]}"

    def test_checkout_invalid_cycle_returns_400(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/billing/hotmart/checkout",
            json={"tier": "basic", "cycle": "weekly"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 400


# ─── 3. Hotmart Subscription ──────────────────────────
class TestHotmartSubscription:
    def test_get_subscription_returns_null(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/billing/hotmart/subscription", headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "subscription" in data
        assert data["subscription"] is None, f"Expected null subscription, got {data['subscription']}"
        assert "user_subscription_tier" in data
        # Source-of-truth tier should be one of the known tiers
        assert data["user_subscription_tier"] in ("starter", "basic", "pro", "enterprise")

    def test_get_subscription_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/billing/hotmart/subscription", timeout=15)
        assert r.status_code in (401, 403)


# ─── 4. Hotmart Cancel ────────────────────────────────
class TestHotmartCancel:
    def test_cancel_returns_404_no_active_sub(self, api, auth_headers):
        r = api.post(
            f"{BASE_URL}/api/billing/hotmart/cancel",
            json={"reason": "test"},
            headers=auth_headers,
            timeout=15,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text[:300]}"

    def test_cancel_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/billing/hotmart/cancel", json={"reason": "x"}, timeout=15)
        assert r.status_code in (401, 403)


# ─── 5. Hotmart Webhook (Hottok) ──────────────────────
class TestHotmartWebhook:
    def test_webhook_returns_503_when_not_configured(self, api):
        r = api.post(
            f"{BASE_URL}/api/webhooks/hotmart",
            json={"event": "PURCHASE_APPROVED", "data": {}},
            timeout=15,
        )
        # Since HOTMART_HOTTOK is empty, expect 503 "Webhook not configured"
        assert r.status_code == 503, f"Expected 503, got {r.status_code}: {r.text[:300]}"
        detail = (r.json().get("detail") or "").lower()
        assert "not configured" in detail or "webhook" in detail

    def test_webhook_invalid_json_returns_400(self, api):
        r = requests.post(
            f"{BASE_URL}/api/webhooks/hotmart",
            data="not json",
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code == 400


# ─── 6. Regression: existing endpoints still work ─────
class TestRegression:
    def test_auth_login(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert ("access_token" in body) or ("token" in body)

    def test_dashboard_stats(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"

    def test_athletes_list(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/athletes", headers=auth_headers, timeout=20)
        assert r.status_code == 200

    def test_periodization_catalog(self, api, auth_headers):
        # /api/periodization is a POST-only create endpoint; use the catalog GET for a regression smoke
        r = api.get(f"{BASE_URL}/api/periodization-models-catalog", headers=auth_headers, timeout=20)
        assert r.status_code == 200, f"{r.status_code} {r.text[:200]}"

    def test_admin_hierarchy(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/hierarchy", headers=auth_headers, timeout=20)
        # test@train.com may not be super_admin → 403 is acceptable, 200 is great
        assert r.status_code in (200, 403), f"{r.status_code} {r.text[:200]}"

    def test_admin_finance_mrr_arr(self, api, auth_headers):
        r = api.get(f"{BASE_URL}/api/admin/finance", headers=auth_headers, timeout=20)
        # 403 if not super admin — acceptable per testing notes
        if r.status_code == 200:
            data = r.json()
            assert "mrr" in data or "mrr_usd" in data, f"Expected MRR field: {list(data.keys())}"
            assert "arr" in data or "arr_usd" in data, f"Expected ARR field: {list(data.keys())}"
        else:
            assert r.status_code == 403, f"Unexpected status: {r.status_code} {r.text[:200]}"
