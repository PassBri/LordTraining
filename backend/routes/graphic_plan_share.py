"""Compartir Plan Gráfico como imagen pública (sin auth para el viewer)."""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/graphic-plan", tags=["graphic-plan"])
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]
_shares = _db["graphic_plan_shares"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


class ShareReq(BaseModel):
    plan_id: Optional[str] = None
    plan_name: Optional[str] = ""
    image_b64: str  # data:image/png;base64,...


@router.post("/share")
async def share_graphic_plan(payload: ShareReq, user=Depends(get_current_user_dep())):
    uid = user.get("id") or user.get("user_id")
    share_id = uuid.uuid4().hex[:14]
    now = datetime.now(timezone.utc).isoformat()
    await _shares.insert_one({
        "share_id": share_id,
        "user_id": uid,
        "plan_id": payload.plan_id,
        "plan_name": payload.plan_name or "Plan Gráfico",
        "image_b64": payload.image_b64,
        "created_at": now,
    })
    return {"share_id": share_id}


@router.get("/shared/{share_id}", response_class=HTMLResponse)
async def view_shared(share_id: str):
    doc = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Enlace no válido")
    img = doc.get("image_b64", "")
    name = doc.get("plan_name") or "Plan Gráfico"
    html = f"""<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Plan Gráfico · {name}</title>
<style>
  body {{ margin:0; background:#0f172a; font-family:Arial,sans-serif; color:#fff; }}
  .container {{ max-width:1400px; margin:0 auto; padding:24px; }}
  .ribbon {{ background:#CCFF00; color:#0f172a; text-align:center; padding:8px; font-weight:800; letter-spacing:1.5px; text-transform:uppercase; font-size:11px; border-radius:8px; margin-bottom:16px; }}
  h1 {{ font-size:24px; font-weight:900; margin:0 0 16px; }}
  img {{ max-width:100%; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.4); background:#fff; }}
  .footer {{ text-align:center; padding:16px; color:#94a3b8; font-size:11px; }}
</style></head><body>
<div class="container">
  <div class="ribbon">📊 Documento compartido · Solo lectura · iTRAIN</div>
  <h1>{name}</h1>
  <img src="{img}" alt="Plan Gráfico" />
  <div class="footer">Generado por <strong>iTRAIN</strong> · iTrain.app</div>
</div>
</body></html>"""
    return HTMLResponse(content=html)
