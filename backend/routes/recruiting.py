"""
Recruiting & Talent ID — "Identifica el talento. Construye el futuro."

Módulo de scouting: perfiles de prospectos, evaluación por criterios (por deporte),
pipeline Kanban, recomendación con IA (GPT-5.5 / Claude Sonnet 4.6), ranking,
ficha PDF estilo NCAA, integración con Gestión de Equipos (al reclutar → atleta).
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Query, Response, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import os
import base64
import json
import re
import copy
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
_criteria_custom = _db["recruiting_criteria_custom"]
_stats = _db["prospect_stats"]
_sport_templates = _db["sport_templates"]
_contacts = _db["recruiting_contacts"]
_settings = _db["recruiting_settings"]
_share_events = _db["recruiting_share_events"]
_leads = _db["recruiting_leads"]
_users = _db["users"]


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

# Estándar de rendimiento esperado por NIVEL del deportista (0-100).
# El score del prospecto se compara contra el estándar de SU nivel, no uno global.
LEVEL_STANDARDS = {
    "principiante": 50,
    "amateur": 60,
    "semiprofesional": 70,
    "profesional": 80,
    "elite": 90,
}
# Alias legacy → 5 niveles
_LEVEL_ALIAS = {
    "beginner": "principiante", "intermediate": "semiprofesional",
    "advanced": "profesional", "elite": "elite", "profesional": "profesional",
    "amateur": "amateur", "semiprofesional": "semiprofesional", "principiante": "principiante",
}


def _norm_level(level):
    if not level:
        return "amateur"
    return _LEVEL_ALIAS.get(str(level).strip().lower(), "amateur")


def _level_standard(level):
    return LEVEL_STANDARDS.get(_norm_level(level), CLUB_STANDARD)


# ───────────────────────── MODELOS ─────────────────────────
class VideoLink(BaseModel):
    title: Optional[str] = "Highlight"
    url: str
    category: Optional[str] = "highlights"   # technical|physical|match|tactical|highlights|interview
    type: Optional[str] = "match"            # compat
    recorded_at: Optional[str] = None
    notes: Optional[str] = None
    is_public: Optional[bool] = True


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
    level: Optional[str] = "amateur"   # principiante|amateur|semiprofesional|profesional|elite
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
    # Valor comercial y patrocinios
    market_value: Optional[float] = None
    market_currency: Optional[str] = "USD"
    market_value_public: Optional[bool] = False
    sponsorships: List[Dict[str, Any]] = Field(default_factory=list)   # [{name, amount?, currency?, is_public?}]
    # Trayectoria / transferencias (escuela → club/equipo/institución/federación/universidad)
    transfers: List[Dict[str, Any]] = Field(default_factory=list)      # [{from_entity, to_entity, type, date, fee?, notes?, is_public?}]
    # Contrato (para alertas de vencimiento)
    contract_end: Optional[str] = None
    # Origen geográfico (mapa de procedencia)
    origin_city: Optional[str] = None
    origin_country: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
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
    share_stats: Optional[Dict[str, int]] = None
    shared_at: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None


def _clean(doc):
    doc.pop("_id", None)
    return doc


# ───────────────────────── CRUD ─────────────────────────
@router.get("/criteria")
async def get_criteria(sport: Optional[str] = None, level: Optional[str] = None, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    blocks = copy.deepcopy(_criteria_for(sport))
    block_by_key = {b["key"]: b for b in blocks}
    # Merge custom criteria del entrenador (global + del deporte)
    q = {"coach_id": uid, "$or": [{"scope": "global"}]}
    if sport:
        q["$or"].append({"scope": "sport", "sport": str(sport).strip().lower()})
    customs = await _criteria_custom.find(q, {"_id": 0}).to_list(500)
    for c in customs:
        blk = block_by_key.get(c.get("block"))
        if blk:
            blk["criteria"].append({"key": c["key"], "label": c["label"], "custom": True, "scope": c["scope"], "id": c["id"]})
    return {"sport": sport, "club_standard": CLUB_STANDARD,
            "level": _norm_level(level), "level_standard": _level_standard(level),
            "level_standards": LEVEL_STANDARDS, "blocks": blocks}


class CustomCriterionIn(BaseModel):
    scope: str          # 'sport' | 'global'
    block: str          # technical | physical | tactical | mental
    label: str = Field(..., min_length=1, max_length=120)
    sport: Optional[str] = None


@router.post("/criteria/custom")
async def add_custom_criterion(payload: CustomCriterionIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    if payload.scope not in ("sport", "global"):
        raise HTTPException(400, "scope inválido")
    if payload.scope == "sport" and not payload.sport:
        raise HTTPException(400, "Falta el deporte para alcance 'sport'")
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": uid,
        "scope": payload.scope,
        "block": payload.block,
        "label": payload.label.strip(),
        "key": "cst_" + uuid.uuid4().hex[:10],
        "sport": str(payload.sport).strip().lower() if payload.sport else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _criteria_custom.insert_one(dict(doc))
    doc.pop("_id", None)
    return {"key": doc["key"], "label": doc["label"], "block": doc["block"], "scope": doc["scope"], "id": doc["id"], "custom": True}


@router.delete("/criteria/custom/{cid}")
async def delete_custom_criterion(cid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _criteria_custom.delete_one({"id": cid, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Criterio no encontrado")
    return {"ok": True}


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
    # custom_labels: { categoryKey: { criterionKey: label } } — criterios propios de este prospecto
    custom_labels: Dict[str, Dict[str, str]] = Field(default_factory=dict)


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
    level = _norm_level(p.get("level"))
    level_std = _level_standard(level)
    evaluation = {
        "scores": payload.scores,
        "category_averages": cat_avgs,
        "overall": overall,
        "club_standard": CLUB_STANDARD,
        "level": level,
        "level_standard": level_std,
        "meets_level_standard": overall >= level_std,
        "evaluator": payload.evaluator,
        "notes": payload.notes,
        "custom_labels": payload.custom_labels,
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
    # incluir labels de criterios personalizados de este prospecto
    for cat, labels in (ev.get("custom_labels") or {}).items():
        for k, lbl in labels.items():
            label_map[k] = lbl

    scores_txt = ""
    for cat, crits in (ev.get("scores") or {}).items():
        scores_txt += f"\n  {cat}: " + ", ".join(f"{label_map.get(k, k)}={v}" for k, v in crits.items())

    # Estadísticas deportivas reales (agregados de temporada)
    stat_records = await _stats.find({"prospect_id": pid, "coach_id": uid}, {"_id": 0}).sort("date", -1).to_list(1000)
    stat_template = await _stat_template(uid, p.get("sport"))
    agg = _aggregate_stats(stat_records, stat_template) if stat_records else None
    stats_txt = ""
    if agg and agg["count"]:
        stat_labels = {mt["key"]: mt["label"] for cat in stat_template.get("categories", []) for mt in cat["metrics"]}
        stats_txt = f"{agg['count']} partidos/competencias registrados.\n  Promedios: " + ", ".join(f"{stat_labels.get(k, k)}={v}" for k, v in agg["averages"].items())
        stats_txt += "\n  Totales: " + ", ".join(f"{stat_labels.get(k, k)}={v}" for k, v in agg["totals"].items())

    profile = {
        "nombre": p.get("name"), "deporte": p.get("sport_name") or p.get("sport"),
        "posicion": p.get("position"), "edad": p.get("age"),
        "club_actual": p.get("current_club"), "altura_cm": p.get("height_cm"),
        "peso_kg": p.get("weight_kg"), "lado_dominante": p.get("dominant_side"),
        "logros": p.get("achievements"), "stats": p.get("key_stats"),
        "valor_comercial": p.get("market_value"), "patrocinios": p.get("sponsorships"),
        "trayectoria": p.get("transfers"),
        "score_general": ev.get("overall"),
        "nivel": _norm_level(p.get("level")),
        "estandar_del_nivel": _level_standard(p.get("level")),
    }
    _lvl = _norm_level(p.get("level"))
    _lstd = _level_standard(p.get("level"))

    system = (
        "Eres un Director de Scouting de élite con 20 años de experiencia detectando talento deportivo. "
        "Analizas prospectos de forma objetiva, profesional y accionable, usando las estadísticas REALES "
        "proporcionadas como evidencia concreta. Si hay estadísticas de partidos, basa tu análisis en ellas "
        "y NO menciones que faltan datos verificables. "
        "Respondes SIEMPRE en español y SOLO en JSON válido, sin texto adicional."
    )
    prompt = f"""Analiza el siguiente prospecto de {profile['deporte']} y genera un informe de scouting basado en evidencia.

PERFIL: {json.dumps(profile, ensure_ascii=False)}
PUNTAJES POR CRITERIO (0-100): {scores_txt or 'sin evaluación detallada'}
ESTADÍSTICAS DEPORTIVAS REALES: {stats_txt or 'sin estadísticas registradas aún'}

