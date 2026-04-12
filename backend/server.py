from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
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
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
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

# =============== TOURNAMENT ENUMS ===============
class TournamentFormat(str, Enum):
    SINGLE_ELIMINATION = "single_elimination"  # Eliminación directa
    DOUBLE_ELIMINATION = "double_elimination"  # Doble eliminación
    ROUND_ROBIN = "round_robin"  # Todos contra todos
    SWISS_SYSTEM = "swiss_system"  # Sistema suizo
    GROUP_STAGE_KNOCKOUT = "group_stage_knockout"  # Fase de grupos + eliminación
    LEAGUE = "league"  # Liga con puntos
    CONSOLATION = "consolation"  # Con repechaje
    MCMAHON = "mcmahon"  # Sistema McMahon (Go, Chess)
    CUSTOM = "custom"  # Personalizado

class TournamentStatus(str, Enum):
    DRAFT = "draft"  # Borrador
    REGISTRATION = "registration"  # Inscripciones abiertas
    SEEDING = "seeding"  # Sembrando participantes
    IN_PROGRESS = "in_progress"  # En curso
    COMPLETED = "completed"  # Finalizado
    CANCELLED = "cancelled"  # Cancelado

class MatchStatus(str, Enum):
    SCHEDULED = "scheduled"  # Programado
    IN_PROGRESS = "in_progress"  # En curso
    COMPLETED = "completed"  # Finalizado
    WALKOVER = "walkover"  # W.O.
    POSTPONED = "postponed"  # Pospuesto
    CANCELLED = "cancelled"  # Cancelado

class ScoringSystem(str, Enum):
    STANDARD = "standard"  # 3-1-0 (win-draw-loss)
    OLYMPIC = "olympic"  # Según deporte olímpico
    FIFA = "fifa"  # Sistema FIFA
    FIBA = "fiba"  # Sistema FIBA
    ITF = "itf"  # Sistema ITF (Tenis)
    FIVB = "fivb"  # Sistema FIVB (Voleibol)
    CUSTOM = "custom"  # Personalizado

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
    sport: str = "other"  # Dynamic sport from catalog
    age: int
    level: str
    notes: Optional[str] = None
    # Afiliaciones a entidades
    affiliations: Optional[List[str]] = []  # Lista de IDs de entidades
    team_id: Optional[str] = None  # Team affiliation

class AthleteResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    coach_id: str
    name: str
    email: Optional[str] = None
    sport: str = "other"
    age: int
    level: str
    notes: Optional[str] = None
    affiliations: Optional[List[str]] = []
    team_id: Optional[str] = None
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

# =============== PLAN DATA MODELS (Datos vinculados al plan) ===============

class PlanObjectiveCreate(BaseModel):
    """Objetivos del plan de entrenamiento"""
    plan_id: str
    main_objective: str = ""
    secondary_objectives: List[str] = []
    performance_indicators: List[dict] = []
    timeline: Optional[str] = None
    data: dict = {}

class PlanObjectiveResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    plan_id: str
    user_id: str
    main_objective: str = ""
    secondary_objectives: List[str] = []
    performance_indicators: List[dict] = []
    timeline: Optional[str] = None
    data: dict = {}
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PlanEvaluationCreate(BaseModel):
    """Evaluaciones vinculadas a un plan"""
    plan_id: str
    athlete_id: Optional[str] = None
    evaluation_type: str  # anthropometric, biomechanical, medical, physical, technical, tactical, psychological, theoretical
    date: str
    results: dict = {}  # Resultados flexibles según tipo
    notes: Optional[str] = None

class PlanEvaluationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    plan_id: str
    user_id: str
    athlete_id: Optional[str] = None
    evaluation_type: str
    date: str
    results: dict = {}
    notes: Optional[str] = None
    created_at: Optional[str] = None

class PlanCompetitionCreate(BaseModel):
    """Competencias vinculadas a un plan"""
    plan_id: str
    name: str
    date: str
    importance: str = "secondary"  # main, secondary, preparatory
    location: Optional[str] = None
    expected_result: Optional[str] = None
    notes: Optional[str] = None

class PlanCompetitionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    plan_id: str
    user_id: str
    name: str
    date: str
    importance: str = "secondary"
    location: Optional[str] = None
    expected_result: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None

class PlanPreviousAnalysisCreate(BaseModel):
    """Análisis del plan anterior"""
    plan_id: str
    previous_plan_summary: Optional[str] = None
    achievements: List[str] = []
    areas_to_improve: List[str] = []
    lessons_learned: List[str] = []
    athlete_feedback: Optional[str] = None
    data: dict = {}

class PlanPreviousAnalysisResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    plan_id: str
    user_id: str
    previous_plan_summary: Optional[str] = None
    achievements: List[str] = []
    areas_to_improve: List[str] = []
    lessons_learned: List[str] = []
    athlete_feedback: Optional[str] = None
    data: dict = {}
    created_at: Optional[str] = None

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

# =============== TOURNAMENT MODELS ===============
class TournamentCategoryCreate(BaseModel):
    """Categoría dentro de un torneo (ej: Sub-15, Sub-17, Senior)"""
    name: str
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    gender: Optional[str] = None  # male, female, mixed
    weight_class: Optional[str] = None  # Para deportes de combate
    division: Optional[str] = None  # Primera, Segunda, etc.
    max_participants: Optional[int] = None

class TournamentCreate(BaseModel):
    """Crear un nuevo torneo/evento"""
    name: str
    description: Optional[str] = None
    sport: str
    format: TournamentFormat
    status: TournamentStatus = TournamentStatus.DRAFT
    
    # Fechas
    start_date: str
    end_date: str
    registration_deadline: Optional[str] = None
    
    # Ubicación
    venue: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    
    # Afiliaciones a entidades
    federation_id: Optional[str] = None
    club_id: Optional[str] = None
    school_id: Optional[str] = None
    organizing_entity_id: Optional[str] = None
    
    # Configuración
    scoring_system: ScoringSystem = ScoringSystem.STANDARD
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0
    
    # Fase de grupos (si aplica)
    groups_count: Optional[int] = None
    teams_per_group: Optional[int] = None
    advance_per_group: Optional[int] = None
    
    # Reglas
    rules: Optional[str] = None
    regulations_url: Optional[str] = None
    
    # Categorías
    categories: List[TournamentCategoryCreate] = []
    
    # Visual
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#10B981"

class TournamentCategoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tournament_id: str
    name: str
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    gender: Optional[str] = None
    weight_class: Optional[str] = None
    division: Optional[str] = None
    max_participants: Optional[int] = None
    participants: List[str] = []  # IDs de equipos o atletas
    bracket: Optional[Dict[str, Any]] = None
    standings: Optional[List[Dict[str, Any]]] = None
    created_at: str

class TournamentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    coach_id: str
    name: str
    description: Optional[str] = None
    sport: str
    format: TournamentFormat
    status: TournamentStatus
    
    start_date: str
    end_date: str
    registration_deadline: Optional[str] = None
    
    venue: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    
    federation_id: Optional[str] = None
    club_id: Optional[str] = None
    school_id: Optional[str] = None
    organizing_entity_id: Optional[str] = None
    
    scoring_system: ScoringSystem = ScoringSystem.STANDARD
    points_win: int = 3
    points_draw: int = 1
    points_loss: int = 0
    
    groups_count: Optional[int] = None
    teams_per_group: Optional[int] = None
    advance_per_group: Optional[int] = None
    
    rules: Optional[str] = None
    regulations_url: Optional[str] = None
    
    categories: List[TournamentCategoryResponse] = []
    
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    primary_color: str = "#3B82F6"
    secondary_color: str = "#10B981"
    
    share_id: Optional[str] = None
    created_at: str

class MatchCreate(BaseModel):
    """Crear un partido/encuentro"""
    tournament_id: str
    category_id: str
    round_number: int  # Ronda (1, 2, 3... o cuartos, semis, final)
    round_name: Optional[str] = None  # "Cuartos de Final", "Semifinal", etc.
    match_number: int  # Número de partido en la ronda
    
    participant1_id: Optional[str] = None  # ID de equipo o atleta
    participant1_name: Optional[str] = None
    participant2_id: Optional[str] = None
    participant2_name: Optional[str] = None
    
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    venue: Optional[str] = None
    court: Optional[str] = None  # Cancha, pista, etc.
    
    # Para bracket
    bracket_position: Optional[int] = None  # Posición en el bracket
    winner_goes_to: Optional[str] = None  # ID del siguiente partido
    loser_goes_to: Optional[str] = None  # Para doble eliminación

class MatchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tournament_id: str
    category_id: str
    round_number: int
    round_name: Optional[str] = None
    match_number: int
    
    participant1_id: Optional[str] = None
    participant1_name: Optional[str] = None
    participant1_score: Optional[int] = None
    participant1_sets: Optional[List[int]] = None  # Para deportes con sets
    
    participant2_id: Optional[str] = None
    participant2_name: Optional[str] = None
    participant2_score: Optional[int] = None
    participant2_sets: Optional[List[int]] = None
    
    winner_id: Optional[str] = None
    winner_name: Optional[str] = None
    
    status: MatchStatus = MatchStatus.SCHEDULED
    
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    actual_start_time: Optional[str] = None
    actual_end_time: Optional[str] = None
    
    venue: Optional[str] = None
    court: Optional[str] = None
    
    bracket_position: Optional[int] = None
    winner_goes_to: Optional[str] = None
    loser_goes_to: Optional[str] = None
    
    notes: Optional[str] = None
    created_at: str

class MatchScoreUpdate(BaseModel):
    """Actualizar resultado de un partido"""
    participant1_score: Optional[int] = None
    participant2_score: Optional[int] = None
    participant1_sets: Optional[List[int]] = None
    participant2_sets: Optional[List[int]] = None
    winner_id: Optional[str] = None
    status: Optional[MatchStatus] = None
    notes: Optional[str] = None

class ParticipantRegistration(BaseModel):
    """Inscribir participante en categoría"""
    participant_type: str  # "team" or "athlete"
    participant_id: str
    participant_name: str
    seed: Optional[int] = None  # Cabeza de serie

# =============== TRAINING PLAN MODELS ===============
class TrainingPlanSession(BaseModel):
    id: str = ""
    day: int  # 1-7
    name: str
    session_type: str
    duration_minutes: int = 60
    intensity: int = 70  # 0-100
    volume: int = 100
    objectives: List[str] = []
    exercises: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    detailed_data: Optional[Dict[str, Any]] = None

class TrainingPlanMicrocycle(BaseModel):
    id: str = ""
    name: str
    week_number: int
    type: str  # corriente, carga, choque, competitivo, aproximacion, restablecimiento
    load_percent: int = 70
    volume: int = 100
    intensity: int = 70
    sessions: List[TrainingPlanSession] = []
    objectives: List[str] = []
    notes: Optional[str] = None

class TrainingPlanMesocycle(BaseModel):
    id: str = ""
    name: str
    type: str  # entrante, basico_desarrollador, basico_estabilizador, precompetitivo, competitivo, recuperacion
    phase: str
    weeks: int = 4
    load_factor: float = 1.0
    volume_percent: int = 100
    intensity_percent: int = 70
    microcycles: List[TrainingPlanMicrocycle] = []
    objectives: List[str] = []
    notes: Optional[str] = None

class TrainingPlanMacrocycle(BaseModel):
    id: str = ""
    name: str
    phase: str  # prep_general, prep_specific, precompetitive, competitive, transition
    start_date: str
    end_date: str
    weeks: int = 4
    volume_percent: int = 85
    intensity_percent: int = 55
    mesocycles: List[TrainingPlanMesocycle] = []
    objectives: List[str] = []
    notes: Optional[str] = None

class TrainingPlanCreate(BaseModel):
    """Complete Training Plan with all structure"""
    name: str
    athlete_id: Optional[str] = None
    sport: str
    model: str  # periodization model
    duration_type: str  # annual, semester, etc
    total_weeks: int
    start_date: str
    sessions_per_week: int = 5
    main_objective: str = ""
    main_competition: Optional[str] = None
    main_competition_date: Optional[str] = None
    macrocycles: List[TrainingPlanMacrocycle] = []

class TrainingPlanResponse(BaseModel):
    id: str
    coach_id: str
    name: str
    athlete_id: Optional[str] = None
    sport: str
    model: str
    model_name: str
    duration_type: str
    total_weeks: int
    start_date: str
    end_date: str
    sessions_per_week: int
    main_objective: str
    main_competition: Optional[str] = None
    main_competition_date: Optional[str] = None
    macrocycles: List[Dict[str, Any]] = []
    status: str = "active"
    share_token: Optional[str] = None
    created_at: str
    updated_at: str

class LoadCalculationRequest(BaseModel):
    """Request for scientific load calculations"""
    calculation_type: str  # "1rm", "zones", "volume_distribution", "intensity_zones"
    params: Dict[str, Any]

class LoadCalculationResponse(BaseModel):
    result: Dict[str, Any]
    formula_used: str
    explanation: str

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
    SubscriptionPlan.FREE: {"athletes": 3, "plans": 1, "ai_generations": 3, "pdf_exports": 10},
    SubscriptionPlan.BASIC: {"athletes": 20, "plans": 5, "ai_generations": 20, "pdf_exports": 999},
    SubscriptionPlan.PRO: {"athletes": 999, "plans": 999, "ai_generations": 100, "pdf_exports": 999},
    SubscriptionPlan.ENTERPRISE: {"athletes": 999, "plans": 999, "ai_generations": 999, "pdf_exports": 999}
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

# =============== TRAINING PLANS CRUD ===============
PERIODIZATION_MODELS_INFO = {
    "traditional": {"name": "Tradicional (Matveiev)", "category": "classic"},
    "atr": {"name": "ATR (Issurin)", "category": "classic"},
    "blocks": {"name": "Bloques Concentrados (Verkhoshansky)", "category": "classic"},
    "undulating_daily": {"name": "Ondulatorio Diario (DUP)", "category": "undulating"},
    "undulating_weekly": {"name": "Ondulatorio Semanal (WUP)", "category": "undulating"},
    "flexible_nonlinear": {"name": "No Lineal Flexible (Kraemer)", "category": "undulating"},
    "conjugate": {"name": "Conjugado (Westside/Simmons)", "category": "contemporary"},
    "triphasic": {"name": "Trifásico (Dietz)", "category": "contemporary"},
    "vertical_integration": {"name": "Integración Vertical (Francis)", "category": "contemporary"},
    "french_contrast": {"name": "Contraste Francés", "category": "contemporary"},
    "tactical": {"name": "Periodización Táctica (Frade)", "category": "sport_specific"},
    "reverse_linear": {"name": "Lineal Inversa", "category": "sport_specific"},
    "concurrent": {"name": "Concurrente", "category": "sport_specific"},
    "polarized": {"name": "Polarizado (Seiler)", "category": "sport_specific"},
    "cybernetic": {"name": "Cibernético (Bondarchuk)", "category": "advanced"},
    "pendulum": {"name": "Péndulo (Arosiev/Kalinin)", "category": "advanced"},
    "sequential": {"name": "Secuencial (Tschiene)", "category": "advanced"}
}

# =============== SPORT CONFIGURATIONS ===============
SPORT_CONFIGS = {
    # Deportes de Fuerza/Potencia
    "powerlifting": {
        "name": "Powerlifting", "category": "strength",
        "prep_ratio": 0.60, "comp_ratio": 0.30, "trans_ratio": 0.10,
        "sessions_per_week": 4, "intensity_focus": True,
        "primary_qualities": ["fuerza_maxima", "potencia"],
        "recommended_models": ["traditional", "blocks", "conjugate"]
    },
    "weightlifting": {
        "name": "Halterofilia", "category": "strength",
        "prep_ratio": 0.55, "comp_ratio": 0.35, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "tecnica", "fuerza_maxima"],
        "recommended_models": ["traditional", "blocks", "atr"]
    },
    "bodybuilding": {
        "name": "Culturismo", "category": "strength",
        "prep_ratio": 0.70, "comp_ratio": 0.20, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["hipertrofia", "definicion"],
        "recommended_models": ["undulating_daily", "concurrent"]
    },
    # Deportes de Resistencia
    "marathon": {
        "name": "Maratón", "category": "endurance",
        "prep_ratio": 0.65, "comp_ratio": 0.25, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": False,
        "primary_qualities": ["resistencia_aerobica", "umbral_anaerobico"],
        "recommended_models": ["traditional", "polarized", "reverse_linear"]
    },
    "triathlon": {
        "name": "Triatlón", "category": "endurance",
        "prep_ratio": 0.60, "comp_ratio": 0.30, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": False,
        "primary_qualities": ["resistencia_aerobica", "transiciones", "fuerza_resistencia"],
        "recommended_models": ["polarized", "concurrent", "atr"]
    },
    "cycling": {
        "name": "Ciclismo", "category": "endurance",
        "prep_ratio": 0.60, "comp_ratio": 0.30, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["resistencia_aerobica", "potencia", "umbral"],
        "recommended_models": ["polarized", "traditional", "atr"]
    },
    "swimming": {
        "name": "Natación", "category": "endurance",
        "prep_ratio": 0.55, "comp_ratio": 0.35, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["tecnica", "resistencia", "velocidad"],
        "recommended_models": ["traditional", "atr", "blocks"]
    },
    # Deportes de Velocidad/Sprint
    "sprints": {
        "name": "Velocidad (100m-400m)", "category": "speed",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["velocidad", "potencia", "tecnica"],
        "recommended_models": ["vertical_integration", "blocks", "atr"]
    },
    "athletics_jumps": {
        "name": "Saltos (Largo/Triple/Alto)", "category": "speed",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia_explosiva", "tecnica", "velocidad"],
        "recommended_models": ["blocks", "triphasic", "french_contrast"]
    },
    "athletics_throws": {
        "name": "Lanzamientos", "category": "speed",
        "prep_ratio": 0.55, "comp_ratio": 0.35, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "fuerza_maxima", "tecnica"],
        "recommended_models": ["blocks", "conjugate", "traditional"]
    },
    # Deportes de Equipo
    "football": {
        "name": "Fútbol", "category": "team",
        "prep_ratio": 0.25, "comp_ratio": 0.65, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["resistencia_intermitente", "velocidad", "agilidad"],
        "recommended_models": ["tactical", "undulating_weekly", "concurrent"]
    },
    "basketball": {
        "name": "Baloncesto", "category": "team",
        "prep_ratio": 0.30, "comp_ratio": 0.60, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["potencia", "agilidad", "resistencia_intermitente"],
        "recommended_models": ["undulating_weekly", "concurrent", "tactical"]
    },
    "volleyball": {
        "name": "Voleibol", "category": "team",
        "prep_ratio": 0.30, "comp_ratio": 0.60, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia_salto", "velocidad_reaccion", "tecnica"],
        "recommended_models": ["undulating_weekly", "blocks", "concurrent"]
    },
    "handball": {
        "name": "Balonmano", "category": "team",
        "prep_ratio": 0.30, "comp_ratio": 0.60, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["potencia", "resistencia", "agilidad"],
        "recommended_models": ["tactical", "undulating_weekly", "concurrent"]
    },
    "rugby": {
        "name": "Rugby", "category": "team",
        "prep_ratio": 0.35, "comp_ratio": 0.55, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": False,
        "primary_qualities": ["fuerza", "potencia", "resistencia"],
        "recommended_models": ["concurrent", "undulating_weekly", "conjugate"]
    },
    # Deportes de Combate
    "boxing": {
        "name": "Boxeo", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["potencia", "resistencia_especifica", "velocidad"],
        "recommended_models": ["atr", "blocks", "traditional"]
    },
    "mma": {
        "name": "MMA/Artes Marciales Mixtas", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["resistencia_mixta", "potencia", "tecnica"],
        "recommended_models": ["concurrent", "atr", "blocks"]
    },
    "judo": {
        "name": "Judo", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "fuerza_agarre", "tecnica"],
        "recommended_models": ["atr", "blocks", "traditional"]
    },
    "wrestling": {
        "name": "Lucha", "category": "combat",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 6, "intensity_focus": True,
        "primary_qualities": ["fuerza_resistencia", "potencia", "tecnica"],
        "recommended_models": ["atr", "traditional", "blocks"]
    },
    # Deportes de Raqueta
    "tennis": {
        "name": "Tenis", "category": "racquet",
        "prep_ratio": 0.35, "comp_ratio": 0.55, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["potencia", "agilidad", "resistencia_intermitente"],
        "recommended_models": ["undulating_weekly", "concurrent", "atr"]
    },
    "badminton": {
        "name": "Bádminton", "category": "racquet",
        "prep_ratio": 0.35, "comp_ratio": 0.55, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["velocidad", "agilidad", "resistencia"],
        "recommended_models": ["undulating_weekly", "concurrent"]
    },
    # Fitness General
    "fitness": {
        "name": "Fitness General", "category": "fitness",
        "prep_ratio": 0.80, "comp_ratio": 0.10, "trans_ratio": 0.10,
        "sessions_per_week": 4, "intensity_focus": False,
        "primary_qualities": ["fuerza_general", "resistencia", "composicion_corporal"],
        "recommended_models": ["undulating_daily", "concurrent", "flexible_nonlinear"]
    },
    "crossfit": {
        "name": "CrossFit", "category": "fitness",
        "prep_ratio": 0.40, "comp_ratio": 0.50, "trans_ratio": 0.10,
        "sessions_per_week": 5, "intensity_focus": True,
        "primary_qualities": ["capacidad_trabajo", "potencia", "resistencia"],
        "recommended_models": ["concurrent", "undulating_daily", "conjugate"]
    },
    # General
    "general": {
        "name": "Deporte General", "category": "general",
        "prep_ratio": 0.50, "comp_ratio": 0.40, "trans_ratio": 0.10,
        "sessions_per_week": 4, "intensity_focus": False,
        "primary_qualities": ["fuerza", "resistencia", "velocidad"],
        "recommended_models": ["traditional", "concurrent", "atr"]
    }
}

