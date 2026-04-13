"""
Seed de datos demo: Plan ATR (Issurin) con estructura completa.
Genera un plan de 16 semanas con macrociclos, mesociclos, microciclos,
sesiones y ejercicios de ejemplo con metricas pre-calculadas.
"""
import uuid
from datetime import datetime, timezone, timedelta


def gen_id():
    return str(uuid.uuid4())


def now_iso():
    return datetime.now(timezone.utc).isoformat()


EJERCICIOS_CATALOGO = [
    {
        "id": gen_id(), "nombre": "Sentadilla Back Squat", "grupo_muscular": "piernas",
        "patron_movimiento": "sentadilla", "capacidades_principales": ["fuerza_maxima", "potencia"],
        "equipamiento": "barra", "nivel_dificultad": 3, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Press Banca", "grupo_muscular": "pecho",
        "patron_movimiento": "empuje_horizontal", "capacidades_principales": ["fuerza_maxima"],
        "equipamiento": "barra", "nivel_dificultad": 2, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Peso Muerto", "grupo_muscular": "posterior",
        "patron_movimiento": "bisagra", "capacidades_principales": ["fuerza_maxima", "fuerza_resistencia"],
        "equipamiento": "barra", "nivel_dificultad": 3, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Sprint 30m", "grupo_muscular": "piernas",
        "patron_movimiento": "carrera", "capacidades_principales": ["velocidad", "potencia"],
        "equipamiento": "ninguno", "nivel_dificultad": 2, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Carrera Continua 5km", "grupo_muscular": "cardio",
        "patron_movimiento": "carrera", "capacidades_principales": ["resistencia_aerobica"],
        "equipamiento": "ninguno", "nivel_dificultad": 1, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Clean & Jerk", "grupo_muscular": "cuerpo_completo",
        "patron_movimiento": "olimpico", "capacidades_principales": ["potencia", "coordinacion"],
        "equipamiento": "barra", "nivel_dificultad": 4, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Salto al Cajon", "grupo_muscular": "piernas",
        "patron_movimiento": "salto", "capacidades_principales": ["fuerza_explosiva", "potencia"],
        "equipamiento": "cajon", "nivel_dificultad": 2, "is_public": True
    },
    {
        "id": gen_id(), "nombre": "Estiramiento Isquiotibiales", "grupo_muscular": "posterior",
        "patron_movimiento": "estiramiento", "capacidades_principales": ["flexibilidad"],
        "equipamiento": "ninguno", "nivel_dificultad": 1, "is_public": True
    },
]

CAPACIDADES_DEFAULT_FUTBOL = [
    {"capacidad_tipo": "fuerza_maxima", "MEV": 6, "MAV": 12, "MRV": 20},
    {"capacidad_tipo": "fuerza_explosiva", "MEV": 4, "MAV": 8, "MRV": 14},
    {"capacidad_tipo": "resistencia_aerobica", "MEV": 3, "MAV": 6, "MRV": 10},
    {"capacidad_tipo": "velocidad", "MEV": 2, "MAV": 5, "MRV": 8},
    {"capacidad_tipo": "coordinacion", "MEV": 2, "MAV": 4, "MRV": 7},
    {"capacidad_tipo": "flexibilidad", "MEV": 2, "MAV": 3, "MRV": 5},
]


