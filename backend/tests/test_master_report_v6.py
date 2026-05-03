"""Master Report v6 — TOC clickeable, selector de sesiones y resumen preset."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
EMAIL = "test@train.com"
PASSWORD = "test123456"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, "No token"
    return tok


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def plan_id(headers):
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=headers, timeout=20)
    assert r.status_code == 200
    plans = r.json()
    assert isinstance(plans, list) and len(plans) > 0
    return plans[0]["id"]


# ============ sessions-list endpoint ============

def test_sessions_list_structure(headers, plan_id):
    r = requests.get(f"{BASE_URL}/api/master-report/sessions-list/{plan_id}", headers=headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total_sessions" in data
    assert isinstance(data["items"], list)
    assert isinstance(data["total_sessions"], int)
    # Validate tree shape if populated
    for meso in data["items"]:
        assert "meso_id" in meso and "meso_name" in meso and "phase" in meso
        assert "microcycles" in meso and isinstance(meso["microcycles"], list)
        for mc in meso["microcycles"]:
            assert "micro_id" in mc and "micro_name" in mc and "week_number" in mc
            assert "sessions" in mc and isinstance(mc["sessions"], list)
            for s in mc["sessions"]:
                for key in ("id", "day", "name", "session_type",
                            "duration_minutes", "intensity", "exercises_count"):
                    assert key in s, f"Missing {key} in session"


def test_sessions_list_plan_not_found(headers):
    r = requests.get(f"{BASE_URL}/api/master-report/sessions-list/nonexistent-xyz-123", headers=headers, timeout=20)
    assert r.status_code == 404


def test_sessions_list_plan_without_microcycles(headers, plan_id):
    """Plan of test@train.com has no microcycles → items=[], total_sessions=0."""
    r = requests.get(f"{BASE_URL}/api/master-report/sessions-list/{plan_id}", headers=headers, timeout=20)
    assert r.status_code == 200
    data = r.json()
    # For test account, this should be empty
    assert data["items"] == []
    assert data["total_sessions"] == 0


# ============ generate + selected_session_ids ============

def _base_payload(plan_id, extra=None):
    p = {
        "plan_id": plan_id,
        "title": "TEST v6",
        "subtitle": "auto",
        "style": "atleta",
        "sections": {
            "cover": True, "toc": True, "introduction": True,
            "diagnostic_active": True, "periodization_structure": True,
            "sessions": True, "conclusions": True,
        },
    }
    if extra:
        p.update(extra)
    return p


def test_generate_with_selected_session_ids_empty(headers, plan_id):
    """selected_session_ids=[] means none selected → should still produce a valid PDF."""
    payload = _base_payload(plan_id, {"selected_session_ids": []})
    r = requests.post(f"{BASE_URL}/api/master-report/generate", headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, r.text[:400]
    assert r.content[:4] == b"%PDF"


def test_generate_with_selected_session_ids_none(headers, plan_id):
    """Absent/None means all sessions."""
    payload = _base_payload(plan_id)  # no selected_session_ids
    r = requests.post(f"{BASE_URL}/api/master-report/generate", headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, r.text[:400]
    assert r.content[:4] == b"%PDF"


def test_generate_with_selected_session_ids_filter(headers, plan_id):
    """Filtering by a specific id should still produce a valid PDF (empty section if no match)."""
    payload = _base_payload(plan_id, {"selected_session_ids": ["fake-session-id-xxx"]})
    r = requests.post(f"{BASE_URL}/api/master-report/generate", headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, r.text[:400]
    assert r.content[:4] == b"%PDF"


# ============ Preview works with selected_session_ids ============

def test_preview_with_selected_session_ids(headers, plan_id):
    payload = _base_payload(plan_id, {"selected_session_ids": []})
    r = requests.post(f"{BASE_URL}/api/master-report/preview", headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, r.text[:400]
    # PNG magic
    assert r.content[:8].startswith(b"\x89PNG\r\n\x1a\n")


# ============ Summary preset (6 core sections) ============

def test_summary_preset_generates_pdf(headers, plan_id):
    summary = {
        "cover": True, "toc": True, "introduction": True,
        "diagnostic_active": True, "periodization_structure": True, "conclusions": True,
    }
    payload = {
        "plan_id": plan_id,
        "title": "TEST Resumen v6",
        "subtitle": "resumen",
        "style": "atleta",
        "sections": summary,
    }
    r = requests.post(f"{BASE_URL}/api/master-report/generate", headers=headers, json=payload, timeout=120)
    assert r.status_code == 200, r.text[:400]
    assert r.content[:4] == b"%PDF"
    # Ensure PDF is not trivially small
    assert len(r.content) > 2000


# ============ HTML anchors (id=sec-...) — internal check via _build_html ============

def test_html_contains_sec_ids_and_toc_anchors():
    """Verify injection of id='sec-{sid}' per section + TOC anchors in the source file."""
    import pathlib
    src = pathlib.Path("/app/backend/routes/master_report.py").read_text()
    assert 'id="sec-{sid}"' in src, "Section id injection not found"
    assert 'href="#sec-' in src, "TOC anchors not found"
    assert "sess-card" in src, "Session card class not found"
    assert "ev-block sess-card" in src, "Session block wrapper missing"
