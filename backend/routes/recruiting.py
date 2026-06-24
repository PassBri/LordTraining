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
async def get_criteria(sport: Optional[str] = None, user=Depends(get_current_user_dep())):
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
    return {"sport": sport, "club_standard": CLUB_STANDARD, "blocks": blocks}


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
    evaluation = {
        "scores": payload.scores,
        "category_averages": cat_avgs,
        "overall": overall,
        "club_standard": CLUB_STANDARD,
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
        "score_general": ev.get("overall"), "estandar_club": CLUB_STANDARD,
    }

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

Usa las estadísticas reales como evidencia principal cuando existan. Compara contra el estándar del club ({CLUB_STANDARD}).
Devuelve EXACTAMENTE este JSON:
{{
  "verdict": "RECRUIT | MONITOR | PASS",
  "confidence": <0-100>,
  "projected_ceiling": "breve descripción del techo de rendimiento",
  "summary": "2-3 frases de resumen ejecutivo citando datos reales si los hay",
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
    photo_uri = await _photo_data_uri(p.get("photo_path"))
    season_html = await _season_html_for(p["id"], p["coach_id"], p.get("sport"))
    public_url = f"{origin.rstrip('/')}/scouting/p/{share_id}" if origin else None
    html = _build_profile_html(p, photo_uri, public_url=public_url, season_html=season_html, public_only=True, theme=theme)
    try:
        pdf = await _render_pdf(html)
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


async def _season_html_for(prospect_id, coach_id, sport):
    records = await _stats.find({"prospect_id": prospect_id, "coach_id": coach_id}, {"_id": 0}).to_list(1000)
    if not records:
        return ""
    template = await _stat_template(coach_id, sport)
    agg = _aggregate_stats(records, template)
    if not agg["count"]:
        return ""
    labels = {m["key"]: m["label"] for c in template["categories"] for m in c["metrics"]}
    items = list(agg["averages"].items())[:8]
    cells = "".join(f"<div style='background:#0b1220;border:1px solid #1e293b;border-radius:8px;padding:6px;text-align:center;'><div style='font-size:8px;color:#94a3b8;text-transform:uppercase;'>{_esc(labels.get(k, k))}</div><div style='font-size:15px;font-weight:800;color:#CCFF00;'>{v}</div></div>" for k, v in items)
    return f"<div style='font-size:9px;color:#64748b;margin-bottom:6px;'>{agg['count']} partidos/competencias · promedios</div><div style='display:grid;grid-template-columns:repeat(4,1fr);gap:8px;'>{cells}</div>"


def _qr_data_uri(url: str):
    if not url:
        return None
    try:
        import qrcode
        import io
        img = qrcode.make(url)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        return None


_PDF_THEMES = {
    "dark": {
        "page": "#0f172a", "text": "#e2e8f0", "strong": "#ffffff", "muted": "#94a3b8",
        "faint": "#64748b", "card": "#0b1220", "border": "#1e293b", "track": "#1e293b",
        "footer": "#0b1220", "titlecol": "#CCFF00", "barlabel": "#e2e8f0", "summary": "#cbd5e1",
    },
    "light": {
        "page": "#ffffff", "text": "#334155", "strong": "#0f172a", "muted": "#64748b",
        "faint": "#94a3b8", "card": "#0f172a", "border": "#e2e8f0", "track": "#e2e8f0",
        "footer": "#0f172a", "titlecol": "#0f172a", "barlabel": "#0f172a", "summary": "#334155",
    },
}


def _build_profile_html(p: dict, photo_uri: Optional[str], public_url: Optional[str] = None,
                        season_html: str = "", public_only: bool = False, theme: str = "dark") -> str:
    T = _PDF_THEMES.get(theme, _PDF_THEMES["dark"])
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
          <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;color:{T['barlabel']};margin-bottom:3px;">
            <span>{_esc(cat_label.get(ckey, ckey))}</span><span style="color:{color}">{pct}</span></div>
          <div style="height:8px;background:{T['track']};border-radius:99px;overflow:hidden;">
            <div style="width:{pct}%;height:100%;background:{color};"></div></div></div>"""

    stats = "".join(
        f"""<div style="background:{T['card']};border:1px solid {T['border']};border-radius:10px;padding:8px 10px;text-align:center;">
            <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">{_esc(k)}</div>
            <div style="font-size:16px;font-weight:800;color:#CCFF00;">{_esc(v)}</div></div>"""
        for k, v in (p.get("key_stats") or {}).items()
    )
    achievements = "".join(f"<li style='margin-bottom:4px;'>{_esc(a)}</li>" for a in (p.get("achievements") or []))

    # Videos públicos
    pub_videos = [v for v in (p.get("video_links") or []) if v.get("is_public", True)]
    VCAT = {"technical": "Técnico", "physical": "Físico", "match": "Partido", "tactical": "Táctico", "highlights": "Highlights", "interview": "Entrevista"}
    videos = "".join(f"<div style='font-size:11px;color:#0ea5e9;margin-bottom:3px;'>▶ [{_esc(VCAT.get(v.get('category') or v.get('type'), 'Video'))}] {_esc(v.get('title') or 'Video')}: {_esc(v.get('url'))}</div>" for v in pub_videos)

    # Transferencias (timeline)
    transfers = [t for t in (p.get("transfers") or []) if (not public_only or t.get("is_public", True))]
    transfers_html = ""
    for t in transfers:
        transfers_html += f"""<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;font-size:11px;color:{T['text']};">
          <span style="width:8px;height:8px;border-radius:99px;background:#CCFF00;"></span>
          <span style="font-weight:700;color:{T['strong']};">{_esc(t.get('from_entity') or '—')}</span>
          <span style="color:{T['faint']};">→</span>
          <span style="font-weight:700;color:{T['strong']};">{_esc(t.get('to_entity') or '—')}</span>
          <span style="font-size:9px;text-transform:uppercase;background:{T['card']};border-radius:4px;padding:1px 5px;color:#94a3b8;">{_esc(t.get('type') or '')}</span>
          <span style="margin-left:auto;color:{T['faint']};font-size:10px;">{_esc(t.get('date') or '')}</span></div>"""

    # Valor comercial
    show_value = (not public_only) or p.get("market_value_public")
    market_html = ""
    if show_value and p.get("market_value") is not None:
        try:
            mv = f"{float(p.get('market_value')):,.0f}"
        except Exception:
            mv = str(p.get("market_value"))
        market_html = f"<div style='font-size:22px;font-weight:900;color:#10b981;'>{_esc(p.get('market_currency') or 'USD')} {mv}</div><div style='font-size:10px;color:{T['faint']};'>Valor de mercado</div>"

    # Patrocinios
    sponsors = [s for s in (p.get("sponsorships") or []) if (not public_only or s.get("is_public", True))]
    sponsors_html = "".join(f"<span style='display:inline-block;background:{T['card']};border-radius:99px;padding:3px 10px;font-size:10px;color:#e2e8f0;margin:2px;'>{_esc(s.get('name'))}{(' · ' + _esc(str(s.get('amount')))) if s.get('amount') else ''}</span>" for s in sponsors)

    qr_uri = _qr_data_uri(public_url) if public_url else None
    qr_html = (f"<div style='text-align:center;'><img src='{qr_uri}' style='width:90px;height:90px;background:#fff;border-radius:8px;padding:4px;'/><div style='font-size:8px;color:{T['faint']};margin-top:3px;'>Perfil interactivo</div></div>" if qr_uri else "")

    overall = p.get("overall_score")
    verdict = ai.get("verdict") or "—"
    vcolor = "#10b981" if verdict == "RECRUIT" else "#f59e0b" if verdict == "MONITOR" else "#ef4444" if verdict == "PASS" else "#64748b"

    photo_html = (f"<img src='{photo_uri}' style='width:130px;height:160px;object-fit:cover;border-radius:12px;border:3px solid #CCFF00;'/>"
                  if photo_uri else
                  "<div style='width:130px;height:160px;border-radius:12px;background:#1e293b;display:flex;align-items:center;justify-content:center;color:#475569;font-size:40px;'>★</div>")

    sec_title = f"font-size:12px;font-weight:800;color:{T['titlecol']};border-left:3px solid #CCFF00;padding-left:8px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;"

    return f"""<!doctype html><html><head><meta charset="utf-8">
<style>*{{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;}}</style></head>
<body style="width:794px;background:{T['page']};color:{T['text']};padding:0;">
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

  <div style="display:flex;gap:20px;padding:24px 32px 14px;">
    <div style="flex:1;">
      <div style="{sec_title}">Evaluación por área</div>
      {bars or f'<div style="color:{T["faint"]};font-size:11px;">Sin evaluación registrada.</div>'}
      <div style="font-size:11px;color:{T['muted']};margin-top:8px;">Estándar del club: <b style="color:{T['strong']};">{CLUB_STANDARD}</b></div>
      {('<div style="margin-top:16px;' + sec_title + '">Stats clave</div><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' + stats + '</div>') if stats else ''}
    </div>
    <div style="flex:1;">
      <div style="{sec_title}">Informe IA</div>
      <div style="font-size:12px;color:{T['summary']};line-height:1.55;margin-bottom:12px;">{_esc(ai.get('summary') or p.get('bio') or 'Sin informe generado.')}</div>
      {('<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Fortalezas</div><ul style="font-size:11px;color:#16a34a;padding-left:16px;margin-bottom:10px;">' + ''.join('<li>' + _esc(s) + '</li>' for s in ai.get('strengths', [])) + '</ul>') if ai.get('strengths') else ''}
    </div>
  </div>

  {('<div style="padding:0 32px 14px;"><div style="' + sec_title + '">Estadísticas de temporada</div>' + season_html + '</div>') if season_html else ''}

  {('<div style="padding:0 32px 14px;"><div style="' + sec_title + '">Trayectoria / Transferencias</div>' + transfers_html + '</div>') if transfers_html else ''}

  <div style="display:flex;gap:20px;padding:0 32px 14px;">
    {('<div style="flex:1;"><div style="' + sec_title + '">Valor & Patrocinios</div>' + market_html + ('<div style="margin-top:6px;">' + sponsors_html + '</div>' if sponsors_html else '') + '</div>') if (market_html or sponsors_html) else '<div style="flex:1;"></div>'}
    {('<div><div style="' + sec_title + '">Logros</div><ul style="font-size:11px;color:' + T['text'] + ';padding-left:16px;">' + achievements + '</ul></div>') if achievements else ''}
  </div>

  {('<div style="padding:0 32px 14px;"><div style="' + sec_title + '">Videos públicos</div>' + videos + '</div>') if videos else ''}

  <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:14px 32px 6px;border-top:1px solid {T['border']};margin-top:6px;">
    <div style="text-align:center;">
      <div style="width:180px;border-top:1px solid {T['muted']};padding-top:4px;font-size:10px;color:{T['muted']};">Firma del entrenador / club</div>
    </div>
    {qr_html}
  </div>

  <div style="background:{T['footer']};padding:14px 32px;display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;">
    <span>📧 {_esc(p.get('email') or '—')} &nbsp; 📞 {_esc(p.get('phone') or '—')}</span>
    <span style="color:#CCFF00;font-weight:700;">Identifica el talento. Construye el futuro.</span>
  </div>
</body></html>"""


async def _render_pdf(html: str) -> bytes:
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/pw-browsers"
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
    photo_uri = await _photo_data_uri(p.get("photo_path"))
    season_html = await _season_html_for(pid, uid, p.get("sport"))
    public_url = None
    if origin and p.get("share_enabled") and p.get("share_id"):
        public_url = f"{origin.rstrip('/')}/scouting/p/{p['share_id']}"
    html = _build_profile_html(p, photo_uri, public_url=public_url, season_html=season_html, public_only=False, theme=theme)
    try:
        pdf = await _render_pdf(html)
    except Exception as e:
        raise HTTPException(500, f"Error generando PDF: {e}")
    fname = f"scouting_{(p.get('name') or 'prospecto').replace(' ', '_').lower()}.pdf"
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename=\"{fname}\"'})
