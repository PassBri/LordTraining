"""
Super Admin / Hierarchical Admin Routes
─────────────────────────────────────────
Provides hierarchical visibility based on the admin's level:

  - SUPER_ADMIN (is_super_admin=True): sees ALL users grouped by tier
      • Institución/Federación (entity_type=federation OR university)
      • Liga (entity_type=league)
      • Club (entity_type=club OR school)
      • Entrenadores independientes (no org_id)

  - ORG ADMIN of Institución/Federación: sees their Ligas, Clubes, Entrenadores
  - ORG ADMIN of Club: sees only their Entrenadores

Discount / Gift / Referral codes management for super admins.
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import string
import jwt
import os

router = APIRouter(prefix="/admin", tags=["Admin Hierarchy"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


# ─── Models ─────────────────────────────────────────
class CodeCreate(BaseModel):
    code_type: str = Field(...)            # discount | gift | referral
    code: Optional[str] = None              # if None, auto-generated
    discount_percent: Optional[int] = None  # for discount type (5-100)
    gift_days: Optional[int] = None         # for gift type
    gift_plan: Optional[str] = "basic"      # plan to gift (starter/basic/pro/enterprise)
    max_uses: Optional[int] = 100
    expires_in_days: Optional[int] = 30
    description: Optional[str] = ""

class GrantPlan(BaseModel):
    user_id: str
    plan: str
    duration_days: int = 30
    reason: Optional[str] = ""


# ─── Helpers ────────────────────────────────────────
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

def _is_super(user: dict) -> bool:
    return bool(user.get("is_super_admin"))

def _gen_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


# ─── Hierarchy Endpoint ─────────────────────────────
@router.get("/hierarchy")
async def get_hierarchy(request: Request, user: dict = Depends(_get_current_user)):
    """
    Returns user hierarchy based on the admin's level.

    Structure:
    {
        "level": "super" | "federation" | "club" | "none",
        "scope": {institución info if applicable},
        "groups": {
            "federations": [{...org, member_count, sub_groups}],
            "leagues": [{...}],
            "clubs": [{...}],
            "independent_coaches": [{...users}]   # only super admin sees this
        },
        "stats": {total_users, total_orgs, total_plans, total_athletes}
    }
    """
    db = request.app.state.db

    # Determine level
    if _is_super(user):
        level = "super"
        scope = None
        # Super admin sees ALL orgs and ALL users
        all_orgs = await db.organizations.find({}, {"_id": 0}).to_list(1000)
        all_users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(5000)
    else:
        # Org-level admin
        org_id = user.get("org_id")
        if not org_id or user.get("org_role") != "admin":
            raise HTTPException(status_code=403, detail="No tienes permisos de admin")
        scope_org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
        if not scope_org:
            raise HTTPException(status_code=404, detail="Organización no encontrada")
        scope = scope_org
        et = scope_org.get("entity_type", "club")
        if et in ("federation", "university"):
            level = "federation"
            # See all orgs that belong under this federation (linked via parent_org_id, future feature)
            all_orgs = await db.organizations.find({"$or": [{"id": org_id}, {"parent_org_id": org_id}]}, {"_id": 0}).to_list(500)
            all_users = await db.users.find({"org_id": {"$in": [o["id"] for o in all_orgs]}}, {"_id": 0, "password": 0}).to_list(5000)
        elif et == "league":
            level = "league"
            all_orgs = await db.organizations.find({"$or": [{"id": org_id}, {"parent_org_id": org_id}]}, {"_id": 0}).to_list(500)
            all_users = await db.users.find({"org_id": {"$in": [o["id"] for o in all_orgs]}}, {"_id": 0, "password": 0}).to_list(5000)
        else:
            level = "club"
            all_orgs = [scope_org]
            all_users = await db.users.find({"org_id": org_id}, {"_id": 0, "password": 0}).to_list(2000)

    # Bucket orgs by entity_type
    federations = [o for o in all_orgs if o.get("entity_type") in ("federation", "university")]
    leagues = [o for o in all_orgs if o.get("entity_type") == "league"]
    clubs = [o for o in all_orgs if o.get("entity_type") in ("club", "school")]

    async def _enrich_org(o):
        member_count = await db.users.count_documents({"org_id": o["id"]})
        admin_count = await db.users.count_documents({"org_id": o["id"], "org_role": "admin"})
        owner = await db.users.find_one({"id": o.get("owner_id")}, {"_id": 0, "name": 1, "email": 1})
        plan_count = await db.training_plans.count_documents({"coach_id": {"$in": [u["id"] for u in all_users if u.get("org_id") == o["id"]]}}) if all_users else 0
        return {
            "id": o["id"],
            "name": o["name"],
            "entity_type": o.get("entity_type", "club"),
            "plan": o.get("plan"),
            "member_count": member_count,
            "admin_count": admin_count,
            "max_coaches": o.get("max_coaches", 20),
            "owner_name": owner.get("name") if owner else "",
            "owner_email": owner.get("email") if owner else "",
            "plan_count": plan_count,
            "created_at": o.get("created_at"),
        }

    federations_enriched = [await _enrich_org(o) for o in federations]
    leagues_enriched = [await _enrich_org(o) for o in leagues]
    clubs_enriched = [await _enrich_org(o) for o in clubs]

    # Independent coaches = users without org
    if level == "super":
        independent = [u for u in all_users if not u.get("org_id")]
    else:
        independent = []

    # Stats
    total_plans = await db.training_plans.count_documents({"coach_id": {"$in": [u["id"] for u in all_users]}}) if all_users else 0
    total_athletes = await db.athletes.count_documents({"created_by": {"$in": [u["id"] for u in all_users]}}) if all_users else 0

    return {
        "level": level,
        "scope": scope,
        "is_super_admin": _is_super(user),
        "groups": {
            "federations": federations_enriched,
            "leagues": leagues_enriched,
            "clubs": clubs_enriched,
            "independent_coaches": [
                {
                    "id": u["id"],
                    "name": u.get("name", ""),
                    "email": u.get("email", ""),
                    "subscription": u.get("subscription", "free"),
                    "ai_used": u.get("ai_generations_used", 0),
                    "created_at": u.get("created_at"),
                    "status": u.get("status", "active"),
                } for u in independent
            ],
        },
        "stats": {
            "total_users": len(all_users),
            "total_orgs": len(all_orgs),
            "total_plans": total_plans,
            "total_athletes": total_athletes,
            "by_plan": {
                "free": sum(1 for u in all_users if u.get("subscription") == "free"),
                "starter": sum(1 for u in all_users if u.get("subscription") == "starter"),
                "basic": sum(1 for u in all_users if u.get("subscription") == "basic"),
                "pro": sum(1 for u in all_users if u.get("subscription") == "pro"),
                "enterprise": sum(1 for u in all_users if u.get("subscription") == "enterprise"),
            },
        },
    }


@router.get("/orgs/{org_id}/members")
async def get_org_members(org_id: str, request: Request, user: dict = Depends(_get_current_user)):
    """Drill-down: members of a specific org. Super admin or admin of the org/parent."""
    db = request.app.state.db
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organización no encontrada")
    # Permission check
    if not _is_super(user):
        # Must be admin of this org or its parent
        is_member_admin = user.get("org_id") == org_id and user.get("org_role") == "admin"
        is_parent_admin = user.get("org_id") == org.get("parent_org_id") and user.get("org_role") == "admin"
        if not (is_member_admin or is_parent_admin):
            raise HTTPException(status_code=403, detail="Sin permisos")
    members = await db.users.find({"org_id": org_id}, {"_id": 0, "password": 0}).to_list(1000)
    return {"org": org, "members": members}


# ─── Promote/Grant plans ────────────────────────────
@router.post("/grant-plan")
async def grant_plan(payload: GrantPlan, request: Request, user: dict = Depends(_get_current_user)):
    """Super admin gifts a plan to any user for X days."""
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db
    target = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    expires_at = (datetime.now(timezone.utc) + timedelta(days=payload.duration_days)).isoformat()
    await db.users.update_one(
        {"id": payload.user_id},
        {"$set": {"subscription": payload.plan, "subscription_expires_at": expires_at, "subscription_granted_by": user["id"]}}
    )
    await db.plan_grants.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": payload.user_id,
        "granted_by": user["id"],
        "plan": payload.plan,
        "duration_days": payload.duration_days,
        "expires_at": expires_at,
        "reason": payload.reason,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"granted": True, "plan": payload.plan, "expires_at": expires_at}


# ─── Promo codes ────────────────────────────────────
@router.post("/codes/create")
async def create_code(payload: CodeCreate, request: Request, user: dict = Depends(_get_current_user)):
    """Super admin creates a discount/gift/referral code."""
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db
    code_str = (payload.code or _gen_code()).upper()
    # uniqueness
    existing = await db.promo_codes.find_one({"code": code_str})
    if existing:
        raise HTTPException(status_code=400, detail="Ese código ya existe")

    expires = (datetime.now(timezone.utc) + timedelta(days=payload.expires_in_days or 30)).isoformat()
    record = {
        "id": str(uuid.uuid4()),
        "code": code_str,
        "code_type": payload.code_type,
        "discount_percent": payload.discount_percent,
        "gift_days": payload.gift_days,
        "gift_plan": payload.gift_plan,
        "max_uses": payload.max_uses or 100,
        "current_uses": 0,
        "expires_at": expires,
        "description": payload.description or "",
        "active": True,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.promo_codes.insert_one(record)
    record.pop("_id", None)
    return record


@router.get("/codes")
async def list_codes(request: Request, user: dict = Depends(_get_current_user)):
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db
    codes = await db.promo_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"codes": codes}


@router.patch("/codes/{code_id}")
async def update_code(code_id: str, request: Request, user: dict = Depends(_get_current_user), active: Optional[bool] = Query(None)):
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db
    updates = {}
    if active is not None:
        updates["active"] = active
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.promo_codes.update_one({"id": code_id}, {"$set": updates})
    return {"updated": True}


@router.delete("/codes/{code_id}")
async def delete_code(code_id: str, request: Request, user: dict = Depends(_get_current_user)):
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db
    await db.promo_codes.delete_one({"id": code_id})
    return {"deleted": True}


@router.post("/codes/redeem")
async def redeem_code(code: str = Query(..., min_length=4, max_length=24), request: Request = None, user: dict = Depends(_get_current_user)):
    """Any user can redeem a valid code — applies its effect to their account."""
    db = request.app.state.db
    record = await db.promo_codes.find_one({"code": code.upper(), "active": True}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="Código no válido")
    # Validity
    if record["current_uses"] >= record.get("max_uses", 100):
        raise HTTPException(status_code=400, detail="Código agotado")
    expires_at = record.get("expires_at")
    if expires_at and datetime.fromisoformat(expires_at.replace("Z", "+00:00")) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Código expirado")
    # Already used by this user?
    used = await db.promo_redemptions.find_one({"code_id": record["id"], "user_id": user["id"]})
    if used:
        raise HTTPException(status_code=400, detail="Ya redimiste este código")

    # Apply effect
    msg = ""
    if record["code_type"] == "gift":
        days = record.get("gift_days") or 30
        plan = record.get("gift_plan") or "basic"
        expires = (datetime.now(timezone.utc) + timedelta(days=days)).isoformat()
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"subscription": plan, "subscription_expires_at": expires}}
        )
        msg = f"¡Activado el plan {plan} por {days} días!"
    elif record["code_type"] == "discount":
        msg = f"Código aplicado: {record.get('discount_percent', 0)}% off en tu próxima suscripción"
    else:
        msg = "Código de referido registrado"

    await db.promo_codes.update_one({"id": record["id"]}, {"$inc": {"current_uses": 1}})
    await db.promo_redemptions.insert_one({
        "id": str(uuid.uuid4()),
        "code_id": record["id"],
        "code": record["code"],
        "user_id": user["id"],
        "code_type": record["code_type"],
        "redeemed_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"success": True, "message": msg, "code_type": record["code_type"]}


# ─── Set entity_type at org creation extension ────
@router.post("/orgs/{org_id}/set-entity-type")
async def set_entity_type(org_id: str, entity_type: str = Query(...), request: Request = None, user: dict = Depends(_get_current_user)):
    """Allow super admin or org owner to change the entity type (federation/league/club/school/university)."""
    db = request.app.state.db
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Org no encontrada")
    if not _is_super(user) and org.get("owner_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Sin permisos")
    if entity_type not in ("club", "school", "league", "federation", "university"):
        raise HTTPException(status_code=400, detail="Tipo inválido")
    await db.organizations.update_one({"id": org_id}, {"$set": {"entity_type": entity_type}})
    return {"updated": True, "entity_type": entity_type}


# ─── Finance Dashboard ─────────────────────────────
PLAN_PRICES_USD = {
    "free": 0.0,
    "starter": 9.99,
    "basic": 19.99,
    "pro": 49.99,
    "enterprise": 149.99,
}

@router.get("/finance")
async def get_finance(request: Request, user: dict = Depends(_get_current_user)):
    """Returns sales / revenue / refunds dashboard for super admin."""
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db

    # All paying users (excluding free)
    cursor = db.users.find(
        {"subscription": {"$in": ["starter", "basic", "pro", "enterprise"]}},
        {"_id": 0, "password": 0}
    )
    paying_users = await cursor.to_list(5000)

    # MRR (Monthly Recurring Revenue) = sum of paying users' plan prices
    mrr = sum(PLAN_PRICES_USD.get(u.get("subscription", "free"), 0) for u in paying_users)
    arr = mrr * 12

    # Per-plan breakdown
    plan_breakdown = {}
    for plan, price in PLAN_PRICES_USD.items():
        if plan == "free":
            continue
        count = sum(1 for u in paying_users if u.get("subscription") == plan)
        plan_breakdown[plan] = {
            "count": count,
            "price_per_month": price,
            "monthly_revenue": round(count * price, 2),
        }

    # Last 12 months — synthetic monthly revenue from real signup dates
    now = datetime.now(timezone.utc)
    months = []
    for i in range(11, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start + timedelta(days=32)).replace(day=1)
        # Users who signed up within this month and are now paying
        in_month_revenue = 0.0
        in_month_count = 0
        for u in paying_users:
            try:
                created = datetime.fromisoformat(u.get("created_at", "").replace("Z", "+00:00"))
                if month_start <= created < next_month:
                    in_month_revenue += PLAN_PRICES_USD.get(u.get("subscription", "free"), 0)
                    in_month_count += 1
            except Exception:
                continue
        months.append({
            "month": month_start.strftime("%Y-%m"),
            "label": month_start.strftime("%b %Y"),
            "new_subscriptions": in_month_count,
            "revenue": round(in_month_revenue, 2),
        })

    # Conversion funnel
    total_users = await db.users.count_documents({})
    by_plan = {}
    for plan in ["free", "starter", "basic", "pro", "enterprise"]:
        by_plan[plan] = await db.users.count_documents({"subscription": plan})
    funnel = [
        {"stage": "Registrados", "count": total_users, "rate": 100.0},
        {"stage": "Starter+", "count": total_users - by_plan["free"], "rate": round((total_users - by_plan["free"]) / total_users * 100, 1) if total_users else 0},
        {"stage": "Pro+", "count": by_plan["basic"] + by_plan["pro"] + by_plan["enterprise"], "rate": round((by_plan["basic"] + by_plan["pro"] + by_plan["enterprise"]) / total_users * 100, 1) if total_users else 0},
        {"stage": "Club+", "count": by_plan["pro"] + by_plan["enterprise"], "rate": round((by_plan["pro"] + by_plan["enterprise"]) / total_users * 100, 1) if total_users else 0},
        {"stage": "Institucional", "count": by_plan["enterprise"], "rate": round(by_plan["enterprise"] / total_users * 100, 1) if total_users else 0},
    ]

    # Refunds (placeholder: from a future `refunds` collection)
    refunds = await db.refunds.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    total_refunded = sum(r.get("amount", 0) for r in refunds)

    # Sales list (paying users with details)
    sales = []
    for u in paying_users:
        plan = u.get("subscription", "free")
        sales.append({
            "user_id": u["id"],
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "plan": plan,
            "monthly_fee": PLAN_PRICES_USD.get(plan, 0),
            "annual_value": round(PLAN_PRICES_USD.get(plan, 0) * 12, 2),
            "subscribed_since": u.get("created_at", ""),
            "expires_at": u.get("subscription_expires_at"),
            "granted": bool(u.get("subscription_granted_by")),
        })

    return {
        "mrr": round(mrr, 2),
        "arr": round(arr, 2),
        "total_paying_users": len(paying_users),
        "total_users": total_users,
        "plan_breakdown": plan_breakdown,
        "monthly_history": months,
        "funnel": funnel,
        "refunds": refunds,
        "total_refunded": round(total_refunded, 2),
        "sales": sales,
        "plan_prices": PLAN_PRICES_USD,
    }


class RefundCreate(BaseModel):
    user_id: str
    amount: float
    reason: str = ""


@router.post("/refunds")
async def create_refund(payload: RefundCreate, request: Request, user: dict = Depends(_get_current_user)):
    """Super admin records a manual refund (when payment integration is live, this will be auto-triggered by Stripe webhook)."""
    if not _is_super(user):
        raise HTTPException(status_code=403, detail="Solo super admin")
    db = request.app.state.db
    target = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    refund = {
        "id": str(uuid.uuid4()),
        "user_id": payload.user_id,
        "user_name": target.get("name", ""),
        "user_email": target.get("email", ""),
        "amount": payload.amount,
        "reason": payload.reason,
        "plan": target.get("subscription", ""),
        "processed_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.refunds.insert_one(refund)
    refund.pop("_id", None)
    return refund
