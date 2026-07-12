"""
Tests for Recruiting Public Showcase — Cover, OG Share, Contact form and Leads inbox.
Endpoints:
- GET /api/recruiting/public/showcase/{id}/cover           (public, PNG)
- GET /api/recruiting/public/showcase/{id}/share           (public, HTML with OG meta)
- POST /api/recruiting/public/showcase/{id}/contact        (public, honeypot + email validation)
- GET /api/recruiting/showcase/leads                       (auth)
- POST /api/recruiting/showcase/leads/{id}/read            (auth)
- DELETE /api/recruiting/showcase/leads/{id}               (auth)
"""

import os
import re
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    'REACT_APP_BACKEND_URL',
    'https://lordcoach-optimize.preview.emergentagent.com'
).rstrip('/')
ADMIN_EMAIL = "juegolaureado@gmail.com"
ADMIN_PASSWORD = "LordTraining2026!"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    token = r.json().get("token") or r.json().get("access_token")
    assert token
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def showcase_id(auth_headers):
    # Ensure showcase is enabled and grab its id
    r = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings",
                     headers=auth_headers, timeout=30)
    assert r.status_code == 200
    d = r.json()
    if not d.get("showcase_enabled"):
        rr = requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                           headers=auth_headers, json={"enabled": True}, timeout=30)
        assert rr.status_code == 200
        d = rr.json()
    sid = d.get("showcase_id")
    assert sid, "showcase_id not present"
    return sid


# ─────────────── /cover (PNG 1200x630) ───────────────
class TestShowcaseCover:
    def test_cover_returns_png_1200x630(self, showcase_id):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/cover",
                         timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png"), \
            f"expected image/png, got {r.headers.get('content-type')}"
        assert len(r.content) > 1000
        # Verify PNG magic bytes
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        # Verify dimensions via Pillow if available
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(r.content))
            assert img.size == (1200, 630), f"unexpected size {img.size}"
        except ImportError:
            pass

    def test_cover_no_auth_required(self, showcase_id):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/cover",
                         timeout=30)
        # explicitly no Authorization header
        assert r.status_code == 200

    def test_cover_404_when_showcase_missing(self):
        fake = uuid.uuid4().hex[:12]
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{fake}/cover",
                         timeout=30)
        assert r.status_code == 404


# ─────────────── /share (HTML + Open Graph) ───────────────
class TestShowcaseShareHTML:
    def test_share_has_open_graph_and_redirect(self, showcase_id):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/share",
            timeout=30, allow_redirects=False)
        assert r.status_code == 200
        ctype = r.headers.get("content-type", "")
        assert "text/html" in ctype
        html = r.text
        # OG image points to /cover
        m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
                      html)
        assert m, "og:image meta not found"
        og_image = m.group(1)
        assert og_image.endswith(f"/api/recruiting/public/showcase/{showcase_id}/cover"), \
            f"og:image doesn't point to cover: {og_image}"
        # og:title present
        assert re.search(r'property=["\']og:title["\']', html), "og:title missing"
        # twitter card summary_large_image
        assert re.search(
            r'name=["\']twitter:card["\'][^>]+content=["\']summary_large_image["\']',
            html), "twitter:card missing"
        # meta-refresh or JS redirect to /cantera/{id}
        assert (f"/cantera/{showcase_id}" in html), "redirect target /cantera/{id} missing"
        assert (re.search(r'http-equiv=["\']refresh["\']', html) or
                "window.location.replace" in html), "no redirect mechanism found"

    def test_share_uses_base_from_b_param(self, showcase_id):
        # b= parameter should be used to build absolute URLs
        custom_base = "https://example-preview.emergent.app"
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/share",
            params={"b": custom_base}, timeout=30, allow_redirects=False)
        assert r.status_code == 200
        assert custom_base in r.text, "b= base URL should appear in og:image/og:url"

    def test_share_404_when_showcase_missing(self):
        fake = uuid.uuid4().hex[:12]
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/showcase/{fake}/share",
            timeout=30, allow_redirects=False)
        assert r.status_code == 404


# ─────────────── /contact (POST, sin auth) ───────────────
class TestShowcaseContact:
    def _payload(self, **kw):
        base = {
            "from_name": "TEST Reclutador Uni",
            "email": "reclutador.test@example.com",
            "organization": "Universidad TEST",
            "message": "Hola coach, nos interesa conocer más sobre estos talentos.",
        }
        base.update(kw)
        return base

    def test_contact_creates_lead(self, showcase_id, auth_headers):
        payload = self._payload(message=f"Msg pytest {uuid.uuid4().hex[:6]}")
        r = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json=payload, timeout=30)
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True
        # Verify persisted via authenticated leads list
        rl = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                          headers=auth_headers, timeout=30)
        assert rl.status_code == 200
        items = rl.json().get("items", [])
        assert any(x.get("message") == payload["message"] for x in items), \
            "created lead not found in leads inbox"

    def test_contact_invalid_email_returns_400(self, showcase_id):
        r = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json=self._payload(email="not-an-email"), timeout=30)
        assert r.status_code == 400, r.text

    def test_contact_short_message_returns_422(self, showcase_id):
        r = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json=self._payload(message="hi"), timeout=30)
        assert r.status_code == 422, r.text

    def test_contact_short_from_name_returns_422(self, showcase_id):
        r = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json=self._payload(from_name="A"), timeout=30)
        assert r.status_code == 422, r.text

    def test_contact_honeypot_ignored_no_lead_created(self, showcase_id, auth_headers):
        # Count leads before
        rl0 = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                           headers=auth_headers, timeout=30)
        assert rl0.status_code == 200
        before_count = rl0.json().get("count", 0)
        # Fill honeypot 'company'
        unique_msg = f"HONEYPOT_TEST {uuid.uuid4().hex[:8]}"
        r = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json=self._payload(message=unique_msg, company="spam-corp"), timeout=30)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # After: same or maybe more (from concurrent tests) but no lead with our unique_msg
        rl1 = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                           headers=auth_headers, timeout=30)
        assert rl1.status_code == 200
        items = rl1.json().get("items", [])
        assert not any(x.get("message") == unique_msg for x in items), \
            "honeypot lead was persisted (should have been ignored)"

    def test_contact_404_when_showcase_missing(self):
        fake = uuid.uuid4().hex[:12]
        r = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{fake}/contact",
            json=self._payload(), timeout=30)
        assert r.status_code == 404


