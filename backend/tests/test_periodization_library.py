"""
Backend tests for Periodization Library CRUD (/api/periodization-library)
- Seed on first access
- Create/Read/Update/Delete custom models
- Reset defaults
- Auth enforcement (401/404)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or \
           "https://lordcoach-optimize.preview.emergentagent.com"

EMAIL = "test@train.com"
PASSWORD = "test123456"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return r.json().get("access_token") or r.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ============== Auth ==============
class TestAuth:
    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/periodization-library", timeout=30)
        assert r.status_code in (401, 403)

    def test_create_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/periodization-library",
                          json={"name": "X"}, timeout=30)
        assert r.status_code in (401, 403)


# ============== Seed + List ==============
class TestSeedAndList:
    def test_list_seeds_30_defaults(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/periodization-library",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        defaults = [m for m in items if m.get("is_default")]
        assert len(defaults) >= 30, f"Expected >=30 defaults, got {len(defaults)}"
        # Should NOT duplicate (no double-seed): each default_key unique
        keys = [m.get("default_key") for m in defaults if m.get("default_key")]
        assert len(keys) == len(set(keys)), "Duplicate default_key in defaults"

    def test_itrain_pdi_present(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/periodization-library",
                         headers=auth_headers, timeout=30)
        items = r.json()
        pdi = next((m for m in items if m.get("default_key") == "itrain_pdi"), None)
        assert pdi is not None, "iTrain PDI default model not seeded"
        assert pdi["name"] == "iTrain PDI · Periodización Dual Integrada"
        assert pdi["author"] == "Brian (Route to Top) · iTrain.app"
        assert pdi["color"] == "#CCFF00"
        assert pdi["icon"] == "🧠"
        assert pdi["category"] == "Avanzado"
        assert len(pdi["phases"]) == 5, f"PDI must have 5 phases, got {len(pdi['phases'])}"
        assert len(pdi["characteristics"]) == 9, f"PDI must have 9 characteristics, got {len(pdi['characteristics'])}"
        assert pdi["is_default"] is True

    def test_no_duplicate_after_re_list(self, auth_headers):
        """List twice -> should NOT duplicate the 30 defaults (idempotent seed)."""
        r1 = requests.get(f"{BASE_URL}/api/periodization-library",
                          headers=auth_headers, timeout=30)
        n1 = len([m for m in r1.json() if m.get("is_default")])
        r2 = requests.get(f"{BASE_URL}/api/periodization-library",
                          headers=auth_headers, timeout=30)
        n2 = len([m for m in r2.json() if m.get("is_default")])
        assert n1 == n2, f"Defaults duplicated after re-list: {n1} -> {n2}"
        assert n2 == 30, f"Expected exactly 30 defaults, got {n2}"
        items = r2.json()
        # No Mongo _id leak
        for m in items[:3]:
            assert "_id" not in m
            assert "user_id" not in m
        # Has expected fields
        defaults = [m for m in items if m.get("is_default")]
        sample = defaults[0]
        for field in ("id", "name", "category", "phases", "characteristics",
                      "applicable_sports", "is_default"):
            assert field in sample

    def test_defaults_have_expected_categories(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/periodization-library",
                         headers=auth_headers, timeout=30)
        items = r.json()
        cats = {m.get("category") for m in items if m.get("is_default")}
        # At least some of the expected categories
        assert len(cats) >= 3


# ============== CRUD ==============
class TestCRUD:
    created_id = None

    def test_create_custom_model(self, auth_headers):
        payload = {
            "name": "TEST_Custom_Model",
            "author": "Tester",
            "category": "Custom",
            "description": "Modelo de prueba",
            "icon": "🧪",
            "color": "#CCFF00",
            "phases": [
                {"name": "Prep", "color": "#3B82F6", "volume": 80,
                 "intensity": 60, "duration_weeks": "4", "description": "Base"},
                {"name": "Comp", "color": "#EF4444", "volume": 60,
                 "intensity": 90, "duration_weeks": "3", "description": "Peak"},
            ],
            "characteristics": ["Alta intensidad", "Recuperación activa"],
            "applicable_sports": ["Fútbol", "Rugby"],
            "recommended_duration": "8 semanas",
        }
        r = requests.post(f"{BASE_URL}/api/periodization-library",
                          json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Custom_Model"
        assert data["is_default"] is False
        assert len(data["phases"]) == 2
        assert data["phases"][0]["name"] == "Prep"
        assert data["applicable_sports"] == ["Fútbol", "Rugby"]
        assert "id" in data
        assert "_id" not in data
        assert "user_id" not in data
        TestCRUD.created_id = data["id"]

    def test_created_model_in_list(self, auth_headers):
        assert TestCRUD.created_id
        r = requests.get(f"{BASE_URL}/api/periodization-library",
                         headers=auth_headers, timeout=30)
        ids = [m["id"] for m in r.json()]
        assert TestCRUD.created_id in ids

    def test_get_by_id(self, auth_headers):
        assert TestCRUD.created_id
        r = requests.get(
            f"{BASE_URL}/api/periodization-library/{TestCRUD.created_id}",
            headers=auth_headers, timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Custom_Model"

    def test_update_model(self, auth_headers):
        assert TestCRUD.created_id
        update = {
            "name": "TEST_Custom_Model_Updated",
            "characteristics": ["Nueva caract"],
            "phases": [
                {"name": "Only1", "color": "#000000", "volume": 50,
                 "intensity": 50, "duration_weeks": "2", "description": ""}
            ],
        }
        r = requests.put(
            f"{BASE_URL}/api/periodization-library/{TestCRUD.created_id}",
            json=update, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["name"] == "TEST_Custom_Model_Updated"
        assert data["characteristics"] == ["Nueva caract"]
        assert len(data["phases"]) == 1
        # Persist check
        r2 = requests.get(
            f"{BASE_URL}/api/periodization-library/{TestCRUD.created_id}",
            headers=auth_headers, timeout=30)
        assert r2.json()["name"] == "TEST_Custom_Model_Updated"

    def test_update_not_found(self, auth_headers):
        r = requests.put(
            f"{BASE_URL}/api/periodization-library/nonexistent-id-xyz",
            json={"name": "nope"}, headers=auth_headers, timeout=30)
        assert r.status_code == 404

    def test_delete_model(self, auth_headers):
        assert TestCRUD.created_id
        r = requests.delete(
            f"{BASE_URL}/api/periodization-library/{TestCRUD.created_id}",
            headers=auth_headers, timeout=30)
        assert r.status_code == 200
        # Verify gone
        r2 = requests.get(
            f"{BASE_URL}/api/periodization-library/{TestCRUD.created_id}",
            headers=auth_headers, timeout=30)
        assert r2.status_code == 404

    def test_delete_not_found(self, auth_headers):
        r = requests.delete(
            f"{BASE_URL}/api/periodization-library/does-not-exist-abc",
            headers=auth_headers, timeout=30)
        assert r.status_code == 404


# ============== Reset Defaults ==============
class TestReset:
    def test_reset_defaults_preserves_custom(self, auth_headers):
        # Create a custom
        payload = {"name": "TEST_KeepMe", "category": "Custom",
                   "phases": [], "characteristics": [], "applicable_sports": []}
        r = requests.post(f"{BASE_URL}/api/periodization-library",
                          json=payload, headers=auth_headers, timeout=30)
        assert r.status_code == 200
        custom_id = r.json()["id"]

        # Reset
        r2 = requests.post(f"{BASE_URL}/api/periodization-library/reset-defaults",
                           headers=auth_headers, timeout=60)
        assert r2.status_code == 200, r2.text
        items = r2.json()
        assert isinstance(items, list)
        defaults = [m for m in items if m.get("is_default")]
        assert len(defaults) >= 30
        # PDI must still exist after reset
        pdi = next((m for m in defaults if m.get("default_key") == "itrain_pdi"), None)
        assert pdi is not None, "iTrain PDI missing after reset-defaults"
        # Custom survives
        ids = [m["id"] for m in items]
        assert custom_id in ids, "Custom model was deleted by reset-defaults"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/periodization-library/{custom_id}",
                        headers=auth_headers, timeout=30)
