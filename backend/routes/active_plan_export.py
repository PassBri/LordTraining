"""
Rutas de exportación y compartición del Plan Activo (Objetivos).
- PDF estilo whitepaper LordTraining vía Playwright
- Link público compartible (HTML + PDF) sin autenticación
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, HTMLResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import base64
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/plan-data/objectives", tags=["active-plan-export"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_objectives = _db["plan_objectives"]
_obj_shares = _db["plan_objectives_shares"]
_plans = _db["training_plans"]
_coaches = _db["coaches"]


def _get_user_id(user):
    return user.get("id") or user.get("user_id")


def get_current_user_dep():
    from server import get_current_user  # lazy to avoid circular
    return get_current_user


def _esc(s) -> str:
    if s is None:
        return ""
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


ASPECT_LABELS = [
    ("general", "General", "#94a3b8"),
    ("fisicaGeneral", "Prep. Física General", "#3b82f6"),
    ("fisicaEspecial", "Prep. Física Especial", "#007AFF"),
    ("tecnica", "Prep. Técnica", "#10b981"),
    ("tactica", "Prep. Táctica", "#f59e0b"),
    ("teorica", "Prep. Teórica", "#06b6d4"),
    ("psicologica", "Prep. Psicológica", "#ec4899"),
]


def _build_html(obj_doc: dict, plan_name: str, share_id: Optional[str] = None, staff_html: str = "") -> str:
    data = obj_doc.get("data") or {}
    deporte = data.get("deporteObjetivo") or "(Sin definir)"
    categoria = data.get("categoria") or "—"
    edad = data.get("edad") or "—"
    clasificacion = data.get("clasificacion") or "—"
    fecha_ini = data.get("fechaInicio") or "—"
    fecha_fin = data.get("fechaFin") or "—"
    entrenador = data.get("entrenador") or "—"
    largo = [x for x in (data.get("largoPlazo") or []) if x]
    medio = [x for x in (data.get("medianoPlazo") or []) if x]
    corto = [x for x in (data.get("cortoPlazo") or []) if x]
    por_aspecto = data.get("porAspecto") or {}

    # Logos base64
    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/lordtraining-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/lordtraining-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    def _list_html(items, color):
        if not items:
            return '<p class="muted" style="margin:0">Sin objetivos registrados.</p>'
        rows = []
        for i, txt in enumerate(items, 1):
            rows.append(
                f'<div class="goal-row">'
                f'<span class="goal-num" style="background:{color}20;color:{color};border:1px solid {color}80">{i}</span>'
                f'<span class="goal-text">{_esc(txt)}</span></div>'
            )
        return "".join(rows)

    aspect_rows = []
    for key, label, color in ASPECT_LABELS:
        a = por_aspecto.get(key) or {}
        obj_txt = a.get("objetivo") or ""
        ind_txt = a.get("indicador") or ""
        if not (obj_txt or ind_txt):
            continue
        aspect_rows.append(
            f'<tr>'
            f'<td><span class="aspect-pill" style="background:{color}18;color:{color};border-color:{color}80">{_esc(label)}</span></td>'
            f'<td>{_esc(obj_txt) or "<span class=muted>—</span>"}</td>'
            f'<td>{_esc(ind_txt) or "<span class=muted>—</span>"}</td>'
            f'</tr>'
        )
    aspect_html = "".join(aspect_rows) or '<tr><td colspan="3" class="muted" style="text-align:center;padding:14pt">Sin objetivos por aspecto registrados.</td></tr>'

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por LordTraining.app</div>'

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Plan Activo · LordTraining</title>
<style>
  @page {{ size: A4; margin: 18mm 15mm; }}
  * {{ box-sizing: border-box; }}
  body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #0f172a; line-height: 1.55; font-size: 11pt; }}
  h1 {{ font-size: 30pt; font-weight: 900; letter-spacing: -0.02em; margin: 0 0 4pt; color: #fff; }}
  h2 {{ font-size: 15pt; font-weight: 800; margin-top: 18pt; margin-bottom: 6pt; color: #0f172a; border-bottom: 2px solid #CCFF00; padding-bottom: 4pt; }}
  h3 {{ font-size: 11pt; margin: 8pt 0 6pt; color: #0f172a; font-weight: 800; }}
  p  {{ margin: 6pt 0; }}
  .muted {{ color: #94a3b8; font-style: italic; }}
  .hero {{ background: linear-gradient(135deg, #0b1020 0%, #1e293b 100%); color: #fff; padding: 32pt 28pt; border-radius: 10pt; margin-bottom: 16pt; }}
  .hero .subtitle {{ color: rgba(255,255,255,0.75); font-size: 13pt; margin-top: 4pt; }}
  .brand-mark {{ display: flex; align-items: center; gap: 10pt; margin-bottom: 16pt; }}
  .brand-mark img {{ height: 34pt; width: 132pt; max-width: none; display: block; object-fit: contain; }}
  .badge {{ display: inline-block; background: #CCFF00; color: #0f172a; padding: 4pt 10pt; border-radius: 20pt; font-size: 9pt; font-weight: 800; letter-spacing: 1px; margin-bottom: 10pt; }}
  .meta {{ display:flex; flex-wrap:wrap; gap:18pt; margin-top:14pt; color:rgba(255,255,255,0.8); font-size:10pt; }}
  .meta strong {{ color: #CCFF00; display:block; font-size:8pt; text-transform:uppercase; letter-spacing:1px; font-weight:800; margin-bottom:3pt; }}
  .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8pt 16pt; background: #f8fafc; padding: 12pt 14pt; border-radius: 10pt; border-left: 4pt solid #007AFF; margin-bottom: 8pt; }}
  .info-item {{ display: flex; flex-direction: column; }}
  .info-item .lbl {{ font-size: 7.5pt; font-weight: 800; letter-spacing: 1px; color: #64748b; text-transform: uppercase; }}
  .info-item .val {{ font-size: 11pt; font-weight: 700; color: #0f172a; margin-top: 2pt; }}
  .goals-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10pt; }}
  .goal-card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10pt; padding: 12pt 14pt; page-break-inside: avoid; break-inside: avoid; }}
  .goal-card.long {{ border-left: 4pt solid #10b981; }}
  .goal-card.mid  {{ border-left: 4pt solid #f59e0b; }}
  .goal-card.short {{ border-left: 4pt solid #007AFF; }}
  .goal-card h3 {{ display: flex; align-items: center; justify-content: space-between; margin: 0 0 8pt; }}
  .goal-card .pill {{ font-size: 7.5pt; font-weight: 800; letter-spacing: 0.5px; padding: 2pt 7pt; border-radius: 999pt; background: #0f172a; color: #CCFF00; }}
  .goal-row {{ display: flex; gap: 7pt; margin-bottom: 5pt; align-items: flex-start; }}
  .goal-num {{ width: 16pt; height: 16pt; border-radius: 50%; flex-shrink: 0; font-size: 8pt; font-weight: 900; display: inline-flex; align-items: center; justify-content: center; }}
  .goal-text {{ flex: 1; font-size: 10pt; color: #334155; line-height: 1.5; }}
  table {{ width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 10pt; }}
  th, td {{ text-align: left; padding: 7pt 8pt; border-bottom: 1px solid #e2e8f0; vertical-align: top; }}
  th {{ background: #0f172a; color: #CCFF00; font-weight: 800; font-size: 8.5pt; text-transform: uppercase; letter-spacing: 0.5px; }}
  .aspect-pill {{ display: inline-block; padding: 3pt 9pt; border-radius: 999pt; font-size: 8.5pt; font-weight: 800; border: 1px solid; }}
  .callout {{ background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4pt solid #CCFF00; padding: 12pt 14pt; border-radius: 10pt; margin-top: 14pt; font-size: 10pt; color: #0f172a; line-height: 1.5; }}
  .footer-brand {{ margin-top: 22pt; padding-top: 10pt; border-top: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8pt; color: #64748b; font-size: 8.5pt; }}
  .footer-brand img {{ height: 20pt; width: 20pt; display: block; }}
  .share-ribbon {{ background: #0f172a; color: #CCFF00; text-align: center; padding: 7pt; border-radius: 8pt; margin-bottom: 12pt; font-size: 9pt; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }}
</style></head>
<body>

{share_banner}

<div class="hero">
  <div class="brand-mark">
    <img src="data:image/png;base64,{full_b64}" alt="LordTraining" width="176" height="46" style="width:176px;height:46px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">PLAN ACTIVO</span>
  <h1>Plan de Entrenamiento</h1>
  <div class="subtitle">{_esc(plan_name)}</div>
  <p style="margin-top:10pt;color:rgba(255,255,255,0.8);max-width:500pt;">
    Información general, objetivos por horizonte temporal (largo / medio / corto plazo) y
    objetivos por aspecto de preparación deportiva. Documento de referencia para el cuerpo
    técnico durante el ciclo activo.
  </p>
  <div class="meta">
    <div><strong>Fecha inicio</strong>{_esc(fecha_ini)}</div>
    <div><strong>Fecha final</strong>{_esc(fecha_fin)}</div>
    <div><strong>Categoría</strong>{_esc(categoria)}</div>
    <div><strong>Nivel</strong>{_esc(clasificacion)}</div>
  </div>
</div>

<h2>1. Información General</h2>
<div class="info-grid">
  <div class="info-item"><span class="lbl">Deporte / Objetivo</span><span class="val">{_esc(deporte)}</span></div>
  <div class="info-item"><span class="lbl">Entrenador</span><span class="val">{_esc(entrenador)}</span></div>
  <div class="info-item"><span class="lbl">Edad / Rango</span><span class="val">{_esc(edad)}</span></div>
  <div class="info-item"><span class="lbl">Clasificación</span><span class="val">{_esc(clasificacion)}</span></div>
</div>

<h2>2. Objetivos por Horizonte Temporal</h2>
<div class="goals-grid">
  <div class="goal-card long">
    <h3>Largo Plazo <span class="pill">Macrociclo</span></h3>
    {_list_html(largo, "#10b981")}
  </div>
  <div class="goal-card mid">
    <h3>Medio Plazo <span class="pill">Mesociclo</span></h3>
    {_list_html(medio, "#f59e0b")}
  </div>
  <div class="goal-card short">
    <h3>Corto Plazo <span class="pill">Microciclo</span></h3>
    {_list_html(corto, "#007AFF")}
  </div>
</div>

<h2>3. Objetivos por Aspecto de Preparación</h2>
<table>
  <thead><tr><th style="width:25%">Aspecto</th><th style="width:42%">Objetivo</th><th style="width:33%">Indicador</th></tr></thead>
  <tbody>{aspect_html}</tbody>
</table>

{staff_html}

<div class="callout">
  La claridad de estos objetivos es crítica para guiar el desarrollo del programa de entrenamiento
  y medir el progreso. Cada objetivo debe ser <strong>específico, medible, alcanzable, relevante
  y temporal</strong> (SMART). Validar periódicamente con el cuerpo técnico.
</div>

<div class="footer-brand">
  <img src="data:image/png;base64,{icon_b64}" alt="LordTraining"/>
  <span>Generado por <strong>LordTraining</strong> · LordTraining.app · Plan Activo</span>
</div>

</body></html>"""


