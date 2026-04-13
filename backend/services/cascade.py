"""
Motor de propagacion en cascada.
Calcula metricas de abajo hacia arriba:
  Ejercicio -> Sesion -> Microciclo -> Mesociclo -> Macrociclo -> Plan

Regla: Si existe _objetivo, se respeta. Si no, se muestra _calculado.
"""
import math
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


# ============ NIVEL 1: EJERCICIO ============

async def calcular_metricas_ejercicio(db, ejercicio_id: str) -> dict:
    """Calcula tonelaje y vol_relativo de un ejercicio"""
    ej = await db.ejercicios_sesion.find_one({"id": ejercicio_id}, {"_id": 0})
    if not ej:
        return {}

    series = ej.get("series", 0)
    reps = ej.get("repeticiones", 0)
    peso = ej.get("peso_kg", 0)

    tonelaje = series * reps * peso
    vol_relativo = series * reps

    await db.ejercicios_sesion.update_one(
        {"id": ejercicio_id},
        {"$set": {
            "tonelaje_calculado": round(tonelaje, 2),
            "vol_relativo": round(vol_relativo, 2)
        }}
    )

    return {
        "tonelaje_calculado": round(tonelaje, 2),
        "vol_relativo": round(vol_relativo, 2)
    }


# ============ NIVEL 2: SESION ============

async def calcular_metricas_sesion(db, sesion_id: str) -> dict:
    """
    carga_sesion = RPE x duracion_minutos
    vol_calculado = sum(vol_relativo de ejercicios)
    int_calculado = promedio(%1RM o RPE de ejercicios)
    den_calculado = vol_calculado / duracion_minutos
    tonelaje = sum(series x reps x peso_kg)
    TRIMP = f(fc_media, fc_reposo, fc_max, duracion)
    """
    sesion = await db.sesiones_v2.find_one({"id": sesion_id}, {"_id": 0})
    if not sesion:
        return {}

    ejercicios = await db.ejercicios_sesion.find(
        {"sesion_id": sesion_id}, {"_id": 0}
    ).to_list(200)

    duracion = sesion.get("duracion_minutos", 1) or 1
    rpe = sesion.get("RPE_sesion", 0) or 0

    carga_sesion = rpe * duracion

    vol_total = sum(e.get("vol_relativo", 0) for e in ejercicios)
    tonelaje = sum(e.get("tonelaje_calculado", 0) for e in ejercicios)

    intensidades = []
    for e in ejercicios:
        p1rm = e.get("porcentaje_1RM", 0)
        rpe_ej = e.get("RPE_ejercicio", 0)
        if p1rm > 0:
            intensidades.append(p1rm)
        elif rpe_ej > 0:
            intensidades.append(rpe_ej * 10)

    int_calc = (sum(intensidades) / len(intensidades)) if intensidades else (rpe * 10 if rpe > 0 else 0)
    den_calc = (vol_total / duracion) if (duracion > 0 and vol_total > 0) else (rpe / duracion if duracion > 0 and rpe > 0 else 0)

    trimp = _calcular_trimp(sesion, duracion)

    updates = {
        "carga_sesion": round(carga_sesion, 2),
        "vol_calculado": round(vol_total, 2),
        "int_calculado": round(int_calc, 2),
        "den_calculado": round(den_calc, 4),
        "tonelaje": round(tonelaje, 2),
        "TRIMP": round(trimp, 2)
    }

    await db.sesiones_v2.update_one({"id": sesion_id}, {"$set": updates})
    return updates


def _calcular_trimp(sesion: dict, duracion: float) -> float:
    """TRIMP = duracion * delta_HR * e^(b * delta_HR)
    donde delta_HR = (fc_media - fc_reposo) / (fc_max - fc_reposo)
    b = 1.92 (hombres) o 1.67 (mujeres) - usamos 1.92 por defecto
    """
    fc_media = sesion.get("fc_media", 0) or 0
    if fc_media <= 0:
        return 0

    fc_reposo = 60
    fc_max = 190

    if fc_max <= fc_reposo:
        return 0

    delta_hr = (fc_media - fc_reposo) / (fc_max - fc_reposo)
    delta_hr = max(0, min(1, delta_hr))
    b = 1.92
    trimp = duracion * delta_hr * math.exp(b * delta_hr)
    return trimp


