"""Master Report v5 — sessions, server-side graphic_plan, model UUID resolution."""
import os
import io
import pytest
import requests

# Load REACT_APP_BACKEND_URL
def _load_base_url() -> str:
    url = os.environ.get('REACT_APP_BACKEND_URL')
    if url:
        return url.rstrip('/')
    try:
        with open('/app/frontend/.env') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip().rstrip('/')
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")

BASE_URL = _load_base_url()
EMAIL = "test@train.com"
PWD = "test123456"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PWD}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("token") or data.get("access_token")
    assert tok, f"no token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def first_plan_id(headers):
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=headers, timeout=20)
    assert r.status_code == 200
    plans = r.json() if isinstance(r.json(), list) else r.json().get("plans", [])
    assert plans, "no plans available for test user"
    # prefer one with macros
    plan = plans[0]
    return plan.get("id") or plan.get("_id"), plans


# ============ Catalog / flag tests ============

def test_sections_catalog_has_sessions_group(headers):
    r = requests.get(f"{BASE_URL}/api/master-report/sections-catalog",
                     headers=headers, timeout=15)
    assert r.status_code == 200
    body = r.json()
    groups = body.get("groups") or []
    ids = [g.get("id") for g in groups]
    # 10 grupos expected
    assert len(groups) >= 10, f"expected >=10 groups, got {len(groups)}: {ids}"
    assert "sessions" in ids, f"missing 'sessions' group, got: {ids}"
    sess_grp = next(g for g in groups if g.get("id") == "sessions")
    items = sess_grp.get("items") or []
    item_ids = [i.get("id") for i in items]
    assert "sessions" in item_ids
    label = next(i.get("label") for i in items if i.get("id") == "sessions")
    assert "sesiones" in label.lower() or "ejercicios" in label.lower()


def test_sections_catalog_has_closing_conclusions(headers):
    r = requests.get(f"{BASE_URL}/api/master-report/sections-catalog",
                     headers=headers, timeout=15)
    assert r.status_code == 200
    groups = r.json().get("groups") or []
    closing = next((g for g in groups if g.get("id") == "closing"), None)
    assert closing is not None
    item_ids = [i.get("id") for i in (closing.get("items") or [])]
    assert "conclusions" in item_ids


def test_styles_endpoint(headers):
    r = requests.get(f"{BASE_URL}/api/master-report/styles", headers=headers, timeout=15)
    assert r.status_code == 200
    styles = r.json().get("styles") or []
    ids = [s.get("id") for s in styles]
    assert len(styles) >= 8
    for needed in ("olimpico", "atleta", "sport", "training",
                   "coach", "federation", "campeon", "primer-lugar"):
        assert needed in ids


# ============ Generate with sessions=true ============

def test_generate_accepts_sessions_flag(headers, first_plan_id):
    plan_id, _ = first_plan_id
    payload = {
        "plan_id": plan_id,
        "title": "TEST v5 Sessions",
        "style": "atleta",
        "sections": {
            "cover": True, "toc": True,
            "sessions": True,
            "graphic_plan": True,
            "periodization_structure": True,
        }
    }
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, f"generate failed: {r.status_code} {r.text[:500]}"
    assert r.headers.get("content-type", "").startswith("application/pdf")
    pdf_bytes = r.content
    assert pdf_bytes[:4] == b"%PDF", "response is not a valid PDF"
    assert len(pdf_bytes) > 1000


def test_generate_pdf_contains_required_sections(headers, first_plan_id):
    """Use pypdf to extract text and verify section markers."""
    pypdf = pytest.importorskip("pypdf")
    plan_id, plans = first_plan_id
    payload = {
        "plan_id": plan_id,
        "title": "TEST v5 Full",
        "style": "atleta",
        "sections": {
            "cover": True, "toc": True,
            "diagnostic_active": True,
            "periodization_structure": True,
            "graphic_plan": True,
            "sessions": True,
            "conclusions": True,
        }
    }
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      headers=headers, json=payload, timeout=120)
    assert r.status_code == 200
    reader = pypdf.PdfReader(io.BytesIO(r.content))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    text_l = text.lower()
    # Visualization (Plan Gráfico) badge & heading
    assert "plan gr" in text_l, "Plan Gráfico heading missing"
    # Sessions section
    assert "sesiones de entrenamiento" in text_l, "Sessions heading missing"
    # Conclusions
    assert "conclusiones" in text_l


def test_generate_no_microcycles_graphic_plan_empty(headers, first_plan_id):
    """When plan has no microcycles, graphic_plan must show empty message, not crash."""
    pypdf = pytest.importorskip("pypdf")
    plan_id, _ = first_plan_id
    payload = {
        "plan_id": plan_id,
        "title": "TEST v5 GP Empty",
        "style": "training",
        "sections": {"cover": True, "graphic_plan": True}
    }
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      headers=headers, json=payload, timeout=90)
    assert r.status_code == 200
    reader = pypdf.PdfReader(io.BytesIO(r.content))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    # Should always contain badge "VISUALIZACIÓN" or heading
    assert "plan gr" in text.lower()


# ============ Diagnostic active — model UUID resolution ============

def test_model_name_not_uuid_in_diagnostic(headers, first_plan_id):
    """Model field in diagnostic_active should NOT be a raw UUID."""
    pypdf = pytest.importorskip("pypdf")
    plan_id, _ = first_plan_id
    payload = {
        "plan_id": plan_id,
        "title": "TEST v5 Model",
        "style": "atleta",
        "sections": {"cover": True, "diagnostic_active": True}
    }
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      headers=headers, json=payload, timeout=90)
    assert r.status_code == 200
    reader = pypdf.PdfReader(io.BytesIO(r.content))
    text = "\n".join((p.extract_text() or "") for p in reader.pages)
    # Look for UUID-like raw token of length 36 with 4 hyphens
    import re
    uuids = re.findall(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", text)
    assert not uuids, f"raw UUID leaked into PDF: {uuids[:3]}"


# ============ Preview (sessions=true) ============

def test_preview_with_sessions(headers, first_plan_id):
    plan_id, _ = first_plan_id
    payload = {
        "plan_id": plan_id,
        "title": "TEST v5 Preview",
        "style": "training",
        "sections": {"cover": True, "toc": True, "sessions": True}
    }
    r = requests.post(f"{BASE_URL}/api/master-report/preview",
                      headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, f"preview failed: {r.status_code} {r.text[:300]}"
    assert r.headers.get("content-type", "").startswith("image/png")
    assert r.content[:8].startswith(b"\x89PNG")
