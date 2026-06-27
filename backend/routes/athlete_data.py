"""Datos por atleta (legacy): análisis previo, planeación de sesiones,
caracterización deporte/atleta, historial médico, análisis de competencias,
etapas/periodización, métodos, antropometría, evaluaciones, carga, eventos,
objetivos, control, plan gráfico, periodización jerárquica/auto, biblioteca de
ejercicios y seed. Extraído de server.py — FASE 1 segmentación."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import jwt
import os

router = APIRouter(prefix="/api", tags=["Athlete Data (legacy)"])
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


def get_db(request: Request):
    return request.app.state.db


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
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


# =============== SEED DEFAULT EXERCISES ===============
@router.post("/seed/exercises")
async def seed_exercises(db=Depends(get_db)):
    exercises = [
        # Football
        {"name": "Sprint 30m", "sport": "football", "category": "velocidad", "description": "Sprint corto de alta intensidad", "muscles": ["cuadriceps", "isquiotibiales", "gluteos"], "is_public": True},
        {"name": "Rondo 4v2", "sport": "football", "category": "tecnico", "description": "Ejercicio de posesión y presión", "muscles": [], "is_public": True},
        {"name": "Circuito de fuerza", "sport": "football", "category": "fuerza", "description": "Trabajo de fuerza general", "muscles": ["tren_superior", "core", "tren_inferior"], "is_public": True},
        # Athletics
        {"name": "Series 200m", "sport": "athletics", "category": "resistencia", "description": "Series de velocidad resistencia", "muscles": ["cuadriceps", "isquiotibiales"], "is_public": True},
        {"name": "Técnica de carrera", "sport": "athletics", "category": "tecnico", "description": "Drills de técnica", "muscles": ["flexores_cadera", "gluteos"], "is_public": True},
        {"name": "Saltos pliométricos", "sport": "athletics", "category": "potencia", "description": "Trabajo de potencia de piernas", "muscles": ["cuadriceps", "gemelos"], "is_public": True},
        # Swimming
        {"name": "Series 100m crol", "sport": "swimming", "category": "resistencia", "description": "Series aeróbicas de crol", "muscles": ["dorsal", "deltoides", "triceps"], "is_public": True},
        {"name": "Técnica de viraje", "sport": "swimming", "category": "tecnico", "description": "Práctica de virajes", "muscles": ["core", "piernas"], "is_public": True},
        {"name": "Nado con palas", "sport": "swimming", "category": "fuerza", "description": "Trabajo de fuerza en agua", "muscles": ["dorsal", "pectoral", "triceps"], "is_public": True},
        # Cycling
        {"name": "Intervalos 4x4", "sport": "cycling", "category": "potencia", "description": "Intervalos de alta intensidad", "muscles": ["cuadriceps", "gluteos"], "is_public": True},
        {"name": "Rodaje largo", "sport": "cycling", "category": "resistencia", "description": "Entrenamiento de base aeróbica", "muscles": ["cuadriceps", "isquiotibiales"], "is_public": True},
        {"name": "Series de subida", "sport": "cycling", "category": "fuerza", "description": "Trabajo de fuerza en subida", "muscles": ["cuadriceps", "gluteos", "core"], "is_public": True},
        # Crossfit
        {"name": "AMRAP 20min", "sport": "crossfit", "category": "metabolico", "description": "Circuito metabólico de alta intensidad", "muscles": ["cuerpo_completo"], "is_public": True},
        {"name": "Clean & Jerk", "sport": "crossfit", "category": "tecnico", "description": "Levantamiento olímpico", "muscles": ["piernas", "espalda", "hombros"], "is_public": True},
        {"name": "Muscle-ups", "sport": "crossfit", "category": "fuerza", "description": "Ejercicio de gimnasia", "muscles": ["dorsal", "triceps", "pectoral"], "is_public": True},
        # Weightlifting
        {"name": "Sentadilla trasera", "sport": "weightlifting", "category": "fuerza", "description": "Ejercicio fundamental de fuerza", "muscles": ["cuadriceps", "gluteos", "core"], "is_public": True},
        {"name": "Press banca", "sport": "weightlifting", "category": "fuerza", "description": "Empuje horizontal", "muscles": ["pectoral", "deltoides", "triceps"], "is_public": True},
        {"name": "Peso muerto", "sport": "weightlifting", "category": "fuerza", "description": "Tirón de suelo", "muscles": ["isquiotibiales", "gluteos", "espalda_baja"], "is_public": True},
    ]
    
    for ex in exercises:
        existing = await db.exercises.find_one({"name": ex["name"], "sport": ex["sport"]})
        if not existing:
            ex["id"] = str(uuid.uuid4())
            await db.exercises.insert_one(ex)
    
    return {"message": "Exercises seeded successfully", "count": len(exercises)}

# =============== PREVIOUS PLAN ANALYSIS ===============
class PreviousPlanAnalysisCreate(BaseModel):
    athlete_id: Optional[str] = None
    initialObjectives: str = ''
    achievementLevel: str = ''
    performanceIndicators: str = ''
    objectivesCompliance: str = ''
    recoveryProcess: str = ''
    fatiguePeriods: str = ''
    injuries: str = ''
    injuryImpact: str = ''
    injuryMeasures: str = ''
    planPositiveAspects: str = ''
    planImprovementAreas: str = ''
    nutritionHabits: str = ''
    hydrationHabits: str = ''
    nutritionImpact: str = ''
    stressManagement: str = ''
    competitionPressure: str = ''
    psychSupport: str = ''
    equipmentAdequacy: str = ''
    techNeeds: str = ''
    specificChanges: str = ''
    nextCycleChanges: str = ''
    stagnationPhases: str = ''
    stagnationReasons: str = ''
    performanceResults: str = ''
    planningCompliance: str = ''
    trainingLevels: str = ''
    difficulties: str = ''

@router.post("/analysis/previous-plan")
async def save_previous_plan_analysis(analysis: PreviousPlanAnalysisCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    analysis_id = str(uuid.uuid4())
    doc = {
        "id": analysis_id,
        "coach_id": user["id"],
        **analysis.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if analysis exists for this athlete
    existing = await db.plan_analysis.find_one({
        "coach_id": user["id"],
        "athlete_id": analysis.athlete_id
    })
    
    if existing:
        await db.plan_analysis.update_one(
            {"id": existing["id"]},
            {"$set": {**analysis.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Analysis updated", "id": existing["id"]}
    else:
        await db.plan_analysis.insert_one(doc)
        return {"message": "Analysis saved", "id": analysis_id}

@router.get("/analysis/previous-plan/{athlete_id}")
async def get_previous_plan_analysis(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    analysis = await db.plan_analysis.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis

# =============== SESSION PLANNING ===============
class SessionPlanningCreate(BaseModel):
    athlete_id: Optional[str] = None
    macrocycle_id: Optional[str] = None
    date: str
    sessionNumber: int = 1
    objectives: Dict[str, str] = {}
    phases: Dict[str, List[Dict[str, Any]]] = {}
    heartRate: Dict[str, Any] = {}
    feedback: str = ''

@router.post("/sessions/planning")
async def save_session_planning(session: SessionPlanningCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    session_id = str(uuid.uuid4())
    doc = {
        "id": session_id,
        "coach_id": user["id"],
        **session.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.session_plans.insert_one(doc)
    return {"message": "Session planning saved", "id": session_id}

@router.get("/sessions/planning/{athlete_id}")
async def get_session_plannings(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    sessions = await db.session_plans.find({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0}).to_list(100)
    return sessions

# =============== SPORT CHARACTERIZATION ===============
class SportCharacterizationCreate(BaseModel):
    athlete_id: Optional[str] = None
    sportName: str = ''
    movementOrganization: str = ''
    predominantEnergy: str = ''
    determinantEnergy: str = ''
    muscularFibers: str = ''
    energySubstrate: str = ''
    generalMotor: str = ''
    specialMotor: str = ''
    effortType: str = ''
    observation: str = ''
    description: str = ''

@router.post("/characterization/sport")
async def save_sport_characterization(data: SportCharacterizationCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.sport_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.sport_characterization.update_one(
            {"id": existing["id"]},
            {"$set": {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Characterization updated", "id": existing["id"]}
    else:
        await db.sport_characterization.insert_one(doc)
        return {"message": "Characterization saved", "id": doc_id}

@router.get("/characterization/sport/{athlete_id}")
async def get_sport_characterization(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.sport_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Characterization not found")
    
    return data

# =============== ATHLETE CHARACTERIZATION ===============
class AthleteCharacterizationCreate(BaseModel):
    athlete_id: Optional[str] = None
    name: str = ''
    experience: str = ''
    age: str = ''
    position: str = ''
    level: str = ''
    observation: str = ''
    inheritance: str = ''
    biologicalAge: str = ''
    optimalSelectionAge: str = ''
    healthStatus: str = ''
    anthropometricParams: str = ''
    physicalQualities: str = ''
    cognitiveCapabilities: str = ''
    psychologicalCharacteristics: str = ''
    socioeconomicCharacteristics: str = ''
    environment: str = ''
    nutritionalStatus: str = ''
    sportsTrajectory: str = ''
    otherSportsExperience: str = ''
    previousSeasonPerformance: str = ''
    objectives: str = ''
    trainingLevels: str = ''
    currentForm: str = ''
    injuries: str = ''

@router.post("/characterization/athlete")
async def save_athlete_characterization(data: AthleteCharacterizationCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.athlete_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.athlete_characterization.update_one(
            {"id": existing["id"]},
            {"$set": {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Characterization updated", "id": existing["id"]}
    else:
        await db.athlete_characterization.insert_one(doc)
        return {"message": "Characterization saved", "id": doc_id}

@router.get("/characterization/athlete/{athlete_id}")
async def get_athlete_characterization(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.athlete_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Characterization not found")
    
    return data

# =============== HEALTH RECORDS ===============
class HealthRecordCreate(BaseModel):
    athlete_id: Optional[str] = None
    type: str = ''
    description: str = ''
    dosage: str = ''
    frequency: str = ''
    affectedArea: str = ''
    date: str = ''
    treatment: str = ''
    severity: str = ''
    status: str = 'active'
    notes: str = ''

@router.post("/health/records")
async def create_health_record(data: HealthRecordCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    record_id = str(uuid.uuid4())
    doc = {
        "id": record_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.health_records.insert_one(doc)
    return {"message": "Record created", "id": record_id}

@router.get("/health/records/{athlete_id}")
async def get_health_records(athlete_id: str, type: Optional[str] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    query = {
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }
    if type:
        query["type"] = type
    
    records = await db.health_records.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return records

@router.delete("/health/records/{record_id}")
async def delete_health_record(record_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    result = await db.health_records.delete_one({
        "id": record_id,
        "coach_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# =============== COMPETITION ANALYSIS ===============
class CompetitionAnalysisCreate(BaseModel):
    athlete_id: Optional[str] = None
    name: str = ''
    type: str = ''
    category: str = ''
    date: str = ''
    result: str = ''
    objective: str = ''
    competitionFormat: str = ''
    location: str = ''
    duration: str = ''
    opponents: str = ''
    observations: str = ''
    preparationPhase: str = ''
    keyPerformanceIndicators: str = ''
    recoveryStrategy: str = ''
    status: str = 'pending'

@router.post("/competitions/analysis")
async def create_competition_analysis(data: CompetitionAnalysisCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    comp_id = str(uuid.uuid4())
    doc = {
        "id": comp_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.competition_analysis.insert_one(doc)
    return {"message": "Competition created", "id": comp_id}

@router.get("/competitions/analysis/{athlete_id}")
async def get_competition_analysis(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    comps = await db.competition_analysis.find({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0}).to_list(100)
    return comps

@router.delete("/competitions/analysis/{comp_id}")
async def delete_competition_analysis(comp_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    result = await db.competition_analysis.delete_one({
        "id": comp_id,
        "coach_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competition not found")
    return {"message": "Competition deleted"}

# =============== TRAINING STAGES (PERIODIZATION) ===============
class TrainingStageData(BaseModel):
    duration: str = ''
    volume: str = ''
    intensity: str = ''
    focus: str = ''
    objective: str = ''
    keyPoints: List[str] = []

class TrainingStagesCreate(BaseModel):
    athlete_id: Optional[str] = None
    stages: Dict[str, TrainingStageData] = {}

@router.post("/training-stages")
async def save_training_stages(data: TrainingStagesCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    
    # Convert stages to dict for MongoDB
    stages_dict = {}
    for key, stage in data.stages.items():
        stages_dict[key] = stage.model_dump() if hasattr(stage, 'model_dump') else dict(stage)
    
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "athlete_id": data.athlete_id,
        "stages": stages_dict,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.training_stages.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.training_stages.update_one(
            {"id": existing["id"]},
            {"$set": {"stages": stages_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Training stages updated", "id": existing["id"]}
    else:
        await db.training_stages.insert_one(doc)
        return {"message": "Training stages saved", "id": doc_id}

@router.get("/training-stages/{athlete_id}")
async def get_training_stages(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.training_stages.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Training stages not found")
    
    return data

# =============== PERIODIZATION MODELS ===============
class PeriodizationModelsCreate(BaseModel):
    athlete_id: Optional[str] = None
    planData: Dict[str, Any] = {}
    selectedModel: str = 'traditional'

@router.post("/periodization-models")
async def save_periodization_models(data: PeriodizationModelsCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "athlete_id": data.athlete_id,
        "planData": data.planData,
        "selectedModel": data.selectedModel,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.periodization_models.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.periodization_models.update_one(
            {"id": existing["id"]},
            {"$set": {"planData": data.planData, "selectedModel": data.selectedModel, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Periodization model updated", "id": existing["id"]}
    else:
        await db.periodization_models.insert_one(doc)
        return {"message": "Periodization model saved", "id": doc_id}

@router.get("/periodization-models/{athlete_id}")
async def get_periodization_models(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.periodization_models.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Periodization model not found")
    
    return data

# =============== COMPREHENSIVE TRAINING PLAN ===============
class ComprehensivePlanCreate(BaseModel):
    athlete_id: Optional[str] = None
    planData: Dict[str, Any] = {}
    planType: str = 'individual'

@router.post("/comprehensive-plan")
async def save_comprehensive_plan(data: ComprehensivePlanCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "athlete_id": data.athlete_id,
        "planData": data.planData,
        "planType": data.planType,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.comprehensive_plans.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.comprehensive_plans.update_one(
            {"id": existing["id"]},
            {"$set": {"planData": data.planData, "planType": data.planType, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Comprehensive plan updated", "id": existing["id"]}
    else:
        await db.comprehensive_plans.insert_one(doc)
        return {"message": "Comprehensive plan saved", "id": doc_id}

@router.get("/comprehensive-plan/{athlete_id}")
async def get_comprehensive_plan(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.comprehensive_plans.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Comprehensive plan not found")
    
    return data

# =============== TRAINING METHODS ===============
class TrainingMethodsCreate(BaseModel):
    methods: Dict[str, Any] = {}

@router.post("/training-methods")
async def save_training_methods(data: TrainingMethodsCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "methods": data.methods,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.training_methods.find_one({"coach_id": user["id"]})
    
    if existing:
        await db.training_methods.update_one(
            {"id": existing["id"]},
            {"$set": {"methods": data.methods, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Training methods updated", "id": existing["id"]}
    else:
        await db.training_methods.insert_one(doc)
        return {"message": "Training methods saved", "id": doc_id}

@router.get("/training-methods")
async def get_training_methods(user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.training_methods.find_one({"coach_id": user["id"]}, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Training methods not found")
    
    return data

# =============== ANTHROPOMETRIC DATA ===============
class AnthropometricCreate(BaseModel):
    athlete_id: Optional[str] = None
    records: List[Dict[str, Any]] = []

@router.post("/anthropometric")
async def save_anthropometric(data: AnthropometricCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.anthropometric.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.anthropometric.update_one(
            {"id": existing["id"]},
            {"$set": {"records": data.records, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Anthropometric data updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.anthropometric.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "records": data.records,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Anthropometric data saved", "id": doc_id}

@router.get("/anthropometric/{athlete_id}")
async def get_anthropometric(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.anthropometric.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No anthropometric data found")
    return data

# =============== TEST EVALUATIONS ===============
class TestEvaluationsCreate(BaseModel):
    athlete_id: Optional[str] = None
    evaluations: List[Dict[str, Any]] = []

@router.post("/test-evaluations")
async def save_test_evaluations(data: TestEvaluationsCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.test_evaluations.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.test_evaluations.update_one(
            {"id": existing["id"]},
            {"$set": {"evaluations": data.evaluations, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Test evaluations updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.test_evaluations.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "evaluations": data.evaluations,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Test evaluations saved", "id": doc_id}

@router.get("/test-evaluations/{athlete_id}")
async def get_test_evaluations(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.test_evaluations.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No test evaluations found")
    return data

# =============== TRAINING LOAD ===============
class TrainingLoadCreate(BaseModel):
    athlete_id: Optional[str] = None
    records: List[Dict[str, Any]] = []

@router.post("/training-load")
async def save_training_load(data: TrainingLoadCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.training_load.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.training_load.update_one(
            {"id": existing["id"]},
            {"$set": {"records": data.records, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Training load updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.training_load.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "records": data.records,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Training load saved", "id": doc_id}

@router.get("/training-load/{athlete_id}")
async def get_training_load(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.training_load.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No training load data found")
    return data

# =============== EVENTS CALENDAR ===============
class EventsCalendarCreate(BaseModel):
    athlete_id: Optional[str] = None
    events: List[Dict[str, Any]] = []

@router.post("/events-calendar")
async def save_events_calendar(data: EventsCalendarCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.events_calendar.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    if existing:
        await db.events_calendar.update_one({"id": existing["id"]}, {"$set": {"events": data.events, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Events updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.events_calendar.insert_one({"id": doc_id, "coach_id": user["id"], "athlete_id": data.athlete_id, "events": data.events, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"message": "Events saved", "id": doc_id}

@router.get("/events-calendar/{athlete_id}")
async def get_events_calendar(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.events_calendar.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No events found")
    return data

# =============== OBJECTIVES & INDICATORS ===============
class ObjectivesCreate(BaseModel):
    athlete_id: Optional[str] = None
    objectives: List[Dict[str, Any]] = []

@router.post("/objectives")
async def save_objectives(data: ObjectivesCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.objectives.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    if existing:
        await db.objectives.update_one({"id": existing["id"]}, {"$set": {"objectives": data.objectives, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Objectives updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.objectives.insert_one({"id": doc_id, "coach_id": user["id"], "athlete_id": data.athlete_id, "objectives": data.objectives, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"message": "Objectives saved", "id": doc_id}

@router.get("/objectives/{athlete_id}")
async def get_objectives(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.objectives.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No objectives found")
    return data

# =============== TRAINING CONTROL ===============
class TrainingControlCreate(BaseModel):
    athlete_id: Optional[str] = None
    records: List[Dict[str, Any]] = []

@router.post("/training-control")
async def save_training_control(data: TrainingControlCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.training_control.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    if existing:
        await db.training_control.update_one({"id": existing["id"]}, {"$set": {"records": data.records, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Control updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.training_control.insert_one({"id": doc_id, "coach_id": user["id"], "athlete_id": data.athlete_id, "records": data.records, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"message": "Control saved", "id": doc_id}

@router.get("/training-control/{athlete_id}")
async def get_training_control(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    data = await db.training_control.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No control data found")
    return data

# =============== GRAPHIC PLAN ===============
class GraphicPlanCreate(BaseModel):
    athlete_id: Optional[str] = None
    generalInfo: Dict[str, Any] = {}
    planData: Dict[str, Any] = {}
    cycleDuration: str = 'annual'

@router.post("/graphic-plan")
async def save_graphic_plan(data: GraphicPlanCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.graphic_plans.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.graphic_plans.update_one(
            {"id": existing["id"]},
            {"$set": {
                "generalInfo": data.generalInfo,
                "planData": data.planData,
                "cycleDuration": data.cycleDuration,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Graphic plan updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.graphic_plans.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "generalInfo": data.generalInfo,
            "planData": data.planData,
            "cycleDuration": data.cycleDuration,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Graphic plan saved", "id": doc_id}

@router.get("/graphic-plan/{athlete_id}")
async def get_graphic_plan(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    # Handle "null" string as None
    query_athlete_id = None if athlete_id in ["null", "undefined", ""] else athlete_id
    data = await db.graphic_plans.find_one({"coach_id": user["id"], "athlete_id": query_athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No graphic plan found")
    return data

# =============== PERIODIZATION PLAN (Hierarchical) ===============
class PeriodizationPlanCreate(BaseModel):
    athlete_id: Optional[str] = None
    macrociclo: Dict[str, Any] = {}
    mesociclos: List[Dict[str, Any]] = []
    microciclos: List[Dict[str, Any]] = []
    sesiones: List[Dict[str, Any]] = []

@router.post("/periodization-plan")
async def save_periodization_plan(data: PeriodizationPlanCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    athlete_id = None if data.athlete_id in ["null", "undefined", "", "default"] else data.athlete_id
    existing = await db.periodization_plans.find_one({"coach_id": user["id"], "athlete_id": athlete_id})
    
    if existing:
        await db.periodization_plans.update_one(
            {"id": existing["id"]},
            {"$set": {
                "macrociclo": data.macrociclo,
                "mesociclos": data.mesociclos,
                "microciclos": data.microciclos,
                "sesiones": data.sesiones,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Periodization plan updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.periodization_plans.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": athlete_id,
            "macrociclo": data.macrociclo,
            "mesociclos": data.mesociclos,
            "microciclos": data.microciclos,
            "sesiones": data.sesiones,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Periodization plan saved", "id": doc_id}

@router.get("/periodization-plan/{athlete_id}")
async def get_periodization_plan(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    query_athlete_id = None if athlete_id in ["null", "undefined", "", "default"] else athlete_id
    data = await db.periodization_plans.find_one({"coach_id": user["id"], "athlete_id": query_athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No periodization plan found")
    return data

# =============== EXERCISE LIBRARY ===============
class ExerciseLibraryCreate(BaseModel):
    categories: Dict[str, Any] = {}

# =============== PERIODIZATION SYSTEM (AUTO-GENERATION) ===============
class PeriodizationCreate(BaseModel):
    id: str
    name: str
    athleteId: Optional[str] = None
    startDate: str
    endDate: str
    duration: str
    totalWeeks: int
    mainCompetition: Optional[str] = None
    mainCompetitionDate: Optional[str] = None
    sessionsPerWeek: int
    model: str
    phases: List[Dict[str, Any]] = []
    mesocycles: List[Dict[str, Any]] = []
    createdAt: str

@router.post("/periodization")
async def save_periodization(data: PeriodizationCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    athlete_id = None if data.athleteId in ["null", "undefined", "", "default", None] else data.athleteId
    existing = await db.periodizations.find_one({"coach_id": user["id"], "athlete_id": athlete_id})
    
    doc = {
        "periodization_id": data.id,
        "coach_id": user["id"],
        "athlete_id": athlete_id,
        "name": data.name,
        "start_date": data.startDate,
        "end_date": data.endDate,
        "duration": data.duration,
        "total_weeks": data.totalWeeks,
        "main_competition": data.mainCompetition,
        "main_competition_date": data.mainCompetitionDate,
        "sessions_per_week": data.sessionsPerWeek,
        "model": data.model,
        "phases": data.phases,
        "mesocycles": data.mesocycles,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.periodizations.update_one(
            {"id": existing["id"]},
            {"$set": doc}
        )
        return {"message": "Periodization updated", "id": existing["id"]}
    else:
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.periodizations.insert_one(doc)
        return {"message": "Periodization saved", "id": doc["id"]}

@router.get("/periodization/{athlete_id}")
async def get_periodization(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    query_athlete_id = None if athlete_id in ["null", "undefined", "", "default"] else athlete_id
    data = await db.periodizations.find_one(
        {"coach_id": user["id"], "athlete_id": query_athlete_id}, 
        {"_id": 0}
    )
    if not data:
        return None  # Return null instead of 404 to allow frontend to handle empty state
    return data

@router.delete("/periodization/{athlete_id}/{plan_id}")
async def delete_periodization(athlete_id: str, plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Elimina un plan de periodización específico"""
    result = await db.periodizations.delete_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id,
        "periodization_id": plan_id
    })
    
    if result.deleted_count == 0:
        # Try with id field as fallback
        result = await db.periodizations.delete_one({
            "coach_id": user["id"],
            "athlete_id": athlete_id,
            "id": plan_id
        })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"message": "Periodization deleted successfully"}

