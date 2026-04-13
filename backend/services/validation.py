"""
Reglas de integridad y validacion para el sistema de periodizacion.
Se ejecutan ANTES de guardar cualquier cambio.
"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


CAPACIDADES_INTERFERENCIA = {
    ("fuerza_maxima", "resistencia_aerobica"),
    ("resistencia_aerobica", "fuerza_maxima"),
}

CAPACIDADES_ORDEN_REQUERIDO = {
    "velocidad": {"despues_de_prohibido": ["resistencia_aerobica", "resistencia_anaerobica"]},
    "coordinacion": {"despues_de_prohibido": ["resistencia_aerobica", "resistencia_anaerobica"]},
    "velocidad_reaccion": {"despues_de_prohibido": ["resistencia_aerobica", "resistencia_anaerobica"]},
}


class AlertaValidacion:
    def __init__(self, tipo: str, severidad: str, mensaje: str, bloque_id: str = "", nivel: str = ""):
        self.tipo = tipo
        self.severidad = severidad
        self.mensaje = mensaje
        self.bloque_id = bloque_id
        self.nivel = nivel

    def to_dict(self):
        return {
            "tipo": self.tipo,
            "severidad": self.severidad,
            "mensaje": self.mensaje,
            "bloque_id": self.bloque_id,
            "nivel": self.nivel
        }


async def validar_cambio_completo(db, plan_id: str) -> List[Dict[str, Any]]:
    """Ejecuta TODAS las reglas de validacion para un plan completo"""
    alertas = []

    macros = await db.macrociclos_v2.find({"plan_id": plan_id}, {"_id": 0}).to_list(50)

    for macro in macros:
        mesos = await db.mesociclos_v2.find(
            {"macrociclo_id": macro["id"]}, {"_id": 0}
        ).to_list(50)

        for meso in mesos:
            alertas.extend(await _validar_mesociclo(db, meso))

            micros = await db.microciclos_v2.find(
                {"mesociclo_id": meso["id"]}, {"_id": 0}
            ).to_list(50)

            # Regla 3: Mesociclo sin semana de descarga cada 4 semanas
            if len(micros) >= 4 and not meso.get("semana_descarga"):
                tiene_restablecimiento = any(m.get("tipo") == "restablecimiento" for m in micros)
                if not tiene_restablecimiento:
                    alertas.append(AlertaValidacion(
                        tipo="sin_descarga",
                        severidad="advertencia",
                        mensaje=f"Mesociclo '{meso.get('nombre', '')}' tiene {len(micros)} semanas sin descarga",
                        bloque_id=meso["id"],
                        nivel="meso"
                    ).to_dict())

            for micro in micros:
                alertas.extend(await _validar_microciclo(db, micro))

                sesiones = await db.sesiones_v2.find(
                    {"microciclo_id": micro["id"]}, {"_id": 0}
                ).to_list(50)

                for sesion in sesiones:
                    alertas.extend(await _validar_sesion(db, sesion, plan_id))

    return alertas


async def _validar_mesociclo(db, meso: dict) -> list:
    """Regla 2: vol_objetivo > 90 AND int_objetivo > 85 simultaneamente"""
    alertas = []
    vol_obj = meso.get("vol_objetivo") or 0
    int_obj = meso.get("int_objetivo") or 0

    if vol_obj > 90 and int_obj > 85:
        alertas.append(AlertaValidacion(
            tipo="vol_int_alto",
            severidad="advertencia",
            mensaje=f"Mesociclo '{meso.get('nombre', '')}': Vol={vol_obj}% e Int={int_obj}% simultaneamente altos",
            bloque_id=meso["id"],
            nivel="meso"
        ).to_dict())

    return alertas


async def _validar_microciclo(db, micro: dict) -> list:
    """Regla 1 y 7: ACWR alto/bajo"""
    alertas = []
    acwr = micro.get("ACWR", 0)

    if acwr > 1.5:
        alertas.append(AlertaValidacion(
            tipo="acwr_alto",
            severidad="error",
            mensaje=f"ACWR={acwr:.2f} en semana {micro.get('numero_semana', '?')} - Reducir vol/int",
            bloque_id=micro["id"],
            nivel="micro"
        ).to_dict())

    if 0 < acwr < 0.8:
        alertas.append(AlertaValidacion(
            tipo="acwr_bajo",
            severidad="advertencia",
            mensaje=f"ACWR={acwr:.2f} en semana {micro.get('numero_semana', '?')} - Subestimulacion",
            bloque_id=micro["id"],
            nivel="micro"
        ).to_dict())

    return alertas


async def _validar_sesion(db, sesion: dict, plan_id: str) -> list:
    """
    Regla 4: Fuerza Max + Resistencia Aerobica misma sesion -> interferencia
    Regla 5: Velocidad/Coord DESPUES de Resistencia -> error de orden
    Regla 6: Series_semana > MRV -> sobrevolumen
    """
    alertas = []
    ejercicios = await db.ejercicios_sesion.find(
        {"sesion_id": sesion["id"]}, {"_id": 0}
    ).sort("orden", 1).to_list(200)

    capacidades_sesion = set()
    for e in ejercicios:
        capacidades_sesion.add(e.get("capacidad_tipo", ""))

    # Regla 4: Interferencia
    for c1, c2 in CAPACIDADES_INTERFERENCIA:
        if c1 in capacidades_sesion and c2 in capacidades_sesion:
            alertas.append(AlertaValidacion(
                tipo="interferencia",
                severidad="advertencia",
                mensaje=f"Sesion '{sesion.get('nombre', '')}': {c1} + {c2} causan interferencia",
                bloque_id=sesion["id"],
                nivel="sesion"
            ).to_dict())
            break

    # Regla 5: Orden incorrecto
    capacidades_previas = []
    for e in ejercicios:
        cap = e.get("capacidad_tipo", "")
        if cap in CAPACIDADES_ORDEN_REQUERIDO:
            prohibidos = CAPACIDADES_ORDEN_REQUERIDO[cap]["despues_de_prohibido"]
            for prev in capacidades_previas:
                if prev in prohibidos:
                    alertas.append(AlertaValidacion(
                        tipo="orden_incorrecto",
                        severidad="error",
                        mensaje=f"Sesion '{sesion.get('nombre', '')}': {cap} no debe ir despues de {prev}",
                        bloque_id=sesion["id"],
                        nivel="sesion"
                    ).to_dict())
                    break
        capacidades_previas.append(cap)

    # Regla 6: Sobrevolumen (series_semana > MRV)
    for cap_tipo in capacidades_sesion:
        if not cap_tipo:
            continue
        cap_plan = await db.capacidades_plan.find_one(
            {"plan_id": plan_id, "capacidad_tipo": cap_tipo}, {"_id": 0}
        )
        if cap_plan and cap_plan.get("MRV", 0) > 0:
            actual = cap_plan.get("series_actuales_semana", 0)
            mrv = cap_plan["MRV"]
            if actual > mrv:
                alertas.append(AlertaValidacion(
                    tipo="sobrevolumen",
                    severidad="advertencia",
                    mensaje=f"Capacidad '{cap_tipo}': {actual:.0f} series/semana > MRV ({mrv:.0f})",
                    bloque_id=sesion["id"],
                    nivel="sesion"
                ).to_dict())

    return alertas


async def validar_antes_de_guardar(db, nivel: str, data: dict, plan_id: str = "") -> List[Dict]:
    """
    Validacion rapida antes de guardar un cambio individual.
    Retorna errores bloqueantes (severidad='error').
    """
    errores = []

    if nivel == "micro":
        acwr = data.get("ACWR", 0)
        if acwr > 1.5:
            errores.append({
                "tipo": "acwr_alto",
                "severidad": "error",
                "mensaje": f"ACWR={acwr:.2f} excede limite seguro (1.5). Reduce volumen o intensidad."
            })

    if nivel == "sesion":
        ejercicios = data.get("ejercicios", [])
        caps = [e.get("capacidad_tipo", "") for e in ejercicios]
        cap_orden = []
        for cap in caps:
            if cap in CAPACIDADES_ORDEN_REQUERIDO:
                prohibidos = CAPACIDADES_ORDEN_REQUERIDO[cap]["despues_de_prohibido"]
                for prev in cap_orden:
                    if prev in prohibidos:
                        errores.append({
                            "tipo": "orden_incorrecto",
                            "severidad": "error",
                            "mensaje": f"{cap} no debe programarse despues de {prev}"
                        })
            cap_orden.append(cap)

    return errores
