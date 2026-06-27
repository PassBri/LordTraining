"""Backend tests for Recruiting Phase 2 features:
- Alerts (/recruiting/alerts)
- Settings (/recruiting/settings GET/PUT)
- Contacts CRUD (/recruiting/contacts)
- Origin map (/recruiting/map)
- New prospect fields: contract_end, origin_city, origin_country, origin_lat/lng, sponsorships expires_at
"""
import os
import pytest
import requests
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")
EMAIL = "juegolaureado@gmail.com"
PASSWORD = "LordTraining2026!"

_token = None


def _login():
    global _token
    if _token:
        return _token
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    _token = data.get("access_token") or data.get("token")
    assert _token
    return _token


@pytest.fixture(scope="module")
def headers():
    return {"Authorization": f"Bearer {_login()}", "Content-Type": "application/json"}


# Track created entities for cleanup
_created_prospects = []
_created_contacts = []


@pytest.fixture(scope="module", autouse=True)
def cleanup(headers):
    yield
    for pid in _created_prospects:
        try:
            requests.delete(f"{BASE_URL}/api/recruiting/prospects/{pid}", headers=headers, timeout=15)
        except Exception:
            pass
    for cid in _created_contacts:
        try:
            requests.delete(f"{BASE_URL}/api/recruiting/contacts/{cid}", headers=headers, timeout=15)
        except Exception:
            pass