@router.get("/periodization-all/{athlete_id}")
async def get_all_periodizations(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtiene todos los planes de periodización de un atleta"""
    query_athlete_id = None if athlete_id in ["null", "undefined", "", "default"] else athlete_id
    cursor = db.periodizations.find(
        {"coach_id": user["id"], "athlete_id": query_athlete_id}, 
        {"_id": 0}
    )
    plans = await cursor.to_list(100)
    return plans

@router.post("/exercise-library")
async def save_exercise_library(data: ExerciseLibraryCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    existing = await db.exercise_libraries.find_one({"coach_id": user["id"]})
    
    if existing:
        await db.exercise_libraries.update_one(
            {"id": existing["id"]},
            {"$set": {
                "categories": data.categories,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Exercise library updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.exercise_libraries.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "categories": data.categories,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Exercise library saved", "id": doc_id}

@router.get("/exercise-library")
async def get_exercise_library(user: dict = Depends(get_current_user), db=Depends(get_db)):
    # First try user's own library
    data = await db.exercise_libraries.find_one({"coach_id": user["id"]}, {"_id": 0})
    if data and data.get("categories"):
        return data
    # Fallback: any library with categories (shared/public)
    data = await db.exercise_libraries.find_one({"categories": {"$exists": True, "$ne": []}}, {"_id": 0})
    if data:
        return data
    raise HTTPException(status_code=404, detail="No exercise library found")

