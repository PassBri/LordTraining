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
from typing import Dict, Any, Optional

from core.auth import get_current_user, get_db
from routes.training_plans import MODEL_PHASE_DISTRIBUTIONS, PERIODIZATION_MODELS_INFO

router = APIRouter(prefix="/plan-templates", tags=["plan-templates"])

# =============== NIVELES DEL DEPORTISTA (cargas sugeridas + topes) ===============
# Cada nivel define factores que escalan los valores sugeridos del modelo
# (volumen/intensidad) y topes máximos (max_*) usados para advertencias no
# bloqueantes en el Plan Gráfico. Rangos estándar (editables vía colección Mongo
# `level_load_templates`).
LEVEL_LOAD_TEMPLATES: Dict[str, Any] = {
    "principiante":    {"name": "Principiante",      "order": 1, "volume_factor": 0.70, "intensity_factor": 0.70, "max_load": 65,  "max_volume": 70,  "max_intensity": 75},
    "amateur":         {"name": "Amateur",           "order": 2, "volume_factor": 0.82, "intensity_factor": 0.82, "max_load": 78,  "max_volume": 82,  "max_intensity": 85},
    "semiprofesional": {"name": "Semiprofesional",   "order": 3, "volume_factor": 0.92, "intensity_factor": 0.92, "max_load": 88,  "max_volume": 92,  "max_intensity": 92},
    "profesional":     {"name": "Profesional",       "order": 4, "volume_factor": 1.00, "intensity_factor": 1.00, "max_load": 95,  "max_volume": 100, "max_intensity": 98},
    "elite":           {"name": "Élite / Olímpico",  "order": 5, "volume_factor": 1.05, "intensity_factor": 1.08, "max_load": 100, "max_volume": 100, "max_intensity": 100},
}

# Alias de niveles antiguos (4 niveles legacy del wizard) → 5 niveles canónicos
LEVEL_ALIAS = {
    "beginner": "principiante",
    "intermediate": "semiprofesional",
    "advanced": "profesional",
    "elite": "elite",
}


def _normalize_level(level: Optional[str]) -> Optional[str]:
    if not level:
        return None
    lv = str(level).strip().lower()
    return lv if lv in LEVEL_LOAD_TEMPLATES else LEVEL_ALIAS.get(lv)


async def _get_level_config(db, level_key: str) -> Optional[Dict[str, Any]]:
    """Sirve la config del nivel desde Mongo (editable) o desde el default."""
    stored = await db.level_load_templates.find_one({"level": level_key}, {"_id": 0})
    if stored:
        return stored
    base = LEVEL_LOAD_TEMPLATES.get(level_key)
    return ({"level": level_key, **base}) if base else None


def _apply_level_to_phase(phase: Dict[str, Any], cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Escala vol/int por los factores del nivel y aplica topes; recalcula carga."""
    vol = min(int(round(phase["volumen"] * cfg["volume_factor"])), cfg["max_volume"])
    inten = min(int(round(phase["intensidad"] * cfg["intensity_factor"])), cfg["max_intensity"])
    is_transition = phase.get("carga", 0) <= 35 and phase["volumen"] <= 40
    carga = int(round(min(vol, inten) * 0.6)) if is_transition else int(round(0.55 * vol + 0.45 * inten))
    carga = min(carga, cfg["max_load"])
    return {
        **phase,
        "volumen": vol,
        "intensidad": inten,
        "carga": carga,
        "recuperacion": max(0, 100 - carga),
    }



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


@router.get("/levels")
async def list_levels(user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Catálogo de niveles del deportista con factores y topes (editable en Mongo)."""
    out = []
    for key in sorted(LEVEL_LOAD_TEMPLATES, key=lambda k: LEVEL_LOAD_TEMPLATES[k]["order"]):
        cfg = await _get_level_config(db, key)
        out.append(cfg)
    return {"levels": out}


@router.get("/{model_key}")
async def get_template(model_key: str, level: Optional[str] = None,
                       user: dict = Depends(get_current_user), db=Depends(get_db)):
    # 1) Servir desde la colección si existe (editable)
    stored = await db.plan_templates.find_one({"model": model_key}, {"_id": 0})
    if stored:
        tpl = stored
    else:
        # 2) Calcular desde el modelo y cachear
        tpl = build_model_template(model_key)
        if not tpl:
            raise HTTPException(status_code=404, detail=f"Modelo '{model_key}' no encontrado")
        await db.plan_templates.update_one({"model": model_key}, {"$set": tpl}, upsert=True)

    # 3) Cruzar con el nivel del deportista (factores + topes)
    level_key = _normalize_level(level)
    if level_key:
        cfg = await _get_level_config(db, level_key)
        if cfg:
            adjusted = {ph: _apply_level_to_phase(vals, cfg) for ph, vals in (tpl.get("phases") or {}).items()}
            tpl = {
                **tpl,
                "phases": adjusted,
                "level": level_key,
                "level_name": cfg.get("name", level_key),
                "caps": {"max_load": cfg["max_load"], "max_volume": cfg["max_volume"], "max_intensity": cfg["max_intensity"]},
            }
    return tpl