Usa las estadísticas reales como evidencia principal cuando existan. El prospecto es de nivel "{_lvl}"; compara su score contra el estándar esperado para ESE nivel ({_lstd}), no contra un estándar global.
Devuelve EXACTAMENTE este JSON:
{{
  "verdict": "RECRUIT | MONITOR | PASS",
  "confidence": <0-100>,
  "projected_ceiling": "breve descripción del techo de rendimiento",
  "summary": "2-3 frases de resumen ejecutivo citando datos reales si los hay",
  "strengths": ["fortaleza 1", "fortaleza 2", "fortaleza 3"],
  "weaknesses": ["área de mejora 1", "área de mejora 2"],
  "development_plan": ["recomendación de desarrollo 1", "recomendación 2", "recomendación 3"],
  "comparison_vs_standard": "cómo se compara vs el estándar de su nivel {_lvl} ({_lstd})",
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
            "level": ev.get("level") or _norm_level(p.get("level")),
            "level_standard": ev.get("level_standard") or _level_standard(p.get("level")),
        } if ev else None,
        "ai": {
            "verdict": ai.get("verdict"),
            "summary": ai.get("summary"),
            "strengths": ai.get("strengths"),
            "weaknesses": ai.get("weaknesses"),
            "projected_ceiling": ai.get("projected_ceiling"),
        } if ai else None,
        "achievements": p.get("achievements") or [],
        "video_links": [v for v in (p.get("video_links") or []) if v.get("is_public", True)],
        "key_stats": p.get("key_stats") or {},
        "bio": p.get("bio"),
        "tags": p.get("tags") or [],
        "market_value": p.get("market_value") if p.get("market_value_public") else None,
        "market_currency": p.get("market_currency") or "USD",
        "sponsorships": [s for s in (p.get("sponsorships") or []) if s.get("is_public", True)],
        "transfers": [t for t in (p.get("transfers") or []) if t.get("is_public", True)],
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
async def public_pdf(share_id: str, origin: str = Query(None), theme: str = Query("dark")):
    p = await _get_shared(share_id)
    photo = await _photo_bytes(p.get("photo_path"))
    season = await _season_summary_for(p["id"], p["coach_id"], p.get("sport"))
    public_url = f"{origin.rstrip('/')}/scouting/p/{share_id}" if origin else None
    try:
        pdf = _build_scout_pdf(p, photo, public_url=public_url, season=season, public_only=True, theme=theme)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"scouting_{(p.get('name') or 'prospecto').replace(' ', '_').lower()}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename=\"{fname}\"'})


# ───────────────────────── MÉTRICAS DE COMPARTIR (contadores + ranking) ─────────────────────────
class TrackIn(BaseModel):
    action: str  # download | share

_TRACK_KEYS = {"download": "downloads", "share": "shares", "view": "views"}


async def _bump_stat(match: dict, action: str):
    key = _TRACK_KEYS.get(action)
    if not key:
        return None
    res = await _prospects.update_one(match, {"$inc": {f"share_stats.{key}": 1}})
    if not res.matched_count:
        return None
    doc = await _prospects.find_one({**match, }, {"_id": 0, "share_stats": 1})
    return (doc or {}).get("share_stats", {})


@router.post("/prospects/{pid}/track")
async def track_prospect_share(pid: str, body: TrackIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    if body.action not in ("download", "share"):
        raise HTTPException(400, "Acción inválida")
    stats = await _bump_stat({"id": pid, "coach_id": uid}, body.action)
    if stats is None:
        raise HTTPException(404, "Prospecto no encontrado")
    await _log_share_event(pid, uid, body.action)
    return {"share_stats": stats}


async def _log_share_event(prospect_id: str, coach_id: str, action: str):
    now = datetime.now(timezone.utc)
    try:
        await _share_events.insert_one({
            "prospect_id": prospect_id, "coach_id": coach_id, "action": action,
            "ts": now.isoformat(), "tsx": now.timestamp(),
        })
    except Exception:
        pass


async def _trend_map(coach_id: str):
    """Devuelve {prospect_id: {recent7, prev7, trending}} basado en compartidos/descargas."""
    now = datetime.now(timezone.utc).timestamp()
    cut7, cut14 = now - 7 * 86400, now - 14 * 86400
    events = await _share_events.find(
        {"coach_id": coach_id, "action": {"$in": ["share", "download"]}, "tsx": {"$gte": cut14}},
        {"_id": 0, "prospect_id": 1, "tsx": 1},
    ).to_list(50000)
    recent, prev = {}, {}
    for e in events:
        pid = e.get("prospect_id")
        if e.get("tsx", 0) >= cut7:
            recent[pid] = recent.get(pid, 0) + 1
        else:
            prev[pid] = prev.get(pid, 0) + 1
    out = {}
    for pid in set(list(recent) + list(prev)):
        r, pv = recent.get(pid, 0), prev.get(pid, 0)
        out[pid] = {"recent7": r, "prev7": pv, "trending": r >= 2 and r >= pv}
    return out


@router.get("/share-ranking")
async def share_ranking(limit: int = Query(5, ge=1, le=20), user=Depends(get_current_user_dep())):
    uid = _uid(user)
    items = await _prospects.find(
        {"coach_id": uid, "share_stats": {"$exists": True}},
        {"_id": 0, "id": 1, "name": 1, "photo_path": 1, "position": 1,
         "sport_name": 1, "sport": 1, "overall_score": 1, "share_id": 1,
         "share_enabled": 1, "share_stats": 1},
    ).to_list(2000)
    trends = await _trend_map(uid)
    rows = []
    for p in items:
        st = p.get("share_stats") or {}
        d, s, v = int(st.get("downloads", 0)), int(st.get("shares", 0)), int(st.get("views", 0))
        total = d + s
        if total <= 0 and v <= 0:
            continue
        tr = trends.get(p["id"], {})
        rows.append({
            "id": p["id"], "name": p.get("name"), "position": p.get("position"),
            "sport_name": p.get("sport_name") or p.get("sport"),
            "overall_score": p.get("overall_score"),
            "has_photo": bool(p.get("photo_path")),
            "share_id": p.get("share_id") if p.get("share_enabled") else None,
            "downloads": d, "shares": s, "views": v, "total": total,
            "recent7": tr.get("recent7", 0), "trending": bool(tr.get("trending")),
        })
    rows.sort(key=lambda r: (-(r["total"]), -r["views"]))
    return {"items": rows[:limit], "count": len(rows)}


async def _public_branding(coach_id: str):
    settings = await _get_settings(coach_id)
    return {
        "entity_name": settings.get("entity_name", ""),
        "slogan": settings.get("slogan", ""),
        "accent_color": settings.get("accent_color", "#D4AF37"),
    }, settings.get("logo_path")


@router.get("/public/{share_id}/card")
async def public_card(share_id: str, format: str = Query("post")):
    p = await _get_shared(share_id)
    branding, logo_path = await _public_branding(p["coach_id"])
    logo = await _photo_bytes(logo_path) if logo_path else None
    fmt = "story" if format == "story" else "post"
    try:
        img = _build_social_card(p, photo=await _photo_bytes(p.get("photo_path")),
                                 fmt=fmt, branding=branding, logo=logo)
    except Exception as e:
        raise HTTPException(500, f"Error generando tarjeta: {e}")
    return Response(content=img, media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})


def _uid_from_token(authorization, auth):
    tok = None
    if authorization and authorization.startswith("Bearer "):
        tok = authorization.split(" ", 1)[1]
    elif auth:
        tok = auth
    if not tok:
        raise HTTPException(401, "No autorizado")
    import jwt as _jwt
    from core.auth import JWT_SECRET, JWT_ALGORITHM
    try:
        payload = _jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type", "access") == "refresh":
            raise HTTPException(401, "Token inválido")
        return payload["user_id"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Token inválido")


@router.get("/qr")
async def qr_code(data: str = Query(..., max_length=1500), color: str = Query("#0A0F1E"),
                  authorization: str = Header(None), auth: str = Query(None)):
    _uid_from_token(authorization, auth)
    try:
        import qrcode
        from qrcode.constants import ERROR_CORRECT_H
        import io as _io
        qr = qrcode.QRCode(error_correction=ERROR_CORRECT_H, box_size=14, border=3)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color=_valid_hex(color, "#0A0F1E"),
                            back_color="white").convert("RGB")
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
    except Exception as e:
        raise HTTPException(500, f"Error generando QR: {e}")
    return Response(content=buf.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "public, max-age=3600"})


def _abs_url(request: Request, path: str, base_override: str = None) -> str:
    # Host propio de la petición (a través del ingress)
    xf_host = request.headers.get("x-forwarded-host")
    xf_proto = request.headers.get("x-forwarded-proto")
    if xf_host:
        proto = (xf_proto or "https").split(",")[0].strip()
        req_host = xf_host.split(",")[0].strip()
        self_base = f"{proto}://{req_host}"
    else:
        self_base = str(request.base_url).rstrip("/")
        if self_base.startswith("http://") and "localhost" not in self_base and "127.0.0.1" not in self_base:
            self_base = "https://" + self_base[len("http://"):]
        req_host = self_base.split("://", 1)[-1]
    # Solo se honra base_override si su host coincide con el de la petición (anti-abuso og:image)
    if base_override:
        try:
            from urllib.parse import urlparse
            ov_host = urlparse(base_override).netloc
            if ov_host and ov_host == req_host:
                return base_override.rstrip("/") + path
        except Exception:
            pass
    return self_base + path


_BOT_UA = ("facebookexternalhit", "facebot", "twitterbot", "whatsapp", "telegrambot",
           "linkedinbot", "slackbot", "discordbot", "pinterest", "googlebot", "bingbot",
           "embedly", "vkshare", "redditbot", "bot", "crawler", "spider", "preview")


@router.get("/public/{share_id}/card-page", response_class=HTMLResponse)
async def public_card_page(share_id: str, request: Request,
                           format: str = Query("post"), fo: str = Query(None),
                           b: str = Query(None)):
    p = await _get_shared(share_id)
    fmt = "story" if format == "story" else "post"
    ua = (request.headers.get("user-agent") or "").lower()
    is_bot = any(x in ua for x in _BOT_UA)
    if not is_bot:
        await _prospects.update_one({"share_id": share_id}, {"$inc": {"share_stats.views": 1}})
        await _log_share_event(p["id"], p["coach_id"], "view")
    img_url = _abs_url(request, f"/api/recruiting/public/{share_id}/card?format={fmt}", b)
    page_url = _abs_url(request, f"/api/recruiting/public/{share_id}/card-page?format={fmt}", b)
    profile_url = f"{fo.rstrip('/')}/scouting/p/{share_id}" if fo else None
    name = (p.get("name") or "Prospecto")
    meta = " · ".join([x for x in [p.get("position"), p.get("sport_name") or p.get("sport"),
                                   p.get("current_club")] if x])
    score = p.get("overall_score")
    desc = f"Scouting Report — {meta}" if meta else "Scouting Report — LordTraining"
    if score is not None:
        desc = f"Score {score} · " + desc
    og_w, og_h = ("1080", "1350") if fmt == "post" else ("1080", "1920")
    cta = (f'<a class="btn" href="{profile_url}" target="_blank" rel="noreferrer">Ver ficha completa</a>'
           if profile_url else "")
    import html as _html
    e_name, e_desc = _html.escape(name), _html.escape(desc)
    html_doc = f"""<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{e_name} · Scouting Report — LordTraining</title>
<meta name="description" content="{e_desc}"/>
<meta property="og:type" content="article"/>
<meta property="og:site_name" content="LordTraining"/>
<meta property="og:title" content="{e_name} · Scouting Report"/>
<meta property="og:description" content="{e_desc}"/>
<meta property="og:image" content="{img_url}"/>
<meta property="og:image:width" content="{og_w}"/>
<meta property="og:image:height" content="{og_h}"/>
<meta property="og:url" content="{page_url}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{e_name} · Scouting Report"/>
<meta name="twitter:description" content="{e_desc}"/>
<meta name="twitter:image" content="{img_url}"/>
<style>
  :root{{color-scheme:dark}}
  *{{box-sizing:border-box}}
  body{{margin:0;background:#0A0F1E;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 16px}}
  .brand{{font-weight:800;letter-spacing:.06em;font-size:14px;margin-bottom:18px}}
  .brand span{{color:#D4AF37}}
  img.card{{max-width:min(440px,92vw);width:100%;height:auto;border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.6);display:block}}
  .btn{{display:inline-block;margin-top:22px;background:#D4AF37;color:#0A0F1E;font-weight:700;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px}}
  .foot{{margin-top:16px;color:#64748b;font-size:12px}}
</style></head>
<body>
  <div class="brand">LORD<span>TRAINING</span> · SCOUTING</div>
  <img class="card" src="{img_url}" alt="{e_name} — Scouting Report"/>
  {cta}
  <div class="foot">lordtraining.com</div>
</body></html>"""
    return HTMLResponse(content=html_doc, headers={"Cache-Control": "public, max-age=600"})


# ───────────────────────── ESTADÍSTICAS MULTI-DEPORTE ─────────────────────────
def _m(key, label, type="number", formula=None):
    d = {"key": key, "label": label, "type": type}
    if formula:
        d["formula"] = formula
    return d

def _scat(key, label, metrics):
    return {"key": key, "label": label, "metrics": metrics}

# pct: porcentaje auto = sum(num)/sum(den)*100
def _pct(key, label, num, den):
    return _m(key, label, "percent", {"num": num, "den": den})

