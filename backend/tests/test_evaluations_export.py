"""
Tests para /api/plan-data/evaluations-export (iTRAIN) v3 — Multi-control.

Cubre:
- Route ordering: /templates/{type}, /list/{plan}/{type}, /timeline/{plan},
  /by-id/{id}, /shared/{id} deben resolver antes del catch-all /{plan}/{type}.
- Multi-control: POST sin id crea nuevo; POST con id actualiza; /list ordenado
  por date desc; DELETE limpia shares; /by-id/pdf y /by-id/share.
- Shared público (sin auth) HTTP 200.
- Catch-all legacy sigue funcionando.
"""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

EMAIL = "test@train.com"
PASSWORD = "test123456"
PLAN_ID = "0cd4acaa-7e8e-463d-b4ac-54c3a47a766b"

EVAL_TYPES = [
    "medical", "physical", "technical", "tactical",
    "psychological", "theoretical", "anthropometric", "biomechanical",
]


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}",
                      "Content-Type": "application/json"})
    return s


# ---------- Tipos inválidos ----------
class TestInvalidType:
    def test_get_catchall_invalid(self, client):
        r = client.get(f"{API}/plan-data/evaluations-export/{PLAN_ID}/foo", timeout=20)
        assert r.status_code == 400

    def test_templates_invalid(self, client):
        r = client.get(f"{API}/plan-data/evaluations-export/templates/foo", timeout=20)
        assert r.status_code == 400

    def test_list_invalid(self, client):
        r = client.get(f"{API}/plan-data/evaluations-export/list/{PLAN_ID}/foo", timeout=20)
        assert r.status_code == 400

    def test_post_invalid(self, client):
        r = client.post(f"{API}/plan-data/evaluations-export",
                        json={"plan_id": PLAN_ID, "evaluation_type": "foo", "aspects": []},
                        timeout=20)
        assert r.status_code == 400


