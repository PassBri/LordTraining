"""
Demo / Onboarding data seeding.

Asigna fechas reales a las sesiones del plan (sesiones_v2) ancladas a la fecha
de inicio del plan, marca sesiones pasadas como completadas (~85% adherencia),
y siembra competencias / evaluacion fisica / indicadores si faltan, para que el
Panel de Control deje de verse vacio.

Todo lo sembrado es EDITABLE y BORRABLE por el usuario desde la UI normal.
Es idempotente: volver a ejecutarlo no duplica datos.
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone, date, timedelta
from pydantic import BaseModel
import jwt
import os
import hashlib

router = APIRouter(prefix="/api/admin", tags=["Demo Seed"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"

# Rotacion de capacidades para distribuir el grafico "Distribucion por capacidad"
CAP_ROTATION = ["fuerza", "resistencia", "velocidad", "tecnica", "tactica", "flexibilidad", "coordinacion"]


def get_db(request: Request):
    return request.app.state.db


async def get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = get_db(request)
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


class SeedRequest(BaseModel):
    plan_id: Optional[str] = None   # v1 plan id (training_plans.id); None = todos los planes del coach
    all_plans: bool = True


def _parse_start(value) -> date:
    if not value:
        return date.today()
    s = str(value)[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except Exception:
        return date.today()


def _is_completed(session_id: str, session_date: date, today: date) -> bool:
    """Pasadas: ~85% completadas (determinista por hash). Hoy/futuro: pendientes."""
    if session_date >= today:
        return False
    h = int(hashlib.md5((session_id or "").encode()).hexdigest(), 16)
    return (h % 100) < 85


async def _seed_sessions_for_v2_plan(db, v2_plan: dict) -> dict:
    today = date.today()
    start = _parse_start(v2_plan.get("fecha_inicio"))

    macros = await db.macrociclos_v2.find({"plan_id": v2_plan["id"]}, {"_id": 0}).to_list(200)
    macros.sort(key=lambda m: m.get("orden", 0))
    macro_ids = [m["id"] for m in macros]
    mesos = await db.mesociclos_v2.find({"macrociclo_id": {"$in": macro_ids}}, {"_id": 0}).to_list(1000)
    meso_by_macro = {}
    for m in mesos:
        meso_by_macro.setdefault(m["macrociclo_id"], []).append(m)
    for arr in meso_by_macro.values():
        arr.sort(key=lambda x: x.get("orden", 0))

    meso_ids = [m["id"] for m in mesos]
    micros = await db.microciclos_v2.find({"mesociclo_id": {"$in": meso_ids}}, {"_id": 0}).to_list(3000)
    micro_by_meso = {}
    for mi in micros:
        micro_by_meso.setdefault(mi["mesociclo_id"], []).append(mi)
    for arr in micro_by_meso.values():
        arr.sort(key=lambda x: x.get("numero_semana", 0))

    sessions_updated = 0
    completed = 0
    micros_updated = 0
    week_counter = 0

    for macro in macros:
        for meso in meso_by_macro.get(macro["id"], []):
            for micro in micro_by_meso.get(meso["id"], []):
                week_counter += 1
                week_start = start + timedelta(days=(week_counter - 1) * 7)
                week_end = week_start + timedelta(days=6)
                await db.microciclos_v2.update_one(
                    {"id": micro["id"]},
                    {"$set": {
                        "numero_semana": week_counter,
                        "fecha_inicio": week_start.isoformat(),
                        "fecha_fin": week_end.isoformat(),
                    }}
                )
                micros_updated += 1

                sesiones = await db.sesiones_v2.find({"microciclo_id": micro["id"]}, {"_id": 0}).to_list(100)
                sesiones.sort(key=lambda s: s.get("orden_dia", 1))
                for idx, ses in enumerate(sesiones):
                    orden = ses.get("orden_dia") or (idx + 1)
                    day_offset = max(0, min(6, int(orden) - 1))
                    ses_date = week_start + timedelta(days=day_offset)
                    is_done = _is_completed(ses["id"], ses_date, today)
                    cap = ses.get("capacidad_principal") or CAP_ROTATION[(week_counter + idx) % len(CAP_ROTATION)]
                    await db.sesiones_v2.update_one(
                        {"id": ses["id"]},
                        {"$set": {
                            "fecha": ses_date.isoformat(),
                            "completada": is_done,
                            "capacidad_principal": cap,
                            "demo_seeded": True,
                        }}
                    )
                    sessions_updated += 1
                    if is_done:
                        completed += 1

    return {"sessions": sessions_updated, "completed": completed, "micros": micros_updated, "weeks": week_counter}


async def _seed_competitions(db, v1_plan_id: str, user_id: str) -> int:
    existing = await db.plan_competitions.count_documents({"plan_id": v1_plan_id, "user_id": user_id})
    if existing > 0:
        return 0
    today = date.today()
    comps = [
        {"name": "Torneo de Control Regional", "offset": 21, "importance": "B",
         "location": "Sede Local", "expected_result": "Test de forma deportiva"},
        {"name": "Clasificatorio Nacional", "offset": 56, "importance": "A",
         "location": "Polideportivo Central", "expected_result": "Clasificar a la final"},
        {"name": "Campeonato Nacional (Objetivo Principal)", "offset": 98, "importance": "A",
         "location": "Estadio Nacional", "expected_result": "Podio / Marca personal"},
    ]
    for c in comps:
        d = (today + timedelta(days=c["offset"])).isoformat()
        await db.plan_competitions.insert_one({
            "plan_id": v1_plan_id,
            "user_id": user_id,
            "name": c["name"],
            "date": d,
            "importance": c["importance"],
            "location": c["location"],
            "expected_result": c["expected_result"],
            "notes": "Competencia de ejemplo (editable/borrable)",
            "demo_seeded": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    return len(comps)


async def _seed_physical_evaluation(db, v1_plan_id: str, user_id: str) -> int:
    existing = await db.plan_evaluations.count_documents(
        {"plan_id": v1_plan_id, "user_id": user_id, "evaluation_type": "physical"}
    )
    if existing > 0:
        return 0
    results = {
        "fuerzaMaxima": 78, "fuerzaExplosiva": 72,
        "resistenciaAerobica": 84, "resistenciaAnaerobica": 68,
        "velocidadMaxima": 75, "flexibilidad": 62,
        "potencia": 70, "coordinacion": 80,
    }
    await db.plan_evaluations.insert_one({
        "plan_id": v1_plan_id,
        "user_id": user_id,
        "evaluation_type": "physical",
        "results": results,
        "notes": "Evaluacion fisica de ejemplo (editable)",
        "demo_seeded": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return 1


async def _seed_indicators(db, v1_plan_id: str, user_id: str) -> int:
    doc = await db.plan_previous_analysis.find_one({"plan_id": v1_plan_id, "user_id": user_id})
    if not doc:
        return 0
    data = doc.get("data") or {}
    ind = data.get("indicadores") or {}
    # Solo sembrar si estan vacios
    has_value = any((v or {}).get("final") not in (None, "") for v in ind.values() if isinstance(v, dict))
    if has_value:
        return 0
    seeded = {
        "vo2max": {"inicial": "52", "final": "58", "delta": "6"},
        "sentadilla": {"inicial": "110", "final": "128", "delta": "18"},
        "sprint": {"inicial": "3.9", "final": "3.6", "delta": "-0.3"},
        "cmj": {"inicial": "38", "final": "43", "delta": "5"},
        "flexibilidad": {"inicial": "21", "final": "26", "delta": "5"},
    }
    data["indicadores"] = seeded
    await db.plan_previous_analysis.update_one(
        {"_id": doc["_id"]},
        {"$set": {"data": data, "demo_seeded_indicators": True}}
    )
    return len(seeded)


@router.post("/seed-demo-data")
async def seed_demo_data(payload: SeedRequest, request: Request, user: dict = Depends(get_current_user)):
    """Siembra datos de ejemplo en las sesiones/competencias del coach autenticado."""
    db = get_db(request)
    uid = user["id"]

    # Resolver planes V2 objetivo
    query = {"coach_id": uid}
    if payload.plan_id and not payload.all_plans:
        query["_v1_id"] = payload.plan_id
    v2_plans = await db.planes_entrenamiento.find(query, {"_id": 0}).to_list(100)

    if not v2_plans:
        raise HTTPException(404, "No se encontraron planes V2 para sembrar. Abre el plan en Periodizacion primero.")

    summary = {"plans": [], "totals": {"sessions": 0, "completed": 0, "competitions": 0, "evaluations": 0, "indicators": 0}}

    for v2 in v2_plans:
        v1_id = v2.get("_v1_id")
        sess_res = await _seed_sessions_for_v2_plan(db, v2)
        comps = await _seed_competitions(db, v1_id, uid) if v1_id else 0
        evals = await _seed_physical_evaluation(db, v1_id, uid) if v1_id else 0
        inds = await _seed_indicators(db, v1_id, uid) if v1_id else 0

        summary["plans"].append({
            "v2_id": v2["id"], "v1_id": v1_id, "nombre": v2.get("nombre"),
            **sess_res, "competitions": comps, "evaluations": evals, "indicators": inds,
        })
        summary["totals"]["sessions"] += sess_res["sessions"]
        summary["totals"]["completed"] += sess_res["completed"]
        summary["totals"]["competitions"] += comps
        summary["totals"]["evaluations"] += evals
        summary["totals"]["indicators"] += inds

    return {"status": "ok", "message": "Datos de ejemplo sembrados correctamente.", **summary}


@router.delete("/seed-demo-data")
async def clear_demo_data(request: Request, user: dict = Depends(get_current_user)):
    """Revierte el sembrado: borra fechas/completado de sesiones demo y elimina competencias/evaluaciones demo."""
    db = get_db(request)
    uid = user["id"]
    v2_plans = await db.planes_entrenamiento.find({"coach_id": uid}, {"_id": 0}).to_list(100)
    micro_ids_all = []
    for v2 in v2_plans:
        macros = await db.macrociclos_v2.find({"plan_id": v2["id"]}, {"_id": 0}).to_list(200)
        macro_ids = [m["id"] for m in macros]
        mesos = await db.mesociclos_v2.find({"macrociclo_id": {"$in": macro_ids}}, {"_id": 0}).to_list(1000)
        meso_ids = [m["id"] for m in mesos]
        micros = await db.microciclos_v2.find({"mesociclo_id": {"$in": meso_ids}}, {"_id": 0}).to_list(3000)
        micro_ids_all += [mi["id"] for mi in micros]

    sess = await db.sesiones_v2.update_many(
        {"microciclo_id": {"$in": micro_ids_all}, "demo_seeded": True},
        {"$set": {"fecha": None, "completada": False}, "$unset": {"demo_seeded": "", "capacidad_principal": ""}}
    )
    comps = await db.plan_competitions.delete_many({"user_id": uid, "demo_seeded": True})
    evals = await db.plan_evaluations.delete_many({"user_id": uid, "demo_seeded": True})
    return {
        "status": "ok",
        "sessions_cleared": sess.modified_count,
        "competitions_deleted": comps.deleted_count,
        "evaluations_deleted": evals.deleted_count,
    }
