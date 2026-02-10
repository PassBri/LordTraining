from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum
from io import BytesIO
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'train-secret-key')
JWT_ALGORITHM = "HS256"

# App config
app = FastAPI(title="Sistema TRAIN API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# =============== ENUMS ===============
class UserRole(str, Enum):
    ADMIN = "admin"  # Administrador - Acceso total al sistema
    COACH = "coach"  # Entrenador - Puede crear planes para múltiples atletas
    PERSONAL_TRAINER = "personal_trainer"  # Entrenador Personal - Similar a coach pero enfocado en clientes individuales
    ATHLETE = "athlete"  # Atleta - Solo puede ver su propio plan
    TEAM = "team"  # Equipo - Grupo de atletas con plan compartido
    USER = "user"  # Usuario - Rol básico sin atletas asignados

class EntityType(str, Enum):
    FEDERATION = "federation"  # Federación - nivel nacional/regional
    CLUB = "club"  # Club deportivo
    SCHOOL = "school"  # Escuela deportiva
    NATIONAL_TEAM = "national_team"  # Selección Nacional
    TEAM = "team"  # Equipo/Categoría
    LEAGUE = "league"  # Liga/Torneo

class SubscriptionPlan(str, Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"

class PlanningModel(str, Enum):
    # Modelos Clásicos
    TRADITIONAL = "traditional"  # Tradicional (Matveiev) - Periodización lineal clásica
    ATR = "atr"  # ATR (Issurin) - Acumulación-Transformación-Realización
    BLOCKS = "blocks"  # Por Bloques (Verkhoshansky) - Cargas concentradas
    
    # Modelos Ondulatorios
    UNDULATING_DAILY = "undulating_daily"  # Ondulatorio Diario - Variación día a día
    UNDULATING_WEEKLY = "undulating_weekly"  # Ondulatorio Semanal - Variación semana a semana
    
    # Modelos Avanzados
    PENDULUM = "pendulum"  # Péndulo (Arosiev) - Alternancia de énfasis
    STRUCTURAL_BELLS = "structural_bells"  # Campanas Estructurales (Forteza)
    CONTEMPORARY = "contemporary"  # Contemporáneo (Bondarchuk)
    INVERSE = "inverse"  # Periodización Inversa - Para deportes de resistencia
    TACTICAL = "tactical"  # Táctico - Para deportes de equipo
    
    # Modelos Específicos
    CONCURRENT = "concurrent"  # Concurrente - Desarrollo simultáneo de cualidades
    CONJUGATE = "conjugate"  # Conjugado (Westside) - Para fuerza/potencia
    POLARIZED = "polarized"  # Polarizado - Alta intensidad vs baja intensidad

class CycleDuration(str, Enum):
    OLYMPIC = "olympic"  # Ciclo Olímpico - 4 años (208 semanas)
    BIANNUAL = "biannual"  # Bianual - 2 años (104 semanas)
    ANNUAL = "annual"  # Anual - 1 año (52 semanas)
    SEMESTER = "semester"  # Semestral - 6 meses (26 semanas)
    QUARTER = "quarter"  # Trimestral - 3 meses (13 semanas)
    MONTHLY = "monthly"  # Mensual - 4 semanas

class Sport(str, Enum):
    FOOTBALL = "football"
    ATHLETICS = "athletics"
    SWIMMING = "swimming"
    CYCLING = "cycling"
    BASKETBALL = "basketball"
    TENNIS = "tennis"
    CROSSFIT = "crossfit"
    WEIGHTLIFTING = "weightlifting"
    OTHER = "other"

class SessionType(str, Enum):
    PHYSICAL = "physical"
    TECHNICAL = "technical"
    TACTICAL = "tactical"
    RECOVERY = "recovery"

class Intensity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    MAXIMUM = "maximum"

# =============== MODELS ===============
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = UserRole.COACH

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: UserRole
    subscription: SubscriptionPlan
    created_at: str

# =============== ENTITY MODELS ===============
class EntityCreate(BaseModel):
    """Modelo para crear Federación, Club, Escuela, etc."""
    name: str
    entity_type: EntityType
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    # Datos completos
    legal_representative: Optional[str] = None
    tax_id: Optional[str] = None  # RUC/NIT
    foundation_date: Optional[str] = None
    # Redes sociales
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    # Relaciones jerárquicas
    parent_entity_id: Optional[str] = None  # ID de la entidad padre (ej: club padre de escuela)
    sport: Optional[str] = None

class EntityResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    coach_id: str
    name: str
    entity_type: EntityType
    description: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    legal_representative: Optional[str] = None
    tax_id: Optional[str] = None
    foundation_date: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    twitter: Optional[str] = None
    parent_entity_id: Optional[str] = None
    sport: Optional[str] = None
    athletes_count: Optional[int] = 0
    created_at: str

class AthleteCreate(BaseModel):
    name: str
    email: Optional[str] = None
    sport: Sport
    age: int
    level: str
    notes: Optional[str] = None
    # Afiliaciones a entidades
    affiliations: Optional[List[str]] = []  # Lista de IDs de entidades

class AthleteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    coach_id: str
    name: str
    email: Optional[str] = None
    sport: Sport
    age: int
    level: str
    notes: Optional[str] = None
    affiliations: Optional[List[str]] = []
    created_at: str

class ExerciseCreate(BaseModel):
    name: str
    sport: Sport
    category: str
    description: Optional[str] = None
    muscles: List[str] = []
    video_url: Optional[str] = None

class ExerciseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    sport: Sport
    category: str
    description: Optional[str] = None
    muscles: List[str] = []
    video_url: Optional[str] = None
    coach_id: Optional[str] = None
    is_public: bool = True

class SessionCreate(BaseModel):
    date: str
    session_type: SessionType
    duration_minutes: int
    volume: float
    intensity: Intensity
    exercises: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    time_of_day: str = "morning"

class SessionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    microcycle_id: str
    date: str
    session_type: SessionType
    duration_minutes: int
    volume: float
    intensity: Intensity
    load: float
    exercises: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    time_of_day: str
    completed: bool = False

class MicrocycleCreate(BaseModel):
    name: str
    start_date: str
    end_date: str
    objective: Optional[str] = None

class MicrocycleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    mesocycle_id: str
    name: str
    start_date: str
    end_date: str
    objective: Optional[str] = None
    sessions: List[SessionResponse] = []

class MesocycleCreate(BaseModel):
    name: str
    start_date: str
    end_date: str
    phase: str
    objective: Optional[str] = None

class MesocycleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    macrocycle_id: str
    name: str
    start_date: str
    end_date: str
    phase: str
    objective: Optional[str] = None
    microcycles: List[MicrocycleResponse] = []

class MacrocycleCreate(BaseModel):
    name: str
    start_date: str
    end_date: str
    sport: Sport
    planning_model: PlanningModel
    objective: Optional[str] = None

class MacrocycleResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    athlete_id: str
    name: str
    start_date: str
    end_date: str
    sport: Sport
    planning_model: PlanningModel
    objective: Optional[str] = None
    mesocycles: List[MesocycleResponse] = []

class CompetitionCreate(BaseModel):
    name: str
    date: str
    level: str
    location: Optional[str] = None
    notes: Optional[str] = None

class CompetitionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    athlete_id: str
    name: str
    date: str
    level: str
    location: Optional[str] = None
    notes: Optional[str] = None

class TrainingPlanGenerateRequest(BaseModel):
    athlete_id: str
    sport: Sport
    planning_model: PlanningModel
    duration_weeks: int
    objective: str
    competitions: List[str] = []
    current_level: str
    available_days_per_week: int = 5

class CheckoutRequest(BaseModel):
    plan: SubscriptionPlan
    origin_url: str

class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    plan: Optional[str] = None

# =============== HELPERS ===============
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

def calculate_load(volume: float, intensity: Intensity) -> float:
    intensity_map = {"low": 0.5, "medium": 0.7, "high": 0.85, "maximum": 1.0}
    return round(volume * intensity_map.get(intensity.value, 0.7), 2)

# =============== SUBSCRIPTION PLANS ===============
SUBSCRIPTION_PRICES = {
    SubscriptionPlan.BASIC: 9.99,
    SubscriptionPlan.PRO: 29.99,
    SubscriptionPlan.ENTERPRISE: 99.99
}

SUBSCRIPTION_LIMITS = {
    SubscriptionPlan.FREE: {"athletes": 2, "plans": 1, "ai_generations": 3},
    SubscriptionPlan.BASIC: {"athletes": 10, "plans": 5, "ai_generations": 20},
    SubscriptionPlan.PRO: {"athletes": 50, "plans": 999, "ai_generations": 100},
    SubscriptionPlan.ENTERPRISE: {"athletes": 999, "plans": 999, "ai_generations": 999}
}

# =============== AUTH ROUTES ===============
@api_router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "role": user.role.value,
        "subscription": SubscriptionPlan.FREE.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ai_generations_used": 0
    }
    await db.users.insert_one(user_doc)
    del user_doc["password"]
    user_doc.pop("_id", None)
    return UserResponse(**user_doc)

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "subscription": user["subscription"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# Endpoint para actualizar el perfil del usuario (incluyendo rol)
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None

@api_router.put("/auth/profile")
async def update_profile(update_data: UserProfileUpdate, user: dict = Depends(get_current_user)):
    update_fields = {}
    if update_data.name:
        update_fields["name"] = update_data.name
    if update_data.role:
        update_fields["role"] = update_data.role.value
    
    if update_fields:
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": update_fields}
        )
    
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})
    return updated_user

