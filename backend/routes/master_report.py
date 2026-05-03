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
        {"id": "tools", "title": "Herramientas", "items": [
            {"id": "tools", "label": "Herramientas y calculadoras"},
        ]},
    ]}


# ============= HELPERS =============

async def _fetch_plan(plan_id: str, uid: str) -> Optional[dict]:
    return await _db.training_plans.find_one(
        {"id": plan_id, "$or": [{"user_id": uid}, {"coach_id": uid}]},
        {"_id": 0}
    )


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
    parts: List[str] = []

    # ----- COVER -----
    if payload.sections.cover:
        # Mini KPIs si hay plan
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
        parts.append(f"""<section class="cover">
  {org_block}
  {f'<div class="org-name">{_esc(payload.org_name)}</div>' if payload.org_name else ''}
  <span class="badge">REPORTE MAESTRO</span>
  <h1 class="cover-title">{_esc(plan_name)}</h1>
  {f'<p class="cover-sub">{_esc(payload.subtitle)}</p>' if payload.subtitle else ''}
  {cover_kpis}
  <div class="cover-meta">
    {f'<div><strong>ATLETA</strong><span>{_esc(payload.athlete_name)}</span></div>' if payload.athlete_name else ''}
    {f'<div><strong>ENTRENADOR</strong><span>{_esc(payload.coach_name)}</span></div>' if payload.coach_name else ''}
    <div><strong>FECHA</strong><span>{today}</span></div>
    <div><strong>ESTILO</strong><span>{_esc(style['name'])}</span></div>
  </div>
</section>""")

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
            "tools": "Herramientas y calculadoras",
        }
        toc_items = []
        n = 1
        for key, label in labels.items():
            if flags.get(key):
                toc_items.append(
                    f'<li><span class="toc-num">{n:02d}</span><span class="toc-label">{_esc(label)}</span><span class="toc-dots"></span><span class="toc-page">{n}</span></li>'
                )
                n += 1
        parts.append(f"""<section class="page-break">
<span class="badge">ÍNDICE</span>
<h2>Tabla de Contenido</h2>
<ol class="toc">{''.join(toc_items)}</ol>
</section>""")

    # ----- INTRODUCTION -----
    if payload.sections.introduction:
        parts.append(f"""<section class="page-break">
<span class="badge">PRESENTACIÓN</span>
<h2>Introducción</h2>
<p>El presente documento detalla el plan de entrenamiento <strong>{_esc(plan_name)}</strong> elaborado por {_esc(payload.coach_name) or 'el cuerpo técnico'}{f' para {_esc(payload.athlete_name)}' if payload.athlete_name else ''}.</p>
<p>Se incluye la planificación estructural, la distribución de cargas, los controles previstos, las evaluaciones de los atletas y los objetivos de la temporada.</p>
<div class="callout">Estilo de documento: <strong>{_esc(style['name'])}</strong>. {_esc(style['vibe'])}.</div>
</section>""")

    # ----- DIAGNOSTIC PREVIOUS -----
    if payload.sections.diagnostic_previous:
        prev = await _db.plan_previous_analysis_ai_cache.find_one({"user_id": user_id}, {"_id": 0}) or {}
        prev_summary = prev.get("summary") or "Análisis y aprendizajes del ciclo anterior aún no registrados."
        parts.append(f"""<section class="page-break">
<span class="badge">RETROSPECTIVO</span>
<h2>Diagnóstico · Plan Anterior</h2>
<p>{_esc(prev_summary)}</p>
</section>""")

    # ----- DIAGNOSTIC ACTIVE -----
    if payload.sections.diagnostic_active and plan_doc:
        weeks = plan_doc.get("total_weeks", "—")
        sport = plan_doc.get("sport", "—")
        objective = plan_doc.get("main_objective") or plan_doc.get("description") or ""
        parts.append(f"""<section class="page-break">
<span class="badge">PLAN ACTIVO</span>
<h2>Diagnóstico · Plan Activo</h2>
<div class="kpi-row">
  {_stat_card('MODELO', _esc(plan_doc.get('model_name') or plan_doc.get('model') or '—'))}
  {_stat_card('DEPORTE', _esc(sport))}
  {_stat_card('SEMANAS', weeks)}
</div>
{f'<div class="callout"><strong>Objetivo principal</strong><br/>{_esc(objective)}</div>' if objective else ''}
</section>""")

    # ----- INFO sections -----
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
            items = await cur.to_list(50)
            rows = ''.join([
                f"<tr><td class='td-num'>{i+1:02d}</td><td><strong>{_esc(it.get('name') or it.get('full_name') or '—')}</strong></td><td>{_esc(it.get('description') or it.get('specialization') or it.get('sport') or it.get('city') or '—')}</td></tr>"
                for i, it in enumerate(items)
            ]) or "<tr><td colspan='3' class='muted'>Sin registros</td></tr>"
            parts.append(f"""<section class="page-break">
<span class="badge">INFORMACIÓN</span>
<h2>{_esc(title)} <span class="count">· {len(items)} registros</span></h2>
<table class="data-tbl">
  <thead><tr><th style="width:40pt">#</th><th>Nombre</th><th>Detalle</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
</section>""")

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
                parts.append(f"""<section class="page-break">
<span class="badge">EVALUACIÓN</span>
<h2>{_esc(title)}</h2>
<p class="muted">Sin controles registrados para este tipo.</p>
</section>""")
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
            parts.append(f"""<section class="page-break">
<span class="badge">EVALUACIÓN</span>
<h2>{_esc(title)} <span class="count">· {len(evs)} controles</span></h2>
{''.join(blocks)}
</section>""")

    # ----- COMPETITIONS -----
    if payload.sections.competitions:
        cur = _db.tournaments.find({"$or": [{"user_id": user_id}, {"coach_id": user_id}]}, {"_id": 0}).limit(50)
        comps = await cur.to_list(50)
        rows = ''.join([
            f"<tr><td><strong>{_esc(c.get('name'))}</strong></td><td class='td-num'>{_esc(c.get('start_date'))}</td><td>{_esc(c.get('location') or '—')}</td><td class='td-cat'>{_esc(c.get('category') or '—')}</td></tr>"
            for c in comps
        ]) or "<tr><td colspan='4' class='muted'>Sin competencias</td></tr>"
        parts.append(f"""<section class="page-break">
<span class="badge">CALENDARIO</span>
<h2>Competencias <span class="count">· {len(comps)} torneos</span></h2>
<table class="data-tbl">
  <thead><tr><th>Nombre</th><th style="width:90pt">Fecha</th><th>Lugar</th><th>Categoría</th></tr></thead>
  <tbody>{rows}</tbody>
</table>
</section>""")

    # ----- PERIODIZATION -----
    if payload.sections.periodization_structure and plan_doc:
        macros = plan_doc.get("macrocycles") or []
        rows = []
        for mi, m in enumerate(macros):
            for ms in (m.get("mesocycles") or []):
                rows.append(f"<tr><td class='td-num'>{mi+1}</td><td><strong>{_esc(ms.get('name') or '—')}</strong></td><td><span class='pill pill-phase'>{_esc(ms.get('phase') or '—')}</span></td><td class='td-num'>{ms.get('weeks', '—')}</td><td class='td-num'>{ms.get('volume_pct') or ms.get('volume') or '—'}%</td><td class='td-num'>{ms.get('intensity_pct') or ms.get('intensity') or '—'}%</td></tr>")
        rows_html = ''.join(rows) or "<tr><td colspan='6' class='muted'>Sin estructura registrada</td></tr>"
        parts.append(f"""<section class="page-break">
<span class="badge">ESTRUCTURA</span>
<h2>Periodización · Estructura</h2>
<table class="data-tbl">
  <thead><tr><th style="width:40pt">Macro</th><th>Mesociclo</th><th>Fase</th><th style="width:50pt">Sem.</th><th style="width:55pt">Volumen</th><th style="width:55pt">Intens.</th></tr></thead>
  <tbody>{rows_html}</tbody>
</table>
</section>""")

    if payload.sections.periodization_load:
        parts.append(f"""<section class="page-break">
<span class="badge">CARGA</span>
<h2>Periodización · Carga</h2>
<p>Distribución de carga semanal y monitorización ACWR (Acute:Chronic Workload Ratio).</p>
<div class="callout">La gráfica detallada con la evolución semanal está disponible en el módulo <strong>Plan Gráfico</strong>.</div>
</section>""")

    if payload.sections.graphic_plan:
        share = await _db.graphic_plan_shares.find_one(
            {"user_id": user_id, "plan_id": payload.plan_id},
            sort=[("created_at", -1)]
        )
        if share and share.get("image_b64"):
            parts.append(f"""<section class="page-break">
<span class="badge">VISUALIZACIÓN</span>
<h2>Plan Gráfico</h2>
<img src='{share['image_b64']}' style='max-width:100%;display:block;margin:6pt auto;border-radius:8pt;border:1pt solid {accent}40;'/>
</section>""")
        else:
            parts.append(f"""<section class="page-break">
<span class="badge">VISUALIZACIÓN</span>
<h2>Plan Gráfico</h2>
<p class="muted">Captura del Plan Gráfico no disponible. Genere el enlace público desde la sección <strong>Plan Gráfico</strong> para incluirla aquí.</p>
</section>""")

    if payload.sections.tools:
        parts.append(f"""<section class="page-break">
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
</section>""")

    body_html = ''.join(parts)

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
  min-height: 70vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
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
