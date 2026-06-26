"""
Migración de datos del coach PREVIEW -> PRODUCCIÓN (Fase 4 / P2).
  - GET  /api/admin/export-data  -> JSON con planes, sesiones, competencias, etc. del coach.
  - POST /api/admin/import-data   -> recrea esos documentos en la cuenta del coach actual.
Se preservan los ids para mantener los enlaces v1<->v2 (microciclo_id, _v1_id...).
Es idempotente: omite documentos cuyo id ya existe.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Any, Dict, List
import jwt
import os

router = APIRouter(prefix="/api/admin", tags=["Data Migration"])
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"

EXPORT_VERSION = 1


def get_db(request: Request):
    return request.app.state.db


async def get_current_coach(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = get_db(request)
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


@router.get("/export-data")
async def export_data(request: Request, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    uid = coach["id"]

    v1_plans = await db.training_plans.find({"coach_id": uid}, {"_id": 0}).to_list(500)
    v1_ids = [p["id"] for p in v1_plans]

    v2_plans = await db.planes_entrenamiento.find({"coach_id": uid}, {"_id": 0}).to_list(500)
    v2_ids = [p["id"] for p in v2_plans]
    macros = await db.macrociclos_v2.find({"plan_id": {"$in": v2_ids}}, {"_id": 0}).to_list(2000)
    macro_ids = [m["id"] for m in macros]
    mesos = await db.mesociclos_v2.find({"macrociclo_id": {"$in": macro_ids}}, {"_id": 0}).to_list(5000)
    meso_ids = [m["id"] for m in mesos]
    micros = await db.microciclos_v2.find({"mesociclo_id": {"$in": meso_ids}}, {"_id": 0}).to_list(20000)
    micro_ids = [m["id"] for m in micros]
    sesiones = await db.sesiones_v2.find({"microciclo_id": {"$in": micro_ids}}, {"_id": 0}).to_list(50000)

    competitions = await db.plan_competitions.find({"plan_id": {"$in": v1_ids}}, {"_id": 0}).to_list(2000)
    objectives = await db.plan_objectives.find({"plan_id": {"$in": v1_ids}}, {"_id": 0}).to_list(2000)
    prev_analysis = await db.plan_previous_analysis.find({"plan_id": {"$in": v1_ids}}, {"_id": 0}).to_list(2000)
    evaluations = await db.plan_evaluations.find({"plan_id": {"$in": v1_ids}}, {"_id": 0}).to_list(2000)
    athletes = await db.athletes.find({"coach_id": uid}, {"_id": 0, "portal_password": 0}).to_list(2000)

    return {
        "export_version": EXPORT_VERSION,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source_coach_id": uid,
        "counts": {
            "training_plans": len(v1_plans), "planes_entrenamiento": len(v2_plans),
            "macrociclos_v2": len(macros), "mesociclos_v2": len(mesos),
            "microciclos_v2": len(micros), "sesiones_v2": len(sesiones),
            "plan_competitions": len(competitions), "plan_objectives": len(objectives),
            "plan_previous_analysis": len(prev_analysis), "plan_evaluations": len(evaluations),
            "athletes": len(athletes),
        },
        "data": {
            "training_plans": v1_plans, "planes_entrenamiento": v2_plans,
            "macrociclos_v2": macros, "mesociclos_v2": mesos, "microciclos_v2": micros,
            "sesiones_v2": sesiones, "plan_competitions": competitions,
            "plan_objectives": objectives, "plan_previous_analysis": prev_analysis,
            "plan_evaluations": evaluations, "athletes": athletes,
        },
    }


class ImportPayload(BaseModel):
    export_version: int = EXPORT_VERSION
    data: Dict[str, List[Dict[str, Any]]]


# Colecciones cuyo coach_id se debe remapear al usuario actual
_COACH_FIELD = {
    "training_plans": "coach_id", "planes_entrenamiento": "coach_id", "athletes": "coach_id",
}
# Colecciones cuyo user_id se debe remapear
_USER_FIELD = {
    "plan_competitions": "user_id", "plan_objectives": "user_id",
    "plan_previous_analysis": "user_id", "plan_evaluations": "user_id",
}

# Claves naturales para colecciones que NO tienen campo 'id' propio (idempotencia)
_NATURAL_KEY = {
    "plan_competitions": ["plan_id", "name", "date"],
    "plan_objectives": ["plan_id", "user_id"],
    "plan_previous_analysis": ["plan_id", "user_id"],
    "plan_evaluations": ["plan_id", "user_id", "evaluation_type"],
}

_IMPORT_ORDER = [
    "athletes", "training_plans", "planes_entrenamiento", "macrociclos_v2",
    "mesociclos_v2", "microciclos_v2", "sesiones_v2", "plan_competitions",
    "plan_objectives", "plan_previous_analysis", "plan_evaluations",
]


@router.post("/import-data")
async def import_data(payload: ImportPayload, request: Request, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    if payload.export_version != EXPORT_VERSION:
        raise HTTPException(400, f"Versión de export incompatible (esperada {EXPORT_VERSION})")
    uid = coach["id"]
    data = payload.data or {}
    result = {}

    for col in _IMPORT_ORDER:
        docs = data.get(col) or []
        inserted, skipped = 0, 0
        for doc in docs:
            doc.pop("_id", None)
            # No copiar credenciales del portal de atletas
            if col == "athletes":
                doc.pop("portal_password", None)
                doc.pop("portal_email", None)
                doc.pop("must_change_password", None)
            if col in _COACH_FIELD:
                doc[_COACH_FIELD[col]] = uid
            if col in _USER_FIELD:
                doc[_USER_FIELD[col]] = uid
            # Idempotencia: por 'id' si existe, si no por clave natural
            doc_id = doc.get("id")
            if doc_id:
                if await db[col].find_one({"id": doc_id}, {"_id": 1}):
                    skipped += 1
                    continue
            elif col in _NATURAL_KEY:
                nk = {k: doc.get(k) for k in _NATURAL_KEY[col]}
                if await db[col].find_one(nk, {"_id": 1}):
                    skipped += 1
                    continue
            await db[col].insert_one(doc)
            inserted += 1
        result[col] = {"inserted": inserted, "skipped": skipped}

    return {"status": "ok", "imported": result}
