"""Rutas de Torneos: CRUD, categorías, inscripción, brackets, partidos,
standings, vista pública y export PDF. Extraído de server.py — FASE 1 segmentación."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime, timezone
from io import BytesIO
import uuid
import jwt
import os

from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

from core.models import (
    TournamentCreate, TournamentResponse, TournamentCategoryCreate,
    MatchScoreUpdate, ParticipantRegistration, TournamentStatus, MatchStatus,
)

router = APIRouter(prefix="/api", tags=["Tournaments"])
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"


def get_db(request: Request):
    return request.app.state.db


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db=Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============== TOURNAMENTS ROUTES ===============

def generate_single_elimination_bracket(participants: List[dict], category_id: str) -> List[dict]:
    """Genera bracket de eliminación directa"""
    n = len(participants)
    if n < 2:
        return []
    
    # Redondear al siguiente poder de 2
    import math
    rounds_needed = math.ceil(math.log2(n))
    total_slots = 2 ** rounds_needed
    
    matches = []
    match_id = 1
    
    # Primera ronda
    round_matches = total_slots // 2
    for i in range(round_matches):
        p1_idx = i * 2
        p2_idx = i * 2 + 1
        
        p1 = participants[p1_idx] if p1_idx < n else None
        p2 = participants[p2_idx] if p2_idx < n else None
        
        match = {
            "id": f"{category_id}_r1_m{match_id}",
            "round_number": 1,
            "round_name": "Primera Ronda" if rounds_needed > 2 else ("Semifinal" if rounds_needed == 2 else "Final"),
            "match_number": match_id,
            "bracket_position": i,
            "participant1_id": p1["id"] if p1 else None,
            "participant1_name": p1["name"] if p1 else "BYE",
            "participant2_id": p2["id"] if p2 else None,
            "participant2_name": p2["name"] if p2 else "BYE",
            "status": "scheduled",
            "winner_goes_to": f"{category_id}_r2_m{(i // 2) + 1}" if rounds_needed > 1 else None
        }
        
        # Auto-avance si hay BYE
        if p1 and not p2:
            match["winner_id"] = p1["id"]
            match["winner_name"] = p1["name"]
            match["status"] = "completed"
        elif p2 and not p1:
            match["winner_id"] = p2["id"]
            match["winner_name"] = p2["name"]
            match["status"] = "completed"
        
        matches.append(match)
        match_id += 1
    
    # Rondas siguientes
    for r in range(2, rounds_needed + 1):
        round_matches = total_slots // (2 ** r)
        round_names = {
            1: "Final",
            2: "Semifinales",
            4: "Cuartos de Final",
            8: "Octavos de Final",
            16: "Dieciseisavos"
        }
        round_name = round_names.get(round_matches, f"Ronda {r}")
        
        for i in range(round_matches):
            match = {
                "id": f"{category_id}_r{r}_m{i + 1}",
                "round_number": r,
                "round_name": round_name,
                "match_number": i + 1,
                "bracket_position": i,
                "participant1_id": None,
                "participant1_name": "TBD",
                "participant2_id": None,
                "participant2_name": "TBD",
                "status": "scheduled",
                "winner_goes_to": f"{category_id}_r{r+1}_m{(i // 2) + 1}" if r < rounds_needed else None
            }
            matches.append(match)
    
    return matches

def generate_double_elimination_bracket(participants: List[dict], category_id: str) -> dict:
    """Genera bracket de doble eliminación (winners + losers)"""
    winners_bracket = generate_single_elimination_bracket(participants, f"{category_id}_W")
    
    # El losers bracket tiene estructura especial
    losers_matches = []
    # Simplificado - en producción sería más complejo
    
    return {
        "winners_bracket": winners_bracket,
        "losers_bracket": losers_matches,
        "grand_final": {
            "id": f"{category_id}_GF",
            "round_name": "Gran Final",
            "status": "scheduled"
        }
    }

def generate_round_robin_matches(participants: List[dict], category_id: str) -> List[dict]:
    """Genera todos los partidos de todos contra todos"""
    matches = []
    n = len(participants)
    match_num = 1
    
    for i in range(n):
        for j in range(i + 1, n):
            match = {
                "id": f"{category_id}_rr_m{match_num}",
                "round_number": 1,
                "round_name": "Fase de Grupos",
                "match_number": match_num,
                "participant1_id": participants[i]["id"],
                "participant1_name": participants[i]["name"],
                "participant2_id": participants[j]["id"],
                "participant2_name": participants[j]["name"],
                "status": "scheduled"
            }
            matches.append(match)
            match_num += 1
    
    return matches

def generate_group_stage_matches(participants: List[dict], category_id: str, groups_count: int, teams_per_group: int) -> dict:
    """Genera fase de grupos + eliminación"""
    import random
    
    # Distribuir en grupos
    shuffled = participants.copy()
    random.shuffle(shuffled)
    
    groups = {}
    group_letters = "ABCDEFGH"
    
    for g in range(min(groups_count, len(group_letters))):
        start_idx = g * teams_per_group
        end_idx = start_idx + teams_per_group
        group_participants = shuffled[start_idx:end_idx]
        
        groups[group_letters[g]] = {
            "participants": group_participants,
            "matches": generate_round_robin_matches(group_participants, f"{category_id}_G{group_letters[g]}"),
            "standings": [{"id": p["id"], "name": p["name"], "played": 0, "won": 0, "drawn": 0, "lost": 0, "gf": 0, "ga": 0, "gd": 0, "points": 0} for p in group_participants]
        }
    
    return {
        "groups": groups,
        "knockout_bracket": []  # Se genera cuando terminan los grupos
    }

@router.post("/tournaments", response_model=TournamentResponse)
async def create_tournament(tournament: TournamentCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Crear un nuevo torneo/evento"""
    tournament_id = str(uuid.uuid4())
    share_id = str(uuid.uuid4())[:12]
    
    # Crear categorías
    categories = []
    for cat in tournament.categories:
        cat_id = str(uuid.uuid4())
        cat_doc = {
            "id": cat_id,
            "tournament_id": tournament_id,
            **cat.model_dump(),
            "participants": [],
            "bracket": None,
            "standings": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        categories.append(cat_doc)
    
    doc = {
        "id": tournament_id,
        "coach_id": user["id"],
        **tournament.model_dump(exclude={"categories"}),
        "format": tournament.format.value,
        "status": tournament.status.value,
        "scoring_system": tournament.scoring_system.value,
        "categories": categories,
        "share_id": share_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tournaments.insert_one(doc)
    doc.pop("_id", None)
    return TournamentResponse(**doc)

@router.get("/tournaments", response_model=List[TournamentResponse])
async def get_tournaments(status: Optional[TournamentStatus] = None, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener todos los torneos del usuario"""
    query = {"coach_id": user["id"]}
    if status:
        query["status"] = status.value
    tournaments = await db.tournaments.find(query, {"_id": 0}).to_list(1000)
    return [TournamentResponse(**t) for t in tournaments]

@router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(tournament_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener un torneo específico"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return TournamentResponse(**tournament)

@router.put("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(tournament_id: str, tournament: TournamentCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Actualizar un torneo"""
    update_data = tournament.model_dump(exclude={"categories"})
    update_data["format"] = tournament.format.value
    update_data["status"] = tournament.status.value
    update_data["scoring_system"] = tournament.scoring_system.value
    
    result = await db.tournaments.update_one(
        {"id": tournament_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    updated = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    return TournamentResponse(**updated)

@router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Eliminar un torneo"""
    # También eliminar partidos asociados
    await db.matches.delete_many({"tournament_id": tournament_id})
    
    result = await db.tournaments.delete_one({"id": tournament_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted"}

@router.post("/tournaments/{tournament_id}/categories")
async def add_tournament_category(tournament_id: str, category: TournamentCategoryCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Añadir categoría a un torneo"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    cat_id = str(uuid.uuid4())
    cat_doc = {
        "id": cat_id,
        "tournament_id": tournament_id,
        **category.model_dump(),
        "participants": [],
        "bracket": None,
        "standings": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$push": {"categories": cat_doc}}
    )
    
    return cat_doc

@router.delete("/tournaments/{tournament_id}/categories/{category_id}")
async def delete_tournament_category(tournament_id: str, category_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Eliminar categoría de un torneo"""
    result = await db.tournaments.update_one(
        {"id": tournament_id, "coach_id": user["id"]},
        {"$pull": {"categories": {"id": category_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Eliminar partidos de la categoría
    await db.matches.delete_many({"category_id": category_id})
    
    return {"message": "Category deleted"}

@router.post("/tournaments/{tournament_id}/categories/{category_id}/register")
async def register_participant(
    tournament_id: str, 
    category_id: str, 
    registration: ParticipantRegistration,
    user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Inscribir participante en una categoría"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Encontrar la categoría
    category = None
    for cat in tournament.get("categories", []):
        if cat["id"] == category_id:
            category = cat
            break
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Verificar si ya está inscrito
    for p in category.get("participants", []):
        if p.get("id") == registration.participant_id:
            raise HTTPException(status_code=400, detail="Participant already registered")
    
    # Verificar límite
    if category.get("max_participants") and len(category.get("participants", [])) >= category["max_participants"]:
        raise HTTPException(status_code=400, detail="Category is full")
    
    participant = {
        "id": registration.participant_id,
        "name": registration.participant_name,
        "type": registration.participant_type,
        "seed": registration.seed,
        "registered_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tournaments.update_one(
        {"id": tournament_id, "categories.id": category_id},
        {"$push": {"categories.$.participants": participant}}
    )
    
    return {"message": "Participant registered", "participant": participant}

@router.delete("/tournaments/{tournament_id}/categories/{category_id}/participants/{participant_id}")
async def remove_participant(
    tournament_id: str,
    category_id: str,
    participant_id: str,
    user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Remover participante de una categoría"""
    result = await db.tournaments.update_one(
        {"id": tournament_id, "coach_id": user["id"], "categories.id": category_id},
        {"$pull": {"categories.$.participants": {"id": participant_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament or category not found")
    return {"message": "Participant removed"}

@router.post("/tournaments/{tournament_id}/categories/{category_id}/generate-bracket")
async def generate_bracket(tournament_id: str, category_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Generar bracket/fixture para una categoría"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Encontrar categoría
    category = None
    cat_index = -1
    for i, cat in enumerate(tournament.get("categories", [])):
        if cat["id"] == category_id:
            category = cat
            cat_index = i
            break
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    participants = category.get("participants", [])
    if len(participants) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 participants")
    
    # Ordenar por seed si tienen
    participants.sort(key=lambda x: (x.get("seed") or 999, x.get("registered_at", "")))
    
    # Generar bracket según formato
    format_type = tournament.get("format", "single_elimination")
    
    if format_type == "single_elimination":
        bracket = generate_single_elimination_bracket(participants, category_id)
    elif format_type == "double_elimination":
        bracket = generate_double_elimination_bracket(participants, category_id)
    elif format_type == "round_robin":
        bracket = generate_round_robin_matches(participants, category_id)
    elif format_type == "group_stage_knockout":
        groups_count = tournament.get("groups_count", 4)
        teams_per_group = tournament.get("teams_per_group", 4)
        bracket = generate_group_stage_matches(participants, category_id, groups_count, teams_per_group)
    elif format_type == "league":
        bracket = generate_round_robin_matches(participants, category_id)
    else:
        bracket = generate_single_elimination_bracket(participants, category_id)
    
    # Guardar bracket en la categoría
    await db.tournaments.update_one(
        {"id": tournament_id, f"categories.{cat_index}.id": category_id},
        {"$set": {f"categories.{cat_index}.bracket": bracket}}
    )
    
    # También guardar partidos individuales en colección matches
    if isinstance(bracket, list):
        matches_to_insert = []
        for match in bracket:
            match_doc = {
                **match,
                "tournament_id": tournament_id,
                "category_id": category_id,
                "participant1_score": None,
                "participant2_score": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            matches_to_insert.append(match_doc)
        if matches_to_insert:
            await db.matches.insert_many(matches_to_insert)
    elif isinstance(bracket, dict) and "groups" in bracket:
        # Fase de grupos
        for group_key, group_data in bracket.get("groups", {}).items():
            for match in group_data.get("matches", []):
                match_doc = {
                    **match,
                    "tournament_id": tournament_id,
                    "category_id": category_id,
                    "group": group_key,
                    "participant1_score": None,
                    "participant2_score": None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.matches.insert_one(match_doc)
    
    # Actualizar estado del torneo
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$set": {"status": "in_progress"}}
    )
    
    return {"message": "Bracket generated", "bracket": bracket}

@router.get("/tournaments/{tournament_id}/matches")
async def get_tournament_matches(
    tournament_id: str,
    category_id: Optional[str] = None,
    round_number: Optional[int] = None,
    status: Optional[MatchStatus] = None,
    user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Obtener partidos de un torneo"""
    query = {"tournament_id": tournament_id}
    if category_id:
        query["category_id"] = category_id
    if round_number:
        query["round_number"] = round_number
    if status:
        query["status"] = status.value
    
    matches = await db.matches.find(query, {"_id": 0}).to_list(1000)
    return matches

@router.put("/tournaments/{tournament_id}/matches/{match_id}/score")
async def update_match_score(
    tournament_id: str,
    match_id: str,
    score: MatchScoreUpdate,
    user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Actualizar resultado de un partido"""
    # Verificar que el usuario es dueño del torneo
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    update_data = {}
    if score.participant1_score is not None:
        update_data["participant1_score"] = score.participant1_score
    if score.participant2_score is not None:
        update_data["participant2_score"] = score.participant2_score
    if score.participant1_sets:
        update_data["participant1_sets"] = score.participant1_sets
    if score.participant2_sets:
        update_data["participant2_sets"] = score.participant2_sets
    if score.status:
        update_data["status"] = score.status.value
    if score.notes:
        update_data["notes"] = score.notes
    
    # Determinar ganador automáticamente si hay scores
    if score.participant1_score is not None and score.participant2_score is not None:
        match = await db.matches.find_one({"id": match_id, "tournament_id": tournament_id})
        if match:
            if score.participant1_score > score.participant2_score:
                update_data["winner_id"] = match.get("participant1_id")
                update_data["winner_name"] = match.get("participant1_name")
            elif score.participant2_score > score.participant1_score:
                update_data["winner_id"] = match.get("participant2_id")
                update_data["winner_name"] = match.get("participant2_name")
            
            if score.status is None and (score.participant1_score != score.participant2_score):
                update_data["status"] = "completed"
    
    if score.winner_id:
        update_data["winner_id"] = score.winner_id
        # Buscar nombre del ganador
        match = await db.matches.find_one({"id": match_id})
        if match:
            if score.winner_id == match.get("participant1_id"):
                update_data["winner_name"] = match.get("participant1_name")
            else:
                update_data["winner_name"] = match.get("participant2_name")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.matches.update_one(
        {"id": match_id, "tournament_id": tournament_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Si el partido terminó, actualizar el siguiente partido en el bracket
    updated_match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if updated_match and updated_match.get("status") == "completed" and updated_match.get("winner_goes_to"):
        next_match_id = updated_match["winner_goes_to"]
        winner_id = updated_match.get("winner_id")
        winner_name = updated_match.get("winner_name")
        
        # Determinar si va a participant1 o participant2 del siguiente partido
        next_match = await db.matches.find_one({"id": next_match_id})
        if next_match:
            # Basado en la posición del bracket
            bracket_pos = updated_match.get("bracket_position", 0)
            if bracket_pos % 2 == 0:
                await db.matches.update_one(
                    {"id": next_match_id},
                    {"$set": {"participant1_id": winner_id, "participant1_name": winner_name}}
                )
            else:
                await db.matches.update_one(
                    {"id": next_match_id},
                    {"$set": {"participant2_id": winner_id, "participant2_name": winner_name}}
                )
    
    # Actualizar standings si es round robin o liga
    if tournament.get("format") in ["round_robin", "league", "group_stage_knockout"]:
        await update_standings(db, tournament_id, updated_match.get("category_id"), tournament)
    
    return {"message": "Score updated", "match": updated_match}

async def update_standings(db, tournament_id: str, category_id: str, tournament: dict):
    """Actualizar tabla de posiciones"""
    # Obtener todos los partidos completados de la categoría
    matches = await db.matches.find({
        "tournament_id": tournament_id,
        "category_id": category_id,
        "status": "completed"
    }, {"_id": 0}).to_list(1000)
    
    standings = {}
    points_win = tournament.get("points_win", 3)
    points_draw = tournament.get("points_draw", 1)
    points_loss = tournament.get("points_loss", 0)
    
    for match in matches:
        p1_id = match.get("participant1_id")
        p2_id = match.get("participant2_id")
        p1_name = match.get("participant1_name")
        p2_name = match.get("participant2_name")
        p1_score = match.get("participant1_score", 0) or 0
        p2_score = match.get("participant2_score", 0) or 0
        
        # Inicializar si no existe
        for pid, pname in [(p1_id, p1_name), (p2_id, p2_name)]:
            if pid and pid not in standings:
                standings[pid] = {
                    "id": pid,
                    "name": pname,
                    "played": 0,
                    "won": 0,
                    "drawn": 0,
                    "lost": 0,
                    "goals_for": 0,
                    "goals_against": 0,
                    "goal_difference": 0,
                    "points": 0
                }
        
        if p1_id and p2_id:
            standings[p1_id]["played"] += 1
            standings[p2_id]["played"] += 1
            standings[p1_id]["goals_for"] += p1_score
            standings[p1_id]["goals_against"] += p2_score
            standings[p2_id]["goals_for"] += p2_score
            standings[p2_id]["goals_against"] += p1_score
            
            if p1_score > p2_score:
                standings[p1_id]["won"] += 1
                standings[p1_id]["points"] += points_win
                standings[p2_id]["lost"] += 1
                standings[p2_id]["points"] += points_loss
            elif p2_score > p1_score:
                standings[p2_id]["won"] += 1
                standings[p2_id]["points"] += points_win
                standings[p1_id]["lost"] += 1
                standings[p1_id]["points"] += points_loss
            else:
                standings[p1_id]["drawn"] += 1
                standings[p2_id]["drawn"] += 1
                standings[p1_id]["points"] += points_draw
                standings[p2_id]["points"] += points_draw
            
            standings[p1_id]["goal_difference"] = standings[p1_id]["goals_for"] - standings[p1_id]["goals_against"]
            standings[p2_id]["goal_difference"] = standings[p2_id]["goals_for"] - standings[p2_id]["goals_against"]
    
    # Ordenar por puntos, diferencia de goles, goles a favor
    sorted_standings = sorted(
        standings.values(),
        key=lambda x: (-x["points"], -x["goal_difference"], -x["goals_for"])
    )
    
    # Actualizar standings en la categoría
    tournament_data = await db.tournaments.find_one({"id": tournament_id})
    if tournament_data:
        for i, cat in enumerate(tournament_data.get("categories", [])):
            if cat["id"] == category_id:
                await db.tournaments.update_one(
                    {"id": tournament_id},
                    {"$set": {f"categories.{i}.standings": sorted_standings}}
                )
                break
    
    return sorted_standings

@router.get("/tournaments/{tournament_id}/standings/{category_id}")
async def get_category_standings(tournament_id: str, category_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Obtener tabla de posiciones de una categoría"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    for cat in tournament.get("categories", []):
        if cat["id"] == category_id:
            return cat.get("standings", [])
    
    raise HTTPException(status_code=404, detail="Category not found")

# =============== TOURNAMENT PUBLIC VIEW ===============
@router.get("/tournaments/public/{share_id}")
async def get_public_tournament(share_id: str, db=Depends(get_db)):
    """Vista pública de un torneo (sin autenticación)"""
    tournament = await db.tournaments.find_one({"share_id": share_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Obtener partidos
    matches = await db.matches.find({"tournament_id": tournament["id"]}, {"_id": 0}).to_list(1000)
    
    return {
        "tournament": tournament,
        "matches": matches
    }

# =============== TOURNAMENT PDF EXPORT ===============
@router.get("/tournaments/{tournament_id}/export-pdf")
async def export_tournament_pdf(tournament_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Exportar torneo a PDF"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    matches = await db.matches.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(1000)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    primary_color = HexColor(tournament.get("primary_color", "#3B82F6"))
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'TournamentTitle',
        parent=styles['Title'],
        fontSize=28,
        textColor=primary_color,
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'TournamentHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=primary_color,
        spaceAfter=12,
        spaceBefore=20
    )
    
    # Título
    story.append(Paragraph(tournament.get("name", "Torneo"), title_style))
    story.append(Paragraph(f"Deporte: {tournament.get('sport', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"Formato: {tournament.get('format', 'N/A').replace('_', ' ').title()}", styles['Normal']))
    story.append(Paragraph(f"Fechas: {tournament.get('start_date', '')} - {tournament.get('end_date', '')}", styles['Normal']))
    if tournament.get("venue"):
        story.append(Paragraph(f"Sede: {tournament.get('venue')}, {tournament.get('city', '')}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Categorías y brackets
    for category in tournament.get("categories", []):
        story.append(Paragraph(f"Categoría: {category.get('name', 'N/A')}", heading_style))
        
        # Participantes
        participants = category.get("participants", [])
        if participants:
            story.append(Paragraph(f"Participantes: {len(participants)}", styles['Normal']))
            
            participant_data = [["#", "Nombre", "Seed"]]
            for i, p in enumerate(participants, 1):
                participant_data.append([str(i), p.get("name", "N/A"), str(p.get("seed", "-"))])
            
            p_table = Table(participant_data, colWidths=[0.5*inch, 3*inch, 1*inch])
            p_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))
            story.append(p_table)
            story.append(Spacer(1, 15))
        
        # Standings si existen
        standings = category.get("standings", [])
        if standings:
            story.append(Paragraph("Tabla de Posiciones", styles['Heading3']))
            
            standings_data = [["Pos", "Equipo", "PJ", "G", "E", "P", "GF", "GC", "DG", "Pts"]]
            for i, s in enumerate(standings, 1):
                standings_data.append([
                    str(i),
                    (s.get("name") or "N/A")[:20],
                    str(s.get("played", 0)),
                    str(s.get("won", 0)),
                    str(s.get("drawn", 0)),
                    str(s.get("lost", 0)),
                    str(s.get("goals_for", 0)),
                    str(s.get("goals_against", 0)),
                    str(s.get("goal_difference", 0)),
                    str(s.get("points", 0))
                ])
            
            s_table = Table(standings_data, colWidths=[0.4*inch, 1.5*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.4*inch, 0.5*inch])
            s_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor("#10B981")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))
            story.append(s_table)
            story.append(Spacer(1, 15))
        
        # Partidos
        cat_matches = [m for m in matches if m.get("category_id") == category["id"]]
        if cat_matches:
            story.append(Paragraph("Partidos", styles['Heading3']))
            
            match_data = [["Ronda", "Local", "Marcador", "Visitante", "Estado"]]
            for m in sorted(cat_matches, key=lambda x: (x.get("round_number", 0), x.get("match_number", 0))):
                p1_score = m.get("participant1_score")
                p2_score = m.get("participant2_score")
                score_str = f"{p1_score if p1_score is not None else '-'} - {p2_score if p2_score is not None else '-'}"
                
                match_data.append([
                    m.get("round_name", f"R{m.get('round_number', '?')}"),
                    (m.get("participant1_name") or "TBD")[:15],
                    score_str,
                    (m.get("participant2_name") or "TBD")[:15],
                    m.get("status", "scheduled").replace("_", " ").title()
                ])
            
            m_table = Table(match_data, colWidths=[1.2*inch, 1.3*inch, 0.8*inch, 1.3*inch, 1*inch])
            m_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
                ('GRID', (0, 0), (-1, -1), 1, colors.lightgrey),
            ]))
            story.append(m_table)
        
        story.append(Spacer(1, 30))
    
    # Footer
    story.append(Spacer(1, 20))
    story.append(Paragraph(f"Generado por LordTraining - {datetime.now().strftime('%d/%m/%Y %H:%M')}", 
                          ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"torneo_{tournament.get('name', 'export').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
