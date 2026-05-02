"""
Rutas de exportación y compartición del Análisis del Plan Anterior.
- PDF (estilo Whitepaper PDI) vía Playwright
- Link público compartible (HTML + PDF) sin autenticación
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/plan-data/previous-analysis", tags=["previous-analysis-export"])

# Mongo
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_analysis = _db["plan_previous_analysis"]
_shares = _db["plan_previous_analysis_shares"]
_plans = _db["training_plans"]


def _get_user_id(user):
    return user.get("id") or user.get("user_id")


def get_current_user_dep():
    from server import get_current_user  # lazy to avoid circular
    return get_current_user


# ========================= HTML TEMPLATE =========================
CUMPLIMIENTO_LABELS = {
    "total": ("Cumplido Total", "#10B981", 100),
    "parcial": ("Cumplido Parcial", "#F59E0B", 60),
    "no": ("No Cumplido", "#EF4444", 20),
}

OBJ_LABELS = [
    ("general", "Objetivo General"),
    ("fisica", "Preparación Física"),
    ("tecnica", "Preparación Técnica"),
    ("tactica", "Preparación Táctica"),
    ("psicologica", "Preparación Psicológica"),
]

IND_LABELS = [
    ("vo2max", "VO₂ Máx"),
    ("sentadilla", "1RM Sentadilla"),
    ("sprint", "Sprint 30m"),
    ("cmj", "CMJ (salto)"),
    ("flexibilidad", "Flexibilidad"),
]

LESION_LABELS = {
    "no": ("Sin lesiones", "#10B981"),
    "leve": ("Lesiones leves", "#F59E0B"),
    "moderada": ("Lesiones moderadas", "#F97316"),
    "grave": ("Lesiones graves", "#EF4444"),
}


def _esc(s) -> str:
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


def _build_html(analysis_doc: dict, plan_name: str, share_id: Optional[str] = None) -> str:
    """Construye el HTML del análisis. Si share_id se provee, se marca como vista pública."""
    data = analysis_doc.get("data") or {}

    fecha_ini = data.get("fechaInicio") or "—"
    fecha_fin = data.get("fechaFinalizacion") or "—"
    duracion = data.get("duracionSemanas") or "—"
    objetivo = data.get("objetivoPrincipal") or "(Sin objetivo registrado)"
    cumpl = data.get("cumplimiento") or {}
    pct_global = data.get("porcentajeCumplimiento") or ""
    fortalezas = [f for f in (data.get("fortalezas") or []) if f]
    debilidades = [d for d in (data.get("debilidades") or []) if d]
    indicadores = data.get("indicadores") or {}
    lesiones_key = data.get("lesiones") or "no"
    desc_les = data.get("descripcionLesiones") or ""
    dias_perdidos = data.get("diasPerdidos") or "0"
    conclusiones = data.get("conclusiones") or ""
    recomendaciones = data.get("recomendaciones") or ""

    # --- Logos base64 ---
    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/itrain-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/itrain-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    # --- Cumplimiento rows ---
    cumpl_rows = []
    for key, label in OBJ_LABELS:
        k = cumpl.get(key, "parcial")
        lbl, color, pct = CUMPLIMIENTO_LABELS.get(k, CUMPLIMIENTO_LABELS["parcial"])
        cumpl_rows.append(
            f'<tr><td>{_esc(label)}</td>'
            f'<td><span class="pill" style="background:{color}20;color:{color};border:1px solid {color}60;">{_esc(lbl)}</span></td>'
            f'<td><span class="stat-bar"><div style="width:{pct}%;background:{color}"></div></span></td></tr>'
        )
    cumpl_html = "".join(cumpl_rows)

    # --- Indicadores rows ---
    ind_rows = []
    has_ind = False
    for key, label in IND_LABELS:
        ind = indicadores.get(key) or {}
        ini = ind.get("inicial") or ""
        fin = ind.get("final") or ""
        delta = ind.get("delta") or ""
        if ini or fin or delta:
            has_ind = True
        delta_str = _esc(delta)
        delta_color = "#10B981" if (delta and str(delta).startswith(("+", "1", "2", "3", "4", "5", "6", "7", "8", "9"))) else ("#EF4444" if delta and str(delta).startswith("-") else "#64748b")
        ind_rows.append(
            f'<tr><td>{_esc(label)}</td><td style="text-align:center">{_esc(ini) or "—"}</td>'
            f'<td style="text-align:center">{_esc(fin) or "—"}</td>'
            f'<td style="text-align:center;color:{delta_color};font-weight:700">{delta_str or "—"}</td></tr>'
        )
    indicadores_html = "".join(ind_rows)

    # --- Fortalezas / Debilidades ---
    fort_html = "".join(f'<li>{_esc(f)}</li>' for f in fortalezas) or '<li class="muted">Sin fortalezas registradas.</li>'
    deb_html = "".join(f'<li>{_esc(d)}</li>' for d in debilidades) or '<li class="muted">Sin debilidades registradas.</li>'

    les_lbl, les_color = LESION_LABELS.get(lesiones_key, LESION_LABELS["no"])

    pct_bar = ""
    try:
        pct_val = max(0, min(100, int(pct_global))) if pct_global != "" else None
    except Exception:
        pct_val = None
    if pct_val is not None:
        pct_bar = f'''<div class="pct-card">
          <div class="pct-label">% Global de Cumplimiento</div>
          <div class="pct-num">{pct_val}<span>%</span></div>
          <div class="pct-bar"><div style="width:{pct_val}%"></div></div>
        </div>'''

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por iTrain.app</div>'

    no_ind_html = "" if has_ind else '<tr><td colspan="4" class="muted" style="text-align:center;padding:14pt">Sin indicadores registrados.</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Análisis del Plan Anterior · iTrain</title>
<style>
  @page {{ size: A4; margin: 18mm 15mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.55; font-size: 11pt; }}
  h1 {{ font-size: 30pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #0f172a; }}
  h2 {{ font-size: 15pt; font-weight: 800; margin-top: 18pt; margin-bottom: 6pt; color: #0f172a; border-bottom: 2px solid #CCFF00; padding-bottom: 4pt; }}
  p  {{ margin: 6pt 0; }}
  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 32pt 28pt; border-radius: 10pt; margin-bottom: 16pt; }}
  .hero h1 {{ color: #fff; }}
  .hero .subtitle {{ color: rgba(255,255,255,0.75); font-size: 13pt; margin-top: 4pt; }}
  .brand-mark {{ display: flex; align-items: center; gap: 10pt; margin-bottom: 16pt; }}
  .brand-mark img {{ height: 34pt; width: 132pt; max-width: none; display: block; object-fit: contain; }}
  .badge {{ display: inline-block; background: #CCFF00; color: #0f172a; padding: 4pt 10pt; border-radius: 20pt; font-size: 9pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 10pt; }}
  .meta {{ display:flex; flex-wrap:wrap; gap:18pt; margin-top:14pt; color:rgba(255,255,255,0.8); font-size:10pt; }}
  .meta strong {{ color: #CCFF00; display:block; font-size:8pt; text-transform:uppercase; letter-spacing:1px; font-weight:800; margin-bottom:3pt; }}
  table {{ width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10pt; }}
  th, td {{ text-align: left; padding: 6pt 8pt; border-bottom: 1px solid #e2e8f0; }}
  th {{ background: #f1f5f9; font-weight: 700; color: #475569; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.5px; }}
  .stat-bar {{ background: #e2e8f0; height: 8pt; border-radius: 4pt; overflow: hidden; display: inline-block; width: 120pt; vertical-align: middle; }}
  .stat-bar > div {{ height: 100%; border-radius: 4pt; }}
  .pill {{ display:inline-block; padding:2pt 8pt; border-radius: 20pt; font-size:9pt; font-weight:700; }}
  ul {{ margin: 4pt 0 4pt 16pt; padding: 0; }}
  li {{ margin: 3pt 0; }}
  .muted {{ color: #94a3b8; font-style: italic; }}
  .callout {{ background: #0f172a; color: #fff; padding: 12pt 16pt; border-radius: 8pt; margin: 10pt 0; }}
  .callout strong {{ color: #CCFF00; }}
  .two-col {{ display: grid; grid-template-columns: 1fr 1fr; gap: 14pt; }}
  .card {{ background: #f8fafc; border-radius: 8pt; padding: 12pt 14pt; border-left: 4pt solid #CCFF00; }}
  .card.bad {{ border-left-color: #F59E0B; background: #fffbeb; }}
  .card h3 {{ margin: 0 0 6pt; font-size: 11pt; color: #0f172a; }}
  .pct-card {{ background: linear-gradient(135deg, #CCFF00 0%, #a3e635 100%); border-radius: 10pt; padding: 14pt 16pt; margin: 10pt 0; color: #0f172a; }}
  .pct-label {{ font-size:9pt; text-transform:uppercase; letter-spacing:1px; font-weight:800; }}
  .pct-num {{ font-size: 36pt; font-weight: 900; line-height: 1; }}
  .pct-num span {{ font-size:16pt; font-weight:700; margin-left:2pt; }}
  .pct-bar {{ background: rgba(0,0,0,0.12); height: 8pt; border-radius: 4pt; overflow: hidden; margin-top: 6pt; }}
  .pct-bar > div {{ height: 100%; background: #0f172a; border-radius: 4pt; }}
  .lesion-box {{ border: 1px solid {les_color}; background: {les_color}12; padding: 10pt 14pt; border-radius: 8pt; }}
  .lesion-box strong {{ color: {les_color}; }}
  .footer-brand {{ display: flex; align-items: center; justify-content: center; gap: 8pt; color: #94a3b8; font-size: 9pt; margin-top: 24pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; }}
  .footer-brand img {{ height: 18pt; width: 18pt; object-fit: contain; }}
  .footer-brand strong {{ color: #CCFF00; background: #0f172a; padding: 2pt 6pt; border-radius: 3pt; }}
  .share-ribbon {{ background: #CCFF00; color:#0f172a; text-align:center; font-weight:800; font-size:9pt; padding:6pt; letter-spacing:1px; border-radius:4pt; margin-bottom:10pt; }}
</style></head><body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="iTRAIN" width="176" height="46" style="width:176px;height:46px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">ANÁLISIS RETROSPECTIVO</span>
  <h1>Análisis del Plan Anterior</h1>
  <div class="subtitle">{_esc(plan_name)}</div>
  <p style="margin-top:10pt;color:rgba(255,255,255,0.8);max-width:500pt;">
    Evaluación retrospectiva del plan de entrenamiento anterior: fortalezas identificadas,
    oportunidades de mejora, indicadores de rendimiento y recomendaciones para el próximo ciclo.
  </p>
  <div class="meta">
    <div><strong>Fecha inicio</strong>{_esc(fecha_ini)}</div>
    <div><strong>Fecha final</strong>{_esc(fecha_fin)}</div>
    <div><strong>Duración</strong>{_esc(duracion)} semanas</div>
    <div><strong>Lesiones</strong>{_esc(les_lbl)}</div>
  </div>
</div>

<h2>1. Objetivo del Plan Anterior</h2>
<div class="card"><p style="margin:0">{_esc(objetivo)}</p></div>

<h2>2. Cumplimiento de Objetivos</h2>
{pct_bar}
<table>
  <thead><tr><th>Área</th><th>Estado</th><th>Progreso</th></tr></thead>
  <tbody>{cumpl_html}</tbody>
</table>

<h2>3. Indicadores de Rendimiento</h2>
<table>
  <thead><tr><th>Indicador</th><th style="text-align:center">Inicial</th><th style="text-align:center">Final</th><th style="text-align:center">Delta</th></tr></thead>
  <tbody>{indicadores_html}{no_ind_html}</tbody>
</table>

<h2>4. Fortalezas y Áreas de Mejora</h2>
<div class="two-col">
  <div class="card">
    <h3>✓ Fortalezas</h3>
    <ul>{fort_html}</ul>
  </div>
  <div class="card bad">
    <h3>⚠ Áreas de mejora</h3>
    <ul>{deb_html}</ul>
  </div>
</div>

<h2>5. Lesiones y Problemas de Salud</h2>
<div class="lesion-box">
  <p style="margin:0"><strong>Estado: {_esc(les_lbl)}</strong> · Días perdidos por lesión: <strong>{_esc(dias_perdidos)}</strong></p>
  {('<p style="margin:6pt 0 0">'+ _esc(desc_les) +'</p>') if desc_les else ''}
</div>

<h2>6. Conclusiones y Recomendaciones</h2>
<div class="two-col">
  <div class="card">
    <h3>Conclusiones principales</h3>
    <p style="margin:0">{_esc(conclusiones) or '<span class="muted">Sin conclusiones registradas.</span>'}</p>
  </div>
  <div class="card">
    <h3>Recomendaciones para el próximo plan</h3>
    <p style="margin:0">{_esc(recomendaciones) or '<span class="muted">Sin recomendaciones registradas.</span>'}</p>
  </div>
</div>

<div class="callout">
  Este análisis es un <strong>input crítico</strong> para la planificación del próximo macrociclo.
  Las áreas de mejora identificadas deben reflejarse en los objetivos del nuevo plan y en la
  selección del modelo de periodización.
</div>

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="iTRAIN"/>
  <span>Generado por <strong>iTRAIN</strong> · iTrain.app · Análisis del Plan Anterior</span>
</div>

</body></html>"""


