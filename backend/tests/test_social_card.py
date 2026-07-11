"""Backend tests for the Scouting Social Card generator (Pillow).

Covers:
- GET /api/recruiting/prospects/{pid}/social-card?format=post&auth={token}
- GET /api/recruiting/prospects/{pid}/social-card?format=story&auth={token}
- Authorization via Bearer header and via ?auth= query param
- Prospect with photo/without photo, with evaluation/without evaluation
- 401 without auth, 404 for unknown pid
"""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
EMAIL = "juegolaureado@gmail.com"
PASSWORD = "LordTraining2026!"

# 1x1 valid PNG
_PNG_1x1 = bytes.fromhex(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
    "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
)


def _login():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"No token: {data}"
    return tok


@pytest.fixture(scope="module")
def token():
    return _login()


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Fixtures: create prospects with/without photo/evaluation ----------

@pytest.fixture(scope="module")
def prospect_no_photo(auth_headers):
    """Prospecto SIN foto y SIN evaluación (placeholder path)."""
    payload = {
        "name": "TEST_SocialCard_NoPhoto",
        "sport": "football",
        "sport_name": "Fútbol",
        "position": "Delantero",
        "age": 17,
        "nationality": "ES",
        "current_club": "TEST FC",
        "bio": "Prospecto sin foto",
    }
    r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    # cleanup
    requests.delete(f"{BASE_URL}/api/recruiting/prospects/{pid}", headers=auth_headers, timeout=15)


@pytest.fixture(scope="module")
def prospect_with_photo(auth_headers, token):
    """Prospecto CON foto y CON evaluación."""
    payload = {
        "name": "TEST_SocialCard_WithPhoto",
        "sport": "football",
        "sport_name": "Fútbol",
        "position": "Mediocampista",
        "age": 19,
        "nationality": "ES",
        "current_club": "TEST FC",
    }
    r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]

    # upload photo
    files = {"file": ("test.png", io.BytesIO(_PNG_1x1), "image/png")}
    up = requests.post(
        f"{BASE_URL}/api/recruiting/upload-photo", files=files,
        headers={"Authorization": f"Bearer {token}"}, timeout=60,
    )
    if up.status_code == 200:
        photo_path = up.json().get("path")
        # attach to prospect via PUT
        put_payload = {**payload, "photo_path": photo_path}
        r2 = requests.put(f"{BASE_URL}/api/recruiting/prospects/{pid}", json=put_payload,
                          headers=auth_headers, timeout=20)
        assert r2.status_code == 200, r2.text

    # add evaluation
    scores = {
        "technical": {"ball_control": 80, "passing": 75, "finishing": 70, "dribbling": 78, "first_touch": 82},
        "physical": {"sprint": 85, "stamina": 78, "strength": 70, "agility": 80},
        "tactical": {"positioning": 75, "game_reading": 72, "pressing": 70, "transitions": 74},
        "mental": {"leadership": 70, "competitiveness": 85, "discipline": 78, "composure": 75},
    }
    r3 = requests.post(
        f"{BASE_URL}/api/recruiting/prospects/{pid}/evaluation",
        json={"scores": scores, "evaluator": "QA"}, headers=auth_headers, timeout=20,
    )
    assert r3.status_code == 200, r3.text
    yield pid
    requests.delete(f"{BASE_URL}/api/recruiting/prospects/{pid}", headers=auth_headers, timeout=15)


# ---------- Auth ----------

class TestSocialCardAuth:
    def test_requires_auth(self, prospect_no_photo):
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
                         params={"format": "post"}, timeout=20)
        assert r.status_code == 401

    def test_invalid_token(self, prospect_no_photo):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"format": "post", "auth": "not.a.valid.jwt"}, timeout=20,
        )
        assert r.status_code == 401

    def test_bearer_header_ok(self, prospect_no_photo, auth_headers):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"format": "post"}, headers=auth_headers, timeout=60,
        )
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("image/png")


# ---------- Format post/story with query auth ----------

class TestSocialCardFormats:
    def _assert_png(self, r):
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("image/png")
        assert len(r.content) > 1000, f"PNG too small: {len(r.content)}"
        assert r.content[:8] == b"\x89PNG\r\n\x1a\n", "Not a valid PNG signature"

    def test_post_no_photo_no_eval(self, prospect_no_photo, token):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"format": "post", "auth": token}, timeout=60,
        )
        self._assert_png(r)

    def test_story_no_photo_no_eval(self, prospect_no_photo, token):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"format": "story", "auth": token}, timeout=60,
        )
        self._assert_png(r)

    def test_post_with_photo_and_eval(self, prospect_with_photo, token):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_with_photo}/social-card",
            params={"format": "post", "auth": token}, timeout=60,
        )
        self._assert_png(r)

    def test_story_with_photo_and_eval(self, prospect_with_photo, token):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_with_photo}/social-card",
            params={"format": "story", "auth": token}, timeout=60,
        )
        self._assert_png(r)

    def test_default_format_is_post(self, prospect_no_photo, token):
        # sin ?format=... debería devolver post (por defecto)
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"auth": token}, timeout=60,
        )
        self._assert_png(r)

    def test_unknown_prospect_404(self, token):
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/does-not-exist-xyz/social-card",
            params={"format": "post", "auth": token}, timeout=30,
        )
        assert r.status_code == 404


# ---------- Aspect ratio sanity ----------

class TestSocialCardDimensions:
    def test_post_aspect_4_5(self, prospect_no_photo, token):
        try:
            from PIL import Image
        except Exception:
            pytest.skip("Pillow not available in test env")
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"format": "post", "auth": token}, timeout=60,
        )
        assert r.status_code == 200
        im = Image.open(io.BytesIO(r.content))
        w, h = im.size
        ratio = w / h
        assert abs(ratio - (4 / 5)) < 0.02, f"post aspect not ~4:5 (got {w}x{h})"

    def test_story_aspect_9_16(self, prospect_no_photo, token):
        try:
            from PIL import Image
        except Exception:
            pytest.skip("Pillow not available in test env")
        r = requests.get(
            f"{BASE_URL}/api/recruiting/prospects/{prospect_no_photo}/social-card",
            params={"format": "story", "auth": token}, timeout=60,
        )
        assert r.status_code == 200
        im = Image.open(io.BytesIO(r.content))
        w, h = im.size
        ratio = w / h
        assert abs(ratio - (9 / 16)) < 0.02, f"story aspect not ~9:16 (got {w}x{h})"
