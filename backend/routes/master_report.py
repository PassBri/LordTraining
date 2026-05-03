"""
Reporte PDF Maestro · Constructor selectivo (T6 + T7)
- 5 estilos visuales: APA, Michigan, Sport, Training, Coach
- Logo opcional del club/escuela/federación
- Selector de secciones: Portada, Tabla de contenido, Plan anterior, Plan activo,
  Información (entidades, equipos, atletas, deportes, torneos, entrenadores),
  Evaluación (8 controles), Competencias, Periodización, Plan Gráfico, Herramientas
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


# ============= ESTILOS =============
STYLES: Dict[str, Dict[str, str]] = {
    "apa": {
        "name": "APA · Académico",
        "font": "'Times New Roman', Georgia, serif",
        "primary": "#0F172A",
        "accent": "#94A3B8",
        "bg": "#FFFFFF",
        "heading_size": "16pt",
        "body_size": "11pt",
        "page_margin": "25mm 20mm 25mm 25mm",
        "vibe": "Académico riguroso · doble espacio · sangrías francesas",
    },
    "michigan": {
        "name": "Michigan · Universitario",
        "font": "'Helvetica Neue', Helvetica, Arial, sans-serif",
        "primary": "#00274C",
        "accent": "#FFCB05",
        "bg": "#FFFFFF",
        "heading_size": "20pt",
        "body_size": "10.5pt",
        "page_margin": "20mm 18mm",
        "vibe": "Universitario clásico · azul/dorado · headers grandes",
    },
    "sport": {
        "name": "Sport · Deportivo dinámico",
        "font": "'Bebas Neue', 'Helvetica Neue', Impact, sans-serif",
        "primary": "#0EA5E9",
        "accent": "#F97316",
        "bg": "#0F172A",
        "fg": "#F8FAFC",
        "heading_size": "28pt",
        "body_size": "11pt",
        "page_margin": "0",
        "vibe": "Estilo magazine deportivo · fondo oscuro · tipografía condensada",
        "dark": True,
    },
    "training": {
        "name": "Training · Profesional clínico",
        "font": "'Inter', system-ui, sans-serif",
        "primary": "#16A34A",
        "accent": "#0F172A",
        "bg": "#FAFAFA",
        "heading_size": "18pt",
        "body_size": "10pt",
        "page_margin": "18mm 16mm",
        "vibe": "Limpio profesional · colores sobrios · tablas funcionales",
    },
    "coach": {
        "name": "Coach · Manual de entrenador",
        "font": "'Roboto Slab', Georgia, serif",
        "primary": "#7C3AED",
        "accent": "#F59E0B",
        "bg": "#FFFFFF",
        "heading_size": "22pt",
        "body_size": "11pt",
        "page_margin": "20mm",
        "vibe": "Manual ilustrado · acentos cálidos · sidebar de pistas y tips",
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


class MasterReportPayload(BaseModel):
    plan_id: Optional[str] = None
    title: Optional[str] = "Plan de Entrenamiento"
    subtitle: Optional[str] = ""
    style: str = "training"  # apa | michigan | sport | training | coach
    sections: SectionFlags = Field(default_factory=SectionFlags)
    org_name: Optional[str] = ""           # Club/Escuela/Federación
    org_logo_b64: Optional[str] = ""       # data:image/png;base64,... (opcional)
    coach_name: Optional[str] = ""
    athlete_name: Optional[str] = ""


# ============= STYLES ENDPOINT =============

@router.get("/styles")
async def list_styles():
    """Lista los 5 estilos disponibles para el frontend."""
    return {"styles": [
        {"id": k, "name": v["name"], "vibe": v["vibe"], "primary": v["primary"], "accent": v["accent"]}
        for k, v in STYLES.items()
    ]}


@router.get("/sections-catalog")
async def sections_catalog():
    """Catálogo de secciones disponibles para el selector."""
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
        {"id": "tools", "title": "Herramientas", "items": [
            {"id": "tools", "label": "Herramientas y calculadoras"},
        ]},
    ]}


# ============= HTML BUILDERS =============

def _section_h1(title: str, style: dict) -> str:
    return f"""<div class="section-break"></div>