# ─────────── SETTINGS ───────────
class TestSettings:
    def test_get_settings_defaults(self, headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/settings", headers=headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert "eval_days" in d and "expiry_days" in d
        assert isinstance(d["eval_days"], int)
        assert isinstance(d["expiry_days"], int)

    def test_update_and_persist_settings(self, headers):
        # Set custom values
        r = requests.put(f"{BASE_URL}/api/recruiting/settings",
                         json={"eval_days": 21, "expiry_days": 45}, headers=headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        assert d["eval_days"] == 21
        assert d["expiry_days"] == 45
        # Verify persistence via GET
        r2 = requests.get(f"{BASE_URL}/api/recruiting/settings", headers=headers, timeout=20)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["eval_days"] == 21
        assert d2["expiry_days"] == 45
        # Restore defaults
        requests.put(f"{BASE_URL}/api/recruiting/settings",
                     json={"eval_days": 14, "expiry_days": 30}, headers=headers, timeout=20)


# ─────────── PROSPECT NEW FIELDS ───────────
class TestProspectNewFields:
    def test_create_prospect_with_origin_and_contract(self, headers):
        payload = {
            "name": "TEST_Phase2_Origin",
            "sport": "football",
            "sport_name": "Fútbol",
            "stage": "trial",
            "origin_city": "Bogotá",
            "origin_country": "Colombia",
            "origin_lat": 4.71,
            "origin_lng": -74.07,
            "contract_end": (datetime.now(timezone.utc) + timedelta(days=5)).date().isoformat(),
            "sponsorships": [
                {"name": "TEST_Sponsor_X", "expires_at": (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat()}
            ],
        }
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=headers, timeout=20)
        assert r.status_code in (200, 201), f"Create failed: {r.status_code} {r.text}"
        d = r.json()
        pid = d["id"]
        _created_prospects.append(pid)
        assert d["origin_city"] == "Bogotá"
        assert d["origin_country"] == "Colombia"
        assert d["origin_lat"] == 4.71
        assert d["origin_lng"] == -74.07
        assert d["contract_end"]
        assert d.get("sponsorships") and d["sponsorships"][0]["expires_at"]
        # Re-fetch to verify persistence
        g = requests.get(f"{BASE_URL}/api/recruiting/prospects/{pid}", headers=headers, timeout=20)
        assert g.status_code == 200
        gd = g.json()
        assert gd["origin_country"] == "Colombia"
        assert gd["origin_city"] == "Bogotá"

    def test_update_prospect_origin_fields(self, headers):
        # Create blank
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects",
                          json={"name": "TEST_Phase2_Update", "sport": "football", "sport_name": "Fútbol"},
                          headers=headers, timeout=20)
        assert r.status_code in (200, 201)
        pid = r.json()["id"]
        _created_prospects.append(pid)
        # Update with new fields (PUT requires name)
        up = requests.put(f"{BASE_URL}/api/recruiting/prospects/{pid}",
                          json={"name": "TEST_Phase2_Update", "sport": "football",
                                "origin_country": "Argentina", "origin_city": "Buenos Aires",
                                "contract_end": "2026-12-31"},
                          headers=headers, timeout=20)
        assert up.status_code == 200, up.text
        ud = up.json()
        assert ud["origin_country"] == "Argentina"
        assert ud["origin_city"] == "Buenos Aires"
        assert ud["contract_end"] == "2026-12-31"


# ─────────── ALERTS ───────────
class TestAlerts:
    def test_alerts_response_shape(self, headers):
        r = requests.get(f"{BASE_URL}/api/recruiting/alerts", headers=headers, timeout=20)
        assert r.status_code == 200
        d = r.json()
        for k in ("alerts", "counts", "total", "settings"):
            assert k in d, f"missing key {k} in {d.keys()}"
        assert isinstance(d["alerts"], list)
        assert isinstance(d["counts"], dict)
        for sev in ("danger", "warning", "info"):
            assert sev in d["counts"]

    def test_alerts_contract_and_sponsor_expiring(self, headers):
        # Create active prospect (trial, no outcome) with near contract_end & sponsorship
        ce = (datetime.now(timezone.utc) + timedelta(days=5)).date().isoformat()
        se = (datetime.now(timezone.utc) + timedelta(days=10)).date().isoformat()
        payload = {
            "name": "TEST_Phase2_AlertExp",
            "sport": "football",
            "sport_name": "Fútbol",
            "stage": "trial",
            "contract_end": ce,
            "sponsorships": [{"name": "TEST_Brand_Alert", "expires_at": se}],
        }
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=headers, timeout=20)
        assert r.status_code in (200, 201), r.text
        pid = r.json()["id"]
        _created_prospects.append(pid)

        a = requests.get(f"{BASE_URL}/api/recruiting/alerts", headers=headers, timeout=20)
        assert a.status_code == 200
        ad = a.json()
        types_for_pid = {x["type"] for x in ad["alerts"] if x.get("prospect_id") == pid}
        assert "contract_expiring" in types_for_pid, f"contract_expiring not found in {types_for_pid}"
        assert "sponsor_expiring" in types_for_pid, f"sponsor_expiring not found in {types_for_pid}"

    def test_alerts_excludes_recruited_or_declined(self, headers):
        ce = (datetime.now(timezone.utc) + timedelta(days=3)).date().isoformat()
        # Create with outcome=declined directly
        payload = {
            "name": "TEST_Phase2_Declined",
            "sport": "football",
            "sport_name": "Fútbol",
            "stage": "decision",
            "outcome": "declined",
            "contract_end": ce,
        }
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects", json=payload, headers=headers, timeout=20)
        assert r.status_code in (200, 201), r.text
        pid = r.json()["id"]
        _created_prospects.append(pid)

        a = requests.get(f"{BASE_URL}/api/recruiting/alerts", headers=headers, timeout=20)
        assert a.status_code == 200
        ad = a.json()
        pids = {x.get("prospect_id") for x in ad["alerts"]}
        assert pid not in pids, "Declined prospect should not generate alerts"


