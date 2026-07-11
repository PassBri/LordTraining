"""Backend tests for Recruiting share metrics + leaderboard + OG card-page.

Covers:
- POST /api/recruiting/prospects/{pid}/track {action}  → increments share_stats.downloads / shares
- Invalid action → 400; unknown pid → 404
- GET /api/recruiting/share-ranking?limit=N → returns items ordered by total desc, includes downloads/shares/views/total
- GET /api/recruiting/public/{share_id}/card?format=post|story  (no auth) → PNG
- GET /api/recruiting/public/{share_id}/card-page?format=post&b=&fo=  (no auth) → HTML w/ OG meta
- Human UA increments views; bot UA (facebookexternalhit) does NOT increment views
"""
import os
import io
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL",
                          "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
EMAIL = "juegolaureado@gmail.com"
PASSWORD = "LordTraining2026!"


def _login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def token():
    return _login()


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# Create + enable share for a fresh prospect (module scope) so we don't corrupt existing data
@pytest.fixture(scope="module")
def shared_prospect(auth_headers):
    payload = {
        "name": "TEST_ShareMetrics_Prospect",
        "sport": "football", "sport_name": "Fútbol",
        "position": "Delantero", "age": 20, "nationality": "ES",
        "current_club": "TEST FC",
    }
    r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # enable share
    rs = requests.post(f"{BASE_URL}/api/recruiting/prospects/{pid}/share",
                       headers=auth_headers, timeout=20)
    assert rs.status_code == 200, rs.text
    share_id = rs.json()["share_id"]
    yield {"pid": pid, "share_id": share_id}
    requests.delete(f"{BASE_URL}/api/recruiting/prospects/{pid}", headers=auth_headers, timeout=15)


# ─────────────────────── TRACK ───────────────────────

class TestTrackEndpoint:
    def test_download_increments_downloads(self, shared_prospect, auth_headers):
        pid = shared_prospect["pid"]
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{pid}/track",
                          json={"action": "download"}, headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "share_stats" in data
        assert data["share_stats"].get("downloads", 0) >= 1
        # Do it again → should be 2
        r2 = requests.post(f"{BASE_URL}/api/recruiting/prospects/{pid}/track",
                           json={"action": "download"}, headers=auth_headers, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["share_stats"]["downloads"] >= 2

    def test_share_increments_shares(self, shared_prospect, auth_headers):
        pid = shared_prospect["pid"]
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{pid}/track",
                          json={"action": "share"}, headers=auth_headers, timeout=15)
        assert r.status_code == 200
        st = r.json()["share_stats"]
        assert st.get("shares", 0) >= 1

    def test_invalid_action_400(self, shared_prospect, auth_headers):
        pid = shared_prospect["pid"]
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{pid}/track",
                          json={"action": "like"}, headers=auth_headers, timeout=15)
        assert r.status_code == 400

    def test_unknown_pid_404(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/does-not-exist-abc/track",
                          json={"action": "download"}, headers=auth_headers, timeout=15)
        assert r.status_code == 404

    def test_persistence_via_get_prospect(self, shared_prospect, auth_headers):
        """Verify stats actually persist in DB by fetching the prospect."""
        pid = shared_prospect["pid"]
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        stats = body.get("share_stats") or {}
        assert stats.get("downloads", 0) >= 2
        assert stats.get("shares", 0) >= 1


# ─────────────────────── SHARE-RANKING ───────────────────────

