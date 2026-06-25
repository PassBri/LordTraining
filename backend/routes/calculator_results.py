"""
Calculator Results — Guardar resultados de las calculadoras científicas
al perfil de un atleta y/o plan de entrenamiento.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import uuid

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/calculator-results", tags=["calculator-results"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_results = _db["calculator_results"]
_athletes = _db["athletes"]
_plans = _db["training_plans"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


class ResultItem(BaseModel):
    label: str
    value: str


class CalcResultIn(BaseModel):
    athlete_id: str
    plan_id: Optional[str] = None
    calculator: str = Field(..., min_length=1, max_length=120)   # id/slug de la calculadora
    title: str = Field(..., min_length=1, max_length=160)
    module: Optional[str] = None
    color: Optional[str] = None
    headline: Optional[Dict[str, Any]] = None                    # {label, value, unit}
    items: List[ResultItem] = Field(default_factory=list)
    note: Optional[str] = None


async def _athlete_name(uid, athlete_id):
    a = await _athletes.find_one({"id": athlete_id, "coach_id": uid}, {"_id": 0, "name": 1})
    return a["name"] if a else None


@router.post("")
async def save_result(payload: CalcResultIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    a_name = await _athlete_name(uid, payload.athlete_id)
    if not a_name:
        raise HTTPException(404, "Atleta no encontrado")
    plan_name = None
    if payload.plan_id:
        p = await _plans.find_one({"id": payload.plan_id, "coach_id": uid}, {"_id": 0, "name": 1})
        plan_name = (p or {}).get("name")
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": uid,
        "athlete_id": payload.athlete_id,
        "athlete_name": a_name,
        "plan_id": payload.plan_id,
        "plan_name": plan_name,
        "calculator": payload.calculator,
        "title": payload.title,
        "module": payload.module,
        "color": payload.color,
        "headline": payload.headline,
        "items": [i.model_dump() for i in payload.items],
        "note": payload.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _results.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_results(athlete_id: Optional[str] = Query(None), plan_id: Optional[str] = Query(None),
                       user=Depends(get_current_user_dep())):
    uid = _uid(user)
    q = {"coach_id": uid}
    if athlete_id:
        q["athlete_id"] = athlete_id
    if plan_id:
        q["plan_id"] = plan_id
    items = await _results.find(q, {"_id": 0}).sort("created_at", -1).to_list(3000)
    return {"results": items, "total": len(items)}


@router.delete("/{rid}")
async def delete_result(rid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _results.delete_one({"id": rid, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Resultado no encontrado")
    return {"ok": True}
