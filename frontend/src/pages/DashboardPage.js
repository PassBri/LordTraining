import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '../components/ui/select';
import { getDashboardStats, getAthletes, seedExercises, seedDemoData, clearDemoData } from '../services/api';
import usePlanGate from '../hooks/usePlanGate';
import useGlobalContext from '../hooks/useGlobalContext';
import useGeneratedPlans from '../hooks/useGeneratedPlans';
import useSportsCatalog from '../hooks/useSportsCatalog';
import useTournaments from '../hooks/useTournaments';
import NotificationsBell from '../components/NotificationsBell';
const SessionCalendar = lazy(() => import('../components/SessionCalendar'));
const ScoutingModule = lazy(() => import('../components/ScoutingModule'));
import { 
  Target, Send, Heart, Zap, Brain, ChevronLeft,
  FileText, Users, Clipboard, Calendar, BookOpen, 
  Activity, BarChart, LineChart, Loader2, LogOut, Save, Download, Layers, Plus, Dumbbell,
  Shield, UserCheck, User, UserCircle, UserPlus, LayoutDashboard,
  Building2, Trophy, Timer, Flame, Lightbulb, X, Trash2,
  Medal, LayoutGrid, Share2, History, Filter, CreditCard, Sparkles,
  AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Copy, Printer, Gauge, Wrench,
  Stethoscope, CalendarDays, Calculator, UsersRound, PieChart, MessageCircle, Link as LinkIcon, ArrowRight, FileBarChart2, Crown, Bell,
  Search, PanelLeftClose, PanelLeftOpen, ListChecks, ChevronRight
} from 'lucide-react';
import { 
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector';
import BrandLogo from '../components/BrandLogo';
const PeriodizationModelsManager = lazy(() => import('../components/PeriodizationModelsManager'));
const PDITechnicalSheet = lazy(() => import('../components/PDITechnicalSheet'));

const HealthRecords = lazy(() => import('../components/HealthRecords'));
const CompetitionAnalysis = lazy(() => import('../components/CompetitionAnalysis'));
const TrainingStages = lazy(() => import('../components/TrainingStages'));
const TrainingMethods = lazy(() => import('../components/TrainingMethods'));
const TrainingLoad = lazy(() => import('../components/TrainingLoad'));
const GraphicPlan = lazy(() => import('../components/GraphicPlan'));
const AthleteSummary = lazy(() => import('../components/AthleteSummary'));
const ExerciseLibrary = lazy(() => import('../components/ExerciseLibrary'));

const PeriodizationComplete = lazy(() => import('../components/PeriodizationComplete'));
import InfoSectionHeader from '../components/InfoSectionHeader';
const CoachesManager = lazy(() => import('../components/CoachesManager'));
const PlanStaffPanel = lazy(() => import('../components/PlanStaffPanel'));
const EntityManager = lazy(() => import('../components/EntityManager'));
const TeamManager = lazy(() => import('../components/TeamManager'));
const EvaluationSection = lazy(() => import('../components/EvaluationSection'));
const EvaluationEvolution = lazy(() => import('../components/EvaluationEvolution'));
const CalculatorsHub = lazy(() => import('../components/calculators/CalculatorsHub'));
const AthleteProgress = lazy(() => import('../components/AthleteProgress'));
const ControlPanel = lazy(() => import('../components/ControlPanel'));
const EntityDashboard = lazy(() => import('../components/EntityDashboard'));
const SmartAlerts = lazy(() => import('../components/SmartAlerts'));
import PDFExportModal from '../components/PDFExportModal';
import MasterReportModal from '../components/MasterReportModal';
import SessionsExportModal from '../components/SessionsExportModal';
import AthletePortalShareModal from '../components/AthletePortalShareModal';
import WeeklySummaryModal from '../components/WeeklySummaryModal';
const LoadPanel = lazy(() => import('../components/LoadPanel'));
const FederationPanel = lazy(() => import('../components/FederationPanel'));
const ObjectivesIndicators = lazy(() => import('../components/ObjectivesIndicators'));
const TrainingSystemHub = lazy(() => import('../components/TrainingSystemHub'));
const TournamentManager = lazy(() => import('../components/TournamentManager'));
import AITrainingAssistant from '../components/AITrainingAssistant';
import HelpTutorialButton, { resolveTutorialCategory } from '../components/HelpTutorialButton';
import PlanSidebar from '../components/PlanSidebar';
import SectionSkeleton from '../components/SectionSkeleton';
import { Sheet, SheetContent } from '../components/ui/sheet';
import { useUiMode } from '../context/UiModeContext';
import ThemeToggle from '../components/ThemeToggle';
import WhatsAppShell from '../components/dashboard/WhatsAppShell';
import { Badge } from '../components/ui/badge';

const TacticalBoardSection = lazy(() => import('../components/TacticalBoardSection'));

// Definición de roles disponibles
const USER_ROLES = [
  { id: 'admin', name: 'Administrador', nameKey: 'data.role_admin', description: 'Acceso total al sistema', icon: Shield },
  { id: 'coach', name: 'Entrenador', nameKey: 'data.role_coach', description: 'Puede crear planes para múltiples atletas', icon: UserCheck },
  { id: 'personal_trainer', name: 'Entrenador Personal', nameKey: 'data.role_personal_trainer', description: 'Enfocado en clientes individuales', icon: Dumbbell },
  { id: 'athlete', name: 'Atleta', nameKey: 'data.atleta_2', description: 'Solo puede ver su propio plan', icon: User },
  { id: 'team', name: 'Equipo', nameKey: 'data.equipo', description: 'Grupo de atletas con plan compartido', icon: Users },
  { id: 'user', name: 'Usuario', nameKey: 'data.role_user', description: 'Rol básico sin atletas asignados', icon: UserCircle }
];

const DashboardPage = () => {
  const { t } = useTranslation();
  const { uiMode } = useUiMode();
  const modelSlug = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  const tModelName = (name) => name ? t('models.' + modelSlug(name), { defaultValue: name }) : name;
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { allowed: canManageOrg } = usePlanGate('org_management');
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [isPlansSheetOpen, setIsPlansSheetOpen] = useState(false);
  const [proSidebarCollapsed, setProSidebarCollapsed] = useState(false);
  const [proSearch, setProSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // UI State
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState('panel');
  const [scoutingTab, setScoutingTab] = useState('prospects');
  const [activeDataSection, setActiveDataSection] = useState(null); // null = welcome state in datos
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [teamEvents, setTeamEvents] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('macrociclo');
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: 'Bienvenido al asistente de planificación deportiva. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Form States
  const [newAthlete, setNewAthlete] = useState({
    name: '', email: '', birthDate: '', gender: '', sport: '', category: '', level: '',
    federation: '', club: '', school: '', team_id: ''
  });
  const [newEvent, setNewEvent] = useState({
    name: '', type: '', date: '', location: '', objective: '', priority: ''
  });
  const [events, setEvents] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [savingAthlete, setSavingAthlete] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [periodizationData, setPeriodizationData] = useState(null);
  const [periodizationFocus, setPeriodizationFocus] = useState(null);
  
  // Entity States for Athlete Affiliations
  const [entities, setEntities] = useState([]);
  const [athleteFilterEntity, setAthleteFilterEntity] = useState('all');
  const [showAddAthleteForm, setShowAddAthleteForm] = useState(false);
  
  // Team States
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState({
    name: '', sport: '', category: '', federation: '', club: '', school: ''
  });
  const [activeAthleteTab, setActiveAthleteTab] = useState('athletes');
  
  // Sports Catalog -> useSportsCatalog hook
  const {
    sportsCatalog, setSportsCatalog,
    newCategory, setNewCategory,
    newSport, setNewSport,
    showAddCategory, setShowAddCategory,
    showAddSport, setShowAddSport,
    editingSportId, setEditingSportId,
    editingSportCharacterization, setEditingSportCharacterization,
    getSportIcon, allSports,
    fetchSportsCatalog, handleCreateCategory, handleCreateSport,
    handleDeleteSport, handleSaveSportCharacterization, handleDeleteCategory,
  } = useSportsCatalog({ t });

  
  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isMasterReportOpen, setIsMasterReportOpen] = useState(false);
  const [isSessionsExportOpen, setIsSessionsExportOpen] = useState(false);
  const [isAthletePortalOpen, setIsAthletePortalOpen] = useState(false);

  // Filters Dropdown State
  const [showExportMenu, setShowExportMenu] = useState(false);

  // ====== COACH AI DRAWER STATE ======
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);
  const [coachDrawerTab, setCoachDrawerTab] = useState('coach'); // 'coach' or 'history'
  const { generatedPlans, setGeneratedPlans, saveGeneratedPlan, deletePlan } = useGeneratedPlans();

  // ====== PLAN ACTIVO STATE ======
  const [activePlan, setActivePlan] = useState(null); // El plan actualmente seleccionado
  const [trainingPlans, setTrainingPlans] = useState([]); // Lista de planes de la BD
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false); // Modal para seleccionar plan

  // ====== EVALUACIONES STATE (Control Médico, Físico, etc.) ======
  const [medicalData, setMedicalData] = useState({
    fcReposo: '', fcMaxima: '', paSistolica: '', paDiastolica: '', saturacionO2: '',
    enfermedadesCronicas: '', alergias: '', cirugiasPrevias: '', lesionesActuales: '',
    medicamentos: '', aptitudMedica: 'apto', proximaRevision: '', observaciones: ''
  });
  const [anthropometricData, setAnthropometricData] = useState({
    peso: '', talla: '', imc: '', porcentajeGrasa: '', masaMuscular: '',
    envergadura: '', circunferenciaCintura: '', circunferenciaCadera: '',
    plieguesTriceps: '', plieguesSubescapular: '', plieguesSuprailiaco: '',
    perimetroBrazo: '', perimetroMuslo: '', perimetroPierna: '', observaciones: ''
  });
  const [physicalData, setPhysicalData] = useState({
    fuerzaMaxima: '', fuerzaExplosiva: '', resistenciaAerobica: '', resistenciaAnaerobica: '',
    velocidadMaxima: '', agilidad: '', flexibilidad: '', coordinacion: '',
    equilibrio: '', potencia: '', vo2max: '', fcMaxTest: '', observaciones: ''
  });
  const [technicalData, setTechnicalData] = useState({
    nivelTecnico: '', habilidadesBasicas: '', habilidadesAvanzadas: '',
    eficienciaTecnica: '', consistencia: '', adaptabilidad: '', observaciones: ''
  });
  const [tacticalData, setTacticalData] = useState({
    comprensionTactica: '', tomadecisiones: '', lecturadeJuego: '',
    posicionamiento: '', comunicacion: '', liderazgo: '', observaciones: ''
  });
  const [psychologicalData, setPsychologicalData] = useState({
    motivacion: '', concentracion: '', manejoEstres: '', autoconfianza: '',
    controlEmocional: '', resilencia: '', cohesionGrupal: '', observaciones: ''
  });
  const [theoreticalData, setTheoreticalData] = useState({
    reglamento: '', tacticaTeorica: '', historiaDeporte: '', nutricionDeportiva: '',
    prevencionLesiones: '', principiosEntrenamiento: '', planificacionDeportiva: '',
    biomecanicaBasica: '', analisisRendimiento: '', fairPlayEtica: '', observaciones: ''
  });
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [loadingPlanData, setLoadingPlanData] = useState(false);
  const [planData, setPlanData] = useState(null); // Datos completos del plan

  // ====== PREVIOUS ANALYSIS STATE ======
  const _emptyObj = () => ({ descripcion: '', porcentaje: 50 });
  const [previousAnalysisData, setPreviousAnalysisData] = useState({
    fechaInicio: '', fechaFinalizacion: '', duracionSemanas: '', objetivoPrincipal: '',
    cumplimiento: {
      general: _emptyObj(), fisica: _emptyObj(), tecnica: _emptyObj(),
      tactica: _emptyObj(), psicologica: _emptyObj(),
      teorica: _emptyObj(), reglamento: _emptyObj()
    },
    porcentajeCumplimiento: 60,
    fortalezas: ['', '', ''],
    debilidades: ['', '', ''],
    indicadores: { vo2max: { inicial: '', final: '', delta: '' }, sentadilla: { inicial: '', final: '', delta: '' }, sprint: { inicial: '', final: '', delta: '' }, cmj: { inicial: '', final: '', delta: '' }, flexibilidad: { inicial: '', final: '', delta: '' } },
    indicadoresLista: [
      { id: 'ind-1', nombre: '', inicial: '', final: '', delta: '' },
      { id: 'ind-2', nombre: '', inicial: '', final: '', delta: '' },
      { id: 'ind-3', nombre: '', inicial: '', final: '', delta: '' },
    ],
    lesiones: 'no', descripcionLesiones: '', diasPerdidos: '',
    conclusiones: '', recomendaciones: ''
  });

  // ====== GAP ANALYSIS IA STATE ======
  const [aiGapData, setAiGapData] = useState(null);
  const [aiGapLoading, setAiGapLoading] = useState(false);
  const [aiGapProvider, setAiGapProvider] = useState('openai'); // openai | anthropic
  const [aiSelectedModels, setAiSelectedModels] = useState([]); // model_keys
  const [periodLibrary, setPeriodLibrary] = useState([]); // [{id, name, category, ...}]
  // Resuelve el nombre legible del modelo de un plan (biblioteca por id → model_name no-UUID → fallback)
  const isUuidLike = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v);
  const resolveModelName = (plan) => {
    if (!plan) return '';
    const byId = (periodLibrary || []).find(m => m.id === plan.model);
    if (byId?.name) return tModelName(byId.name);
    if (plan.model_name && !isUuidLike(plan.model_name)) return tModelName(plan.model_name);
    if (plan.model && !isUuidLike(plan.model)) return tModelName(plan.model);
    return '—';
  };

  // ====== OBJECTIVES STATE ======
  const [objectivesData, setObjectivesData] = useState({
    deporteObjetivo: '', categoria: '', edad: '', clasificacion: '', fechaInicio: '', fechaFin: '', entrenador: '',
    largoPlazo: ['', '', ''], medianoPlazo: ['', '', ''], cortoPlazo: ['', '', ''],
    porAspecto: {
      general: { objetivo: '', indicador: '' },
      fisicaGeneral: { objetivo: '', indicador: '' },
      fisicaEspecial: { objetivo: '', indicador: '' },
      tecnica: { objetivo: '', indicador: '' },
      tactica: { objetivo: '', indicador: '' },
      teorica: { objetivo: '', indicador: '' },
      psicologica: { objetivo: '', indicador: '' }
    }
  });

  // ====== GLOBAL CONTEXT (Barra Superior) -> useGlobalContext hook ======
  const {
    globalContext, setGlobalContext,
    handleEntityChange, handleTeamChange, handleAthleteChange, handleSportChange,
    filteredTeams, filteredAthletes,
  } = useGlobalContext(teams, athletes);

  // allSports -> useSportsCatalog hook

  // Save a new generated plan / delete plan -> useGeneratedPlans hook

  // Start new plan creation
  const handleNewPlan = () => {
    setIsCoachDrawerOpen(true);
    setCoachDrawerTab('coach');
    toast.info(t('data.usa_el_coach_ai_para_ayudarte_a_planificar'));
  };

  // Tournaments -> useTournaments hook
  const {
    tournaments, setTournaments,
    tournamentDialogOpen, setTournamentDialogOpen,
    selectedTournament, setSelectedTournament,
    tournamentDetailView, setTournamentDetailView,
    tournamentMatches, setTournamentMatches,
    tournamentForm, setTournamentForm,
    categoryDialogOpenTournament, setCategoryDialogOpenTournament,
    tournamentCategoryForm, setTournamentCategoryForm,
    registerDialogOpen, setRegisterDialogOpen,
    selectedTournamentCategory, setSelectedTournamentCategory,
    registrationForm, setRegistrationForm,
    scoreDialogOpen, setScoreDialogOpen,
    selectedMatch, setSelectedMatch,
    scoreForm, setScoreForm,
    TOURNAMENT_FORMATS, STATUS_COLORS, STATUS_LABELS, getFormatIcon,
    fetchTournamentsData, fetchTournamentDetails,
    handleCreateTournament, handleDeleteTournament, handleAddTournamentCategory,
    handleRegisterParticipant, handleGenerateBracket, handleUpdateScore,
  } = useTournaments({ t });

  // Cargar biblioteca de modelos y datos IA cacheados cuando el usuario entra a Plan Anterior
  useEffect(() => {
    if (activeDataSection === 'prev-plan') {
      if (periodLibrary.length === 0) fetchPeriodLibrary();
      if (activePlan?.id) fetchGapAnalysisAI(activePlan.id);
      // Pre-seleccionar el modelo activo si aún no hay selección
      setAiSelectedModels(prev => {
        if (prev.length > 0) return prev;
        if (activePlan?.model) return [activePlan.model];
        return [];
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataSection, activePlan?.id]);

  // Cargar biblioteca de modelos al montar (para resolver nombres de modelo en sidebar/tiles)
  useEffect(() => { fetchPeriodLibrary(); /* eslint-disable-next-line */ }, []);

  // API Base URL
  const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

  // ====== TRAINING PLANS FUNCTIONS ======
  // Fetch training plans from API
  const fetchTrainingPlans = async () => {
    setLoadingPlans(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/training-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrainingPlans(data);
        
        // Si hay un plan activo guardado, restaurarlo
        const savedActivePlanId = localStorage.getItem('train_active_plan_id');
        if (savedActivePlanId) {
          const savedPlan = data.find(p => p.id === savedActivePlanId);
          if (savedPlan) {
            setActivePlan(savedPlan);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching training plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Set active plan and persist
  const handleSetActivePlan = async (plan) => {
    setActivePlan(plan);
    if (plan) {
      localStorage.setItem('train_active_plan_id', plan.id);
      // Cargar datos del plan
      await loadPlanData(plan.id);
      // Navegar automáticamente a la primera sección del plan (Diagnóstico)
      setActiveDataSection('prev-plan');
      // Notificar a Panel de Control y otras secciones para refrescar
      window.dispatchEvent(new CustomEvent('lordtraining:plan-data-updated', { detail: { plan_id: plan.id } }));
    } else {
      localStorage.removeItem('train_active_plan_id');
      setPlanData(null);
      // Resetear evaluaciones
      resetEvaluationData();
      // Volver al estado inicial (sidebar visible, sin sección seleccionada)
      setActiveDataSection(null);
    }
    setShowPlanSelector(false);
  };

  // Cargar todos los datos de un plan
  const loadPlanData = async (planId) => {
    setLoadingPlanData(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/plan-data/${planId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPlanData(data);
        // Cargar datos en los estados de evaluación
        if (data.evaluations) {
          if (data.evaluations.medical?.length > 0) {
            const lastMedical = data.evaluations.medical[data.evaluations.medical.length - 1];
            setMedicalData(lastMedical.results || {});
          }
          if (data.evaluations.anthropometric?.length > 0) {
            const lastAnthro = data.evaluations.anthropometric[data.evaluations.anthropometric.length - 1];
            setAnthropometricData(lastAnthro.results || {});
          }
          if (data.evaluations.physical?.length > 0) {
            const lastPhysical = data.evaluations.physical[data.evaluations.physical.length - 1];
            setPhysicalData(lastPhysical.results || {});
          }
          if (data.evaluations.technical?.length > 0) {
            const lastTechnical = data.evaluations.technical[data.evaluations.technical.length - 1];
            setTechnicalData(lastTechnical.results || {});
          }
          if (data.evaluations.tactical?.length > 0) {
            const lastTactical = data.evaluations.tactical[data.evaluations.tactical.length - 1];
            setTacticalData(lastTactical.results || {});
          }
          if (data.evaluations.psychological?.length > 0) {
            const lastPsych = data.evaluations.psychological[data.evaluations.psychological.length - 1];
            setPsychologicalData(lastPsych.results || {});
          }
        }
        // Cargar análisis del plan anterior
        if (data.previous_analysis?.data) {
          setPreviousAnalysisData(prev => ({ ...prev, ...data.previous_analysis.data }));
        }
        // Cargar objetivos
        if (data.objectives?.data) {
          setObjectivesData(prev => ({ ...prev, ...data.objectives.data }));
        }
      }
    } catch (error) {
      console.error('Error loading plan data:', error);
    } finally {
      setLoadingPlanData(false);
    }
  };

  // Resetear datos de evaluación
  const resetEvaluationData = () => {
    setMedicalData({ fcReposo: '', fcMaxima: '', paSistolica: '', paDiastolica: '', saturacionO2: '',
      enfermedadesCronicas: '', alergias: '', cirugiasPrevias: '', lesionesActuales: '',
      medicamentos: '', aptitudMedica: 'apto', proximaRevision: '', observaciones: '' });
    setAnthropometricData({ peso: '', talla: '', imc: '', porcentajeGrasa: '', masaMuscular: '',
      envergadura: '', circunferenciaCintura: '', circunferenciaCadera: '', plieguesTriceps: '',
      plieguesSubescapular: '', plieguesSuprailiaco: '', perimetroBrazo: '', perimetroMuslo: '',
      perimetroPierna: '', observaciones: '' });
    setPhysicalData({ fuerzaMaxima: '', fuerzaExplosiva: '', resistenciaAerobica: '', resistenciaAnaerobica: '',
      velocidadMaxima: '', agilidad: '', flexibilidad: '', coordinacion: '', equilibrio: '',
      potencia: '', vo2max: '', fcMaxTest: '', observaciones: '' });
    setTechnicalData({ nivelTecnico: '', habilidadesBasicas: '', habilidadesAvanzadas: '',
      eficienciaTecnica: '', consistencia: '', adaptabilidad: '', observaciones: '' });
    setTacticalData({ comprensionTactica: '', tomadecisiones: '', lecturadeJuego: '',
      posicionamiento: '', comunicacion: '', liderazgo: '', observaciones: '' });
    setPsychologicalData({ motivacion: '', concentracion: '', manejoEstres: '', autoconfianza: '',
      controlEmocional: '', resilencia: '', cohesionGrupal: '', observaciones: '' });
    setPreviousAnalysisData({
      fechaInicio: '', fechaFinalizacion: '', duracionSemanas: '', objetivoPrincipal: '',
      cumplimiento: { general: 'parcial', fisica: 'parcial', tecnica: 'parcial', tactica: 'parcial', psicologica: 'parcial' },
      porcentajeCumplimiento: '',
      fortalezas: ['', '', ''],
      debilidades: ['', '', ''],
      indicadores: { vo2max: { inicial: '', final: '', delta: '' }, sentadilla: { inicial: '', final: '', delta: '' }, sprint: { inicial: '', final: '', delta: '' }, cmj: { inicial: '', final: '', delta: '' }, flexibilidad: { inicial: '', final: '', delta: '' } },
      lesiones: 'no', descripcionLesiones: '', diasPerdidos: '',
      conclusiones: '', recomendaciones: ''
    });
    setObjectivesData({
      deporteObjetivo: '', categoria: '', edad: '', clasificacion: '', fechaInicio: '', fechaFin: '', entrenador: '',
      largoPlazo: ['', '', ''], medianoPlazo: ['', '', ''], cortoPlazo: ['', '', ''],
      porAspecto: {
        general: { objetivo: '', indicador: '' },
        fisicaGeneral: { objetivo: '', indicador: '' },
        fisicaEspecial: { objetivo: '', indicador: '' },
        tecnica: { objetivo: '', indicador: '' },
        tactica: { objetivo: '', indicador: '' },
        teorica: { objetivo: '', indicador: '' },
        psicologica: { objetivo: '', indicador: '' }
      }
    });
    setPlanData(null);
  };

  // Función genérica para guardar evaluaciones
  const handleSaveEvaluation = async (evaluationType, data) => {
    if (!activePlan) {
      toast.error(t('data.selecciona_un_plan_primero'));
      return;
    }
    setSavingEvaluation(true);
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/plan-data/evaluations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: activePlan.id,
          athlete_id: selectedAthleteId,
          evaluation_type: evaluationType,
          date: new Date().toISOString().split('T')[0],
          results: data,
          notes: data.observaciones || ''
        })
      });
      toast.success(`${evaluationType.charAt(0).toUpperCase() + evaluationType.slice(1)} guardado`);
    } catch (error) {
      toast.error(t('data.error_al_guardar'));
    }
    setSavingEvaluation(false);
  };

  // Guardar análisis del plan anterior
  const handleSavePreviousAnalysis = async () => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return; }
    setSavingEvaluation(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: activePlan.id,
          previous_plan_summary: previousAnalysisData.objetivoPrincipal,
          achievements: previousAnalysisData.fortalezas.filter(f => f),
          areas_to_improve: previousAnalysisData.debilidades.filter(d => d),
          lessons_learned: [previousAnalysisData.conclusiones].filter(c => c),
          athlete_feedback: previousAnalysisData.recomendaciones,
          data: previousAnalysisData
        })
      });
      if (res.ok) toast.success(t('data.analisis_del_plan_anterior_guardado'));
      else toast.error(t('data.error_al_guardar_analisis'));
    } catch (error) {
      toast.error(t('data.error_al_guardar_analisis'));
    }
    setSavingEvaluation(false);
  };

  // ====== GAP ANALYSIS IA: cargar biblioteca de modelos + datos cacheados ======
  const fetchPeriodLibrary = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/periodization-library`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPeriodLibrary(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
  };

  const fetchGapAnalysisAI = async (planId) => {
    if (!planId) return;
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis/${planId}/gap-analysis-ai`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.gap_analysis_ai) {
          setAiGapData(data.gap_analysis_ai);
          // Pre-cargar modelos seleccionados desde el cache
          const cached = data.gap_analysis_ai.comparisons || [];
          if (cached.length > 0) {
            setAiSelectedModels(cached.map(c => c.model_key));
          }
        }
      }
    } catch { /* silent */ }
  };

  const handleGenerateGapAnalysisAI = async (forceRefresh = false) => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return; }
    if (aiSelectedModels.length === 0) {
      toast.error(t('data.selecciona_al_menos_un_modelo_de_periodiza'));
      return;
    }
    setAiGapLoading(true);
    try {
      // Guardar el análisis primero para asegurar que el backend tiene los datos al día
      await handleSavePreviousAnalysis();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis/${activePlan.id}/gap-analysis-ai`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          models: aiSelectedModels,
          provider: aiGapProvider,
          force_refresh: forceRefresh,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error generando IA' }));
        toast.error(err.detail || 'Error generando IA');
        return;
      }
      const data = await res.json();
      setAiGapData(data);
      if (data.cached) {
        toast.success(t('data.analisis_cargado_desde_cache'));
      } else {
        toast.success(`Análisis generado con ${aiGapProvider === 'openai' ? 'GPT-5.2' : 'Claude Sonnet 4.5'}`);
      }
    } catch (error) {
      toast.error(t('data.error_generando_analisis_con_ia'));
    } finally {
      setAiGapLoading(false);
    }
  };

  // Descargar PDF del plan anterior (estilo whitepaper)
  const handleDownloadPreviousAnalysisPDF = async () => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return; }
    try {
      // Guardar primero para asegurar que los datos están al día
      await handleSavePreviousAnalysis();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis/${activePlan.id}/pdf?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error descargando PDF' }));
        toast.error(err.detail || 'Error descargando PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Analisis_Plan_Anterior_${activePlan.name || activePlan.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error(t('data.error_al_descargar_pdf'));
    }
  };

  // Crear link de compartición y copiar al portapapeles
  const handleSharePreviousAnalysisLink = async () => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return; }
    try {
      await handleSavePreviousAnalysis();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis/${activePlan.id}/share?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { toast.error('Error creando enlace'); return null; }
      const data = await res.json();
      const publicUrl = `${window.location.origin}/api/plan-data/previous-analysis/shared/${data.share_id}`;
      try {
        await navigator.clipboard.writeText(publicUrl);
        toast.success('Enlace copiado al portapapeles', { description: publicUrl });
      } catch {
        toast.info('Enlace listo', { description: publicUrl });
      }
      return publicUrl;
    } catch (error) {
      toast.error(t('data.error_al_crear_enlace'));
      return null;
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = async () => {
    const url = await handleSharePreviousAnalysisLink();
    if (!url) return;
    const planName = activePlan?.name || 'el plan';
    const msg = encodeURIComponent(
      `📊 Análisis del Plan Anterior — ${planName}\n\nTe comparto el análisis retrospectivo del plan de entrenamiento generado con LordTraining:\n\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  // Guardar objetivos del plan
  const handleSaveObjectives = async () => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return; }
    setSavingEvaluation(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/objectives`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          plan_id: activePlan.id,
          main_objective: objectivesData.deporteObjetivo,
          secondary_objectives: [...objectivesData.largoPlazo, ...objectivesData.medianoPlazo, ...objectivesData.cortoPlazo].filter(o => o),
          data: objectivesData
        })
      });
      if (res.ok) toast.success(t('data.objetivos_del_plan_guardados'));
      else toast.error(t('data.error_al_guardar_objetivos'));
    } catch (error) {
      toast.error(t('data.error_al_guardar_objetivos'));
    }
    setSavingEvaluation(false);
  };

  // ====== Plan Activo: PDF / Share / WhatsApp ======
  const handleDownloadObjectivesPDF = async () => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return; }
    try {
      await handleSaveObjectives();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/objectives/${activePlan.id}/pdf?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error descargando PDF' }));
        toast.error(err.detail || 'Error descargando PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Plan_Activo_${activePlan.name || activePlan.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch (error) {
      toast.error(t('data.error_al_descargar_pdf'));
    }
  };

  const handleShareObjectivesLink = async () => {
    if (!activePlan) { toast.error(t('data.selecciona_un_plan_primero')); return null; }
    try {
      await handleSaveObjectives();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/objectives/${activePlan.id}/share?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) { toast.error('Error creando enlace'); return null; }
      const data = await res.json();
      const publicUrl = `${window.location.origin}/api/plan-data/objectives/shared/${data.share_id}`;
      try {
        await navigator.clipboard.writeText(publicUrl);
        toast.success('Enlace copiado al portapapeles', { description: publicUrl });
      } catch {
        toast.info('Enlace listo', { description: publicUrl });
      }
      return publicUrl;
    } catch (error) {
      toast.error(t('data.error_al_crear_enlace'));
      return null;
    }
  };

  const handleShareObjectivesWhatsApp = async () => {
    const publicUrl = await handleShareObjectivesLink();
    if (!publicUrl) return;
    const planName = activePlan?.name || 'Plan Activo';
    const text = encodeURIComponent(`Plan Activo · ${planName}\n\nObjetivos del ciclo y aspectos de preparación:\n${publicUrl}\n\nGenerado por LordTraining.app`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Delete a training plan
  const handleDeleteTrainingPlan = async (planId) => {
    if (!window.confirm('¿Eliminar este plan de entrenamiento y todos sus datos asociados?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/training-plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success(t('data.plan_eliminado'));
      
      // Si era el plan activo, limpiarlo
      if (activePlan?.id === planId) {
        handleSetActivePlan(null);
      }
      
      fetchTrainingPlans();
    } catch (error) {
      toast.error(t('data.error_al_eliminar_plan'));
    }
  };

  // Duplicate a training plan
  const handleDuplicatePlan = async (planId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/training-plans/${planId}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success(t('dashboard.plans.duplicated'));
        fetchTrainingPlans();
      } else {
        toast.error(t('data.error_al_duplicar'));
      }
    } catch (error) {
      toast.error(t('data.error_al_duplicar_plan'));
    }
  };

  // Share a training plan
  const handleSharePlan = async (planId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/training-plans/${planId}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const shareUrl = `${window.location.origin}${data.share_url}`;
        try {
          await navigator.clipboard.writeText(shareUrl);
          toast.success(t('dashboard.plans.shared'));
        } catch {
          // Fallback for environments where clipboard API is restricted
          const textArea = document.createElement('textarea');
          textArea.value = shareUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          toast.success(t('dashboard.plans.shared'));
        }
      } else {
        toast.error(t('data.error_al_compartir'));
      }
    } catch (error) {
      toast.error(t('data.error_al_compartir_plan'));
    }
  };

  // Export plan as PDF
  const handleExportPDF = async (planId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/training-plans/${planId}/export/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan_${planId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(t('dashboard.plans.exported'));
      } else {
        toast.error(t('data.error_al_exportar_pdf'));
      }
    } catch (error) {
      toast.error(t('data.error_al_exportar_pdf'));
    }
  };


  // Fetch athletes from backend
  const fetchAthletes = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/athletes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAthletes(data);
      }
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  // Fetch entities for athlete affiliations
  const fetchEntities = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/entities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  };

  // Update user profile (including role)
  const handleUpdateProfile = async (newRole) => {
    setUpdatingProfile(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        const updatedUser = await response.json();
        if (updateUser) {
          updateUser(updatedUser);
        }
        toast.success('Rol actualizado correctamente');
        setShowProfileDialog(false);
      } else {
        toast.error(t('data.error_al_actualizar_el_perfil'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('data.error_al_actualizar_el_perfil'));
    }
    setUpdatingProfile(false);
  };

  // Create new athlete
  const handleCreateAthlete = async () => {
    if (!newAthlete.name || !newAthlete.sport) {
      alert('Por favor ingresa al menos el nombre y el deporte');
      return;
    }
    setSavingAthlete(true);
    try {
      const token = localStorage.getItem('train_token');
      // Build affiliations array from selected entities
      const affiliations = [];
      if (newAthlete.federation) affiliations.push(newAthlete.federation);
      if (newAthlete.club) affiliations.push(newAthlete.club);
      if (newAthlete.school) affiliations.push(newAthlete.school);
      
      const response = await fetch(`${API_URL}/api/athletes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newAthlete.name,
          email: newAthlete.email || null,
          sport: newAthlete.sport.toLowerCase() || 'other',
          age: newAthlete.birthDate ? new Date().getFullYear() - new Date(newAthlete.birthDate).getFullYear() : 20,
          level: newAthlete.level || 'intermedio',
          notes: `Categoría: ${newAthlete.category || 'N/A'}, Género: ${newAthlete.gender || 'N/A'}`,
          affiliations: affiliations,
          team_id: newAthlete.team_id || null
        })
      });
      if (response.ok) {
        await fetchAthletes();
        setNewAthlete({ name: '', email: '', birthDate: '', gender: '', sport: '', category: '', level: '', federation: '', club: '', school: '', team_id: '' });
        toast.success(t('data.atleta_creado_exitosamente'));
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al crear atleta');
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast.error(t('data.error_al_crear_atleta'));
    }
    setSavingAthlete(false);
  };

  // Delete athlete
  const handleDeleteAthlete = async (athleteId) => {
    if (!window.confirm('¿Estás seguro de eliminar este atleta?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/athletes/${athleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchAthletes();
        if (selectedAthleteId === athleteId) setSelectedAthleteId(null);
      }
    } catch (error) {
      console.error('Error deleting athlete:', error);
    }
  };

  // Team Management Functions
  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name) {
      alert('Por favor ingresa el nombre del equipo');
      return;
    }
    try {
      const token = localStorage.getItem('train_token');
      const teamData = {
        name: newTeam.name,
        sport: newTeam.sport || 'other',
        category: newTeam.category || '',
        affiliations: {
          federation: newTeam.federation || null,
          club: newTeam.club || null,
          school: newTeam.school || null
        },
        athletes: []
      };
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(teamData)
      });
      if (response.ok) {
        await fetchTeams();
        setNewTeam({ name: '', sport: '', category: '', federation: '', club: '', school: '' });
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('¿Estás seguro de eliminar este equipo?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchTeams();
      }
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  // Fetch events for selected athlete
  const fetchEvents = async (athleteId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/events-calendar/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  // ── Vista consolidada de Equipo: color + inicial por atleta ──
  const TEAM_PALETTE = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626', '#0d9488', '#9333ea', '#65a30d', '#e11d48'];
  const athleteInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };
  const selectedTeam = teams.find(tm => tm.id === selectedTeamId) || null;
  const teamRoster = selectedTeam?.athletes || [];
  // mapa athleteId → {name, initial, color}
  const teamAthleteMeta = useMemo(() => {
    const map = {};
    teamRoster.forEach((aid, i) => {
      const a = athletes.find(at => at.id === aid);
      map[aid] = { name: a?.name || 'Atleta', initial: athleteInitials(a?.name || ''), color: TEAM_PALETTE[i % TEAM_PALETTE.length] };
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId, teams, athletes]);

  // Trae y fusiona los eventos de TODOS los atletas del equipo (etiquetados por atleta)
  const fetchTeamEvents = async () => {
    if (!selectedTeamId || teamRoster.length === 0) { setTeamEvents([]); return; }
    const token = localStorage.getItem('train_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const results = await Promise.all(teamRoster.map(async (aid) => {
      try {
        const r = await fetch(`${API_URL}/api/events-calendar/${aid}`, { headers });
        if (!r.ok) return [];
        const d = await r.json();
        const meta = teamAthleteMeta[aid] || {};
        return (d.events || []).map(e => ({ ...e, _athleteId: aid, _athleteName: meta.name, _athleteInitial: meta.initial, _athleteColor: meta.color }));
      } catch (e) { return []; }
    }));
    setTeamEvents(results.flat());
  };

  // Save events
  const handleSaveEvent = async () => {
    if (!selectedAthleteId) {
      alert('Selecciona un atleta primero');
      return;
    }
    if (!newEvent.name || !newEvent.date) {
      alert('Por favor ingresa al menos el nombre y la fecha');
      return;
    }
    setSavingEvent(true);
    try {
      const token = localStorage.getItem('train_token');
      const updatedEvents = [...events, { ...newEvent, id: Date.now().toString() }];
      const response = await fetch(`${API_URL}/api/events-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          athlete_id: selectedAthleteId,
          events: updatedEvents
        })
      });
      if (response.ok) {
        setEvents(updatedEvents);
        setNewEvent({ name: '', type: '', date: '', location: '', objective: '', priority: '' });
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
    setSavingEvent(false);
  };

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    if (!selectedAthleteId) return;
    try {
      const token = localStorage.getItem('train_token');
      const updatedEvents = events.filter(e => e.id !== eventId);
      await fetch(`${API_URL}/api/events-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          athlete_id: selectedAthleteId,
          events: updatedEvents
        })
      });
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Reprograma un evento gp_ para UN atleta: actualiza events_calendar + planData (graphic_plans)
  const rescheduleEventForAthlete = async (athleteId, ev, newDateStr) => {
    if (!athleteId || !ev?.id || !newDateStr) return false;
    const token = localStorage.getItem('train_token');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    const weekFromDate = (dateStr) => {
      const sd = activePlan?.start_date ? new Date(activePlan.start_date) : null;
      if (!sd || isNaN(sd.getTime())) return null;
      const d = new Date(dateStr);
      const diffDays = Math.floor((d - sd) / (1000 * 60 * 60 * 24));
      return Math.max(1, Math.floor(diffDays / 7) + 1);
    };

    // Traer los eventos actuales del atleta
    let evts = [];
    try {
      const r = await fetch(`${API_URL}/api/events-calendar/${athleteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (r.ok) { const d = await r.json(); evts = d.events || []; }
    } catch (e) { return false; }
    const target = evts.find(e => e.id === ev.id);
    if (!target) return false;
    const oldDate = target.date;

    // Parse gp_<section>_<rowId>_<week>_<i>
    const m = String(ev.id).match(/^gp_([a-z]+)_(.+)_(\d+)_(\d+)$/);
    const newWeek = weekFromDate(newDateStr);
    let newId = ev.id, section = null, rowId = null, oldWeek = null;
    if (m) {
      section = m[1]; rowId = m[2]; oldWeek = parseInt(m[3], 10);
      if (newWeek && newWeek !== oldWeek) {
        const baseKey = `gp_${section}_${rowId}_${newWeek}`;
        const used = evts.filter(e => (e.id || '').startsWith(baseKey)).length;
        newId = `${baseKey}_${used}`;
      }
    }

    // 1) events_calendar
    const updatedEvents = evts.map(e => e.id === ev.id ? { ...e, id: newId, date: newDateStr } : e);
    try {
      await fetch(`${API_URL}/api/events-calendar`, {
        method: 'POST', headers, body: JSON.stringify({ athlete_id: athleteId, events: updatedEvents })
      });
    } catch (e) { return false; }

    // 2) planData (graphic_plans) si es celda
    if (m && (section === 'activities' || section === 'monitoring') && newWeek) {
      try {
        const r = await fetch(`${API_URL}/api/graphic-plan/${athleteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (r.ok) {
          const gp = await r.json();
          const planData = gp.planData || {};
          const sec = { ...(planData[section] || {}) };
          const oldArr = (sec[`${rowId}_dates_${oldWeek}`] || []).filter(d => d && d.slice(0, 10) !== (oldDate || '').slice(0, 10));
          if (oldArr.length === 0) {
            delete sec[`${rowId}_${oldWeek}`]; delete sec[`${rowId}_date_${oldWeek}`]; delete sec[`${rowId}_dates_${oldWeek}`];
          } else {
            sec[`${rowId}_dates_${oldWeek}`] = oldArr; sec[`${rowId}_date_${oldWeek}`] = oldArr[0]; sec[`${rowId}_${oldWeek}`] = true;
          }
          const newArr = [...((sec[`${rowId}_dates_${newWeek}`]) || []).filter(Boolean), newDateStr];
          sec[`${rowId}_dates_${newWeek}`] = newArr; sec[`${rowId}_date_${newWeek}`] = newArr[0]; sec[`${rowId}_${newWeek}`] = true;
          planData[section] = sec;
          await fetch(`${API_URL}/api/graphic-plan`, {
            method: 'POST', headers,
            body: JSON.stringify({ athlete_id: athleteId, generalInfo: gp.generalInfo || {}, planData, cycleDuration: gp.cycleDuration || 'annual' })
          });
        }
      } catch (e) { /* el evento ya se movió en el calendario */ }
    }
    return true;
  };

  // Reprogramar un evento al arrastrarlo en el Calendario → sincroniza Plan Gráfico (bidireccional)
  // scope: 'all' (todo el equipo) | 'single' (solo ese atleta). athleteId del chip en ev._athleteId (modo equipo).
  const handleEventReschedule = async (ev, newDateStr, scope = 'single') => {
    if (!ev?.id || !newDateStr) return false;
    let targets;
    if (selectedTeamId) {
      const roster = (teams.find(tm => tm.id === selectedTeamId)?.athletes) || [];
      targets = scope === 'all' ? roster : [ev._athleteId || selectedAthleteId];
    } else {
      targets = [selectedAthleteId];
    }
    targets = [...new Set(targets.filter(Boolean))];
    if (targets.length === 0) return false;
    let ok = false;
    for (const aid of targets) {
      const r = await rescheduleEventForAthlete(aid, ev, newDateStr);
      ok = ok || r;
    }
    // Refrescar la vista (equipo o individual)
    if (selectedTeamId) { await fetchTeamEvents(); }
    else if (selectedAthleteId) { await fetchEvents(selectedAthleteId); }
    return ok;
  };

  // Fetch objectives for selected athlete
  const fetchObjectives = async (athleteId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/objectives/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setObjectives(data.objectives || []);
      } else {
        setObjectives([]);
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
      setObjectives([]);
    }
  };

  // Fetch periodization data for selected athlete
  const fetchPeriodizationData = async (athleteId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/periodization/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPeriodizationData(data);
      } else {
        setPeriodizationData(null);
      }
    } catch (error) {
      console.error('Error fetching periodization:', error);
      setPeriodizationData(null);
    }
  };

  // Effect to fetch data when athlete is selected
  useEffect(() => {
    if (selectedAthleteId) {
      fetchEvents(selectedAthleteId);
      fetchObjectives(selectedAthleteId);
      fetchPeriodizationData(selectedAthleteId);
    } else {
      setPeriodizationData(null);
    }
  }, [selectedAthleteId]);

  // Refrescar eventos al entrar al Calendario (las fechas del Plan Gráfico ya están en el backend)
  useEffect(() => {
    if (activeDataSection === 'calendar-view') {
      if (selectedTeamId) { fetchTeamEvents(); }
      else if (selectedAthleteId) { fetchEvents(selectedAthleteId); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataSection, selectedTeamId]);

  // Navigation items for "Datos" panel - ESTRUCTURA JERÁRQUICA DEL PLAN DE ENTRENAMIENTO
  // Basado en la metodología científica de planificación deportiva (Padilla, Matveiev, etc.)
  const navItems = [
    // === 0. GESTIÓN DE PLANES (PRIMERA OPCIÓN) ===
    { id: 'plan-manager', label: t('dashboard.plans.title'), icon: Clipboard, section: 'planes' },
    
    // === 1. DIAGNÓSTICO / PUNTO DE PARTIDA ===
    { id: 'prev-plan', label: t('data.x_plan_anterior'), icon: History, section: 'punto-partida' },
    { id: 'objectives', label: t('dashboard.controlPanel.activePlan'), icon: Target, section: 'punto-partida' },
    
    // === 2. INFORMACIÓN BASE ===
    { id: 'entities', label: t('data.navEntities'), icon: Building2, section: 'informacion' },
    { id: 'federation-panel', label: t('data.x_federacion'), icon: Crown, section: 'informacion' },
    { id: 'teams', label: t('data.navTeams'), icon: UsersRound, section: 'informacion' },
    { id: 'athletes', label: t('dashboard.controlPanel.athletes'), icon: User, section: 'informacion' },
    { id: 'sports', label: t('data.deportes'), icon: Medal, section: 'informacion' },
    { id: 'tournaments', label: t('data.navTournaments'), icon: Shield, section: 'informacion' },
    { id: 'coaches', label: t('data.navCoaches'), icon: UserCheck, section: 'informacion' },
    
    // === 3. EVALUACIÓN / CONTROLES ===
    { id: 'control-medical', label: t('data.x_control_medico'), icon: Stethoscope, section: 'evaluacion' },
    { id: 'control-anthropometric', label: t('data.x_antropometria'), icon: LineChart, section: 'evaluacion' },
    { id: 'control-physical', label: t('data.x_control_fisico'), icon: Dumbbell, section: 'evaluacion' },
    { id: 'control-biomechanical', label: t('data.x_biomecanica'), icon: Activity, section: 'evaluacion' },
    { id: 'control-technical', label: t('data.x_control_tecnico'), icon: Target, section: 'evaluacion' },
    { id: 'control-tactical', label: t('data.x_control_tactico'), icon: Layers, section: 'evaluacion' },
    { id: 'control-psychological', label: t('data.x_control_psicologico'), icon: Brain, section: 'evaluacion' },
    { id: 'control-theoretical', label: t('data.x_control_teorico'), icon: BookOpen, section: 'evaluacion' },
    { id: 'evaluation-evolution', label: t('data.x_evolucion_de_controles'), icon: TrendingUp, section: 'evaluacion' },
    
    // === 4. COMPETENCIAS ===
    { id: 'competitions', label: t('dashboard.sections.competitions'), icon: Trophy, section: 'competencias' },
    
    // === 5. PERIODIZACIÓN (sub-secciones directas sin tab intermedio) ===
    { id: 'period-overview', label: t('data.navSummary'), icon: Gauge, section: 'periodizacion' },
    { id: 'period-structure', label: t('data.navStructure'), icon: LayoutGrid, section: 'periodizacion' },
    { id: 'period-load', label: t('data.navLoad'), icon: Flame, section: 'periodizacion' },
    
    // === 6. PLAN GRÁFICO ===
    { id: 'graphic-plan', label: t('data.x_plan_grafico'), icon: PieChart, section: 'visualizacion' },
    { id: 'calendar-view', label: t('data.navCalendar'), icon: CalendarDays, section: 'visualizacion' },
    { id: 'smart-alerts', label: t('data.navAlerts'), icon: Zap, section: 'visualizacion' },
    
    // === 7. HERRAMIENTAS ===
    { id: 'calculators', label: t('dashboard.nav.calculators'), icon: Calculator, section: 'herramientas' },
    { id: 'pdi-sheet', label: 'LordTraining PDI', icon: Brain, section: 'herramientas' },
    { id: 'periodization-models', label: t('data.navModels'), icon: Layers, section: 'herramientas' },
    { id: 'exercises', label: t('data.x_metodos'), icon: Timer, section: 'herramientas' },
    { id: 'exercises-lib', label: t('dashboard.controlPanel.exercises'), icon: Dumbbell, section: 'herramientas' },
    { id: 'tactical-board', label: t('data.navTacticalBoard'), icon: LayoutGrid, section: 'herramientas' },
  ];

  // ====== PLAN SECTIONS & COLORS (top-level for top bar integration) ======
  const planSections = [
    { key: 'punto-partida', title: t('dashboard.sections.diagnosis'), color: 'rose', icon: Clipboard },
    { key: 'informacion', title: t('dashboard.sections.information'), color: 'indigo', icon: Users },
    { key: 'evaluacion', title: t('dashboard.sections.evaluation'), color: 'emerald', icon: Heart },
    { key: 'competencias', title: t('dashboard.sections.competitions'), color: 'violet', icon: Trophy },
    { key: 'periodizacion', title: t('dashboard.sections.periodization'), color: 'cyan', icon: Calendar },
    { key: 'visualizacion', title: t('data.x_plan_grafico'), color: 'amber', icon: BarChart },
    { key: 'herramientas', title: t('dashboard.sections.tools'), color: 'slate', icon: Wrench },
  ];

  const colorClasses = {
    blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', shadow: 'shadow-blue-200', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-500' },
    rose: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', shadow: 'shadow-rose-200', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-500' },
    indigo: { bg: 'bg-[#007AFF]', hover: 'hover:bg-indigo-600', shadow: 'shadow-indigo-200', light: 'bg-indigo-50', text: 'text-[#007AFF]', border: 'border-indigo-500' },
    emerald: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', shadow: 'shadow-emerald-200', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500' },
    violet: { bg: 'bg-violet-500', hover: 'hover:bg-violet-600', shadow: 'shadow-violet-200', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-500' },
    cyan: { bg: 'bg-cyan-600', hover: 'hover:bg-cyan-700', shadow: 'shadow-cyan-200', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-600' },
    amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', shadow: 'shadow-amber-200', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500' },
    slate: { bg: 'bg-slate-600', hover: 'hover:bg-slate-700', shadow: 'shadow-slate-200', light: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-600' },
  };

  const currentSection = navItems.find(n => n.id === activeDataSection)?.section || 'punto-partida';
  const currentSectionData = planSections.find(s => s.key === currentSection);
  const currentColors = colorClasses[currentSectionData?.color || 'rose'];
  const sectionItems = navItems.filter(i => i.section === currentSection);


  // Estado para secciones colapsadas
  const [collapsedSections, setCollapsedSections] = useState({});

  // Mock data for charts
  const trainingData = stats?.weekly_load?.length > 0 
    ? stats.weekly_load.map((item, idx) => ({
        week: `Sem ${idx + 1}`,
        volume: Math.round(item.load * 10) || 80,
        intensity: Math.round(item.load * 8) || 60,
        fatigue: Math.round(item.load * 5) || 40
      }))
    : [
        { week: 'Sem 1', volume: 80, intensity: 60, fatigue: 40 },
        { week: 'Sem 2', volume: 85, intensity: 65, fatigue: 45 },
        { week: 'Sem 3', volume: 90, intensity: 70, fatigue: 55 },
        { week: 'Sem 4', volume: 75, intensity: 80, fatigue: 65 },
      ];

  const performanceData = [
    { ability: 'Resistencia', value: 80 },
    { ability: 'Velocidad', value: 65 },
    { ability: 'Fuerza', value: 75 },
    { ability: 'Técnica', value: 85 },
    { ability: 'Táctica', value: 70 }
  ];

  useEffect(() => {
    fetchData();
    fetchEntities();
    fetchTeams();
    fetchTrainingPlans(); // Cargar planes de entrenamiento
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, athletesRes] = await Promise.all([
        getDashboardStats(),
        getAthletes()
      ]);
      setStats(statsRes.data);
      setAthletes(athletesRes.data);
      
      try {
        await seedExercises();
      } catch (e) {}
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Demo data (onboarding) — top bar
  const [demoMenuOpen, setDemoMenuOpen] = useState(false);
  const [demoBusy, setDemoBusy] = useState(null);

  // Alertas proactivas del coach (ACWR riesgo + baja disponibilidad)
  const [coachAlerts, setCoachAlerts] = useState([]);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  useEffect(() => {
    const token = localStorage.getItem('train_token');
    if (!token) return;
    fetch(`${API_URL}/api/coach/metrics/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCoachAlerts(d.alerts || []); })
      .catch(() => {});
    fetch(`${API_URL}/api/coach/metrics/weekly-summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        setWeeklySummary(d);
        // Apertura automática los lunes (una vez por semana)
        const seenKey = `weekly_summary_seen_${d.week_start}`;
        if (new Date().getDay() === 1 && !localStorage.getItem(seenKey)) {
          setSummaryOpen(true);
          localStorage.setItem(seenKey, '1');
        }
      })
      .catch(() => {});
  }, []);

  const handleSeedDemo = async () => {
    setDemoBusy('seed');
    try {
      const res = await seedDemoData(null);
      const t = res.data?.totals || {};
      toast.success(`Datos de ejemplo cargados: ${t.sessions || 0} sesiones, ${t.competitions || 0} competencias. Recargando…`);
      setDemoMenuOpen(false);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudieron cargar los datos de ejemplo');
    } finally { setDemoBusy(null); }
  };
  const handleClearDemo = async () => {
    if (!window.confirm(t('dashboard.demo.loadConfirm'))) return;
    setDemoBusy('clear');
    try {
      const res = await clearDemoData();
      toast.success(`Datos de ejemplo eliminados (${res.data?.sessions_cleared || 0} sesiones). Recargando…`);
      setDemoMenuOpen(false);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'No se pudieron quitar los datos');
    } finally { setDemoBusy(null); }
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setChatMessages([...chatMessages, { type: 'user', text: inputMessage }]);
      setInputMessage('');
      // Simulate AI response
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          type: 'ai', 
          text: 'Gracias por tu consulta. Para generar un plan personalizado, ve al "Panel de Control" para ver un resumen de todos tus datos y gráficas.' 
        }]);
      }, 1000);
    }
  };

  const renderDataContent = () => {
    // ====== MÓDULO: SCOUTING / RECRUITING & TALENT ID ======
    if (activeDataSection === 'scouting') {
      return <ScoutingModule activeTab={scoutingTab} onTabChange={setScoutingTab} />;
    }
    // ====== SECCIÓN: GESTIÓN DE PLANES (plan-manager) ======
    if (activeDataSection === 'plan-manager') {
      return (
        <div className="h-full bg-[#fafaf8] p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Clipboard className="w-5 h-5 text-[#CCFF00]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{t('dashboard.plans.title')}</h1>
                  <p className="text-slate-500 text-sm">{t('dashboard.plans.subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                onClick={() => setActiveDataSection('training-system')}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg shadow-sm transition-all"
                data-testid="create-plan-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('dashboard.plans.newPlan')}
              </Button>
              <Button
                variant="outline"
                onClick={fetchTrainingPlans}
                className="border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg px-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {t('dashboard.plans.refresh')}
              </Button>
            </div>

            {/* Plan Activo Destacado */}
            {activePlan && (
              <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[11px] text-emerald-600 font-semibold uppercase tracking-wider">{t('dashboard.plans.activePlan')}</p>
                      <h3 className="font-semibold text-slate-800">{activePlan.name}</h3>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetActivePlan(null)}
                    className="border-slate-300 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    {t('dashboard.plans.change')}
                  </Button>
                </div>
              </div>
            )}

            {/* Lista de Planes - Material Design Cards */}
            <div className="space-y-1 mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {trainingPlans.length > 0 ? `${trainingPlans.length} ${t('dashboard.plans.savedPlans')}` : t('dashboard.plans.title')}
              </h2>
            </div>

            {loadingPlans ? (
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-slate-500">{t('dashboard.plans.loading')}</p>
              </div>
            ) : trainingPlans.length > 0 ? (
              <div className="grid gap-3">
                {trainingPlans.map(plan => {
                  const isActive = activePlan?.id === plan.id;
                  return (
                    <div 
                      key={plan.id}
                      className={`group bg-white border rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                        isActive 
                          ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' 
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                      onClick={() => handleSetActivePlan(plan)}
                      data-testid={`plan-card-${plan.id}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isActive 
                              ? 'bg-blue-600' 
                              : 'bg-slate-100 group-hover:bg-blue-100'
                          }`}>
                            <Clipboard className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-600'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className={`font-semibold truncate ${isActive ? 'text-blue-700' : 'text-slate-800'}`}>
                              {plan.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                {plan.total_weeks} {t('dashboard.plans.weeksShort')}
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full truncate max-w-[100px]">
                                {resolveModelName(plan)}
                              </span>
                              {plan.sport && (
                                <span className="text-xs text-slate-500 truncate">{t('catalog.sport_'+plan.sport,{defaultValue:plan.sport})}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isActive && (
                            <Badge className="bg-blue-600 text-white text-xs mr-2">{t('dashboard.plans.active')}</Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('dashboard.plans.duplicate')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicatePlan(plan.id);
                            }}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg h-8 w-8 p-0"
                            data-testid={`plan-duplicate-${plan.id}`}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('dashboard.plans.share')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSharePlan(plan.id);
                            }}
                            className="text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg h-8 w-8 p-0"
                            data-testid={`plan-share-${plan.id}`}
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('dashboard.plans.print')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPDF(plan.id);
                            }}
                            className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg h-8 w-8 p-0"
                            data-testid={`plan-pdf-${plan.id}`}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title={t('dashboard.plans.delete')}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrainingPlan(plan.id);
                            }}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg h-8 w-8 p-0"
                            data-testid={`plan-delete-${plan.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clipboard className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-semibold text-slate-500 mb-2">{t('dashboard.plans.noPlans')}</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">
                  {t('dashboard.plans.noPlansDesc')}
                </p>
                <Button
                  onClick={() => setActiveDataSection('training-system')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('dashboard.plans.createFirst')}
                </Button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // ====== VERIFICAR SI SE NECESITA UN PLAN ACTIVO ======
    // Secciones que NO requieren plan activo (se pueden ver sin tener un plan seleccionado)
    const sectionsWithoutPlan = ['athletes', 'entities', 'training-system', 'exercises-lib', 'calculators', 'periodization-models', 'pdi-sheet', 'tactical-board', 'create-plan', 'period-overview', 'period-structure', 'period-load', 'scouting'];
    
    if (!activePlan && !sectionsWithoutPlan.includes(activeDataSection)) {
      // Mostrar mensaje de que se necesita seleccionar un plan
      return (
        <div className="h-full flex items-center justify-center bg-[#fafaf8] p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{t('data.selecciona_un_plan')}</h2>
            <p className="text-slate-500 text-sm mb-6">
              Para acceder a esta sección necesitas tener un plan de entrenamiento activo. 
              Los datos se guardarán asociados al plan seleccionado.
            </p>
            <Button
              onClick={() => setActiveDataSection(null)}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6"
            >
              <Clipboard className="w-4 h-4 mr-2" />{t('data.seleccionar_plan')}</Button>
          </div>
        </div>
      );
    }

    // ====== HAY PLAN ACTIVO O SECCIÓN SIN PLAN - MOSTRAR CONTENIDO ======
    if (!activeDataSection) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <p className="text-slate-400 text-lg">{t('data.selecciona_una_seccion_del_menu_para_ver_l')}</p>
          
          {/* Card del Plan Activo */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-lg w-full shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <Clipboard className="w-6 h-6 text-[#CCFF00]" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">{t('data.plan_activo')}</p>
                <h3 className="font-bold text-lg text-slate-800">{activePlan.name}</h3>
                <p className="text-sm text-slate-500">
                  {activePlan.total_weeks} {t('periodization.weeksLower')} • {resolveModelName(activePlan)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetActivePlan(null)}
                className="border-slate-300 text-slate-600 hover:bg-slate-100"
              >
                Cambiar
              </Button>
            </div>
          </div>
          
        </div>
      );
    }

    // Render Atletas section inline - SOLO ATLETAS
    if (activeDataSection === 'athletes') {
      // Helper functions for entity display
      const getEntityById = (id) => entities.find(e => e.id === id);
      const getEntitiesByType = (type) => entities.filter(e => e.entity_type === type);
      const federations = getEntitiesByType('federation');
      const clubs = getEntitiesByType('club');
      const schools = getEntitiesByType('school');
      
      // Filter athletes by entity
      const filteredAthletes = athleteFilterEntity === 'all' 
        ? athletes 
        : athletes.filter(a => a.affiliations?.includes(athleteFilterEntity));
      
      // Get affiliation names for display
      const getAffiliationNames = (affiliationIds = []) => {
        return affiliationIds.map(id => {
          const entity = getEntityById(id);
          return entity ? { name: entity.name, type: entity.entity_type } : null;
        }).filter(Boolean);
      };

      // Filter entities by type for affiliation dropdowns (use different name to avoid conflicts)
      const entityFederations = entities.filter(e => e.entity_type === 'federation');
      const entityClubs = entities.filter(e => e.entity_type === 'club');
      const entitySchools = entities.filter(e => e.entity_type === 'school');

      // Get selected athlete for summary
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      
      return (
        <div className="p-4 space-y-4">
          <InfoSectionHeader
            catalogType="athletes"
            title="Atletas"
            subtitle={t('data.plantilla_de_atletas_registrados_perfiles_')}
            icon={User}
            color="#F59E0B"
            onRefresh={async () => { try { await fetchAthletes(); } catch (e) { /* silent */ } }}
          />

          {/* Vista de Deportes por Categorías - EDITABLE */}
          {activeAthleteTab === 'sports' && (
            <div className="space-y-4">
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-white border-b border-slate-200 text-slate-900 py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Trophy className="w-5 h-5" />{t('data.catalogo_de_deportes')}</div>
                    <Button 
                      size="sm"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      onClick={() => setShowAddCategory(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />{t('data.nueva_categoria')}</Button>
                  </div>
                </div>
                <CardContent className="p-5">
                  {/* Add Category Form */}
                  {showAddCategory && (
                    <div className="mb-5 p-4 bg-amber-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-amber-900">{t('data.nueva_categoria')}</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3 items-end">
                        <Input 
                          placeholder={t('data.nombre_de_categoria')} 
                          className="flex-1 min-w-[200px]"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        />
                        <Input 
                          placeholder="Icono (emoji)" 
                          className="w-20"
                          value={newCategory.icon}
                          onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                        />
                        <Input 
                          type="color"
                          className="w-16 h-10 p-1"
                          value={newCategory.color}
                          onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                        />
                        <Button onClick={handleCreateCategory} className="bg-slate-900 hover:bg-slate-800">{t('data.crear')}</Button>
                      </div>
                    </div>
                  )}

                  {/* Categories Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sportsCatalog.map(category => (
                      <div 
                        key={category.id} 
                        className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                        style={{ borderColor: category.color + '40' }}
                      >
                        <div 
                          className="text-white px-4 py-3 flex items-center justify-between"
                          style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{category.icon}</span>
                            <span className="font-semibold">{category.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white/70 hover:text-slate-600 hover:bg-slate-100 h-7 w-7 p-0"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="p-4 space-y-1 max-h-[250px] overflow-y-auto">
                          {category.sports?.map(sport => (
                            <div 
                              key={sport.id} 
                              className="flex items-center justify-between text-sm text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded group"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                ></div>
                                {sport.name}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteSport(sport.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          
                          {/* Add Sport to Category */}
                          {showAddSport === category.id ? (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                              <Input 
                                placeholder={t('data.nuevo_deporte')} 
                                className="h-8 text-sm flex-1"
                                value={newSport.name}
                                onChange={(e) => setNewSport({...newSport, name: e.target.value})}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateSport(category.id)}
                              />
                              <Button 
                                size="sm" 
                                className="h-8"
                                style={{ backgroundColor: category.color }}
                                onClick={() => handleCreateSport(category.id)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8"
                                onClick={() => setShowAddSport(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2 text-slate-500 hover:text-slate-700 border border-dashed border-slate-300"
                              onClick={() => { setShowAddSport(category.id); setNewSport({ name: '', category_id: category.id }); }}
                            >
                              <Plus className="w-4 h-4 mr-1" />{t('data.agregar_deporte')}</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tip */}
                  <div className="mt-5 bg-amber-50 border border-slate-200 rounded-lg p-3 flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Tip:</strong> Personaliza tu catálogo agregando las categorías y deportes que necesites. Los atletas y equipos podrán seleccionar de este catálogo.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Vista de Torneos - Nuevo componente profesional */}
          {activeAthleteTab === 'tournaments' && (
            <Card className="border-0 shadow-lg overflow-hidden">
              <TournamentManager
                tournaments={tournaments}
                sportsCatalog={sportsCatalog}
                onCreateTournament={async (newTournament) => {
                  try {
                    const token = localStorage.getItem('train_token');
                    const res = await fetch(`${(process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL))}/api/tournaments`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify({
                        name: newTournament.name,
                        description: newTournament.description || '',
                        sport: newTournament.sport || 'other',
                        format: newTournament.format || 'single_elimination',
                        start_date: newTournament.start_date || new Date().toISOString().split('T')[0],
                        end_date: newTournament.end_date || '',
                        venue: newTournament.venue || '',
                        city: newTournament.city || '',
                        scoring_system: newTournament.scoring_system || 'standard',
                        points_win: newTournament.points_win || 3,
                        points_draw: newTournament.points_draw || 1,
                        points_loss: newTournament.points_loss || 0,
                        primary_color: newTournament.primary_color || '#3B82F6',
                        secondary_color: newTournament.secondary_color || '#10B981'
                      })
                    });
                    if (res.ok) { fetchTournamentsData(); toast.success('Torneo creado'); }
                    else { const err = await res.json(); toast.error(err.detail || 'Error al crear torneo'); }
                  } catch (e) { toast.error(t('data.error_al_crear_torneo')); }
                }}
                onUpdateTournament={async (id, updatedData) => {
                  try {
                    const token = localStorage.getItem('train_token');
                    const existing = tournaments.find(t => t.id === id);
                    const merged = { ...existing, ...updatedData };
                    await fetch(`${(process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL))}/api/tournaments/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(merged)
                    });
                    fetchTournamentsData();
                  } catch (e) { console.error('Error updating tournament:', e); }
                }}
                onDeleteTournament={async (id) => {
                  try {
                    const token = localStorage.getItem('train_token');
                    const res = await fetch(`${(process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL))}/api/tournaments/${id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) { fetchTournamentsData(); toast.success('Torneo eliminado'); }
                  } catch (e) { toast.error(t('data.error_al_eliminar_torneo')); }
                }}
              />
            </Card>
          )}
          {/* Vista de Equipos */}
          {activeAthleteTab === 'teams' && (
            <div className="p-2">
              <TeamManager />
            </div>
          )}

          {/* Vista de Atletas */}
          {activeAthleteTab === 'athletes' && (
          <div className="space-y-0">
            {/* Athletes FAB Bar + Add Button */}
            <div className="flex items-start gap-4 px-5 py-3 bg-white border-b border-slate-100">
              {/* Athlete round FABs */}
              <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide flex-1 py-2 px-1 min-w-0">
                {filteredAthletes.map(athlete => (
                  <button
                    key={athlete.id}
                    onClick={() => setSelectedAthleteId(selectedAthleteId === athlete.id ? null : athlete.id)}
                    className="flex-shrink-0 flex flex-col items-center gap-1 transition-all duration-200 group"
                    data-testid={`athlete-fab-${athlete.id}`}
                    title={`${athlete.name} · ${athlete.sport}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 ${
                      selectedAthleteId === athlete.id
                        ? 'bg-[#1565C0] text-white shadow-lg shadow-blue-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}>
                      {athlete.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <span className={`text-[8px] max-w-[48px] truncate font-medium transition-colors ${
                      selectedAthleteId === athlete.id ? 'text-[#1565C0]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {athlete.name?.split(' ')[0]}
                    </span>
                  </button>
                ))}
                {filteredAthletes.length === 0 && (
                  <span className="text-sm text-slate-400 italic py-2">{t('data.sin_atletas')}</span>
                )}
              </div>

              {/* Right side: add */}
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                {/* Add athlete button */}
                <button
                  onClick={() => setShowAddAthleteForm(prev => !prev)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
                    showAddAthleteForm
                      ? 'bg-slate-700 text-white rotate-45'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600'
                  }`}
                  data-testid="add-athlete-fab"
                  title={t('data.agregar_nuevo_atleta')}
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-[8px] text-slate-400">{athletes.length}</span>
              </div>
            </div>

            {/* Collapsible New Athlete Form */}
            {showAddAthleteForm && (
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-4">
                <div className="max-w-4xl mx-auto">
                  <h4 className="font-semibold mb-3 text-slate-700 text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />{t('data.registrar_nuevo_atleta')}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input placeholder="Nombre completo" className="h-9 text-sm border-slate-200" value={newAthlete.name} onChange={(e) => setNewAthlete({...newAthlete, name: e.target.value})} data-testid="new-athlete-name" />
                    <Input placeholder="Email" type="email" className="h-9 text-sm border-slate-200" value={newAthlete.email} onChange={(e) => setNewAthlete({...newAthlete, email: e.target.value})} />
                    <Input placeholder={t('data.fecha_nacimiento')} type="date" className="h-9 text-sm border-slate-200" value={newAthlete.birthDate} onChange={(e) => setNewAthlete({...newAthlete, birthDate: e.target.value})} />
                    <Select value={newAthlete.gender} onValueChange={(v) => setNewAthlete({...newAthlete, gender: v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue placeholder={t('data.genero')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.sport} onValueChange={(v) => setNewAthlete({...newAthlete, sport: v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue placeholder={t('data.deporte')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="football">{t('data.futbol')}</SelectItem>
                        <SelectItem value="athletics">Atletismo</SelectItem>
                        <SelectItem value="swimming">{t('data.natacion')}</SelectItem>
                        <SelectItem value="cycling">Ciclismo</SelectItem>
                        <SelectItem value="basketball">Baloncesto</SelectItem>
                        <SelectItem value="tennis">Tenis</SelectItem>
                        <SelectItem value="crossfit">CrossFit</SelectItem>
                        <SelectItem value="weightlifting">Levantamiento</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder={t('data.categoria')} className="h-9 text-sm border-slate-200" value={newAthlete.category} onChange={(e) => setNewAthlete({...newAthlete, category: e.target.value})} />
                    <Select value={newAthlete.level} onValueChange={(v) => setNewAthlete({...newAthlete, level: v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue placeholder={t('data.nivel')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="principiante">Principiante</SelectItem>
                        <SelectItem value="intermedio">Intermedio</SelectItem>
                        <SelectItem value="avanzado">Avanzado</SelectItem>
                        <SelectItem value="elite">Elite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Afiliaciones */}
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    <Select value={newAthlete.federation || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, federation: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white"><SelectValue placeholder={t('data.federacion')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('data.sin_federacion')}</SelectItem>
                        {entityFederations.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.club || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, club: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white"><SelectValue placeholder={t('data.club')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('data.sin_club')}</SelectItem>
                        {entityClubs.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.school || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, school: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white"><SelectValue placeholder={t('data.escuela')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('data.sin_escuela')}</SelectItem>
                        {entitySchools.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.team_id || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, team_id: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white" data-testid="athlete-team-select"><SelectValue placeholder={t('data.equipo')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('data.sin_equipo')}</SelectItem>
                        {teams.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {entities.length === 0 && (
                      <p className="text-xs text-slate-500">Crea entidades en <strong>{t('data.organizacion')}</strong>{t('data.para_afiliar_atletas')}</p>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowAddAthleteForm(false)}>
                        Cancelar
                      </Button>
                      <Button size="sm" className="h-8 text-xs bg-slate-900 hover:bg-slate-800" onClick={handleCreateAthlete} disabled={savingAthlete} data-testid="submit-add-athlete">
                        {savingAthlete ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content: Athlete Detail (full width) */}
            <div className="p-4">
              {selectedAthlete ? (
                <div>
                  <div className="flex justify-end mb-1">
                    <Button variant="ghost" size="sm" className="text-xs text-rose-400 hover:text-rose-600 hover:bg-rose-50 h-6" onClick={() => handleDeleteAthlete(selectedAthlete.id)} data-testid="delete-athlete-btn">
                      <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                    </Button>
                  </div>
                  <AthleteSummary 
                    athlete={selectedAthlete} 
                    onNavigate={(section) => setActiveDataSection(section)}
                  />
                  <AthleteProgress athleteId={selectedAthlete.id} />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-lg">{t('data.selecciona_un_atleta')}</p>
                  <p className="text-sm text-slate-400 mt-1">{t('data.haz_clic_en_uno_de_los_circulos_de_arriba_')}</p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      );
    }

    // ===== SECCIÓN: EQUIPOS =====
    if (activeDataSection === 'teams') {
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          <InfoSectionHeader
            catalogType="teams"
            title="Equipos"
            subtitle={t('data.equipos_deportivos_plantillas_staff_tecnic')}
            icon={UsersRound}
            color="#10B981"
          />
          <TeamManager />
        </div>
      );
    }

    // ===== SECCIÓN: DEPORTES CON CARACTERIZACIÓN TÉCNICA =====
    if (activeDataSection === 'sports') {
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          <InfoSectionHeader
            catalogType="sports"
            title={t('data.deportes')}
            subtitle={t('data.catalogo_de_deportes_con_caracterizacion_t')}
            icon={Medal}
            color="#EF4444"
            onRefresh={fetchSportsCatalog}
          />
          <div className="space-y-4">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-white border-b border-slate-200 text-slate-900 py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Trophy className="w-5 h-5" />{t('data.catalogo_de_deportes')}</div>
                  <Button 
                    size="sm"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    onClick={() => setShowAddCategory(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />{t('data.nueva_categoria')}</Button>
                </div>
              </div>
              <CardContent className="p-5">
                {/* Add Category Form */}
                {showAddCategory && (
                  <div className="mb-5 p-4 bg-amber-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-amber-900">{t('data.nueva_categoria')}</h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                      <Input 
                        placeholder={t('data.nombre_de_categoria')} 
                        className="flex-1 min-w-[200px]"
                        value={newCategory.name}
                        onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                      />
                      <Input 
                        placeholder="Icono (emoji)" 
                        className="w-20"
                        value={newCategory.icon}
                        onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                      />
                      <Input 
                        type="color"
                        className="w-16 h-10 p-1"
                        value={newCategory.color}
                        onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                      />
                      <Button onClick={handleCreateCategory} className="bg-slate-900 hover:bg-slate-800">{t('data.crear')}</Button>
                    </div>
                  </div>
                )}

                {/* Deportes por categoría */}
                <div className="space-y-6">
                  {sportsCatalog.map(category => (
                    <div key={category.id} className="border border-slate-200 rounded-xl overflow-hidden">
                      <div 
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ background: `linear-gradient(135deg, ${category.color || '#3B82F6'}, ${category.color || '#3B82F6'}dd)` }}
                      >
                        <div className="flex items-center gap-2 text-white">
                          <span className="text-xl">{category.icon || '🏆'}</span>
                          <h4 className="font-semibold">{category.name}</h4>
                          <span className="text-sm bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-2">{category.sports?.length || 0} deportes</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-slate-600 hover:bg-slate-100"
                            onClick={() => {
                              setNewSport({...newSport, category: category.id});
                              setShowAddSport(category.id);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-1" />{t('data.agregar_deporte_2')}</Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white/70 hover:text-slate-600 hover:bg-slate-100 h-7 w-7 p-0"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Add Sport Form */}
                      {showAddSport === category.id && (
                        <div className="p-4 bg-slate-50 border-b">
                          <div className="flex flex-wrap gap-3 items-end">
                            <Input 
                              placeholder={t('data.nombre_del_deporte')} 
                              className="flex-1 min-w-[200px]"
                              value={newSport.name}
                              onChange={(e) => setNewSport({...newSport, name: e.target.value})}
                            />
                            <Input 
                              placeholder="Icono (emoji)" 
                              className="w-20"
                              value={newSport.icon}
                              onChange={(e) => setNewSport({...newSport, icon: e.target.value})}
                            />
                            <Button 
                              onClick={() => handleCreateSport(category.id)} 
                              className="bg-slate-900 hover:bg-slate-800"
                            >{t('data.crear')}</Button>
                            <Button variant="ghost" onClick={() => setShowAddSport(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="p-4">
                        {category.sports?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {category.sports.map(sport => {
                              const char = sport.characterization || {};
                              const filled = ['type', 'energySystem', 'physicalCapabilities', 'technicalSkills', 'tacticalFactors']
                                .filter(k => char[k]).length;
                              const pct = Math.round((filled / 5) * 100);
                              const ringColor = pct >= 80 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#cbd5e1';
                              const typeLabels = { individual: 'Individual', colectivo: 'Colectivo', combate: 'Combate', precision: 'Precisión', raquetas: 'Raquetas', agua: 'Acuático' };
                              const energyLabels = { aerobico: 'Aeróbico', 'anaerobico-lactico': 'Anaer. Láctico', 'anaerobico-alactico': 'Anaer. Aláctico', mixto: 'Mixto' };
                              const typeColors = { individual: 'bg-sky-50 text-sky-700 border-sky-200', colectivo: 'bg-emerald-50 text-emerald-700 border-emerald-200', combate: 'bg-red-50 text-red-700 border-red-200', precision: 'bg-violet-50 text-violet-700 border-violet-200', raquetas: 'bg-amber-50 text-amber-700 border-amber-200', agua: 'bg-cyan-50 text-cyan-700 border-cyan-200' };
                              const energyColors = { aerobico: 'bg-emerald-50 text-emerald-700 border-emerald-200', 'anaerobico-lactico': 'bg-amber-50 text-amber-700 border-amber-200', 'anaerobico-alactico': 'bg-red-50 text-red-700 border-red-200', mixto: 'bg-violet-50 text-violet-700 border-violet-200' };
                              return (
                                <div
                                  key={sport.id}
                                  data-testid={`sport-card-${sport.id}`}
                                  className="group relative bg-gradient-to-br from-white to-slate-50/40 border border-slate-200 rounded-xl p-3.5 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200"
                                >
                                  {/* Header: icon + name + completeness ring */}
                                  <div className="flex items-start justify-between gap-2 mb-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                      <div className="w-11 h-11 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center flex-shrink-0 text-2xl group-hover:scale-105 transition-transform">
                                        {getSportIcon(sport)}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="font-bold text-[13px] text-slate-900 leading-tight truncate">{sport.name}</div>
                                        <div className="text-[8px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: ringColor }}>
                                          {pct === 100 ? 'Completo' : pct >= 40 ? 'Parcial' : 'Sin caracterizar'}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Conic-gradient completeness circle */}
                                    <div
                                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                                      style={{ background: `conic-gradient(${ringColor} ${pct}%, #e2e8f0 ${pct}% 100%)` }}
                                      title={`Caracterización: ${pct}%`}
                                    >
                                      <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center text-[9px] font-black tabular-nums" style={{ color: ringColor }}>
                                        {pct}%
                                      </div>
                                    </div>
                                  </div>

                                  {/* Pills tipo + sistema energético */}
                                  {(char.type || char.energySystem) && (
                                    <div className="flex flex-wrap gap-1 mb-2">
                                      {char.type && (
                                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${typeColors[char.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                          {typeLabels[char.type] || char.type}
                                        </span>
                                      )}
                                      {char.energySystem && (
                                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${energyColors[char.energySystem] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                          {energyLabels[char.energySystem] || char.energySystem}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {/* Footer: caracterización badge + actions */}
                                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    {sport.characterization && Object.keys(sport.characterization).length > 0 ? (
                                      <div className="flex items-center gap-1 text-[8px] font-semibold text-emerald-700">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>{t('data.caracterizacion_guardada')}</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[8px] font-medium text-slate-400 italic">
                                        <FileText className="w-3 h-3" />
                                        <span>{t('data.sin_caracterizar')}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                                        onClick={() => {
                                          setEditingSportId(sport.id);
                                          setEditingSportCharacterization(sport.characterization || {});
                                        }}
                                        title={t('data.editar_caracterizacion_tecnica')}
                                        data-testid={`sport-edit-${sport.id}`}
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                        onClick={() => handleDeleteSport(sport.id)}
                                        title={t('data.eliminar_deporte')}
                                        data-testid={`sport-delete-${sport.id}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-center text-slate-400 py-4">{t('data.sin_deportes_en_esta_categoria')}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Modal/Panel de Caracterización Técnica del Deporte */}
                {editingSportId && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                      <div className="bg-white border-b border-slate-200 text-slate-900 p-5 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6" />
                            <div>
                              <h3 className="font-bold text-lg">{t('data.caracterizacion_tecnica')}</h3>
                              <p className="text-sm text-blue-100">{t('data.define_los_parametros_tecnicos_del_deporte')}</p>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-slate-600 hover:bg-slate-100"
                            onClick={() => {
                              setEditingSportId(null);
                              setEditingSportCharacterization({});
                            }}
                          >
                            <X className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-slate-700">{t('data.tipo_de_deporte')}</Label>
                            <Select 
                              value={editingSportCharacterization.type || ''} 
                              onValueChange={(v) => setEditingSportCharacterization({...editingSportCharacterization, type: v})}
                            >
                              <SelectTrigger><SelectValue placeholder={t('data.seleccionar_tipo')} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="colectivo">Colectivo</SelectItem>
                                <SelectItem value="combate">Combate</SelectItem>
                                <SelectItem value="precision">{t('data.precision')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-700">{t('data.sistema_energetico_predominante')}</Label>
                            <Select 
                              value={editingSportCharacterization.energySystem || ''} 
                              onValueChange={(v) => setEditingSportCharacterization({...editingSportCharacterization, energySystem: v})}
                            >
                              <SelectTrigger><SelectValue placeholder={t('data.seleccionar_sistema')} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aerobico">{t('data.aerobico')}</SelectItem>
                                <SelectItem value="anaerobico-lactico">{t('data.anaerobico_lactico')}</SelectItem>
                                <SelectItem value="anaerobico-alactico">{t('data.anaerobico_alactico')}</SelectItem>
                                <SelectItem value="mixto">Mixto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">{t('data.capacidades_fisicas_principales')}</Label>
                          <Textarea 
                            placeholder="Ej: Fuerza explosiva, Resistencia, Velocidad, Flexibilidad..."
                            value={editingSportCharacterization.physicalCapabilities || ''}
                            onChange={(e) => setEditingSportCharacterization({...editingSportCharacterization, physicalCapabilities: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">{t('data.habilidades_tecnicas')}</Label>
                          <Textarea 
                            placeholder={t('data.ej_pase_recepcion_tiro_conduccion')}
                            value={editingSportCharacterization.technicalSkills || ''}
                            onChange={(e) => setEditingSportCharacterization({...editingSportCharacterization, technicalSkills: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">{t('data.factores_tacticos')}</Label>
                          <Textarea 
                            placeholder={t('data.ej_sistemas_de_juego_estrategias_roles')}
                            value={editingSportCharacterization.tacticalFactors || ''}
                            onChange={(e) => setEditingSportCharacterization({...editingSportCharacterization, tacticalFactors: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setEditingSportId(null);
                              setEditingSportCharacterization({});
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                              handleSaveSportCharacterization(editingSportId, editingSportCharacterization);
                              setEditingSportId(null);
                              setEditingSportCharacterization({});
                            }}
                          >
                            <Save className="w-4 h-4 mr-2" />{t('data.guardar_caracterizacion')}</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // ===== SECCIÓN: TORNEOS =====
    if (activeDataSection === 'tournaments') {
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          <InfoSectionHeader
            catalogType="tournaments"
            title="Torneos"
            subtitle={t('data.calendario_de_competencias_brackets_partic')}
            icon={Shield}
            color="#8B5CF6"
            onRefresh={fetchTournamentsData}
          />
          <Card className="border-0 shadow-lg overflow-hidden">
            <TournamentManager
              tournaments={tournaments}
              sportsCatalog={sportsCatalog}
              onCreateTournament={(newTournament) => {
                const tournamentWithId = {
                  ...newTournament,
                  id: newTournament.id || `tournament-${Date.now()}`,
                  participants: newTournament.participants || [],
                  matches: newTournament.matches || [],
                  participants_count: 0,
                  status: 'draft'
                };
                setTournaments(prev => [...prev, tournamentWithId]);
              }}
              onUpdateTournament={(id, updatedData) => {
                setTournaments(prev => prev.map(t => 
                  t.id === id ? { ...t, ...updatedData } : t
                ));
              }}
              onDeleteTournament={(id) => {
                setTournaments(prev => prev.filter(t => t.id !== id));
                toast.success('Torneo eliminado');
              }}
            />
          </Card>
        </div>
      );
    }

    // Render Ejercicios section - Usando componente completo
    if (activeDataSection === 'exercises-lib') {
      return <ExerciseLibrary athleteId={selectedAthleteId} />;
    }

    // Render Modelos de Periodización
    if (activeDataSection === 'periodization-models') {
      return (
        <div className="max-w-7xl mx-auto px-2 md:px-6 py-4">
          <PeriodizationModelsManager />
        </div>
      );
    }

    // Render LordTraining PDI Technical Sheet
    if (activeDataSection === 'pdi-sheet') {
      return <PDITechnicalSheet />;
    }

    // Render Calendario section inline - COMPLETE
    if (activeDataSection === 'calendar-view') {
      return <SessionCalendar activePlan={activePlan} events={selectedTeamId ? teamEvents : events} selectedAthleteId={selectedAthleteId} onEventReschedule={handleEventReschedule} teamMode={!!selectedTeamId} teamName={selectedTeam?.name || null} />;
    }

    // Render Generar con IA section inline - COMPLETE

    // Render Pizarra Tactica section
    if (activeDataSection === 'tactical-board') {
      return <TacticalBoardSection token={localStorage.getItem('train_token')} />;
    }


    // Render Calendario de Eventos - COMPLETE
    if (activeDataSection === 'events') {
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-white border-b border-slate-200 text-slate-900 py-4 px-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="w-5 h-5" />{t('data.calendario_de_eventos_y_competencias')}</div>
                {selectedAthleteId && (
                  <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{events.length} eventos</span>
                )}
              </div>
            </div>
            <CardContent className="p-5">
              {!selectedAthleteId ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{t('data.selecciona_un_atleta_primero')}</p>
                  <p className="text-sm mt-1">{t('data.ve_a_la_seccion_atletas_y_selecciona_uno_p')}</p>
                </div>
              ) : (
                <>
                  {/* Formulario nuevo evento */}
                  <div className="bg-violet-50/50 p-4 rounded-xl mb-5 border border-violet-100">
                    <h4 className="font-semibold mb-3 text-violet-900 flex items-center gap-2">
                      <Plus className="w-4 h-4" />{t('data.agregar_evento_competencia')}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input 
                        placeholder={t('data.nombre_del_evento')} 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                      />
                      <Select value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                        <SelectTrigger className="h-10 border-violet-200"><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="competencia_principal">{t('data.competencia_principal')}</SelectItem>
                          <SelectItem value="competencia_secundaria">{t('data.competencia_secundaria')}</SelectItem>
                          <SelectItem value="test">{t('data.test_evaluacion')}</SelectItem>
                          <SelectItem value="concentracion">{t('data.concentracion')}</SelectItem>
                          <SelectItem value="viaje">Viaje</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        type="date" 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      />
                      <Input 
                        placeholder="Lugar" 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <Input 
                        placeholder={t('data.objetivo')} 
                        className="h-10 col-span-2 border-violet-200 focus:border-violet-400" 
                        value={newEvent.objective}
                        onChange={(e) => setNewEvent({...newEvent, objective: e.target.value})}
                      />
                      <Select value={newEvent.priority} onValueChange={(v) => setNewEvent({...newEvent, priority: v})}>
                        <SelectTrigger className="h-10 border-violet-200"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta (A)</SelectItem>
                          <SelectItem value="media">Media (B)</SelectItem>
                          <SelectItem value="baja">Baja (C)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        className="bg-violet-500 hover:bg-violet-600 h-10 font-medium"
                        onClick={handleSaveEvent}
                        disabled={savingEvent}
                      >
                        {savingEvent ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Lista de eventos */}
                  <div className="space-y-3">
                    {events.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>{t('data.no_hay_eventos_registrados_para_este_atlet')}</p>
                      </div>
                    ) : (
                      events.map(event => {
                        const priorityColors = {
                          alta: { bg: 'bg-emerald-50', border: 'border-slate-200', bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
                          media: { bg: 'bg-amber-50', border: 'border-slate-200', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
                          baja: { bg: 'bg-indigo-50', border: 'border-slate-200', bar: 'bg-[#007AFF]', badge: 'bg-blue-50 text-blue-700' }
                        };
                        const colors = priorityColors[event.priority] || priorityColors.media;
                        const typeLabels = {
                          competencia_principal: 'Competencia Principal',
                          competencia_secundaria: 'Competencia Secundaria',
                          test: 'Test/Evaluación',
                          concentracion: 'Concentración',
                          viaje: 'Viaje'
                        };
                        return (
                          <div key={event.id} className={`flex items-center justify-between p-4 ${colors.bg} border ${colors.border} rounded-xl hover:shadow-sm transition-all`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-14 ${colors.bar} rounded-full`}></div>
                              <div>
                                <p className="font-semibold text-slate-800">{event.name}</p>
                                <p className="text-sm text-slate-500">
                                  {typeLabels[event.type] || event.type} • {event.date} {event.location && `• ${event.location}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1.5 ${colors.badge} rounded-full text-xs font-semibold`}>
                                Prioridad {event.priority?.charAt(0).toUpperCase()}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Objetivos e Indicadores - Using ObjectivesIndicators Component
    if (activeDataSection === 'objectives') {
      const aspectRows = [
        { key: 'general', label: 'General', color: '#94a3b8', hover: '#f8fafc' },
        { key: 'fisicaGeneral', label: t('data.x_prep_fisica_general'), color: '#3b82f6', hover: '#eff6ff' },
        { key: 'fisicaEspecial', label: t('data.x_prep_fisica_especial'), color: '#007AFF', hover: '#eff6ff' },
        { key: 'tecnica', label: t('data.x_prep_tecnica'), color: '#10b981', hover: '#ecfdf5' },
        { key: 'tactica', label: t('data.x_prep_tactica'), color: '#f59e0b', hover: '#fffbeb' },
        { key: 'teorica', label: t('data.x_prep_teorica'), color: '#06b6d4', hover: '#ecfeff' },
        { key: 'psicologica', label: t('data.x_prep_psicologica'), color: '#ec4899', hover: '#fdf2f8' }
      ];
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          {/* Compact Material Design header — matching Plan Anterior style */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Target className="w-5 h-5 text-[#CCFF00]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 truncate">{t('data.plan_activo')}</h1>
                <p className="text-[11px] text-slate-500 truncate">{t('data.x_informacion_general_objetivos_por_horizonte_')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleDownloadObjectivesPDF} disabled={savingEvaluation || !activePlan} data-testid="active-plan-pdf-btn" title="Descargar PDF estilo Whitepaper">
                <Download className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleShareObjectivesLink} disabled={savingEvaluation || !activePlan} data-testid="active-plan-link-btn" title={t('data.copiar_enlace_publico_al_portapapeles')}>
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />{t('sessions.link')}
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40" onClick={handleShareObjectivesWhatsApp} disabled={savingEvaluation || !activePlan} data-testid="active-plan-whatsapp-btn" title={t('data.compartir_por_whatsapp')}>
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />WhatsApp
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-[#007AFF]/40 text-[#007AFF] hover:bg-blue-50 bg-blue-50/40" onClick={() => activePlan ? setIsAthletePortalOpen(true) : toast.error(t('data.selecciona_un_plan_activo_primero'))} disabled={!activePlan} data-testid="active-plan-athlete-btn" title={t('data.enviar_al_atleta_enlace_cuenta')}>
                <Send className="w-3.5 h-3.5 mr-1.5" />{t('data.atleta_2')}</Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs px-4" onClick={handleSaveObjectives} disabled={savingEvaluation || !activePlan} data-testid="active-plan-save-btn">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingEvaluation ? t('data.btnSaving') : t('data.btnSave')}
              </Button>
            </div>
          </div>

          {!activePlan && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {t('data.selecciona_plan_guardar',{defaultValue:'Selecciona un plan activo para guardar y compartir.'})}
            </div>
          )}

          {/* Información General — full-width compact */}
          <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#007AFF]">
            <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <FileText className="w-4 h-4 text-[#007AFF]" />{t('data.informacion_general_del_plan')}</CardTitle>
            </CardHeader>
            <CardContent className="p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.deporte_objetivo')}</label>
                  <Input data-testid="obj-deporte" placeholder={t('data.ej_futbol_pretemporada')} className="border-slate-200 h-9 text-sm" value={objectivesData.deporteObjetivo} onChange={(e) => setObjectivesData({...objectivesData, deporteObjetivo: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.categoria')}</label>
                  <Select value={objectivesData.categoria} onValueChange={(val) => setObjectivesData({...objectivesData, categoria: val})}>
                    <SelectTrigger data-testid="obj-categoria" className="h-9 text-sm border-slate-200"><SelectValue placeholder={t('data.seleccionar')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="infantil">Infantil</SelectItem>
                      <SelectItem value="cadete">Cadete</SelectItem>
                      <SelectItem value="juvenil">Juvenil</SelectItem>
                      <SelectItem value="sub23">Sub-23</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Edad / Rango</label>
                  <Input data-testid="obj-edad" placeholder={t('data.ej_18_22_anos')} className="border-slate-200 h-9 text-sm" value={objectivesData.edad} onChange={(e) => setObjectivesData({...objectivesData, edad: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.clasificacion_nivel')}</label>
                  <Select value={objectivesData.clasificacion} onValueChange={(val) => setObjectivesData({...objectivesData, clasificacion: val})}>
                    <SelectTrigger data-testid="obj-clasificacion" className="h-9 text-sm border-slate-200"><SelectValue placeholder={t('data.seleccionar')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciacion">{t('data.iniciacion')}</SelectItem>
                      <SelectItem value="formacion">{t('data.formacion')}</SelectItem>
                      <SelectItem value="perfeccionamiento">Perfeccionamiento</SelectItem>
                      <SelectItem value="alto-rendimiento">Alto Rendimiento</SelectItem>
                      <SelectItem value="elite">{t('data.elite')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.fecha_de_inicio')}</label>
                  <Input data-testid="obj-fecha-inicio" type="date" className="border-slate-200 h-9 text-sm" value={objectivesData.fechaInicio} onChange={(e) => setObjectivesData({...objectivesData, fechaInicio: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.fecha_de_finalizacion')}</label>
                  <Input data-testid="obj-fecha-fin" type="date" className="border-slate-200 h-9 text-sm" value={objectivesData.fechaFin} onChange={(e) => setObjectivesData({...objectivesData, fechaFin: e.target.value})} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Entrenador Responsable</label>
                  <Input data-testid="obj-entrenador" placeholder={t('data.nombre_del_entrenador')} className="border-slate-200 h-9 text-sm" value={objectivesData.entrenador} onChange={(e) => setObjectivesData({...objectivesData, entrenador: e.target.value})} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Objetivos por Horizonte Temporal — 3 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* LARGO PLAZO */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-emerald-500">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-emerald-500" />
                    Largo Plazo
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] uppercase tracking-wider font-bold">Macrociclo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500 italic">{t('data.pico_anual_objetivo_principal_del_macrocic')}</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`obj-largo-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500" rows={2} placeholder={`Objetivo ${idx + 1}...`} value={objectivesData.largoPlazo[idx]} onChange={(e) => { const arr = [...objectivesData.largoPlazo]; arr[idx] = e.target.value; setObjectivesData({...objectivesData, largoPlazo: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* MEDIO PLAZO */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-amber-500">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-500" />
                    Medio Plazo
                  </div>
                  <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[9px] uppercase tracking-wider font-bold">Mesociclo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500 italic">{t('data.bloques_4_6_semanas_capacidades_especifica')}</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`obj-medio-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500" rows={2} placeholder={`Objetivo ${idx + 1}...`} value={objectivesData.medianoPlazo[idx]} onChange={(e) => { const arr = [...objectivesData.medianoPlazo]; arr[idx] = e.target.value; setObjectivesData({...objectivesData, medianoPlazo: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CORTO PLAZO */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#007AFF]">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-slate-800">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#007AFF]" />
                    Corto Plazo
                  </div>
                  <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] uppercase tracking-wider font-bold">Microciclo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500 italic">{t('data.semana_actual_sesiones_inmediatas')}</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`obj-corto-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" rows={2} placeholder={`Objetivo ${idx + 1}...`} value={objectivesData.cortoPlazo[idx]} onChange={(e) => { const arr = [...objectivesData.cortoPlazo]; arr[idx] = e.target.value; setObjectivesData({...objectivesData, cortoPlazo: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* TABLA DE OBJETIVOS POR ASPECTO DE PREPARACIÓN — compactada */}
          <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-violet-500">
            <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <Layers className="w-4 h-4 text-violet-500" />{t('data.objetivos_por_aspecto_de_preparacion')}<span className="ml-auto text-[8px] font-medium text-slate-500 italic">7 aspectos deportivos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-wider w-44" style={{ color: '#CCFF00' }}>Aspecto</th>
                      <th className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-wider" style={{ color: '#CCFF00' }}>{t('data.objetivo')}</th>
                      <th className="px-3 py-2 text-left text-[8px] font-black uppercase tracking-wider w-72" style={{ color: '#CCFF00' }}>Indicador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {aspectRows.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: row.color }}></span>
                            <span className="font-semibold text-slate-700 text-[12px]">{row.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-1.5">
                          <textarea data-testid={`obj-aspecto-${row.key}-obj`} className="w-full p-1.5 border border-slate-200 rounded-md text-[12px] resize-none" rows={1} placeholder={`Objetivo de ${row.label.toLowerCase()}...`} value={objectivesData.porAspecto[row.key]?.objetivo || ''} onChange={(e) => setObjectivesData({...objectivesData, porAspecto: {...objectivesData.porAspecto, [row.key]: {...objectivesData.porAspecto[row.key], objetivo: e.target.value}}})} />
                        </td>
                        <td className="px-3 py-1.5">
                          <textarea data-testid={`obj-aspecto-${row.key}-ind`} className="w-full p-1.5 border border-slate-200 rounded-md text-[12px] resize-none" rows={1} placeholder={t('data.como_se_medira')} value={objectivesData.porAspecto[row.key]?.indicador || ''} onChange={(e) => setObjectivesData({...objectivesData, porAspecto: {...objectivesData.porAspecto, [row.key]: {...objectivesData.porAspecto[row.key], indicador: e.target.value}}})} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cuerpo Técnico Asignado al Plan */}
          {activePlan?.id && <PlanStaffPanel planId={activePlan.id} />}

          {/* SMART Callout */}
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)', borderLeft: '4px solid #CCFF00' }}>
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[12px] font-bold text-slate-800 mb-1">{t('data.objetivos_smart')}</p>
              <p className="text-[11.5px] text-slate-700 leading-relaxed">
                La claridad de estos objetivos es crítica para guiar el desarrollo del programa. Cada objetivo debe ser
                <strong>{t('data.especifico_medible_alcanzable_relevante_y_')}</strong>. Validar periódicamente con el cuerpo técnico.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Render Analysis component for prev-plan section
    if (activeDataSection === 'prev-plan') {
      const indicadorKeys = ['vo2max', 'sentadilla', 'sprint', 'cmj', 'flexibilidad'];
      const indicadorLabels = ['VO2 Máx', '1RM Sentadilla', 'Sprint 30m', 'CMJ (salto)', 'Flexibilidad'];
      const cumplKeys = ['general', 'fisica', 'tecnica', 'tactica', 'psicologica', 'teorica', 'reglamento'];
      const cumplLabels = [t('data.cumpl_general'), t('data.cumpl_fisica'), t('data.cumpl_tecnica'), t('data.cumpl_tactica'), t('data.cumpl_psicologica'), t('data.cumpl_teorica'), t('data.cumpl_reglamento')];

      // Perfiles ideales esperados por modelo de periodización (benchmark) — 7 áreas
      const MODEL_PROFILES = {
        atr: { general: 85, fisica: 92, tecnica: 78, tactica: 75, psicologica: 65, teorica: 55, reglamento: 60 },
        issurin: { general: 85, fisica: 92, tecnica: 80, tactica: 82, psicologica: 68, teorica: 60, reglamento: 65 },
        pdi: { general: 88, fisica: 82, tecnica: 85, tactica: 85, psicologica: 88, teorica: 85, reglamento: 80 },
        lordtraining_pdi: { general: 88, fisica: 82, tecnica: 85, tactica: 85, psicologica: 88, teorica: 85, reglamento: 80 },
        lineal: { general: 80, fisica: 88, tecnica: 72, tactica: 65, psicologica: 55, teorica: 50, reglamento: 55 },
        tradicional: { general: 80, fisica: 88, tecnica: 72, tactica: 65, psicologica: 55, teorica: 50, reglamento: 55 },
        ondulante: { general: 82, fisica: 85, tecnica: 78, tactica: 72, psicologica: 65, teorica: 58, reglamento: 60 },
        bloques: { general: 85, fisica: 88, tecnica: 80, tactica: 75, psicologica: 65, teorica: 60, reglamento: 60 },
        polarizado: { general: 82, fisica: 90, tecnica: 72, tactica: 70, psicologica: 65, teorica: 55, reglamento: 60 },
      };
      const modelKey = (activePlan?.model || 'default').toLowerCase().replace(/[^a-z_]/g, '_');
      const benchmarkProfile = MODEL_PROFILES[modelKey] || MODEL_PROFILES.atr;
      const modelNameLabel = activePlan?.model_name || activePlan?.model || 'Modelo';
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          {/* Compact Material Design header — ultra compact with action toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <History className="w-5 h-5 text-[#CCFF00]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900 truncate">{t('data.analisis_del_plan_anterior')}</h1>
                <p className="text-[11px] text-slate-500 truncate">{t('data.x_evaluacion_retrospectiva_identifica_fortalez')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleDownloadPreviousAnalysisPDF} disabled={savingEvaluation || !activePlan} data-testid="prev-download-pdf-btn" title="Descargar PDF estilo Whitepaper">
                <Download className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleSharePreviousAnalysisLink} disabled={savingEvaluation || !activePlan} data-testid="prev-share-link-btn" title={t('data.copiar_enlace_publico_al_portapapeles')}>
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />{t('sessions.link')}
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40" onClick={handleShareWhatsApp} disabled={savingEvaluation || !activePlan} data-testid="prev-share-whatsapp-btn" title={t('data.compartir_por_whatsapp')}>
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />WhatsApp
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs px-4" onClick={handleSavePreviousAnalysis} disabled={savingEvaluation || !activePlan} data-testid="prev-save-btn">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingEvaluation ? t('data.btnSaving') : t('data.btnSave')}
              </Button>
            </div>
          </div>

          {!activePlan && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {t('data.selecciona_plan_guardar_analisis',{defaultValue:'Selecciona un plan activo para guardar y compartir el análisis.'})}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start grid-flow-row-dense lg:auto-rows-min">
            {/* Información del Plan Anterior — col 1 */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#007AFF] lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-[#007AFF]" />{t('data.informacion_del_plan_anterior')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.fecha_de_inicio')}</label>
                    <Input data-testid="prev-fecha-inicio" type="date" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.fechaInicio} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, fechaInicio: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.fecha_de_finalizacion')}</label>
                    <Input data-testid="prev-fecha-fin" type="date" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.fechaFinalizacion} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, fechaFinalizacion: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.duracion_total_semanas')}</label>
                  <Input data-testid="prev-duracion" type="number" placeholder="Ej: 12" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.duracionSemanas} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, duracionSemanas: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.objetivo_principal_del_plan')}</label>
                  <textarea data-testid="prev-objetivo" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={t('data.cual_era_el_objetivo_principal')} value={previousAnalysisData.objetivoPrincipal} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, objetivoPrincipal: e.target.value})} />
                </div>
              </CardContent>
            </Card>

            {/* Cumplimiento de Objetivos — col 2, ocupa 5 rows (toda la altura de col 1) */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-emerald-500 lg:col-start-2 lg:row-start-1 lg:row-end-6 lg:h-full flex flex-col">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />{t('data.cumplimiento_de_objetivos')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5 flex flex-col flex-1 min-h-0">
                {/* Radar interactivo — feedback visual en tiempo real */}
                <div className="rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                  <div className="flex items-center justify-center gap-3 mb-1 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase" style={{ background: '#CCFF00', color: '#0f172a' }}>{t('data.perfil_de_cumplimiento')}</span>
                    <div className="flex items-center gap-3 text-[9px]">
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#CCFF00' }}></span><span className="text-white/90 font-semibold uppercase tracking-wider">Real</span></div>
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border border-dashed" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.6)' }}></span><span className="text-white/80 font-semibold uppercase tracking-wider">Ideal · {modelNameLabel}</span></div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={cumplKeys.map((k, i) => {
                      const raw = previousAnalysisData.cumplimiento?.[k];
                      const item = (typeof raw === 'object' && raw !== null) ? raw : { porcentaje: 50 };
                      const shortLabels = [t('data.short_general'), t('data.short_fisica'), t('data.short_tecnica'), t('data.short_tactica'), t('data.short_psicol'), t('data.short_teorica'), t('data.short_reglamento')];
                      return {
                        area: shortLabels[i] || cumplLabels[i],
                        pct: Number(item.porcentaje ?? 0),
                        ideal: Number(benchmarkProfile[k] ?? 0),
                      };
                    })}>
                      <PolarGrid stroke="rgba(255,255,255,0.15)" />
                      <PolarAngleAxis dataKey="area" tick={{ fill: '#fff', fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} />
                      {/* Ideal/benchmark del modelo (detrás) */}
                      <Radar name={t('data.radar_ideal')} dataKey="ideal" stroke="rgba(255,255,255,0.65)" strokeDasharray="4 4" fill="rgba(255,255,255,0.08)" fillOpacity={1} strokeWidth={1.5} dot={false} />
                      {/* Real (encima) */}
                      <Radar name={t('data.radar_real')} dataKey="pct" stroke="#CCFF00" fill="#CCFF00" fillOpacity={0.4} strokeWidth={2} dot={{ fill: '#CCFF00', r: 3, strokeWidth: 1, stroke: '#fff' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #CCFF00', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#CCFF00', fontWeight: 700 }} formatter={(v, n) => [`${v}%`, n === t('data.radar_real') ? t('data.radar_your') : `${t('data.radar_ideal')} (${modelNameLabel})`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {cumplLabels.map((obj, idx) => {
                    const k = cumplKeys[idx];
                    const raw = previousAnalysisData.cumplimiento?.[k];
                    const item = (typeof raw === 'object' && raw !== null) ? raw : { descripcion: '', porcentaje: 50 };
                    const pct = Number(item.porcentaje ?? 50);
                    const estado = pct >= 85 ? { lbl: t('data.status_total'), color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
                                 : pct >= 40 ? { lbl: t('data.status_partial'), color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
                                              : { lbl: t('data.status_no'), color: '#EF4444', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' };
                    const updateItem = (field, value) => {
                      setPreviousAnalysisData({
                        ...previousAnalysisData,
                        cumplimiento: {
                          ...previousAnalysisData.cumplimiento,
                          [k]: { ...item, [field]: value }
                        }
                      });
                    };
                    return (
                      <div key={k} className={`p-2.5 rounded-lg border ${estado.bg} ${estado.border} space-y-1.5`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">{obj}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold ${estado.text}`} style={{ background: estado.color + '22', border: `1px solid ${estado.color}50` }}>
                              {estado.lbl}
                            </span>
                            <span className="text-sm font-black tabular-nums" style={{ color: estado.color, minWidth: '42px', textAlign: 'right' }}>{pct}%</span>
                          </div>
                        </div>
                        {/* Slider + progress bar */}
                        <div className="flex items-center gap-2">
                          <input
                            type="range" min="0" max="100" step="1"
                            data-testid={`prev-cumpl-slider-${k}`}
                            className="flex-1 h-1.5 accent-emerald-600 cursor-pointer"
                            value={pct}
                            onChange={(e) => updateItem('porcentaje', Number(e.target.value))}
                            style={{ accentColor: estado.color }}
                          />
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${estado.color}aa, ${estado.color})` }}
                          />
                        </div>
                        {/* Descripción / logros del objetivo */}
                        <textarea
                          data-testid={`prev-cumpl-desc-${k}`}
                          className="w-full p-2 border border-slate-200 rounded-md text-xs resize-none bg-white/60 focus:bg-white"
                          rows={1}
                          placeholder={t('data.whatAchievedIn',{section:obj.toLowerCase()})}
                          value={item.descripcion || ''}
                          onChange={(e) => updateItem('descripcion', e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
                {/* % Global de Cumplimiento — AUTO-CALCULADO (promedio de las 7 áreas) */}
                {(() => {
                  const values = cumplKeys.map(k => {
                    const raw = previousAnalysisData.cumplimiento?.[k];
                    const item = (typeof raw === 'object' && raw !== null) ? raw : {};
                    return Number(item.porcentaje ?? 0);
                  });
                  const pctG = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                  // Sincroniza el valor calculado al state (sin loop: sólo si es distinto)
                  if (Number(previousAnalysisData.porcentajeCumplimiento) !== pctG) {
                    setTimeout(() => setPreviousAnalysisData(prev => ({ ...prev, porcentajeCumplimiento: pctG })), 0);
                  }
                  return (
                    <div className="mt-auto p-5 lg:p-6 rounded-2xl text-slate-900 shadow-lg flex flex-col justify-center" style={{ background: 'linear-gradient(135deg, #CCFF00 0%, #a3e635 100%)', minHeight: '180px' }}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] lg:text-[13px] font-black uppercase tracking-[0.2em]">% Global de Cumplimiento</span>
                          <span className="text-[8px] font-bold px-2 py-1 rounded-md bg-slate-900/85 text-[#CCFF00] uppercase tracking-wider">Auto</span>
                        </div>
                        <span className="text-5xl lg:text-6xl font-black tabular-nums leading-none" data-testid="prev-porcentaje-global" style={{ color: '#0f172a', letterSpacing: '-0.04em' }}>{pctG}<span className="text-2xl lg:text-3xl font-bold ml-1 align-top">%</span></span>
                      </div>
                      <div className="h-4 lg:h-5 bg-black/15 rounded-full overflow-hidden mt-2 shadow-inner">
                        <div className="h-full rounded-full transition-all duration-700 shadow-md" style={{ width: `${pctG}%`, background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)' }} />
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[8px] lg:text-[11px] text-slate-800/75 font-semibold">
                        <span className="italic">{t('data.promedio_automatico_de_las_7_areas')}</span>
                        <span className="uppercase tracking-wider">{pctG >= 85 ? '✓ Excelente' : pctG >= 70 ? '◐ Bueno' : pctG >= 50 ? '○ Aceptable' : '◌ Mejorar'}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Análisis de Fortalezas — col 1 */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#007AFF] lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <TrendingUp className="w-4 h-4 text-[#007AFF]" />{t('data.fortalezas_del_plan_anterior')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500">{t('data.x_que_funciono_bien_que_aspectos_se_deben_mant')}</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`prev-fortaleza-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={`${t('data.phStrength')} ${idx + 1}...`} value={previousAnalysisData.fortalezas[idx]} onChange={(e) => { const arr = [...previousAnalysisData.fortalezas]; arr[idx] = e.target.value; setPreviousAnalysisData({...previousAnalysisData, fortalezas: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Análisis de Debilidades — col 1 */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-amber-500 lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />{t('data.debilidades_y_areas_de_mejora')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500">{t('data.x_que_no_funciono_que_se_debe_cambiar_o_mejora')}</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`prev-debilidad-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={`${t('data.phWeakness')} ${idx + 1}...`} value={previousAnalysisData.debilidades[idx]} onChange={(e) => { const arr = [...previousAnalysisData.debilidades]; arr[idx] = e.target.value; setPreviousAnalysisData({...previousAnalysisData, debilidades: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Indicadores de Rendimiento — col 1 (lista dinámica creada por el entrenador) */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-emerald-500 lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <BarChart className="w-4 h-4 text-emerald-500" />{t('data.indicadores_de_rendimiento')}</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px] border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  data-testid="prev-ind-add-btn"
                  onClick={() => {
                    const lista = previousAnalysisData.indicadoresLista || [];
                    setPreviousAnalysisData({
                      ...previousAnalysisData,
                      indicadoresLista: [...lista, { id: `ind-${Date.now()}`, nombre: '', inicial: '', final: '', delta: '' }]
                    });
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />{t('data.anadir')}</Button>
              </CardHeader>
              <CardContent className="p-3">
                {(!previousAnalysisData.indicadoresLista || previousAnalysisData.indicadoresLista.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <BarChart className="w-8 h-8 mx-auto mb-2 opacity-40" />{t('data.sin_indicadores_haz_clic_en')}<strong className="text-emerald-600">{t('data.anadir')}</strong>{t('data.para_crear_el_primero')}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-1.5 px-2 text-slate-600 font-semibold uppercase tracking-wide text-[8px]">Indicador</th>
                          <th className="text-center py-1.5 px-1 text-slate-600 font-semibold uppercase tracking-wide text-[8px]">Inicial</th>
                          <th className="text-center py-1.5 px-1 text-slate-600 font-semibold uppercase tracking-wide text-[8px]">Final</th>
                          <th className="text-center py-1.5 px-1 text-slate-600 font-semibold uppercase tracking-wide text-[8px]">Delta%</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {previousAnalysisData.indicadoresLista.map((ind, idx) => (
                          <tr key={ind.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="py-1 px-2">
                              <Input
                                data-testid={`prev-ind-nombre-${idx}`}
                                className="h-7 text-xs"
                                placeholder={`Ej: VO2 Máx, 1RM Sentadilla...`}
                                value={ind.nombre || ''}
                                onChange={(e) => {
                                  const lista = [...previousAnalysisData.indicadoresLista];
                                  lista[idx] = { ...lista[idx], nombre: e.target.value };
                                  setPreviousAnalysisData({ ...previousAnalysisData, indicadoresLista: lista });
                                }}
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                data-testid={`prev-ind-${idx}-ini`}
                                className="h-7 w-20 text-center text-xs"
                                placeholder="--"
                                value={ind.inicial || ''}
                                onChange={(e) => {
                                  const lista = [...previousAnalysisData.indicadoresLista];
                                  lista[idx] = { ...lista[idx], inicial: e.target.value };
                                  setPreviousAnalysisData({ ...previousAnalysisData, indicadoresLista: lista });
                                }}
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                data-testid={`prev-ind-${idx}-fin`}
                                className="h-7 w-20 text-center text-xs"
                                placeholder="--"
                                value={ind.final || ''}
                                onChange={(e) => {
                                  const lista = [...previousAnalysisData.indicadoresLista];
                                  lista[idx] = { ...lista[idx], final: e.target.value };
                                  setPreviousAnalysisData({ ...previousAnalysisData, indicadoresLista: lista });
                                }}
                              />
                            </td>
                            <td className="py-1 px-1">
                              <Input
                                data-testid={`prev-ind-${idx}-delta`}
                                className="h-7 w-20 text-center text-xs"
                                placeholder="--%"
                                value={ind.delta || ''}
                                onChange={(e) => {
                                  const lista = [...previousAnalysisData.indicadoresLista];
                                  lista[idx] = { ...lista[idx], delta: e.target.value };
                                  setPreviousAnalysisData({ ...previousAnalysisData, indicadoresLista: lista });
                                }}
                              />
                            </td>
                            <td className="py-1 px-0.5">
                              <button
                                data-testid={`prev-ind-remove-${idx}`}
                                className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                onClick={() => {
                                  const lista = previousAnalysisData.indicadoresLista.filter((_, i) => i !== idx);
                                  setPreviousAnalysisData({ ...previousAnalysisData, indicadoresLista: lista });
                                }}
                                title="Eliminar indicador"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lesiones y Problemas — col 1 */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-rose-500 lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Heart className="w-4 h-4 text-rose-500" />{t('data.lesiones_y_problemas_de_salud')}</CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.x_hubo_lesiones')}</label>
                    <Select value={previousAnalysisData.lesiones} onValueChange={(val) => setPreviousAnalysisData({...previousAnalysisData, lesiones: val})}>
                      <SelectTrigger className="h-9 text-sm" data-testid="prev-lesiones-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no">No hubo lesiones</SelectItem>
                        <SelectItem value="leve">Lesiones leves</SelectItem>
                        <SelectItem value="moderada">Lesiones moderadas</SelectItem>
                        <SelectItem value="grave">Lesiones graves</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.dias_perdidos')}</label>
                    <Input data-testid="prev-dias-perdidos" type="number" placeholder="0" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.diasPerdidos} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, diasPerdidos: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.descripcion_causa_recuperacion')}</label>
                  <textarea data-testid="prev-desc-lesiones" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={t('data.x_describir_las_lesiones_ocurridas_su_causa_pr')} value={previousAnalysisData.descripcionLesiones} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, descripcionLesiones: e.target.value})} />
                </div>
              </CardContent>
            </Card>

            {/* Conclusiones y Recomendaciones — full-width row 6 (cierra el grid sin espacios vacíos) */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-slate-900 lg:col-span-2 lg:row-start-6">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Conclusiones y Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Conclusiones Principales</label>
                  <textarea data-testid="prev-conclusiones" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder={t('data.resumen_de_los_principales_aprendizajes_de')} value={previousAnalysisData.conclusiones} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, conclusiones: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">{t('data.recomendaciones_para_el_proximo_plan')}</label>
                  <textarea data-testid="prev-recomendaciones" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder={t('data.que_mantener_que_cambiar_que_nuevos_enfoqu')} value={previousAnalysisData.recomendaciones} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, recomendaciones: e.target.value})} />
                </div>
                </div>
                {/* CTA: Generar próximo plan basado en este análisis */}
                <div className="pt-1">
                  <button
                    data-testid="prev-generate-next-plan-btn"
                    className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white px-4 py-3 transition-all shadow-md hover:shadow-lg flex items-center justify-between gap-3 text-left"
                    onClick={() => {
                      // Determinar área con mayor brecha real-vs-ideal
                      const cumpl = previousAnalysisData.cumplimiento || {};
                      const gaps = cumplKeys.map((k) => {
                        const item = (typeof cumpl[k] === 'object' && cumpl[k] !== null) ? cumpl[k] : {};
                        const real = Number(item.porcentaje ?? 0);
                        const ideal = Number((benchmarkProfile && benchmarkProfile[k]) ?? 0);
                        return { area: k, gap: ideal - real };
                      });
                      gaps.sort((a, b) => b.gap - a.gap);
                      const focusArea = gaps[0]?.area || 'general';
                      // Persistir contexto en localStorage para el wizard
                      try {
                        localStorage.setItem('lordtraining_next_plan_seed', JSON.stringify({
                          source_plan_id: activePlan?.id || '',
                          source_model: activePlan?.model || '',
                          source_model_name: activePlan?.model_name || '',
                          recomendaciones: previousAnalysisData.recomendaciones || '',
                          conclusiones: previousAnalysisData.conclusiones || '',
                          focus_area: focusArea,
                          gap_analysis: gaps,
                          created_at: new Date().toISOString(),
                        }));
                        toast.success('Datos preparados', { description: 'El nuevo plan se basará en este análisis y la mayor brecha detectada.' });
                      } catch (err) {
                        toast.info(t('data.continuando_al_wizard'));
                      }
                      // Navegar al wizard "Crear Plan" (apertura directa con seed pre-cargado)
                      setActivePanel('datos');
                      setActiveDataSection('create-plan');
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#CCFF00' }}>
                        <Plus className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[8px] font-black uppercase tracking-widest" style={{ color: '#CCFF00' }}>{t('data.cierra_el_ciclo')}</div>
                        <div className="text-sm font-bold truncate">{t('data.generar_proximo_plan_basado_en_este_analis')}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* (Conclusiones y Recomendaciones se renderizan ahora dentro del grid, en col 2) */}

          {/* ====== GAP ANALYSIS CON IA ====== */}
          <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#CCFF00]" data-testid="ai-gap-analysis-card">
            <CardHeader className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b-2 border-[#CCFF00] py-3 px-4">
              <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-white flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: '#CCFF00', boxShadow: '0 0 12px rgba(204,255,0,0.4)' }}>
                    <Sparkles className="w-4 h-4 text-slate-900" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: '#CCFF00' }}>{t('data.gap_analysis_con_ia')}</div>
                    <div className="text-sm font-bold text-white">{t('data.diagnostico_cruzado_vs_modelos_de_periodiz')}</div>
                  </div>
                </div>
                {aiGapData && (
                  <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'rgba(204,255,0,0.15)', color: '#CCFF00', border: '1px solid rgba(204,255,0,0.4)' }}>
                    {(aiGapData.provider || '').toUpperCase()} · {aiGapData.llm_model || ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Provider selector + multi-select de modelos */}
              <div className="grid md:grid-cols-[180px_1fr_auto] gap-3 items-start">
                <div className="space-y-1">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-slate-600">Motor IA</label>
                  <div className="flex gap-1.5" data-testid="ai-provider-selector">
                    <button
                      type="button"
                      onClick={() => setAiGapProvider('openai')}
                      data-testid="ai-provider-openai"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${aiGapProvider === 'openai' ? 'border-slate-900 bg-slate-900 text-[#CCFF00]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
                    >GPT-5.2</button>
                    <button
                      type="button"
                      onClick={() => setAiGapProvider('anthropic')}
                      data-testid="ai-provider-anthropic"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all ${aiGapProvider === 'anthropic' ? 'border-slate-900 bg-slate-900 text-[#CCFF00]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'}`}
                    >Claude 4.5</button>
                  </div>
                </div>

                <div className="space-y-1 min-w-0">
                  <label className="text-[8px] font-bold uppercase tracking-wider text-slate-600">
                    Modelos a comparar ({aiSelectedModels.length}/6)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200" data-testid="ai-models-selector">
                    {periodLibrary.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Cargando biblioteca...</span>
                    ) : (
                      periodLibrary.map(m => {
                        const isSelected = aiSelectedModels.includes(m.id);
                        const reachedCap = !isSelected && aiSelectedModels.length >= 6;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            disabled={reachedCap}
                            data-testid={`ai-model-chip-${m.id}`}
                            onClick={() => {
                              setAiSelectedModels(prev => isSelected
                                ? prev.filter(x => x !== m.id)
                                : (prev.length < 6 ? [...prev, m.id] : prev));
                            }}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-[#CCFF00] shadow-sm'
                                : reachedCap
                                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:bg-slate-50'
                            }`}
                            title={m.description || m.name}
                          >
                            {m.icon ? <span className="mr-1">{m.icon}</span> : null}
                            {m.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 md:items-end pt-4">
                  <button
                    type="button"
                    onClick={() => handleGenerateGapAnalysisAI(false)}
                    disabled={aiGapLoading || !activePlan || aiSelectedModels.length === 0}
                    data-testid="ai-generate-btn"
                    className="px-4 py-2 rounded-lg font-bold text-[12px] uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: '#CCFF00', color: '#0f172a', boxShadow: aiGapLoading ? 'none' : '0 4px 12px rgba(204,255,0,0.4)' }}
                  >
                    {aiGapLoading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generando...</>
                    ) : aiGapData ? (
                      <><Sparkles className="w-4 h-4" /> Regenerar</>
                    ) : (
                      <><Sparkles className="w-4 h-4" /> Generar IA</>
                    )}
                  </button>
                  {aiGapData && (
                    <button
                      type="button"
                      onClick={() => handleGenerateGapAnalysisAI(true)}
                      disabled={aiGapLoading}
                      className="text-[8px] text-slate-500 hover:text-slate-900 underline"
                      data-testid="ai-force-refresh-btn"
                    >{t('data.forzar_regeneracion')}</button>
                  )}
                </div>
              </div>

              {/* Resultado IA */}
              {!aiGapData && !aiGapLoading && (
                <div className="bg-gradient-to-br from-slate-50 to-white border border-dashed border-slate-300 rounded-xl p-6 text-center" data-testid="ai-empty-state">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700 mb-1">{t('data.analisis_inteligente_de_brechas')}</p>
                  <p className="text-[12px] text-slate-500 max-w-md mx-auto leading-relaxed">
                    Compara tu rendimiento real con los modelos de periodización seleccionados.
                    La IA generará 3-5 recomendaciones accionables específicas para cerrar las brechas detectadas.
                  </p>
                </div>
              )}

              {aiGapLoading && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                  <Loader2 className="w-8 h-8 mx-auto mb-2 text-slate-400 animate-spin" />
                  <p className="text-sm font-bold text-slate-700">Analizando con {aiGapProvider === 'openai' ? 'GPT-5.2' : 'Claude Sonnet 4.5'}...</p>
                  <p className="text-[11px] text-slate-500 mt-1">Esto puede tardar 10-30 segundos</p>
                </div>
              )}

              {aiGapData && !aiGapLoading && (
                <div className="space-y-3" data-testid="ai-gap-results">
                  {/* Executive Summary */}
                  {aiGapData.executive_summary && (
                    <div className="rounded-xl p-3.5 border-l-4 border-[#CCFF00]" style={{ background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-700 mb-1">Resumen Ejecutivo</div>
                      <p className="text-[12.5px] text-slate-800 leading-relaxed italic">{aiGapData.executive_summary}</p>
                    </div>
                  )}

                  {/* Tabla comparativa por modelo */}
                  {Array.isArray(aiGapData.comparisons) && aiGapData.comparisons.length > 0 && (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-900 text-[#CCFF00] px-3 py-2 text-[8px] font-black uppercase tracking-widest grid grid-cols-[1fr_auto_70px] gap-2">
                        <span>Modelo</span>
                        <span>{t('data.brechas_top_3')}</span>
                        <span className="text-right">Coincidencia</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {aiGapData.comparisons.map((c, idx) => {
                          const gaps = (c.gaps || []).slice().sort((a, b) => (b.gap || 0) - (a.gap || 0));
                          const top3 = gaps.slice(0, 3);
                          const meanGap = gaps.length ? Math.round(gaps.reduce((s, g) => s + (g.gap || 0), 0) / gaps.length) : 0;
                          const coinc = Math.max(0, 100 - meanGap);
                          const coincColor = coinc >= 75 ? '#10B981' : coinc >= 50 ? '#F59E0B' : '#EF4444';
                          return (
                            <div key={idx} className="grid grid-cols-[1fr_auto_70px] gap-2 items-center px-3 py-2 hover:bg-slate-50">
                              <div className="font-bold text-slate-800 text-[12px] truncate">{tModelName(c.model_name)}</div>
                              <div className="flex flex-wrap gap-1 justify-start max-w-md">
                                {top3.length === 0 ? <span className="text-[11px] text-slate-400">{t('data.sin_brechas')}</span> :
                                  top3.map((g, gi) => (
                                    <span key={gi} className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                      {g.label} <span className="text-red-600">−{g.gap}%</span>
                                    </span>
                                  ))
                                }
                              </div>
                              <div className="text-right">
                                <span className="text-[15px] font-black tabular-nums" style={{ color: coincColor }}>{coinc}%</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {Array.isArray(aiGapData.recommendations) && aiGapData.recommendations.length > 0 && (
                    <div className="space-y-2" data-testid="ai-recommendations-list">
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-700 px-2">Recomendaciones Accionables</span>
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                      </div>
                      {aiGapData.recommendations.map((r, i) => {
                        const prio = String(r.priority || r.prioridad || 'media').toLowerCase();
                        const prioColor = prio === 'alta' ? '#EF4444' : prio === 'baja' ? '#10B981' : '#F59E0B';
                        const title = r.title || r.titulo || `Recomendación ${i + 1}`;
                        const desc = r.description || r.descripcion || '';
                        return (
                          <div key={i} className="bg-white border border-slate-200 rounded-xl p-3 border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: '#CCFF00' }} data-testid={`ai-rec-${i}`}>
                            <div className="flex items-start gap-2.5 mb-1.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-black bg-slate-900" style={{ color: '#CCFF00' }}>
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-bold text-slate-900 leading-snug">{title}</div>
                                {r.area && <div className="text-[8px] font-semibold text-slate-500 mt-0.5">{t('data.area')}<span className="text-slate-700">{r.area}</span></div>}
                              </div>
                              <span
                                className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0"
                                style={{ background: prioColor + '20', color: prioColor, border: `1px solid ${prioColor}80` }}
                              >{prio}</span>
                            </div>
                            <p className="text-[11.5px] text-slate-700 leading-relaxed pl-9.5" style={{ paddingLeft: '38px' }}>{desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[8px] text-slate-400 italic text-center pt-2">
                    Recomendaciones generadas por IA. Validar siempre con criterio del cuerpo técnico.
                    {aiGapData.cached && ' · Resultado desde caché.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      );
    }

    // Render Health Records for injuries
    if (activeDataSection === 'injuries') {
      return <HealthRecords athleteId={selectedAthleteId} recordType="lesion" />;
    }

    // Render Health Records for diseases
    if (activeDataSection === 'diseases') {
      return <HealthRecords athleteId={selectedAthleteId} recordType="enfermedad" />;
    }

    // Render Health Records for diagnosis (all types)
    if (activeDataSection === 'diagnostic') {
      return <HealthRecords athleteId={selectedAthleteId} recordType="all" />;
    }

    // Render Competition Analysis
    if (activeDataSection === 'competitions') {
      return <CompetitionAnalysis athleteId={selectedAthleteId} activePlan={activePlan} />;
    }

    // ====== CREAR NUEVO PLAN (Wizard directo) ======
    if (activeDataSection === 'create-plan') {
      return (
        <PeriodizationComplete
          showWizardOnly={true}
          onBack={() => setActiveDataSection(null)}
          onPlanCreated={async (newPlan) => {
            // Primero refrescar sidebar para que el nuevo plan aparezca
            await fetchTrainingPlans();
            // Luego activar el plan recién creado
            if (newPlan?.apiId) {
              handleSetActivePlan({
                id: newPlan.apiId,
                name: newPlan.name,
                sport: newPlan.sport || 'General',
                model: newPlan.model,
                model_name: newPlan.model,
                total_weeks: newPlan.totalWeeks,
                start_date: newPlan.startDate,
              });
            }
          }}
        />
      );
    }

    // ====== PERIODIZACIÓN - Sub-secciones directas ======
    if (activeDataSection === 'period-overview') {
      return (
        <TrainingSystemHub 
          athleteId={selectedAthleteId} 
          athleteName={athletes.find(a => a.id === selectedAthleteId)?.name}
          onNavigate={(section) => setActiveDataSection(section)}
          activePlan={activePlan}
          hideTabBar={true}
        />
      );
    }

    if (activeDataSection === 'period-structure') {
      return (
        <PeriodizationComplete
          activePlan={activePlan}
          focusTarget={periodizationFocus}
          onPlanCreated={async (newPlan) => {
            await fetchTrainingPlans();
            if (newPlan?.apiId) {
              handleSetActivePlan({
                id: newPlan.apiId,
                name: newPlan.name,
                sport: newPlan.sport || 'General',
                model: newPlan.model,
                model_name: newPlan.model,
                total_weeks: newPlan.totalWeeks,
                start_date: newPlan.startDate,
              });
            }
          }}
        />
      );
    }

    // Periodización → Carga: panel ejecutivo de magnitud de carga, ACWR, tendencia
    if (activeDataSection === 'period-load') {
      return <LoadPanel activePlan={activePlan} />;
    }


    // Fallback: training-system (mantener para compatibilidad)
    if (activeDataSection === 'training-system') {
      return (
        <TrainingSystemHub 
          athleteId={selectedAthleteId} 
          athleteName={athletes.find(a => a.id === selectedAthleteId)?.name}
          onNavigate={(section) => setActiveDataSection(section)}
          activePlan={activePlan}
        />
      );
    }

    // Render Macrocycle Stages (Training Stages)
    if (activeDataSection === 'macrocycle-stages') {
      return <TrainingStages athleteId={selectedAthleteId} />;
    }

    // Render Training Methods (Medios de entrenamiento)
    if (activeDataSection === 'exercises') {
      return <TrainingMethods athleteId={selectedAthleteId} />;
    }

    // Render Anthropometric Data (legacy redirect to new EvaluationSection)
    if (activeDataSection === 'anthropometric' || activeDataSection === 'control-anthropometric') {
      return <EvaluationSection key={activeDataSection} sectionId="control-anthropometric" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // ====== NUEVAS SECCIONES DE EVALUACIÓN ======

    // Análisis Biomecánico (legacy redirect to new EvaluationSection)
    if (activeDataSection === 'biomechanical' || activeDataSection === 'control-biomechanical') {
      return <EvaluationSection key={activeDataSection} sectionId="control-biomechanical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Control Médico
    if (activeDataSection === 'control-medical') {
      return <EvaluationSection key={activeDataSection} sectionId="control-medical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Control Físico
    if (activeDataSection === 'control-physical') {
      return <EvaluationSection key={activeDataSection} sectionId="control-physical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Control Técnico
    if (activeDataSection === 'control-technical') {
      return <EvaluationSection key={activeDataSection} sectionId="control-technical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Control Táctico
    if (activeDataSection === 'control-tactical') {
      return <EvaluationSection key={activeDataSection} sectionId="control-tactical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Control Psicológico
    if (activeDataSection === 'control-psychological') {
      return <EvaluationSection key={activeDataSection} sectionId="control-psychological" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Control Teórico
    if (activeDataSection === 'control-theoretical') {
      return <EvaluationSection key={activeDataSection} sectionId="control-theoretical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Evolución de Controles
    if (activeDataSection === 'evaluation-evolution') {
      return <EvaluationEvolution activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} onSelectAthlete={setSelectedAthleteId} />;
    }

    // Calculadoras Hub (10 módulos)
    if (activeDataSection === 'calculators') {
      return <CalculatorsHub />;
    }

    // Render Training Load
    if (activeDataSection === 'load') {
      return <TrainingLoad athleteId={selectedAthleteId} />;
    }

    // Render Graphic Plan
    if (activeDataSection === 'graphic-plan') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      const selectedTeam = teams.find(tm => tm.id === selectedTeamId);
      return (
        <GraphicPlan 
          athleteId={selectedAthleteId} 
          periodizationData={periodizationData}
          athleteName={selectedTeam ? selectedTeam.name : selectedAthlete?.name}
          athleteCategory={selectedAthlete?.category || selectedAthlete?.classification}
          coachName={user?.full_name || user?.name || ''}
          activePlan={activePlan}
          competitions={planData?.competitions || []}
          teamAthleteIds={selectedTeam ? (selectedTeam.athletes || []) : null}
          teamName={selectedTeam?.name || null}
          onPlanUpdated={(patch) => setActivePlan(prev => prev ? { ...prev, ...patch } : prev)}
        />
      );
    }

    // Render Entity Manager
    if (activeDataSection === 'entities') {
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          <InfoSectionHeader
            catalogType="entities"
            title="Entidades"
            subtitle="Federaciones, clubes, escuelas y organizaciones deportivas"
            icon={Building2}
            color="#0EA5E9"
          />
          <EntityManager />
        </div>
      );
    }

    // Render Federation Panel (T9)
    if (activeDataSection === 'federation-panel') {
      return (
        <FederationPanel
          onOpenMasterReport={(opts) => {
            // Open Master Report modal with federation context
            setIsMasterReportOpen(true);
          }}
        />
      );
    }

    if (activeDataSection === 'coaches') {
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          <InfoSectionHeader
            catalogType="coaches"
            title="Entrenadores"
            subtitle={t('data.staff_tecnico_perfiles_profesionales_traye')}
            icon={UserCheck}
            color="#0EA5E9"
          />
          <CoachesManager />
        </div>
      );
    }

    // Render Entity Dashboard
    if (activeDataSection === 'entity-dashboard') {
      return (
        <EntityDashboard 
          onNavigate={(section, athleteId) => {
            if (athleteId) setSelectedAthleteId(athleteId);
            setActiveDataSection(section);
          }}
        />
      );
    }

    // Render Smart Alerts
    if (activeDataSection === 'smart-alerts') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('data.alertas_inteligentes_de_entrenamiento')}</h2>
              <p className="text-slate-500">{t('data.recomendaciones_basadas_en_evaluaciones_y_')}</p>
              {athletes.length > 0 && (
                <div className="mt-4">
                  <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder={t('data.seleccionar_atleta')} />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <SmartAlerts 
              athleteId={selectedAthleteId} 
              athleteName={selectedAthlete?.name}
              onNavigate={(section) => setActiveDataSection(section)}
            />
          </div>
        </div>
      );
    }

    // For sections without specific components, show placeholder
    const sectionLabel = navItems.find(item => item.id === activeDataSection)?.label;
    
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-600">{sectionLabel}</h2>
          {athletes.length > 0 && (
            <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('data.seleccionar_atleta')} />
              </SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">{t('data.esta_seccion_esta_en_desarrollo')}</p>
            <p className="text-sm text-gray-400">
              Pronto podrás gestionar {sectionLabel?.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMainContent = () => {
    if (activePanel === 'datos') {
      // ====== LAYOUT: SIDEBAR DE PLANES + CONTENIDO ======
      const sectionsWithoutPlan = ['athletes', 'entities', 'training-system', 'exercises-lib', 'calculators', 'periodization-models', 'pdi-sheet', 'tactical-board', 'sports', 'tournaments', 'create-plan', 'period-overview', 'period-structure', 'period-load', 'scouting'];

      return (
        <div className="flex h-full" data-testid="datos-layout">
          {/* PlanSidebar movido: a un Sheet (Modo Clásico, botón superior) y al sidebar navy (Modo Pro) */}

          {/* ====== CONTENIDO PRINCIPAL ====== */}
          <div className="flex-1 flex flex-col min-h-0" data-testid="plan-content-area">
          {activePlan ? (
            <>
          {/* Plan Active Header Bar */}
          <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-md">
                  <Clipboard className="w-5 h-5 text-[#CCFF00]" />
                </div>
                <div className="flex flex-col">
                  <p className="text-[8px] text-slate-400 uppercase tracking-[0.15em] font-bold leading-none mb-0.5">{t('data.plan_activo')}</p>
                  <h2 className="text-slate-900 font-bold text-base leading-tight">{activePlan.name}</h2>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 ml-1">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full">
                    {activePlan.total_weeks} {t('periodization.weeksLower')}
                  </span>
                  <span className="px-2.5 py-1 bg-[#E0F7FA] text-[#00838F] text-[11px] font-semibold rounded-full">
                    {resolveModelName(activePlan)}
                  </span>
                  {activePlan.sport && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full">
                      {(allSports.find(s => s.id === activePlan.sport)?.name) || activePlan.sport}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetActivePlan(null)}
                className="border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg text-xs h-8"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />{t('data.cambiar_plan')}</Button>
          </div>

          {/* Selector persistente Atleta o Equipo (visible en todas las secciones de Datos) */}
          {(athletes.length > 0 || teams.length > 0) && (
            <div className="bg-white border-b border-slate-200 px-5 py-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Atleta o Equipo</span>
              <Select
                value={selectedTeamId ? `t:${selectedTeamId}` : (selectedAthleteId ? `a:${selectedAthleteId}` : '')}
                onValueChange={(v) => {
                  if (v.startsWith('t:')) {
                    const teamId = v.slice(2);
                    const team = teams.find(tm => tm.id === teamId);
                    const roster = (team?.athletes || []);
                    setSelectedTeamId(teamId);
                    setSelectedAthleteId(roster[0] || null);
                  } else if (v.startsWith('a:')) {
                    setSelectedTeamId(null);
                    setSelectedAthleteId(v.slice(2));
                  }
                }}
              >
                <SelectTrigger className="w-64 h-8" data-testid="athlete-team-selector">
                  <SelectValue placeholder="Seleccionar atleta o equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teams.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Equipos</SelectLabel>
                      {teams.map(tm => (
                        <SelectItem key={tm.id} value={`t:${tm.id}`} data-testid={`select-team-${tm.id}`}>
                          {tm.name} ({(tm.athletes || []).length})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {athletes.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>{t('data.atleta')}s</SelectLabel>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={`a:${a.id}`} data-testid={`select-athlete-${a.id}`}>{a.name}</SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {selectedTeamId && (
                <span className="text-xs font-semibold text-[#1565C0] bg-blue-50 px-2.5 py-1 rounded-full" data-testid="team-mode-badge">
                  Modo Equipo: {(teams.find(tm => tm.id === selectedTeamId)?.athletes || []).length} atletas
                </span>
              )}
            </div>
          )}

          {/* Data Content */}
          <div className="flex-1 overflow-y-auto bg-[#fafaf8]">
            {renderDataContent()}
          </div>
            </>
          ) : activeDataSection && sectionsWithoutPlan.includes(activeDataSection) ? (
            <div className="flex-1 overflow-y-auto bg-[#fafaf8]">
              {renderDataContent()}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-[#fafaf8] p-8" data-testid="plan-welcome-state">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Clipboard className="w-10 h-10 text-slate-300" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">{t('data.selecciona_un_plan')}</h2>
                <p className="text-slate-500 text-sm mb-6">
                  {uiMode === 'whatsapp'
                    ? t('data.elige_plan_secciones_pro', { defaultValue: 'Elige un plan de entrenamiento del panel lateral para acceder a sus secciones y datos.' })
                    : t('data.elige_plan_secciones_btn', { defaultValue: 'Abre tus planes desde el botón "Planes" de la barra superior, o crea uno nuevo.' })}
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {uiMode !== 'whatsapp' && (
                    <Button
                      onClick={() => setIsPlansSheetOpen(true)}
                      variant="outline"
                      className="rounded-lg border-slate-300"
                      data-testid="welcome-open-plans-btn"
                    >
                      <ListChecks className="w-4 h-4 mr-2" />{t('data.ver_mis_planes', { defaultValue: 'Ver mis planes' })}
                    </Button>
                  )}
                  <Button
                    onClick={() => setActiveDataSection('create-plan')}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                    data-testid="welcome-create-plan-btn"
                  >
                    <Plus className="w-4 h-4 mr-2" />{t('data.crear_nuevo_plan')}</Button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      );
    }
    
    // Panel de Control - Resumen visual con estadísticas y gráficos
    const handleNavigateFromPanel = (panel, section, focus) => {
      setActivePanel(panel);
      if (section) {
        setActiveDataSection(section);
      }
      if (focus) {
        setPeriodizationFocus({ ...focus, ts: Date.now() });
      }
    };

    const handleOpenAthleteFromRanking = (athleteId) => {
      setSelectedAthleteId(athleteId);
      setGlobalContext(prev => ({ ...prev, athleteId }));
      setActivePanel('datos');
      setActiveDataSection('athletes');
    };

    return (
      <ControlPanel
        athletes={athletes}
        events={events}
        selectedAthleteId={selectedAthleteId}
        periodizationData={periodizationData}
        stats={stats}
        onNavigate={handleNavigateFromPanel}
        activePlan={activePlan}
        trainingPlans={trainingPlans}
        globalContext={globalContext}
        onOpenAthlete={handleOpenAthleteFromRanking}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // ====== MODO WHATSAPP / PRO: layout extraído a components/dashboard/WhatsAppShell ======
  const renderWhatsAppLayout = () => (
    <WhatsAppShell ctx={{
      t, user, logout,
      activePanel, setActivePanel, activeDataSection, setActiveDataSection,
      activePlan, trainingPlans, loadingPlans, athletes, planSections, navItems,
      proSearch, setProSearch, proSidebarCollapsed, setProSidebarCollapsed,
      setIsMasterReportOpen, setIsSessionsExportOpen, setIsCoachDrawerOpen,
      handleSetActivePlan, renderMainContent,
      scoutingTab, setScoutingTab,
    }} />
  );

  return (
    <div className={`min-h-screen transition-colors duration-300 ${uiMode === 'whatsapp' ? 'bg-[#F0F2F5]' : 'bg-[#fafaf8]'}`}>
      {uiMode !== 'whatsapp' ? (
       <>
      {/* ====== GLOBAL CONTEXT BAR - Material Floating FABs ====== */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl shadow-sm" data-testid="global-context-bar">
        <div className="flex items-start px-3 pt-2.5 pb-1.5 gap-0 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Left: Logo + Main Nav FABs */}
          <div className="flex items-start gap-3 shrink-0 pr-2">
            {/* Logo */}
            <div className="flex items-center pt-1" data-testid="dashboard-brand-logo">
              <BrandLogo variant="full" theme="dark" size={36} />
            </div>

            {/* Main Nav FABs */}
            <div className="flex items-start gap-2">
              {[
                { key: 'panel', icon: LayoutDashboard, label: t('dashboard.nav.panel'), color: 'bg-slate-900', shadow: 'shadow-slate-900/30' },
                { key: 'datos', icon: Clipboard, label: t('dashboard.nav.data'), color: 'bg-[#007AFF]', shadow: 'shadow-blue-500/30' },
              ].map((nav) => {
                const NavIcon = nav.icon;
                const isActive = activePanel === nav.key;
                return (
                  <button
                    key={nav.key}
                    onClick={() => {
                      setActivePanel(nav.key);
                      if (nav.key === 'datos' && !activePlan) setActiveDataSection(null);
                    }}
                    className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                    data-testid={`tab-${nav.key}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                      isActive
                        ? `${nav.color} text-white shadow-lg ${nav.shadow} ring-2 ring-white/40`
                        : 'bg-white text-slate-500 shadow-sm border border-slate-100 hover:bg-slate-50 hover:shadow-md'
                    }`}>
                      <NavIcon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'text-white' : 'group-hover:text-slate-700'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <span className={`text-[8px] tracking-wide leading-tight text-center max-w-[56px] transition-colors duration-300 ${
                      isActive ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium group-hover:text-slate-600'
                    }`}>
                      {nav.label}
                    </span>
                  </button>
                );
              })}

              {/* Planes FAB — abre el Sheet con la lista de planes (ahorra espacio) */}
              <button
                onClick={() => setIsPlansSheetOpen(true)}
                className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                data-testid="tab-planes"
                title={t('data.planes_de_entrenamiento', { defaultValue: 'Planes de Entrenamiento' })}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-500 shadow-sm border border-slate-100 hover:bg-slate-50 hover:shadow-md">
                  <ListChecks className="w-[18px] h-[18px] transition-transform duration-300 group-hover:text-slate-700" strokeWidth={1.8} />
                </div>
                <span className="text-[8px] tracking-wide leading-tight text-center max-w-[56px] transition-colors duration-300 text-slate-400 font-medium group-hover:text-slate-600">
                  {t('data.planes_corto', { defaultValue: 'Planes' })}
                </span>
              </button>

              {/* Scouting FAB — Recruiting & Talent ID */}
              {(() => {
                const scoutActive = activePanel === 'datos' && activeDataSection === 'scouting';
                return (
                  <button
                    onClick={() => { setActivePanel('datos'); setActiveDataSection('scouting'); }}
                    className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                    data-testid="tab-scouting"
                    title={t('data.recruiting_talent_id_identifica_el_talento')}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${scoutActive ? 'bg-slate-900 text-[#CCFF00] shadow-lg shadow-slate-900/30' : 'bg-white text-slate-700 shadow-md border-2 border-[#CCFF00] hover:shadow-lg hover:bg-[#CCFF00]/15'}`}>
                      <Target className="w-[18px] h-[18px] transition-transform duration-300" strokeWidth={scoutActive ? 2.5 : 2} />
                    </div>
                    <span className={`text-[8px] font-bold tracking-wide leading-tight text-center max-w-[60px] transition-colors duration-300 ${scoutActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
                      Scouting
                    </span>
                  </button>
                );
              })()}

              {/* Reporte Maestro FAB (sustituye el viejo PDF + consolida) */}
              <button
                onClick={() => setIsMasterReportOpen(true)}
                className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                data-testid="header-master-report-btn"
                title={t('data.reporte_maestro_5_estilos_seleccion_de_sec')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-700 shadow-md border-2 border-[#CCFF00] hover:shadow-lg hover:bg-[#CCFF00]/15">
                  <FileBarChart2 className="w-[18px] h-[18px] transition-transform duration-300" strokeWidth={2} />
                </div>
                <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-700 group-hover:text-slate-900 transition-colors duration-300 max-w-[60px]">
                  {t('dashboard.nav.report')}
                </span>
              </button>

              {/* Sesiones FAB — exportación independiente de sesiones específicas */}
              <button
                onClick={() => {
                  if (!activePlan?.id) {
                    toast.warning(t('data.selecciona_un_plan_activo_primero'));
                    return;
                  }
                  setIsSessionsExportOpen(true);
                }}
                className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                data-testid="header-sessions-export-btn"
                title={t('data.exportar_sesiones_especificas_a_pdf_combin')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-700 shadow-md border-2 border-sky-400 hover:shadow-lg hover:bg-sky-50">
                  <CalendarDays className="w-[18px] h-[18px] transition-transform duration-300" strokeWidth={2} />
                </div>
                <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-700 group-hover:text-slate-900 transition-colors duration-300 max-w-[60px]">
                  {t('dashboard.nav.sessions')}
                </span>
              </button>

          </div>
          </div>

          {/* ====== CENTER: Section + Sub-section FABs (only when Datos + activePlan) ====== */}
          {activePanel === 'datos' && activePlan && (
            <div className="flex items-start gap-1 shrink-0 px-1">
              {/* Thin separator */}
              <div className="w-px h-10 bg-slate-200/80 self-center mx-1 shrink-0" />
              {/* Section FABs — differentiated with tinted bg */}
              <div className="flex items-start gap-1.5">
                {planSections.map((section) => {
                  const SectionIcon = section.icon;
                  const isActive = currentSection === section.key;
                  const colors = colorClasses[section.color];
                  return (
                    <button
                      key={section.key}
                      onClick={() => {
                        const firstItem = navItems.find(n => n.section === section.key);
                        if (firstItem) setActiveDataSection(firstItem.id);
                      }}
                      className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                      data-testid={`section-tab-${section.key}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                        isActive
                          ? `${colors.bg} text-white shadow-lg ${colors.shadow} ring-2 ring-white/40`
                          : `bg-white text-slate-400 border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md`
                      }`}>
                        <SectionIcon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'text-white' : 'group-hover:text-slate-600'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                      </div>
                      <span className={`text-[8px] tracking-wide leading-tight text-center max-w-[60px] transition-colors duration-300 ${
                        isActive ? `${colors.text} font-bold` : 'text-slate-400 font-medium group-hover:text-slate-600'
                      }`}>
                        {section.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Vertical divider + Sub-section FABs — differentiated with ring border */}
              {sectionItems.length > 1 && (
                <>
                  <div className="w-px h-10 bg-slate-200/80 self-center mx-1 shrink-0" />
                  <div className="flex items-start gap-1.5">
                    {sectionItems.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = activeDataSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveDataSection(item.id)}
                          className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                          data-testid={`subnav-${item.id}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                            isActive
                              ? `${currentColors.bg} text-white shadow-lg ${currentColors.shadow} ring-2 ring-white/40`
                              : `bg-white text-slate-400 border border-slate-200 shadow-sm hover:bg-slate-50 hover:shadow-md`
                          }`}>
                            <ItemIcon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'text-white' : 'group-hover:text-slate-600'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                          </div>
                          <span className={`text-[8px] text-center max-w-[60px] leading-tight transition-colors duration-300 ${
                            isActive ? `${currentColors.text} font-bold` : 'text-slate-400 font-medium group-hover:text-slate-600'
                          }`}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              <div className="w-px h-10 bg-slate-200/80 self-center mx-1 shrink-0" />
            </div>
          )}

          {/* Spacer to push right actions to the end */}
          <div className="flex-1 min-w-[8px]" />

          {/* Right: Testing + User Action FABs */}
          <div className="flex items-start gap-2 shrink-0 pl-2">
            {/* Toggle de estilo (Clásico / Pro) */}
            <ThemeToggle variant="light" className="hidden sm:inline-flex mr-1 mt-1" />
            {/* Notificaciones in-app (leads + resumen vitrina) */}
            <NotificationsBell onNavigate={(tab) => { setActivePanel('datos'); setActiveDataSection('scouting'); setScoutingTab(tab || 'showcase'); }} />
            {/* Alertas proactivas FAB */}
            <div className="relative">
              <button
                onClick={() => setAlertsOpen(o => !o)}
                className="group flex flex-col items-center gap-1 shrink-0 outline-none relative"
                data-testid="alerts-fab"
                title={t('data.alertas_de_prevencion_acwr_disponibilidad')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg hover:text-rose-500">
                  <Bell className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.8} />
                  {coachAlerts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white" data-testid="alerts-count-badge">
                      {coachAlerts.length}
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-400 group-hover:text-rose-500 transition-colors duration-300">
                  {t('dashboard.shell.fabAlerts')}
                </span>
              </button>
              {alertsOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAlertsOpen(false)} />
                  <div className="fixed top-[70px] right-4 z-[70] w-80 rounded-xl bg-white shadow-xl border border-slate-150 p-2 max-h-[70vh] overflow-y-auto" data-testid="alerts-menu">
                    <button
                      onClick={() => { setAlertsOpen(false); setSummaryOpen(true); }}
                      className="w-full flex items-center justify-between gap-2 px-2.5 py-2 mb-1 rounded-lg text-sm font-semibold text-[#007AFF] bg-blue-50 hover:bg-blue-100"
                      data-testid="open-weekly-summary-btn"
                    >
                      <span className="flex items-center gap-1.5"><TrendingUp className="w-4 h-4" />{t('dashboard.alerts.viewWeekly')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    <p className="text-[11px] text-slate-400 px-2 py-1 flex items-center gap-1.5"><Bell className="w-3 h-3" />{t('dashboard.alerts.title')}</p>
                    {coachAlerts.length === 0 ? (
                      <div className="flex items-center gap-2 px-2.5 py-4 text-sm text-slate-500">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />{t('dashboard.alerts.empty')}
                      </div>
                    ) : (
                      coachAlerts.map((a, i) => (
                        <div key={i} className={`rounded-lg p-2.5 mb-1.5 border ${a.severity === 'high' ? 'bg-red-50 border-red-150' : 'bg-amber-50 border-amber-150'}`} data-testid={`alert-item-${i}`}>
                          <div className="flex items-start gap-2">
                            <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${a.severity === 'high' ? 'text-red-500' : 'text-amber-500'}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{a.message}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Demo data FAB — siempre visible para cualquier coach */}
            <div className="relative">
              <button
                onClick={() => setDemoMenuOpen(o => !o)}
                className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                data-testid="demo-data-fab"
                title={t('data.cargar_o_quitar_datos_de_ejemplo')}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-[#CCFF00]/15 text-slate-700 shadow-md border border-[#CCFF00]/50 hover:shadow-lg hover:bg-[#CCFF00]/25">
                  <Sparkles className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.8} />
                </div>
                <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-500 group-hover:text-slate-700 transition-colors duration-300">
                  {t('dashboard.shell.fabDemo')}
                </span>
              </button>
              {demoMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDemoMenuOpen(false)} />
                  <div className="fixed top-[70px] right-4 z-[70] w-60 rounded-xl bg-white shadow-xl border border-slate-150 p-2" data-testid="demo-data-menu">
                    <p className="text-[11px] text-slate-400 px-2 py-1">{t('dashboard.demo.title')}</p>
                    <button
                      onClick={handleSeedDemo}
                      disabled={demoBusy !== null}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      data-testid="demo-load-btn"
                    >
                      {demoBusy === 'seed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-600" />}
                      {t('dashboard.demo.load')}
                    </button>
                    <button
                      onClick={handleClearDemo}
                      disabled={demoBusy !== null}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      data-testid="demo-clear-btn"
                    >
                      {demoBusy === 'clear' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      {t('dashboard.demo.clear')}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Equipo (Org) FAB — siempre visible, bloqueado si no tiene plan Club+ */}
            <Link to={user?.is_super_admin ? '/admin/super' : '/org/team'}>
              <button
                className="group flex flex-col items-center gap-1 shrink-0 outline-none relative"
                data-testid="org-team-btn"
                title={user?.is_super_admin ? 'Panel Super Admin' : (canManageOrg ? 'Gestionar equipo de entrenadores' : 'Disponible en plan Club / Institucional')}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out shadow-md border ${
                  user?.is_super_admin
                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:shadow-lg hover:bg-purple-100'
                    : canManageOrg
                      ? 'bg-white text-slate-500 border-slate-100 hover:shadow-lg hover:text-emerald-600'
                      : 'bg-slate-50 text-slate-300 border-slate-100 hover:shadow-md hover:text-slate-400'
                }`}>
                  <Building2 className={`w-[18px] h-[18px] transition-transform duration-300 ${user?.is_super_admin ? '' : (canManageOrg ? 'group-hover:text-emerald-600' : 'group-hover:text-slate-400')}`} strokeWidth={1.8} />
                  {!canManageOrg && !user?.is_super_admin && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white flex items-center justify-center">
                      <svg className="w-2 h-2 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm-3 8V6a3 3 0 1 1 6 0v3H9z"/></svg>
                    </span>
                  )}
                  {user?.is_super_admin && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-purple-600 border-2 border-white" />
                  )}
                </div>
                <span className={`text-[8px] font-bold tracking-wide leading-tight text-center transition-colors duration-300 ${
                  user?.is_super_admin ? 'text-purple-700' : (canManageOrg ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-300 group-hover:text-slate-400')
                }`}>
                  {t('dashboard.shell.fabAdmin')}
                </span>
              </button>
            </Link>

            {/* Suscripción FAB */}
            <Link to="/subscription">
              <button
                className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                data-testid="subscription-btn"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg hover:text-violet-600">
                  <CreditCard className="w-[18px] h-[18px] transition-transform duration-300 group-hover:text-violet-600" strokeWidth={1.8} />
                </div>
                <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-400 group-hover:text-violet-600 transition-colors duration-300">
                  {t('dashboard.shell.fabPlan')}
                </span>
              </button>
            </Link>

            {/* Cerrar sesión FAB */}
            <button
              onClick={handleLogout}
              className="group flex flex-col items-center gap-1 shrink-0 outline-none"
              data-testid="logout-btn"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg hover:text-red-500">
                <LogOut className="w-[18px] h-[18px] transition-transform duration-300 group-hover:text-red-500" strokeWidth={1.8} />
              </div>
              <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-400 group-hover:text-red-500 transition-colors duration-300">
                {t('dashboard.shell.fabLogout')}
              </span>
            </button>

            {/* Language Selector FAB */}
            <LanguageSelector variant="light" compact fabStyle />
          </div>
        </div>
      </div>

      {/* Main Content (with padding for fixed bar) */}
      <div className="pt-[64px] h-screen max-h-screen overflow-hidden">
        {/* Main Content - Full Width */}
        <div className="h-full overflow-hidden">
          <Suspense fallback={<SectionSkeleton />}>
            {renderMainContent()}
          </Suspense>
        </div>
      </div>
       </>
      ) : renderWhatsAppLayout()}

      {/* ====== BOTÓN AYUDA / TUTORIALES (contextual por módulo, ambos modos) ====== */}
      <HelpTutorialButton category={resolveTutorialCategory(activePanel, activeDataSection, currentSection)} />

      {/* ====== SHEET DE PLANES (Modo Clásico, abierto desde botón superior) ====== */}
      <Sheet open={isPlansSheetOpen} onOpenChange={setIsPlansSheetOpen}>
        <SheetContent side="left" className="p-0 w-[340px] sm:w-[360px] border-r-0" data-testid="plans-sheet">
          <PlanSidebar
            trainingPlans={trainingPlans}
            loadingPlans={loadingPlans}
            activePlan={activePlan}
            onSelectPlan={(plan) => { handleSetActivePlan(plan); setIsPlansSheetOpen(false); }}
            onDuplicatePlan={handleDuplicatePlan}
            onSharePlan={handleSharePlan}
            onDeletePlan={handleDeleteTrainingPlan}
            onExportPDF={handleExportPDF}
            onRefresh={fetchTrainingPlans}
            onCreatePlan={() => { setActiveDataSection('create-plan'); setIsPlansSheetOpen(false); }}
            getSportName={(id) => (allSports.find(s => s.id === id)?.name) || id}
            getModelName={resolveModelName}
            t={t}
          />
        </SheetContent>
      </Sheet>

      {/* ====== COACH AI FLOATING BUTTON (oculto en modo Pro) ====== */}
      {uiMode !== 'whatsapp' && (
      <button
        onClick={() => setIsCoachDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        data-testid="coach-ai-fab"
      >
        <Brain className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-10 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Coach AI
        </span>
      </button>
      )}

      {/* ====== COACH AI DRAWER ====== */}
      {isCoachDrawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsCoachDrawerOpen(false)}
          />

          {/* Drawer Panel — full Coach AI workspace */}
          <div
            className="fixed right-0 top-0 h-full w-[440px] max-w-[95vw] bg-gradient-to-b from-slate-50 to-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-slate-200"
            data-testid="coach-ai-drawer"
          >
            {/* Drawer Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-5 shrink-0 relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#CCFF00]/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#CCFF00]/15 border border-[#CCFF00]/40 rounded-2xl flex items-center justify-center shadow-lg shadow-[#CCFF00]/10">
                    <Brain className="w-6 h-6 text-[#CCFF00]" strokeWidth={2.2} />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl tracking-tight">Coach AI</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      <p className="text-[11px] text-slate-300 font-medium tracking-wide">{t('data.asistente_de_entrenamiento_en_linea')}</p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCoachDrawerOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-9 w-9 p-0 rounded-full"
                  data-testid="coach-ai-close"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Drawer Content — full chat area, no tabs */}
            <div className="flex-grow overflow-hidden flex flex-col bg-white">
              <AITrainingAssistant
                selectedAthlete={athletes.find(a => a.id === selectedAthleteId)}
                sportsCatalog={sportsCatalog}
              />
            </div>

            {/* Drawer Footer — minimal user info */}
            <div className="border-t border-slate-200 bg-white px-4 py-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(() => { const r = USER_ROLES.find(r => r.id === user?.role); return r ? t(r.nameKey, { defaultValue: r.name }) : (user?.role || 'Usuario'); })()}
                  </p>
                </div>
                {activePlan && (
                  <div className="flex items-center gap-1.5 text-[8px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                    <CheckCircle className="w-3 h-3" />{t('data.plan_activo_2')}</div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        athleteId={selectedAthleteId}
        athleteName={athletes.find(a => a.id === selectedAthleteId)?.name}
        periodizationData={periodizationData}
      />

      {/* Master Report PDF Modal */}
      <MasterReportModal
        open={isMasterReportOpen}
        onOpenChange={setIsMasterReportOpen}
        plan={activePlan}
        athleteName={athletes.find(a => a.id === selectedAthleteId)?.name || ''}
        coachName={user?.full_name || user?.name || ''}
      />

      {/* Sessions Export Modal — selector + PDF combinado / ZIP individual */}
      <SessionsExportModal
        open={isSessionsExportOpen}
        onOpenChange={setIsSessionsExportOpen}
        plan={activePlan}
        athleteName={athletes.find(a => a.id === selectedAthleteId)?.name || ''}
      />

      {/* Athlete Portal — enlace público + cuenta del atleta */}
      <AthletePortalShareModal
        open={isAthletePortalOpen}
        onOpenChange={setIsAthletePortalOpen}
        plan={activePlan}
        athletes={athletes}
      />

      {/* Resumen semanal del coach */}
      <WeeklySummaryModal
        open={summaryOpen}
        onOpenChange={setSummaryOpen}
        summary={weeklySummary}
      />
    </div>
  );
};

export default DashboardPage;
