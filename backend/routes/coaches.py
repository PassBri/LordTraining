"""
CRUD de Entrenadores (Coaches) — perfil profesional de los entrenadores
gestionados por el coach principal (puede registrar staff técnico, asistentes, etc.).
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/coaches", tags=["coaches"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_coaches = _db["coaches"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


class CoachIn(BaseModel):
    # Datos personales
    name: str = Field(..., min_length=1, max_length=200)
    photo_url: Optional[str] = None
    birth_date: Optional[str] = None      # ISO 'YYYY-MM-DD'
    nationality: Optional[str] = None
    gender: Optional[str] = None           # 'M' | 'F' | 'O'
    document_id: Optional[str] = None       # cédula / DNI
    # Contacto
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    # Profesional
    specialty: Optional[str] = None         # ej "Preparador físico"
    sub_specialty: Optional[str] = None      # ej "Hipertrofia funcional"
    years_experience: Optional[int] = Field(default=None, ge=0, le=80)
    level: Optional[str] = None              # ej "Nivel III · Federación Internacional"
    license_number: Optional[str] = None
    current_organization: Optional[str] = None
    role_in_org: Optional[str] = None
    # Educación: lista de objetos {title, institution, year, type}
    studies: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[Dict[str, Any]] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=list)
    # Trayectoria (clubes/equipos previos): {organization, role, from_year, to_year}
    career_history: List[Dict[str, Any]] = Field(default_factory=list)
    # Logros: campeonatos ganados, medallas, premios
    achievements: List[Dict[str, Any]] = Field(default_factory=list)
    # Atletas/equipos formados
    athletes_coached: List[Dict[str, Any]] = Field(default_factory=list)
    # Bio + extras
    bio: Optional[str] = None
    methodology: Optional[str] = None
    social_links: Dict[str, str] = Field(default_factory=dict)  # {twitter, instagram, linkedin, web}
    is_active: bool = True


class CoachOut(CoachIn):
    id: str
    coach_id: str
    created_at: str
    updated_at: Optional[str] = None


@router.post("", response_model=CoachOut)
async def create_coach(payload: CoachIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": uid,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    await _coaches.insert_one(doc)
    doc.pop("_id", None)
    return CoachOut(**doc)


@router.get("", response_model=List[CoachOut])
async def list_coaches(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    items = await _coaches.find({"coach_id": uid}, {"_id": 0}).to_list(2000)
    return [CoachOut(**c) for c in items]


@router.get("/{coach_id}", response_model=CoachOut)
async def get_coach(coach_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    c = await _coaches.find_one({"id": coach_id, "coach_id": uid}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Entrenador no encontrado")
    return CoachOut(**c)


@router.put("/{coach_id}", response_model=CoachOut)
async def update_coach(coach_id: str, payload: CoachIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    data = payload.model_dump()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await _coaches.update_one(
        {"id": coach_id, "coach_id": uid},
        {"$set": data}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Entrenador no encontrado")
    updated = await _coaches.find_one({"id": coach_id}, {"_id": 0})
    return CoachOut(**updated)


@router.delete("/{coach_id}")
async def delete_coach(coach_id: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _coaches.delete_one({"id": coach_id, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Entrenador no encontrado")
    return {"ok": True}