<h1 class="sec-title">{_esc(title)}</h1>
<hr class="sec-rule"/>"""


async def _fetch_plan(plan_id: str, uid: str) -> Optional[dict]:
    return await _db.training_plans.find_one(
        {"id": plan_id, "$or": [{"user_id": uid}, {"coach_id": uid}]},
        {"_id": 0}
    )


async def _build_html(payload: MasterReportPayload, user_id: str) -> str:
    style = STYLES.get(payload.style) or STYLES["training"]
    primary = style["primary"]; accent = style["accent"]
    is_dark = style.get("dark", False)
    bg = style.get("bg", "#fff"); fg = style.get("fg", "#0F172A")
    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    
    plan_doc = None
    if payload.plan_id:
        plan_doc = await _fetch_plan(payload.plan_id, user_id)
    
    plan_name = (plan_doc or {}).get("name") or payload.title or "Plan de Entrenamiento"
    
    # Logo block
    logo_html = ""
    if payload.org_logo_b64:
        logo_html = f'<img src="{payload.org_logo_b64}" alt="logo" style="max-height:80pt;max-width:160pt;object-fit:contain;display:block;margin:0 auto 12pt;"/>'
    
    # Try to load brand
    brand_b64 = ""
    try:
        with open("/app/frontend/public/brand/itrain-icon-pdf.png", "rb") as f:
            brand_b64 = base64.b64encode(f.read()).decode()
    except Exception: pass
    
    parts: List[str] = []
    toc_entries: List[str] = []
    
    # ======= COVER =======
    if payload.sections.cover:
        parts.append(f"""<div class="cover">
  {logo_html if logo_html else f'<img src="data:image/png;base64,{brand_b64}" style="height:64pt;display:block;margin:0 auto 16pt"/>' if brand_b64 else ''}
  {f'<p class="org">{_esc(payload.org_name)}</p>' if payload.org_name else ''}
  <h1 class="cover-title">{_esc(plan_name)}</h1>
  {f'<p class="cover-sub">{_esc(payload.subtitle)}</p>' if payload.subtitle else ''}
  <div class="cover-meta">
    {f'<div><strong>Atleta</strong>{_esc(payload.athlete_name)}</div>' if payload.athlete_name else ''}
    {f'<div><strong>Entrenador</strong>{_esc(payload.coach_name)}</div>' if payload.coach_name else ''}
    <div><strong>Fecha</strong>{today}</div>
    <div><strong>Estilo</strong>{_esc(style["name"])}</div>
  </div>
</div>""")
    
    # ======= TOC =======
    if payload.sections.toc:
        toc_items = []
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
            "tools": "Herramientas y calculadoras",
        }
        n = 1
        for key, label in labels.items():
            if flags.get(key):
                toc_items.append(f'<li><span>{n}. {_esc(label)}</span><span class="dot"></span><span>p. {n}</span></li>')
                n += 1
        parts.append(f"""<div class="section-break"></div>
<h1 class="sec-title">Tabla de Contenido</h1>
<hr class="sec-rule"/>
<ol class="toc">{''.join(toc_items)}</ol>""")
    
    # ======= INTRODUCTION =======
    if payload.sections.introduction:
        parts.append(_section_h1("Introducción", style) + f"""
<p>El presente documento detalla el plan de entrenamiento <strong>{_esc(plan_name)}</strong> elaborado por {_esc(payload.coach_name) or 'el cuerpo técnico'}.
Se incluye la planificación estructural, la distribución de cargas, los controles previstos y los objetivos de la temporada.</p>
<p>Estilo de documento: <strong>{_esc(style['name'])}</strong>. {_esc(style['vibe'])}.</p>""")
    
    # ======= DIAGNOSTIC =======
    if payload.sections.diagnostic_previous:
        prev = await _db.plan_previous_analysis_ai_cache.find_one({"user_id": user_id}, {"_id": 0}) or {}
        parts.append(_section_h1("Diagnóstico · Plan Anterior", style) +
                     f"<p>Análisis y aprendizajes del ciclo anterior.</p><p>{_esc(prev.get('summary', '— Sin análisis registrado —'))}</p>")
    
    if payload.sections.diagnostic_active and plan_doc:
        weeks = plan_doc.get("total_weeks", "—")
        sport = plan_doc.get("sport", "—")
        parts.append(_section_h1("Diagnóstico · Plan Activo", style) +
                     f"""<p><strong>Modelo:</strong> {_esc(plan_doc.get('model_name') or plan_doc.get('model'))}</p>
