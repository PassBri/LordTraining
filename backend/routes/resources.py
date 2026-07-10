"""Resources — Blog (CRUD), API Docs (bloques editables), Support (FAQ CRUD,
contacto editable, mensajes, estado del sistema REAL). Almacenado en MongoDB.
Gestión gateada a Super Admin; lectura pública. NO usa Supabase."""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import time
import jwt
import os

from core.auth import get_db

router = APIRouter(prefix="/api/resources", tags=["Resources"])
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"
START_TIME = time.time()


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


def _slugify(text: str) -> str:
    s = re.sub(r'[^a-z0-9]+', '-', (text or '').lower()).strip('-')
    return s or uuid.uuid4().hex[:8]


def _now():
    return datetime.now(timezone.utc).isoformat()


# ===================== BLOG =====================
class BlogPostIn(BaseModel):
    title: str
    category: str = "General"
    summary: str = ""
    body: str = ""
    image_url: str = ""
    published: bool = True


DEFAULT_BLOG = [
    {"title": "Periodización ATR: guía práctica", "category": "Periodización", "summary": "Cómo estructurar bloques de Acumulación, Transformación y Realización en tu temporada.", "body": "Contenido de ejemplo listo para publicar. Edita este artículo desde el panel de administración.", "image_url": ""},
    {"title": "Monitoreo de carga con ACWR", "category": "Tecnología deportiva", "summary": "El ratio agudo:crónico como herramienta para prevenir lesiones.", "body": "Contenido de ejemplo listo para publicar.", "image_url": ""},
    {"title": "Nutrición y recuperación", "category": "Nutrición", "summary": "Estrategias nutricionales para optimizar la adaptación al entrenamiento.", "body": "Contenido de ejemplo listo para publicar.", "image_url": ""},
]


async def _seed_blog(db):
    if await db.blog_posts.count_documents({}) == 0:
        for p in DEFAULT_BLOG:
            doc = {"id": str(uuid.uuid4()), "slug": _slugify(p["title"]), **p, "published": True, "created_at": _now(), "updated_at": _now()}
            await db.blog_posts.insert_one(doc)


@router.get("/blog")
async def list_blog(db=Depends(get_db), all: bool = False):
    await _seed_blog(db)
    q = {} if all else {"published": True}
    posts = await db.blog_posts.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    cats = sorted({p.get("category", "General") for p in posts})
    return {"posts": posts, "categories": cats}


@router.get("/blog/{slug}")
async def get_blog(slug: str, db=Depends(get_db)):
    post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0}) or await db.blog_posts.find_one({"id": slug}, {"_id": 0})
    if not post:
        raise HTTPException(404, "Artículo no encontrado")
    return post