# ============ NIVEL 3: MICROCICLO ============

async def calcular_metricas_microciclo(db, microciclo_id: str) -> dict:
    """
    vol_calculado = promedio(vol de sesiones)
    int_calculado = promedio(int de sesiones)
    den_calculado = promedio(den de sesiones)
    tonelaje_kg = sum(tonelaje de sesiones)
    RPE_promedio = promedio(RPE_sesion)
    carga_total = sum(carga_sesion)
    ACWR = carga_aguda / carga_cronica
    """
    micro = await db.microciclos_v2.find_one({"id": microciclo_id}, {"_id": 0})
    if not micro:
        return {}

    sesiones = await db.sesiones_v2.find(
        {"microciclo_id": microciclo_id}, {"_id": 0}
    ).to_list(50)

    n = len(sesiones) or 1

    vol_calc = sum(s.get("vol_calculado", 0) for s in sesiones) / n
    int_calc = sum(s.get("int_calculado", 0) for s in sesiones) / n
    den_calc = sum(s.get("den_calculado", 0) for s in sesiones) / n
    tonelaje = sum(s.get("tonelaje", 0) for s in sesiones)
    rpe_prom = sum(s.get("RPE_sesion", 0) for s in sesiones) / n
    carga_total = sum(s.get("carga_sesion", 0) for s in sesiones)

    acwr_data = await _calcular_acwr_microciclo(db, micro)

    updates = {
        "vol_calculado": round(vol_calc, 2),
        "int_calculado": round(int_calc, 2),
        "den_calculado": round(den_calc, 4),
        "tonelaje_kg": round(tonelaje, 2),
        "RPE_promedio": round(rpe_prom, 2),
        "carga_total": round(carga_total, 2),
        "carga_aguda": round(acwr_data.get("carga_aguda", 0), 2),
        "carga_cronica": round(acwr_data.get("carga_cronica", 0), 2),
        "ACWR": round(acwr_data.get("ACWR", 0), 2)
    }

    await db.microciclos_v2.update_one({"id": microciclo_id}, {"$set": updates})
    return updates


async def _calcular_acwr_microciclo(db, micro: dict) -> dict:
    """Calcula ACWR usando historico_cargas del atleta"""
    meso = await db.mesociclos_v2.find_one(
        {"id": micro.get("mesociclo_id")}, {"_id": 0}
    )
    if not meso:
        return {"carga_aguda": 0, "carga_cronica": 0, "ACWR": 0}

    macro = await db.macrociclos_v2.find_one(
        {"id": meso.get("macrociclo_id")}, {"_id": 0}
    )
    if not macro:
        return {"carga_aguda": 0, "carga_cronica": 0, "ACWR": 0}

    plan = await db.planes_entrenamiento.find_one(
        {"id": macro.get("plan_id")}, {"_id": 0}
    )
    if not plan or not plan.get("atleta_id"):
        return {"carga_aguda": 0, "carga_cronica": 0, "ACWR": 0}

    atleta_id = plan["atleta_id"]
    now = datetime.now(timezone.utc)

    cargas_28d = await db.historico_cargas.find(
        {
            "atleta_id": atleta_id,
            "fecha": {"$gte": (now - timedelta(days=28)).isoformat()}
        },
        {"_id": 0}
    ).sort("fecha", -1).to_list(28)

    if not cargas_28d:
        return {"carga_aguda": 0, "carga_cronica": 0, "ACWR": 0}

    cargas_7d = [c for c in cargas_28d[:7]]

    aguda = sum(c.get("carga_diaria", 0) for c in cargas_7d) / max(len(cargas_7d), 1)
    cronica = sum(c.get("carga_diaria", 0) for c in cargas_28d) / max(len(cargas_28d), 1)

    acwr = (aguda / cronica) if cronica > 0 else 0

    return {"carga_aguda": aguda, "carga_cronica": cronica, "ACWR": acwr}


# ============ NIVEL 4: MESOCICLO ============

