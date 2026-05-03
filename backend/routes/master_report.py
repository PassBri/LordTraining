"""
Reporte PDF Maestro · Constructor selectivo (T6 + T7)
- 8 estilos visuales:
  * olimpico  (azul medianoche + dorado) — reemplaza APA
  * atleta    (negro carbón + lima)       — reemplaza Michigan
  * sport     (magazine deportivo dark)
  * training  (clínico / profesional)
  * coach     (manual de entrenador)
  * federation(institucional)
  * campeon   (dorado · negro · victoria)
  * primer-lugar (plata · oro · podio)
- Logo opcional del club/escuela/federación
- Hero card tipo whitepaper iTRAIN, badges, KPIs, tablas premium
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/master-report", tags=["master-report"])
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _esc(s) -> str:
    if s is None: return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


# ============= ESTILOS (8) =============
# Cada estilo define la paleta + tipografía + vibe + cover gradient + accent líneas
STYLES: Dict[str, Dict[str, Any]] = {
    "olimpico": {
        "name": "Olímpico · Azul medianoche + dorado",
        "font": "'Playfair Display', 'Times New Roman', Georgia, serif",
        "primary": "#0B1438", "accent": "#D4AF37", "secondary": "#F8F4E3",
        "bg": "#FFFFFF", "fg": "#0B1438",
        "hero_grad": "linear-gradient(135deg, #0B1438 0%, #1a2456 50%, #0B1438 100%)",
        "vibe": "Inspiración olímpica · azul medianoche con detalles en oro · tipografía clásica con elegancia institucional",
    },
    "atleta": {
        "name": "Atleta · Carbón + lima neón",
        "font": "'Inter', 'Helvetica Neue', system-ui, sans-serif",
        "primary": "#0F172A", "accent": "#CCFF00", "secondary": "#F1F5F9",
        "bg": "#FFFFFF", "fg": "#0F172A",
        "hero_grad": "linear-gradient(135deg, #0b1020 0%, #1e293b 100%)",
        "vibe": "Enfocado en performance · carbón con neón lima · datos crudos sin distracciones",
    },
    "sport": {
        "name": "Sport · Magazine deportivo",
        "font": "'Bebas Neue', 'Helvetica Neue', Impact, sans-serif",
        "primary": "#0EA5E9", "accent": "#F97316", "secondary": "#0F172A",
        "bg": "#0F172A", "fg": "#F8FAFC",
        "hero_grad": "linear-gradient(135deg, #0F172A 0%, #1e3a8a 50%, #0EA5E9 100%)",
        "vibe": "Estilo magazine deportivo · fondo oscuro · tipografía condensada · dinamismo gráfico",
        "dark": True,
    },
    "training": {
        "name": "Training · Profesional clínico",
        "font": "'Inter', system-ui, sans-serif",
        "primary": "#16A34A", "accent": "#0F172A", "secondary": "#F1F5F9",
        "bg": "#FAFAFA", "fg": "#0F172A",
        "hero_grad": "linear-gradient(135deg, #16A34A 0%, #15803d 100%)",
        "vibe": "Limpio profesional · verde clínico · tablas funcionales · datos de calidad",
    },
    "coach": {
        "name": "Coach · Manual del entrenador",
        "font": "'Roboto Slab', Georgia, serif",
        "primary": "#7C3AED", "accent": "#F59E0B", "secondary": "#FAF5FF",
        "bg": "#FFFFFF", "fg": "#1F2937",
        "hero_grad": "linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)",
        "vibe": "Manual ilustrado · acentos cálidos · sidebar de pistas y tips · personalidad del coach",
    },
    "federation": {
        "name": "Federación · Institucional",
        "font": "'Inter', 'Helvetica Neue', system-ui, sans-serif",
        "primary": "#0F172A", "accent": "#CCFF00", "secondary": "#1E293B",
        "bg": "#FFFFFF", "fg": "#0F172A",
        "hero_grad": "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        "vibe": "Institucional · sello federativo · KPIs ejecutivos · tablas comparativas",
    },
    "campeon": {
        "name": "Campeón · Oro · Negro · Victoria",
        "font": "'Bebas Neue', 'Russo One', Impact, sans-serif",
        "primary": "#1A1A1A", "accent": "#FFD700", "secondary": "#FFF8E7",
        "bg": "#FFFFFF", "fg": "#1A1A1A",
        "hero_grad": "linear-gradient(135deg, #1A1A1A 0%, #2a2a2a 50%, #FFD700 220%)",
        "vibe": "Trofeo dorado sobre negro · esencia de victoria · tipografía deportiva masiva",
    },
    "primer-lugar": {
        "name": "Primer Lugar · Podio premium",
        "font": "'Oswald', 'Bebas Neue', sans-serif",
        "primary": "#0F172A", "accent": "#C9B037", "secondary": "#E8E8E8",
        "bg": "#FAFAFA", "fg": "#0F172A",
        "hero_grad": "linear-gradient(135deg, #0F172A 0%, #2C2C2C 50%, #C9B037 200%)",
        "vibe": "Podio premium · plata + oro · acabado editorial · ranking competitivo",
    },
}


# ============= MODELS =============

class SectionFlags(BaseModel):
    cover: bool = True
    toc: bool = True
    introduction: bool = False
    diagnostic_previous: bool = False
    diagnostic_active: bool = False
    info_entities: bool = False
    info_teams: bool = False
    info_athletes: bool = False
    info_sports: bool = False
    info_tournaments: bool = False
    info_coaches: bool = False
    eval_medical: bool = False
    eval_anthropometric: bool = False
    eval_physical: bool = False
    eval_biomechanical: bool = False
    eval_technical: bool = False
    eval_tactical: bool = False
    eval_psychological: bool = False
    eval_theoretical: bool = False
    competitions: bool = False
    periodization_structure: bool = False
    periodization_load: bool = False
    graphic_plan: bool = False
    tools: bool = False
    conclusions: bool = False
    sessions: bool = False  # NEW: imprimir todas las sesiones del plan


class CoverData(BaseModel):
    """Campos extra de la portada estilo APA / institucional."""
    author: Optional[str] = ""           # Autor / responsable
    advisor: Optional[str] = ""          # Director técnico / asesor
    program: Optional[str] = ""          # Programa / disciplina / asignatura
    department: Optional[str] = ""       # Departamento / facultad / área
    institution: Optional[str] = ""      # Universidad / Federación / Club
    location: Optional[str] = ""         # Ciudad, País
    period: Optional[str] = ""           # Temporada / periodo (ej: "Macrociclo 2026 · 24 sem")
    document_code: Optional[str] = ""    # Código documento / referencia
    dedication: Optional[str] = ""       # Dedicatoria opcional
    cover_layout: Optional[str] = "modern"  # modern | apa | minimal | institutional


class MasterReportPayload(BaseModel):
    plan_id: Optional[str] = None
    title: Optional[str] = "Plan de Entrenamiento"
    subtitle: Optional[str] = ""
    style: str = "atleta"  # default
    sections: SectionFlags = Field(default_factory=SectionFlags)
    org_name: Optional[str] = ""
    org_logo_b64: Optional[str] = ""
    coach_name: Optional[str] = ""
    athlete_name: Optional[str] = ""
    # New: extended cover + custom narrative
    cover: Optional[CoverData] = Field(default_factory=CoverData)
    custom_intro: Optional[str] = ""        # Texto libre para Introducción
    custom_conclusions: Optional[str] = ""  # Texto libre para Conclusiones
    # Order in which sections should appear (when omitted, default order is used)
    section_order: Optional[List[str]] = None
    # When sections.sessions=true, optionally filter the printed sessions.
    # Empty/None = print ALL sessions. Otherwise, only those whose id is in this list.
    selected_session_ids: Optional[List[str]] = None


# ============= STYLES ENDPOINT =============

@router.get("/styles")
async def list_styles():
    return {"styles": [
        {"id": k, "name": v["name"], "vibe": v["vibe"],
         "primary": v["primary"], "accent": v["accent"]}
        for k, v in STYLES.items()
    ]}


@router.get("/sections-catalog")
async def sections_catalog():
    return {"groups": [
        {"id": "intro", "title": "Inicio", "items": [
            {"id": "cover", "label": "Portada del plan"},
            {"id": "toc", "label": "Tabla de contenido"},
            {"id": "introduction", "label": "Introducción"},
        ]},
        {"id": "diagnostic", "title": "Diagnóstico", "items": [
            {"id": "diagnostic_previous", "label": "Plan anterior"},
            {"id": "diagnostic_active", "label": "Plan activo"},
        ]},
        {"id": "info", "title": "Información", "items": [
            {"id": "info_entities", "label": "Entidades"},
            {"id": "info_teams", "label": "Equipos"},
            {"id": "info_athletes", "label": "Atletas"},
            {"id": "info_sports", "label": "Deportes"},
            {"id": "info_tournaments", "label": "Torneos"},
            {"id": "info_coaches", "label": "Entrenadores"},
        ]},
        {"id": "eval", "title": "Evaluación", "items": [
            {"id": "eval_medical", "label": "Control médico"},
            {"id": "eval_anthropometric", "label": "Antropometría"},
            {"id": "eval_physical", "label": "Control físico"},
            {"id": "eval_biomechanical", "label": "Biomecánica"},
            {"id": "eval_technical", "label": "Control técnico"},
            {"id": "eval_tactical", "label": "Control táctico"},
            {"id": "eval_psychological", "label": "Control psicológico"},
            {"id": "eval_theoretical", "label": "Control teórico"},
        ]},
        {"id": "comp", "title": "Competencias", "items": [
            {"id": "competitions", "label": "Calendario y resultados"},
        ]},
        {"id": "period", "title": "Periodización", "items": [
            {"id": "periodization_structure", "label": "Estructura"},
            {"id": "periodization_load", "label": "Carga"},
        ]},
        {"id": "viz", "title": "Visualización", "items": [
            {"id": "graphic_plan", "label": "Plan Gráfico"},
        ]},
        {"id": "sessions", "title": "Sesiones de entrenamiento", "items": [
            {"id": "sessions", "label": "Todas las sesiones (con ejercicios)"},
        ]},
        {"id": "tools", "title": "Herramientas", "items": [
            {"id": "tools", "label": "Herramientas y calculadoras"},
        ]},
        {"id": "closing", "title": "Cierre", "items": [
            {"id": "conclusions", "label": "Conclusiones"},
        ]},
    ]}


@router.get("/cover-layouts")
async def cover_layouts():
    """Layouts de portada disponibles."""
    return {"layouts": [
        {"id": "modern", "name": "Moderno", "vibe": "Hero gradient con KPIs y meta-info en grilla"},
        {"id": "apa", "name": "APA / Académico", "vibe": "Centrado en tabla institucional clásica con tipografía serif"},
        {"id": "minimal", "name": "Minimalista", "vibe": "Espacio en blanco · título XL · línea de acento"},
        {"id": "institutional", "name": "Institucional", "vibe": "Logo gigante centrado · sello federativo · marco doble"},
    ]}


@router.get("/sessions-list/{plan_id}")
async def list_plan_sessions(plan_id: str, user=Depends(get_current_user_dep())):
    """Listado plano de todas las sesiones del plan, agrupadas por mesociclo y microciclo,
    para alimentar el selector multi-checkbox del frontend."""
    uid = user.get("id") or user.get("user_id")
    plan = await _fetch_plan(plan_id, uid)
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    out = []
    for mi, m in enumerate(plan.get("macrocycles") or []):
        for ms in (m.get("mesocycles") or []):
            meso_node = {
                "meso_id": ms.get("id") or f"meso_{mi}",
                "meso_name": ms.get("name") or "Mesociclo",
                "phase": _phase_label(ms.get("phase")),
                "microcycles": [],
            }
            for mc in (ms.get("microcycles") or []):
                micro_node = {
                    "micro_id": mc.get("id") or "",
                    "micro_name": mc.get("name") or "Microciclo",
                    "week_number": mc.get("week_number"),
                    "sessions": [],
                }
                for s in (mc.get("sessions") or []):
                    micro_node["sessions"].append({
                        "id": s.get("id"),
                        "day": s.get("day"),
                        "name": s.get("name") or "Sesión",
                        "session_type": s.get("session_type") or "general",
                        "duration_minutes": s.get("duration_minutes"),
                        "intensity": s.get("intensity"),
                        "exercises_count": len(s.get("exercises") or []),
                    })
                if micro_node["sessions"]:
                    meso_node["microcycles"].append(micro_node)
            if meso_node["microcycles"]:
                out.append(meso_node)
    return {"items": out, "total_sessions": sum(
        len(mc["sessions"]) for ms in out for mc in ms["microcycles"]
    )}


# ============= HELPERS =============

async def _fetch_plan(plan_id: str, uid: str) -> Optional[dict]:
    """Fetch plan and enrich UUID fields with human-readable names."""
    plan = await _db.training_plans.find_one(
        {"id": plan_id, "$or": [{"user_id": uid}, {"coach_id": uid}]},
        {"_id": 0}
    )
    if not plan:
        return None

    def _is_uuid(s: Any) -> bool:
        s = str(s or "")
        return len(s) >= 30 and s.count("-") >= 4

    # Resolve sport UUID → name
    sport_val = plan.get("sport")
    if _is_uuid(sport_val):
        sport_doc = await _db.sports.find_one({"id": sport_val}, {"_id": 0, "name": 1})
        if sport_doc:
            plan["sport_name"] = sport_doc.get("name", "Personalizado")
            plan["sport"] = plan["sport_name"]
        else:
            plan["sport_name"] = "Personalizado"
    elif sport_val:
        plan["sport_name"] = sport_val

    # Resolve model UUID → name (multi-source lookup)
    model_val = plan.get("model")
    model_name_val = plan.get("model_name")
    if _is_uuid(model_val):
        # 1) lookup en periodization_models collection
        m_doc = await _db.periodization_models.find_one({"id": model_val}, {"_id": 0, "name": 1})
        # 2) lookup en custom_models / model_templates / training_models si existieran
        if not m_doc:
            for coll in ("custom_models", "model_templates", "training_models", "models"):
                if coll in await _db.list_collection_names():
                    d = await _db[coll].find_one({"id": model_val}, {"_id": 0, "name": 1})
                    if d:
                        m_doc = d
                        break
        if m_doc and m_doc.get("name"):
            plan["model_name"] = m_doc["name"]
        elif _is_uuid(model_name_val) or not model_name_val:
            # 3) Try to extract from plan name pattern "Plan X - <Model Name>"
            pname = plan.get("name") or ""
            if " - " in pname:
                candidate = pname.rsplit(" - ", 1)[1].strip()
                if candidate and not _is_uuid(candidate):
                    plan["model_name"] = candidate
                else:
                    plan["model_name"] = "Modelo personalizado"
            else:
                plan["model_name"] = "Modelo personalizado"
    elif _is_uuid(model_name_val):
        # model is short id but model_name was incorrectly stored as UUID — clean up
        plan["model_name"] = model_val.replace("_", " ").title() if model_val else "Modelo personalizado"
    return plan


# Phase ID → human label (matches server.py _type_meta map)
_PHASE_LABELS = {
    "preparation_general": "Preparación General",
    "preparation_specific": "Preparación Específica",
    "pre_competitive": "Pre-Competitivo",
    "competitive": "Competitivo",
    "transition": "Transición / Recuperación",
    "maintenance": "Mantenimiento",
    "custom": "Personalizada",
}

def _phase_label(phase: str) -> str:
    if not phase:
        return "—"
    p = str(phase)
    # Strip trailing _N suffix if present (e.g. "preparation_general_1" → "preparation_general")
    base = p.rsplit("_", 1)[0] if p.split("_")[-1].isdigit() else p
    return _PHASE_LABELS.get(base, p.replace("_", " ").title())


async def _capture_graphic_plan_on_demand(plan_id: str, user_id: str) -> Optional[str]:
    """Render the public graphic_plan page and return an inline data URL (PNG base64)."""
    import uuid as _uuid
    # Create a temporary share so the public URL renders the right plan
    share_id = str(_uuid.uuid4())
    plan = await _db.training_plans.find_one({"id": plan_id, "$or": [{"user_id": user_id}, {"coach_id": user_id}]}, {"_id": 0})
    if not plan:
        return None
    share_doc = {
        "id": share_id,
        "share_id": share_id,
        "plan_id": plan_id,
        "user_id": user_id,
        "plan_snapshot": plan,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "auto_capture": True,
    }
    await _db.graphic_plan_shares.insert_one(share_doc)
    # Try to render via Playwright the public viewer
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    try:
        from playwright.async_api import async_playwright
        backend_url = os.environ.get('PUBLIC_FRONTEND_URL') or os.environ.get('REACT_APP_BACKEND_URL', '')
        if not backend_url:
            return None
        url = f"{backend_url.rstrip('/')}/api/graphic-plan/shared/{share_id}"
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'])
            page = await browser.new_page(viewport={"width": 1600, "height": 900})
            await page.goto(url, wait_until="networkidle", timeout=20000)
            await page.wait_for_timeout(1500)
            png = await page.screenshot(full_page=True, type="png")
            await browser.close()
        return "data:image/png;base64," + base64.b64encode(png).decode()
    except Exception:
        return None


def _h2(title: str, style: dict) -> str:
    """Section heading reusable across all styles."""
    return f'<h2>{_esc(title)}</h2>'


def _stat_card(label: str, value: Any, sub: str = "", style: dict = None) -> str:
    return f"""<div class="kpi-card">
  <div class="kpi-eyebrow">{_esc(label)}</div>
  <div class="kpi-value">{value}</div>
  {f'<div class="kpi-sub">{_esc(sub)}</div>' if sub else ''}
