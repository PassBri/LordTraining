"""
Organization (Club / Federación / Institución) Management Routes
─────────────────────────────────────────────────────────────────
Allows the owner of an Institutional / Club plan to:
  - Create their organization
  - Invite coaches (creates user + temporary password)
  - List coaches in the org
  - Suspend / re-activate coaches
  - Reset coach passwords

NOTE: This module ADDS new endpoints. It does not modify existing
auth or user logic. All endpoints are prefixed with /api/org.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import bcrypt
import secrets
import string
import jwt
import os
import logging

from services.email_service import send_coach_invitation, send_password_reset, is_email_enabled

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/org", tags=["Organization"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


# ─────────────────────── Models ───────────────────────
class OrgCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    entity_type: str = Field("club")  # club | federation | school | university

class CoachInvite(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=120)
    role_label: Optional[str] = "coach"  # coach | physical_trainer | analyst | etc.

class CoachUpdate(BaseModel):
    status: Optional[str] = None  # active | suspended
    role_label: Optional[str] = None


# ─────────────────────── Helpers ───────────────────────
def _gen_temp_password(length: int = 10) -> str:
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

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

# Plans allowed to manage an organization
ORG_ALLOWED_PLANS = {"pro", "enterprise"}

def _can_manage_org(user: dict) -> bool:
    return user.get("subscription") in ORG_ALLOWED_PLANS

async def _require_org_admin(request: Request, user: dict):
    """Returns user's organization if they are owner/admin. Else 403."""
    db = request.app.state.db
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=403,
            detail={"error": "no_org", "message": "No perteneces a ninguna organización."}
        )
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if user.get("org_role") != "admin" and org.get("owner_id") != user.get("id"):
        raise HTTPException(
            status_code=403,
            detail={"error": "not_admin", "message": "Solo el administrador de la organización puede realizar esta acción."}
        )
    return org


# ─────────────────────── Endpoints ───────────────────────
@router.post("/create")
async def create_organization(payload: OrgCreate, request: Request, user: dict = Depends(_get_current_user)):
    """Owner creates their org. Requires Club (pro) or Institutional (enterprise) subscription."""
    db = request.app.state.db
    if not _can_manage_org(user):
        raise HTTPException(
            status_code=403,
            detail={
                "error": "plan_upgrade_required",
                "required_plan": "pro",
                "message": "Necesitas el plan Club o Institucional para crear una organización."
            }
        )
    if user.get("org_id"):
        raise HTTPException(status_code=400, detail="Ya perteneces a una organización.")

    max_coaches = 999 if user["subscription"] == "enterprise" else 20
    org_id = str(uuid.uuid4())
    org = {
        "id": org_id,
        "name": payload.name,
        "entity_type": payload.entity_type,
        "owner_id": user["id"],
        "plan": user["subscription"],
        "max_coaches": max_coaches,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.organizations.insert_one(org)
    org.pop("_id", None)
    # Mark current user as admin of the org
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"org_id": org_id, "org_role": "admin"}}
    )
    return {"organization": org}


@router.get("/me")
async def get_my_organization(request: Request, user: dict = Depends(_get_current_user)):
    """Returns org info + member count for the current user (if any)."""
    db = request.app.state.db
    org_id = user.get("org_id")
    if not org_id:
        return {"organization": None, "is_admin": False}
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        return {"organization": None, "is_admin": False}
    member_count = await db.users.count_documents({"org_id": org_id})
    org["member_count"] = member_count
    is_admin = user.get("org_role") == "admin" or org.get("owner_id") == user.get("id")
    return {"organization": org, "is_admin": is_admin}


@router.post("/coaches/invite")
async def invite_coach(payload: CoachInvite, request: Request, user: dict = Depends(_get_current_user)):
    """Org admin invites a new coach. Creates user with temporary password."""
    db = request.app.state.db
    org = await _require_org_admin(request, user)

    # Quota check
    current_count = await db.users.count_documents({"org_id": org["id"]})
    if current_count >= org.get("max_coaches", 20):
        raise HTTPException(
            status_code=403,
            detail={"error": "max_coaches_reached", "message": f"Has alcanzado el máximo de {org['max_coaches']} entrenadores en tu plan."}
        )

    # Email uniqueness
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Ese email ya está registrado.")

    temp_password = _gen_temp_password()
    user_id = str(uuid.uuid4())
    new_user = {
        "id": user_id,
        "email": payload.email,
        "password": _hash_password(temp_password),
        "name": payload.name,
        "role": "coach",
        "subscription": org["plan"],   # inherits the org's plan
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_generations_used": 0,
        "org_id": org["id"],
        "org_role": "coach",
        "org_role_label": payload.role_label,
        "status": "active",
        "must_change_password": True,
        "invited_by": user["id"],
    }
    await db.users.insert_one(new_user)
    new_user.pop("_id", None)
    new_user.pop("password", None)

    # Send invitation email (non-blocking failure: log + return temp_password anyway)
    email_result = await send_coach_invitation(
        coach_name=payload.name,
        coach_email=payload.email,
        temp_password=temp_password,
        org_name=org["name"],
        inviter_name=user.get("name") or "El administrador",
        role_label=payload.role_label or "Entrenador",
    )
    if not email_result.get("sent"):
        logger.warning("Email invitation NOT sent for %s: %s", payload.email, email_result.get("error"))

    return {
        "coach": new_user,
        "temp_password": temp_password,  # FRONTEND must show this once for the admin to share
        "email_sent": email_result.get("sent", False),
        "email_error": email_result.get("error"),
        "message": (
            "Entrenador invitado. Email enviado con sus credenciales."
            if email_result.get("sent")
            else "Entrenador invitado. Comparte la contraseña temporal con seguridad. (Email automático no enviado: configura RESEND_API_KEY en backend)"
        )
    }


