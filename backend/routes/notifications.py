"""In-app notifications (campanita) — persistent notifications per coach."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/notifications", tags=["notifications"])

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
_db = _client[os.environ["DB_NAME"]]
_notifications = _db["notifications"]
_prefs = _db["notification_prefs"]

# Tipos de notificación y su etiqueta (para preferencias)
NOTIF_TYPES = {
    "showcase_lead": "Vitrina · Nuevos contactos",
    "showcase_weekly": "Vitrina · Resumen semanal",
    "recruiting_promote": "Reclutamiento · Listos para promover",
    "recruiting_levelup": "Reclutamiento · Subidas de nivel",
    "health_alert": "Salud · Alertas ACWR y disponibilidad",
}


async def _get_prefs(coach_id: str) -> dict:
    doc = await _prefs.find_one({"coach_id": coach_id}, {"_id": 0, "prefs": 1})
    saved = (doc or {}).get("prefs") or {}
    return {t: bool(saved.get(t, True)) for t in NOTIF_TYPES}


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


async def create_notification(coach_id: str, ntype: str, title: str, message: str,
                              link: Optional[str] = None, meta: Optional[dict] = None,
                              dedupe_key: Optional[str] = None,
                              dedupe_hours: int = 0) -> Optional[dict]:
    """Crea una notificación in-app. Respeta las preferencias del coach y deduplica si se indica."""
    prefs = await _get_prefs(coach_id)
    if not prefs.get(ntype, True):
        return None
    if dedupe_key and dedupe_hours > 0:
        since = (datetime.now(timezone.utc) - timedelta(hours=dedupe_hours)).isoformat()
        exists = await _notifications.find_one(
            {"coach_id": coach_id, "dedupe_key": dedupe_key, "created_at": {"$gte": since}},
            {"_id": 0, "id": 1})
        if exists:
            return None
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": coach_id,
        "type": ntype,
        "title": title,
        "message": message,
        "link": link,
        "meta": meta or {},
        "dedupe_key": dedupe_key,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _notifications.insert_one(doc)
    return doc


@router.get("")
async def list_notifications(type: Optional[str] = None, limit: int = 50,
                            user=Depends(get_current_user_dep())):
    uid = _uid(user)
    q = {"coach_id": uid}
    if type:
        q["type"] = type
    limit = max(1, min(limit, 200))
    items = await _notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    unread_all = await _notifications.count_documents({"coach_id": uid, "read": False})
    return {"items": items, "count": len(items), "unread": unread_all}


class PrefsIn(BaseModel):
    prefs: dict


@router.get("/preferences")
async def get_preferences(user=Depends(get_current_user_dep())):
    uid = _uid(user)
    return {"prefs": await _get_prefs(uid), "types": NOTIF_TYPES}


@router.put("/preferences")
async def update_preferences(body: PrefsIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    current = await _get_prefs(uid)
    for k, v in (body.prefs or {}).items():
        if k in NOTIF_TYPES:
            current[k] = bool(v)
    await _prefs.update_one({"coach_id": uid}, {"$set": {"prefs": current}}, upsert=True)
    return {"prefs": current}


@router.post("/sync-health")
async def sync_health_alerts(user=Depends(get_current_user_dep())):
    """Persiste las alertas ACWR/disponibilidad como notificaciones unificadas (deduplicadas 20h)."""
    uid = _uid(user)
    prefs = await _get_prefs(uid)
    if not prefs.get("health_alert", True):
        return {"created": 0}
    try:
        from routes.coach_metrics import _build_alerts
        alerts = await _build_alerts(_db, uid)
    except Exception:
        return {"created": 0}
    created = 0
    for a in alerts:
        key = f"health:{a.get('type')}:{a.get('plan_id') or a.get('athlete_id') or a.get('title')}"
        n = await create_notification(
            uid, "health_alert", a.get("title", "Alerta"), a.get("message", ""),
            link="health", meta={"severity": a.get("severity"), "kind": a.get("type"),
                                 "plan_id": a.get("plan_id"), "athlete_id": a.get("athlete_id")},
            dedupe_key=key, dedupe_hours=20)
        if n:
            created += 1
    return {"created": created}


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