</div>"""


# ============= HTML BUILDER =============

async def _build_html(payload: MasterReportPayload, user_id: str) -> str:
    style_id = payload.style if payload.style in STYLES else "atleta"
    style = STYLES[style_id]
    primary = style["primary"]
    accent = style["accent"]
    secondary = style.get("secondary", "#F1F5F9")
    is_dark = style.get("dark", False)
    bg = style["bg"]
    fg = style["fg"]
    hero_grad = style["hero_grad"]
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")

    plan_doc = None
    if payload.plan_id:
        plan_doc = await _fetch_plan(payload.plan_id, user_id)
    plan_name = (plan_doc or {}).get("name") or payload.title or "Plan de Entrenamiento"

    # ====== Brand assets ======
    full_b64 = ""
    icon_b64 = ""
    try:
        with open("/app/frontend/public/brand/itrain-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
    except Exception: pass
    try:
        with open("/app/frontend/public/brand/itrain-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except Exception: pass

    # ====== Logo del club (preferred over brand iTRAIN in cover) ======
    org_block = ""
    if payload.org_logo_b64:
        org_block = (
            f'<img src="{payload.org_logo_b64}" alt="logo" '
            f'style="max-height:80pt;max-width:200pt;object-fit:contain;display:block;margin:0 0 14pt;"/>'
        )
    elif full_b64:
        org_block = (
            f'<img src="data:image/png;base64,{full_b64}" alt="iTRAIN" '
            f'style="height:38pt;width:148pt;object-fit:contain;display:block;margin:0 0 14pt;"/>'
        )

    # ====== Sections ======
    parts: List[tuple] = []  # list of (sid, html) so we can reorder via payload.section_order

    # ----- COVER -----
    if payload.sections.cover:
        cover_data = payload.cover or CoverData()
        layout = (cover_data.cover_layout or "modern").lower()

        # Build COVER based on layout
        if layout == "apa":
            # Estilo APA — tabla institucional centrada serif
            apa_rows = []
            if cover_data.institution: apa_rows.append(("INSTITUCIÓN", cover_data.institution))
            if cover_data.department:  apa_rows.append(("DEPARTAMENTO / FACULTAD", cover_data.department))
            if cover_data.program:     apa_rows.append(("PROGRAMA / DISCIPLINA", cover_data.program))
            if payload.athlete_name:   apa_rows.append(("ATLETA / DEPORTISTA", payload.athlete_name))
            if cover_data.author:      apa_rows.append(("AUTOR", cover_data.author))
            if cover_data.advisor:     apa_rows.append(("DIRECTOR TÉCNICO", cover_data.advisor))
            if payload.coach_name:     apa_rows.append(("ENTRENADOR", payload.coach_name))
            if cover_data.location:    apa_rows.append(("UBICACIÓN", cover_data.location))
            if cover_data.period:      apa_rows.append(("PERIODO", cover_data.period))
            apa_rows.append(("FECHA", today))
            if cover_data.document_code: apa_rows.append(("CÓDIGO", cover_data.document_code))
            apa_table = "".join([
                f'<tr><td class="apa-key">{_esc(k)}</td><td class="apa-val">{_esc(v)}</td></tr>'
                for k, v in apa_rows
            ])
            ded = (
                f'<div class="apa-dedication"><em>{_esc(cover_data.dedication)}</em></div>'
                if cover_data.dedication else ""
            )
            parts.append(("cover", f"""<section class="cover apa-cover">
  {org_block}
  <div class="apa-stack">
    {f'<div class="apa-org">{_esc(payload.org_name or cover_data.institution or "")}</div>' if (payload.org_name or cover_data.institution) else ''}
    <div class="apa-rule"></div>
    <h1 class="apa-title">{_esc(plan_name)}</h1>
    {f'<p class="apa-sub">{_esc(payload.subtitle)}</p>' if payload.subtitle else ''}
    <table class="apa-table">{apa_table}</table>
    {ded}
  </div>