class TestShareRanking:
    def test_ranking_returns_items_with_fields(self, shared_prospect, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/share-ranking?limit=5",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "items" in body and "count" in body
        assert isinstance(body["items"], list)
        # Our shared_prospect must appear since downloads>0
        found = [it for it in body["items"] if it["id"] == shared_prospect["pid"]]
        assert found, f"Expected TEST prospect in ranking, got: {[i['id'] for i in body['items']]}"
        row = found[0]
        for k in ("downloads", "shares", "views", "total", "name"):
            assert k in row, f"Missing field {k} in row: {row}"
        assert row["total"] == row["downloads"] + row["shares"]

    def test_ranking_ordered_desc_by_total(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/share-ranking?limit=20",
                         headers=auth_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        totals = [it["total"] for it in items]
        assert totals == sorted(totals, reverse=True), f"not ordered desc: {totals}"

    def test_ranking_excludes_zero_activity(self, auth_headers):
        """Create a fresh prospect without activity → should NOT appear in ranking."""
        payload = {"name": "TEST_ZeroActivity_Prospect", "sport": "football",
                   "sport_name": "Fútbol", "age": 18}
        cr = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload,
                           headers=auth_headers, timeout=20)
        assert cr.status_code == 200
        zid = cr.json()["id"]
        try:
            r = requests.get(f"{BASE_URL}/api/recruiting/share-ranking?limit=20",
                             headers=auth_headers, timeout=15)
            ids = [it["id"] for it in r.json()["items"]]
            assert zid not in ids, "Zero-activity prospect should not appear in ranking"
        finally:
            requests.delete(f"{BASE_URL}/api/recruiting/prospects/{zid}",
                            headers=auth_headers, timeout=15)


# ─────────────────────── PUBLIC CARD (PNG, no auth) ───────────────────────

class TestPublicCard:
    def test_public_card_post_no_auth_returns_png(self, shared_prospect):
        share_id = shared_prospect["share_id"]
        r = requests.get(f"{BASE_URL}/api/recruiting/public/{share_id}/card",
                         params={"format": "post"}, timeout=60)
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("image/png")
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert len(r.content) > 1000

    def test_public_card_story_no_auth_returns_png(self, shared_prospect):
        share_id = shared_prospect["share_id"]
        r = requests.get(f"{BASE_URL}/api/recruiting/public/{share_id}/card",
                         params={"format": "story"}, timeout=60)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/png")

    def test_public_card_unknown_share_id_404(self):
        r = requests.get(f"{BASE_URL}/api/recruiting/public/does-not-exist-xyz/card",
                         params={"format": "post"}, timeout=20)
        assert r.status_code == 404

    def test_public_card_disabled_returns_404(self, auth_headers):
        """Create prospect, enable, disable → public/card should 404."""
        cr = requests.post(f"{BASE_URL}/api/recruiting/prospects",
                           json={"name": "TEST_DisabledShare", "sport": "football",
                                 "sport_name": "Fútbol", "age": 20},
                           headers=auth_headers, timeout=20)
        pid = cr.json()["id"]
        try:
            en = requests.post(f"{BASE_URL}/api/recruiting/prospects/{pid}/share",
                               headers=auth_headers, timeout=15)
            sid = en.json()["share_id"]
            di = requests.delete(f"{BASE_URL}/api/recruiting/prospects/{pid}/share",
                                 headers=auth_headers, timeout=15)
            assert di.status_code == 200
            r = requests.get(f"{BASE_URL}/api/recruiting/public/{sid}/card",
                             params={"format": "post"}, timeout=20)
            assert r.status_code == 404
        finally:
            requests.delete(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                            headers=auth_headers, timeout=15)


# ─────────────────────── CARD-PAGE (Open Graph) ───────────────────────

_OG_META_KEYS = [
    ('property', 'og:title'),
    ('property', 'og:description'),
    ('property', 'og:image'),
    ('property', 'og:url'),
    ('property', 'og:image:width'),
    ('property', 'og:image:height'),
    ('name', 'twitter:card'),
    ('name', 'twitter:image'),
]


def _meta(html: str, attr: str, key: str) -> str:
    """Extract content of a <meta {attr}="{key}" content="..."/> tag."""
    pattern = rf'<meta[^>]*{attr}=["\']{re.escape(key)}["\'][^>]*content=["\']([^"\']*)["\']'
    m = re.search(pattern, html, flags=re.IGNORECASE)
    return m.group(1) if m else ""


class TestCardPageOG:
    def test_card_page_has_og_meta(self, shared_prospect):
        share_id = shared_prospect["share_id"]
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/{share_id}/card-page",
            params={"format": "post", "b": BASE_URL, "fo": BASE_URL},
            timeout=30,
        )
        assert r.status_code == 200, r.text[:200]
        assert "text/html" in r.headers.get("content-type", "")
        html = r.text
        # All OG/twitter meta tags exist and are non-empty
        for attr, key in _OG_META_KEYS:
            val = _meta(html, attr, key)
            assert val, f"Missing/empty meta {attr}={key}"
        # og:image points to /public/{share_id}/card
        og_img = _meta(html, 'property', 'og:image')
        assert f"/api/recruiting/public/{share_id}/card" in og_img, f"og:image wrong: {og_img}"
        # twitter:card = summary_large_image
        tw_card = _meta(html, 'name', 'twitter:card')
        assert tw_card == "summary_large_image", f"twitter:card wrong: {tw_card}"
        # og:image respects base override
        assert og_img.startswith(BASE_URL), f"og:image should start with base ({BASE_URL}): {og_img}"

    def test_card_page_unknown_share_id_404(self):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/does-not-exist-xyz/card-page",
            params={"format": "post"}, timeout=20,
        )
        assert r.status_code == 404

    def test_human_ua_increments_views(self, shared_prospect, auth_headers):
        share_id = shared_prospect["share_id"]
        pid = shared_prospect["pid"]
        # Read current views
        p0 = requests.get(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                          headers=auth_headers, timeout=15).json()
        views_before = (p0.get("share_stats") or {}).get("views", 0)
        # Human UA
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/{share_id}/card-page",
            params={"format": "post"},
            headers={"User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                                    "Chrome/126.0.0.0 Safari/537.36")},
            timeout=20,
        )
        assert r.status_code == 200
        p1 = requests.get(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                          headers=auth_headers, timeout=15).json()
        views_after = (p1.get("share_stats") or {}).get("views", 0)
        assert views_after == views_before + 1, f"views did not increment: {views_before}→{views_after}"

    def test_bot_ua_does_not_increment_views(self, shared_prospect, auth_headers):
        share_id = shared_prospect["share_id"]
        pid = shared_prospect["pid"]
        p0 = requests.get(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                          headers=auth_headers, timeout=15).json()
        views_before = (p0.get("share_stats") or {}).get("views", 0)
        # Bot UA
        r = requests.get(
            f"{BASE_URL}/api/recruiting/public/{share_id}/card-page",
            params={"format": "post"},
            headers={"User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"},
            timeout=20,
        )
        assert r.status_code == 200
        p1 = requests.get(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                          headers=auth_headers, timeout=15).json()
        views_after = (p1.get("share_stats") or {}).get("views", 0)
        assert views_after == views_before, f"bot UA should NOT increment views: {views_before}→{views_after}"
