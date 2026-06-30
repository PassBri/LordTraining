"""Rutas de autenticación y catálogos básicos (roles, plan-features, modelos de
periodización, duraciones de ciclo). Extraído de server.py — FASE 1 segmentación."""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import jwt

from core.auth import (
    get_db, get_current_user, hash_password, verify_password, create_token,
    create_refresh_token, decode_token, has_plan_feature,
)
from core.ratelimit import limiter
from core.models import (
    UserCreate, UserResponse, UserLogin, UserRole, SubscriptionPlan,
    SUBSCRIPTION_LIMITS, PLAN_RANK, FEATURE_MIN_PLAN,
)

router = APIRouter(prefix="/api", tags=["Auth"])

# OWASP — Brute force: máx 5 intentos fallidos, bloqueo temporal de 15 min.
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _check_lockout(db, identifier: str):
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if not rec:
        return
    locked_until = rec.get("locked_until")
    if locked_until:
        lu = locked_until if isinstance(locked_until, datetime) else datetime.fromisoformat(locked_until)
        if lu.tzinfo is None:
            lu = lu.replace(tzinfo=timezone.utc)
        if lu > datetime.now(timezone.utc):
            mins = max(1, int((lu - datetime.now(timezone.utc)).total_seconds() // 60) + 1)
            raise HTTPException(status_code=429, detail=f"Demasiados intentos. Intenta de nuevo en {mins} minuto(s).")


async def _record_failed(db, identifier: str):
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": identifier})
    count = (rec.get("count", 0) if rec else 0) + 1
    update = {"count": count, "last_attempt": now.isoformat(), "updated_at": now}
    if count >= MAX_LOGIN_ATTEMPTS:
        update["locked_until"] = (now + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
        update["count"] = 0  # reinicia el contador tras bloquear
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


async def _clear_attempts(db, identifier: str):
    await db.login_attempts.delete_one({"identifier": identifier})


# =============== AUTH ROUTES ===============
@router.post("/auth/register", response_model=UserResponse)
@limiter.limit("5/minute")
async def register(user: UserCreate, request: Request, db=Depends(get_db)):
    email_norm = (user.email or "").strip().lower()
    existing = await db.users.find_one({"email": email_norm})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": email_norm,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role.value,
        "subscription": SubscriptionPlan.STARTER.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_generations_used": 0
    }
    await db.users.insert_one(user_doc)
    del user_doc["password"]
    user_doc.pop("_id", None)
    return UserResponse(**user_doc)

@router.post("/auth/login")
@limiter.limit("10/minute")
async def login(credentials: UserLogin, request: Request, db=Depends(get_db)):
    email_norm = (credentials.email or "").strip().lower()
    identifier = f"{_client_ip(request)}:{email_norm}"
    await _check_lockout(db, identifier)

    user = await db.users.find_one({"email": email_norm})
    if not user or not verify_password(credentials.password, user["password"]):
        await _record_failed(db, identifier)
        # Mensaje genérico (no revela si el email existe)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Tu cuenta está desactivada. Contacta al administrador.")

    await _clear_attempts(db, identifier)
    token = create_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "refresh_token": refresh,
        "user": UserResponse(**user).model_dump(mode="json"),
    }


class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/auth/refresh")
@limiter.limit("30/minute")
async def refresh_token_endpoint(body: RefreshRequest, request: Request, db=Depends(get_db)):
    """Renueva el access token usando un refresh token válido (rotación)."""
    try:
        payload = decode_token(body.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload.get("user_id")}, {"_id": 0})
    if not user or user.get("active") is False:
        raise HTTPException(status_code=401, detail="Invalid token")
    token = create_token(user["id"], user["email"], user["role"])
    new_refresh = create_refresh_token(user["id"], user["email"], user["role"])
    return {"token": token, "refresh_token": new_refresh}

@router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user), db=Depends(get_db)):
    return UserResponse(**user)

# Endpoint para actualizar el perfil del usuario (incluyendo rol)
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None

@router.put("/auth/profile")
async def update_profile(update_data: UserProfileUpdate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    update_fields = {}
    if update_data.name:
        update_fields["name"] = update_data.name
    if update_data.role:
        update_fields["role"] = update_data.role.value
    
    if update_fields:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": update_fields}
        )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

# Endpoint para obtener roles disponibles
@router.get("/auth/roles")
async def get_available_roles():
    roles = [
        {"id": "admin", "name": "Administrador", "description": "Acceso total al sistema"},
        {"id": "coach", "name": "Entrenador", "description": "Puede crear planes para múltiples atletas"},
        {"id": "personal_trainer", "name": "Entrenador Personal", "description": "Enfocado en clientes individuales"},
        {"id": "athlete", "name": "Atleta", "description": "Solo puede ver su propio plan"},
        {"id": "team", "name": "Equipo", "description": "Grupo de atletas con plan compartido"},
        {"id": "user", "name": "Usuario", "description": "Rol básico sin atletas asignados"}
    ]
    return roles