</section>"""))
        elif layout == "minimal":
            parts.append(("cover", f"""<section class="cover minimal-cover">
  <div class="min-rule"></div>
  {f'<div class="min-org">{_esc(payload.org_name)}</div>' if payload.org_name else ''}
  <h1 class="min-title">{_esc(plan_name)}</h1>
  {f'<p class="min-sub">{_esc(payload.subtitle)}</p>' if payload.subtitle else ''}
  <div class="min-meta">
    {f'<span><strong>{_esc(cover_data.author or payload.coach_name or "")}</strong></span>' if (cover_data.author or payload.coach_name) else ''}
    {f'<span>{_esc(cover_data.location)}</span>' if cover_data.location else ''}
    <span>{today}</span>
  </div>
</section>"""))
        elif layout == "institutional":
            parts.append(("cover", f"""<section class="cover inst-cover">
  <div class="inst-frame">
    <div class="inst-inner">
      {org_block}
      {f'<div class="inst-org">{_esc(payload.org_name)}</div>' if payload.org_name else ''}
      {f'<div class="inst-program">{_esc(cover_data.program or cover_data.department or "")}</div>' if (cover_data.program or cover_data.department) else ''}
      <div class="inst-line"></div>
      <h1 class="inst-title">{_esc(plan_name)}</h1>
      {f'<p class="inst-sub">{_esc(payload.subtitle)}</p>' if payload.subtitle else ''}
      <div class="inst-line"></div>
      <div class="inst-meta">
        {f'<div><span>Autor</span><strong>{_esc(cover_data.author or payload.coach_name or "—")}</strong></div>' if (cover_data.author or payload.coach_name) else ''}
        {f'<div><span>Dirección Técnica</span><strong>{_esc(cover_data.advisor)}</strong></div>' if cover_data.advisor else ''}
        {f'<div><span>Atleta</span><strong>{_esc(payload.athlete_name)}</strong></div>' if payload.athlete_name else ''}
        {f'<div><span>Periodo</span><strong>{_esc(cover_data.period)}</strong></div>' if cover_data.period else ''}
        {f'<div><span>Lugar</span><strong>{_esc(cover_data.location)}</strong></div>' if cover_data.location else ''}
        <div><span>Fecha</span><strong>{today}</strong></div>
      </div>
    </div>
  </div>
</section>"""))
        else:
            # MODERN (default): hero gradient con KPIs + meta
            cover_kpis = ""
            if plan_doc:
                sport = plan_doc.get("sport") or "—"
                weeks = plan_doc.get("total_weeks") or "—"
                model = plan_doc.get("model_name") or plan_doc.get("model") or "—"
                cover_kpis = f"""
<div class="cover-kpis">
  <div><strong>DEPORTE</strong><span>{_esc(sport)}</span></div>
  <div><strong>DURACIÓN</strong><span>{weeks} semanas</span></div>
  <div><strong>MODELO</strong><span>{_esc(model)}</span></div>
</div>"""
            meta_items = []
            if cover_data.author or payload.coach_name:
                meta_items.append(("AUTOR", cover_data.author or payload.coach_name))
            if cover_data.advisor:
                meta_items.append(("DIRECCIÓN TÉCNICA", cover_data.advisor))
            if payload.athlete_name:
                meta_items.append(("ATLETA", payload.athlete_name))
            if cover_data.program:
                meta_items.append(("PROGRAMA", cover_data.program))
            if cover_data.period:
                meta_items.append(("PERIODO", cover_data.period))
            if cover_data.location:
                meta_items.append(("UBICACIÓN", cover_data.location))
            meta_items.append(("FECHA", today))
            if cover_data.document_code:
                meta_items.append(("CÓDIGO", cover_data.document_code))
            meta_html = "".join([
                f"<div><strong>{_esc(k)}</strong><span>{_esc(v)}</span></div>"
                for k, v in meta_items
            ])
            parts.append(("cover", f"""<section class="cover">
  <span class="cover-watermark">01</span>
  {org_block}
  {f'<div class="org-name">{_esc(payload.org_name)}</div>' if payload.org_name else ''}
  <span class="badge">REPORTE MAESTRO</span>
  <h1 class="cover-title">{_esc(plan_name)}</h1>
  {f'<p class="cover-sub">{_esc(payload.subtitle)}</p>' if payload.subtitle else ''}
  {cover_kpis}
  <div class="cover-meta">{meta_html}</div>
  {f'<div class="cover-dedication"><em>{_esc(cover_data.dedication)}</em></div>' if cover_data.dedication else ''}
</section>"""))

    # ----- TOC -----
    if payload.sections.toc:
        flags = payload.sections.model_dump()
        labels = {
            "introduction": "Introducción",
            "diagnostic_previous": "Diagnóstico · Plan anterior",
            "diagnostic_active": "Diagnóstico · Plan activo",
            "info_entities": "Información · Entidades",
            "info_teams": "Información · Equipos",
            "info_athletes": "Información · Atletas",
            "info_sports": "Información · Deportes",
            "info_tournaments": "Información · Torneos",
            "info_coaches": "Información · Entrenadores",
            "eval_medical": "Evaluación · Control médico",
            "eval_anthropometric": "Evaluación · Antropometría",
            "eval_physical": "Evaluación · Control físico",
            "eval_biomechanical": "Evaluación · Biomecánica",
            "eval_technical": "Evaluación · Control técnico",
            "eval_tactical": "Evaluación · Control táctico",
            "eval_psychological": "Evaluación · Control psicológico",
            "eval_theoretical": "Evaluación · Control teórico",
            "competitions": "Competencias",
            "periodization_structure": "Periodización · Estructura",
            "periodization_load": "Periodización · Carga",
            "graphic_plan": "Plan Gráfico",
            "sessions": "Sesiones de entrenamiento",
            "tools": "Herramientas y calculadoras",
            "conclusions": "Conclusiones",
        }
        toc_items = []
        n = 1
        for key, label in labels.items():
            if flags.get(key):
                toc_items.append(
                    f'<li><a href="#sec-{key}" style="display:flex;align-items:baseline;gap:8pt;color:inherit;text-decoration:none;width:100%;"><span class="toc-num">{n:02d}</span><span class="toc-label">{_esc(label)}</span><span class="toc-dots"></span><span class="toc-page">{n}</span></a></li>'
                )
                n += 1
        parts.append(("toc", f"""<section class="page-break">
<span class="badge">ÍNDICE</span>
<h2>Tabla de Contenido</h2>
<ol class="toc">{''.join(toc_items)}</ol>
</section>"""))

    # ----- INTRODUCTION -----
    if payload.sections.introduction:
        intro_body = payload.custom_intro or (
            f"El presente documento detalla el plan de entrenamiento <strong>{_esc(plan_name)}</strong> "
            f"elaborado por {_esc(payload.coach_name) or 'el cuerpo técnico'}"
            f"{f' para {_esc(payload.athlete_name)}' if payload.athlete_name else ''}.<br/><br/>"
            "Se incluye la planificación estructural, la distribución de cargas, los controles previstos, "
            "las evaluaciones de los atletas y los objetivos de la temporada."
        )
        # If user passed plain text, render paragraphs
        if payload.custom_intro:
            paras = "".join([f"<p>{_esc(p)}</p>" for p in payload.custom_intro.split("\n\n") if p.strip()])
        else:
            paras = f"<p>{intro_body}</p>"
        parts.append(("introduction", f"""<section class="page-break">
<span class="badge">PRESENTACIÓN</span>
<h2>Introducción</h2>
{paras}
<div class="callout">Estilo de documento: <strong>{_esc(style['name'])}</strong>. {_esc(style['vibe'])}.</div>
</section>"""))

    # ----- DIAGNOSTIC PREVIOUS -----
    if payload.sections.diagnostic_previous:
        prev = await _db.plan_previous_analysis_ai_cache.find_one({"user_id": user_id}, {"_id": 0}) or {}
        prev_summary = prev.get("summary") or "Análisis y aprendizajes del ciclo anterior aún no registrados."
        parts.append(("diagnostic_previous", f"""<section class="page-break">
