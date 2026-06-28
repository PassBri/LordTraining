"""Planes de entrenamiento: configuraciones de deporte/modelo, generación de
estructura, CRUD de planes, calculadoras científicas, export PDF y generación con IA.
Extraído de server.py — FASE 1 segmentación. Sin cambios de comportamiento."""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from io import BytesIO
from pydantic import BaseModel
import uuid
import os
import logging

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor

from emergentintegrations.llm.chat import LlmChat, UserMessage

from core.auth import get_db, get_current_user
from core.models import (
    TrainingPlanCreate, TrainingPlanResponse, TrainingPlanGenerateRequest,
    LoadCalculationRequest, LoadCalculationResponse,
    SubscriptionPlan, SUBSCRIPTION_LIMITS,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Training Plans"])


# =============== TRAINING PLANS CRUD ===============
PERIODIZATION_MODELS_INFO = {
    "traditional": {"name": "Tradicional (Matveiev)", "category": "classic"},
    "atr": {"name": "ATR (Issurin)", "category": "classic"},
    "blocks": {"name": "Bloques Concentrados (Verkhoshansky)", "category": "classic"},
    "undulating_daily": {"name": "Ondulatorio Diario (DUP)", "category": "undulating"},
    "undulating_weekly": {"name": "Ondulatorio Semanal (WUP)", "category": "undulating"},
    "flexible_nonlinear": {"name": "No Lineal Flexible (Kraemer)", "category": "undulating"},
    "conjugate": {"name": "Conjugado (Westside/Simmons)", "category": "contemporary"},
    "triphasic": {"name": "Trifásico (Dietz)", "category": "contemporary"},
    "vertical_integration": {"name": "Integración Vertical (Francis)", "category": "contemporary"},
    "french_contrast": {"name": "Contraste Francés", "category": "contemporary"},
    "tactical": {"name": "Periodización Táctica (Frade)", "category": "sport_specific"},
    "reverse_linear": {"name": "Lineal Inversa", "category": "sport_specific"},
    "concurrent": {"name": "Concurrente", "category": "sport_specific"},
    "polarized": {"name": "Polarizado (Seiler)", "category": "sport_specific"},
    "cybernetic": {"name": "Cibernético (Bondarchuk)", "category": "advanced"},
    "pendulum": {"name": "Péndulo (Arosiev/Kalinin)", "category": "advanced"},
    "sequential": {"name": "Secuencial (Tschiene)", "category": "advanced"}
}

# =============== SPORT CONFIGURATIONS ===============
SPORT_CONFIGS = {
    # Deportes de Fuerza/Potencia
    "powerlifting": {
        "name": "Powerlifting", "category": "strength",
        "prep_ratio": 0.60, "comp_ratio": 0.30, "trans_ratio": 0.10,
        "sessions_per_week": 4, "intensity_focus": True,
        "primary_qualities": ["fuerza_maxima", "potencia"],
        "recommended_models": ["traditional", "blocks", "conjugate"]
    },
    "weightlifting": {
        "name": "Halterofilia", "category": "strength",
        "prep_ratio": 0.55, "comp_ratio": 0.35, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "tecnica", "fuerza_maxima"],
        "recommended_models": ["traditional", "blocks", "atr"]
    },
    "bodybuilding": {
        "name": "Culturismo", "category": "strength",
        "prep_ratio": 0.70, "comp_ratio": 0.20, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["hipertrofia", "definicion"],
        "recommended_models": ["undulating_daily", "concurrent"]
    },
    # Deportes de Resistencia
    "marathon": {
        "name": "Maratón", "category": "endurance",
        "prep_ratio": 0.65, "comp_ratio": 0.25, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": False,
        "primary_qualities": ["resistencia_aerobica", "umbral_anaerobico"],
        "recommended_models": ["traditional", "polarized", "reverse_linear"]
    },
    "triathlon": {
        "name": "Triatlón", "category": "endurance",
        "prep_ratio": 0.60, "comp_ratio": 0.30, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": False,
        "primary_qualities": ["resistencia_aerobica", "transiciones", "fuerza_resistencia"],
        "recommended_models": ["polarized", "concurrent", "atr"]
    },
    "cycling": {
        "name": "Ciclismo", "category": "endurance",
        "prep_ratio": 0.60, "comp_ratio": 0.30, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["resistencia_aerobica", "potencia", "umbral"],
        "recommended_models": ["polarized", "traditional", "atr"]
    },
    "swimming": {
        "name": "Natación", "category": "endurance",
        "prep_ratio": 0.55, "comp_ratio": 0.35, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["tecnica", "resistencia", "velocidad"],
        "recommended_models": ["traditional", "atr", "blocks"]
    },
    # Deportes de Velocidad/Sprint
    "sprints": {
        "name": "Velocidad (100m-400m)", "category": "speed",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["velocidad", "potencia", "tecnica"],
        "recommended_models": ["vertical_integration", "blocks", "atr"]
    },
    "athletics_jumps": {
        "name": "Saltos (Largo/Triple/Alto)", "category": "speed",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia_explosiva", "tecnica", "velocidad"],
        "recommended_models": ["blocks", "triphasic", "french_contrast"]
    },
    "athletics_throws": {
        "name": "Lanzamientos", "category": "speed",
        "prep_ratio": 0.55, "comp_ratio": 0.35, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "fuerza_maxima", "tecnica"],
        "recommended_models": ["blocks", "conjugate", "traditional"]
    },
    # Deportes de Equipo
    "football": {
        "name": "Fútbol", "category": "team",
        "prep_ratio": 0.25, "comp_ratio": 0.65, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["resistencia_intermitente", "velocidad", "agilidad"],
        "recommended_models": ["tactical", "undulating_weekly", "concurrent"]
    },
    "basketball": {
        "name": "Baloncesto", "category": "team",
        "prep_ratio": 0.30, "comp_ratio": 0.60, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["potencia", "agilidad", "resistencia_intermitente"],
        "recommended_models": ["undulating_weekly", "concurrent", "tactical"]
    },
    "volleyball": {
        "name": "Voleibol", "category": "team",
        "prep_ratio": 0.30, "comp_ratio": 0.60, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia_salto", "velocidad_reaccion", "tecnica"],
        "recommended_models": ["undulating_weekly", "blocks", "concurrent"]
    },
    "handball": {
        "name": "Balonmano", "category": "team",
        "prep_ratio": 0.30, "comp_ratio": 0.60, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["potencia", "resistencia", "agilidad"],
        "recommended_models": ["tactical", "undulating_weekly", "concurrent"]
    },
    "rugby": {
        "name": "Rugby", "category": "team",
        "prep_ratio": 0.35, "comp_ratio": 0.55, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["fuerza", "potencia", "resistencia"],
        "recommended_models": ["concurrent", "undulating_weekly", "conjugate"]
    },
    # Deportes de Combate
    "boxing": {
        "name": "Boxeo", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["potencia", "resistencia_especifica", "velocidad"],
        "recommended_models": ["atr", "blocks", "traditional"]
    },
    "mma": {
        "name": "MMA/Artes Marciales Mixtas", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["resistencia_mixta", "potencia", "tecnica"],
        "recommended_models": ["concurrent", "atr", "blocks"]
    },
    "judo": {
        "name": "Judo", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "fuerza_agarre", "tecnica"],
        "recommended_models": ["atr", "blocks", "traditional"]
    },
    "wrestling": {
        "name": "Lucha", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["fuerza_resistencia", "potencia", "tecnica"],
        "recommended_models": ["atr", "traditional", "blocks"]
    },
    # Deportes de Raqueta
    "tennis": {
        "name": "Tenis", "category": "racquet",
        "prep_ratio": 0.35, "comp_ratio": 0.55, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "agilidad", "resistencia_intermitente"],
        "recommended_models": ["undulating_weekly", "concurrent", "atr"]
    },
    "badminton": {
        "name": "Bádminton", "category": "racquet",
        "prep_ratio": 0.35, "comp_ratio": 0.55, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["velocidad", "agilidad", "resistencia"],
        "recommended_models": ["undulating_weekly", "concurrent"]
    },
    # Fitness General
    "fitness": {
        "name": "Fitness General", "category": "fitness",
        "prep_ratio": 0.80, "comp_ratio": 0.10, "trans_ratio": 0.10,
        "sessions_per_week": 4, "intensity_focus": False,
        "primary_qualities": ["fuerza_general", "resistencia", "composicion_corporal"],
        "recommended_models": ["undulating_daily", "concurrent", "flexible_nonlinear"]
    },
    "crossfit": {
        "name": "CrossFit", "category": "fitness",
        "prep_ratio": 0.40, "comp_ratio": 0.50, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["capacidad_trabajo", "potencia", "resistencia"],
        "recommended_models": ["concurrent", "undulating_daily", "conjugate"]
    },
    # General
    "general": {
        "name": "Deporte General", "category": "general",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 4, "intensity_focus": False,
        "primary_qualities": ["fuerza", "resistencia", "velocidad"],
        "recommended_models": ["traditional", "concurrent", "atr"]
    }
}

