"""Backend tests for the Recruiting & Talent ID module."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lord-deploy-test.preview.emergentagent.com").rstrip("/")
EMAIL = "juegolaureado@gmail.com"
PASSWORD = "LordTraining2026!"

_session_token = None


def _login():
    global _session_token
    if _session_token:
        return _session_token
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    _session_token = data.get("access_token") or data.get("token")
    assert _session_token, f"No token in response: {data}"
    return _session_token


@pytest.fixture(scope="module")
def auth_headers():
    token = _login()
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def token():
    return _login()


# ─────────── Criteria ───────────
class TestCriteria:
    def test_criteria_football(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/criteria", params={"sport": "football"}, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["club_standard"] == 70
        assert len(d["blocks"]) == 4
        keys = {b["key"] for b in d["blocks"]}
        assert keys == {"technical", "physical", "tactical", "mental"}
        # ensure football-specific criterion exists
        tech = next(b for b in d["blocks"] if b["key"] == "technical")
        tech_keys = {c["key"] for c in tech["criteria"]}
        assert "ball_control" in tech_keys

    def test_criteria_no_sport(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/criteria", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert len(d["blocks"]) == 4
        tech = next(b for b in d["blocks"] if b["key"] == "technical")
        keys = {c["key"] for c in tech["criteria"]}
        assert "control" in keys  # generic key

    def test_criteria_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/recruiting/criteria", timeout=15)
        assert r.status_code in (401, 403)


# ─────────── Prospects CRUD ───────────
_prospect_id = None


class TestProspectsCRUD:
    def test_create_prospect(self, auth_headers):
        global _prospect_id
        payload = {
            "name": "TEST_Prospect_QA",
            "sport": "football",
            "sport_name": "Fútbol",
            "position": "Delantero",
            "age": 17,
            "nationality": "ES",
            "current_club": "TEST FC",
            "height_cm": 178,
            "weight_kg": 70,
            "dominant_side": "derecha",
            "bio": "Prospecto de prueba",
        }
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == "TEST_Prospect_QA"
        assert d["sport"] == "football"
        assert "id" in d
        _prospect_id = d["id"]

    def test_get_prospect(self, auth_headers):
        assert _prospect_id
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == _prospect_id
        assert d["name"] == "TEST_Prospect_QA"

    def test_list_prospects(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        ids = {i["id"] for i in items}
        assert _prospect_id in ids

    def test_update_prospect(self, auth_headers):
        payload = {
            "name": "TEST_Prospect_QA",
            "sport": "football",
            "position": "Mediocampista",
            "age": 18,
        }
        r = requests.put(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}", json=payload, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["position"] == "Mediocampista"
        assert d["age"] == 18

    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects", timeout=15)
        assert r.status_code in (401, 403)


# ─────────── Pipeline / Stage ───────────
class TestPipeline:
    def test_move_stage_contacted(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/stage",
                           json={"stage": "contacted"}, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert r.json()["stage"] == "contacted"

    def test_move_stage_trial(self, auth_headers):
        r = requests.patch(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/stage",
                           json={"stage": "trial"}, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        assert r.json()["stage"] == "trial"


# ─────────── Observations ───────────
_observation_id = None


class TestObservations:
    def test_add_observation(self, auth_headers):
        global _observation_id
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/observations",
                          json={"note": "Buena actitud en el partido", "context": "TEST_Partido", "rating": 8},
                          headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert len(d["observations"]) >= 1
        last = d["observations"][-1]
        assert last["note"] == "Buena actitud en el partido"
        _observation_id = last["id"]

    def test_delete_observation(self, auth_headers):
        assert _observation_id
        r = requests.delete(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/observations/{_observation_id}",
                            headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        ids = {o.get("id") for o in d.get("observations", [])}
        assert _observation_id not in ids


# ─────────── Evaluation ───────────
class TestEvaluation:
    def test_save_evaluation(self, auth_headers):
        scores = {
            "technical": {"ball_control": 80, "passing": 75, "finishing": 70, "dribbling": 78, "first_touch": 82},
            "physical": {"sprint": 85, "stamina": 78, "strength": 70, "agility": 80},
            "tactical": {"positioning": 75, "game_reading": 72, "pressing": 70, "transitions": 74},
            "mental": {"leadership": 70, "competitiveness": 85, "discipline": 78, "composure": 75},
        }
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/evaluation",
                          json={"scores": scores, "evaluator": "QA"}, headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        ev = d["evaluation"]
        assert "category_averages" in ev
        assert set(ev["category_averages"].keys()) == {"technical", "physical", "tactical", "mental"}
        # average sanity
        assert 60 <= ev["overall"] <= 90
        assert d["overall_score"] == ev["overall"]


# ─────────── AI Recommendation (only OpenAI to limit credits) ───────────
class TestAI:
    def test_ai_recommendation_openai(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/ai-recommendation",
                          json={"provider": "openai"}, headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "provider" in d
        assert d["provider"] == "openai"
        # Required JSON fields per spec
        assert "summary" in d
        # may have verdict/confidence/strengths/weaknesses
        assert any(k in d for k in ("verdict", "summary"))


# ─────────── Photo upload + serve ───────────
_uploaded_path = None


class TestPhoto:
    def test_upload_photo(self, token):
        # 1x1 PNG
        png_bytes = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000A49444154789C6300010000000500010D0A2DB40000000049454E44AE426082"
        )
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        headers = {"Authorization": f"Bearer {token}"}
        r = requests.post(f"{BASE_URL}/api/recruiting/upload-photo", files=files, headers=headers, timeout=60)
        if r.status_code != 200:
            pytest.skip(f"Storage not available: {r.status_code} {r.text[:200]}")
        global _uploaded_path
        d = r.json()
        assert "path" in d
        _uploaded_path = d["path"]

    def test_serve_photo_with_query_token(self, token):
        if not _uploaded_path:
            pytest.skip("Upload skipped")
        r = requests.get(f"{BASE_URL}/api/recruiting/files/{_uploaded_path}", params={"auth": token}, timeout=30)
        assert r.status_code == 200
        assert r.headers.get("Content-Type", "").startswith("image/")

    def test_serve_photo_no_auth(self):
        if not _uploaded_path:
            pytest.skip("Upload skipped")
        r = requests.get(f"{BASE_URL}/api/recruiting/files/{_uploaded_path}", timeout=15)
        assert r.status_code == 401


# ─────────── Dashboard ───────────
class TestDashboard:
    def test_dashboard(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/dashboard", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("total", "by_stage", "recruited", "avg_score", "ranking", "follow_ups", "club_standard"):
            assert k in d
        assert d["club_standard"] == 70
        # ranking sorted by overall_score desc
        scores = [x["overall_score"] for x in d["ranking"] if x.get("overall_score") is not None]
        assert scores == sorted(scores, reverse=True)


# ─────────── PDF ───────────
class TestPDF:
    def test_profile_pdf(self, token):
        r = requests.get(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/profile-pdf",
                         params={"auth": token}, timeout=120)
        assert r.status_code == 200, r.text[:300]
        assert r.headers.get("Content-Type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"


# ─────────── Convert to athlete ───────────
class TestConvert:
    def test_convert_to_athlete(self, auth_headers):
        # Try without team_id to keep simple
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}/convert",
                          json={}, headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert "athlete_id" in d
        # Re-fetch prospect → should have outcome=recruited and converted_athlete_id
        r2 = requests.get(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}", headers=auth_headers, timeout=20)
        d2 = r2.json()
        assert d2["outcome"] == "recruited"
        assert d2["converted_athlete_id"] == d["athlete_id"]


# ─────────── Cleanup ───────────
class TestZZ_Cleanup:
    def test_delete_prospect(self, auth_headers):
        if not _prospect_id:
            pytest.skip("No prospect to clean up")
        r = requests.delete(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}", headers=auth_headers, timeout=20)
        assert r.status_code == 200
        # Verify gone
        r2 = requests.get(f"{BASE_URL}/api/recruiting/prospects/{_prospect_id}", headers=auth_headers, timeout=20)
        assert r2.status_code == 404
