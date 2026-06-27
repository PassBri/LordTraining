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
