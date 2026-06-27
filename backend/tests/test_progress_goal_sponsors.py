"""
Tests for the new Athlete Progress enhancements:
 - POST/DELETE /api/calculator-results/goal
 - GET/POST/DELETE /api/calculator-results/sponsors
 - GET /api/calculator-results/sponsor-logo/{sid} (public)
 - GET /api/calculator-results/series (includes goal+sponsors)
 - GET /api/calculator-results/progress-pdf (authed)
 - POST /api/calculator-results/share + GET /public/{sid} + /public/{sid}/pdf
"""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
SUPER_EMAIL = "juegolaureado@gmail.com"
SUPER_PASS = "LordTraining2026!"

CALC = "calc-1rm"
LABEL = "1RM Promedio"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASS}, timeout=30)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text[:200]}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok, f"no token in login: {r.json()}"
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def athlete_id(session):
    # Find an existing athlete with calc-1rm data; else pick first available and seed
    r = session.get(f"{BASE_URL}/api/athletes")
    assert r.status_code == 200, r.text[:200]
    items = r.json() if isinstance(r.json(), list) else r.json().get("athletes") or r.json().get("results") or []
    assert items, "no athletes for super admin"
    # Prefer 'sds' or first
    aid = None
    for a in items:
        if (a.get("name") or "").lower() == "sds":
            aid = a.get("id"); break
    if not aid:
        aid = items[0].get("id")
    assert aid, "no athlete id"
    return aid


@pytest.fixture(scope="module")
def seeded_results(session, athlete_id):
    """Ensure at least 3 calc-1rm results exist for this athlete."""
    r = session.get(f"{BASE_URL}/api/calculator-results", params={"athlete_id": athlete_id})
    assert r.status_code == 200
    existing = [x for x in r.json().get("results", [])
                if x.get("calculator") == CALC and (x.get("headline") or {}).get("label") == LABEL]
    created = []
    if len(existing) < 3:
        for v in (110, 116, 122):
            payload = {
                "athlete_id": athlete_id, "calculator": CALC, "title": "1RM — Repetición Máxima",
                "color": "#3B82F6",
                "headline": {"label": LABEL, "value": str(v), "unit": "kg"},
                "items": [], "note": "TEST_seed"
            }
            rr = session.post(f"{BASE_URL}/api/calculator-results", json=payload)
            assert rr.status_code == 200, rr.text[:200]
            created.append(rr.json().get("id"))
    yield {"created": created}
    # Cleanup only what we created
    for rid in created:
        session.delete(f"{BASE_URL}/api/calculator-results/{rid}")


# ───────────────── SERIES (baseline) ─────────────────
class TestSeries:
    def test_series_returns_points_goal_sponsors_keys(self, session, athlete_id, seeded_results):
        r = session.get(f"{BASE_URL}/api/calculator-results/series",
                        params={"athlete_id": athlete_id, "calculator": CALC, "label": LABEL})
        assert r.status_code == 200, r.text[:200]
        data = r.json()
        assert "points" in data and len(data["points"]) >= 3
        assert "goal" in data         # may be None
        assert "sponsors" in data      # list
        assert isinstance(data["sponsors"], list)


# ───────────────── GOAL ─────────────────
class TestGoal:
    def test_set_goal_and_series_progress_pct(self, session, athlete_id, seeded_results):
        target = 130.0
        r = session.post(f"{BASE_URL}/api/calculator-results/goal",
                         json={"athlete_id": athlete_id, "calculator": CALC,
                               "metric_label": LABEL, "target_value": target})
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body.get("ok") is True
        assert body.get("target_value") == target

        # Series should now include goal with progress_pct
        s = session.get(f"{BASE_URL}/api/calculator-results/series",
                        params={"athlete_id": athlete_id, "calculator": CALC, "label": LABEL})
        assert s.status_code == 200
        goal = s.json().get("goal")
        assert goal is not None
        assert goal.get("target_value") == target
        assert 0 <= goal.get("progress_pct") <= 100
        assert isinstance(goal.get("reached"), bool)

    def test_delete_goal_removes_it(self, session, athlete_id, seeded_results):
        r = session.delete(f"{BASE_URL}/api/calculator-results/goal",
                           params={"athlete_id": athlete_id, "calculator": CALC, "metric_label": LABEL})
        assert r.status_code == 200, r.text[:200]
        s = session.get(f"{BASE_URL}/api/calculator-results/series",
                        params={"athlete_id": athlete_id, "calculator": CALC, "label": LABEL})
        assert s.status_code == 200
        assert s.json().get("goal") in (None, {})


