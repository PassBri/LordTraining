"""
Exportación PDF + Share + Plantillas + Multi-control para Evaluaciones deportivas.
8 tipos: medical, physical, technical, tactical, psychological, theoretical,
        anthropometric, biomechanical.

CAMBIOS RELEVANTES (v3):
- Múltiples controles por tipo: cada control tiene su propio `id` (uuid) y `date`.
- Endpoint `list` para listar todos los controles de un (plan, tipo, atleta).
- Endpoint `timeline` para Plan Gráfico: todos los controles del plan con su fecha.
- Reordenamiento de rutas: específicas (`/list`, `/templates/*`, `/shared/*`,
  `/by-id/*`, `/timeline`) declaradas ANTES del catch-all `/{plan_id}/{type}`
  para evitar colisiones de routing en FastAPI.
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

router = APIRouter(prefix="/plan-data/evaluations-export", tags=["evaluations-export"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_evals = _db["plan_evaluations_v2"]
_eval_shares = _db["plan_evaluations_shares"]
_eval_templates = _db["evaluation_templates"]
_plans = _db["training_plans"]
_athletes = _db["athletes"]


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


def _new_id(n: int = 14) -> str:
    return uuid.uuid4().hex[:n]


def _new_aspect_id() -> str:
    return uuid.uuid4().hex[:10]


EVAL_META: Dict[str, Dict[str, str]] = {
    "medical":       {"title": "Control Médico",       "color": "#EF4444", "icon": "🩺", "subtitle": "Estado de salud y aptitud para el entrenamiento"},
    "physical":      {"title": "Control Físico",       "color": "#3B82F6", "icon": "💪", "subtitle": "Capacidades físicas y condición"},
    "technical":     {"title": "Control Técnico",      "color": "#8B5CF6", "icon": "🎯", "subtitle": "Habilidades técnicas específicas del deporte"},
    "tactical":      {"title": "Control Táctico",      "color": "#F59E0B", "icon": "🧩", "subtitle": "Comprensión táctica y toma de decisiones"},
    "psychological": {"title": "Control Psicológico",  "color": "#EC4899", "icon": "🧠", "subtitle": "Bienestar mental y habilidades psicológicas"},
    "theoretical":   {"title": "Control Teórico",      "color": "#14B8A6", "icon": "📘", "subtitle": "Conocimiento teórico del deporte"},
    "anthropometric": {"title": "Antropometría",       "color": "#06B6D4", "icon": "📏", "subtitle": "Composición corporal y mediciones"},
    "biomechanical":  {"title": "Biomecánica",         "color": "#10B981", "icon": "🦴", "subtitle": "Análisis del movimiento y técnica deportiva"},
}


DEFAULT_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "medical": [
        {"label": "FC en reposo", "category": "Signos Vitales", "scale_min": 40, "scale_max": 100, "scale_unit": "lpm", "target": 60},
        {"label": "Presión arterial sistólica", "category": "Signos Vitales", "scale_min": 90, "scale_max": 160, "scale_unit": "mmHg", "target": 120},
        {"label": "Saturación O₂", "category": "Signos Vitales", "scale_min": 90, "scale_max": 100, "scale_unit": "%", "target": 98},
        {"label": "Estado de aptitud", "category": "Aptitud", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Lesiones activas", "category": "Lesiones", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 0},
    ],
    "physical": [
        {"label": "Fuerza máxima (1RM Sentadilla)", "category": "Fuerza", "scale_min": 0, "scale_max": 200, "scale_unit": "kg", "target": 100},
        {"label": "Resistencia (VO₂ max)", "category": "Resistencia", "scale_min": 30, "scale_max": 75, "scale_unit": "ml/kg/min", "target": 55},
        {"label": "Velocidad (Sprint 30m)", "category": "Velocidad", "scale_min": 3.5, "scale_max": 6.0, "scale_unit": "s", "target": 4.2},
        {"label": "Flexibilidad (Sit & Reach)", "category": "Flexibilidad", "scale_min": -10, "scale_max": 30, "scale_unit": "cm", "target": 20},
        {"label": "Potencia (CMJ)", "category": "Potencia", "scale_min": 20, "scale_max": 70, "scale_unit": "cm", "target": 45},
        {"label": "Composición corporal (% grasa)", "category": "Composición", "scale_min": 5, "scale_max": 25, "scale_unit": "%", "target": 12},
    ],
    "technical": [
        {"label": "Técnica básica", "category": "Fundamentos", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Técnica específica", "category": "Fundamentos", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Ejecución bajo presión", "category": "Aplicación", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Consistencia técnica", "category": "Aplicación", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Eficiencia del gesto", "category": "Aplicación", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
    ],
    "tactical": [
        {"label": "Lectura del juego", "category": "Comprensión", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Toma de decisiones", "category": "Comprensión", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Posicionamiento", "category": "Ejecución", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Comunicación en cancha", "category": "Equipo", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Adaptabilidad táctica", "category": "Ejecución", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
    ],
    "psychological": [
        {"label": "Motivación", "category": "Estado emocional", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Autoconfianza", "category": "Estado emocional", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Control emocional", "category": "Estado emocional", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Concentración", "category": "Habilidades mentales", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Manejo de la presión", "category": "Habilidades mentales", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Resiliencia", "category": "Habilidades mentales", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
    ],
    "theoretical": [
        {"label": "Reglamento del deporte", "category": "Conocimiento del deporte", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Táctica teórica", "category": "Conocimiento del deporte", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Nutrición deportiva", "category": "Salud", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Prevención de lesiones", "category": "Salud", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "Principios de entrenamiento", "category": "Metodología", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 8},
        {"label": "Fair play y ética", "category": "Valores", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 10},
    ],
    "anthropometric": [
        {"label": "Peso corporal", "category": "Mediciones básicas", "scale_min": 40, "scale_max": 130, "scale_unit": "kg", "target": 75},
        {"label": "Talla", "category": "Mediciones básicas", "scale_min": 150, "scale_max": 210, "scale_unit": "cm", "target": 178},
        {"label": "IMC", "category": "Índices", "scale_min": 18, "scale_max": 30, "scale_unit": "kg/m²", "target": 22.5},
        {"label": "% Grasa corporal", "category": "Composición", "scale_min": 5, "scale_max": 25, "scale_unit": "%", "target": 12},
        {"label": "Masa muscular", "category": "Composición", "scale_min": 30, "scale_max": 80, "scale_unit": "kg", "target": 55},
        {"label": "Pliegue tricipital", "category": "Pliegues", "scale_min": 5, "scale_max": 25, "scale_unit": "mm", "target": 10},
        {"label": "Pliegue subescapular", "category": "Pliegues", "scale_min": 5, "scale_max": 25, "scale_unit": "mm", "target": 10},
    ],
    "biomechanical": [
        {"label": "Tipo de pisada (0=neutral, 10=patológico)", "category": "Marcha y carrera", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 0},
        {"label": "Frecuencia de paso", "category": "Marcha y carrera", "scale_min": 140, "scale_max": 200, "scale_unit": "spm", "target": 180},
        {"label": "Alineación postural", "category": "Postura", "scale_min": 0, "scale_max": 10, "scale_unit": "/10", "target": 9},
        {"label": "ROM hombro flexión", "category": "Rango de movimiento", "scale_min": 120, "scale_max": 200, "scale_unit": "°", "target": 180},
        {"label": "ROM cadera flexión", "category": "Rango de movimiento", "scale_min": 80, "scale_max": 130, "scale_unit": "°", "target": 120},
        {"label": "Asimetría de fuerza I/D", "category": "Asimetrías", "scale_min": 0, "scale_max": 30, "scale_unit": "%", "target": 5},
        {"label": "FMS Score", "category": "Eficiencia del movimiento", "scale_min": 0, "scale_max": 21, "scale_unit": "/21", "target": 17},
    ],
}


def _seed_default_aspects(eval_type: str) -> List[Dict[str, Any]]:
    out = []
    for a in DEFAULT_TEMPLATES.get(eval_type, []):
        out.append({
            "id": _new_aspect_id(),
            "label": a["label"],
            "category": a.get("category", "General"),
            "scale_min": a.get("scale_min", 0),
            "scale_max": a.get("scale_max", 10),
            "scale_unit": a.get("scale_unit", "/10"),
            "target": a.get("target"),
            "value": None,
            "notes": "",
        })
    return out


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _summarize(doc: Dict[str, Any]) -> Dict[str, Any]:
    """Resumen rápido de un control para listados/timeline."""
    aspects = doc.get("aspects") or []
    total = len(aspects)
    measured = 0
    norm_sum = 0.0
    norm_count = 0
    for a in aspects:
        v = a.get("value")
        try:
            if v is None or v == "":
                continue
            v = float(v)
            measured += 1
            mn = float(a.get("scale_min", 0))
            mx = float(a.get("scale_max", 10))
            if mx != mn:
                pct = max(0.0, min(100.0, (v - mn) / (mx - mn) * 100))
                norm_sum += pct
                norm_count += 1
        except Exception:
            continue
    global_pct = round(norm_sum / norm_count) if norm_count else 0
    return {
        "id": doc.get("id"),
        "evaluation_type": doc.get("evaluation_type"),
        "plan_id": doc.get("plan_id"),
        "athlete_id": doc.get("athlete_id"),
        "date": doc.get("date") or "",
        "title": doc.get("title") or "",
        "total": total,
        "measured": measured,
        "global_pct": global_pct,
        "updated_at": doc.get("updated_at"),
    }


# =====================================================================
# MODELS
# =====================================================================

class Aspect(BaseModel):
    id: Optional[str] = None
    label: str
    category: Optional[str] = "General"
    scale_min: float = 0
    scale_max: float = 10
    scale_unit: Optional[str] = "/10"
    target: Optional[float] = None
    value: Optional[float] = None
    notes: Optional[str] = ""


class EvaluationSavePayload(BaseModel):
    id: Optional[str] = None  # NUEVO: si presente, actualiza ese control; si no, crea uno nuevo
    plan_id: str
    athlete_id: Optional[str] = None
    evaluation_type: str
    date: Optional[str] = None
    title: Optional[str] = ""  # NUEVO: nombre legible del control (ej: "Control inicial pretemporada")
    aspects: List[Aspect] = Field(default_factory=list)
    fortalezas: Optional[str] = ""
    areas_mejora: Optional[str] = ""
    notes: Optional[str] = ""


class TemplateSavePayload(BaseModel):
    name: str
    evaluation_type: str
    aspects: List[Aspect] = Field(default_factory=list)
    is_default: Optional[bool] = False


# =====================================================================
# RUTAS ESPECÍFICAS PRIMERO (orden importa en FastAPI)
# =====================================================================

# ---------- 1. SAVE EVALUATION (POST raíz) ----------

@router.post("")
async def save_evaluation(payload: EvaluationSavePayload, user=Depends(get_current_user_dep())):
    if payload.evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo de evaluación inválido: {payload.evaluation_type}")
    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    aspects_clean = []
    for a in payload.aspects:
        d = a.model_dump()
        if not d.get("id"):
            d["id"] = _new_aspect_id()
        aspects_clean.append(d)

    eval_id = payload.id or _new_id()
    body = payload.model_dump()
    body["id"] = eval_id
    body["aspects"] = aspects_clean
    body["user_id"] = uid
    body["date"] = body.get("date") or _today_iso()
    body["updated_at"] = now

    await _evals.update_one(
        {"id": eval_id, "user_id": uid},
        {"$set": body, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    return {"ok": True, "id": eval_id, "aspects": aspects_clean}


# ---------- 2. TIMELINE (todos los controles del plan, para Plan Gráfico) ----------

@router.get("/timeline/{plan_id}")
async def timeline(plan_id: str, athlete_id: Optional[str] = None,
                   user=Depends(get_current_user_dep())):
    """Devuelve todos los controles de un plan, con fecha y resumen.
    Usado por GraphicPlan para marcar las semanas correspondientes."""
    uid = _uid(user)
    q = {"plan_id": plan_id, "user_id": uid}
    if athlete_id:
        q["athlete_id"] = athlete_id
    cur = _evals.find(q, {"_id": 0}).sort("date", 1)
    docs = await cur.to_list(length=2000)
    return {"controls": [_summarize(d) for d in docs]}


# ---------- 3. LIST de un tipo (lista de controles de un plan + tipo) ----------

@router.get("/list/{plan_id}/{evaluation_type}")
async def list_controls(plan_id: str, evaluation_type: str,
                        athlete_id: Optional[str] = None,
                        user=Depends(get_current_user_dep())):
    if evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo inválido: {evaluation_type}")
    uid = _uid(user)
    q = {"plan_id": plan_id, "user_id": uid, "evaluation_type": evaluation_type,
         "athlete_id": athlete_id}
    cur = _evals.find(q, {"_id": 0}).sort([("date", -1), ("updated_at", -1)])
    docs = await cur.to_list(length=200)
    # Asegurar que cada doc tiene id (migración suave para datos antiguos)
    out = []
    for d in docs:
        if not d.get("id"):
            d["id"] = _new_id()
            await _evals.update_one(
                {"_id": d.get("_mid")} if d.get("_mid") else
                {"plan_id": d["plan_id"], "user_id": uid, "evaluation_type": evaluation_type,
                 "athlete_id": d.get("athlete_id")},
                {"$set": {"id": d["id"]}}
            )
        out.append(_summarize(d))
    return {"controls": out}


# ---------- 4. TEMPLATES ----------

@router.get("/templates/{evaluation_type}")
async def list_templates(evaluation_type: str, user=Depends(get_current_user_dep())):
    if evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo inválido: {evaluation_type}")
    uid = _uid(user)
    cur = _eval_templates.find(
        {"user_id": uid, "evaluation_type": evaluation_type},
        {"_id": 0}
    ).sort("updated_at", -1)
    items = await cur.to_list(length=200)
    sys_default = {
        "id": f"system::{evaluation_type}",
        "name": f"Plantilla del sistema · {EVAL_META[evaluation_type]['title']}",
        "evaluation_type": evaluation_type,
        "is_default": False,
        "is_system": True,
        "aspects": _seed_default_aspects(evaluation_type),
    }
    return {"templates": items, "system_default": sys_default}


@router.post("/templates")
async def save_template(payload: TemplateSavePayload, user=Depends(get_current_user_dep())):
    if payload.evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo inválido: {payload.evaluation_type}")
    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    aspects_clean = []
    for a in payload.aspects:
        d = a.model_dump()
        if not d.get("id"):
            d["id"] = _new_aspect_id()
        d["value"] = None
        aspects_clean.append(d)
    tid = _new_id()
    doc = {
        "id": tid, "user_id": uid, "name": payload.name,
        "evaluation_type": payload.evaluation_type,
        "aspects": aspects_clean,
        "is_default": bool(payload.is_default),
        "created_at": now, "updated_at": now,
    }
    if payload.is_default:
        await _eval_templates.update_many(
            {"user_id": uid, "evaluation_type": payload.evaluation_type},
            {"$set": {"is_default": False}}
        )
    await _eval_templates.insert_one(doc)
    return {"id": tid, "name": payload.name, "is_default": payload.is_default}


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _eval_templates.delete_one({"id": template_id, "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Plantilla no encontrada")
    return {"ok": True}


@router.post("/templates/{template_id}/set-default")
async def set_template_default(template_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    tpl = await _eval_templates.find_one({"id": template_id, "user_id": uid}, {"_id": 0})
    if not tpl:
        raise HTTPException(404, "Plantilla no encontrada")
    await _eval_templates.update_many(
        {"user_id": uid, "evaluation_type": tpl["evaluation_type"]},
        {"$set": {"is_default": False}}
    )
    await _eval_templates.update_one({"id": template_id}, {"$set": {"is_default": True}})
    return {"ok": True}


# ---------- 5. BY-ID (operaciones sobre un control específico) ----------

@router.get("/by-id/{evaluation_id}")
async def get_evaluation_by_id(evaluation_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = await _evals.find_one({"id": evaluation_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Control no encontrado")
    return doc


@router.delete("/by-id/{evaluation_id}")
async def delete_evaluation_by_id(evaluation_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _evals.delete_one({"id": evaluation_id, "user_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Control no encontrado")
    # Limpiar shares asociados
    await _eval_shares.delete_many({"evaluation_id": evaluation_id, "user_id": uid})
    return {"ok": True}


@router.get("/by-id/{evaluation_id}/pdf")
async def download_evaluation_pdf_by_id(evaluation_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = await _evals.find_one({"id": evaluation_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Control no encontrado")
    plan_name = await _get_plan_name(doc.get("plan_id"))
    athlete_name = await _get_athlete_name(doc.get("athlete_id"))
    html = _build_html(doc, plan_name, athlete_name=athlete_name)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.get("evaluation_type")}_{evaluation_id[:8]}.pdf"'},
    )


class ShareEvalResponse(BaseModel):
    share_id: str
    share_url: str


@router.post("/by-id/{evaluation_id}/share", response_model=ShareEvalResponse)
async def create_eval_share_by_id(evaluation_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = await _evals.find_one({"id": evaluation_id, "user_id": uid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Control no encontrado")
    plan_name = await _get_plan_name(doc.get("plan_id"))
    athlete_name = await _get_athlete_name(doc.get("athlete_id"))
    now = datetime.now(timezone.utc).isoformat()
    snapshot = {**doc, "plan_name": plan_name, "athlete_name": athlete_name}
    existing = await _eval_shares.find_one({"evaluation_id": evaluation_id, "user_id": uid}, {"_id": 0})
    if existing and existing.get("share_id"):
        share_id = existing["share_id"]
        await _eval_shares.update_one(
            {"share_id": share_id},
            {"$set": {"snapshot": snapshot, "updated_at": now}}
        )
    else:
        share_id = _new_id()
        await _eval_shares.insert_one({
            "share_id": share_id, "evaluation_id": evaluation_id, "user_id": uid,
            "snapshot": snapshot, "created_at": now, "updated_at": now,
        })
    base = os.environ.get("PUBLIC_BASE_URL", "")
    share_url = f"{base}/api/plan-data/evaluations-export/shared/{share_id}" if base else f"/api/plan-data/evaluations-export/shared/{share_id}"
    return ShareEvalResponse(share_id=share_id, share_url=share_url)


# ---------- 6. SHARED (público, sin auth) ----------

@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared_eval(share_id: str):
    share = await _eval_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido")
    snap = share.get("snapshot") or {}
    html = _build_html(snap, snap.get("plan_name") or "Plan",
                       athlete_name=snap.get("athlete_name") or "",
                       share_id=share_id)
    return HTMLResponse(content=html)


@router.get("/shared/{share_id}/pdf")
async def download_shared_eval_pdf(share_id: str):
    share = await _eval_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no válido")
    snap = share.get("snapshot") or {}
    html = _build_html(snap, snap.get("plan_name") or "Plan",
                       athlete_name=snap.get("athlete_name") or "",
                       share_id=share_id)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    return Response(
        content=pdf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{snap.get("evaluation_type", "evaluacion")}.pdf"'},
    )


# ---------- 7. CATCH-ALL: GET por (plan, type) — DEBE SER EL ÚLTIMO ----------

@router.get("/{plan_id}/{evaluation_type}")
async def get_evaluation(plan_id: str, evaluation_type: str,
                         athlete_id: Optional[str] = None,
                         user=Depends(get_current_user_dep())):
    """Retrocompat: devuelve el control MÁS RECIENTE de este (plan, tipo, atleta)
    o aspectos por defecto si no hay ninguno (template del sistema)."""
    if evaluation_type not in EVAL_META:
        raise HTTPException(400, f"Tipo inválido: {evaluation_type}")
    uid = _uid(user)
    doc = await _evals.find_one(
        {"plan_id": plan_id, "user_id": uid, "evaluation_type": evaluation_type,
         "athlete_id": athlete_id},
        {"_id": 0},
        sort=[("date", -1), ("updated_at", -1)]
    )
    if doc and doc.get("aspects"):
        if not doc.get("id"):
            doc["id"] = _new_id()
        return doc
    user_default = await _eval_templates.find_one(
        {"user_id": uid, "evaluation_type": evaluation_type, "is_default": True},
        {"_id": 0}
    )
    if user_default and user_default.get("aspects"):
        seeded = []
        for a in user_default["aspects"]:
            seeded.append({**a, "id": a.get("id") or _new_aspect_id(), "value": None, "notes": a.get("notes") or ""})
        return {"id": None, "aspects": seeded, "fortalezas": "", "areas_mejora": "",
                "notes": "", "from_template": user_default.get("name"), "date": _today_iso()}
    return {
        "id": None,
        "aspects": _seed_default_aspects(evaluation_type),
        "fortalezas": "", "areas_mejora": "", "notes": "",
        "from_template": "Plantilla del sistema",
        "date": _today_iso(),
    }


# =====================================================================
# RENDER HTML / PDF
# =====================================================================

def _normalize_value(v, mn, mx):
    try:
        v = float(v); mn = float(mn); mx = float(mx)
    except Exception:
        return 0
    if mx == mn:
        return 0
    pct = (v - mn) / (mx - mn) * 100
    return max(0, min(100, pct))


def _value_color(v, target, scale_min, scale_max):
    try:
        v = float(v); scale_min = float(scale_min); scale_max = float(scale_max)
    except Exception:
        return "#94a3b8"
    if scale_max == scale_min:
        return "#94a3b8"
    norm = (v - scale_min) / (scale_max - scale_min) * 100
    if target is not None:
        try:
            target = float(target)
            tgt_norm = (target - scale_min) / (scale_max - scale_min) * 100
            if tgt_norm < 50:
                if norm <= tgt_norm * 1.2:
                    return "#10B981"
                if norm <= tgt_norm * 1.6:
                    return "#F59E0B"
                return "#EF4444"
        except Exception:
            pass
    if norm >= 80:
        return "#10B981"
    if norm >= 40:
        return "#F59E0B"
    return "#EF4444"


def _build_html(eval_doc: dict, plan_name: str, athlete_name: str = "",
                share_id: Optional[str] = None) -> str:
    et = eval_doc.get("evaluation_type") or "medical"
    meta = EVAL_META.get(et, EVAL_META["medical"])
    color = meta["color"]
    title = meta["title"]
    aspects = eval_doc.get("aspects") or []
    notes = eval_doc.get("notes") or ""
    fortalezas = eval_doc.get("fortalezas") or ""
    areas = eval_doc.get("areas_mejora") or ""
    date = eval_doc.get("date") or _today_iso()
    control_title = eval_doc.get("title") or ""

    brand_dir = "/app/frontend/public/brand"
    try:
        with open(f"{brand_dir}/lordtraining-full-pdf.png", "rb") as f:
            full_b64 = base64.b64encode(f.read()).decode()
        with open(f"{brand_dir}/lordtraining-icon-pdf.png", "rb") as f:
            icon_b64 = base64.b64encode(f.read()).decode()
    except FileNotFoundError:
        full_b64 = icon_b64 = ""

    groups: Dict[str, List[Dict[str, Any]]] = {}
    for a in aspects:
        cat = (a or {}).get("category") or "General"
        groups.setdefault(cat, []).append(a)

    sec_html = []
    norm_values = []
    for cat, items in groups.items():
        cat_norms = []
        bars = []
        for it in items:
            label = _esc(it.get("label") or "—")
            value = it.get("value")
            scale_min = it.get("scale_min", 0)
            scale_max = it.get("scale_max", 10)
            scale_unit = it.get("scale_unit") or ""
            target = it.get("target")
            note = _esc(it.get("notes") or "")
            if value is None or value == "":
                val_str = "<span class='muted'>Sin medir</span>"
                bar_w = 0
                bar_color = "#cbd5e1"
            else:
                bar_w = _normalize_value(value, scale_min, scale_max)
                bar_color = _value_color(value, target, scale_min, scale_max)
                cat_norms.append(bar_w)
                norm_values.append(bar_w)
                v_display = value
                try:
                    v_display = f"{float(value):g}"
                except Exception:
                    pass
                val_str = f"{v_display}<span class='muted'> {_esc(scale_unit)}</span>"
            target_html = ""
            if target not in (None, ""):
                try:
                    t_disp = f"{float(target):g}"
                    target_html = f"<span class='target'>Objetivo · {t_disp} {_esc(scale_unit)}</span>"
                except Exception:
                    pass
            bars.append(f"""