@router.get("/plan-features")
async def get_plan_features(user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Returns the user's plan + which features they can access. Used by frontend PlanGate."""
    plan = user.get("subscription", "free")
    limits = SUBSCRIPTION_LIMITS.get(SubscriptionPlan(plan), SUBSCRIPTION_LIMITS[SubscriptionPlan.FREE])
    features = {fk: has_plan_feature(plan, fk) for fk in FEATURE_MIN_PLAN.keys()}
    return {
        "plan": plan,
        "plan_rank": PLAN_RANK.get(SubscriptionPlan(plan), 0),
        "limits": limits,
        "usage": {
            "athletes": user.get("athletes_count", 0),
            "plans": user.get("plans_count", 0),
            "ai_generations": user.get("ai_generations_used", 0),
        },
        "features": features,
        "feature_min_plan": {k: v.value for k, v in FEATURE_MIN_PLAN.items()},
    }

# Endpoint para obtener modelos de periodización disponibles
@router.get("/periodization-models-catalog")
async def get_periodization_models_catalog():
    models = [
        # Modelos Clásicos
        {"id": "traditional", "name": "Tradicional (Matveiev)", "category": "Clásico", 
         "description": "Periodización lineal clásica con fases bien definidas. Alto volumen inicial, baja intensidad progresando a bajo volumen, alta intensidad."},
        {"id": "atr", "name": "ATR (Issurin)", "category": "Clásico",
         "description": "Acumulación-Transformación-Realización. Mesociclos cortos y concentrados con objetivos específicos."},
        {"id": "blocks", "name": "Por Bloques (Verkhoshansky)", "category": "Clásico",
         "description": "Cargas concentradas unidireccionales. Desarrollo secuencial de cualidades físicas."},
        
        # Modelos Ondulatorios
        {"id": "undulating_daily", "name": "Ondulatorio Diario", "category": "Ondulatorio",
         "description": "Variación de volumen e intensidad día a día. Ideal para deportes con alta frecuencia de competencias."},
        {"id": "undulating_weekly", "name": "Ondulatorio Semanal", "category": "Ondulatorio",
         "description": "Variación semana a semana. Permite adaptación más gradual."},
        
        # Modelos Avanzados
        {"id": "pendulum", "name": "Péndulo (Arosiev)", "category": "Avanzado",
         "description": "Alternancia pendular entre preparación general y específica. Mantiene ambas cualidades."},
        {"id": "structural_bells", "name": "Campanas Estructurales (Forteza)", "category": "Avanzado",
         "description": "Acentuación de direcciones del entrenamiento en diferentes momentos del macrociclo."},
        {"id": "contemporary", "name": "Contemporáneo (Bondarchuk)", "category": "Avanzado",
         "description": "Basado en ejercicios de competición y especiales. Para atletas de alto rendimiento."},
        {"id": "inverse", "name": "Periodización Inversa", "category": "Avanzado",
         "description": "Comienza con alta intensidad y bajo volumen. Ideal para deportes de resistencia."},
        {"id": "tactical", "name": "Táctico", "category": "Avanzado",
         "description": "Diseñado para deportes de equipo. Integra preparación física con táctica."},
        
        # Modelos Específicos
        {"id": "concurrent", "name": "Concurrente", "category": "Específico",
         "description": "Desarrollo simultáneo de múltiples cualidades físicas. Para deportistas polivalentes."},
        {"id": "conjugate", "name": "Conjugado (Westside)", "category": "Específico",
         "description": "Método de esfuerzo máximo y dinámico. Principalmente para fuerza y potencia."},
        {"id": "polarized", "name": "Polarizado", "category": "Específico",
         "description": "80% baja intensidad, 20% alta intensidad. Muy usado en deportes de resistencia."}
    ]
    return models

# Endpoint para obtener duraciones de ciclo disponibles
@router.get("/cycle-durations")
async def get_cycle_durations():
    durations = [
        {"id": "olympic", "name": "Ciclo Olímpico", "weeks": 208, "months": 48, "years": 4,
         "description": "Planificación a largo plazo para competencias olímpicas"},
        {"id": "biannual", "name": "Bianual", "weeks": 104, "months": 24, "years": 2,
         "description": "Planificación de dos temporadas completas"},
        {"id": "annual", "name": "Anual", "weeks": 52, "months": 12, "years": 1,
         "description": "Macrociclo tradicional de una temporada"},
        {"id": "semester", "name": "Semestral", "weeks": 26, "months": 6, "years": 0.5,
         "description": "Media temporada o pretemporada extendida"},
        {"id": "quarter", "name": "Trimestral", "weeks": 13, "months": 3, "years": 0.25,
         "description": "Ciclo corto para objetivos específicos"},
        {"id": "monthly", "name": "Mensual", "weeks": 4, "months": 1, "years": 0,
         "description": "Mesociclo individual para ajustes rápidos"}
    ]
    return durations