# ---------- Route ordering: /templates/{type} NO es capturada por catch-all ----------
class TestRouteOrderingTemplates:
    @pytest.mark.parametrize("et", EVAL_TYPES)
    def test_templates_returns_templates_shape(self, client, et):
        """Debe retornar {templates, system_default}, NO {aspects} del catch-all."""
        r = client.get(f"{API}/plan-data/evaluations-export/templates/{et}", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        # Shape específico del endpoint /templates, NO del catch-all:
        assert "templates" in data and isinstance(data["templates"], list), \
            f"{et}: Got catch-all shape instead of templates shape: {data.keys()}"
        assert "aspects" not in data, f"{et}: catch-all collision detected"
        sd = data.get("system_default")
        assert sd is not None
        assert sd.get("is_system") is True
        assert len(sd.get("aspects") or []) >= 5


# ---------- Catch-all legacy GET /{plan}/{type} ----------
class TestCatchAllLegacy:
    @pytest.mark.parametrize("et", EVAL_TYPES)
    def test_catchall_returns_aspects_shape(self, client, et):
        fresh = f"NOPLAN_{et}_ord"
        r = client.get(f"{API}/plan-data/evaluations-export/{fresh}/{et}", timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "aspects" in data
        # Catch-all returns either system default (>=5) or user's default template.
        assert len(data["aspects"]) >= 1


# ---------- Multi-control: POST sin id crea, POST con id actualiza ----------
class TestMultiControl:
    """Usa un plan_id de testing distinto para no pisar otros tests."""
    TEST_PLAN = "TEST_MC_PLAN_xyz"

    @pytest.fixture(autouse=True, scope="class")
    def cleanup(self, token):
        yield
        # Teardown: borrar cualquier control residual vía /list + /by-id DELETE
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {token}"})
        try:
            r = s.get(f"{API}/plan-data/evaluations-export/list/{self.TEST_PLAN}/medical", timeout=15)
            if r.status_code == 200:
                for c in r.json().get("controls", []):
                    s.delete(f"{API}/plan-data/evaluations-export/by-id/{c['id']}", timeout=10)
        except Exception:
            pass

    def test_post_without_id_creates_new(self, client):
        payload = {
            "plan_id": self.TEST_PLAN,
            "evaluation_type": "medical",
            "date": "2024-02-01",
            "title": "TEST Control #1",
            "aspects": [{"label": "TEST FC", "category": "Vitales",
                         "scale_min": 40, "scale_max": 100, "scale_unit": "lpm",
                         "target": 60, "value": 65}],
        }
        r1 = client.post(f"{API}/plan-data/evaluations-export", json=payload, timeout=30)
        assert r1.status_code == 200, r1.text
        id1 = r1.json().get("id")
        assert id1

        # Second POST without id -> distinct new control
        payload["date"] = "2024-02-15"
        payload["title"] = "TEST Control #2"
        r2 = client.post(f"{API}/plan-data/evaluations-export", json=payload, timeout=30)
        assert r2.status_code == 200
        id2 = r2.json().get("id")
        assert id2 and id2 != id1, "POST without id should create distinct control"

        # Save ids for next tests via class attribute
        TestMultiControl._id1 = id1
        TestMultiControl._id2 = id2

    def test_post_with_id_updates(self, client):
        payload = {
            "id": TestMultiControl._id1,
            "plan_id": self.TEST_PLAN,
            "evaluation_type": "medical",
            "date": "2024-02-01",
            "title": "TEST Control #1 UPDATED",
            "aspects": [{"label": "TEST FC v2", "category": "Vitales",
                         "scale_min": 40, "scale_max": 100, "scale_unit": "lpm",
                         "target": 60, "value": 70}],
        }
        r = client.post(f"{API}/plan-data/evaluations-export", json=payload, timeout=30)
        assert r.status_code == 200
        assert r.json().get("id") == TestMultiControl._id1

        # Verify via /by-id
        g = client.get(f"{API}/plan-data/evaluations-export/by-id/{TestMultiControl._id1}", timeout=20)
        assert g.status_code == 200
        doc = g.json()
        assert doc.get("title") == "TEST Control #1 UPDATED"
        labels = [a["label"] for a in doc.get("aspects", [])]
        assert "TEST FC v2" in labels

    def test_list_ordered_by_date_desc(self, client):
        r = client.get(f"{API}/plan-data/evaluations-export/list/{self.TEST_PLAN}/medical", timeout=20)
        assert r.status_code == 200, r.text
        controls = r.json().get("controls", [])
        assert len(controls) == 2
        # id2 has date 2024-02-15 -> comes first
        assert controls[0]["id"] == TestMultiControl._id2
        assert controls[1]["id"] == TestMultiControl._id1
        for c in controls:
            for k in ("id", "date", "title", "global_pct"):
                assert k in c

    def test_timeline_returns_all_plan_controls(self, client):
        r = client.get(f"{API}/plan-data/evaluations-export/timeline/{self.TEST_PLAN}", timeout=20)
        assert r.status_code == 200
        ctrls = r.json().get("controls", [])
        assert len(ctrls) == 2
        ids = {c["id"] for c in ctrls}
        assert TestMultiControl._id1 in ids and TestMultiControl._id2 in ids
        types = {c["evaluation_type"] for c in ctrls}
        assert types == {"medical"}

    def test_by_id_pdf(self, client):
        r = client.get(f"{API}/plan-data/evaluations-export/by-id/{TestMultiControl._id2}/pdf",
                       timeout=60)
        assert r.status_code == 200, r.text[:200]
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 50_000

    def test_by_id_share_and_public_access(self, client):
        r = client.post(f"{API}/plan-data/evaluations-export/by-id/{TestMultiControl._id2}/share",
                        timeout=30)
        assert r.status_code == 200, r.text
        sid = r.json().get("share_id")
        assert sid

        # Idempotent
        r2 = client.post(f"{API}/plan-data/evaluations-export/by-id/{TestMultiControl._id2}/share",
                         timeout=30)
        assert r2.status_code == 200
        assert r2.json().get("share_id") == sid

        # Public HTML (NO auth)
        h = requests.get(f"{API}/plan-data/evaluations-export/shared/{sid}", timeout=30)
        assert h.status_code == 200, f"Public share should be 200, got {h.status_code}"
        assert "text/html" in h.headers.get("content-type", "")

        # Public PDF (NO auth)
        p = requests.get(f"{API}/plan-data/evaluations-export/shared/{sid}/pdf", timeout=60)
        assert p.status_code == 200
        assert p.content[:4] == b"%PDF"

        TestMultiControl._share_id = sid

    def test_delete_by_id_cleans_shares(self, client):
        eid = TestMultiControl._id2
        sid = TestMultiControl._share_id
        d = client.delete(f"{API}/plan-data/evaluations-export/by-id/{eid}", timeout=20)
        assert d.status_code == 200

        # /by-id 404
        g = client.get(f"{API}/plan-data/evaluations-export/by-id/{eid}", timeout=20)
        assert g.status_code == 404

        # share url should now 404 (snapshot removed)
        h = requests.get(f"{API}/plan-data/evaluations-export/shared/{sid}", timeout=20)
        assert h.status_code == 404, "Share should be cleaned after DELETE"

        # list now has only 1
        lst = client.get(f"{API}/plan-data/evaluations-export/list/{self.TEST_PLAN}/medical", timeout=20)
        assert lst.status_code == 200
        assert len(lst.json().get("controls", [])) == 1


# ---------- Templates CRUD ----------
class TestTemplatesCRUD:
    def test_create_set_default_delete(self, client):
        payload = {
            "name": "TEST Plantilla Physical",
            "evaluation_type": "physical",
            "aspects": [{"label": "TEST Sprint", "category": "Velocidad",
                         "scale_min": 3.5, "scale_max": 6, "scale_unit": "s",
                         "target": 4.2}],
            "is_default": False,
        }
        r = client.post(f"{API}/plan-data/evaluations-export/templates",
                        json=payload, timeout=20)
        assert r.status_code == 200, r.text
        tid = r.json().get("id")
        assert tid

        r2 = client.post(f"{API}/plan-data/evaluations-export/templates/{tid}/set-default",
                         timeout=20)
        assert r2.status_code == 200

        lst = client.get(f"{API}/plan-data/evaluations-export/templates/physical", timeout=20)
        assert lst.status_code == 200
        data = lst.json()
        found = next((t for t in data["templates"] if t.get("id") == tid), None)
        assert found is not None and found.get("is_default") is True
        assert data.get("system_default") is not None

        d = client.delete(f"{API}/plan-data/evaluations-export/templates/{tid}", timeout=20)
        assert d.status_code == 200

        d2 = client.delete(f"{API}/plan-data/evaluations-export/templates/{tid}", timeout=20)
        assert d2.status_code == 404


# ---------- Legacy router (/api/plan-data/evaluations sin -export) ----------
class TestLegacyRouterCoexists:
    def test_legacy_not_500(self, client):
        r = client.get(f"{API}/plan-data/evaluations/{PLAN_ID}", timeout=20)
        assert r.status_code < 500, f"Legacy route crashed: {r.status_code} {r.text[:200]}"