async def _render_pdf(html: str) -> bytes:
    import asyncio
    from routes.pdf_render import html_to_pdf
    return await asyncio.to_thread(html_to_pdf, html)


async def _get_plan_name(plan_id: str) -> str:
    plan = await _plans.find_one({"id": plan_id}, {"_id": 0, "name": 1})
    return (plan or {}).get("name") or "Plan sin nombre"


async def _get_plan_staff(plan_id: str, user_id: str) -> list:
    """Obtiene el staff asignado al plan hidratado con perfiles de coaches."""
    plan = await _plans.find_one({"id": plan_id, "coach_id": user_id}, {"_id": 0, "id": 1, "staff": 1})
    if plan is None:
        return []
    assignments = plan.get("staff") or []
    if not assignments:
        return []
    coach_ids = [a.get("coach_id") for a in assignments if a.get("coach_id")]
    if not coach_ids:
        return []
    coaches_docs = await _coaches.find(
        {"id": {"$in": coach_ids}, "coach_id": user_id}, {"_id": 0}
    ).to_list(200)
    by_id = {c["id"]: c for c in coaches_docs}
    out = []
    for a in assignments:
        prof = by_id.get(a.get("coach_id"))
        if not prof:
            continue
        out.append({**prof, "_role": a.get("role") or "Staff", "_notes": a.get("notes") or ""})
    return out


