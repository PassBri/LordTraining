"""
Métricas avanzadas para el coach (Fase 4):
  - ACWR (Acute:Chronic Workload Ratio) por semana.
  - Adherencia (% sesiones completadas) por semana.
  - Atletas con baja disponibilidad hoy (readiness overall < 60).
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, date, timedelta
from typing import Optional
import jwt
import os

from routes.athlete_portal import _plan_sessions_payload

router = APIRouter(prefix="/api/coach/metrics", tags=["Coach Metrics"])
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


def get_db(request: Request):
    return request.app.state.db


async def get_current_coach(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = get_db(request)
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


def _parse(d):
    try:
        return datetime.strptime(str(d)[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def _session_load(s):
    """Carga = duración × RPE (sólo sesiones completadas cuentan como carga real)."""
    if not s.get("completada"):
        return 0.0
    dur = s.get("duracion_minutos") or 0
    rpe = s.get("rpe_reportado") or s.get("RPE_sesion") or 6
    try:
        return float(dur) * float(rpe)
    except Exception:
        return 0.0


async def _low_readiness(db, coach_id):
    today = date.today().isoformat()
    docs = await db.athlete_readiness.find(
        {"coach_id": coach_id, "date": today, "overall": {"$lt": 60}}, {"_id": 0}
    ).to_list(100)
    out = []
    for d in docs:
        ath = await db.athletes.find_one({"id": d["athlete_id"]}, {"_id": 0, "name": 1})
        out.append({
            "athlete_id": d["athlete_id"],
            "name": (ath or {}).get("name") or "Atleta",
            "overall": d.get("overall"),
            "sleep": d.get("sleep"), "muscle_soreness": d.get("muscle_soreness"),
            "stress": d.get("stress"), "motivation": d.get("motivation"),
        })
    out.sort(key=lambda x: x.get("overall") or 0)
    return out


@router.get("")
async def coach_metrics(request: Request, plan_id: Optional[str] = None, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    today = date.today()

    acwr_series = []
    adherence_series = []
    acwr_current = None
    acwr_zone = "sin_datos"
    adherence_overall = 0

    if plan_id:
        payload = await _plan_sessions_payload(db, plan_id, coach["id"])
        sessions = payload.get("sessions", [])
        dated = [(s, _parse(s.get("fecha"))) for s in sessions if s.get("fecha")]
        dated = [(s, d) for s, d in dated if d]

        # Carga diaria
        daily_load = {}
        for s, d in dated:
            daily_load[d] = daily_load.get(d, 0.0) + _session_load(s)

        if dated:
            start = min(d for _, d in dated)
            end = min(today, max(d for _, d in dated))
            # Iterar por semana
            wk_start = start
            week_idx = 0
            while wk_start <= end:
                week_idx += 1
                wk_end = wk_start + timedelta(days=6)
                ref = min(wk_end, end)
                # Acute = 7 días previos a ref; Chronic = 28 días previos / 4
                acute = sum(daily_load.get(ref - timedelta(days=i), 0.0) for i in range(7))
                chronic28 = sum(daily_load.get(ref - timedelta(days=i), 0.0) for i in range(28))
                chronic = chronic28 / 4.0
                acwr = round(acute / chronic, 2) if chronic > 0 else 0
                if ref <= today:
                    acwr_series.append({"week": f"S{week_idx}", "acwr": acwr, "acute": round(acute), "chronic": round(chronic)})

                # Adherencia de la semana (sesiones programadas hasta hoy)
                wk_sessions = [s for s, d in dated if wk_start <= d <= wk_end and d <= today]
                done = sum(1 for s in wk_sessions if s.get("completada"))
                sched = len(wk_sessions)
                if sched > 0:
                    adherence_series.append({"week": f"S{week_idx}", "adherence": round(done / sched * 100), "completed": done, "scheduled": sched})
                wk_start = wk_end + timedelta(days=1)

            if acwr_series:
                acwr_current = acwr_series[-1]["acwr"]
                if acwr_current == 0:
                    acwr_zone = "sin_datos"
                elif acwr_current < 0.8:
                    acwr_zone = "bajo"          # subcarga
                elif acwr_current <= 1.3:
                    acwr_zone = "optimo"        # sweet spot
                elif acwr_current <= 1.5:
                    acwr_zone = "precaucion"
                else:
                    acwr_zone = "riesgo"        # alto riesgo de lesión

            total_done = sum(a["completed"] for a in adherence_series)
            total_sched = sum(a["scheduled"] for a in adherence_series)
            adherence_overall = round(total_done / total_sched * 100) if total_sched else 0

    low = await _low_readiness(db, coach["id"])

    return {
        "acwr_series": acwr_series[-16:],         # últimas 16 semanas
        "acwr_current": acwr_current,
        "acwr_zone": acwr_zone,
        "adherence_series": adherence_series[-16:],
        "adherence_overall": adherence_overall,
        "low_readiness_athletes": low,
    }
