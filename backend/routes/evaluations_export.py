"""
Exportación PDF + Share para Evaluaciones / Controles deportivos.
Tipos: medical, physical, technical, tactical, psychological, theoretical
Datos personalizables: cada control puede tener filas custom + valoración 1-10
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/plan-data/evaluations", tags=["evaluations-export"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_evals = _db["plan_evaluations"]
_eval_shares = _db["plan_evaluations_shares"]
_plans = _db["training_plans"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


def _esc(s) -> str:
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


EVAL_META = {
    "medical":       {"title": "Control Médico",       "color": "#EF4444", "icon": "🩺"},
    "physical":      {"title": "Control Físico",       "color": "#3B82F6", "icon": "💪"},
    "technical":     {"title": "Control Técnico",      "color": "#8B5CF6", "icon": "🎯"},
    "tactical":      {"title": "Control Táctico",      "color": "#F59E0B", "icon": "🧩"},
    "psychological": {"title": "Control Psicológico",  "color": "#EC4899", "icon": "🧠"},
    "theoretical":   {"title": "Control Teórico",      "color": "#14B8A6", "icon": "📘"},
}


class EvaluationSavePayload(BaseModel):
    plan_id: str
    athlete_id: Optional[str] = None
    evaluation_type: str
    date: Optional[str] = None
    # rows: [{section, label, value 1-10, notes}]
    rows: List[Dict[str, Any]] = Field(default_factory=list)
    notes: Optional[str] = ""
    fortalezas: Optional[str] = ""
    areas_mejora: Optional[str] = ""


@router.post("")
async def save_evaluation(payload: EvaluationSavePayload, user=Depends(get_current_user_dep())):
    if payload.evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo de evaluación inválido: {payload.evaluation_type}")
    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    key = {"plan_id": payload.plan_id, "user_id": uid,
           "evaluation_type": payload.evaluation_type,
           "athlete_id": payload.athlete_id or None}
    doc = {**key, **payload.model_dump(), "user_id": uid, "updated_at": now}
    await _evals.update_one(key, {"$set": doc, "$setOnInsert": {"created_at": now}}, upsert=True)
    return {"ok": True}


@router.get("/{plan_id}/{evaluation_type}")
async def get_evaluation(plan_id: str, evaluation_type: str,
                         athlete_id: Optional[str] = None,
                         user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = await _evals.find_one(
        {"plan_id": plan_id, "user_id": uid, "evaluation_type": evaluation_type,
         "athlete_id": athlete_id},
        {"_id": 0}
    )
    return doc or {"rows": [], "notes": "", "fortalezas": "", "areas_mejora": ""}


def _build_html(eval_doc: dict, plan_name: str, athlete_name: str = "",
                share_id: Optional[str] = None) -> str:
    et = eval_doc.get("evaluation_type") or "medical"
    meta = EVAL_META.get(et, EVAL_META["medical"])
    color = meta["color"]
    title = meta["title"]
    rows = eval_doc.get("rows") or []
    notes = eval_doc.get("notes") or ""
    fortalezas = eval_doc.get("fortalezas") or ""
    areas = eval_doc.get("areas_mejora") or ""
    date = eval_doc.get("date") or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/itrain-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/itrain-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    # Agrupar rows por sección
    groups: Dict[str, List[Dict[str, Any]]] = {}
    for r in rows:
        sec = (r or {}).get("section") or "General"
        groups.setdefault(sec, []).append(r)

    sec_html = []
    total_avg = []
    for sec, items in groups.items():
        avg = sum(int(it.get("value") or 0) for it in items) / max(1, len(items))
        total_avg.append(avg)
        bars = []
        for it in items:
            label = _esc(it.get("label") or "—")
            val = int(it.get("value") or 0)
            note = _esc(it.get("notes") or "")
            bar_w = max(0, min(100, val * 10))
            bar_color = "#10B981" if val >= 8 else "#F59E0B" if val >= 5 else "#EF4444"
            bars.append(f"""
<div class="row">
  <div class="row-head">
    <span class="row-lbl">{label}</span>
    <span class="row-val" style="color:{bar_color}">{val}<span class="muted">/10</span></span>
  </div>
  <div class="bar"><div class="bar-fill" style="width:{bar_w}%;background:{bar_color}"></div></div>
  {f'<div class="row-note">{note}</div>' if note else ''}
</div>
""")
        sec_html.append(f"""
<div class="section">
  <h3>{_esc(sec)} <span class="sec-avg" style="color:{color}">{avg:.1f}/10</span></h3>
  <div class="rows">{''.join(bars)}</div>