def generar_plan_demo_atr():
    """
    Genera un plan ATR completo de 16 semanas para futbol.
    Estructura: 3 macrociclos (Acumulacion 6sem, Transformacion 6sem, Realizacion 4sem)
    Cada macro tiene 2 mesociclos. Cada meso tiene microciclos de 1 semana.
    Cada microciclo tiene 5 sesiones (L-M-X-J-V).
    """
    plan_id = gen_id()
    coach_id = "SEED_COACH"
    atleta_id = gen_id()
    now = now_iso()
    start = datetime(2026, 3, 2, tzinfo=timezone.utc)

    plan = {
        "id": plan_id, "coach_id": coach_id, "nombre": "ATR Futbol Pre-temporada",
        "modelo_periodizacion": "atr", "deporte": "football", "atleta_id": atleta_id,
        "duracion_semanas": 16, "fecha_inicio": start.isoformat(),
        "fecha_competicion": (start + timedelta(weeks=16)).isoformat(),
        "created_at": now, "updated_at": now
    }

    atleta = {
        "id": atleta_id, "coach_id": coach_id, "nombre": "Demo Atleta - Futbolista",
        "edad": 24, "peso_kg": 75.0, "altura_cm": 178.0,
        "fc_reposo": 58, "fc_max": 192, "deporte": "football", "nivel": "avanzado",
        "fecha_registro": now
    }

    macros_def = [
        {"nombre": "Acumulacion", "tipo": "accumulation", "color": "#3B82F6", "semanas": 6,
         "vol_objetivo": 85, "int_objetivo": 60},
        {"nombre": "Transformacion", "tipo": "transformation", "color": "#F59E0B", "semanas": 6,
         "vol_objetivo": 65, "int_objetivo": 82},
        {"nombre": "Realizacion", "tipo": "realization", "color": "#10B981", "semanas": 4,
         "vol_objetivo": 45, "int_objetivo": 93},
    ]

    macros = []
    mesos = []
    micros = []
    sesiones = []
    ejercicios = []
    historico = []

    week_cursor = 0

    for macro_idx, macro_def in enumerate(macros_def):
        macro_id = gen_id()
        macro_start = start + timedelta(weeks=week_cursor)
        macro_end = macro_start + timedelta(weeks=macro_def["semanas"])

        macros.append({
            "id": macro_id, "plan_id": plan_id,
            "nombre": macro_def["nombre"], "tipo": macro_def["tipo"],
            "color": macro_def["color"], "orden": macro_idx,
            "duracion_semanas": macro_def["semanas"],
            "fecha_inicio": macro_start.isoformat(), "fecha_fin": macro_end.isoformat(),
            "vol_objetivo": macro_def["vol_objetivo"], "int_objetivo": macro_def["int_objetivo"],
            "den_objetivo": None,
            "vol_calculado": 0, "int_calculado": 0, "carga_total": 0,
            "ACWR": 0, "RPE_promedio": 0, "alerta": None, "progreso_porcentaje": 0
        })

        weeks_in_macro = macro_def["semanas"]
        meso_weeks = [weeks_in_macro // 2, weeks_in_macro - weeks_in_macro // 2]

        meso_offset = 0
        for meso_idx, mw in enumerate(meso_weeks):
            meso_id = gen_id()
            meso_start = macro_start + timedelta(weeks=meso_offset)

            mesos.append({
                "id": meso_id, "macrociclo_id": macro_id,
                "nombre": f"{macro_def['nombre']} - Bloque {meso_idx + 1}",
                "tipo": "basico_desarrollador" if meso_idx == 0 else "basico_estabilizador",
                "orden": meso_idx, "duracion_semanas": mw,
                "semana_descarga": mw,
                "reduccion_descarga": 0.4,
                "vol_objetivo": macro_def["vol_objetivo"] + (meso_idx * -5),
                "int_objetivo": macro_def["int_objetivo"] + (meso_idx * 5),
                "den_objetivo": None,
                "vol_calculado": 0, "int_calculado": 0, "den_calculado": 0,
                "carga_total": 0, "ACWR": 0, "tonelaje_kg": 0, "RPE_promedio": 0
            })

            for w in range(mw):
                micro_id = gen_id()
                micro_start = meso_start + timedelta(weeks=w)
                micro_end = micro_start + timedelta(days=6)
                abs_week = week_cursor + meso_offset + w + 1

                tipo_micro = "restablecimiento" if w == mw - 1 else "corriente"
                if w == mw - 2 and mw > 2:
                    tipo_micro = "carga"

                micros.append({
                    "id": micro_id, "mesociclo_id": meso_id,
                    "numero_semana": abs_week, "tipo": tipo_micro,
                    "fecha_inicio": micro_start.isoformat(),
                    "fecha_fin": micro_end.isoformat(),
                    "vol_calculado": 0, "int_calculado": 0, "den_calculado": 0,
                    "carga_total": 0, "carga_aguda": 0, "carga_cronica": 0,
                    "ACWR": 0, "tonelaje_kg": 0, "RPE_promedio": 0
                })

                dias_nombres = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"]
                factor = 0.5 if tipo_micro == "restablecimiento" else (1.2 if tipo_micro == "carga" else 1.0)

                for day_idx, dia_nombre in enumerate(dias_nombres):
                    sesion_id = gen_id()
                    s_date = micro_start + timedelta(days=day_idx)
                    rpe = round(min(10, max(3, 5 + macro_idx * 1.5 + (1 if tipo_micro == "carga" else 0))) * factor, 1)
                    duracion = int(round((60 + macro_idx * 10) * factor))

                    sesiones.append({
                        "id": sesion_id, "microciclo_id": micro_id,
                        "nombre": f"{dia_nombre} - S{abs_week}",
                        "fecha": s_date.isoformat(), "orden_dia": day_idx + 1,
                        "duracion_minutos": duracion, "RPE_sesion": rpe,
                        "carga_sesion": round(rpe * duracion, 2),
                        "vol_calculado": 0, "int_calculado": 0, "den_calculado": 0,
                        "fc_media": None, "fc_max_alcanzada": None,
                        "TRIMP": 0, "tonelaje": 0,
                        "notas": None, "completada": False
                    })

                    # Generar 3-4 ejercicios por sesion
                    ej_templates = [
                        {"nombre": "Sentadilla", "cap": "fuerza_maxima", "series": 4, "reps": 6, "peso": 80, "p1rm": 75, "rpe": 7},
                        {"nombre": "Sprint 20m", "cap": "velocidad", "series": 6, "reps": 1, "peso": 0, "p1rm": 0, "rpe": 8},
                        {"nombre": "Press Banca", "cap": "fuerza_maxima", "series": 3, "reps": 8, "peso": 60, "p1rm": 70, "rpe": 6},
                        {"nombre": "Salto Cajon", "cap": "fuerza_explosiva", "series": 4, "reps": 5, "peso": 0, "p1rm": 0, "rpe": 7},
                    ]

                    n_ej = 3 if tipo_micro == "restablecimiento" else 4
                    for ej_idx in range(n_ej):
                        tpl = ej_templates[ej_idx % len(ej_templates)]
                        s = max(1, int(tpl["series"] * factor))
                        r = tpl["reps"]
                        p = round(tpl["peso"] * factor, 1)
                        tonelaje = s * r * p
                        vol_rel = s * r

                        ejercicios.append({
                            "id": gen_id(), "sesion_id": sesion_id,
                            "ejercicio_base_id": None, "nombre": tpl["nombre"],
                            "orden": ej_idx, "capacidad_tipo": tpl["cap"],
                            "series": s, "repeticiones": r, "peso_kg": p,
                            "porcentaje_1RM": tpl["p1rm"], "RPE_ejercicio": tpl["rpe"],
                            "descanso_seg": 120, "tiempo_bajo_tension": 0,
                            "velocidad_ejecucion": None, "ROM": None, "complejidad_coord": None,
                            "tonelaje_calculado": round(tonelaje, 2),
                            "vol_relativo": round(vol_rel, 2)
                        })

                    carga_diaria = round(rpe * duracion, 2)
                    historico.append({
                        "id": gen_id(), "atleta_id": atleta_id,
                        "fecha": s_date.isoformat(),
                        "carga_diaria": carga_diaria, "fuente": sesion_id
                    })

            meso_offset += mw
        week_cursor += macro_def["semanas"]

    capacidades = []
    for cap_def in CAPACIDADES_DEFAULT_FUTBOL:
        capacidades.append({
            "id": gen_id(), "plan_id": plan_id,
            "capacidad_tipo": cap_def["capacidad_tipo"],
            "MEV": cap_def["MEV"], "MAV": cap_def["MAV"], "MRV": cap_def["MRV"],
            "series_actuales_semana": 0
        })

    return {
        "plan": plan,
        "atleta": atleta,
        "macrociclos": macros,
        "mesociclos": mesos,
        "microciclos": micros,
        "sesiones": sesiones,
        "ejercicios": ejercicios,
        "capacidades": capacidades,
        "historico_cargas": historico,
        "ejercicios_catalogo": EJERCICIOS_CATALOGO
    }


async def ejecutar_seed(db, coach_id: str = None):
    """Inserta el plan demo en la base de datos"""
    data = generar_plan_demo_atr()

    if coach_id:
        data["plan"]["coach_id"] = coach_id
        data["atleta"]["coach_id"] = coach_id

    existing = await db.planes_entrenamiento.find_one(
        {"nombre": data["plan"]["nombre"]}, {"_id": 0}
    )
    if existing:
        return {"message": "Seed ya existe", "plan_id": existing["id"]}

    await db.atletas_v2.insert_one(data["atleta"])
    await db.planes_entrenamiento.insert_one(data["plan"])

    if data["macrociclos"]:
        await db.macrociclos_v2.insert_many(data["macrociclos"])
    if data["mesociclos"]:
        await db.mesociclos_v2.insert_many(data["mesociclos"])
    if data["microciclos"]:
        await db.microciclos_v2.insert_many(data["microciclos"])
    if data["sesiones"]:
        await db.sesiones_v2.insert_many(data["sesiones"])
    if data["ejercicios"]:
        await db.ejercicios_sesion.insert_many(data["ejercicios"])
    if data["capacidades"]:
        await db.capacidades_plan.insert_many(data["capacidades"])
    if data["historico_cargas"]:
        await db.historico_cargas.insert_many(data["historico_cargas"])

    for ej in data["ejercicios_catalogo"]:
        existing_ej = await db.ejercicios_base.find_one({"nombre": ej["nombre"]})
        if not existing_ej:
            await db.ejercicios_base.insert_one(ej)

    return {
        "message": "Seed ejecutado correctamente",
        "plan_id": data["plan"]["id"],
        "atleta_id": data["atleta"]["id"],
        "stats": {
            "macrociclos": len(data["macrociclos"]),
            "mesociclos": len(data["mesociclos"]),
            "microciclos": len(data["microciclos"]),
            "sesiones": len(data["sesiones"]),
            "ejercicios": len(data["ejercicios"]),
            "historico_cargas": len(data["historico_cargas"])
        }
    }
