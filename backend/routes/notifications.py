"""In-app notifications (campanita) — persistent notifications per coach."""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/notifications", tags=["notifications"])

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]
_notifications = _db["notifications"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


async def create_notification(coach_id: str, ntype: str, title: str, message: str,
                              link: Optional[str] = None, meta: Optional[dict] = None) -> dict:
    """Crea una notificación in-app para un coach. Uso interno desde otros módulos."""
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": coach_id,
        "type": ntype,
        "title": title,
        "message": message,
        "link": link,
        "meta": meta or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _notifications.insert_one(doc)
    return doc


@router.get("")
async def list_notifications(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    items = await _notifications.find({"coach_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = sum(1 for x in items if not x.get("read"))
    return {"items": items, "count": len(items), "unread": unread}


@router.post("/{nid}/read")
async def mark_notification_read(nid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _notifications.update_one({"id": nid, "coach_id": uid}, {"$set": {"read": True}})
    if not res.matched_count:
        raise HTTPException(404, "No encontrada")
    return {"ok": True}


@router.post("/read-all")
async def mark_all_read(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    await _notifications.update_many({"coach_id": uid, "read": False}, {"$set": {"read": True}})
    return {"ok": True}


@router.delete("/{nid}")
async def delete_notification(nid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _notifications.delete_one({"id": nid, "coach_id": uid})
    if not res.deleted_count:
        raise HTTPException(404, "No encontrada")
    return {"ok": True}
