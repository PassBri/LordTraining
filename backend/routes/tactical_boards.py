"""Pizarra Táctica: generación con IA (Emergent LLM) y CRUD.
Extraído de server.py — FASE 1 segmentación. Sin cambios de comportamiento."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import jwt
import os
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Tactical Board"])
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


# =============== TACTICAL BOARD GENERATION ===============
class TacticalBoardGenerateRequest(BaseModel):
    sport: str
    description: str = ""
    formation: str = ""
    num_team_a: int = 5
    num_team_b: int = 0

@router.post("/tactical-board/generate")
async def generate_tactical_board(request: TacticalBoardGenerateRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    import json as json_mod
    import re as re_mod
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="LLM API key not configured")

        chat = LlmChat(
            api_key=api_key,
            session_id=f"tactical-{user['id']}-{str(uuid.uuid4())[:8]}",
            system_message="You are an expert sports tactician and coach. Generate tactical board positions as structured JSON. Always respond with valid JSON only, no markdown."
        ).with_model("openai", "gpt-4o-mini")

        sport_names = {
            "football": "Football/Soccer", "basketball": "Basketball",
            "volleyball": "Volleyball", "handball": "Handball",
            "futsal": "Futsal", "tennis": "Tennis",
            "baseball": "Baseball", "athletics": "Athletics",
            "rugby": "Rugby", "hockey": "Field Hockey"
        }
        sport_label = sport_names.get(request.sport, request.sport.capitalize())

        prompt = f"""Generate a tactical board for {sport_label}.
Session description: {request.description or 'Standard training session'}
Formation/Setup: {request.formation or 'Default formation'}
Number of team A players (marked as X): {request.num_team_a}
Number of team B players (marked as O): {request.num_team_b}

The field coordinate system is 300x420 pixels (portrait orientation).
Valid placement area: x: 20-280, y: 20-400.
Center of field: x=150, y=210.

Return ONLY a valid JSON object with this structure:
{{"elements":[
  {{"id":"p1","type":"playerX","x":150,"y":350,"label":"1"}},
  {{"id":"o1","type":"playerO","x":150,"y":80,"label":"1"}},
  {{"id":"a1","type":"arrow","x":150,"y":350,"x2":150,"y2":200,"label":""}},
  {{"id":"c1","type":"cone","x":100,"y":250,"label":""}},
  {{"id":"b1","type":"ball","x":150,"y":210,"label":""}}
],"description":"Brief tactical description in Spanish"}}

Rules:
- Generate exactly {request.num_team_a} playerX elements (team A) with labels 1 to {request.num_team_a}
- Generate exactly {request.num_team_b} playerO elements (team B) with labels 1 to {request.num_team_b}
- Add 3-5 arrows showing key movements or passing lanes
- Optionally add 1-3 cones or balls for training setups
- Position players in realistic tactical formations for {sport_label}
- Each element needs a unique id (p1, p2, o1, o2, a1, a2, c1, b1, etc.)
- Spread players across the field realistically
- Return ONLY the JSON, no explanations"""

        response = await chat.send_message(UserMessage(text=prompt))

        response_text = response.strip()
        if response_text.startswith('```'):
            response_text = re_mod.sub(r'^```\w*\n?', '', response_text)
            response_text = re_mod.sub(r'\n?```$', '', response_text)

        # Try to extract JSON from response if it has extra text
        json_match = re_mod.search(r'\{[\s\S]*\}', response_text)
        if json_match:
            response_text = json_match.group(0)

        result = json_mod.loads(response_text)

        if "elements" not in result:
            result = {"elements": [], "description": "Error: formato inválido"}

        return result

    except json_mod.JSONDecodeError as e:
        logger.error(f"Failed to parse AI tactical board response: {e}")
        raise HTTPException(status_code=500, detail="Error al interpretar la respuesta de IA")
    except Exception as e:
        logger.error(f"Error generating tactical board: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============== TACTICAL BOARD CRUD ===============
class TacticalBoardSaveRequest(BaseModel):
    name: str = "Sin nombre"
    sport: str
    sportName: str = ""
    category: str = ""
    elements: list = []
    thumbnail: str = ""

@router.post("/tactical-boards")
async def save_tactical_board(request: TacticalBoardSaveRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    doc = {
        "user_id": user["id"],
        "name": request.name,
        "sport": request.sport,
        "sportName": request.sportName,
        "category": request.category,
        "elements": request.elements,
        "thumbnail": request.thumbnail,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.tactical_boards.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Pizarra guardada"}

@router.get("/tactical-boards")
async def list_tactical_boards(user: dict = Depends(get_current_user), db=Depends(get_db)):
    # Add id from _id for boards that need it
    boards_list = []
    cursor = db.tactical_boards.find({"user_id": user["id"]}).sort("updated_at", -1)
    async for doc in cursor:
        boards_list.append({
            "id": str(doc["_id"]),
            "name": doc.get("name", ""),
            "sport": doc.get("sport", ""),
            "sportName": doc.get("sportName", ""),
            "category": doc.get("category", ""),
            "thumbnail": doc.get("thumbnail", ""),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", "")
        })
    return boards_list

@router.get("/tactical-boards/{board_id}")
async def get_tactical_board(board_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    try:
        doc = await db.tactical_boards.find_one({"_id": ObjectId(board_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    if not doc:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "sport": doc.get("sport", ""),
        "sportName": doc.get("sportName", ""),
        "category": doc.get("category", ""),
        "elements": doc.get("elements", []),
        "thumbnail": doc.get("thumbnail", ""),
        "created_at": doc.get("created_at", ""),
        "updated_at": doc.get("updated_at", "")
    }

@router.put("/tactical-boards/{board_id}")
async def update_tactical_board(board_id: str, request: TacticalBoardSaveRequest, user: dict = Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    try:
        result = await db.tactical_boards.update_one(
            {"_id": ObjectId(board_id), "user_id": user["id"]},
            {"$set": {
                "name": request.name,
                "sport": request.sport,
                "sportName": request.sportName,
                "category": request.category,
                "elements": request.elements,
                "thumbnail": request.thumbnail,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    return {"message": "Pizarra actualizada"}

@router.delete("/tactical-boards/{board_id}")
async def delete_tactical_board(board_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    from bson import ObjectId
    try:
        result = await db.tactical_boards.delete_one({"_id": ObjectId(board_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    return {"message": "Pizarra eliminada"}