@router.post("/blog")
async def create_blog(payload: BlogPostIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    doc = {"id": str(uuid.uuid4()), "slug": _slugify(payload.title), **payload.model_dump(), "created_at": _now(), "updated_at": _now()}
    await db.blog_posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/blog/{post_id}")
async def update_blog(post_id: str, payload: BlogPostIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    upd = {**payload.model_dump(), "slug": _slugify(payload.title), "updated_at": _now()}
    res = await db.blog_posts.update_one({"id": post_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Artículo no encontrado")
    return await db.blog_posts.find_one({"id": post_id}, {"_id": 0})


@router.delete("/blog/{post_id}")
async def delete_blog(post_id: str, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    await db.blog_posts.delete_one({"id": post_id})
    return {"ok": True}


# ===================== API DOCS =====================
DEFAULT_DOCS = [
    {"id": "intro", "title": "Introducción", "content": "La API de LordTraining permitirá integrar planes, atletas y métricas. (Próximamente para desarrolladores externos)."},
    {"id": "auth", "title": "Autenticación", "content": "Las peticiones usan un token Bearer JWT en la cabecera Authorization: Bearer <token>."},
    {"id": "endpoints", "title": "Endpoints", "content": "GET /v1/plans · GET /v1/athletes · POST /v1/plans · ..."},
    {"id": "examples", "title": "Ejemplos", "content": "curl -H 'Authorization: Bearer TOKEN' https://api.lordtraining.com/v1/plans"},
]


class DocBlock(BaseModel):
    id: str
    title: str
    content: str


class DocsIn(BaseModel):
    sections: List[DocBlock]


@router.get("/api-docs")
async def get_docs(db=Depends(get_db)):
    doc = await db.api_docs.find_one({"key": "main"}, {"_id": 0})
    if not doc:
        doc = {"key": "main", "sections": DEFAULT_DOCS, "updated_at": _now()}
        await db.api_docs.insert_one(dict(doc))
        doc.pop("_id", None)
    return {"sections": doc.get("sections", DEFAULT_DOCS)}


@router.put("/api-docs")
async def update_docs(payload: DocsIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    sections = [s.model_dump() for s in payload.sections]
    await db.api_docs.update_one({"key": "main"}, {"$set": {"sections": sections, "updated_at": _now()}}, upsert=True)
    return {"sections": sections}


# ===================== SUPPORT =====================
DEFAULT_FAQS = [
    {"id": str(uuid.uuid4()), "question": "¿Cómo empiezo con LordTraining?", "answer": "Crea tu cuenta gratis y elige un plan. Tendrás 7 días de prueba.", "order": 1},
    {"id": str(uuid.uuid4()), "question": "¿Puedo cambiar de plan?", "answer": "Sí, puedes subir o bajar de plan en cualquier momento desde tu perfil.", "order": 2},
    {"id": str(uuid.uuid4()), "question": "¿En qué idiomas está disponible?", "answer": "En 12 idiomas, con traducción en tiempo real.", "order": 3},
]


class FaqIn(BaseModel):
    question: str
    answer: str
    order: int = 0


class SupportSettingsIn(BaseModel):
    email: str = ""
    phone: str = ""
    tutorials_url: str = ""
    intro: str = ""


class ContactIn(BaseModel):
    name: str
    email: str
    message: str


async def _seed_faqs(db):
    if await db.support_faqs.count_documents({}) == 0:
        await db.support_faqs.insert_many([dict(f) for f in DEFAULT_FAQS])


@router.get("/support")
async def get_support(db=Depends(get_db)):
    await _seed_faqs(db)
    faqs = await db.support_faqs.find({}, {"_id": 0}).sort("order", 1).to_list(200)
    settings = await db.support_settings.find_one({"key": "main"}, {"_id": 0})
    if not settings:
        settings = {"key": "main", "email": "soporte@lordtraining.com", "phone": "", "tutorials_url": "", "intro": "¿Necesitas ayuda? Estamos para ti."}
        await db.support_settings.insert_one(dict(settings))
        settings.pop("_id", None)
    return {"faqs": faqs, "settings": {k: v for k, v in settings.items() if k != "key"}}


@router.post("/support/faqs")
async def create_faq(payload: FaqIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    doc = {"id": str(uuid.uuid4()), **payload.model_dump()}
    await db.support_faqs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/support/faqs/{faq_id}")
async def update_faq(faq_id: str, payload: FaqIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    res = await db.support_faqs.update_one({"id": faq_id}, {"$set": payload.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "FAQ no encontrada")
    return await db.support_faqs.find_one({"id": faq_id}, {"_id": 0})


@router.delete("/support/faqs/{faq_id}")
async def delete_faq(faq_id: str, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    await db.support_faqs.delete_one({"id": faq_id})
    return {"ok": True}


@router.put("/support/settings")
async def update_support_settings(payload: SupportSettingsIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    await db.support_settings.update_one({"key": "main"}, {"$set": payload.model_dump()}, upsert=True)
    return payload.model_dump()


@router.post("/support/contact")
async def submit_contact(payload: ContactIn, request: Request, db=Depends(get_db)):
    doc = {"id": str(uuid.uuid4()), **payload.model_dump(), "created_at": _now(), "read": False}
    await db.support_messages.insert_one(doc)
    return {"ok": True, "message": "Mensaje recibido. Te responderemos pronto."}


@router.get("/support/messages")
async def list_messages(request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    msgs = await db.support_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(300)
    return {"messages": msgs}


# ===================== SYSTEM STATUS (real) =====================
@router.get("/status")
async def system_status(request: Request, db=Depends(get_db)):
    components = []
    overall = "operational"
    # API: si responde, está operativo
    components.append({"name": "API", "status": "operational"})
    # Base de datos: ping real
    try:
        t0 = time.time()
        await db.command("ping")
        latency = round((time.time() - t0) * 1000)
        components.append({"name": "Base de datos", "status": "operational", "latency_ms": latency})
    except Exception:
        components.append({"name": "Base de datos", "status": "down"})
        overall = "degraded"
    uptime_s = int(time.time() - START_TIME)
    return {
        "overall": overall,
        "components": components,
        "uptime_seconds": uptime_s,
        "checked_at": _now(),
    }


# ===================== VIDEO TUTORIALES =====================
import json as _json
import urllib.request as _urlreq

_YT_RE = re.compile(r'(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|shorts/|v/))([\w-]{11})')
_VIMEO_RE = re.compile(r'vimeo\.com/(?:video/)?(\d+)')


def _parse_video(url: str, thumbnail_url: str = ""):
    """Detecta plataforma, id, embed y miniatura a partir de un enlace."""
    url = (url or "").strip()
    platform, vid, embed, thumb = "link", "", url, (thumbnail_url or "").strip()
    m = _YT_RE.search(url)
    if m:
        platform, vid = "youtube", m.group(1)
        embed = f"https://www.youtube.com/embed/{vid}"
        if not thumb:
            thumb = f"https://img.youtube.com/vi/{vid}/hqdefault.jpg"
        return platform, vid, embed, thumb
    m = _VIMEO_RE.search(url)
    if m:
        platform, vid = "vimeo", m.group(1)
        embed = f"https://player.vimeo.com/video/{vid}"
        if not thumb:
            try:
                req = _urlreq.Request(
                    f"https://vimeo.com/api/oembed.json?url=https://vimeo.com/{vid}",
                    headers={"User-Agent": "Mozilla/5.0"})
                with _urlreq.urlopen(req, timeout=6) as r:
                    thumb = _json.loads(r.read().decode()).get("thumbnail_url", "") or ""
            except Exception:
                thumb = ""
        return platform, vid, embed, thumb
    return platform, vid, embed, thumb


class VideoIn(BaseModel):
    title: str
    description: str = ""
    video_url: str
    thumbnail_url: str = ""
    category: str = "general"
    order: int = 0
    published: bool = True


# Categorías/módulos de tutoriales (key → etiqueta ES)
VIDEO_CATEGORIES = {
    "periodizacion": "Periodización",
    "evaluacion": "Evaluación",
    "pizarra": "Pizarra Táctica",
    "sesiones": "Sesiones",
    "calendario": "Calendario",
    "calculadoras": "Calculadoras",
    "reportes": "Reportes",
    "scouting": "Scouting",
    "portal": "Portal del Atleta",
    "general": "General",
}

DEFAULT_VIDEOS = [
    {"title": "Cómo construir tu plan de periodización", "description": "Aprende a estructurar macro, meso y microciclos en el motor de periodización.", "video_url": "https://www.youtube.com/watch?v=VtJwIt4WFpc", "thumbnail_url": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?crop=entropy&cs=srgb&fm=jpg&q=85&w=800", "category": "periodizacion", "order": 1},
    {"title": "Evaluación física de tus atletas", "description": "Registra controles físicos, técnicos y médicos y sigue la evolución del deportista.", "video_url": "https://www.youtube.com/watch?v=DTt1SXSO5Is", "thumbnail_url": "https://images.unsplash.com/photo-1529932398402-e0b30f66a559?crop=entropy&cs=srgb&fm=jpg&q=85&w=800", "category": "evaluacion", "order": 2},
    {"title": "Diseña jugadas en la Pizarra Táctica", "description": "Crea y anima jugadas para más de 30 deportes con la pizarra dinámica.", "video_url": "https://www.youtube.com/watch?v=ODFfaKfVM7E", "thumbnail_url": "https://images.unsplash.com/photo-1600534220378-df36338afc40?crop=entropy&cs=srgb&fm=jpg&q=85&w=800", "category": "pizarra", "order": 3},
    {"title": "Planifica sesiones de entrenamiento", "description": "Arma sesiones por capacidades con volumen, intensidad y monitoreo de carga.", "video_url": "https://www.youtube.com/watch?v=A0rJxzjbWss", "thumbnail_url": "https://images.unsplash.com/photo-1585757318177-0570a997dc3a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800", "category": "sesiones", "order": 4},
    {"title": "Scouting y detección de talento", "description": "Gestiona prospectos, pipeline y evaluaciones por nivel del deportista.", "video_url": "https://www.youtube.com/watch?v=nckkvbxgnUM", "thumbnail_url": "https://images.unsplash.com/photo-1525973132219-a04334a76080?crop=entropy&cs=srgb&fm=jpg&q=85&w=800", "category": "scouting", "order": 5},
    {"title": "Genera reportes avanzados en PDF", "description": "Exporta reportes profesionales del atleta y del equipo con un clic.", "video_url": "https://www.youtube.com/watch?v=DacqJsq8MyI", "thumbnail_url": "https://images.unsplash.com/photo-1587960184060-aa880aabdd04?crop=entropy&cs=srgb&fm=jpg&q=85&w=800", "category": "reportes", "order": 6},
]


async def _seed_videos(db):
    if await db.landing_videos.count_documents({}) == 0:
        for v in DEFAULT_VIDEOS:
            platform, vid, embed, thumb = _parse_video(v["video_url"], v.get("thumbnail_url", ""))
            await db.landing_videos.insert_one({
                "id": uuid.uuid4().hex, "title": v["title"], "description": v["description"],
                "video_url": v["video_url"], "platform": platform, "video_id": vid,
                "embed_url": embed, "thumbnail_url": thumb, "category": v["category"],
                "order": v["order"], "published": True, "created_at": _now(),
            })


@router.get("/video-categories")
async def video_categories():
    return {"categories": VIDEO_CATEGORIES}


@router.get("/videos")
async def list_videos(db=Depends(get_db), all: bool = False):
    await _seed_videos(db)
    q = {} if all else {"published": True}
    vids = await db.landing_videos.find(q, {"_id": 0}).sort("order", 1).to_list(200)
    return {"videos": vids, "categories": VIDEO_CATEGORIES}


@router.post("/videos")
async def create_video(payload: VideoIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    platform, vid, embed, thumb = _parse_video(payload.video_url, payload.thumbnail_url)
    doc = {
        "id": uuid.uuid4().hex,
        "title": payload.title, "description": payload.description,
        "video_url": payload.video_url.strip(), "platform": platform,
        "video_id": vid, "embed_url": embed, "thumbnail_url": thumb,
        "category": payload.category or "general",
        "order": payload.order, "published": payload.published,
        "created_at": _now(),
    }
    await db.landing_videos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/videos/{video_id}")
async def update_video(video_id: str, payload: VideoIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    platform, vid, embed, thumb = _parse_video(payload.video_url, payload.thumbnail_url)
    upd = {
        "title": payload.title, "description": payload.description,
        "video_url": payload.video_url.strip(), "platform": platform,
        "video_id": vid, "embed_url": embed, "thumbnail_url": thumb,
        "category": payload.category or "general",
        "order": payload.order, "published": payload.published,
    }
    res = await db.landing_videos.update_one({"id": video_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video no encontrado")
    return await db.landing_videos.find_one({"id": video_id}, {"_id": 0})


@router.delete("/videos/{video_id}")
async def delete_video(video_id: str, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    await db.landing_videos.delete_one({"id": video_id})
    return {"ok": True}


class ReorderIn(BaseModel):
    ids: List[str] = []


@router.post("/videos/reorder")
async def reorder_videos(payload: ReorderIn, request: Request, user=Depends(_require_super)):
    db = request.app.state.db
    for i, vid in enumerate(payload.ids):
        await db.landing_videos.update_one({"id": vid}, {"$set": {"order": i + 1}})
    return {"ok": True, "count": len(payload.ids)}
