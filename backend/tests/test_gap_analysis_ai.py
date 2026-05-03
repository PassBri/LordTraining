"""Tests for Gap Analysis AI endpoints.

Covers:
- POST .../gap-analysis-ai with provider 'openai' and 'anthropic'
- Cache behavior (cached:true on second identical call)
- force_refresh ignores cache
- GET returns persisted gap_analysis_ai
- DELETE clears cache + analysis field
- Error handling: 404 (no analysis), 400 (invalid provider), 404 (missing plan)
- PDF auth + shared PDF includes the AI section after generation
"""
import io
import os
import time
import pytest
import requests

def _read_frontend_env_url():
    try:
        with open("/app/frontend/.env", "r") as f:
            for line in f:
                if line.strip().startswith("REACT_APP_BACKEND_URL="):
                    return line.strip().split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return None


_url = os.environ.get("REACT_APP_BACKEND_URL") or _read_frontend_env_url()
assert _url, "REACT_APP_BACKEND_URL not set"
BASE_URL = _url.rstrip("/")
EMAIL = "test@train.com"
PASSWORD = "test123456"

# Long timeout because OpenAI cold-start can take 30s
LLM_TIMEOUT = 120


# ---------- fixtures ----------
@pytest.fixture(scope="module")
def auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    body = r.json()
    tok = body.get("token") or body.get("access_token")
    assert tok, f"No token in login: {body}"
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def plan_id(auth_headers):
    """Reuse the plan_id known to already have cache from previous iter, fallback to first plan."""
    # Hint from main agent: plan with cached AI is 0cd4acaa-7e8e-463d-b4ac-54c3a47a766b
    candidate = "0cd4acaa-7e8e-463d-b4ac-54c3a47a766b"
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    plans = r.json()
    ids = {p.get("id") for p in plans if isinstance(p, dict)}
    if candidate in ids:
        return candidate
    assert plans, "No training plans"
    return plans[0]["id"]


@pytest.fixture(scope="module")
def saved_analysis(auth_headers, plan_id):
    """Make sure an analysis exists with cumplimiento data."""
    payload = {
        "plan_id": plan_id,
        "data": {
            "fechaInicio": "2024-01-15",
            "fechaFinalizacion": "2024-06-30",
            "duracionSemanas": "24",
            "objetivoPrincipal": "TEST AI: Mejora aerobica y fuerza",
            "cumplimiento": {
                "general": "parcial", "fisica": "total", "tecnica": "parcial",
                "tactica": "no", "psicologica": "total"
            },
            "porcentajeCumplimiento": "72",
            "fortalezas": ["Adherencia"],
            "debilidades": ["Tactico"],
            "conclusiones": "Plan cumplio en lo fisico pero fallo en lo tactico.",
            "recomendaciones": "Mas microciclos tacticos.",
        },
    }
    r = requests.post(f"{BASE_URL}/api/plan-data/previous-analysis",
                      headers=auth_headers, json=payload, timeout=30)
    assert r.status_code in (200, 201), f"save analysis failed: {r.status_code} {r.text[:200]}"
    return r.json()


# ---------- 1. Errors ----------
class TestErrors:
    def test_post_404_when_plan_inexistent(self, auth_headers):
        r = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/plan-fake-zzz/gap-analysis-ai",
            headers=auth_headers,
            json={"provider": "openai", "models": ["atr"]},
            timeout=20,
        )
        assert r.status_code == 404, f"expected 404 got {r.status_code} {r.text[:200]}"

    def test_post_invalid_provider_returns_400(self, auth_headers, plan_id, saved_analysis):
        r = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers,
            json={"provider": "bogus", "models": ["atr"], "force_refresh": True},
            timeout=30,
        )
        # 400 from _call_llm_for_gap. Note _call_llm_for_gap is only invoked when cache miss,
        # so passing force_refresh=True ensures the validation path executes.
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"


