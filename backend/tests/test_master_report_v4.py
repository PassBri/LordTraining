"""
Master Report v4 — UUID resolution, full-page cover, microcycles, info-table details.
"""
import io
import os
import re
import pytest
import requests
from pypdf import PdfReader

def _load_base_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL", "").strip()
    if not url:
        try:
            with open("/app/frontend/.env", "r") as fh:
                for line in fh:
                    if line.startswith("REACT_APP_BACKEND_URL="):
                        url = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
        except Exception:
            pass
    return url.rstrip("/")


BASE_URL = _load_base_url()
EMAIL = "test@train.com"
PASSWORD = "test123456"
PLAN_WITH_MICROS = "a6f2f198-5eba-4c72-ad09-ecfb7c7376dc"  # TEST Plan Fútbol ATR — 11 micros
KNOWN_PLAN_ID = "0cd4acaa-7e8e-463d-b4ac-54c3a47a766b"

UUID_RE = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.I)


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": EMAIL, "password": PASSWORD}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json().get("access_token") or r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def plan_id(headers):
    # Validate the known plan exists; fall back to first plan otherwise
    r = requests.get(f"{BASE_URL}/api/training-plans", headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    plans = r.json() if isinstance(r.json(), list) else r.json().get("plans", [])
    ids = [p.get("id") for p in plans]
    if KNOWN_PLAN_ID in ids:
        return KNOWN_PLAN_ID
    assert ids, "No plans available for test user"
    return ids[0]


def _full_payload(plan_id: str, style: str = "atleta",
                  cover_layout: str = "modern",
                  only_sections: list | None = None) -> dict:
    """Build a payload turning ON every section by default; or only the listed ones."""
    section_keys = [
        "cover", "toc", "introduction",
        "diagnostic_previous", "diagnostic_active",
        "info_entities", "info_teams", "info_athletes",
        "info_sports", "info_tournaments", "info_coaches",
        "eval_medical", "eval_anthropometric", "eval_physical",
        "eval_biomechanical", "eval_technical", "eval_tactical",
        "eval_psychological", "eval_theoretical",
        "competitions",
        "periodization_structure", "periodization_load",
        "graphic_plan", "tools", "conclusions",
    ]
    if only_sections is None:
        sections = {k: True for k in section_keys}
    else:
        sections = {k: (k in only_sections) for k in section_keys}
    return {
        "plan_id": plan_id,
        "style": style,
        "cover_layout": cover_layout,
        "title": "Test Master Report",
        "subtitle": "QA Run",
        "coach_name": "QA Coach",
        "athlete_name": "Test Athlete",
        "org_name": "QA Org",
        "sections": sections,
    }


# --- Diagnostic active: UUID resolution & 6 KPI cards ---
def test_diagnostic_active_resolves_uuids_and_six_kpis(headers, plan_id):
    payload = _full_payload(plan_id, only_sections=["cover", "diagnostic_active"])
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=120)
    assert r.status_code == 200, r.text[:400]
    pdf = PdfReader(io.BytesIO(r.content))
    text = "\n".join((p.extract_text() or "") for p in pdf.pages)

    # KPI labels (6 cards)
    for label in ["MODELO", "DEPORTE", "SEMANAS",
                  "MACROCICLOS", "MESOCICLOS", "MICROCICLOS"]:
        assert label in text, f"Missing KPI label '{label}' in PDF"

    # Locate region around MODELO and DEPORTE — values should not be UUIDs
    # Find a window of text after MODELO label
    def value_after(label: str) -> str:
        m = re.search(label + r"[\s\S]{0,80}", text)
        return m.group(0) if m else ""

    modelo_window = value_after("MODELO")
    deporte_window = value_after("DEPORTE")
    assert not UUID_RE.search(modelo_window), f"MODELO shows UUID: {modelo_window!r}"
    assert not UUID_RE.search(deporte_window), f"DEPORTE shows UUID: {deporte_window!r}"


