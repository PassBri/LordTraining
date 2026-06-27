"""
Fase 4 backend tests:
- Coach metrics (ACWR, adherencia, low readiness)
- Export/Import data migration
- Regression: GET /api/athletes (no debe 500)
- Regression: athlete portal endpoints siguen funcionando
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
COACH_EMAIL = "juegolaureado@gmail.com"
COACH_PASSWORD = "LordTraining2026!"
ATHLETE_EMAIL = "juan.atleta@test.com"
ATHLETE_PASSWORD = "8c6nkWqG"
PLAN_ID = "25b9abc7-b264-4809-a998-b688f660a6ca"


@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": COACH_EMAIL, "password": COACH_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Coach login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def athlete_token():
    r = requests.post(
        f"{BASE_URL}/api/athlete-portal/auth/login",
        json={"email": ATHLETE_EMAIL, "password": ATHLETE_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"Athlete login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def coach_h(coach_token):
    return {"Authorization": f"Bearer {coach_token}"}


@pytest.fixture(scope="module")
def athlete_h(athlete_token):
    return {"Authorization": f"Bearer {athlete_token}"}


# -------- Coach metrics --------
class TestCoachMetrics:
    def test_metrics_with_plan(self, coach_h):
        r = requests.get(f"{BASE_URL}/api/coach/metrics", params={"plan_id": PLAN_ID}, headers=coach_h, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["acwr_series", "acwr_current", "acwr_zone", "adherence_series", "adherence_overall", "low_readiness_athletes"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["acwr_series"], list)
        assert isinstance(d["adherence_series"], list)
        assert isinstance(d["low_readiness_athletes"], list)
        assert d["acwr_zone"] in ["sin_datos", "bajo", "optimo", "precaucion", "riesgo"]
        # Según contexto: acwr_current ~ 0.98, zone optimo, adherence ~86
        assert d["acwr_current"] is not None, "acwr_current should be computed with seeded data"
        assert d["acwr_zone"] != "sin_datos", "should have a zone for seeded plan"
        assert d["adherence_overall"] >= 0 and d["adherence_overall"] <= 100
        # acwr_series shape
        if d["acwr_series"]:
            row = d["acwr_series"][0]
            for k in ["week", "acwr", "acute", "chronic"]:
                assert k in row

    def test_metrics_without_plan(self, coach_h):
        r = requests.get(f"{BASE_URL}/api/coach/metrics", headers=coach_h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["acwr_series"] == []
        assert d["adherence_series"] == []
        assert d["acwr_zone"] == "sin_datos"
        assert "low_readiness_athletes" in d

    def test_metrics_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/coach/metrics", timeout=15)
        assert r.status_code in (401, 403)


# -------- Export / Import --------
class TestExportImport:
    def test_export(self, coach_h):
        r = requests.get(f"{BASE_URL}/api/admin/export-data", headers=coach_h, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["export_version"] == 1
        assert "counts" in d and "data" in d
        # debe contener las colecciones esperadas
        for k in ["training_plans", "planes_entrenamiento", "macrociclos_v2", "mesociclos_v2",
                  "microciclos_v2", "sesiones_v2", "plan_competitions", "athletes"]:
            assert k in d["counts"], f"missing count {k}"
            assert k in d["data"]
        # athletes export NO debe incluir portal_password
        for a in d["data"]["athletes"]:
            assert "portal_password" not in a
        # debe contener el plan v1 25b9abc7
        plan_ids = [p["id"] for p in d["data"]["training_plans"]]
        assert PLAN_ID in plan_ids, f"Seeded plan {PLAN_ID} missing in export"

    def test_import_idempotent(self, coach_h):
        # 1) export
        r = requests.get(f"{BASE_URL}/api/admin/export-data", headers=coach_h, timeout=60)
        assert r.status_code == 200
        exp = r.json()
        # 2) re-import: debe ser idempotente (todo ya existe -> inserted=0, skipped>0)
        payload = {"export_version": exp["export_version"], "data": exp["data"]}
        r2 = requests.post(f"{BASE_URL}/api/admin/import-data", headers=coach_h, json=payload, timeout=120)
        assert r2.status_code == 200, r2.text
        imp = r2.json()
        assert imp["status"] == "ok"
        # Identify which collections were not idempotent
        non_idempotent = {k: v for k, v in imp["imported"].items() if v["inserted"] > 0}
        # Suma de inserted debe ser 0 y skipped > 0
        total_inserted = sum(v["inserted"] for v in imp["imported"].values())
        total_skipped = sum(v["skipped"] for v in imp["imported"].values())
        assert total_inserted == 0, f"Re-import not idempotent: {non_idempotent}"
        assert total_skipped > 0, "Expected skipped>0 since all docs already exist"

    def test_export_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/export-data", timeout=15)
        assert r.status_code in (401, 403)


# -------- Regression --------
class TestRegression:
    def test_athletes_list_no_500(self, coach_h):
        r = requests.get(f"{BASE_URL}/api/athletes", headers=coach_h, timeout=30)
        assert r.status_code == 200, f"Expected 200 but got {r.status_code}: {r.text[:300]}"
        assert isinstance(r.json(), list)

    def test_athlete_portal_me(self, athlete_h):
        r = requests.get(f"{BASE_URL}/api/athlete-portal/auth/me", headers=athlete_h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("email") == ATHLETE_EMAIL

    def test_athlete_portal_plan(self, athlete_h):
        r = requests.get(f"{BASE_URL}/api/athlete-portal/me/plan", headers=athlete_h, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d, dict)

    def test_athlete_portal_readiness_get(self, athlete_h):
        r = requests.get(f"{BASE_URL}/api/athlete-portal/me/readiness", headers=athlete_h, timeout=30)
        assert r.status_code == 200, r.text


# -------- Demo seed buttons backend behind FAB --------
class TestDemoEndpoints:
    def test_seed_demo_data_endpoint_exists(self, coach_h):
        # Solo verificamos que el endpoint responda (no ejecutamos clear). Probamos seed con el plan ya existente -> idempotente.
        r = requests.post(
            f"{BASE_URL}/api/admin/seed-demo-data",
            headers=coach_h,
            json={"plan_id": PLAN_ID},
            timeout=120,
        )
        assert r.status_code in (200, 201), f"seed-demo-data failed: {r.status_code} {r.text[:300]}"
