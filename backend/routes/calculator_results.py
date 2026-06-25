"""
Calculator Results — Guardar resultados de las calculadoras científicas
al perfil de un atleta y/o plan de entrenamiento.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import uuid

from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/calculator-results", tags=["calculator-results"])

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[db_name]
_results = _db["calculator_results"]
_athletes = _db["athletes"]
_plans = _db["training_plans"]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


def _uid(user):
    return user.get("id") or user.get("user_id")


class ResultItem(BaseModel):
    label: str
    value: str


class CalcResultIn(BaseModel):
    athlete_id: str
    plan_id: Optional[str] = None
    calculator: str = Field(..., min_length=1, max_length=120)   # id/slug de la calculadora
    title: str = Field(..., min_length=1, max_length=160)
    module: Optional[str] = None
    color: Optional[str] = None
    headline: Optional[Dict[str, Any]] = None                    # {label, value, unit}
    items: List[ResultItem] = Field(default_factory=list)
    note: Optional[str] = None


async def _athlete_name(uid, athlete_id):
    a = await _athletes.find_one({"id": athlete_id, "coach_id": uid}, {"_id": 0, "name": 1})
    return a["name"] if a else None


@router.post("")
async def save_result(payload: CalcResultIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    a_name = await _athlete_name(uid, payload.athlete_id)
    if not a_name:
        raise HTTPException(404, "Atleta no encontrado")
    plan_name = None
    if payload.plan_id:
        p = await _plans.find_one({"id": payload.plan_id, "coach_id": uid}, {"_id": 0, "name": 1})
        plan_name = (p or {}).get("name")
    doc = {
        "id": uuid.uuid4().hex,
        "coach_id": uid,
        "athlete_id": payload.athlete_id,
        "athlete_name": a_name,
        "plan_id": payload.plan_id,
        "plan_name": plan_name,
        "calculator": payload.calculator,
        "title": payload.title,
        "module": payload.module,
        "color": payload.color,
        "headline": payload.headline,
        "items": [i.model_dump() for i in payload.items],
        "note": payload.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _results.insert_one(dict(doc))
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_results(athlete_id: Optional[str] = Query(None), plan_id: Optional[str] = Query(None),
                       user=Depends(get_current_user_dep())):
    uid = _uid(user)
    q = {"coach_id": uid}
    if athlete_id:
        q["athlete_id"] = athlete_id
    if plan_id:
        q["plan_id"] = plan_id
    items = await _results.find(q, {"_id": 0}).sort("created_at", -1).to_list(3000)
    return {"results": items, "total": len(items)}


@router.delete("/{rid}")
async def delete_result(rid: str, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    res = await _results.delete_one({"id": rid, "coach_id": uid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Resultado no encontrado")
    return {"ok": True}


# ───────────────────── PROGRESIÓN: detalle, PDF y enlace público ─────────────────────
_shares = _db["calc_progress_shares"]


def _to_num(v):
    if v is None:
        return None
    import re
    m = re.findall(r"-?\d+\.?\d*", str(v))
    return float(m[0]) if m else None


async def _build_series(coach_id, athlete_id, calculator, label):
    rows = await _results.find(
        {"coach_id": coach_id, "athlete_id": athlete_id, "calculator": calculator},
        {"_id": 0}
    ).sort("created_at", 1).to_list(3000)
    rows = [r for r in rows if (r.get("headline") or {}).get("label") == label]
    if not rows:
        return None
    a = await _athletes.find_one({"id": athlete_id}, {"_id": 0, "name": 1})
    pts = []
    for r in rows:
        h = r.get("headline") or {}
        val = _to_num(h.get("value"))
        if val is None:
            continue
        pts.append({"date": (r.get("created_at") or "")[:10], "value": val,
                    "note": r.get("note"), "plan_name": r.get("plan_name")})
    if not pts:
        return None
    first = rows[0]
    return {
        "athlete_name": (a or {}).get("name") or "Atleta",
        "title": first.get("title"),
        "label": label,
        "unit": (first.get("headline") or {}).get("unit") or "",
        "color": first.get("color") or "#3B82F6",
        "module": first.get("module"),
        "points": pts,
    }


class ShareIn(BaseModel):
    athlete_id: str
    calculator: str
    metric_label: str


@router.post("/share")
async def create_progress_share(payload: ShareIn, user=Depends(get_current_user_dep())):
    uid = _uid(user)
    series = await _build_series(uid, payload.athlete_id, payload.calculator, payload.metric_label)
    if not series:
        raise HTTPException(404, "No hay registros para compartir")
    existing = await _shares.find_one(
        {"coach_id": uid, "athlete_id": payload.athlete_id, "calculator": payload.calculator, "metric_label": payload.metric_label},
        {"_id": 0})
    if existing:
        return {"share_id": existing["share_id"]}
    sid = uuid.uuid4().hex[:12]
    await _shares.insert_one({
        "share_id": sid, "coach_id": uid, "athlete_id": payload.athlete_id,
        "calculator": payload.calculator, "metric_label": payload.metric_label,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"share_id": sid}


async def _series_from_share(share_id):
    s = await _shares.find_one({"share_id": share_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Enlace no válido")
    series = await _build_series(s["coach_id"], s["athlete_id"], s["calculator"], s["metric_label"])
    if not series:
        raise HTTPException(404, "Sin datos")
    return series


@router.get("/public/{share_id}")
async def public_progress(share_id: str):
    return await _series_from_share(share_id)


@router.get("/public/{share_id}/pdf")
async def public_progress_pdf(share_id: str, origin: str = Query(None)):
    series = await _series_from_share(share_id)
    public_url = f"{origin.rstrip('/')}/progress/p/{share_id}" if origin else None
    pdf = _build_progress_pdf(series, public_url=public_url)
    fname = f"progreso_{series['athlete_name'].replace(' ', '_').lower()}.pdf"
    from fastapi import Response
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename=\"{fname}\"'})


@router.get("/progress-pdf")
async def progress_pdf(athlete_id: str = Query(...), calculator: str = Query(...),
                       label: str = Query(...), user=Depends(get_current_user_dep())):
    uid = _uid(user)
    series = await _build_series(uid, athlete_id, calculator, label)
    if not series:
        raise HTTPException(404, "Sin datos")
    pdf = _build_progress_pdf(series)
    fname = f"progreso_{series['athlete_name'].replace(' ', '_').lower()}.pdf"
    from fastapi import Response
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename=\"{fname}\"'})


def _build_progress_pdf(series: dict, public_url: Optional[str] = None) -> bytes:
    import io
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.colors import HexColor
    from reportlab.pdfbase.pdfmetrics import stringWidth

    pts = series["points"]
    color = HexColor(series.get("color") or "#3B82F6")
    accent = HexColor("#CCFF00")
    W, H = letter
    M = 40
    F, FB = "Helvetica", "Helvetica-Bold"
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.setFillColor(HexColor("#ffffff"))
    c.rect(0, 0, W, H, fill=1, stroke=0)

    def t(x, y, s, size=10, col=HexColor("#1e293b"), b=False, center=False, right=False):
        c.setFont(FB if b else F, size)
        c.setFillColor(col)
        if center:
            c.drawCentredString(x, y, str(s))
        elif right:
            c.drawRightString(x, y, str(s))
        else:
            c.drawString(x, y, str(s))

    vals = [p["value"] for p in pts]
    first, last = vals[0], vals[-1]
    delta = last - first
    pct = (delta / abs(first) * 100) if first else 0
    vmin, vmax = min(vals), max(vals)

    # Header
    hh = 96
    c.setFillColor(HexColor("#0f172a"))
    c.roundRect(M, H - 30 - hh, W - 2 * M, hh, 12, fill=1, stroke=0)
    c.setFillColor(accent)
    c.rect(M, H - 30 - hh, W - 2 * M, 4, fill=1, stroke=0)
    t(M + 16, H - 52, "LORDTRAINING", 10, accent, True)
    c.setFont(FB, 10)
    c.setFillColor(HexColor("#ffffff"))
    c.drawString(M + 16 + stringWidth("LORDTRAINING", FB, 10), H - 52, " · REPORTE DE PROGRESO")
    t(W - M - 16, H - 52, datetime.now().strftime("%d/%m/%Y"), 9, HexColor("#94a3b8"), right=True)
    t(M + 16, H - 76, series["athlete_name"], 18, HexColor("#ffffff"), True)
    t(M + 16, H - 94, f"{series['title']} · {series['label']}", 11, accent, True)
    # latest + delta on right
    t(W - M - 16, H - 86, f"{last}{(' ' + series['unit']) if series['unit'] else ''}", 24, accent, True, right=True)
    dcol = HexColor("#10b981") if delta >= 0 else HexColor("#f87171")
    arrow = "▲" if delta > 0 else "▼" if delta < 0 else "■"
    t(W - M - 16, H - 102, f"{arrow} {'+' if delta > 0 else ''}{pct:.1f}% vs inicio", 10, dcol, True, right=True)

    # Chart area
    cx, cy, cw, ch = M, H - 30 - hh - 30 - 210, W - 2 * M, 210
    c.setFillColor(HexColor("#f8fafc"))
    c.roundRect(cx, cy, cw, ch, 10, fill=1, stroke=0)
    pad = 36
    gx0, gy0, gx1, gy1 = cx + pad + 6, cy + pad, cx + cw - 16, cy + ch - 20
    rng = (vmax - vmin) or 1
    # gridlines + y labels
    c.setFont(F, 8)
    for i in range(5):
        gy = gy0 + (gy1 - gy0) * i / 4
        c.setStrokeColor(HexColor("#e2e8f0"))
        c.setLineWidth(0.6)
        c.line(gx0, gy, gx1, gy)
        val = vmin + rng * i / 4
        c.setFillColor(HexColor("#94a3b8"))
        c.drawRightString(gx0 - 6, gy - 3, f"{val:.1f}")

    def X(i):
        return gx0 if len(pts) == 1 else gx0 + (gx1 - gx0) * i / (len(pts) - 1)

    def Y(v):
        return gy0 + (gy1 - gy0) * (v - vmin) / rng

    # line
    c.setStrokeColor(color)
    c.setLineWidth(2.2)
    for i in range(len(pts) - 1):
        c.line(X(i), Y(pts[i]["value"]), X(i + 1), Y(pts[i + 1]["value"]))
    # points + x labels
    for i, p in enumerate(pts):
        c.setFillColor(color)
        c.circle(X(i), Y(p["value"]), 3.2, fill=1, stroke=0)
        c.setFillColor(HexColor("#64748b"))
        c.setFont(F, 7)
        c.drawCentredString(X(i), gy0 - 12, p["date"][5:])

    # Stats row
    sy = cy - 26
    stats = [("Inicial", f"{first}"), ("Actual", f"{last}"), ("Mejor", f"{vmax}"),
             ("Promedio", f"{sum(vals)/len(vals):.1f}"), ("Registros", f"{len(pts)}")]
    sw = (W - 2 * M) / len(stats)
    for i, (lbl, val) in enumerate(stats):
        sx = M + i * sw
        t(sx + sw / 2, sy, val, 14, color, True, center=True)
        t(sx + sw / 2, sy - 12, lbl.upper(), 8, HexColor("#94a3b8"), center=True)

    # Records table
    ty = sy - 40
    t(M, ty, "HISTORIAL DE REGISTROS", 11, HexColor("#0f172a"), True)
    ty -= 8
    c.setStrokeColor(HexColor("#e2e8f0"))
    c.line(M, ty, W - M, ty)
    ty -= 16
    for p in reversed(pts):
        if ty < 70:
            c.showPage()
            c.setFillColor(HexColor("#ffffff"))
            c.rect(0, 0, W, H, fill=1, stroke=0)
            ty = H - 60
        t(M, ty, p["date"], 9, HexColor("#475569"))
        t(M + 90, ty, f"{p['value']}{(' ' + series['unit']) if series['unit'] else ''}", 10, color, True)
        note = p.get("note") or (p.get("plan_name") and f"Plan: {p['plan_name']}") or ""
        if note:
            t(M + 180, ty, str(note)[:70], 9, HexColor("#64748b"))
        ty -= 16

    # QR + footer
    if public_url:
        try:
            import qrcode
            from reportlab.lib.utils import ImageReader
            img = qrcode.make(public_url)
            b = io.BytesIO()
            img.save(b, format="PNG")
            b.seek(0)
            c.drawImage(ImageReader(b), W - M - 60, 40, 60, 60, mask="auto")
            t(W - M - 30, 34, "Ver online", 7, HexColor("#94a3b8"), center=True)
        except Exception:
            pass
    c.setFillColor(HexColor("#0f172a"))
    c.rect(0, 0, W, 26, fill=1, stroke=0)
    t(M, 9, "LordTraining · Reporte de progreso del atleta", 9, HexColor("#94a3b8"))
    t(W - M, 9, "Identifica el talento. Construye el futuro.", 9, accent, True, right=True)

    c.showPage()
    c.save()
    return buf.getvalue()

