"""
Coach — Ranking / comparativa de atletas.

Combina señales por atleta en un score 0–100:
  - readiness: último `overall` de athlete_readiness (0–100)
  - evaluation_avg: promedio de global_pct de sus controles (plan_evaluations_v2, 0–100)
El score combinado es el promedio de las señales disponibles.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional

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
