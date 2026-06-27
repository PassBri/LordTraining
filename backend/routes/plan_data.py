"""Rutas de datos vinculados al plan (objetivos, evaluaciones, competencias,
análisis del plan anterior y agregador). Extraído de server.py — FASE 1 segmentación.
Sin cambios de comportamiento: mismas rutas, mismos modelos (core.models)."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
from bson import ObjectId
import jwt
import os

from core.models import (
    PlanObjectiveCreate, PlanObjectiveResponse,
    PlanEvaluationCreate, PlanEvaluationResponse,
    PlanCompetitionCreate, PlanCompetitionResponse,
    PlanPreviousAnalysisCreate, PlanPreviousAnalysisResponse,
)

router = APIRouter(prefix="/api", tags=["Plan Data"])
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


# --- PLAN OBJECTIVES ---
@router.post("/plan-data/objectives", response_model=PlanObjectiveResponse)
async def create_plan_objective(data: PlanObjectiveCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Crear o actualizar objetivos del plan"""
    existing = await db.plan_objectives.find_one({"plan_id": data.plan_id, "user_id": user["id"]})
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "main_objective": data.main_objective,
        "secondary_objectives": data.secondary_objectives,
        "performance_indicators": data.performance_indicators,
        "timeline": data.timeline,
        "data": data.data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if existing:
        await db.plan_objectives.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["id"] = str(existing["_id"])
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.plan_objectives.insert_one(doc)
        doc["id"] = str(result.inserted_id)
    return PlanObjectiveResponse(**doc)