<p><strong>Deporte:</strong> {_esc(sport)}</p>
<p><strong>Duración:</strong> {weeks} semanas</p>
<p>{_esc(plan_doc.get('description') or '')}</p>""")
    
    # ======= INFO =======
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
            cur = _db[coll].find({"$or": [{"user_id": user_id}, {"coach_id": user_id}]}, {"_id": 0}).limit(50)
            items = await cur.to_list(length=50)
            rows = ''.join([
                f"<tr><td>{i+1}</td><td>{_esc(it.get('name') or it.get('full_name') or '—')}</td><td>{_esc(it.get('description') or it.get('specialization') or it.get('sport') or '')}</td></tr>"
                for i, it in enumerate(items)
            ]) or "<tr><td colspan='3' style='text-align:center;color:#94a3b8'>Sin registros</td></tr>"
            parts.append(_section_h1(f"Información · {title}", style) +
                         f"<table class='info-tbl'><thead><tr><th>#</th><th>Nombre</th><th>Detalle</th></tr></thead><tbody>{rows}</tbody></table>")
    
    # ======= EVALUACIÓN =======
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
            q = {"user_id": user_id, "evaluation_type": et}
            if payload.plan_id: q["plan_id"] = payload.plan_id
            cur = _db.plan_evaluations_v2.find(q, {"_id": 0}).sort("date", -1).limit(10)
            evs = await cur.to_list(length=10)
            if not evs:
                parts.append(_section_h1(f"Evaluación · {title}", style) + "<p style='color:#94a3b8;font-style:italic'>Sin controles registrados</p>")
                continue
            blocks = []
            for ev in evs:
                aspects = ev.get("aspects") or []
                rows = ''.join([
                    f"<tr><td>{_esc(a.get('label'))}</td><td>{_esc(a.get('category'))}</td><td>{a.get('value', '—')}</td><td>{a.get('target', '—')}</td><td>{a.get('scale_unit', '')}</td></tr>"
                    for a in aspects
                ]) or "<tr><td colspan='5' style='color:#94a3b8'>Sin aspectos</td></tr>"
                blocks.append(f"""<h3>{_esc(ev.get('date'))} · {_esc(ev.get('title') or 'Control')}</h3>