@router.get("/coaches")
async def list_coaches(request: Request, user: dict = Depends(_get_current_user)):
    """List all coaches in the current user's organization."""
    db = request.app.state.db
    org = await _require_org_admin(request, user)
    cursor = db.users.find(
        {"org_id": org["id"]},
        {"_id": 0, "password": 0}
    ).sort("created_at", 1)
    coaches = await cursor.to_list(length=500)
    return {"coaches": coaches, "max_coaches": org.get("max_coaches", 20)}


@router.patch("/coaches/{coach_id}")
async def update_coach(coach_id: str, payload: CoachUpdate, request: Request, user: dict = Depends(_get_current_user)):
    """Suspend/activate a coach or change their role label."""
    db = request.app.state.db
    org = await _require_org_admin(request, user)

    coach = await db.users.find_one({"id": coach_id, "org_id": org["id"]}, {"_id": 0})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found in your org")
    if coach["id"] == org["owner_id"]:
        raise HTTPException(status_code=400, detail="No puedes modificar al dueño de la organización.")

    updates = {}
    if payload.status in {"active", "suspended"}:
        updates["status"] = payload.status
    if payload.role_label:
        updates["org_role_label"] = payload.role_label
    if not updates:
        raise HTTPException(status_code=400, detail="Nada que actualizar")

    await db.users.update_one({"id": coach_id}, {"$set": updates})
    coach.update(updates)
    coach.pop("password", None)
    return {"coach": coach}


@router.post("/coaches/{coach_id}/reset-password")
async def reset_coach_password(coach_id: str, request: Request, user: dict = Depends(_get_current_user)):
    """Generate a new temporary password for a coach."""
    db = request.app.state.db
    org = await _require_org_admin(request, user)

    coach = await db.users.find_one({"id": coach_id, "org_id": org["id"]}, {"_id": 0})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found in your org")
    if coach["id"] == org["owner_id"]:
        raise HTTPException(status_code=400, detail="No puedes resetear la contraseña del dueño de la organización desde aquí.")

    temp_password = _gen_temp_password()
    await db.users.update_one(
        {"id": coach_id},
        {"$set": {"password": _hash_password(temp_password), "must_change_password": True}}
    )

    # Send password reset email
    email_result = await send_password_reset(
        coach_name=coach.get("name", ""),
        coach_email=coach["email"],
        temp_password=temp_password,
        org_name=org["name"],
    )
    if not email_result.get("sent"):
        logger.warning("Password reset email NOT sent for %s: %s", coach.get("email"), email_result.get("error"))

    return {
        "temp_password": temp_password,
        "email_sent": email_result.get("sent", False),
        "message": (
            "Nueva contraseña temporal generada y enviada por email."
            if email_result.get("sent")
            else "Nueva contraseña temporal generada. Compártela de forma segura. (Email automático no enviado)"
        )
    }


@router.delete("/coaches/{coach_id}")
async def remove_coach(coach_id: str, request: Request, user: dict = Depends(_get_current_user)):
    """Remove a coach from the org (does NOT delete user, just unlinks)."""
    db = request.app.state.db
    org = await _require_org_admin(request, user)

    coach = await db.users.find_one({"id": coach_id, "org_id": org["id"]}, {"_id": 0})
    if not coach:
        raise HTTPException(status_code=404, detail="Coach not found in your org")
    if coach["id"] == org["owner_id"]:
        raise HTTPException(status_code=400, detail="No puedes remover al dueño de la organización.")

    await db.users.update_one(
        {"id": coach_id},
        {"$unset": {"org_id": "", "org_role": "", "org_role_label": ""},
         "$set": {"subscription": "free", "status": "active"}}
    )
    return {"message": "Entrenador removido de la organización"}


@router.get("/stats")
async def org_stats(request: Request, user: dict = Depends(_get_current_user)):
    """Aggregated stats for the org admin dashboard."""
    db = request.app.state.db
    org = await _require_org_admin(request, user)

    total_coaches = await db.users.count_documents({"org_id": org["id"]})
    active_coaches = await db.users.count_documents({"org_id": org["id"], "status": {"$ne": "suspended"}})
    coach_ids = [c["id"] async for c in db.users.find({"org_id": org["id"]}, {"id": 1})]

    total_plans = await db.training_plans.count_documents({"created_by": {"$in": coach_ids}}) if coach_ids else 0
    total_athletes = await db.athletes.count_documents({"created_by": {"$in": coach_ids}}) if coach_ids else 0

    return {
        "org": {"id": org["id"], "name": org["name"], "plan": org["plan"], "max_coaches": org.get("max_coaches", 20)},
        "total_coaches": total_coaches,
        "active_coaches": active_coaches,
        "suspended_coaches": total_coaches - active_coaches,
        "total_plans": total_plans,
        "total_athletes": total_athletes,
    }
