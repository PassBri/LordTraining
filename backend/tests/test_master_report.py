"""Tests for Reporte Maestro PDF endpoints (T6+T7).

Covers:
- GET /api/master-report/styles
- GET /api/master-report/sections-catalog
- POST /api/master-report/generate (all 5 styles, edge cases, auth)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://periodization-hub-1.preview.emergentagent.com').rstrip('/')
EMAIL = "test@train.com"
PASSWORD = "test123456"

TINY_PNG_B64 = (
    "data:image/png;base64,"
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def plan_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=auth_headers, timeout=30)
    assert r.status_code == 200, f"training-plans failed: {r.status_code}"
    data = r.json()
    plans = data if isinstance(data, list) else data.get("plans") or data.get("items") or []
    if not plans:
        pytest.skip("No plans available for test user")
    return plans[0].get("id") or plans[0].get("_id")


def _all_sections_true():
    return {
        "cover": True, "toc": True, "introduction": True,
        "diagnostic_previous": True, "diagnostic_active": True,
        "info_entities": True, "info_teams": True, "info_athletes": True,
        "info_sports": True, "info_tournaments": True, "info_coaches": True,
        "eval_medical": True, "eval_anthropometric": True, "eval_physical": True,
        "eval_biomechanical": True, "eval_technical": True, "eval_tactical": True,
        "eval_psychological": True, "eval_theoretical": True,
        "competitions": True,
        "periodization_structure": True, "periodization_load": True,
        "graphic_plan": True, "tools": True,
    }


# ==================== STYLES ====================

class TestStyles:
    def test_list_styles_structure(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/master-report/styles", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "styles" in data
        styles = data["styles"]
        assert len(styles) == 5
        ids = {s["id"] for s in styles}
        assert ids == {"apa", "michigan", "sport", "training", "coach"}
        for s in styles:
            assert all(k in s for k in ("id", "name", "vibe", "primary", "accent"))
            assert s["primary"].startswith("#")
            assert s["accent"].startswith("#")


# ==================== SECTIONS CATALOG ====================

class TestSectionsCatalog:
    def test_catalog_groups(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/master-report/sections-catalog", headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "groups" in data
        groups = data["groups"]
        assert len(groups) == 8
        group_ids = {g["id"] for g in groups}
        assert group_ids == {"intro", "diagnostic", "info", "eval", "comp", "period", "viz", "tools"}
        total_items = sum(len(g["items"]) for g in groups)
        assert total_items == 24  # 3+2+6+8+1+2+1+1
        for g in groups:
            assert "title" in g
            assert isinstance(g["items"], list)
            for it in g["items"]:
                assert "id" in it and "label" in it


# ==================== GENERATE PDF ====================

def _assert_pdf(resp, min_size=3000):
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text[:200]}"
    ctype = resp.headers.get("content-type", "")
    assert "application/pdf" in ctype, f"Wrong content-type: {ctype}"
    content = resp.content
    assert content[:4] == b"%PDF", f"Bad magic: {content[:10]}"
    assert len(content) > min_size, f"PDF too small: {len(content)} bytes"


class TestGeneratePDF:
    def test_generate_auth_required_401(self):
        payload = {"style": "training", "sections": {"cover": True, "toc": True}}
        r = requests.post(f"{BASE_URL}/api/master-report/generate", json=payload, timeout=60)
        assert r.status_code in (401, 403), f"Expected 401/403 without token, got {r.status_code}"

    def test_generate_training_full(self, auth_headers, plan_id):
        payload = {
            "plan_id": plan_id,
            "title": "TEST Plan Maestro",
            "subtitle": "Macrociclo 2026",
            "style": "training",
            "sections": _all_sections_true(),
            "org_name": "Club iTRAIN",
            "coach_name": "Coach Test",
            "athlete_name": "Atleta Test",
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate", json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=10000)

    @pytest.mark.parametrize("style", ["apa", "michigan", "sport", "training", "coach"])
    def test_generate_all_5_styles(self, auth_headers, plan_id, style):
        payload = {
            "plan_id": plan_id,
            "title": f"TEST Style {style}",
            "style": style,
            "sections": {"cover": True, "toc": True, "introduction": True,
                         "diagnostic_active": True, "periodization_structure": True},
            "org_name": "Club iTRAIN",
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate", json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=5000)

    def test_generate_minimum_sections(self, auth_headers):
        payload = {
            "title": "TEST Minimal",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True},
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate", json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=3000)

    def test_generate_invalid_plan_id_does_not_crash(self, auth_headers):
        payload = {
            "plan_id": "nonexistent-plan-xyz-123",
            "title": "TEST Invalid Plan",
            "style": "training",
            "sections": {"cover": True, "toc": True, "tools": True},
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate", json=payload, headers=auth_headers, timeout=120)
        # Must still generate (sections that don't need plan)
        _assert_pdf(r, min_size=3000)

    def test_generate_with_logo_b64(self, auth_headers):
        payload = {
            "title": "TEST Logo",
            "style": "michigan",
            "sections": {"cover": True, "toc": True, "introduction": True},
            "org_name": "Logo Club",
            "org_logo_b64": TINY_PNG_B64,
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate", json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=3000)