@router.get("/plan-data/objectives/{plan_id}", response_model=Optional[PlanObjectiveResponse])
async def get_plan_objectives(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener objetivos de un plan"""
    doc = await db.plan_objectives.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if doc:
        doc["id"] = plan_id
        return PlanObjectiveResponse(**doc)
    return None


# --- PLAN EVALUATIONS ---
@router.post("/plan-data/evaluations", response_model=PlanEvaluationResponse)
async def create_plan_evaluation(data: PlanEvaluationCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Crear una evaluación vinculada al plan"""
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "athlete_id": data.athlete_id,
        "evaluation_type": data.evaluation_type,
        "date": data.date,
        "results": data.results,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.plan_evaluations.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return PlanEvaluationResponse(**doc)


@router.get("/plan-data/evaluations/{plan_id}", response_model=List[PlanEvaluationResponse])
async def get_plan_evaluations(plan_id: str, evaluation_type: Optional[str] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener evaluaciones de un plan"""
    query = {"plan_id": plan_id, "user_id": user["id"]}
    if evaluation_type:
        query["evaluation_type"] = evaluation_type
    evaluations = await db.plan_evaluations.find(query).to_list(100)
    return [PlanEvaluationResponse(**{**e, "id": str(e["_id"])}) for e in evaluations]


@router.get("/plan-data/evaluations/{plan_id}/{evaluation_type}")
async def get_plan_evaluations_by_type(plan_id: str, evaluation_type: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener evaluaciones de un plan por tipo específico"""
    query = {"plan_id": plan_id, "user_id": user["id"], "evaluation_type": evaluation_type}
    evaluations = await db.plan_evaluations.find(query).to_list(100)
    return [{**e, "id": str(e["_id"]), "_id": None} for e in evaluations]


@router.delete("/plan-data/evaluations/{evaluation_id}")
async def delete_plan_evaluation(evaluation_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Eliminar una evaluación"""
    result = await db.plan_evaluations.delete_one({"_id": ObjectId(evaluation_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"message": "Evaluación eliminada"}


# --- PLAN COMPETITIONS ---
@router.post("/plan-data/competitions", response_model=PlanCompetitionResponse)
async def create_plan_competition(data: PlanCompetitionCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Crear una competencia vinculada al plan"""
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "name": data.name,
        "date": data.date,
        "importance": data.importance,
        "location": data.location,
        "expected_result": data.expected_result,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.plan_competitions.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return PlanCompetitionResponse(**doc)


@router.get("/plan-data/competitions/{plan_id}", response_model=List[PlanCompetitionResponse])
async def get_plan_competitions(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener competencias de un plan"""
    competitions = await db.plan_competitions.find({"plan_id": plan_id, "user_id": user["id"]}).to_list(100)
    return [PlanCompetitionResponse(**{**c, "id": str(c["_id"])}) for c in competitions]


@router.put("/plan-data/competitions/{competition_id}", response_model=PlanCompetitionResponse)
async def update_plan_competition(competition_id: str, data: PlanCompetitionCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Actualizar una competencia"""
    doc = {
        "name": data.name,
        "date": data.date,
        "importance": data.importance,
        "location": data.location,
        "expected_result": data.expected_result,
        "notes": data.notes
    }
    result = await db.plan_competitions.find_one_and_update(
        {"_id": ObjectId(competition_id), "user_id": user["id"]},
        {"$set": doc},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Competencia no encontrada")
    return PlanCompetitionResponse(**{**result, "id": str(result["_id"])})


@router.delete("/plan-data/competitions/{competition_id}")
async def delete_plan_competition(competition_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Eliminar una competencia"""
    result = await db.plan_competitions.delete_one({"_id": ObjectId(competition_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competencia no encontrada")
    return {"message": "Competencia eliminada"}


# --- PLAN PREVIOUS ANALYSIS ---
@router.post("/plan-data/previous-analysis", response_model=PlanPreviousAnalysisResponse)
async def create_plan_previous_analysis(data: PlanPreviousAnalysisCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Crear o actualizar análisis del plan anterior"""
    existing = await db.plan_previous_analysis.find_one({"plan_id": data.plan_id, "user_id": user["id"]})
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "previous_plan_summary": data.previous_plan_summary,
        "achievements": data.achievements,
        "areas_to_improve": data.areas_to_improve,
        "lessons_learned": data.lessons_learned,
        "athlete_feedback": data.athlete_feedback,
        "data": data.data
    }
    if existing:
        await db.plan_previous_analysis.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["id"] = str(existing["_id"])
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.plan_previous_analysis.insert_one(doc)
        doc["id"] = str(result.inserted_id)
    return PlanPreviousAnalysisResponse(**doc)


@router.get("/plan-data/previous-analysis/{plan_id}", response_model=Optional[PlanPreviousAnalysisResponse])
async def get_plan_previous_analysis(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener análisis del plan anterior"""
    doc = await db.plan_previous_analysis.find_one({"plan_id": plan_id, "user_id": user["id"]})
    if doc:
        return PlanPreviousAnalysisResponse(**{**doc, "id": str(doc["_id"])})
    return None


# --- GET ALL PLAN DATA ---
@router.get("/plan-data/{plan_id}")
async def get_all_plan_data(plan_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener todos los datos vinculados a un plan, evaluaciones organizadas por tipo"""
    objectives = await db.plan_objectives.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})

    evaluations_cursor = db.plan_evaluations.find({"plan_id": plan_id, "user_id": user["id"]})
    evaluations_by_type = {
        "medical": [],
        "anthropometric": [],
        "physical": [],
        "technical": [],
        "tactical": [],
        "psychological": []
    }
    evaluations_flat = []
    async for e in evaluations_cursor:
        e["id"] = str(e.pop("_id"))
        eval_type = e.get("evaluation_type", "")
        if eval_type in evaluations_by_type:
            evaluations_by_type[eval_type].append(e)
        evaluations_flat.append(e)

    competitions_cursor = db.plan_competitions.find({"plan_id": plan_id, "user_id": user["id"]})
    competitions = []
    async for c in competitions_cursor:
        c["id"] = str(c.pop("_id"))
        competitions.append(c)

    previous_analysis = await db.plan_previous_analysis.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})

    plan_data_init = await db.plan_data.find_one({"plan_id": plan_id}, {"_id": 0})

    return {
        "plan_id": plan_id,
        "objectives": objectives,
        "evaluations": evaluations_by_type,
        "evaluations_flat": evaluations_flat,
        "competitions": competitions,
        "previous_analysis": previous_analysis,
        "athlete_characterization": plan_data_init.get("athlete_characterization") if plan_data_init else None
    }