STAT_TEMPLATES = {
    "volleyball": {"primary": "attack_eff", "categories": [
        _scat("attack", "Ataque", [_m("attack_total", "Totales"), _m("attack_kills", "Efectivos"), _m("attack_errors", "Errores"), _pct("attack_eff", "Eficiencia %", ["attack_kills"], ["attack_total"])]),
        _scat("serve", "Saque", [_m("serve_total", "Totales"), _m("serve_aces", "Aces"), _m("serve_errors", "Errores"), _pct("serve_eff", "Eficiencia %", ["serve_aces"], ["serve_total"])]),
        _scat("reception", "Recepción", [_m("rec_perfect", "Perfectas"), _m("rec_positive", "Positivas"), _m("rec_errors", "Errores"), _pct("rec_eff", "Eficiencia %", ["rec_perfect", "rec_positive"], ["rec_perfect", "rec_positive", "rec_errors"])]),
        _scat("block", "Bloqueo", [_m("block_total", "Totales"), _m("block_kills", "Efectivos"), _m("block_errors", "Errores")]),
        _scat("defense", "Defensa", [_m("dig_total", "Digs totales"), _m("dig_success", "Exitosos"), _m("dig_errors", "Errores")]),
    ]},
    "football": {"primary": "goals", "categories": [
        _scat("offense", "Ofensivo", [_m("goals", "Goles"), _m("assists", "Asistencias"), _m("shots", "Disparos"), _m("shots_on_target", "Disparos al arco"), _pct("shot_acc", "Precisión %", ["shots_on_target"], ["shots"])]),
        _scat("passing", "Pases", [_m("pass_total", "Totales"), _m("pass_completed", "Completados"), _pct("pass_acc", "Precisión %", ["pass_completed"], ["pass_total"])]),
        _scat("defense", "Defensivo", [_m("recoveries", "Recuperaciones"), _m("interceptions", "Intercepciones"), _m("duels_won", "Duelos ganados")]),
        _scat("gk", "Portero (opcional)", [_m("saves", "Atajadas"), _m("goals_conceded", "Goles recibidos"), _pct("save_eff", "Efectividad %", ["saves"], ["saves", "goals_conceded"])]),
    ]},
    "basketball": {"primary": "points", "categories": [
        _scat("offense", "Ofensivo", [_m("points", "Puntos"), _m("fg_made", "Tiros campo anotados"), _m("fg_att", "Tiros campo intentados"), _pct("fg_pct", "Tiros de campo %", ["fg_made"], ["fg_att"]), _m("tp_made", "Triples anotados"), _m("tp_att", "Triples intentados"), _pct("tp_pct", "Triples %", ["tp_made"], ["tp_att"]), _m("ft_made", "Libres anotados"), _m("ft_att", "Libres intentados"), _pct("ft_pct", "Tiros libres %", ["ft_made"], ["ft_att"])]),
        _scat("rebounds", "Rebotes", [_m("reb_off", "Ofensivos"), _m("reb_def", "Defensivos"), _m("reb_total", "Totales")]),
        _scat("other", "Otros", [_m("assists", "Asistencias"), _m("steals", "Robos"), _m("blocks", "Bloqueos"), _m("turnovers", "Pérdidas")]),
    ]},
    "swimming": {"primary": "improvement", "categories": [
        _scat("event", "Prueba", [_m("event", "Prueba (50m/100m...)", "text"), _m("style", "Estilo", "text"), _m("time_sec", "Tiempo (seg)"), _m("prev_best", "Marca anterior (seg)"), _m("improvement", "Mejora (seg)", "diff", {"a": "prev_best", "b": "time_sec"})]),
    ]},
    "tennis": {"primary": "winners", "categories": [
        _scat("match", "Partido", [_m("sets_won", "Sets ganados"), _m("sets_lost", "Sets perdidos"), _m("first_serve_pct", "% primer saque"), _m("aces", "Aces"), _m("winners", "Winners"), _m("unforced_errors", "Errores no forzados"), _m("breaks", "Quiebres")]),
    ]},
    "cycling": {"primary": "avg_watts", "categories": [
        _scat("ride", "Recorrido", [_m("time_min", "Tiempo (min)"), _m("distance_km", "Distancia (km)"), _m("avg_watts", "Vatios promedio"), _m("vam", "VAM (m/h)")]),
    ]},
}
_ATHLETICS = {"primary": "mark", "categories": [
    _scat("event", "Prueba", [_m("event", "Prueba (100m/salto...)", "text"), _m("mark", "Marca"), _m("personal_best", "Mejor marca personal"), _m("conditions", "Condiciones", "text")]),
]}
for _s in ("sprints", "athletics_jumps", "athletics_throws", "marathon", "triathlon"):
    STAT_TEMPLATES[_s] = _ATHLETICS

_GENERIC_STATS = {"primary": "rating", "categories": [
    _scat("performance", "Rendimiento", [_m("minutes", "Minutos jugados"), _m("rating", "Valoración (0-10)")]),
    _scat("offense", "Ofensivo", [_m("points_actions", "Acciones ofensivas"), _m("key_actions", "Acciones clave")]),
    _scat("defense", "Defensivo", [_m("def_actions", "Acciones defensivas"), _m("errors", "Errores")]),
]}


async def _stat_template(coach_id, sport):
    base = copy.deepcopy(STAT_TEMPLATES.get((sport or "").lower(), _GENERIC_STATS))
    custom = await _sport_templates.find_one({"coach_id": coach_id, "sport": (sport or "").lower()}, {"_id": 0})
    if custom and custom.get("categories"):
        # añade categorías personalizadas (o reemplaza si el deporte es 'custom')
        base = {"primary": custom.get("primary") or base.get("primary"), "categories": (base["categories"] if not custom.get("replace") else []) + custom["categories"], "custom": True}
    base["sport"] = sport
    return base


@router.get("/sport-stats-template")
async def get_stat_template(sport: Optional[str] = None, user=Depends(get_current_user_dep())):
    return await _stat_template(_uid(user), sport)


class SportTemplateIn(BaseModel):
    sport: str
    categories: List[Dict[str, Any]]
    primary: Optional[str] = None
    replace: bool = False