async def _render_pdf(html: str) -> bytes:
    """Genera PDF con Playwright."""
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        )
        page = await browser.new_page(viewport={"width": 794, "height": 1123})
        await page.set_content(html, wait_until="domcontentloaded")
        await page.wait_for_timeout(400)
        pdf = await page.pdf(format="A4", print_background=True,
                             margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await browser.close()
    return pdf


async def _get_plan_name(plan_id: str) -> str:
    plan = await _plans.find_one({"id": plan_id}, {"_id": 0, "name": 1})
    if not plan:
        return "Plan sin nombre"
    return plan.get("name") or "Plan sin nombre"


# ========================= PDF (autenticado) =========================
@router.get("/{plan_id}/pdf")
async def download_previous_analysis_pdf(plan_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    doc = await _analysis.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Aún no hay análisis guardado. Haz clic en 'Guardar' primero.")
    plan_name = await _get_plan_name(plan_id)
    html = _build_html(doc, plan_name)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Analisis_Plan_Anterior.pdf"'},
    )


# ========================= SHARE (crear link) =========================
class ShareResponse(BaseModel):
    share_id: str
    share_url: str


@router.post("/{plan_id}/share", response_model=ShareResponse)
async def create_share_link(plan_id: str, user=Depends(get_current_user_dep())):
    """Crea (o reutiliza) un share_id público del análisis del plan anterior."""
    uid = _get_user_id(user)
    doc = await _analysis.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Debes guardar el análisis antes de compartirlo.")

    existing = await _shares.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if existing and existing.get("share_id"):
        share_id = existing["share_id"]
        # Actualiza snapshot por si el análisis cambió
        plan_name = await _get_plan_name(plan_id)
        await _shares.update_one(
            {"share_id": share_id},
            {"$set": {"snapshot": doc, "plan_name": plan_name,
                      "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        share_id = uuid.uuid4().hex[:14]
        plan_name = await _get_plan_name(plan_id)
        now = datetime.now(timezone.utc).isoformat()
        await _shares.insert_one({
            "share_id": share_id,
            "plan_id": plan_id,
            "user_id": uid,
            "plan_name": plan_name,
            "snapshot": doc,
            "created_at": now,
            "updated_at": now,
        })

    # URL pública → /api/plan-data/previous-analysis/shared/{share_id}
    base = os.environ.get("PUBLIC_BASE_URL", "")
    share_url = f"{base}/api/plan-data/previous-analysis/shared/{share_id}" if base else f"/api/plan-data/previous-analysis/shared/{share_id}"
    return ShareResponse(share_id=share_id, share_url=share_url)


# ========================= SHARE (visor HTML público) =========================
@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared_previous_analysis(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    html = _build_html(share["snapshot"], share.get("plan_name") or "Plan de entrenamiento", share_id=share_id)
    return HTMLResponse(content=html)


# ========================= SHARE (PDF público) =========================
@router.get("/shared/{share_id}/pdf")
async def download_shared_previous_analysis_pdf(share_id: str):
    share = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    html = _build_html(share["snapshot"], share.get("plan_name") or "Plan de entrenamiento", share_id=share_id)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Analisis_Plan_Anterior.pdf"'},
    )
