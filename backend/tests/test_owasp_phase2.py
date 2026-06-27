"""
OWASP Phase 2 — Multi-tenant ownership (IDOR), NoSQL injection via Pydantic typing,
XSS escape in public share view, security headers and regression of core endpoints.

Target: Backend FastAPI running at REACT_APP_BACKEND_URL (preview).
All endpoints prefixed with /api.
"""
import os
import re
import uuid
import time
import pytest
import requests

def _load_base_url():
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
        # fall back to frontend/.env
        env_path = "/app/frontend/.env"
        try:
            with open(env_path) as f:
                for line in f:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip()
                        break
        except FileNotFoundError:
            pass
    return url.rstrip("/")

BASE_URL = _load_base_url()
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"

COACH_A_EMAIL = "test@train.com"
COACH_A_PASS = "test123456"


# -------------------- session fixtures --------------------
@pytest.fixture(scope="session")
def coach_a_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": COACH_A_EMAIL, "password": COACH_A_PASS},
                      timeout=20)
    assert r.status_code == 200, f"Coach A login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "refresh_token" in data
    return data["token"]


@pytest.fixture(scope="session")
def coach_a_refresh():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": COACH_A_EMAIL, "password": COACH_A_PASS},
                      timeout=20)
    assert r.status_code == 200
    return r.json()["refresh_token"]


