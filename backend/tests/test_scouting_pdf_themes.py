"""Backend tests for Scouting profile PDF endpoints with theme support.

Covers:
- GET /api/recruiting/prospects/{pid}/profile-pdf?theme=dark|light  (auth)
- GET /api/recruiting/public/{share_id}/pdf?theme=dark|light       (no auth)
"""

import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lord-deploy-test.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "juegolaureado@gmail.com"
ADMIN_PASS = "LordTraining2026!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def prospect(headers):
    # Create a prospect we control (with shareable profile enabled)
    payload = {
        "name": "TEST_PDF_Theme_Prospect",
        "sport": "futbol",
        "position": "MED",
        "age": 22,
        "nationality": "Colombia",
        "origin_country": "Colombia",
        "origin_city": "Bogotá",
        "stage": "trial",
        "shareable": True,
        "public_share_enabled": True,
    }
    r = requests.post(f"{API}/recruiting/prospects", json=payload, headers=headers, timeout=30)
    assert r.status_code in (200, 201), f"create prospect failed: {r.status_code} {r.text}"
    p = r.json()
    pid = p.get("id") or p.get("_id")
    assert pid
    # Try to enable share if there's a dedicated endpoint or share_id present
    share_id = p.get("share_id") or p.get("public_share_id")
    if not share_id:
        # Try POST share endpoint variants
        for path in (f"/recruiting/prospects/{pid}/share", f"/recruiting/prospects/{pid}/public-share"):
            rs = requests.post(f"{API}{path}", headers=headers, timeout=15)
            if rs.status_code in (200, 201):
                j = rs.json()
                share_id = j.get("share_id") or j.get("public_share_id") or j.get("id")
                if share_id:
                    break
        # Last resort: re-GET the prospect
        if not share_id:
            rg = requests.get(f"{API}/recruiting/prospects/{pid}", headers=headers, timeout=15)
            if rg.status_code == 200:
                share_id = rg.json().get("share_id") or rg.json().get("public_share_id")
    yield {"id": pid, "share_id": share_id}
    # cleanup
    try:
        requests.delete(f"{API}/recruiting/prospects/{pid}", headers=headers, timeout=15)
    except Exception:
        pass


def _assert_pdf(resp):
    assert resp.status_code == 200, f"status {resp.status_code} body={resp.content[:200]}"
    ctype = resp.headers.get("content-type", "")
    assert "application/pdf" in ctype, f"unexpected content-type: {ctype}"
    assert resp.content[:4] == b"%PDF", f"not a PDF magic header, got: {resp.content[:8]!r}"
    assert len(resp.content) > 1000, f"PDF too small: {len(resp.content)} bytes"


class TestProfilePdfThemeAuth:
    def test_profile_pdf_dark(self, prospect, headers):
        r = requests.get(f"{API}/recruiting/prospects/{prospect['id']}/profile-pdf",
                         params={"theme": "dark"}, headers=headers, timeout=60)
        _assert_pdf(r)

    def test_profile_pdf_light(self, prospect, headers):
        r = requests.get(f"{API}/recruiting/prospects/{prospect['id']}/profile-pdf",
                         params={"theme": "light"}, headers=headers, timeout=60)
        _assert_pdf(r)

    def test_profile_pdf_default_theme(self, prospect, headers):
        # No theme param should default to dark
        r = requests.get(f"{API}/recruiting/prospects/{prospect['id']}/profile-pdf",
                         headers=headers, timeout=60)
        _assert_pdf(r)


class TestPublicPdfTheme:
    def test_public_pdf_dark(self, prospect):
        if not prospect.get("share_id"):
            pytest.skip("No share_id available on prospect")
        r = requests.get(f"{API}/recruiting/public/{prospect['share_id']}/pdf",
                         params={"theme": "dark"}, timeout=60)
        _assert_pdf(r)

    def test_public_pdf_light(self, prospect):
        if not prospect.get("share_id"):
            pytest.skip("No share_id available on prospect")
        r = requests.get(f"{API}/recruiting/public/{prospect['share_id']}/pdf",
                         params={"theme": "light"}, timeout=60)
        _assert_pdf(r)


class TestPdfNegative:
    def test_profile_pdf_unauthorized(self, prospect):
        r = requests.get(f"{API}/recruiting/prospects/{prospect['id']}/profile-pdf", timeout=30)
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"

    def test_profile_pdf_not_found(self, headers):
        r = requests.get(f"{API}/recruiting/prospects/000000000000000000000000/profile-pdf",
                         headers=headers, timeout=30)
        assert r.status_code == 404