def _staff_section_html(staff: list) -> str:
    """Renderiza HTML de la sección 'Cuerpo Técnico Asignado' para el PDF."""
    if not staff:
        return ""
    cards = []
    for c in staff:
        name = _esc(c.get("name") or "—")
        initial = (c.get("name") or "C")[0].upper()
        photo = c.get("photo_url") or ""
        role = _esc(c.get("_role") or "Staff")
        specialty = _esc(c.get("specialty") or "")
        years = c.get("years_experience")
        years_lbl = f"{years} años" if isinstance(years, int) else "—"
        level = _esc(c.get("level") or "")
        org = _esc(c.get("current_organization") or "")
        notes = _esc(c.get("_notes") or "")
        avatar = (
            f'<img src="{photo}" alt="{name}" class="st-avatar"/>' if photo
            else f'<div class="st-avatar st-avatar-fb">{initial}</div>'
        )
        cards.append(f"""
<div class="staff-card">
  <div class="staff-head">
    {avatar}
    <div class="staff-id">
      <div class="st-role">{role}</div>
      <div class="st-name">{name}</div>
      <div class="st-spec">{specialty}{(" · " + level) if level else ""}</div>
    </div>
    <div class="st-exp"><div class="exp-num">{years_lbl}</div><div class="exp-lbl">Experiencia</div></div>
  </div>
  {f'<div class="st-org">📍 {org}</div>' if org else ''}
  {f'<div class="st-notes">{notes}</div>' if notes else ''}
</div>""")
    return f"""
<h2>4. Cuerpo Técnico Asignado</h2>
<div class="staff-grid">{"".join(cards)}</div>
<style>
  .staff-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8pt; margin-top: 6pt; }}
  .staff-card {{ background: #fff; border: 1px solid #e2e8f0; border-left: 3pt solid #0EA5E9; border-radius: 10pt; padding: 10pt 12pt; page-break-inside: avoid; break-inside: avoid; }}
  .staff-head {{ display: flex; align-items: center; gap: 10pt; margin-bottom: 4pt; }}
  .st-avatar {{ width: 38pt; height: 38pt; border-radius: 50%; object-fit: cover; }}
  .st-avatar-fb {{ background: linear-gradient(135deg, #0EA5E9, #0f172a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 16pt; font-weight: 900; }}
  .staff-id {{ flex: 1; min-width: 0; }}
  .st-role {{ font-size: 7.5pt; font-weight: 800; color: #0EA5E9; text-transform: uppercase; letter-spacing: 0.7px; }}
  .st-name {{ font-size: 11pt; font-weight: 900; color: #0f172a; line-height: 1.1; }}
  .st-spec {{ font-size: 8.5pt; color: #475569; font-weight: 600; margin-top: 1pt; }}
  .st-exp {{ text-align: right; flex-shrink: 0; }}
  .exp-num {{ font-size: 11pt; font-weight: 900; color: #0EA5E9; line-height: 1; }}
  .exp-lbl {{ font-size: 6.5pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.7px; margin-top: 1pt; }}
  .st-org {{ font-size: 8.5pt; color: #475569; margin-top: 4pt; padding-top: 4pt; border-top: 1px dashed #e2e8f0; }}
  .st-notes {{ font-size: 8pt; color: #64748b; font-style: italic; margin-top: 3pt; }}
</style>
"""


