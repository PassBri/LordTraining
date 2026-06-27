from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# App config
app = FastAPI(title="LordTraining API")
api_router = APIRouter(prefix="/api")

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Helpers compartidos (re-exportados para imports legacy `from server import get_current_user`)
from core.auth import get_current_user, hash_password  # noqa: F401

# =============== ROOT & HEALTH ===============
@api_router.get("/")
async def root():
    return {"message": "LordTraining API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include routers
app.include_router(api_router)

# AI Assistant router (simplified)
from routes.ai_assistant import router as ai_assistant_router
app.include_router(ai_assistant_router)

# Periodizacion V2 router (cascade propagation engine)
from routes.periodization_v2 import router as periodization_v2_router, crear_indices
app.include_router(periodization_v2_router)

# Periodization Models CRUD (user-owned library + defaults)
from routes.periodization_models import router as periodization_models_router
app.include_router(periodization_models_router, prefix="/api")

# Previous Plan Analysis: PDF export + share link
from routes.previous_analysis_export import router as previous_analysis_export_router
app.include_router(previous_analysis_export_router, prefix="/api")

# Active Plan (Objectives): PDF export + share link
from routes.active_plan_export import router as active_plan_export_router
app.include_router(active_plan_export_router, prefix="/api")

# Info Catalog Export: PDF + Share for entities, teams, athletes, sports, tournaments
from routes.info_catalog_export import router as info_catalog_export_router
app.include_router(info_catalog_export_router, prefix="/api")

# Coaches: CRUD + perfiles profesionales (entrenadores/staff)
from routes.coaches import router as coaches_router
app.include_router(coaches_router, prefix="/api")

from routes.evaluations_export import router as evaluations_export_router
app.include_router(evaluations_export_router, prefix="/api")

from routes.graphic_plan_share import router as graphic_plan_share_router
app.include_router(graphic_plan_share_router, prefix="/api")

from routes.master_report import router as master_report_router
app.include_router(master_report_router, prefix="/api")

from routes.federations import router as federations_router
app.include_router(federations_router, prefix="/api")

from routes.sessions_export import router as sessions_export_router
app.include_router(sessions_export_router, prefix="/api")

from routes.org_management import router as org_management_router
app.include_router(org_management_router, prefix="/api")

from routes.admin_hierarchy import router as admin_hierarchy_router
app.include_router(admin_hierarchy_router, prefix="/api")

from routes.auto_i18n import router as auto_i18n_router
app.include_router(auto_i18n_router, prefix="/api")

from routes.hotmart_billing import router as hotmart_billing_router
app.include_router(hotmart_billing_router, prefix="/api")

from routes.hotmart_webhooks import router as hotmart_webhooks_router
app.include_router(hotmart_webhooks_router, prefix="/api")

from routes.recruiting import router as recruiting_router
app.include_router(recruiting_router, prefix="/api")

from routes.calculator_results import router as calculator_results_router
app.include_router(calculator_results_router, prefix="/api")

from routes.branding import router as branding_router
app.include_router(branding_router, prefix="/api")

from routes.plan_templates import router as plan_templates_router
app.include_router(plan_templates_router, prefix="/api")

from routes.coach_ranking import router as coach_ranking_router
app.include_router(coach_ranking_router, prefix="/api")

from routes.demo_seed import router as demo_seed_router
app.include_router(demo_seed_router)

from routes.athlete_portal import router as athlete_portal_router, crear_indices_portal
app.include_router(athlete_portal_router)

from routes.coach_metrics import router as coach_metrics_router
app.include_router(coach_metrics_router)

from routes.data_migration import router as data_migration_router
app.include_router(data_migration_router)

from routes.plan_data import router as plan_data_router
app.include_router(plan_data_router)

from routes.entities_teams import router as entities_teams_router
app.include_router(entities_teams_router)

from routes.sports import router as sports_router
app.include_router(sports_router)

from routes.athletes import router as athletes_router
app.include_router(athletes_router)

from routes.tournaments import router as tournaments_router
app.include_router(tournaments_router)

from routes.tactical_boards import router as tactical_boards_router
app.include_router(tactical_boards_router)

from routes.payments import router as payments_router
app.include_router(payments_router)

from routes.dashboard_panel import router as dashboard_panel_router
app.include_router(dashboard_panel_router)

from routes.athlete_data import router as athlete_data_router
app.include_router(athlete_data_router)

from routes.auth import router as auth_router
app.include_router(auth_router)

from routes.sessions import router as sessions_router
app.include_router(sessions_router)

from routes.exports import router as exports_router
app.include_router(exports_router)

from routes.sharing import router as sharing_router
app.include_router(sharing_router)

from routes.training_plans import router as training_plans_router
app.include_router(training_plans_router)

from routes.landing_settings import router as landing_settings_router
app.include_router(landing_settings_router)

# Store db reference in app state for V2 routes
app.state.db = db

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# OWASP — Rate limiting (límites estrictos por decorador en endpoints de auth)
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from core.ratelimit import limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# OWASP — Headers de seguridad HTTP en todas las respuestas
_CSP = (
    "default-src 'self'; "
    "img-src 'self' data: https: blob:; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "script-src 'self' 'unsafe-inline'; "
    "connect-src 'self' https:; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "object-src 'none'"
)

@app.middleware("http")
async def security_headers_middleware(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = _CSP
    return response


# OWASP — Manejo de errores: no exponer stack traces al cliente en errores no controlados
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Ocurrió un error interno. Intenta de nuevo más tarde."})



@app.on_event("startup")
async def startup_create_indices():
    """Create MongoDB indices for V2 collections on startup"""
    await crear_indices(db)
    await crear_indices_portal(db)
    # Hotmart indices
    try:
        await db.hotmart_webhook_events.create_index("event_id", unique=True)
        await db.hotmart_webhook_events.create_index("processed_at")
        await db.hotmart_subscriptions.create_index("user_id")
        await db.hotmart_subscriptions.create_index(
            "subscriber_code", unique=True, sparse=True
        )
        await db.hotmart_subscriptions.create_index("status")
    except Exception as e:
        logger.warning(f"Hotmart index creation: {e}")
    # OWASP — Brute force: índices de intentos de login (TTL auto-limpieza)
    try:
        await db.login_attempts.create_index("identifier", unique=True)
        await db.login_attempts.create_index("updated_at", expireAfterSeconds=3600)
        await db.users.create_index("email", unique=True)
    except Exception as e:
        logger.warning(f"Auth index creation: {e}")
    # Seed/ensure super admin (for production where DB starts empty)
    try:
        await seed_super_admin()
    except Exception as e:
        logger.warning(f"Super admin seed: {e}")


async def seed_super_admin():
    """Idempotently ensure the super admin account exists and is privileged.
    Controlled via env vars SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD.
    Creates the user if missing (mirrors /auth/register) and always guarantees
    is_super_admin + enterprise tier. Never overwrites an existing password.
    """
    email = (os.environ.get("SUPER_ADMIN_EMAIL", "") or "").strip().lower()
    password = os.environ.get("SUPER_ADMIN_PASSWORD", "") or ""
    if not email:
        return
    existing = await db.users.find_one({"email": email})
    if existing:
        update = {"is_super_admin": True, "role": "admin", "subscription": "enterprise"}
        if password:
            update["password"] = hash_password(password)
        await db.users.update_one({"email": email}, {"$set": update})
        logger.info("Super admin ensured (existing, pwd_reset=%s): %s", bool(password), email)
        return
    if not password:
        logger.warning("SUPER_ADMIN_EMAIL set but SUPER_ADMIN_PASSWORD missing; cannot create %s", email)
        return
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email,
        "password": hash_password(password),
        "name": os.environ.get("SUPER_ADMIN_NAME", "Super Admin"),
        "role": "admin",
        "is_super_admin": True,
        "subscription": "enterprise",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_generations_used": 0,
    }
    await db.users.insert_one(user_doc)
    try:
        from routes.sports import seed_default_sports as _seed_sports
        await _seed_sports(db, user_id)
    except Exception:
        pass
    logger.info("Super admin created: %s", email)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
