"""Backend tests for the Athlete Portal (Fase 3) - /api/athlete-portal/*."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lordcoach-optimize.preview.emergentagent.com').rstrip('/')

COACH_EMAIL = "juegolaureado@gmail.com"
COACH_PASS = "LordTraining2026!"
ATHLETE_EMAIL = "juan.atleta@test.com"
ATHLETE_PASS = "8c6nkWqG"
SHARE_ID = "ATP-dae6712f00504806"
PLAN_ID = "25b9abc7-b264-4809-a998-b688f660a6ca"
ATHLETE_ID_INVITE = "8eaadfb1-9228-4fdc-a495-6fd382400f6f"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def coach_token(session):
    r = session.post(f"{BASE_URL}/api/auth/login",
                     json={"email": COACH_EMAIL, "password": COACH_PASS})
    assert r.status_code == 200, f"Coach login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def athlete_token(session):
    r = session.post(f"{BASE_URL}/api/athlete-portal/auth/login",
                     json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASS})
    assert r.status_code == 200, f"Athlete login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "athlete" in data
    return data["token"]


# ============== PUBLIC PORTAL ==============
class TestPublicPortal:
    def test_public_view_returns_plan_with_sessions(self, session):
        r = session.get(f"{BASE_URL}/api/athlete-portal/public/{SHARE_ID}")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["read_only"] is True
        assert "athlete_name" in data
        assert "plan" in data and "sessions" in data
        assert isinstance(data["sessions"], list)
        assert len(data["sessions"]) > 0, "Sessions should be seeded - check demo-seed"
        # At least some sessions must have fecha (date) populated
        with_dates = [s for s in data["sessions"] if s.get("fecha")]
        assert len(with_dates) > 0, "No sessions have 'fecha' field - seed missing"
        # competitions key must exist
        assert "competitions" in data and isinstance(data["competitions"], list)

    def test_public_view_invalid_share(self, session):
        r = session.get(f"{BASE_URL}/api/athlete-portal/public/INVALID-XXXX")
        assert r.status_code == 404

    def test_public_complete_session_roundtrip(self, session):
        # Get a session id from the public view
        r = session.get(f"{BASE_URL}/api/athlete-portal/public/{SHARE_ID}")
        sessions = r.json()["sessions"]
        target = next((s for s in sessions if s.get("fecha")), sessions[0])
        sid = target["id"]
        # Mark as completed
        r2 = session.post(
            f"{BASE_URL}/api/athlete-portal/public/{SHARE_ID}/sessions/{sid}",
            json={"completada": True, "rpe": 7, "comentario": "TEST_public_complete"},
        )
        assert r2.status_code == 200, r2.text
        body = r2.json()
        assert body["status"] == "ok"
        assert body["completada"] is True
        # Verify persisted via GET
        r3 = session.get(f"{BASE_URL}/api/athlete-portal/public/{SHARE_ID}")
        s_after = next((x for x in r3.json()["sessions"] if x["id"] == sid), None)
        assert s_after is not None
        assert s_after["completada"] is True
        assert s_after.get("rpe_reportado") == 7
        # Cleanup: unmark
        session.post(f"{BASE_URL}/api/athlete-portal/public/{SHARE_ID}/sessions/{sid}",
                     json={"completada": False, "rpe": None, "comentario": ""})

    def test_public_complete_invalid_share(self, session):
        r = session.post(f"{BASE_URL}/api/athlete-portal/public/INVALID/sessions/whatever",
                         json={"completada": True})
        assert r.status_code == 404

    def test_public_complete_session_not_in_plan(self, session):
        r = session.post(f"{BASE_URL}/api/athlete-portal/public/{SHARE_ID}/sessions/nope-id",
                         json={"completada": True})
        assert r.status_code == 403


# ============== ATHLETE AUTH ==============
class TestAthleteAuth:
    def test_login_success(self, session):
        r = session.post(f"{BASE_URL}/api/athlete-portal/auth/login",
                         json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASS})
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data["token"], str) and len(data["token"]) > 20
        assert data["athlete"]["email"] == ATHLETE_EMAIL

    def test_login_bad_password(self, session):
        r = session.post(f"{BASE_URL}/api/athlete-portal/auth/login",
                         json={"email": ATHLETE_EMAIL, "password": "WRONGPASS"})
        assert r.status_code == 401

    def test_me_endpoint(self, session, athlete_token):
        r = session.get(f"{BASE_URL}/api/athlete-portal/auth/me",
                        headers={"Authorization": f"Bearer {athlete_token}"})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ATHLETE_EMAIL
        assert "assigned_plan_id" in data

    def test_me_unauthorized(self, session):
        r = session.get(f"{BASE_URL}/api/athlete-portal/auth/me")
        assert r.status_code in (401, 403)


# ============== ATHLETE LOGGED-IN ENDPOINTS ==============
class TestAthletePanel:
    def test_get_plan(self, session, athlete_token):
        r = session.get(f"{BASE_URL}/api/athlete-portal/me/plan",
                        headers={"Authorization": f"Bearer {athlete_token}"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "sessions" in data and "plan" in data and "competitions" in data
        assert isinstance(data["sessions"], list)
        # The juan atleta should have an assigned plan
        assert data["plan"] is not None
        assert len(data["sessions"]) > 0, "Expected sessions for assigned plan"

    def test_complete_my_session(self, session, athlete_token):
        h = {"Authorization": f"Bearer {athlete_token}"}
        plan = session.get(f"{BASE_URL}/api/athlete-portal/me/plan", headers=h).json()
        sid = plan["sessions"][0]["id"]
        r = session.post(f"{BASE_URL}/api/athlete-portal/me/sessions/{sid}",
                         headers=h, json={"completada": True, "rpe": 6, "comentario": "TEST_me"})
        assert r.status_code == 200, r.text
        # Verify via GET
        plan2 = session.get(f"{BASE_URL}/api/athlete-portal/me/plan", headers=h).json()
        s2 = next(s for s in plan2["sessions"] if s["id"] == sid)
        assert s2["completada"] is True
        assert s2.get("rpe_reportado") == 6
        # Cleanup
        session.post(f"{BASE_URL}/api/athlete-portal/me/sessions/{sid}",
                     headers=h, json={"completada": False})

    def test_complete_invalid_session(self, session, athlete_token):
        h = {"Authorization": f"Bearer {athlete_token}"}
        r = session.post(f"{BASE_URL}/api/athlete-portal/me/sessions/nope",
                         headers=h, json={"completada": True})
        assert r.status_code == 403

    def test_readiness_save_and_get(self, session, athlete_token):
        h = {"Authorization": f"Bearer {athlete_token}"}
        payload = {"sleep": 80, "muscle_soreness": 20, "stress": 30, "motivation": 90}
        r = session.post(f"{BASE_URL}/api/athlete-portal/me/readiness", headers=h, json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "ok"
        # overall = (80 + 90 + (100-20) + (100-30)) / 4 = (80+90+80+70)/4 = 80
        assert body["overall"] == 80
        # Upsert -> POST again with different values, must update not duplicate
        r2 = session.post(f"{BASE_URL}/api/athlete-portal/me/readiness", headers=h,
                          json={"sleep": 60, "muscle_soreness": 40, "stress": 40, "motivation": 60})
        assert r2.status_code == 200
        # GET
        r3 = session.get(f"{BASE_URL}/api/athlete-portal/me/readiness", headers=h)
        assert r3.status_code == 200
        data = r3.json()
        assert data["today"] is not None
        assert data["today"]["sleep"] == 60  # updated

    def test_records(self, session, athlete_token):
        h = {"Authorization": f"Bearer {athlete_token}"}
        r = session.get(f"{BASE_URL}/api/athlete-portal/me/records", headers=h)
        assert r.status_code == 200
        data = r.json()
        assert "records" in data and "capabilities" in data
        assert isinstance(data["records"], list)
        assert isinstance(data["capabilities"], list)


# ============== COACH ENDPOINTS ==============
class TestCoachPortal:
    def test_coach_get_share(self, session, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = session.get(f"{BASE_URL}/api/athlete-portal/share/{PLAN_ID}", headers=h)
        assert r.status_code == 200
        data = r.json()
        # Should already exist for this plan
        assert data["share_id"] is not None

    def test_coach_create_invite_code(self, session, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = session.post(f"{BASE_URL}/api/athlete-portal/invite-code", headers=h,
                         json={"plan_id": PLAN_ID, "athlete_name": "TEST_invite_user"})
        assert r.status_code == 200, r.text
        code = r.json()["code"]
        assert isinstance(code, str) and len(code) == 8

    def test_coach_read_readiness_for_athlete(self, session, coach_token, athlete_token):
        # First save a reading as the athlete so latest is non-null
        ah = {"Authorization": f"Bearer {athlete_token}"}
        session.post(f"{BASE_URL}/api/athlete-portal/me/readiness", headers=ah,
                     json={"sleep": 70, "muscle_soreness": 25, "stress": 25, "motivation": 80})
        me = session.get(f"{BASE_URL}/api/athlete-portal/auth/me", headers=ah).json()
        ath_id = me["id"]
        h = {"Authorization": f"Bearer {coach_token}"}
        r = session.get(f"{BASE_URL}/api/athlete-portal/coach/readiness/{ath_id}", headers=h)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "latest" in data and "readiness" in data
        assert data["latest"] is not None
        assert "overall" in data["latest"]

    def test_coach_account_status(self, session, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = session.get(f"{BASE_URL}/api/athlete-portal/athletes/{ATHLETE_ID_INVITE}/account",
                        headers=h)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "has_account" in data and "portal_active" in data


# ============== AUTO-REGISTER FLOW ==============
class TestAutoRegister:
    def test_register_with_invite_code(self, session, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        # Generate code
        r = session.post(f"{BASE_URL}/api/athlete-portal/invite-code", headers=h,
                         json={"plan_id": PLAN_ID, "athlete_name": "TEST_register_user"})
        assert r.status_code == 200
        code = r.json()["code"]
        # Register a fresh athlete
        import uuid as _uuid
        unique_email = f"test_reg_{_uuid.uuid4().hex[:8]}@example.com"
        r2 = session.post(f"{BASE_URL}/api/athlete-portal/auth/register",
                          json={"code": code, "email": unique_email,
                                "password": "newpass123", "name": "TEST_register_user"})
        assert r2.status_code == 200, r2.text
        data = r2.json()
        assert "token" in data
        assert data["athlete"]["email"] == unique_email
        # Re-using the same code should fail
        r3 = session.post(f"{BASE_URL}/api/athlete-portal/auth/register",
                          json={"code": code, "email": "other@example.com",
                                "password": "abcdef", "name": "Another"})
        assert r3.status_code == 400

    def test_register_invalid_code(self, session):
        r = session.post(f"{BASE_URL}/api/athlete-portal/auth/register",
                         json={"code": "DEADBEEF", "email": "z@z.com",
                               "password": "abcdef", "name": "Z"})
        assert r.status_code == 400


# ============== DEMO SEED (REGRESSION) ==============
class TestDemoSeed:
    def test_seed_demo_data(self, session, coach_token):
        h = {"Authorization": f"Bearer {coach_token}"}
        r = session.post(f"{BASE_URL}/api/admin/seed-demo-data", headers=h, json={})
        assert r.status_code == 200, r.text
        data = r.json()
        # Accept varying shapes - just ensure non-error response
        assert isinstance(data, dict)