# =============== MODEL-SPECIFIC PHASE DISTRIBUTIONS ===============
MODEL_PHASE_DISTRIBUTIONS = {
    "traditional": {
        "name": "Tradicional (Matveiev)",
        "description": "Progresión lineal de volumen a intensidad",
        "phases": [
            {"id": "prep_general", "name": "Preparatorio General", "abbr": "PG", "ratio": 0.25, "volume": 90, "intensity": 50, "meso_type": "basico_desarrollador"},
            {"id": "prep_specific", "name": "Preparatorio Específico", "abbr": "PE", "ratio": 0.25, "volume": 70, "intensity": 75, "meso_type": "basico_estabilizador"},
            {"id": "precompetitive", "name": "Precompetitivo", "abbr": "PC", "ratio": 0.15, "volume": 50, "intensity": 90, "meso_type": "precompetitivo"},
            {"id": "competitive", "name": "Competitivo", "abbr": "CO", "ratio": 0.30, "volume": 35, "intensity": 95, "meso_type": "competitivo"},
            {"id": "transition", "name": "Transición", "abbr": "TR", "ratio": 0.05, "volume": 40, "intensity": 40, "meso_type": "recuperacion"}
        ]
    },
    "atr": {
        "name": "ATR (Issurin)",
        "description": "Bloques de Acumulación-Transformación-Realización",
        "phases": [
            {"id": "accumulation", "name": "Acumulación", "abbr": "AC", "ratio": 0.40, "volume": 85, "intensity": 60, "meso_type": "basico_desarrollador"},
            {"id": "transformation", "name": "Transformación", "abbr": "TR", "ratio": 0.35, "volume": 60, "intensity": 85, "meso_type": "basico_estabilizador"},
            {"id": "realization", "name": "Realización", "abbr": "RE", "ratio": 0.20, "volume": 40, "intensity": 95, "meso_type": "competitivo"},
            {"id": "recovery", "name": "Recuperación", "abbr": "RC", "ratio": 0.05, "volume": 35, "intensity": 40, "meso_type": "recuperacion"}
        ]
    },
    "blocks": {
        "name": "Bloques Concentrados (Verkhoshansky)",
        "description": "Cargas unidireccionales concentradas",
        "phases": [
            {"id": "block_a", "name": "Bloque A - Fuerza", "abbr": "BA", "ratio": 0.30, "volume": 95, "intensity": 70, "meso_type": "basico_desarrollador"},
            {"id": "block_b", "name": "Bloque B - Potencia", "abbr": "BB", "ratio": 0.30, "volume": 60, "intensity": 90, "meso_type": "basico_estabilizador"},
            {"id": "block_c", "name": "Bloque C - Velocidad", "abbr": "BC", "ratio": 0.25, "volume": 40, "intensity": 95, "meso_type": "precompetitivo"},
            {"id": "competition", "name": "Competición", "abbr": "CO", "ratio": 0.15, "volume": 30, "intensity": 100, "meso_type": "competitivo"}
        ]
    },
    "undulating_daily": {
        "name": "Ondulatorio Diario (DUP)",
        "description": "Variación diaria de estímulos",
        "phases": [
            {"id": "hypertrophy", "name": "Hipertrofia", "abbr": "HI", "ratio": 0.35, "volume": 80, "intensity": 65, "meso_type": "basico_desarrollador"},
            {"id": "strength", "name": "Fuerza", "abbr": "FU", "ratio": 0.35, "volume": 60, "intensity": 85, "meso_type": "basico_estabilizador"},
            {"id": "power", "name": "Potencia", "abbr": "PO", "ratio": 0.25, "volume": 45, "intensity": 90, "meso_type": "precompetitivo"},
            {"id": "deload", "name": "Descarga", "abbr": "DE", "ratio": 0.05, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    },
    "undulating_weekly": {
        "name": "Ondulatorio Semanal (WUP)",
        "description": "Variación semanal de énfasis",
        "phases": [
            {"id": "accumulation", "name": "Acumulación", "abbr": "AC", "ratio": 0.40, "volume": 85, "intensity": 65, "meso_type": "basico_desarrollador"},
            {"id": "intensification", "name": "Intensificación", "abbr": "IN", "ratio": 0.40, "volume": 55, "intensity": 88, "meso_type": "basico_estabilizador"},
            {"id": "realization", "name": "Realización", "abbr": "RE", "ratio": 0.15, "volume": 40, "intensity": 95, "meso_type": "competitivo"},
            {"id": "deload", "name": "Descarga", "abbr": "DE", "ratio": 0.05, "volume": 35, "intensity": 45, "meso_type": "recuperacion"}
        ]
    },
    "conjugate": {
        "name": "Conjugado (Westside)",
        "description": "Desarrollo simultáneo de cualidades",
        "phases": [
            {"id": "max_effort", "name": "Esfuerzo Máximo", "abbr": "ME", "ratio": 0.35, "volume": 50, "intensity": 95, "meso_type": "basico_desarrollador"},
            {"id": "dynamic_effort", "name": "Esfuerzo Dinámico", "abbr": "DE", "ratio": 0.35, "volume": 70, "intensity": 60, "meso_type": "basico_estabilizador"},
            {"id": "repetition", "name": "Repetición", "abbr": "RE", "ratio": 0.25, "volume": 80, "intensity": 70, "meso_type": "precompetitivo"},
            {"id": "deload", "name": "Descarga", "abbr": "DL", "ratio": 0.05, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    },
    "triphasic": {
        "name": "Trifásico (Dietz)",
        "description": "Fases excéntrica-isométrica-concéntrica",
        "phases": [
            {"id": "eccentric", "name": "Excéntrico", "abbr": "EX", "ratio": 0.30, "volume": 75, "intensity": 75, "meso_type": "basico_desarrollador"},
            {"id": "isometric", "name": "Isométrico", "abbr": "IS", "ratio": 0.30, "volume": 65, "intensity": 85, "meso_type": "basico_estabilizador"},
            {"id": "concentric", "name": "Concéntrico", "abbr": "CO", "ratio": 0.30, "volume": 55, "intensity": 90, "meso_type": "precompetitivo"},
            {"id": "reactive", "name": "Reactivo", "abbr": "RE", "ratio": 0.10, "volume": 40, "intensity": 95, "meso_type": "competitivo"}
        ]
    },
    "polarized": {
        "name": "Polarizado (Seiler)",
        "description": "80% baja / 20% alta intensidad",
        "phases": [
            {"id": "base", "name": "Base Aeróbica", "abbr": "BA", "ratio": 0.50, "volume": 95, "intensity": 55, "meso_type": "basico_desarrollador"},
            {"id": "build", "name": "Construcción", "abbr": "BU", "ratio": 0.30, "volume": 75, "intensity": 75, "meso_type": "basico_estabilizador"},
            {"id": "peak", "name": "Pico", "abbr": "PK", "ratio": 0.15, "volume": 50, "intensity": 92, "meso_type": "competitivo"},
            {"id": "taper", "name": "Tapering", "abbr": "TP", "ratio": 0.05, "volume": 35, "intensity": 80, "meso_type": "recuperacion"}
        ]
    },
    "tactical": {
        "name": "Periodización Táctica (Frade)",
        "description": "Basada en el modelo de juego",
        "phases": [
            {"id": "acquisition", "name": "Adquisición", "abbr": "AD", "ratio": 0.20, "volume": 80, "intensity": 70, "meso_type": "entrante"},
            {"id": "maintenance", "name": "Mantenimiento", "abbr": "MA", "ratio": 0.70, "volume": 65, "intensity": 80, "meso_type": "basico_estabilizador"},
            {"id": "recovery", "name": "Recuperación", "abbr": "RE", "ratio": 0.10, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    },
    "reverse_linear": {
        "name": "Lineal Inversa",
        "description": "De intensidad a volumen",
        "phases": [
            {"id": "intensity", "name": "Intensidad Alta", "abbr": "IA", "ratio": 0.35, "volume": 50, "intensity": 92, "meso_type": "basico_desarrollador"},
            {"id": "moderate", "name": "Moderado", "abbr": "MO", "ratio": 0.35, "volume": 70, "intensity": 75, "meso_type": "basico_estabilizador"},
            {"id": "volume", "name": "Volumen Alto", "abbr": "VA", "ratio": 0.25, "volume": 90, "intensity": 60, "meso_type": "precompetitivo"},
            {"id": "taper", "name": "Tapering", "abbr": "TP", "ratio": 0.05, "volume": 40, "intensity": 70, "meso_type": "recuperacion"}
        ]
    },
    "concurrent": {
        "name": "Concurrente",
        "description": "Desarrollo paralelo de cualidades",
        "phases": [
            {"id": "general", "name": "General", "abbr": "GE", "ratio": 0.40, "volume": 80, "intensity": 65, "meso_type": "basico_desarrollador"},
            {"id": "specific", "name": "Específico", "abbr": "ES", "ratio": 0.40, "volume": 65, "intensity": 80, "meso_type": "basico_estabilizador"},
            {"id": "competition", "name": "Competición", "abbr": "CO", "ratio": 0.15, "volume": 45, "intensity": 90, "meso_type": "competitivo"},
            {"id": "transition", "name": "Transición", "abbr": "TR", "ratio": 0.05, "volume": 40, "intensity": 50, "meso_type": "recuperacion"}
        ]
    }
}

# Microcycle types with load patterns
MICROCYCLE_TYPES = {
    "restablecimiento": {"load": 45, "name": "Restablecimiento", "description": "Recuperación activa"},
    "corriente": {"load": 70, "name": "Corriente", "description": "Carga normal de trabajo"},
    "aproximacion": {"load": 75, "name": "Aproximación", "description": "Preparación pre-competencia"},
    "carga": {"load": 85, "name": "Carga", "description": "Aumento progresivo de carga"},
    "choque": {"load": 100, "name": "Choque", "description": "Carga máxima de impacto"},
    "competitivo": {"load": 60, "name": "Competitivo", "description": "Semana de competencia"}
}

# Mesocycle load patterns (for step loading 3:1 and 2:1)
MESOCYCLE_PATTERNS = {
    "3_1": [0.85, 0.92, 1.0, 0.60],  # 3 semanas carga + 1 descarga
    "2_1": [0.90, 1.0, 0.60],  # 2 semanas carga + 1 descarga
    "4_1": [0.80, 0.87, 0.94, 1.0, 0.55],  # 4 semanas carga + 1 descarga
    "linear": [0.75, 0.83, 0.91, 1.0],  # Progresión lineal
    "undulating": [1.0, 0.70, 0.85, 0.75]  # Ondulante
}

class StructureGenerationRequest(BaseModel):
    """Request to generate training plan structure automatically"""
    model: str
    sport: str
    total_weeks: int
    start_date: str
    sessions_per_week: Optional[int] = None
    main_competition_date: Optional[str] = None
    athlete_level: str = "intermediate"  # beginner, intermediate, advanced, elite

class GeneratedStructure(BaseModel):
    """Generated structure response"""
    model: str
    model_name: str
    sport: str
    sport_name: str
    total_weeks: int
    sessions_per_week: int
    primary_qualities: List[str]
    macrocycles: List[Dict[str, Any]]
    volume_chart: List[Dict[str, Any]]
    intensity_chart: List[Dict[str, Any]]
    summary: Dict[str, Any]

@api_router.post("/generate-structure", response_model=GeneratedStructure)
async def generate_training_structure(request: StructureGenerationRequest, user: dict = Depends(get_current_user)):
    """Generate optimal training plan structure based on model, sport, and duration"""
    
    model = request.model
    sport = request.sport
    total_weeks = request.total_weeks
    start_date = request.start_date
    athlete_level = request.athlete_level
    
    # Get sport config (default to general if not found)
    sport_config = SPORT_CONFIGS.get(sport, SPORT_CONFIGS["general"])
    
    # Get model distribution (default to traditional if not found)
    model_dist = MODEL_PHASE_DISTRIBUTIONS.get(model, MODEL_PHASE_DISTRIBUTIONS["traditional"])
    
    # Determine sessions per week
    sessions_per_week = request.sessions_per_week or sport_config["sessions_per_week"]
    
    # Adjust ratios based on sport category if team sport with long season
    prep_ratio = sport_config["prep_ratio"]
    comp_ratio = sport_config["comp_ratio"]
    trans_ratio = sport_config["trans_ratio"]
    
    # Level adjustments
    level_multipliers = {
        "beginner": {"volume": 0.75, "intensity": 0.80, "sessions": 0.80},
        "intermediate": {"volume": 1.0, "intensity": 1.0, "sessions": 1.0},
        "advanced": {"volume": 1.10, "intensity": 1.05, "sessions": 1.0},
        "elite": {"volume": 1.15, "intensity": 1.10, "sessions": 1.0}
    }
    level_mult = level_multipliers.get(athlete_level, level_multipliers["intermediate"])
    
    # Parse start date
    from datetime import datetime as dt
    start = dt.fromisoformat(start_date.replace('Z', '+00:00') if 'Z' in start_date else start_date)
    
    # Generate macrocycles based on model phases
    macrocycles = []
    volume_chart = []
    intensity_chart = []
    current_week = 0
    
    for phase in model_dist["phases"]:
        phase_weeks = max(1, round(total_weeks * phase["ratio"]))
        if current_week + phase_weeks > total_weeks:
            phase_weeks = total_weeks - current_week
        if phase_weeks <= 0:
            continue
        
        phase_start = start + timedelta(weeks=current_week)
        phase_end = start + timedelta(weeks=current_week + phase_weeks)
        
        # Calculate adjusted volume and intensity
        base_volume = phase["volume"]
        base_intensity = phase["intensity"]
        
        # Generate mesocycles within this phase
        mesocycles = []
        meso_weeks = 4 if phase_weeks >= 4 else phase_weeks  # Standard 4-week mesocycle
        num_mesos = max(1, phase_weeks // meso_weeks)
        remaining_weeks = phase_weeks
        
        for meso_idx in range(num_mesos):
            meso_week_count = min(meso_weeks, remaining_weeks)
            if meso_week_count <= 0:
                break
            
            # Determine mesocycle pattern
            pattern_key = "3_1" if meso_week_count >= 4 else "2_1" if meso_week_count >= 3 else "linear"
            pattern = MESOCYCLE_PATTERNS.get(pattern_key, MESOCYCLE_PATTERNS["linear"])[:meso_week_count]
            
            # Generate microcycles
            microcycles = []
            for micro_idx, load_factor in enumerate(pattern):
                week_num = current_week + sum(m.get("weeks", 0) for m in mesocycles) + micro_idx + 1
                
                # Determine microcycle type based on load
                if load_factor <= 0.60:
                    micro_type = "restablecimiento"
                elif load_factor <= 0.75:
                    micro_type = "corriente"
                elif load_factor <= 0.85:
                    micro_type = "carga"
                else:
                    micro_type = "choque"
                
                micro_volume = round(base_volume * load_factor * level_mult["volume"])
                micro_intensity = round(base_intensity * (0.9 + load_factor * 0.1) * level_mult["intensity"])
                
                # Generate sessions
                sessions = []
                session_types = ["tecnica", "fuerza", "resistencia", "velocidad", "recuperacion"]
                for day in range(1, min(sessions_per_week + 1, 8)):
                    session_type = session_types[day % len(session_types)]
                    sessions.append({
                        "id": str(uuid.uuid4()),
                        "day": day,
                        "name": f"Sesión {day}",
                        "session_type": session_type,
                        "duration_minutes": 60 + (10 if sport_config["intensity_focus"] else 20),
                        "intensity": micro_intensity,
                        "volume": micro_volume,
                        "objectives": sport_config["primary_qualities"][:2]
                    })
                
                microcycles.append({
                    "id": str(uuid.uuid4()),
                    "name": f"Semana {week_num}",
                    "week_number": week_num,
                    "type": micro_type,
                    "load_percent": round(load_factor * 100),
                    "volume": micro_volume,
                    "intensity": micro_intensity,
                    "sessions": sessions
                })
                
                # Add to charts
                volume_chart.append({
                    "week": week_num,
                    "semana": f"S{week_num}",
                    "volume": micro_volume,
                    "phase": phase["name"],
                    "phase_abbr": phase["abbr"]
                })
                intensity_chart.append({
                    "week": week_num,
                    "semana": f"S{week_num}",
                    "intensity": micro_intensity,
                    "phase": phase["name"],
                    "phase_abbr": phase["abbr"]
                })
            
            mesocycles.append({
                "id": str(uuid.uuid4()),
                "name": f"{phase['abbr']} - Meso {meso_idx + 1}",
                "type": phase.get("meso_type", "basico_desarrollador"),
                "phase": phase["id"],
                "weeks": meso_week_count,
                "volume_percent": base_volume,
                "intensity_percent": base_intensity,
                "load_factor": sum(pattern) / len(pattern),
                "microcycles": microcycles
            })
            
            remaining_weeks -= meso_week_count
        
        macrocycles.append({
            "id": str(uuid.uuid4()),
            "name": phase["name"],
            "phase": phase["id"],
            "start_date": phase_start.isoformat(),
            "end_date": phase_end.isoformat(),
            "weeks": phase_weeks,
            "volume_percent": base_volume,
            "intensity_percent": base_intensity,
            "objectives": sport_config["primary_qualities"],
            "mesocycles": mesocycles
        })
        
        current_week += phase_weeks
    
    # Generate summary
    total_sessions = sum(
        len(micro.get("sessions", []))
        for macro in macrocycles
        for meso in macro.get("mesocycles", [])
        for micro in meso.get("microcycles", [])
    )
    
    summary = {
        "total_macrocycles": len(macrocycles),
        "total_mesocycles": sum(len(m.get("mesocycles", [])) for m in macrocycles),
        "total_microcycles": sum(
            len(meso.get("microcycles", []))
            for macro in macrocycles
            for meso in macro.get("mesocycles", [])
        ),
        "total_sessions": total_sessions,
        "avg_volume": round(sum(v["volume"] for v in volume_chart) / len(volume_chart)) if volume_chart else 0,
        "avg_intensity": round(sum(i["intensity"] for i in intensity_chart) / len(intensity_chart)) if intensity_chart else 0,
        "phases": [{"name": p["name"], "weeks": round(total_weeks * p["ratio"])} for p in model_dist["phases"]]
    }
    
    return GeneratedStructure(
        model=model,
        model_name=model_dist["name"],
        sport=sport,
        sport_name=sport_config["name"],
        total_weeks=total_weeks,
        sessions_per_week=sessions_per_week,
        primary_qualities=sport_config["primary_qualities"],
        macrocycles=macrocycles,
        volume_chart=volume_chart,
        intensity_chart=intensity_chart,
        summary=summary
    )

@api_router.get("/sports-catalog")
async def get_sports_catalog():
    """Get catalog of available sports with their configurations"""
    catalog = {}
    for sport_id, config in SPORT_CONFIGS.items():
        category = config["category"]
        if category not in catalog:
            catalog[category] = []
        catalog[category].append({
            "id": sport_id,
            "name": config["name"],
            "sessions_per_week": config["sessions_per_week"],
            "recommended_models": config["recommended_models"],
            "primary_qualities": config["primary_qualities"]
        })
    return catalog

@api_router.post("/training-plans", response_model=TrainingPlanResponse)
async def create_training_plan(plan: TrainingPlanCreate, user: dict = Depends(get_current_user)):
    """Create a complete training plan with all structures"""
    plan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate end date
    from datetime import datetime as dt
    start = dt.fromisoformat(plan.start_date.replace('Z', '+00:00') if 'Z' in plan.start_date else plan.start_date)
    end = start + timedelta(weeks=plan.total_weeks)
    
    # Generate IDs for nested structures
    macrocycles_with_ids = []
    for macro in plan.macrocycles:
        macro_dict = macro.model_dump()
        macro_dict["id"] = macro_dict.get("id") or str(uuid.uuid4())
        
        mesos_with_ids = []
        for meso in macro_dict.get("mesocycles", []):
            meso["id"] = meso.get("id") or str(uuid.uuid4())
            
            micros_with_ids = []
            for micro in meso.get("microcycles", []):
                micro["id"] = micro.get("id") or str(uuid.uuid4())
                
                sessions_with_ids = []
                for session in micro.get("sessions", []):
                    session["id"] = session.get("id") or str(uuid.uuid4())
                    sessions_with_ids.append(session)
                micro["sessions"] = sessions_with_ids
                micros_with_ids.append(micro)
            meso["microcycles"] = micros_with_ids
            mesos_with_ids.append(meso)
        macro_dict["mesocycles"] = mesos_with_ids
        macrocycles_with_ids.append(macro_dict)
    
    model_info = PERIODIZATION_MODELS_INFO.get(plan.model, {"name": plan.model})
    
    doc = {
        "id": plan_id,
        "coach_id": user["id"],
        "name": plan.name,
        "athlete_id": plan.athlete_id,
        "sport": plan.sport,
        "model": plan.model,
        "model_name": model_info.get("name", plan.model),
        "duration_type": plan.duration_type,
        "total_weeks": plan.total_weeks,
        "start_date": plan.start_date,
        "end_date": end.isoformat(),
        "sessions_per_week": plan.sessions_per_week,
        "main_objective": plan.main_objective,
        "main_competition": plan.main_competition,
        "main_competition_date": plan.main_competition_date,
        "macrocycles": macrocycles_with_ids,
        "status": "active",
        "share_token": None,
        "created_at": now,
        "updated_at": now
    }
    
    await db.training_plans.insert_one(doc)
    doc.pop("_id", None)
    
    # ====== CREAR ESTRUCTURA COMPLETA DE DATOS DEL PLAN ======
    # Crear documento de datos del plan con todas las secciones vacías
    plan_data_doc = {
        "id": str(uuid.uuid4()),
        "plan_id": plan_id,
        "coach_id": user["id"],
        # Diagnóstico / Punto de Partida
        "previous_analysis": {
            "previous_plan_name": "",
            "achievements": "",
            "areas_to_improve": "",
            "lessons_learned": "",
            "recommendations": ""
        },
        "objectives": [],
        "athlete_characterization": {
            "training_age": 0,
            "sport_age": 0,
            "strengths": "",
            "weaknesses": "",
            "injury_history": "",
            "availability": ""
        },
        # Evaluaciones / Controles
        "evaluations": {
            "medical": [],
            "anthropometric": [],
            "physical": [],
            "technical": [],
            "tactical": [],
            "psychological": [],
            "theoretical": []
        },
        # Competencias
        "competitions": [],
        "competition_calendar": [],
        # Metadatos
        "created_at": now,
        "updated_at": now
    }
    await db.plan_data.insert_one(plan_data_doc)
    
    return TrainingPlanResponse(**doc)

@api_router.get("/training-plans", response_model=List[TrainingPlanResponse])
async def get_training_plans(user: dict = Depends(get_current_user)):
    """Get all training plans for the current user"""
    plans = await db.training_plans.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [TrainingPlanResponse(**p) for p in plans]

@api_router.get("/training-plans/{plan_id}", response_model=TrainingPlanResponse)
async def get_training_plan(plan_id: str, user: dict = Depends(get_current_user)):
    """Get a specific training plan"""
    plan = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return TrainingPlanResponse(**plan)

@api_router.put("/training-plans/{plan_id}", response_model=TrainingPlanResponse)
async def update_training_plan(plan_id: str, plan: TrainingPlanCreate, user: dict = Depends(get_current_user)):
    """Update an existing training plan"""
    existing = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]})
    if not existing:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate end date
    from datetime import datetime as dt
    start = dt.fromisoformat(plan.start_date.replace('Z', '+00:00') if 'Z' in plan.start_date else plan.start_date)
    end = start + timedelta(weeks=plan.total_weeks)
    
    # Generate IDs for nested structures
    macrocycles_with_ids = []
    for macro in plan.macrocycles:
        macro_dict = macro.model_dump()
        macro_dict["id"] = macro_dict.get("id") or str(uuid.uuid4())
        
        mesos_with_ids = []
        for meso in macro_dict.get("mesocycles", []):
            meso["id"] = meso.get("id") or str(uuid.uuid4())
            
            micros_with_ids = []
            for micro in meso.get("microcycles", []):
                micro["id"] = micro.get("id") or str(uuid.uuid4())
                
                sessions_with_ids = []
                for session in micro.get("sessions", []):
                    session["id"] = session.get("id") or str(uuid.uuid4())
                    sessions_with_ids.append(session)
                micro["sessions"] = sessions_with_ids
                micros_with_ids.append(micro)
            meso["microcycles"] = micros_with_ids
            mesos_with_ids.append(meso)
        macro_dict["mesocycles"] = mesos_with_ids
        macrocycles_with_ids.append(macro_dict)
    
    model_info = PERIODIZATION_MODELS_INFO.get(plan.model, {"name": plan.model})
    
    update_data = {
        "name": plan.name,
        "athlete_id": plan.athlete_id,
        "sport": plan.sport,
        "model": plan.model,
        "model_name": model_info.get("name", plan.model),
        "duration_type": plan.duration_type,
        "total_weeks": plan.total_weeks,
        "start_date": plan.start_date,
        "end_date": end.isoformat(),
        "sessions_per_week": plan.sessions_per_week,
        "main_objective": plan.main_objective,
        "main_competition": plan.main_competition,
        "main_competition_date": plan.main_competition_date,
        "macrocycles": macrocycles_with_ids,
        "updated_at": now
    }
    
    await db.training_plans.update_one(
        {"id": plan_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    
    updated = await db.training_plans.find_one({"id": plan_id}, {"_id": 0})
    return TrainingPlanResponse(**updated)

@api_router.delete("/training-plans/{plan_id}")
async def delete_training_plan(plan_id: str, user: dict = Depends(get_current_user)):
    """Delete a training plan and all associated data"""
    result = await db.training_plans.delete_one({"id": plan_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    # Cascade delete all associated plan data
    await db.plan_data.delete_many({"plan_id": plan_id})
    await db.plan_objectives.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    await db.plan_evaluations.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    await db.plan_competitions.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    await db.plan_previous_analysis.delete_many({"plan_id": plan_id, "user_id": user["id"]})
    return {"message": "Plan and all associated data deleted successfully"}

@api_router.post("/training-plans/{plan_id}/duplicate", response_model=TrainingPlanResponse)
async def duplicate_training_plan(plan_id: str, user: dict = Depends(get_current_user)):
    """Duplicate an existing training plan with all associated data"""
    original = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]}, {"_id": 0})
    if not original:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    new_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Deep copy with new IDs
    def regenerate_ids(obj):
        if isinstance(obj, dict):
            if "id" in obj:
                obj["id"] = str(uuid.uuid4())
            for key, value in obj.items():
                regenerate_ids(value)
        elif isinstance(obj, list):
            for item in obj:
                regenerate_ids(item)
    
    import copy
    new_plan = copy.deepcopy(original)
    new_plan["id"] = new_id
    new_plan["name"] = f"{original['name']} (Copia)"
    new_plan["share_token"] = None
    new_plan["created_at"] = now
    new_plan["updated_at"] = now
    regenerate_ids(new_plan.get("macrocycles", []))
    
    await db.training_plans.insert_one(new_plan)
    new_plan.pop("_id", None)
    
    # Duplicate plan_data initialization document
    plan_data_orig = await db.plan_data.find_one({"plan_id": plan_id}, {"_id": 0})
    if plan_data_orig:
        plan_data_copy = copy.deepcopy(plan_data_orig)
        plan_data_copy["id"] = str(uuid.uuid4())
        plan_data_copy["plan_id"] = new_id
        plan_data_copy["created_at"] = now
        plan_data_copy["updated_at"] = now
        await db.plan_data.insert_one(plan_data_copy)
    
    # Duplicate objectives
    objectives = await db.plan_objectives.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if objectives:
        obj_copy = copy.deepcopy(objectives)
        obj_copy["plan_id"] = new_id
        obj_copy["created_at"] = now
        await db.plan_objectives.insert_one(obj_copy)
    
    # Duplicate evaluations
    evals_cursor = db.plan_evaluations.find({"plan_id": plan_id, "user_id": user["id"]})
    async for e in evals_cursor:
        e.pop("_id", None)
        e["plan_id"] = new_id
        e["created_at"] = now
        await db.plan_evaluations.insert_one(e)
    
    # Duplicate competitions
    comps_cursor = db.plan_competitions.find({"plan_id": plan_id, "user_id": user["id"]})
    async for c in comps_cursor:
        c.pop("_id", None)
        c["plan_id"] = new_id
        c["created_at"] = now
        await db.plan_competitions.insert_one(c)
    
    # Duplicate previous analysis
    prev_analysis = await db.plan_previous_analysis.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if prev_analysis:
        pa_copy = copy.deepcopy(prev_analysis)
        pa_copy["plan_id"] = new_id
        pa_copy["created_at"] = now
        await db.plan_previous_analysis.insert_one(pa_copy)
    
    return TrainingPlanResponse(**new_plan)

@api_router.post("/training-plans/{plan_id}/share")
async def share_training_plan(plan_id: str, user: dict = Depends(get_current_user)):
    """Generate a share token for a training plan"""
    plan = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    share_token = str(uuid.uuid4())[:12]
    
    await db.training_plans.update_one(
        {"id": plan_id},
        {"$set": {"share_token": share_token}}
    )
    
    return {"share_token": share_token, "share_url": f"/plan/shared/{share_token}"}

@api_router.get("/training-plans/shared/{share_token}")
async def get_shared_training_plan(share_token: str):
    """Get a shared training plan (public access)"""
    plan = await db.training_plans.find_one({"share_token": share_token}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Shared plan not found")
    
    # Remove sensitive info
    plan.pop("coach_id", None)
    return plan

# =============== SCIENTIFIC CALCULATORS ===============
@api_router.post("/calculators/load", response_model=LoadCalculationResponse)
async def calculate_load_scientific(request: LoadCalculationRequest, user: dict = Depends(get_current_user)):
    """Scientific calculations for training loads, 1RM, zones, etc."""
    
    calc_type = request.calculation_type
    params = request.params
    
    if calc_type == "1rm":
        # Calculate 1RM using multiple formulas
        weight = params.get("weight", 0)
        reps = params.get("reps", 1)
        
        # Brzycki Formula: 1RM = weight × (36 / (37 - reps))
        brzycki = weight * (36 / (37 - reps)) if reps < 37 else weight
        # Epley Formula: 1RM = weight × (1 + 0.0333 × reps)
        epley = weight * (1 + 0.0333 * reps)
        # Lander Formula: 1RM = (100 × weight) / (101.3 - 2.67123 × reps)
        lander = (100 * weight) / (101.3 - 2.67123 * reps) if reps < 38 else weight
        # Average
        avg_1rm = round((brzycki + epley + lander) / 3, 1)
        
        # Calculate percentages
        percentages = {}
        for pct in [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50]:
            percentages[f"{pct}%"] = round(avg_1rm * (pct / 100), 1)
        
        return LoadCalculationResponse(
            result={
                "1rm_brzycki": round(brzycki, 1),
                "1rm_epley": round(epley, 1),
                "1rm_lander": round(lander, 1),
                "1rm_average": avg_1rm,
                "percentages": percentages,
                "recommended_zones": {
                    "fuerza_maxima": f"{percentages['85%']} - {percentages['100%']} kg (85-100%)",
                    "hipertrofia": f"{percentages['65%']} - {percentages['80%']} kg (65-80%)",
                    "resistencia_fuerza": f"{percentages['50%']} - {percentages['65%']} kg (50-65%)",
                    "potencia": f"{percentages['70%']} - {percentages['85%']} kg (70-85%)"
                }
            },
            formula_used="Promedio de Brzycki, Epley y Lander",
            explanation=f"1RM estimado: {avg_1rm}kg basado en {weight}kg x {reps} repeticiones"
        )
    
    elif calc_type == "heart_rate_zones":
        # Calculate HR zones using Karvonen formula
        age = params.get("age", 30)
        resting_hr = params.get("resting_hr", 60)
        
        # Max HR = 220 - age (or use provided max_hr)
        max_hr = params.get("max_hr") or (220 - age)
        hr_reserve = max_hr - resting_hr
        
        zones = {}
        zone_definitions = [
            ("Z1 - Recuperación", 50, 60, "Recuperación activa, calentamiento"),
            ("Z2 - Aeróbico Base", 60, 70, "Base aeróbica, quema de grasas"),
            ("Z3 - Aeróbico", 70, 80, "Umbral aeróbico, resistencia"),
            ("Z4 - Umbral Anaeróbico", 80, 90, "Umbral láctico, tempo"),
            ("Z5 - VO2 Máx", 90, 100, "Capacidad máxima, intervalos")
        ]
        
        for name, low_pct, high_pct, desc in zone_definitions:
            low_hr = round(resting_hr + (hr_reserve * low_pct / 100))
            high_hr = round(resting_hr + (hr_reserve * high_pct / 100))
            zones[name] = {
                "range": f"{low_hr} - {high_hr} bpm",
                "low": low_hr,
                "high": high_hr,
                "percentage": f"{low_pct}-{high_pct}%",
                "description": desc
            }
        
        return LoadCalculationResponse(
            result={
                "max_hr": max_hr,
                "resting_hr": resting_hr,
                "hr_reserve": hr_reserve,
                "zones": zones
            },
            formula_used="Fórmula de Karvonen: FC = FC_reposo + (FC_reserva × %intensidad)",
            explanation=f"Zonas calculadas para FC máx {max_hr}bpm, FC reposo {resting_hr}bpm"
        )
    
    elif calc_type == "volume_distribution":
        # Distribute volume across weeks using periodization principles
        total_volume = params.get("total_volume", 1000)  # e.g., km, tons, hours
        weeks = params.get("weeks", 12)
        progression_type = params.get("progression", "linear")  # linear, undulating, step
        
        weekly_volumes = []
        
        if progression_type == "linear":
            # Linear progression: start at 70%, end at 100%
            start_pct = 0.7
            end_pct = 1.0
            avg_weekly = total_volume / weeks
            for i in range(weeks):
                pct = start_pct + (end_pct - start_pct) * (i / (weeks - 1)) if weeks > 1 else 1
                weekly_volumes.append(round(avg_weekly * pct, 1))
        
        elif progression_type == "undulating":
            # Undulating: high-low-medium pattern
            patterns = [1.0, 0.7, 0.85, 1.0, 0.75, 0.9]
            avg_weekly = total_volume / weeks
            for i in range(weeks):
                pct = patterns[i % len(patterns)]
                weekly_volumes.append(round(avg_weekly * pct, 1))
        
        elif progression_type == "step":
            # Step loading: 3 weeks up, 1 week down
            avg_weekly = total_volume / weeks
            for i in range(weeks):
                week_in_block = i % 4
                if week_in_block == 3:
                    pct = 0.6  # Descarga
                else:
                    pct = 0.8 + (week_in_block * 0.1)
                weekly_volumes.append(round(avg_weekly * pct, 1))
        
        return LoadCalculationResponse(
            result={
                "total_volume": total_volume,
                "weeks": weeks,
                "progression_type": progression_type,
                "weekly_volumes": weekly_volumes,
                "weekly_breakdown": [
                    {"week": i+1, "volume": v, "percentage": round(v / (total_volume/weeks) * 100)}
                    for i, v in enumerate(weekly_volumes)
                ]
            },
            formula_used=f"Progresión {progression_type}",
            explanation=f"Distribución de {total_volume} unidades en {weeks} semanas"
        )
    
    elif calc_type == "intensity_scale":
        # Return standard intensity scales
        return LoadCalculationResponse(
            result={
                "vasconcelos_raposo": {
                    "recuperacion": {"range": "0-50%", "description": "Recuperación activa"},
                    "floja": {"range": "55-65%", "description": "Carga ligera"},
                    "media": {"range": "70-80%", "description": "Carga media"},
                    "fuerte": {"range": "85-95%", "description": "Carga alta"},
                    "muy_fuerte": {"range": "98-100%", "description": "Carga máxima"}
                },
                "microcycle_types": {
                    "restablecimiento": {"load": 45, "description": "Recuperación post-competencia"},
                    "corriente": {"load": 70, "description": "Carga normal de trabajo"},
                    "aproximacion": {"load": 75, "description": "Preparación pre-competencia"},
                    "carga": {"load": 85, "description": "Aumento de carga"},
                    "choque": {"load": 100, "description": "Carga máxima de impacto"},
                    "competitivo": {"load": 60, "description": "Semana de competencia"}
                },
                "mesocycle_types": {
                    "entrante": {"load_factor": 0.7, "description": "Adaptación inicial"},
                    "basico_desarrollador": {"load_factor": 1.0, "description": "Desarrollo máximo"},
                    "basico_estabilizador": {"load_factor": 0.9, "description": "Consolidación"},
                    "precompetitivo": {"load_factor": 0.85, "description": "Ajuste pre-competencia"},
                    "competitivo": {"load_factor": 0.75, "description": "Fase de competición"},
                    "recuperacion": {"load_factor": 0.5, "description": "Transición y descanso"}
                }
            },
            formula_used="Escalas de Vasconcelos Raposo y clasificación estándar",
            explanation="Escalas de intensidad para planificación deportiva"
        )
    
    elif calc_type == "vo2max":
        # Calculate VO2 max from different tests
        test_type = params.get("test_type", "cooper")
        
        if test_type == "cooper":
            # Cooper Test: VO2max = (distance_m - 504.9) / 44.73
            distance_m = params.get("distance_m", 2400)
            vo2max = round((distance_m - 504.9) / 44.73, 1)
        
        elif test_type == "rockport":
            # Rockport Walk Test
            weight_kg = params.get("weight_kg", 70)
            age = params.get("age", 30)
            time_minutes = params.get("time_minutes", 15)
            hr_end = params.get("hr_end", 140)
            gender = params.get("gender", "male")
            gender_factor = 0 if gender == "female" else 1
            
            vo2max = round(132.853 - (0.0769 * weight_kg * 2.205) - (0.3877 * age) + (6.315 * gender_factor) - (3.2649 * time_minutes) - (0.1565 * hr_end), 1)
        
        elif test_type == "1mile":
            # 1.5 Mile Run: VO2max = 483 / time_minutes + 3.5
            time_minutes = params.get("time_minutes", 12)
            vo2max = round(483 / time_minutes + 3.5, 1)
        
        else:
            vo2max = 0
        
        # Fitness classification
        classifications = {
            "excelente": 55,
            "bueno": 45,
            "promedio": 35,
            "bajo_promedio": 30,
            "pobre": 0
        }
        
        fitness_level = "pobre"
        for level, threshold in classifications.items():
            if vo2max >= threshold:
                fitness_level = level
                break
        
        return LoadCalculationResponse(
            result={
                "vo2max": vo2max,
                "fitness_level": fitness_level,
                "unit": "ml/kg/min",
                "training_zones": {
                    "z1_recovery": f"{round(vo2max * 0.5, 1)} - {round(vo2max * 0.6, 1)}",
                    "z2_aerobic": f"{round(vo2max * 0.6, 1)} - {round(vo2max * 0.7, 1)}",
                    "z3_tempo": f"{round(vo2max * 0.7, 1)} - {round(vo2max * 0.8, 1)}",
                    "z4_threshold": f"{round(vo2max * 0.8, 1)} - {round(vo2max * 0.9, 1)}",
                    "z5_vo2max": f"{round(vo2max * 0.9, 1)} - {round(vo2max, 1)}"
                }
            },
            formula_used=f"Test de {test_type.title()}",
            explanation=f"VO2máx estimado: {vo2max} ml/kg/min - Nivel: {fitness_level}"
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown calculation type: {calc_type}")

# =============== EXPORT TRAINING PLAN PDF ===============
@api_router.get("/training-plans/{plan_id}/export/pdf")
async def export_training_plan_pdf(plan_id: str, user: dict = Depends(get_current_user)):
    """Export training plan as PDF"""
    plan = await db.training_plans.find_one({"id": plan_id, "coach_id": user["id"]}, {"_id": 0})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    athlete = None
    if plan.get("athlete_id"):
        athlete = await db.athletes.find_one({"id": plan["athlete_id"]}, {"_id": 0})
    
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    c.setFillColor(HexColor("#1e3a5f"))
    c.rect(0, height - 80, width, 80, fill=True)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 24)
    c.drawString(50, height - 50, "SISTEMA TRAIN")
    c.setFont("Helvetica", 12)
    c.drawString(50, height - 70, f"Plan de Entrenamiento: {plan['name']}")
    
    y = height - 120
    
    # Plan Info
    c.setFillColor(HexColor("#0f172a"))
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Información General")
    y -= 25
    
    c.setFont("Helvetica", 11)
    c.setFillColor(HexColor("#475569"))
    info_lines = [
        f"Atleta: {athlete['name'] if athlete else 'No asignado'}",
        f"Deporte: {plan.get('sport', 'N/A')}",
        f"Modelo: {plan.get('model_name', plan.get('model', 'N/A'))}",
        f"Duración: {plan.get('total_weeks', 0)} semanas",
        f"Período: {plan.get('start_date', '')} - {plan.get('end_date', '')}",
        f"Sesiones/Semana: {plan.get('sessions_per_week', 5)}",
        f"Objetivo: {plan.get('main_objective', 'N/A')}"
    ]
    
    for line in info_lines:
        c.drawString(60, y, line)
        y -= 16
    
    y -= 20
    
    # Macrocycles
    for macro in plan.get("macrocycles", []):
        if y < 150:
            c.showPage()
            y = height - 50
        
        c.setFillColor(HexColor("#3B82F6"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y, f"MACROCICLO: {macro.get('name', 'Sin nombre')}")
        y -= 18
        
        c.setFont("Helvetica", 10)
        c.setFillColor(HexColor("#64748b"))
        c.drawString(60, y, f"Fase: {macro.get('phase', '')} | Semanas: {macro.get('weeks', 0)} | Vol: {macro.get('volume_percent', 0)}% | Int: {macro.get('intensity_percent', 0)}%")
        y -= 20
        
        # Mesocycles
        for meso in macro.get("mesocycles", []):
            if y < 120:
                c.showPage()
                y = height - 50
            
            c.setFillColor(HexColor("#8B5CF6"))
            c.setFont("Helvetica-Bold", 11)
            c.drawString(70, y, f"Mesociclo: {meso.get('name', '')}")
            y -= 15
            
            c.setFont("Helvetica", 9)
            c.setFillColor(HexColor("#64748b"))
            c.drawString(80, y, f"Tipo: {meso.get('type', '')} | Semanas: {meso.get('weeks', 0)}")
            y -= 15
            
            # Microcycles
            for micro in meso.get("microcycles", []):
                if y < 100:
                    c.showPage()
                    y = height - 50
                
                c.setFillColor(HexColor("#10B981"))
                c.setFont("Helvetica-Bold", 10)
                c.drawString(90, y, f"Sem {micro.get('week_number', '')}: {micro.get('name', '')} ({micro.get('type', '')})")
                y -= 12
                
                # Sessions summary
                sessions = micro.get("sessions", [])
                if sessions:
                    session_summary = ", ".join([f"D{s.get('day', '')}: {s.get('session_type', '')}" for s in sessions[:5]])
                    c.setFont("Helvetica", 8)
                    c.setFillColor(HexColor("#94a3b8"))
                    c.drawString(100, y, session_summary)
                    y -= 10
            
            y -= 5
        y -= 10
    
    # Footer
    c.setFont("Helvetica", 8)
    c.setFillColor(HexColor("#94a3b8"))
    c.drawString(50, 30, f"Generado por Sistema TRAIN - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    
    c.save()
    buffer.seek(0)
    
    filename = f"plan_{plan['name'].replace(' ', '_')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# =============== ENTITIES ROUTES (Federaciones, Clubes, Escuelas, etc.) ===============
@api_router.post("/entities", response_model=EntityResponse)
async def create_entity(entity: EntityCreate, user: dict = Depends(get_current_user)):
    """Crear una nueva entidad (Federación, Club, Escuela, etc.)"""
    entity_id = str(uuid.uuid4())
    doc = {
        "id": entity_id,
        "coach_id": user["id"],
        **entity.model_dump(),
        "entity_type": entity.entity_type.value,
        "athletes_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.entities.insert_one(doc)
    doc.pop("_id", None)
    return EntityResponse(**doc)

@api_router.get("/entities", response_model=List[EntityResponse])
async def get_entities(entity_type: Optional[EntityType] = None, user: dict = Depends(get_current_user)):
    """Obtener todas las entidades, opcionalmente filtradas por tipo"""
    query = {"coach_id": user["id"]}
    if entity_type:
        query["entity_type"] = entity_type.value
    entities = await db.entities.find(query, {"_id": 0}).to_list(1000)
    
    # Contar atletas afiliados a cada entidad
    for entity in entities:
        count = await db.athletes.count_documents({
            "coach_id": user["id"],
            "affiliations": entity["id"]
        })
        entity["athletes_count"] = count
    
    return [EntityResponse(**e) for e in entities]

@api_router.get("/entities/{entity_id}", response_model=EntityResponse)
async def get_entity(entity_id: str, user: dict = Depends(get_current_user)):
    """Obtener una entidad específica"""
    entity = await db.entities.find_one({"id": entity_id, "coach_id": user["id"]}, {"_id": 0})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Contar atletas
    count = await db.athletes.count_documents({
        "coach_id": user["id"],
        "affiliations": entity_id
    })
    entity["athletes_count"] = count
    
    return EntityResponse(**entity)

@api_router.put("/entities/{entity_id}", response_model=EntityResponse)
async def update_entity(entity_id: str, entity: EntityCreate, user: dict = Depends(get_current_user)):
    """Actualizar una entidad"""
    update_data = entity.model_dump()
    update_data["entity_type"] = entity.entity_type.value
    
    result = await db.entities.update_one(
        {"id": entity_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    updated = await db.entities.find_one({"id": entity_id}, {"_id": 0})
    return EntityResponse(**updated)

@api_router.delete("/entities/{entity_id}")
async def delete_entity(entity_id: str, user: dict = Depends(get_current_user)):
    """Eliminar una entidad"""
    # Primero, remover la afiliación de todos los atletas
    await db.athletes.update_many(
        {"coach_id": user["id"], "affiliations": entity_id},
        {"$pull": {"affiliations": entity_id}}
    )
    
    result = await db.entities.delete_one({"id": entity_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"message": "Entity deleted"}

@api_router.get("/entities/{entity_id}/athletes", response_model=List[AthleteResponse])
async def get_entity_athletes(entity_id: str, user: dict = Depends(get_current_user)):
    """Obtener todos los atletas afiliados a una entidad"""
    athletes = await db.athletes.find({
        "coach_id": user["id"],
        "affiliations": entity_id
    }, {"_id": 0}).to_list(1000)
    return [AthleteResponse(**a) for a in athletes]

@api_router.get("/entities-hierarchy")
async def get_entities_hierarchy(user: dict = Depends(get_current_user)):
    """Obtener la jerarquía completa de entidades"""
    entities = await db.entities.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    # Organizar por tipo
    hierarchy = {
        "federations": [],
        "clubs": [],
        "schools": [],
        "national_teams": [],
        "teams": [],
        "leagues": []
    }
    
    for entity in entities:
        entity_type = entity.get("entity_type", "club")
        count = await db.athletes.count_documents({
            "coach_id": user["id"],
            "affiliations": entity["id"]
        })
        entity["athletes_count"] = count
        
        if entity_type == "federation":
            hierarchy["federations"].append(entity)
        elif entity_type == "club":
            hierarchy["clubs"].append(entity)
        elif entity_type == "school":
            hierarchy["schools"].append(entity)
        elif entity_type == "national_team":
            hierarchy["national_teams"].append(entity)
        elif entity_type == "team":
            hierarchy["teams"].append(entity)
        elif entity_type == "league":
            hierarchy["leagues"].append(entity)
    
    return hierarchy

@api_router.get("/entity-types")
async def get_entity_types():
    """Obtener los tipos de entidades disponibles"""
    return [
        {"id": "federation", "name": "Federación", "icon": "🏛️", "description": "Organismo rector a nivel nacional o regional"},
        {"id": "club", "name": "Club", "icon": "🏢", "description": "Club deportivo afiliado"},
        {"id": "school", "name": "Escuela", "icon": "🏫", "description": "Escuela de formación deportiva"},
        {"id": "national_team", "name": "Selección Nacional", "icon": "🇺🇳", "description": "Equipo representativo nacional"},
        {"id": "team", "name": "Equipo/Categoría", "icon": "👥", "description": "Equipo o categoría específica"},
        {"id": "league", "name": "Liga/Torneo", "icon": "🏆", "description": "Competencia organizada"}
    ]

# =============== TEAMS ROUTES ===============
class TeamCreate(BaseModel):
    name: str
    sport: str = "other"
    category: Optional[str] = None
    entity_id: Optional[str] = None
    affiliations: Optional[dict] = None
    athletes: Optional[List[str]] = []

class TeamResponse(BaseModel):
    id: str
    coach_id: str
    name: str
    sport: str
    category: Optional[str] = None
    entity_id: Optional[str] = None
    affiliations: Optional[dict] = None
    athletes: Optional[List[str]] = []
    created_at: str

@api_router.post("/teams", response_model=TeamResponse)
async def create_team(team: TeamCreate, user: dict = Depends(get_current_user)):
    team_id = str(uuid.uuid4())
    doc = {
        "id": team_id,
        "coach_id": user["id"],
        "name": team.name,
        "sport": team.sport,
        "category": team.category,
        "entity_id": team.entity_id,
        "affiliations": team.affiliations or {},
        "athletes": team.athletes or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.teams.insert_one(doc)
    doc.pop("_id", None)
    return TeamResponse(**doc)

@api_router.get("/teams", response_model=List[TeamResponse])
async def get_teams(user: dict = Depends(get_current_user)):
    teams = await db.teams.find({"coach_id": user["id"]}, {"_id": 0}).to_list(1000)
    return [TeamResponse(**t) for t in teams]

@api_router.get("/teams/{team_id}", response_model=TeamResponse)
async def get_team(team_id: str, user: dict = Depends(get_current_user)):
    team = await db.teams.find_one({"id": team_id, "coach_id": user["id"]}, {"_id": 0})
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return TeamResponse(**team)

@api_router.put("/teams/{team_id}", response_model=TeamResponse)
async def update_team(team_id: str, team: TeamCreate, user: dict = Depends(get_current_user)):
    update_data = team.model_dump(exclude_unset=True)
    result = await db.teams.update_one(
        {"id": team_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    updated = await db.teams.find_one({"id": team_id}, {"_id": 0})
    return TeamResponse(**updated)

@api_router.delete("/teams/{team_id}")
async def delete_team(team_id: str, user: dict = Depends(get_current_user)):
    result = await db.teams.delete_one({"id": team_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted successfully"}

@api_router.post("/teams/{team_id}/athletes/{athlete_id}")
async def add_athlete_to_team(team_id: str, athlete_id: str, user: dict = Depends(get_current_user)):
    result = await db.teams.update_one(
        {"id": team_id, "coach_id": user["id"]},
        {"$addToSet": {"athletes": athlete_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Athlete added to team"}

@api_router.delete("/teams/{team_id}/athletes/{athlete_id}")
async def remove_athlete_from_team(team_id: str, athlete_id: str, user: dict = Depends(get_current_user)):
    result = await db.teams.update_one(
        {"id": team_id, "coach_id": user["id"]},
        {"$pull": {"athletes": athlete_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Athlete removed from team"}

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

async def seed_default_sports(coach_id: str):
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

@api_router.get("/sports/catalog")
async def get_sports_catalog(user: dict = Depends(get_current_user)):
    """Get full sports catalog with categories and sports"""
    # Seed default sports if user doesn't have any
    await seed_default_sports(user["id"])
    
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

@api_router.post("/sports/categories")
async def create_sport_category(category: SportCategoryCreate, user: dict = Depends(get_current_user)):
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

@api_router.put("/sports/categories/{category_id}")
async def update_sport_category(category_id: str, category: SportCategoryCreate, user: dict = Depends(get_current_user)):
    """Update a sport category"""
    result = await db.sport_categories.update_one(
        {"id": category_id, "coach_id": user["id"]},
        {"$set": category.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    updated = await db.sport_categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@api_router.delete("/sports/categories/{category_id}")
async def delete_sport_category(category_id: str, user: dict = Depends(get_current_user)):
    """Delete a sport category and all its sports"""
    result = await db.sport_categories.delete_one({"id": category_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    # Also delete all sports in this category
    await db.sports.delete_many({"category_id": category_id, "coach_id": user["id"]})
    return {"message": "Category and sports deleted"}

@api_router.post("/sports")
async def create_sport(sport: SportCreate, user: dict = Depends(get_current_user)):
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

@api_router.delete("/sports/{sport_id}")
async def delete_sport(sport_id: str, user: dict = Depends(get_current_user)):
    """Delete a sport"""
    result = await db.sports.delete_one({"id": sport_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sport not found")
    return {"message": "Sport deleted"}

@api_router.put("/sports/{sport_id}/characterization")
async def update_sport_characterization(sport_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update sport technical characterization"""
    characterization = data.get("characterization", {})
    result = await db.sports.update_one(
        {"id": sport_id, "coach_id": user["id"]},
        {"$set": {"characterization": characterization}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Sport not found")
    return {"message": "Characterization updated", "characterization": characterization}

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
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.athletes.insert_one(doc)
    
    # Add athlete to team if team_id provided
    if athlete.team_id:
        await db.teams.update_one(
            {"id": athlete.team_id, "coach_id": user["id"]},
            {"$addToSet": {"athletes": athlete_id}}
        )
    
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
    update_data = athlete.model_dump()
    result = await db.athletes.update_one(
        {"id": athlete_id, "coach_id": user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Athlete not found")
    
    # Handle team change
    if athlete.team_id:
        # Remove from old teams first
        await db.teams.update_many(
            {"coach_id": user["id"], "athletes": athlete_id},
            {"$pull": {"athletes": athlete_id}}
        )
        # Add to new team
        await db.teams.update_one(
            {"id": athlete.team_id, "coach_id": user["id"]},
            {"$addToSet": {"athletes": athlete_id}}
        )
    
    updated = await db.athletes.find_one({"id": athlete_id}, {"_id": 0})
    return AthleteResponse(**updated)

@api_router.delete("/athletes/{athlete_id}")
async def delete_athlete(athlete_id: str, user: dict = Depends(get_current_user)):
    # Remove from any teams first
    await db.teams.update_many(
        {"coach_id": user["id"], "athletes": athlete_id},
        {"$pull": {"athletes": athlete_id}}
    )
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
    byes = total_slots - n
    
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

@api_router.post("/tournaments", response_model=TournamentResponse)
async def create_tournament(tournament: TournamentCreate, user: dict = Depends(get_current_user)):
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

@api_router.get("/tournaments", response_model=List[TournamentResponse])
async def get_tournaments(status: Optional[TournamentStatus] = None, user: dict = Depends(get_current_user)):
    """Obtener todos los torneos del usuario"""
    query = {"coach_id": user["id"]}
    if status:
        query["status"] = status.value
    tournaments = await db.tournaments.find(query, {"_id": 0}).to_list(1000)
    return [TournamentResponse(**t) for t in tournaments]

@api_router.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    """Obtener un torneo específico"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return TournamentResponse(**tournament)

@api_router.put("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(tournament_id: str, tournament: TournamentCreate, user: dict = Depends(get_current_user)):
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

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    """Eliminar un torneo"""
    # También eliminar partidos asociados
    await db.matches.delete_many({"tournament_id": tournament_id})
    
    result = await db.tournaments.delete_one({"id": tournament_id, "coach_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"message": "Tournament deleted"}

@api_router.post("/tournaments/{tournament_id}/categories")
async def add_tournament_category(tournament_id: str, category: TournamentCategoryCreate, user: dict = Depends(get_current_user)):
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

@api_router.delete("/tournaments/{tournament_id}/categories/{category_id}")
async def delete_tournament_category(tournament_id: str, category_id: str, user: dict = Depends(get_current_user)):
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

@api_router.post("/tournaments/{tournament_id}/categories/{category_id}/register")
async def register_participant(
    tournament_id: str, 
    category_id: str, 
    registration: ParticipantRegistration,
    user: dict = Depends(get_current_user)
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

@api_router.delete("/tournaments/{tournament_id}/categories/{category_id}/participants/{participant_id}")
async def remove_participant(
    tournament_id: str,
    category_id: str,
    participant_id: str,
    user: dict = Depends(get_current_user)
):
    """Remover participante de una categoría"""
    result = await db.tournaments.update_one(
        {"id": tournament_id, "coach_id": user["id"], "categories.id": category_id},
        {"$pull": {"categories.$.participants": {"id": participant_id}}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tournament or category not found")
    return {"message": "Participant removed"}

@api_router.post("/tournaments/{tournament_id}/categories/{category_id}/generate-bracket")
async def generate_bracket(tournament_id: str, category_id: str, user: dict = Depends(get_current_user)):
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

@api_router.get("/tournaments/{tournament_id}/matches")
async def get_tournament_matches(
    tournament_id: str,
    category_id: Optional[str] = None,
    round_number: Optional[int] = None,
    status: Optional[MatchStatus] = None,
    user: dict = Depends(get_current_user)
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

@api_router.put("/tournaments/{tournament_id}/matches/{match_id}/score")
async def update_match_score(
    tournament_id: str,
    match_id: str,
    score: MatchScoreUpdate,
    user: dict = Depends(get_current_user)
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
        await update_standings(tournament_id, updated_match.get("category_id"), tournament)
    
    return {"message": "Score updated", "match": updated_match}

async def update_standings(tournament_id: str, category_id: str, tournament: dict):
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

@api_router.get("/tournaments/{tournament_id}/standings/{category_id}")
async def get_category_standings(tournament_id: str, category_id: str, user: dict = Depends(get_current_user)):
    """Obtener tabla de posiciones de una categoría"""
    tournament = await db.tournaments.find_one({"id": tournament_id, "coach_id": user["id"]})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    for cat in tournament.get("categories", []):
        if cat["id"] == category_id:
            return cat.get("standings", [])
    
    raise HTTPException(status_code=404, detail="Category not found")

# =============== TOURNAMENT PUBLIC VIEW ===============
@api_router.get("/tournaments/public/{share_id}")
async def get_public_tournament(share_id: str):
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
@api_router.get("/tournaments/{tournament_id}/export-pdf")
async def export_tournament_pdf(tournament_id: str, user: dict = Depends(get_current_user)):
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
                    s.get("name", "N/A")[:20],
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
                    m.get("participant1_name", "TBD")[:15],
                    score_str,
                    m.get("participant2_name", "TBD")[:15],
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
    story.append(Paragraph(f"Generado por Sistema TRAIN - {datetime.now().strftime('%d/%m/%Y %H:%M')}", 
                          ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
    
    doc.build(story)
    buffer.seek(0)
    
    filename = f"torneo_{tournament.get('name', 'export').replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

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
                    except Exception:
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

# =============== COMPREHENSIVE PDF EXPORT ===============
class ComprehensivePDFSection(BaseModel):
    section: str
    items: List[str]

class ComprehensivePDFFormat(BaseModel):
    paper_size: str = "letter"
    orientation: str = "portrait"
    color_scheme: str = "color"
    include_logo: bool = True
    include_date: bool = True
    include_page_numbers: bool = True

class ComprehensivePDFRequest(BaseModel):
    athlete_id: Optional[str] = None
    sections: List[ComprehensivePDFSection]
    format: ComprehensivePDFFormat
    periodization_data: Optional[dict] = None

@api_router.post("/export/comprehensive-pdf")
async def export_comprehensive_pdf(request: ComprehensivePDFRequest, user: dict = Depends(get_current_user)):
    """Exporta un reporte PDF completo y personalizable con diseño Material Design"""
    from reportlab.lib.units import inch
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4, legal, landscape
    from reportlab.lib.enums import TA_LEFT, TA_CENTER
    import io
    
    # Determine page size
    page_sizes = {
        'letter': letter,
        'a4': A4,
        'legal': legal
    }
    page_size = page_sizes.get(request.format.paper_size, letter)
    page_width = page_size[0] - 1.5*inch  # Available width
    
    if request.format.orientation == 'landscape':
        page_size = landscape(page_size)
        page_width = page_size[0] - 1.5*inch
    
    # Material Design Color Palette
    SECTION_COLORS = {
        'athlete_info': {'primary': '#1976D2', 'light': '#E3F2FD', 'dark': '#0D47A1'},
        'characterization': {'primary': '#7B1FA2', 'light': '#F3E5F5', 'dark': '#4A148C'},
        'anthropometric': {'primary': '#388E3C', 'light': '#E8F5E9', 'dark': '#1B5E20'},
        'evaluations': {'primary': '#F57C00', 'light': '#FFF3E0', 'dark': '#E65100'},
        'medical': {'primary': '#D32F2F', 'light': '#FFEBEE', 'dark': '#B71C1C'},
        'analysis': {'primary': '#00796B', 'light': '#E0F2F1', 'dark': '#004D40'},
        'objectives': {'primary': '#512DA8', 'light': '#EDE7F6', 'dark': '#311B92'},
        'periodization': {'primary': '#303F9F', 'light': '#E8EAF6', 'dark': '#1A237E'},
        'training_methods': {'primary': '#C2185B', 'light': '#FCE4EC', 'dark': '#880E4F'},
        'graphic_plan': {'primary': '#0097A7', 'light': '#E0F7FA', 'dark': '#006064'},
        'control': {'primary': '#455A64', 'light': '#ECEFF1', 'dark': '#263238'},
        'calendar': {'primary': '#FFA000', 'light': '#FFF8E1', 'dark': '#FF6F00'},
    }
    
    # Color scheme handling
    use_colors = request.format.color_scheme == 'color'
    if request.format.color_scheme == 'grayscale':
        primary_color = colors.HexColor('#374151')
        bg_color = colors.HexColor('#F3F4F6')
    elif request.format.color_scheme == 'bw':
        primary_color = colors.black
        bg_color = colors.white
    else:
        primary_color = colors.HexColor('#1976D2')
        bg_color = colors.HexColor('#F5F5F5')
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=page_size, topMargin=0.6*inch, bottomMargin=0.6*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)
    
    # Styles
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name='MainTitle',
        parent=styles['Heading1'],
        fontSize=28,
        spaceAfter=6,
        textColor=colors.HexColor('#1976D2') if use_colors else colors.black,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='Subtitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=20,
        textColor=colors.HexColor('#616161'),
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=14,
        spaceBefore=20,
        spaceAfter=12,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        leftIndent=10,
        rightIndent=10
    ))
    styles.add(ParagraphStyle(
        name='SubSectionTitle',
        parent=styles['Heading3'],
        fontSize=11,
        spaceBefore=10,
        spaceAfter=6,
        textColor=colors.HexColor('#424242'),
        fontName='Helvetica-Bold'
    ))
    styles.add(ParagraphStyle(
        name='QuestionText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1976D2') if use_colors else colors.HexColor('#424242'),
        fontName='Helvetica-Bold',
        spaceAfter=2
    ))
    styles.add(ParagraphStyle(
        name='AnswerText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#212121'),
        spaceAfter=10,
        leftIndent=10
    ))
    styles.add(ParagraphStyle(
        name='NoDataText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#9E9E9E'),
        fontStyle='italic',
        spaceAfter=10,
        leftIndent=10
    ))
    styles.add(ParagraphStyle(
        name='TableHeader',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.white,
        fontName='Helvetica-Bold',
        alignment=TA_CENTER
    ))
    styles.add(ParagraphStyle(
        name='TableCell',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.HexColor('#212121')
    ))
    
    def get_section_color(section_id):
        """Get color for section based on Material Design palette"""
        if not use_colors:
            return colors.HexColor('#424242')
        return colors.HexColor(SECTION_COLORS.get(section_id, {'primary': '#607D8B'})['primary'])
    
    def get_section_bg(section_id):
        """Get light background color for section"""
        if not use_colors:
            return colors.HexColor('#F5F5F5')
        return colors.HexColor(SECTION_COLORS.get(section_id, {'light': '#ECEFF1'})['light'])
    
    def create_section_header(title, section_id):
        """Create a colored section header"""
        color = get_section_color(section_id)
        header_data = [[Paragraph(title, styles['SectionHeader'])]]
        header_table = Table(header_data, colWidths=[page_width])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), color),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ]))
        return header_table
    
    def create_qa_block(question, answer, section_id=None):
        """Create a question-answer block with Material Design styling"""
        if not answer or answer == 'N/A' or answer.strip() == '':
            answer_para = Paragraph("Sin información registrada", styles['NoDataText'])
        else:
            answer_para = Paragraph(str(answer), styles['AnswerText'])
        return [
            Paragraph(f"▸ {question}", styles['QuestionText']),
            answer_para
        ]
    
    def create_data_table(headers, rows, section_id):
        """Create a styled data table with Material Design colors"""
        color = get_section_color(section_id)
        light_bg = get_section_bg(section_id)
        
        # Create header row with Paragraph objects
        header_row = [Paragraph(h, styles['TableHeader']) for h in headers]
        data = [header_row] + rows
        
        col_widths = [page_width / len(headers)] * len(headers)
        table = Table(data, colWidths=col_widths)
        
        style_commands = [
            ('BACKGROUND', (0, 0), (-1, 0), color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E0E0E0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
        ]
        
        # Alternate row colors
        for i in range(1, len(data)):
            if i % 2 == 0:
                style_commands.append(('BACKGROUND', (0, i), (-1, i), light_bg))
        
        table.setStyle(TableStyle(style_commands))
        return table
    
    elements = []
    
    # Header with Material Design styling
    if request.format.include_logo:
        # Create header card
        header_data = [[
            Paragraph("TRAIN", styles['MainTitle']),
        ], [
            Paragraph("Sistema de Planificación Deportiva", styles['Subtitle'])
        ]]
        header_table = Table(header_data, colWidths=[page_width])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#E0E0E0')),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.2*inch))
    
    if request.format.include_date:
        date_str = datetime.now().strftime("%d de %B de %Y")
        elements.append(Paragraph(f"Reporte generado el {date_str}", styles['Subtitle']))
        elements.append(Spacer(1, 0.2*inch))
    
    # Load athlete data if provided
    athlete = None
    if request.athlete_id:
        athlete = await db.athletes.find_one({"id": request.athlete_id, "coach_id": user["id"]}, {"_id": 0})
    
    # Process each section
    for section_config in request.sections:
        section_id = section_config.section
        items = section_config.items
        
        # ===== ATHLETE INFO =====
        if section_id == 'athlete_info':
            elements.append(create_section_header("INFORMACIÓN DEL ATLETA", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if athlete:
                if 'basic_info' in items:
                    elements.append(Paragraph("Datos Básicos del Deportista", styles['SubSectionTitle']))
                    elements.extend(create_qa_block("Nombre completo", athlete.get('name', ''), section_id))
                    elements.extend(create_qa_block("Deporte que practica", athlete.get('sport', '').capitalize() if athlete.get('sport') else '', section_id))
                    elements.extend(create_qa_block("Edad", f"{athlete.get('age', '')} años" if athlete.get('age') else '', section_id))
                    elements.extend(create_qa_block("Nivel competitivo", athlete.get('level', '').capitalize() if athlete.get('level') else '', section_id))
                    if athlete.get('email'):
                        elements.extend(create_qa_block("Email de contacto", athlete.get('email', ''), section_id))
                    elements.append(Spacer(1, 0.1*inch))
            
                if 'affiliations' in items:
                    elements.append(Paragraph("Afiliaciones a Entidades", styles['SubSectionTitle']))
                    affiliations = athlete.get('affiliations', []) if athlete else []
                    if affiliations:
                        entity_names = []
                        for aff_id in affiliations:
                            entity = await db.entities.find_one({"id": aff_id}, {"_id": 0, "name": 1, "entity_type": 1})
                            if entity:
                                entity_names.append(f"{entity.get('name')} ({entity.get('entity_type', '').capitalize()})")
                        if entity_names:
                            for name in entity_names:
                                elements.append(Paragraph(f"• {name}", styles['AnswerText']))
                        else:
                            elements.append(Paragraph("Sin afiliaciones registradas", styles['NoDataText']))
                    else:
                        elements.append(Paragraph("Sin afiliaciones registradas", styles['NoDataText']))
                    elements.append(Spacer(1, 0.1*inch))
            else:
                # No athlete selected
                elements.append(Paragraph("Seleccione un atleta para ver sus datos", styles['NoDataText']))
                elements.append(Spacer(1, 0.2*inch))
        
        # ===== CHARACTERIZATION =====
        elif section_id == 'characterization':
            elements.append(create_section_header("CARACTERIZACIÓN", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver la caracterización", styles['NoDataText']))
                elements.append(Spacer(1, 0.2*inch))
            else:
                if 'sport_char' in items:
                    sport_char = await db.sport_characterizations.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ) or {}  # Use empty dict if no data
                    elements.append(Paragraph("1. Caracterización del Deporte", styles['SubSectionTitle']))
                    # Always show all questions, even without data
                    elements.extend(create_qa_block("Nombre del deporte o actividad física", sport_char.get('sportName', ''), section_id))
                    elements.extend(create_qa_block("Descripción general", sport_char.get('description', ''), section_id))
                    elements.extend(create_qa_block("Organización de los movimientos", sport_char.get('movementOrganization', ''), section_id))
                    elements.extend(create_qa_block("Sistema energético predominante", sport_char.get('predominantEnergy', ''), section_id))
                    elements.extend(create_qa_block("Sistema energético determinante", sport_char.get('determinantEnergy', ''), section_id))
                    elements.extend(create_qa_block("Tipos de fibras musculares predominantes", sport_char.get('muscularFibers', ''), section_id))
                    elements.extend(create_qa_block("Sustrato energético utilizado", sport_char.get('energySubstrate', ''), section_id))
                    elements.extend(create_qa_block("Cualidades motrices generales", sport_char.get('generalMotor', ''), section_id))
                    elements.extend(create_qa_block("Cualidades motrices especiales", sport_char.get('specialMotor', ''), section_id))
                    elements.extend(create_qa_block("Tipo de esfuerzo predominante", sport_char.get('effortType', ''), section_id))
                    elements.extend(create_qa_block("Observaciones adicionales", sport_char.get('observation', ''), section_id))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'athlete_char' in items:
                    athlete_char = await db.athlete_characterizations.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ) or {}  # Use empty dict if no data
                    elements.append(Paragraph("2. Caracterización del Deportista", styles['SubSectionTitle']))
                    # Always show all questions
                    # Información General
                    elements.append(Paragraph("Información General", styles['QuestionText']))
                    elements.extend(create_qa_block("Nombre del deportista", athlete_char.get('name', ''), section_id))
                    elements.extend(create_qa_block("Edad", athlete_char.get('age', ''), section_id))
                    elements.extend(create_qa_block("Años de experiencia", athlete_char.get('experience', ''), section_id))
                    elements.extend(create_qa_block("Posición o especialidad", athlete_char.get('position', ''), section_id))
                    elements.extend(create_qa_block("Nivel competitivo", athlete_char.get('level', ''), section_id))
                    elements.extend(create_qa_block("Observaciones generales", athlete_char.get('observation', ''), section_id))
                    
                    # Aspectos Biológicos
                    elements.append(Paragraph("Aspectos Biológicos y Hereditarios", styles['QuestionText']))
                    elements.extend(create_qa_block("Herencia genética", athlete_char.get('inheritance', ''), section_id))
                    elements.extend(create_qa_block("Edad biológica vs cronológica", athlete_char.get('biologicalAge', ''), section_id))
                    elements.extend(create_qa_block("Edad óptima de selección", athlete_char.get('optimalSelectionAge', ''), section_id))
                    
                    # Estado de Salud
                    elements.append(Paragraph("Estado de Salud y Condición Física", styles['QuestionText']))
                    elements.extend(create_qa_block("Estado de salud general", athlete_char.get('healthStatus', ''), section_id))
                    elements.extend(create_qa_block("Parámetros antropométricos", athlete_char.get('anthropometricParams', ''), section_id))
                    elements.extend(create_qa_block("Desarrollo de cualidades físicas y coordinativas", athlete_char.get('physicalQualities', ''), section_id))
                    
                    # Aspectos Psicológicos
                    elements.append(Paragraph("Aspectos Psicológicos y Cognitivos", styles['QuestionText']))
                    elements.extend(create_qa_block("Características psicológicas", athlete_char.get('psychologicalCharacteristics', ''), section_id))
                    elements.extend(create_qa_block("Capacidades cognitivas", athlete_char.get('cognitiveCapabilities', ''), section_id))
                    
                    # Entorno Socioeconómico
                    elements.append(Paragraph("Entorno Socioeconómico", styles['QuestionText']))
                    elements.extend(create_qa_block("Características socio-económicas", athlete_char.get('socioeconomicCharacteristics', ''), section_id))
                    elements.extend(create_qa_block("Conocimiento de su entorno", athlete_char.get('environment', ''), section_id))
                    
                    # Nutrición
                    elements.extend(create_qa_block("Estado nutricional del deportista", athlete_char.get('nutritionalStatus', ''), section_id))
                    
                    # Trayectoria
                    elements.append(Paragraph("Trayectoria Deportiva", styles['QuestionText']))
                    elements.extend(create_qa_block("Trayectoria deportiva", athlete_char.get('sportsTrajectory', ''), section_id))
                    elements.extend(create_qa_block("Experiencia en otros deportes", athlete_char.get('otherSportsExperience', ''), section_id))
                    
                    # Rendimiento
                    elements.append(Paragraph("Rendimiento y Objetivos", styles['QuestionText']))
                    elements.extend(create_qa_block("¿Cuál fue su rendimiento en la temporada anterior?", athlete_char.get('previousSeasonPerformance', ''), section_id))
                    elements.extend(create_qa_block("¿Qué objetivos se plantearon y qué porcentaje se cumplió?", athlete_char.get('objectives', ''), section_id))
                    
                    # Entrenamiento
                    elements.append(Paragraph("Entrenamiento y Forma Actual", styles['QuestionText']))
                    elements.extend(create_qa_block("Niveles de entrenamiento realizados", athlete_char.get('trainingLevels', ''), section_id))
                    elements.extend(create_qa_block("¿Cuál es su forma actual?", athlete_char.get('currentForm', ''), section_id))
                    
                    # Lesiones
                    elements.extend(create_qa_block("Historial de lesiones", athlete_char.get('injuries', ''), section_id))
                elements.append(Spacer(1, 0.2*inch))
        
        # ===== ANTHROPOMETRIC DATA =====
        elif section_id == 'anthropometric':
            elements.append(create_section_header("DATOS ANTROPOMÉTRICOS", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver datos antropométricos", styles['NoDataText']))
            else:
                anthro_data = await db.anthropometric_data.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
                
                if anthro_data and anthro_data.get('records'):
                    latest = anthro_data['records'][-1] if anthro_data.get('records') else {}
                    measurements = latest.get('measurements', {})
                    
                    if 'measurements' in items and measurements:
                        elements.append(Paragraph("Mediciones Antropométricas Actuales", styles['SubSectionTitle']))
                        elements.extend(create_qa_block("Peso corporal", f"{measurements.get('weight', '')} kg" if measurements.get('weight') else '', section_id))
                        elements.extend(create_qa_block("Talla / Estatura", f"{measurements.get('height', '')} cm" if measurements.get('height') else '', section_id))
                        elements.extend(create_qa_block("Índice de Masa Corporal (IMC)", str(measurements.get('bmi', '')) if measurements.get('bmi') else '', section_id))
                        if measurements.get('body_fat'):
                            elements.extend(create_qa_block("Porcentaje de grasa corporal", f"{measurements.get('body_fat', '')}%", section_id))
                        if measurements.get('muscle_mass'):
                            elements.extend(create_qa_block("Masa muscular", f"{measurements.get('muscle_mass', '')} kg", section_id))
                else:
                    elements.append(Paragraph("Sin datos antropométricos registrados", styles['NoDataText']))
            
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== EVALUATIONS =====
        elif section_id == 'evaluations':
            elements.append(create_section_header("EVALUACIONES Y TESTS", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver evaluaciones", styles['NoDataText']))
            else:
                test_data = await db.tests.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
                
                if test_data and test_data.get('tests'):
                    tests = test_data['tests'][-10:]  # Last 10 tests
                    
                    if 'physical_tests' in items:
                        elements.append(Paragraph("Tests Físicos Recientes", styles['SubSectionTitle']))
                        table = create_data_table(
                            ['Fecha', 'Nombre del Test', 'Resultado', 'Notas'],
                            [[
                                test.get('date', 'N/A')[:10] if test.get('date') else 'N/A',
                                test.get('name', 'N/A'),
                                str(test.get('result', 'N/A')),
                                test.get('notes', '-')[:30] if test.get('notes') else '-'
                            ] for test in tests],
                            section_id
                        )
                        elements.append(table)
                        elements.append(Spacer(1, 0.15*inch))
                else:
                    elements.append(Paragraph("Sin evaluaciones registradas", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== MEDICAL HISTORY =====
        elif section_id == 'medical':
            elements.append(create_section_header("HISTORIAL MÉDICO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver historial médico", styles['NoDataText']))
            else:
                if 'diagnostic' in items:
                    elements.append(Paragraph("Diagnóstico General", styles['SubSectionTitle']))
                    diagnostic = await db.diagnostics.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    )
                    if diagnostic:
                        elements.extend(create_qa_block("Estado general de salud", diagnostic.get('general_status', ''), section_id))
                        elements.extend(create_qa_block("Observaciones médicas", diagnostic.get('observations', ''), section_id))
                    else:
                        elements.append(Paragraph("Sin diagnóstico registrado", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'injuries' in items:
                    elements.append(Paragraph("Historial de Lesiones", styles['SubSectionTitle']))
                    injuries = await db.injuries.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(10)
                    if injuries:
                        for injury in injuries[:5]:
                            elements.extend(create_qa_block(
                                f"Lesión - {injury.get('location', 'Sin ubicación')}",
                                f"Tipo: {injury.get('type', 'N/A')} | Fecha: {injury.get('date', 'N/A')[:10] if injury.get('date') else 'N/A'} | Severidad: {injury.get('severity', 'N/A')} | Tratamiento: {injury.get('treatment', 'N/A')}",
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin lesiones registradas", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'diseases' in items:
                    elements.append(Paragraph("Enfermedades y Condiciones", styles['SubSectionTitle']))
                    diseases = await db.diseases.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(10)
                    if diseases:
                        for disease in diseases[:5]:
                            elements.extend(create_qa_block(
                                disease.get('name', 'Condición sin nombre'),
                                f"Estado: {disease.get('status', 'N/A')} | Descripción: {disease.get('description', 'N/A')}",
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin enfermedades registradas", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== ANALYSIS =====
        elif section_id == 'analysis':
            elements.append(create_section_header("ANÁLISIS PREVIO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver análisis previo", styles['NoDataText']))
            else:
                if 'previous_plan' in items:
                    elements.append(Paragraph("Análisis del Plan Anterior", styles['SubSectionTitle']))
                    prev_analysis = await db.previous_plan_analysis.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ) or {}  # Use empty dict if no data
                    
                    # Always show all questions - Objetivos y Cumplimiento
                    elements.extend(create_qa_block("¿Cuáles eran los objetivos al inicio del plan de entrenamiento?", prev_analysis.get('initialObjectives', ''), section_id))
                    elements.extend(create_qa_block("¿En qué medida se alcanzaron estos objetivos?", prev_analysis.get('achievementLevel', ''), section_id))
                    elements.extend(create_qa_block("Nivel de cumplimiento de objetivos planteados", prev_analysis.get('objectivesCompliance', ''), section_id))
                    
                    # Rendimiento
                    elements.extend(create_qa_block("¿Cómo evolucionó el rendimiento en los indicadores clave?", prev_analysis.get('performanceIndicators', ''), section_id))
                    elements.extend(create_qa_block("Resultados obtenidos - nivel de rendimiento de la temporada anterior", prev_analysis.get('performanceResults', ''), section_id))
                    
                    # Recuperación
                    elements.extend(create_qa_block("¿Cómo calificarías el proceso de recuperación entre sesiones?", prev_analysis.get('recoveryProcess', ''), section_id))
                    elements.extend(create_qa_block("¿Experimentaste algún periodo de fatiga prolongada?", prev_analysis.get('fatiguePeriods', ''), section_id))
                    
                    # Lesiones
                    elements.extend(create_qa_block("¿Sufriste alguna lesión durante el plan?", prev_analysis.get('injuries', ''), section_id))
                    elements.extend(create_qa_block("¿Cómo afectaron las lesiones tu entrenamiento?", prev_analysis.get('injuryImpact', ''), section_id))
                    
                    # Fortalezas y Debilidades
                    elements.extend(create_qa_block("Aspectos positivos del plan", prev_analysis.get('planPositiveAspects', ''), section_id))
                    elements.extend(create_qa_block("Áreas de mejora del plan", prev_analysis.get('planImprovementAreas', ''), section_id))
                    
                    # Nutrición
                    elements.extend(create_qa_block("Hábitos de nutrición", prev_analysis.get('nutritionHabits', ''), section_id))
                    elements.extend(create_qa_block("Hábitos de hidratación", prev_analysis.get('hydrationHabits', ''), section_id))
                    
                    # Psicológico
                    elements.extend(create_qa_block("Manejo del estrés", prev_analysis.get('stressManagement', ''), section_id))
                    elements.extend(create_qa_block("Presión en competencias", prev_analysis.get('competitionPressure', ''), section_id))
                    
                    # Cambios propuestos
                    elements.extend(create_qa_block("¿Qué cambios específicos se proponen?", prev_analysis.get('specificChanges', ''), section_id))
                    elements.extend(create_qa_block("Cambios para el próximo ciclo", prev_analysis.get('nextCycleChanges', ''), section_id))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'competition_analysis' in items:
                    elements.append(Paragraph("Análisis de Competencias", styles['SubSectionTitle']))
                    comp_analysis = await db.competition_analysis.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(5)
                    if comp_analysis:
                        for comp in comp_analysis:
                            elements.extend(create_qa_block(
                                comp.get('competition_name', 'Competencia'),
                                f"Posición: {comp.get('position', 'N/A')} | Resultado: {comp.get('result', 'N/A')} | Observaciones: {comp.get('observations', 'N/A')}",
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin análisis de competencias", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== OBJECTIVES =====
        elif section_id == 'objectives':
            elements.append(create_section_header("OBJETIVOS E INDICADORES", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver objetivos", styles['NoDataText']))
            else:
                objectives_data = await db.objectives.find_one(
                    {"athlete_id": request.athlete_id}, {"_id": 0}
                )
                
                if objectives_data and objectives_data.get('objectives'):
                    objs = objectives_data['objectives']
                    
                    # Categorías de objetivos
                    category_labels = {
                        'performance': 'Rendimiento',
                        'physical': 'Físico',
                        'technical': 'Técnico',
                        'tactical': 'Táctico',
                        'psychological': 'Psicológico',
                        'competition': 'Competitivo',
                        'general': 'General'
                    }
                    
                    timeframe_labels = {
                        'short': 'Corto Plazo (1-3 meses)',
                        'medium': 'Medio Plazo (3-6 meses)',
                        'long': 'Largo Plazo (6-12 meses)',
                        'season': 'Temporada Completa'
                    }
                    
                    if 'general_objectives' in items:
                        elements.append(Paragraph("Objetivos por Categoría", styles['SubSectionTitle']))
                        
                        # Group objectives by category
                        by_category = {}
                        for obj in objs:
                            cat = obj.get('category', 'general')
                            if cat not in by_category:
                                by_category[cat] = []
                            by_category[cat].append(obj)
                        
                        for cat, cat_objs in by_category.items():
                            cat_label = category_labels.get(cat, cat.capitalize())
                            elements.append(Paragraph(f"● {cat_label}", styles['QuestionText']))
                            for obj in cat_objs[:5]:
                                title = obj.get('title', obj.get('name', 'Sin título'))
                                timeframe = timeframe_labels.get(obj.get('timeframe', ''), obj.get('timeframe', ''))
                                progress = obj.get('progress', 0)
                                description = obj.get('description', '')
                                
                                obj_text = f"<b>{title}</b><br/>"
                                if timeframe:
                                    obj_text += f"Plazo: {timeframe}<br/>"
                                obj_text += f"Progreso: {progress}%<br/>"
                                if description:
                                    obj_text += f"Descripción: {description}"
                                
                                elements.append(Paragraph(obj_text, styles['AnswerText']))
                        elements.append(Spacer(1, 0.15*inch))
                    
                    if 'kpis' in items:
                        elements.append(Paragraph("Indicadores de Rendimiento (KPIs)", styles['SubSectionTitle']))
                        # Collect all indicators from objectives
                        kpis = []
                        for obj in objs:
                            for ind in obj.get('indicators', []):
                                if ind.get('name'):
                                    kpis.append(ind)
                        
                        if kpis:
                            table = create_data_table(
                                ['Indicador', 'Línea Base', 'Meta', 'Actual', 'Unidad'],
                                [[
                                    kpi.get('name', 'N/A'),
                                    str(kpi.get('baseline', '-')),
                                    str(kpi.get('target', '-')),
                                    str(kpi.get('current', '-')),
                                    kpi.get('unit', '-')
                                ] for kpi in kpis[:10]],
                                section_id
                            )
                            elements.append(table)
                        else:
                            elements.append(Paragraph("Sin indicadores definidos", styles['NoDataText']))
                else:
                    elements.append(Paragraph("Sin objetivos registrados", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== TRAINING METHODS =====
        elif section_id == 'training_methods':
            elements.append(create_section_header("MEDIOS DE ENTRENAMIENTO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver medios de entrenamiento", styles['NoDataText']))
            else:
                if 'exercises' in items:
                    elements.append(Paragraph("Ejercicios Seleccionados", styles['SubSectionTitle']))
                    # Get exercises assigned to athlete
                    athlete_exercises = await db.athlete_exercises.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(20)
                    if athlete_exercises:
                        table = create_data_table(
                            ['Ejercicio', 'Categoría', 'Músculo Principal'],
                            [[
                                ex.get('name', 'N/A'),
                                ex.get('category', 'N/A'),
                                ex.get('primary_muscle', 'N/A')
                            ] for ex in athlete_exercises[:10]],
                            section_id
                        )
                        elements.append(table)
                    else:
                        elements.append(Paragraph("Sin ejercicios asignados", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'methods' in items:
                    elements.append(Paragraph("Métodos de Entrenamiento", styles['SubSectionTitle']))
                    methods = await db.training_methods.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).to_list(10)
                    if methods:
                        for method in methods[:5]:
                            elements.extend(create_qa_block(
                                method.get('name', 'Método sin nombre'),
                                method.get('description', ''),
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin métodos definidos", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== CONTROL =====
        elif section_id == 'control':
            elements.append(create_section_header("CONTROL Y SEGUIMIENTO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            if not request.athlete_id:
                elements.append(Paragraph("Seleccione un atleta para ver control y seguimiento", styles['NoDataText']))
            else:
                if 'load_monitoring' in items:
                    elements.append(Paragraph("Monitoreo de Carga de Entrenamiento", styles['SubSectionTitle']))
                    load_data = await db.training_load.find(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    ).sort("date", -1).to_list(10)
                    if load_data:
                        table = create_data_table(
                            ['Fecha', 'Carga Planificada', 'Carga Real', 'RPE', 'Fatiga'],
                            [[
                                load.get('date', 'N/A')[:10] if load.get('date') else 'N/A',
                                str(load.get('planned_load', '-')),
                                str(load.get('actual_load', '-')),
                                str(load.get('rpe', '-')),
                                str(load.get('fatigue', '-'))
                            ] for load in load_data[:7]],
                            section_id
                        )
                        elements.append(table)
                    else:
                        elements.append(Paragraph("Sin datos de carga registrados", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'training_control' in items:
                    elements.append(Paragraph("Control de Entrenamiento", styles['SubSectionTitle']))
                    control_data = await db.training_control.find_one(
                        {"athlete_id": request.athlete_id}, {"_id": 0}
                    )
                    if control_data:
                        elements.extend(create_qa_block("Porcentaje de cumplimiento", f"{control_data.get('compliance', 'N/A')}%", section_id))
                        elements.extend(create_qa_block("Ratio de Carga Aguda/Crónica (ACWR)", str(control_data.get('acwr', 'N/A')), section_id))
                        elements.extend(create_qa_block("Estado actual del deportista", control_data.get('status', ''), section_id))
                    else:
                        elements.append(Paragraph("Sin datos de control", styles['NoDataText']))
                    elements.append(Spacer(1, 0.15*inch))
                
                if 'alerts' in items:
                    elements.append(Paragraph("Alertas y Recomendaciones Activas", styles['SubSectionTitle']))
                    alerts = await db.alerts.find(
                        {"athlete_id": request.athlete_id, "active": True}, {"_id": 0}
                    ).to_list(5)
                    if alerts:
                        for alert in alerts:
                            severity = alert.get('severity', 'info')
                            severity_text = "⚠️ Advertencia" if severity == 'warning' else "ℹ️ Información" if severity == 'info' else "🔴 Crítico"
                            elements.extend(create_qa_block(
                                severity_text,
                                alert.get('message', ''),
                                section_id
                            ))
                    else:
                        elements.append(Paragraph("Sin alertas activas", styles['NoDataText']))
            elements.append(Spacer(1, 0.2*inch))
        
        # ===== PERIODIZATION =====
        elif section_id == 'periodization':
            elements.append(create_section_header("PLAN DE PERIODIZACIÓN", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            # Load plans for athlete
            plans = []
            if request.athlete_id:
                plans = await db.periodization_plans.find(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                ).to_list(10)
            
            # Also check for macrocycles directly
            macrocycles = []
            if request.athlete_id:
                macrocycles = await db.macrocycles.find(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                ).to_list(5)
            
            if plans or macrocycles:
                # Process plans
                for plan in plans[:3]:
                    elements.append(Paragraph(f"Plan: {plan.get('name', 'Sin nombre')}", styles['SubSectionTitle']))
                    
                    if 'macrocycles' in items:
                        elements.append(Paragraph("Macrociclos Definidos:", styles['QuestionText']))
                        macros = plan.get('macrocycles', [])
                        for macro in macros[:5]:
                            macro_info = f"<b>{macro.get('name', 'N/A')}</b><br/>"
                            macro_info += f"Duración: {macro.get('duration_weeks', 0)} semanas | "
                            macro_info += f"Fase: {macro.get('phase', 'N/A')} | "
                            macro_info += f"Fecha inicio: {macro.get('start_date', 'N/A')[:10] if macro.get('start_date') else 'N/A'}"
                            elements.append(Paragraph(macro_info, styles['AnswerText']))
                    
                    if 'mesocycles' in items:
                        elements.append(Paragraph("Mesociclos:", styles['QuestionText']))
                        mesos = plan.get('mesocycles', [])
                        if mesos:
                            table = create_data_table(
                                ['Nombre', 'Tipo', 'Semanas', 'Intensidad'],
                                [[
                                    meso.get('name', 'N/A'),
                                    meso.get('type', 'N/A'),
                                    str(meso.get('duration_weeks', meso.get('weeks', '-'))),
                                    meso.get('intensity', 'N/A')
                                ] for meso in mesos[:10]],
                                section_id
                            )
                            elements.append(table)
                            elements.append(Spacer(1, 0.15*inch))
                    
                    if 'microcycles' in items:
                        elements.append(Paragraph("Microciclos (Semanas de Entrenamiento):", styles['QuestionText']))
                        micros = plan.get('microcycles', [])
                        if micros:
                            table = create_data_table(
                                ['Semana', 'Tipo/Enfoque', 'Volumen', 'Intensidad', 'Sesiones'],
                                [[
                                    f"Sem {micro.get('week_number', micro.get('week', '-'))}",
                                    micro.get('type', micro.get('focus', 'Normal')),
                                    str(micro.get('volume', '-')),
                                    str(micro.get('intensity', '-')),
                                    str(len(micro.get('sessions', [])))
                                ] for micro in micros[:15]],
                                section_id
                            )
                            elements.append(table)
                            elements.append(Spacer(1, 0.15*inch))
                    
                    if 'sessions' in items:
                        elements.append(Paragraph("Sesiones de Entrenamiento Programadas:", styles['QuestionText']))
                        # Get sessions from microcycles
                        all_sessions = []
                        for micro in plan.get('microcycles', [])[:5]:
                            for session in micro.get('sessions', []):
                                session['week'] = micro.get('week_number', micro.get('week', 'N/A'))
                                all_sessions.append(session)
                        
                        if all_sessions:
                            table = create_data_table(
                                ['Semana', 'Día', 'Tipo', 'Duración', 'Intensidad'],
                                [[
                                    f"Sem {sess.get('week', '-')}",
                                    sess.get('day', sess.get('day_of_week', '-')),
                                    sess.get('type', sess.get('session_type', '-')),
                                    f"{sess.get('duration', sess.get('duration_minutes', '-'))} min",
                                    sess.get('intensity', '-')
                                ] for sess in all_sessions[:20]],
                                section_id
                            )
                            elements.append(table)
                        else:
                            elements.append(Paragraph("Sin sesiones programadas", styles['NoDataText']))
                        elements.append(Spacer(1, 0.15*inch))
                    
                    if 'objectives' in items:
                        objectives = plan.get('objectives', [])
                        if objectives:
                            elements.append(Paragraph("Objetivos del Plan:", styles['QuestionText']))
                            for obj in objectives[:5]:
                                if isinstance(obj, dict):
                                    elements.append(Paragraph(f"  • {obj.get('title', obj.get('name', str(obj)))}", styles['AnswerText']))
                                else:
                                    elements.append(Paragraph(f"  • {obj}", styles['AnswerText']))
                    
                    elements.append(Spacer(1, 0.2*inch))
                
                # Process standalone macrocycles
                for macro in macrocycles[:2]:
                    if not plans:  # Only show if no plans exist
                        elements.append(Paragraph(f"Macrociclo: {macro.get('name', 'Sin nombre')}", styles['SubSectionTitle']))
                        elements.extend(create_qa_block("Duración total", f"{macro.get('duration_weeks', 'N/A')} semanas", section_id))
                        elements.extend(create_qa_block("Modelo de periodización", macro.get('model', 'N/A'), section_id))
                        elements.append(Spacer(1, 0.15*inch))
            else:
                elements.append(Paragraph("Sin planes de periodización registrados", styles['NoDataText']))
        
        # ===== GRAPHIC PLAN =====
        elif section_id == 'graphic_plan':
            elements.append(create_section_header("PLAN GRÁFICO DE ENTRENAMIENTO", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            # Load graphic plan data from database
            graphic_plan_data = None
            if request.athlete_id:
                graphic_plan_data = await db.graphic_plans.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
            
            # Use periodization_data if provided, otherwise use default
            plan_data = request.periodization_data or graphic_plan_data or {}
            
            if 'training_table' in items:
                elements.append(Paragraph("Tabla de Planificación Semanal", styles['SubSectionTitle']))
                
                # Get data from graphic plan if available
                intensity_data = plan_data.get('intensity', {})
                weeks_count = min(12, len(intensity_data) if intensity_data else 12)
                
                # Create headers
                header = ['Parámetro'] + [f'S{i}' for i in range(1, weeks_count + 1)]
                
                # Create rows with data from plan or defaults
                rows = []
                
                # Phases row
                phases_row = ['Fase']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if plan_data.get('periods', {}).get(week_key):
                        phases_row.append(plan_data['periods'][week_key][:8])  # Truncate long names
                    else:
                        if i <= weeks_count // 3:
                            phases_row.append('Prep.Gen')
                        elif i <= 2 * weeks_count // 3:
                            phases_row.append('Prep.Esp')
                        else:
                            phases_row.append('Compet.')
                rows.append(phases_row)
                
                # Intensity row
                intensity_row = ['Intensidad']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if intensity_data.get(week_key):
                        val = intensity_data[week_key]
                        intensity_row.append(f'{int(val * 20)}%' if isinstance(val, (int, float)) else str(val))
                    else:
                        # Default progression
                        base = 60 + (i * 3)
                        intensity_row.append(f'{min(base, 95)}%')
                rows.append(intensity_row)
                
                # Mesocycle row
                meso_row = ['Mesociclo']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if plan_data.get('mesocycles', {}).get(week_key):
                        meso_row.append(plan_data['mesocycles'][week_key][:6])
                    else:
                        meso_num = (i - 1) // 4 + 1
                        meso_row.append(f'M{meso_num}')
                rows.append(meso_row)
                
                data = [header] + rows
                table = Table(data, colWidths=[1.1*inch] + [0.42*inch]*weeks_count)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BACKGROUND', (0, 1), (0, -1), bg_color),
                    ('BACKGROUND', (1, 1), (-1, -1), colors.white),  # Solid white background
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 0.3*inch))
            
            if 'load_chart' in items:
                elements.append(Paragraph("Magnitud de Carga y Recuperación", styles['SubSectionTitle']))
                elements.append(Paragraph(
                    "La gráfica de carga muestra la progresión de la intensidad del entrenamiento a lo largo del macrociclo. "
                    "Los valores de recuperación son inversamente proporcionales a la carga aplicada.",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.15*inch))
                
                # Get intensity data for load chart
                intensity_data = plan_data.get('intensity', {})
                weeks_count = min(12, len(intensity_data) if intensity_data else 8)
                
                weeks_header = ['Semana'] + [f'S{i}' for i in range(1, weeks_count + 1)]
                
                # Load row
                load_row = ['Carga %']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if intensity_data.get(week_key):
                        val = intensity_data[week_key]
                        load_row.append(str(int(val * 20)) if isinstance(val, (int, float)) else str(val))
                    else:
                        base = 60 + (i * 4)
                        load_row.append(str(min(base, 95)))
                
                # Recovery row (inverse of load)
                recovery_row = ['Recup. %']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if intensity_data.get(week_key):
                        val = intensity_data[week_key]
                        load_val = int(val * 20) if isinstance(val, (int, float)) else 50
                        recovery_row.append(str(100 - load_val))
                    else:
                        base = 60 + (i * 4)
                        recovery_row.append(str(100 - min(base, 95)))
                
                weeks_data = [weeks_header, load_row, recovery_row]
                
                table = Table(weeks_data, colWidths=[1*inch] + [0.6*inch]*weeks_count)
                table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BACKGROUND', (0, 1), (0, -1), bg_color),
                    ('BACKGROUND', (1, 1), (-1, 1), colors.HexColor('#EF4444')),  # Red for load
                    ('BACKGROUND', (1, 2), (-1, 2), colors.HexColor('#3B82F6')),  # Blue for recovery
                    ('TEXTCOLOR', (1, 1), (-1, 2), colors.white),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 8),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 1, colors.white),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(table)
                
                # Add legend
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(
                    "<font color='#EF4444'>■</font> Carga (%) &nbsp;&nbsp;&nbsp; <font color='#3B82F6'>■</font> Recuperación (%)",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.2*inch))
            
            if 'volume_intensity_chart' in items:
                elements.append(Paragraph("Volumen e Intensidad por Semanas", styles['SubSectionTitle']))
                elements.append(Paragraph(
                    "El balance entre volumen e intensidad es fundamental para la periodización. "
                    "Durante la preparación general se prioriza el volumen, mientras que en fase competitiva se prioriza la intensidad.",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.1*inch))
                
                # Volume/Intensity table
                vol_int_data = plan_data.get('volume_intensity', {})
                weeks_count = min(12, len(vol_int_data) if vol_int_data else 12)
                
                vi_header = ['Semana'] + [f'S{i}' for i in range(1, weeks_count + 1)]
                
                # Volume row (decreases over time generally)
                volume_row = ['Volumen']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if vol_int_data.get(week_key, {}).get('volume'):
                        volume_row.append(vol_int_data[week_key]['volume'])
                    else:
                        # Default: high at start, low at end
                        if i <= weeks_count // 3:
                            volume_row.append('Alto')
                        elif i <= 2 * weeks_count // 3:
                            volume_row.append('Medio')
                        else:
                            volume_row.append('Bajo')
                
                # Intensity row (increases over time generally)
                intensity_pct_row = ['Intensidad']
                for i in range(1, weeks_count + 1):
                    week_key = f'S{i}'
                    if vol_int_data.get(week_key, {}).get('intensity'):
                        intensity_pct_row.append(f"{vol_int_data[week_key]['intensity']}%")
                    else:
                        base = 55 + (i * 3)
                        intensity_pct_row.append(f'{min(base, 95)}%')
                
                vi_data = [vi_header, volume_row, intensity_pct_row]
                vi_table = Table(vi_data, colWidths=[1*inch] + [0.5*inch]*weeks_count)
                vi_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), primary_color),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('BACKGROUND', (0, 1), (0, -1), bg_color),
                    ('BACKGROUND', (1, 1), (-1, 1), colors.HexColor('#22C55E')),  # Green for volume
                    ('BACKGROUND', (1, 2), (-1, 2), colors.HexColor('#8B5CF6')),  # Purple for intensity
                    ('TEXTCOLOR', (1, 1), (-1, 2), colors.white),
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 7),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 1, colors.white),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ]))
                elements.append(vi_table)
                
                # Add legend
                elements.append(Spacer(1, 0.1*inch))
                elements.append(Paragraph(
                    "<font color='#22C55E'>■</font> Volumen &nbsp;&nbsp;&nbsp; <font color='#8B5CF6'>■</font> Intensidad (%)",
                    styles['AnswerText']
                ))
                elements.append(Spacer(1, 0.2*inch))
            
            if 'phase_timeline' in items:
                elements.append(Paragraph("Línea de Tiempo de Fases", styles['SubSectionTitle']))
                
                # Create phase timeline table
                phases_info = plan_data.get('phases', [
                    {'name': 'Preparación General', 'weeks': 4, 'color': '#22C55E'},
                    {'name': 'Preparación Específica', 'weeks': 4, 'color': '#3B82F6'},
                    {'name': 'Precompetitiva', 'weeks': 2, 'color': '#F59E0B'},
                    {'name': 'Competitiva', 'weeks': 2, 'color': '#EF4444'},
                ])
                
                phase_data = [['Fase', 'Duración', 'Objetivo Principal']]
                phase_objectives = {
                    'Preparación General': 'Desarrollo de capacidades físicas básicas',
                    'Preparación Específica': 'Transferencia al deporte específico',
                    'Precompetitiva': 'Ajuste fino y reducción de volumen',
                    'Competitiva': 'Máximo rendimiento',
                    'Transición': 'Recuperación activa',
                }
                
                for phase in phases_info:
                    phase_name = phase.get('name', 'N/A')
                phase_data.append([
                        phase_name,
                        f"{phase.get('weeks', 'N/A')} semanas",
                        phase_objectives.get(phase_name, 'Desarrollo deportivo')
                    ])
                
                table = create_data_table(
                    ['Fase', 'Duración', 'Objetivos'],
                    [[row[0], row[1], row[2]] for row in phase_data[1:]],
                    section_id
                )
                elements.append(table)
                elements.append(Spacer(1, 0.2*inch))
        
        # ===== CALENDAR =====
        elif section_id == 'calendar':
            elements.append(create_section_header("CALENDARIO DE EVENTOS", section_id))
            elements.append(Spacer(1, 0.15*inch))
            
            events = []
            if request.athlete_id:
                events_data = await db.events.find_one(
                    {"athlete_id": request.athlete_id},
                    {"_id": 0}
                )
                events = events_data.get('events', []) if events_data else []
            
            if events:
                if 'competitions' in items:
                    competitions = [e for e in events if e.get('type') == 'competition' or e.get('priority') == 'high']
                    if competitions:
                        elements.append(Paragraph("Competencias Programadas", styles['SubSectionTitle']))
                        table = create_data_table(
                            ['Fecha', 'Evento', 'Ubicación', 'Importancia'],
                            [[
                                comp.get('date', 'N/A')[:10] if comp.get('date') else 'N/A',
                                comp.get('name', 'N/A'),
                                comp.get('location', 'N/A'),
                                comp.get('priority', 'N/A').capitalize() if comp.get('priority') else '-'
                            ] for comp in competitions[:10]],
                            section_id
                        )
                        elements.append(table)
                        elements.append(Spacer(1, 0.2*inch))
            else:
                elements.append(Paragraph("Sin eventos programados", styles['NoDataText']))
        
        elements.append(Spacer(1, 0.3*inch))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"reporte_completo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
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
    # First try user's own library
    data = await db.exercise_libraries.find_one({"coach_id": user["id"]}, {"_id": 0})
    if data and data.get("categories"):
        return data
    # Fallback: any library with categories (shared/public)
    data = await db.exercise_libraries.find_one({"categories": {"$exists": True, "$ne": []}}, {"_id": 0})
    if data:
        return data
    raise HTTPException(status_code=404, detail="No exercise library found")

# =============== SESSION PDF EXPORT ===============
class SessionPDFRequest(BaseModel):
    athlete_id: str
    athlete_name: str = "Atleta"
    session: Dict[str, Any]

@api_router.post("/export/session-pdf")
async def export_session_pdf(request: SessionPDFRequest, authorization: str = Header(None)):
    """Exportar una sesión de entrenamiento como PDF con diseño profesional"""
    try:
        # Verificar autenticación
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No autorizado")
        
        session_data = request.session
        athlete_name = request.athlete_name
        
        # Extraer datos detallados de la sesión
        detailed_data = session_data.get('detailedData', {})
        objectives = detailed_data.get('objetivos', {})
        phases = detailed_data.get('fases', {})
        monitoreo = detailed_data.get('monitoreo', {})
        retroalimentacion = detailed_data.get('retroalimentacion', '')
        
        # Crear PDF
        buffer = BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Colores Material Design
        primary_gradient_start = HexColor('#2563eb')
        # Colores adicionales para el diseño
        secondary_gray = HexColor('#64748b')
        light_gray = HexColor('#f8fafc')
        white = HexColor('#ffffff')
        green_500 = HexColor('#22c55e')
        orange_500 = HexColor('#f97316')
        blue_500 = HexColor('#3b82f6')
        red_500 = HexColor('#ef4444')
        cyan_500 = HexColor('#06b6d4')
        
        # ============ HEADER ============
        # Gradiente simulado con rectángulos
        c.setFillColor(primary_gradient_start)
        c.roundRect(30, height - 110, width - 60, 80, 15, fill=1, stroke=0)
        
        # Título
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 22)
        c.drawString(50, height - 55, "SESIÓN DE ENTRENAMIENTO")
        
        # Subtítulo con atleta
        c.setFont("Helvetica", 13)
        c.drawString(50, height - 78, f"Atleta: {athlete_name}")
        
        # Fecha en el lado derecho
        session_date = session_data.get('date', datetime.now().strftime('%Y-%m-%d'))
        day_name = session_data.get('dayName', '')
        c.setFont("Helvetica-Bold", 12)
        c.drawRightString(width - 50, height - 55, f"Fecha: {session_date}")
        if day_name:
            c.setFont("Helvetica", 11)
            c.drawRightString(width - 50, height - 72, f"Día: {day_name}")
        
        y_position = height - 140
        
        # ============ OBJETIVOS DE LA SESIÓN ============
        # Card header
        c.setFillColor(cyan_500)
        c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(45, y_position - 7, "OBJETIVOS DE LA SESIÓN")
        y_position -= 35
        
        # Card content
        c.setFillColor(light_gray)
        c.roundRect(30, y_position - 100, width - 60, 100, 8, fill=1, stroke=0)
        
        obj_items = [
            ('General', objectives.get('general', '')),
            ('Físico', objectives.get('fisico', '')),
            ('Técnico', objectives.get('tecnico', '')),
            ('Táctico', objectives.get('tactico', '')),
            ('Psicológico', objectives.get('psicologico', '')),
            ('Teórico', objectives.get('teorico', ''))
        ]
        
        obj_y = y_position - 15
        col1_x = 45
        col2_x = width / 2 + 10
        
        for i, (label, value) in enumerate(obj_items):
            x_pos = col1_x if i % 2 == 0 else col2_x
            if i % 2 == 0 and i > 0:
                obj_y -= 28
            
            c.setFillColor(HexColor('#1e293b'))
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x_pos, obj_y, f"{label}:")
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica", 9)
            display_value = str(value)[:40] if value else "Sin definir"
            c.drawString(x_pos + 65, obj_y, display_value)
        
        y_position -= 115
        
        # ============ ESTRUCTURA DE LA SESIÓN (FASES) ============
        phase_configs = [
            ('inicial', 'FASE INICIAL (Calentamiento)', green_500, HexColor('#dcfce7')),
            ('principal', 'FASE PRINCIPAL', orange_500, HexColor('#ffedd5')),
            ('final', 'FASE FINAL (Vuelta a la calma)', blue_500, HexColor('#dbeafe'))
        ]
        
        for phase_key, phase_name, header_color, bg_color in phase_configs:
            phase_data = phases.get(phase_key, {})
            activities = phase_data.get('actividades', [])
            
            # Verificar espacio para nueva página
            needed_height = 80 + (len(activities) * 20)
            if y_position < needed_height + 100:
                c.showPage()
                y_position = height - 50
            
            # Phase header
            c.setFillColor(header_color)
            c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 11)
            c.drawString(45, y_position - 7, phase_name)
            c.setFont("Helvetica", 10)
            c.drawRightString(width - 50, y_position - 7, f"{len(activities)} ejercicios")
            y_position -= 30
            
            if activities:
                # Tabla de actividades
                table_height = 25 + (len(activities) * 20)
                c.setFillColor(bg_color)
                c.roundRect(30, y_position - table_height + 10, width - 60, table_height, 5, fill=1, stroke=0)
                
                # Headers de tabla
                c.setFillColor(HexColor('#475569'))
                c.setFont("Helvetica-Bold", 8)
                headers = ['Ejercicio', 'Cap.Física', 'Método', 'Series', 'Reps', 'Int.', 'Vol.', 'Recup.']
                x_positions = [40, 140, 215, 285, 325, 365, 410, 460]
                
                for i, header in enumerate(headers):
                    c.drawString(x_positions[i], y_position - 5, header)
                y_position -= 20
                
                # Línea separadora
                c.setStrokeColor(HexColor('#cbd5e1'))
                c.setLineWidth(0.5)
                c.line(35, y_position + 2, width - 35, y_position + 2)
                
                # Filas de actividades
                c.setFont("Helvetica", 8)
                for act in activities:
                    c.setFillColor(HexColor('#1e293b'))
                    ejercicio = str(act.get('ejercicio', '-'))[:18]
                    c.drawString(40, y_position - 5, ejercicio)
                    
                    c.setFillColor(secondary_gray)
                    c.drawString(140, y_position - 5, str(act.get('capacidadFisica', '-'))[:12])
                    c.drawString(215, y_position - 5, str(act.get('metodo', '-'))[:10])
                    c.drawString(285, y_position - 5, str(act.get('series', '-')))
                    c.drawString(325, y_position - 5, str(act.get('repeticiones', '-')))
                    
                    # Intensidad con indicador visual
                    intensidad = act.get('intensidad', 0)
                    c.drawString(365, y_position - 5, f"{intensidad}%")
                    
                    c.drawString(410, y_position - 5, str(act.get('volumen', '-'))[:8])
                    c.drawString(460, y_position - 5, str(act.get('recuperacion', '-'))[:8])
                    y_position -= 20
            else:
                # Sin actividades
                c.setFillColor(secondary_gray)
                c.setFont("Helvetica-Oblique", 9)
                c.drawString(45, y_position - 10, "No hay actividades en esta fase")
                y_position -= 25
            
            y_position -= 15
        
        # ============ MONITOREO DE RENDIMIENTO ============
        if y_position < 250:
            c.showPage()
            y_position = height - 50
        
        # Header de monitoreo
        c.setFillColor(red_500)
        c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(45, y_position - 7, "MONITOREO DE RENDIMIENTO")
        y_position -= 35
        
        # Card de monitoreo
        c.setFillColor(HexColor('#fef2f2'))
        c.roundRect(30, y_position - 170, width - 60, 170, 8, fill=1, stroke=0)
        
        # Frecuencia Cardíaca - Título
        c.setFillColor(HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(45, y_position - 15, "Frecuencia Cardíaca por Fases")
        y_position -= 30
        
        # FC datos en columnas
        fc_data = [
            ('FC Reposo', monitoreo.get('fcReposo', '-'), 'bpm'),
            ('FC Media', monitoreo.get('fcMedia', '-'), 'bpm'),
            ('FC Máxima', monitoreo.get('fcMaxima', '-'), 'bpm'),
        ]
        
        fc_x = 50
        for label, value, unit in fc_data:
            # Mini card
            c.setFillColor(white)
            c.roundRect(fc_x, y_position - 45, 80, 50, 5, fill=1, stroke=0)
            c.setFillColor(HexColor('#64748b'))
            c.setFont("Helvetica", 8)
            c.drawCentredString(fc_x + 40, y_position - 12, label)
            c.setFillColor(HexColor('#1e293b'))
            c.setFont("Helvetica-Bold", 16)
            c.drawCentredString(fc_x + 40, y_position - 32, str(value) if value else '-')
            c.setFillColor(HexColor('#94a3b8'))
            c.setFont("Helvetica", 7)
            c.drawCentredString(fc_x + 40, y_position - 43, unit)
            fc_x += 90
        
        # FC por fases
        fc_fases = [
            ('Antes', monitoreo.get('fcAntesEntrenamiento', '-')),
            ('Durante', monitoreo.get('fcDuranteEntrenamiento', '-')),
            ('Después', monitoreo.get('fcDespuesEntrenamiento', '-')),
            ('Recup 1\'', monitoreo.get('fcRecuperacion1min', '-')),
            ('Recup 3\'', monitoreo.get('fcRecuperacion3min', '-')),
            ('Recup 5\'', monitoreo.get('fcRecuperacion5min', '-')),
        ]
        
        y_position -= 60
        c.setFillColor(HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 9)
        c.drawString(45, y_position, "Fases:")
        
        fc_x = 90
        for label, value in fc_fases:
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica", 8)
            c.drawString(fc_x, y_position, f"{label}: ")
            c.setFont("Helvetica-Bold", 8)
            c.drawString(fc_x + 35, y_position, str(value) if value else '-')
            fc_x += 70
        
        y_position -= 25
        
        # Estado del deportista
        c.setFillColor(HexColor('#991b1b'))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(45, y_position, "Estado del Deportista")
        y_position -= 18
        
        estado_data = [
            ('Nivel de Fatiga', monitoreo.get('nivelFatiga', 50), '%'),
            ('Hidratación', monitoreo.get('nivelHidratacion', 80), '%'),
            ('Calidad de Sueño', monitoreo.get('calidadSueno', 75), '%'),
            ('Nivel de Energía', monitoreo.get('nivelEnergia', 70), '%'),
        ]
        
        estado_x = 50
        for label, value, unit in estado_data:
            c.setFillColor(secondary_gray)
            c.setFont("Helvetica", 8)
            c.drawString(estado_x, y_position, f"{label}: ")
            c.setFillColor(HexColor('#1e293b'))
            c.setFont("Helvetica-Bold", 9)
            c.drawString(estado_x + 75, y_position, f"{value}{unit}")
            estado_x += 130
        
        y_position -= 50
        
        # ============ OBSERVACIONES ============
        if retroalimentacion:
            if y_position < 100:
                c.showPage()
                y_position = height - 50
            
            c.setFillColor(HexColor('#7c3aed'))
            c.roundRect(30, y_position - 15, width - 60, 25, 5, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(45, y_position - 7, "OBSERVACIONES Y RETROALIMENTACIÓN")
            y_position -= 35
            
            c.setFillColor(HexColor('#f5f3ff'))
            c.roundRect(30, y_position - 50, width - 60, 50, 5, fill=1, stroke=0)
            
            c.setFillColor(HexColor('#4c1d95'))
            c.setFont("Helvetica", 10)
            # Dividir texto largo en líneas
            text_lines = [retroalimentacion[i:i+80] for i in range(0, len(retroalimentacion), 80)]
            text_y = y_position - 20
            for line in text_lines[:3]:  # Máximo 3 líneas
                c.drawString(45, text_y, line)
                text_y -= 15
        
        # ============ FOOTER ============
        c.setFillColor(HexColor('#1e293b'))
        c.rect(0, 0, width, 35, fill=1, stroke=0)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(40, 15, "Generado por Sistema TRAIN")
        c.setFont("Helvetica", 8)
        c.drawString(40, 5, datetime.now().strftime('%d/%m/%Y %H:%M'))
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(width - 40, 15, "www.train-system.com")
        
        c.save()
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=sesion_{session_date}.pdf"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting session PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Error al generar PDF: {str(e)}")


# =============== SESSION SHARING ===============
class SessionShareRequest(BaseModel):
    athlete_id: str
    athlete_name: str = "Atleta"
    session_data: Dict[str, Any]
    session_image: Optional[str] = None
    session_code: Optional[str] = None

@api_router.post("/sessions/share")
async def create_session_share(request: SessionShareRequest, authorization: str = Header(None)):
    """Crear un enlace para compartir una sesión con el deportista (con imagen)"""
    try:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="No autorizado")
        
        # Generar ID: SES-XXX-hash6
        import secrets
        code = request.session_code or "SES-001"
        hash6 = secrets.token_hex(3)
        share_id = f"{code}-{hash6}"
        
        # Guardar sesión compartida en DB (con imagen si existe)
        shared_session = {
            "share_id": share_id,
            "athlete_id": request.athlete_id,
            "athlete_name": request.athlete_name,
            "session_data": request.session_data,
            "session_image": request.session_image,  # Imagen en base64
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(days=30),  # Expira en 30 días
            "views": 0
        }
        
        await db.shared_sessions.insert_one(shared_session)
        
        return {"share_id": share_id, "expires_in_days": 30}
        
    except Exception as e:
        logger.error(f"Error creating session share: {e}")
        raise HTTPException(status_code=500, detail=f"Error al crear enlace: {str(e)}")


@api_router.get("/sessions/view/{share_id}")
async def get_shared_session(share_id: str):
    """Obtener sesión compartida para visualización pública (sin autenticación)"""
    try:
        # Buscar sesión compartida
        shared = await db.shared_sessions.find_one({"share_id": share_id})
        
        if not shared:
            raise HTTPException(status_code=404, detail="Sesión no encontrada o enlace expirado")
        
        # Verificar si no ha expirado (manejar datetime naive y aware)
        expires_at = shared.get("expires_at")
        if expires_at:
            # Si la fecha es naive, hacerla aware
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="El enlace ha expirado")
        
        # Incrementar contador de vistas
        await db.shared_sessions.update_one(
            {"share_id": share_id},
            {"$inc": {"views": 1}}
        )
        
        # Serializar created_at para la respuesta
        created_at = shared.get("created_at")
        if created_at and hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        
        return {
            "athlete_name": shared.get("athlete_name", "Atleta"),
            "session_data": shared.get("session_data", {}),
            "session_image": shared.get("session_image"),  # Imagen en base64
            "created_at": created_at,
            "views": shared.get("views", 0) + 1
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting shared session: {e}")
        raise HTTPException(status_code=500, detail=f"Error al obtener sesión: {str(e)}")


# =============== PLAN DATA ROUTES (Datos vinculados al plan) ===============

# --- PLAN OBJECTIVES ---
@api_router.post("/plan-data/objectives", response_model=PlanObjectiveResponse)
async def create_plan_objective(data: PlanObjectiveCreate, user: dict = Depends(get_current_user)):
    """Crear o actualizar objetivos del plan"""
    # Check if objectives already exist for this plan
    existing = await db.plan_objectives.find_one({"plan_id": data.plan_id, "user_id": user["id"]})
    
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "main_objective": data.main_objective,
        "secondary_objectives": data.secondary_objectives,
        "performance_indicators": data.performance_indicators,
        "timeline": data.timeline,
        "data": data.data,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if existing:
        await db.plan_objectives.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["id"] = str(existing["_id"])
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.plan_objectives.insert_one(doc)
        doc["id"] = str(result.inserted_id)
    
    return PlanObjectiveResponse(**doc)

@api_router.get("/plan-data/objectives/{plan_id}", response_model=Optional[PlanObjectiveResponse])
async def get_plan_objectives(plan_id: str, user: dict = Depends(get_current_user)):
    """Obtener objetivos de un plan"""
    doc = await db.plan_objectives.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    if doc:
        doc["id"] = plan_id
        return PlanObjectiveResponse(**doc)
    return None

# --- PLAN EVALUATIONS ---
@api_router.post("/plan-data/evaluations", response_model=PlanEvaluationResponse)
async def create_plan_evaluation(data: PlanEvaluationCreate, user: dict = Depends(get_current_user)):
    """Crear una evaluación vinculada al plan"""
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "athlete_id": data.athlete_id,
        "evaluation_type": data.evaluation_type,
        "date": data.date,
        "results": data.results,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.plan_evaluations.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return PlanEvaluationResponse(**doc)

@api_router.get("/plan-data/evaluations/{plan_id}", response_model=List[PlanEvaluationResponse])
async def get_plan_evaluations(plan_id: str, evaluation_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Obtener evaluaciones de un plan"""
    query = {"plan_id": plan_id, "user_id": user["id"]}
    if evaluation_type:
        query["evaluation_type"] = evaluation_type
    
    evaluations = await db.plan_evaluations.find(query).to_list(100)
    return [PlanEvaluationResponse(**{**e, "id": str(e["_id"])}) for e in evaluations]

@api_router.get("/plan-data/evaluations/{plan_id}/{evaluation_type}")
async def get_plan_evaluations_by_type(plan_id: str, evaluation_type: str, user: dict = Depends(get_current_user)):
    """Obtener evaluaciones de un plan por tipo específico"""
    query = {"plan_id": plan_id, "user_id": user["id"], "evaluation_type": evaluation_type}
    evaluations = await db.plan_evaluations.find(query).to_list(100)
    return [{**e, "id": str(e["_id"]), "_id": None} for e in evaluations]

@api_router.delete("/plan-data/evaluations/{evaluation_id}")
async def delete_plan_evaluation(evaluation_id: str, user: dict = Depends(get_current_user)):
    """Eliminar una evaluación"""
    result = await db.plan_evaluations.delete_one({"_id": ObjectId(evaluation_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    return {"message": "Evaluación eliminada"}

# --- PLAN COMPETITIONS ---
@api_router.post("/plan-data/competitions", response_model=PlanCompetitionResponse)
async def create_plan_competition(data: PlanCompetitionCreate, user: dict = Depends(get_current_user)):
    """Crear una competencia vinculada al plan"""
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "name": data.name,
        "date": data.date,
        "importance": data.importance,
        "location": data.location,
        "expected_result": data.expected_result,
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.plan_competitions.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return PlanCompetitionResponse(**doc)

@api_router.get("/plan-data/competitions/{plan_id}", response_model=List[PlanCompetitionResponse])
async def get_plan_competitions(plan_id: str, user: dict = Depends(get_current_user)):
    """Obtener competencias de un plan"""
    competitions = await db.plan_competitions.find({"plan_id": plan_id, "user_id": user["id"]}).to_list(100)
    return [PlanCompetitionResponse(**{**c, "id": str(c["_id"])}) for c in competitions]

@api_router.put("/plan-data/competitions/{competition_id}", response_model=PlanCompetitionResponse)
async def update_plan_competition(competition_id: str, data: PlanCompetitionCreate, user: dict = Depends(get_current_user)):
    """Actualizar una competencia"""
    doc = {
        "name": data.name,
        "date": data.date,
        "importance": data.importance,
        "location": data.location,
        "expected_result": data.expected_result,
        "notes": data.notes
    }
    result = await db.plan_competitions.find_one_and_update(
        {"_id": ObjectId(competition_id), "user_id": user["id"]},
        {"$set": doc},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Competencia no encontrada")
    return PlanCompetitionResponse(**{**result, "id": str(result["_id"])})

@api_router.delete("/plan-data/competitions/{competition_id}")
async def delete_plan_competition(competition_id: str, user: dict = Depends(get_current_user)):
    """Eliminar una competencia"""
    result = await db.plan_competitions.delete_one({"_id": ObjectId(competition_id), "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competencia no encontrada")
    return {"message": "Competencia eliminada"}

# --- PLAN PREVIOUS ANALYSIS ---
@api_router.post("/plan-data/previous-analysis", response_model=PlanPreviousAnalysisResponse)
async def create_plan_previous_analysis(data: PlanPreviousAnalysisCreate, user: dict = Depends(get_current_user)):
    """Crear o actualizar análisis del plan anterior"""
    existing = await db.plan_previous_analysis.find_one({"plan_id": data.plan_id, "user_id": user["id"]})
    
    doc = {
        "plan_id": data.plan_id,
        "user_id": user["id"],
        "previous_plan_summary": data.previous_plan_summary,
        "achievements": data.achievements,
        "areas_to_improve": data.areas_to_improve,
        "lessons_learned": data.lessons_learned,
        "athlete_feedback": data.athlete_feedback,
        "data": data.data
    }
    
    if existing:
        await db.plan_previous_analysis.update_one({"_id": existing["_id"]}, {"$set": doc})
        doc["id"] = str(existing["_id"])
    else:
        doc["created_at"] = datetime.now(timezone.utc).isoformat()
        result = await db.plan_previous_analysis.insert_one(doc)
        doc["id"] = str(result.inserted_id)
    
    return PlanPreviousAnalysisResponse(**doc)

@api_router.get("/plan-data/previous-analysis/{plan_id}", response_model=Optional[PlanPreviousAnalysisResponse])
async def get_plan_previous_analysis(plan_id: str, user: dict = Depends(get_current_user)):
    """Obtener análisis del plan anterior"""
    doc = await db.plan_previous_analysis.find_one({"plan_id": plan_id, "user_id": user["id"]})
    if doc:
        return PlanPreviousAnalysisResponse(**{**doc, "id": str(doc["_id"])})
    return None

# --- GET ALL PLAN DATA ---
@api_router.get("/plan-data/{plan_id}")
async def get_all_plan_data(plan_id: str, user: dict = Depends(get_current_user)):
    """Obtener todos los datos vinculados a un plan, evaluaciones organizadas por tipo"""
    objectives = await db.plan_objectives.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    
    # Fetch evaluations and organize by type
    evaluations_cursor = db.plan_evaluations.find({"plan_id": plan_id, "user_id": user["id"]})
    evaluations_by_type = {
        "medical": [],
        "anthropometric": [],
        "physical": [],
        "technical": [],
        "tactical": [],
        "psychological": []
    }
    evaluations_flat = []
    async for e in evaluations_cursor:
        e["id"] = str(e.pop("_id"))
        eval_type = e.get("evaluation_type", "")
        if eval_type in evaluations_by_type:
            evaluations_by_type[eval_type].append(e)
        evaluations_flat.append(e)
    
    competitions_cursor = db.plan_competitions.find({"plan_id": plan_id, "user_id": user["id"]})
    competitions = []
    async for c in competitions_cursor:
        c["id"] = str(c.pop("_id"))
        competitions.append(c)
    
    previous_analysis = await db.plan_previous_analysis.find_one({"plan_id": plan_id, "user_id": user["id"]}, {"_id": 0})
    
    # Also fetch the plan_data init document if it exists
    plan_data_init = await db.plan_data.find_one({"plan_id": plan_id}, {"_id": 0})
    
    return {
        "plan_id": plan_id,
        "objectives": objectives,
        "evaluations": evaluations_by_type,
        "evaluations_flat": evaluations_flat,
        "competitions": competitions,
        "previous_analysis": previous_analysis,
        "athlete_characterization": plan_data_init.get("athlete_characterization") if plan_data_init else None
    }


# =============== TACTICAL BOARD GENERATION ===============
class TacticalBoardGenerateRequest(BaseModel):
    sport: str
    description: str = ""
    formation: str = ""
    num_team_a: int = 5
    num_team_b: int = 0

@api_router.post("/tactical-board/generate")
async def generate_tactical_board(request: TacticalBoardGenerateRequest, user: dict = Depends(get_current_user)):
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

@api_router.post("/tactical-boards")
async def save_tactical_board(request: TacticalBoardSaveRequest, user: dict = Depends(get_current_user)):
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

@api_router.get("/tactical-boards")
async def list_tactical_boards(user: dict = Depends(get_current_user)):
    boards = await db.tactical_boards.find(
        {"user_id": user["id"]},
        {"_id": 0, "elements": 0}
    ).sort("updated_at", -1).to_list(100)
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

@api_router.get("/tactical-boards/{board_id}")
async def get_tactical_board(board_id: str, user: dict = Depends(get_current_user)):
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

@api_router.put("/tactical-boards/{board_id}")
async def update_tactical_board(board_id: str, request: TacticalBoardSaveRequest, user: dict = Depends(get_current_user)):
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

@api_router.delete("/tactical-boards/{board_id}")
async def delete_tactical_board(board_id: str, user: dict = Depends(get_current_user)):
    from bson import ObjectId
    try:
        result = await db.tactical_boards.delete_one({"_id": ObjectId(board_id), "user_id": user["id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pizarra no encontrada")
    return {"message": "Pizarra eliminada"}


# =============== ROOT & HEALTH ===============
@api_router.get("/")
async def root():
    return {"message": "Sistema TRAIN API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# Include routers
app.include_router(api_router)

# AI Assistant router (simplified)
from routes.ai_assistant import router as ai_assistant_router
app.include_router(ai_assistant_router)

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