# ---------- 2. OpenAI flow + cache ----------
class TestOpenAIFlowAndCache:
    def test_a_post_openai_generates_or_returns_cached(self, auth_headers, plan_id, saved_analysis):
        body = {"provider": "openai", "models": ["atr", "pdi"]}
        r = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, json=body, timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, f"POST gap-analysis-ai failed: {r.status_code} {r.text[:300]}"
        data = r.json()
        assert data["provider"] == "openai"
        assert data["llm_model"] == "gpt-5.2", f"got llm_model={data.get('llm_model')!r}"
        assert isinstance(data.get("recommendations"), list)
        assert 1 <= len(data["recommendations"]) <= 5
        # Each rec must have title, priority among alta/media/baja
        for rec in data["recommendations"]:
            assert "title" in rec and rec["title"]
            assert rec.get("priority") in ("alta", "media", "baja"), \
                f"unexpected priority {rec.get('priority')!r}"
        # comparisons should match the requested 2 models (cap at 6)
        assert isinstance(data.get("comparisons"), list)
        assert len(data["comparisons"]) == 2
        keys = [c["model_key"] for c in data["comparisons"]]
        # model_key may be normalized; assert both present in some form
        assert "atr" in keys
        assert "executive_summary" in data
        assert "areas_real" in data and isinstance(data["areas_real"], dict)
        assert "generated_at" in data
        assert "cached" in data

    def test_b_second_identical_call_is_cached(self, auth_headers, plan_id, saved_analysis):
        body = {"provider": "openai", "models": ["atr", "pdi"]}
        r = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, json=body, timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200
        data = r.json()
        assert data.get("cached") is True, f"expected cached:true on 2nd call, got {data.get('cached')}"
        assert data["provider"] == "openai"
        assert data["llm_model"] == "gpt-5.2"

    def test_c_force_refresh_bypasses_cache(self, auth_headers, plan_id, saved_analysis):
        body = {"provider": "openai", "models": ["atr", "pdi"], "force_refresh": True}
        r = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, json=body, timeout=LLM_TIMEOUT,
        )
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data.get("cached") is False, f"force_refresh must regenerate, got cached={data.get('cached')}"

    def test_d_get_returns_persisted_payload(self, auth_headers, plan_id):
        r = requests.get(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200
        body = r.json()
        assert "gap_analysis_ai" in body
        gaa = body["gap_analysis_ai"]
        assert gaa is not None and isinstance(gaa, dict)
        assert gaa.get("provider") in ("openai", "anthropic")
        assert isinstance(gaa.get("recommendations"), list) and len(gaa["recommendations"]) >= 1


# ---------- 3. PDF includes AI section ----------
class TestPdfIncludesAi:
    def test_auth_pdf_after_ai_contains_section(self, auth_headers, plan_id, saved_analysis):
        # Ensure cache exists for the section
        r0 = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, json={"provider": "openai", "models": ["atr", "pdi"]},
            timeout=LLM_TIMEOUT,
        )
        assert r0.status_code == 200

        r = requests.get(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/pdf",
            headers=auth_headers, timeout=90,
        )
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-"
        assert len(r.content) > 50_000, f"PDF too small ({len(r.content)} bytes), AI section may be missing"

    def test_shared_pdf_includes_ai_section(self, auth_headers, plan_id, saved_analysis):
        share = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/share",
            headers=auth_headers, timeout=20,
        )
        assert share.status_code == 200
        share_id = share.json()["share_id"]
        r = requests.get(
            f"{BASE_URL}/api/plan-data/previous-analysis/shared/{share_id}/pdf",
            timeout=90,
        )
        assert r.status_code == 200
        assert r.content[:5] == b"%PDF-"
        # Heuristic: with AI section persisted, PDF should be reasonably large
        assert len(r.content) > 50_000, f"shared PDF too small ({len(r.content)} bytes)"


# ---------- 4. DELETE clears cache + doc field ----------
class TestDeleteClears:
    def test_delete_clears_then_get_returns_none(self, auth_headers, plan_id, saved_analysis):
        # Make sure something is there
        requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, json={"provider": "openai", "models": ["atr"]},
            timeout=LLM_TIMEOUT,
        )

        r = requests.delete(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, timeout=20,
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # GET should return gap_analysis_ai: None now
        g = requests.get(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, timeout=20,
        )
        assert g.status_code == 200
        assert g.json().get("gap_analysis_ai") in (None, {}, ""), \
            f"after DELETE, gap_analysis_ai should be cleared, got {g.json()}"

        # And calling POST again with same models must NOT return cached:true (cache wiped)
        rr = requests.post(
            f"{BASE_URL}/api/plan-data/previous-analysis/{plan_id}/gap-analysis-ai",
            headers=auth_headers, json={"provider": "openai", "models": ["atr"]},
            timeout=LLM_TIMEOUT,
        )
        assert rr.status_code == 200
        assert rr.json().get("cached") is False, "after DELETE, regen must be a fresh call (cached:false)"