# Endpoint para obtener roles disponibles
@api_router.get("/auth/roles")
async def get_available_roles():
    roles = [
        {"id": "admin", "name": "Administrador", "description": "Acceso total al sistema"},
        {"id": "coach", "name": "Entrenador", "description": "Puede crear planes para múltiples atletas"},
        {"id": "personal_trainer", "name": "Entrenador Personal", "description": "Enfocado en clientes individuales"},
        {"id": "athlete", "name": "Atleta", "description": "Solo puede ver su propio plan"},
        {"id": "team", "name": "Equipo", "description": "Grupo de atletas con plan compartido"},
        {"id": "user", "name": "Usuario", "description": "Rol básico sin atletas asignados"}
    ]
    return roles

# Endpoint para obtener modelos de periodización disponibles
@api_router.get("/periodization-models-catalog")
async def get_periodization_models_catalog():
    models = [
        # Modelos Clásicos
        {"id": "traditional", "name": "Tradicional (Matveiev)", "category": "Clásico", 
         "description": "Periodización lineal clásica con fases bien definidas. Alto volumen inicial, baja intensidad progresando a bajo volumen, alta intensidad."},
        {"id": "atr", "name": "ATR (Issurin)", "category": "Clásico",
         "description": "Acumulación-Transformación-Realización. Mesociclos cortos y concentrados con objetivos específicos."},
        {"id": "blocks", "name": "Por Bloques (Verkhoshansky)", "category": "Clásico",
         "description": "Cargas concentradas unidireccionales. Desarrollo secuencial de cualidades físicas."},
        
        # Modelos Ondulatorios
        {"id": "undulating_daily", "name": "Ondulatorio Diario", "category": "Ondulatorio",
         "description": "Variación de volumen e intensidad día a día. Ideal para deportes con alta frecuencia de competencias."},
        {"id": "undulating_weekly", "name": "Ondulatorio Semanal", "category": "Ondulatorio",
         "description": "Variación semana a semana. Permite adaptación más gradual."},
        
        # Modelos Avanzados
        {"id": "pendulum", "name": "Péndulo (Arosiev)", "category": "Avanzado",
         "description": "Alternancia pendular entre preparación general y específica. Mantiene ambas cualidades."},
        {"id": "structural_bells", "name": "Campanas Estructurales (Forteza)", "category": "Avanzado",
         "description": "Acentuación de direcciones del entrenamiento en diferentes momentos del macrociclo."},
        {"id": "contemporary", "name": "Contemporáneo (Bondarchuk)", "category": "Avanzado",
         "description": "Basado en ejercicios de competición y especiales. Para atletas de alto rendimiento."},
        {"id": "inverse", "name": "Periodización Inversa", "category": "Avanzado",
         "description": "Comienza con alta intensidad y bajo volumen. Ideal para deportes de resistencia."},
        {"id": "tactical", "name": "Táctico", "category": "Avanzado",
         "description": "Diseñado para deportes de equipo. Integra preparación física con táctica."},
        
        # Modelos Específicos
        {"id": "concurrent", "name": "Concurrente", "category": "Específico",
         "description": "Desarrollo simultáneo de múltiples cualidades físicas. Para deportistas polivalentes."},
        {"id": "conjugate", "name": "Conjugado (Westside)", "category": "Específico",
         "description": "Método de esfuerzo máximo y dinámico. Principalmente para fuerza y potencia."},
        {"id": "polarized", "name": "Polarizado", "category": "Específico",
         "description": "80% baja intensidad, 20% alta intensidad. Muy usado en deportes de resistencia."}
    ]
    return models

# Endpoint para obtener duraciones de ciclo disponibles
@api_router.get("/cycle-durations")
async def get_cycle_durations():
    durations = [
        {"id": "olympic", "name": "Ciclo Olímpico", "weeks": 208, "months": 48, "years": 4,
         "description": "Planificación a largo plazo para competencias olímpicas"},
        {"id": "biannual", "name": "Bianual", "weeks": 104, "months": 24, "years": 2,
         "description": "Planificación de dos temporadas completas"},
        {"id": "annual", "name": "Anual", "weeks": 52, "months": 12, "years": 1,
         "description": "Macrociclo tradicional de una temporada"},
        {"id": "semester", "name": "Semestral", "weeks": 26, "months": 6, "years": 0.5,
         "description": "Media temporada o pretemporada extendida"},
        {"id": "quarter", "name": "Trimestral", "weeks": 13, "months": 3, "years": 0.25,
         "description": "Ciclo corto para objetivos específicos"},
        {"id": "monthly", "name": "Mensual", "weeks": 4, "months": 1, "years": 0,
         "description": "Mesociclo individual para ajustes rápidos"}
    ]
    return durations