async def calcular_metricas_mesociclo(db, mesociclo_id: str) -> dict:
    """
    vol_calculado = promedio(vol de microciclos, excluye descarga)
    int_calculado = promedio(int de microciclos)
    tonelaje_kg = sum(tonelaje de microciclos)
    RPE_promedio = promedio(RPE de microciclos)
    ACWR = promedio(ACWR de microciclos)
    """
    meso = await db.mesociclos_v2.find_one({"id": mesociclo_id}, {"_id": 0})
    if not meso:
        return {}

    micros = await db.microciclos_v2.find(
        {"mesociclo_id": mesociclo_id}, {"_id": 0}
    ).to_list(50)

    semana_descarga = meso.get("semana_descarga")

    micros_sin_descarga = [
        m for m in micros
        if m.get("tipo") != "restablecimiento" and m.get("numero_semana") != semana_descarga
    ]
    micros_calculo_vol = micros_sin_descarga if micros_sin_descarga else micros

    n_vol = len(micros_calculo_vol) or 1
    n_all = len(micros) or 1

    vol_calc = sum(m.get("vol_calculado", 0) for m in micros_calculo_vol) / n_vol
    int_calc = sum(m.get("int_calculado", 0) for m in micros) / n_all
    den_calc = sum(m.get("den_calculado", 0) for m in micros) / n_all
    tonelaje = sum(m.get("tonelaje_kg", 0) for m in micros)
    rpe_prom = sum(m.get("RPE_promedio", 0) for m in micros) / n_all
    carga_total = sum(m.get("carga_total", 0) for m in micros)

    acwr_values = [m.get("ACWR", 0) for m in micros if m.get("ACWR", 0) > 0]
    acwr = (sum(acwr_values) / len(acwr_values)) if acwr_values else 0

    updates = {
        "vol_calculado": round(vol_calc, 2),
        "int_calculado": round(int_calc, 2),
        "den_calculado": round(den_calc, 4),
        "carga_total": round(carga_total, 2),
        "tonelaje_kg": round(tonelaje, 2),
        "RPE_promedio": round(rpe_prom, 2),
        "ACWR": round(acwr, 2)
    }

    await db.mesociclos_v2.update_one({"id": mesociclo_id}, {"$set": updates})
    return updates


# ============ NIVEL 5: MACROCICLO ============

async def calcular_metricas_macrociclo(db, macrociclo_id: str) -> dict:
    """
    vol_calculado = promedio ponderado(vol de mesociclos por duracion)
    int_calculado = promedio ponderado(int de mesociclos por duracion)
    carga_total = sum(carga_total de mesociclos)
    ACWR = ultimo ACWR del microciclo mas reciente
    progreso = sesiones completadas / sesiones totales * 100
    """
    macro = await db.macrociclos_v2.find_one({"id": macrociclo_id}, {"_id": 0})
    if not macro:
        return {}

    mesos = await db.mesociclos_v2.find(
        {"macrociclo_id": macrociclo_id}, {"_id": 0}
    ).to_list(50)

    total_semanas = sum(m.get("duracion_semanas", 1) for m in mesos) or 1
    vol_ponderado = sum(
        m.get("vol_calculado", 0) * m.get("duracion_semanas", 1) for m in mesos
    ) / total_semanas
    int_ponderado = sum(
        m.get("int_calculado", 0) * m.get("duracion_semanas", 1) for m in mesos
    ) / total_semanas
    carga_total = sum(m.get("carga_total", 0) for m in mesos)
    rpe_prom_vals = [m.get("RPE_promedio", 0) for m in mesos if m.get("RPE_promedio", 0) > 0]
    rpe_prom = (sum(rpe_prom_vals) / len(rpe_prom_vals)) if rpe_prom_vals else 0

    ultimo_acwr = 0
    all_micros = []
    for m in mesos:
        micros = await db.microciclos_v2.find(
            {"mesociclo_id": m["id"]}, {"_id": 0}
        ).sort("numero_semana", -1).to_list(50)
        all_micros.extend(micros)
        if micros and micros[0].get("ACWR", 0) > 0:
            ultimo_acwr = micros[0]["ACWR"]

    total_sesiones = 0
    completadas = 0
    for mic in all_micros:
        sesiones = await db.sesiones_v2.find(
            {"microciclo_id": mic["id"]}, {"_id": 0}
        ).to_list(100)
        total_sesiones += len(sesiones)
        completadas += sum(1 for s in sesiones if s.get("completada"))

    progreso = (completadas / total_sesiones * 100) if total_sesiones > 0 else 0

    alertas = await _detectar_desbalances_macro(db, macrociclo_id, mesos)
    alerta_text = alertas[0].get("mensaje", "") if alertas else None

    updates = {
        "vol_calculado": round(vol_ponderado, 2),
        "int_calculado": round(int_ponderado, 2),
        "carga_total": round(carga_total, 2),
        "ACWR": round(ultimo_acwr, 2),
        "RPE_promedio": round(rpe_prom, 2),
        "progreso_porcentaje": round(progreso, 2),
        "alerta": alerta_text
    }

    await db.macrociclos_v2.update_one({"id": macrociclo_id}, {"$set": updates})
    return {**updates, "alertas_detectadas": alertas}


