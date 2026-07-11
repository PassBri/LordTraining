"""
Tests for Recruiting Public Showcase (Vitrina 'Cantera').
- GET/POST /api/recruiting/showcase-settings (auth)
- POST /api/recruiting/showcase/prospect/{pid} (auth)
- GET /api/recruiting/public/showcase/{id} (public)
- GET /api/recruiting/public/showcase/{id}/logo (public)
"""

import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lordcoach-optimize.preview.emergentagent.com').rstrip('/')
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
def initial_settings(auth_headers):
    r = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30)
    assert r.status_code == 200
    return r.json()


# ---------- GET showcase-settings ----------
class TestShowcaseSettingsGet:
    def test_get_settings_shape(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ("showcase_enabled", "showcase_id", "showcase_title",
                  "showcase_hidden", "showcase_pinned"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["showcase_hidden"], list)
        assert isinstance(d["showcase_pinned"], list)

    def test_get_settings_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", timeout=30)
        assert r.status_code in (401, 403)


# ---------- POST showcase-settings ----------
class TestShowcaseSettingsPost:
    def test_enable_generates_id_and_persists(self, auth_headers, initial_settings):
        # Enable
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                          headers=auth_headers, json={"enabled": True}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["showcase_enabled"] is True
        assert d["showcase_id"] and len(d["showcase_id"]) >= 8
        # Persistence via GET
        g = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        assert g["showcase_enabled"] is True
        assert g["showcase_id"] == d["showcase_id"]

    def test_update_title_persists(self, auth_headers):
        new_title = "TEST_Cantera Vitrina"
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                          headers=auth_headers, json={"title": new_title}, timeout=30)
        assert r.status_code == 200
        assert r.json()["showcase_title"] == new_title
        g = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        assert g["showcase_title"] == new_title

    def test_disable_and_reenable_preserves_id(self, auth_headers):
        g1 = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        original_id = g1["showcase_id"]

        # Disable
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                          headers=auth_headers, json={"enabled": False}, timeout=30)
        assert r.status_code == 200
        assert r.json()["showcase_enabled"] is False

        # Public endpoint should now 404
        pr = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{original_id}", timeout=30)
        assert pr.status_code == 404

        # Re-enable
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                          headers=auth_headers, json={"enabled": True}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["showcase_enabled"] is True
        # Should reuse the same id (no regenerate)
        assert d["showcase_id"] == original_id


# ---------- POST /showcase/prospect/{pid} ----------
class TestShowcaseProspectFlags:
    @pytest.fixture(scope="class")
    def shared_prospect_id(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects", headers=auth_headers, timeout=30)
        assert r.status_code == 200
        candidates = [p for p in r.json() if p.get("share_enabled")]
        if not candidates:
            pytest.skip("No shared prospects available for showcase flag testing")
        return candidates[0]["id"]

    def test_nonexistent_prospect_404(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/nonexistent_pid_xyz",
                          headers=auth_headers, json={"hidden": True}, timeout=30)
        assert r.status_code == 404

    def test_hide_and_verify_persistence(self, auth_headers, shared_prospect_id):
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{shared_prospect_id}",
                          headers=auth_headers, json={"hidden": True}, timeout=30)
        assert r.status_code == 200
        assert r.json()["hidden"] is True
        s = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        assert shared_prospect_id in s["showcase_hidden"]

    def test_unhide(self, auth_headers, shared_prospect_id):
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{shared_prospect_id}",
                          headers=auth_headers, json={"hidden": False}, timeout=30)
        assert r.status_code == 200
        assert r.json()["hidden"] is False
        s = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        assert shared_prospect_id not in s["showcase_hidden"]

    def test_pin_and_unpin(self, auth_headers, shared_prospect_id):
        # Pin
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{shared_prospect_id}",
                          headers=auth_headers, json={"pinned": True}, timeout=30)
        assert r.status_code == 200
        assert r.json()["pinned"] is True
        s = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        assert shared_prospect_id in s["showcase_pinned"]

        # Unpin
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{shared_prospect_id}",
                          headers=auth_headers, json={"pinned": False}, timeout=30)
        assert r.status_code == 200
        assert r.json()["pinned"] is False
        s = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        assert shared_prospect_id not in s["showcase_pinned"]


