"""
Portal del Atleta (Fase 3).

A) Enlace publico (sin login): vista de solo lectura del plan + marcar sesion
   completada con RPE y comentario corto.
B) Login propio del atleta: invitacion del coach (email + password temporal) o
   auto-registro por codigo. El atleta logueado ve su plan, marca sesiones,
   registra readiness diario (alimenta el panel del coach) y ve records/progreso.

Colecciones:
  - athletes (se agregan campos portal_email, portal_password, assigned_plan_id, must_change_password, portal_active)
  - athlete_portal_shares { share_id, plan_id(v1), coach_id, athlete_name, athlete_id?, created_at }
  - athlete_invite_codes  { code, coach_id, plan_id, athlete_id?, athlete_name?, used, created_at }
  - athlete_readiness      { athlete_id, coach_id, date, sleep, muscle_soreness, stress, motivation, overall, created_at }
  - sesiones_v2 (se actualizan completada, rpe_reportado, comentario_atleta, fecha_completado)
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone, date
from pydantic import BaseModel
import bcrypt
import jwt
import os
import uuid
import secrets

router = APIRouter(prefix="/api/athlete-portal", tags=["Athlete Portal"])
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


def get_db(request: Request):
    return request.app.state.db


def _now():
    return datetime.now(timezone.utc).isoformat()


def _hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def _verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def _athlete_token(athlete_id: str, email: str) -> str:
    payload = {
        "athlete_id": athlete_id, "email": email, "role": "athlete",
        "exp": datetime.now(timezone.utc).timestamp() + 60 * 60 * 24 * 30,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ---- Auth dependencies ----
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


async def get_current_athlete(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    db = get_db(request)
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("role") != "athlete":
            raise HTTPException(401, "Not an athlete token")
        ath = await db.athletes.find_one({"id": payload["athlete_id"]}, {"_id": 0})
        if not ath:
            raise HTTPException(401, "Athlete not found")
        if ath.get("portal_active") is False:
            raise HTTPException(403, "Cuenta desactivada")
        return ath
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


# ---- Helper: resolver sesiones V2 desde un plan V1 ----
async def _resolve_v2_plan(db, v1_plan_id: str, coach_id: str):
    async def _pick_best(cands):
        best, bc = None, -1
        for c in cands:
            n = await db.macrociclos_v2.count_documents({"plan_id": c["id"]})
            if n > bc:
                best, bc = c, n
        return best
    plan = await db.planes_entrenamiento.find_one({"_v1_id": v1_plan_id, "coach_id": coach_id}, {"_id": 0})
    if not plan or await db.macrociclos_v2.count_documents({"plan_id": plan["id"]}) == 0:
        cands = await db.planes_entrenamiento.find({"_v1_id": v1_plan_id, "coach_id": coach_id}, {"_id": 0}).to_list(20)
        best = await _pick_best(cands)
        if best:
            plan = best
    return plan


async def _plan_sessions_payload(db, v1_plan_id: str, coach_id: str):
    v1 = await db.training_plans.find_one({"id": v1_plan_id}, {"_id": 0})
    v2 = await _resolve_v2_plan(db, v1_plan_id, coach_id)
    sessions = []
    weeks = 0
    if v2:
        macros = await db.macrociclos_v2.find({"plan_id": v2["id"]}, {"_id": 0}).to_list(200)
        macros.sort(key=lambda m: m.get("orden", 0))
        macro_ids = [m["id"] for m in macros]
        mesos = await db.mesociclos_v2.find({"macrociclo_id": {"$in": macro_ids}}, {"_id": 0}).to_list(2000)
        meso_by_macro = {}
        for m in mesos:
            meso_by_macro.setdefault(m["macrociclo_id"], []).append(m)
        for arr in meso_by_macro.values():
            arr.sort(key=lambda x: x.get("orden", 0))
        meso_ids = [m["id"] for m in mesos]
        micros = await db.microciclos_v2.find({"mesociclo_id": {"$in": meso_ids}}, {"_id": 0}).to_list(5000)
        micro_by_meso = {}
        for mi in micros:
            micro_by_meso.setdefault(mi["mesociclo_id"], []).append(mi)
        for arr in micro_by_meso.values():
            arr.sort(key=lambda x: x.get("numero_semana", 0))
        micro_ids = [mi["id"] for mi in micros]
        ses = await db.sesiones_v2.find({"microciclo_id": {"$in": micro_ids}}, {"_id": 0}).to_list(8000)
        ses_by_micro = {}
        for s in ses:
            ses_by_micro.setdefault(s["microciclo_id"], []).append(s)
        wk = 0
        meso_name_by_id = {m["id"]: m.get("nombre") for m in mesos}
        meso_macro = {m["id"]: m["macrociclo_id"] for m in mesos}
        macro_name = {m["id"]: m.get("nombre") for m in macros}
        for macro in macros:
            for meso in meso_by_macro.get(macro["id"], []):
                for micro in micro_by_meso.get(meso["id"], []):
                    wk += 1
                    for s in sorted(ses_by_micro.get(micro["id"], []), key=lambda x: x.get("orden_dia", 1)):
                        sessions.append({
                            "id": s["id"],
                            "nombre": s.get("nombre"),
                            "fecha": s.get("fecha"),
                            "orden_dia": s.get("orden_dia"),
                            "semana": wk,
                            "duracion_minutos": s.get("duracion_minutos"),
                            "capacidad_principal": s.get("capacidad_principal"),
                            "RPE_sesion": s.get("RPE_sesion"),
                            "completada": bool(s.get("completada")),
                            "rpe_reportado": s.get("rpe_reportado"),
                            "comentario_atleta": s.get("comentario_atleta"),
                            "fecha_completado": s.get("fecha_completado"),
                            "mesociclo": meso.get("nombre"),
                            "macrociclo": macro.get("nombre"),
                        })
        weeks = wk
    return {
        "plan": {
            "id": v1_plan_id,
            "name": (v1 or {}).get("name") or (v2 or {}).get("nombre") or "Plan",
            "model": (v1 or {}).get("model_name") or (v1 or {}).get("model"),
            "sport": (v1 or {}).get("sport"),
            "total_weeks": (v1 or {}).get("total_weeks") or weeks,
            "start_date": (v1 or {}).get("start_date"),
        },
        "sessions": sessions,
        "weeks": weeks,
    }


async def _update_session_completion(db, micro_session_id_set, session_id, completada, rpe, comentario):
    if completada:
        upd = {"completada": True, "fecha_completado": _now()}
        if rpe is not None:
            upd["rpe_reportado"] = float(rpe)
        if comentario is not None:
            upd["comentario_atleta"] = str(comentario)[:500]
        res = await db.sesiones_v2.update_one({"id": session_id}, {"$set": upd})
    else:
        res = await db.sesiones_v2.update_one(
            {"id": session_id},
            {"$set": {"completada": False, "fecha_completado": None},
             "$unset": {"rpe_reportado": "", "comentario_atleta": ""}}
        )
    return res.matched_count > 0


# ====================== PUBLIC (no auth) ======================
class PublicCompletePayload(BaseModel):
    completada: bool = True
    rpe: Optional[float] = None
    comentario: Optional[str] = None


@router.get("/public/{share_id}")
async def public_view(share_id: str, request: Request):
    db = get_db(request)
    share = await db.athlete_portal_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no encontrado o expirado")
    payload = await _plan_sessions_payload(db, share["plan_id"], share["coach_id"])
    today = date.today().isoformat()
    comps = await db.plan_competitions.find(
        {"plan_id": share["plan_id"], "date": {"$gte": today}}, {"_id": 0}
    ).to_list(50)
    comps = [{"name": c.get("name"), "date": c.get("date"), "location": c.get("location"),
              "importance": c.get("importance")} for c in sorted(comps, key=lambda x: x.get("date", ""))]
    return {
        "athlete_name": share.get("athlete_name") or "Atleta",
        "read_only": True,
        "competitions": comps,
        **payload,
    }


@router.post("/public/{share_id}/sessions/{session_id}")
async def public_complete_session(share_id: str, session_id: str, payload: PublicCompletePayload, request: Request):
    db = get_db(request)
    share = await db.athlete_portal_shares.find_one({"share_id": share_id}, {"_id": 0})
    if not share:
        raise HTTPException(404, "Enlace no encontrado")
    # Validar que la sesion pertenece al plan compartido
    data = await _plan_sessions_payload(db, share["plan_id"], share["coach_id"])
    valid_ids = {s["id"] for s in data["sessions"]}
    if session_id not in valid_ids:
        raise HTTPException(403, "La sesion no pertenece a este plan")
    ok = await _update_session_completion(db, valid_ids, session_id, payload.completada, payload.rpe, payload.comentario)
    if not ok:
        raise HTTPException(404, "Sesion no encontrada")
    return {"status": "ok", "session_id": session_id, "completada": payload.completada}


# ====================== COACH endpoints ======================
class ShareCreate(BaseModel):
    plan_id: str
    athlete_name: Optional[str] = None
    athlete_id: Optional[str] = None


@router.post("/share")
async def create_share(body: ShareCreate, request: Request, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    existing = await db.athlete_portal_shares.find_one(
        {"plan_id": body.plan_id, "coach_id": coach["id"]}, {"_id": 0}
    )
    if existing:
        if body.athlete_name and body.athlete_name != existing.get("athlete_name"):
            await db.athlete_portal_shares.update_one(
                {"share_id": existing["share_id"]}, {"$set": {"athlete_name": body.athlete_name}}
            )
            existing["athlete_name"] = body.athlete_name
        return {"share_id": existing["share_id"], "athlete_name": existing.get("athlete_name")}
    share_id = "ATP-" + secrets.token_hex(8)
    await db.athlete_portal_shares.insert_one({
        "share_id": share_id, "plan_id": body.plan_id, "coach_id": coach["id"],
        "athlete_name": body.athlete_name, "athlete_id": body.athlete_id, "created_at": _now(),
    })
    return {"share_id": share_id, "athlete_name": body.athlete_name}


@router.get("/share/{plan_id}")
async def get_share(plan_id: str, request: Request, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    existing = await db.athlete_portal_shares.find_one({"plan_id": plan_id, "coach_id": coach["id"]}, {"_id": 0})
    return {"share_id": existing["share_id"] if existing else None,
            "athlete_name": existing.get("athlete_name") if existing else None}


class InvitePayload(BaseModel):
    plan_id: str
    email: Optional[str] = None


@router.post("/athletes/{athlete_id}/invite")
async def invite_athlete(athlete_id: str, body: InvitePayload, request: Request, coach: dict = Depends(get_current_coach)):
    """Genera credenciales (email + password temporal) para el atleta."""
    db = get_db(request)
    ath = await db.athletes.find_one({"id": athlete_id, "coach_id": coach["id"]}, {"_id": 0})
    if not ath:
        raise HTTPException(404, "Atleta no encontrado")
    email = (body.email or ath.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "El atleta no tiene email. Indica uno.")
    # email unico en portal
    clash = await db.athletes.find_one({"portal_email": email, "id": {"$ne": athlete_id}}, {"_id": 0})
    if clash:
        raise HTTPException(400, "Ese email ya esta en uso por otro atleta")
    temp_pw = secrets.token_urlsafe(6)
    await db.athletes.update_one({"id": athlete_id}, {"$set": {
        "portal_email": email, "portal_password": _hash_pw(temp_pw),
        "assigned_plan_id": body.plan_id, "must_change_password": True, "portal_active": True,
    }})
    return {"email": email, "temp_password": temp_pw, "athlete_id": athlete_id}


class InviteCodePayload(BaseModel):
    plan_id: str
    athlete_id: Optional[str] = None
    athlete_name: Optional[str] = None


@router.post("/invite-code")
async def create_invite_code(body: InviteCodePayload, request: Request, coach: dict = Depends(get_current_coach)):
    """Genera un codigo de auto-registro para que el atleta cree su cuenta."""
    db = get_db(request)
    code = secrets.token_hex(4).upper()
    await db.athlete_invite_codes.insert_one({
        "code": code, "coach_id": coach["id"], "plan_id": body.plan_id,
        "athlete_id": body.athlete_id, "athlete_name": body.athlete_name, "used": False, "created_at": _now(),
    })
    return {"code": code}


@router.get("/athletes/{athlete_id}/account")
async def athlete_account_status(athlete_id: str, request: Request, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    ath = await db.athletes.find_one({"id": athlete_id, "coach_id": coach["id"]}, {"_id": 0})
    if not ath:
        raise HTTPException(404, "Atleta no encontrado")
    return {
        "has_account": bool(ath.get("portal_email")),
        "portal_email": ath.get("portal_email"),
        "assigned_plan_id": ath.get("assigned_plan_id"),
        "portal_active": ath.get("portal_active", True),
    }


@router.get("/coach/readiness/{athlete_id}")
async def coach_get_readiness(athlete_id: str, request: Request, coach: dict = Depends(get_current_coach)):
    db = get_db(request)
    docs = await db.athlete_readiness.find(
        {"athlete_id": athlete_id, "coach_id": coach["id"]}, {"_id": 0}
    ).sort("date", -1).to_list(30)
    return {"readiness": docs, "latest": docs[0] if docs else None}


# ====================== ATHLETE AUTH ======================
class AthleteLogin(BaseModel):
    email: str
    password: str


class AthleteRegister(BaseModel):
    code: str
    name: Optional[str] = None
    email: str
    password: str


class ChangePassword(BaseModel):
    new_password: str


@router.post("/auth/login")
async def athlete_login(body: AthleteLogin, request: Request):
    db = get_db(request)
    email = body.email.strip().lower()
    ath = await db.athletes.find_one({"portal_email": email}, {"_id": 0})
    if not ath or not ath.get("portal_password") or not _verify_pw(body.password, ath["portal_password"]):
        raise HTTPException(401, "Credenciales invalidas")
    if ath.get("portal_active") is False:
        raise HTTPException(403, "Cuenta desactivada")
    token = _athlete_token(ath["id"], email)
    return {"token": token, "athlete": {
        "id": ath["id"], "name": ath.get("name"), "email": email,
        "must_change_password": bool(ath.get("must_change_password")),
        "assigned_plan_id": ath.get("assigned_plan_id"),
    }}


@router.post("/auth/register")
async def athlete_register(body: AthleteRegister, request: Request):
    db = get_db(request)
    code = body.code.strip().upper()
    inv = await db.athlete_invite_codes.find_one({"code": code, "used": False}, {"_id": 0})
    if not inv:
        raise HTTPException(400, "Codigo de invitacion invalido o ya usado")
    email = body.email.strip().lower()
    clash = await db.athletes.find_one({"portal_email": email}, {"_id": 0})
    if clash and clash.get("id") != inv.get("athlete_id"):
        raise HTTPException(400, "Ese email ya esta registrado")
    # Vincular a atleta existente o crear uno nuevo
    athlete_id = inv.get("athlete_id")
    if athlete_id:
        ath = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
        if not ath:
            athlete_id = None
    if not athlete_id:
        athlete_id = str(uuid.uuid4())
        await db.athletes.insert_one({
            "id": athlete_id, "coach_id": inv["coach_id"],
            "name": body.name or inv.get("athlete_name") or "Atleta",
            "email": email, "sport": "other", "age": None, "level": "amateur",
            "affiliations": [], "created_at": _now(),
        })
    await db.athletes.update_one({"id": athlete_id}, {"$set": {
        "portal_email": email, "portal_password": _hash_pw(body.password),
        "assigned_plan_id": inv["plan_id"], "must_change_password": False, "portal_active": True,
        "name": body.name or inv.get("athlete_name") or "Atleta",
    }})
    await db.athlete_invite_codes.update_one({"code": code}, {"$set": {"used": True, "used_at": _now()}})
    token = _athlete_token(athlete_id, email)
    return {"token": token, "athlete": {
        "id": athlete_id, "name": body.name or inv.get("athlete_name"), "email": email,
        "must_change_password": False, "assigned_plan_id": inv["plan_id"],
    }}


@router.get("/auth/me")
async def athlete_me(ath: dict = Depends(get_current_athlete)):
    return {"id": ath["id"], "name": ath.get("name"), "email": ath.get("portal_email"),
            "must_change_password": bool(ath.get("must_change_password")),
            "assigned_plan_id": ath.get("assigned_plan_id")}


@router.post("/auth/change-password")
async def athlete_change_password(body: ChangePassword, request: Request, ath: dict = Depends(get_current_athlete)):
    db = get_db(request)
    if len(body.new_password) < 6:
        raise HTTPException(400, "La contrasena debe tener al menos 6 caracteres")
    await db.athletes.update_one({"id": ath["id"]}, {"$set": {
        "portal_password": _hash_pw(body.new_password), "must_change_password": False}})
    return {"status": "ok"}


# ====================== ATHLETE (logged-in) ======================
class AthleteCompletePayload(BaseModel):
    completada: bool = True
    rpe: Optional[float] = None
    comentario: Optional[str] = None


class ReadinessPayload(BaseModel):
    sleep: int
    muscle_soreness: int
    stress: int
    motivation: int
    notes: Optional[str] = None


@router.get("/me/plan")
async def athlete_plan(request: Request, ath: dict = Depends(get_current_athlete)):
    db = get_db(request)
    plan_id = ath.get("assigned_plan_id")
    if not plan_id:
        return {"plan": None, "sessions": [], "weeks": 0, "competitions": []}
    payload = await _plan_sessions_payload(db, plan_id, ath["coach_id"])
    today = date.today().isoformat()
    comps = await db.plan_competitions.find({"plan_id": plan_id, "date": {"$gte": today}}, {"_id": 0}).to_list(50)
    comps = [{"name": c.get("name"), "date": c.get("date"), "location": c.get("location"),
              "importance": c.get("importance")} for c in sorted(comps, key=lambda x: x.get("date", ""))]
    return {**payload, "competitions": comps}


@router.post("/me/sessions/{session_id}")
async def athlete_complete_session(session_id: str, body: AthleteCompletePayload, request: Request, ath: dict = Depends(get_current_athlete)):
    db = get_db(request)
    plan_id = ath.get("assigned_plan_id")
    if not plan_id:
        raise HTTPException(400, "No tienes un plan asignado")
    data = await _plan_sessions_payload(db, plan_id, ath["coach_id"])
    valid_ids = {s["id"] for s in data["sessions"]}
    if session_id not in valid_ids:
        raise HTTPException(403, "La sesion no pertenece a tu plan")
    await _update_session_completion(db, valid_ids, session_id, body.completada, body.rpe, body.comentario)
    return {"status": "ok"}


@router.post("/me/readiness")
async def athlete_save_readiness(body: ReadinessPayload, request: Request, ath: dict = Depends(get_current_athlete)):
    db = get_db(request)
    today = date.today().isoformat()
    overall = round((body.sleep + body.motivation + (100 - body.muscle_soreness) + (100 - body.stress)) / 4)
    doc = {
        "athlete_id": ath["id"], "coach_id": ath["coach_id"], "date": today,
        "sleep": body.sleep, "muscle_soreness": body.muscle_soreness,
        "stress": body.stress, "motivation": body.motivation, "overall": overall,
        "notes": body.notes, "created_at": _now(),
    }
    await db.athlete_readiness.update_one(
        {"athlete_id": ath["id"], "date": today}, {"$set": doc}, upsert=True
    )
    return {"status": "ok", "overall": overall}


@router.get("/me/readiness")
async def athlete_get_readiness(request: Request, ath: dict = Depends(get_current_athlete)):
    db = get_db(request)
    docs = await db.athlete_readiness.find({"athlete_id": ath["id"]}, {"_id": 0}).sort("date", -1).to_list(30)
    return {"readiness": docs, "today": docs[0] if docs and docs[0]["date"] == date.today().isoformat() else None}


@router.get("/me/records")
async def athlete_records(request: Request, ath: dict = Depends(get_current_athlete)):
    db = get_db(request)
    plan_id = ath.get("assigned_plan_id")
    records, capabilities = [], []
    if plan_id:
        pa = await db.plan_previous_analysis.find_one({"plan_id": plan_id}, {"_id": 0})
        IND = {"vo2max": ("VO2 Max", "ml/kg"), "sentadilla": ("Sentadilla", "kg"),
               "sprint": ("Sprint", "s"), "cmj": ("CMJ (salto)", "cm"), "flexibilidad": ("Flexibilidad", "cm")}
        for k, v in ((pa or {}).get("data", {}).get("indicadores") or {}).items():
            if isinstance(v, dict) and v.get("final") not in (None, ""):
                records.append({"exercise": IND.get(k, (k, ""))[0], "value": v.get("final"),
                                "unit": IND.get(k, (k, ""))[1], "improvement": v.get("delta")})
        ev = await db.plan_evaluations.find({"plan_id": plan_id, "evaluation_type": "physical"}).sort("created_at", -1).to_list(1)
        if ev:
            res = ev[0].get("results", {})
            label_map = [("Fuerza", ["fuerzaMaxima", "fuerzaExplosiva"]), ("Resistencia", ["resistenciaAerobica", "resistenciaAnaerobica"]),
                         ("Velocidad", ["velocidadMaxima"]), ("Flexibilidad", ["flexibilidad"]),
                         ("Potencia", ["potencia"]), ("Coordinacion", ["coordinacion"])]
            for label, keys in label_map:
                vals = [float(res[k]) for k in keys if res.get(k) not in (None, "")]
                if vals:
                    capabilities.append({"ability": label, "value": round(sum(vals) / len(vals))})
    return {"records": records, "capabilities": capabilities}


async def crear_indices_portal(db):
    try:
        await db.athlete_portal_shares.create_index("share_id", unique=True)
        await db.athlete_portal_shares.create_index([("plan_id", 1), ("coach_id", 1)])
        await db.athlete_invite_codes.create_index("code", unique=True)
        await db.athletes.create_index("portal_email", sparse=True)
        await db.athlete_readiness.create_index([("athlete_id", 1), ("date", 1)], unique=True)
    except Exception:
        pass