<div class="row">
  <div class="row-head">
    <span class="row-lbl">{label}{target_html}</span>
    <span class="row-val" style="color:{bar_color}">{val_str}</span>
  </div>
  <div class="bar"><div class="bar-fill" style="width:{bar_w}%;background:{bar_color}"></div></div>
  {f'<div class="row-note">{note}</div>' if note else ''}
</div>
""")
        cat_avg = sum(cat_norms) / max(1, len(cat_norms)) if cat_norms else 0
        avg_html = f"<span class='sec-avg' style='color:{color}'>{cat_avg:.0f}%</span>" if cat_norms else "<span class='sec-avg muted'>—</span>"
        sec_html.append(f"""
<div class="section">
  <h3>{_esc(cat)} {avg_html}</h3>
  <div class="rows">{''.join(bars)}</div>
</div>
""")
    rows_html = ''.join(sec_html) or '<p class="muted">Sin aspectos registrados.</p>'
    global_avg = sum(norm_values) / max(1, len(norm_values)) if norm_values else 0
    measured_count = sum(1 for a in aspects if a.get("value") not in (None, ""))

    share_banner = ""
    if share_id:
        share_banner = '<div class="share-ribbon">DOCUMENTO COMPARTIDO · Solo lectura · Generado por LordTraining.app</div>'

    today = datetime.now(timezone.utc).strftime("%d/%m/%Y")
    athlete_block = f'<div><strong>Atleta</strong>{_esc(athlete_name)}</div>' if athlete_name else ""
    control_subtitle = f' · {_esc(control_title)}' if control_title else ""

    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>{title} · LordTraining</title>
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
  .stat-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 8pt; margin-bottom: 14pt; }}
  .stat-card {{ background: #fff; border: 1px solid #e2e8f0; border-left: 4pt solid {color}; border-radius: 8pt; padding: 10pt 12pt; }}
  .stat-card .num {{ font-size: 18pt; font-weight: 900; color: #0f172a; }}
  .stat-card .lbl {{ font-size: 7.5pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }}
  .section {{ margin-bottom: 10pt; page-break-inside: avoid; break-inside: avoid; }}
  .sec-avg {{ font-size: 10pt; font-weight: 900; }}
  .rows {{ display: flex; flex-direction: column; gap: 6pt; }}
  .row {{ background: #f8fafc; border-radius: 8pt; padding: 7pt 10pt; border-left: 3pt solid {color}; }}
  .row-head {{ display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 4pt; gap: 8pt; }}
  .row-lbl {{ font-size: 9.5pt; font-weight: 700; color: #0f172a; flex: 1; }}
  .target {{ display: block; font-size: 7.5pt; color: #64748b; font-weight: 600; margin-top: 1pt; letter-spacing: 0.3px; }}
  .row-val {{ font-size: 11pt; font-weight: 900; white-space: nowrap; }}
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
    <img src="data:image/png;base64,{full_b64}" alt="LordTraining" width="160" height="42" style="width:160px;height:42px;object-fit:contain;display:block;"/>
  </div>
  <span class="badge">EVALUACIÓN · {meta['icon']} {title.upper()}</span>
  <h1>{title}{control_subtitle}</h1>
  <div class="subtitle">{_esc(plan_name)}</div>
  <div class="meta">
    <div><strong>Fecha</strong>{_esc(date)}</div>
    {athlete_block}
    <div><strong>Generado el</strong>{today}</div>
  </div>
</div>

<div class="global-card">
  <div>
    <div class="lbl">Promedio Global Normalizado</div>
    <div style="font-size: 11pt; opacity: 0.85; margin-top: 4pt;">{title}</div>
  </div>
  <div style="text-align:right;">
    <div class="num">{global_avg:.0f}<span style="font-size:14pt;opacity:0.7">%</span></div>
    <div class="lbl" style="margin-top:2pt;">{measured_count} de {len(aspects)} aspectos medidos</div>
  </div>
</div>

<div class="stat-grid">
  <div class="stat-card"><div class="num">{len(aspects)}</div><div class="lbl">Aspectos definidos</div></div>
  <div class="stat-card"><div class="num">{measured_count}</div><div class="lbl">Aspectos medidos</div></div>
  <div class="stat-card"><div class="num">{len(groups)}</div><div class="lbl">Categorías</div></div>
</div>

<h2>Detalle por Categoría</h2>
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
  <img src="data:image/png;base64,{icon_b64}" alt="LordTraining"/>
  <span>Generado por <strong>LordTraining</strong> · LordTraining.app · {title}</span>
</div>

</body></html>"""


async def _render_pdf(html: str) -> bytes:
    import asyncio
    from routes.pdf_render import html_to_pdf
    return await asyncio.to_thread(html_to_pdf, html)


async def _get_plan_name(plan_id: Optional[str]) -> str:
    if not plan_id:
        return "Plan sin nombre"
    plan = await _plans.find_one({"id": plan_id}, {"_id": 0, "name": 1})
    return (plan or {}).get("name") or "Plan sin nombre"


async def _get_athlete_name(athlete_id: Optional[str]) -> str:
    if not athlete_id:
        return ""
    a = await _athletes.find_one({"id": athlete_id}, {"_id": 0, "name": 1})
    return (a or {}).get("name") or ""
