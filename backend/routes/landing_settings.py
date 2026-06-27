"""Apariencia del Landing — versión activa global (toggle del super admin).
Almacenado en MongoDB (colección landing_settings). NO usa Supabase."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timezone
import jwt
import os

from core.auth import get_db

router = APIRouter(prefix="/api/landing", tags=["Landing Settings"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"

VALID_THEMES = {"classic", "material", "futuristic", "light"}
_SETTINGS_KEY = "landing_appearance"


class ThemePayload(BaseModel):
    theme: str


async def _require_super(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = request.app.state.db
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    if not user or not user.get("is_super_admin"):
        raise HTTPException(status_code=403, detail="Solo el Super Admin")
    return user


@router.get("/theme")
async def get_active_theme(db=Depends(get_db)):
    """Público — el landing consulta qué versión mostrar a todos los visitantes."""
    doc = await db.landing_settings.find_one({"key": _SETTINGS_KEY}, {"_id": 0})
    return {"active_theme": (doc or {}).get("active_theme", "classic")}


@router.put("/theme")
async def set_active_theme(payload: ThemePayload, request: Request, user=Depends(_require_super)):
    theme = (payload.theme or "").strip().lower()
    if theme not in VALID_THEMES:
        raise HTTPException(status_code=400, detail="Tema inválido")
    await db_set_theme(request.app.state.db, theme, user["id"])
    return {"active_theme": theme}


async def db_set_theme(db, theme, uid):
    await db.landing_settings.update_one(
        {"key": _SETTINGS_KEY},
        {"$set": {"active_theme": theme, "updated_by": uid, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
