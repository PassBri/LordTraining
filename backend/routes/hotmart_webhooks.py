"""
Hotmart webhook router.

Endpoint:
  POST /api/webhooks/hotmart

Responsibilities:
- Validate Hottok (Hotmart's shared secret); reject if mismatch
- Enforce idempotency via unique index on hotmart_webhook_events.event_id
- Dispatch to event handlers that mutate hotmart_subscriptions and users.subscription
- Always respond 2xx after successful storage (Hotmart will otherwise retry)

Supported events (Hotmart 2.0):
  PURCHASE_APPROVED, PURCHASE_COMPLETE, PURCHASE_CANCELED,
  PURCHASE_REFUNDED, PURCHASE_CHARGEBACK, PURCHASE_EXPIRED,
  SUBSCRIPTION_CANCELLATION, SWITCH_PLAN, UPDATE_SUBSCRIPTION_CHARGE_DATE
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Request, HTTPException, status
from fastapi.responses import JSONResponse

from services.hotmart_plans import find_tier_by_product, parse_sck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Hotmart Webhooks"])


# ─── Helpers ──────────────────────────────────────────
def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _expected_hottok() -> str:
    return os.environ.get("HOTMART_HOTTOK", "")


def _extract_hottok(request: Request, payload: Dict[str, Any]) -> Optional[str]:
    # Hotmart sends it as a header in 2.0 ("X-Hotmart-Hottok") OR in the body.
    return (
        request.headers.get("X-Hotmart-Hottok")
        or request.headers.get("x-hotmart-hottok")
        or request.headers.get("X-HOTMART-HOTTOK")
        or request.headers.get("Hottok")
        or payload.get("hottok")
    )


def _extract_event_id(payload: Dict[str, Any]) -> str:
    """Best-effort unique key for this webhook delivery."""
    # 2.0 ships an `id`; some older versions ship `event_id`
    eid = payload.get("id") or payload.get("event_id")
    if eid:
        return str(eid)
    event = payload.get("event") or payload.get("event_name") or "EVT"
    data = payload.get("data") or payload.get("purchase") or {}
    txn = (data.get("purchase") or {}).get("transaction") or data.get("transaction") or {}
    subscription = data.get("subscription") or {}
    txn_id = txn.get("transaction") or txn.get("id") or ""
    sub_code = subscription.get("subscriber", {}).get("code") or subscription.get("code") or ""
    return f"{event}:{txn_id}:{sub_code}"


def _safe_extract(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize the Hotmart 2.0 payload structure into a flat dict we can use.
    Different event types nest things slightly differently; this consolidates them.
    """
    data = payload.get("data") or payload.get("purchase") or {}
    purchase = data.get("purchase") or {}
    product = data.get("product") or purchase.get("product") or {}
    offer = (purchase.get("offer") or {}) or (data.get("offer") or {})
    transaction = purchase.get("transaction") or data.get("transaction") or {}
    price = purchase.get("price") or transaction.get("price") or {}
    subscription = data.get("subscription") or purchase.get("subscription") or {}
    subscriber = (
        (subscription.get("subscriber") if isinstance(subscription, dict) else None)
        or data.get("subscriber")
        or {}
    )
    buyer = data.get("buyer") or purchase.get("buyer") or {}
    tracking = data.get("tracking") or purchase.get("tracking") or {}

    sck = tracking.get("source_sck") or tracking.get("source") or data.get("sck")
    if isinstance(sck, dict):
        sck = sck.get("sck") or sck.get("value")

    return {
        "event_name": payload.get("event") or payload.get("event_name") or "",
        "product_id": str(product.get("id") or product.get("ucode") or ""),
        "product_name": product.get("name") or "",
        "offer_code": (
            offer.get("code") or offer.get("key") or transaction.get("offer_code") or ""
        ),
        "transaction_id": (
            transaction.get("transaction") or transaction.get("id") or ""
        ),
        "transaction_status": transaction.get("status") or "",
        "amount": price.get("value") or transaction.get("value"),
        "currency": price.get("currency_value") or price.get("currency") or transaction.get("currency_code"),
        "payment_type": (
            (transaction.get("payment") or {}).get("type")
            or transaction.get("payment_type")
            or ""
        ),
        "subscriber_code": (
            subscriber.get("code")
            or subscription.get("code")
            or subscription.get("subscriber_code")
            or ""
        ),
        "subscription_status": subscription.get("status") or "",
        "next_charge_date": (
            subscription.get("next_charge_date")
            or subscription.get("date_next_charge")
            or ""
        ),
        "buyer_email": buyer.get("email") or "",
        "buyer_name": buyer.get("name") or "",
        "sck": sck or "",
    }


