"""Historial de cambios del plan de Periodización (auditoría + restaurar)."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/periodization", tags=["periodization"])
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]
_hist = _db["periodization_history"]

_MAX_PER_PLAN = 40


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


class HistoryReq(BaseModel):
    plan_id: str
    plan_name: Optional[str] = ""
    change_summary: Optional[str] = "Cambio en el plan"
    snapshot: Any = None  # estructura del plan (macrocycles, etc.)


@router.post("/history")
async def log_history(payload: HistoryReq, user=Depends(get_current_user_dep())):
    uid = user.get("id") or user.get("user_id")
    uname = user.get("name") or user.get("email") or "Usuario"
    entry_id = uuid.uuid4().hex[:16]
    await _hist.insert_one({
        "entry_id": entry_id,
        "plan_id": payload.plan_id,
        "plan_name": payload.plan_name,
        "change_summary": payload.change_summary,
        "snapshot": payload.snapshot,
        "user_id": uid,
        "user_name": uname,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    # Retener sólo las últimas N por plan
    cursor = _hist.find({"plan_id": payload.plan_id}, {"_id": 1}).sort("created_at", -1).skip(_MAX_PER_PLAN)
    old_ids = [d["_id"] async for d in cursor]
    if old_ids:
        await _hist.delete_many({"_id": {"$in": old_ids}})
    return {"entry_id": entry_id}


@router.get("/history/{plan_id}")
async def list_history(plan_id: str, user=Depends(get_current_user_dep())):
    cursor = _hist.find(
        {"plan_id": plan_id},
        {"_id": 0, "snapshot": 0},
    ).sort("created_at", -1).limit(_MAX_PER_PLAN)
    return {"entries": [d async for d in cursor]}


@router.get("/history/entry/{entry_id}")
async def get_history_entry(entry_id: str, user=Depends(get_current_user_dep())):
    doc = await _hist.find_one({"entry_id": entry_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Entrada no encontrada")
    return doc