<span class="badge">RETROSPECTIVO</span>
<h2>Diagnóstico · Plan Anterior</h2>
<p>{_esc(prev_summary)}</p>
</section>"""))

    # ----- DIAGNOSTIC ACTIVE -----
    if payload.sections.diagnostic_active and plan_doc:
        weeks = plan_doc.get("total_weeks") or "—"
        sport_label = plan_doc.get("sport_name") or plan_doc.get("sport") or "—"
        model_label = plan_doc.get("model_name") or plan_doc.get("model") or "—"
        # If model still looks like UUID, mask it
        if model_label and isinstance(model_label, str) and len(model_label) > 30 and model_label.count("-") >= 4:
            model_label = "Personalizado"
        objective = plan_doc.get("main_objective") or plan_doc.get("description") or ""
        macros = plan_doc.get("macrocycles") or []
        n_macros = len(macros)
        n_mesos = sum(len(m.get("mesocycles") or []) for m in macros)
        n_micros = 0
        for m in macros:
            for ms in (m.get("mesocycles") or []):
                n_micros += len(ms.get("microcycles") or [])
        parts.append(("diagnostic_active", f"""<section class="page-break">
<span class="badge">PLAN ACTIVO</span>
<h2>Diagnóstico · Plan Activo</h2>
<div class="kpi-row">
  {_stat_card('MODELO', _esc(model_label))}
  {_stat_card('DEPORTE', _esc(sport_label))}
  {_stat_card('SEMANAS', weeks)}
</div>
<div class="kpi-row">
  {_stat_card('MACROCICLOS', n_macros)}
  {_stat_card('MESOCICLOS', n_mesos)}
  {_stat_card('MICROCICLOS', n_micros or weeks)}
</div>
{f'<div class="callout"><strong>Objetivo principal</strong><br/>{_esc(objective)}</div>' if objective else ''}
</section>"""))

    # ----- INFO sections -----
    # Per-collection field mapping for "Detalle" column
    INFO_FIELDS = {
        "entities":    ("name",      ["entity_type", "city", "country", "description"]),
        "teams":       ("name",      ["sport", "category", "level", "description"]),
        "athletes":    ("name",      ["sport", "age", "level", "position"]),
        "sports":      ("name",      ["category", "type", "description"]),
        "tournaments": ("name",      ["start_date", "location", "category", "level"]),
        "coaches":     ("full_name", ["specialization", "experience_years", "city", "description"]),
    }
    info_map = [
        ("info_entities", "Entidades", "entities"),
        ("info_teams", "Equipos", "teams"),
        ("info_athletes", "Atletas", "athletes"),
        ("info_sports", "Deportes", "sports"),
        ("info_tournaments", "Torneos", "tournaments"),
        ("info_coaches", "Entrenadores", "coaches"),
    ]
    for flag_key, title, coll in info_map:
        if getattr(payload.sections, flag_key):
            cur = _db[coll].find({"$or": [{"user_id": user_id}, {"coach_id": user_id}]}, {"_id": 0}).limit(80)
            items = await cur.to_list(80)
            name_field, detail_fields = INFO_FIELDS.get(coll, ("name", ["description"]))
            rows = []
            for i, it in enumerate(items):
                name = it.get(name_field) or it.get("name") or it.get("full_name") or "—"
                detail_parts = []
                for f in detail_fields:
                    v = it.get(f)
                    if v not in (None, "", []):
                        if f == "age" and v: detail_parts.append(f"{v} años")
                        elif f == "experience_years" and v: detail_parts.append(f"{v} años exp.")
                        else: detail_parts.append(str(v))
                detail = " · ".join(detail_parts[:3]) or "—"
                rows.append(f"<tr><td class='td-num'>{i+1:02d}</td><td><strong>{_esc(name)}</strong></td><td>{_esc(detail)}</td></tr>")
            rows_html = ''.join(rows) or "<tr><td colspan='3' class='muted'>Sin registros</td></tr>"
            parts.append((flag_key, f"""<section class="page-break">
<span class="badge">INFORMACIÓN</span>
<h2>{_esc(title)} <span class="count">· {len(items)} registros</span></h2>
<table class="data-tbl">
  <thead><tr><th style="width:40pt">#</th><th>Nombre</th><th>Detalle</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>
</section>"""))

    # ----- EVALUATIONS -----
    eval_map = [
        ("eval_medical", "Control Médico", "medical"),
        ("eval_anthropometric", "Antropometría", "anthropometric"),
        ("eval_physical", "Control Físico", "physical"),
        ("eval_biomechanical", "Biomecánica", "biomechanical"),
        ("eval_technical", "Control Técnico", "technical"),
        ("eval_tactical", "Control Táctico", "tactical"),
        ("eval_psychological", "Control Psicológico", "psychological"),
        ("eval_theoretical", "Control Teórico", "theoretical"),
    ]
    for flag_key, title, et in eval_map:
        if getattr(payload.sections, flag_key):
            q: Dict[str, Any] = {"user_id": user_id, "evaluation_type": et}
            if payload.plan_id: q["plan_id"] = payload.plan_id
            cur = _db.plan_evaluations_v2.find(q, {"_id": 0}).sort("date", -1).limit(10)
            evs = await cur.to_list(10)
            if not evs:
                parts.append((flag_key, f"""<section class="page-break">
<span class="badge">EVALUACIÓN</span>
<h2>{_esc(title)}</h2>
<p class="muted">Sin controles registrados para este tipo.</p>
</section>"""))
                continue
            blocks = []
            for ev in evs:
                aspects = ev.get("aspects") or []
                # Compute global pct
                pcts = []
                for a in aspects:
                    try:
                        v = float(a.get("value") or 0); t = float(a.get("target") or 0)
                        if t > 0: pcts.append(min(v/t, 1.5)*100)
                    except Exception: pass
                glob = round(sum(pcts)/len(pcts), 1) if pcts else 0
                glob_color = "#16A34A" if glob >= 80 else ("#F59E0B" if glob >= 50 else "#EF4444")
                rows = ''.join([
                    f"<tr><td><strong>{_esc(a.get('label'))}</strong></td><td class='td-cat'>{_esc(a.get('category') or '—')}</td><td class='td-num'>{a.get('value', '—')}</td><td class='td-num'>{a.get('target', '—')}</td><td class='td-cat'>{_esc(a.get('scale_unit') or '')}</td></tr>"
                    for a in aspects
                ]) or "<tr><td colspan='5' class='muted'>Sin aspectos</td></tr>"
                blocks.append(f"""
<div class="ev-block">
  <div class="ev-head">
    <div>
      <div class="ev-date">{_esc(ev.get('date') or '—')}</div>
      <div class="ev-title">{_esc(ev.get('title') or 'Control')}</div>
    </div>
    <div class="ev-pct" style="color:{glob_color}">
      <div class="ev-pct-num">{glob}%</div>
      <div class="ev-pct-lbl">CUMPLIMIENTO</div>
    </div>
  </div>
  <table class="data-tbl">
    <thead><tr><th>Aspecto</th><th>Categoría</th><th>Valor</th><th>Objetivo</th><th>Unidad</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
</div>""")
            parts.append((flag_key, f"""<section class="page-break">
<span class="badge">EVALUACIÓN</span>
<h2>{_esc(title)} <span class="count">· {len(evs)} controles</span></h2>
{''.join(blocks)}
</section>"""))

    # ----- COMPETITIONS -----
    if payload.sections.competitions:
        cur = _db.tournaments.find({"$or": [{"user_id": user_id}, {"coach_id": user_id}]}, {"_id": 0}).limit(50)
        comps = await cur.to_list(50)
        rows = ''.join([
            f"<tr><td><strong>{_esc(c.get('name'))}</strong></td><td class='td-num'>{_esc(c.get('start_date'))}</td><td>{_esc(c.get('location') or '—')}</td><td class='td-cat'>{_esc(c.get('category') or '—')}</td></tr>"
            for c in comps
        ]) or "<tr><td colspan='4' class='muted'>Sin competencias</td></tr>"
        parts.append(("competitions", f"""<section class="page-break">
<span class="badge">CALENDARIO</span>
<h2>Competencias <span class="count">· {len(comps)} torneos</span></h2>
<table class="data-tbl">
  <thead><tr><th>Nombre</th><th style="width:90pt">Fecha</th><th>Lugar</th><th>Categoría</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