@pytest.fixture(scope="session")
def coach_b_token():
    """Register a brand new Coach B with a disposable email."""
    email = f"coachb_{uuid.uuid4().hex[:10]}@test.com"
    pw = "CoachB-Pass!2026"
    reg = requests.post(f"{BASE_URL}/api/auth/register",
                        json={"email": email, "password": pw, "name": "Coach B",
                              "role": "coach"},
                        timeout=20)
    assert reg.status_code in (200, 201), f"Coach B register failed: {reg.status_code} {reg.text}"
    lg = requests.post(f"{BASE_URL}/api/auth/login",
                       json={"email": email, "password": pw},
                       timeout=20)
    assert lg.status_code == 200, f"Coach B login failed: {lg.status_code} {lg.text}"
    return lg.json()["token"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# -------------------- coach A chain fixture --------------------
@pytest.fixture(scope="session")
def coach_a_chain(coach_a_token):
    """Create athlete -> macro -> meso -> micro -> session as Coach A."""
    h = _h(coach_a_token)

    # 1) athlete
    athlete = requests.post(
        f"{BASE_URL}/api/athletes",
        headers=h,
        json={"name": f"TEST_Athlete_{uuid.uuid4().hex[:6]}", "sport": "athletics",
              "age": 22, "level": "intermediate"},
        timeout=20,
    )
    assert athlete.status_code == 200, f"athlete create: {athlete.status_code} {athlete.text}"
    athlete_id = athlete.json()["id"]

    # 2) macrocycle (athlete_id as query param)
    macro = requests.post(
        f"{BASE_URL}/api/macrocycles",
        headers=h,
        params={"athlete_id": athlete_id},
        json={"name": "TEST Macro", "start_date": "2026-01-01", "end_date": "2026-12-31",
              "sport": "athletics", "planning_model": "traditional",
              "objective": "test"},
        timeout=20,
    )
    assert macro.status_code == 200, f"macro create: {macro.status_code} {macro.text}"
    macro_id = macro.json()["id"]

    # 3) mesocycle
    meso = requests.post(
        f"{BASE_URL}/api/mesocycles",
        headers=h,
        params={"macrocycle_id": macro_id},
        json={"name": "TEST Meso", "start_date": "2026-01-01", "end_date": "2026-02-28",
              "phase": "general"},
        timeout=20,
    )
    assert meso.status_code == 200, f"meso create: {meso.status_code} {meso.text}"
    meso_id = meso.json()["id"]

    # 4) microcycle
    micro = requests.post(
        f"{BASE_URL}/api/microcycles",
        headers=h,
        params={"mesocycle_id": meso_id},
        json={"name": "TEST Micro", "start_date": "2026-01-01", "end_date": "2026-01-07"},
        timeout=20,
    )
    assert micro.status_code == 200, f"micro create: {micro.status_code} {micro.text}"
    micro_id = micro.json()["id"]

    # 5) session
    sess = requests.post(
        f"{BASE_URL}/api/sessions",
        headers=h,
        params={"microcycle_id": micro_id},
        json={"date": "2026-01-02", "session_type": "physical",
              "duration_minutes": 60, "volume": 10.0, "intensity": "medium",
              "exercises": [], "time_of_day": "morning"},
        timeout=20,
    )
    assert sess.status_code == 200, f"session create: {sess.status_code} {sess.text}"
    session_id = sess.json()["id"]

    return {
        "athlete_id": athlete_id,
        "macro_id": macro_id,
        "meso_id": meso_id,
        "micro_id": micro_id,
        "session_id": session_id,
    }


# ============================================================
# 1. IDOR / multi-tenant ownership on the session chain
# ============================================================
class TestIDORSessionsChain:
    def test_coach_b_cannot_complete_coach_a_session(self, coach_a_chain, coach_b_token):
        r = requests.put(
            f"{BASE_URL}/api/sessions/{coach_a_chain['session_id']}/complete",
            headers=_h(coach_b_token), timeout=20,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_coach_b_cannot_create_microcycle_on_coach_a_meso(self, coach_a_chain, coach_b_token):
        r = requests.post(
            f"{BASE_URL}/api/microcycles",
            headers=_h(coach_b_token),
            params={"mesocycle_id": coach_a_chain["meso_id"]},
            json={"name": "EVIL Micro", "start_date": "2026-01-01", "end_date": "2026-01-07"},
            timeout=20,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_coach_b_cannot_create_session_on_coach_a_micro(self, coach_a_chain, coach_b_token):
        r = requests.post(
            f"{BASE_URL}/api/sessions",
            headers=_h(coach_b_token),
            params={"microcycle_id": coach_a_chain["micro_id"]},
            json={"date": "2026-01-03", "session_type": "physical",
                  "duration_minutes": 60, "volume": 10.0, "intensity": "medium",
                  "exercises": [], "time_of_day": "morning"},
            timeout=20,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_coach_b_cannot_create_meso_on_coach_a_macro(self, coach_a_chain, coach_b_token):
        r = requests.post(
            f"{BASE_URL}/api/mesocycles",
            headers=_h(coach_b_token),
            params={"macrocycle_id": coach_a_chain["macro_id"]},
            json={"name": "EVIL Meso", "start_date": "2026-01-01", "end_date": "2026-02-01",
                  "phase": "general"},
            timeout=20,
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text}"

    def test_coach_a_can_complete_own_session(self, coach_a_chain, coach_a_token):
        r = requests.put(
            f"{BASE_URL}/api/sessions/{coach_a_chain['session_id']}/complete",
            headers=_h(coach_a_token), timeout=20,
        )
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        assert "completed" in r.json().get("message", "").lower()


# ============================================================
# 2. NoSQL injection hardening via Pydantic typing
# ============================================================
class TestNoSQLInjectionTyping:
    def test_login_with_operator_object_is_422(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": {"$ne": None}, "password": "x"},
                          timeout=20)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text[:200]}"

    def test_login_with_password_object_is_422(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": "test@train.com", "password": {"$ne": "x"}},
                          timeout=20)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: {r.text[:200]}"


# ============================================================
# 3. XSS escape on public share page
# ============================================================
class TestXSSShareEscape:
    def test_share_escapes_plan_name_and_rejects_non_data_img(self, coach_a_token):
        payload = {
            "plan_name": "<script>alert(1)</script>",
            "image_b64": "javascript:alert(2)",
        }
        r = requests.post(f"{BASE_URL}/api/graphic-plan/share",
                          headers=_h(coach_a_token), json=payload, timeout=20)
        assert r.status_code == 200, f"share create: {r.status_code} {r.text}"
        body = r.json()
        share_id = body.get("share_id") or body.get("id")
        assert share_id, f"no share_id in response: {body}"

        page = requests.get(f"{BASE_URL}/api/graphic-plan/shared/{share_id}", timeout=20)
        assert page.status_code == 200, f"share view: {page.status_code}"
        html = page.text
        # The raw <script> must NOT appear (escaped)
        assert "<script>alert(1)</script>" not in html, "raw <script> leaked into share page"
        # Escaped version must be present
        assert "&lt;script&gt;alert(1)&lt;/script&gt;" in html, "plan_name not html-escaped"
        # img src must be empty (javascript: url discarded)
        m = re.search(r'<img\s+[^>]*src="([^"]*)"', html)
        assert m is not None, "no <img> tag found in share page"
        assert m.group(1) == "", f"img src not empty, got: {m.group(1)!r}"
        # And javascript: must not appear in src
        assert "javascript:" not in html.lower()


# ============================================================
# 4. Security headers
# ============================================================
class TestSecurityHeaders:
    @pytest.fixture(scope="class")
    def headers(self):
        # Use a known endpoint
        r = requests.get(f"{BASE_URL}/api/plan-templates/levels", timeout=20)
        return {k.lower(): v for k, v in r.headers.items()}

    def test_x_frame_options(self, headers):
        assert headers.get("x-frame-options", "").upper() == "DENY"

    def test_x_content_type_options(self, headers):
        assert headers.get("x-content-type-options", "").lower() == "nosniff"

    def test_csp_present(self, headers):
        assert "content-security-policy" in headers, headers.keys()

    def test_referrer_policy(self, headers):
        assert headers.get("referrer-policy"), "Referrer-Policy missing"

    def test_hsts_present(self, headers):
        assert "strict-transport-security" in headers, "HSTS missing"


# ============================================================
# 5. Core regression — must not break
# ============================================================
class TestCoreRegression:
    @pytest.mark.parametrize("path", [
        "/api/training-plans",
        "/api/athletes",
        "/api/tournaments",
        "/api/dashboard/stats",
        "/api/plan-templates/levels",
    ])
    def test_protected_endpoints_200(self, coach_a_token, path):
        r = requests.get(f"{BASE_URL}{path}", headers=_h(coach_a_token), timeout=20)
        assert r.status_code == 200, f"{path} -> {r.status_code}: {r.text[:200]}"

    def test_login_returns_token_and_refresh(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": COACH_A_EMAIL, "password": COACH_A_PASS},
                          timeout=20)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data.get("token"), str) and len(data["token"]) > 20
        assert isinstance(data.get("refresh_token"), str) and len(data["refresh_token"]) > 20

    def test_refresh_endpoint(self, coach_a_refresh):
        r = requests.post(f"{BASE_URL}/api/auth/refresh",
                          json={"refresh_token": coach_a_refresh},
                          timeout=20)
        assert r.status_code == 200, f"refresh: {r.status_code} {r.text}"
        data = r.json()
        assert "token" in data


# ============================================================
# 6. Brute force still active on disposable email
# ============================================================
class TestBruteForceLockout:
    def test_5_fails_then_429(self):
        bad_email = f"brute_{uuid.uuid4().hex[:10]}@test.com"
        statuses = []
        for _ in range(5):
            r = requests.post(f"{BASE_URL}/api/auth/login",
                              json={"email": bad_email, "password": "wrong"},
                              timeout=20)
            statuses.append(r.status_code)
            time.sleep(0.2)
        # The first 5 must be 401 (rate limit slowapi is 10/minute so still allowed)
        assert all(s == 401 for s in statuses), f"Expected 5x 401, got {statuses}"
        # 6th attempt -> lockout 429
        r6 = requests.post(f"{BASE_URL}/api/auth/login",
                           json={"email": bad_email, "password": "wrong"},
                           timeout=20)
        assert r6.status_code == 429, f"Expected 429 on 6th, got {r6.status_code}: {r6.text}"
