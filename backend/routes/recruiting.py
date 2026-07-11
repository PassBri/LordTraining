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
DEFAULT_SETTINGS = {"eval_days": 14, "expiry_days": 30}


async def _get_settings(uid):
    s = await _settings.find_one({"coach_id": uid}, {"_id": 0})
    return {**DEFAULT_SETTINGS, **(s or {})}


class SettingsIn(BaseModel):
    eval_days: int = Field(default=14, ge=1, le=365)
    expiry_days: int = Field(default=30, ge=1, le=365)


@router.get("/settings")
async def get_settings(user=Depends(get_current_user_dep())):
    return await _get_settings(_uid(user))


@router.put("/settings")
async def update_settings(payload: SettingsIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    doc = {"coach_id": uid, "eval_days": payload.eval_days, "expiry_days": payload.expiry_days,
           "updated_at": datetime.now(timezone.utc).isoformat()}
    await _settings.update_one({"coach_id": uid}, {"$set": doc}, upsert=True)
    return await _get_settings(uid)


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