</section>"""))

    # ----- PERIODIZATION -----
    if payload.sections.periodization_structure and plan_doc:
        macros = plan_doc.get("macrocycles") or []
        rows = []
        for mi, m in enumerate(macros):
            for ms in (m.get("mesocycles") or []):
                phase_lbl = _phase_label(ms.get("phase") or ms.get("phase_id"))
                vol = ms.get("volume_pct") or ms.get("volume") or "—"
                inten = ms.get("intensity_pct") or ms.get("intensity") or "—"
                wks = ms.get("weeks") or len(ms.get("microcycles") or []) or "—"
                rows.append(
                    f"<tr><td class='td-num'>M{mi+1}</td>"
                    f"<td><strong>{_esc(ms.get('name') or '—')}</strong></td>"
                    f"<td><span class='pill pill-phase'>{_esc(phase_lbl)}</span></td>"
                    f"<td class='td-num'>{wks}</td>"
                    f"<td class='td-num'>{vol}{'%' if vol not in ('—',) else ''}</td>"
                    f"<td class='td-num'>{inten}{'%' if inten not in ('—',) else ''}</td></tr>"
                )
        rows_html = ''.join(rows) or "<tr><td colspan='6' class='muted'>Sin estructura registrada</td></tr>"
        # Microcycles detail per mesocycle
        micro_blocks = []
        for mi, m in enumerate(macros):
            for ms in (m.get("mesocycles") or []):
                micros = ms.get("microcycles") or []
                if not micros:
                    continue
                micro_rows = []
                for wi, mc in enumerate(micros):
                    mc_name = mc.get("name") or f"Sem {wi+1}"
                    mc_phase = _phase_label(mc.get("phase") or ms.get("phase"))
                    mc_vol = mc.get("volume_pct") or mc.get("volume") or "—"
                    mc_int = mc.get("intensity_pct") or mc.get("intensity") or "—"
                    mc_load = mc.get("load_type") or mc.get("type") or "—"
                    mc_obj = mc.get("objective") or mc.get("focus") or ""
                    micro_rows.append(
                        f"<tr><td class='td-num'>{wi+1:02d}</td>"
                        f"<td><strong>{_esc(mc_name)}</strong></td>"
                        f"<td>{_esc(mc_phase)}</td>"
                        f"<td>{_esc(mc_load)}</td>"
                        f"<td class='td-num'>{mc_vol}{'%' if mc_vol not in ('—',) else ''}</td>"
                        f"<td class='td-num'>{mc_int}{'%' if mc_int not in ('—',) else ''}</td>"
                        f"<td>{_esc(mc_obj[:60])}</td></tr>"
                    )
                micro_blocks.append(f"""
<div style="margin-top:14pt"><h3 style="font-size:13pt; color:{primary}; margin:8pt 0 6pt; font-weight:800;">{_esc(ms.get('name') or 'Mesociclo')} <span style="font-weight:500; color:#94a3b8;">· {len(micros)} microciclos</span></h3>
<table class="data-tbl">
  <thead><tr><th style="width:30pt">#</th><th>Microciclo</th><th>Fase</th><th>Tipo</th><th style="width:55pt">Vol.</th><th style="width:55pt">Int.</th><th>Objetivo</th></tr></thead>
  <tbody>{''.join(micro_rows)}</tbody>
</table></div>""")
        micro_html = ''.join(micro_blocks)
        parts.append(("periodization_structure", f"""<section class="page-break">
<span class="badge">ESTRUCTURA</span>
<h2>Periodización · Estructura</h2>
<table class="data-tbl">
  <thead><tr><th style="width:40pt">Macro</th><th>Mesociclo</th><th>Fase</th><th style="width:50pt">Sem.</th><th style="width:55pt">Volumen</th><th style="width:55pt">Intens.</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>
{micro_html}
</section>"""))

    if payload.sections.periodization_load:
        parts.append(("periodization_load", f"""<section class="page-break">
<span class="badge">CARGA</span>
<h2>Periodización · Carga</h2>
<p>Distribución de carga semanal y monitorización ACWR (Acute:Chronic Workload Ratio).</p>
<div class="callout">La gráfica detallada con la evolución semanal está disponible en el módulo <strong>Plan Gráfico</strong>.</div>
</section>"""))

    if payload.sections.graphic_plan and plan_doc:
        # Generate a server-side "graphic plan" — a Gantt-like weekly grid
        macros = plan_doc.get("macrocycles") or []
        # Phase color palette
        PHASE_COLORS = {
            "preparation_general": "#10B981",
            "preparation_specific": "#0EA5E9",
            "pre_competitive": "#F59E0B",
            "competitive": "#EF4444",
            "transition": "#94A3B8",
            "maintenance": "#8B5CF6",
            "custom": "#6366F1",
        }
        # Flatten weeks
        all_weeks: List[dict] = []
        for mi, m in enumerate(macros):
            for ms in (m.get("mesocycles") or []):
                phase_id = (ms.get("phase") or "custom").rsplit("_", 1)
                phase_key = phase_id[0] if phase_id[-1].isdigit() else (ms.get("phase") or "custom")
                color = PHASE_COLORS.get(phase_key, "#6366F1")
                phase_lbl = _phase_label(ms.get("phase"))
                for mc in (ms.get("microcycles") or []):
                    all_weeks.append({
                        "week": mc.get("week_number") or len(all_weeks)+1,
                        "name": mc.get("name") or "—",
                        "type": mc.get("type") or "—",
                        "load": mc.get("load_percent") or mc.get("load") or 0,
                        "vol": mc.get("volume") or 0,
                        "intensity": mc.get("intensity") or 0,
                        "phase_lbl": phase_lbl,
                        "color": color,
                        "meso": ms.get("name") or "—",
                    })
        if not all_weeks:
            all_weeks_html = '<p class="muted">Sin microciclos registrados en este plan.</p>'
        else:
            # Build table grid
            rows = []
            for w in all_weeks:
                bar_w = max(8, min(100, int(w["load"] or 50)))
                rows.append(f"""<tr>
<td class="td-num"><strong>{w['week']:02d}</strong></td>
<td><span class="pill" style="background:{w['color']};color:#fff;">{_esc(w['phase_lbl'])}</span></td>
<td>{_esc(w['meso'])}</td>
<td><span class='pill' style='background:#f1f5f9;color:#0f172a;'>{_esc(w['type'])}</span></td>
<td><div style="background:#e2e8f0;border-radius:99pt;height:10pt;width:120pt;position:relative;overflow:hidden;"><div style="background:{w['color']};height:100%;width:{bar_w}%;border-radius:99pt;"></div></div></td>
<td class="td-num">{w['load']}%</td>
<td class="td-num">{w['vol']}</td>
<td class="td-num">{w['intensity']}</td>
</tr>""")
            all_weeks_html = f"""<table class="data-tbl">
<thead><tr><th style="width:36pt">SEM</th><th>FASE</th><th>MESOCICLO</th><th>TIPO</th><th>CARGA</th><th style="width:48pt">% CARGA</th><th style="width:48pt">VOL.</th><th style="width:48pt">INT.</th></tr></thead>
<tbody>{''.join(rows)}</tbody>
</table>"""
        parts.append(("graphic_plan", f"""<section class="page-break">
<span class="badge">VISUALIZACIÓN</span>
<h2>Plan Gráfico <span class="count">· {len(all_weeks)} semanas</span></h2>
<p class="muted" style="margin-bottom:6pt;">Distribución semanal del plan, fase a fase, con cargas e intensidades.</p>
{all_weeks_html}
</section>"""))

    # ----- SESSIONS — Manual completo del plan -----
    if payload.sections.sessions and plan_doc:
        macros = plan_doc.get("macrocycles") or []
        SESSION_TYPE_COLORS = {
            "fuerza": "#EF4444", "resistencia": "#0EA5E9", "potencia": "#F59E0B",
            "tecnica": "#8B5CF6", "tactica": "#EC4899", "recuperacion": "#10B981",
            "cardio": "#06B6D4", "flexibilidad": "#84CC16",
        }
        # Filter by selected_session_ids if provided
        sel_ids = set(payload.selected_session_ids or [])
        meso_blocks = []
        total_sessions = 0
        for mi, m in enumerate(macros):
            for ms in (m.get("mesocycles") or []):
                micro_blocks = []
                for mc in (ms.get("microcycles") or []):
                    raw_sessions = mc.get("sessions") or []
                    sessions = [s for s in raw_sessions if not sel_ids or s.get("id") in sel_ids]
                    if not sessions:
                        continue
                    sess_rows = []
                    for s in sessions:
                        total_sessions += 1
                        st = (s.get("session_type") or "general").lower()
                        col = SESSION_TYPE_COLORS.get(st, "#64748B")
                        objs = s.get("objectives") or []
                        # Objectives as cards instead of plain string
                        obj_html = ''
                        if objs:
                            obj_pills = ''.join([
                                f'<span class="pill" style="background:{col}15;color:{col};border:1pt solid {col}40;margin:1pt;">{_esc(o)}</span>'
                                for o in objs[:8]
                            ])
                            obj_html = f'<div style="margin-top:6pt;">{obj_pills}</div>'
                        exercises = s.get("exercises") or []
                        ex_html = ""
                        if exercises:
                            ex_rows = []
                            for ex in exercises[:25]:
                                ex_rows.append(
                                    f"<tr><td><strong>{_esc(ex.get('name') or '—')}</strong></td>"
                                    f"<td class='td-cat'>{_esc(ex.get('category') or '—')}</td>"
                                    f"<td class='td-num'>{ex.get('sets', '—')}</td>"
                                    f"<td class='td-num'>{ex.get('reps', '—')}</td>"
                                    f"<td class='td-num'>{ex.get('rest', '—')}</td>"
                                    f"<td>{_esc(ex.get('notes') or '')}</td></tr>"
                                )
                            ex_html = (
                                '<table class="data-tbl" style="font-size:8.5pt;margin:6pt 0 4pt;">'
                                '<thead><tr><th>Ejercicio</th><th>Categoría</th>'
                                '<th style="width:38pt">Series</th><th style="width:38pt">Reps</th>'
                                '<th style="width:42pt">Desc.</th><th>Notas</th></tr></thead>'
                                f'<tbody>{"".join(ex_rows)}</tbody></table>'
                            )
                        else:
                            ex_html = '<p class="muted" style="font-size:8.5pt;margin:4pt 0;">Sin ejercicios detallados.</p>'
                        # Volume + monitoring meta
                        meta_pills = ''
                        if s.get('duration_minutes'):
                            meta_pills += f'<span class="pill" style="background:#f1f5f9;color:#0f172a;margin-right:4pt;">⏱ {s.get("duration_minutes")} min</span>'
                        if s.get('intensity'):
                            meta_pills += f'<span class="pill" style="background:{col};color:#fff;margin-right:4pt;">INT {s.get("intensity")}%</span>'
                        if s.get('volume'):
                            meta_pills += f'<span class="pill" style="background:#e2e8f0;color:#0f172a;margin-right:4pt;">VOL {s.get("volume")}</span>'
                        sess_rows.append(f"""<div class="ev-block sess-card" style="border-left-color:{col};margin:8pt 0;page-break-inside:avoid;">
