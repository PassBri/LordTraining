"""
CRUD de modelos de periodización (personalizados por usuario).
- Cada usuario obtiene automáticamente una copia editable de los 29 modelos por defecto al acceder por primera vez.
- El usuario puede editar/eliminar sus copias y crear modelos propios.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

from data.periodization_library import DEFAULT_PERIODIZATION_LIBRARY

router = APIRouter(prefix="/periodization-library", tags=["periodization-library"])

# Mongo
mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]
models_collection = db["periodization_library"]


class PhaseSchema(BaseModel):
    name: str
    color: str = "#3B82F6"
    volume: int = 70
    intensity: int = 70
    duration_weeks: str = "4"
    description: Optional[str] = ""


class PeriodizationModelCreate(BaseModel):
    name: str
    author: Optional[str] = ""
    category: str = "Custom"
    description: Optional[str] = ""
    icon: Optional[str] = "📊"
    color: Optional[str] = "#CCFF00"
    phases: List[PhaseSchema] = Field(default_factory=list)
    characteristics: List[str] = Field(default_factory=list)
    applicable_sports: List[str] = Field(default_factory=list)
    recommended_duration: Optional[str] = ""


class PeriodizationModelUpdate(BaseModel):
    name: Optional[str] = None
    author: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    phases: Optional[List[PhaseSchema]] = None
    characteristics: Optional[List[str]] = None
    applicable_sports: Optional[List[str]] = None
    recommended_duration: Optional[str] = None


async def _seed_user_library_if_empty(user_id: str) -> None:
    """Siembra la biblioteca por defecto. Si el usuario ya tiene modelos, sólo añade los nuevos (por default_key)
    sin tocar los existentes. Esto permite introducir nuevos modelos default sin dañar las personalizaciones."""
    now = datetime.now(timezone.utc).isoformat()
    existing_keys = set()
    async for m in models_collection.find(
        {"user_id": user_id, "is_default": True},
        {"_id": 0, "default_key": 1, "name": 1}
    ):
        existing_keys.add(m.get("default_key") or m.get("name"))
    # También incluye nombres que existen ya (incluye custom duplicados) para no duplicar si el usuario los editó
    async for m in models_collection.find(
        {"user_id": user_id},
        {"_id": 0, "name": 1}
    ):
        existing_keys.add(m.get("name"))

    docs = []
    for m in DEFAULT_PERIODIZATION_LIBRARY:
        if m["id"] in existing_keys or m["name"] in existing_keys:
            continue
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": m["name"],
            "author": m.get("author", ""),
            "category": m.get("category", "Clásico"),
            "description": m.get("description", ""),
            "icon": m.get("icon", "📊"),
            "color": m.get("color", "#3B82F6"),
            "phases": m.get("phases", []),
            "characteristics": m.get("characteristics", []),
            "applicable_sports": m.get("applicable_sports", []),
            "recommended_duration": m.get("recommended_duration", ""),
            "is_default": True,
            "default_key": m["id"],
            "created_at": now,
            "updated_at": now,
        })
    if docs:
        await models_collection.insert_many(docs)


def _get_user_id(user):
    return user.get("id") or user.get("user_id")


def get_current_user_dep():
    from server import get_current_user  # lazy import to avoid circular
    return get_current_user


@router.get("")
async def list_models(user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    await _seed_user_library_if_empty(uid)
    cursor = models_collection.find({"user_id": uid}, {"_id": 0, "user_id": 0})
    items = await cursor.to_list(length=500)
    items.sort(key=lambda m: (0 if m.get("is_default") else 1, m.get("category", ""), m.get("name", "")))
    return items


@router.post("")
async def create_model(payload: PeriodizationModelCreate, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "name": payload.name,
        "author": payload.author or "",
        "category": payload.category or "Custom",
        "description": payload.description or "",
        "icon": payload.icon or "📊",
        "color": payload.color or "#CCFF00",
        "phases": [p.model_dump() for p in payload.phases],
        "characteristics": payload.characteristics,
        "applicable_sports": payload.applicable_sports,
        "recommended_duration": payload.recommended_duration or "",
        "is_default": False,
        "created_at": now,
        "updated_at": now,
    }
    await models_collection.insert_one(doc)
    return {k: v for k, v in doc.items() if k not in ("_id", "user_id")}


@router.get("/{model_id}")
async def get_model(model_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    doc = await models_collection.find_one(
        {"id": model_id, "user_id": uid}, {"_id": 0, "user_id": 0}
    )
    if not doc:
        raise HTTPException(404, "Modelo no encontrado")
    return doc


@router.put("/{model_id}")
async def update_model(model_id: str, payload: PeriodizationModelUpdate, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    existing = await models_collection.find_one({"id": model_id, "user_id": uid})
    if not existing:
        raise HTTPException(404, "Modelo no encontrado")

    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if "phases" in update and update["phases"] is not None:
        update["phases"] = [p.model_dump() if hasattr(p, "model_dump") else p for p in update["phases"]]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await models_collection.update_one(
        {"id": model_id, "user_id": uid}, {"$set": update}
    )
    doc = await models_collection.find_one(
        {"id": model_id, "user_id": uid}, {"_id": 0, "user_id": 0}
    )
    return doc


@router.delete("/{model_id}")
async def delete_model(model_id: str, user=Depends(get_current_user_dep())):
    uid = _get_user_id(user)
    result = await models_collection.delete_one({"id": model_id, "user_id": uid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Modelo no encontrado")
    return {"ok": True, "id": model_id}


@router.post("/reset-defaults")
async def reset_defaults(user=Depends(get_current_user_dep())):
    """Re-siembra la biblioteca por defecto del usuario (no toca los modelos custom)."""
    uid = _get_user_id(user)
    await models_collection.delete_many({"user_id": uid, "is_default": True})
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for m in DEFAULT_PERIODIZATION_LIBRARY:
        docs.append({
            "id": str(uuid.uuid4()),
            "user_id": uid,
            "name": m["name"],
            "author": m.get("author", ""),
            "category": m.get("category", "Clásico"),
            "description": m.get("description", ""),
            "icon": m.get("icon", "📊"),
            "color": m.get("color", "#3B82F6"),
            "phases": m.get("phases", []),
            "characteristics": m.get("characteristics", []),
            "applicable_sports": m.get("applicable_sports", []),
            "recommended_duration": m.get("recommended_duration", ""),
            "is_default": True,
            "default_key": m["id"],
            "created_at": now,
            "updated_at": now,
        })
    if docs:
        await models_collection.insert_many(docs)
    cursor = models_collection.find({"user_id": uid}, {"_id": 0, "user_id": 0})
    items = await cursor.to_list(length=500)
    return items