async def _detectar_desbalances_macro(db, macrociclo_id: str, mesos: list) -> list:
    """Detecta desbalances a nivel de macrociclo"""
    alertas = []
    for m in mesos:
        micros = await db.microciclos_v2.find(
            {"mesociclo_id": m["id"]}, {"_id": 0}
        ).to_list(50)
        for mic in micros:
            if mic.get("ACWR", 0) > 1.5:
                alertas.append({
                    "tipo": "acwr_alto",
                    "severidad": "error",
                    "mensaje": f"ACWR={mic['ACWR']:.2f} en semana {mic.get('numero_semana', '?')} - Riesgo de lesion",
                    "bloque_id": mic["id"],
                    "nivel": "micro"
                })
            elif mic.get("ACWR", 0) > 0 and mic.get("ACWR", 0) < 0.8:
                alertas.append({
                    "tipo": "acwr_bajo",
                    "severidad": "advertencia",
                    "mensaje": f"ACWR={mic['ACWR']:.2f} en semana {mic.get('numero_semana', '?')} - Subcarga",
                    "bloque_id": mic["id"],
                    "nivel": "micro"
                })
    return alertas


# ============ NIVEL 6: PLAN ============

async def calcular_metricas_plan(db, plan_id: str) -> dict:
    """
    Agrega metricas de todos los macrociclos del plan.
    Retorna resumen global.
    """
    plan = await db.planes_entrenamiento.find_one({"id": plan_id}, {"_id": 0})
    if not plan:
        return {}

    macros = await db.macrociclos_v2.find(
        {"plan_id": plan_id}, {"_id": 0}
    ).to_list(50)

    total_semanas = sum(m.get("duracion_semanas", 0) for m in macros)
    total_mesos = 0
    total_sesiones = 0
    total_completadas = 0
    tonelaje_global = 0

    for macro in macros:
        mesos = await db.mesociclos_v2.find(
            {"macrociclo_id": macro["id"]}, {"_id": 0}
        ).to_list(50)
        total_mesos += len(mesos)

        for m in mesos:
            tonelaje_global += m.get("tonelaje_kg", 0)
            micros = await db.microciclos_v2.find(
                {"mesociclo_id": m["id"]}, {"_id": 0}
            ).to_list(50)
            for mic in micros:
                sesiones = await db.sesiones_v2.find(
                    {"microciclo_id": mic["id"]}, {"_id": 0}
                ).to_list(100)
                total_sesiones += len(sesiones)
                total_completadas += sum(1 for s in sesiones if s.get("completada"))

    progreso = (total_completadas / total_sesiones * 100) if total_sesiones > 0 else 0

    capacidades = await db.capacidades_plan.find(
        {"plan_id": plan_id}, {"_id": 0}
    ).to_list(100)

    return {
        "plan_id": plan_id,
        "total_semanas": total_semanas,
        "total_macrociclos": len(macros),
        "total_mesociclos": total_mesos,
        "total_sesiones": total_sesiones,
        "sesiones_completadas": total_completadas,
        "tonelaje_global_kg": round(tonelaje_global, 2),
        "progreso_global": round(progreso, 2),
        "capacidades_activas": len(capacidades)
    }


# ============ ACTUALIZAR CAPACIDADES ============

