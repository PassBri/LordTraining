"""
Hotmart billing routes (FastAPI router).

Endpoints:
  POST /api/billing/hotmart/checkout       → returns a Hotmart checkout URL for a given tier+cycle
  POST /api/billing/hotmart/cancel         → cancels current subscription (via Hotmart API)
  GET  /api/billing/hotmart/subscription   → returns the current user's subscription doc
  GET  /api/billing/hotmart/config         → public-safe info (which tiers are configured)
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt

from services.hotmart_plans import (
    PLAN_PRICES_USD,
    PLAN_ANNUAL_USD,
    get_hotmart_offer,
    build_sck,
)
from services.hotmart_client import hotmart_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing/hotmart", tags=["Hotmart Billing"])
security = HTTPBearer()

JWT_SECRET = os.environ.get("JWT_SECRET", "train-secret-key")
JWT_ALGORITHM = "HS256"


async def _get_current_user(
    request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)
):
    db = request.app.state.db
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ─── Models ───────────────────────────────────────────
class CheckoutRequest(BaseModel):
    tier: str            # 'starter' | 'basic' | 'pro' | 'enterprise'
    cycle: str = "monthly"  # 'monthly' | 'annual'


class CheckoutResponse(BaseModel):
    checkout_url: str
    plan_slug: str
    price_usd: float


# ─── Routes ───────────────────────────────────────────
@router.get("/config")
async def get_hotmart_config():
    """Returns which tiers are configured (without exposing secrets)."""
    out = {}
    for tier in PLAN_PRICES_USD:
        for cycle in ("monthly", "annual"):
            offer = get_hotmart_offer(tier, cycle)
            out[f"{tier}_{cycle}"] = bool(offer and offer.get("checkout_url"))
    return {
        "tiers_configured": out,
        "enabled": any(out.values()),
        "prices_usd_monthly": PLAN_PRICES_USD,
        "prices_usd_annual": PLAN_ANNUAL_USD,
    }


@router.post("/checkout", response_model=CheckoutResponse)
async def create_hotmart_checkout(
    payload: CheckoutRequest, user: dict = Depends(_get_current_user)
):
    tier = payload.tier.lower()
    cycle = payload.cycle.lower()

    if tier not in PLAN_PRICES_USD:
        raise HTTPException(status_code=400, detail=f"Tier desconocido: {tier}")
    if cycle not in ("monthly", "annual"):
        raise HTTPException(status_code=400, detail=f"Ciclo desconocido: {cycle}")

    offer = get_hotmart_offer(tier, cycle)
    if not offer or not offer.get("checkout_url"):
        raise HTTPException(
            status_code=503,
            detail=(
                f"Plan {tier} {cycle} aún no está configurado en Hotmart. "
                "Configura HOTMART_OFFER_* o HOTMART_CHECKOUT_URL_* en las variables de entorno."
            ),
        )

    base_url = offer["checkout_url"]
    sck = build_sck(user["id"], tier, cycle)
    params = {
        "name": user.get("name", "") or "",
        "email": user.get("email", "") or "",
        "sck": sck,
    }
    # Drop empties to keep URL clean
    params = {k: v for k, v in params.items() if v}
    sep = "&" if "?" in base_url else "?"
    checkout_url = f"{base_url}{sep}{urlencode(params)}"

    return CheckoutResponse(
        checkout_url=checkout_url,
        plan_slug=offer["plan_slug"],
        price_usd=offer["price_usd"],
    )


@router.get("/subscription")
async def get_my_subscription(request: Request, user: dict = Depends(_get_current_user)):
    """Returns the most recent subscription doc for the current user."""
    db = request.app.state.db
    sub = await db.hotmart_subscriptions.find_one(
        {"user_id": user["id"]},
        {"_id": 0, "raw_payload": 0},
        sort=[("updated_at", -1)],
    )
    return {
        "subscription": sub,
        "user_subscription_tier": user.get("subscription", "starter"),
    }


class CancelRequest(BaseModel):
    reason: Optional[str] = ""


@router.post("/cancel")
async def cancel_my_subscription(
    payload: CancelRequest, request: Request, user: dict = Depends(_get_current_user)
):
    """Cancels the current user's active subscription via Hotmart API."""
    db = request.app.state.db
    sub = await db.hotmart_subscriptions.find_one(
        {"user_id": user["id"], "status": {"$in": ["active", "delayed"]}},
        {"_id": 0},
        sort=[("updated_at", -1)],
    )
    if not sub or not sub.get("subscriber_code"):
        raise HTTPException(
            status_code=404,
            detail="No tienes una suscripción Hotmart activa para cancelar.",
        )

    subscriber_code = sub["subscriber_code"]
    try:
        result = await hotmart_client.cancel_subscription(subscriber_code)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("Hotmart cancel error")
        raise HTTPException(status_code=502, detail=f"Hotmart API error: {e}")

    now = datetime.now(timezone.utc).isoformat()
    await db.hotmart_subscriptions.update_one(
        {"subscriber_code": subscriber_code},
        {
            "$set": {
                "status": "canceled",
                "status_reason": payload.reason or "canceled_via_app",
                "canceled_at": now,
                "updated_at": now,
            }
        },
    )
    return {"ok": True, "subscriber_code": subscriber_code, "hotmart": result}
