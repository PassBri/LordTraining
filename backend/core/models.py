"""Enums y modelos Pydantic compartidos (extraídos de server.py — FASE 1 segmentación).
No contiene lógica de negocio ni acceso a DB; solo definiciones de datos."""
from pydantic import BaseModel, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum


# =============== ENUMS ===============
class UserRole(str, Enum):
    ADMIN = "admin"  # Administrador - Acceso total al sistema
    COACH = "coach"  # Entrenador - Puede crear planes para múltiples atletas
    PERSONAL_TRAINER = "personal_trainer"  # Entrenador Personal - Similar a coach pero enfocado en clientes individuales
    ATHLETE = "athlete"  # Atleta - Solo puede ver su propio plan
    TEAM = "team"  # Equipo - Grupo de atletas con plan compartido
    USER = "user"  # Usuario - Rol básico sin atletas asignados
    CLUB = "club"  # Club deportivo
    SCHOOL = "school"  # Escuela deportiva
    ACADEMY = "academy"  # Academia deportiva
    ENTITY = "entity"  # Entidad / Organización

class EntityType(str, Enum):
    FEDERATION = "federation"  # Federación - nivel nacional/regional
    CLUB = "club"  # Club deportivo
    SCHOOL = "school"  # Escuela deportiva
    NATIONAL_TEAM = "national_team"  # Selección Nacional
    TEAM = "team"  # Equipo/Categoría
    LEAGUE = "league"  # Liga/Torneo

class SubscriptionPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
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
    is_super_admin: Optional[bool] = False
    org_id: Optional[str] = None
    org_role: Optional[str] = None

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
    age: Optional[int] = None
    level: Optional[str] = None
    notes: Optional[str] = None
    affiliations: Optional[List[str]] = []
    team_id: Optional[str] = None
    created_at: Optional[str] = None

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