</div>
""")
    rows_html = ''.join(sec_html) or '<p class="muted">Sin valoraciones registradas.</p>'
    global_avg = sum(total_avg) / max(1, len(total_avg))

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por iTrain.app</div>'

    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    athlete_block = f'<div><strong>Atleta</strong>{_esc(athlete_name)}</div>' if athlete_name else ""

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>{title} · iTrain</title>
<style>
  @page {{ size: A4; margin: 14mm 12mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 10pt; }}
  h1 {{ font-size: 26pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #fff; }}
  h2 {{ font-size: 13pt; font-weight: 800; margin: 14pt 0 8pt; color: #0f172a; border-bottom: 2px solid {color}; padding-bottom: 4pt; }}
  h3 {{ font-size: 11pt; font-weight: 800; margin: 8pt 0 6pt; color: #0f172a; display: flex; align-items: center; justify-content: space-between; }}
  .muted {{ color: #94a3b8; font-style: italic; }}
  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 22pt 26pt; border-radius: 12pt; margin-bottom: 14pt; position: relative; overflow: hidden; }}
  .hero::after {{ content: ""; position: absolute; right: -50pt; top: -50pt; width: 220pt; height: 220pt; background: radial-gradient(circle, {color}55 0%, transparent 65%); }}
  .hero .subtitle {{ color: rgba(255,255,255,0.78); font-size: 11pt; margin-top: 4pt; }}
  .brand-mark img {{ height: 28pt; width: 116pt; object-fit: contain; display: block; margin-bottom: 10pt; }}
  .badge {{ display: inline-block; background: {color}; color: #fff; padding: 4pt 10pt; border-radius: 20pt; font-size: 8.5pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 6pt; text-transform: uppercase; }}
  .meta {{ display: flex; flex-wrap: wrap; gap: 18pt; margin-top: 10pt; color: rgba(255,255,255,0.85); font-size: 9pt; position: relative; z-index: 1; }}
  .meta strong {{ color: {color}; display: block; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; margin-bottom: 2pt; }}
  .global-card {{ background: linear-gradient(135deg, {color}, #0f172a); color: #fff; padding: 14pt 18pt; border-radius: 12pt; margin-bottom: 12pt; display: flex; align-items: center; justify-content: space-between; }}
  .global-card .num {{ font-size: 36pt; font-weight: 900; line-height: 1; }}
  .global-card .lbl {{ font-size: 8pt; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }}
  .section {{ margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid; }}
  .sec-avg {{ font-size: 10pt; font-weight: 900; }}
  .rows {{ display: flex; flex-direction: column; gap: 6pt; }}
  .row {{ background: #f8fafc; border-radius: 8pt; padding: 7pt 10pt; border-left: 3pt solid {color}; }}
  .row-head {{ display: flex; align-items: center; justify-content: space-between; margin-bottom: 4pt; }}
  .row-lbl {{ font-size: 9.5pt; font-weight: 700; color: #0f172a; }}
  .row-val {{ font-size: 11pt; font-weight: 900; }}
  .bar {{ height: 6pt; background: #e2e8f0; border-radius: 3pt; overflow: hidden; }}
  .bar-fill {{ height: 100%; border-radius: 3pt; }}
  .row-note {{ font-size: 8pt; color: #64748b; margin-top: 3pt; font-style: italic; }}
  .observations {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; margin-top: 10pt; }}
  .obs-card {{ background: #fff; border: 1px solid #e2e8f0; border-radius: 8pt; padding: 10pt 12pt; }}
  .obs-card.pos {{ border-left: 3pt solid #10B981; }}
  .obs-card.neg {{ border-left: 3pt solid #F59E0B; }}
  .obs-card h4 {{ font-size: 9pt; margin: 0 0 4pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.7px; }}
  .obs-card.pos h4 {{ color: #10B981; }}
  .obs-card.neg h4 {{ color: #F59E0B; }}
  .footer-brand {{ margin-top: 14pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8pt; color: #64748b; font-size: 8pt; }}
  .footer-brand img {{ height: 18pt; width: 18pt; }}
  .share-ribbon {{ background: #0f172a; color: #CCFF00; text-align: center; padding: 7pt; border-radius: 8pt; margin-bottom: 12pt; font-size: 9pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }}
</style></head>
<body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="iTRAIN" width="160" height="42" style="width:160px;height:42px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">EVALUACIÓN · {meta['icon']} {title.upper()}</span>
  <h1>{title}</h1>
  <div class="subtitle">{_esc(plan_name)}</div>
  <div class="meta">
    <div><strong>Fecha</strong>{_esc(date)}</div>
    {athlete_block}
    <div><strong>Generado el</strong>{today}</div>
  </div>
</div>

<div class="global-card">
  <div>
    <div class="lbl">Promedio Global</div>
    <div style="font-size: 11pt; opacity: 0.85; margin-top: 4pt;">{title}</div>
  </div>
  <div style="text-align:right;">
    <div class="num">{global_avg:.1f}<span style="font-size:14pt;opacity:0.7">/10</span></div>
    <div class="lbl" style="margin-top:2pt;">{len(rows)} valoraciones</div>
  </div>
</div>

<h2>Detalle por Sección</h2>
{rows_html}

<div class="observations">
  <div class="obs-card pos">
    <h4>✓ Fortalezas / Aspectos positivos</h4>
    <p style="margin:0;font-size:9.5pt;">{_esc(fortalezas) or '<span class="muted">Sin fortalezas registradas</span>'}</p>
  </div>
  <div class="obs-card neg">
    <h4>⚠ Áreas de Mejora</h4>
    <p style="margin:0;font-size:9.5pt;">{_esc(areas) or '<span class="muted">Sin áreas registradas</span>'}</p>
  </div>
</div>

{f'<h2>Notas adicionales</h2><p>{_esc(notes)}</p>' if notes else ''}

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="iTRAIN"/>
  <span>Generado por <strong>iTRAIN</strong> · iTrain.app · {title}</span>
</div>

</body></html>"""


