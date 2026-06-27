"""Catálogo de deportes del usuario (categorías + deportes + caracterización) y
seed por defecto. Extraído de server.py — FASE 1 segmentación. Sin cambios de comportamiento."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import jwt
import os

router = APIRouter(prefix="/api", tags=["Sports Catalog"])
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


# =============== SPORTS CATALOG ROUTES ===============
class SportCategoryCreate(BaseModel):
    name: str
    icon: str = "🏆"
    color: str = "#3B82F6"
    description: Optional[str] = None

class SportCreate(BaseModel):
    name: str
    category_id: str
    description: Optional[str] = None

class SportCategoryResponse(BaseModel):
    id: str
    coach_id: str
    name: str
    icon: str
    color: str
    description: Optional[str] = None
    sports: List[dict] = []
    created_at: str

class SportResponse(BaseModel):
    id: str
    coach_id: str
    category_id: str
    name: str
    description: Optional[str] = None
    created_at: str

# Default sport categories to seed for new users
DEFAULT_SPORT_CATEGORIES = [
    {"name": "Deportes de Contacto", "icon": "🥊", "color": "#EF4444", "sports": ["Boxeo", "MMA", "Judo", "Taekwondo", "Karate", "Lucha", "Wrestling", "Kickboxing"]},
    {"name": "Tiempo y Marca", "icon": "⏱️", "color": "#3B82F6", "sports": ["Atletismo", "Natación", "Ciclismo", "Triatlón", "Remo", "Patinaje", "Esquí", "Maratón"]},
    {"name": "Individuales", "icon": "🎾", "color": "#8B5CF6", "sports": ["Tenis", "Golf", "Gimnasia", "Badminton", "Squash", "Escalada", "Surf", "Skateboarding"]},
    {"name": "Deportes de Conjunto", "icon": "⚽", "color": "#10B981", "sports": ["Fútbol", "Baloncesto", "Voleibol", "Balonmano", "Rugby", "Hockey", "Béisbol", "Fútbol Americano"]},
    {"name": "Raqueta y Precisión", "icon": "🎯", "color": "#F59E0B", "sports": ["Tenis de Mesa", "Pádel", "Frontón", "Pelota Vasca", "Tiro con Arco", "Tiro Olímpico", "Billar", "Dardos"]},
    {"name": "Esports", "icon": "🎮", "color": "#EC4899", "sports": ["League of Legends", "FIFA", "Valorant", "CS:GO", "Fortnite", "Call of Duty", "Rocket League", "Overwatch"]},
]

async def seed_default_sports(db, coach_id: str):
    """Seed default sports catalog for a new user"""
    existing = await db.sport_categories.find_one({"coach_id": coach_id})
    if existing:
        return  # Already has sports
    
    for cat in DEFAULT_SPORT_CATEGORIES:
        cat_id = str(uuid.uuid4())
        cat_doc = {
            "id": cat_id,
            "coach_id": coach_id,
            "name": cat["name"],
            "icon": cat["icon"],
            "color": cat["color"],
            "description": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.sport_categories.insert_one(cat_doc)
        
        for sport_name in cat["sports"]:
            sport_doc = {
                "id": str(uuid.uuid4()),
                "coach_id": coach_id,
                "category_id": cat_id,
                "name": sport_name,
                "description": None,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.sports.insert_one(sport_doc)

@router.get("/sports/catalog")
async def get_user_sports_catalog(user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Get full sports catalog with categories and sports"""
    # Seed default sports if user doesn't have any
    await seed_default_sports(db, user["id"])
    
    categories = await db.sport_categories.find({"coach_id": user["id"]}, {"_id": 0}).to_list(100)
    sports = await db.sports.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Group sports by category
    result = []
    for cat in categories:
        cat_sports = [s for s in sports if s.get("category_id") == cat["id"]]
        result.append({
            **cat,
            "sports": cat_sports
        })
    
    return result

@router.post("/sports/categories")
async def create_sport_category(category: SportCategoryCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Create a new sport category"""
    cat_id = str(uuid.uuid4())
    doc = {
        "id": cat_id,
        "coach_id": user["id"],
        "name": category.name,
        "icon": category.icon,
        "color": category.color,
        "description": category.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sport_categories.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.put("/sports/categories/{category_id}")
async def update_sport_category(category_id: str, category: SportCategoryCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Update a sport category"""
    result = await db.sport_categories.update_one(
        {"id": category_id, "coach_id": user["id"]},
        {"$set": category.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = await db.sport_categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@router.delete("/sports/categories/{category_id}")
async def delete_sport_category(category_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Delete a sport category and all its sports"""
    result = await db.sport_categories.delete_one({"id": category_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    # Also delete all sports in this category
    await db.sports.delete_many({"category_id": category_id, "coach_id": user["id"]})
    return {"message": "Category and sports deleted"}

@router.post("/sports")
async def create_sport(sport: SportCreate, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Create a new sport in a category"""
    # Verify category exists
    category = await db.sport_categories.find_one({"id": sport.category_id, "coach_id": user["id"]})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    sport_id = str(uuid.uuid4())
    doc = {
        "id": sport_id,
        "coach_id": user["id"],
        "category_id": sport.category_id,
        "name": sport.name,
        "description": sport.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sports.insert_one(doc)
    doc.pop("_id", None)
    return doc

@router.delete("/sports/{sport_id}")
async def delete_sport(sport_id: str, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Delete a sport"""
    result = await db.sports.delete_one({"id": sport_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sport not found")
    return {"message": "Sport deleted"}

@router.put("/sports/{sport_id}/characterization")
async def update_sport_characterization(sport_id: str, data: dict, user: dict = Depends(get_current_user), db=Depends(get_db)):
    """Update sport technical characterization"""
    characterization = data.get("characterization", {})
    result = await db.sports.update_one(
        {"id": sport_id, "coach_id": user["id"]},
        {"$set": {"characterization": characterization}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sport not found")
    return {"message": "Characterization updated", "characterization": characterization}
