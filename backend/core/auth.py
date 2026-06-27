"""Helpers de autenticación y gating de plan, compartidos por server.py y los routers.
Extraído de server.py — FASE 1 segmentación. get_current_user usa request.app.state.db."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.models import Intensity, SubscriptionPlan, PLAN_RANK, FEATURE_MIN_PLAN

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"
# OWASP: access token de vida corta + refresh token. Configurables por env.
ACCESS_TOKEN_MINUTES = int(os.environ.get('ACCESS_TOKEN_MINUTES', '60'))
REFRESH_TOKEN_DAYS = int(os.environ.get('REFRESH_TOKEN_DAYS', '7'))
security = HTTPBearer()


def get_db(request: Request):
    return request.app.state.db


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, email: str, role: str) -> str:
    """Access token (vida corta). Mantiene la firma usada en todo el código."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_MINUTES)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, email: str, role: str) -> str:
    """Refresh token (vida larga) usado solo para renovar el access token."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        # Rechazar refresh tokens en endpoints normales (compat: tokens viejos sin 'type' = access)
        if payload.get("type", "access") == "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("active") is False:
            raise HTTPException(status_code=403, detail="Account disabled")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def calculate_load(volume: float, intensity: Intensity) -> float:
    intensity_map = {"low": 0.5, "medium": 0.7, "high": 0.85, "maximum": 1.0}
    return round(volume * intensity_map.get(intensity.value, 0.7), 2)


def has_plan_feature(user_plan: str, feature_key: str) -> bool:
    """Returns True if the user's plan tier is >= the minimum required for the feature."""
    try:
        user_rank = PLAN_RANK.get(SubscriptionPlan(user_plan), 0)
        required_plan = FEATURE_MIN_PLAN.get(feature_key)
        if required_plan is None:
            return True  # Unknown features are open by default
        required_rank = PLAN_RANK.get(required_plan, 99)
        return user_rank >= required_rank
    except Exception:
        return False


def require_plan_feature(user: dict, feature_key: str):
    """Raises 403 if the user's subscription doesn't meet the feature requirement."""
    if not has_plan_feature(user.get("subscription", "free"), feature_key):
        required = FEATURE_MIN_PLAN.get(feature_key)
        plan_name = required.value if required else "superior"
        raise HTTPException(
            status_code=403,
            detail={
                "error": "plan_upgrade_required",
                "feature": feature_key,
                "required_plan": plan_name,
                "message": f"Esta función requiere el plan {plan_name.upper()} o superior. Mejora tu suscripción para desbloquearla."
            }
        )
