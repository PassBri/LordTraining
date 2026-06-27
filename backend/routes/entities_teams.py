"""Rutas de Entidades (federaciones/clubes/escuelas) y Equipos.
Extraído de server.py — FASE 1 segmentación. Sin cambios de comportamiento."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import jwt
import os

from core.models import EntityCreate, EntityResponse, AthleteResponse, EntityType

router = APIRouter(prefix="/api", tags=["Entities & Teams"])
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


# =============== ENTITIES ROUTES (Federaciones, Clubes, Escuelas, etc.) ===============
@router.post("/entities", response_model=EntityResponse)
async def create_entity(entity: EntityCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Crear una nueva entidad (Federación, Club, Escuela, etc.)"""
    entity_id = str(uuid.uuid4())
    doc = {
        "id": entity_id,
        "coach_id": user["id"],
        **entity.model_dump(),
        "entity_type": entity.entity_type.value,
        "athletes_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.entities.insert_one(doc)
    doc.pop("_id", None)
    return EntityResponse(**doc)

@router.get("/entities", response_model=List[EntityResponse])
async def get_entities(entity_type: Optional[EntityType] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener todas las entidades, opcionalmente filtradas por tipo"""
    query = {"coach_id": user["id"]}
    if entity_type:
        query["entity_type"] = entity_type.value
    entities = await db.entities.find(query, {"_id": 0}).to_list(1000)
    
    # Contar atletas afiliados a cada entidad
    for entity in entities:
        count = await db.athletes.count_documents({
            "coach_id": user["id"],
            "affiliations": entity["id"]
        })
        entity["athletes_count"] = count
    
    return [EntityResponse(**e) for e in entities]

@router.get("/entities/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener una entidad específica"""
    entity = await db.entities.find_one({"id": entity_id, "coach_id": user["id"]}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Contar atletas
    count = await db.athletes.count_documents({
        "coach_id": user["id"],
        "affiliations": entity_id
    })
    entity["athletes_count"] = count
    
    return EntityResponse(**entity)

@router.put("/entities/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, entity: EntityCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Actualizar una entidad"""
    update_data = entity.model_dump()
    update_data["entity_type"] = entity.entity_type.value
    
    result = await db.entities.update_one(
        {"id": entity_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    updated = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    return EntityResponse(**updated)

@router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Eliminar una entidad"""
    # Primero, remover la afiliación de todos los atletas
    await db.athletes.update_many(
        {"coach_id": user["id"], "affiliations": entity_id},
        {"$pull": {"affiliations": entity_id}}
    )
    
    result = await db.entities.delete_one({"id": entity_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"message": "Entity deleted"}

@router.get("/entities/{entity_id}/athletes", response_model=List[AthleteResponse])
async def get_entity_athletes(entity_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener todos los atletas afiliados a una entidad"""
    athletes = await db.athletes.find({
        "coach_id": user["id"],
        "affiliations": entity_id
    }, {"_id": 0}).to_list(1000)
    return [AthleteResponse(**a) for a in athletes]

@router.get("/entities-hierarchy")
async def get_entities_hierarchy(user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener la jerarquía completa de entidades"""
    entities = await db.entities.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Organizar por tipo
    hierarchy = {
        "federations": [],
        "clubs": [],
        "schools": [],
        "national_teams": [],
        "teams": [],
        "leagues": []
    }
    
    for entity in entities:
        entity_type = entity.get("entity_type", "club")
        count = await db.athletes.count_documents({
            "coach_id": user["id"],
            "affiliations": entity["id"]
        })
        entity["athletes_count"] = count
        
        if entity_type == "federation":
            hierarchy["federations"].append(entity)
        elif entity_type == "club":
            hierarchy["clubs"].append(entity)
        elif entity_type == "school":
            hierarchy["schools"].append(entity)
        elif entity_type == "national_team":
            hierarchy["national_teams"].append(entity)
        elif entity_type == "team":
            hierarchy["teams"].append(entity)
        elif entity_type == "league":
            hierarchy["leagues"].append(entity)
    
    return hierarchy

@router.get("/entity-types")
async def get_entity_types():
    """Obtener los tipos de entidades disponibles"""
    return [
        {"id": "federation", "name": "Federación", "icon": "🏛️", "description": "Organismo rector a nivel nacional o regional"},
        {"id": "club", "name": "Club", "icon": "🏢", "description": "Club deportivo afiliado"},
        {"id": "school", "name": "Escuela", "icon": "🏫", "description": "Escuela de formación deportiva"},
        {"id": "national_team", "name": "Selección Nacional", "icon": "🇺🇳", "description": "Equipo representativo nacional"},
        {"id": "team", "name": "Equipo/Categoría", "icon": "👥", "description": "Equipo o categoría específica"},
        {"id": "league", "name": "Liga/Torneo", "icon": "🏆", "description": "Competencia organizada"}
    ]

# =============== TEAMS ROUTES ===============
class TeamCreate(BaseModel):
    name: str
    sport: str = "other"
    category: Optional[str] = None
    entity_id: Optional[str] = None
    affiliations: Optional[dict] = None
    athletes: Optional[List[str]] = []

class TeamResponse(BaseModel):
    id: str
    coach_id: str
    name: str
    sport: str
    category: Optional[str] = None
    entity_id: Optional[str] = None
    affiliations: Optional[dict] = None
    athletes: Optional[List[str]] = []
    created_at: str

@router.post("/teams", response_model=TeamResponse)
async def create_team(team: TeamCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    team_id = str(uuid.uuid4())
    doc = {
        "id": team_id,
        "coach_id": user["id"],
        "name": team.name,
        "sport": team.sport,
        "category": team.category,
        "entity_id": team.entity_id,
        "affiliations": team.affiliations or {},
        "athletes": team.athletes or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return TeamResponse(**doc)

@router.get("/teams", response_model=List[TeamResponse])
async def get_teams(user: dict = Depends(get_current_user), db=Depends(get_db)):
    teams = await db.teams.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [TeamResponse(**t) for t in teams]

@router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    team = await db.teams.find_one({"id": team_id, "coach_id": user["id"]}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**team)

@router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(team_id: str, team: TeamCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    update_data = team.model_dump(exclude_unset=True)
    result = await db.teams.update_one(
        {"id": team_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return TeamResponse(**updated)

@router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    result = await db.teams.delete_one({"id": team_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted successfully"}

@router.post("/teams/{team_id}/athletes/{athlete_id}")
async def add_athlete_to_team(team_id: str, athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    result = await db.teams.update_one(
        {"id": team_id, "coach_id": user["id"]},
        {"$addToSet": {"athletes": athlete_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Athlete added to team"}

@router.delete("/teams/{team_id}/athletes/{athlete_id}")
async def remove_athlete_from_team(team_id: str, athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    result = await db.teams.update_one(
        {"id": team_id, "coach_id": user["id"]},
        {"$pull": {"athletes": athlete_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Athlete removed from team"}