# ─────────── CONTACTS ───────────
class TestContacts:
    def test_contact_crud_and_filters(self, headers):
        # Create linked prospect first
        rp = requests.post(f"{BASE_URL}/api/recruiting/prospects",
                           json={"name": "TEST_Phase2_LinkedProspect", "sport": "football", "sport_name": "Fútbol"},
                           headers=headers, timeout=20)
        assert rp.status_code in (200, 201)
        prospect_id = rp.json()["id"]
        _created_prospects.append(prospect_id)

        # CREATE
        payload = {
            "name": "TEST_Phase2_Agent",
            "role": "agent",
            "organization": "TestAgency",
            "email": "agent@example.com",
            "phone": "+5491111111",
            "location": "Buenos Aires",
            "notes": "test",
            "linked_prospect_ids": [prospect_id],
        }
        r = requests.post(f"{BASE_URL}/api/recruiting/contacts", json=payload, headers=headers, timeout=20)
        assert r.status_code in (200, 201), r.text
        c = r.json()
        cid = c["id"]
        _created_contacts.append(cid)
        assert c["name"] == "TEST_Phase2_Agent"
        assert c["role"] == "agent"
        assert prospect_id in c["linked_prospect_ids"]

        # LIST (no filter)
        rl = requests.get(f"{BASE_URL}/api/recruiting/contacts", headers=headers, timeout=20)
        assert rl.status_code == 200
        all_ids = {x["id"] for x in rl.json()}
        assert cid in all_ids

        # FILTER by role
        rf = requests.get(f"{BASE_URL}/api/recruiting/contacts?role=agent", headers=headers, timeout=20)
        assert rf.status_code == 200
        for x in rf.json():
            assert x["role"] == "agent"
        assert cid in {x["id"] for x in rf.json()}

        # FILTER by prospect_id
        rp2 = requests.get(f"{BASE_URL}/api/recruiting/contacts?prospect_id={prospect_id}",
                           headers=headers, timeout=20)
        assert rp2.status_code == 200
        ids = {x["id"] for x in rp2.json()}
        assert cid in ids

        # FILTER by role not matching
        rn = requests.get(f"{BASE_URL}/api/recruiting/contacts?role=parent", headers=headers, timeout=20)
        assert rn.status_code == 200
        assert cid not in {x["id"] for x in rn.json()}

        # UPDATE
        upd_payload = {**payload, "role": "parent", "notes": "updated"}
        ru = requests.put(f"{BASE_URL}/api/recruiting/contacts/{cid}", json=upd_payload, headers=headers, timeout=20)
        assert ru.status_code == 200, ru.text
        assert ru.json()["role"] == "parent"
        assert ru.json()["notes"] == "updated"

        # DELETE
        rd = requests.delete(f"{BASE_URL}/api/recruiting/contacts/{cid}", headers=headers, timeout=20)
        assert rd.status_code == 200
        _created_contacts.remove(cid)

        # Verify gone
        rl2 = requests.get(f"{BASE_URL}/api/recruiting/contacts", headers=headers, timeout=20)
        assert cid not in {x["id"] for x in rl2.json()}

        # DELETE again -> 404
        rd2 = requests.delete(f"{BASE_URL}/api/recruiting/contacts/{cid}", headers=headers, timeout=20)
        assert rd2.status_code == 404


# ─────────── MAP ───────────
class TestMap:
    def test_map_response_and_colombia_centroid(self, headers):
        # Create prospect with origin_country Colombia (no exact lat/lng)
        r = requests.post(f"{BASE_URL}/api/recruiting/prospects",
                          json={"name": "TEST_Phase2_MapCO", "sport": "football", "sport_name": "Fútbol",
                                "origin_country": "Colombia"},
                          headers=headers, timeout=20)
        assert r.status_code in (200, 201)
        pid = r.json()["id"]
        _created_prospects.append(pid)

        # Create prospect with no origin -> unlocated
        r2 = requests.post(f"{BASE_URL}/api/recruiting/prospects",
                           json={"name": "TEST_Phase2_MapNone", "sport": "football", "sport_name": "Fútbol"},
                           headers=headers, timeout=20)
        assert r2.status_code in (200, 201)
        pid_none = r2.json()["id"]
        _created_prospects.append(pid_none)

        m = requests.get(f"{BASE_URL}/api/recruiting/map", headers=headers, timeout=20)
        assert m.status_code == 200
        md = m.json()
        for k in ("points", "unlocated", "total"):
            assert k in md
        assert isinstance(md["points"], list)
        assert isinstance(md["unlocated"], int)
        assert md["unlocated"] >= 1  # the MapNone one (plus any existing)

        # Find our Colombia point
        co_point = next((p for p in md["points"] if p["id"] == pid), None)
        assert co_point is not None, "Colombia prospect not in points"
        # Centroid for Colombia is [4.6, -74.3]
        assert abs(co_point["lat"] - 4.6) < 0.5
        assert abs(co_point["lng"] - (-74.3)) < 0.5
        assert co_point["country"] == "Colombia"
        assert co_point.get("exact") is False