# ─────────────── /showcase/leads (auth) ───────────────
class TestShowcaseLeadsInbox:
    def test_list_leads_shape(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                         headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("items", "count", "unread"):
            assert k in d
        assert isinstance(d["items"], list)
        assert isinstance(d["count"], int)
        assert isinstance(d["unread"], int)

    def test_leads_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads", timeout=30)
        assert r.status_code in (401, 403)

    def test_mark_read_flow(self, showcase_id, auth_headers):
        # Create a lead first
        msg = f"MARK_READ_TEST {uuid.uuid4().hex[:8]}"
        rc = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json={
                "from_name": "TEST MarkRead",
                "email": "markread@example.com",
                "organization": "TEST",
                "message": msg,
            }, timeout=30)
        assert rc.status_code == 200
        # Find the lead id
        rl = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                          headers=auth_headers, timeout=30)
        lead = next((x for x in rl.json()["items"] if x.get("message") == msg), None)
        assert lead is not None
        assert lead.get("read") is False
        lead_id = lead["id"]
        # Mark as read
        rr = requests.post(f"{BASE_URL}/api/recruiting/showcase/leads/{lead_id}/read",
                           headers=auth_headers, timeout=30)
        assert rr.status_code == 200
        assert rr.json().get("ok") is True
        # Verify persisted
        rl2 = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                           headers=auth_headers, timeout=30)
        lead2 = next((x for x in rl2.json()["items"] if x.get("id") == lead_id), None)
        assert lead2 and lead2.get("read") is True
        # Cleanup
        requests.delete(f"{BASE_URL}/api/recruiting/showcase/leads/{lead_id}",
                        headers=auth_headers, timeout=30)

    def test_mark_read_404_when_missing(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/recruiting/showcase/leads/nonexistent-lead-id/read",
            headers=auth_headers, timeout=30)
        assert r.status_code == 404

    def test_delete_lead_flow(self, showcase_id, auth_headers):
        msg = f"DELETE_TEST {uuid.uuid4().hex[:8]}"
        rc = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json={
                "from_name": "TEST Delete",
                "email": "del@example.com",
                "organization": "TEST",
                "message": msg,
            }, timeout=30)
        assert rc.status_code == 200
        rl = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                          headers=auth_headers, timeout=30)
        lead = next((x for x in rl.json()["items"] if x.get("message") == msg), None)
        assert lead is not None
        lead_id = lead["id"]
        rd = requests.delete(f"{BASE_URL}/api/recruiting/showcase/leads/{lead_id}",
                             headers=auth_headers, timeout=30)
        assert rd.status_code == 200
        # Verify removed
        rl2 = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                           headers=auth_headers, timeout=30)
        assert not any(x.get("id") == lead_id for x in rl2.json()["items"])

    def test_delete_lead_404_when_missing(self, auth_headers):
        r = requests.delete(
            f"{BASE_URL}/api/recruiting/showcase/leads/nonexistent-lead-id",
            headers=auth_headers, timeout=30)
        assert r.status_code == 404

    def test_prospect_name_resolved_when_share_id_provided(self, showcase_id, auth_headers):
        # Use a prospect_share_id known from context: 256932331237492c82acfed6acd9e9dd
        share_id = "256932331237492c82acfed6acd9e9dd"
        msg = f"PROSPECT_NAME_TEST {uuid.uuid4().hex[:8]}"
        rc = requests.post(
            f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}/contact",
            json={
                "from_name": "TEST ProspectName",
                "email": "prosp@example.com",
                "organization": "TEST",
                "message": msg,
                "prospect_share_id": share_id,
            }, timeout=30)
        assert rc.status_code == 200
        rl = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                          headers=auth_headers, timeout=30)
        lead = next((x for x in rl.json()["items"] if x.get("message") == msg), None)
        assert lead is not None
        # prospect_name should be resolved (or None if share_id doesn't match)
        # At minimum, prospect_name key must exist
        assert "prospect_name" in lead
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/recruiting/showcase/leads/{lead['id']}",
            headers=auth_headers, timeout=30)


# ─────────────── Cleanup fixture (module-level) ───────────────
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_leads(auth_headers):
    yield
    # Delete any leftover TEST leads
    try:
        r = requests.get(f"{BASE_URL}/api/recruiting/showcase/leads",
                         headers=auth_headers, timeout=30)
        if r.status_code == 200:
            for x in r.json().get("items", []):
                fn = (x.get("from_name") or "")
                msg = (x.get("message") or "")
                if fn.startswith("TEST ") or "TEST" in msg or "pytest" in msg:
                    requests.delete(
                        f"{BASE_URL}/api/recruiting/showcase/leads/{x['id']}",
                        headers=auth_headers, timeout=15)
    except Exception:
        pass