# ───────────────── SPONSORS ─────────────────
def _tiny_png():
    # 1x1 transparent PNG
    import base64
    return base64.b64decode(
        b"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAfbLI3wAAAABJRU5ErkJggg=="
    )


class TestSponsors:
    @pytest.fixture(scope="class")
    def uploaded(self, session):
        files = {"file": ("logo.png", io.BytesIO(_tiny_png()), "image/png")}
        data = {"name": "TEST_Sponsor"}
        # multipart -- must NOT send the Content-Type:application/json header from session
        headers = {k: v for k, v in session.headers.items() if k.lower() != "content-type"}
        r = requests.post(f"{BASE_URL}/api/calculator-results/sponsors",
                          files=files, data=data, headers=headers, timeout=30)
        assert r.status_code == 200, r.text[:200]
        body = r.json()
        assert body.get("id") and body.get("logo_url")
        yield body
        # cleanup
        requests.delete(f"{BASE_URL}/api/calculator-results/sponsors/{body['id']}", headers=headers, timeout=30)

    def test_list_sponsors_contains_uploaded(self, session, uploaded):
        r = session.get(f"{BASE_URL}/api/calculator-results/sponsors")
        assert r.status_code == 200
        ids = [s.get("id") for s in r.json()]
        assert uploaded["id"] in ids

    def test_sponsor_logo_public_no_auth(self, uploaded):
        # No auth header
        r = requests.get(f"{BASE_URL}{uploaded['logo_url']}", timeout=30)
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("image/")
        assert len(r.content) > 50  # has bytes

    def test_series_includes_sponsor(self, session, athlete_id, seeded_results, uploaded):
        r = session.get(f"{BASE_URL}/api/calculator-results/series",
                        params={"athlete_id": athlete_id, "calculator": CALC, "label": LABEL})
        assert r.status_code == 200
        ids = [s.get("id") for s in r.json().get("sponsors", [])]
        assert uploaded["id"] in ids


# ───────────────── PDFs (authed + public share) ─────────────────
class TestPdfAndShare:
    def test_authed_progress_pdf(self, session, athlete_id, seeded_results):
        r = session.get(f"{BASE_URL}/api/calculator-results/progress-pdf",
                        params={"athlete_id": athlete_id, "calculator": CALC, "label": LABEL})
        assert r.status_code == 200, r.text[:200]
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"

    def test_share_and_public_endpoints(self, session, athlete_id, seeded_results):
        r = session.post(f"{BASE_URL}/api/calculator-results/share",
                         json={"athlete_id": athlete_id, "calculator": CALC, "metric_label": LABEL})
        assert r.status_code == 200, r.text[:200]
        sid = r.json().get("share_id")
        assert sid

        # Public series (no auth)
        p = requests.get(f"{BASE_URL}/api/calculator-results/public/{sid}", timeout=30)
        assert p.status_code == 200, p.text[:200]
        body = p.json()
        assert body.get("points")
        assert "goal" in body and "sponsors" in body

        # Public PDF
        pdf = requests.get(f"{BASE_URL}/api/calculator-results/public/{sid}/pdf",
                           params={"origin": BASE_URL}, timeout=60)
        assert pdf.status_code == 200, pdf.text[:200]
        assert pdf.content[:4] == b"%PDF"


# ───────────────── Goal again + sponsors → end-to-end goal-in-PDF ─────────────────
class TestGoalInPdf:
    def test_goal_propagates_to_pdf(self, session, athlete_id, seeded_results):
        # Set goal then download PDF; just verify PDF is well-formed (visual inspection elsewhere)
        session.post(f"{BASE_URL}/api/calculator-results/goal",
                     json={"athlete_id": athlete_id, "calculator": CALC,
                           "metric_label": LABEL, "target_value": 130.0})
        try:
            r = session.get(f"{BASE_URL}/api/calculator-results/progress-pdf",
                            params={"athlete_id": athlete_id, "calculator": CALC, "label": LABEL})
            assert r.status_code == 200
            assert r.content[:4] == b"%PDF"
            assert len(r.content) > 1500  # has chart + goal info
        finally:
            session.delete(f"{BASE_URL}/api/calculator-results/goal",
                           params={"athlete_id": athlete_id, "calculator": CALC, "metric_label": LABEL})