@router.get("/{plan_id}/pdf")
async def download_objectives_pdf(plan_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    doc = await _objectives.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Aún no hay objetivos guardados. Haz clic en 'Guardar' primero.")
    plan_name = await _get_plan_name(plan_id)
    staff = await _get_plan_staff(plan_id, uid)
    html = _build_html(doc, plan_name, staff_html=_staff_section_html(staff))
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Plan_Activo.pdf"'},
    )


class ShareResponse(BaseModel):
    share_id: str
    share_url: str


@router.post("/{plan_id}/share", response_model=ShareResponse)
async def create_objectives_share_link(plan_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    doc = await _objectives.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Debes guardar los objetivos antes de compartirlos.")
    existing = await _obj_shares.find_one({"plan_id": plan_id, "user_id": uid}, {"_id": 0})
    plan_name = await _get_plan_name(plan_id)
    staff = await _get_plan_staff(plan_id, uid)
    if existing and existing.get("share_id"):
        share_id = existing["share_id"]
        await _obj_shares.update_one(
            {"share_id": share_id},
            {"$set": {"snapshot": doc, "plan_name": plan_name, "staff": staff, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        share_id = uuid.uuid4().hex[:14]
        now = datetime.now(timezone.utc).isoformat()
        await _obj_shares.insert_one({
            "share_id": share_id,
            "plan_id": plan_id,
            "user_id": uid,
            "plan_name": plan_name,
            "snapshot": doc,
            "staff": staff,
            "created_at": now,
            "updated_at": now,
        })
    base = os.environ.get("PUBLIC_BASE_URL", "")
    share_url = f"{base}/api/plan-data/objectives/shared/{share_id}" if base else f"/api/plan-data/objectives/shared/{share_id}"
    return ShareResponse(share_id=share_id, share_url=share_url)


@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared_objectives(share_id: str):
    share = await _obj_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    staff_html = _staff_section_html(share.get("staff") or [])
    html = _build_html(share["snapshot"], share.get("plan_name") or "Plan de entrenamiento", share_id=share_id, staff_html=staff_html)
    return HTMLResponse(content=html)


@router.get("/shared/{share_id}/pdf")
async def download_shared_objectives_pdf(share_id: str):
    share = await _obj_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido o expirado")
    staff_html = _staff_section_html(share.get("staff") or [])
    html = _build_html(share["snapshot"], share.get("plan_name") or "Plan de entrenamiento", share_id=share_id, staff_html=staff_html)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="Plan_Activo.pdf"'},
    )
