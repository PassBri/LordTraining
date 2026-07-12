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
_SOCIAL_KEY = "social_links"
_SCOUTING_MEDIA_KEY = "scouting_media"

# Plataformas soportadas para enlaces de redes sociales
SOCIAL_PLATFORMS = ["x", "linkedin", "instagram", "tiktok", "youtube", "facebook"]


class ThemePayload(BaseModel):
    theme: str


class SocialLinksPayload(BaseModel):
    x: str = ""
    linkedin: str = ""
    instagram: str = ""
    tiktok: str = ""
    youtube: str = ""
    facebook: str = ""


class ScoutingMediaPayload(BaseModel):
    video_url: str = ""


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


@router.get("/social")
async def get_social_links(db=Depends(get_db)):
    """Público — el landing consulta los enlaces de redes sociales activos."""
    doc = await db.landing_settings.find_one({"key": _SOCIAL_KEY}, {"_id": 0})
    links = (doc or {}).get("links", {})
    return {"links": {p: (links.get(p) or "") for p in SOCIAL_PLATFORMS}}


@router.put("/social")
async def set_social_links(payload: SocialLinksPayload, request: Request, user=Depends(_require_super)):
    def clean(url: str) -> str:
        url = (url or "").strip()
        if url and not url.startswith(("http://", "https://")):
            url = "https://" + url
        return url
    links = {p: clean(getattr(payload, p, "")) for p in SOCIAL_PLATFORMS}
    await request.app.state.db.landing_settings.update_one(
        {"key": _SOCIAL_KEY},
        {"$set": {"links": links, "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"links": links}


@router.get("/scouting-media")
async def get_scouting_media(db=Depends(get_db)):
    """Público — el landing consulta el video de la sección de Scouting."""
    doc = await db.landing_settings.find_one({"key": _SCOUTING_MEDIA_KEY}, {"_id": 0})
    return {"video_url": (doc or {}).get("video_url", "")}


@router.put("/scouting-media")
async def set_scouting_media(payload: ScoutingMediaPayload, request: Request, user=Depends(_require_super)):
    url = (payload.video_url or "").strip()
    if url and not url.startswith(("http://", "https://")):
        url = "https://" + url
    await request.app.state.db.landing_settings.update_one(
        {"key": _SCOUTING_MEDIA_KEY},
        {"$set": {"video_url": url, "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"video_url": url}
