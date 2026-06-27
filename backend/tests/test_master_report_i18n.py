"""Test master-report PDF generation with lang parameter (EN, FR)."""
import os
import requests
import pytest

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # fallback to frontend .env via direct read
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL'):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

SUPER_EMAIL = "juegolaureado@gmail.com"
SUPER_PASS = "LordTraining2026!"


@pytest.fixture(scope="module")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": SUPER_EMAIL, "password": SUPER_PASS},
                      timeout=20)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    token = data.get("access_token") or data.get("token")
    assert token, f"No token in response: {data}"
    return token


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


def _make_payload(lang: str):
    return {
        "title": f"TEST_MasterReport_{lang.upper()}",
        "subtitle": "Auto i18n test",
        "style": "atleta",
        "lang": lang,
        "sections": {
            "cover": True, "toc": True, "introduction": True,
            "diagnostic_active": False,
            "conclusions": True,
        },
        "org_name": "TEST Club",
        "coach_name": "TEST Coach",
        "athlete_name": "TEST Athlete",
        "custom_intro": "Testing i18n PDF.",
        "custom_conclusions": "Closing remarks.",
    }


@pytest.mark.parametrize("lang", ["es", "en", "fr"])
def test_master_report_generate_with_lang(headers, lang):
    payload = _make_payload(lang)
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=90)
    assert r.status_code == 200, f"[{lang}] Status {r.status_code}: {r.text[:300]}"
    ct = r.headers.get("content-type", "")
    assert "application/pdf" in ct, f"[{lang}] Wrong content-type: {ct}"
    size = len(r.content)
    assert size > 50_000, f"[{lang}] PDF too small: {size} bytes"
    # PDF magic header
    assert r.content[:4] == b"%PDF", f"[{lang}] Not a real PDF (header={r.content[:8]!r})"
    print(f"[OK] lang={lang} size={size} bytes")


def test_master_report_styles_endpoint(headers):
    r = requests.get(f"{BASE_URL}/api/master-report/styles", headers=headers, timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert "styles" in data and len(data["styles"]) >= 4
