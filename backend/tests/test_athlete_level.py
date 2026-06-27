"""
Tests for the new Athlete Level (athlete_level) feature:
- GET /api/plan-templates/levels (5 niveles)
- GET /api/plan-templates/atr  base & con ?level=
- POST/PUT /api/training-plans persiste athlete_level
- POST /api/generate-structure acepta los 5 niveles
"""
import os
import pytest
import requests
from pathlib import Path


def _load_backend_url():
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    return os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")


BASE_URL = _load_backend_url()
assert BASE_URL, "REACT_APP_BACKEND_URL not found"
EMAIL = "test@train.com"
PASSWORD = "test123456"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# ---------- /levels ----------
class TestLevelsEndpoint:
    def test_levels_returns_five(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/levels", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "levels" in data
        levels = data["levels"]
        keys = [lv["level"] for lv in levels]
        assert keys == ["principiante", "amateur", "semiprofesional", "profesional", "elite"], keys
        for lv in levels:
            for k in ("name", "order", "volume_factor", "intensity_factor", "max_load", "max_volume", "max_intensity"):
                assert k in lv, f"missing {k} in {lv}"

    def test_principiante_factors(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/levels", timeout=20)
        principiante = next(lv for lv in r.json()["levels"] if lv["level"] == "principiante")
        assert principiante["volume_factor"] == 0.70
        assert principiante["intensity_factor"] == 0.70
        assert principiante["max_load"] == 65

    def test_elite_factors(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/levels", timeout=20)
        elite = next(lv for lv in r.json()["levels"] if lv["level"] == "elite")
        assert elite["volume_factor"] == 1.05
        assert elite["intensity_factor"] == 1.08


# ---------- /atr base & con level ----------
class TestATRTemplate:
    def test_atr_base_no_level(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/atr", timeout=20)
        assert r.status_code == 200, r.text
        tpl = r.json()
        assert tpl["model"] == "atr"
        prep = tpl["phases"]["preparatory_general"]
        # Valores base esperados: vol 85, int 60
        assert prep["volumen"] == 85, prep
        assert prep["intensidad"] == 60, prep
        # No debe tener campos de nivel
        assert "level" not in tpl
        assert "caps" not in tpl

    def test_atr_principiante_apply_factor_and_clamp(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/atr", params={"level": "principiante"}, timeout=20)
        assert r.status_code == 200, r.text
        tpl = r.json()
        assert tpl.get("level") == "principiante"
        assert tpl.get("level_name") == "Principiante"
        assert tpl.get("caps") == {"max_load": 65, "max_volume": 70, "max_intensity": 75}
        prep = tpl["phases"]["preparatory_general"]
        # 85*0.7=59.4999.. round-down→59; 60*0.7=42; carga clamp <=65
        assert prep["volumen"] in (59, 60), prep
        assert prep["intensidad"] == 42, prep
        assert prep["carga"] <= 65, prep

    def test_atr_elite_factors(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/atr", params={"level": "elite"}, timeout=20)
        assert r.status_code == 200, r.text
        tpl = r.json()
        assert tpl["level"] == "elite"
        prep = tpl["phases"]["preparatory_general"]
        # 85*1.05=89.25≈89, 60*1.08=64.8≈65
        assert prep["volumen"] == 89, prep
        assert prep["intensidad"] == 65, prep

    def test_atr_alias_intermediate_normalizes_to_semiprofesional(self, auth):
        r = auth.get(f"{BASE_URL}/api/plan-templates/atr", params={"level": "intermediate"}, timeout=20)
        assert r.status_code == 200, r.text
        tpl = r.json()
        assert tpl.get("level") == "semiprofesional", tpl
        assert tpl.get("caps", {}).get("max_load") == 88


# ---------- Persistence of athlete_level on training plan ----------
class TestPlanAthleteLevel:
    def _payload(self, level):
        return {
            "name": f"TEST_AthleteLevel_{level}",
            "sport": "futbol",
            "model": "atr",
            "athlete_level": level,
            "duration_type": "semester",
            "total_weeks": 8,
            "duration_weeks": 8,
            "start_date": "2026-01-01",
            "sessions_per_week": 3,
            "main_objective": "TEST",
        }

    @pytest.fixture(scope="class")
    def created_plan_id(self, auth):
        pl = {"name": "TEST_AthleteLevel_setup", "sport": "futbol", "model": "atr",
              "athlete_level": "profesional", "duration_type": "semester",
              "total_weeks": 8, "start_date": "2026-01-01", "sessions_per_week": 3,
              "main_objective": "TEST"}
        r = auth.post(f"{BASE_URL}/api/training-plans", json=pl, timeout=30)
        assert r.status_code in (200, 201), r.text
        plan = r.json()
        plan_id = plan.get("id") or plan.get("plan", {}).get("id")
        assert plan_id, plan
        yield plan_id
        try:
            auth.delete(f"{BASE_URL}/api/training-plans/{plan_id}", timeout=15)
        except Exception:
            pass

    def test_create_persists_level(self, auth):
        payload = self._payload("elite")
        r = auth.post(f"{BASE_URL}/api/training-plans", json=payload, timeout=30)
        assert r.status_code in (200, 201), r.text
        body = r.json()
        plan = body if "athlete_level" in body else body.get("plan", body)
        assert plan.get("athlete_level") == "elite", plan
        plan_id = plan.get("id")
        # GET roundtrip
        g = auth.get(f"{BASE_URL}/api/training-plans/{plan_id}", timeout=15)
        assert g.status_code == 200, g.text
        fetched = g.json()
        fetched = fetched if "athlete_level" in fetched else fetched.get("plan", fetched)
        assert fetched.get("athlete_level") == "elite", fetched
        # cleanup
        auth.delete(f"{BASE_URL}/api/training-plans/{plan_id}", timeout=15)

    def test_update_changes_level(self, auth):
        # create with principiante
        payload = self._payload("principiante")
        r = auth.post(f"{BASE_URL}/api/training-plans", json=payload, timeout=30)
        assert r.status_code in (200, 201)
        body = r.json()
        plan = body if "athlete_level" in body else body.get("plan", body)
        plan_id = plan.get("id")
        # update to semiprofesional (PUT requires full body)
        update_payload = {**payload, "athlete_level": "semiprofesional"}
        u = auth.put(f"{BASE_URL}/api/training-plans/{plan_id}", json=update_payload, timeout=20)
        assert u.status_code in (200, 204), u.text
        g = auth.get(f"{BASE_URL}/api/training-plans/{plan_id}", timeout=15)
        fetched = g.json()
        fetched = fetched if "athlete_level" in fetched else fetched.get("plan", fetched)
        assert fetched.get("athlete_level") == "semiprofesional", fetched
        auth.delete(f"{BASE_URL}/api/training-plans/{plan_id}", timeout=15)


# ---------- generate-structure ----------
class TestGenerateStructureLevels:
    @pytest.mark.parametrize("level", ["principiante", "amateur", "semiprofesional", "profesional", "elite"])
    def test_generate_structure_with_level(self, auth, level):
        payload = {
            "sport": "futbol",
            "model": "atr",
            "athlete_level": level,
            "total_weeks": 8,
            "start_date": "2026-01-01",
            "sessions_per_week": 3,
        }
        r = auth.post(f"{BASE_URL}/api/generate-structure", json=payload, timeout=30)
        assert r.status_code == 200, f"level={level} -> {r.status_code} {r.text[:300]}"
        data = r.json()
        assert "macrocycles" in data, data
