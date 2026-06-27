"""Rutas de ciclos (macro/meso/micro), sesiones y competencias (legacy v1).
Extraído de server.py — FASE 1 segmentación."""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from core.auth import get_db, get_current_user, calculate_load
from core.models import (
    MacrocycleCreate, MacrocycleResponse, MesocycleCreate, MesocycleResponse,
    MicrocycleCreate, MicrocycleResponse, SessionCreate, SessionResponse,
    CompetitionCreate, CompetitionResponse,
)

router = APIRouter(prefix="/api", tags=["Cycles & Sessions"])


# =============== MACROCYCLES ROUTES ===============
@router.post("/macrocycles", response_model=MacrocycleResponse)
async def create_macrocycle(macrocycle: MacrocycleCreate, athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    athlete = await db.athletes.find_one({"id": athlete_id, "coach_id": user["id"]})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    macro_id = str(uuid.uuid4())
    doc = {
        "id": macro_id,
        "athlete_id": athlete_id,
        "coach_id": user["id"],
        **macrocycle.model_dump(),
        "sport": macrocycle.sport.value,
        "planning_model": macrocycle.planning_model.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.macrocycles.insert_one(doc)
    doc.pop("_id", None)
    doc["mesocycles"] = []
    return MacrocycleResponse(**doc)

@router.get("/macrocycles", response_model=List[MacrocycleResponse])
async def get_macrocycles(athlete_id: Optional[str] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    query = {"coach_id": user["id"]}
    if athlete_id:
        query["athlete_id"] = athlete_id
    macros = await db.macrocycles.find(query, {"_id": 0}).to_list(1000)
    for macro in macros:
        macro["mesocycles"] = await db.mesocycles.find({"macrocycle_id": macro["id"]}, {"_id": 0}).to_list(100)
    return [MacrocycleResponse(**m) for m in macros]

@router.get("/macrocycles/{macro_id}", response_model=MacrocycleResponse)
async def get_macrocycle(macro_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    macro = await db.macrocycles.find_one({"id": macro_id, "coach_id": user["id"]}, {"_id": 0})
    if not macro:
        raise HTTPException(status_code=404, detail="Macrocycle not found")
    macro["mesocycles"] = await db.mesocycles.find({"macrocycle_id": macro_id}, {"_id": 0}).to_list(100)
    for meso in macro["mesocycles"]:
        meso["microcycles"] = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0}).to_list(100)
        for micro in meso["microcycles"]:
            micro["sessions"] = await db.sessions.find({"microcycle_id": micro["id"]}, {"_id": 0}).to_list(100)
    return MacrocycleResponse(**macro)

# =============== MESOCYCLES ROUTES ===============
@router.post("/mesocycles", response_model=MesocycleResponse)
async def create_mesocycle(mesocycle: MesocycleCreate, macrocycle_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    macro = await db.macrocycles.find_one({"id": macrocycle_id, "coach_id": user["id"]})
    if not macro:
        raise HTTPException(status_code=404, detail="Macrocycle not found")
    
    meso_id = str(uuid.uuid4())
    doc = {
        "id": meso_id,
        "macrocycle_id": macrocycle_id,
        **mesocycle.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.mesocycles.insert_one(doc)
    doc.pop("_id", None)
    doc["microcycles"] = []
    return MesocycleResponse(**doc)

# =============== MICROCYCLES ROUTES ===============
@router.post("/microcycles", response_model=MicrocycleResponse)
async def create_microcycle(microcycle: MicrocycleCreate, mesocycle_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    meso = await db.mesocycles.find_one({"id": mesocycle_id})
    if not meso:
        raise HTTPException(status_code=404, detail="Mesocycle not found")
    
    micro_id = str(uuid.uuid4())
    doc = {
        "id": micro_id,
        "mesocycle_id": mesocycle_id,
        **microcycle.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.microcycles.insert_one(doc)
    doc.pop("_id", None)
    doc["sessions"] = []
    return MicrocycleResponse(**doc)

# =============== SESSIONS ROUTES ===============
@router.post("/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, microcycle_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    micro = await db.microcycles.find_one({"id": microcycle_id})
    if not micro:
        raise HTTPException(status_code=404, detail="Microcycle not found")
    
    session_id = str(uuid.uuid4())
    load = calculate_load(session.volume, session.intensity)
    doc = {
        "id": session_id,
        "microcycle_id": microcycle_id,
        **session.model_dump(),
        "session_type": session.session_type.value,
        "intensity": session.intensity.value,
        "load": load,
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sessions.insert_one(doc)
    doc.pop("_id", None)
    return SessionResponse(**doc)

@router.put("/sessions/{session_id}/complete")
async def complete_session(session_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    result = await db.sessions.update_one({"id": session_id}, {"$set": {"completed": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session marked as completed"}

@router.get("/sessions/calendar")
async def get_calendar_sessions(athlete_id: str, start_date: str, end_date: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    macros = await db.macrocycles.find({"athlete_id": athlete_id, "coach_id": user["id"]}, {"_id": 0}).to_list(100)
    all_sessions = []
    for macro in macros:
        mesos = await db.mesocycles.find({"macrocycle_id": macro["id"]}, {"_id": 0}).to_list(100)
        for meso in mesos:
            micros = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0}).to_list(100)
            for micro in micros:
                sessions = await db.sessions.find({
                    "microcycle_id": micro["id"],
                    "date": {"$gte": start_date, "$lte": end_date}
                }, {"_id": 0}).to_list(1000)
                for s in sessions:
                    s["macrocycle_name"] = macro["name"]
                    s["mesocycle_name"] = meso["name"]
                    s["microcycle_name"] = micro["name"]
                all_sessions.extend(sessions)
    return all_sessions

# =============== COMPETITIONS ROUTES ===============
@router.post("/competitions", response_model=CompetitionResponse)
async def create_competition(competition: CompetitionCreate, athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    athlete = await db.athletes.find_one({"id": athlete_id, "coach_id": user["id"]})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    comp_id = str(uuid.uuid4())
    doc = {
        "id": comp_id,
        "athlete_id": athlete_id,
        "coach_id": user["id"],
        **competition.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.competitions.insert_one(doc)
    doc.pop("_id", None)
    return CompetitionResponse(**doc)

@router.get("/competitions", response_model=List[CompetitionResponse])
async def get_competitions(athlete_id: Optional[str] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    query = {"coach_id": user["id"]}
    if athlete_id:
        query["athlete_id"] = athlete_id
    comps = await db.competitions.find(query, {"_id": 0}).to_list(1000)
    return [CompetitionResponse(**c) for c in comps]


