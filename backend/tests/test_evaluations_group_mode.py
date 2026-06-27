"""Tests for POST /api/plan-data/evaluations-export/group (Group/Team evaluation mode).

Validates:
 - Status code, response schema
 - team_avg, ranking ordering (desc by global_pct, with 'rank' field)
 - critical contains only aspects with avg_pct < 60
 - empty athlete_ids returns zeroed structure
 - invalid evaluation_type returns 400
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lordcoach-optimize.preview.emergentagent.com").rstrip("/")

COACH_EMAIL = "test@train.com"
COACH_PASS = "test123456"

# Seeded by main agent
PLAN_ID = "0cd4acaa-7e8e-463d-b4ac-54c3a47a766b"
TEAM_ID = "a773758f-c043-4bb8-8e18-bf5ab1d706c0"
EVAL_TYPE = "physical"  # backend EVAL_META key; frontend URL is /control-physical but maps to type 'physical'


@pytest.fixture(scope="module")
def coach_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": COACH_EMAIL, "password": COACH_PASS},
                      timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    tok = r.json().get("token") or r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="module")
def auth_headers(coach_token):
    return {"Authorization": f"Bearer {coach_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def team_athlete_ids(auth_headers):
    """Resolve athlete_ids from the seeded team roster (team.athletes array)."""
    r = requests.get(f"{BASE_URL}/api/teams", headers=auth_headers, timeout=20)
    assert r.status_code == 200, r.text
    teams = r.json()
    target = next((t for t in teams if t.get("id") == TEAM_ID), None)
    assert target is not None, f"Seeded team {TEAM_ID} not found. Available: {[t.get('id') for t in teams]}"
    aths = target.get("athletes") or []
    assert len(aths) >= 2, f"Expected at least 2 athletes in team, got {aths}"
    return aths


def test_group_endpoint_happy_path(auth_headers, team_athlete_ids):
    payload = {"plan_id": PLAN_ID, "evaluation_type": EVAL_TYPE, "athlete_ids": team_athlete_ids}
    r = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                      json=payload, headers=auth_headers, timeout=30)
    assert r.status_code == 200, f"{r.status_code} -> {r.text}"
    data = r.json()
    # Schema
    for key in ["group_size", "with_data", "team_avg", "ranking", "aspects", "categories", "critical"]:
        assert key in data, f"missing key {key} in response: {data}"
    assert data["group_size"] == len(team_athlete_ids)
    assert data["with_data"] >= 1
    assert isinstance(data["team_avg"], (int, float))
    assert isinstance(data["ranking"], list) and len(data["ranking"]) == len(team_athlete_ids)


def test_ranking_sorted_desc_with_rank_field(auth_headers, team_athlete_ids):
    payload = {"plan_id": PLAN_ID, "evaluation_type": EVAL_TYPE, "athlete_ids": team_athlete_ids}
    data = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                         json=payload, headers=auth_headers, timeout=30).json()
    with_data = [e for e in data["ranking"] if e.get("has_data")]
    assert len(with_data) >= 2, f"Expected >=2 athletes with data, got {with_data}"
    # desc order
    pcts = [e["global_pct"] for e in with_data]
    assert pcts == sorted(pcts, reverse=True), f"ranking not sorted desc: {pcts}"
    # rank field present and sequential 1..N
    for idx, e in enumerate(with_data, start=1):
        assert e.get("rank") == idx, f"rank mismatch at idx {idx}: {e}"
    # Per seeded: Juan ~65, Carlos ~40
    names = {e["name"]: e["global_pct"] for e in with_data}
    assert any("Juan" in n for n in names), f"Juan Pérez missing from ranking: {names}"
    assert any("Carlos" in n for n in names), f"Carlos Pérez missing from ranking: {names}"


def test_critical_only_below_60(auth_headers, team_athlete_ids):
    payload = {"plan_id": PLAN_ID, "evaluation_type": EVAL_TYPE, "athlete_ids": team_athlete_ids}
    data = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                         json=payload, headers=auth_headers, timeout=30).json()
    crit = data.get("critical") or []
    # Every critical aspect must be < 60
    for c in crit:
        assert c["avg_pct"] < 60, f"critical entry not <60: {c}"
    # Per seeded data: Velocidad avg should be ~35 (40+30)/2 → expect at least one critical
    assert len(crit) >= 1, f"Expected critical aspects, got {crit} ; full={data}"
    labels = [c["label"] for c in crit]
    assert any("Velocidad" in lb for lb in labels) or any("velocidad" in lb.lower() for lb in labels), \
        f"Expected 'Velocidad' in critical, got {labels}"


def test_team_avg_value(auth_headers, team_athlete_ids):
    payload = {"plan_id": PLAN_ID, "evaluation_type": EVAL_TYPE, "athlete_ids": team_athlete_ids}
    data = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                         json=payload, headers=auth_headers, timeout=30).json()
    # Per seeded: Juan=65, Carlos=40 -> avg ~52
    assert 45 <= data["team_avg"] <= 60, f"team_avg out of expected range: {data['team_avg']}"


def test_group_empty_athletes(auth_headers):
    payload = {"plan_id": PLAN_ID, "evaluation_type": EVAL_TYPE, "athlete_ids": []}
    r = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                      json=payload, headers=auth_headers, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d == {"group_size": 0, "with_data": 0, "team_avg": 0,
                 "ranking": [], "aspects": [], "categories": [], "critical": []}


def test_group_invalid_eval_type(auth_headers, team_athlete_ids):
    payload = {"plan_id": PLAN_ID, "evaluation_type": "not-a-real-type", "athlete_ids": team_athlete_ids}
    r = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                      json=payload, headers=auth_headers, timeout=20)
    assert r.status_code == 400, f"expected 400 for invalid type, got {r.status_code}: {r.text}"


def test_group_unauthenticated():
    payload = {"plan_id": PLAN_ID, "evaluation_type": EVAL_TYPE, "athlete_ids": ["x"]}
    r = requests.post(f"{BASE_URL}/api/plan-data/evaluations-export/group",
                      json=payload, timeout=20)
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}"
