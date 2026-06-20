"""
Mapping between LordTraining internal plan slugs and Hotmart products/offers.

Each LordTraining tier has 2 cycles (monthly, annual) = 8 Hotmart products.
The values come from environment variables so they can be configured
without code changes once products are created in Hotmart.

Internal tier slugs (kept consistent with existing user.subscription values):
  - starter  ($9.99)
  - basic    ($19.99)  = "Pro" in UI
  - pro      ($49.99)  = "Club / Academia" in UI
  - enterprise ($149.99) = "Institucional" in UI
"""
import os
from typing import Optional, Dict


# Tiers visible in UI/DB → internal slug
TIER_TO_DB_SUBSCRIPTION = {
    "starter": "starter",
    "basic": "basic",
    "pro": "pro",
    "enterprise": "enterprise",
}

# Tier prices USD (kept in sync with SubscriptionPage.js)
PLAN_PRICES_USD = {
    "starter": 9.99,
    "basic": 19.99,
    "pro": 49.99,
    "enterprise": 149.99,
}
# Annual = 20% off, billed yearly
PLAN_ANNUAL_USD = {tier: round(price * 12 * 0.8, 2) for tier, price in PLAN_PRICES_USD.items()}


def _plan_key(tier: str, cycle: str) -> str:
    """e.g. ('basic', 'monthly') -> 'basic_monthly'."""
    return f"{tier}_{cycle}"


def get_hotmart_offer(tier: str, cycle: str = "monthly") -> Optional[Dict[str, str]]:
    """
    Returns the Hotmart offer info for a given LordTraining tier + cycle.
    Looks up environment variables of the form:
        HOTMART_PRODUCT_<TIER>_<CYCLE>          (numeric product id)
        HOTMART_OFFER_<TIER>_<CYCLE>            (offer code, e.g. D12345678X)
        HOTMART_CHECKOUT_URL_<TIER>_<CYCLE>     (full checkout URL, optional)
    Returns None if the offer is not configured.
    """
    tier = tier.lower()
    cycle = cycle.lower()
    if tier not in PLAN_PRICES_USD or cycle not in ("monthly", "annual"):
        return None

    prefix = f"{tier.upper()}_{cycle.upper()}"
    product_id = os.environ.get(f"HOTMART_PRODUCT_{prefix}", "")
    offer_code = os.environ.get(f"HOTMART_OFFER_{prefix}", "")
    checkout_url = os.environ.get(f"HOTMART_CHECKOUT_URL_{prefix}", "")

    if not (product_id or offer_code or checkout_url):
        return None

    if not checkout_url and offer_code:
        checkout_url = f"https://pay.hotmart.com/{offer_code}"

    return {
        "tier": tier,
        "cycle": cycle,
        "plan_slug": _plan_key(tier, cycle),
        "product_id": product_id,
        "offer_code": offer_code,
        "checkout_url": checkout_url,
        "price_usd": (
            PLAN_PRICES_USD[tier] if cycle == "monthly" else PLAN_ANNUAL_USD[tier]
        ),
    }


def find_tier_by_product(product_id: str, offer_code: str = "") -> Optional[Dict[str, str]]:
    """Reverse lookup: given a webhook payload's product/offer, find tier+cycle."""
    pid = str(product_id) if product_id else ""
    ofc = (offer_code or "").strip()
    for tier in PLAN_PRICES_USD:
        for cycle in ("monthly", "annual"):
            prefix = f"{tier.upper()}_{cycle.upper()}"
            env_pid = os.environ.get(f"HOTMART_PRODUCT_{prefix}", "")
            env_off = os.environ.get(f"HOTMART_OFFER_{prefix}", "")
            if (pid and env_pid and pid == env_pid) or (ofc and env_off and ofc == env_off):
                return {"tier": tier, "cycle": cycle, "plan_slug": _plan_key(tier, cycle)}
    return None


def parse_sck(sck: str) -> Optional[Dict[str, str]]:
    """Parse the `sck` custom parameter we embed in checkout URLs.
    Format: 'user_<user_id>|<tier>_<cycle>'
    """
    if not sck or "|" not in sck:
        return None
    left, right = sck.split("|", 1)
    user_id = left.replace("user_", "", 1).strip()
    parts = right.strip().rsplit("_", 1)
    if len(parts) != 2:
        return None
    tier, cycle = parts
    if tier not in PLAN_PRICES_USD or cycle not in ("monthly", "annual"):
        return None
    return {"user_id": user_id, "tier": tier, "cycle": cycle}


def build_sck(user_id: str, tier: str, cycle: str) -> str:
    return f"user_{user_id}|{tier}_{cycle}"
