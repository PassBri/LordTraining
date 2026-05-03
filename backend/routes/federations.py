"""
Panel de Federaciones / Instituciones — T9
- Coordinación multi-club, multi-coach, multi-athlete
- Soporta los 3 casos de uso simultáneamente:
  * Federación nacional con N clubes hijos
  * Club grande con N escuelas/equipos
  * Selección con coach principal + asistentes (M:N coach↔entity)
- Asignación coach↔entity vía colección `coach_entity_assignments`
- Roles: head_coach (principal) · assistant · technical_director · physio · psychologist
- Vista solo-lectura sobre planes/atletas para "owner" de la entidad raíz
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/federations", tags=["federations"])
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]


def get_current_user_dep():
    from server import get_current_user
    return get_current_user


COACH_ROLES = {
    "head_coach": "Entrenador Principal",
    "assistant": "Asistente Técnico",
    "technical_director": "Director Técnico",
    "physio": "Fisioterapeuta",
    "psychologist": "Psicólogo Deportivo",
    "nutritionist": "Nutricionista",
    "doctor": "Médico Deportivo",
    "analyst": "Analista de Rendimiento",
}


# ============= MODELS =============

class CoachAssignment(BaseModel):
    coach_id: str           # user_id del coach
    coach_name: str
    entity_id: str
    role: str = "head_coach"
    notes: Optional[str] = ""


# ============= HELPERS =============

async def _entity_or_404(entity_id: str, user_id: str) -> dict:
    e = await _db.entities.find_one({"id": entity_id}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Entidad no encontrada")
    # owner check (relaxed: coach owns OR is assigned)
    if e.get("coach_id") != user_id:
        assignment = await _db.coach_entity_assignments.find_one({
            "entity_id": entity_id, "coach_id": user_id
        })
        if not assignment:
            raise HTTPException(403, "Sin acceso a esta entidad")
    return e


async def _descendant_ids(root_id: str) -> List[str]:
    """BFS por parent_entity_id devolviendo todos los IDs (incluyendo el root)."""
    out = [root_id]
    queue = [root_id]
    while queue:
        current = queue.pop(0)
        kids = await _db.entities.find({"parent_entity_id": current}, {"id": 1, "_id": 0}).to_list(500)
        for k in kids:
            if k["id"] not in out:
                out.append(k["id"])
                queue.append(k["id"])
    return out


# ============= LIST FEDERATIONS / ROOT ENTITIES =============

@router.get("/list")
async def list_my_federations(user=Depends(get_current_user_dep())):
    """Lista todas las entidades RAÍZ (sin parent) del usuario o donde tenga asignación."""
    uid = user.get("id") or user.get("user_id")
    # Ownership
    own = await _db.entities.find(
        {"coach_id": uid, "parent_entity_id": {"$in": [None, ""]}},
        {"_id": 0}
    ).to_list(500)
    # Assigned (no-owner) — entities donde el coach está asignado
    assigned_ids = await _db.coach_entity_assignments.distinct("entity_id", {"coach_id": uid})
    assigned = await _db.entities.find(
        {"id": {"$in": assigned_ids}, "coach_id": {"$ne": uid}},
        {"_id": 0}
    ).to_list(500) if assigned_ids else []

    # Enrich with quick stats
    out = []
    for e in own + assigned:
        ids = await _descendant_ids(e["id"])
        clubs = await _db.entities.count_documents({"id": {"$in": ids}, "entity_type": "club"})
        athletes = await _db.athletes.count_documents({"affiliations": {"$in": ids}})
        coaches = len(await _db.coach_entity_assignments.distinct("coach_id", {"entity_id": {"$in": ids}}))
        out.append({**e, "_role": "owner" if e.get("coach_id") == uid else "assigned",
                    "_descendant_count": len(ids) - 1,
                    "_clubs_count": clubs, "_athletes_count": athletes, "_coaches_count": coaches})
    return {"items": out, "total": len(out)}


# ============= TREE =============

@router.get("/tree/{entity_id}")
async def get_tree(entity_id: str, user=Depends(get_current_user_dep())):
    """Árbol jerárquico Federación → Clubes → Escuelas/Equipos → Atletas."""
    uid = user.get("id") or user.get("user_id")
    root = await _entity_or_404(entity_id, uid)

    async def build_node(eid: str) -> dict:
        ent = await _db.entities.find_one({"id": eid}, {"_id": 0}) or {}
        kids = await _db.entities.find({"parent_entity_id": eid}, {"_id": 0}).to_list(200)
        children = [await build_node(k["id"]) for k in kids]
        athletes = await _db.athletes.find(
            {"affiliations": eid},
            {"_id": 0, "id": 1, "name": 1, "sport": 1, "age": 1}
        ).to_list(500)
        # Coaches assigned to this entity
        assigns = await _db.coach_entity_assignments.find(
            {"entity_id": eid}, {"_id": 0}
        ).to_list(50)
        return {
            "id": ent.get("id"),
            "name": ent.get("name"),
            "entity_type": ent.get("entity_type"),
            "logo_url": ent.get("logo_url"),
            "city": ent.get("city"),
            "country": ent.get("country"),
            "children": children,
            "athletes": athletes,
            "athletes_count": len(athletes),
            "coaches": assigns,
        }

    return await build_node(root["id"])


# ============= STATS / DASHBOARD =============

@router.get("/stats/{entity_id}")
async def get_federation_stats(entity_id: str, user=Depends(get_current_user_dep())):
    """KPIs agregados de toda la jerarquía debajo de la entidad raíz."""
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(entity_id, uid)
    ids = await _descendant_ids(entity_id)

    # Totals
    n_clubs = await _db.entities.count_documents({"id": {"$in": ids}, "entity_type": "club"})
    n_schools = await _db.entities.count_documents({"id": {"$in": ids}, "entity_type": "school"})
    n_teams = await _db.entities.count_documents({"id": {"$in": ids}, "entity_type": "team"})
    n_national = await _db.entities.count_documents({"id": {"$in": ids}, "entity_type": "national_team"})
    n_leagues = await _db.entities.count_documents({"id": {"$in": ids}, "entity_type": "league"})
    n_athletes = await _db.athletes.count_documents({"affiliations": {"$in": ids}})
    coach_ids = await _db.coach_entity_assignments.distinct("coach_id", {"entity_id": {"$in": ids}})
    n_coaches = len(coach_ids)

    # Active plans (linked to athletes in the tree)
    athlete_ids = await _db.athletes.distinct("id", {"affiliations": {"$in": ids}})
    n_active_plans = await _db.training_plans.count_documents({
        "athlete_id": {"$in": athlete_ids}, "active": True
    }) if athlete_ids else 0
    n_total_plans = await _db.training_plans.count_documents({
        "athlete_id": {"$in": athlete_ids}
    }) if athlete_ids else 0

    # Upcoming competitions (next 90 days)
    now = datetime.now(timezone.utc)
    upcoming = await _db.tournaments.count_documents({
        "$or": [
            {"federation_id": {"$in": ids}},
            {"organizing_entity_id": {"$in": ids}},
        ]
    })

    # Evaluations last 30 days
    n_evals_30d = 0
    try:
        cur = _db.plan_evaluations_v2.find({
            "athlete_id": {"$in": athlete_ids}
        }, {"_id": 0, "date": 1}).limit(2000)
        evs = await cur.to_list(2000)
        from datetime import timedelta
        cutoff = (now - timedelta(days=30)).isoformat()[:10]
        n_evals_30d = sum(1 for e in evs if (e.get("date") or "") >= cutoff)
    except Exception:
        pass

    return {
        "entity_id": entity_id,
        "tree_size": len(ids),
        "clubs": n_clubs, "schools": n_schools, "teams": n_teams,
        "national_teams": n_national, "leagues": n_leagues,
        "athletes": n_athletes,
        "coaches": n_coaches,
        "plans_active": n_active_plans,
        "plans_total": n_total_plans,
        "competitions_linked": upcoming,
        "evaluations_30d": n_evals_30d,
    }


# ============= ATHLETES (FLAT VIEW) =============

@router.get("/athletes/{entity_id}")
async def list_federation_athletes(
    entity_id: str,
    sport: Optional[str] = None,
    sub_entity: Optional[str] = None,
    limit: int = 200,
    user=Depends(get_current_user_dep()),
):
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(entity_id, uid)
    ids = [sub_entity] if sub_entity else await _descendant_ids(entity_id)

    q: Dict[str, Any] = {"affiliations": {"$in": ids}}
    if sport:
        q["sport"] = sport
    cur = _db.athletes.find(q, {"_id": 0}).limit(limit)
    items = await cur.to_list(limit)

    # Enrich each with affiliated entity names
    ent_map = {e["id"]: e for e in await _db.entities.find(
        {"id": {"$in": ids}}, {"_id": 0, "id": 1, "name": 1, "entity_type": 1}
    ).to_list(2000)}
    for a in items:
        a["entities"] = [ent_map.get(x) for x in (a.get("affiliations") or []) if x in ent_map]
    return {"items": items, "total": len(items)}


# ============= COACHES =============

@router.get("/coaches/{entity_id}")
async def list_federation_coaches(entity_id: str, user=Depends(get_current_user_dep())):
    """Coaches asignados a la federación o a cualquier entidad descendiente."""
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(entity_id, uid)
    ids = await _descendant_ids(entity_id)
    assigns = await _db.coach_entity_assignments.find(
        {"entity_id": {"$in": ids}}, {"_id": 0}
    ).to_list(1000)

    # Group by coach
    by_coach: Dict[str, dict] = {}
    ent_map = {e["id"]: e for e in await _db.entities.find(
        {"id": {"$in": ids}}, {"_id": 0, "id": 1, "name": 1, "entity_type": 1}
    ).to_list(2000)}
    for a in assigns:
        cid = a["coach_id"]
        if cid not in by_coach:
            by_coach[cid] = {
                "coach_id": cid,
                "coach_name": a.get("coach_name") or "—",
                "assignments": [],
            }
        by_coach[cid]["assignments"].append({
            "id": a.get("id"),
            "entity_id": a["entity_id"],
            "entity_name": (ent_map.get(a["entity_id"]) or {}).get("name") or "—",
            "entity_type": (ent_map.get(a["entity_id"]) or {}).get("entity_type") or "—",
            "role": a.get("role", "head_coach"),
            "role_label": COACH_ROLES.get(a.get("role", "head_coach"), a.get("role")),
            "notes": a.get("notes") or "",
        })
    return {"items": list(by_coach.values()), "total": len(by_coach), "roles": COACH_ROLES}


@router.post("/assign-coach")
async def assign_coach(payload: CoachAssignment, user=Depends(get_current_user_dep())):
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(payload.entity_id, uid)
    if payload.role not in COACH_ROLES:
        raise HTTPException(400, f"Rol inválido. Permitidos: {list(COACH_ROLES.keys())}")
    doc = {
        "id": str(uuid.uuid4()),
        "coach_id": payload.coach_id,
        "coach_name": payload.coach_name,
        "entity_id": payload.entity_id,
        "role": payload.role,
        "notes": payload.notes or "",
        "created_by": uid,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.coach_entity_assignments.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/assign-coach/{assignment_id}")
async def remove_coach_assignment(assignment_id: str, user=Depends(get_current_user_dep())):
    uid = user.get("id") or user.get("user_id")
    a = await _db.coach_entity_assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not a:
        raise HTTPException(404, "Asignación no encontrada")
    await _entity_or_404(a["entity_id"], uid)
    await _db.coach_entity_assignments.delete_one({"id": assignment_id})
    return {"deleted": True, "id": assignment_id}


# ============= PLANS (READ-ONLY ROLLUP) =============

@router.get("/plans/{entity_id}")
async def list_federation_plans(
    entity_id: str, only_active: bool = False, limit: int = 100,
    user=Depends(get_current_user_dep()),
):
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(entity_id, uid)
    ids = await _descendant_ids(entity_id)
    athlete_ids = await _db.athletes.distinct("id", {"affiliations": {"$in": ids}})
    if not athlete_ids:
        return {"items": [], "total": 0}

    q: Dict[str, Any] = {"athlete_id": {"$in": athlete_ids}}
    if only_active:
        q["active"] = True
    cur = _db.training_plans.find(q, {
        "_id": 0, "id": 1, "name": 1, "athlete_id": 1, "model": 1,
        "model_name": 1, "sport": 1, "active": 1, "total_weeks": 1, "start_date": 1
    }).sort("created_at", -1).limit(limit)
    items = await cur.to_list(limit)

    # Enrich with athlete name
    ath_map = {a["id"]: a for a in await _db.athletes.find(
        {"id": {"$in": athlete_ids}}, {"_id": 0, "id": 1, "name": 1, "sport": 1}
    ).to_list(2000)}
    for p in items:
        a = ath_map.get(p.get("athlete_id")) or {}
        p["athlete_name"] = a.get("name") or "—"
    return {"items": items, "total": len(items)}


# ============= COMPETITIONS =============

@router.get("/competitions/{entity_id}")
async def list_federation_competitions(entity_id: str, user=Depends(get_current_user_dep())):
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(entity_id, uid)
    ids = await _descendant_ids(entity_id)
    cur = _db.tournaments.find({
        "$or": [
            {"federation_id": {"$in": ids}},
            {"organizing_entity_id": {"$in": ids}},
        ]
    }, {"_id": 0}).sort("start_date", 1).limit(200)
    items = await cur.to_list(200)
    return {"items": items, "total": len(items)}


# ============= COMPLIANCE COMPARISON (per club) =============

@router.get("/compliance/{entity_id}")
async def compliance_per_club(entity_id: str, user=Depends(get_current_user_dep())):
    """Compara % global de cumplimiento entre los clubes hijos directos."""
    uid = user.get("id") or user.get("user_id")
    await _entity_or_404(entity_id, uid)
    direct_kids = await _db.entities.find(
        {"parent_entity_id": entity_id}, {"_id": 0, "id": 1, "name": 1, "entity_type": 1}
    ).to_list(200)

    out = []
    for k in direct_kids:
        sub_ids = await _descendant_ids(k["id"])
        ath_ids = await _db.athletes.distinct("id", {"affiliations": {"$in": sub_ids}})
        if not ath_ids:
            out.append({"id": k["id"], "name": k["name"], "type": k["entity_type"],
                        "athletes": 0, "evaluations": 0, "avg_pct": 0})
            continue
        # avg eval pct
        evs = await _db.plan_evaluations_v2.find(
            {"athlete_id": {"$in": ath_ids}}, {"_id": 0, "aspects": 1}
        ).to_list(2000)
        total_pct = 0; n = 0
        for e in evs:
            asp = e.get("aspects") or []
            vals = []
            for a in asp:
                try:
                    v = float(a.get("value") or 0)
                    t = float(a.get("target") or 0)
                    if t > 0:
                        vals.append(min(v / t, 1.5) * 100)
                except Exception:
                    pass
            if vals:
                total_pct += sum(vals) / len(vals); n += 1
        avg = round(total_pct / n, 1) if n else 0
        out.append({"id": k["id"], "name": k["name"], "type": k["entity_type"],
                    "athletes": len(ath_ids), "evaluations": len(evs), "avg_pct": avg})
    return {"items": out, "total": len(out)}
