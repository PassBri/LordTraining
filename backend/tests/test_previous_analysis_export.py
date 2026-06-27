"""Tests for /api/plan-data/previous-analysis export/share endpoints."""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
EMAIL = "test@train.com"
PASSWORD = "test123456"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    t = r.json().get("token") or r.json().get("access_token")
    assert t, f"No token in response: {r.json()}"
    return t


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def plan_id(auth_headers):
    """Find any existing training plan id owned by the test user."""
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"list plans failed: {r.status_code} {r.text[:200]}"
    plans = r.json()
    assert isinstance(plans, list) and len(plans) > 0, "No training plans found for test user"
    return plans[0]["id"]


@pytest.fixture(scope="module")
def saved_analysis(auth_headers, plan_id):
    """Ensure an analysis exists for plan_id (POST saves/updates)."""
    payload = {
        "plan_id": plan_id,
        "data": {
            "fechaInicio": "2024-01-15",
            "fechaFinalizacion": "2024-06-30",
            "duracionSemanas": "24",
            "objetivoPrincipal": "TEST: Mejora aeróbica y fuerza máxima",
            "cumplimiento": {"general": "parcial", "fisica": "total",
                             "tecnica": "parcial", "tactica": "no", "psicologica": "total"},
            "porcentajeCumplimiento": "72",
            "fortalezas": ["Buena adherencia", "Recuperación óptima"],
            "debilidades": ["Falta de trabajo táctico"],
            "indicadores": {
                "vo2max": {"inicial": "52", "final": "58", "delta": "+6"},
                "sentadilla": {"inicial": "110", "final": "125", "delta": "+15"},
            },
            "lesiones": "leve", "descripcionLesiones": "Molestia isquiotibial",
            "diasPerdidos": "6",
            "conclusiones": "El plan cumplió en lo físico pero falló en lo táctico.",
            "recomendaciones": "Incluir más microciclos con bloques tácticos.",
        },
    }
    r = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis",
                      headers=auth_headers, json=payload, timeout=30)
    assert r.status_code in (200, 201), f"save analysis failed: {r.status_code} {r.text[:300]}"
    return r.json()


# ========================= 1. SAVE =========================
def test_save_previous_analysis(saved_analysis):
    assert saved_analysis is not None
    # response should echo data or contain plan_id
    # Minimal sanity check
    assert isinstance(saved_analysis, dict)


def test_get_previous_analysis_after_save(auth_headers, plan_id, saved_analysis):
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}",
                     headers=auth_headers, timeout=20)
    assert r.status_code == 200
    body = r.json()
    assert body is not None
    data = body.get("data") or body
    # Probe a known field
    assert "objetivoPrincipal" in str(data)


# ========================= 2. PDF (auth) =========================
def test_pdf_export_returns_pdf(auth_headers, plan_id, saved_analysis):
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/pdf",
                     headers=auth_headers, timeout=60)
    assert r.status_code == 200, f"PDF export failed: {r.status_code} {r.text[:300]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:5] == b"%PDF-", f"Not a PDF signature, got {r.content[:10]!r}"
    assert len(r.content) > 1000


def test_pdf_export_404_when_no_analysis(auth_headers):
    """Inexistent plan_id → must 404 with Spanish message."""
    fake_plan = "plan-id-inexistente-xyz-000"
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/{fake_plan}/pdf",
                     headers=auth_headers, timeout=30)
    assert r.status_code == 404, f"expected 404 got {r.status_code} - {r.text[:200]}"
    body = r.json()
    detail = (body.get("detail") or "").lower()
    # Spanish content check
    assert any(w in detail for w in ["análisis", "analisis", "guardar", "aún", "aun"]), \
        f"Spanish message expected, got: {detail!r}"


# ========================= 3. SHARE (idempotent) =========================
def test_share_link_creates_share_id(auth_headers, plan_id, saved_analysis):
    r = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/share",
                      headers=auth_headers, timeout=20)
    assert r.status_code == 200, f"share failed: {r.status_code} {r.text[:300]}"
    body = r.json()
    assert "share_id" in body and "share_url" in body
    assert isinstance(body["share_id"], str) and len(body["share_id"]) > 0
    assert body["share_id"] in body["share_url"]
    assert "/api/plan-data/previous-analysis/shared/" in body["share_url"]


def test_share_link_idempotent(auth_headers, plan_id, saved_analysis):
    r1 = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/share",
                       headers=auth_headers, timeout=20)
    r2 = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/share",
                       headers=auth_headers, timeout=20)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["share_id"] == r2.json()["share_id"], \
        "share_id must be idempotent across calls"


# ========================= 4. SHARED HTML (no auth) =========================
def test_shared_view_public_html(auth_headers, plan_id, saved_analysis):
    share = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/share",
                          headers=auth_headers, timeout=20).json()
    share_id = share["share_id"]

    # No-auth request
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/shared/{share_id}",
                     timeout=20)
    assert r.status_code == 200, f"shared view failed: {r.status_code} {r.text[:300]}"
    assert r.headers.get("content-type", "").startswith("text/html")
    html = r.text
    assert "Análisis del Plan Anterior" in html
    assert "DOCUMENTO COMPARTIDO" in html


def test_shared_view_invalid_share_id():
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/shared/not-a-real-share-id",
                     timeout=20)
    assert r.status_code == 404


# ========================= 5. SHARED PDF (no auth) =========================
def test_shared_pdf_public(auth_headers, plan_id, saved_analysis):
    share = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/share",
                          headers=auth_headers, timeout=20).json()
    share_id = share["share_id"]
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/shared/{share_id}/pdf",
                     timeout=60)
    assert r.status_code == 200, f"shared pdf failed: {r.status_code} {r.text[:300]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    assert r.content[:5] == b"%PDF-"
    assert len(r.content) > 1000


# ========================= 6. Existing routes not broken =========================
def test_existing_get_route_still_works(auth_headers, plan_id):
    """Ensure GET /plan-data/previous-analysis/{plan_id} (1-segment) still works."""
    r = requests.get(f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}",
                     headers=auth_headers, timeout=20)
    assert r.status_code == 200
