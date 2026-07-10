"""
Coach — Ranking / comparativa de atletas.

Combina señales por atleta en un score 0–100:
  - readiness: último `overall` de athlete_readiness (0–100)
  - evaluation_avg: promedio de global_pct de sus controles (plan_evaluations_v2, 0–100)
El score combinado es el promedio de las señales disponibles.
"""
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from io import BytesIO
from datetime import datetime

from core.auth import get_current_user, get_db

router = APIRouter(prefix="/coach", tags=["coach-ranking"])


def _eval_pct(doc) -> Optional[float]:
    aspects = doc.get("aspects") or []
    s, n = 0.0, 0
    for a in aspects:
        v = a.get("value")
        try:
            if v is None or v == "":
                continue
            v = float(v)
            mn = float(a.get("scale_min", 0)); mx = float(a.get("scale_max", 10))
            if mx != mn:
                s += max(0.0, min(100.0, (v - mn) / (mx - mn) * 100)); n += 1
        except Exception:
            continue
    return round(s / n) if n else None


@router.get("/athlete-ranking")
async def athlete_ranking(
    team_id: Optional[str] = Query(None),
    federation: Optional[str] = Query(None),
    club: Optional[str] = Query(None),
    user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    uid = user["id"]
    q = {"coach_id": uid}
    if team_id and team_id != "all":
        q["team_id"] = team_id
    if federation and federation != "all":
        q["federation"] = federation
    if club and club != "all":
        q["club"] = club
    athletes = await db.athletes.find(q, {"_id": 0}).to_list(length=500)

    # Readiness más reciente por atleta
    readiness_map = {}
    rcur = db.athlete_readiness.find({"coach_id": uid}, {"_id": 0}).sort("date", -1)
    for r in await rcur.to_list(length=5000):
        aid = r.get("athlete_id")
        if aid and aid not in readiness_map:
            readiness_map[aid] = r.get("overall")

    # Promedio de evaluaciones por atleta
    eval_acc = {}
    ecur = db.plan_evaluations_v2.find({"user_id": uid}, {"_id": 0})
    for d in await ecur.to_list(length=10000):
        aid = d.get("athlete_id")
        if not aid:
            continue
        pct = _eval_pct(d)
        if pct is None:
            continue
        acc = eval_acc.setdefault(aid, {"sum": 0.0, "n": 0})
        acc["sum"] += pct; acc["n"] += 1

    rows = []
    for a in athletes:
        aid = a.get("id")
        readiness = readiness_map.get(aid)
        ev = eval_acc.get(aid)
        evaluation_avg = round(ev["sum"] / ev["n"]) if ev and ev["n"] else None
        signals = [x for x in [readiness, evaluation_avg] if x is not None]
        score = round(sum(signals) / len(signals)) if signals else None
        rows.append({
            "athlete_id": aid,
            "name": a.get("name"),
            "sport": a.get("sport"),
            "team_id": a.get("team_id"),
            "avatar": a.get("avatar"),
            "readiness": readiness,
            "evaluation_avg": evaluation_avg,
            "evaluations_count": ev["n"] if ev else 0,
            "score": score,
            "has_data": bool(signals),
        })

    # Orden: con datos primero (score desc), sin datos al final por nombre
    rows.sort(key=lambda r: (r["has_data"], r["score"] if r["score"] is not None else -1), reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1 if r["has_data"] else None

    return {"ranking": rows, "total": len(rows)}


def _elite_level(score) -> Optional[dict]:
    if score is None:
        return None
    for mn, key, label in [(90, "diamond", "Diamante"), (75, "gold", "Oro"),
                           (60, "silver", "Plata"), (40, "bronze", "Bronce"),
                           (-1, "rookie", "En desarrollo")]:
        if score >= mn:
            return {"key": key, "label": label}
    return None


@router.get("/athlete-score/{athlete_id}")
async def athlete_score(athlete_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Score de evaluación (0–100) + nivel de élite (medalla) de un atleta."""
    uid = user["id"]
    acc = {"sum": 0.0, "n": 0}
    ecur = db.plan_evaluations_v2.find({"user_id": uid, "athlete_id": athlete_id}, {"_id": 0})
    for d in await ecur.to_list(length=5000):
        pct = _eval_pct(d)
        if pct is not None:
            acc["sum"] += pct; acc["n"] += 1
    score = round(acc["sum"] / acc["n"]) if acc["n"] else None
    lvl = _elite_level(score)
    return {
        "athlete_id": athlete_id,
        "evaluation_score": score,
        "evaluations_count": acc["n"],
        "elite_level": lvl["label"] if lvl else None,
        "elite_level_key": lvl["key"] if lvl else None,
    }


class WeeklyAlert(BaseModel):
    title: str = ""
    message: str = ""
    severity: str = "info"  # high | medium | ok | info
    athlete_name: Optional[str] = None

class WeeklyAlertsPDFRequest(BaseModel):
    alerts: List[WeeklyAlert] = []
    week_label: Optional[str] = None


@router.post("/weekly-alerts-pdf")
async def weekly_alerts_pdf(body: WeeklyAlertsPDFRequest, user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor, white
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    SEV = {
        "high":   ("ALTA",   HexColor("#DC2626")),
        "medium": ("MEDIA",  HexColor("#F59E0B")),
        "ok":     ("OK",     HexColor("#10B981")),
        "info":   ("INFO",   HexColor("#3B82F6")),
    }
    order = {"high": 0, "medium": 1, "info": 2, "ok": 3}
    alerts = sorted(body.alerts, key=lambda a: order.get(a.severity, 9))

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm, leftMargin=1.8 * cm, rightMargin=1.8 * cm)
    styles = getSampleStyleSheet()
    title_st = ParagraphStyle("t", parent=styles["Title"], fontSize=20, textColor=HexColor("#0F172A"), spaceAfter=4)
    sub_st = ParagraphStyle("s", parent=styles["Normal"], fontSize=10, textColor=HexColor("#64748B"), spaceAfter=14)
    h_st = ParagraphStyle("h", parent=styles["Heading2"], fontSize=13, textColor=HexColor("#0F172A"), spaceBefore=10, spaceAfter=6)
    cell_st = ParagraphStyle("c", parent=styles["Normal"], fontSize=9, textColor=HexColor("#1E293B"))

    counts = {k: 0 for k in SEV}
    for a in alerts:
        counts[a.severity if a.severity in counts else "info"] = counts.get(a.severity, 0) + 1

    elems = []
    elems.append(Paragraph("Resumen Semanal de Alertas", title_st))
    elems.append(Paragraph(f"{user.get('name', 'Entrenador')} · {body.week_label or datetime.now().strftime('%d/%m/%Y')}", sub_st))

    # Resumen por severidad
    summary_data = [["Críticas", "Medias", "Informativas", "OK"],
                    [str(counts.get("high", 0)), str(counts.get("medium", 0)), str(counts.get("info", 0)), str(counts.get("ok", 0))]]
    st = Table(summary_data, colWidths=[4.1 * cm] * 4)
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), HexColor("#0F172A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), white),
        ("FONTSIZE", (0, 0), (-1, -1), 10), ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"), ("FONTSIZE", (0, 1), (-1, 1), 16),
        ("TEXTCOLOR", (0, 1), (0, 1), HexColor("#DC2626")),
        ("TEXTCOLOR", (1, 1), (1, 1), HexColor("#F59E0B")),
        ("TEXTCOLOR", (2, 1), (2, 1), HexColor("#3B82F6")),
        ("TEXTCOLOR", (3, 1), (3, 1), HexColor("#10B981")),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
    ]))
    elems.append(st)
    elems.append(Spacer(1, 12))

    elems.append(Paragraph("Detalle de Alertas", h_st))
    if not alerts:
        elems.append(Paragraph("No hay alertas activas esta semana. ¡Buen trabajo!", cell_st))
    else:
        rows = [["Sev.", "Atleta", "Alerta"]]
        for a in alerts:
            label = SEV.get(a.severity, SEV["info"])[0]
            text = f"<b>{a.title}</b>"
            if a.message:
                text += f"<br/>{a.message}"
            rows.append([label, a.athlete_name or "Equipo", Paragraph(text, cell_st)])
        tbl = Table(rows, colWidths=[2 * cm, 3.5 * cm, 11 * cm])
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#F1F5F9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#0F172A")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("VALIGN", (0, 0), (-1, -1), "TOP"), ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#E2E8F0")),
            ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
        for i, a in enumerate(alerts, start=1):
            style.append(("TEXTCOLOR", (0, i), (0, i), SEV.get(a.severity, SEV["info"])[1]))
            style.append(("FONTNAME", (0, i), (0, i), "Helvetica-Bold"))
        tbl.setStyle(TableStyle(style))
        elems.append(tbl)

    doc.build(elems)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment; filename=alertas-semanales.pdf"})
