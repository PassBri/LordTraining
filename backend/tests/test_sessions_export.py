"""Backend tests for Sessions Export flow.
Endpoints under test:
  - POST /api/sessions-export/generate (combined | zip)
Validations: empty session_ids (400), invalid format (400), unauthorized (401/403),
plan not found (404), session_ids not in plan (404).
"""
import os
import io
import zipfile
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://coach-command-23.preview.emergentagent.com").rstrip("/")
EMAIL = "test@train.com"
PASSWORD = "test123456"
PLAN_ID = "a6f2f198-5eba-4c72-ad09-ecfb7c7376dc"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"No token in response: {data}"
    return tok


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def sessions_tree(auth_headers):
    r = requests.get(f"{BASE_URL}/api/master-report/sessions-list/{PLAN_ID}", headers=auth_headers, timeout=30)
    assert r.status_code == 200, f"sessions-list failed: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def some_session_ids(sessions_tree):
    """Collect a few real session IDs from the plan tree."""
    ids = []
    # tree structure: {items: [{microcycles: [{sessions: [{id,...}]}]}], total_sessions: N}
    mesos = sessions_tree.get("items") or sessions_tree.get("mesocycles") or sessions_tree.get("tree") or []
    if isinstance(sessions_tree, list):
        mesos = sessions_tree
    for ms in mesos:
        for mc in (ms.get("microcycles") or []):
            for s in (mc.get("sessions") or []):
                if s.get("id"):
                    ids.append(s["id"])
                if len(ids) >= 3:
                    return ids
    return ids


# ---------------- Tests ----------------
class TestSessionsExportAuth:
    def test_no_token_returns_401_or_403(self):
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            json={"plan_id": PLAN_ID, "session_ids": ["x"], "format": "combined"},
            timeout=30,
        )
        assert r.status_code in (401, 403), f"Expected 401/403 got {r.status_code}"


class TestSessionsExportValidation:
    def test_empty_session_ids_returns_400(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": [], "format": "combined"},
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"

    def test_plan_not_found_returns_404(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": "does-not-exist-xxx", "session_ids": ["abc"], "format": "combined"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 got {r.status_code}: {r.text}"

    def test_invalid_format_returns_400(self, auth_headers, some_session_ids):
        if not some_session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": some_session_ids[:1], "format": "xml"},
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text}"

    def test_sessions_not_in_plan_returns_404(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": ["nonexistent-1", "nonexistent-2"], "format": "combined"},
            timeout=30,
        )
        assert r.status_code == 404, f"Expected 404 got {r.status_code}: {r.text}"


class TestSessionsExportGenerate:
    def test_combined_pdf_ok(self, auth_headers, some_session_ids):
        if not some_session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": some_session_ids[:3], "format": "combined", "athlete_name": "Test Atleta"},
            timeout=60,
        )
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:200]}"
        assert r.headers.get("content-type", "").startswith("application/pdf"), f"Wrong content-type: {r.headers.get('content-type')}"
        assert r.content[:5] == b"%PDF-", "Not a valid PDF signature"
        # Content-Disposition header present
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd.lower() and ".pdf" in cd.lower()
        # PDF should have multiple pages (we requested 3 sessions)
        assert len(r.content) > 2000, f"PDF suspiciously small: {len(r.content)} bytes"

    def test_zip_ok_and_contains_pdfs(self, auth_headers, some_session_ids):
        if not some_session_ids:
            pytest.skip("No sessions available")
        ids = some_session_ids[:3]
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": ids, "format": "zip", "athlete_name": "Test Atleta"},
            timeout=60,
        )
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:200]}"
        ct = r.headers.get("content-type", "")
        assert "zip" in ct, f"Wrong content-type: {ct}"
        cd = r.headers.get("content-disposition", "")
        assert ".zip" in cd.lower()
        # open zip
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        assert len(names) == len(ids), f"Expected {len(ids)} files in zip, got {len(names)}: {names}"
        # all are PDFs
        for n in names:
            assert n.lower().endswith(".pdf"), f"Non-pdf in zip: {n}"
            data = zf.read(n)
            assert data[:5] == b"%PDF-", f"File {n} not a valid PDF"
        # filenames are unique
        assert len(set(names)) == len(names), f"Duplicate filenames: {names}"

    def test_single_session_combined(self, auth_headers, some_session_ids):
        if not some_session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": some_session_ids[:1], "format": "combined"},
            timeout=60,
        )
        assert r.status_code == 200
        assert r.content[:5] == b"%PDF-"