async def _render_pdf(html: str) -> bytes:
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
    return (plan or {}).get("name") or "Plan sin nombre"


@router.get("/{plan_id}/{evaluation_type}/pdf")
async def download_evaluation_pdf(plan_id: str, evaluation_type: str,
                                  athlete_id: Optional[str] = None,
                                  user=Depends(get_current_user_dep())):
    if evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo inválido: {evaluation_type}")
    uid = _uid(user)
    doc = await _evals.find_one(
        {"plan_id": plan_id, "user_id": uid, "evaluation_type": evaluation_type,
         "athlete_id": athlete_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Aún no hay evaluación guardada. Haz clic en 'Guardar' primero.")
    plan_name = await _get_plan_name(plan_id)
    html = _build_html(doc, plan_name)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{evaluation_type}.pdf"'},
    )


class ShareEvalResponse(BaseModel):
    share_id: str
    share_url: str


@router.post("/{plan_id}/{evaluation_type}/share", response_model=ShareEvalResponse)
async def create_eval_share(plan_id: str, evaluation_type: str,
                            athlete_id: Optional[str] = None,
                            user=Depends(get_current_user_dep())):
    if evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo inválido: {evaluation_type}")
    uid = _uid(user)
    doc = await _evals.find_one(
        {"plan_id": plan_id, "user_id": uid, "evaluation_type": evaluation_type,
         "athlete_id": athlete_id},
        {"_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Debes guardar la evaluación antes de compartirla.")
    plan_name = await _get_plan_name(plan_id)
    key = {"plan_id": plan_id, "user_id": uid, "evaluation_type": evaluation_type,
           "athlete_id": athlete_id}
    existing = await _eval_shares.find_one(key, {"_id": 0})
    now = datetime.now(timezone.utc).isoformat()
    snapshot = {**doc, "plan_name": plan_name}
    if existing and existing.get("share_id"):
        share_id = existing["share_id"]
        await _eval_shares.update_one({"share_id": share_id},
                                      {"$set": {"snapshot": snapshot, "updated_at": now}})
    else:
        share_id = uuid.uuid4().hex[:14]
        await _eval_shares.insert_one({
            **key, "share_id": share_id, "snapshot": snapshot,
            "created_at": now, "updated_at": now,
        })
    base = os.environ.get("PUBLIC_BASE_URL", "")
    share_url = f"{base}/api/plan-data/evaluations/shared/{share_id}" if base else f"/api/plan-data/evaluations/shared/{share_id}"
    return ShareEvalResponse(share_id=share_id, share_url=share_url)


@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared_eval(share_id: str):
    share = await _eval_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido")
    snap = share.get("snapshot") or {}
    html = _build_html(snap, snap.get("plan_name") or "Plan", share_id=share_id)
    return HTMLResponse(content=html)


@router.get("/shared/{share_id}/pdf")
async def download_shared_eval_pdf(share_id: str):
    share = await _eval_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido")
    snap = share.get("snapshot") or {}
    html = _build_html(snap, snap.get("plan_name") or "Plan", share_id=share_id)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{snap.get("evaluation_type", "evaluacion")}.pdf"'},
    )