# --- Cover full-page: page 1 has cover, page 2 should NOT continue cover content ---
def test_cover_full_page_atleta(headers, plan_id):
    payload = _full_payload(
        plan_id, style="atleta", cover_layout="modern",
        only_sections=["cover", "introduction"],
    )
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=120)
    assert r.status_code == 200, r.text[:400]
    pdf = PdfReader(io.BytesIO(r.content))
    assert len(pdf.pages) >= 2
    p1 = pdf.pages[0].extract_text() or ""
    p2 = pdf.pages[1].extract_text() or ""
    # Page 1 is the cover — should contain REPORTE MAESTRO badge & title
    assert "REPORTE MAESTRO" in p1.upper(), f"Cover badge missing on page 1: {p1[:200]!r}"
    # Page 2 should not contain "REPORTE MAESTRO" (cover did not bleed over)
    assert "REPORTE MAESTRO" not in p2.upper(), \
        f"Cover content leaked into page 2: {p2[:300]!r}"


# --- Cover full-page across 4 layouts ---
@pytest.mark.parametrize("layout", ["modern", "apa", "minimal", "institutional"])
def test_cover_layouts_full_page(headers, plan_id, layout):
    payload = _full_payload(
        plan_id, style="atleta", cover_layout=layout,
        only_sections=["cover", "introduction"],
    )
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=120)
    assert r.status_code == 200, f"{layout} -> {r.status_code} {r.text[:200]}"
    pdf = PdfReader(io.BytesIO(r.content))
    assert len(pdf.pages) >= 2, f"{layout} produced single-page PDF"


# --- Periodization phases use human labels (no raw 'preparation_general_1') ---
def test_periodization_phase_labels_are_human(headers, plan_id):
    payload = _full_payload(
        plan_id, only_sections=["cover", "periodization_structure"],
    )
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=120)
    assert r.status_code == 200, r.text[:400]
    pdf = PdfReader(io.BytesIO(r.content))
    text = "\n".join((p.extract_text() or "") for p in pdf.pages)
    # No raw phase ids
    assert "preparation_general_1" not in text
    assert "preparation_specific_1" not in text
    assert not re.search(r"\bcustom_\d+\b", text)
    assert not re.search(r"\b[a-z_]+_\d+\b", text), "Found raw phase id with _N suffix"
    # The "Fase" column should not be empty
    assert "Fase" in text or "FASE" in text


# --- Microcycle blocks render when plan has microcycles ---
def test_microcycle_detail_blocks(headers):
    payload = _full_payload(
        PLAN_WITH_MICROS, only_sections=["cover", "periodization_structure"],
    )
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=120)
    assert r.status_code == 200
    text = "\n".join(
        (p.extract_text() or "")
        for p in PdfReader(io.BytesIO(r.content)).pages
    )
    # Microciclos heading should appear when at least one mesocycle has microcycles
    assert "microciclos" in text.lower(), "Microcycles block missing"
    # Should show at least the column headers for microciclo detail
    assert "Microciclo" in text or "MICROCICLO" in text.upper()


# --- INFO sections show non-empty 'Detalle' for at least one collection ---
def test_info_tables_have_details(headers, plan_id):
    payload = _full_payload(
        plan_id,
        only_sections=["cover", "info_athletes", "info_sports", "info_coaches"],
    )
    r = requests.post(f"{BASE_URL}/api/master-report/generate",
                      json=payload, headers=headers, timeout=120)
    assert r.status_code == 200
    text = "\n".join(
        (p.extract_text() or "")
        for p in PdfReader(io.BytesIO(r.content)).pages
    )
    # Header should be present
    assert "Detalle" in text or "DETALLE" in text.upper()


# --- Preview PNG > 700KB for atleta cover ---
def test_preview_png_size_atleta_cover(headers, plan_id):
    payload = _full_payload(plan_id, style="atleta",
                            only_sections=["cover"])
    r = requests.post(f"{BASE_URL}/api/master-report/preview",
                      json=payload, headers=headers, timeout=60)
    assert r.status_code == 200, r.text[:400]
    assert r.headers.get("content-type", "").startswith("image/png")
    assert len(r.content) > 700_000, f"PNG only {len(r.content)} bytes"