async def actualizar_capacidades_semana(db, plan_id: str):
    """Recalcula series_actuales_semana para cada capacidad del plan"""
    capacidades = await db.capacidades_plan.find(
        {"plan_id": plan_id}, {"_id": 0}
    ).to_list(100)

    macros = await db.macrociclos_v2.find({"plan_id": plan_id}, {"_id": 0}).to_list(50)

    for cap in capacidades:
        tipo = cap["capacidad_tipo"]
        total_series = 0
        n_semanas = 0

        for macro in macros:
            mesos = await db.mesociclos_v2.find(
                {"macrociclo_id": macro["id"]}, {"_id": 0}
            ).to_list(50)
            for m in mesos:
                micros = await db.microciclos_v2.find(
                    {"mesociclo_id": m["id"]}, {"_id": 0}
                ).to_list(50)
                for mic in micros:
                    n_semanas += 1
                    sesiones = await db.sesiones_v2.find(
                        {"microciclo_id": mic["id"]}, {"_id": 0}
                    ).to_list(100)
                    for s in sesiones:
                        ejercicios = await db.ejercicios_sesion.find(
                            {"sesion_id": s["id"], "capacidad_tipo": tipo}, {"_id": 0}
                        ).to_list(200)
                        total_series += sum(e.get("series", 0) for e in ejercicios)

        series_semana = (total_series / n_semanas) if n_semanas > 0 else 0
        await db.capacidades_plan.update_one(
            {"id": cap["id"]},
            {"$set": {"series_actuales_semana": round(series_semana, 2)}}
        )


# ============ TRIGGER MAESTRO ============

async def propagar_cambio(db, nivel: str, entity_id: str) -> dict:
    """
    Ejecuta la cadena completa de propagacion hacia arriba desde el nivel dado.
    
    nivel: 'ejercicio' | 'sesion' | 'micro' | 'meso' | 'macro'
    """
    resultado = {
        "niveles_actualizados": [],
        "alertas_generadas": [],
        "metricas": {}
    }

    if nivel == "ejercicio":
        m = await calcular_metricas_ejercicio(db, entity_id)
        resultado["metricas"]["ejercicio"] = m
        resultado["niveles_actualizados"].append("ejercicio")

        ej = await db.ejercicios_sesion.find_one({"id": entity_id}, {"_id": 0})
        if ej:
            entity_id = ej["sesion_id"]
            nivel = "sesion"

    if nivel == "sesion":
        m = await calcular_metricas_sesion(db, entity_id)
        resultado["metricas"]["sesion"] = m
        resultado["niveles_actualizados"].append("sesion")

        sesion = await db.sesiones_v2.find_one({"id": entity_id}, {"_id": 0})
        if sesion:
            entity_id = sesion["microciclo_id"]
            nivel = "micro"

    if nivel == "micro":
        m = await calcular_metricas_microciclo(db, entity_id)
        resultado["metricas"]["microciclo"] = m
        resultado["niveles_actualizados"].append("micro")

        micro = await db.microciclos_v2.find_one({"id": entity_id}, {"_id": 0})
        if micro:
            entity_id = micro["mesociclo_id"]
            nivel = "meso"

    if nivel == "meso":
        m = await calcular_metricas_mesociclo(db, entity_id)
        resultado["metricas"]["mesociclo"] = m
        resultado["niveles_actualizados"].append("meso")

        meso = await db.mesociclos_v2.find_one({"id": entity_id}, {"_id": 0})
        if meso:
            entity_id = meso["macrociclo_id"]
            nivel = "macro"

    if nivel == "macro":
        m = await calcular_metricas_macrociclo(db, entity_id)
        resultado["metricas"]["macrociclo"] = m
        resultado["niveles_actualizados"].append("macro")

        if m.get("alertas_detectadas"):
            resultado["alertas_generadas"].extend(m["alertas_detectadas"])

        macro = await db.macrociclos_v2.find_one({"id": entity_id}, {"_id": 0})
        if macro:
            plan_metricas = await calcular_metricas_plan(db, macro["plan_id"])
            resultado["metricas"]["plan"] = plan_metricas
            resultado["niveles_actualizados"].append("plan")
            await actualizar_capacidades_semana(db, macro["plan_id"])

    return resultado