<div class="sess-head" style="background:linear-gradient(135deg, {col} 0%, {col}cc 100%); color:#fff; padding:8pt 12pt; border-radius:6pt 6pt 0 0; margin:-12pt -14pt 8pt -14pt;">
  <div style="display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div style="font-size:8pt;font-weight:800;letter-spacing:1.5px;opacity:0.9;">DÍA {s.get('day') or '—'} · {st.upper()}</div>
      <div style="font-size:13pt;font-weight:900;margin-top:2pt;">{_esc(s.get('name') or 'Sesión')}</div>
    </div>
    <div style="text-align:right;font-size:8pt;font-weight:700;letter-spacing:1px;opacity:0.85;">SESIÓN<br/>#{total_sessions:03d}</div>
  </div>
</div>
{f'<div style="margin:0 0 6pt;">{meta_pills}</div>' if meta_pills else ''}
{obj_html}
{ex_html}
{f'<p style="font-size:9pt; color:#64748b; margin-top:6pt; font-style:italic;">📝 {_esc(s.get("notes"))}</p>' if s.get('notes') else ''}
</div>""")
                    micro_blocks.append(f"""<div style="margin-top:10pt;">
<h3 style="font-size:12pt;color:{primary};margin:6pt 0 4pt;font-weight:800;">{_esc(mc.get('name') or 'Microciclo')} <span style="font-weight:500;color:#94a3b8;">· Sem {mc.get('week_number','—')} · {len(sessions)} sesiones</span></h3>
{''.join(sess_rows)}
</div>""")
                if micro_blocks:
                    meso_blocks.append(f"""<div class="page-break">
<span class="badge">MESOCICLO</span>
<h2 style="font-size:16pt;">{_esc(ms.get('name') or 'Mesociclo')}<span class="count"> · {_phase_label(ms.get('phase'))}</span></h2>
{''.join(micro_blocks)}
</div>""")
        if not meso_blocks:
            content = '<p class="muted">No hay sesiones detalladas registradas o ninguna seleccionada.</p>'
        else:
            content = ''.join(meso_blocks)
        sel_note = (f' · {len(sel_ids)} seleccionadas' if sel_ids else '')
        parts.append(("sessions", f"""<section class="page-break">
<span class="badge">MANUAL DEL PLAN</span>
<h2>Sesiones de Entrenamiento <span class="count">· {total_sessions} sesiones{sel_note}</span></h2>
<p>Detalle completo de cada sesión del plan, organizadas por mesociclo y microciclo. Esta sección sirve como manual de referencia diaria para el cuerpo técnico.</p>
{content}
</section>"""))

    if payload.sections.tools:
        parts.append(("tools", f"""<section class="page-break">
<span class="badge">SUITE</span>
<h2>Herramientas y calculadoras</h2>
<p>iTRAIN incluye una suite de <strong>47 calculadoras científicas</strong> distribuidas en <strong>10 módulos</strong>:</p>
<div class="kpi-row">
  {_stat_card('PLANIFICACIÓN', '5', 'estructural')}
  {_stat_card('CARGA Y FUERZA', '6', 'periodización')}
  {_stat_card('INTENSIDAD', '5', 'fisiológica')}
  {_stat_card('CONTROL', '5', 'de carga')}
  {_stat_card('BIOMECÁNICA', '4', 'movimiento')}
  {_stat_card('TESTS', '5', 'evaluación')}
</div>
<p class="muted">Antropometría · Nutrición · Control médico · Periodización avanzada</p>
</section>"""))

    # ----- CONCLUSIONS -----
    if payload.sections.conclusions:
        if payload.custom_conclusions:
            paras = "".join([f"<p>{_esc(p)}</p>" for p in payload.custom_conclusions.split("\n\n") if p.strip()])
        else:
            paras = (
                "<p>El plan presentado consolida los lineamientos de periodización, control y evaluación necesarios "
                "para alcanzar los objetivos establecidos en la temporada.</p>"
                "<p>Se recomienda la revisión continua de las cargas, indicadores y resultados de competencia para "
                "ajustar el plan en cada mesociclo.</p>"
            )
        parts.append(("conclusions", f"""<section class="page-break">
<span class="badge">CIERRE</span>
<h2>Conclusiones</h2>
{paras}
<div class="callout"><strong>Próximos pasos</strong> · Consolidar evaluaciones del próximo control, ajustar la curva de carga semanal y revisar el calendario competitivo. iTRAIN actualiza estos datos en tiempo real.</div>
</section>"""))

    # Default order if user did not provide one
    DEFAULT_ORDER = [
        "cover", "toc", "introduction",
        "diagnostic_previous", "diagnostic_active",
        "info_entities", "info_teams", "info_athletes", "info_sports",
        "info_tournaments", "info_coaches",
        "eval_medical", "eval_anthropometric", "eval_physical",
        "eval_biomechanical", "eval_technical", "eval_tactical",
        "eval_psychological", "eval_theoretical",
        "competitions",
        "periodization_structure", "periodization_load",
        "graphic_plan", "sessions", "tools", "conclusions",
    ]
    if payload.section_order:
        # Build ordered list following user's preference + append any leftover parts
        order_idx = {sid: i for i, sid in enumerate(payload.section_order)}
        parts.sort(key=lambda t: order_idx.get(t[0], 9000 + DEFAULT_ORDER.index(t[0])
                                                if t[0] in DEFAULT_ORDER else 9999))

    # Inject anchor id="sec-{sid}" on every <section> opening tag for clickable TOC
    def _inject_id(sid: str, html: str) -> str:
        for klass in ('page-break', 'cover apa-cover', 'cover minimal-cover',
                      'cover inst-cover', 'cover'):
            opener = f'<section class="{klass}">'
            if opener in html:
                return html.replace(opener, f'<section class="{klass}" id="sec-{sid}">', 1)
        return html
    body_html = ''.join(_inject_id(sid, html) for sid, html in parts)

    # ====== FOOTER ======
    footer_html = f"""<div class="footer-brand">
  {f'<img src="data:image/png;base64,{icon_b64}" alt=""/>' if icon_b64 else ''}
  Generado por <strong>iTRAIN</strong> · {today}
</div>"""

    # ====== CSS PREMIUM ======
    css = f"""
@page {{ size: A4; margin: 18mm 14mm 16mm; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ background: {bg}; color: {fg}; font-family: {style['font']}; font-size: 10.5pt; line-height: 1.55; -webkit-font-smoothing: antialiased; }}
body {{ padding: 0; }}
.page-break {{ page-break-before: always; padding-top: 4pt; }}
section {{ margin-bottom: 14pt; }}
section:first-child {{ margin-top: 0; }}

