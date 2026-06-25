"""
Branding Manager (Super Admin)
──────────────────────────────
Gestiona logos globales de la plataforma: favicon, logo de landing y logo de login.
- Hasta 5 imágenes por categoría.
- El super admin elige cuál está activa; aplica globalmente.
- Almacenamiento en Emergent Object Storage (persistente, producción-safe).
"""
from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, Form
from fastapi.responses import Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import jwt
import asyncio
import requests

router = APIRouter(prefix="/branding", tags=["Branding"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "lordtraining"

CATEGORIES = {"favicon", "landing", "login"}
MAX_PER_CATEGORY = 5
MAX_SIZE = 3 * 1024 * 1024  # 3MB
ALLOWED_CT = {
    "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp",
    "image/x-icon": "ico", "image/vnd.microsoft.icon": "ico", "image/svg+xml": "svg",
}

_storage_key = None
_file_cache: dict = {}  # id -> (bytes, content_type)


def _init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    key = _init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120,
    )
    if resp.status_code == 403:
        # key expired → re-init once
        global _storage_key
        _storage_key = None
        key = _init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str):
    key = _init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        global _storage_key
        _storage_key = None
        key = _init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


async def _get_current_user(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = request.app.state.db
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


async def _require_super(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    user = await _get_current_user(request, credentials)
    if not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Solo super administradores")
    return user


def _public(doc: dict) -> dict:
    return {
        "id": doc["id"],
        "category": doc["category"],
        "url": f"/api/branding/file/{doc['id']}",
        "original_filename": doc.get("original_filename"),
        "content_type": doc.get("content_type"),
        "size": doc.get("size"),
        "is_active": bool(doc.get("is_active")),
        "created_at": doc.get("created_at"),
    }


# ─── Super Admin: upload / list / activate / delete ───

@router.post("/upload")
async def upload_branding(request: Request, category: str = Form(...), file: UploadFile = File(...),
                          user=Depends(_require_super)):
    if category not in CATEGORIES:
        raise HTTPException(400, "Categoría inválida (favicon | landing | login)")
    ct = (file.content_type or "").lower()
    if ct not in ALLOWED_CT:
        raise HTTPException(400, "Formato no permitido. Usa PNG, JPG, WEBP, ICO o SVG.")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(400, "La imagen supera el límite de 3MB.")
    db = request.app.state.db
    count = await db.branding_assets.count_documents({"category": category, "is_deleted": {"$ne": True}})
    if count >= MAX_PER_CATEGORY:
        raise HTTPException(400, f"Máximo {MAX_PER_CATEGORY} imágenes por categoría. Elimina una antes de subir otra.")

    asset_id = str(uuid.uuid4())
    ext = ALLOWED_CT[ct]
    path = f"{APP_NAME}/branding/{category}/{asset_id}.{ext}"
    try:
        result = await asyncio.to_thread(_put_object, path, data, ct)
    except Exception as e:
        raise HTTPException(500, f"Error subiendo la imagen: {e}")

    make_active = count == 0  # first one of its category becomes active automatically
    doc = {
        "id": asset_id,
        "category": category,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": ct,
        "size": result.get("size", len(data)),
        "is_active": make_active,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if make_active:
        await db.branding_assets.update_many(
            {"category": category, "is_active": True}, {"$set": {"is_active": False}})
    await db.branding_assets.insert_one(doc)
    _file_cache[asset_id] = (data, ct)
    return _public(doc)


@router.get("/list")
async def list_branding(request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    out = {"favicon": [], "landing": [], "login": []}
    cursor = db.branding_assets.find({"is_deleted": {"$ne": True}}).sort("created_at", 1)
    async for doc in cursor:
        cat = doc.get("category")
        if cat in out:
            out[cat].append(_public(doc))
    return out


@router.post("/{asset_id}/activate")
async def activate_branding(asset_id: str, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    doc = await db.branding_assets.find_one({"id": asset_id, "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(404, "Imagen no encontrada")
    cat = doc["category"]
    await db.branding_assets.update_many({"category": cat, "is_active": True}, {"$set": {"is_active": False}})
    await db.branding_assets.update_one({"id": asset_id}, {"$set": {"is_active": True}})
    return {"ok": True, "category": cat, "active_id": asset_id}


@router.delete("/{asset_id}")
async def delete_branding(asset_id: str, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    doc = await db.branding_assets.find_one({"id": asset_id, "is_deleted": {"$ne": True}})
    if not doc:
        raise HTTPException(404, "Imagen no encontrada")
    await db.branding_assets.update_one({"id": asset_id}, {"$set": {"is_deleted": True, "is_active": False}})
    _file_cache.pop(asset_id, None)
    # If it was active, promote the most recent remaining one
    if doc.get("is_active"):
        nxt = await db.branding_assets.find_one(
            {"category": doc["category"], "is_deleted": {"$ne": True}}, sort=[("created_at", -1)])
        if nxt:
            await db.branding_assets.update_one({"id": nxt["id"]}, {"$set": {"is_active": True}})
    return {"ok": True}


# ─── Public: active config + file serving ───

@router.get("/active")
async def active_branding(request: Request):
    db = request.app.state.db
    out = {"favicon": None, "landing": None, "login": None}
    cursor = db.branding_assets.find({"is_active": True, "is_deleted": {"$ne": True}})
    async for doc in cursor:
        cat = doc.get("category")
        if cat in out:
            out[cat] = f"/api/branding/file/{doc['id']}"
    return out


@router.get("/file/{asset_id}")
async def serve_branding_file(asset_id: str, request: Request):
    cached = _file_cache.get(asset_id)
    if cached:
        data, ct = cached
        return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})
    db = request.app.state.db
    doc = await db.branding_assets.find_one({"id": asset_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Imagen no encontrada")
    try:
        data, ct = await asyncio.to_thread(_get_object, doc["storage_path"])
    except Exception as e:
        raise HTTPException(500, f"Error obteniendo la imagen: {e}")
    ct = doc.get("content_type") or ct
    _file_cache[asset_id] = (data, ct)
    return Response(content=data, media_type=ct, headers={"Cache-Control": "public, max-age=86400"})