<table class='info-tbl'><thead><tr><th>Aspecto</th><th>Categoría</th><th>Valor</th><th>Objetivo</th><th>Unidad</th></tr></thead><tbody>{rows}</tbody></table>""")
            parts.append(_section_h1(f"Evaluación · {title}", style) + ''.join(blocks))
    
    # ======= COMPETENCIAS =======
    if payload.sections.competitions:
        cur = _db.tournaments.find({"$or": [{"user_id": user_id}, {"coach_id": user_id}]}, {"_id": 0}).limit(50)
        comps = await cur.to_list(length=50)
        rows = ''.join([
            f"<tr><td>{_esc(c.get('name'))}</td><td>{_esc(c.get('start_date'))}</td><td>{_esc(c.get('location') or '')}</td><td>{_esc(c.get('category') or '')}</td></tr>"
            for c in comps
        ]) or "<tr><td colspan='4' style='color:#94a3b8;text-align:center'>Sin competencias</td></tr>"
        parts.append(_section_h1("Competencias", style) +
                     f"<table class='info-tbl'><thead><tr><th>Nombre</th><th>Fecha</th><th>Lugar</th><th>Categoría</th></tr></thead><tbody>{rows}</tbody></table>")
    
    # ======= PERIODIZACIÓN =======
    if payload.sections.periodization_structure and plan_doc:
        macros = plan_doc.get("macrocycles") or []
        rows = []
        for mi, m in enumerate(macros):
            for ms in (m.get("mesocycles") or []):
                rows.append(f"<tr><td>{mi+1}</td><td>{_esc(ms.get('name') or '—')}</td><td>{_esc(ms.get('phase') or '—')}</td><td>{ms.get('weeks', '—')}</td><td>{ms.get('volume_pct') or ms.get('volume') or '—'}%</td><td>{ms.get('intensity_pct') or ms.get('intensity') or '—'}%</td></tr>")
        rows_html = ''.join(rows) or "<tr><td colspan='6' style='color:#94a3b8'>Sin estructura</td></tr>"
        parts.append(_section_h1("Periodización · Estructura", style) +
                     f"<table class='info-tbl'><thead><tr><th>Macro</th><th>Meso</th><th>Fase</th><th>Sem</th><th>Vol</th><th>Int</th></tr></thead><tbody>{rows_html}</tbody></table>")
    
    if payload.sections.periodization_load:
        parts.append(_section_h1("Periodización · Carga", style) +
                     "<p>Distribución de carga semanal y monitorización ACWR.</p><p style='color:#94a3b8;font-style:italic'>Ver Plan Gráfico para visualización completa.</p>")
    
    if payload.sections.graphic_plan:
        # Buscar último share del plan gráfico
        share = await _db.graphic_plan_shares.find_one(
            {"user_id": user_id, "plan_id": payload.plan_id},
            sort=[("created_at", -1)]
        )
        if share and share.get("image_b64"):
            parts.append(_section_h1("Plan Gráfico", style) +
                         f"<img src='{share['image_b64']}' style='max-width:100%;display:block;margin:0 auto;border-radius:6pt;border:1px solid #e2e8f0'/>")
        else:
            parts.append(_section_h1("Plan Gráfico", style) +
                         "<p style='color:#94a3b8;font-style:italic'>Captura del Plan Gráfico no disponible — genere el enlace público desde la sección Plan Gráfico para incluirla aquí.</p>")
    
    if payload.sections.tools:
        parts.append(_section_h1("Herramientas y calculadoras", style) +
                     "<p>Suite iTRAIN de 47 calculadoras científicas en 10 módulos: planificación estructural, carga y fuerza, intensidad fisiológica, control de carga, biomecánica, tests, antropometría, nutrición, control médico y periodización avanzada.</p>")
    
    body_html = ''.join(parts)
    
    # ====== CSS por estilo ======
    base_css = f"""
    @page {{ size: A4; margin: {style['page_margin']}; }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: {style['font']}; font-size: {style['body_size']}; color: {fg}; background: {bg}; line-height: 1.55; margin: 0; padding: {style['page_margin']}; }}
    .section-break {{ page-break-before: always; }}
    .sec-title {{ font-size: {style['heading_size']}; color: {primary}; margin: 0 0 8pt; font-weight: 800; }}
    .sec-rule {{ border: none; border-top: 2pt solid {primary}; margin: 0 0 14pt; }}
    h3 {{ color: {primary}; margin: 14pt 0 6pt; font-size: 11pt; }}
    p {{ margin: 0 0 8pt; }}
    .cover {{ text-align: center; padding: 80pt 20pt 0; min-height: 80vh; }}
    .org {{ font-size: 11pt; color: {accent}; text-transform: uppercase; letter-spacing: 4px; font-weight: 700; margin: 0 0 24pt; }}
    .cover-title {{ font-size: 38pt; color: {primary}; font-weight: 900; margin: 0 0 12pt; line-height: 1.1; }}
    .cover-sub {{ font-size: 14pt; color: {accent}; margin: 0 0 60pt; }}
    .cover-meta {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; max-width: 380pt; margin: 0 auto; text-align: left; }}
    .cover-meta div {{ border-left: 3pt solid {primary}; padding-left: 10pt; }}
    .cover-meta strong {{ display: block; color: {primary}; font-size: 8pt; text-transform: uppercase; letter-spacing: 1.5px; }}
    .toc {{ list-style: none; padding: 0; }}
    .toc li {{ display: flex; align-items: baseline; padding: 4pt 0; font-size: 10.5pt; }}
    .toc .dot {{ flex: 1; border-bottom: 1pt dotted {accent}; margin: 0 6pt; }}
    .info-tbl {{ width: 100%; border-collapse: collapse; margin: 6pt 0 14pt; font-size: 9.5pt; }}
    .info-tbl th {{ background: {primary}; color: #fff; padding: 6pt 8pt; text-align: left; font-weight: 700; }}
    .info-tbl td {{ padding: 6pt 8pt; border-bottom: 1pt solid #e2e8f0; }}
    .info-tbl tr:nth-child(even) td {{ background: rgba(0,0,0,0.02); }}
    """
    
    # Override por estilo
    style_overrides = {
        "apa": ".cover-title { font-style: italic; } body { line-height: 2; }",
        "michigan": ".cover-title { letter-spacing: -2px; } .sec-title { border-bottom: 4pt double " + accent + "; padding-bottom: 6pt; }",
        "sport": ".cover-title { text-transform: uppercase; letter-spacing: -1px; } body { background: " + bg + "; color: " + fg + "; } .info-tbl { background: rgba(255,255,255,0.05); } .info-tbl td { border-color: rgba(255,255,255,0.1); }",
        "training": ".cover-title { font-weight: 700; } .sec-title { background: linear-gradient(90deg, " + primary + "10, transparent); padding: 8pt 12pt; border-radius: 4pt; }",
        "coach": ".cover-title { font-family: 'Georgia', serif; } .sec-title { color: " + accent + "; border-left: 6pt solid " + primary + "; padding-left: 10pt; }",
    }
    
    return f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>{_esc(plan_name)}</title>
<style>{base_css}{style_overrides.get(payload.style, '')}</style></head>
<body>{body_html}</body></html>"""


async def _render_pdf(html: str) -> bytes:
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'])
        page = await browser.new_page(viewport={"width": 794, "height": 1123})
        await page.set_content(html, wait_until="domcontentloaded")
        await page.wait_for_timeout(500)
        pdf = await page.pdf(format="A4", print_background=True)
        await browser.close()
    return pdf


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