# =============== ATHLETES ROUTES ===============
@api_router.post("/athletes", response_model=AthleteResponse)
async def create_athlete(athlete: AthleteCreate, user: dict = Depends(get_current_user)):
    limits = SUBSCRIPTION_LIMITS[SubscriptionPlan(user["subscription"])]
    count = await db.athletes.count_documents({"coach_id": user["id"]})
    if count >= limits["athletes"]:
        raise HTTPException(status_code=403, detail=f"Athlete limit reached for {user['subscription']} plan")
    
    athlete_id = str(uuid.uuid4())
    doc = {
        "id": athlete_id,
        "coach_id": user["id"],
        **athlete.model_dump(),
        "sport": athlete.sport.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.athletes.insert_one(doc)
    doc.pop("_id", None)
    return AthleteResponse(**doc)

@api_router.get("/athletes", response_model=List[AthleteResponse])
async def get_athletes(user: dict = Depends(get_current_user)):
    athletes = await db.athletes.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [AthleteResponse(**a) for a in athletes]

@api_router.get("/athletes/{athlete_id}", response_model=AthleteResponse)
async def get_athlete(athlete_id: str, user: dict = Depends(get_current_user)):
    athlete = await db.athletes.find_one({"id": athlete_id, "coach_id": user["id"]}, {"_id": 0})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return AthleteResponse(**athlete)

@api_router.put("/athletes/{athlete_id}", response_model=AthleteResponse)
async def update_athlete(athlete_id: str, athlete: AthleteCreate, user: dict = Depends(get_current_user)):
    result = await db.athletes.update_one(
        {"id": athlete_id, "coach_id": user["id"]},
        {"$set": {**athlete.model_dump(), "sport": athlete.sport.value}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Athlete not found")
    updated = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    return AthleteResponse(**updated)

@api_router.delete("/athletes/{athlete_id}")
async def delete_athlete(athlete_id: str, user: dict = Depends(get_current_user)):
    result = await db.athletes.delete_one({"id": athlete_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Athlete not found")
    return {"message": "Athlete deleted"}

# =============== EXERCISES ROUTES ===============
@api_router.post("/exercises", response_model=ExerciseResponse)
async def create_exercise(exercise: ExerciseCreate, user: dict = Depends(get_current_user)):
    exercise_id = str(uuid.uuid4())
    doc = {
        "id": exercise_id,
        "coach_id": user["id"],
        **exercise.model_dump(),
        "sport": exercise.sport.value,
        "is_public": False
    }
    await db.exercises.insert_one(doc)
    doc.pop("_id", None)
    return ExerciseResponse(**doc)

@api_router.get("/exercises", response_model=List[ExerciseResponse])
async def get_exercises(sport: Optional[Sport] = None, category: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"$or": [{"is_public": True}, {"coach_id": user["id"]}]}
    if sport:
        query["sport"] = sport.value
    if category:
        query["category"] = category
    exercises = await db.exercises.find(query, {"_id": 0}).to_list(1000)
    return [ExerciseResponse(**e) for e in exercises]

# =============== MACROCYCLES ROUTES ===============
@api_router.post("/macrocycles", response_model=MacrocycleResponse)
async def create_macrocycle(macrocycle: MacrocycleCreate, athlete_id: str, user: dict = Depends(get_current_user)):
    athlete = await db.athletes.find_one({"id": athlete_id, "coach_id": user["id"]})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    macro_id = str(uuid.uuid4())
    doc = {
        "id": macro_id,
        "athlete_id": athlete_id,
        "coach_id": user["id"],
        **macrocycle.model_dump(),
        "sport": macrocycle.sport.value,
        "planning_model": macrocycle.planning_model.value,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.macrocycles.insert_one(doc)
    doc.pop("_id", None)
    doc["mesocycles"] = []
    return MacrocycleResponse(**doc)

@api_router.get("/macrocycles", response_model=List[MacrocycleResponse])
async def get_macrocycles(athlete_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"coach_id": user["id"]}
    if athlete_id:
        query["athlete_id"] = athlete_id
    macros = await db.macrocycles.find(query, {"_id": 0}).to_list(1000)
    for macro in macros:
        macro["mesocycles"] = await db.mesocycles.find({"macrocycle_id": macro["id"]}, {"_id": 0}).to_list(100)
    return [MacrocycleResponse(**m) for m in macros]

@api_router.get("/macrocycles/{macro_id}", response_model=MacrocycleResponse)
async def get_macrocycle(macro_id: str, user: dict = Depends(get_current_user)):
    macro = await db.macrocycles.find_one({"id": macro_id, "coach_id": user["id"]}, {"_id": 0})
    if not macro:
        raise HTTPException(status_code=404, detail="Macrocycle not found")
    macro["mesocycles"] = await db.mesocycles.find({"macrocycle_id": macro_id}, {"_id": 0}).to_list(100)
    for meso in macro["mesocycles"]:
        meso["microcycles"] = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0}).to_list(100)
        for micro in meso["microcycles"]:
            micro["sessions"] = await db.sessions.find({"microcycle_id": micro["id"]}, {"_id": 0}).to_list(100)
    return MacrocycleResponse(**macro)

# =============== MESOCYCLES ROUTES ===============
@api_router.post("/mesocycles", response_model=MesocycleResponse)
async def create_mesocycle(mesocycle: MesocycleCreate, macrocycle_id: str, user: dict = Depends(get_current_user)):
    macro = await db.macrocycles.find_one({"id": macrocycle_id, "coach_id": user["id"]})
    if not macro:
        raise HTTPException(status_code=404, detail="Macrocycle not found")
    
    meso_id = str(uuid.uuid4())
    doc = {
        "id": meso_id,
        "macrocycle_id": macrocycle_id,
        **mesocycle.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.mesocycles.insert_one(doc)
    doc.pop("_id", None)
    doc["microcycles"] = []
    return MesocycleResponse(**doc)

# =============== MICROCYCLES ROUTES ===============
@api_router.post("/microcycles", response_model=MicrocycleResponse)
async def create_microcycle(microcycle: MicrocycleCreate, mesocycle_id: str, user: dict = Depends(get_current_user)):
    meso = await db.mesocycles.find_one({"id": mesocycle_id})
    if not meso:
        raise HTTPException(status_code=404, detail="Mesocycle not found")
    
    micro_id = str(uuid.uuid4())
    doc = {
        "id": micro_id,
        "mesocycle_id": mesocycle_id,
        **microcycle.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.microcycles.insert_one(doc)
    doc.pop("_id", None)
    doc["sessions"] = []
    return MicrocycleResponse(**doc)

# =============== SESSIONS ROUTES ===============
@api_router.post("/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, microcycle_id: str, user: dict = Depends(get_current_user)):
    micro = await db.microcycles.find_one({"id": microcycle_id})
    if not micro:
        raise HTTPException(status_code=404, detail="Microcycle not found")
    
    session_id = str(uuid.uuid4())
    load = calculate_load(session.volume, session.intensity)
    doc = {
        "id": session_id,
        "microcycle_id": microcycle_id,
        **session.model_dump(),
        "session_type": session.session_type.value,
        "intensity": session.intensity.value,
        "load": load,
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sessions.insert_one(doc)
    doc.pop("_id", None)
    return SessionResponse(**doc)

@api_router.put("/sessions/{session_id}/complete")
async def complete_session(session_id: str, user: dict = Depends(get_current_user)):
    result = await db.sessions.update_one({"id": session_id}, {"$set": {"completed": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session marked as completed"}

@api_router.get("/sessions/calendar")
async def get_calendar_sessions(athlete_id: str, start_date: str, end_date: str, user: dict = Depends(get_current_user)):
    macros = await db.macrocycles.find({"athlete_id": athlete_id, "coach_id": user["id"]}, {"_id": 0}).to_list(100)
    all_sessions = []
    for macro in macros:
        mesos = await db.mesocycles.find({"macrocycle_id": macro["id"]}, {"_id": 0}).to_list(100)
        for meso in mesos:
            micros = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0}).to_list(100)
            for micro in micros:
                sessions = await db.sessions.find({
                    "microcycle_id": micro["id"],
                    "date": {"$gte": start_date, "$lte": end_date}
                }, {"_id": 0}).to_list(1000)
                for s in sessions:
                    s["macrocycle_name"] = macro["name"]
                    s["mesocycle_name"] = meso["name"]
                    s["microcycle_name"] = micro["name"]
                all_sessions.extend(sessions)
    return all_sessions

# =============== COMPETITIONS ROUTES ===============
@api_router.post("/competitions", response_model=CompetitionResponse)
async def create_competition(competition: CompetitionCreate, athlete_id: str, user: dict = Depends(get_current_user)):
    athlete = await db.athletes.find_one({"id": athlete_id, "coach_id": user["id"]})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    comp_id = str(uuid.uuid4())
    doc = {
        "id": comp_id,
        "athlete_id": athlete_id,
        "coach_id": user["id"],
        **competition.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.competitions.insert_one(doc)
    doc.pop("_id", None)
    return CompetitionResponse(**doc)

@api_router.get("/competitions", response_model=List[CompetitionResponse])
async def get_competitions(athlete_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"coach_id": user["id"]}
    if athlete_id:
        query["athlete_id"] = athlete_id
    comps = await db.competitions.find(query, {"_id": 0}).to_list(1000)
    return [CompetitionResponse(**c) for c in comps]

# =============== AI PLAN GENERATION ===============
@api_router.post("/plans/generate")
async def generate_training_plan(request: TrainingPlanGenerateRequest, user: dict = Depends(get_current_user)):
    limits = SUBSCRIPTION_LIMITS[SubscriptionPlan(user["subscription"])]
    if user.get("ai_generations_used", 0) >= limits["ai_generations"]:
        raise HTTPException(status_code=403, detail=f"AI generation limit reached for {user['subscription']} plan")
    
    athlete = await db.athletes.find_one({"id": request.athlete_id, "coach_id": user["id"]})
    if not athlete:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    chat = LlmChat(
        api_key=api_key,
        session_id=f"plan-{user['id']}-{str(uuid.uuid4())[:8]}",
        system_message="""Eres un experto en planificación de entrenamiento deportivo. 
        Genera planes de entrenamiento detallados basados en los principios científicos del entrenamiento.
        Incluye macrociclos, mesociclos, microciclos y sesiones específicas.
        Responde SOLO en formato JSON válido."""
    ).with_model("openai", "gpt-5.2")
    
    prompt = f"""Genera un plan de entrenamiento completo en JSON:
    
    - Deporte: {request.sport.value}
    - Modelo de planificación: {request.planning_model.value}
    - Duración: {request.duration_weeks} semanas
    - Objetivo: {request.objective}
    - Nivel actual: {request.current_level}
    - Días disponibles por semana: {request.available_days_per_week}
    - Competiciones objetivo: {', '.join(request.competitions) if request.competitions else 'Sin competiciones específicas'}
    
    Estructura del JSON:
    {{
        "macrocycle": {{
            "name": "string",
            "objective": "string",
            "mesocycles": [
                {{
                    "name": "string",
                    "phase": "accumulation|transformation|realization|recovery",
                    "weeks": number,
                    "objective": "string",
                    "microcycles": [
                        {{
                            "name": "string",
                            "sessions": [
                                {{
                                    "day": number,
                                    "session_type": "physical|technical|tactical|recovery",
                                    "duration_minutes": number,
                                    "intensity": "low|medium|high|maximum",
                                    "volume": number,
                                    "exercises": ["string"],
                                    "notes": "string"
                                }}
                            ]
                        }}
                    ]
                }}
            ]
        }}
    }}
    
    Genera un plan realista y progresivo."""
    
    try:
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Update AI usage count
        await db.users.update_one({"id": user["id"]}, {"$inc": {"ai_generations_used": 1}})
        
        # Try to parse JSON from response
        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            plan_data = json.loads(json_match.group())
            return {"plan": plan_data, "raw_response": response}
        return {"plan": None, "raw_response": response}
    except Exception as e:
        logger.error(f"AI generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating plan: {str(e)}")

# =============== DASHBOARD STATS ===============
@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    athletes_count = await db.athletes.count_documents({"coach_id": user["id"]})
    macrocycles_count = await db.macrocycles.count_documents({"coach_id": user["id"]})
    
    # Get recent sessions
    macros = await db.macrocycles.find({"coach_id": user["id"]}, {"_id": 0, "id": 1}).to_list(100)
    total_sessions = 0
    completed_sessions = 0
    weekly_load = []
    
    for macro in macros:
        mesos = await db.mesocycles.find({"macrocycle_id": macro["id"]}, {"_id": 0, "id": 1}).to_list(100)
        for meso in mesos:
            micros = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0, "id": 1}).to_list(100)
            for micro in micros:
                sessions = await db.sessions.find({"microcycle_id": micro["id"]}, {"_id": 0}).to_list(1000)
                total_sessions += len(sessions)
                completed_sessions += sum(1 for s in sessions if s.get("completed", False))
                for s in sessions:
                    weekly_load.append({"date": s.get("date"), "load": s.get("load", 0)})
    
    limits = SUBSCRIPTION_LIMITS[SubscriptionPlan(user["subscription"])]
    
    return {
        "athletes_count": athletes_count,
        "athletes_limit": limits["athletes"],
        "macrocycles_count": macrocycles_count,
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
        "weekly_load": sorted(weekly_load, key=lambda x: x.get("date", ""))[-30:],
        "ai_generations_used": user.get("ai_generations_used", 0),
        "ai_generations_limit": limits["ai_generations"],
        "subscription": user["subscription"]
    }

# =============== CONTROL PANEL ROUTES ===============
class ExportPDFRequest(BaseModel):
    include_summary: bool = True
    include_volume_chart: bool = True
    include_intensity_chart: bool = True
    include_calendar: bool = True
    athlete_id: Optional[str] = None
    custom_sections: Optional[List[str]] = None

@api_router.get("/control-panel/stats")
async def get_control_panel_stats(user: dict = Depends(get_current_user)):
    """Obtiene estadísticas completas para el Panel de Control"""
    
    # Conteos básicos
    athletes_count = await db.athletes.count_documents({"coach_id": user["id"]})
    
    # Obtener atletas con sus datos
    athletes_cursor = db.athletes.find({"coach_id": user["id"]}, {"_id": 0})
    athletes = await athletes_cursor.to_list(100)
    
    # Obtener eventos próximos
    upcoming_events = []
    for athlete in athletes:
        events_data = await db.events_calendar.find_one({"coach_id": user["id"], "athlete_id": athlete["id"]}, {"_id": 0})
        if events_data and events_data.get("events"):
            for event in events_data["events"]:
                event_date = event.get("date")
                if event_date:
                    try:
                        event_dt = datetime.fromisoformat(event_date.replace("Z", "+00:00")) if "T" in event_date else datetime.strptime(event_date, "%Y-%m-%d")
                        if event_dt.replace(tzinfo=None) >= datetime.now():
                            upcoming_events.append({
                                **event,
                                "athleteId": athlete["id"],
                                "athleteName": athlete.get("name", "")
                            })
                    except:
                        pass
    
    # Ordenar eventos por fecha
    upcoming_events.sort(key=lambda x: x.get("date", ""))
    
    # Estadísticas de periodización
    periodization_stats = []
    total_sessions = 0
    completed_sessions = 0
    volume_data = []
    intensity_data = []
    phase_distribution = {}
    
    for athlete in athletes:
        period_data = await db.periodizations.find_one(
            {"coach_id": user["id"], "athlete_id": athlete["id"]},
            {"_id": 0}
        )
        if period_data and period_data.get("mesocycles"):
            week_counter = 1
            for meso in period_data["mesocycles"]:
                phase_name = meso.get("phaseName", meso.get("phase", "Otro"))
                
                for micro in meso.get("microcycles", []):
                    # Contar fases
                    phase_distribution[phase_name] = phase_distribution.get(phase_name, 0) + 1
                    
                    volume = micro.get("volume", 70)
                    intensity = micro.get("intensity", 50)
                    
                    volume_data.append({
                        "semana": f"S{week_counter}",
                        "volumen": volume,
                        "objetivo": volume - 5 if not micro.get("isDeload") else volume + 20,
                        "athleteId": athlete["id"]
                    })
                    
                    intensity_data.append({
                        "semana": f"S{week_counter}",
                        "intensidad": intensity,
                        "recuperacion": 100 - intensity + (20 if micro.get("isDeload") else 0),
                        "athleteId": athlete["id"]
                    })
                    
                    # Contar sesiones en microciclo
                    for session in micro.get("sessions", []):
                        total_sessions += 1
                        if session.get("completed"):
                            completed_sessions += 1
                    
                    week_counter += 1
            
            periodization_stats.append({
                "athleteId": athlete["id"],
                "athleteName": athlete.get("name"),
                "totalWeeks": period_data.get("totalWeeks"),
                "startDate": period_data.get("startDate"),
                "model": period_data.get("model"),
                "currentPhase": period_data["mesocycles"][0].get("phaseName") if period_data["mesocycles"] else None
            })
    
    # Calcular distribución de fases en porcentajes
    total_weeks = sum(phase_distribution.values()) or 1
    phase_distribution_pct = [
        {"name": name, "value": round((count / total_weeks) * 100)}
        for name, count in phase_distribution.items()
    ]
    
    return {
        "athletes_count": athletes_count,
        "athletes": athletes,
        "upcoming_events": upcoming_events[:10],
        "upcoming_events_count": len(upcoming_events),
        "total_sessions": total_sessions,
        "completed_sessions": completed_sessions,
        "completion_rate": round((completed_sessions / total_sessions * 100), 1) if total_sessions > 0 else 0,
        "periodization_stats": periodization_stats,
        "volume_data": volume_data[:52],
        "intensity_data": intensity_data[:52],
        "phase_distribution": phase_distribution_pct,
        "active_macrocycles": len(periodization_stats)
    }

@api_router.post("/control-panel/export-pdf")
async def export_control_panel_pdf(request: ExportPDFRequest, user: dict = Depends(get_current_user)):
    """Exporta un reporte PDF personalizable del Panel de Control"""
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib import colors
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    story = []
    styles = getSampleStyleSheet()
    
    # Estilos personalizados
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontSize=24,
        textColor=HexColor('#3B82F6'),
        spaceAfter=20
    )
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=HexColor('#1E40AF'),
        spaceAfter=12,
        spaceBefore=20
    )
    
    # Obtener datos del usuario
    stats = await get_control_panel_stats(user)
    
    # Título principal
    story.append(Paragraph("Reporte de Entrenamiento - TRAIN", title_style))
    story.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles['Normal']))
    story.append(Paragraph(f"Entrenador: {user.get('name', user.get('email'))}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # SECCIÓN 1: Resumen General
    if request.include_summary:
        story.append(Paragraph("Resumen General", heading_style))
        
        summary_data = [
            ["Métrica", "Valor"],
            ["Total de Atletas", str(stats.get("athletes_count", 0))],
            ["Eventos Próximos", str(stats.get("upcoming_events_count", 0))],
            ["Sesiones Totales", str(stats.get("total_sessions", 0))],
            ["Sesiones Completadas", str(stats.get("completed_sessions", 0))],
            ["Tasa de Completación", f"{stats.get('completion_rate', 0)}%"],
            ["Macrociclos Activos", str(stats.get("active_macrocycles", 0))],
        ]
        
        summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F0F9FF')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#CBD5E1')),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
    
    # SECCIÓN 2: Lista de Atletas
    athletes = stats.get("athletes", [])
    if athletes:
        story.append(Paragraph("Atletas Registrados", heading_style))
        
        athlete_data = [["Nombre", "Deporte", "Nivel", "Edad"]]
        for athlete in athletes[:20]:
            athlete_data.append([
                athlete.get("name", "N/A"),
                athlete.get("sport", "N/A"),
                athlete.get("level", "N/A"),
                str(athlete.get("age", "N/A"))
            ])
        
        athlete_table = Table(athlete_data, colWidths=[2*inch, 1.5*inch, 1.5*inch, 1*inch])
        athlete_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#10B981')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#ECFDF5')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#A7F3D0')),
        ]))
        story.append(athlete_table)
        story.append(Spacer(1, 20))
    
    # SECCIÓN 3: Eventos Próximos
    if request.include_calendar:
        events = stats.get("upcoming_events", [])
        if events:
            story.append(Paragraph("Próximos Eventos", heading_style))
            
            event_data = [["Evento", "Atleta", "Fecha", "Prioridad"]]
            for event in events[:10]:
                event_data.append([
                    event.get("name", event.get("title", "N/A")),
                    event.get("athleteName", "N/A"),
                    event.get("date", "N/A"),
                    event.get("priority", "N/A").upper() if event.get("priority") else "N/A"
                ])
            
            event_table = Table(event_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch, 1*inch])
            event_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#F59E0B')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#FFFBEB')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#FDE68A')),
            ]))
            story.append(event_table)
            story.append(Spacer(1, 20))
    
    # SECCIÓN 4: Datos de Volumen
    if request.include_volume_chart:
        volume_data = stats.get("volume_data", [])
        if volume_data:
            story.append(Paragraph("Volumen de Entrenamiento por Semana", heading_style))
            
            vol_table_data = [["Semana", "Volumen", "Objetivo"]]
            for v in volume_data[:12]:
                vol_table_data.append([
                    v.get("semana", "N/A"),
                    str(v.get("volumen", 0)),
                    str(v.get("objetivo", 0))
                ])
            
            vol_table = Table(vol_table_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
            vol_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#3B82F6')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#EFF6FF')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#BFDBFE')),
            ]))
            story.append(vol_table)
            story.append(Spacer(1, 20))
    
    # SECCIÓN 5: Datos de Intensidad
    if request.include_intensity_chart:
        intensity_data = stats.get("intensity_data", [])
        if intensity_data:
            story.append(Paragraph("Progreso de Intensidad", heading_style))
            
            int_table_data = [["Semana", "Intensidad %", "Recuperación %"]]
            for i in intensity_data[:12]:
                int_table_data.append([
                    i.get("semana", "N/A"),
                    str(i.get("intensidad", 0)),
                    str(i.get("recuperacion", 0))
                ])
            
            int_table = Table(int_table_data, colWidths=[1.5*inch, 1.5*inch, 1.5*inch])
            int_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HexColor('#EF4444')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BACKGROUND', (0, 1), (-1, -1), HexColor('#FEF2F2')),
                ('GRID', (0, 0), (-1, -1), 1, HexColor('#FECACA')),
            ]))
            story.append(int_table)
            story.append(Spacer(1, 20))
    
    # SECCIÓN 6: Distribución de Fases
    phase_dist = stats.get("phase_distribution", [])
    if phase_dist:
        story.append(Paragraph("Distribución de Fases", heading_style))
        
        phase_table_data = [["Fase", "Porcentaje"]]
        for phase in phase_dist:
            phase_table_data.append([
                phase.get("name", "N/A"),
                f"{phase.get('value', 0)}%"
            ])
        
        phase_table = Table(phase_table_data, colWidths=[3*inch, 1.5*inch])
        phase_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), HexColor('#8B5CF6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BACKGROUND', (0, 1), (-1, -1), HexColor('#F5F3FF')),
            ('GRID', (0, 0), (-1, -1), 1, HexColor('#DDD6FE')),
        ]))
        story.append(phase_table)
    
    # Pie de página
    story.append(Spacer(1, 30))
    story.append(Paragraph("---", styles['Normal']))
    story.append(Paragraph("Generado por Sistema TRAIN - Planificación Deportiva Inteligente", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"reporte_train_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# =============== PAYMENT ROUTES ===============
@api_router.post("/payments/checkout")
async def create_checkout(request: CheckoutRequest, http_request: Request, user: dict = Depends(get_current_user)):
    if request.plan == SubscriptionPlan.FREE:
        raise HTTPException(status_code=400, detail="Cannot checkout free plan")
    
    amount = SUBSCRIPTION_PRICES.get(request.plan)
    if not amount:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(http_request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{request.origin_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{request.origin_url}/pricing"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": user["id"], "plan": request.plan.value, "user_email": user["email"]}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "amount": amount,
        "currency": "usd",
        "plan": request.plan.value,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        status = await stripe_checkout.get_checkout_status(session_id)
        
        # Update transaction and user subscription if paid
        if status.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": session_id})
            if transaction and transaction.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": session_id},
                    {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"subscription": transaction["plan"]}}
                )
        
        transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
        return PaymentStatusResponse(
            status=status.status,
            payment_status=status.payment_status,
            plan=transaction.get("plan") if transaction else None
        )
    except Exception as e:
        logger.error(f"Payment status error: {e}")
        raise HTTPException(status_code=500, detail="Error checking payment status")

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    api_key = os.environ.get("STRIPE_API_KEY")
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            transaction = await db.payment_transactions.find_one({"session_id": webhook_response.session_id})
            if transaction:
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$set": {"subscription": transaction["plan"]}}
                )
        
        return {"status": "received"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

# =============== PDF EXPORT ===============
@api_router.get("/export/plan/{macrocycle_id}/pdf")
async def export_plan_pdf(macrocycle_id: str, user: dict = Depends(get_current_user)):
    macro = await db.macrocycles.find_one({"id": macrocycle_id, "coach_id": user["id"]}, {"_id": 0})
    if not macro:
        raise HTTPException(status_code=404, detail="Macrocycle not found")
    
    athlete = await db.athletes.find_one({"id": macro["athlete_id"]}, {"_id": 0})
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFillColor(HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "SISTEMA TRAIN")
    
    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor("#64748b"))
    c.drawString(50, height - 70, "Plan de Entrenamiento")
    
    # Macrocycle info
    y = height - 120
    c.setFillColor(HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, macro["name"])
    
    y -= 25
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor("#475569"))
    c.drawString(50, y, f"Atleta: {athlete['name'] if athlete else 'N/A'}")
    y -= 18
    c.drawString(50, y, f"Deporte: {macro['sport']}")
    y -= 18
    c.drawString(50, y, f"Modelo: {macro['planning_model']}")
    y -= 18
    c.drawString(50, y, f"Período: {macro['start_date']} - {macro['end_date']}")
    y -= 18
    if macro.get("objective"):
        c.drawString(50, y, f"Objetivo: {macro['objective']}")
    
    # Get mesocycles
    mesos = await db.mesocycles.find({"macrocycle_id": macrocycle_id}, {"_id": 0}).to_list(100)
    
    y -= 40
    for meso in mesos:
        if y < 100:
            c.showPage()
            y = height - 50
        
        c.setFillColor(HexColor("#007AFF"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(50, y, f"Mesociclo: {meso['name']}")
        y -= 20
        
        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#475569"))
        c.drawString(60, y, f"Fase: {meso['phase']} | {meso['start_date']} - {meso['end_date']}")
        y -= 15
        if meso.get("objective"):
            c.drawString(60, y, f"Objetivo: {meso['objective']}")
            y -= 20
        else:
            y -= 5
        
        micros = await db.microcycles.find({"mesocycle_id": meso["id"]}, {"_id": 0}).to_list(100)
        for micro in micros:
            if y < 100:
                c.showPage()
                y = height - 50
            
            c.setFillColor(HexColor("#0f172a"))
            c.setFont("Helvetica-Bold", 11)
            c.drawString(70, y, f"Microciclo: {micro['name']}")
            y -= 15
            
            sessions = await db.sessions.find({"microcycle_id": micro["id"]}, {"_id": 0}).to_list(100)
            for session in sessions:
                if y < 80:
                    c.showPage()
                    y = height - 50
                
                c.setFont("Helvetica", 9)
                c.setFillColor(HexColor("#64748b"))
                session_text = f"  {session['date']} - {session['session_type']} | {session['duration_minutes']}min | Intensidad: {session['intensity']} | Carga: {session['load']}"
                c.drawString(80, y, session_text)
                y -= 12
            y -= 10
        y -= 15
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#94a3b8"))
    c.drawString(50, 30, f"Generado por Sistema TRAIN - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=plan_{macro['name'].replace(' ', '_')}.pdf"}
    )

# =============== SEED DEFAULT EXERCISES ===============
@api_router.post("/seed/exercises")
async def seed_exercises():
    exercises = [
        # Football
        {"name": "Sprint 30m", "sport": "football", "category": "velocidad", "description": "Sprint corto de alta intensidad", "muscles": ["cuadriceps", "isquiotibiales", "gluteos"], "is_public": True},
        {"name": "Rondo 4v2", "sport": "football", "category": "tecnico", "description": "Ejercicio de posesión y presión", "muscles": [], "is_public": True},
        {"name": "Circuito de fuerza", "sport": "football", "category": "fuerza", "description": "Trabajo de fuerza general", "muscles": ["tren_superior", "core", "tren_inferior"], "is_public": True},
        # Athletics
        {"name": "Series 200m", "sport": "athletics", "category": "resistencia", "description": "Series de velocidad resistencia", "muscles": ["cuadriceps", "isquiotibiales"], "is_public": True},
        {"name": "Técnica de carrera", "sport": "athletics", "category": "tecnico", "description": "Drills de técnica", "muscles": ["flexores_cadera", "gluteos"], "is_public": True},
        {"name": "Saltos pliométricos", "sport": "athletics", "category": "potencia", "description": "Trabajo de potencia de piernas", "muscles": ["cuadriceps", "gemelos"], "is_public": True},
        # Swimming
        {"name": "Series 100m crol", "sport": "swimming", "category": "resistencia", "description": "Series aeróbicas de crol", "muscles": ["dorsal", "deltoides", "triceps"], "is_public": True},
        {"name": "Técnica de viraje", "sport": "swimming", "category": "tecnico", "description": "Práctica de virajes", "muscles": ["core", "piernas"], "is_public": True},
        {"name": "Nado con palas", "sport": "swimming", "category": "fuerza", "description": "Trabajo de fuerza en agua", "muscles": ["dorsal", "pectoral", "triceps"], "is_public": True},
        # Cycling
        {"name": "Intervalos 4x4", "sport": "cycling", "category": "potencia", "description": "Intervalos de alta intensidad", "muscles": ["cuadriceps", "gluteos"], "is_public": True},
        {"name": "Rodaje largo", "sport": "cycling", "category": "resistencia", "description": "Entrenamiento de base aeróbica", "muscles": ["cuadriceps", "isquiotibiales"], "is_public": True},
        {"name": "Series de subida", "sport": "cycling", "category": "fuerza", "description": "Trabajo de fuerza en subida", "muscles": ["cuadriceps", "gluteos", "core"], "is_public": True},
        # Crossfit
        {"name": "AMRAP 20min", "sport": "crossfit", "category": "metabolico", "description": "Circuito metabólico de alta intensidad", "muscles": ["cuerpo_completo"], "is_public": True},
        {"name": "Clean & Jerk", "sport": "crossfit", "category": "tecnico", "description": "Levantamiento olímpico", "muscles": ["piernas", "espalda", "hombros"], "is_public": True},
        {"name": "Muscle-ups", "sport": "crossfit", "category": "fuerza", "description": "Ejercicio de gimnasia", "muscles": ["dorsal", "triceps", "pectoral"], "is_public": True},
        # Weightlifting
        {"name": "Sentadilla trasera", "sport": "weightlifting", "category": "fuerza", "description": "Ejercicio fundamental de fuerza", "muscles": ["cuadriceps", "gluteos", "core"], "is_public": True},
        {"name": "Press banca", "sport": "weightlifting", "category": "fuerza", "description": "Empuje horizontal", "muscles": ["pectoral", "deltoides", "triceps"], "is_public": True},
        {"name": "Peso muerto", "sport": "weightlifting", "category": "fuerza", "description": "Tirón de suelo", "muscles": ["isquiotibiales", "gluteos", "espalda_baja"], "is_public": True},
    ]
    
    for ex in exercises:
        existing = await db.exercises.find_one({"name": ex["name"], "sport": ex["sport"]})
        if not existing:
            ex["id"] = str(uuid.uuid4())
            await db.exercises.insert_one(ex)
    
    return {"message": "Exercises seeded successfully", "count": len(exercises)}

# =============== PREVIOUS PLAN ANALYSIS ===============
class PreviousPlanAnalysisCreate(BaseModel):
    athlete_id: Optional[str] = None
    initialObjectives: str = ''
    achievementLevel: str = ''
    performanceIndicators: str = ''
    objectivesCompliance: str = ''
    recoveryProcess: str = ''
    fatiguePeriods: str = ''
    injuries: str = ''
    injuryImpact: str = ''
    injuryMeasures: str = ''
    planPositiveAspects: str = ''
    planImprovementAreas: str = ''
    nutritionHabits: str = ''
    hydrationHabits: str = ''
    nutritionImpact: str = ''
    stressManagement: str = ''
    competitionPressure: str = ''
    psychSupport: str = ''
    equipmentAdequacy: str = ''
    techNeeds: str = ''
    specificChanges: str = ''
    nextCycleChanges: str = ''
    stagnationPhases: str = ''
    stagnationReasons: str = ''
    performanceResults: str = ''
    planningCompliance: str = ''
    trainingLevels: str = ''
    difficulties: str = ''

@api_router.post("/analysis/previous-plan")
async def save_previous_plan_analysis(analysis: PreviousPlanAnalysisCreate, user: dict = Depends(get_current_user)):
    analysis_id = str(uuid.uuid4())
    doc = {
        "id": analysis_id,
        "coach_id": user["id"],
        **analysis.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Check if analysis exists for this athlete
    existing = await db.plan_analysis.find_one({
        "coach_id": user["id"],
        "athlete_id": analysis.athlete_id
    })
    
    if existing:
        await db.plan_analysis.update_one(
            {"id": existing["id"]},
            {"$set": {**analysis.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Analysis updated", "id": existing["id"]}
    else:
        await db.plan_analysis.insert_one(doc)
        return {"message": "Analysis saved", "id": analysis_id}

@api_router.get("/analysis/previous-plan/{athlete_id}")
async def get_previous_plan_analysis(athlete_id: str, user: dict = Depends(get_current_user)):
    analysis = await db.plan_analysis.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    return analysis

# =============== SESSION PLANNING ===============
class SessionPlanningCreate(BaseModel):
    athlete_id: Optional[str] = None
    macrocycle_id: Optional[str] = None
    date: str
    sessionNumber: int = 1
    objectives: Dict[str, str] = {}
    phases: Dict[str, List[Dict[str, Any]]] = {}
    heartRate: Dict[str, Any] = {}
    feedback: str = ''

@api_router.post("/sessions/planning")
async def save_session_planning(session: SessionPlanningCreate, user: dict = Depends(get_current_user)):
    session_id = str(uuid.uuid4())
    doc = {
        "id": session_id,
        "coach_id": user["id"],
        **session.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.session_plans.insert_one(doc)
    return {"message": "Session planning saved", "id": session_id}

@api_router.get("/sessions/planning/{athlete_id}")
async def get_session_plannings(athlete_id: str, user: dict = Depends(get_current_user)):
    sessions = await db.session_plans.find({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0}).to_list(100)
    return sessions

# =============== SPORT CHARACTERIZATION ===============
class SportCharacterizationCreate(BaseModel):
    athlete_id: Optional[str] = None
    sportName: str = ''
    movementOrganization: str = ''
    predominantEnergy: str = ''
    determinantEnergy: str = ''
    muscularFibers: str = ''
    energySubstrate: str = ''
    generalMotor: str = ''
    specialMotor: str = ''
    effortType: str = ''
    observation: str = ''
    description: str = ''

@api_router.post("/characterization/sport")
async def save_sport_characterization(data: SportCharacterizationCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.sport_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.sport_characterization.update_one(
            {"id": existing["id"]},
            {"$set": {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Characterization updated", "id": existing["id"]}
    else:
        await db.sport_characterization.insert_one(doc)
        return {"message": "Characterization saved", "id": doc_id}

@api_router.get("/characterization/sport/{athlete_id}")
async def get_sport_characterization(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.sport_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Characterization not found")
    
    return data

# =============== ATHLETE CHARACTERIZATION ===============
class AthleteCharacterizationCreate(BaseModel):
    athlete_id: Optional[str] = None
    name: str = ''
    experience: str = ''
    age: str = ''
    position: str = ''
    level: str = ''
    observation: str = ''
    inheritance: str = ''
    biologicalAge: str = ''
    optimalSelectionAge: str = ''
    healthStatus: str = ''
    anthropometricParams: str = ''
    physicalQualities: str = ''
    cognitiveCapabilities: str = ''
    psychologicalCharacteristics: str = ''
    socioeconomicCharacteristics: str = ''
    environment: str = ''
    nutritionalStatus: str = ''
    sportsTrajectory: str = ''
    otherSportsExperience: str = ''
    previousSeasonPerformance: str = ''
    objectives: str = ''
    trainingLevels: str = ''
    currentForm: str = ''
    injuries: str = ''

@api_router.post("/characterization/athlete")
async def save_athlete_characterization(data: AthleteCharacterizationCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.athlete_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.athlete_characterization.update_one(
            {"id": existing["id"]},
            {"$set": {**data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Characterization updated", "id": existing["id"]}
    else:
        await db.athlete_characterization.insert_one(doc)
        return {"message": "Characterization saved", "id": doc_id}

@api_router.get("/characterization/athlete/{athlete_id}")
async def get_athlete_characterization(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.athlete_characterization.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Characterization not found")
    
    return data

# =============== HEALTH RECORDS ===============
class HealthRecordCreate(BaseModel):
    athlete_id: Optional[str] = None
    type: str = ''
    description: str = ''
    dosage: str = ''
    frequency: str = ''
    affectedArea: str = ''
    date: str = ''
    treatment: str = ''
    severity: str = ''
    status: str = 'active'
    notes: str = ''

@api_router.post("/health/records")
async def create_health_record(data: HealthRecordCreate, user: dict = Depends(get_current_user)):
    record_id = str(uuid.uuid4())
    doc = {
        "id": record_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.health_records.insert_one(doc)
    return {"message": "Record created", "id": record_id}

@api_router.get("/health/records/{athlete_id}")
async def get_health_records(athlete_id: str, type: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }
    if type:
        query["type"] = type
    
    records = await db.health_records.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return records

@api_router.delete("/health/records/{record_id}")
async def delete_health_record(record_id: str, user: dict = Depends(get_current_user)):
    result = await db.health_records.delete_one({
        "id": record_id,
        "coach_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}

# =============== COMPETITION ANALYSIS ===============
class CompetitionAnalysisCreate(BaseModel):
    athlete_id: Optional[str] = None
    name: str = ''
    type: str = ''
    category: str = ''
    date: str = ''
    result: str = ''
    objective: str = ''
    competitionFormat: str = ''
    location: str = ''
    duration: str = ''
    opponents: str = ''
    observations: str = ''
    preparationPhase: str = ''
    keyPerformanceIndicators: str = ''
    recoveryStrategy: str = ''
    status: str = 'pending'

@api_router.post("/competitions/analysis")
async def create_competition_analysis(data: CompetitionAnalysisCreate, user: dict = Depends(get_current_user)):
    comp_id = str(uuid.uuid4())
    doc = {
        "id": comp_id,
        "coach_id": user["id"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.competition_analysis.insert_one(doc)
    return {"message": "Competition created", "id": comp_id}

@api_router.get("/competitions/analysis/{athlete_id}")
async def get_competition_analysis(athlete_id: str, user: dict = Depends(get_current_user)):
    comps = await db.competition_analysis.find({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0}).to_list(100)
    return comps

@api_router.delete("/competitions/analysis/{comp_id}")
async def delete_competition_analysis(comp_id: str, user: dict = Depends(get_current_user)):
    result = await db.competition_analysis.delete_one({
        "id": comp_id,
        "coach_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competition not found")
    return {"message": "Competition deleted"}

# =============== TRAINING STAGES (PERIODIZATION) ===============
class TrainingStageData(BaseModel):
    duration: str = ''
    volume: str = ''
    intensity: str = ''
    focus: str = ''
    objective: str = ''
    keyPoints: List[str] = []

class TrainingStagesCreate(BaseModel):
    athlete_id: Optional[str] = None
    stages: Dict[str, TrainingStageData] = {}

@api_router.post("/training-stages")
async def save_training_stages(data: TrainingStagesCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    
    # Convert stages to dict for MongoDB
    stages_dict = {}
    for key, stage in data.stages.items():
        stages_dict[key] = stage.model_dump() if hasattr(stage, 'model_dump') else dict(stage)
    
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "athlete_id": data.athlete_id,
        "stages": stages_dict,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.training_stages.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.training_stages.update_one(
            {"id": existing["id"]},
            {"$set": {"stages": stages_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Training stages updated", "id": existing["id"]}
    else:
        await db.training_stages.insert_one(doc)
        return {"message": "Training stages saved", "id": doc_id}

@api_router.get("/training-stages/{athlete_id}")
async def get_training_stages(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.training_stages.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Training stages not found")
    
    return data

# =============== PERIODIZATION MODELS ===============
class PeriodizationModelsCreate(BaseModel):
    athlete_id: Optional[str] = None
    planData: Dict[str, Any] = {}
    selectedModel: str = 'traditional'

@api_router.post("/periodization-models")
async def save_periodization_models(data: PeriodizationModelsCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "athlete_id": data.athlete_id,
        "planData": data.planData,
        "selectedModel": data.selectedModel,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.periodization_models.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.periodization_models.update_one(
            {"id": existing["id"]},
            {"$set": {"planData": data.planData, "selectedModel": data.selectedModel, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Periodization model updated", "id": existing["id"]}
    else:
        await db.periodization_models.insert_one(doc)
        return {"message": "Periodization model saved", "id": doc_id}

@api_router.get("/periodization-models/{athlete_id}")
async def get_periodization_models(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.periodization_models.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Periodization model not found")
    
    return data

# =============== COMPREHENSIVE TRAINING PLAN ===============
class ComprehensivePlanCreate(BaseModel):
    athlete_id: Optional[str] = None
    planData: Dict[str, Any] = {}
    planType: str = 'individual'

@api_router.post("/comprehensive-plan")
async def save_comprehensive_plan(data: ComprehensivePlanCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "athlete_id": data.athlete_id,
        "planData": data.planData,
        "planType": data.planType,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.comprehensive_plans.find_one({
        "coach_id": user["id"],
        "athlete_id": data.athlete_id
    })
    
    if existing:
        await db.comprehensive_plans.update_one(
            {"id": existing["id"]},
            {"$set": {"planData": data.planData, "planType": data.planType, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Comprehensive plan updated", "id": existing["id"]}
    else:
        await db.comprehensive_plans.insert_one(doc)
        return {"message": "Comprehensive plan saved", "id": doc_id}

@api_router.get("/comprehensive-plan/{athlete_id}")
async def get_comprehensive_plan(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.comprehensive_plans.find_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id
    }, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Comprehensive plan not found")
    
    return data

# =============== TRAINING METHODS ===============
class TrainingMethodsCreate(BaseModel):
    methods: Dict[str, Any] = {}

@api_router.post("/training-methods")
async def save_training_methods(data: TrainingMethodsCreate, user: dict = Depends(get_current_user)):
    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "coach_id": user["id"],
        "methods": data.methods,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    existing = await db.training_methods.find_one({"coach_id": user["id"]})
    
    if existing:
        await db.training_methods.update_one(
            {"id": existing["id"]},
            {"$set": {"methods": data.methods, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Training methods updated", "id": existing["id"]}
    else:
        await db.training_methods.insert_one(doc)
        return {"message": "Training methods saved", "id": doc_id}

@api_router.get("/training-methods")
async def get_training_methods(user: dict = Depends(get_current_user)):
    data = await db.training_methods.find_one({"coach_id": user["id"]}, {"_id": 0})
    
    if not data:
        raise HTTPException(status_code=404, detail="Training methods not found")
    
    return data

# =============== ANTHROPOMETRIC DATA ===============
class AnthropometricCreate(BaseModel):
    athlete_id: Optional[str] = None
    records: List[Dict[str, Any]] = []

@api_router.post("/anthropometric")
async def save_anthropometric(data: AnthropometricCreate, user: dict = Depends(get_current_user)):
    existing = await db.anthropometric.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.anthropometric.update_one(
            {"id": existing["id"]},
            {"$set": {"records": data.records, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Anthropometric data updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.anthropometric.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "records": data.records,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Anthropometric data saved", "id": doc_id}

@api_router.get("/anthropometric/{athlete_id}")
async def get_anthropometric(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.anthropometric.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No anthropometric data found")
    return data

# =============== TEST EVALUATIONS ===============
class TestEvaluationsCreate(BaseModel):
    athlete_id: Optional[str] = None
    evaluations: List[Dict[str, Any]] = []

@api_router.post("/test-evaluations")
async def save_test_evaluations(data: TestEvaluationsCreate, user: dict = Depends(get_current_user)):
    existing = await db.test_evaluations.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.test_evaluations.update_one(
            {"id": existing["id"]},
            {"$set": {"evaluations": data.evaluations, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Test evaluations updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.test_evaluations.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "evaluations": data.evaluations,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Test evaluations saved", "id": doc_id}

@api_router.get("/test-evaluations/{athlete_id}")
async def get_test_evaluations(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.test_evaluations.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No test evaluations found")
    return data

# =============== TRAINING LOAD ===============
class TrainingLoadCreate(BaseModel):
    athlete_id: Optional[str] = None
    records: List[Dict[str, Any]] = []

@api_router.post("/training-load")
async def save_training_load(data: TrainingLoadCreate, user: dict = Depends(get_current_user)):
    existing = await db.training_load.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.training_load.update_one(
            {"id": existing["id"]},
            {"$set": {"records": data.records, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Training load updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.training_load.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "records": data.records,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Training load saved", "id": doc_id}

@api_router.get("/training-load/{athlete_id}")
async def get_training_load(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.training_load.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No training load data found")
    return data

# =============== EVENTS CALENDAR ===============
class EventsCalendarCreate(BaseModel):
    athlete_id: Optional[str] = None
    events: List[Dict[str, Any]] = []

@api_router.post("/events-calendar")
async def save_events_calendar(data: EventsCalendarCreate, user: dict = Depends(get_current_user)):
    existing = await db.events_calendar.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    if existing:
        await db.events_calendar.update_one({"id": existing["id"]}, {"$set": {"events": data.events, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Events updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.events_calendar.insert_one({"id": doc_id, "coach_id": user["id"], "athlete_id": data.athlete_id, "events": data.events, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"message": "Events saved", "id": doc_id}

@api_router.get("/events-calendar/{athlete_id}")
async def get_events_calendar(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.events_calendar.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No events found")
    return data

# =============== OBJECTIVES & INDICATORS ===============
class ObjectivesCreate(BaseModel):
    athlete_id: Optional[str] = None
    objectives: List[Dict[str, Any]] = []

@api_router.post("/objectives")
async def save_objectives(data: ObjectivesCreate, user: dict = Depends(get_current_user)):
    existing = await db.objectives.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    if existing:
        await db.objectives.update_one({"id": existing["id"]}, {"$set": {"objectives": data.objectives, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Objectives updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.objectives.insert_one({"id": doc_id, "coach_id": user["id"], "athlete_id": data.athlete_id, "objectives": data.objectives, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"message": "Objectives saved", "id": doc_id}

@api_router.get("/objectives/{athlete_id}")
async def get_objectives(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.objectives.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No objectives found")
    return data

# =============== TRAINING CONTROL ===============
class TrainingControlCreate(BaseModel):
    athlete_id: Optional[str] = None
    records: List[Dict[str, Any]] = []

@api_router.post("/training-control")
async def save_training_control(data: TrainingControlCreate, user: dict = Depends(get_current_user)):
    existing = await db.training_control.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    if existing:
        await db.training_control.update_one({"id": existing["id"]}, {"$set": {"records": data.records, "updated_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Control updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.training_control.insert_one({"id": doc_id, "coach_id": user["id"], "athlete_id": data.athlete_id, "records": data.records, "created_at": datetime.now(timezone.utc).isoformat()})
        return {"message": "Control saved", "id": doc_id}

@api_router.get("/training-control/{athlete_id}")
async def get_training_control(athlete_id: str, user: dict = Depends(get_current_user)):
    data = await db.training_control.find_one({"coach_id": user["id"], "athlete_id": athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No control data found")
    return data

# =============== GRAPHIC PLAN ===============
class GraphicPlanCreate(BaseModel):
    athlete_id: Optional[str] = None
    generalInfo: Dict[str, Any] = {}
    planData: Dict[str, Any] = {}
    cycleDuration: str = 'annual'

@api_router.post("/graphic-plan")
async def save_graphic_plan(data: GraphicPlanCreate, user: dict = Depends(get_current_user)):
    existing = await db.graphic_plans.find_one({"coach_id": user["id"], "athlete_id": data.athlete_id})
    
    if existing:
        await db.graphic_plans.update_one(
            {"id": existing["id"]},
            {"$set": {
                "generalInfo": data.generalInfo,
                "planData": data.planData,
                "cycleDuration": data.cycleDuration,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Graphic plan updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.graphic_plans.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": data.athlete_id,
            "generalInfo": data.generalInfo,
            "planData": data.planData,
            "cycleDuration": data.cycleDuration,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Graphic plan saved", "id": doc_id}

@api_router.get("/graphic-plan/{athlete_id}")
async def get_graphic_plan(athlete_id: str, user: dict = Depends(get_current_user)):
    # Handle "null" string as None
    query_athlete_id = None if athlete_id in ["null", "undefined", ""] else athlete_id
    data = await db.graphic_plans.find_one({"coach_id": user["id"], "athlete_id": query_athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No graphic plan found")
    return data

# =============== PERIODIZATION PLAN (Hierarchical) ===============
class PeriodizationPlanCreate(BaseModel):
    athlete_id: Optional[str] = None
    macrociclo: Dict[str, Any] = {}
    mesociclos: List[Dict[str, Any]] = []
    microciclos: List[Dict[str, Any]] = []
    sesiones: List[Dict[str, Any]] = []

@api_router.post("/periodization-plan")
async def save_periodization_plan(data: PeriodizationPlanCreate, user: dict = Depends(get_current_user)):
    athlete_id = None if data.athlete_id in ["null", "undefined", "", "default"] else data.athlete_id
    existing = await db.periodization_plans.find_one({"coach_id": user["id"], "athlete_id": athlete_id})
    
    if existing:
        await db.periodization_plans.update_one(
            {"id": existing["id"]},
            {"$set": {
                "macrociclo": data.macrociclo,
                "mesociclos": data.mesociclos,
                "microciclos": data.microciclos,
                "sesiones": data.sesiones,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Periodization plan updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.periodization_plans.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "athlete_id": athlete_id,
            "macrociclo": data.macrociclo,
            "mesociclos": data.mesociclos,
            "microciclos": data.microciclos,
            "sesiones": data.sesiones,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Periodization plan saved", "id": doc_id}

@api_router.get("/periodization-plan/{athlete_id}")
async def get_periodization_plan(athlete_id: str, user: dict = Depends(get_current_user)):
    query_athlete_id = None if athlete_id in ["null", "undefined", "", "default"] else athlete_id
    data = await db.periodization_plans.find_one({"coach_id": user["id"], "athlete_id": query_athlete_id}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No periodization plan found")
    return data

# =============== EXERCISE LIBRARY ===============
class ExerciseLibraryCreate(BaseModel):
    categories: Dict[str, Any] = {}

# =============== PERIODIZATION SYSTEM (AUTO-GENERATION) ===============
class PeriodizationCreate(BaseModel):
    id: str
    name: str
    athleteId: Optional[str] = None
    startDate: str
    endDate: str
    duration: str
    totalWeeks: int
    mainCompetition: Optional[str] = None
    mainCompetitionDate: Optional[str] = None
    sessionsPerWeek: int
    model: str
    phases: List[Dict[str, Any]] = []
    mesocycles: List[Dict[str, Any]] = []
    createdAt: str

@api_router.post("/periodization")
async def save_periodization(data: PeriodizationCreate, user: dict = Depends(get_current_user)):
    athlete_id = None if data.athleteId in ["null", "undefined", "", "default", None] else data.athleteId
    existing = await db.periodizations.find_one({"coach_id": user["id"], "athlete_id": athlete_id})
    
    doc = {
        "periodization_id": data.id,
        "coach_id": user["id"],
        "athlete_id": athlete_id,
        "name": data.name,
        "start_date": data.startDate,
        "end_date": data.endDate,
        "duration": data.duration,
        "total_weeks": data.totalWeeks,
        "main_competition": data.mainCompetition,
        "main_competition_date": data.mainCompetitionDate,
        "sessions_per_week": data.sessionsPerWeek,
        "model": data.model,
        "phases": data.phases,
        "mesocycles": data.mesocycles,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.periodizations.update_one(
            {"id": existing["id"]},
            {"$set": doc}
        )
        return {"message": "Periodization updated", "id": existing["id"]}
    else:
        doc["id"] = str(uuid.uuid4())
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.periodizations.insert_one(doc)
        return {"message": "Periodization saved", "id": doc["id"]}

@api_router.get("/periodization/{athlete_id}")
async def get_periodization(athlete_id: str, user: dict = Depends(get_current_user)):
    query_athlete_id = None if athlete_id in ["null", "undefined", "", "default"] else athlete_id
    data = await db.periodizations.find_one(
        {"coach_id": user["id"], "athlete_id": query_athlete_id}, 
        {"_id": 0}
    )
    if not data:
        return None  # Return null instead of 404 to allow frontend to handle empty state
    return data

@api_router.delete("/periodization/{athlete_id}/{plan_id}")
async def delete_periodization(athlete_id: str, plan_id: str, user: dict = Depends(get_current_user)):
    """Elimina un plan de periodización específico"""
    result = await db.periodizations.delete_one({
        "coach_id": user["id"],
        "athlete_id": athlete_id,
        "periodization_id": plan_id
    })
    
    if result.deleted_count == 0:
        # Try with id field as fallback
        result = await db.periodizations.delete_one({
            "coach_id": user["id"],
            "athlete_id": athlete_id,
            "id": plan_id
        })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"message": "Periodization deleted successfully"}

@api_router.get("/periodization-all/{athlete_id}")
async def get_all_periodizations(athlete_id: str, user: dict = Depends(get_current_user)):
    """Obtiene todos los planes de periodización de un atleta"""
    query_athlete_id = None if athlete_id in ["null", "undefined", "", "default"] else athlete_id
    cursor = db.periodizations.find(
        {"coach_id": user["id"], "athlete_id": query_athlete_id}, 
        {"_id": 0}
    )
    plans = await cursor.to_list(100)
    return plans

@api_router.post("/exercise-library")
async def save_exercise_library(data: ExerciseLibraryCreate, user: dict = Depends(get_current_user)):
    existing = await db.exercise_libraries.find_one({"coach_id": user["id"]})
    
    if existing:
        await db.exercise_libraries.update_one(
            {"id": existing["id"]},
            {"$set": {
                "categories": data.categories,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Exercise library updated", "id": existing["id"]}
    else:
        doc_id = str(uuid.uuid4())
        await db.exercise_libraries.insert_one({
            "id": doc_id,
            "coach_id": user["id"],
            "categories": data.categories,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        return {"message": "Exercise library saved", "id": doc_id}

@api_router.get("/exercise-library")
async def get_exercise_library(user: dict = Depends(get_current_user)):
    data = await db.exercise_libraries.find_one({"coach_id": user["id"]}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="No exercise library found")
    return data

# =============== ROOT & HEALTH ===============
@api_router.get("/")
async def root():
    return {"message": "Sistema TRAIN API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
