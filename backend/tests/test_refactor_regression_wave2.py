"""
Holistic regression tests after FASE 1 backend refactor — 2nd WAVE.

Covers the routers extracted in the 2nd wave of the monolith split:
  - routes/auth.py            (register / login / me / profile / roles, plan-features,
                               periodization-models-catalog, cycle-durations)
  - routes/training_plans.py  (generate-structure, sports-catalog public,
                               training-plans CRUD, calculators/load, export pdf)
  - routes/sessions.py        (macrocycles, competitions, sessions/calendar)
  - routes/exports.py         (export/comprehensive-pdf, export/plan/{id}/pdf 404)
  - routes/sharing.py         (boards/top, boards/share+view, coaches/og PNG,
                               sessions/view/{id} 404)

Also re-validates that the legacy routers (1st wave) still authenticate via the
re-exported get_current_user (e.g. /api/coaches/me).

Login response key is 'token' (per project contract).
"""

import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://lordcoach-optimize.preview.emergentagent.com",
).rstrip("/")

COACH_EMAIL = "test@train.com"
COACH_PASSWORD = "test123456"

TIMEOUT = 60


# =============================== fixtures ===============================

@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(http):
    r = http.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "token" in body, f"Login JSON must contain 'token' key, got: {list(body.keys())}"
    assert isinstance(body["token"], str) and len(body["token"]) > 20
    return body["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def bag():
    """Track ids for best-effort teardown."""
    data = {"plans": [], "macrocycles": [], "shares": []}
    yield data


# =============================== AUTH ROUTER ===============================

class TestAuthRouter:
    def test_register_new_user(self, http):
        email = f"TEST_user_{uuid.uuid4().hex[:8]}@regress.com"
        r = http.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": email,
                "password": "Regress123!",
                "name": "TEST Regress User",
                "role": "coach",
            },
            timeout=TIMEOUT,
        )
        # 200/201 = ok; 409/400 if duplicate (unlikely with uuid)
        assert r.status_code in (200, 201), f"Register failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("email") == email
        assert "id" in body

    def test_me(self, http, auth):
        r = http.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert r.json().get("email") == COACH_EMAIL

    def test_roles(self, http, auth):
        r = http.get(f"{BASE_URL}/api/auth/roles", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_plan_features(self, http, auth):
        r = http.get(f"{BASE_URL}/api/plan-features", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_periodization_models_catalog(self, http, auth):
        r = http.get(
            f"{BASE_URL}/api/periodization-models-catalog",
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text

    def test_cycle_durations(self, http, auth):
        r = http.get(f"{BASE_URL}/api/cycle-durations", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_update_profile(self, http, auth):
        r = http.put(
            f"{BASE_URL}/api/auth/profile",
            json={"full_name": "Test Coach (regression)"},
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text


# =============================== TRAINING PLANS ROUTER ===============================

class TestTrainingPlansRouter:
    def test_generate_structure(self, http, auth):
        payload = {
            "model": "traditional",
            "sport": "powerlifting",
            "total_weeks": 12,
            "start_date": "2026-01-01",
        }
        r = http.post(
            f"{BASE_URL}/api/generate-structure",
            json=payload,
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        # GeneratedStructure: expect at least macrocycles or phases
        assert isinstance(body, dict), body
        # Look for known keys
        assert any(k in body for k in ("macrocycles", "phases", "structure", "weeks")), (
            f"Unexpected structure keys: {list(body.keys())}"
        )

    def test_sports_catalog_public(self, http):
        r = http.get(f"{BASE_URL}/api/sports-catalog", timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_training_plans_list_auth(self, http, auth):
        r = http.get(f"{BASE_URL}/api/training-plans", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_training_plan_crud(self, http, auth, bag):
        payload = {
            "name": f"TEST_plan_{uuid.uuid4().hex[:6]}",
            "sport": "powerlifting",
            "model": "traditional",
            "duration_type": "annual",
            "total_weeks": 12,
            "start_date": "2026-01-01",
            "sessions_per_week": 4,
            "main_objective": "Regression test",
            "macrocycles": [],
        }
        r = http.post(
            f"{BASE_URL}/api/training-plans",
            json=payload,
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), f"Create plan failed: {r.status_code} {r.text}"
        body = r.json()
        plan_id = body.get("id")
        assert plan_id, f"No id in plan response: {body}"
        bag["plans"].append(plan_id)

        # GET
        r = http.get(
            f"{BASE_URL}/api/training-plans/{plan_id}", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, r.text
        assert r.json()["id"] == plan_id

        # DELETE
        r = http.delete(
            f"{BASE_URL}/api/training-plans/{plan_id}", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code in (200, 204), r.text
        bag["plans"].remove(plan_id)

        # Verify deletion
        r = http.get(
            f"{BASE_URL}/api/training-plans/{plan_id}", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 404, f"Expected 404 after delete, got {r.status_code}"

    def test_calculator_load(self, http, auth):
        payload = {
            "calculation_type": "1rm",
            "params": {"weight": 100, "reps": 5},
        }
        r = http.post(
            f"{BASE_URL}/api/calculators/load",
            json=payload,
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "result" in body and "1rm_average" in body["result"], body


# =============================== SESSIONS ROUTER ===============================

class TestSessionsRouter:
    def test_macrocycles_list(self, http, auth):
        r = http.get(f"{BASE_URL}/api/macrocycles", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_competitions_list(self, http, auth):
        r = http.get(f"{BASE_URL}/api/competitions", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        assert isinstance(r.json(), list)

    def test_sessions_calendar(self, http, auth):
        # athlete_id may not match an existing athlete; endpoint must still 200
        r = http.get(
            f"{BASE_URL}/api/sessions/calendar",
            params={
                "athlete_id": "TEST_does_not_exist",
                "start_date": "2026-01-01",
                "end_date": "2026-02-01",
            },
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text


# =============================== EXPORTS ROUTER ===============================

class TestExportsRouter:
    def test_comprehensive_pdf_empty(self, http, auth):
        """Even with empty sections, endpoint must return a valid PDF (200)."""
        payload = {"sections": [], "format": {}}
        r = http.post(
            f"{BASE_URL}/api/export/comprehensive-pdf",
            json=payload,
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"comprehensive-pdf failed: {r.status_code} {r.text[:300]}"
        assert r.content[:5] == b"%PDF-", f"Expected PDF magic bytes, got: {r.content[:20]}"

    def test_export_plan_pdf_nonexistent_404(self, http, auth):
        r = http.get(
            f"{BASE_URL}/api/export/plan/TEST_does_not_exist/pdf",
            headers=auth,
            timeout=TIMEOUT,
        )
        # 404 by design when macrocycle id does not exist
        assert r.status_code == 404, f"Expected 404 for nonexistent macrocycle, got {r.status_code}"


# =============================== SHARING ROUTER (PUBLIC) ===============================

class TestSharingRouter:
    def test_boards_top_public(self, http):
        r = http.get(f"{BASE_URL}/api/boards/top", timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_boards_share_and_view_public(self, http, bag):
        share_payload = {
            "payload": {"elements": []},
            "sport": "football",
            "title": f"TEST_share_{uuid.uuid4().hex[:6]}",
        }
        r = http.post(
            f"{BASE_URL}/api/boards/share", json=share_payload, timeout=TIMEOUT
        )
        assert r.status_code in (200, 201), f"boards/share failed: {r.status_code} {r.text}"
        share_id = r.json().get("share_id")
        assert share_id, f"No share_id in response: {r.json()}"
        bag["shares"].append(share_id)

        # view it back
        r = http.get(f"{BASE_URL}/api/boards/view/{share_id}", timeout=TIMEOUT)
        assert r.status_code == 200, f"boards/view failed: {r.status_code} {r.text}"
        body = r.json()
        assert body.get("share_id") == share_id

    def test_coaches_og_png(self, http):
        # Should return PNG (200) with a fallback even when the slug does not exist
        r = http.get(
            f"{BASE_URL}/api/coaches/og/lordcoach-optimize.png", timeout=TIMEOUT
        )
        assert r.status_code == 200, f"OG image failed: {r.status_code} {r.text[:200]}"
        ctype = r.headers.get("content-type", "")
        assert "image" in ctype.lower(), f"Expected image content-type, got {ctype}"
        # PNG magic bytes
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", f"Not a PNG: {r.content[:16]}"

    def test_sessions_view_nonexistent_404(self, http):
        r = http.get(
            f"{BASE_URL}/api/sessions/view/TEST_does_not_exist", timeout=TIMEOUT
        )
        assert r.status_code == 404, f"Expected 404, got {r.status_code}: {r.text[:200]}"


# =============================== LEGACY get_current_user RE-EXPORT ===============================

class TestLegacyAuthReexport:
    """Some legacy routers still do `from server import get_current_user`.
    server.py must re-export it from core.auth so those routers keep
    authenticating correctly."""

    def test_coaches_me(self, http, auth):
        r = http.get(f"{BASE_URL}/api/coaches/me", headers=auth, timeout=TIMEOUT)
        # 200 (has coach) or 404 (no coach record), both are correct — anything
        # else (especially 500 / 401) means the re-export is broken.
        assert r.status_code in (200, 404), (
            f"coaches/me must be 200 or 404 with valid token, got {r.status_code}: {r.text[:200]}"
        )

    def test_periodization_models_via_legacy_router(self, http, auth):
        """routes/periodization_models.py uses `from server import get_current_user`.
        If the re-export is broken this would 401/500 with a valid token.
        Router prefix is /periodization-library."""
        r = http.get(
            f"{BASE_URL}/api/periodization-library", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, (
            f"periodization-library must be 200 with valid token, got {r.status_code}: {r.text[:200]}"
        )

    def test_coaches_me_no_auth_unauthorized(self, http):
        r = http.get(f"{BASE_URL}/api/coaches/me", timeout=TIMEOUT)
        assert r.status_code in (401, 403), (
            f"Unauth call must be 401/403, got {r.status_code}"
        )


# =============================== TEARDOWN ===============================

class TestZzzCleanup:
    def test_cleanup(self, http, auth, bag):
        for pid in list(bag["plans"]):
            try:
                http.delete(
                    f"{BASE_URL}/api/training-plans/{pid}", headers=auth, timeout=TIMEOUT
                )
            except Exception:
                pass
        for mid in list(bag["macrocycles"]):
            try:
                http.delete(
                    f"{BASE_URL}/api/macrocycles/{mid}", headers=auth, timeout=TIMEOUT
                )
            except Exception:
                pass
        # shares are public and TTL-expired; nothing to delete on backend
        assert True
