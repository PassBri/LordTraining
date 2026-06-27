"""
Plan Templates — Plantillas de valores por modelo de periodización y fase.

Extiende MODEL_PHASE_DISTRIBUTIONS (routes/training_plans.py) añadiendo, por
fase genérica del Plan Gráfico (preparatory_general/_specific, precompetitive,
competitive, transition), los valores sugeridos de:
  - carga %, recuperacion %
  - volumen %, intensidad %  (tomados directamente del modelo)
  - preparation por componente % (general/specific physical, technical,
    tactical, psychological, theoretical)

Los valores se cachean en la colección Mongo `plan_templates` (editable),
y se calculan a partir del modelo si aún no existen.
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from core.auth import get_current_user, get_db
from routes.training_plans import MODEL_PHASE_DISTRIBUTIONS, PERIODIZATION_MODELS_INFO

router = APIRouter(prefix="/plan-templates", tags=["plan-templates"])

# Defaults para modelos sin entrada en MODEL_PHASE_DISTRIBUTIONS (creados según su lógica).
DEFAULT_MODEL_DISTRIBUTIONS: Dict[str, Any] = {
    "pendulum": {"name": "Péndulo (Arosiev/Kalinin)", "phases": [
        {"meso_type": "basico_desarrollador", "volume": 85, "intensity": 55},
        {"meso_type": "basico_estabilizador", "volume": 65, "intensity": 80},
        {"meso_type": "competitivo", "volume": 45, "intensity": 95},
        {"meso_type": "recuperacion", "volume": 35, "intensity": 40},
    ]},
    "sequential": {"name": "Secuencial (Tschiene)", "phases": [
        {"meso_type": "basico_desarrollador", "volume": 90, "intensity": 50},
        {"meso_type": "basico_estabilizador", "volume": 65, "intensity": 80},
        {"meso_type": "competitivo", "volume": 40, "intensity": 95},
        {"meso_type": "recuperacion", "volume": 35, "intensity": 40},
    ]},
    "french_contrast": {"name": "Contraste Francés", "phases": [
        {"meso_type": "basico_desarrollador", "volume": 70, "intensity": 75},
        {"meso_type": "basico_estabilizador", "volume": 60, "intensity": 85},
        {"meso_type": "competitivo", "volume": 45, "intensity": 95},
        {"meso_type": "recuperacion", "volume": 35, "intensity": 50},
    ]},
    "vertical_integration": {"name": "Integración Vertical (Francis)", "phases": [
        {"meso_type": "basico_desarrollador", "volume": 80, "intensity": 65},
        {"meso_type": "basico_estabilizador", "volume": 65, "intensity": 80},
        {"meso_type": "competitivo", "volume": 50, "intensity": 90},
        {"meso_type": "recuperacion", "volume": 35, "intensity": 45},
    ]},
    "cybernetic": {"name": "Cibernético (Bondarchuk)", "phases": [
        {"meso_type": "basico_desarrollador", "volume": 80, "intensity": 60},
        {"meso_type": "basico_estabilizador", "volume": 65, "intensity": 80},
        {"meso_type": "competitivo", "volume": 45, "intensity": 95},
        {"meso_type": "recuperacion", "volume": 35, "intensity": 45},
    ]},
    "flexible_nonlinear": {"name": "No Lineal Flexible (Kraemer)", "phases": [
        {"meso_type": "basico_desarrollador", "volume": 80, "intensity": 65},
        {"meso_type": "basico_estabilizador", "volume": 60, "intensity": 85},
        {"meso_type": "competitivo", "volume": 45, "intensity": 90},
        {"meso_type": "recuperacion", "volume": 35, "intensity": 45},
    ]},
}

# Fases genéricas usadas por el Plan Gráfico (coinciden con planData.phases[week])
GENERIC_PHASES = ["preparatory_general", "preparatory_specific", "precompetitive", "competitive", "transition"]

# meso_type (de MODEL_PHASE_DISTRIBUTIONS) → fase genérica del Plan Gráfico
MESOTYPE_TO_GENERIC = {
    "basico_desarrollador": "preparatory_general",
    "basico_estabilizador": "preparatory_specific",
    "entrante": "preparatory_general",
    "precompetitivo": "precompetitive",
    "competitivo": "competitive",
    "recuperacion": "transition",
}

# Énfasis de Preparación por Componentes (%) según la fase genérica
PREPARATION_BY_PHASE = {
    "preparatory_general": {"general_physical": 90, "specific_physical": 50, "technical": 50, "tactical": 30, "psychological": 40, "theoretical": 60},
    "preparatory_specific": {"general_physical": 60, "specific_physical": 90, "technical": 80, "tactical": 60, "psychological": 50, "theoretical": 40},
    "precompetitive": {"general_physical": 40, "specific_physical": 70, "technical": 90, "tactical": 85, "psychological": 70, "theoretical": 30},
    "competitive": {"general_physical": 30, "specific_physical": 50, "technical": 80, "tactical": 95, "psychological": 90, "theoretical": 30},
    "transition": {"general_physical": 25, "specific_physical": 20, "technical": 20, "tactical": 20, "psychological": 30, "theoretical": 20},
}


def _derive_carga(volumen: float, intensidad: float, generic: str) -> int:
    """Carga global ≈ mezcla de volumen e intensidad; baja en transición."""
    if generic == "transition":
        return int(round(min(volumen, intensidad) * 0.6))
    return int(round(0.55 * volumen + 0.45 * intensidad))


def build_model_template(model_key: str) -> Dict[str, Any]:
    dist = MODEL_PHASE_DISTRIBUTIONS.get(model_key) or DEFAULT_MODEL_DISTRIBUTIONS.get(model_key)
    if not dist:
        return None
    # Agrupar fases del modelo por fase genérica (promediando vol/int si varias coinciden)
    buckets: Dict[str, Dict[str, list]] = {}
    for ph in dist.get("phases", []):
        generic = MESOTYPE_TO_GENERIC.get(ph.get("meso_type"), "preparatory_general")
        b = buckets.setdefault(generic, {"vol": [], "int": []})
        b["vol"].append(ph.get("volume", 50))
        b["int"].append(ph.get("intensity", 50))

    phases: Dict[str, Any] = {}
    for generic, b in buckets.items():
        volumen = int(round(sum(b["vol"]) / len(b["vol"])))
        intensidad = int(round(sum(b["int"]) / len(b["int"])))
        carga = _derive_carga(volumen, intensidad, generic)
        phases[generic] = {
            "carga": carga,
            "recuperacion": max(0, 100 - carga),
            "volumen": volumen,
            "intensidad": intensidad,
            "preparation": dict(PREPARATION_BY_PHASE.get(generic, PREPARATION_BY_PHASE["preparatory_general"])),
        }

    return {
        "model": model_key,
        "name": PERIODIZATION_MODELS_INFO.get(model_key, {}).get("name", dist.get("name", model_key)),
        "phases": phases,
    }


@router.get("")
async def list_templates(user: dict = Depends(get_current_user)):
    return {"models": [{"key": k, "name": v.get("name", k)} for k, v in PERIODIZATION_MODELS_INFO.items()]}


@router.get("/{model_key}")
async def get_template(model_key: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    # 1) Servir desde la colección si existe (editable)
    stored = await db.plan_templates.find_one({"model": model_key}, {"_id": 0})
    if stored:
        return stored
    # 2) Calcular desde el modelo y cachear
    tpl = build_model_template(model_key)
    if not tpl:
        raise HTTPException(status_code=404, detail=f"Modelo '{model_key}' no encontrado")
    await db.plan_templates.update_one({"model": model_key}, {"$set": tpl}, upsert=True)
    return tpl