# ---------- GET /public/showcase/{id} ----------
class TestPublicShowcase:
    @pytest.fixture(scope="class")
    def showcase_id(self, auth_headers):
        # Ensure enabled and return id
        r = requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                          headers=auth_headers, json={"enabled": True}, timeout=30)
        assert r.status_code == 200
        return r.json()["showcase_id"]

    def test_public_shape_no_auth(self, showcase_id):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        # Top-level structure
        for k in ("title", "branding", "count", "athletes"):
            assert k in d, f"missing top-level {k}"
        b = d["branding"]
        for k in ("entity_name", "slogan", "accent_color", "has_logo"):
            assert k in b, f"missing branding.{k}"
        assert isinstance(d["athletes"], list)
        assert d["count"] == len(d["athletes"])

    def test_athlete_fields(self, showcase_id):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}", timeout=30)
        d = r.json()
        if not d["athletes"]:
            pytest.skip("No athletes to validate athlete-shape")
        a = d["athletes"][0]
        for k in ("share_id", "name", "position", "sport_name", "overall_score",
                  "level_label", "level_color", "top_metrics", "strengths",
                  "achievements", "videos", "has_photo"):
            assert k in a, f"athlete missing key {k}"
        assert isinstance(a["top_metrics"], list)
        assert isinstance(a["strengths"], list)
        assert isinstance(a["videos"], list)

    def test_videos_only_public(self, showcase_id):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}", timeout=30)
        for a in r.json().get("athletes", []):
            for v in a.get("videos", []):
                # Public true or missing (defaults to True)
                assert v.get("is_public", True) is True

    def test_hidden_prospect_excluded_and_pinned_first(self, auth_headers, showcase_id):
        # Get a shared prospect
        pr = requests.get(f"{BASE_URL}/api/recruiting/prospects", headers=auth_headers, timeout=30).json()
        shared = [p for p in pr if p.get("share_enabled")]
        if len(shared) < 1:
            pytest.skip("No shared prospects")
        pid = shared[0]["id"]

        # Hide it
        requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{pid}",
                      headers=auth_headers, json={"hidden": True}, timeout=30)
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}", timeout=30).json()
        share_ids_visible = [a["share_id"] for a in r["athletes"]]
        # The share_id of hidden prospect must not appear
        hidden_share_id = shared[0].get("share_id")
        if hidden_share_id:
            assert hidden_share_id not in share_ids_visible

        # Unhide
        requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{pid}",
                      headers=auth_headers, json={"hidden": False}, timeout=30)

        # If more than one shared, test pin ordering
        if len(shared) >= 2:
            pin_pid = shared[-1]["id"]
            pin_share_id = shared[-1].get("share_id")
            requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{pin_pid}",
                          headers=auth_headers, json={"pinned": True}, timeout=30)
            r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{showcase_id}", timeout=30).json()
            if r["athletes"] and pin_share_id:
                assert r["athletes"][0]["share_id"] == pin_share_id
            # Cleanup
            requests.post(f"{BASE_URL}/api/recruiting/showcase/prospect/{pin_pid}",
                          headers=auth_headers, json={"pinned": False}, timeout=30)

    def test_nonexistent_showcase_404(self):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/does_not_exist_xyz", timeout=30)
        assert r.status_code == 404

    def test_disabled_showcase_404(self, auth_headers):
        # Get current id
        g = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        sid = g["showcase_id"]
        # Disable
        requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                      headers=auth_headers, json={"enabled": False}, timeout=30)
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{sid}", timeout=30)
        assert r.status_code == 404
        # Re-enable to leave state as active
        requests.post(f"{BASE_URL}/api/recruiting/showcase-settings",
                      headers=auth_headers, json={"enabled": True}, timeout=30)


# ---------- GET /public/showcase/{id}/logo ----------
class TestPublicShowcaseLogo:
    def test_logo_endpoint_response(self, auth_headers):
        g = requests.get(f"{BASE_URL}/api/recruiting/showcase-settings", headers=auth_headers, timeout=30).json()
        sid = g["showcase_id"]
        settings = requests.get(f"{BASE_URL}/api/recruiting/settings", headers=auth_headers, timeout=30).json()
        r = requests.get(f"{BASE_URL}/api/recruiting/public/showcase/{sid}/logo", timeout=30)
        if settings.get("logo_path"):
            assert r.status_code == 200
            assert r.headers.get("Content-Type", "").startswith("image/")
        else:
            assert r.status_code == 404
