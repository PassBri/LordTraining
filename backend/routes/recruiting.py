"""
Recruiting & Talent ID — "Identifica el talento. Construye el futuro."

Módulo de scouting: perfiles de prospectos, evaluación por criterios (por deporte),
pipeline Kanban, recomendación con IA (GPT-5.5 / Claude Sonnet 4.6), ranking,
ficha PDF estilo NCAA, integración con Gestión de Equipos (al reclutar → atleta).
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Query, Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import os
import base64
import json
import re
import requests

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/recruiting", tags=["recruiting"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_prospects = _db["recruiting_prospects"]
_files = _db["recruiting_files"]
_athletes = _db["athletes"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


# ───────────────────────── OBJECT STORAGE ─────────────────────────
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "lordtraining"
_storage_key = None

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
}


def _init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    global _storage_key
    key = _init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        _storage_key = None
        key = _init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str):
    global _storage_key
    key = _init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        _storage_key = None
        key = _init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ───────────────────────── CRITERIOS POR DEPORTE ─────────────────────────
# Cada bloque tiene sub-criterios puntuables 0-100. club_standard = referencia del club.
def _cat(label, key, items):
    return {"key": key, "label": label, "criteria": [{"key": k, "label": v} for k, v in items]}


_GENERAL = [
    _cat("Técnico", "technical", [
        ("control", "Control y dominio"), ("execution", "Ejecución técnica"),
        ("consistency", "Consistencia"), ("versatility", "Versatilidad"),
    ]),
    _cat("Físico", "physical", [
        ("speed", "Velocidad"), ("strength", "Fuerza/Potencia"),
        ("endurance", "Resistencia"), ("agility", "Agilidad/Coordinación"),
    ]),
    _cat("Táctico", "tactical", [
        ("reading", "Lectura de juego"), ("decision", "Toma de decisiones"),
        ("positioning", "Posicionamiento"), ("teamwork", "Trabajo en equipo"),
    ]),
    _cat("Mental", "mental", [
        ("attitude", "Actitud/Disciplina"), ("competitiveness", "Competitividad"),
        ("coachability", "Aprendizaje (coachability)"), ("resilience", "Resiliencia"),
    ]),
]

_SPORT_CRITERIA = {
    "football": [
        _cat("Técnico", "technical", [
            ("ball_control", "Control de balón"), ("passing", "Pase corto/largo"),
            ("finishing", "Definición"), ("dribbling", "Regate/1v1"), ("first_touch", "Primer toque"),
        ]),
        _cat("Físico", "physical", [
            ("sprint", "Velocidad/Sprint"), ("stamina", "Resistencia intermitente"),
            ("strength", "Fuerza/Duelos"), ("agility", "Agilidad/Cambios de dirección"),
        ]),
        _cat("Táctico", "tactical", [
            ("positioning", "Posicionamiento"), ("game_reading", "Lectura de juego"),
            ("pressing", "Presión/Marca"), ("transitions", "Transiciones"),
        ]),
        _cat("Mental", "mental", [
            ("leadership", "Liderazgo"), ("competitiveness", "Competitividad"),
            ("discipline", "Disciplina táctica"), ("composure", "Temple bajo presión"),
        ]),
    ],
    "basketball": [
        _cat("Técnico", "technical", [
            ("shooting", "Tiro (media/triple)"), ("ball_handling", "Manejo de balón"),
            ("finishing", "Finalización en aro"), ("passing", "Pase/Visión"), ("defense_skills", "Técnica defensiva"),
        ]),
        _cat("Físico", "physical", [
            ("vertical", "Salto vertical"), ("speed", "Velocidad/Transición"),
            ("strength", "Fuerza/Contacto"), ("lateral", "Movilidad lateral"),
        ]),
        _cat("Táctico", "tactical", [
            ("court_vision", "Visión de cancha"), ("spacing", "Espaciado"),
            ("pnr", "Lectura de bloqueos (PnR)"), ("defense_iq", "IQ defensivo"),
        ]),
        _cat("Mental", "mental", [
            ("clutch", "Mentalidad clutch"), ("leadership", "Liderazgo"),
            ("coachability", "Coachability"), ("focus", "Concentración"),
        ]),
    ],
    "volleyball": [
        _cat("Técnico", "technical", [
            ("attack", "Ataque/Remate"), ("serve", "Saque"), ("reception", "Recepción"),
            ("setting", "Colocación"), ("block", "Bloqueo"),
        ]),
        _cat("Físico", "physical", [
            ("jump", "Salto"), ("reaction", "Velocidad de reacción"),
            ("power", "Potencia"), ("flexibility", "Flexibilidad"),
        ]),
        _cat("Táctico", "tactical", [
            ("rotation_iq", "Lectura de rotaciones"), ("positioning", "Posicionamiento"),
            ("defense_read", "Lectura defensiva"), ("system", "Adaptación al sistema"),
        ]),
        _cat("Mental", "mental", [
            ("consistency", "Consistencia"), ("communication", "Comunicación"),
            ("competitiveness", "Competitividad"), ("composure", "Temple"),
        ]),
    ],
    "tennis": [
        _cat("Técnico", "technical", [
            ("forehand", "Derecha"), ("backhand", "Revés"), ("serve", "Saque"),
            ("volley", "Volea"), ("return", "Resto"),
        ]),
        _cat("Físico", "physical", [
            ("speed", "Velocidad"), ("endurance", "Resistencia"),
            ("explosiveness", "Explosividad"), ("recovery", "Recuperación"),
        ]),
        _cat("Táctico", "tactical", [
            ("point_construction", "Construcción de punto"), ("court_position", "Posición en pista"),
            ("adaptability", "Adaptación al rival"), ("variation", "Variación de golpes"),
        ]),
        _cat("Mental", "mental", [
            ("focus", "Concentración"), ("resilience", "Resiliencia"),
            ("competitiveness", "Competitividad"), ("emotional_control", "Control emocional"),
        ]),
    ],
}
_SPORT_CRITERIA["soccer"] = _SPORT_CRITERIA["football"]
_SPORT_CRITERIA["futbol"] = _SPORT_CRITERIA["football"]


def _criteria_for(sport: Optional[str]):
    if not sport:
        return _GENERAL
    key = str(sport).strip().lower()
    return _SPORT_CRITERIA.get(key, _GENERAL)


CLUB_STANDARD = 70  # referencia configurable del club (overall objetivo)


# ───────────────────────── MODELOS ─────────────────────────
class VideoLink(BaseModel):
    title: Optional[str] = "Highlight"
    url: str


class Observation(BaseModel):
    id: Optional[str] = None
    date: Optional[str] = None
    context: Optional[str] = None      # ej "Partido vs X", "Entrenamiento"
    note: str
    rating: Optional[int] = None        # impresión rápida 1-10


class ProspectIn(BaseModel):
    # Personal
    name: str = Field(..., min_length=1, max_length=200)
    photo_path: Optional[str] = None
    birth_date: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=4, le=80)
    nationality: Optional[str] = None
    gender: Optional[str] = None
    # Deportivo
    sport: Optional[str] = None
    sport_name: Optional[str] = None
    position: Optional[str] = None
    current_club: Optional[str] = None
    height_cm: Optional[int] = None
    weight_kg: Optional[int] = None
    dominant_side: Optional[str] = None   # derecha/izquierda/ambidiestro
    # Contacto
    email: Optional[str] = None
    phone: Optional[str] = None
    guardian_contact: Optional[str] = None
    social_links: Dict[str, str] = Field(default_factory=dict)
    # Multimedia / extras
    video_links: List[VideoLink] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    key_stats: Dict[str, Any] = Field(default_factory=dict)
    bio: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    # Pipeline
    stage: str = "prospect"        # prospect | contacted | trial | decision
    outcome: Optional[str] = None  # None | recruited | declined


class ProspectOut(ProspectIn):
    id: str
    coach_id: str
    overall_score: Optional[int] = None
    evaluation: Optional[Dict[str, Any]] = None
    ai_recommendation: Optional[Dict[str, Any]] = None
    observations: List[Dict[str, Any]] = Field(default_factory=list)
    converted_athlete_id: Optional[str] = None
    share_id: Optional[str] = None
    share_enabled: Optional[bool] = False
    created_at: str
    updated_at: Optional[str] = None


def _clean(doc):
    doc.pop("_id", None)
    return doc


# ───────────────────────── CRUD ─────────────────────────
@router.get("/criteria")
async def get_criteria(sport: Optional[str] = None, user=Depends(get_current_user_dep())):
    return {"sport": sport, "club_standard": CLUB_STANDARD, "blocks": _criteria_for(sport)}


@router.post("/prospects", response_model=ProspectOut)
async def create_prospect(payload: ProspectIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": uid,
        **payload.model_dump(),
        "overall_score": None,
        "evaluation": None,
        "ai_recommendation": None,
        "observations": [],
        "converted_athlete_id": None,
        "created_at": now,
        "updated_at": now,
    }
    await _prospects.insert_one(doc)
    return ProspectOut(**_clean(doc))


@router.get("/prospects", response_model=List[ProspectOut])
async def list_prospects(stage: Optional[str] = None, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    q = {"coach_id": uid}
    if stage:
        q["stage"] = stage
    items = await _prospects.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return [ProspectOut(**i) for i in items]


@router.get("/prospects/{pid}", response_model=ProspectOut)
async def get_prospect(pid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    return ProspectOut(**p)


@router.put("/prospects/{pid}", response_model=ProspectOut)
async def update_prospect(pid: str, payload: ProspectIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    data = payload.model_dump()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await _prospects.update_one({"id": pid, "coach_id": uid}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(404, "Prospecto no encontrado")
    p = await _prospects.find_one({"id": pid}, {"_id": 0})
    return ProspectOut(**p)


@router.delete("/prospects/{pid}")
async def delete_prospect(pid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _prospects.delete_one({"id": pid, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Prospecto no encontrado")
    return {"ok": True}


# ───────────────────────── PIPELINE ─────────────────────────
class StageUpdate(BaseModel):
    stage: str
    outcome: Optional[str] = None


@router.patch("/prospects/{pid}/stage", response_model=ProspectOut)
async def move_stage(pid: str, payload: StageUpdate, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    upd = {"stage": payload.stage, "updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.stage == "decision":
        upd["outcome"] = payload.outcome
    else:
        upd["outcome"] = None
    res = await _prospects.update_one({"id": pid, "coach_id": uid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Prospecto no encontrado")
    p = await _prospects.find_one({"id": pid}, {"_id": 0})
    return ProspectOut(**p)


# ───────────────────────── OBSERVACIONES ─────────────────────────
@router.post("/prospects/{pid}/observations", response_model=ProspectOut)
async def add_observation(pid: str, obs: Observation, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    entry = obs.model_dump()
    entry["id"] = uuid.uuid4().hex
    entry["date"] = entry.get("date") or datetime.now(timezone.utc).isoformat()
    obs_list = p.get("observations", []) + [entry]
    await _prospects.update_one({"id": pid}, {"$set": {"observations": obs_list, "updated_at": datetime.now(timezone.utc).isoformat()}})
    p["observations"] = obs_list
    return ProspectOut(**p)


@router.delete("/prospects/{pid}/observations/{obs_id}", response_model=ProspectOut)
async def delete_observation(pid: str, obs_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    obs_list = [o for o in p.get("observations", []) if o.get("id") != obs_id]
    await _prospects.update_one({"id": pid}, {"$set": {"observations": obs_list}})
    p["observations"] = obs_list
    return ProspectOut(**p)


# ───────────────────────── EVALUACIÓN ─────────────────────────
class EvaluationIn(BaseModel):
    # scores: { categoryKey: { criterionKey: 0-100 } }
    scores: Dict[str, Dict[str, int]]
    evaluator: Optional[str] = None
    notes: Optional[str] = None


def _compute_overall(scores: Dict[str, Dict[str, int]]):
    cat_avgs = {}
    all_vals = []
    for cat, crits in (scores or {}).items():
        vals = [v for v in crits.values() if isinstance(v, (int, float))]
        if vals:
            cat_avgs[cat] = round(sum(vals) / len(vals))
            all_vals.extend(vals)
    overall = round(sum(all_vals) / len(all_vals)) if all_vals else 0
    return overall, cat_avgs


@router.post("/prospects/{pid}/evaluation", response_model=ProspectOut)
async def save_evaluation(pid: str, payload: EvaluationIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    overall, cat_avgs = _compute_overall(payload.scores)
    evaluation = {
        "scores": payload.scores,
        "category_averages": cat_avgs,
        "overall": overall,
        "club_standard": CLUB_STANDARD,
        "evaluator": payload.evaluator,
        "notes": payload.notes,
        "date": datetime.now(timezone.utc).isoformat(),
    }
    await _prospects.update_one({"id": pid}, {"$set": {
        "evaluation": evaluation, "overall_score": overall,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    p["evaluation"] = evaluation
    p["overall_score"] = overall
    return ProspectOut(**p)


# ───────────────────────── RECOMENDACIÓN IA ─────────────────────────
class AIRequest(BaseModel):
    provider: str = "openai"   # openai | anthropic


@router.post("/prospects/{pid}/ai-recommendation")
async def ai_recommendation(pid: str, payload: AIRequest, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    if not EMERGENT_KEY:
        raise HTTPException(500, "EMERGENT_LLM_KEY no configurada")

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    provider = "anthropic" if payload.provider == "anthropic" else "openai"
    model = "claude-sonnet-4-6" if provider == "anthropic" else "gpt-5.5"

    ev = p.get("evaluation") or {}
    blocks = _criteria_for(p.get("sport"))
    label_map = {}
    for b in blocks:
        for c in b["criteria"]:
            label_map[c["key"]] = c["label"]

    scores_txt = ""
    for cat, crits in (ev.get("scores") or {}).items():
        scores_txt += f"\n  {cat}: " + ", ".join(f"{label_map.get(k, k)}={v}" for k, v in crits.items())

    profile = {
        "nombre": p.get("name"), "deporte": p.get("sport_name") or p.get("sport"),
        "posicion": p.get("position"), "edad": p.get("age"),
        "club_actual": p.get("current_club"), "altura_cm": p.get("height_cm"),
        "peso_kg": p.get("weight_kg"), "lado_dominante": p.get("dominant_side"),
        "logros": p.get("achievements"), "stats": p.get("key_stats"),
        "score_general": ev.get("overall"), "estandar_club": CLUB_STANDARD,
    }

    system = (
        "Eres un Director de Scouting de élite con 20 años de experiencia detectando talento deportivo. "
        "Analizas prospectos de forma objetiva, profesional y accionable. "
        "Respondes SIEMPRE en español y SOLO en JSON válido, sin texto adicional."
    )
    prompt = f"""Analiza el siguiente prospecto y genera un informe de scouting.

