"""Tests T9 — Panel de Federaciones / Instituciones"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
EMAIL = "test@train.com"
PASSWORD = "test123456"


@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("access_token") or r.json().get("token")
    assert token, f"No token in {r.json()}"
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def federation_id(auth_headers):
    r = requests.get(f"{BASE_URL}/api/federations/list", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data and "total" in data
    if data["total"] == 0:
        pytest.skip("No federations available for this user")
    item = data["items"][0]
    assert "_role" in item
    assert item["_role"] in ("owner", "assigned")
    assert "id" in item
    return item["id"]


# ---------------- LIST ----------------

def test_list_federations(auth_headers):
    r = requests.get(f"{BASE_URL}/api/federations/list", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "total" in data
    assert isinstance(data["items"], list)
    if data["total"] > 0:
        e = data["items"][0]
        for key in ("_role", "_descendant_count", "_clubs_count", "_athletes_count", "_coaches_count"):
            assert key in e, f"Missing {key}"


def test_list_unauthenticated():
    r = requests.get(f"{BASE_URL}/api/federations/list", timeout=15)
    assert r.status_code in (401, 403)


# ---------------- STATS ----------------

def test_stats(auth_headers, federation_id):
    r = requests.get(f"{BASE_URL}/api/federations/stats/{federation_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    s = r.json()
    expected_keys = ["clubs", "schools", "teams", "athletes", "coaches",
                     "plans_active", "plans_total", "competitions_linked", "evaluations_30d"]
    for k in expected_keys:
        assert k in s, f"Missing KPI {k}"
        assert isinstance(s[k], int)
    # Demo data assertions
    assert s["clubs"] >= 2
    assert s["schools"] >= 1
    assert s["athletes"] >= 2
    assert s["coaches"] >= 5


# ---------------- TREE ----------------

def test_tree(auth_headers, federation_id):
    r = requests.get(f"{BASE_URL}/api/federations/tree/{federation_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    tree = r.json()
    assert tree["id"] == federation_id
    assert "children" in tree and isinstance(tree["children"], list)
    assert "athletes" in tree
    assert len(tree["children"]) >= 1
    # check recursive structure
    child = tree["children"][0]
    assert "id" in child and "children" in child


# ---------------- COACHES ----------------

def test_list_coaches(auth_headers, federation_id):
    r = requests.get(f"{BASE_URL}/api/federations/coaches/{federation_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data and "roles" in data
    assert "head_coach" in data["roles"]
    if data["items"]:
        item = data["items"][0]
        assert "coach_id" in item and "assignments" in item
        if item["assignments"]:
            a = item["assignments"][0]
            for k in ("entity_id", "role", "role_label", "entity_name"):
                assert k in a


# ---------------- ASSIGN / DELETE COACH ----------------

def test_assign_invalid_role(auth_headers, federation_id):
    r = requests.post(f"{BASE_URL}/api/federations/assign-coach", headers=auth_headers,
                      json={"coach_id": "fake-id", "coach_name": "Tester",
                            "entity_id": federation_id, "role": "invalid_role"}, timeout=15)
    assert r.status_code == 400


def test_assign_and_delete_coach(auth_headers, federation_id):
    # assign
    r = requests.post(f"{BASE_URL}/api/federations/assign-coach", headers=auth_headers,
                      json={"coach_id": "TEST_coach_pytest",
                            "coach_name": "TEST Coach Pytest",
                            "entity_id": federation_id, "role": "physio",
                            "notes": "pytest"}, timeout=15)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["role"] == "physio"
    assert doc["entity_id"] == federation_id
    aid = doc["id"]

    # verify it appears
    r2 = requests.get(f"{BASE_URL}/api/federations/coaches/{federation_id}",
                      headers=auth_headers, timeout=15)
    assert r2.status_code == 200
    found = any(any(x.get("id") == aid for x in c["assignments"]) for c in r2.json()["items"])
    assert found, "assignment not found after creation"

    # delete
    r3 = requests.delete(f"{BASE_URL}/api/federations/assign-coach/{aid}",
                         headers=auth_headers, timeout=15)
    assert r3.status_code == 200
    assert r3.json().get("deleted") is True


# ---------------- PLANS ----------------

def test_plans(auth_headers, federation_id):
    r = requests.get(f"{BASE_URL}/api/federations/plans/{federation_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    if data["items"]:
        assert "athlete_name" in data["items"][0]


# ---------------- COMPETITIONS ----------------

def test_competitions(auth_headers, federation_id):
    r = requests.get(f"{BASE_URL}/api/federations/competitions/{federation_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200
    assert "items" in r.json()


# ---------------- COMPLIANCE ----------------

def test_compliance(auth_headers, federation_id):
    r = requests.get(f"{BASE_URL}/api/federations/compliance/{federation_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "items" in data
    for item in data["items"]:
        for k in ("id", "name", "type", "athletes", "evaluations", "avg_pct"):
            assert k in item


# ---------------- 403 unauthorized entity ----------------

def test_unauthorized_entity(auth_headers):
    fake_id = "00000000-0000-0000-0000-000000000000"
    r = requests.get(f"{BASE_URL}/api/federations/stats/{fake_id}",
                     headers=auth_headers, timeout=15)
    assert r.status_code in (403, 404)


# ---------------- MASTER REPORT STYLES ----------------

def test_master_report_styles_includes_federation(auth_headers):
    r = requests.get(f"{BASE_URL}/api/master-report/styles",
                     headers=auth_headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    items = data.get("items") or data.get("styles") or data
    if isinstance(items, dict):
        items = items.get("items") or items.get("styles") or []
    keys = []
    for it in items:
        if isinstance(it, dict):
            keys.append(it.get("id") or it.get("key") or it.get("name"))
        else:
            keys.append(it)
    assert len(items) >= 6, f"Expected >=6 styles, got {len(items)}: {keys}"
    assert "federation" in keys, f"federation not in styles: {keys}"
