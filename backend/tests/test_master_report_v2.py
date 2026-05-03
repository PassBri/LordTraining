"""Tests for Reporte Maestro v2 (cover layouts + conclusions + custom narrative + preview).

Covers:
- GET /api/master-report/cover-layouts → 4 layouts (modern, apa, minimal, institutional)
- GET /api/master-report/sections-catalog → includes 'closing' group with 'conclusions'
- POST /api/master-report/preview → returns PNG for each of the 4 layouts
- POST /api/master-report/generate with custom_intro / custom_conclusions / cover
"""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
EMAIL = "test@train.com"
PASSWORD = "test123456"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json().get("token") or r.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def plan_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    data = r.json()
    plans = data if isinstance(data, list) else data.get("plans") or data.get("items") or []
    if not plans:
        pytest.skip("No plans available")
    return plans[0].get("id") or plans[0].get("_id")


# ============== COVER LAYOUTS ENDPOINT ==============

class TestCoverLayouts:
    def test_returns_4_layouts(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/master-report/cover-layouts",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "layouts" in data
        ids = {l["id"] for l in data["layouts"]}
        assert ids == {"modern", "apa", "minimal", "institutional"}
        for l in data["layouts"]:
            assert "name" in l and "vibe" in l


# ============== SECTIONS CATALOG WITH CLOSING ==============

class TestSectionsCatalogWithClosing:
    def test_has_closing_group_with_conclusions(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/master-report/sections-catalog",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        groups = r.json()["groups"]
        closing = next((g for g in groups if g["id"] == "closing"), None)
        assert closing is not None, "'closing' group missing"
        assert closing["title"] == "Cierre"
        item_ids = {it["id"] for it in closing["items"]}
        assert "conclusions" in item_ids


# ============== PREVIEW ENDPOINT ==============

def _assert_png(resp, min_size=50_000):
    assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
    ctype = resp.headers.get("content-type", "")
    assert "image/png" in ctype, f"Wrong content-type: {ctype}"
    assert resp.content[:8] == b"\x89PNG\r\n\x1a\n", f"Bad PNG magic: {resp.content[:10]}"
    assert len(resp.content) > min_size, f"PNG too small: {len(resp.content)} bytes"


class TestPreview:
    def test_preview_auth_required(self):
        r = requests.post(f"{BASE_URL}/api/master-report/preview",
                          json={"style": "training"}, timeout=60)
        assert r.status_code in (401, 403)

    @pytest.mark.parametrize("layout", ["modern", "apa", "minimal", "institutional"])
    def test_preview_all_4_layouts(self, auth_headers, layout):
        payload = {
            "title": f"TEST Preview {layout}",
            "subtitle": "Macrociclo 2026",
            "style": "training",
            "sections": {"cover": True},
            "org_name": "Club iTRAIN",
            "coach_name": "Coach Test",
            "athlete_name": "Atleta Test",
            "cover": {
                "author": "Dr. Autor Test",
                "advisor": "Director Técnico Test",
                "program": "Programa Futbol",
                "department": "Dpto Ciencias del Deporte",
                "institution": "Universidad iTRAIN",
                "location": "Bogotá, Colombia",
                "period": "Macrociclo 2026 · 24 sem",
                "document_code": "IT-2026-001",
                "dedication": "A los atletas que confían en el proceso.",
                "cover_layout": layout,
            },
        }
        r = requests.post(f"{BASE_URL}/api/master-report/preview",
                          json=payload, headers=auth_headers, timeout=90)
        _assert_png(r, min_size=50_000)


# ============== GENERATE WITH NEW FEATURES ==============

def _assert_pdf(resp, min_size=5000):
    assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
    assert "application/pdf" in resp.headers.get("content-type", "")
    assert resp.content[:4] == b"%PDF"
    assert len(resp.content) > min_size


class TestGenerateNewFeatures:
    def test_generate_with_custom_intro(self, auth_headers, plan_id):
        custom = ("Párrafo uno de la introducción personalizada.\n\n"
                  "Párrafo dos con más contexto técnico y metodológico.")
        payload = {
            "plan_id": plan_id,
            "title": "TEST Custom Intro",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True},
            "custom_intro": custom,
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r)

    def test_generate_with_custom_conclusions(self, auth_headers, plan_id):
        custom = ("Conclusión primera del plan.\n\n"
                  "Conclusión segunda sobre próximos pasos.")
        payload = {
            "plan_id": plan_id,
            "title": "TEST Custom Conclusions",
            "style": "training",
            "sections": {"cover": True, "conclusions": True},
            "custom_conclusions": custom,
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r)

    def test_generate_apa_layout_with_institutional_fields(self, auth_headers, plan_id):
        payload = {
            "plan_id": plan_id,
            "title": "TEST APA Layout",
            "style": "olimpico",
            "sections": {"cover": True, "toc": True, "introduction": True, "conclusions": True},
            "org_name": "Universidad iTRAIN",
            "coach_name": "Coach APA",
            "athlete_name": "Atleta APA",
            "cover": {
                "author": "Dr. APA Autor",
                "advisor": "Director APA",
                "program": "Fútbol Alto Rendimiento",
                "department": "Facultad Ciencias del Deporte",
                "institution": "Universidad iTRAIN",
                "location": "Medellín, Colombia",
                "period": "2026 · 24 sem",
                "document_code": "UIT-APA-001",
                "dedication": "A mi familia.",
                "cover_layout": "apa",
            },
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=10000)

    def test_generate_default_no_cover_layout_still_works(self, auth_headers):
        """Backward-compat: omitting cover_layout must default to 'modern' without breaking."""
        payload = {
            "title": "TEST Default Cover",
            "style": "training",
            "sections": {"cover": True, "toc": True},
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=3000)

    @pytest.mark.parametrize("layout", ["modern", "apa", "minimal", "institutional"])
    def test_generate_each_cover_layout(self, auth_headers, layout):
        payload = {
            "title": f"TEST Gen {layout}",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True},
            "org_name": "iTRAIN",
            "cover": {
                "author": "Autor",
                "institution": "Inst iTRAIN",
                "program": "Programa",
                "department": "Depto",
                "location": "Bogotá",
                "period": "2026",
                "cover_layout": layout,
            },
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r, min_size=3000)
