"""
API de Periodizacion V2 - Endpoints REST con propagacion automatica.
Cada endpoint que modifica datos dispara propagarCambio() hacia arriba.

Colecciones MongoDB usadas:
  - planes_entrenamiento
  - macrociclos_v2
  - mesociclos_v2
  - microciclos_v2
  - sesiones_v2
  - ejercicios_sesion
  - ejercicios_base
  - capacidades_plan
  - capacidades_bloque
  - historico_cargas
  - atletas_v2
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
import uuid
import jwt
import os
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from models.schemas import (
    PlanEntrenamientoCreate, PlanEntrenamientoDB,
    MacrocicloCreate, MacrocicloDB,
    MesocicloCreate, MesocicloDB,
    MicrocicloCreate, MicrocicloDB,
    SesionCreate, SesionDB,
    EjercicioSesionCreate, EjercicioSesionDB,
    EjercicioBaseCreate, EjercicioBaseDB,
    CapacidadPlanCreate, CapacidadPlanDB,
    CapacidadBloqueCreate, CapacidadBloqueDB,
    HistoricoCargaCreate, HistoricoCargaDB,
    AtletaCreate, AtletaDB,
)
from services.cascade import propagar_cambio, calcular_metricas_plan
from services.validation import validar_cambio_completo

router = APIRouter(prefix="/api/v2", tags=["Periodizacion V2"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


def _now():
    return datetime.now(timezone.utc).isoformat()


def _gen_id():
    return str(uuid.uuid4())


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


# ============ PLANES ============

@router.post("/planes")
async def crear_plan(plan: PlanEntrenamientoCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)

    doc = PlanEntrenamientoDB(
        coach_id=user["id"],
        nombre=plan.nombre,
        modelo_periodizacion=plan.modelo_periodizacion,
        deporte=plan.deporte,
        atleta_id=plan.atleta_id,
        duracion_semanas=plan.duracion_semanas,
        fecha_inicio=plan.fecha_inicio,
        fecha_competicion=plan.fecha_competicion
    )

    d = doc.model_dump()
    await db.planes_entrenamiento.insert_one(d)
    d.pop("_id", None)
    return d


@router.get("/planes")
async def listar_planes(request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    planes = await db.planes_entrenamiento.find(
        {"coach_id": user["id"]}, {"_id": 0}
    ).to_list(100)
    return {"planes": planes}


@router.get("/planes/{plan_id}/completo")
async def get_plan_completo(plan_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)

    async def _pick_best(candidates: list):
        """From a list of candidate V2 plans, return the one with most macros (most populated)."""
        if not candidates:
            return None
        best, best_count = None, -1
        for c in candidates:
            n = await db.macrociclos_v2.count_documents({"plan_id": c["id"]})
            if n > best_count:
                best, best_count = c, n
        return best

    # 1) Try exact match
    plan = await db.planes_entrenamiento.find_one(
        {"id": plan_id, "coach_id": user["id"]}, {"_id": 0}
    )
    # 2) Fallback: V2 plan migrated from V1 (maps via _v1_id) — pick best populated
    if not plan or await db.macrociclos_v2.count_documents({"plan_id": plan["id"]}) == 0:
        candidates = await db.planes_entrenamiento.find(
            {"_v1_id": plan_id, "coach_id": user["id"]}, {"_id": 0}
        ).to_list(20)
        best = await _pick_best(candidates)
        if best and await db.macrociclos_v2.count_documents({"plan_id": best["id"]}) > 0:
            plan = best
    # 3) Fallback: legacy V1 plan in `training_plans` collection — find by name
    if not plan or await db.macrociclos_v2.count_documents({"plan_id": plan["id"]}) == 0:
        v1_plan = await db.training_plans.find_one({"id": plan_id}, {"_id": 0})
        if v1_plan and v1_plan.get("name"):
            candidates = await db.planes_entrenamiento.find(
                {"nombre": v1_plan["name"], "coach_id": user["id"]}, {"_id": 0}
            ).to_list(20)
            best = await _pick_best(candidates)
            if best and await db.macrociclos_v2.count_documents({"plan_id": best["id"]}) > 0:
                plan = best
    if not plan:
        raise HTTPException(404, "Plan no encontrado")
    # Use the actual v2 plan id for downstream queries
    plan_id = plan["id"]

    macros = await db.macrociclos_v2.find({"plan_id": plan_id}, {"_id": 0}).to_list(100)

    macro_ids = [m["id"] for m in macros]
    mesos = await db.mesociclos_v2.find(
        {"macrociclo_id": {"$in": macro_ids}}, {"_id": 0}
    ).to_list(500)

    meso_ids = [m["id"] for m in mesos]
    micros = await db.microciclos_v2.find(
        {"mesociclo_id": {"$in": meso_ids}}, {"_id": 0}
    ).to_list(1000)

    micro_ids = [m["id"] for m in micros]
    sesiones = await db.sesiones_v2.find(
        {"microciclo_id": {"$in": micro_ids}}, {"_id": 0}
    ).to_list(5000)

    sesion_ids = [s["id"] for s in sesiones]
    ejercicios = await db.ejercicios_sesion.find(
        {"sesion_id": {"$in": sesion_ids}}, {"_id": 0}
    ).to_list(20000)

    capacidades = await db.capacidades_plan.find(
        {"plan_id": plan_id}, {"_id": 0}
    ).to_list(100)

    alertas = await validar_cambio_completo(db, plan_id)
    metricas = await calcular_metricas_plan(db, plan_id)

    return {
        "plan": plan,
        "macrociclos": macros,
        "mesociclos": mesos,
        "microciclos": micros,
        "sesiones": sesiones,
        "ejercicios": ejercicios,
        "capacidades": capacidades,
        "alertas": alertas,
        "metricas": metricas
    }


@router.get("/planes/{plan_id}/metricas")
async def get_plan_metricas(plan_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    plan = await db.planes_entrenamiento.find_one(
        {"id": plan_id, "coach_id": user["id"]}, {"_id": 0}
    )
    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    metricas = await calcular_metricas_plan(db, plan_id)

    macros = await db.macrociclos_v2.find({"plan_id": plan_id}, {"_id": 0}).to_list(50)
    niveles = {"macrociclos": [], "mesociclos": []}

    for macro in macros:
        niveles["macrociclos"].append({
            "id": macro["id"], "nombre": macro.get("nombre", ""),
            "vol": macro.get("vol_calculado", 0), "int": macro.get("int_calculado", 0),
            "carga": macro.get("carga_total", 0), "ACWR": macro.get("ACWR", 0),
            "progreso": macro.get("progreso_porcentaje", 0)
        })
        mesos = await db.mesociclos_v2.find(
            {"macrociclo_id": macro["id"]}, {"_id": 0}
        ).to_list(50)
        for m in mesos:
            niveles["mesociclos"].append({
                "id": m["id"], "nombre": m.get("nombre", ""),
                "vol": m.get("vol_calculado", 0), "int": m.get("int_calculado", 0),
                "den": m.get("den_calculado", 0), "tonelaje": m.get("tonelaje_kg", 0)
            })

    return {"resumen": metricas, "niveles": niveles}


@router.get("/planes/{plan_id}/alertas")
async def get_plan_alertas(plan_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    alertas = await validar_cambio_completo(db, plan_id)
    return {"alertas": alertas, "total": len(alertas)}


@router.get("/planes/{plan_id}/capacidades")
async def get_plan_capacidades(plan_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    caps = await db.capacidades_plan.find({"plan_id": plan_id}, {"_id": 0}).to_list(100)
    return {"capacidades": caps}


# ============ MACROCICLOS ============

@router.get("/macrociclos/{macro_id}")
async def get_macrociclo(macro_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    macro = await db.macrociclos_v2.find_one({"id": macro_id}, {"_id": 0})
    if not macro:
        raise HTTPException(404, "Macrociclo no encontrado")
    return macro


@router.put("/macrociclos/{macro_id}")
async def update_macrociclo(macro_id: str, data: Dict[str, Any], request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    macro = await db.macrociclos_v2.find_one({"id": macro_id}, {"_id": 0})
    if not macro:
        raise HTTPException(404, "Macrociclo no encontrado")

    allowed = [
        "nombre", "tipo", "color", "orden", "duracion_semanas",
        "fecha_inicio", "fecha_fin", "vol_objetivo", "int_objetivo", "den_objetivo"
    ]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        await db.macrociclos_v2.update_one({"id": macro_id}, {"$set": updates})

    resultado = await propagar_cambio(db, "macro", macro_id)
    return {"updated": True, "propagacion": resultado}


@router.post("/macrociclos/{macro_id}/mesociclos")
async def add_mesociclo_a_macro(macro_id: str, meso: MesocicloCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    macro = await db.macrociclos_v2.find_one({"id": macro_id}, {"_id": 0})
    if not macro:
        raise HTTPException(404, "Macrociclo no encontrado")

    existing = await db.mesociclos_v2.count_documents({"macrociclo_id": macro_id})

    doc = MesocicloDB(
        macrociclo_id=macro_id,
        nombre=meso.nombre,
        tipo=meso.tipo,
        orden=existing,
        duracion_semanas=meso.duracion_semanas,
        semana_descarga=meso.semana_descarga,
        reduccion_descarga=meso.reduccion_descarga,
        vol_objetivo=meso.vol_objetivo,
        int_objetivo=meso.int_objetivo,
        den_objetivo=meso.den_objetivo
    )
    d = doc.model_dump()
    await db.mesociclos_v2.insert_one(d)
    d.pop("_id", None)

    await propagar_cambio(db, "macro", macro_id)
    return d


# ============ MESOCICLOS ============

@router.get("/mesociclos/{meso_id}")
async def get_mesociclo(meso_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    meso = await db.mesociclos_v2.find_one({"id": meso_id}, {"_id": 0})
    if not meso:
        raise HTTPException(404, "Mesociclo no encontrado")
    return meso


@router.put("/mesociclos/{meso_id}")
async def update_mesociclo(meso_id: str, data: Dict[str, Any], request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    meso = await db.mesociclos_v2.find_one({"id": meso_id}, {"_id": 0})
    if not meso:
        raise HTTPException(404, "Mesociclo no encontrado")

    allowed = [
        "nombre", "tipo", "orden", "duracion_semanas",
        "semana_descarga", "reduccion_descarga",
        "vol_objetivo", "int_objetivo", "den_objetivo"
    ]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        await db.mesociclos_v2.update_one({"id": meso_id}, {"$set": updates})

    resultado = await propagar_cambio(db, "meso", meso_id)
    return {"updated": True, "propagacion": resultado}


@router.post("/mesociclos/{meso_id}/microciclos")
async def generar_microciclos(meso_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Genera microciclos automaticamente segun la duracion del mesociclo"""
    db = get_db(request)
    meso = await db.mesociclos_v2.find_one({"id": meso_id}, {"_id": 0})
    if not meso:
        raise HTTPException(404, "Mesociclo no encontrado")

    semanas = meso.get("duracion_semanas", 4)
    semana_descarga = meso.get("semana_descarga") or semanas

    # Calcular fecha base desde macrociclo
    macro = await db.macrociclos_v2.find_one({"id": meso["macrociclo_id"]}, {"_id": 0})
    base_date = None
    if macro and macro.get("fecha_inicio"):
        try:
            base_date = datetime.fromisoformat(macro["fecha_inicio"].replace("Z", "+00:00"))
            # Offset por mesociclos previos
            prev_mesos = await db.mesociclos_v2.find(
                {"macrociclo_id": meso["macrociclo_id"], "orden": {"$lt": meso.get("orden", 0)}},
                {"_id": 0}
            ).to_list(50)
            offset_weeks = sum(m.get("duracion_semanas", 0) for m in prev_mesos)
            base_date = base_date + timedelta(weeks=offset_weeks)
        except Exception:
            base_date = None

    micros_creados = []
    for i in range(1, semanas + 1):
        tipo = "restablecimiento" if i == semana_descarga else "corriente"
        if i == semanas - 1 and semana_descarga != semanas - 1 and semanas > 2:
            tipo = "carga"

        fecha_inicio = None
        fecha_fin = None
        if base_date:
            fi = base_date + timedelta(weeks=i - 1)
            ff = fi + timedelta(days=6)
            fecha_inicio = fi.isoformat()
            fecha_fin = ff.isoformat()

        doc = MicrocicloDB(
            mesociclo_id=meso_id,
            numero_semana=i,
            tipo=tipo,
            fecha_inicio=fecha_inicio,
            fecha_fin=fecha_fin
        )
        d = doc.model_dump()
        await db.microciclos_v2.insert_one(d)
        d.pop("_id", None)
        micros_creados.append(d)

    await propagar_cambio(db, "meso", meso_id)
    return {"microciclos": micros_creados}