@router.post("/sport-stats-template")
async def save_stat_template(payload: SportTemplateIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = {"coach_id": uid, "sport": payload.sport.lower(), "categories": payload.categories,
           "primary": payload.primary, "replace": payload.replace,
           "updated_at": datetime.now(timezone.utc).isoformat()}
    await _sport_templates.update_one({"coach_id": uid, "sport": payload.sport.lower()}, {"$set": doc}, upsert=True)
    return await _stat_template(uid, payload.sport)


class StatRecordIn(BaseModel):
    date: Optional[str] = None
    opponent: Optional[str] = None
    competition: Optional[str] = None
    result: Optional[str] = None
    metrics: Dict[str, Any] = Field(default_factory=dict)


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _aggregate_stats(records, template):
    numeric_keys = {}
    for r in records:
        for k, v in (r.get("metrics") or {}).items():
            n = _num(v)
            if n is not None:
                numeric_keys.setdefault(k, []).append(n)
    averages = {k: round(sum(v) / len(v), 1) for k, v in numeric_keys.items()}
    totals = {k: round(sum(v), 1) for k, v in numeric_keys.items()}
    primary = template.get("primary")
    best = None
    if primary and primary in numeric_keys:
        best = max(records, key=lambda r: _num((r.get("metrics") or {}).get(primary)) or -1e9)
    series = sorted(
        [{"date": r.get("date"), "label": r.get("opponent") or r.get("competition") or "", **{k: _num(v) for k, v in (r.get("metrics") or {}).items() if _num(v) is not None}} for r in records],
        key=lambda x: x.get("date") or ""
    )
    return {"count": len(records), "averages": averages, "totals": totals, "primary": primary,
            "best": best, "series": series}


@router.post("/prospects/{pid}/stats")
async def add_stat_record(pid: str, payload: StatRecordIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    rec = {"id": uuid.uuid4().hex, "prospect_id": pid, "coach_id": uid, "sport": p.get("sport"),
           "date": payload.date or datetime.now(timezone.utc).date().isoformat(),
           "opponent": payload.opponent, "competition": payload.competition, "result": payload.result,
           "metrics": payload.metrics, "created_at": datetime.now(timezone.utc).isoformat()}
    await _stats.insert_one(dict(rec))
    rec.pop("_id", None)
    return rec


@router.get("/prospects/{pid}/stats")
async def list_stat_records(pid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    records = await _stats.find({"prospect_id": pid, "coach_id": uid}, {"_id": 0}).sort("date", -1).to_list(1000)
    template = await _stat_template(uid, p.get("sport"))
    return {"records": records, "aggregates": _aggregate_stats(records, template), "template": template}


@router.put("/prospects/{pid}/stats/{rid}")
async def update_stat_record(pid: str, rid: str, payload: StatRecordIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    upd = {"date": payload.date, "opponent": payload.opponent, "competition": payload.competition,
           "result": payload.result, "metrics": payload.metrics}
    res = await _stats.update_one({"id": rid, "prospect_id": pid, "coach_id": uid}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Registro no encontrado")
    return {"ok": True}


@router.delete("/prospects/{pid}/stats/{rid}")
async def delete_stat_record(pid: str, rid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _stats.delete_one({"id": rid, "prospect_id": pid, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Registro no encontrado")
    return {"ok": True}


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


# ───────────────────────── CONFIGURACIÓN DE ALERTAS ─────────────────────────
DEFAULT_SETTINGS = {"eval_days": 14, "expiry_days": 30,
                    "entity_name": "", "slogan": "", "logo_path": None,
                    "accent_color": "#D4AF37",
                    "showcase_enabled": False, "showcase_id": None, "showcase_title": "",
                    "showcase_hidden": [], "showcase_pinned": []}


async def _get_settings(uid):
    s = await _settings.find_one({"coach_id": uid}, {"_id": 0})
    return {**DEFAULT_SETTINGS, **(s or {})}


class SettingsIn(BaseModel):
    eval_days: int = Field(default=14, ge=1, le=365)
    expiry_days: int = Field(default=30, ge=1, le=365)
    entity_name: str = ""
    slogan: str = ""
    logo_path: Optional[str] = None
    accent_color: str = "#D4AF37"


def _valid_hex(c, fallback="#D4AF37"):
    c = (c or "").strip()
    if re.fullmatch(r"#[0-9A-Fa-f]{6}", c):
        return c
    return fallback


@router.get("/settings")
async def get_settings(user=Depends(get_current_user_dep())):
    return await _get_settings(_uid(user))


@router.put("/settings")
async def update_settings(payload: SettingsIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = {"coach_id": uid, "eval_days": payload.eval_days, "expiry_days": payload.expiry_days,
           "entity_name": (payload.entity_name or "").strip()[:60],
           "slogan": (payload.slogan or "").strip()[:80],
           "logo_path": payload.logo_path,
           "accent_color": _valid_hex(payload.accent_color),
           "updated_at": datetime.now(timezone.utc).isoformat()}
    await _settings.update_one({"coach_id": uid}, {"$set": doc}, upsert=True)
    return await _get_settings(uid)


@router.post("/upload-logo")
async def upload_logo(file: UploadFile = File(...), user=Depends(get_current_user_dep())):
    uid = _uid(user)
    ext = (file.filename or "logo.png").split(".")[-1].lower()
    if ext not in MIME_TYPES:
        raise HTTPException(400, "Formato no soportado (usa jpg, png, webp)")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Logo demasiado grande (máx 5MB)")
    # Logo: contener dentro de 400x400 preservando aspecto y transparencia.
    try:
        from PIL import Image, ImageOps
        import io as _io
        img = ImageOps.exif_transpose(Image.open(_io.BytesIO(data))).convert("RGBA")
        img.thumbnail((400, 400), Image.LANCZOS)
        canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
        canvas.paste(img, (0, 0), img)
        buf = _io.BytesIO()
        canvas.save(buf, format="PNG")
        data = buf.getvalue()
        ext = "png"
    except Exception:
        pass
    path = f"{APP_NAME}/scouting/{uid}/logo_{uuid.uuid4().hex}.{ext}"
    try:
        result = _put_object(path, data, MIME_TYPES[ext])
    except Exception as e:
        raise HTTPException(500, f"Error subiendo logo: {e}")
    await _files.insert_one({
        "id": uuid.uuid4().hex, "coach_id": uid, "storage_path": result["path"],
        "content_type": MIME_TYPES[ext], "size": result.get("size", len(data)),
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"]}


# ───────────────────────── VITRINA PÚBLICA "CANTERA" (Top Talentos) ─────────────────────────
class ShowcaseSettingsIn(BaseModel):
    enabled: Optional[bool] = None
    title: Optional[str] = None


class ShowcaseProspectIn(BaseModel):
    hidden: Optional[bool] = None
    pinned: Optional[bool] = None


def _showcase_public(s: dict) -> dict:
    return {
        "showcase_enabled": bool(s.get("showcase_enabled")),
        "showcase_id": s.get("showcase_id"),
        "showcase_title": s.get("showcase_title") or "",
        "showcase_hidden": s.get("showcase_hidden") or [],
        "showcase_pinned": s.get("showcase_pinned") or [],
    }


@router.get("/showcase-settings")
async def get_showcase_settings(user=Depends(get_current_user_dep())):
    return _showcase_public(await _get_settings(_uid(user)))


@router.post("/showcase-settings")
async def update_showcase_settings(payload: ShowcaseSettingsIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    s = await _get_settings(uid)
    upd = {}
    if payload.enabled is not None:
        upd["showcase_enabled"] = bool(payload.enabled)
        if payload.enabled and not s.get("showcase_id"):
            upd["showcase_id"] = uuid.uuid4().hex[:12]
    if payload.title is not None:
        upd["showcase_title"] = payload.title.strip()[:80]
    if upd:
        upd["updated_at"] = datetime.now(timezone.utc).isoformat()
        await _settings.update_one({"coach_id": uid}, {"$set": upd}, upsert=True)
    return _showcase_public(await _get_settings(uid))


@router.post("/showcase/prospect/{pid}")
async def update_showcase_prospect(pid: str, payload: ShowcaseProspectIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0, "id": 1})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    s = await _get_settings(uid)
    hidden = set(s.get("showcase_hidden") or [])
    pinned = [x for x in (s.get("showcase_pinned") or []) if x != pid]
    if payload.hidden is not None:
        (hidden.add if payload.hidden else hidden.discard)(pid)
    was_pinned = pid in (s.get("showcase_pinned") or [])
    if payload.pinned is not None:
        if payload.pinned:
            pinned = [pid] + pinned
            hidden.discard(pid)
        was_pinned = bool(payload.pinned)
    elif was_pinned:
        pinned = [pid] + pinned
    await _settings.update_one({"coach_id": uid}, {"$set": {
        "showcase_hidden": list(hidden), "showcase_pinned": pinned,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }}, upsert=True)
    return {"id": pid, "hidden": pid in hidden, "pinned": was_pinned}


def _showcase_athlete(p: dict) -> dict:
    ev = p.get("evaluation") or {}
    ai = p.get("ai_recommendation") or {}
    col, label = _card_level(p.get("overall_score"))
    metrics = _top_metrics(ev, 3)
    return {
        "share_id": p.get("share_id"),
        "name": p.get("name"),
        "position": p.get("position"),
        "sport_name": p.get("sport_name") or p.get("sport"),
        "current_club": p.get("current_club"),
        "age": p.get("age"),
        "nationality": p.get("nationality"),
        "overall_score": p.get("overall_score"),
        "level_label": label,
        "level_color": col,
        "top_metrics": [{"label": l, "value": v} for l, v in metrics],
        "strengths": [str(x) for x in (ai.get("strengths") or [])][:3],
        "achievements": [str(x) for x in (p.get("achievements") or [])][:3],
        "videos": [v for v in (p.get("video_links") or []) if v.get("is_public", True)][:6],
        "has_photo": bool(p.get("photo_path")),
    }


async def _get_showcase(showcase_id: str):
    s = await _settings.find_one({"showcase_id": showcase_id, "showcase_enabled": True}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Vitrina no disponible")
    return s


@router.get("/public/showcase/{showcase_id}")
async def public_showcase(showcase_id: str):
    s = await _get_showcase(showcase_id)
    coach_id = s["coach_id"]
    hidden = set(s.get("showcase_hidden") or [])
    pinned = s.get("showcase_pinned") or []
    pin_idx = {pid: i for i, pid in enumerate(pinned)}
    prospects = await _prospects.find(
        {"coach_id": coach_id, "share_enabled": True}, {"_id": 0}).to_list(2000)
    visible = [p for p in prospects if p["id"] not in hidden]
    visible.sort(key=lambda p: (
        0 if p["id"] in pin_idx else 1,
        pin_idx.get(p["id"], 0),
        -(p.get("overall_score") if p.get("overall_score") is not None else -1),
        (p.get("name") or "").lower(),
    ))
    entity = (s.get("entity_name") or "").strip()
    title = (s.get("showcase_title") or "").strip() or (f"Cantera {entity}" if entity else "Cantera · Top Talentos")
    return {
        "title": title,
        "branding": {
            "entity_name": entity,
            "slogan": (s.get("slogan") or "").strip(),
            "accent_color": _valid_hex(s.get("accent_color"), "#D4AF37"),
            "has_logo": bool(s.get("logo_path")),
        },
        "count": len(visible),
        "athletes": [_showcase_athlete(p) for p in visible],
    }


@router.get("/public/showcase/{showcase_id}/logo")
async def public_showcase_logo(showcase_id: str):
    s = await _get_showcase(showcase_id)
    if not s.get("logo_path"):
        raise HTTPException(404, "Sin logo")
    try:
        content, ctype = _get_object(s["logo_path"])
    except Exception as e:
        raise HTTPException(500, f"Error obteniendo logo: {e}")
    return Response(content=content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


def _build_showcase_cover(s: dict, logo: Optional[bytes]) -> bytes:
    from PIL import Image, ImageDraw, ImageFont
    import io as _io
    W, H = 1200, 630
    obsidian = (10, 15, 30)
    try:
        gold = _hex2rgb(_valid_hex(s.get("accent_color"), "#D4AF37"))
    except Exception:
        gold = (212, 175, 55)

    def font(size, bold=True):
        try:
            return ImageFont.truetype(_FONT_BOLD if bold else _FONT_REG, size)
        except Exception:
            return ImageFont.load_default()

    base = Image.new("RGB", (W, H), obsidian)
    d = ImageDraw.Draw(base)
    # Fondo con degradado radial sutil
    for y in range(H):
        t = y / H
        c = (int(10 + 12 * (1 - t)), int(15 + 20 * (1 - t)), int(30 + 34 * (1 - t)))
        d.line([(0, y), (W, y)], fill=c)
    # Barras de acento
    d.rectangle([0, 0, W, 10], fill=gold)
    d.rectangle([0, H - 10, W, H], fill=gold)

    x = 80
    # Logo
    if logo:
        try:
            lg = Image.open(_io.BytesIO(logo)).convert("RGBA")
            lg.thumbnail((150, 150), Image.LANCZOS)
            base.paste(lg, (80, 70), lg)
            x = 80
        except Exception:
            logo = None

    entity = (s.get("entity_name") or "").strip()
    title = (s.get("showcase_title") or "").strip() or (f"Cantera {entity}" if entity else "Cantera · Top Talentos")

    d.text((80, 250), "TOP TALENTOS", font=font(40, True), fill=gold)
    # Título (recorta si muy largo)
    tf = font(76, True)
    tt_txt = title if d.textlength(title, font=tf) < W - 160 else title[:26] + "…"
    d.text((80, 300), tt_txt, font=tf, fill=(255, 255, 255))
    if entity:
        d.text((80, 400), entity[:40], font=font(34, False), fill=(148, 163, 184))
    slogan = (s.get("slogan") or "").strip()
    if slogan:
        d.text((80, 448), slogan[:56], font=font(28, False), fill=gold)

    # Wordmark inferior
    wf = font(30, True)
    d.text((80, H - 78), "LORD", font=wf, fill=(255, 255, 255))
    wl = d.textlength("LORD", font=wf)
    d.text((80 + wl, H - 78), "TRAINING", font=wf, fill=gold)
    stamp = "lordtraining.com"
    sf = font(26, False)
    d.text((W - 80 - d.textlength(stamp, font=sf), H - 76), stamp, font=sf, fill=(100, 116, 139))

    out = _io.BytesIO()
    base.save(out, format="PNG")
    return out.getvalue()


@router.get("/public/showcase/{showcase_id}/cover")
async def public_showcase_cover(showcase_id: str):
    s = await _get_showcase(showcase_id)
    logo = await _photo_bytes(s.get("logo_path")) if s.get("logo_path") else None
    try:
        img = _build_showcase_cover(s, logo)
    except Exception as e:
        raise HTTPException(500, f"Error generando portada: {e}")
    return Response(content=img, media_type="image/png",
                    headers={"Cache-Control": "public, max-age=1800"})


@router.get("/public/showcase/{showcase_id}/share", response_class=HTMLResponse)
async def public_showcase_share(showcase_id: str, request: Request, b: str = Query(None)):
    s = await _get_showcase(showcase_id)
    entity = (s.get("entity_name") or "").strip()
    title = (s.get("showcase_title") or "").strip() or (f"Cantera {entity}" if entity else "Cantera · Top Talentos")
    cover = _abs_url(request, f"/api/recruiting/public/showcase/{showcase_id}/cover", b)
    page_url = _abs_url(request, f"/api/recruiting/public/showcase/{showcase_id}/share", b)
    view_url = f"/cantera/{showcase_id}"
    desc = (s.get("slogan") or "").strip() or "Descubre el mejor talento de la academia — videos y caracterización completa."
    import html as _html
    e_title, e_desc = _html.escape(title), _html.escape(desc)
    html_doc = f"""<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{e_title} — LordTraining</title>
<meta name="description" content="{e_desc}"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="LordTraining"/>
<meta property="og:title" content="{e_title}"/>
<meta property="og:description" content="{e_desc}"/>
<meta property="og:image" content="{cover}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:url" content="{page_url}"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{e_title}"/>
<meta name="twitter:description" content="{e_desc}"/>
<meta name="twitter:image" content="{cover}"/>
<meta http-equiv="refresh" content="0; url={view_url}"/>
<script>window.location.replace("{view_url}");</script>
</head><body style="background:#0A0F1E;color:#e5e7eb;font-family:sans-serif;text-align:center;padding:40px">
<p>Abriendo la vitrina… <a href="{view_url}" style="color:#D4AF37">Toca aquí si no redirige</a>.</p>
</body></html>"""
    return HTMLResponse(content=html_doc, headers={"Cache-Control": "public, max-age=600"})


# ───────────────────────── LEADS / CONTACTOS DE LA VITRINA ─────────────────────────
class ShowcaseLeadIn(BaseModel):
    from_name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=160)
    organization: Optional[str] = Field(default="", max_length=160)
    message: str = Field(..., min_length=5, max_length=1500)
    prospect_share_id: Optional[str] = None
    company: Optional[str] = None  # honeypot anti-spam


@router.post("/public/showcase/{showcase_id}/contact")
async def public_showcase_contact(showcase_id: str, body: ShowcaseLeadIn):
    s = await _get_showcase(showcase_id)
    if body.company:  # honeypot: bots rellenan este campo oculto
        return {"ok": True}
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", (body.email or "").strip()):
        raise HTTPException(400, "Email inválido")
    coach_id = s["coach_id"]
    prospect_id = prospect_name = None
    if body.prospect_share_id:
        pr = await _prospects.find_one(
            {"share_id": body.prospect_share_id, "coach_id": coach_id, "share_enabled": True},
            {"_id": 0, "id": 1, "name": 1})
        if pr:
            prospect_id, prospect_name = pr["id"], pr.get("name")
    lead = {
        "id": uuid.uuid4().hex, "coach_id": coach_id, "showcase_id": showcase_id,
        "prospect_id": prospect_id, "prospect_name": prospect_name,
        "from_name": body.from_name.strip()[:120], "email": body.email.strip()[:160],
        "organization": (body.organization or "").strip()[:160],
        "message": body.message.strip()[:1500],
        "read": False, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _leads.insert_one(lead)
    # Notificación in-app (campanita) al coach
    try:
        from routes.notifications import create_notification
        await create_notification(
            coach_id, "showcase_lead",
            f"Nuevo contacto: {lead['from_name']}",
            (f"Interés en {prospect_name}. " if prospect_name else "") + lead["message"][:120],
            link="scouting:showcase",
            meta={"lead_id": lead["id"], "prospect_id": prospect_id, "email": lead["email"]},
        )
    except Exception:
        pass
    # Notificación por email al coach (no bloqueante)
    try:
        import asyncio
        coach = await _users.find_one({"id": coach_id}, {"_id": 0, "email": 1, "name": 1})
        if coach and coach.get("email"):
            from services.email_service import send_showcase_lead_notification
            asyncio.create_task(send_showcase_lead_notification(
                coach_email=coach["email"], coach_name=coach.get("name", ""),
                from_name=lead["from_name"], from_email=lead["email"],
                organization=lead["organization"], message=lead["message"],
                prospect_name=prospect_name or "", showcase_title=s.get("showcase_title") or "",
            ))
    except Exception:
        pass
    return {"ok": True}


@router.post("/public/showcase/{showcase_id}/visit")
async def public_showcase_visit(showcase_id: str):
    await _settings.update_one(
        {"showcase_id": showcase_id, "showcase_enabled": True},
        {"$inc": {"showcase_views": 1}})
    return {"ok": True}


@router.post("/showcase/weekly-digest")
async def showcase_weekly_digest(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    s = await _get_settings(uid)
    if not s.get("showcase_enabled"):
        return {"created": False}
    now = datetime.now(timezone.utc)
    last = s.get("last_weekly_summary")
    due = True
    if last:
        try:
            due = (now - datetime.fromisoformat(last)).days >= 7
        except Exception:
            due = True
    if not due:
        return {"created": False}
    views_total = int(s.get("showcase_views", 0) or 0)
    snap = int(s.get("weekly_views_snapshot", 0) or 0)
    views_week = max(0, views_total - snap)
    since = (now - timedelta(days=7)).isoformat()
    leads_week = await _leads.find(
        {"coach_id": uid, "created_at": {"$gte": since}},
        {"_id": 0, "prospect_name": 1}).to_list(1000)
    per = {}
    for l in leads_week:
        n = l.get("prospect_name") or "General"
        per[n] = per.get(n, 0) + 1
    top = max(per.items(), key=lambda x: x[1])[0] if per else None
    has_activity = views_week > 0 or len(leads_week) > 0
    created = False
    if has_activity:
        msg = f"{views_week} visita(s) y {len(leads_week)} contacto(s) nuevo(s) esta semana."
        if top:
            msg += f" Top talento: {top}."
        try:
            from routes.notifications import create_notification
            await create_notification(
                uid, "showcase_weekly", "Resumen semanal de tu vitrina", msg,
                link="scouting:showcase",
                meta={"views_week": views_week, "leads_week": len(leads_week), "top": top})
            created = True
        except Exception:
            pass
    await _settings.update_one({"coach_id": uid}, {"$set": {
        "last_weekly_summary": now.isoformat(), "weekly_views_snapshot": views_total,
    }}, upsert=True)
    return {"created": created}


_LEVEL_ORDER = {"Sin evaluar": -1, "EN DESARROLLO": 0, "BRONCE": 1, "PLATA": 2, "ORO": 3, "DIAMANTE": 4}


def _level_rank(score):
    _, label = _card_level(score)
    return _LEVEL_ORDER.get(label, -1), label


@router.post("/notify-digest")
async def recruiting_notify_digest(user=Depends(get_current_user_dep())):
    """Genera avisos accionables de reclutamiento (promover, subidas de nivel). Máx 1/día."""
    uid = _uid(user)
    s = await _get_settings(uid)
    now = datetime.now(timezone.utc)
    last = s.get("last_recruiting_digest")
    if last:
        try:
            if (now - datetime.fromisoformat(last)).total_seconds() < 86400:
                return {"created": []}
        except Exception:
            pass
    prospects = await _prospects.find(
        {"coach_id": uid},
        {"_id": 0, "id": 1, "name": 1, "overall_score": 1, "converted_athlete_id": 1,
         "stage": 1, "level_snapshot": 1}).to_list(3000)

    promote_ready = [p for p in prospects
                     if (p.get("overall_score") or 0) >= 75
                     and not p.get("converted_athlete_id")
                     and p.get("stage") not in ("decision", "rejected")]

    levelups = []
    for p in prospects:
        if p.get("overall_score") is None:
            continue
        rank, label = _level_rank(p["overall_score"])
        snap = p.get("level_snapshot")
        if snap is None:
            await _prospects.update_one({"id": p["id"]}, {"$set": {"level_snapshot": rank}})
            continue
        if rank != snap:
            await _prospects.update_one({"id": p["id"]}, {"$set": {"level_snapshot": rank}})
            if rank > snap:
                levelups.append((p.get("name") or "Un talento", label))

    from routes.notifications import create_notification
    created = []
    last_promote = int(s.get("last_promote_count", -1))
    if promote_ready and len(promote_ready) != last_promote:
        n = len(promote_ready)
        msg = (f"{n} prospecto(s) con nivel ORO+ listo(s) para promover a atleta."
               if n > 1 else f"{promote_ready[0].get('name','Un prospecto')} está listo para promover a atleta.")
        await create_notification(uid, "recruiting_promote",
                                  "Talento listo para promover 🚀", msg, link="scouting:ranking",
                                  meta={"count": n})
        created.append("promote")
    if levelups:
        if len(levelups) == 1:
            title, msg = "¡Subida de nivel! 📈", f"{levelups[0][0]} subió a {levelups[0][1]} esta semana."
        else:
            title = "¡Subidas de nivel! 📈"
            msg = f"{len(levelups)} talentos subieron de nivel esta semana."
        await create_notification(uid, "recruiting_levelup", title, msg, link="scouting:ranking",
                                  meta={"count": len(levelups)})
        created.append("levelup")

    await _settings.update_one({"coach_id": uid}, {"$set": {
        "last_recruiting_digest": now.isoformat(),
        "last_promote_count": len(promote_ready),
    }}, upsert=True)
    return {"created": created}


@router.get("/showcase/metrics")
async def showcase_metrics(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    s = await _get_settings(uid)
    leads = await _leads.find(
        {"coach_id": uid}, {"_id": 0, "prospect_id": 1, "prospect_name": 1, "read": 1}).to_list(2000)
    per = {}
    for l in leads:
        pid = l.get("prospect_id") or "_general"
        if pid not in per:
            per[pid] = {"prospect_id": None if pid == "_general" else pid,
                        "name": l.get("prospect_name") or "General", "leads": 0}
        per[pid]["leads"] += 1
    per_list = sorted(per.values(), key=lambda x: -x["leads"])
    return {
        "views": int(s.get("showcase_views", 0) or 0),
        "total_leads": len(leads),
        "unread": sum(1 for l in leads if not l.get("read")),
        "per_athlete": per_list,
        "enabled": bool(s.get("showcase_enabled")),
    }


@router.get("/showcase/leads")
async def list_showcase_leads(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    items = await _leads.find({"coach_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(500)
    unread = sum(1 for x in items if not x.get("read"))
    return {"items": items, "count": len(items), "unread": unread}


@router.post("/showcase/leads/{lead_id}/read")
async def mark_lead_read(lead_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _leads.update_one({"id": lead_id, "coach_id": uid}, {"$set": {"read": True}})
    if not res.matched_count:
        raise HTTPException(404, "No encontrado")
    return {"ok": True}


@router.delete("/showcase/leads/{lead_id}")
async def delete_lead(lead_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _leads.delete_one({"id": lead_id, "coach_id": uid})
    if not res.deleted_count:
        raise HTTPException(404, "No encontrado")
    return {"ok": True}




# ───────────────────────── ALERTAS Y SEGUIMIENTO ─────────────────────────
def _parse_date(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        try:
            return datetime.strptime(str(s)[:10], "%Y-%m-%d")
        except Exception:
            return None


@router.get("/alerts")
async def get_alerts(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    cfg = await _get_settings(uid)
    eval_days, expiry_days = cfg["eval_days"], cfg["expiry_days"]
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    items = await _prospects.find({"coach_id": uid}, {"_id": 0}).to_list(3000)
    alerts = []
    for p in items:
        if p.get("outcome") in ("recruited", "declined"):
            continue
        pid, name = p["id"], p.get("name")
        ev = p.get("evaluation") or {}
        last_eval = _parse_date(ev.get("date"))
        created = _parse_date(p.get("created_at"))
        # Sin evaluación
        if not last_eval:
            ref = created or now
            days = (now - ref).days
            if days >= eval_days:
                alerts.append({"type": "no_evaluation", "severity": "warning", "prospect_id": pid,
                               "name": name, "days": days, "stage": p.get("stage"),
                               "message": f"Sin evaluar desde su registro ({days} días)"})
        else:
            days = (now - last_eval).days
            if days >= eval_days:
                alerts.append({"type": "stale_evaluation", "severity": "info", "prospect_id": pid,
                               "name": name, "days": days, "stage": p.get("stage"),
                               "message": f"Última evaluación hace {days} días"})
        # Contrato por vencer
        ce = _parse_date(p.get("contract_end"))
        if ce:
            d = (ce - now).days
            if d < 0:
                alerts.append({"type": "contract_expired", "severity": "danger", "prospect_id": pid,
                               "name": name, "days": d, "date": p.get("contract_end"),
                               "message": f"Contrato vencido hace {abs(d)} días"})
            elif d <= expiry_days:
                alerts.append({"type": "contract_expiring", "severity": "warning", "prospect_id": pid,
                               "name": name, "days": d, "date": p.get("contract_end"),
                               "message": f"Contrato vence en {d} días"})
        # Patrocinios por vencer
        for s in (p.get("sponsorships") or []):
            se = _parse_date(s.get("expires_at"))
            if se:
                d = (se - now).days
                sname = s.get("name") or "Patrocinio"
                if d < 0:
                    alerts.append({"type": "sponsor_expired", "severity": "danger", "prospect_id": pid,
                                   "name": name, "days": d, "sponsor": sname, "date": s.get("expires_at"),
                                   "message": f"Patrocinio «{sname}» vencido hace {abs(d)} días"})
                elif d <= expiry_days:
                    alerts.append({"type": "sponsor_expiring", "severity": "warning", "prospect_id": pid,
                                   "name": name, "days": d, "sponsor": sname, "date": s.get("expires_at"),
                                   "message": f"Patrocinio «{sname}» vence en {d} días"})
    sev_order = {"danger": 0, "warning": 1, "info": 2}
    alerts.sort(key=lambda a: (sev_order.get(a["severity"], 3), a.get("days", 9999)))
    counts = {"danger": 0, "warning": 0, "info": 0}
    for a in alerts:
        counts[a["severity"]] = counts.get(a["severity"], 0) + 1
    return {"alerts": alerts, "counts": counts, "total": len(alerts), "settings": cfg}


# ───────────────────────── RED DE CONTACTOS ─────────────────────────
class ContactIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    role: str = "agent"   # agent | representative | parent | institution | scout | club | other
    organization: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    linked_prospect_ids: List[str] = Field(default_factory=list)


@router.get("/contacts")
async def list_contacts(role: Optional[str] = None, prospect_id: Optional[str] = None,
                        user=Depends(get_current_user_dep())):
    uid = _uid(user)
    q = {"coach_id": uid}
    if role:
        q["role"] = role
    if prospect_id:
        q["linked_prospect_ids"] = prospect_id
    items = await _contacts.find(q, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return items


@router.post("/contacts")
async def create_contact(payload: ContactIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {"id": uuid.uuid4().hex, "coach_id": uid, **payload.model_dump(),
           "created_at": now, "updated_at": now}
    await _contacts.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.put("/contacts/{cid}")
async def update_contact(cid: str, payload: ContactIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    data = {**payload.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}
    res = await _contacts.update_one({"id": cid, "coach_id": uid}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(404, "Contacto no encontrado")
    c = await _contacts.find_one({"id": cid}, {"_id": 0})
    return c


@router.delete("/contacts/{cid}")
async def delete_contact(cid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _contacts.delete_one({"id": cid, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Contacto no encontrado")
    return {"ok": True}


# ───────────────────────── MAPA DE ORIGEN ─────────────────────────
COUNTRY_CENTROIDS = {
    "argentina": [-38.4, -63.6], "bolivia": [-16.3, -63.6], "brasil": [-14.2, -51.9], "brazil": [-14.2, -51.9],
    "chile": [-35.7, -71.5], "colombia": [4.6, -74.3], "costa rica": [9.7, -83.8], "cuba": [21.5, -77.8],
    "ecuador": [-1.8, -78.2], "el salvador": [13.8, -88.9], "españa": [40.5, -3.7], "spain": [40.5, -3.7],
    "estados unidos": [37.1, -95.7], "usa": [37.1, -95.7], "united states": [37.1, -95.7],
    "guatemala": [15.8, -90.2], "honduras": [15.2, -86.2], "méxico": [23.6, -102.5], "mexico": [23.6, -102.5],
    "nicaragua": [12.9, -85.2], "panamá": [8.5, -80.8], "panama": [8.5, -80.8], "paraguay": [-23.4, -58.4],
    "perú": [-9.2, -75.0], "peru": [-9.2, -75.0], "puerto rico": [18.2, -66.6],
    "república dominicana": [18.7, -70.2], "dominican republic": [18.7, -70.2],
    "uruguay": [-32.5, -55.8], "venezuela": [6.4, -66.6], "portugal": [39.4, -8.2],
    "francia": [46.2, 2.2], "france": [46.2, 2.2], "italia": [41.9, 12.6], "italy": [41.9, 12.6],
    "alemania": [51.2, 10.4], "germany": [51.2, 10.4], "inglaterra": [52.4, -1.5], "england": [52.4, -1.5],
    "reino unido": [55.4, -3.4], "uk": [55.4, -3.4], "nigeria": [9.1, 8.7], "senegal": [14.5, -14.5],
    "ghana": [7.9, -1.0], "marruecos": [31.8, -7.1], "morocco": [31.8, -7.1], "japón": [36.2, 138.3],
    "japan": [36.2, 138.3], "china": [35.9, 104.2], "australia": [-25.3, 133.8], "canadá": [56.1, -106.3],
    "canada": [56.1, -106.3],
}


def _coords_for(p):
    if p.get("origin_lat") is not None and p.get("origin_lng") is not None:
        return [p["origin_lat"], p["origin_lng"]]
    key = (p.get("origin_country") or p.get("nationality") or "").strip().lower()
    return COUNTRY_CENTROIDS.get(key)


@router.get("/map")
async def map_origins(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    items = await _prospects.find({"coach_id": uid}, {"_id": 0}).to_list(3000)
    points = []
    unlocated = 0
    for p in items:
        c = _coords_for(p)
        if not c:
            unlocated += 1
            continue
        points.append({
            "id": p["id"], "name": p.get("name"), "lat": c[0], "lng": c[1],
            "city": p.get("origin_city"), "country": p.get("origin_country") or p.get("nationality"),
            "sport_name": p.get("sport_name") or p.get("sport"), "position": p.get("position"),
            "overall_score": p.get("overall_score"), "stage": p.get("stage"),
            "verdict": (p.get("ai_recommendation") or {}).get("verdict"),
            "exact": p.get("origin_lat") is not None,
        })
    return {"points": points, "unlocated": unlocated, "total": len(items)}


# ───────────────────────── FOTOS ─────────────────────────
@router.post("/upload-photo")
async def upload_photo(file: UploadFile = File(...), user=Depends(get_current_user_dep())):
    uid = _uid(user)
    ext = (file.filename or "img.png").split(".")[-1].lower()
    if ext not in MIME_TYPES:
        raise HTTPException(400, "Formato no soportado (usa jpg, png, webp)")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Imagen demasiado grande (máx 8MB)")
    # Optimizar: recorte cuadrado centrado + resize + compresión (miniatura pareja).
    try:
        from PIL import Image, ImageOps
        import io as _io
        img = Image.open(_io.BytesIO(data))
        img = ImageOps.exif_transpose(img)
        img = ImageOps.fit(img.convert("RGB"), (800, 800), Image.LANCZOS, centering=(0.5, 0.4))
        buf = _io.BytesIO()
        img.save(buf, format="JPEG", quality=85, optimize=True)
        data = buf.getvalue()
        ext = "jpg"
    except Exception:
        pass  # si falla la optimización, sube el original
    path = f"{APP_NAME}/scouting/{uid}/{uuid.uuid4().hex}.{ext}"
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
    import jwt as _jwt
    from core.auth import JWT_SECRET, JWT_ALGORITHM
    try:
        payload = _jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type", "access") == "refresh":
            raise HTTPException(401, "Token inválido")
    except HTTPException:
        raise
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


async def _photo_bytes(photo_path: Optional[str]) -> Optional[bytes]:
    if not photo_path:
        return None
    try:
        content, _ = _get_object(photo_path)
        return content
    except Exception:
        return None


# ───────────────────────── TARJETA REDES SOCIALES ─────────────────────────
_FONT_BOLD = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
_FONT_REG = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
_FONT_COND = "/usr/share/fonts/truetype/liberation/LiberationSansNarrow-Bold.ttf"
_HAAR_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "assets",
                          "haarcascade_frontalface_default.xml")
_FACE_CASCADE = None


def _hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _detect_face_box(pil_img):
    """Devuelve (cx, cy) del rostro (unión de rostros) en coords de la imagen, o None."""
    global _FACE_CASCADE
    try:
        import cv2
        import numpy as np
        if _FACE_CASCADE is None:
            _FACE_CASCADE = cv2.CascadeClassifier(_HAAR_PATH)
        if _FACE_CASCADE.empty():
            return None
        sw, sh = pil_img.size
        scale = 1.0
        max_side = 900
        work = pil_img
        if max(sw, sh) > max_side:
            scale = max_side / max(sw, sh)
            work = pil_img.resize((int(sw * scale), int(sh * scale)))
        gray = cv2.cvtColor(np.array(work.convert("RGB")), cv2.COLOR_RGB2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = _FACE_CASCADE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5,
                                               minSize=(40, 40))
        if len(faces) == 0:
            return None
        x0 = min(f[0] for f in faces)
        y0 = min(f[1] for f in faces)
        x1 = max(f[0] + f[2] for f in faces)
        y1 = max(f[1] + f[3] for f in faces)
        cx = (x0 + x1) / 2 / scale
        cy = (y0 + y1) / 2 / scale
        return (cx, cy)
    except Exception:
        return None


def _smart_photo_fit(pil_img, tw, th, face_frac=0.42):
    """Recorta la foto al tamaño destino centrando el rostro (o encuadre superior seguro)."""
    from PIL import Image, ImageOps
    img = ImageOps.exif_transpose(pil_img).convert("RGB")
    sw, sh = img.size
    target_ratio = tw / th
    if sw / sh > target_ratio:
        cw, ch = int(round(sh * target_ratio)), sh
    else:
        cw, ch = sw, int(round(sw / target_ratio))
    face = _detect_face_box(img)
    if face:
        fcx, fcy = face
        center_x = fcx
        # el rostro queda a ~face_frac de la parte superior del recorte
        center_y = fcy + (0.5 - face_frac) * ch
    else:
        center_x = sw / 2
        center_y = ch / 2 + sh * 0.06  # encuadre superior seguro: no corta la cabeza
    left = int(max(0, min(center_x - cw / 2, sw - cw)))
    top = int(max(0, min(center_y - ch / 2, sh - ch)))
    crop = img.crop((left, top, left + cw, top + ch))
    return crop.resize((tw, th), Image.LANCZOS)


def _card_level(score):
    if score is None:
        return ("#64748B", "Sin evaluar")
    for mn, col, label in [(90, "#22D3EE", "DIAMANTE"), (75, "#D4AF37", "ORO"),
                           (60, "#94A3B8", "PLATA"), (40, "#B45309", "BRONCE"),
                           (-1, "#64748B", "EN DESARROLLO")]:
        if score >= mn:
            return (col, label)
    return ("#64748B", "EN DESARROLLO")


def _top_metrics(ev: dict, limit: int = 3):
    """Devuelve las mejores métricas [(label, valor 0-100)] de la evaluación."""
    scores = (ev or {}).get("scores") or {}
    custom = (ev or {}).get("custom_labels") or {}
    flat = []
    for block, crits in scores.items():
        if isinstance(crits, dict):
            for k, v in crits.items():
                try:
                    val = int(round(float(v)))
                except (TypeError, ValueError):
                    continue
                label = custom.get(k) or str(k).replace("_", " ").replace("-", " ").strip().capitalize()
                flat.append((label, max(0, min(100, val))))
    flat.sort(key=lambda x: -x[1])
    return flat[:limit]


def _build_social_card(p: dict, photo: Optional[bytes], fmt: str = "post",
                       branding: Optional[dict] = None, logo: Optional[bytes] = None) -> bytes:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
    import io as _io

    W = 1080
    is_story = fmt != "post"
    H = 1920 if is_story else 1350
    obsidian = (10, 15, 30)
    _b = branding or {}
    try:
        gold = _hex2rgb((_b.get("accent_color") or "#D4AF37"))
    except Exception:
        gold = (212, 175, 55)

    def font(size, bold=True):
        try:
            return ImageFont.truetype(_FONT_BOLD if bold else _FONT_REG, size)
        except Exception:
            return ImageFont.load_default()

    base = Image.new("RGB", (W, H), obsidian)
    draw = ImageDraw.Draw(base)
    photo_h = int(H * (0.52 if is_story else 0.48))

    # Foto (o placeholder) — recorte con detección facial para no cortar la cabeza
    if photo:
        try:
            ph = _smart_photo_fit(Image.open(_io.BytesIO(photo)), W, photo_h)
            base.paste(ph, (0, 0))
        except Exception:
            photo = None
    if not photo:
        for y in range(photo_h):
            t = y / photo_h
            c = (int(15 + 20 * t), int(20 + 25 * t), int(40 + 30 * t))
            draw.line([(0, y), (W, y)], fill=c)
        initial = (p.get("name") or "?")[:1].upper()
        f = font(320, True)
        tw = draw.textlength(initial, font=f)
        draw.text(((W - tw) / 2, photo_h / 2 - 200), initial, font=f, fill=(40, 50, 70))

    # Degradado inferior para legibilidad
    grad = Image.new("L", (1, photo_h), 0)
    for y in range(photo_h):
        t = max(0.0, (y - photo_h * 0.45) / (photo_h * 0.55))
        grad.putpixel((0, y), int(255 * min(1.0, t)))
    alpha = grad.resize((W, photo_h))
    overlay = Image.new("RGB", (W, photo_h), obsidian)
    crop = base.crop((0, 0, W, photo_h))
    base.paste(Image.composite(overlay, crop, alpha), (0, 0))
    draw = ImageDraw.Draw(base)

    # Barra dorada bajo la foto
    draw.rectangle([0, photo_h - 6, W, photo_h], fill=gold)

    # ── Realce premium: brillo radial tras el score + destello diagonal ──
    try:
        from PIL import ImageFilter
        gx, gy = W - 150, 135
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.ellipse([gx - 150, gy - 150, gx + 150, gy + 150], fill=(gold[0], gold[1], gold[2], 130))
        glow = glow.filter(ImageFilter.GaussianBlur(70))
        sd = ImageDraw.Draw(glow)
        sd.polygon([(int(W * 0.22), 0), (int(W * 0.36), 0), (int(W * 0.10), photo_h), (int(-0.05 * W), photo_h)], fill=(255, 255, 255, 16))
        sd.polygon([(int(W * 0.40), 0), (int(W * 0.47), 0), (int(W * 0.20), photo_h), (int(0.11 * W), photo_h)], fill=(gold[0], gold[1], gold[2], 20))
        base = Image.alpha_composite(base.convert("RGBA"), glow).convert("RGB")
        draw = ImageDraw.Draw(base)
        # Barra dorada re-dibujada encima del compuesto
        draw.rectangle([0, photo_h - 6, W, photo_h], fill=gold)
    except Exception:
        pass

    # Wordmark
    fw = font(46, True)
    draw.text((60, 52), "LORD", font=fw, fill=(255, 255, 255))
    wl = draw.textlength("LORD", font=fw)
    draw.text((60 + wl, 52), "TRAINING", font=fw, fill=gold)
    draw.text((62, 108), "SCOUTING REPORT", font=font(24, True), fill=gold)

    # Círculo de score
    ev = p.get("evaluation") or {}
    score = ev.get("overall")
    col_hex, level_label = _card_level(score)
    col = _hex2rgb(col_hex)
    cx, cy, r = W - 150, 135, 88
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(8, 12, 24), outline=col, width=9)
    stxt = str(score) if score is not None else "—"
    f = font(70, True)
    tw = draw.textlength(stxt, font=f)
    draw.text((cx - tw / 2, cy - 58), stxt, font=f, fill=(255, 255, 255))
    fs = font(22, True)
    sw = draw.textlength("SCORE", font=fs)
    draw.text((cx - sw / 2, cy + 22), "SCORE", font=fs, fill=(148, 163, 184))

    # Bloque inferior — espaciado dinámico para llenar sin desbordar
    meta = " · ".join([x for x in [p.get("position"), p.get("sport_name") or p.get("sport")] if x])
    club = p.get("current_club")
    metrics = _top_metrics(ev, 3)
    fz = 1.08 if is_story else 1.0

    g_start, g_name, g_meta, g_club, g_pill, g_header, g_row, g_tail = 48, 94, 56, 50, 98, 48, 72, 58
    needed = g_start + g_name
    if meta:
        needed += g_meta
    if club:
        needed += g_club
    needed += g_pill
    if metrics:
        needed += g_header + g_row * len(metrics) + g_tail
    footer_top = H - 134
    available = footer_top - photo_h
    gs = max(0.80, min(1.55, available / max(1, needed)))

    ty = photo_h + int(g_start * gs)
    draw.text((60, ty), (p.get("name") or "")[:22], font=font(int(72 * fz), True), fill=(255, 255, 255))
    ty += int(g_name * gs)
    if meta:
        draw.text((60, ty), meta[:40], font=font(int(36 * fz), False), fill=gold)
        ty += int(g_meta * gs)
    if club:
        draw.text((60, ty), str(club)[:40], font=font(int(31 * fz), False), fill=(148, 163, 184))
        ty += int(g_club * gs)

    # Pill de nivel
    plabel = level_label
    pf = font(int(28 * fz), True)
    lw = draw.textlength(plabel, font=pf)
    ph_pill = int(58 * fz)
    draw.rounded_rectangle([60, ty, 60 + lw + 54, ty + ph_pill], radius=ph_pill // 2, fill=col)
    draw.text((60 + 27, ty + (ph_pill - int(28 * fz)) // 2 - 2), plabel, font=pf, fill=(10, 15, 30))
    ty += int(g_pill * gs)

    # Top 3 métricas como mini-barras
    if metrics:
        draw.text((60, ty), "MEJORES MÉTRICAS", font=font(int(23 * fz), True), fill=(148, 163, 184))
        ty += int(g_header * gs)
        bar_w = W - 120
        bar_h = int(14 * fz)
        lf = font(int(31 * fz), True)
        vf = font(int(31 * fz), True)
        for label, val in metrics:
            draw.text((60, ty), label[:26], font=lf, fill=(230, 235, 245))
            vtxt = str(val)
            vw = draw.textlength(vtxt, font=vf)
            draw.text((60 + bar_w - vw, ty), vtxt, font=vf, fill=gold)
            track_y = ty + int(42 * fz)
            draw.rounded_rectangle([60, track_y, 60 + bar_w, track_y + bar_h], radius=bar_h // 2, fill=(30, 40, 60))
            fill_w = max(bar_h, int(bar_w * val / 100.0))
            draw.rounded_rectangle([60, track_y, 60 + fill_w, track_y + bar_h], radius=bar_h // 2, fill=gold)
            ty += int(g_row * gs)

    # Footer con marca personalizada (logo + entidad + lema) o marca por defecto
    b = branding or {}
    entity = (b.get("entity_name") or "").strip()
    slogan = (b.get("slogan") or "").strip()
    fy = H - 118
    draw.line([(60, fy - 16), (W - 60, fy - 16)], fill=(30, 40, 60), width=2)
    text_x = 60
    if logo:
        try:
            lg = Image.open(_io.BytesIO(logo)).convert("RGBA")
            lg.thumbnail((88, 88), Image.LANCZOS)
            ly = fy + (88 - lg.size[1]) // 2
            base.paste(lg, (60, ly), lg)
            text_x = 60 + 104
        except Exception:
            pass
    if entity or slogan:
        if entity:
            draw.text((text_x, fy + 8), entity[:34], font=font(32, True), fill=(255, 255, 255))
        if slogan:
            draw.text((text_x, fy + 50), slogan[:46], font=font(25, False), fill=(148, 163, 184))
    else:
        draw.text((text_x, fy + 24), "LordTraining", font=font(32, True), fill=(255, 255, 255))
    # Sello LordTraining a la derecha
    stamp = "lordtraining.com"
    sff = font(24, False)
    sww = draw.textlength(stamp, font=sff)
    draw.text((W - 60 - sww, fy + 34), stamp, font=sff, fill=(100, 116, 139))

    # ── Marco coleccionable (estilo carta premium) ──
    m = 20
    for i in range(3):
        off = m + 6 + i * 3
        draw.rounded_rectangle([off, off, W - off, H - off], radius=30, outline=gold, width=1)
    draw.rounded_rectangle([m, m, W - m, H - m], radius=34, outline=gold, width=5)
    clen, cw = 64, 9
    for (x0, y0, dx, dy) in [(m + 8, m + 8, 1, 1), (W - m - 8, m + 8, -1, 1),
                             (m + 8, H - m - 8, 1, -1), (W - m - 8, H - m - 8, -1, -1)]:
        draw.line([(x0, y0), (x0 + dx * clen, y0)], fill=gold, width=cw)
        draw.line([(x0, y0), (x0, y0 + dy * clen)], fill=gold, width=cw)

    out = _io.BytesIO()
    base.save(out, format="PNG")
    return out.getvalue()


@router.get("/prospects/{pid}/social-card")
async def social_card(pid: str, format: str = Query("post"),
                      entity: Optional[str] = Query(None), slogan: Optional[str] = Query(None),
                      logo_path: Optional[str] = Query(None), accent: Optional[str] = Query(None),
                      authorization: str = Header(None), auth: str = Query(None)):
    # Auth: header o query (?auth=token) para poder usarse en <img src> (preview en vivo).
    tok = None
    if authorization and authorization.startswith("Bearer "):
        tok = authorization.split(" ", 1)[1]
    elif auth:
        tok = auth
    if not tok:
        raise HTTPException(401, "No autorizado")
    import jwt as _jwt
    from core.auth import JWT_SECRET, JWT_ALGORITHM
    try:
        payload = _jwt.decode(tok, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type", "access") == "refresh":
            raise HTTPException(401, "Token inválido")
        uid = payload["user_id"]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(401, "Token inválido")

    p = await _prospects.find_one({"id": pid, "coach_id": uid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prospecto no encontrado")
    settings = await _get_settings(uid)
    branding = {
        "entity_name": entity if entity is not None else settings.get("entity_name", ""),
        "slogan": slogan if slogan is not None else settings.get("slogan", ""),
        "accent_color": _valid_hex(accent) if accent else settings.get("accent_color", "#D4AF37"),
    }
    lp = logo_path if logo_path is not None else settings.get("logo_path")
    logo = await _photo_bytes(lp) if lp else None
    fmt = "story" if format == "story" else "post"
    img = _build_social_card(p, photo=await _photo_bytes(p.get("photo_path")), fmt=fmt, branding=branding, logo=logo)
    fname = f"{(p.get('name') or 'prospecto').replace(' ', '_')}-{fmt}.png"
    return Response(content=img, media_type="image/png",
                    headers={"Content-Disposition": f'inline; filename="{fname}"'})



async def _season_summary_for(prospect_id, coach_id, sport):
    records = await _stats.find({"prospect_id": prospect_id, "coach_id": coach_id}, {"_id": 0}).to_list(1000)
    if not records:
        return {"count": 0, "items": []}
    template = await _stat_template(coach_id, sport)
    agg = _aggregate_stats(records, template)
    if not agg["count"]:
        return {"count": 0, "items": []}
    labels = {m["key"]: m["label"] for c in template["categories"] for m in c["metrics"]}
    items = [(labels.get(k, k), v) for k, v in list(agg["averages"].items())[:8]]
    return {"count": agg["count"], "items": items}


def _qr_reader(url: str):
    if not url:
        return None
    try:
        import qrcode
        import io as _io
        from reportlab.lib.utils import ImageReader
        img = qrcode.make(url)
        buf = _io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return ImageReader(buf)
    except Exception:
        return None


def _score_hex(v):
    if v is None:
        return '#94a3b8'
    return '#10b981' if v >= 80 else '#f59e0b' if v >= 65 else '#ef4444'


def _verdict_hex(v):
    return '#10b981' if v == 'RECRUIT' else '#f59e0b' if v == 'MONITOR' else '#ef4444' if v == 'PASS' else '#64748b'


def _bar_hex(v, std=CLUB_STANDARD):
    return '#10b981' if v >= std else '#f59e0b' if v >= std - 15 else '#ef4444'


def _build_scout_pdf(p: dict, photo_bytes: Optional[bytes], public_url: Optional[str],
                     season: dict, public_only: bool, theme: str) -> bytes:
    """Genera la ficha de scouting con ReportLab (sin navegador headless → funciona en producción)."""
    import io
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfbase.pdfmetrics import stringWidth

    is_dark = theme != "light"
    bg = HexColor('#0f172a') if is_dark else HexColor('#ffffff')
    ink = HexColor('#e5e7eb') if is_dark else HexColor('#1e293b')
    muted = HexColor('#94a3b8') if is_dark else HexColor('#64748b')
    surface = HexColor('#0b1220') if is_dark else HexColor('#f1f5f9')
    border = HexColor('#1e293b') if is_dark else HexColor('#e2e8f0')
    accent = HexColor('#CCFF00')
    header_bg = HexColor('#0f172a')
    white = HexColor('#ffffff')
    card_bg = HexColor('#0b1220') if is_dark else HexColor('#0f172a')
    title_col = accent if is_dark else HexColor('#0f172a')

    W, H = letter
    M = 36
    F, FB = "Helvetica", "Helvetica-Bold"
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)

    def paint_bg():
        c.setFillColor(bg)
        c.rect(0, 0, W, H, fill=1, stroke=0)

    paint_bg()

    def text(x, y, s, size=10, color=ink, bold=False):
        c.setFont(FB if bold else F, size)
        c.setFillColor(color)
        c.drawString(x, y, str(s))

    def rtext(x, y, s, size=10, color=ink, bold=False):
        c.setFont(FB if bold else F, size)
        c.setFillColor(color)
        c.drawRightString(x, y, str(s))

    def wrap(s, size, max_w, bold=False):
        font = FB if bold else F
        out, cur = [], ""
        for w in str(s).split():
            t = (cur + " " + w).strip()
            if stringWidth(t, font, size) <= max_w:
                cur = t
            else:
                if cur:
                    out.append(cur)
                cur = w
        if cur:
            out.append(cur)
        return out

    state = {"y": 0}

    def newpage():
        c.showPage()
        paint_bg()
        state["y"] = H - 44

    def ensure(need):
        if state["y"] - need < 54:
            newpage()

    def section(title):
        ensure(30)
        y = state["y"]
        c.setFillColor(accent)
        c.rect(M, y - 1, 3, 12, fill=1, stroke=0)
        text(M + 9, y, title.upper(), 11, title_col, True)
        state["y"] = y - 17

    # ───── HEADER ─────
    hh = 150
    c.setFillColor(header_bg)
    c.roundRect(M, H - 30 - hh, W - 2 * M, hh, 12, fill=1, stroke=0)
    c.setFillColor(accent)
    c.rect(M, H - 30 - hh, W - 2 * M, 4, fill=1, stroke=0)
    text(M + 16, H - 50, "LORDTRAINING", 10, accent, True)
    c.setFont(FB, 10)
    c.setFillColor(white)
    c.drawString(M + 16 + stringWidth("LORDTRAINING", FB, 10), H - 50, " · SCOUTING REPORT")
    rtext(W - M - 16, H - 50, datetime.now().strftime('%d/%m/%Y'), 9, muted)

    px, py, pw, ph = M + 16, H - 30 - hh + 20, 78, 98
    drew = False
    if photo_bytes:
        try:
            c.drawImage(ImageReader(io.BytesIO(photo_bytes)), px, py, pw, ph, mask='auto')
            drew = True
        except Exception:
            drew = False
    if not drew:
        c.setFillColor(HexColor('#1e293b'))
        c.roundRect(px, py, pw, ph, 8, fill=1, stroke=0)
        c.setFont(FB, 26)
        c.setFillColor(HexColor('#475569'))
        c.drawCentredString(px + pw / 2, py + ph / 2 - 9, "★")
    c.setStrokeColor(accent)
    c.setLineWidth(2)
    c.roundRect(px, py, pw, ph, 8, fill=0, stroke=1)

    ix = px + pw + 18
    text(ix, H - 66, (p.get('name') or '')[:34], 19, white, True)
    pos_sport = " · ".join([x for x in [p.get('position'), p.get('sport_name') or p.get('sport')] if x])
    if pos_sport:
        text(ix, H - 84, pos_sport[:48], 11, accent, True)
    meta1 = "   •   ".join([x for x in [("Edad " + str(p.get('age'))) if p.get('age') else None,
                                        p.get('current_club') or 'Sin club', p.get('nationality')] if x])
    text(ix, H - 101, meta1[:60], 9, muted)
    meta2 = "   •   ".join([x for x in [(str(p.get('height_cm')) + ' cm') if p.get('height_cm') else None,
                                        (str(p.get('weight_kg')) + ' kg') if p.get('weight_kg') else None,
                                        p.get('dominant_side')] if x])
    if meta2:
        text(ix, H - 114, meta2[:60], 9, muted)

    overall = p.get('overall_score')
    rtext(W - M - 22, H - 58, "SCORE", 8, muted)
    c.setFont(FB, 34)
    c.setFillColor(accent)
    c.drawRightString(W - M - 22, H - 94, str(overall) if overall is not None else "—")
    ai = p.get('ai_recommendation') or {}
    verdict = ai.get('verdict') or "—"
    vcol = HexColor(_verdict_hex(verdict))
    vw = stringWidth(verdict, FB, 8) + 16
    c.setFillColor(vcol)
    c.roundRect(W - M - 22 - vw, H - 116, vw, 15, 7, fill=1, stroke=0)
    c.setFont(FB, 8)
    c.setFillColor(white)
    c.drawCentredString(W - M - 22 - vw / 2, H - 111, verdict)

    state["y"] = H - 30 - hh - 24

    # ───── EVALUACIÓN POR ÁREA ─────
    ev = p.get('evaluation') or {}
    cat_avgs = ev.get('category_averages') or {}
    blocks = _criteria_for(p.get('sport'))
    cat_label = {b["key"]: b["label"] for b in blocks}
    section("Evaluación por área")
    _lvl = _norm_level(p.get('level'))
    _lstd = ev.get('level_standard') or _level_standard(p.get('level'))
    if cat_avgs:
        track_w = W - 2 * M - 120
        for ckey, avg in cat_avgs.items():
            ensure(22)
            y = state["y"]
            pct = max(0, min(100, avg))
            col = HexColor(_bar_hex(pct, _lstd))
            text(M, y, cat_label.get(ckey, ckey), 10, ink, True)
            rtext(M + 110 + track_w, y, str(pct), 10, col, True)
            c.setFillColor(border)
            c.roundRect(M + 100, y - 2, track_w, 7, 3, fill=1, stroke=0)
            c.setFillColor(col)
            c.roundRect(M + 100, y - 2, max(2, track_w * pct / 100.0), 7, 3, fill=1, stroke=0)
            state["y"] = y - 18
        text(M, state["y"], f"Estándar del nivel {_lvl}: {_lstd}", 9, muted)
        state["y"] -= 16
    else:
        text(M, state["y"], "Sin evaluación registrada.", 9, muted)
        state["y"] -= 16

    # ───── INFORME IA ─────
    summary = ai.get('summary') or p.get('bio') or 'Sin informe generado.'
    section("Informe IA")
    for ln in wrap(summary, 10, W - 2 * M)[:12]:
        ensure(14)
        text(M, state["y"], ln, 10, ink)
        state["y"] -= 13
    strengths = ai.get('strengths') or []
    if strengths:
        state["y"] -= 4
        text(M, state["y"], "FORTALEZAS", 8, muted, True)
        state["y"] -= 13
        for s in strengths[:4]:
            for i, ln in enumerate(wrap("• " + str(s), 9, W - 2 * M - 8)):
                ensure(13)
                text(M + (0 if i == 0 else 10), state["y"], ln, 9, HexColor('#16a34a'))
                state["y"] -= 12
    state["y"] -= 8

    # ───── ESTADÍSTICAS DE TEMPORADA ─────
    if season.get("count"):
        section(f"Estadísticas de temporada ({season['count']} registros · promedios)")
        items = season["items"]
        cols, gap = 4, 8
        cw = (W - 2 * M - (cols - 1) * gap) / cols
        chh = 40
        for row_start in range(0, len(items), cols):
            ensure(chh + 8)
            y = state["y"]
            row = items[row_start:row_start + cols]
            for i, (lbl, val) in enumerate(row):
                cx = M + i * (cw + gap)
                c.setFillColor(card_bg)
                c.roundRect(cx, y - chh, cw, chh, 8, fill=1, stroke=0)
                c.setFont(FB, 7)
                c.setFillColor(HexColor('#94a3b8'))
                c.drawCentredString(cx + cw / 2, y - 13, str(lbl)[:16].upper())
                c.setFont(FB, 15)
                c.setFillColor(accent)
                c.drawCentredString(cx + cw / 2, y - 31, str(val))
            state["y"] = y - chh - 8

    # ───── TRAYECTORIA / TRANSFERENCIAS ─────
    transfers = [t for t in (p.get("transfers") or []) if (not public_only or t.get("is_public", True))]
    if transfers:
        section("Trayectoria / Transferencias")
        for t in transfers:
            ensure(15)
            y = state["y"]
            c.setFillColor(accent)
            c.circle(M + 3, y + 3, 3, fill=1, stroke=0)
            line = f"{t.get('from_entity') or '—'}  →  {t.get('to_entity') or '—'}"
            text(M + 12, y, line[:60], 10, ink, True)
            extra = " ".join([x for x in [t.get('type'), t.get('date')] if x])
            if extra:
                rtext(W - M, y, extra, 9, muted)
            state["y"] = y - 15
        state["y"] -= 6

    # ───── VALOR & PATROCINIOS ─────
    show_value = (not public_only) or p.get("market_value_public")
    sponsors = [s for s in (p.get("sponsorships") or []) if (not public_only or s.get("is_public", True))]
    if (show_value and p.get("market_value") is not None) or sponsors:
        section("Valor & Patrocinios")
        if show_value and p.get("market_value") is not None:
            ensure(20)
            try:
                mv = f"{float(p.get('market_value')):,.0f}"
            except Exception:
                mv = str(p.get("market_value"))
            text(M, state["y"], f"{p.get('market_currency') or 'USD'} {mv}", 16, HexColor('#10b981'), True)
            text(M + stringWidth(f"{p.get('market_currency') or 'USD'} {mv}", FB, 16) + 8, state["y"], "valor de mercado", 9, muted)
            state["y"] -= 18
        if sponsors:
            names = "   ·   ".join([f"{s.get('name')}{(' (' + str(s.get('amount')) + ')') if s.get('amount') else ''}" for s in sponsors])
            for ln in wrap(names, 9, W - 2 * M):
                ensure(13)
                text(M, state["y"], ln, 9, ink)
                state["y"] -= 12
        state["y"] -= 6

    # ───── LOGROS ─────
    achievements = p.get("achievements") or []
    if achievements:
        section("Logros")
        for a in achievements:
            for i, ln in enumerate(wrap("• " + str(a), 9, W - 2 * M - 8)):
                ensure(13)
                text(M + (0 if i == 0 else 10), state["y"], ln, 9, ink)
                state["y"] -= 12
        state["y"] -= 6

    # ───── VIDEOS PÚBLICOS ─────
    VCAT = {"technical": "Técnico", "physical": "Físico", "match": "Partido", "tactical": "Táctico", "highlights": "Highlights", "interview": "Entrevista"}
    pub_videos = [v for v in (p.get("video_links") or []) if v.get("is_public", True)]
    if pub_videos:
        section("Videos públicos")
        for v in pub_videos:
            ensure(13)
            cat = VCAT.get(v.get('category') or v.get('type'), 'Video')
            line = f"▶ [{cat}] {v.get('title') or 'Video'}: {v.get('url')}"
            text(M, state["y"], line[:88], 9, HexColor('#0ea5e9'))
            state["y"] -= 12
        state["y"] -= 6

    # ───── FIRMA + QR ─────
    ensure(70)
    y = state["y"] - 6
    c.setStrokeColor(muted)
    c.setLineWidth(0.6)
    c.line(M, y - 26, M + 170, y - 26)
    text(M, y - 38, "Firma del entrenador / club", 9, muted)
    qr = _qr_reader(public_url) if public_url else None
    if qr:
        try:
            c.drawImage(qr, W - M - 64, y - 64, 64, 64, mask='auto')
            rtext(W - M, y - 74, "Perfil interactivo", 7, muted)
        except Exception:
            pass

    # ───── BANDA INFERIOR ─────
    c.setFillColor(card_bg)
    c.rect(0, 0, W, 32, fill=1, stroke=0)
    text(M, 12, f"{p.get('email') or '—'}    {p.get('phone') or '—'}", 9, HexColor('#94a3b8'))
    rtext(W - M, 12, "Identifica el talento. Construye el futuro.", 9, accent, True)

    c.showPage()
    c.save()
    return buf.getvalue()



@router.get("/prospects/{pid}/profile-pdf")
async def profile_pdf(pid: str, auth: str = Query(None), origin: str = Query(None), theme: str = Query("dark"), authorization: str = Header(None), user=None):
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
    photo = await _photo_bytes(p.get("photo_path"))
    season = await _season_summary_for(pid, uid, p.get("sport"))
    public_url = None
    if origin and p.get("share_enabled") and p.get("share_id"):
        public_url = f"{origin.rstrip('/')}/scouting/p/{p['share_id']}"
    try:
        pdf = _build_scout_pdf(p, photo, public_url=public_url, season=season, public_only=False, theme=theme)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"scouting_{(p.get('name') or 'prospecto').replace(' ', '_').lower()}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename=\"{fname}\"'})
