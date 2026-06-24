"""Backend tests for Sessions Export V2 (theme/layout/share/shared) and Master Report share.
Endpoints under test:
  - POST /api/sessions-export/generate {theme, layout, format}
  - POST /api/sessions-export/share -> {share_id, expires_in_days}
  - GET  /api/sessions-export/shared/{share_id}/pdf?format=combined|zip   (público)
  - POST /api/master-report/share
  - GET  /api/master-report/shared/{share_id}/pdf
"""
import os
import io
import zipfile
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lord-deploy-test.preview.emergentagent.com").rstrip("/")
EMAIL = "test@train.com"
PASSWORD = "test123456"
PLAN_ID = "a6f2f198-5eba-4c72-ad09-ecfb7c7376dc"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token") or r.json().get("token")
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def session_ids(auth_headers):
    r = requests.get(f"{BASE_URL}/api/master-report/sessions-list/{PLAN_ID}", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    tree = r.json()
    ids = []
    mesos = tree.get("items") or []
    for ms in mesos:
        for mc in (ms.get("microcycles") or []):
            for s in (mc.get("sessions") or []):
                if s.get("id"):
                    ids.append(s["id"])
                if len(ids) >= 2:
                    return ids
    return ids


# ============= 1. Sessions Export Generate: theme + layout combinations =============

class TestGenerateThemeLayoutMatrix:
    """Validate the 4 combinations: classic/hero × light/dark return valid PDFs."""

    def test_classic_light(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1], "format": "combined",
                  "theme": "light", "layout": "classic"},
            timeout=90,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.content[:5] == b"%PDF-"
        assert "classic_light" in r.headers.get("content-disposition", "").lower()

    def test_classic_dark(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1], "format": "combined",
                  "theme": "dark", "layout": "classic"},
            timeout=90,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.content[:5] == b"%PDF-"
        assert "classic_dark" in r.headers.get("content-disposition", "").lower()

    def test_hero_light(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1], "format": "combined",
                  "theme": "light", "layout": "hero"},
            timeout=120,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.content[:5] == b"%PDF-"
        assert "hero_light" in r.headers.get("content-disposition", "").lower()
        # hero PDFs are larger (board imagery)
        assert len(r.content) > 20000, f"Hero PDF too small: {len(r.content)} bytes"

    def test_hero_dark(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1], "format": "combined",
                  "theme": "dark", "layout": "hero"},
            timeout=120,
        )
        assert r.status_code == 200, r.text[:300]
        assert r.content[:5] == b"%PDF-"
        assert "hero_dark" in r.headers.get("content-disposition", "").lower()

    def test_zip_with_hero(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:2], "format": "zip",
                  "theme": "light", "layout": "hero"},
            timeout=180,
        )
        assert r.status_code == 200, r.text[:300]
        zf = zipfile.ZipFile(io.BytesIO(r.content))
        names = zf.namelist()
        assert len(names) == 2
        for n in names:
            assert n.lower().endswith(".pdf")
            assert "hero" in n.lower()
            data = zf.read(n)
            assert data[:5] == b"%PDF-"


# ============= 2. Validation: invalid theme/layout =============

class TestThemeLayoutValidation:
    def test_invalid_theme_returns_400(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1], "format": "combined",
                  "theme": "rainbow", "layout": "classic"},
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text[:200]}"

    def test_invalid_layout_returns_400(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/generate",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1], "format": "combined",
                  "theme": "light", "layout": "fancy"},
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text[:200]}"


# ============= 3. Sessions Export Share / Public download =============

class TestSessionsExportShare:
    def test_share_returns_share_id(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/share",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1],
                  "theme": "light", "layout": "classic"},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "share_id" in data and data["share_id"].startswith("SXB-")
        assert data.get("expires_in_days") == 30

    def test_shared_combined_no_auth(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        # create share
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/share",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1],
                  "theme": "light", "layout": "classic"},
            timeout=30,
        )
        share_id = r.json()["share_id"]
        # public download without auth
        r2 = requests.get(
            f"{BASE_URL}/api/sessions-export/shared/{share_id}/pdf?format=combined",
            timeout=90,
        )
        assert r2.status_code == 200, r2.text[:300]
        assert r2.content[:5] == b"%PDF-"

    def test_shared_zip_no_auth(self, auth_headers, session_ids):
        if not session_ids:
            pytest.skip("No sessions available")
        r = requests.post(
            f"{BASE_URL}/api/sessions-export/share",
            headers=auth_headers,
            json={"plan_id": PLAN_ID, "session_ids": session_ids[:1],
                  "theme": "light", "layout": "classic"},
            timeout=30,
        )
        share_id = r.json()["share_id"]
        r2 = requests.get(
            f"{BASE_URL}/api/sessions-export/shared/{share_id}/pdf?format=zip",
            timeout=90,
        )
        assert r2.status_code == 200, r2.text[:300]
        assert r2.content[:2] == b"PK"
        zf = zipfile.ZipFile(io.BytesIO(r2.content))
        assert len(zf.namelist()) >= 1

    def test_shared_invalid_id_returns_404(self):
        r = requests.get(
            f"{BASE_URL}/api/sessions-export/shared/SXB-INVALID/pdf?format=combined",
            timeout=30,
        )
        assert r.status_code == 404


# ============= 4. Master Report Share =============

class TestMasterReportShare:
    def _payload(self):
        return {
            "plan_id": PLAN_ID,
            "title": "TEST Master Report Share",
            "style": "modern",
            "athlete_name": "Test Atleta",
            "sections": {},
        }

    def test_share_returns_share_id(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/master-report/share",
            headers=auth_headers,
            json=self._payload(),
            timeout=30,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert "share_id" in data and data["share_id"].startswith("MRP-")
        assert data.get("expires_in_days") == 30

    def test_shared_pdf_no_auth(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/master-report/share",
            headers=auth_headers,
            json=self._payload(),
            timeout=30,
        )
        share_id = r.json()["share_id"]
        r2 = requests.get(
            f"{BASE_URL}/api/master-report/shared/{share_id}/pdf",
            timeout=120,
        )
        assert r2.status_code == 200, r2.text[:300]
        assert r2.content[:5] == b"%PDF-"

    def test_share_without_plan_id_returns_400(self, auth_headers):
        payload = self._payload()
        payload["plan_id"] = ""
        r = requests.post(
            f"{BASE_URL}/api/master-report/share",
            headers=auth_headers,
            json=payload,
            timeout=30,
        )
        assert r.status_code == 400, f"Expected 400 got {r.status_code}: {r.text[:200]}"

    def test_shared_invalid_id_returns_404(self):
        r = requests.get(
            f"{BASE_URL}/api/master-report/shared/MRP-INVALID/pdf",
            timeout=30,
        )
        assert r.status_code == 404