# ============ MICROCICLOS ============

@router.get("/microciclos/{micro_id}")
async def get_microciclo(micro_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    micro = await db.microciclos_v2.find_one({"id": micro_id}, {"_id": 0})
    if not micro:
        raise HTTPException(404, "Microciclo no encontrado")
    return micro


@router.put("/microciclos/{micro_id}")
async def update_microciclo(micro_id: str, data: Dict[str, Any], request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    micro = await db.microciclos_v2.find_one({"id": micro_id}, {"_id": 0})
    if not micro:
        raise HTTPException(404, "Microciclo no encontrado")

    allowed = ["numero_semana", "tipo", "fecha_inicio", "fecha_fin"]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        await db.microciclos_v2.update_one({"id": micro_id}, {"$set": updates})

    resultado = await propagar_cambio(db, "micro", micro_id)
    return {"updated": True, "propagacion": resultado}


@router.post("/microciclos/{micro_id}/sesiones")
async def add_sesion(micro_id: str, sesion: SesionCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    micro = await db.microciclos_v2.find_one({"id": micro_id}, {"_id": 0})
    if not micro:
        raise HTTPException(404, "Microciclo no encontrado")

    doc = SesionDB(
        microciclo_id=micro_id,
        nombre=sesion.nombre,
        fecha=sesion.fecha,
        orden_dia=sesion.orden_dia,
        duracion_minutos=sesion.duracion_minutos,
        RPE_sesion=sesion.RPE_sesion,
        fc_media=sesion.fc_media,
        fc_max_alcanzada=sesion.fc_max_alcanzada,
        notas=sesion.notas,
        completada=sesion.completada
    )
    d = doc.model_dump()
    await db.sesiones_v2.insert_one(d)
    d.pop("_id", None)

    await propagar_cambio(db, "micro", micro_id)
    return d


# ============ SESIONES ============

@router.get("/sesiones/{sesion_id}")
async def get_sesion(sesion_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    sesion = await db.sesiones_v2.find_one({"id": sesion_id}, {"_id": 0})
    if not sesion:
        raise HTTPException(404, "Sesion no encontrada")

    ejercicios = await db.ejercicios_sesion.find(
        {"sesion_id": sesion_id}, {"_id": 0}
    ).sort("orden", 1).to_list(200)
    sesion["ejercicios"] = ejercicios
    return sesion


@router.put("/sesiones/{sesion_id}")
async def update_sesion(sesion_id: str, data: Dict[str, Any], request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    sesion = await db.sesiones_v2.find_one({"id": sesion_id}, {"_id": 0})
    if not sesion:
        raise HTTPException(404, "Sesion no encontrada")

    allowed = [
        "nombre", "fecha", "orden_dia", "duracion_minutos",
        "RPE_sesion", "fc_media", "fc_max_alcanzada", "notas", "completada"
    ]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        await db.sesiones_v2.update_one({"id": sesion_id}, {"$set": updates})

    resultado = await propagar_cambio(db, "sesion", sesion_id)

    # Si se completa sesion, registrar en historico_cargas
    if data.get("completada"):
        micro = await db.microciclos_v2.find_one({"id": sesion["microciclo_id"]}, {"_id": 0})
        if micro:
            meso = await db.mesociclos_v2.find_one({"id": micro["mesociclo_id"]}, {"_id": 0})
            if meso:
                macro = await db.macrociclos_v2.find_one({"id": meso["macrociclo_id"]}, {"_id": 0})
                if macro:
                    plan = await db.planes_entrenamiento.find_one({"id": macro["plan_id"]}, {"_id": 0})
                    if plan and plan.get("atleta_id"):
                        rpe = data.get("RPE_sesion", sesion.get("RPE_sesion", 0))
                        dur = data.get("duracion_minutos", sesion.get("duracion_minutos", 0))
                        await db.historico_cargas.insert_one({
                            "id": _gen_id(),
                            "atleta_id": plan["atleta_id"],
                            "fecha": data.get("fecha", sesion.get("fecha", _now())),
                            "carga_diaria": rpe * dur,
                            "fuente": sesion_id
                        })

    return {"updated": True, "propagacion": resultado}


@router.post("/sesiones/{sesion_id}/ejercicios")
async def add_ejercicio(sesion_id: str, ej: EjercicioSesionCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    sesion = await db.sesiones_v2.find_one({"id": sesion_id}, {"_id": 0})
    if not sesion:
        raise HTTPException(404, "Sesion no encontrada")

    existing = await db.ejercicios_sesion.count_documents({"sesion_id": sesion_id})
    tonelaje = ej.series * ej.repeticiones * ej.peso_kg
    vol_rel = ej.series * ej.repeticiones

    doc = EjercicioSesionDB(
        sesion_id=sesion_id,
        ejercicio_base_id=ej.ejercicio_base_id,
        nombre=ej.nombre,
        orden=existing,
        capacidad_tipo=ej.capacidad_tipo,
        series=ej.series,
        repeticiones=ej.repeticiones,
        peso_kg=ej.peso_kg,
        porcentaje_1RM=ej.porcentaje_1RM,
        RPE_ejercicio=ej.RPE_ejercicio,
        descanso_seg=ej.descanso_seg,
        tiempo_bajo_tension=ej.tiempo_bajo_tension,
        velocidad_ejecucion=ej.velocidad_ejecucion,
        ROM=ej.ROM,
        complejidad_coord=ej.complejidad_coord,
        tonelaje_calculado=round(tonelaje, 2),
        vol_relativo=round(vol_rel, 2)
    )
    d = doc.model_dump()
    await db.ejercicios_sesion.insert_one(d)
    d.pop("_id", None)

    resultado = await propagar_cambio(db, "ejercicio", d["id"])
    return {**d, "propagacion": resultado}


# ============ EJERCICIOS SESION ============

@router.put("/ejercicios-sesion/{ej_id}")
async def update_ejercicio(ej_id: str, data: Dict[str, Any], request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    ej = await db.ejercicios_sesion.find_one({"id": ej_id}, {"_id": 0})
    if not ej:
        raise HTTPException(404, "Ejercicio no encontrado")

    allowed = [
        "ejercicio_base_id", "nombre", "orden", "capacidad_tipo",
        "series", "repeticiones", "peso_kg", "porcentaje_1RM",
        "RPE_ejercicio", "descanso_seg", "tiempo_bajo_tension",
        "velocidad_ejecucion", "ROM", "complejidad_coord"
    ]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        await db.ejercicios_sesion.update_one({"id": ej_id}, {"$set": updates})

    resultado = await propagar_cambio(db, "ejercicio", ej_id)
    return {"updated": True, "propagacion": resultado}


@router.delete("/ejercicios-sesion/{ej_id}")
async def delete_ejercicio(ej_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    ej = await db.ejercicios_sesion.find_one({"id": ej_id}, {"_id": 0})
    if not ej:
        raise HTTPException(404, "Ejercicio no encontrado")

    sesion_id = ej["sesion_id"]
    await db.ejercicios_sesion.delete_one({"id": ej_id})

    resultado = await propagar_cambio(db, "sesion", sesion_id)
    return {"deleted": True, "propagacion": resultado}


# ============ EJERCICIOS BASE (CATALOGO) ============

@router.post("/ejercicios-base")
async def crear_ejercicio_base(ej: EjercicioBaseCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    doc = EjercicioBaseDB(
        coach_id=user["id"],
        nombre=ej.nombre,
        descripcion=ej.descripcion,
        grupo_muscular=ej.grupo_muscular,
        patron_movimiento=ej.patron_movimiento,
        capacidades_principales=ej.capacidades_principales,
        equipamiento=ej.equipamiento,
        nivel_dificultad=ej.nivel_dificultad,
        video_url=ej.video_url,
        imagen_url=ej.imagen_url
    )
    d = doc.model_dump()
    await db.ejercicios_base.insert_one(d)
    d.pop("_id", None)
    return d


@router.get("/ejercicios-base")
async def listar_ejercicios_base(request: Request, grupo_muscular: str = None, capacidad: str = None, user: dict = Depends(get_current_user)):
    db = get_db(request)
    query = {}
    if grupo_muscular:
        query["grupo_muscular"] = grupo_muscular
    if capacidad:
        query["capacidades_principales"] = capacidad
    ejercicios = await db.ejercicios_base.find(query, {"_id": 0}).to_list(500)
    return {"ejercicios": ejercicios}


# ============ CAPACIDADES PLAN ============

@router.post("/planes/{plan_id}/capacidades")
async def add_capacidad(plan_id: str, cap: CapacidadPlanCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    doc = CapacidadPlanDB(
        plan_id=plan_id,
        capacidad_tipo=cap.capacidad_tipo,
        MEV=cap.MEV, MAV=cap.MAV, MRV=cap.MRV
    )
    d = doc.model_dump()
    await db.capacidades_plan.insert_one(d)
    d.pop("_id", None)
    return d


@router.put("/capacidades-plan/{cap_id}")
async def update_capacidad(cap_id: str, data: Dict[str, Any], request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    allowed = ["MEV", "MAV", "MRV"]
    updates = {k: v for k, v in data.items() if k in allowed}
    if updates:
        await db.capacidades_plan.update_one({"id": cap_id}, {"$set": updates})
    cap = await db.capacidades_plan.find_one({"id": cap_id}, {"_id": 0})
    return cap


# ============ CAPACIDADES BLOQUE ============

@router.post("/capacidades-bloque")
async def add_capacidad_bloque(cap: CapacidadBloqueCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    doc = CapacidadBloqueDB(
        bloque_id=cap.bloque_id, nivel=cap.nivel,
        capacidad_tipo=cap.capacidad_tipo,
        vol_objetivo=cap.vol_objetivo, int_objetivo=cap.int_objetivo
    )
    d = doc.model_dump()
    await db.capacidades_bloque.insert_one(d)
    d.pop("_id", None)
    return d


# ============ ATLETAS V2 ============

@router.post("/atletas")
async def crear_atleta(atleta: AtletaCreate, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    doc = AtletaDB(
        coach_id=user["id"],
        nombre=atleta.nombre, edad=atleta.edad,
        peso_kg=atleta.peso_kg, altura_cm=atleta.altura_cm,
        fc_reposo=atleta.fc_reposo, fc_max=atleta.fc_max,
        deporte=atleta.deporte, nivel=atleta.nivel
    )
    d = doc.model_dump()
    await db.atletas_v2.insert_one(d)
    d.pop("_id", None)
    return d


@router.get("/atletas/{atleta_id}")
async def get_atleta(atleta_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = get_db(request)
    atleta = await db.atletas_v2.find_one({"id": atleta_id}, {"_id": 0})
    if not atleta:
        raise HTTPException(404, "Atleta no encontrado")
    return atleta


@router.get("/atletas/{atleta_id}/historico-cargas")
async def get_historico(atleta_id: str, request: Request, dias: int = 28, user: dict = Depends(get_current_user)):
    db = get_db(request)
    desde = (datetime.now(timezone.utc) - timedelta(days=dias)).isoformat()
    cargas = await db.historico_cargas.find(
        {"atleta_id": atleta_id, "fecha": {"$gte": desde}}, {"_id": 0}
    ).sort("fecha", 1).to_list(dias * 5)
    return {"cargas": cargas, "dias": dias}


@router.get("/planes/{plan_id}/historico")
async def get_plan_historico(plan_id: str, request: Request, dias: int = 200, user: dict = Depends(get_current_user)):
    """Get historico_cargas for a plan's athlete - used for ACWR chart"""
    db = get_db(request)
    plan = await db.planes_entrenamiento.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        raise HTTPException(404, "Plan no encontrado")

    atleta_id = plan.get("atleta_id")
    if not atleta_id:
        # Build from sesiones if no atleta
        sesiones = []
        macros = await db.macrociclos_v2.find({"plan_id": plan_id}, {"_id": 0}).to_list(50)
        for macro in macros:
            mesos = await db.mesociclos_v2.find({"macrociclo_id": macro["id"]}, {"_id": 0}).to_list(50)
            for meso in mesos:
                micros = await db.microciclos_v2.find({"mesociclo_id": meso["id"]}, {"_id": 0}).to_list(50)
                for micro in micros:
                    ss = await db.sesiones_v2.find({"microciclo_id": micro["id"]}, {"_id": 0}).to_list(50)
                    for s in ss:
                        if s.get("carga_sesion", 0) > 0 and s.get("fecha"):
                            sesiones.append({
                                "id": s["id"],
                                "atleta_id": "",
                                "fecha": s["fecha"],
                                "carga_diaria": s["carga_sesion"],
                                "fuente": s["id"]
                            })
        sesiones.sort(key=lambda x: x.get("fecha", ""))
        return {"cargas": sesiones, "dias": dias, "source": "sesiones"}

    cargas = await db.historico_cargas.find(
        {"atleta_id": atleta_id}, {"_id": 0}
    ).sort("fecha", 1).to_list(dias * 5)
    return {"cargas": cargas, "dias": dias, "source": "historico"}


# ============ SYNC V1 → V2 ============

@router.post("/sync-from-v1/{v1_plan_id}")
async def sync_v1_to_v2(v1_plan_id: str, request: Request, user: dict = Depends(get_current_user)):
    """
    Convierte un plan V1 (training_plans con nested macrocycles) en colecciones V2 normalizadas.
    Si ya existe sincronizacion, retorna el plan_id V2 existente.
    """
    db = get_db(request)

    v1_plan = await db.training_plans.find_one(
        {"id": v1_plan_id, "coach_id": user["id"]}, {"_id": 0}
    )
    if not v1_plan:
        raise HTTPException(404, "Plan V1 no encontrado")

    # Check if already synced
    existing = await db.planes_entrenamiento.find_one(
        {"_v1_id": v1_plan_id, "coach_id": user["id"]}, {"_id": 0}
    )
    if existing:
        # Re-calculate metrics and return
        metricas = await calcular_metricas_plan(db, existing["id"])
        alertas = await validar_cambio_completo(db, existing["id"])
        return {
            "synced": True,
            "plan_id": existing["id"],
            "v1_id": v1_plan_id,
            "already_existed": True,
            "metricas": metricas,
            "alertas": alertas
        }

    # Create V2 plan
    plan_id = _gen_id()
    plan_doc = {
        "id": plan_id,
        "coach_id": user["id"],
        "_v1_id": v1_plan_id,
        "nombre": v1_plan.get("name", "Plan"),
        "modelo_periodizacion": v1_plan.get("model", "atr"),
        "deporte": v1_plan.get("sport", "other"),
        "atleta_id": v1_plan.get("athlete_id"),
        "duracion_semanas": v1_plan.get("total_weeks", 52),
        "fecha_inicio": v1_plan.get("start_date", _now()),
        "fecha_competicion": v1_plan.get("main_competition_date"),
        "created_at": _now(),
        "updated_at": _now()
    }
    await db.planes_entrenamiento.insert_one(plan_doc)

    stats = {"macros": 0, "mesos": 0, "micros": 0, "sesiones": 0, "ejercicios": 0}
    abs_week = 0

    for macro_data in v1_plan.get("macrocycles", []):
        macro_id = _gen_id()
        macro_start = macro_data.get("start_date", v1_plan.get("start_date", ""))
        macro_end = macro_data.get("end_date", "")
        phase_id = macro_data.get("phase", "prep_general")
        if isinstance(phase_id, dict):
            phase_id = phase_id.get("id", "prep_general")

        macro_doc = {
            "id": macro_id,
            "plan_id": plan_id,
            "nombre": macro_data.get("name", "Macrociclo"),
            "tipo": phase_id,
            "color": _phase_color(phase_id),
            "orden": stats["macros"],
            "duracion_semanas": macro_data.get("weeks", 4),
            "fecha_inicio": macro_start,
            "fecha_fin": macro_end,
            "vol_objetivo": macro_data.get("volume_percent"),
            "int_objetivo": macro_data.get("intensity_percent"),
            "den_objetivo": None,
            "vol_calculado": 0, "int_calculado": 0,
            "carga_total": 0, "ACWR": 0, "RPE_promedio": 0,
            "alerta": None, "progreso_porcentaje": 0
        }
        await db.macrociclos_v2.insert_one(macro_doc)
        stats["macros"] += 1

        for meso_data in macro_data.get("mesocycles", []):
            meso_id = _gen_id()
            meso_type = meso_data.get("type", "basico_desarrollador")
            if isinstance(meso_type, dict):
                meso_type = meso_type.get("id", "basico_desarrollador")
            n_micros = len(meso_data.get("microcycles", []))

            meso_doc = {
                "id": meso_id,
                "macrociclo_id": macro_id,
                "nombre": meso_data.get("name", "Mesociclo"),
                "tipo": meso_type,
                "orden": stats["mesos"],
                "duracion_semanas": meso_data.get("weeks", n_micros or 4),
                "semana_descarga": n_micros if n_micros > 0 else None,
                "reduccion_descarga": 0.4,
                "vol_objetivo": meso_data.get("volume_percent"),
                "int_objetivo": meso_data.get("intensity_percent"),
                "den_objetivo": None,
                "vol_calculado": 0, "int_calculado": 0, "den_calculado": 0,
                "carga_total": 0, "ACWR": 0, "tonelaje_kg": 0, "RPE_promedio": 0
            }
            await db.mesociclos_v2.insert_one(meso_doc)
            stats["mesos"] += 1

            for micro_data in meso_data.get("microcycles", []):
                micro_id = _gen_id()
                abs_week += 1
                micro_type = micro_data.get("type", "corriente")
                if isinstance(micro_type, dict):
                    micro_type = micro_type.get("id", "corriente")

                micro_doc = {
                    "id": micro_id,
                    "mesociclo_id": meso_id,
                    "numero_semana": abs_week,
                    "tipo": micro_type,
                    "fecha_inicio": micro_data.get("startDate"),
                    "fecha_fin": None,
                    "vol_calculado": 0, "int_calculado": 0, "den_calculado": 0,
                    "carga_total": 0, "carga_aguda": 0, "carga_cronica": 0,
                    "ACWR": 0, "tonelaje_kg": 0, "RPE_promedio": 0
                }
                await db.microciclos_v2.insert_one(micro_doc)
                stats["micros"] += 1

                for ses_data in micro_data.get("sessions", []):
                    sesion_id = _gen_id()
                    dur = ses_data.get("duration_minutes") or ses_data.get("duration") or 60
                    rpe = ses_data.get("rpe") or ses_data.get("RPE_sesion") or 0
                    intensity_str = ses_data.get("intensity", "medium")
                    if isinstance(intensity_str, str):
                        rpe = rpe or {"high": 8, "medium": 6, "low": 4, "very_high": 9}.get(intensity_str, 6)

                    # If still no RPE, derive from phase + micro type
                    if not rpe:
                        phase_rpe = {"accumulation": 5, "prep_general": 5, "transformation": 7,
                                     "prep_specific": 7, "realization": 8, "competitive": 8,
                                     "transition": 4, "recovery": 3}.get(phase_id, 6)
                        micro_adj = {"carga": 1, "choque": 1.5, "restablecimiento": -2,
                                     "competitivo": 1, "aproximacion": 0}.get(micro_type, 0)
                        rpe = max(2, min(10, phase_rpe + micro_adj))

                    sesion_doc = {
                        "id": sesion_id,
                        "microciclo_id": micro_id,
                        "nombre": ses_data.get("name") or ses_data.get("dayName") or "Sesion",
                        "fecha": ses_data.get("date"),
                        "orden_dia": ses_data.get("day") or 1,
                        "duracion_minutos": dur,
                        "RPE_sesion": float(rpe),
                        "carga_sesion": round(float(rpe) * dur, 2),
                        "vol_calculado": 0, "int_calculado": 0, "den_calculado": 0,
                        "fc_media": None, "fc_max_alcanzada": None,
                        "TRIMP": 0, "tonelaje": 0,
                        "notas": ses_data.get("notes"),
                        "completada": ses_data.get("status") == "completed",
                        "_v1_session_id": ses_data.get("id")
                    }
                    await db.sesiones_v2.insert_one(sesion_doc)
                    stats["sesiones"] += 1

                    # Extract exercises from detailed_data
                    detailed = ses_data.get("detailed_data") or ses_data.get("sessionData") or {}
                    fases = detailed.get("fases", {})
                    ej_order = 0
                    for fase_key, fase_val in fases.items():
                        for act in fase_val.get("actividades", []):
                            ej_id = _gen_id()
                            series = int(act.get("series", 0) or 0)
                            reps = int(act.get("repeticiones", 0) or 0)
                            peso = float(act.get("peso", 0) or act.get("peso_kg", 0) or 0)
                            p1rm = float(act.get("intensidad", 0) or 0)
                            rpe_ej = float(act.get("rpe", 0) or act.get("RPE_ejercicio", 0) or 0)
                            descanso = int(float(act.get("recuperacion", 2) or 2) * 60)

                            cap_tipo = _detect_capacity(act)

                            ej_doc = {
                                "id": ej_id,
                                "sesion_id": sesion_id,
                                "ejercicio_base_id": None,
                                "nombre": act.get("nombre") or act.get("name") or f"Ejercicio {ej_order + 1}",
                                "orden": ej_order,
                                "capacidad_tipo": cap_tipo,
                                "series": series,
                                "repeticiones": reps,
                                "peso_kg": peso,
                                "porcentaje_1RM": p1rm,
                                "RPE_ejercicio": rpe_ej,
                                "descanso_seg": descanso,
                                "tiempo_bajo_tension": 0,
                                "velocidad_ejecucion": None,
                                "ROM": None,
                                "complejidad_coord": None,
                                "tonelaje_calculado": round(series * reps * peso, 2),
                                "vol_relativo": round(series * reps, 2)
                            }
                            await db.ejercicios_sesion.insert_one(ej_doc)
                            stats["ejercicios"] += 1
                            ej_order += 1

    # Run full cascade propagation for all macros
    macros = await db.macrociclos_v2.find({"plan_id": plan_id}, {"_id": 0}).to_list(50)
    for macro in macros:
        await propagar_cambio(db, "macro", macro["id"])

    metricas = await calcular_metricas_plan(db, plan_id)
    alertas = await validar_cambio_completo(db, plan_id)

    return {
        "synced": True,
        "plan_id": plan_id,
        "v1_id": v1_plan_id,
        "already_existed": False,
        "stats": stats,
        "metricas": metricas,
        "alertas": alertas
    }


def _phase_color(phase_id: str) -> str:
    colors = {
        "prep_general": "#3B82F6", "prep_specific": "#8B5CF6",
        "precompetitive": "#F59E0B", "competitive": "#10B981",
        "transition": "#6B7280", "accumulation": "#3B82F6",
        "transformation": "#F59E0B", "realization": "#10B981",
        "recovery": "#6B7280"
    }
    return colors.get(phase_id, "#3B82F6")


def _detect_capacity(act: dict) -> str:
    """Detect capacity type from activity data"""
    nombre = (act.get("nombre") or act.get("name") or "").lower()
    tipo = (act.get("capacidad_tipo") or act.get("tipo") or "").lower()

    if tipo and tipo in ["fuerza_maxima", "fuerza_explosiva", "fuerza_resistencia",
                         "resistencia_aerobica", "resistencia_anaerobica",
                         "velocidad", "flexibilidad", "coordinacion", "potencia"]:
        return tipo

    if any(w in nombre for w in ["sentadilla", "press", "peso muerto", "remo", "curl", "fuerza"]):
        return "fuerza_maxima"
    if any(w in nombre for w in ["sprint", "velocidad", "agilidad"]):
        return "velocidad"
    if any(w in nombre for w in ["carrera", "aerob", "continua", "trote", "cardio"]):
        return "resistencia_aerobica"
    if any(w in nombre for w in ["salto", "pliom", "potencia", "explosiv"]):
        return "fuerza_explosiva"
    if any(w in nombre for w in ["estir", "flex", "movil"]):
        return "flexibilidad"
    if any(w in nombre for w in ["coord", "equilib", "tecnic"]):
        return "coordinacion"

    return "fuerza_maxima"


# ============ SEED ENDPOINT ============

@router.post("/seed")
async def run_seed(request: Request, user: dict = Depends(get_current_user)):
    """Ejecuta el seed de datos demo"""
    db = get_db(request)
    from migrations.seed_demo import ejecutar_seed
    result = await ejecutar_seed(db, coach_id=user["id"])
    return result


# ============ PROPAGACION MANUAL ============

class PropagacionRequest(BaseModel):
    nivel: str
    entity_id: str

@router.post("/propagar")
async def trigger_propagacion(req: PropagacionRequest, request: Request, user: dict = Depends(get_current_user)):
    """Trigger manual de propagacion en cascada"""
    db = get_db(request)
    resultado = await propagar_cambio(db, req.nivel, req.entity_id)
    return resultado


# ============ INDICES ============

async def crear_indices(db):
    """Crea indices necesarios para rendimiento"""
    try:
        await db.planes_entrenamiento.create_index("id", unique=True, sparse=True)
        await db.planes_entrenamiento.create_index("coach_id")

        await db.macrociclos_v2.create_index("id", unique=True)
        await db.macrociclos_v2.create_index("plan_id")

        await db.mesociclos_v2.create_index("id", unique=True)
        await db.mesociclos_v2.create_index("macrociclo_id")

        await db.microciclos_v2.create_index("id", unique=True)
        await db.microciclos_v2.create_index("mesociclo_id")

        await db.sesiones_v2.create_index("id", unique=True)
        await db.sesiones_v2.create_index("microciclo_id")

        await db.ejercicios_sesion.create_index("id", unique=True)
        await db.ejercicios_sesion.create_index("sesion_id")

        await db.ejercicios_base.create_index("id", unique=True)

        await db.capacidades_plan.create_index("id", unique=True)
        await db.capacidades_plan.create_index([("plan_id", 1), ("capacidad_tipo", 1)])

        await db.capacidades_bloque.create_index("id", unique=True)

        await db.historico_cargas.create_index("id", unique=True)
        await db.historico_cargas.create_index([("atleta_id", 1), ("fecha", -1)])

        await db.atletas_v2.create_index("id", unique=True)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Index creation warning: {e}")
