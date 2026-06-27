"""Rutas de Atletas y Ejercicios. Extraído de server.py — FASE 1 segmentación."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import jwt
import os

from core.models import (
    AthleteCreate, AthleteResponse, ExerciseCreate, ExerciseResponse,
    Sport, SubscriptionPlan, SUBSCRIPTION_LIMITS,
)

router = APIRouter(prefix="/api", tags=["Athletes & Exercises"])
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


# =============== ATHLETES ROUTES ===============
@router.post("/athletes", response_model=AthleteResponse)
async def create_athlete(athlete: AthleteCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    limits = SUBSCRIPTION_LIMITS[SubscriptionPlan(user["subscription"])]
    count = await db.athletes.count_documents({"coach_id": user["id"]})
    if count >= limits["athletes"]:
        raise HTTPException(status_code=403, detail=f"Athlete limit reached for {user['subscription']} plan")
    
    athlete_id = str(uuid.uuid4())
    doc = {
        "id": athlete_id,
        "coach_id": user["id"],
        **athlete.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.athletes.insert_one(doc)
    
    # Add athlete to team if team_id provided
    if athlete.team_id:
        await db.teams.update_one(
            {"id": athlete.team_id, "coach_id": user["id"]},
            {"$addToSet": {"athletes": athlete_id}}
        )
    
    doc.pop("_id", None)
    return AthleteResponse(**doc)

@router.get("/athletes", response_model=List[AthleteResponse])
async def get_athletes(user: dict = Depends(get_current_user), db=Depends(get_db)):
    athletes = await db.athletes.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [AthleteResponse(**a) for a in athletes]

@router.get("/athletes/{athlete_id}", response_model=AthleteResponse)
async def get_athlete(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    athlete = await db.athletes.find_one({"id": athlete_id, "coach_id": user["id"]}, {"_id": 0})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return AthleteResponse(**athlete)

@router.put("/athletes/{athlete_id}", response_model=AthleteResponse)
async def update_athlete(athlete_id: str, athlete: AthleteCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    update_data = athlete.model_dump()
    result = await db.athletes.update_one(
        {"id": athlete_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    # Handle team change
    if athlete.team_id:
        # Remove from old teams first
        await db.teams.update_many(
            {"coach_id": user["id"], "athletes": athlete_id},
            {"$pull": {"athletes": athlete_id}}
        )
        # Add to new team
        await db.teams.update_one(
            {"id": athlete.team_id, "coach_id": user["id"]},
            {"$addToSet": {"athletes": athlete_id}}
        )
    
    updated = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    return AthleteResponse(**updated)

@router.delete("/athletes/{athlete_id}")
async def delete_athlete(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    # Remove from any teams first
    await db.teams.update_many(
        {"coach_id": user["id"], "athletes": athlete_id},
        {"$pull": {"athletes": athlete_id}}
    )
    result = await db.athletes.delete_one({"id": athlete_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return {"message": "Athlete deleted"}

# =============== EXERCISES ROUTES ===============
@router.post("/exercises", response_model=ExerciseResponse)
async def create_exercise(exercise: ExerciseCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    exercise_id = str(uuid.uuid4())
    doc = {
        "id": exercise_id,
        "coach_id": user["id"],
        **exercise.model_dump(),
        "sport": exercise.sport.value,
        "is_public": False
    }
    await db.exercises.insert_one(doc)
    doc.pop("_id", None)
    return ExerciseResponse(**doc)

@router.get("/exercises", response_model=List[ExerciseResponse])
async def get_exercises(sport: Optional[Sport] = None, category: Optional[str] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    query = {"$or": [{"is_public": True}, {"coach_id": user["id"]}]}
    if sport:
        query["sport"] = sport.value
    if category:
        query["category"] = category
    exercises = await db.exercises.find(query, {"_id": 0}).to_list(1000)
    return [ExerciseResponse(**e) for e in exercises]