# =============== MODEL-SPECIFIC PHASE DISTRIBUTIONS ===============
MODEL_PHASE_DISTRIBUTIONS = {
    "traditional": {
        "name": "Tradicional (Matveiev)",
        "description": "Progresión lineal de volumen a intensidad",
        "phases": [
            {"id": "prep_general", "name": "Preparatorio General", "abbr": "PG", "ratio": 0.25, "volume": 90, "intensity": 50, "meso_type": "basico_desarrollador"},
            {"id": "prep_specific", "name": "Preparatorio Específico", "abbr": "PE", "ratio": 0.25, "volume": 70, "intensity": 75, "meso_type": "basico_estabilizador"},
            {"id": "precompetitive", "name": "Precompetitivo", "abbr": "PC", "ratio": 0.15, "volume": 50, "intensity": 90, "meso_type": "precompetitivo"},
            {"id": "competitive", "name": "Competitivo", "abbr": "CO", "ratio": 0.30, "volume": 35, "intensity": 95, "meso_type": "competitivo"},
            {"id": "transition", "name": "Transición", "abbr": "TR", "ratio": 0.05, "volume": 40, "intensity": 40, "meso_type": "recuperacion"}
        ]
    },
    "atr": {
        "name": "ATR (Issurin)",
        "description": "Bloques de Acumulación-Transformación-Realización",
        "phases": [
            {"id": "accumulation", "name": "Acumulación", "abbr": "AC", "ratio": 0.40, "volume": 85, "intensity": 60, "meso_type": "basico_desarrollador"},
            {"id": "transformation", "name": "Transformación", "abbr": "TR", "ratio": 0.35, "volume": 60, "intensity": 85, "meso_type": "basico_estabilizador"},
            {"id": "realization", "name": "Realización", "abbr": "RE", "ratio": 0.20, "volume": 40, "intensity": 95, "meso_type": "competitivo"},
            {"id": "recovery", "name": "Recuperación", "abbr": "RC", "ratio": 0.05, "volume": 35, "intensity": 40, "meso_type": "recuperacion"}
        ]
    },
    "blocks": {
        "name": "Bloques Concentrados (Verkhoshansky)",
        "description": "Cargas unidireccionales concentradas",
        "phases": [
            {"id": "block_a", "name": "Bloque A - Fuerza", "abbr": "BA", "ratio": 0.30, "volume": 95, "intensity": 70, "meso_type": "basico_desarrollador"},
            {"id": "block_b", "name": "Bloque B - Potencia", "abbr": "BB", "ratio": 0.30, "volume": 60, "intensity": 90, "meso_type": "basico_estabilizador"},
            {"id": "block_c", "name": "Bloque C - Velocidad", "abbr": "BC", "ratio": 0.25, "volume": 40, "intensity": 95, "meso_type": "precompetitivo"},
            {"id": "competition", "name": "Competición", "abbr": "CO", "ratio": 0.15, "volume": 30, "intensity": 100, "meso_type": "competitivo"}
        ]
    },
    "undulating_daily": {
        "name": "Ondulatorio Diario (DUP)",
        "description": "Variación diaria de estímulos",
        "phases": [
            {"id": "hypertrophy", "name": "Hipertrofia", "abbr": "HI", "ratio": 0.35, "volume": 80, "intensity": 65, "meso_type": "basico_desarrollador"},
            {"id": "strength", "name": "Fuerza", "abbr": "FU", "ratio": 0.35, "volume": 60, "intensity": 85, "meso_type": "basico_estabilizador"},
            {"id": "power", "name": "Potencia", "abbr": "PO", "ratio": 0.25, "volume": 45, "intensity": 90, "meso_type": "precompetitivo"},
            {"id": "deload", "name": "Descarga", "abbr": "DE", "ratio": 0.05, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    },
    "undulating_weekly": {
        "name": "Ondulatorio Semanal (WUP)",
        "description": "Variación semanal de énfasis",
        "phases": [
            {"id": "accumulation", "name": "Acumulación", "abbr": "AC", "ratio": 0.40, "volume": 85, "intensity": 65, "meso_type": "basico_desarrollador"},
            {"id": "intensification", "name": "Intensificación", "abbr": "IN", "ratio": 0.40, "volume": 55, "intensity": 88, "meso_type": "basico_estabilizador"},
            {"id": "realization", "name": "Realización", "abbr": "RE", "ratio": 0.15, "volume": 40, "intensity": 95, "meso_type": "competitivo"},
            {"id": "deload", "name": "Descarga", "abbr": "DE", "ratio": 0.05, "volume": 35, "intensity": 45, "meso_type": "recuperacion"}
        ]
    },
    "conjugate": {
        "name": "Conjugado (Westside)",
        "description": "Desarrollo simultáneo de cualidades",
        "phases": [
            {"id": "max_effort", "name": "Esfuerzo Máximo", "abbr": "ME", "ratio": 0.35, "volume": 50, "intensity": 95, "meso_type": "basico_desarrollador"},
            {"id": "dynamic_effort", "name": "Esfuerzo Dinámico", "abbr": "DE", "ratio": 0.35, "volume": 70, "intensity": 60, "meso_type": "basico_estabilizador"},
            {"id": "repetition", "name": "Repetición", "abbr": "RE", "ratio": 0.25, "volume": 80, "intensity": 70, "meso_type": "precompetitivo"},
            {"id": "deload", "name": "Descarga", "abbr": "DL", "ratio": 0.05, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    },
    "triphasic": {
        "name": "Trifásico (Dietz)",
        "description": "Fases excéntrica-isométrica-concéntrica",
        "phases": [
            {"id": "eccentric", "name": "Excéntrico", "abbr": "EX", "ratio": 0.30, "volume": 75, "intensity": 75, "meso_type": "basico_desarrollador"},
            {"id": "isometric", "name": "Isométrico", "abbr": "IS", "ratio": 0.30, "volume": 65, "intensity": 85, "meso_type": "basico_estabilizador"},
            {"id": "concentric", "name": "Concéntrico", "abbr": "CO", "ratio": 0.30, "volume": 55, "intensity": 90, "meso_type": "precompetitivo"},
            {"id": "reactive", "name": "Reactivo", "abbr": "RE", "ratio": 0.10, "volume": 40, "intensity": 95, "meso_type": "competitivo"}
        ]
    },
    "polarized": {
        "name": "Polarizado (Seiler)",
        "description": "80% baja / 20% alta intensidad",
        "phases": [
            {"id": "base", "name": "Base Aeróbica", "abbr": "BA", "ratio": 0.50, "volume": 95, "intensity": 55, "meso_type": "basico_desarrollador"},
            {"id": "build", "name": "Construcción", "abbr": "BU", "ratio": 0.30, "volume": 75, "intensity": 75, "meso_type": "basico_estabilizador"},
            {"id": "peak", "name": "Pico", "abbr": "PK", "ratio": 0.15, "volume": 50, "intensity": 92, "meso_type": "competitivo"},
            {"id": "taper", "name": "Tapering", "abbr": "TP", "ratio": 0.05, "volume": 35, "intensity": 80, "meso_type": "recuperacion"}
        ]
    },
    "tactical": {
        "name": "Periodización Táctica (Frade)",
        "description": "Basada en el modelo de juego",
        "phases": [
            {"id": "acquisition", "name": "Adquisición", "abbr": "AD", "ratio": 0.20, "volume": 80, "intensity": 70, "meso_type": "entrante"},
            {"id": "maintenance", "name": "Mantenimiento", "abbr": "MA", "ratio": 0.70, "volume": 65, "intensity": 80, "meso_type": "basico_estabilizador"},
            {"id": "recovery", "name": "Recuperación", "abbr": "RE", "ratio": 0.10, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    },
    "reverse_linear": {
        "name": "Lineal Inversa",
        "description": "De intensidad a volumen",
        "phases": [
            {"id": "intensity", "name": "Intensidad Alta", "abbr": "IA", "ratio": 0.35, "volume": 50, "intensity": 92, "meso_type": "basico_desarrollador"},
            {"id": "moderate", "name": "Moderado", "abbr": "MO", "ratio": 0.35, "volume": 70, "intensity": 75, "meso_type": "basico_estabilizador"},
            {"id": "volume", "name": "Volumen Alto", "abbr": "VA", "ratio": 0.25, "volume": 90, "intensity": 60, "meso_type": "precompetitivo"},
            {"id": "taper", "name": "Tapering", "abbr": "TP", "ratio": 0.05, "volume": 40, "intensity": 70, "meso_type": "recuperacion"}
        ]
    },
    "concurrent": {
        "name": "Concurrente",
        "description": "Desarrollo paralelo de cualidades",
        "phases": [
            {"id": "general", "name": "General", "abbr": "GE", "ratio": 0.40, "volume": 80, "intensity": 65, "meso_type": "basico_desarrollador"},
            {"id": "specific", "name": "Específico", "abbr": "ES", "ratio": 0.40, "volume": 65, "intensity": 80, "meso_type": "basico_estabilizador"},
            {"id": "competition", "name": "Competición", "abbr": "CO", "ratio": 0.15, "volume": 45, "intensity": 90, "meso_type": "competitivo"},
            {"id": "transition", "name": "Transición", "abbr": "TR", "ratio": 0.05, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    }
}

# Microcycle types with load patterns
MICROCYCLE_TYPES = {
    "restablecimiento": {"load": 45, "name": "Restablecimiento", "description": "Recuperación activa"},
    "corriente": {"load": 70, "name": "Corriente", "description": "Carga normal de trabajo"},
    "aproximacion": {"load": 75, "name": "Aproximación", "description": "Preparación pre-competencia"},
    "carga": {"load": 85, "name": "Carga", "description": "Aumento progresivo de carga"},
    "choque": {"load": 100, "name": "Choque", "description": "Carga máxima de impacto"},
    "competitivo": {"load": 60, "name": "Competitivo", "description": "Semana de competencia"}
}

# Mesocycle load patterns (for step loading 3:1 and 2:1)
MESOCYCLE_PATTERNS = {
    "3_1": [0.85, 0.92, 1.0, 0.60],  # 3 semanas carga + 1 descarga
    "2_1": [0.90, 1.0, 0.60],  # 2 semanas carga + 1 descarga
    "4_1": [0.80, 0.87, 0.94, 1.0, 0.55],  # 4 semanas carga + 1 descarga
    "linear": [0.75, 0.83, 0.91, 1.0],  # Progresión lineal
    "undulating": [1.0, 0.70, 0.85, 0.75]  # Ondulante
}

class StructureGenerationRequest(BaseModel):
    """Request to generate training plan structure automatically"""
    model: str
    sport: str
    total_weeks: int
    start_date: str
    sessions_per_week: Optional[int] = None
    main_competition_date: Optional[str] = None
    athlete_level: str = "intermediate"  # beginner, intermediate, advanced, elite

class GeneratedStructure(BaseModel):
    """Generated structure response"""
    model: str
    model_name: str
    sport: str
    sport_name: str
    total_weeks: int
    sessions_per_week: int
    primary_qualities: List[str]
    macrocycles: List[Dict[str, Any]]
    volume_chart: List[Dict[str, Any]]
    intensity_chart: List[Dict[str, Any]]
    summary: Dict[str, Any]

@router.post("/generate-structure", response_model=GeneratedStructure)
async def generate_training_structure(request: StructureGenerationRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Generate optimal training plan structure based on model, sport, and duration"""
    
    model = request.model
    sport = request.sport
    total_weeks = request.total_weeks
    start_date = request.start_date
    athlete_level = request.athlete_level
    
    # Get sport config (default to general if not found)
    sport_config = SPORT_CONFIGS.get(sport, SPORT_CONFIGS["general"])
    
    # === COHERENT MODEL LOOKUP ===
    # 1) Try fetching the model from the user's periodization_library (covers all 30 defaults + customs)
    # 2) Fallback to legacy MODEL_PHASE_DISTRIBUTIONS
    # 3) Last resort: traditional
    model_dist = None
    user_id = user.get("id") or user.get("user_id")
    if user_id:
        lib_model = await db["periodization_library"].find_one(
            {"user_id": user_id, "$or": [{"id": model}, {"default_key": model}]},
            {"_id": 0, "phases": 1, "name": 1, "applicable_sports": 1}
        )
        if lib_model and lib_model.get("phases"):
            # Convert library phases → MODEL_PHASE_DISTRIBUTIONS format
            phases_raw = lib_model["phases"]
            # Parse duration_weeks per phase to estimate ratios
            def _parse_weeks(dw):
                if isinstance(dw, (int, float)): return max(1, int(dw))
                s = str(dw or "4").lower().replace("sem", "").replace("semana", "").strip()
                # Match "3-5" or "3 a 5" or "4" or single number
                import re as _re
                nums = _re.findall(r"\d+", s)
                if not nums: return 4
                if len(nums) >= 2: return (int(nums[0]) + int(nums[1])) / 2
                return int(nums[0])
            estimated_weeks = [_parse_weeks(p.get("duration_weeks")) for p in phases_raw]
            total_est = sum(estimated_weeks) or 1
            converted_phases = []
            # Map internal type → {abbr, meso_type}
            _type_meta = {
                "preparation_general": {"abbr": "PG", "meso_type": "basico_desarrollador"},
                "preparation_specific": {"abbr": "PE", "meso_type": "basico_estabilizador"},
                "pre_competitive": {"abbr": "PC", "meso_type": "precompetitivo"},
                "competitive": {"abbr": "CO", "meso_type": "competitivo"},
                "transition": {"abbr": "TR", "meso_type": "recuperacion"},
                "maintenance": {"abbr": "MT", "meso_type": "competitivo"},
                "custom": {"abbr": "FA", "meso_type": "basico_desarrollador"},
            }
            for i, p in enumerate(phases_raw):
                ratio = estimated_weeks[i] / total_est
                vol = int(p.get("volume", 70))
                inten = int(p.get("intensity", 70))
                name_lower = (p.get("name") or "").lower()
                if any(k in name_lower for k in ["acumul", "prep. general", "preparación general", "base"]):
                    ptype = "preparation_general"
                elif any(k in name_lower for k in ["transform", "prep. específ", "específic", "desarrollo"]):
                    ptype = "preparation_specific"
                elif any(k in name_lower for k in ["pre-comp", "pre comp", "choque", "intens"]):
                    ptype = "pre_competitive"
                elif any(k in name_lower for k in ["realiza", "competit", "pico", "peak", "realización"]):
                    ptype = "competitive"
                elif any(k in name_lower for k in ["transit", "recuper", "deload", "descarga", "regenera"]):
                    ptype = "transition"
                elif "manten" in name_lower:
                    ptype = "maintenance"
                else:
                    ptype = "custom"
                meta = _type_meta[ptype]
                phase_name = p.get("name") or f"Fase {i+1}"
                converted_phases.append({
                    "id": ptype + f"_{i}",
                    "name": phase_name,
                    "abbr": meta["abbr"],
                    "type": ptype,
                    "ratio": max(0.05, min(0.6, ratio)),
                    "volume": vol,
                    "intensity": inten,
                    "meso_type": meta["meso_type"],
                    "qualities": sport_config.get("primary_qualities", [])[:3],
                    "objectives": [phase_name],
                    "phase_color": p.get("color", "#3B82F6"),
                    "phase_description": p.get("description", ""),
                })
            # Re-normalize ratios to sum 1.0
            total_ratio = sum(ph["ratio"] for ph in converted_phases) or 1.0
            for ph in converted_phases:
                ph["ratio"] = ph["ratio"] / total_ratio
            model_dist = {"name": lib_model["name"], "phases": converted_phases, "from_library": True, "description": f"Modelo de biblioteca: {lib_model['name']}"}
    
    if model_dist is None:
        # Legacy fallback
        model_dist = MODEL_PHASE_DISTRIBUTIONS.get(model, MODEL_PHASE_DISTRIBUTIONS["traditional"])
    
    # Determine sessions per week
    sessions_per_week = request.sessions_per_week or sport_config["sessions_per_week"]
    
    # Level adjustments — soporta los 5 niveles del sistema + alias legacy
    level_multipliers = {
        "principiante": {"volume": 0.75, "intensity": 0.78, "sessions": 0.80},
        "amateur": {"volume": 0.85, "intensity": 0.88, "sessions": 0.90},
        "semiprofesional": {"volume": 1.0, "intensity": 1.0, "sessions": 1.0},
        "profesional": {"volume": 1.10, "intensity": 1.05, "sessions": 1.0},
        "elite": {"volume": 1.15, "intensity": 1.10, "sessions": 1.0},
        # legacy ids
        "beginner": {"volume": 0.75, "intensity": 0.80, "sessions": 0.80},
        "intermediate": {"volume": 1.0, "intensity": 1.0, "sessions": 1.0},
        "advanced": {"volume": 1.10, "intensity": 1.05, "sessions": 1.0},
    }
    level_mult = level_multipliers.get(athlete_level, level_multipliers["semiprofesional"])
    
    # Parse start date
    from datetime import datetime as dt
    start = dt.fromisoformat(start_date.replace('Z', '+00:00') if 'Z' in start_date else start_date)
    
    # Generate macrocycles based on model phases
    macrocycles = []
    volume_chart = []
    intensity_chart = []
    current_week = 0
    
    for phase in model_dist["phases"]:
        phase_weeks = max(1, round(total_weeks * phase["ratio"]))
        if current_week + phase_weeks > total_weeks:
            phase_weeks = total_weeks - current_week
        if phase_weeks <= 0:
            continue
        
        phase_start = start + timedelta(weeks=current_week)
        phase_end = start + timedelta(weeks=current_week + phase_weeks)
        
        # Calculate adjusted volume and intensity
        base_volume = phase["volume"]
        base_intensity = phase["intensity"]
        
        # Generate mesocycles within this phase
        mesocycles = []
        meso_weeks = 4 if phase_weeks >= 4 else phase_weeks  # Standard 4-week mesocycle
        num_mesos = max(1, phase_weeks // meso_weeks)
        remaining_weeks = phase_weeks
        
        for meso_idx in range(num_mesos):
            meso_week_count = min(meso_weeks, remaining_weeks)
            if meso_week_count <= 0:
                break
            
            # Determine mesocycle pattern
            pattern_key = "3_1" if meso_week_count >= 4 else "2_1" if meso_week_count >= 3 else "linear"
            pattern = MESOCYCLE_PATTERNS.get(pattern_key, MESOCYCLE_PATTERNS["linear"])[:meso_week_count]
            
            # Generate microcycles
            microcycles = []
            for micro_idx, load_factor in enumerate(pattern):
                week_num = current_week + sum(m.get("weeks", 0) for m in mesocycles) + micro_idx + 1
                
                # Determine microcycle type based on load
                if load_factor <= 0.60:
                    micro_type = "restablecimiento"
                elif load_factor <= 0.75:
                    micro_type = "corriente"
                elif load_factor <= 0.85:
                    micro_type = "carga"
                else:
                    micro_type = "choque"
                
                micro_volume = round(base_volume * load_factor * level_mult["volume"])
                micro_intensity = round(base_intensity * (0.9 + load_factor * 0.1) * level_mult["intensity"])
                
                # Generate sessions
                sessions = []
                session_types = ["tecnica", "fuerza", "resistencia", "velocidad", "recuperacion"]
                for day in range(1, min(sessions_per_week + 1, 8)):
                    session_type = session_types[day % len(session_types)]
                    sessions.append({
                        "id": str(uuid.uuid4()),
                        "day": day,
                        "name": f"Sesión {day}",
                        "session_type": session_type,
                        "duration_minutes": 60 + (10 if sport_config["intensity_focus"] else 20),
                        "intensity": micro_intensity,
                        "volume": micro_volume,
                        "objectives": sport_config["primary_qualities"][:2]
                    })
                
                microcycles.append({
                    "id": str(uuid.uuid4()),
                    "name": f"Semana {week_num}",
                    "week_number": week_num,
                    "type": micro_type,
                    "load_percent": round(load_factor * 100),
                    "volume": micro_volume,
                    "intensity": micro_intensity,
                    "sessions": sessions
                })
                
                # Add to charts
                volume_chart.append({
                    "week": week_num,
                    "semana": f"S{week_num}",
                    "volume": micro_volume,
                    "phase": phase["name"],
                    "phase_abbr": phase["abbr"]
                })
                intensity_chart.append({
                    "week": week_num,
                    "semana": f"S{week_num}",
                    "intensity": micro_intensity,
                    "phase": phase["name"],
                    "phase_abbr": phase["abbr"]
                })
            
            mesocycles.append({
                "id": str(uuid.uuid4()),
                "name": f"{phase['abbr']} - Meso {meso_idx + 1}",
                "type": phase.get("meso_type", "basico_desarrollador"),
                "phase": phase["id"],
                "weeks": meso_week_count,
                "volume_percent": base_volume,
                "intensity_percent": base_intensity,
                "load_factor": sum(pattern) / len(pattern),
                "microcycles": microcycles
            })
            
            remaining_weeks -= meso_week_count
        
        macrocycles.append({
            "id": str(uuid.uuid4()),
            "name": phase["name"],
            "phase": phase["id"],
            "start_date": phase_start.isoformat(),
            "end_date": phase_end.isoformat(),
            "weeks": phase_weeks,
            "volume_percent": base_volume,
            "intensity_percent": base_intensity,
            "objectives": sport_config["primary_qualities"],
            "mesocycles": mesocycles
        })
        
        current_week += phase_weeks
    
    # Generate summary
    total_sessions = sum(
        len(micro.get("sessions", []))
        for macro in macrocycles
        for meso in macro.get("mesocycles", [])
        for micro in meso.get("microcycles", [])
    )
    
    summary = {
        "total_macrocycles": len(macrocycles),
        "total_mesocycles": sum(len(m.get("mesocycles", [])) for m in macrocycles),
        "total_microcycles": sum(
            len(meso.get("microcycles", []))
            for macro in macrocycles
            for meso in macro.get("mesocycles", [])
        ),
        "total_sessions": total_sessions,
        "avg_volume": round(sum(v["volume"] for v in volume_chart) / len(volume_chart)) if volume_chart else 0,
        "avg_intensity": round(sum(i["intensity"] for i in intensity_chart) / len(intensity_chart)) if intensity_chart else 0,
        "phases": [{"name": p["name"], "weeks": round(total_weeks * p["ratio"])} for p in model_dist["phases"]]
    }
    
    return GeneratedStructure(
        model=model,
        model_name=model_dist["name"],
        sport=sport,
        sport_name=sport_config["name"],
        total_weeks=total_weeks,
        sessions_per_week=sessions_per_week,
        primary_qualities=sport_config["primary_qualities"],
        macrocycles=macrocycles,
        volume_chart=volume_chart,
        intensity_chart=intensity_chart,
        summary=summary
    )

@router.get("/sports-catalog")
async def get_sports_catalog(db=Depends(get_db)):
    """Get catalog of available sports with their configurations"""
    catalog = {}
    for sport_id, config in SPORT_CONFIGS.items():
        category = config["category"]
        if category not in catalog:
            catalog[category] = []
        catalog[category].append({
            "id": sport_id,
            "name": config["name"],
            "sessions_per_week": config["sessions_per_week"],
            "recommended_models": config["recommended_models"],
            "primary_qualities": config["primary_qualities"]
        })
    return catalog

@router.post("/training-plans", response_model=TrainingPlanResponse)
async def create_training_plan(plan: TrainingPlanCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Create a complete training plan with all structures"""
    plan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate end date
    from datetime import datetime as dt
    start = dt.fromisoformat(plan.start_date.replace('Z', '+00:00') if 'Z' in plan.start_date else plan.start_date)
    end = start + timedelta(weeks=plan.total_weeks)
    
    # Generate IDs for nested structures
    macrocycles_with_ids = []
    for macro in plan.macrocycles:
        macro_dict = macro.model_dump()
        macro_dict["id"] = macro_dict.get("id") or str(uuid.uuid4())
        
        mesos_with_ids = []
        for meso in macro_dict.get("mesocycles", []):
            meso["id"] = meso.get("id") or str(uuid.uuid4())
            
            micros_with_ids = []
            for micro in meso.get("microcycles", []):
                micro["id"] = micro.get("id") or str(uuid.uuid4())
                
                sessions_with_ids = []
                for session in micro.get("sessions", []):
                    session["id"] = session.get("id") or str(uuid.uuid4())
                    sessions_with_ids.append(session)
                micro["sessions"] = sessions_with_ids
                micros_with_ids.append(micro)
            meso["microcycles"] = micros_with_ids
            mesos_with_ids.append(meso)
        macro_dict["mesocycles"] = mesos_with_ids
        macrocycles_with_ids.append(macro_dict)
    
    model_info = PERIODIZATION_MODELS_INFO.get(plan.model, {"name": plan.model})
    
    doc = {
        "id": plan_id,
        "coach_id": user["id"],
        "name": plan.name,
        "athlete_id": plan.athlete_id,
        "sport": plan.sport,
        "model": plan.model,
        "model_name": model_info.get("name", plan.model),
        "duration_type": plan.duration_type,
        "total_weeks": plan.total_weeks,
        "start_date": plan.start_date,
        "end_date": end.isoformat(),
        "sessions_per_week": plan.sessions_per_week,
        "athlete_level": plan.athlete_level,
        "main_objective": plan.main_objective,
        "main_competition": plan.main_competition,
        "main_competition_date": plan.main_competition_date,
        "icon": plan.icon,
        "icon_color": plan.icon_color,
        "macrocycles": macrocycles_with_ids,
        "status": "active",
        "share_token": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.training_plans.insert_one(doc)
    doc.pop("_id", None)
    
    # ====== CREAR ESTRUCTURA COMPLETA DE DATOS DEL PLAN ======
    # Crear documento de datos del plan con todas las secciones vacías
    plan_data_doc = {
        "id": str(uuid.uuid4()),
        "plan_id": plan_id,
        "coach_id": user["id"],
        # Diagnóstico / Punto de Partida
        "previous_analysis": {
            "previous_plan_name": "",
            "achievements": "",
            "areas_to_improve": "",
            "lessons_learned": "",
            "recommendations": ""
        },
        "objectives": [],
        "athlete_characterization": {
            "training_age": 0,
            "sport_age": 0,
            "strengths": "",
            "weaknesses": "",
            "injury_history": "",
            "availability": ""
        },
        # Evaluaciones / Controles
        "evaluations": {
            "medical": [],
            "anthropometric": [],
            "physical": [],
            "technical": [],
            "tactical": [],
            "psychological": [],
            "theoretical": []
        },
        # Competencias
        "competitions": [],
        "competition_calendar": [],
        # Metadatos
        "created_at": now,
        "updated_at": now
    }
    await db.plan_data.insert_one(plan_data_doc)
    
    return TrainingPlanResponse(**doc)

@router.get("/training-plans", response_model=List[TrainingPlanResponse])
async def get_training_plans(user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Get all training plans for the current user"""
    plans = await db.training_plans.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [TrainingPlanResponse(**p) for p in plans]

@router.get("/training-plans/{plan_id}", response_model=TrainingPlanResponse)
async def get_training_plan(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Get a specific training plan"""
    plan = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return TrainingPlanResponse(**plan)

@router.put("/training-plans/{plan_id}", response_model=TrainingPlanResponse)
async def update_training_plan(plan_id: str, plan: TrainingPlanCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Update an existing training plan"""
    existing = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate end date
    from datetime import datetime as dt
    start = dt.fromisoformat(plan.start_date.replace('Z', '+00:00') if 'Z' in plan.start_date else plan.start_date)
    end = start + timedelta(weeks=plan.total_weeks)
    
    # Generate IDs for nested structures
    macrocycles_with_ids = []
    for macro in plan.macrocycles:
        macro_dict = macro.model_dump()
        macro_dict["id"] = macro_dict.get("id") or str(uuid.uuid4())
        
        mesos_with_ids = []
        for meso in macro_dict.get("mesocycles", []):
            meso["id"] = meso.get("id") or str(uuid.uuid4())
            
            micros_with_ids = []
            for micro in meso.get("microcycles", []):
                micro["id"] = micro.get("id") or str(uuid.uuid4())
                
                sessions_with_ids = []
                for session in micro.get("sessions", []):
                    session["id"] = session.get("id") or str(uuid.uuid4())
                    sessions_with_ids.append(session)
                micro["sessions"] = sessions_with_ids
                micros_with_ids.append(micro)
            meso["microcycles"] = micros_with_ids
            mesos_with_ids.append(meso)
        macro_dict["mesocycles"] = mesos_with_ids
        macrocycles_with_ids.append(macro_dict)
    
    model_info = PERIODIZATION_MODELS_INFO.get(plan.model, {"name": plan.model})
    
    update_data = {
        "name": plan.name,
        "athlete_id": plan.athlete_id,
        "sport": plan.sport,
        "model": plan.model,
        "model_name": model_info.get("name", plan.model),
        "duration_type": plan.duration_type,
        "total_weeks": plan.total_weeks,
        "start_date": plan.start_date,
        "end_date": end.isoformat(),
        "sessions_per_week": plan.sessions_per_week,
        "athlete_level": plan.athlete_level,
        "main_objective": plan.main_objective,
        "main_competition": plan.main_competition,
        "main_competition_date": plan.main_competition_date,
        "icon": plan.icon,
        "icon_color": plan.icon_color,
        "macrocycles": macrocycles_with_ids,
        "updated_at": now
    }
    
    await db.training_plans.update_one(
        {"id": plan_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    
    updated = await db.training_plans.find_one({"id": plan_id}, {"_id": 0})
    return TrainingPlanResponse(**updated)

class AdjustDurationRequest(BaseModel):
    total_weeks: int
    main_competition_date: Optional[str] = None

@router.patch("/training-plans/{plan_id}/duration")
async def adjust_plan_duration(plan_id: str, body: AdjustDurationRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Ajuste ligero de la duración (semanas) del plan — usado por la re-sincronización (B3)."""
    existing = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    total_weeks = max(1, min(208, int(body.total_weeks)))
    from datetime import datetime as dt
    sd = existing.get("start_date")
    update_data = {"total_weeks": total_weeks, "updated_at": datetime.now(timezone.utc).isoformat()}
    if sd:
        try:
            start = dt.fromisoformat(sd.replace('Z', '+00:00') if 'Z' in sd else sd)
            update_data["end_date"] = (start + timedelta(weeks=total_weeks)).isoformat()
        except Exception:
            pass
    if body.main_competition_date is not None:
        update_data["main_competition_date"] = body.main_competition_date
    await db.training_plans.update_one({"id": plan_id, "coach_id": user["id"]}, {"$set": update_data})
    return {"ok": True, "total_weeks": total_weeks, "end_date": update_data.get("end_date")}


class MainCompetitionRequest(BaseModel):
    main_competition: Optional[str] = None
    main_competition_date: Optional[str] = None

@router.patch("/training-plans/{plan_id}/competition")
async def update_main_competition(plan_id: str, body: MainCompetitionRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Actualiza la competencia principal del plan (nombre + fecha). Usado desde el Plan Gráfico."""
    existing = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.main_competition is not None:
        update_data["main_competition"] = body.main_competition
    if body.main_competition_date is not None:
        update_data["main_competition_date"] = body.main_competition_date
    await db.training_plans.update_one({"id": plan_id, "coach_id": user["id"]}, {"$set": update_data})
    return {
        "ok": True,
        "main_competition": update_data.get("main_competition", existing.get("main_competition")),
        "main_competition_date": update_data.get("main_competition_date", existing.get("main_competition_date")),
    }


@router.delete("/training-plans/{plan_id}")
async def delete_training_plan(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Delete a training plan and all associated data"""
    result = await db.training_plans.delete_one({"id": plan_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    # Cascade delete all associated plan data
    await db.plan_data.delete_many({"plan_id": plan_id})
    await db.plan_objectives.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    await db.plan_evaluations.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    await db.plan_competitions.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    await db.plan_previous_analysis.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    return {"message": "Plan and all associated data deleted successfully"}

@router.post("/training-plans/{plan_id}/duplicate", response_model=TrainingPlanResponse)
async def duplicate_training_plan(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Duplicate an existing training plan with all associated data including V2 structure"""
    original = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Deep copy with new IDs
    def regenerate_ids(obj):
        if isinstance(obj, dict):
            if "id" in obj:
                obj["id"] = str(uuid.uuid4())
            for key, value in obj.items():
                regenerate_ids(value)
        elif isinstance(obj, list):
            for item in obj:
                regenerate_ids(item)
    
    import copy
    new_plan = copy.deepcopy(original)
    new_plan["id"] = new_id
    new_plan["name"] = f"{original['name']} (Copia)"
    new_plan["share_token"] = None
    new_plan["created_at"] = now
    new_plan["updated_at"] = now
    regenerate_ids(new_plan.get("macrocycles", []))
    
    await db.training_plans.insert_one(new_plan)
    new_plan.pop("_id", None)
    
    # Duplicate plan_data (graphic plan)
    plan_data_orig = await db.plan_data.find_one({"plan_id": plan_id}, {"_id": 0})
    if plan_data_orig:
        plan_data_copy = copy.deepcopy(plan_data_orig)
        plan_data_copy["id"] = str(uuid.uuid4())
        plan_data_copy["plan_id"] = new_id
        plan_data_copy["created_at"] = now
        plan_data_copy["updated_at"] = now
        await db.plan_data.insert_one(plan_data_copy)
    
    # Duplicate V2 cascade structure with ID mapping
    id_map = {}
    
    # Macrociclos V2
    v2_macros = await db.macrociclos.find({"plan_id": plan_id}).to_list(100)
    for m in v2_macros:
        m.pop("_id", None)
        old_id = m["id"]
        new_macro_id = str(uuid.uuid4())
        id_map[old_id] = new_macro_id
        m["id"] = new_macro_id
        m["plan_id"] = new_id
        await db.macrociclos.insert_one(m)
    
    # Mesociclos V2
    v2_mesos = await db.mesociclos.find({"plan_id": plan_id}).to_list(500)
    for m in v2_mesos:
        m.pop("_id", None)
        old_id = m["id"]
        new_meso_id = str(uuid.uuid4())
        id_map[old_id] = new_meso_id
        m["id"] = new_meso_id
        m["plan_id"] = new_id
        m["macrociclo_id"] = id_map.get(m.get("macrociclo_id", ""), m.get("macrociclo_id", ""))
        await db.mesociclos.insert_one(m)
    
    # Microciclos V2
    v2_micros = await db.microciclos.find({"plan_id": plan_id}).to_list(1000)
    for m in v2_micros:
        m.pop("_id", None)
        old_id = m["id"]
        new_micro_id = str(uuid.uuid4())
        id_map[old_id] = new_micro_id
        m["id"] = new_micro_id
        m["plan_id"] = new_id
        m["mesociclo_id"] = id_map.get(m.get("mesociclo_id", ""), m.get("mesociclo_id", ""))
        await db.microciclos.insert_one(m)
    
    # Sesiones V2
    v2_sessions = await db.sesiones.find({"plan_id": plan_id}).to_list(5000)
    for s in v2_sessions:
        s.pop("_id", None)
        old_id = s["id"]
        new_ses_id = str(uuid.uuid4())
        id_map[old_id] = new_ses_id
        s["id"] = new_ses_id
        s["plan_id"] = new_id
        s["microciclo_id"] = id_map.get(s.get("microciclo_id", ""), s.get("microciclo_id", ""))
        await db.sesiones.insert_one(s)
    
    # Ejercicios V2
    v2_exercises = await db.ejercicios_sesion.find({"plan_id": plan_id}).to_list(10000)
    for e in v2_exercises:
        e.pop("_id", None)
        e["id"] = str(uuid.uuid4())
        e["plan_id"] = new_id
        e["sesion_id"] = id_map.get(e.get("sesion_id", ""), e.get("sesion_id", ""))
        await db.ejercicios_sesion.insert_one(e)
    
    # Duplicate objectives
    objectives = await db.plan_objectives.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if objectives:
        obj_copy = copy.deepcopy(objectives)
        obj_copy["plan_id"] = new_id
        obj_copy["created_at"] = now
        await db.plan_objectives.insert_one(obj_copy)
    
    # Duplicate evaluations
    evals_cursor = db.plan_evaluations.find({"plan_id": plan_id, "user_id": user["id"]})
    async for e in evals_cursor:
        e.pop("_id", None)
        e["plan_id"] = new_id
        e["created_at"] = now
        await db.plan_evaluations.insert_one(e)
    
    # Duplicate competitions
    comps_cursor = db.plan_competitions.find({"plan_id": plan_id, "user_id": user["id"]})
    async for c in comps_cursor:
        c.pop("_id", None)
        c["plan_id"] = new_id
        c["created_at"] = now
        await db.plan_competitions.insert_one(c)
    
    # Duplicate previous analysis
    prev_analysis = await db.plan_previous_analysis.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if prev_analysis:
        pa_copy = copy.deepcopy(prev_analysis)
        pa_copy["plan_id"] = new_id
        pa_copy["created_at"] = now
        await db.plan_previous_analysis.insert_one(pa_copy)
    
    return TrainingPlanResponse(**new_plan)

@router.post("/training-plans/{plan_id}/share")
async def share_training_plan(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Generate a share token for a training plan"""
    plan = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    share_token = str(uuid.uuid4())[:12]
    
    await db.training_plans.update_one(
        {"id": plan_id},
        {"$set": {"share_token": share_token}}
    )
    
    return {"share_token": share_token, "share_url": f"/plan/shared/{share_token}"}

@router.get("/training-plans/shared/{share_token}")
async def get_shared_training_plan(share_token: str, db=Depends(get_db)):
    """Get a shared training plan (public access) with full V2 structure"""
    plan = await db.training_plans.find_one({"share_token": share_token}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Shared plan not found")
    
    plan_id = plan.get("id")
    
    # Include V2 data
    v2_macros = await db.macrociclos.find({"plan_id": plan_id}, {"_id": 0}).to_list(100)
    v2_mesos = await db.mesociclos.find({"plan_id": plan_id}, {"_id": 0}).to_list(500)
    v2_micros = await db.microciclos.find({"plan_id": plan_id}, {"_id": 0}).to_list(1000)
    v2_sessions = await db.sesiones.find({"plan_id": plan_id}, {"_id": 0}).to_list(5000)
    
    # Include graphic plan data
    plan_data = await db.plan_data.find_one({"plan_id": plan_id}, {"_id": 0})
    
    # Include athlete info
    athlete = None
    if plan.get("athlete_id"):
        athlete = await db.athletes.find_one({"id": plan["athlete_id"]}, {"_id": 0})
        if athlete:
            athlete.pop("coach_id", None)
    
    # Remove sensitive info
    plan.pop("coach_id", None)
    
    return {
        "plan": plan,
        "athlete": athlete,
        "v2_macrociclos": v2_macros,
        "v2_mesociclos": v2_mesos,
        "v2_microciclos": v2_micros,
        "v2_sesiones": v2_sessions,
        "plan_data": plan_data
    }

# =============== SCIENTIFIC CALCULATORS ===============
@router.post("/calculators/load", response_model=LoadCalculationResponse)
async def calculate_load_scientific(request: LoadCalculationRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Scientific calculations for training loads, 1RM, zones, etc."""
    
    calc_type = request.calculation_type
    params = request.params
    
    if calc_type == "1rm":
        # Calculate 1RM using multiple formulas
        weight = params.get("weight", 0)
        reps = params.get("reps", 1)
        
        # Brzycki Formula: 1RM = weight × (36 / (37 - reps))
        brzycki = weight * (36 / (37 - reps)) if reps < 37 else weight
        # Epley Formula: 1RM = weight × (1 + 0.0333 × reps)
        epley = weight * (1 + 0.0333 * reps)
        # Lander Formula: 1RM = (100 × weight) / (101.3 - 2.67123 × reps)
        lander = (100 * weight) / (101.3 - 2.67123 * reps) if reps < 38 else weight
        # Average
        avg_1rm = round((brzycki + epley + lander) / 3, 1)
        
        # Calculate percentages
        percentages = {}
        for pct in [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]:
            percentages[f"{pct}%"] = round(avg_1rm * (pct / 100), 1)
        
        return LoadCalculationResponse(
            result={
                "1rm_brzycki": round(brzycki, 1),
                "1rm_epley": round(epley, 1),
                "1rm_lander": round(lander, 1),
                "1rm_average": avg_1rm,
                "percentages": percentages,
                "recommended_zones": {
                    "fuerza_maxima": f"{percentages['85%']} - {percentages['100%']} kg (85-100%)",
                    "hipertrofia": f"{percentages['65%']} - {percentages['80%']} kg (65-80%)",
                    "resistencia_fuerza": f"{percentages['50%']} - {percentages['65%']} kg (50-65%)",
                    "potencia": f"{percentages['70%']} - {percentages['85%']} kg (70-85%)"
                }
            },
            formula_used="Promedio de Brzycki, Epley y Lander",
            explanation=f"1RM estimado: {avg_1rm}kg basado en {weight}kg x {reps} repeticiones"
        )
    
    elif calc_type == "heart_rate_zones":
        # Calculate HR zones using Karvonen formula
        age = params.get("age", 30)
        resting_hr = params.get("resting_hr", 60)
        
        # Max HR = 220 - age (or use provided max_hr)
        max_hr = params.get("max_hr") or (220 - age)
        hr_reserve = max_hr - resting_hr
        
        zones = {}
        zone_definitions = [
            ("Z1 - Recuperación", 50, 60, "Recuperación activa, calentamiento"),
            ("Z2 - Aeróbico Base", 60, 70, "Base aeróbica, quema de grasas"),
            ("Z3 - Aeróbico", 70, 80, "Umbral aeróbico, resistencia"),
            ("Z4 - Umbral Anaeróbico", 80, 90, "Umbral láctico, tempo"),
            ("Z5 - VO2 Máx", 90, 100, "Capacidad máxima, intervalos")
        ]
        
        for name, low_pct, high_pct, desc in zone_definitions:
            low_hr = round(resting_hr + (hr_reserve * low_pct / 100))
            high_hr = round(resting_hr + (hr_reserve * high_pct / 100))
            zones[name] = {
                "range": f"{low_hr} - {high_hr} bpm",
                "low": low_hr,
                "high": high_hr,
                "percentage": f"{low_pct}-{high_pct}%",
                "description": desc
            }
        
        return LoadCalculationResponse(
            result={
                "max_hr": max_hr,
                "resting_hr": resting_hr,
                "hr_reserve": hr_reserve,
                "zones": zones
            },
            formula_used="Fórmula de Karvonen: FC = FC_reposo + (FC_reserva × %intensidad)",
            explanation=f"Zonas calculadas para FC máx {max_hr}bpm, FC reposo {resting_hr}bpm"
        )
    
    elif calc_type == "volume_distribution":
        # Distribute volume across weeks using periodization principles
        total_volume = params.get("total_volume", 1000)  # e.g., km, tons, hours
        weeks = params.get("weeks", 12)
        progression_type = params.get("progression", "linear")  # linear, undulating, step
        
        weekly_volumes = []
        
        if progression_type == "linear":
            # Linear progression: start at 70%, end at 100%
            start_pct = 0.7
            end_pct = 1.0
            avg_weekly = total_volume / weeks
            for i in range(weeks):
                pct = start_pct + (end_pct - start_pct) * (i / (weeks - 1)) if weeks > 1 else 1
                weekly_volumes.append(round(avg_weekly * pct, 1))
        
        elif progression_type == "undulating":
            # Undulating: high-low-medium pattern
            patterns = [1.0, 0.7, 0.85, 1.0, 0.75, 0.9]
            avg_weekly = total_volume / weeks
            for i in range(weeks):
                pct = patterns[i % len(patterns)]
                weekly_volumes.append(round(avg_weekly * pct, 1))
        
        elif progression_type == "step":
            # Step loading: 3 weeks up, 1 week down
            avg_weekly = total_volume / weeks
            for i in range(weeks):
                week_in_block = i % 4
                if week_in_block == 3:
                    pct = 0.6  # Descarga
                else:
                    pct = 0.8 + (week_in_block * 0.1)
                weekly_volumes.append(round(avg_weekly * pct, 1))
        
        return LoadCalculationResponse(
            result={
                "total_volume": total_volume,
                "weeks": weeks,
                "progression_type": progression_type,
                "weekly_volumes": weekly_volumes,
                "weekly_breakdown": [
                    {"week": i+1, "volume": v, "percentage": round(v / (total_volume/weeks) * 100)}
                    for i, v in enumerate(weekly_volumes)
                ]
            },
            formula_used=f"Progresión {progression_type}",
            explanation=f"Distribución de {total_volume} unidades en {weeks} semanas"
        )
    
    elif calc_type == "intensity_scale":
        # Return standard intensity scales
        return LoadCalculationResponse(
            result={
                "vasconcelos_raposo": {
                    "recuperacion": {"range": "0-50%", "description": "Recuperación activa"},
                    "floja": {"range": "55-65%", "description": "Carga ligera"},
                    "media": {"range": "70-80%", "description": "Carga media"},
                    "fuerte": {"range": "85-95%", "description": "Carga alta"},
                    "muy_fuerte": {"range": "98-100%", "description": "Carga máxima"}
                },
                "microcycle_types": {
                    "restablecimiento": {"load": 45, "description": "Recuperación post-competencia"},
                    "corriente": {"load": 70, "description": "Carga normal de trabajo"},
                    "aproximacion": {"load": 75, "description": "Preparación pre-competencia"},
                    "carga": {"load": 85, "description": "Aumento de carga"},
                    "choque": {"load": 100, "description": "Carga máxima de impacto"},
                    "competitivo": {"load": 60, "description": "Semana de competencia"}
                },
                "mesocycle_types": {
                    "entrante": {"load_factor": 0.7, "description": "Adaptación inicial"},
                    "basico_desarrollador": {"load_factor": 1.0, "description": "Desarrollo máximo"},
                    "basico_estabilizador": {"load_factor": 0.9, "description": "Consolidación"},
                    "precompetitivo": {"load_factor": 0.85, "description": "Ajuste pre-competencia"},
                    "competitivo": {"load_factor": 0.75, "description": "Fase de competición"},
                    "recuperacion": {"load_factor": 0.5, "description": "Transición y descanso"}
                }
            },
            formula_used="Escalas de Vasconcelos Raposo y clasificación estándar",
            explanation="Escalas de intensidad para planificación deportiva"
        )
    
    elif calc_type == "vo2max":
        # Calculate VO2 max from different tests
        test_type = params.get("test_type", "cooper")
        
        if test_type == "cooper":
            # Cooper Test: VO2max = (distance_m - 504.9) / 44.73
            distance_m = params.get("distance_m", 2400)
            vo2max = round((distance_m - 504.9) / 44.73, 1)
        
        elif test_type == "rockport":
            # Rockport Walk Test
            weight_kg = params.get("weight_kg", 70)
            age = params.get("age", 30)
            time_minutes = params.get("time_minutes", 15)
            hr_end = params.get("hr_end", 140)
            gender = params.get("gender", "male")
            gender_factor = 0 if gender == "female" else 1
            
            vo2max = round(132.853 - (0.0769 * weight_kg * 2.205) - (0.3877 * age) + (6.315 * gender_factor) - (3.2649 * time_minutes) - (0.1565 * hr_end), 1)
        
        elif test_type == "1mile":
            # 1.5 Mile Run: VO2max = 483 / time_minutes + 3.5
            time_minutes = params.get("time_minutes", 12)
            vo2max = round(483 / time_minutes + 3.5, 1)
        
        else:
            vo2max = 0
        
        # Fitness classification
        classifications = {
            "excelente": 55,
            "bueno": 45,
            "promedio": 35,
            "bajo_promedio": 30,
            "pobre": 0
        }
        
        fitness_level = "pobre"
        for level, threshold in classifications.items():
            if vo2max >= threshold:
                fitness_level = level
                break
        
        return LoadCalculationResponse(
            result={
                "vo2max": vo2max,
                "fitness_level": fitness_level,
                "unit": "ml/kg/min",
                "training_zones": {
                    "z1_recovery": f"{round(vo2max * 0.5, 1)} - {round(vo2max * 0.6, 1)}",
                    "z2_aerobic": f"{round(vo2max * 0.6, 1)} - {round(vo2max * 0.7, 1)}",
                    "z3_tempo": f"{round(vo2max * 0.7, 1)} - {round(vo2max * 0.8, 1)}",
                    "z4_threshold": f"{round(vo2max * 0.8, 1)} - {round(vo2max * 0.9, 1)}",
                    "z5_vo2max": f"{round(vo2max * 0.9, 1)} - {round(vo2max, 1)}"
                }
            },
            formula_used=f"Test de {test_type.title()}",
            explanation=f"VO2máx estimado: {vo2max} ml/kg/min - Nivel: {fitness_level}"
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown calculation type: {calc_type}")

# =============== EXPORT TRAINING PLAN PDF ===============
@router.get("/training-plans/{plan_id}/export/pdf")
async def export_training_plan_pdf(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Export training plan as PDF"""
    plan = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    athlete = None
    if plan.get("athlete_id"):
        athlete = await db.athletes.find_one({"id": plan["athlete_id"]}, {"_id": 0})
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFillColor(HexColor("#1e3a5f"))
    c.rect(0, height - 80, width, 80, fill=True)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "LORDTRAINING")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, f"Plan de Entrenamiento: {plan['name']}")
    
    y = height - 120
    
    # Plan Info
    c.setFillColor(HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Información General")
    y -= 25
    
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor("#475569"))
    info_lines = [
        f"Atleta: {athlete['name'] if athlete else 'No asignado'}",
        f"Deporte: {plan.get('sport', 'N/A')}",
        f"Modelo: {plan.get('model_name', plan.get('model', 'N/A'))}",
        f"Duración: {plan.get('total_weeks', 0)} semanas",
        f"Período: {plan.get('start_date', '')} - {plan.get('end_date', '')}",
        f"Sesiones/Semana: {plan.get('sessions_per_week', 5)}",
        f"Objetivo: {plan.get('main_objective', 'N/A')}"
    ]
    
    for line in info_lines:
        c.drawString(60, y, line)
        y -= 16
    
    y -= 20
    
    # Macrocycles
    for macro in plan.get("macrocycles", []):
        if y < 150:
            c.showPage()
            y = height - 50
        
        c.setFillColor(HexColor("#3B82F6"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"MACROCICLO: {macro.get('name', 'Sin nombre')}")
        y -= 18
        
        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#64748b"))
        c.drawString(60, y, f"Fase: {macro.get('phase', '')} | Semanas: {macro.get('weeks', 0)} | Vol: {macro.get('volume_percent', 0)}% | Int: {macro.get('intensity_percent', 0)}%")
        y -= 20
        
        # Mesocycles
        for meso in macro.get("mesocycles", []):
            if y < 120:
                c.showPage()
                y = height - 50
            
            c.setFillColor(HexColor("#8B5CF6"))
            c.setFont("Helvetica-Bold", 11)
            c.drawString(70, y, f"Mesociclo: {meso.get('name', '')}")
            y -= 15
            
            c.setFont("Helvetica", 9)
            c.setFillColor(HexColor("#64748b"))
            c.drawString(80, y, f"Tipo: {meso.get('type', '')} | Semanas: {meso.get('weeks', 0)}")
            y -= 15
            
            # Microcycles
            for micro in meso.get("microcycles", []):
                if y < 100:
                    c.showPage()
                    y = height - 50
                
                c.setFillColor(HexColor("#10B981"))
                c.setFont("Helvetica-Bold", 10)
                c.drawString(90, y, f"Sem {micro.get('week_number', '')}: {micro.get('name', '')} ({micro.get('type', '')})")
                y -= 12
                
                # Sessions summary
                sessions = micro.get("sessions", [])
                if sessions:
                    session_summary = ", ".join([f"D{s.get('day', '')}: {s.get('session_type', '')}" for s in sessions[:5]])
                    c.setFont("Helvetica", 8)
                    c.setFillColor(HexColor("#94a3b8"))
                    c.drawString(100, y, session_summary)
                    y -= 10
            
            y -= 5
        y -= 10
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#94a3b8"))
    c.drawString(50, 30, f"Generado por LordTraining - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    c.save()
    buffer.seek(0)
    
    filename = f"plan_{plan['name'].replace(' ', '_')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )




# =============== AI PLAN GENERATION ===============
@router.post("/plans/generate")
async def generate_training_plan(request: TrainingPlanGenerateRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    limits = SUBSCRIPTION_LIMITS[SubscriptionPlan(user["subscription"])]
    if user.get("ai_generations_used", 0) >= limits["ai_generations"]:
        raise HTTPException(status_code=403, detail=f"AI generation limit reached for {user['subscription']} plan")
    
    athlete = await db.athletes.find_one({"id": request.athlete_id, "coach_id": user["id"]})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=api_key,
        session_id=f"plan-{user['id']}-{str(uuid.uuid4())[:8]}",
        system_message="""Eres un experto en planificación de entrenamiento deportivo. 
        Genera planes de entrenamiento detallados basados en los principios científicos del entrenamiento.
        Incluye macrociclos, mesociclos, microciclos y sesiones específicas.
        Responde SOLO en formato JSON válido."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Genera un plan de entrenamiento completo en JSON:
    
    - Deporte: {request.sport.value}
    - Modelo de planificación: {request.planning_model.value}
    - Duración: {request.duration_weeks} semanas
    - Objetivo: {request.objective}
    - Nivel actual: {request.current_level}
    - Días disponibles por semana: {request.available_days_per_week}
    - Competiciones objetivo: {', '.join(request.competitions) if request.competitions else 'Sin competiciones específicas'}
    
    Estructura del JSON:
    {{
        "macrocycle": {{
            "name": "string",
            "objective": "string",
            "mesocycles": [
                {{
                    "name": "string",
                    "phase": "accumulation|transformation|realization|recovery",
                    "weeks": number,
                    "objective": "string",
                    "microcycles": [
                        {{
                            "name": "string",
                            "sessions": [
                                {{
                                    "day": number,
                                    "session_type": "physical|technical|tactical|recovery",
                                    "duration_minutes": number,
                                    "intensity": "low|medium|high|maximum",
                                    "volume": number,
                                    "exercises": ["string"],
                                    "notes": "string"
                                }}
                            ]
                        }}
                    ]
                }}
            ]
        }}
    }}
    
    Genera un plan realista y progresivo."""
    
    try:
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Update AI usage count
        await db.users.update_one({"id": user["id"]}, {"$inc": {"ai_generations_used": 1}})
        
        # Try to parse JSON from response
        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            plan_data = json.loads(json_match.group())
            return {"plan": plan_data, "raw_response": response}
        return {"plan": None, "raw_response": response}
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")


