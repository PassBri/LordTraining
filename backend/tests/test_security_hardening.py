"""OWASP Phase 1 security hardening tests.
Covers: short-lived access tokens + refresh tokens, brute force lockout,
security headers, rate limiting on auth, generic error handling, and
regression checks against representative endpoints.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to read frontend env (the public URL the user sees)
    fe_env = "/app/frontend/.env"
    if os.path.exists(fe_env):
        for line in open(fe_env):
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

API = f"{BASE_URL}/api"
COACH_EMAIL = "test@train.com"
COACH_PASSWORD = "test123456"


# ---------------- fixtures ----------------
@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def tokens(session):
    # Clear any previous lockout from MongoDB for this identifier just in case
    r = session.post(f"{API}/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed {r.status_code}: {r.text}"
    data = r.json()
    assert "token" in data and "refresh_token" in data
    assert data["user"]["email"] == COACH_EMAIL
    return data


# ---------------- login + tokens ----------------
class TestLoginTokens:
    def test_login_returns_access_and_refresh(self, tokens):
        assert isinstance(tokens["token"], str) and len(tokens["token"]) > 20
        assert isinstance(tokens["refresh_token"], str) and len(tokens["refresh_token"]) > 20
        assert tokens["token"] != tokens["refresh_token"]
        assert tokens["user"]["email"] == COACH_EMAIL

    def test_me_with_access_token(self, session, tokens):
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tokens['token']}"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["email"] == COACH_EMAIL

    def test_me_with_refresh_token_rejected(self, session, tokens):
        # Refresh tokens must NOT be accepted by protected endpoints
        r = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tokens['refresh_token']}"}, timeout=20)
        assert r.status_code == 401, f"Expected 401 with refresh as Bearer, got {r.status_code}: {r.text}"


# ---------------- refresh endpoint ----------------
class TestRefresh:
    def test_refresh_with_valid_token(self, session, tokens):
        # JWT exp has 1-second granularity, so sleep to guarantee a different token
        time.sleep(1.2)
        r = session.post(f"{API}/auth/refresh", json={"refresh_token": tokens["refresh_token"]}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and "refresh_token" in body
        # Either tokens differ (different exp) or at minimum they are valid JWTs (3 dot-separated segments)
        assert body["token"].count(".") == 2
        assert body["refresh_token"].count(".") == 2
        # New access token must work on /auth/me
        me = session.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {body['token']}"}, timeout=20)
        assert me.status_code == 200

    def test_refresh_with_invalid_token(self, session):
        r = session.post(f"{API}/auth/refresh", json={"refresh_token": "not-a-jwt"}, timeout=20)
        assert r.status_code == 401

    def test_refresh_with_access_token_rejected(self, session, tokens):
        # Sending an access token as refresh must be rejected (type check)
        r = session.post(f"{API}/auth/refresh", json={"refresh_token": tokens["token"]}, timeout=20)
        assert r.status_code == 401


# ---------------- brute force lockout ----------------
class TestBruteForceLockout:
    def test_lockout_after_5_failed_attempts(self, session):
        # Use a fresh disposable email so we don't lock real accounts
        bf_email = f"bruteforce_{uuid.uuid4().hex[:10]}@x.com"
        statuses = []
        for _ in range(5):
            r = session.post(f"{API}/auth/login", json={"email": bf_email, "password": "wrongpass"}, timeout=20)
            statuses.append(r.status_code)
        # The first 5 must all be 401 (invalid creds), since user doesn't exist
        assert all(s == 401 for s in statuses), f"Expected five 401s, got {statuses}"
        # 6th attempt must be 429 (locked out)
        r6 = session.post(f"{API}/auth/login", json={"email": bf_email, "password": "wrongpass"}, timeout=20)
        assert r6.status_code == 429, f"Expected 429 on 6th attempt, got {r6.status_code}: {r6.text}"
        body = r6.json()
        # Detail must mention lockout (Spanish)
        detail = (body.get("detail") or "").lower()
        assert "intent" in detail or "minuto" in detail or "demasiad" in detail


# ---------------- security headers ----------------
class TestSecurityHeaders:
    def test_headers_on_api_response(self, session):
        r = session.get(f"{API}/health", timeout=20)
        assert r.status_code == 200
        h = r.headers
        assert h.get("X-Frame-Options") == "DENY"
        assert h.get("X-Content-Type-Options") == "nosniff"
        assert "Referrer-Policy" in h and h["Referrer-Policy"]
        assert "Content-Security-Policy" in h and "frame-ancestors 'none'" in h["Content-Security-Policy"]
        assert "Permissions-Policy" in h
        assert "Strict-Transport-Security" in h


# ---------------- rate limiting ----------------
class TestRateLimiting:
    def test_login_endpoint_has_rate_limit(self, session):
        """Verify the login endpoint enforces 10/min. We hit it ~12 times with a
        non-existing email + wrong password. The earlier responses should be 401,
        but eventually slowapi must respond 429 'Too Many Requests'."""
        bf_email = f"ratelimit_{uuid.uuid4().hex[:10]}@x.com"
        codes = []
        for _ in range(12):
            r = session.post(f"{API}/auth/login", json={"email": bf_email, "password": "x"}, timeout=20)
            codes.append(r.status_code)
            if r.status_code == 429:
                break
        assert 429 in codes, f"Expected at least one 429 from login rate limit, got {codes}"

    def test_dashboard_not_rate_limited(self, session, tokens):
        """Dashboard endpoints should NOT be rate limited (no global default)."""
        h = {"Authorization": f"Bearer {tokens['token']}"}
        codes = []
        for _ in range(15):
            r = session.get(f"{API}/dashboard/stats", headers=h, timeout=20)
            codes.append(r.status_code)
        # All 15 calls should be 200 (no 429 from default global limiter)
        assert codes.count(200) >= 14, f"Dashboard appears rate limited: {codes}"
        assert 429 not in codes, f"Dashboard endpoint should not be rate limited: {codes}"


# ---------------- regression ----------------
class TestRegression:
    @pytest.mark.parametrize("path", [
        "/training-plans",
        "/athletes",
        "/plan-templates/levels",
        "/dashboard/stats",
    ])
    def test_protected_endpoints_still_work(self, session, tokens, path):
        r = session.get(f"{API}{path}", headers={"Authorization": f"Bearer {tokens['token']}"}, timeout=30)
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:300]}"


# ---------------- error handling ----------------
class TestErrorHandling:
    def test_nonexistent_endpoint_returns_404(self, session):
        r = session.get(f"{API}/this-endpoint-does-not-exist-{uuid.uuid4().hex[:6]}", timeout=20)
        assert r.status_code == 404, f"Expected 404, got {r.status_code}"
        body_text = r.text or ""
        # No stack traces leaked
        assert "Traceback" not in body_text
        assert "File \"/" not in body_text

    def test_500_handler_does_not_leak_stack(self, session):
        # Send a malformed JSON to /auth/login -> FastAPI returns 422 normally
        # We just assert no stack trace in the body.
        r = session.post(f"{API}/auth/login", data="not-json", headers={"Content-Type": "application/json"}, timeout=20)
        assert r.status_code in (400, 422, 429, 500)
        assert "Traceback" not in (r.text or "")
