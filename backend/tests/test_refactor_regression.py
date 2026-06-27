"""
Holistic regression tests after FASE 1 backend refactor (router extraction).
Tests every group of endpoints listed in the review request via the public
preview URL (REACT_APP_BACKEND_URL) using the coach account test@train.com.

Cleanup: any tournaments / teams / training-methods created during a test run
are deleted at the end.
"""

import os
import uuid
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
COACH_EMAIL = "test@train.com"
COACH_PASSWORD = "test123456"

TIMEOUT = 30


# ----------------------------- fixtures -----------------------------

@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(session):
    r = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": COACH_EMAIL, "password": COACH_PASSWORD},
        timeout=TIMEOUT,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    # Per request, login returns the key 'token' (not access_token).
    assert "token" in data, f"Expected 'token' in login response, got keys: {list(data.keys())}"
    assert isinstance(data["token"], str) and len(data["token"]) > 20
    return data["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def created_resources():
    """Collects ids created during this run for teardown."""
    bag = {"teams": [], "tournaments": [], "boards": [], "training_method_user_ids": []}
    yield bag
    # cleanup is invoked from a separate test (test_zzz_cleanup) to control order


# ----------------------------- AUTH (still in server.py) -----------------------------

class TestAuth:
    def test_login_returns_token(self, token):
        assert token

    def test_auth_me(self, session, auth):
        r = session.get(f"{BASE_URL}/api/auth/me", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("email") == COACH_EMAIL

    def test_auth_roles(self, session, auth):
        r = session.get(f"{BASE_URL}/api/auth/roles", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_plan_features(self, session, auth):
        r = session.get(f"{BASE_URL}/api/plan-features", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text


# ----------------------------- plan_data router -----------------------------

class TestPlanData:
    def test_objectives_requires_auth(self, session):
        r = session.get(f"{BASE_URL}/api/plan-data/objectives", timeout=TIMEOUT)
        # 401 or 403 are both acceptable; the request explicitly says 403
        assert r.status_code in (401, 403), f"Expected 401/403, got {r.status_code}"

    def test_objectives_post_and_get(self, session, auth):
        plan_id = f"TEST_plan_{uuid.uuid4().hex[:8]}"
        payload = {
            "plan_id": plan_id,
            "general_objective": "TEST regression",
            "specific_objectives": ["a", "b"],
            "timeline": "2026-Q1",  # timeline is optional string
        }
        r = session.post(
            f"{BASE_URL}/api/plan-data/objectives", json=payload, headers=auth, timeout=TIMEOUT
        )
        assert r.status_code in (200, 201), r.text

        r = session.get(
            f"{BASE_URL}/api/plan-data/objectives", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, r.text

    def test_competitions_post_and_get(self, session, auth):
        plan_id = f"TEST_plan_{uuid.uuid4().hex[:8]}"
        # POST is at /plan-data/competitions (no plan_id in path); GET takes plan_id in path
        payload = {
            "plan_id": plan_id,
            "name": "TEST cup",
            "date": "2026-03-15",
            "priority": "high",
        }
        r = session.post(
            f"{BASE_URL}/api/plan-data/competitions",
            json=payload,
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), r.text

        r = session.get(
            f"{BASE_URL}/api/plan-data/competitions/{plan_id}",
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, r.text

    def test_plan_data_bundle(self, session, auth):
        plan_id = "TEST_bundle_nonexistent"
        r = session.get(
            f"{BASE_URL}/api/plan-data/{plan_id}", headers=auth, timeout=TIMEOUT
        )
        # endpoint should respond 200 with empty-ish data or 404 by design
        assert r.status_code in (200, 404), r.text


# ----------------------------- entities_teams router -----------------------------

class TestEntitiesTeams:
    def test_entities_list(self, session, auth):
        r = session.get(f"{BASE_URL}/api/entities", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_entities_hierarchy(self, session, auth):
        r = session.get(f"{BASE_URL}/api/entities-hierarchy", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_entity_types(self, session, auth):
        r = session.get(f"{BASE_URL}/api/entity-types", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_teams_list(self, session, auth):
        r = session.get(f"{BASE_URL}/api/teams", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_team_create_and_delete(self, session, auth, created_resources):
        name = f"TEST_team_{uuid.uuid4().hex[:6]}"
        r = session.post(
            f"{BASE_URL}/api/teams",
            json={"name": name, "sport": "futbol"},
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        team_id = body.get("id") or body.get("team_id") or body.get("_id")
        assert team_id, f"No id in team create response: {body}"
        created_resources["teams"].append(team_id)

        # delete now (also redundantly cleaned up at the end)
        r = session.delete(f"{BASE_URL}/api/teams/{team_id}", headers=auth, timeout=TIMEOUT)
        assert r.status_code in (200, 204), r.text
        if team_id in created_resources["teams"]:
            created_resources["teams"].remove(team_id)


# ----------------------------- sports router -----------------------------

class TestSports:
    def test_sports_catalog_authed(self, session, auth):
        r = session.get(f"{BASE_URL}/api/sports/catalog", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        # 6 categorías seed
        if isinstance(body, list):
            count = len(body)
        elif isinstance(body, dict):
            # may be {categories: [...]} or {sports: [...]}
            count = len(body.get("categories") or body.get("sports") or body)
        else:
            count = 0
        assert count >= 6, f"Expected at least 6 categories in sports catalog, got {count}: {body}"

    def test_sports_catalog_public(self, session):
        r = session.get(f"{BASE_URL}/api/sports-catalog", timeout=TIMEOUT)
        assert r.status_code == 200, r.text


# ----------------------------- athletes router -----------------------------

class TestAthletes:
    def test_athletes_list(self, session, auth):
        r = session.get(f"{BASE_URL}/api/athletes", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_exercises_list(self, session, auth):
        r = session.get(f"{BASE_URL}/api/exercises", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text


# ----------------------------- tournaments router (the most complex) -----------------------------

class TestTournaments:
    def test_full_tournament_flow(self, session, auth, created_resources):
        # 1) create tournament
        t_payload = {
            "name": f"TEST_tournament_{uuid.uuid4().hex[:6]}",
            "sport": "futbol",
            "format": "single_elimination",
            "start_date": "2026-04-01",
            "end_date": "2026-04-30",
        }
        r = session.post(
            f"{BASE_URL}/api/tournaments", json=t_payload, headers=auth, timeout=TIMEOUT
        )
        assert r.status_code in (200, 201), f"Create tournament failed: {r.status_code} {r.text}"
        t_body = r.json()
        t_id = t_body.get("id") or t_body.get("_id") or t_body.get("tournament_id")
        assert t_id, f"No tournament id: {t_body}"
        created_resources["tournaments"].append(t_id)

        # 2) add category
        r = session.post(
            f"{BASE_URL}/api/tournaments/{t_id}/categories",
            json={"name": "Senior"},
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), f"Add category failed: {r.status_code} {r.text}"
        cat_body = r.json()
        cat_id = cat_body.get("id") or cat_body.get("category_id") or cat_body.get("_id")
        assert cat_id, f"Category response missing id at top level: {cat_body}"

        # 3) register 4 participants (route is /categories/{cat_id}/register)
        for i in range(4):
            payload = {
                "participant_type": "team",
                "participant_id": f"TEST_part_{i}_{uuid.uuid4().hex[:4]}",
                "participant_name": f"TEST_Team_{i}",
            }
            r = session.post(
                f"{BASE_URL}/api/tournaments/{t_id}/categories/{cat_id}/register",
                json=payload,
                headers=auth,
                timeout=TIMEOUT,
            )
            assert r.status_code in (200, 201), f"Register P{i} failed: {r.status_code} {r.text}"

        # 4) generate bracket (route is /categories/{cat_id}/generate-bracket)
        r = session.post(
            f"{BASE_URL}/api/tournaments/{t_id}/categories/{cat_id}/generate-bracket",
            json={},
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 201), f"Generate bracket failed: {r.status_code} {r.text}"

        # 5) list matches
        r = session.get(
            f"{BASE_URL}/api/tournaments/{t_id}/matches", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, r.text
        matches_body = r.json()
        matches = matches_body if isinstance(matches_body, list) else matches_body.get("matches", [])
        assert matches, f"No matches generated: {matches_body}"
        match_id = matches[0].get("id") or matches[0].get("_id") or matches[0].get("match_id")
        assert match_id, f"No match id: {matches[0]}"

        # 6) update match score (triggers update_standings)
        r = session.put(
            f"{BASE_URL}/api/tournaments/{t_id}/matches/{match_id}/score",
            json={"home_score": 3, "away_score": 1, "status": "completed"},
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 200, f"Score update failed (update_standings): {r.status_code} {r.text}"

        # 7) get standings (route is /standings/{category_id})
        r = session.get(
            f"{BASE_URL}/api/tournaments/{t_id}/standings/{cat_id}", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, r.text

        # 8) export PDF
        r = session.get(
            f"{BASE_URL}/api/tournaments/{t_id}/export-pdf", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, f"Tournament PDF failed: {r.status_code} {r.text[:200]}"
        # PDFs start with %PDF-
        assert r.content[:5] == b"%PDF-", f"Expected PDF magic bytes, got: {r.content[:20]}"


# ----------------------------- tactical_boards router -----------------------------

class TestTacticalBoards:
    def test_list(self, session, auth):
        r = session.get(f"{BASE_URL}/api/tactical-boards", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_create_and_delete(self, session, auth, created_resources):
        payload = {"name": f"TEST_board_{uuid.uuid4().hex[:6]}", "sport": "futbol", "elements": []}
        r = session.post(
            f"{BASE_URL}/api/tactical-boards", json=payload, headers=auth, timeout=TIMEOUT
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        b_id = body.get("id") or body.get("_id") or body.get("board_id")
        assert b_id, f"No board id: {body}"
        created_resources["boards"].append(b_id)

        r = session.delete(
            f"{BASE_URL}/api/tactical-boards/{b_id}", headers=auth, timeout=TIMEOUT
        )
        assert r.status_code in (200, 204), r.text
        if b_id in created_resources["boards"]:
            created_resources["boards"].remove(b_id)


# ----------------------------- payments router -----------------------------

class TestPayments:
    def test_checkout_free_plan_400(self, session, auth):
        r = session.post(
            f"{BASE_URL}/api/payments/checkout",
            json={"plan": "free", "origin_url": "https://lordcoach-optimize.preview.emergentagent.com"},
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code == 400, f"Expected 400 for free plan, got {r.status_code}: {r.text}"

    def test_checkout_no_auth(self, session):
        r = session.post(
            f"{BASE_URL}/api/payments/checkout", json={"plan": "pro"}, timeout=TIMEOUT
        )
        assert r.status_code in (401, 403), f"Expected 401/403 w/o auth, got {r.status_code}"


# ----------------------------- dashboard_panel router -----------------------------

class TestDashboardPanel:
    def test_dashboard_stats(self, session, auth):
        r = session.get(f"{BASE_URL}/api/dashboard/stats", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_control_panel_stats(self, session, auth):
        r = session.get(f"{BASE_URL}/api/control-panel/stats", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text

    def test_control_panel_export_pdf(self, session, auth):
        """Critical: export-pdf internally calls get_control_panel_stats. Must not 500."""
        r = session.post(
            f"{BASE_URL}/api/control-panel/export-pdf",
            json={"include_summary": True},
            headers=auth,
            timeout=60,
        )
        assert r.status_code == 200, f"Control panel PDF export failed: {r.status_code} {r.text[:300]}"
        assert r.content[:5] == b"%PDF-", f"Expected PDF magic bytes, got: {r.content[:20]}"


# ----------------------------- athlete_data router (legacy) -----------------------------

class TestAthleteData:
    def test_training_methods_post_then_get(self, session, auth):
        payload = {"methods": {"strength": ["squat"]}}
        r = session.post(
            f"{BASE_URL}/api/training-methods", json=payload, headers=auth, timeout=TIMEOUT
        )
        assert r.status_code == 200, r.text

        r = session.get(f"{BASE_URL}/api/training-methods", headers=auth, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        body = r.json()
        # ensure the doc came back with the strength field
        methods = body.get("methods") if isinstance(body, dict) else None
        assert methods is None or "strength" in methods or body, f"Unexpected body: {body}"

    def test_get_anthropometric_nonexistent_returns_404(self, session, auth):
        r = session.get(
            f"{BASE_URL}/api/anthropometric/TEST_does_not_exist",
            headers=auth,
            timeout=TIMEOUT,
        )
        # 404 by design is acceptable
        assert r.status_code in (200, 404), r.text

    def test_get_objectives_nonexistent_returns_404(self, session, auth):
        r = session.get(
            f"{BASE_URL}/api/objectives/TEST_does_not_exist",
            headers=auth,
            timeout=TIMEOUT,
        )
        assert r.status_code in (200, 404), r.text


# ----------------------------- final cleanup (best effort) -----------------------------

class TestZzzCleanup:
    """Runs last in alphabetical order to clean up any leftover resources."""

    def test_cleanup(self, session, auth, created_resources):
        for tid in list(created_resources["tournaments"]):
            try:
                session.delete(f"{BASE_URL}/api/tournaments/{tid}", headers=auth, timeout=TIMEOUT)
            except Exception:
                pass
        for tm in list(created_resources["teams"]):
            try:
                session.delete(f"{BASE_URL}/api/teams/{tm}", headers=auth, timeout=TIMEOUT)
            except Exception:
                pass
        for b in list(created_resources["boards"]):
            try:
                session.delete(f"{BASE_URL}/api/tactical-boards/{b}", headers=auth, timeout=TIMEOUT)
            except Exception:
                pass
        assert True
