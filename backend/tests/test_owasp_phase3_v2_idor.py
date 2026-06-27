"""
OWASP Phase 3 – IDOR closure on periodization V2 (/api/v2/*)

Setup:
  - Coach A: test@train.com / test123456 (existing).
  - Coach B: registered fresh per run via POST /api/auth/register (disposable email).

V2 chain setup for Coach A:
  - POST /api/v2/planes (create plan)
  - Insert one macrociclo directly into MongoDB (no public POST endpoint exists for macros)
  - POST /api/v2/macrociclos/{macro_id}/mesociclos
  - POST /api/v2/mesociclos/{meso_id}/microciclos -> picks first generated microciclo
  - POST /api/v2/microciclos/{micro_id}/sesiones
  - POST /api/v2/sesiones/{sesion_id}/ejercicios

Tests:
  - TestV2OwnerRegression (Coach A is owner -> 200 on every read/write).
  - TestV2IdorBlocked (Coach B token on Coach A's IDs -> 404 on every endpoint).
  - TestPrevSecurityRegression (login+refresh, list endpoints 200, sessions iter_87 IDOR still 404, security headers).
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

# ---- Config ----
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to reading frontend/.env directly (parent process may not export it)
    try:
        with open("/app/frontend/.env") as fh:
            for line in fh:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not set"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "train_db"

COACH_A_EMAIL = "test@train.com"
COACH_A_PASSWORD = "test123456"


def _gen_id() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---- Shared session helpers ----
def _login(session: requests.Session, email: str, password: str):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    return r


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---- Fixtures ----
@pytest.fixture(scope="session")
def http():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def mongo():
    client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    db = client[DB_NAME]
    yield db
    client.close()


@pytest.fixture(scope="session")
def coach_a_token(http, mongo):
    # Clear any login-lockout state before login attempts
    try:
        mongo.login_attempts.delete_many({"email": COACH_A_EMAIL})
    except Exception:
        pass
    r = _login(http, COACH_A_EMAIL, COACH_A_PASSWORD)
    assert r.status_code == 200, f"Coach A login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    assert "token" in data and isinstance(data["token"], str)
    assert "refresh_token" in data and isinstance(data["refresh_token"], str)
    return data["token"]


@pytest.fixture(scope="session")
def coach_a_id(coach_a_token, http):
    r = http.get(f"{BASE_URL}/api/auth/me", headers=_bearer(coach_a_token), timeout=15)
    assert r.status_code == 200, f"/auth/me failed: {r.status_code} {r.text[:200]}"
    user = r.json()
    assert user.get("email") == COACH_A_EMAIL
    assert "id" in user
    return user["id"]


@pytest.fixture(scope="session")
def coach_b_token(http):
    email = f"coachb_{uuid.uuid4().hex[:10]}@example.com"
    payload = {"email": email, "password": "CoachB-Pass!2026", "name": "Coach B IDOR"}
    r = http.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=20)
    assert r.status_code in (200, 201), f"Coach B register failed: {r.status_code} {r.text[:200]}"
    # Login
    lr = _login(http, email, "CoachB-Pass!2026")
    assert lr.status_code == 200, f"Coach B login failed: {lr.status_code} {lr.text[:200]}"
    return lr.json()["token"]


@pytest.fixture(scope="session")
def v2_chain(http, mongo, coach_a_token, coach_a_id):
    """
    Build a full V2 chain for Coach A:
      plan -> macro (direct mongo insert, no public POST) -> meso -> micro -> sesion -> ejercicio
    Returns dict with all created ids.
    """
    tok = coach_a_token
    h = _bearer(tok)

    # 1) plan via API
    plan_payload = {
        "nombre": f"TEST_IDOR_Plan_{uuid.uuid4().hex[:6]}",
        "modelo_periodizacion": "ATR",
        "deporte": "futbol",
        "duracion_semanas": 4,
        "fecha_inicio": _now_iso(),
        "fecha_competicion": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    r = http.post(f"{BASE_URL}/api/v2/planes", headers=h, json=plan_payload, timeout=20)
    assert r.status_code == 200, f"create plan: {r.status_code} {r.text[:200]}"
    plan = r.json()
    plan_id = plan["id"]
    assert plan.get("coach_id") == coach_a_id

    # 2) macrociclo: insert directly (no public POST endpoint for /api/v2/macrociclos)
    macro_id = _gen_id()
    mongo.macrociclos_v2.insert_one({
        "id": macro_id,
        "plan_id": plan_id,
        "nombre": "TEST_IDOR_Macro",
        "tipo": "acumulacion",
        "orden": 0,
        "duracion_semanas": 4,
        "fecha_inicio": _now_iso(),
        "fecha_fin": (datetime.now(timezone.utc) + timedelta(days=28)).isoformat(),
        "vol_objetivo": 60, "int_objetivo": 70, "den_objetivo": 50,
        "vol_calculado": 0, "int_calculado": 0, "carga_total": 0, "ACWR": 0, "progreso_porcentaje": 0
    })

    # 3) mesociclo via API
    meso_payload = {
        "macrociclo_id": macro_id,
        "nombre": "TEST_IDOR_Meso",
        "tipo": "acumulacion",
        "duracion_semanas": 4,
        "semana_descarga": 4,
        "reduccion_descarga": 40,
        "vol_objetivo": 60, "int_objetivo": 70, "den_objetivo": 50
    }
    r = http.post(f"{BASE_URL}/api/v2/macrociclos/{macro_id}/mesociclos", headers=h, json=meso_payload, timeout=20)
    assert r.status_code == 200, f"add meso: {r.status_code} {r.text[:200]}"
    meso_id = r.json()["id"]

    # 4) microciclos via API (generated automatically)
    r = http.post(f"{BASE_URL}/api/v2/mesociclos/{meso_id}/microciclos", headers=h, timeout=20)
    assert r.status_code == 200, f"gen micros: {r.status_code} {r.text[:200]}"
    body = r.json()
    micros = body if isinstance(body, list) else body.get("microciclos") or body.get("micros") or []
    if not micros:
        # fallback: query directly
        cur = mongo.microciclos_v2.find({"mesociclo_id": meso_id})
        micros = list(cur)
        for m in micros:
            m.pop("_id", None)
    assert micros, f"no microciclos generated: {body}"
    micro_id = micros[0]["id"]

    # 5) sesion via API
    sesion_payload = {
        "microciclo_id": micro_id,
        "nombre": "TEST_IDOR_Sesion",
        "fecha": _now_iso(),
        "orden_dia": 1,
        "duracion_minutos": 60,
        "RPE_sesion": 6,
        "fc_media": 140,
        "fc_max_alcanzada": 175,
        "notas": "idor test",
        "completada": False
    }
    r = http.post(f"{BASE_URL}/api/v2/microciclos/{micro_id}/sesiones", headers=h, json=sesion_payload, timeout=20)
    assert r.status_code == 200, f"add sesion: {r.status_code} {r.text[:200]}"
    sesion_id = r.json()["id"]

    # 6) ejercicio via API
    ej_payload = {
        "sesion_id": sesion_id,
        "ejercicio_base_id": None,
        "nombre": "TEST_IDOR_Ej",
        "capacidad_tipo": "fuerza_maxima",
        "series": 3, "repeticiones": 5, "peso_kg": 80,
        "porcentaje_1RM": 80, "RPE_ejercicio": 7,
        "descanso_seg": 120
    }
    r = http.post(f"{BASE_URL}/api/v2/sesiones/{sesion_id}/ejercicios", headers=h, json=ej_payload, timeout=20)
    assert r.status_code == 200, f"add ejercicio: {r.status_code} {r.text[:200]}"
    ej_id = r.json()["id"]

    ids = {
        "plan_id": plan_id, "macro_id": macro_id, "meso_id": meso_id,
        "micro_id": micro_id, "sesion_id": sesion_id, "ej_id": ej_id
    }
    yield ids

    # Teardown — remove TEST_ data created here
    try:
        mongo.ejercicios_sesion.delete_many({"sesion_id": sesion_id})
        mongo.sesiones_v2.delete_many({"microciclo_id": micro_id})
        mongo.microciclos_v2.delete_many({"mesociclo_id": meso_id})
        mongo.mesociclos_v2.delete_many({"macrociclo_id": macro_id})
        mongo.macrociclos_v2.delete_many({"id": macro_id})
        mongo.planes_entrenamiento.delete_many({"id": plan_id})
        mongo.historico_cargas.delete_many({"fuente": sesion_id})
    except Exception:
        pass


# ============ TESTS: dueño regression (Coach A) ============
class TestV2OwnerRegression:
    """Owner (Coach A) must keep working: every endpoint returns 200."""

    def test_get_macrociclo_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/macrociclos/{v2_chain['macro_id']}", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("id") == v2_chain["macro_id"]

    def test_put_macrociclo_owner_200(self, http, coach_a_token, v2_chain):
        r = http.put(f"{BASE_URL}/api/v2/macrociclos/{v2_chain['macro_id']}",
                     headers=_bearer(coach_a_token),
                     json={"nombre": "TEST_IDOR_Macro_renamed"}, timeout=15)
        assert r.status_code == 200, r.text[:200]
        assert r.json().get("updated") is True

    def test_get_mesociclo_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/mesociclos/{v2_chain['meso_id']}", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("id") == v2_chain["meso_id"]

    def test_put_mesociclo_owner_200(self, http, coach_a_token, v2_chain):
        r = http.put(f"{BASE_URL}/api/v2/mesociclos/{v2_chain['meso_id']}",
                     headers=_bearer(coach_a_token),
                     json={"nombre": "TEST_IDOR_Meso_renamed"}, timeout=15)
        assert r.status_code == 200, r.text[:200]
        assert r.json().get("updated") is True

    def test_get_microciclo_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/microciclos/{v2_chain['micro_id']}", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200
        assert r.json().get("id") == v2_chain["micro_id"]

    def test_get_sesion_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/sesiones/{v2_chain['sesion_id']}", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("id") == v2_chain["sesion_id"]
        assert "ejercicios" in data

    def test_put_sesion_owner_200(self, http, coach_a_token, v2_chain):
        r = http.put(f"{BASE_URL}/api/v2/sesiones/{v2_chain['sesion_id']}",
                     headers=_bearer(coach_a_token),
                     json={"nombre": "TEST_IDOR_Sesion_renamed", "notas": "owner-edit"}, timeout=15)
        assert r.status_code == 200, r.text[:200]
        assert r.json().get("updated") is True

    def test_get_plan_completo_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/planes/{v2_chain['plan_id']}/completo",
                     headers=_bearer(coach_a_token), timeout=20)
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert "plan" in body and body["plan"]["id"] == v2_chain["plan_id"]
        macro_ids = [m["id"] for m in body.get("macrociclos", [])]
        assert v2_chain["macro_id"] in macro_ids

    def test_get_plan_metricas_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/planes/{v2_chain['plan_id']}/metricas",
                     headers=_bearer(coach_a_token), timeout=20)
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert "resumen" in body and "niveles" in body

    def test_get_plan_historico_owner_200(self, http, coach_a_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/planes/{v2_chain['plan_id']}/historico",
                     headers=_bearer(coach_a_token), timeout=20)
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert "cargas" in body


# ============ TESTS: Coach B IDOR -> 404 ============
class TestV2IdorBlocked:
    """Coach B with valid token tries to access Coach A's resources -> 404."""

    def test_get_macrociclo_other_404(self, http, coach_b_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/macrociclos/{v2_chain['macro_id']}", headers=_bearer(coach_b_token), timeout=15)
        assert r.status_code == 404, f"expected 404 got {r.status_code} {r.text[:200]}"

    def test_put_macrociclo_other_404(self, http, coach_b_token, v2_chain):
        r = http.put(f"{BASE_URL}/api/v2/macrociclos/{v2_chain['macro_id']}",
                     headers=_bearer(coach_b_token), json={"nombre": "HACK"}, timeout=15)
        assert r.status_code == 404, f"expected 404 got {r.status_code} {r.text[:200]}"

    def test_get_mesociclo_other_404(self, http, coach_b_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/mesociclos/{v2_chain['meso_id']}", headers=_bearer(coach_b_token), timeout=15)
        assert r.status_code == 404

    def test_put_mesociclo_other_404(self, http, coach_b_token, v2_chain):
        r = http.put(f"{BASE_URL}/api/v2/mesociclos/{v2_chain['meso_id']}",
                     headers=_bearer(coach_b_token), json={"nombre": "HACK"}, timeout=15)
        assert r.status_code == 404

    def test_get_microciclo_other_404(self, http, coach_b_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/microciclos/{v2_chain['micro_id']}", headers=_bearer(coach_b_token), timeout=15)
        assert r.status_code == 404

    def test_get_sesion_other_404(self, http, coach_b_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/sesiones/{v2_chain['sesion_id']}", headers=_bearer(coach_b_token), timeout=15)
        assert r.status_code == 404

    def test_put_sesion_other_404(self, http, coach_b_token, v2_chain):
        r = http.put(f"{BASE_URL}/api/v2/sesiones/{v2_chain['sesion_id']}",
                     headers=_bearer(coach_b_token), json={"nombre": "HACK"}, timeout=15)
        assert r.status_code == 404

    def test_post_meso_under_other_macro_404(self, http, coach_b_token, v2_chain):
        r = http.post(f"{BASE_URL}/api/v2/macrociclos/{v2_chain['macro_id']}/mesociclos",
                      headers=_bearer(coach_b_token),
                      json={"macrociclo_id": v2_chain["macro_id"],
                            "nombre": "HACK_meso", "tipo": "acumulacion",
                            "duracion_semanas": 4, "semana_descarga": 4,
                            "reduccion_descarga": 40,
                            "vol_objetivo": 50, "int_objetivo": 50, "den_objetivo": 50}, timeout=15)
        assert r.status_code == 404

    def test_post_ejercicio_under_other_sesion_404(self, http, coach_b_token, v2_chain):
        r = http.post(f"{BASE_URL}/api/v2/sesiones/{v2_chain['sesion_id']}/ejercicios",
                      headers=_bearer(coach_b_token),
                      json={"sesion_id": v2_chain["sesion_id"],
                            "ejercicio_base_id": None, "nombre": "HACK", "capacidad_tipo": "fuerza_maxima",
                            "series": 1, "repeticiones": 1, "peso_kg": 1,
                            "porcentaje_1RM": 0, "RPE_ejercicio": 0, "descanso_seg": 60}, timeout=15)
        assert r.status_code == 404

    def test_get_plan_completo_other_404(self, http, coach_b_token, v2_chain):
        # NOTE: Coach B has zero V2 plans, so the last-resort fallback in get_plan_completo
        # should NOT pick up Coach A's plan. Expect 404.
        r = http.get(f"{BASE_URL}/api/v2/planes/{v2_chain['plan_id']}/completo",
                     headers=_bearer(coach_b_token), timeout=20)
        assert r.status_code == 404, f"expected 404 got {r.status_code} {r.text[:300]}"

    def test_get_plan_historico_other_404(self, http, coach_b_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/planes/{v2_chain['plan_id']}/historico",
                     headers=_bearer(coach_b_token), timeout=20)
        assert r.status_code == 404

    def test_get_plan_metricas_other_404(self, http, coach_b_token, v2_chain):
        r = http.get(f"{BASE_URL}/api/v2/planes/{v2_chain['plan_id']}/metricas",
                     headers=_bearer(coach_b_token), timeout=20)
        assert r.status_code == 404


# ============ TESTS: previous security regression ============
class TestPrevSecurityRegression:
    """Previous security guarantees still hold."""

    def test_login_returns_token_and_refresh(self, http, mongo):
        try:
            mongo.login_attempts.delete_many({"email": COACH_A_EMAIL})
        except Exception:
            pass
        r = _login(http, COACH_A_EMAIL, COACH_A_PASSWORD)
        assert r.status_code == 200
        data = r.json()
        assert "token" in data and "refresh_token" in data
        assert isinstance(data["token"], str) and len(data["token"]) > 10

    def test_training_plans_list_200(self, http, coach_a_token):
        r = http.get(f"{BASE_URL}/api/training-plans", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200

    def test_athletes_list_200(self, http, coach_a_token):
        r = http.get(f"{BASE_URL}/api/athletes", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200

    def test_plan_templates_levels_200(self, http, coach_a_token):
        r = http.get(f"{BASE_URL}/api/plan-templates/levels", headers=_bearer(coach_a_token), timeout=15)
        assert r.status_code == 200

    def test_security_headers_present(self, http):
        r = http.get(f"{BASE_URL}/api/plan-templates/levels", timeout=15)
        # Even on 401, the global headers middleware should attach them
        hdr = {k.lower(): v for k, v in r.headers.items()}
        assert hdr.get("x-frame-options") == "DENY"
        assert hdr.get("x-content-type-options") == "nosniff"
        assert "content-security-policy" in hdr
        assert "referrer-policy" in hdr
        assert "strict-transport-security" in hdr

    def test_sessions_iter87_idor_still_404(self, http, coach_a_token, coach_b_token, mongo):
        """Phase 2 IDOR on v1 sessions still blocked."""
        # Create a v1 session for Coach A directly via Mongo (cheap),
        # then verify Coach B can't complete it.
        coach_a_user = mongo.users.find_one({"email": COACH_A_EMAIL}, {"_id": 0})
        assert coach_a_user, "Coach A user not found in DB"
        macro_id = _gen_id()
        meso_id = _gen_id()
        micro_id = _gen_id()
        session_id = _gen_id()
        mongo.macrocycles.insert_one({"id": macro_id, "coach_id": coach_a_user["id"], "name": "TEST_v1_macro"})
        mongo.mesocycles.insert_one({"id": meso_id, "macrocycle_id": macro_id, "name": "TEST_v1_meso"})
        mongo.microcycles.insert_one({"id": micro_id, "mesocycle_id": meso_id, "name": "TEST_v1_micro"})
        mongo.sessions.insert_one({
            "id": session_id, "microcycle_id": micro_id, "name": "TEST_v1_sess",
            "date": _now_iso(), "completed": False, "exercises": []
        })
        try:
            r = http.put(f"{BASE_URL}/api/sessions/{session_id}/complete",
                         headers=_bearer(coach_b_token), timeout=15)
            assert r.status_code == 404, f"expected 404 got {r.status_code} {r.text[:200]}"
        finally:
            mongo.sessions.delete_many({"id": session_id})
            mongo.microcycles.delete_many({"id": micro_id})
            mongo.mesocycles.delete_many({"id": meso_id})
            mongo.macrocycles.delete_many({"id": macro_id})
