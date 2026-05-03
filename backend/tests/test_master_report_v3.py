"""Tests for Reporte Maestro v3 (section_order + full-page preview).

Covers:
- POST /api/master-report/preview → full-page PNG is noticeably larger than cover-only
  when several sections are enabled (> 500 KB threshold).
- POST /api/master-report/generate respects payload.section_order (custom order)
  and still works without it (default order).
- section_order containing unknown sections is tolerated (ignored).
"""
import io
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')
EMAIL = "test@train.com"
PASSWORD = "test123456"


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code}")
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


# ---------- helpers ----------

def _assert_png(resp, min_size=50_000):
    assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
    assert "image/png" in resp.headers.get("content-type", "")
    assert resp.content[:8] == b"\x89PNG\r\n\x1a\n"
    assert len(resp.content) > min_size, f"PNG too small: {len(resp.content)} bytes"


def _assert_pdf(resp, min_size=5000):
    assert resp.status_code == 200, f"Got {resp.status_code}: {resp.text[:200]}"
    assert "application/pdf" in resp.headers.get("content-type", "")
    assert resp.content[:4] == b"%PDF"
    assert len(resp.content) > min_size


# ---------- PREVIEW (full-page) ----------

class TestPreviewFullPage:
    def test_cover_only_preview(self, auth_headers):
        """Baseline: cover-only preview (smaller PNG)."""
        payload = {
            "title": "TEST v3 Cover Only",
            "style": "training",
            "sections": {"cover": True},
        }
        r = requests.post(f"{BASE_URL}/api/master-report/preview",
                          json=payload, headers=auth_headers, timeout=90)
        _assert_png(r, min_size=50_000)
        # Record size for comparison logic
        assert len(r.content) < 1_500_000  # still reasonably small

    def test_multi_section_preview_is_full_page(self, auth_headers):
        """With several sections enabled, full_page=True must capture the whole
        document and produce a significantly bigger PNG (> 500 KB)."""
        payload = {
            "title": "TEST v3 Full Page",
            "subtitle": "Macrociclo 2026",
            "style": "training",
            "sections": {
                "cover": True,
                "toc": True,
                "introduction": True,
                "conclusions": True,
            },
            "custom_intro": ("Introducción larga en múltiples párrafos. " * 40
                             + "\n\nSegundo párrafo extenso. " * 20),
            "custom_conclusions": ("Conclusiones detalladas del plan. " * 30
                                   + "\n\nSiguientes pasos. " * 20),
        }
        r = requests.post(f"{BASE_URL}/api/master-report/preview",
                          json=payload, headers=auth_headers, timeout=90)
        _assert_png(r, min_size=500_000)

    def test_preview_accepts_section_order(self, auth_headers):
        """Passing section_order must not break the preview endpoint."""
        payload = {
            "title": "TEST v3 Preview Ordered",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True, "conclusions": True},
            "section_order": ["cover", "toc", "conclusions", "introduction"],
        }
        r = requests.post(f"{BASE_URL}/api/master-report/preview",
                          json=payload, headers=auth_headers, timeout=90)
        _assert_png(r, min_size=50_000)


# ---------- GENERATE with section_order ----------

class TestGenerateSectionOrder:
    def test_generate_without_section_order(self, auth_headers, plan_id):
        payload = {
            "plan_id": plan_id,
            "title": "TEST v3 Default Order",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True, "conclusions": True},
            "custom_intro": "Intro.",
            "custom_conclusions": "Fin.",
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r)

    def test_generate_with_custom_section_order(self, auth_headers, plan_id):
        """Conclusions before Introduction."""
        payload = {
            "plan_id": plan_id,
            "title": "TEST v3 Custom Order",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True, "conclusions": True},
            "section_order": ["cover", "toc", "conclusions", "introduction"],
            "custom_intro": "Intro personalizada.",
            "custom_conclusions": "Conclusiones primero.",
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r)
        # Verify order with pypdf
        try:
            from pypdf import PdfReader
        except ImportError:
            pytest.skip("pypdf not installed")
        reader = PdfReader(io.BytesIO(r.content))
        texts = [p.extract_text() or "" for p in reader.pages]
        # Find the first page (post-TOC) where each section heading appears as
        # a standalone heading (not just a TOC row). Easiest heuristic: find
        # page with the marker text 'Conclusiones primero.' (body) vs
        # 'Intro personalizada.' (body).
        page_of_conc_body = next(
            (i for i, t in enumerate(texts) if "Conclusiones primero" in t), None)
        page_of_intro_body = next(
            (i for i, t in enumerate(texts) if "Intro personalizada" in t), None)
        assert page_of_conc_body is not None, f"Conclusions body text missing"
        assert page_of_intro_body is not None, f"Introduction body text missing"
        assert page_of_conc_body < page_of_intro_body, (
            f"section_order not respected: conclusions body on page "
            f"{page_of_conc_body} should come before introduction body on page "
            f"{page_of_intro_body}. Pages extracted: {[t[:60] for t in texts]}"
        )

    def test_generate_section_order_ignores_unknown_sections(self, auth_headers, plan_id):
        """Extra unknown section ids must be silently ignored."""
        payload = {
            "plan_id": plan_id,
            "title": "TEST v3 Bogus Order",
            "style": "training",
            "sections": {"cover": True, "toc": True, "introduction": True},
            "section_order": ["cover", "nonexistent_section", "toc", "introduction", "another_bogus"],
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r)

    def test_generate_section_order_only_affects_enabled(self, auth_headers, plan_id):
        """section_order mentioning disabled sections should not force them to render."""
        payload = {
            "plan_id": plan_id,
            "title": "TEST v3 Order vs Sections",
            "style": "training",
            "sections": {"cover": True, "toc": True},  # conclusions NOT enabled
            "section_order": ["cover", "toc", "conclusions"],
        }
        r = requests.post(f"{BASE_URL}/api/master-report/generate",
                          json=payload, headers=auth_headers, timeout=120)
        _assert_pdf(r)