/* HERO COVER */
.cover {{
  background: {hero_grad};
  color: #fff;
  padding: 56pt 40pt 40pt;
  border-radius: 0;
  margin: -18mm -14mm 18pt -14mm;
  min-height: 100vh;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
  page-break-after: always;
}}
/* subtle dot grid pattern overlay for premium feel */
.cover::before {{
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1.5px),
    radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1.5px);
  background-size: 28pt 28pt, 56pt 56pt;
  background-position: 0 0, 14pt 14pt;
  pointer-events: none;
  opacity: 0.55;
}}
/* huge faint watermark style mark */
.cover-watermark {{
  position: absolute;
  bottom: -36pt; right: -24pt;
  font-size: 240pt; font-weight: 900;
  color: {accent}; opacity: 0.05;
  line-height: 1; letter-spacing: -10pt;
  pointer-events: none; user-select: none;
  font-family: 'Bebas Neue', Impact, sans-serif;
}}
.cover::after {{
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 50%; height: 100%;
  background: radial-gradient(circle at right center, {accent}22 0%, transparent 60%);
  pointer-events: none;
}}
.cover .org-name {{
  color: {accent}; font-size: 11pt; text-transform: uppercase; letter-spacing: 4px;
  font-weight: 800; margin-bottom: 18pt;
}}
.cover .badge {{
  background: {accent}; color: {primary};
  padding: 5pt 14pt; border-radius: 999pt;
  font-size: 9pt; font-weight: 900; letter-spacing: 2px;
  display: inline-block; margin-bottom: 14pt;
  text-transform: uppercase;
}}
.cover-title {{
  color: #fff;
  font-size: 44pt; font-weight: 900; line-height: 1.05;
  letter-spacing: -1.5px; margin: 0 0 8pt;
  max-width: 90%;
}}
.cover-sub {{
  color: rgba(255,255,255,0.85);
  font-size: 14pt; max-width: 80%;
  margin: 0 0 28pt; font-weight: 500;
}}
.cover-kpis {{
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 14pt;
  margin: 12pt 0 24pt; max-width: 480pt;
}}
.cover-kpis > div {{
  border-left: 3pt solid {accent};
  padding: 4pt 0 4pt 12pt;
}}
.cover-kpis strong {{
  color: {accent}; display: block; font-size: 8pt;
  text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;
  margin-bottom: 3pt;
}}
.cover-kpis span {{ color: #fff; font-size: 13pt; font-weight: 700; }}
.cover-meta {{
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 12pt;
  max-width: 460pt; margin-top: auto;
  padding-top: 16pt; border-top: 1pt solid rgba(255,255,255,0.15);
}}
.cover-meta > div {{
  border-left: 2pt solid {accent};
  padding-left: 10pt;
}}
.cover-meta strong {{
  display: block; color: {accent}; font-size: 7.5pt;
  text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;
  margin-bottom: 2pt;
}}
.cover-meta span {{ color: rgba(255,255,255,0.92); font-size: 10pt; font-weight: 600; }}
.cover-dedication {{ margin-top: 22pt; padding: 10pt 16pt; border-left: 2pt solid {accent}88; color: rgba(255,255,255,0.7); font-size: 10pt; max-width: 480pt; }}

/* APA COVER */
.apa-cover {{ background: #fff !important; color: {fg}; min-height: 100vh; height: 100vh; padding: 48pt 60pt; display: flex; align-items: center; justify-content: center; margin: -18mm -14mm 0 -14mm !important; page-break-after: always; }}
.apa-cover::after {{ display: none; }}
.apa-stack {{ width: 100%; max-width: 480pt; text-align: center; }}
.apa-org {{ font-family: 'Playfair Display', Georgia, serif; font-size: 16pt; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: {primary}; margin-bottom: 14pt; }}
.apa-rule {{ width: 80pt; height: 3pt; background: {accent}; margin: 0 auto 28pt; }}
.apa-title {{ font-family: 'Playfair Display', Georgia, serif; font-size: 30pt; font-weight: 900; line-height: 1.2; color: {primary}; margin: 0 0 8pt; letter-spacing: -0.5px; }}
.apa-sub {{ font-family: 'Playfair Display', Georgia, serif; font-size: 14pt; color: #475569; font-style: italic; margin: 0 0 32pt; }}
.apa-table {{ width: auto; max-width: 380pt; margin: 0 auto; border-collapse: collapse; font-size: 10pt; }}
.apa-table td {{ padding: 7pt 12pt; border: none; text-align: left; vertical-align: top; }}
.apa-table .apa-key {{ font-weight: 800; color: {primary}; text-transform: uppercase; letter-spacing: 1px; font-size: 8.5pt; width: 150pt; padding-right: 14pt; border-right: 2pt solid {accent}; }}
.apa-table .apa-val {{ color: {fg}; font-weight: 600; }}
.apa-dedication {{ margin-top: 28pt; padding-top: 16pt; border-top: 1pt solid #e2e8f0; color: #64748b; font-size: 10pt; font-style: italic; }}

/* MINIMAL COVER */
.minimal-cover {{ background: #fff !important; color: {fg}; padding: 96pt 64pt; min-height: 100vh; height: 100vh; margin: -18mm -14mm 0 -14mm !important; page-break-after: always; position: relative; display: flex; flex-direction: column; justify-content: space-between; }}
.minimal-cover::after {{ display: none; }}
.minimal-cover::before {{ content: '01'; position: absolute; top: 60pt; right: 64pt; font-family: 'Oswald', sans-serif; font-size: 92pt; font-weight: 200; color: {accent}; opacity: 0.18; line-height: 1; letter-spacing: -4pt; }}
.min-rule {{ width: 50pt; height: 4pt; background: {accent}; margin-bottom: 32pt; }}
.min-org {{ color: {primary}; font-size: 9pt; font-weight: 800; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 16pt; }}
.min-title {{ color: {primary}; font-size: 56pt; font-weight: 900; line-height: 1; letter-spacing: -2.5px; margin: 0 0 12pt; max-width: 90%; }}
.min-sub {{ color: #475569; font-size: 14pt; max-width: 70%; margin: 0 0 60pt; font-weight: 500; line-height: 1.45; }}
.min-meta {{ display: flex; gap: 32pt; flex-wrap: wrap; color: #64748b; font-size: 9.5pt; padding-top: 16pt; border-top: 2pt solid {accent}; align-items: baseline; }}
.min-meta strong {{ color: {primary}; font-weight: 700; }}

/* INSTITUTIONAL COVER */
.inst-cover {{ background: #fff !important; color: {fg}; padding: 24pt; min-height: 100vh; height: 100vh; margin: -18mm -14mm 0 -14mm !important; page-break-after: always; }}
.inst-cover::after {{ display: none; }}
.inst-frame {{ border: 3pt double {primary}; padding: 12pt; height: calc(100vh - 48pt); position: relative; }}
.inst-frame::before, .inst-frame::after {{ content: ''; position: absolute; width: 24pt; height: 24pt; border: 3pt solid {accent}; }}
.inst-frame::before {{ top: -3pt; left: -3pt; border-right: none; border-bottom: none; }}
.inst-frame::after {{ bottom: -3pt; right: -3pt; border-left: none; border-top: none; }}
.inst-inner {{ border: 1pt solid {accent}; padding: 36pt 30pt; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; text-align: center; position: relative; }}
.inst-org {{ color: {primary}; font-size: 13pt; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; margin: 18pt 0 4pt; }}
.inst-program {{ color: #64748b; font-size: 10pt; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16pt; }}
.inst-line {{ width: 240pt; height: 0; border-top: 2pt solid {accent}; margin: 12pt auto; position: relative; }}
.inst-line::before {{ content: '◆'; position: absolute; top: -7pt; left: 50%; transform: translateX(-50%); color: {accent}; font-size: 9pt; background: #fff; padding: 0 4pt; }}
.inst-title {{ color: {primary}; font-size: 28pt; font-weight: 900; line-height: 1.15; max-width: 90%; margin: 4pt 0; letter-spacing: -0.5px; }}
.inst-sub {{ color: #475569; font-size: 13pt; font-style: italic; margin: 6pt 0 0; }}
.inst-meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; margin-top: 28pt; max-width: 420pt; width: 100%; }}
.inst-meta > div {{ text-align: left; padding: 8pt 12pt; background: {secondary}; border-left: 4pt solid {accent}; border-radius: 4pt; }}
.inst-meta span {{ display: block; font-size: 7.5pt; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 2pt; }}
.inst-meta strong {{ color: {primary}; font-size: 10.5pt; }}

/* SECTION HEADERS */
.badge {{
  display: inline-block;
  background: {primary}; color: {accent};
  padding: 4pt 11pt; border-radius: 999pt;
  font-size: 8pt; font-weight: 900; letter-spacing: 1.5px;
  text-transform: uppercase; margin-bottom: 8pt;
}}
h2 {{
  font-size: 20pt; font-weight: 900; line-height: 1.15;
  letter-spacing: -0.5px; margin: 4pt 0 12pt;
  color: {primary};
  padding-bottom: 8pt;
  border-bottom: 3pt solid {accent};
}}
h2 .count {{
  font-size: 11pt; font-weight: 600; color: #94a3b8;
  letter-spacing: 0; text-transform: none;
}}

/* PARAGRAPHS */
p {{ margin: 6pt 0; color: {fg}; }}
p.muted, .muted {{ color: #94a3b8; font-style: italic; }}

/* TOC */
.toc {{ list-style: none; padding: 0; margin-top: 8pt; }}
.toc li {{
  display: flex; align-items: baseline;
  padding: 6pt 0; border-bottom: 1pt dotted #cbd5e1;
  font-size: 10pt; gap: 8pt;
}}
.toc-num {{
  font-weight: 900; color: {accent};
  background: {primary}; padding: 2pt 6pt; border-radius: 4pt;
  font-size: 8.5pt; min-width: 24pt; text-align: center;
}}
.toc-label {{ color: {fg}; font-weight: 600; }}
.toc-dots {{ flex: 1; border-bottom: 1pt dotted #94a3b8; margin: 0 4pt; height: 1px; align-self: end; margin-bottom: 5pt; }}
.toc-page {{ font-weight: 700; color: {primary}; min-width: 24pt; text-align: right; }}

/* CALLOUT */
.callout {{
  background: {primary}; color: #fff;
  padding: 12pt 16pt; border-radius: 8pt;
  margin: 10pt 0; border-left: 4pt solid {accent};
}}
.callout strong {{ color: {accent}; }}

/* KPI ROW */
.kpi-row {{
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10pt;
  margin: 12pt 0;
}}
.kpi-card {{
  background: {secondary};
  border-radius: 10pt;
  padding: 10pt 14pt;
  border-left: 4pt solid {accent};
}}
.kpi-eyebrow {{
  font-size: 7.5pt; font-weight: 900; letter-spacing: 1.5px;
  text-transform: uppercase; color: {primary}; margin-bottom: 4pt;
}}
.kpi-value {{
  font-size: 22pt; font-weight: 900; line-height: 1;
  letter-spacing: -1px; color: {primary};
}}
.kpi-sub {{
  font-size: 7.5pt; color: #64748b; margin-top: 3pt;
  font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
}}

/* TABLES */
.data-tbl {{
  width: 100%; border-collapse: separate; border-spacing: 0;
  margin: 8pt 0 14pt; font-size: 9.5pt;
  border-radius: 8pt; overflow: hidden;
  border: 1pt solid #e2e8f0;
}}
.data-tbl th {{
  background: {primary}; color: {accent};
  padding: 8pt 10pt; text-align: left;
  font-size: 8.5pt; font-weight: 900; letter-spacing: 1px;
  text-transform: uppercase;
}}
.data-tbl td {{
  padding: 7pt 10pt; border-bottom: 1pt solid #e2e8f0;
  vertical-align: middle;
}}
.data-tbl tbody tr:nth-child(even) td {{ background: {secondary}; }}
.data-tbl tbody tr:last-child td {{ border-bottom: none; }}
.td-num {{ font-variant-numeric: tabular-nums; font-weight: 700; color: {primary}; }}
.td-cat {{ color: #64748b; font-size: 9pt; }}

/* PILLS */
.pill {{
  display: inline-block; padding: 2pt 8pt; border-radius: 999pt;
  font-size: 8pt; font-weight: 700; letter-spacing: 0.5px;
}}
.pill-phase {{ background: {accent}; color: {primary}; }}

/* EVALUATION BLOCK */
.ev-block {{
  background: {secondary}; border-radius: 10pt;
  padding: 12pt 14pt; margin: 8pt 0 14pt;
  border-left: 4pt solid {accent};
  page-break-inside: avoid;
}}
.ev-head {{
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 8pt;
}}
.ev-date {{ font-size: 8pt; font-weight: 700; color: #64748b; letter-spacing: 1px; text-transform: uppercase; }}
.ev-title {{ font-size: 13pt; font-weight: 900; color: {primary}; margin-top: 2pt; }}
.ev-pct {{ text-align: right; }}
.ev-pct-num {{ font-size: 22pt; font-weight: 900; line-height: 1; letter-spacing: -1px; }}
.ev-pct-lbl {{ font-size: 7pt; font-weight: 800; letter-spacing: 1.2px; color: #94a3b8; margin-top: 2pt; }}

/* FOOTER */
.footer-brand {{
  display: flex; align-items: center; justify-content: center; gap: 8pt;
  color: #94a3b8; font-size: 8.5pt; margin-top: 24pt;
  padding-top: 12pt; border-top: 1pt solid #e2e8f0;
}}
.footer-brand img {{ height: 16pt; width: 16pt; object-fit: contain; }}
.footer-brand strong {{
  color: {accent}; background: {primary};
  padding: 2pt 7pt; border-radius: 4pt; font-weight: 800;
}}
"""

    # ====== Style-specific overrides ======
    overrides = {
        "olimpico": f"""
.cover-title {{ font-family: 'Playfair Display', Georgia, serif; font-style: italic; }}
.cover .badge {{ font-family: 'Inter', sans-serif; }}
h2 {{ font-family: 'Playfair Display', Georgia, serif; font-style: italic; font-weight: 900; }}
.callout {{ background: linear-gradient(135deg, #0B1438 0%, #1a2456 100%); }}
.kpi-card {{ border-left-color: {accent}; background: #FAF6E8; }}
.kpi-value {{ color: {primary}; font-family: 'Playfair Display', serif; }}
""",
        "atleta": """
.cover-title { text-transform: uppercase; letter-spacing: -2px; font-weight: 900; }
.cover .badge { letter-spacing: 3px; }
h2 { text-transform: uppercase; letter-spacing: -0.5px; }
""",
        "sport": f"""
body {{ background: {bg}; color: {fg}; }}
section {{ background: rgba(255,255,255,0.02); padding: 12pt; border-radius: 8pt; }}
h2 {{ color: {accent}; text-transform: uppercase; letter-spacing: -0.5px; }}
p, .toc-label, .td-cat {{ color: rgba(255,255,255,0.85); }}
.data-tbl {{ background: rgba(15,23,42,0.6); border-color: rgba(255,255,255,0.1); }}
.data-tbl td {{ border-color: rgba(255,255,255,0.08); color: #fff; }}
.data-tbl tbody tr:nth-child(even) td {{ background: rgba(255,255,255,0.04); }}
.kpi-card {{ background: rgba(255,255,255,0.06); }}
.kpi-eyebrow, .kpi-value {{ color: #fff; }}
.cover-title {{ font-family: 'Bebas Neue', Impact, sans-serif; text-transform: uppercase; }}
.toc-num {{ background: {accent}; color: {bg}; }}
.toc li {{ border-color: rgba(255,255,255,0.1); }}
.footer-brand {{ color: rgba(255,255,255,0.5); border-color: rgba(255,255,255,0.1); }}
""",
        "training": f"""
.cover-title {{ font-weight: 800; letter-spacing: -1px; }}
h2 {{ background: linear-gradient(90deg, {primary}10, transparent); padding: 8pt 12pt; border-radius: 6pt; border-bottom-color: {primary}; }}
.kpi-card {{ background: #fff; border: 1pt solid #e2e8f0; border-left: 4pt solid {primary}; }}
""",
        "coach": f"""
.cover-title {{ font-family: 'Roboto Slab', Georgia, serif; font-weight: 900; }}
h2 {{ color: {primary}; border-left: 6pt solid {accent}; padding-left: 12pt; border-bottom: none; }}
.callout {{ background: {accent}15; color: {primary}; border-left: 4pt solid {accent}; }}
.callout strong {{ color: {accent}; }}
""",
        "federation": f"""
.cover-title {{ color: {accent}; text-transform: uppercase; letter-spacing: -1px; font-weight: 900; }}
.cover-sub {{ color: rgba(204,255,0,0.85); }}
.cover .org-name {{ color: {accent}; }}
.cover-meta strong {{ color: {accent}; }}
.cover-kpis strong {{ color: {accent}; }}
""",
        "campeon": f"""
.cover-title {{ font-family: 'Bebas Neue', Impact, sans-serif; color: {accent}; text-shadow: 0 2pt 18pt {accent}66; text-transform: uppercase; letter-spacing: -1px; font-size: 56pt; }}
.cover .badge {{ background: {accent}; color: #000; }}
.cover-sub {{ color: rgba(255,215,0,0.85); }}
h2 {{ font-family: 'Bebas Neue', Impact, sans-serif; color: {primary}; text-transform: uppercase; letter-spacing: 1px; border-bottom: 4pt solid {accent}; }}
.badge {{ background: {accent}; color: #000; }}
.kpi-card {{ background: #FFF8E7; border-left-color: {accent}; }}
.kpi-value {{ color: {primary}; font-family: 'Bebas Neue', sans-serif; }}
.callout {{ background: linear-gradient(135deg, #1A1A1A, #333); color: {accent}; }}
.callout strong {{ color: #fff; }}
""",
        "primer-lugar": f"""
.cover-title {{ font-family: 'Oswald', sans-serif; color: #fff; text-transform: uppercase; letter-spacing: -0.5px; }}
.cover .badge {{ background: {accent}; color: #000; }}
.cover .org-name {{ color: {accent}; }}
h2 {{ font-family: 'Oswald', sans-serif; text-transform: uppercase; color: {primary}; border-bottom: 3pt solid {accent}; letter-spacing: 0.5px; }}
.kpi-card {{ background: linear-gradient(180deg, #fff 0%, {secondary} 100%); border-left-color: {accent}; }}
.kpi-eyebrow {{ color: #64748b; }}
.kpi-value {{ color: {primary}; font-family: 'Oswald', sans-serif; }}
.cover-meta strong {{ color: {accent}; }}
.cover-kpis strong {{ color: {accent}; }}
""",
    }

    # ====== Google Fonts (load on every doc) ======
    fonts_link = (
        "<link href=\"https://fonts.googleapis.com/css2?"
        "family=Inter:wght@400;600;700;800;900&"
        "family=Bebas+Neue&"
        "family=Oswald:wght@400;600;700&"
        "family=Roboto+Slab:wght@400;700;900&"
        "family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&"
        "family=Russo+One&display=swap\" rel=\"stylesheet\"/>"
    )

    return f"""<!DOCTYPE html><html lang="es">
<head>
<meta charset="UTF-8">
<title>{_esc(plan_name)}</title>
{fonts_link}
<style>{css}{overrides.get(style_id, "")}</style>
</head>
<body>
{body_html}
{footer_html}
</body></html>"""


async def _render_pdf(html: str) -> bytes:
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'])
        page = await browser.new_page(viewport={"width": 794, "height": 1123})
        await page.set_content(html, wait_until="networkidle")
        await page.wait_for_timeout(800)
        pdf = await page.pdf(format="A4", print_background=True,
                             margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await browser.close()
    return pdf


async def _render_preview_png(html: str) -> bytes:
    """Render HTML and capture COMPLETE document as a tall PNG for scrollable preview."""
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'])
        page = await browser.new_page(viewport={"width": 794, "height": 1123},
                                      device_scale_factor=1.5)
        await page.set_content(html, wait_until="networkidle")
        await page.wait_for_timeout(500)
        # Full-page screenshot — captures the entire scroll height so the user
        # can read the whole document inside the modal like a Word preview.
        png = await page.screenshot(full_page=True, type="png")
        await browser.close()
    return png


@router.post("/preview")
async def preview_master_report(payload: MasterReportPayload, user=Depends(get_current_user_dep())):
    """Devuelve PNG de la primera página (cover) — feedback rápido sin PDF."""
    uid = user.get("id") or user.get("user_id")
    html = await _build_html(payload, uid)
    try:
        png = await _render_preview_png(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando preview: {e}")
    return Response(content=png, media_type="image/png",
                    headers={"Cache-Control": "no-store"})


@router.post("/generate")
async def generate_master_report(payload: MasterReportPayload, user=Depends(get_current_user_dep())):
    uid = user.get("id") or user.get("user_id")
    html = await _build_html(payload, uid)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"reporte_{(payload.title or 'plan').replace(' ', '_').lower()}_{payload.style}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})


# ============= SHARE / PUBLIC DOWNLOAD =============

@router.post("/share")
async def create_master_report_share(payload: MasterReportPayload, user=Depends(get_current_user_dep())):
    """Persiste el payload del reporte y devuelve share_id (PDF descargable sin auth durante 30 días)."""
    import secrets as _secrets
    from datetime import timedelta as _td
    uid = user.get("id") or user.get("user_id")
    if not payload.plan_id:
        raise HTTPException(400, "plan_id es requerido para compartir")
    plan = await _fetch_plan(payload.plan_id, uid)
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    share_id = f"MRP-{_secrets.token_hex(4)}"
    doc = {
        "share_id": share_id,
        "owner_uid": uid,
        "plan_id": payload.plan_id,
        "payload": payload.model_dump() if hasattr(payload, 'model_dump') else payload.dict(),
        "created_at": datetime.now(timezone.utc),
        "expires_at": datetime.now(timezone.utc) + _td(days=30),
    }
    await _db.master_report_shares.insert_one(doc)
    return {"share_id": share_id, "expires_in_days": 30}


@router.get("/shared/{share_id}/pdf")
async def download_shared_master_report(share_id: str):
    """Descarga pública (sin auth) del PDF compartido."""
    doc = await _db.master_report_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Reporte compartido no encontrado")
    expires_at = doc.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(410, "El enlace ha expirado")
    payload_dict = doc.get("payload") or {}
    payload = MasterReportPayload(**payload_dict)
    html = await _build_html(payload, doc.get("owner_uid"))
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"reporte_{(payload.title or 'plan').replace(' ', '_').lower()}_{payload.style}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{fname}"'})