async def _mark_processed(db, event_id: str) -> bool:
    """Atomic insert into idempotency ledger. Returns True if first-time."""
    try:
        await db.hotmart_webhook_events.insert_one(
            {"event_id": event_id, "processed_at": _now()}
        )
        return True
    except Exception:
        # Duplicate insert (unique index violation) → already processed
        return False


async def _resolve_user(db, info: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Find iTRAIN user from webhook payload via sck → email → buyer email fallback."""
    sck = parse_sck(info.get("sck", ""))
    if sck:
        u = await db.users.find_one({"id": sck["user_id"]}, {"_id": 0})
        if u:
            return u
    email = (info.get("buyer_email") or "").strip().lower()
    if email:
        u = await db.users.find_one({"email": email}, {"_id": 0})
        if u:
            return u
    return None


async def _resolve_tier(info: Dict[str, Any]) -> Optional[Dict[str, str]]:
    """Determine which internal tier the purchase relates to."""
    # 1) sck has authoritative tier/cycle (our own embed)
    sck = parse_sck(info.get("sck", ""))
    if sck:
        return {
            "tier": sck["tier"],
            "cycle": sck["cycle"],
            "plan_slug": f"{sck['tier']}_{sck['cycle']}",
        }
    # 2) product/offer reverse lookup
    return find_tier_by_product(info.get("product_id", ""), info.get("offer_code", ""))


async def _upsert_subscription(db, user_id: str, info: Dict[str, Any], tier_info: Dict[str, str], new_status: str, reason: str):
    now = _now()
    update = {
        "user_id": user_id,
        "tier": tier_info["tier"],
        "cycle": tier_info["cycle"],
        "plan_slug": tier_info["plan_slug"],
        "subscriber_code": info.get("subscriber_code", "") or None,
        "transaction_id": info.get("transaction_id", "") or None,
        "status": new_status,
        "status_reason": reason,
        "amount": info.get("amount"),
        "currency": info.get("currency"),
        "next_charge_date": info.get("next_charge_date") or None,
        "updated_at": now,
    }
    if new_status == "canceled":
        update["canceled_at"] = now
    if new_status == "active":
        update["canceled_at"] = None

    # Match either by subscriber_code (preferred) or by user_id+tier (fallback for purchase_approved before subscriber_code exists)
    filter_doc = (
        {"subscriber_code": info["subscriber_code"]}
        if info.get("subscriber_code")
        else {"user_id": user_id, "tier": tier_info["tier"], "cycle": tier_info["cycle"]}
    )
    existing = await db.hotmart_subscriptions.find_one(filter_doc, {"_id": 0})
    if existing:
        await db.hotmart_subscriptions.update_one(filter_doc, {"$set": update})
    else:
        update["created_at"] = now
        await db.hotmart_subscriptions.insert_one(update)


async def _set_user_subscription(db, user_id: str, tier: str):
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "subscription": tier,
                "subscription_updated_at": _now(),
            }
        },
    )


# ─── Event handlers ───────────────────────────────────
async def handle_purchase_approved(db, info, event_id):
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info)
    if not user or not tier_info:
        logger.warning("PURCHASE_APPROVED unresolved: user=%s tier=%s sck=%s buyer=%s", user, tier_info, info.get("sck"), info.get("buyer_email"))
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "active", "purchase_approved")
    await _set_user_subscription(db, user["id"], tier_info["tier"])
    return {"resolved": True, "user_id": user["id"], "tier": tier_info["tier"]}


async def handle_purchase_complete(db, info, event_id):
    """Recurring renewal — keep subscription active, refresh next_charge_date."""
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info)
    if not user or not tier_info:
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "active", "purchase_complete")
    return {"resolved": True}


async def handle_subscription_canceled(db, info, event_id):
    """Downgrade to starter at the end of cycle (we revoke immediately for safety)."""
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info) or {"tier": "starter", "cycle": "monthly", "plan_slug": "starter_monthly"}
    if not user:
        # Try to find by subscriber_code alone
        if info.get("subscriber_code"):
            sub = await db.hotmart_subscriptions.find_one(
                {"subscriber_code": info["subscriber_code"]}, {"_id": 0}
            )
            if sub:
                user = await db.users.find_one({"id": sub["user_id"]}, {"_id": 0})
    if not user:
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "canceled", "subscription_canceled")
    await _set_user_subscription(db, user["id"], "starter")
    return {"resolved": True}


async def handle_purchase_refunded(db, info, event_id):
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info) or {"tier": "starter", "cycle": "monthly", "plan_slug": "starter_monthly"}
    if not user:
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "suspended", "purchase_refunded")
    await _set_user_subscription(db, user["id"], "starter")
    return {"resolved": True}


async def handle_purchase_chargeback(db, info, event_id):
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info) or {"tier": "starter", "cycle": "monthly", "plan_slug": "starter_monthly"}
    if not user:
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "suspended", "purchase_chargeback")
    await _set_user_subscription(db, user["id"], "starter")
    return {"resolved": True}


async def handle_purchase_expired(db, info, event_id):
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info) or {"tier": "starter", "cycle": "monthly", "plan_slug": "starter_monthly"}
    if not user:
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "expired", "purchase_expired")
    await _set_user_subscription(db, user["id"], "starter")
    return {"resolved": True}


async def handle_billing_date_changed(db, info, event_id):
    if not info.get("subscriber_code"):
        return {"resolved": False}
    await db.hotmart_subscriptions.update_one(
        {"subscriber_code": info["subscriber_code"]},
        {"$set": {"next_charge_date": info.get("next_charge_date"), "updated_at": _now()}},
    )
    return {"resolved": True}


async def handle_switch_plan(db, info, event_id):
    """Buyer switched to a different plan within Hotmart."""
    user = await _resolve_user(db, info)
    tier_info = await _resolve_tier(info)
    if not user or not tier_info:
        return {"resolved": False}
    await _upsert_subscription(db, user["id"], info, tier_info, "active", "switch_plan")
    await _set_user_subscription(db, user["id"], tier_info["tier"])
    return {"resolved": True}


EVENT_DISPATCH = {
    "PURCHASE_APPROVED": handle_purchase_approved,
    "PURCHASE_COMPLETE": handle_purchase_complete,
    "PURCHASE_CANCELED": handle_subscription_canceled,
    "SUBSCRIPTION_CANCELLATION": handle_subscription_canceled,
    "PURCHASE_REFUNDED": handle_purchase_refunded,
    "CHARGEBACK": handle_purchase_chargeback,
    "PURCHASE_CHARGEBACK": handle_purchase_chargeback,
    "PURCHASE_PROTEST": handle_purchase_chargeback,
    "PURCHASE_EXPIRED": handle_purchase_expired,
    "PURCHASE_DELAYED": handle_purchase_complete,  # treat as active w/ delayed status; simplified
    "UPDATE_SUBSCRIPTION_CHARGE_DATE": handle_billing_date_changed,
    "SUBSCRIPTION_BILLING_DATE_CHANGED": handle_billing_date_changed,
    "SWITCH_PLAN": handle_switch_plan,
}


# ─── Endpoint ─────────────────────────────────────────
@router.get("/hotmart")
async def hotmart_webhook_healthcheck():
    """
    GET healthcheck so Hotmart (or any external validator) can verify
    the URL is reachable when registering the webhook.

    Does NOT expose any sensitive info — only confirms availability.
    """
    return {
        "ok": True,
        "service": "iTRAIN Hotmart webhook receiver",
        "method": "POST",
        "configured": bool(_expected_hottok()),
    }


@router.post("/hotmart", status_code=status.HTTP_200_OK)
async def receive_hotmart_webhook(request: Request):
    db = request.app.state.db

    # Parse JSON
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # 1) Validate Hottok
    expected = _expected_hottok()
    if not expected:
        logger.error("HOTMART_HOTTOK is not configured; refusing webhook")
        raise HTTPException(status_code=503, detail="Webhook not configured")
    received = _extract_hottok(request, payload)
    if not received or received != expected:
        logger.warning("Invalid Hottok received: %s", (received or "")[:8] + "…")
        raise HTTPException(status_code=401, detail="Invalid Hottok")

    # 2) Idempotency
    event_id = _extract_event_id(payload)
    is_first = await _mark_processed(db, event_id)
    if not is_first:
        return JSONResponse(
            {"status": "duplicate", "event_id": event_id}, status_code=200
        )

    # 3) Dispatch
    info = _safe_extract(payload)
    event_name = info["event_name"].upper()
    handler = EVENT_DISPATCH.get(event_name)
    if not handler:
        logger.info("Ignored Hotmart event: %s", event_name)
        return {"status": "ignored", "event": event_name, "event_id": event_id}

    try:
        result = await handler(db, info, event_id)
    except Exception as e:
        logger.exception("Error handling Hotmart event %s: %s", event_name, e)
        # Remove ledger entry so Hotmart's retry can re-attempt
        await db.hotmart_webhook_events.delete_one({"event_id": event_id})
        raise HTTPException(status_code=500, detail=f"Handler error: {e}")

    return {
        "status": "processed",
        "event": event_name,
        "event_id": event_id,
        "result": result,
    }