PERFIL: {json.dumps(profile, ensure_ascii=False)}
PUNTAJES POR CRITERIO (0-100): {scores_txt or 'sin evaluación detallada'}

Devuelve EXACTAMENTE este JSON:
{{
  "verdict": "RECRUIT | MONITOR | PASS",
  "confidence": <0-100>,
  "projected_ceiling": "breve descripción del techo de rendimiento",
  "summary": "2-3 frases de resumen ejecutivo del prospecto",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "weaknesses": ["área de mejora 1", "área de mejora 2"],
  "development_plan": ["recomendación de desarrollo 1", "recomendación 2", "recomendación 3"],
  "comparison_vs_standard": "cómo se compara vs el estándar del club ({CLUB_STANDARD})",
  "fit_score": <0-100>
}}"""

    chat = LlmChat(api_key=EMERGENT_KEY, session_id=f"scout-{pid}-{uuid.uuid4().hex[:6]}", system_message=system).with_model(provider, model)
    try:
        raw = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        raise HTTPException(500, f"Error de IA: {e}")

    text = raw if isinstance(raw, str) else str(raw)
    m = re.search(r"\{.*\}", text, re.DOTALL)
    try:
        data = json.loads(m.group(0)) if m else {"summary": text}
    except Exception:
        data = {"summary": text}
    data["provider"] = provider
    data["model"] = model
    data["generated_at"] = datetime.now(timezone.utc).isoformat()

    await _prospects.update_one({"id": pid}, {"$set": {"ai_recommendation": data, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return data


# ───────────────────────── CONVERSIÓN A ATLETA ─────────────────────────
class ConvertIn(BaseModel):
    team_id: Optional[str] = None


@router.post("/prospects/{pid}/convert")
async def convert_to_athlete(pid: str, payload: ConvertIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    if p.get("converted_athlete_id"):
        return {"ok": True, "athlete_id": p["converted_athlete_id"], "already": True}

    level_map = "elite" if (p.get("overall_score") or 0) >= 85 else "advanced" if (p.get("overall_score") or 0) >= 70 else "intermediate"
    athlete = {
        "id": str(uuid.uuid4()),
        "coach_id": uid,
        "name": p.get("name"),
        "email": p.get("email"),
        "sport": p.get("sport") or "other",
        "age": p.get("age") or 18,
        "level": level_map,
        "notes": f"Reclutado vía Scouting. Posición: {p.get('position') or '-'}. Score: {p.get('overall_score') or '-'}",
        "affiliations": [],
        "team_id": payload.team_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _athletes.insert_one(dict(athlete))
    await _prospects.update_one({"id": pid}, {"$set": {
        "converted_athlete_id": athlete["id"], "stage": "decision", "outcome": "recruited",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"ok": True, "athlete_id": athlete["id"]}


# ───────────────────────── LINK PÚBLICO (SCOUTING LINK) ─────────────────────────
def _public_view(p: dict) -> dict:
    ev = p.get("evaluation") or {}
    ai = p.get("ai_recommendation") or {}
    return {
        "share_id": p.get("share_id"),
        "name": p.get("name"),
        "has_photo": bool(p.get("photo_path")),
        "sport": p.get("sport"),
        "sport_name": p.get("sport_name"),
        "position": p.get("position"),
        "current_club": p.get("current_club"),
        "age": p.get("age"),
        "nationality": p.get("nationality"),
        "height_cm": p.get("height_cm"),
        "weight_kg": p.get("weight_kg"),
        "dominant_side": p.get("dominant_side"),
        "overall_score": p.get("overall_score"),
        "evaluation": {
            "category_averages": ev.get("category_averages"),
            "overall": ev.get("overall"),
            "club_standard": ev.get("club_standard", CLUB_STANDARD),
        } if ev else None,
        "ai": {
            "verdict": ai.get("verdict"),
            "summary": ai.get("summary"),
            "strengths": ai.get("strengths"),
            "weaknesses": ai.get("weaknesses"),
            "projected_ceiling": ai.get("projected_ceiling"),
        } if ai else None,
        "achievements": p.get("achievements") or [],
        "video_links": p.get("video_links") or [],
        "key_stats": p.get("key_stats") or {},
        "bio": p.get("bio"),
        "tags": p.get("tags") or [],
        "contact": {"email": p.get("email"), "phone": p.get("phone")},
    }


@router.post("/prospects/{pid}/share")
async def enable_share(pid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    share_id = p.get("share_id") or uuid.uuid4().hex
    await _prospects.update_one({"id": pid}, {"$set": {
        "share_id": share_id, "share_enabled": True,
        "shared_at": datetime.now(timezone.utc).isoformat(),
    }})
    return {"share_id": share_id, "share_enabled": True}


@router.delete("/prospects/{pid}/share")
async def disable_share(pid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _prospects.update_one({"id": pid, "coach_id": uid}, {"$set": {"share_enabled": False}})
    if res.matched_count == 0:
        raise HTTPException(404, "Prospecto no encontrado")
    return {"share_enabled": False}


async def _get_shared(share_id: str):
    p = await _prospects.find_one({"share_id": share_id, "share_enabled": True}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Ficha no disponible o enlace desactivado")
    return p


@router.get("/public/{share_id}")
async def public_profile(share_id: str):
    p = await _get_shared(share_id)
    return _public_view(p)


@router.get("/public/{share_id}/photo")
async def public_photo(share_id: str):
    p = await _get_shared(share_id)
    if not p.get("photo_path"):
        raise HTTPException(404, "Sin foto")
    try:
        content, ctype = _get_object(p["photo_path"])
    except Exception as e:
        raise HTTPException(500, f"Error obteniendo foto: {e}")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


@router.get("/public/{share_id}/pdf")
async def public_pdf(share_id: str):
    p = await _get_shared(share_id)
    photo_uri = await _photo_data_uri(p.get("photo_path"))
    html = _build_profile_html(p, photo_uri)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"scouting_{(p.get('name') or 'prospecto').replace(' ', '_').lower()}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename=\"{fname}\"'})


# ───────────────────────── DASHBOARD / RANKING ─────────────────────────
@router.get("/dashboard")
async def dashboard(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    items = await _prospects.find({"coach_id": uid}, {"_id": 0}).to_list(3000)
    by_stage = {"prospect": 0, "contacted": 0, "trial": 0, "decision": 0}
    recruited = declined = 0
    scored = []
    follow_ups = []
    for p in items:
        st = p.get("stage", "prospect")
        by_stage[st] = by_stage.get(st, 0) + 1
        if p.get("outcome") == "recruited":
            recruited += 1
        elif p.get("outcome") == "declined":
            declined += 1
        if p.get("overall_score") is not None:
            scored.append(p)
        # alerta: en trial o contacted sin evaluación
        if st in ("contacted", "trial") and p.get("overall_score") is None:
            follow_ups.append({"id": p["id"], "name": p["name"], "stage": st, "reason": "Sin evaluación"})
    ranking = sorted(scored, key=lambda x: x.get("overall_score", 0), reverse=True)[:20]
    ranking_out = [{
        "id": p["id"], "name": p["name"], "sport_name": p.get("sport_name") or p.get("sport"),
        "position": p.get("position"), "overall_score": p.get("overall_score"),
        "photo_path": p.get("photo_path"), "current_club": p.get("current_club"),
        "stage": p.get("stage"), "outcome": p.get("outcome"),
        "verdict": (p.get("ai_recommendation") or {}).get("verdict"),
    } for p in ranking]
    return {
        "total": len(items),
        "by_stage": by_stage,
        "recruited": recruited,
        "declined": declined,
        "avg_score": round(sum(p["overall_score"] for p in scored) / len(scored)) if scored else 0,
        "club_standard": CLUB_STANDARD,
        "ranking": ranking_out,
        "follow_ups": follow_ups,
    }


# ───────────────────────── FOTOS ─────────────────────────
@router.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...), user=Depends(get_current_user_dep())):
    uid = _uid(user)
    ext = (file.filename or "img.png").split(".")[-1].lower()
    if ext not in MIME_TYPES:
        raise HTTPException(400, "Formato no soportado (usa jpg, png, webp)")
    path = f"{APP_NAME}/scouting/{uid}/{uuid.uuid4().hex}.{ext}"
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Imagen demasiado grande (máx 8MB)")
    try:
        result = _put_object(path, data, MIME_TYPES[ext])
    except Exception as e:
        raise HTTPException(500, f"Error subiendo imagen: {e}")
    await _files.insert_one({
        "id": uuid.uuid4().hex, "coach_id": uid, "storage_path": result["path"],
        "content_type": MIME_TYPES[ext], "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"]}


@router.get("/files/{path:path}")
async def serve_file(path: str, authorization: str = Header(None), auth: str = Query(None)):
    # Auth: acepta header o query param (?auth=token) para <img src>
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(401, "No autorizado")
    from server import get_current_user
    from fastapi.security import HTTPAuthorizationCredentials
    try:
        await get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    except Exception:
        raise HTTPException(401, "Token inválido")
    rec = await _files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "Archivo no encontrado")
    try:
        content, ctype = _get_object(path)
    except Exception as e:
        raise HTTPException(500, f"Error obteniendo archivo: {e}")
    return Response(content=content, media_type=rec.get("content_type", ctype),
                    headers={"Cache-Control": "private, max-age=86400"})


# ───────────────────────── FICHA PDF (estilo NCAA) ─────────────────────────
def _esc(s) -> str:
    if s is None:
        return ""
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


async def _photo_data_uri(photo_path: Optional[str]) -> Optional[str]:
    if not photo_path:
        return None
    try:
        content, ctype = _get_object(photo_path)
        b64 = base64.b64encode(content).decode()
        return f"data:{ctype};base64,{b64}"
    except Exception:
        return None


def _build_profile_html(p: dict, photo_uri: Optional[str]) -> str:
    ev = p.get("evaluation") or {}
    ai = p.get("ai_recommendation") or {}
    cat_avgs = ev.get("category_averages") or {}
    blocks = _criteria_for(p.get("sport"))
    cat_label = {b["key"]: b["label"] for b in blocks}

    bars = ""
    for ckey, avg in cat_avgs.items():
        pct = max(0, min(100, avg))
        color = "#10b981" if pct >= CLUB_STANDARD else "#f59e0b" if pct >= CLUB_STANDARD - 15 else "#ef4444"
        bars += f"""<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:#0f172a;margin-bottom:3px;">
            <span>{_esc(cat_label.get(ckey, ckey))}</span><span style="color:{color}">{pct}</span></div>
          <div style="height:8px;background:#e2e8f0;border-radius:99px;overflow:hidden;">
            <div style="width:{pct}%;height:100%;background:{color};"></div></div></div>"""

    stats = "".join(
        f"""<div style="background:#0b1220;border:1px solid #1e293b;border-radius:10px;padding:8px 10px;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{_esc(k)}</div>
            <div style="font-size:16px;font-weight:800;color:#CCFF00;">{_esc(v)}</div></div>"""
        for k, v in (p.get("key_stats") or {}).items()
    )
    achievements = "".join(f"<li style='margin-bottom:4px;'>{_esc(a)}</li>" for a in (p.get("achievements") or []))
    videos = "".join(f"<div style='font-size:11px;color:#0ea5e9;margin-bottom:3px;'>▶ {_esc(v.get('title') or 'Highlight')}: {_esc(v.get('url'))}</div>" for v in (p.get("video_links") or []))

    overall = p.get("overall_score")
    verdict = ai.get("verdict") or "—"
    vcolor = "#10b981" if verdict == "RECRUIT" else "#f59e0b" if verdict == "MONITOR" else "#ef4444" if verdict == "PASS" else "#64748b"

    photo_html = (f"<img src='{photo_uri}' style='width:130px;height:160px;object-fit:cover;border-radius:12px;border:3px solid #CCFF00;'/>"
                  if photo_uri else
                  "<div style='width:130px;height:160px;border-radius:12px;background:#1e293b;display:flex;align-items:center;justify-content:center;color:#475569;font-size:40px;'>👤</div>")

    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>*{{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;}}</style></head>
<body style="width:794px;background:#0f172a;color:#e2e8f0;padding:0;">
  <div style="background:linear-gradient(120deg,#0f172a 0%,#111c33 60%,#0b1220 100%);padding:28px 32px;border-bottom:4px solid #CCFF00;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <div style="font-size:13px;font-weight:800;letter-spacing:2px;color:#CCFF00;">LORD<span style="color:#fff;">TRAINING</span> · SCOUTING REPORT</div>
      <div style="font-size:10px;color:#64748b;">{datetime.now().strftime('%d/%m/%Y')}</div>
    </div>
    <div style="display:flex;gap:22px;align-items:center;">
      {photo_html}
      <div style="flex:1;">
        <div style="font-size:30px;font-weight:900;color:#fff;line-height:1;">{_esc(p.get('name'))}</div>
        <div style="font-size:14px;color:#CCFF00;font-weight:700;margin-top:4px;">{_esc(p.get('position') or '')} · {_esc(p.get('sport_name') or p.get('sport') or '')}</div>
        <div style="font-size:12px;color:#94a3b8;margin-top:8px;">
          {('Edad ' + str(p.get('age'))) if p.get('age') else ''} &nbsp;•&nbsp; {_esc(p.get('current_club') or 'Sin club')} &nbsp;•&nbsp; {_esc(p.get('nationality') or '')}
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:3px;">
          {(str(p.get('height_cm')) + ' cm') if p.get('height_cm') else ''} {('· ' + str(p.get('weight_kg')) + ' kg') if p.get('weight_kg') else ''} {('· ' + _esc(p.get('dominant_side'))) if p.get('dominant_side') else ''}
        </div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Score</div>
        <div style="font-size:46px;font-weight:900;color:#CCFF00;line-height:1;">{overall if overall is not None else '—'}</div>
        <div style="margin-top:6px;display:inline-block;padding:3px 10px;border-radius:99px;background:{vcolor}22;color:{vcolor};font-size:11px;font-weight:800;">{_esc(verdict)}</div>
      </div>
    </div>
  </div>

  <div style="display:flex;gap:20px;padding:24px 32px;">
    <div style="flex:1;">
      <div style="font-size:12px;font-weight:800;color:#CCFF00;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Evaluación por área</div>
      {bars or '<div style="color:#64748b;font-size:11px;">Sin evaluación registrada.</div>'}
      <div style="font-size:11px;color:#64748b;margin-top:8px;">Estándar del club: <b style="color:#e2e8f0;">{CLUB_STANDARD}</b></div>
      {('<div style="margin-top:18px;font-size:12px;font-weight:800;color:#CCFF00;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Stats clave</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' + stats + '</div>') if stats else ''}
    </div>
    <div style="flex:1;">
      <div style="font-size:12px;font-weight:800;color:#CCFF00;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Informe IA</div>
      <div style="font-size:12px;color:#cbd5e1;line-height:1.55;margin-bottom:12px;">{_esc(ai.get('summary') or p.get('bio') or 'Sin informe generado.')}</div>
      {('<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Fortalezas</div><ul style="font-size:11px;color:#86efac;padding-left:16px;margin-bottom:10px;">' + ''.join('<li>' + _esc(s) + '</li>' for s in ai.get('strengths', [])) + '</ul>') if ai.get('strengths') else ''}
      {('<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">A mejorar</div><ul style="font-size:11px;color:#fca5a5;padding-left:16px;">' + ''.join('<li>' + _esc(w) + '</li>' for w in ai.get('weaknesses', [])) + '</ul>') if ai.get('weaknesses') else ''}
    </div>
  </div>

  <div style="padding:0 32px 24px;">
    {('<div style="font-size:12px;font-weight:800;color:#CCFF00;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Logros</div><ul style="font-size:12px;color:#cbd5e1;padding-left:18px;">' + achievements + '</ul>') if achievements else ''}
    {('<div style="margin-top:14px;font-size:12px;font-weight:800;color:#CCFF00;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Video Highlights</div>' + videos) if videos else ''}
  </div>

  <div style="background:#0b1220;padding:16px 32px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
    <span>📧 {_esc(p.get('email') or '—')} &nbsp; 📞 {_esc(p.get('phone') or '—')}</span>
    <span style="color:#CCFF00;font-weight:700;">Identifica el talento. Construye el futuro.</span>
  </div>
</body></html>"""


async def _render_pdf(html: str) -> bytes:
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/pw-browsers")
    from playwright.async_api import async_playwright
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'])
        page = await browser.new_page(viewport={"width": 794, "height": 1123})
        await page.set_content(html, wait_until="networkidle")
        await page.wait_for_timeout(500)
        pdf = await page.pdf(format="A4", print_background=True,
                             margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        await browser.close()
    return pdf


@router.get("/prospects/{pid}/profile-pdf")
async def profile_pdf(pid: str, auth: str = Query(None), authorization: str = Header(None), user=None):
    # Acepta auth por query (?auth=) o header
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    elif auth:
        token = auth
    if not token:
        raise HTTPException(401, "No autorizado")
    from server import get_current_user
    from fastapi.security import HTTPAuthorizationCredentials
    user = await get_current_user(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token))
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    photo_uri = await _photo_data_uri(p.get("photo_path"))
    html = _build_profile_html(p, photo_uri)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"scouting_{(p.get('name') or 'prospecto').replace(' ', '_').lower()}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename=\"{fname}\"'})
