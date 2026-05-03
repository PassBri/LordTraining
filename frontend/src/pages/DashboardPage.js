import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { getDashboardStats, getAthletes, seedExercises, getTournaments, createTournament, deleteTournament, getTournament, addTournamentCategory, registerParticipant, generateBracket, getTournamentMatches, updateMatchScore, exportTournamentPDF, getTeams as fetchTeamsApi } from '../services/api';
import { 
  Target, Send, Heart, Zap, Brain, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  FileText, Users, Clipboard, Calendar, Award, BookOpen, 
  Activity, BarChart, LineChart, Loader2, LogOut, Save, Download, Layers, Plus, Dumbbell,
  Shield, UserCheck, User, UserCircle, UserPlus, Settings, LayoutDashboard, Landmark,
  Building2, Building, GraduationCap, Trophy, Timer, Flame, Gamepad2, Lightbulb, X, Trash2,
  Medal, MapPin, LayoutGrid, GitBranch, Share2, History, Filter, CreditCard, Sparkles,
  AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Clock, Edit, Copy, Printer, Gauge, Wrench,
  Stethoscope, CalendarDays, ClipboardList, Calculator, UsersRound, ListChecks, PieChart, MessageCircle, Link as LinkIcon, ArrowRight
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '../components/LanguageSelector';
import PreviousPlanAnalysis from '../components/PreviousPlanAnalysis';
import BrandLogo from '../components/BrandLogo';
import PeriodizationModelsManager from '../components/PeriodizationModelsManager';
import PDITechnicalSheet from '../components/PDITechnicalSheet';
import SessionPlanning from '../components/SessionPlanning';

import HealthRecords from '../components/HealthRecords';
import CompetitionAnalysis from '../components/CompetitionAnalysis';
import TrainingStages from '../components/TrainingStages';
import PeriodizationModels from '../components/PeriodizationModels';
import ComprehensiveTrainingPlanner from '../components/ComprehensiveTrainingPlanner';
import TrainingMethods from '../components/TrainingMethods';
import AnthropometricData from '../components/AnthropometricData';
import TestEvaluations from '../components/TestEvaluations';
import TrainingLoad from '../components/TrainingLoad';
import GraphicPlan from '../components/GraphicPlan';
import AthleteSummary from '../components/AthleteSummary';
import PeriodizationPlanner from '../components/PeriodizationPlanner';
import ExerciseLibrary from '../components/ExerciseLibrary';

import PeriodizationWizard from '../components/PeriodizationWizard';
import PeriodizationComplete from '../components/PeriodizationComplete';
import InfoSectionHeader from '../components/InfoSectionHeader';
import CoachesManager from '../components/CoachesManager';
import PlanStaffPanel from '../components/PlanStaffPanel';
import PlansList from '../components/PlansList';
import EntityManager from '../components/EntityManager';
import TeamManager from '../components/TeamManager';
import EvaluationSection from '../components/EvaluationSection';
import ControlPanel from '../components/ControlPanel';
import EntityDashboard from '../components/EntityDashboard';
import SmartAlerts from '../components/SmartAlerts';
import PDFExportModal from '../components/PDFExportModal';
import ObjectivesIndicators from '../components/ObjectivesIndicators';
import TrainingSystemHub from '../components/TrainingSystemHub';
import TournamentManager from '../components/TournamentManager';
import AutoTestingSystem from '../components/AutoTestingSystem';
import AITrainingAssistant from '../components/AITrainingAssistant';
import PlanSidebar from '../components/PlanSidebar';
import TrainingControl from '../components/TrainingControl';
import LoadMetricsDashboard from '../components/LoadMetricsDashboard';
import { Badge } from '../components/ui/badge';

import TacticalBoardSection from '../components/TacticalBoardSection';

// Definición de roles disponibles
const USER_ROLES = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema', icon: Shield },
  { id: 'coach', name: 'Entrenador', description: 'Puede crear planes para múltiples atletas', icon: UserCheck },
  { id: 'personal_trainer', name: 'Entrenador Personal', description: 'Enfocado en clientes individuales', icon: Dumbbell },
  { id: 'athlete', name: 'Atleta', description: 'Solo puede ver su propio plan', icon: User },
  { id: 'team', name: 'Equipo', description: 'Grupo de atletas con plan compartido', icon: Users },
  { id: 'user', name: 'Usuario', description: 'Rol básico sin atletas asignados', icon: UserCircle }
];

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // UI State
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState('panel');
  const [activeDataSection, setActiveDataSection] = useState(null); // null = welcome state in datos
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
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
  
  // Sports Catalog State
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🏆', color: '#3B82F6' });
  const [newSport, setNewSport] = useState({ name: '', category_id: '', icon: '🏃' });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSport, setShowAddSport] = useState(null); // category_id or null
  const [editingSportId, setEditingSportId] = useState(null);
  const [editingSportCharacterization, setEditingSportCharacterization] = useState({});

  // Sport-specific emoji mapping
  const sportIcons = {
    'boxeo': '🥊', 'boxing': '🥊',
    'taekwondo': '🥋', 'karate': '🥋', 'judo': '🥋', 'artes marciales': '🥋',
    'wrestling': '🤼', 'lucha': '🤼', 'lucha libre': '🤼',
    'atletismo': '🏃‍♂️', 'track': '🏃‍♂️',
    'natación': '🏊', 'swimming': '🏊', 'natacion': '🏊',
    'fútbol': '⚽', 'futbol': '⚽', 'soccer': '⚽', 'football': '⚽',
    'básquetbol': '🏀', 'baloncesto': '🏀', 'basketball': '🏀', 'basquetbol': '🏀',
    'tenis': '🎾', 'tennis': '🎾', 'tenis de mesa': '🏓', 'ping pong': '🏓',
    'ciclismo': '🚴', 'cycling': '🚴',
    'voleibol': '🏐', 'volleyball': '🏐', 'voley': '🏐',
    'béisbol': '⚾', 'baseball': '⚾', 'beisbol': '⚾', 'softball': '🥎',
    'golf': '⛳',
    'rugby': '🏉',
    'hockey': '🏒', 'hockey sobre hielo': '🏒', 'hockey hierba': '🏑',
    'gimnasia': '🤸', 'gymnastics': '🤸', 'gimnasia artística': '🤸', 'gimnasia rítmica': '🤸',
    'esgrima': '🤺', 'fencing': '🤺',
    'halterofilia': '🏋️', 'weightlifting': '🏋️', 'powerlifting': '🏋️', 'levantamiento de pesas': '🏋️',
    'balonmano': '🤾', 'handball': '🤾',
    'waterpolo': '🤽', 'polo acuático': '🤽',
    'remo': '🚣', 'rowing': '🚣', 'canotaje': '🛶', 'kayak': '🛶',
    'esquí': '⛷️', 'ski': '⛷️', 'esqui': '⛷️',
    'patinaje': '⛸️', 'skating': '⛸️', 'patinaje artístico': '⛸️',
    'triatlón': '🏊‍♂️', 'triatlon': '🏊‍♂️', 'triathlon': '🏊‍♂️',
    'maratón': '🏅', 'maraton': '🏅', 'marathon': '🏅',
    'surf': '🏄', 'surfing': '🏄',
    'escalada': '🧗', 'climbing': '🧗',
    'tiro con arco': '🏹', 'archery': '🏹',
    'equitación': '🏇', 'horse riding': '🏇', 'equitacion': '🏇',
    'badminton': '🏸', 'bádminton': '🏸',
    'snowboard': '🏂',
    'cricket': '🏏',
    'polo': '🏇',
    'vela': '⛵', 'sailing': '⛵',
    'buceo': '🤿', 'diving': '🤿',
    'crossfit': '💪', 'fitness': '💪',
    'mma': '🥊', 'artes marciales mixtas': '🥊',
  };
  const getSportIcon = (sport) => {
    if (sport.icon && sport.icon !== '🏃') return sport.icon;
    const key = sport.name?.toLowerCase().trim();
    return sportIcons[key] || '🏃‍♂️';
  };

  
  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Filters Dropdown State
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // ====== COACH AI DRAWER STATE ======
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);
  const [coachDrawerTab, setCoachDrawerTab] = useState('coach'); // 'coach' or 'history'
  const [generatedPlans, setGeneratedPlans] = useState([]); // List of generated plans

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

  // ====== GLOBAL CONTEXT STATE (Barra Superior) ======
  // Initialize from localStorage for persistence
  const [globalContext, setGlobalContext] = useState(() => {
    const saved = localStorage.getItem('train_global_context');
    return saved ? JSON.parse(saved) : {
      entityId: 'all',
      teamId: 'all',
      athleteId: 'all',
      sportId: 'all'
    };
  });

  // Save context to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('train_global_context', JSON.stringify(globalContext));
  }, [globalContext]);

  // Cascading filter handlers
  const handleEntityChange = (value) => {
    setGlobalContext({ entityId: value, teamId: 'all', athleteId: 'all', sportId: 'all' });
  };

  const handleTeamChange = (value) => {
    setGlobalContext(prev => ({ ...prev, teamId: value, athleteId: 'all' }));
  };

  const handleAthleteChange = (value) => {
    setGlobalContext(prev => ({ ...prev, athleteId: value }));
  };

  const handleSportChange = (value) => {
    setGlobalContext(prev => ({ ...prev, sportId: value }));
  };

  // Filtered data based on context
  const filteredTeams = globalContext.entityId === 'all' 
    ? teams 
    : teams.filter(t => t.federation === globalContext.entityId || t.club === globalContext.entityId);
  
  const filteredAthletes = athletes.filter(a => {
    if (globalContext.entityId !== 'all' && a.federation !== globalContext.entityId && a.club !== globalContext.entityId) return false;
    if (globalContext.teamId !== 'all' && a.team_id !== globalContext.teamId) return false;
    return true;
  });

  // Get unique sports from catalog
  const allSports = sportsCatalog.flatMap(cat => cat.sports || []);

  // Load generated plans from localStorage on mount
  useEffect(() => {
    const savedPlans = localStorage.getItem('train_generated_plans');
    if (savedPlans) {
      setGeneratedPlans(JSON.parse(savedPlans));
    }
  }, []);

  // Save a new generated plan
  const saveGeneratedPlan = (plan) => {
    const newPlan = {
      id: Date.now().toString(),
      ...plan,
      createdAt: new Date().toISOString()
    };
    const updatedPlans = [newPlan, ...generatedPlans];
    setGeneratedPlans(updatedPlans);
    localStorage.setItem('train_generated_plans', JSON.stringify(updatedPlans));
    return newPlan;
  };

  // Delete a plan
  const deletePlan = (planId) => {
    const updatedPlans = generatedPlans.filter(p => p.id !== planId);
    setGeneratedPlans(updatedPlans);
    localStorage.setItem('train_generated_plans', JSON.stringify(updatedPlans));
  };

  // Start new plan creation
  const handleNewPlan = () => {
    setIsCoachDrawerOpen(true);
    setCoachDrawerTab('coach');
    toast.info('Usa el Coach AI para ayudarte a planificar');
  };

  // Tournaments State - Load from API
  const [tournaments, setTournaments] = useState([]);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetailView, setTournamentDetailView] = useState(false);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [tournamentForm, setTournamentForm] = useState({
    name: '', description: '', sport: '', format: 'single_elimination',
    start_date: '', end_date: '', venue: '', city: '', scoring_system: 'standard',
    points_win: 3, points_draw: 1, points_loss: 0, primary_color: '#3B82F6', secondary_color: '#10B981'
  });
  
  // Fetch tournaments from API
  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tournaments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) { setTournaments(await response.json()); }
    } catch (error) { console.error('Error fetching tournaments:', error); }
  };

  useEffect(() => { fetchTournaments(); }, []);

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
  
  const [categoryDialogOpenTournament, setCategoryDialogOpenTournament] = useState(false);
  const [tournamentCategoryForm, setTournamentCategoryForm] = useState({ name: '', gender: '', max_participants: '' });
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournamentCategory, setSelectedTournamentCategory] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({ participant_type: 'team', participant_id: '', participant_name: '', seed: '' });
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ participant1_score: '', participant2_score: '' });

  // Tournament constants
  const TOURNAMENT_FORMATS = [
    { value: 'single_elimination', label: 'Eliminación Directa', icon: '🏆' },
    { value: 'double_elimination', label: 'Doble Eliminación', icon: '🔄' },
    { value: 'round_robin', label: 'Todos contra Todos', icon: '🔁' },
    { value: 'group_stage_knockout', label: 'Grupos + Eliminación', icon: '📊' },
    { value: 'league', label: 'Liga', icon: '📈' },
  ];
  const STATUS_COLORS = { draft: 'bg-slate-100 text-slate-700', registration: 'bg-blue-100 text-blue-700', in_progress: 'bg-green-100 text-green-700', completed: 'bg-purple-100 text-purple-700' };
  const STATUS_LABELS = { draft: 'Borrador', registration: 'Inscripciones', in_progress: 'En Curso', completed: 'Finalizado' };

  // API Base URL
  const API_URL = process.env.REACT_APP_BACKEND_URL;

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
      toast.error('Selecciona un plan primero');
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
      toast.error('Error al guardar');
    }
    setSavingEvaluation(false);
  };

  // Guardar análisis del plan anterior
  const handleSavePreviousAnalysis = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
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
      if (res.ok) toast.success('Análisis del plan anterior guardado');
      else toast.error('Error al guardar análisis');
    } catch (error) {
      toast.error('Error al guardar análisis');
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
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
    if (aiSelectedModels.length === 0) {
      toast.error('Selecciona al menos un modelo de periodización');
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
        toast.success('Análisis cargado desde caché');
      } else {
        toast.success(`Análisis generado con ${aiGapProvider === 'openai' ? 'GPT-5.2' : 'Claude Sonnet 4.5'}`);
      }
    } catch (error) {
      toast.error('Error generando análisis con IA');
    } finally {
      setAiGapLoading(false);
    }
  };

  // Descargar PDF del plan anterior (estilo whitepaper)
  const handleDownloadPreviousAnalysisPDF = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
    try {
      // Guardar primero para asegurar que los datos están al día
      await handleSavePreviousAnalysis();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis/${activePlan.id}/pdf`, {
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
      toast.error('Error al descargar PDF');
    }
  };

  // Crear link de compartición y copiar al portapapeles
  const handleSharePreviousAnalysisLink = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
    try {
      await handleSavePreviousAnalysis();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/previous-analysis/${activePlan.id}/share`, {
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
      toast.error('Error al crear enlace');
      return null;
    }
  };

  // Compartir por WhatsApp
  const handleShareWhatsApp = async () => {
    const url = await handleSharePreviousAnalysisLink();
    if (!url) return;
    const planName = activePlan?.name || 'el plan';
    const msg = encodeURIComponent(
      `📊 Análisis del Plan Anterior — ${planName}\n\nTe comparto el análisis retrospectivo del plan de entrenamiento generado con iTrain:\n\n${url}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  // Guardar objetivos del plan
  const handleSaveObjectives = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
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
      if (res.ok) toast.success('Objetivos del plan guardados');
      else toast.error('Error al guardar objetivos');
    } catch (error) {
      toast.error('Error al guardar objetivos');
    }
    setSavingEvaluation(false);
  };

  // ====== Plan Activo: PDF / Share / WhatsApp ======
  const handleDownloadObjectivesPDF = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return; }
    try {
      await handleSaveObjectives();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/objectives/${activePlan.id}/pdf`, {
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
      toast.error('Error al descargar PDF');
    }
  };

  const handleShareObjectivesLink = async () => {
    if (!activePlan) { toast.error('Selecciona un plan primero'); return null; }
    try {
      await handleSaveObjectives();
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/plan-data/objectives/${activePlan.id}/share`, {
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
      toast.error('Error al crear enlace');
      return null;
    }
  };

  const handleShareObjectivesWhatsApp = async () => {
    const publicUrl = await handleShareObjectivesLink();
    if (!publicUrl) return;
    const planName = activePlan?.name || 'Plan Activo';
    const text = encodeURIComponent(`Plan Activo · ${planName}\n\nObjetivos del ciclo y aspectos de preparación:\n${publicUrl}\n\nGenerado por iTrain.app`);
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
      toast.success('Plan eliminado');
      
      // Si era el plan activo, limpiarlo
      if (activePlan?.id === planId) {
        handleSetActivePlan(null);
      }
      
      fetchTrainingPlans();
    } catch (error) {
      toast.error('Error al eliminar plan');
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
        toast.error('Error al duplicar');
      }
    } catch (error) {
      toast.error('Error al duplicar plan');
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
        toast.error('Error al compartir');
      }
    } catch (error) {
      toast.error('Error al compartir plan');
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
        toast.error('Error al exportar PDF');
      }
    } catch (error) {
      toast.error('Error al exportar PDF');
    }
  };

  // Fetch Sports Catalog
  const fetchSportsCatalog = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/catalog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSportsCatalog(data);
      }
    } catch (error) {
      console.error('Error fetching sports catalog:', error);
    }
  };

  // Create Sport Category
  const handleCreateCategory = async () => {
    if (!newCategory.name) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCategory)
      });
      if (response.ok) {
        await fetchSportsCatalog();
        setNewCategory({ name: '', icon: '🏆', color: '#3B82F6' });
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  // Create Sport
  const handleCreateSport = async (categoryId) => {
    if (!newSport.name) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newSport.name, category_id: categoryId })
      });
      if (response.ok) {
        await fetchSportsCatalog();
        setNewSport({ name: '', category_id: '' });
        setShowAddSport(null);
      }
    } catch (error) {
      console.error('Error creating sport:', error);
    }
  };

  // Delete Sport
  const handleDeleteSport = async (sportId) => {
    if (!window.confirm('¿Eliminar este deporte?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/sports/${sportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchSportsCatalog();
    } catch (error) {
      console.error('Error deleting sport:', error);
    }
  };

  // Save Sport Characterization (technical characterization)
  const handleSaveSportCharacterization = async (sportId, characterization) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/${sportId}/characterization`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ characterization })
      });
      if (response.ok) {
        await fetchSportsCatalog();
        toast.success('Caracterización técnica guardada');
      }
    } catch (error) {
      console.error('Error saving sport characterization:', error);
      toast.error('Error al guardar la caracterización');
    }
  };

  // Delete Category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('¿Eliminar esta categoría y todos sus deportes?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/sports/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchSportsCatalog();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Fetch tournaments
  const fetchTournamentsData = async () => {
    try {
      const res = await getTournaments();
      setTournaments(res.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchTournamentDetails = async (tournamentId) => {
    try {
      const [tournamentRes, matchesRes] = await Promise.all([
        getTournament(tournamentId),
        getTournamentMatches(tournamentId)
      ]);
      setSelectedTournament(tournamentRes.data);
      setTournamentMatches(matchesRes.data);
      setTournamentDetailView(true);
    } catch (error) {
      toast.error('Error al cargar torneo');
    }
  };

  const handleCreateTournament = async () => {
    if (!tournamentForm.name) return;
    try {
      await createTournament({ ...tournamentForm, categories: [] });
      toast.success('Torneo creado');
      setTournamentDialogOpen(false);
      setTournamentForm({ name: '', description: '', sport: '', format: 'single_elimination', start_date: '', end_date: '', venue: '', city: '', scoring_system: 'standard', points_win: 3, points_draw: 1, points_loss: 0, primary_color: '#3B82F6', secondary_color: '#10B981' });
      fetchTournamentsData();
    } catch (error) {
      toast.error('Error al crear torneo');
    }
  };

  const handleDeleteTournament = async (id, name) => {
    if (!window.confirm(`¿Eliminar el torneo "${name}"?`)) return;
    try {
      await deleteTournament(id);
      toast.success('Torneo eliminado');
      fetchTournamentsData();
    } catch (error) {
      toast.error('Error al eliminar torneo');
    }
  };

  const handleAddTournamentCategory = async () => {
    if (!selectedTournament || !tournamentCategoryForm.name) return;
    try {
      await addTournamentCategory(selectedTournament.id, {
        name: tournamentCategoryForm.name,
        gender: tournamentCategoryForm.gender || null,
        max_participants: tournamentCategoryForm.max_participants ? parseInt(tournamentCategoryForm.max_participants) : null
      });
      toast.success('Categoría añadida');
      setCategoryDialogOpenTournament(false);
      setTournamentCategoryForm({ name: '', gender: '', max_participants: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al añadir categoría');
    }
  };

  const handleRegisterParticipant = async () => {
    if (!selectedTournament || !selectedTournamentCategory || !registrationForm.participant_id) return;
    try {
      await registerParticipant(selectedTournament.id, selectedTournamentCategory.id, {
        participant_type: registrationForm.participant_type,
        participant_id: registrationForm.participant_id,
        participant_name: registrationForm.participant_name,
        seed: registrationForm.seed ? parseInt(registrationForm.seed) : null
      });
      toast.success('Participante inscrito');
      setRegisterDialogOpen(false);
      setRegistrationForm({ participant_type: 'team', participant_id: '', participant_name: '', seed: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al inscribir');
    }
  };

  const handleGenerateBracket = async (categoryId) => {
    if (!selectedTournament) return;
    try {
      await generateBracket(selectedTournament.id, categoryId);
      toast.success('Bracket generado');
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al generar bracket');
    }
  };

  const handleUpdateScore = async () => {
    if (!selectedTournament || !selectedMatch) return;
    try {
      await updateMatchScore(selectedTournament.id, selectedMatch.id, {
        participant1_score: parseInt(scoreForm.participant1_score) || 0,
        participant2_score: parseInt(scoreForm.participant2_score) || 0,
        status: 'completed'
      });
      toast.success('Resultado actualizado');
      setScoreDialogOpen(false);
      setScoreForm({ participant1_score: '', participant2_score: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al actualizar resultado');
    }
  };

  const getFormatIcon = (format) => TOURNAMENT_FORMATS.find(f => f.value === format)?.icon || '🏆';

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
        toast.error('Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
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
        toast.success('Atleta creado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al crear atleta');
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast.error('Error al crear atleta');
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

  // Navigation items for "Datos" panel - ESTRUCTURA JERÁRQUICA DEL PLAN DE ENTRENAMIENTO
  // Basado en la metodología científica de planificación deportiva (Padilla, Matveiev, etc.)
  const navItems = [
    // === 0. GESTIÓN DE PLANES (PRIMERA OPCIÓN) ===
    { id: 'plan-manager', label: t('dashboard.plans.title'), icon: Clipboard, section: 'planes' },
    
    // === 1. DIAGNÓSTICO / PUNTO DE PARTIDA ===
    { id: 'prev-plan', label: 'Plan Anterior', icon: History, section: 'punto-partida' },
    { id: 'objectives', label: t('dashboard.controlPanel.activePlan'), icon: Target, section: 'punto-partida' },
    
    // === 2. INFORMACIÓN BASE ===
    { id: 'entities', label: 'Entidades', icon: Building2, section: 'informacion' },
    { id: 'teams', label: 'Equipos', icon: UsersRound, section: 'informacion' },
    { id: 'athletes', label: t('dashboard.controlPanel.athletes'), icon: User, section: 'informacion' },
    { id: 'sports', label: 'Deportes', icon: Medal, section: 'informacion' },
    { id: 'tournaments', label: 'Torneos', icon: Shield, section: 'informacion' },
    { id: 'coaches', label: 'Entrenadores', icon: UserCheck, section: 'informacion' },
    
    // === 3. EVALUACIÓN / CONTROLES ===
    { id: 'control-medical', label: 'Control Médico', icon: Stethoscope, section: 'evaluacion' },
    { id: 'control-anthropometric', label: 'Antropometría', icon: LineChart, section: 'evaluacion' },
    { id: 'control-physical', label: 'Control Físico', icon: Dumbbell, section: 'evaluacion' },
    { id: 'control-biomechanical', label: 'Biomecánica', icon: Activity, section: 'evaluacion' },
    { id: 'control-technical', label: 'Control Técnico', icon: Target, section: 'evaluacion' },
    { id: 'control-tactical', label: 'Control Táctico', icon: Layers, section: 'evaluacion' },
    { id: 'control-psychological', label: 'Control Psicológico', icon: Brain, section: 'evaluacion' },
    { id: 'control-theoretical', label: 'Control Teórico', icon: BookOpen, section: 'evaluacion' },
    
    // === 4. COMPETENCIAS ===
    { id: 'events', label: t('dashboard.sections.competitions'), icon: Award, section: 'competencias' },
    { id: 'competitions', label: t('dashboard.sections.competitions'), icon: ListChecks, section: 'competencias' },
    
    // === 5. PERIODIZACIÓN (sub-secciones directas sin tab intermedio) ===
    { id: 'period-overview', label: 'Resumen', icon: Gauge, section: 'periodizacion' },
    { id: 'period-structure', label: 'Estructura', icon: LayoutGrid, section: 'periodizacion' },
    { id: 'period-tests', label: 'Evaluaciones', icon: ClipboardList, section: 'periodizacion' },
    { id: 'period-load', label: 'Carga', icon: Flame, section: 'periodizacion' },
    { id: 'period-control', label: 'Control', icon: TrendingUp, section: 'periodizacion' },
    
    // === 6. VISUALIZACIÓN ===
    { id: 'graphic-plan', label: t('dashboard.sections.visualization'), icon: PieChart, section: 'visualizacion' },
    { id: 'calendar-view', label: 'Calendario', icon: CalendarDays, section: 'visualizacion' },
    { id: 'smart-alerts', label: 'Alertas', icon: Zap, section: 'visualizacion' },
    
    // === 7. HERRAMIENTAS ===
    { id: 'calculators', label: t('dashboard.nav.calculators'), icon: Calculator, section: 'herramientas' },
    { id: 'pdi-sheet', label: 'iTrain PDI', icon: Brain, section: 'herramientas' },
    { id: 'periodization-models', label: 'Modelos', icon: Layers, section: 'herramientas' },
    { id: 'exercises', label: 'Métodos', icon: Timer, section: 'herramientas' },
    { id: 'exercises-lib', label: t('dashboard.controlPanel.exercises'), icon: Dumbbell, section: 'herramientas' },
    { id: 'tactical-board', label: 'Pizarra Tactica', icon: LayoutGrid, section: 'herramientas' },
    { id: 'ai-generator', label: 'AI', icon: Sparkles, section: 'herramientas' },
  ];

  // ====== PLAN SECTIONS & COLORS (top-level for top bar integration) ======
  const planSections = [
    { key: 'punto-partida', title: t('dashboard.sections.diagnosis'), color: 'rose', icon: Clipboard },
    { key: 'informacion', title: t('dashboard.sections.information'), color: 'indigo', icon: Users },
    { key: 'evaluacion', title: t('dashboard.sections.evaluation'), color: 'emerald', icon: Heart },
    { key: 'competencias', title: t('dashboard.sections.competitions'), color: 'violet', icon: Trophy },
    { key: 'periodizacion', title: t('dashboard.sections.periodization'), color: 'cyan', icon: Calendar },
    { key: 'visualizacion', title: t('dashboard.sections.visualization'), color: 'amber', icon: BarChart },
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
    fetchSportsCatalog();
    fetchTournamentsData();
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
                                {plan.total_weeks} sem
                              </span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full truncate max-w-[100px]">
                                {plan.model_name || plan.model}
                              </span>
                              {plan.sport && (
                                <span className="text-xs text-slate-500 truncate">{plan.sport}</span>
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
    const sectionsWithoutPlan = ['athletes', 'entities', 'training-system', 'exercises-lib', 'ai-generator', 'calculators', 'periodization-models', 'pdi-sheet', 'tactical-board', 'create-plan', 'period-overview', 'period-structure', 'period-tests', 'period-load', 'period-control'];
    
    if (!activePlan && !sectionsWithoutPlan.includes(activeDataSection)) {
      // Mostrar mensaje de que se necesita seleccionar un plan
      return (
        <div className="h-full flex items-center justify-center bg-[#fafaf8] p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Selecciona un Plan</h2>
            <p className="text-slate-500 text-sm mb-6">
              Para acceder a esta sección necesitas tener un plan de entrenamiento activo. 
              Los datos se guardarán asociados al plan seleccionado.
            </p>
            <Button
              onClick={() => setActiveDataSection(null)}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Seleccionar Plan
            </Button>
          </div>
        </div>
      );
    }

    // ====== HAY PLAN ACTIVO O SECCIÓN SIN PLAN - MOSTRAR CONTENIDO ======
    if (!activeDataSection) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
          <p className="text-slate-400 text-lg">Selecciona una sección del menú para ver los detalles</p>
          
          {/* Card del Plan Activo */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 max-w-lg w-full shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center">
                <Clipboard className="w-6 h-6 text-[#CCFF00]" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Plan Activo</p>
                <h3 className="font-bold text-lg text-slate-800">{activePlan.name}</h3>
                <p className="text-sm text-slate-500">
                  {activePlan.total_weeks} semanas • {activePlan.model_name || activePlan.model}
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
          
          {/* Selector de Atleta */}
          {athletes.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Atleta:</span>
              <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Seleccionar atleta" />
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
            subtitle="Plantilla de atletas registrados · perfiles deportivos"
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
                      <Trophy className="w-5 h-5" />
                      Catálogo de Deportes
                    </div>
                    <Button 
                      size="sm"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                      onClick={() => setShowAddCategory(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nueva Categoría
                    </Button>
                  </div>
                </div>
                <CardContent className="p-5">
                  {/* Add Category Form */}
                  {showAddCategory && (
                    <div className="mb-5 p-4 bg-amber-50 border border-slate-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-amber-900">Nueva Categoría</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3 items-end">
                        <Input 
                          placeholder="Nombre de categoría" 
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
                        <Button onClick={handleCreateCategory} className="bg-slate-900 hover:bg-slate-800">
                          Crear
                        </Button>
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
                                placeholder="Nuevo deporte" 
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
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar deporte
                            </Button>
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
                    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tournaments`, {
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
                    if (res.ok) { fetchTournaments(); toast.success('Torneo creado'); }
                    else { const err = await res.json(); toast.error(err.detail || 'Error al crear torneo'); }
                  } catch (e) { toast.error('Error al crear torneo'); }
                }}
                onUpdateTournament={async (id, updatedData) => {
                  try {
                    const token = localStorage.getItem('train_token');
                    const existing = tournaments.find(t => t.id === id);
                    const merged = { ...existing, ...updatedData };
                    await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tournaments/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                      body: JSON.stringify(merged)
                    });
                    fetchTournaments();
                  } catch (e) { console.error('Error updating tournament:', e); }
                }}
                onDeleteTournament={async (id) => {
                  try {
                    const token = localStorage.getItem('train_token');
                    const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/tournaments/${id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) { fetchTournaments(); toast.success('Torneo eliminado'); }
                  } catch (e) { toast.error('Error al eliminar torneo'); }
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
                    <span className={`text-[10px] max-w-[48px] truncate font-medium transition-colors ${
                      selectedAthleteId === athlete.id ? 'text-[#1565C0]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {athlete.name?.split(' ')[0]}
                    </span>
                  </button>
                ))}
                {filteredAthletes.length === 0 && (
                  <span className="text-sm text-slate-400 italic py-2">Sin atletas</span>
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
                  title="Agregar nuevo atleta"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-400">{athletes.length}</span>
              </div>
            </div>

            {/* Collapsible New Athlete Form */}
            {showAddAthleteForm && (
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-4">
                <div className="max-w-4xl mx-auto">
                  <h4 className="font-semibold mb-3 text-slate-700 text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Registrar Nuevo Atleta
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input placeholder="Nombre completo" className="h-9 text-sm border-slate-200" value={newAthlete.name} onChange={(e) => setNewAthlete({...newAthlete, name: e.target.value})} data-testid="new-athlete-name" />
                    <Input placeholder="Email" type="email" className="h-9 text-sm border-slate-200" value={newAthlete.email} onChange={(e) => setNewAthlete({...newAthlete, email: e.target.value})} />
                    <Input placeholder="Fecha nacimiento" type="date" className="h-9 text-sm border-slate-200" value={newAthlete.birthDate} onChange={(e) => setNewAthlete({...newAthlete, birthDate: e.target.value})} />
                    <Select value={newAthlete.gender} onValueChange={(v) => setNewAthlete({...newAthlete, gender: v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue placeholder="Género" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.sport} onValueChange={(v) => setNewAthlete({...newAthlete, sport: v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue placeholder="Deporte" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="football">Fútbol</SelectItem>
                        <SelectItem value="athletics">Atletismo</SelectItem>
                        <SelectItem value="swimming">Natación</SelectItem>
                        <SelectItem value="cycling">Ciclismo</SelectItem>
                        <SelectItem value="basketball">Baloncesto</SelectItem>
                        <SelectItem value="tennis">Tenis</SelectItem>
                        <SelectItem value="crossfit">CrossFit</SelectItem>
                        <SelectItem value="weightlifting">Levantamiento</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Categoría" className="h-9 text-sm border-slate-200" value={newAthlete.category} onChange={(e) => setNewAthlete({...newAthlete, category: e.target.value})} />
                    <Select value={newAthlete.level} onValueChange={(v) => setNewAthlete({...newAthlete, level: v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200"><SelectValue placeholder="Nivel" /></SelectTrigger>
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
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white"><SelectValue placeholder="Federación" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin federación</SelectItem>
                        {entityFederations.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.club || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, club: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white"><SelectValue placeholder="Club" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin club</SelectItem>
                        {entityClubs.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.school || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, school: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white"><SelectValue placeholder="Escuela" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin escuela</SelectItem>
                        {entitySchools.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <Select value={newAthlete.team_id || 'none'} onValueChange={(v) => setNewAthlete({...newAthlete, team_id: v === 'none' ? '' : v})}>
                      <SelectTrigger className="h-9 text-sm border-slate-200 bg-white" data-testid="athlete-team-select"><SelectValue placeholder="Equipo" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin equipo</SelectItem>
                        {teams.map(t => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {entities.length === 0 && (
                      <p className="text-xs text-slate-500">Crea entidades en <strong>Organización</strong> para afiliar atletas</p>
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
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <User className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-lg">Selecciona un atleta</p>
                  <p className="text-sm text-slate-400 mt-1">Haz clic en uno de los círculos de arriba para ver su perfil completo</p>
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
            subtitle="Equipos deportivos · plantillas · staff técnico"
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
            title="Deportes"
            subtitle="Catálogo de deportes con caracterización técnica"
            icon={Medal}
            color="#EF4444"
            onRefresh={fetchSportsCatalog}
          />
          <div className="space-y-4">
            <Card className="border-0 shadow-md overflow-hidden">
              <div className="bg-white border-b border-slate-200 text-slate-900 py-4 px-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Trophy className="w-5 h-5" />
                    Catálogo de Deportes
                  </div>
                  <Button 
                    size="sm"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                    onClick={() => setShowAddCategory(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Nueva Categoría
                  </Button>
                </div>
              </div>
              <CardContent className="p-5">
                {/* Add Category Form */}
                {showAddCategory && (
                  <div className="mb-5 p-4 bg-amber-50 border border-slate-200 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-amber-900">Nueva Categoría</h4>
                      <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-3 items-end">
                      <Input 
                        placeholder="Nombre de categoría" 
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
                      <Button onClick={handleCreateCategory} className="bg-slate-900 hover:bg-slate-800">
                        Crear
                      </Button>
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
                            <Plus className="w-4 h-4 mr-1" />
                            Agregar Deporte
                          </Button>
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
                              placeholder="Nombre del deporte" 
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
                            >
                              Crear
                            </Button>
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
                                        <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: ringColor }}>
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
                                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>Caracterización guardada</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 text-[10px] font-medium text-slate-400 italic">
                                        <FileText className="w-3 h-3" />
                                        <span>Sin caracterizar</span>
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
                                        title="Editar Caracterización Técnica"
                                        data-testid={`sport-edit-${sport.id}`}
                                      >
                                        <FileText className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                        onClick={() => handleDeleteSport(sport.id)}
                                        title="Eliminar deporte"
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
                          <p className="text-center text-slate-400 py-4">Sin deportes en esta categoría</p>
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
                              <h3 className="font-bold text-lg">Caracterización Técnica</h3>
                              <p className="text-sm text-blue-100">Define los parámetros técnicos del deporte</p>
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
                            <Label className="text-sm font-medium text-slate-700">Tipo de Deporte</Label>
                            <Select 
                              value={editingSportCharacterization.type || ''} 
                              onValueChange={(v) => setEditingSportCharacterization({...editingSportCharacterization, type: v})}
                            >
                              <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Individual</SelectItem>
                                <SelectItem value="colectivo">Colectivo</SelectItem>
                                <SelectItem value="combate">Combate</SelectItem>
                                <SelectItem value="precision">Precisión</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-slate-700">Sistema Energético Predominante</Label>
                            <Select 
                              value={editingSportCharacterization.energySystem || ''} 
                              onValueChange={(v) => setEditingSportCharacterization({...editingSportCharacterization, energySystem: v})}
                            >
                              <SelectTrigger><SelectValue placeholder="Seleccionar sistema" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="aerobico">Aeróbico</SelectItem>
                                <SelectItem value="anaerobico-lactico">Anaeróbico Láctico</SelectItem>
                                <SelectItem value="anaerobico-alactico">Anaeróbico Aláctico</SelectItem>
                                <SelectItem value="mixto">Mixto</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Capacidades Físicas Principales</Label>
                          <Textarea 
                            placeholder="Ej: Fuerza explosiva, Resistencia, Velocidad, Flexibilidad..."
                            value={editingSportCharacterization.physicalCapabilities || ''}
                            onChange={(e) => setEditingSportCharacterization({...editingSportCharacterization, physicalCapabilities: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Habilidades Técnicas</Label>
                          <Textarea 
                            placeholder="Ej: Pase, Recepción, Tiro, Conducción..."
                            value={editingSportCharacterization.technicalSkills || ''}
                            onChange={(e) => setEditingSportCharacterization({...editingSportCharacterization, technicalSkills: e.target.value})}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-slate-700">Factores Tácticos</Label>
                          <Textarea 
                            placeholder="Ej: Sistemas de juego, Estrategias, Roles..."
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
                            <Save className="w-4 h-4 mr-2" />
                            Guardar Caracterización
                          </Button>
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
            subtitle="Calendario de competencias · brackets · participantes"
            icon={Shield}
            color="#8B5CF6"
            onRefresh={fetchTournaments}
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

    // Render iTrain PDI Technical Sheet
    if (activeDataSection === 'pdi-sheet') {
      return <PDITechnicalSheet />;
    }

    // Render Calendario section inline - COMPLETE
    if (activeDataSection === 'calendar-view') {
      const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const hoy = new Date();
      const diasMes = Array.from({ length: 35 }, (_, i) => {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fecha.setDate(fecha.getDate() - fecha.getDay() + 1 + i);
        return fecha;
      });
      
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-white border-b border-slate-200 text-slate-900 py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="w-5 h-5" />
                  Calendario de Entrenamiento
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="ghost" className="text-slate-600 hover:bg-slate-100 rounded-full w-8 h-8 p-0">◀</Button>
                  <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-medium">{hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
                  <Button size="sm" variant="ghost" className="text-slate-600 hover:bg-slate-100 rounded-full w-8 h-8 p-0">▶</Button>
                </div>
              </div>
            </div>
            <CardContent className="p-5">
              {/* Leyenda */}
              <div className="flex flex-wrap gap-4 mb-5 text-sm">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#007AFF] rounded-full inline-block"></span> Entrenamiento</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span> Competencia</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-500 rounded-full inline-block"></span> Test</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-slate-300 rounded-full inline-block"></span> Descanso</div>
              </div>
              
              {/* Calendario */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-100">
                  {diasSemana.map(dia => (
                    <div key={dia} className="p-3 text-center font-semibold text-sm text-slate-600">{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {diasMes.map((fecha, i) => {
                    const esHoy = fecha.toDateString() === hoy.toDateString();
                    const esMesActual = fecha.getMonth() === hoy.getMonth();
                    return (
                      <div 
                        key={i} 
                        className={`min-h-[85px] p-2 border-t border-l border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!esMesActual ? 'bg-slate-50/50 text-slate-400' : ''} ${esHoy ? 'bg-indigo-50' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${esHoy ? 'bg-[#007AFF] text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}`}>
                          {fecha.getDate()}
                        </div>
                        {esMesActual && i % 3 === 0 && (
                          <div className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full truncate font-medium">Sesión</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Generar con IA section inline - COMPLETE
    if (activeDataSection === 'ai-generator') {
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-white border-b border-slate-200 text-slate-900 py-4 px-5">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Brain className="w-5 h-5" />
                Generar Plan con Inteligencia Artificial
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Parámetros del Plan
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objetivo Principal</label>
                      <Input placeholder="Ej: Mejorar resistencia aeróbica" className="mt-1 border-slate-200 focus:border-amber-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Duración (semanas)</label>
                        <Input type="number" placeholder="12" className="mt-1 border-slate-200 focus:border-amber-400" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sesiones/semana</label>
                        <Input type="number" placeholder="5" className="mt-1 border-slate-200 focus:border-amber-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deporte</label>
                      <Input placeholder="Ej: Atletismo - Fondo" className="mt-1 border-slate-200 focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nivel del Atleta</label>
                      <Select>
                        <SelectTrigger className="border-slate-200"><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principiante">Principiante (0-1 año)</SelectItem>
                          <SelectItem value="intermedio">Intermedio (1-3 años)</SelectItem>
                          <SelectItem value="avanzado">Avanzado (3-5 años)</SelectItem>
                          <SelectItem value="elite">Elite (+5 años)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Competencia Objetivo</label>
                      <Input type="date" className="mt-1 border-slate-200 focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observaciones adicionales</label>
                      <textarea className="w-full border border-slate-200 rounded-lg p-3 text-sm h-24 mt-1 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Lesiones previas, limitaciones, preferencias..." />
                    </div>
                    <Button className="w-full bg-slate-900 hover:bg-slate-800 font-semibold h-11">
                      <Brain className="w-4 h-4 mr-2" />
                      Generar Plan con IA
                    </Button>
                  </div>
                </div>
                
                {/* Preview */}
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                  <h4 className="font-semibold text-amber-900 mb-4">Vista Previa del Plan</h4>
                  <div className="text-center py-12 text-amber-700/60">
                    <Brain className="w-20 h-20 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Configura los parámetros y genera tu plan personalizado</p>
                    <p className="text-sm mt-2 opacity-75">El plan incluirá macrociclos, mesociclos, microciclos y sesiones detalladas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

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
                  <Calendar className="w-5 h-5" />
                  Calendario de Eventos y Competencias
                </div>
                {selectedAthleteId && (
                  <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">{events.length} eventos</span>
                )}
              </div>
            </div>
            <CardContent className="p-5">
              {!selectedAthleteId ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Selecciona un atleta primero</p>
                  <p className="text-sm mt-1">Ve a la sección "Atletas" y selecciona uno para gestionar sus eventos</p>
                </div>
              ) : (
                <>
                  {/* Formulario nuevo evento */}
                  <div className="bg-violet-50/50 p-4 rounded-xl mb-5 border border-violet-100">
                    <h4 className="font-semibold mb-3 text-violet-900 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Agregar Evento/Competencia
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input 
                        placeholder="Nombre del evento" 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                      />
                      <Select value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                        <SelectTrigger className="h-10 border-violet-200"><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="competencia_principal">Competencia Principal</SelectItem>
                          <SelectItem value="competencia_secundaria">Competencia Secundaria</SelectItem>
                          <SelectItem value="test">Test/Evaluación</SelectItem>
                          <SelectItem value="concentracion">Concentración</SelectItem>
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
                        placeholder="Objetivo" 
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
                        <p>No hay eventos registrados para este atleta</p>
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
        { key: 'fisicaGeneral', label: 'Prep. Física General', color: '#3b82f6', hover: '#eff6ff' },
        { key: 'fisicaEspecial', label: 'Prep. Física Especial', color: '#007AFF', hover: '#eff6ff' },
        { key: 'tecnica', label: 'Prep. Técnica', color: '#10b981', hover: '#ecfdf5' },
        { key: 'tactica', label: 'Prep. Táctica', color: '#f59e0b', hover: '#fffbeb' },
        { key: 'teorica', label: 'Prep. Teórica', color: '#06b6d4', hover: '#ecfeff' },
        { key: 'psicologica', label: 'Prep. Psicológica', color: '#ec4899', hover: '#fdf2f8' }
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
                <h1 className="text-base font-bold text-slate-900 truncate">Plan Activo</h1>
                <p className="text-[11px] text-slate-500 truncate">Información general · Objetivos por horizonte temporal y aspecto de preparación</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleDownloadObjectivesPDF} disabled={savingEvaluation || !activePlan} data-testid="active-plan-pdf-btn" title="Descargar PDF estilo Whitepaper">
                <Download className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleShareObjectivesLink} disabled={savingEvaluation || !activePlan} data-testid="active-plan-link-btn" title="Copiar enlace público al portapapeles">
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />Enlace
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40" onClick={handleShareObjectivesWhatsApp} disabled={savingEvaluation || !activePlan} data-testid="active-plan-whatsapp-btn" title="Compartir por WhatsApp">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />WhatsApp
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs px-4" onClick={handleSaveObjectives} disabled={savingEvaluation || !activePlan} data-testid="active-plan-save-btn">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingEvaluation ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>

          {!activePlan && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Selecciona un plan activo en el panel izquierdo para guardar y compartir.
            </div>
          )}

          {/* Información General — full-width compact */}
          <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#007AFF]">
            <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <FileText className="w-4 h-4 text-[#007AFF]" />
                Información General del Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Deporte / Objetivo</label>
                  <Input data-testid="obj-deporte" placeholder="Ej: Fútbol pretemporada" className="border-slate-200 h-9 text-sm" value={objectivesData.deporteObjetivo} onChange={(e) => setObjectivesData({...objectivesData, deporteObjetivo: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Categoría</label>
                  <Select value={objectivesData.categoria} onValueChange={(val) => setObjectivesData({...objectivesData, categoria: val})}>
                    <SelectTrigger data-testid="obj-categoria" className="h-9 text-sm border-slate-200"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
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
                  <Input data-testid="obj-edad" placeholder="Ej: 18-22 años" className="border-slate-200 h-9 text-sm" value={objectivesData.edad} onChange={(e) => setObjectivesData({...objectivesData, edad: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Clasificación / Nivel</label>
                  <Select value={objectivesData.clasificacion} onValueChange={(val) => setObjectivesData({...objectivesData, clasificacion: val})}>
                    <SelectTrigger data-testid="obj-clasificacion" className="h-9 text-sm border-slate-200"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciacion">Iniciación</SelectItem>
                      <SelectItem value="formacion">Formación</SelectItem>
                      <SelectItem value="perfeccionamiento">Perfeccionamiento</SelectItem>
                      <SelectItem value="alto-rendimiento">Alto Rendimiento</SelectItem>
                      <SelectItem value="elite">Élite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Fecha de Inicio</label>
                  <Input data-testid="obj-fecha-inicio" type="date" className="border-slate-200 h-9 text-sm" value={objectivesData.fechaInicio} onChange={(e) => setObjectivesData({...objectivesData, fechaInicio: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Fecha de Finalización</label>
                  <Input data-testid="obj-fecha-fin" type="date" className="border-slate-200 h-9 text-sm" value={objectivesData.fechaFin} onChange={(e) => setObjectivesData({...objectivesData, fechaFin: e.target.value})} />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Entrenador Responsable</label>
                  <Input data-testid="obj-entrenador" placeholder="Nombre del entrenador" className="border-slate-200 h-9 text-sm" value={objectivesData.entrenador} onChange={(e) => setObjectivesData({...objectivesData, entrenador: e.target.value})} />
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
                <p className="text-[11px] text-slate-500 italic">Pico anual · objetivo principal del macrociclo</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
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
                <p className="text-[11px] text-slate-500 italic">Bloques 4-6 semanas · capacidades específicas</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
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
                <p className="text-[11px] text-slate-500 italic">Semana actual · sesiones inmediatas</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
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
                <Layers className="w-4 h-4 text-violet-500" />
                Objetivos por Aspecto de Preparación
                <span className="ml-auto text-[10px] font-medium text-slate-500 italic">7 aspectos deportivos</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-900">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider w-44" style={{ color: '#CCFF00' }}>Aspecto</th>
                      <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider" style={{ color: '#CCFF00' }}>Objetivo</th>
                      <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-wider w-72" style={{ color: '#CCFF00' }}>Indicador</th>
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
                          <textarea data-testid={`obj-aspecto-${row.key}-ind`} className="w-full p-1.5 border border-slate-200 rounded-md text-[12px] resize-none" rows={1} placeholder="¿Cómo se medirá?" value={objectivesData.porAspecto[row.key]?.indicador || ''} onChange={(e) => setObjectivesData({...objectivesData, porAspecto: {...objectivesData.porAspecto, [row.key]: {...objectivesData.porAspecto[row.key], indicador: e.target.value}}})} />
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
              <p className="text-[12px] font-bold text-slate-800 mb-1">Objetivos SMART</p>
              <p className="text-[11.5px] text-slate-700 leading-relaxed">
                La claridad de estos objetivos es crítica para guiar el desarrollo del programa. Cada objetivo debe ser
                <strong> Específico, Medible, Alcanzable, Relevante y Temporal</strong>. Validar periódicamente con el cuerpo técnico.
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
      const cumplLabels = ['Objetivo General', 'Preparación Física', 'Preparación Técnica', 'Preparación Táctica', 'Preparación Psicológica', 'Preparación Teórica', 'Reglamento del Deporte'];

      // Perfiles ideales esperados por modelo de periodización (benchmark) — 7 áreas
      const MODEL_PROFILES = {
        atr: { general: 85, fisica: 92, tecnica: 78, tactica: 75, psicologica: 65, teorica: 55, reglamento: 60 },
        issurin: { general: 85, fisica: 92, tecnica: 80, tactica: 82, psicologica: 68, teorica: 60, reglamento: 65 },
        pdi: { general: 88, fisica: 82, tecnica: 85, tactica: 85, psicologica: 88, teorica: 85, reglamento: 80 },
        itrain_pdi: { general: 88, fisica: 82, tecnica: 85, tactica: 85, psicologica: 88, teorica: 85, reglamento: 80 },
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
                <h1 className="text-base font-bold text-slate-900 truncate">Análisis del Plan Anterior</h1>
                <p className="text-[11px] text-slate-500 truncate">Evaluación retrospectiva · Identifica fortalezas y oportunidades para el próximo ciclo</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleDownloadPreviousAnalysisPDF} disabled={savingEvaluation || !activePlan} data-testid="prev-download-pdf-btn" title="Descargar PDF estilo Whitepaper">
                <Download className="w-3.5 h-3.5 mr-1.5" />PDF
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-slate-300 hover:bg-slate-50" onClick={handleSharePreviousAnalysisLink} disabled={savingEvaluation || !activePlan} data-testid="prev-share-link-btn" title="Copiar enlace público al portapapeles">
                <LinkIcon className="w-3.5 h-3.5 mr-1.5" />Enlace
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-xs px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 bg-emerald-50/40" onClick={handleShareWhatsApp} disabled={savingEvaluation || !activePlan} data-testid="prev-share-whatsapp-btn" title="Compartir por WhatsApp">
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" />WhatsApp
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white h-9 text-xs px-4" onClick={handleSavePreviousAnalysis} disabled={savingEvaluation || !activePlan} data-testid="prev-save-btn">
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingEvaluation ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>

          {!activePlan && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Selecciona un plan activo en el panel izquierdo para guardar y compartir el análisis.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start grid-flow-row-dense lg:auto-rows-min">
            {/* Información del Plan Anterior — col 1 */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-[#007AFF] lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-[#007AFF]" />
                  Información del Plan Anterior
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Fecha de Inicio</label>
                    <Input data-testid="prev-fecha-inicio" type="date" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.fechaInicio} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, fechaInicio: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Fecha de Finalización</label>
                    <Input data-testid="prev-fecha-fin" type="date" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.fechaFinalizacion} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, fechaFinalizacion: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Duración Total (semanas)</label>
                  <Input data-testid="prev-duracion" type="number" placeholder="Ej: 12" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.duracionSemanas} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, duracionSemanas: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Objetivo Principal del Plan</label>
                  <textarea data-testid="prev-objetivo" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="¿Cuál era el objetivo principal?" value={previousAnalysisData.objetivoPrincipal} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, objetivoPrincipal: e.target.value})} />
                </div>
              </CardContent>
            </Card>

            {/* Cumplimiento de Objetivos — col 2, ocupa 5 rows (toda la altura de col 1) */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-emerald-500 lg:col-start-2 lg:row-start-1 lg:row-end-6 lg:h-full flex flex-col">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4 flex-shrink-0">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Cumplimiento de Objetivos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5 flex flex-col flex-1 min-h-0">
                {/* Radar interactivo — feedback visual en tiempo real */}
                <div className="rounded-xl p-2.5" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                  <div className="flex items-center justify-center gap-3 mb-1 flex-wrap">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase" style={{ background: '#CCFF00', color: '#0f172a' }}>Perfil de Cumplimiento</span>
                    <div className="flex items-center gap-3 text-[9px]">
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#CCFF00' }}></span><span className="text-white/90 font-semibold uppercase tracking-wider">Real</span></div>
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border border-dashed" style={{ background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.6)' }}></span><span className="text-white/80 font-semibold uppercase tracking-wider">Ideal · {modelNameLabel}</span></div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <RadarChart data={cumplKeys.map((k, i) => {
                      const raw = previousAnalysisData.cumplimiento?.[k];
                      const item = (typeof raw === 'object' && raw !== null) ? raw : { porcentaje: 50 };
                      const shortMap = {
                        'Objetivo General': 'Obj. General',
                        'Preparación Física': 'Prep. Física',
                        'Preparación Técnica': 'Prep. Técnica',
                        'Preparación Táctica': 'Prep. Táctica',
                        'Preparación Psicológica': 'Prep. Psicol.',
                        'Preparación Teórica': 'Prep. Teórica',
                        'Reglamento del Deporte': 'Reglamento',
                      };
                      return {
                        area: shortMap[cumplLabels[i]] || cumplLabels[i],
                        pct: Number(item.porcentaje ?? 0),
                        ideal: Number(benchmarkProfile[k] ?? 0),
                      };
                    })}>
                      <PolarGrid stroke="rgba(255,255,255,0.15)" />
                      <PolarAngleAxis dataKey="area" tick={{ fill: '#fff', fontSize: 10, fontWeight: 700 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} />
                      {/* Ideal/benchmark del modelo (detrás) */}
                      <Radar name="Ideal" dataKey="ideal" stroke="rgba(255,255,255,0.65)" strokeDasharray="4 4" fill="rgba(255,255,255,0.08)" fillOpacity={1} strokeWidth={1.5} dot={false} />
                      {/* Real (encima) */}
                      <Radar name="Real" dataKey="pct" stroke="#CCFF00" fill="#CCFF00" fillOpacity={0.4} strokeWidth={2} dot={{ fill: '#CCFF00', r: 3, strokeWidth: 1, stroke: '#fff' }} />
                      <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #CCFF00', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: '#CCFF00', fontWeight: 700 }} formatter={(v, n) => [`${v}%`, n === 'Real' ? 'Tu cumplimiento' : `Ideal (${modelNameLabel})`]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2">
                  {cumplLabels.map((obj, idx) => {
                    const k = cumplKeys[idx];
                    const raw = previousAnalysisData.cumplimiento?.[k];
                    const item = (typeof raw === 'object' && raw !== null) ? raw : { descripcion: '', porcentaje: 50 };
                    const pct = Number(item.porcentaje ?? 50);
                    const estado = pct >= 85 ? { lbl: 'Cumplido Total', color: '#10B981', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
                                 : pct >= 40 ? { lbl: 'Cumplido Parcial', color: '#F59E0B', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' }
                                              : { lbl: 'No Cumplido', color: '#EF4444', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700' };
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
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${estado.text}`} style={{ background: estado.color + '22', border: `1px solid ${estado.color}50` }}>
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
                          placeholder={`¿Qué se logró en ${obj.toLowerCase()}?`}
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
                          <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-900/85 text-[#CCFF00] uppercase tracking-wider">Auto</span>
                        </div>
                        <span className="text-5xl lg:text-6xl font-black tabular-nums leading-none" data-testid="prev-porcentaje-global" style={{ color: '#0f172a', letterSpacing: '-0.04em' }}>{pctG}<span className="text-2xl lg:text-3xl font-bold ml-1 align-top">%</span></span>
                      </div>
                      <div className="h-4 lg:h-5 bg-black/15 rounded-full overflow-hidden mt-2 shadow-inner">
                        <div className="h-full rounded-full transition-all duration-700 shadow-md" style={{ width: `${pctG}%`, background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)' }} />
                      </div>
                      <div className="flex items-center justify-between mt-3 text-[10px] lg:text-[11px] text-slate-800/75 font-semibold">
                        <span className="italic">Promedio automático de las 7 áreas</span>
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
                  <TrendingUp className="w-4 h-4 text-[#007AFF]" />
                  Fortalezas del Plan Anterior
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500">¿Qué funcionó bien? ¿Qué aspectos se deben mantener?</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`prev-fortaleza-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={`Fortaleza ${idx + 1}...`} value={previousAnalysisData.fortalezas[idx]} onChange={(e) => { const arr = [...previousAnalysisData.fortalezas]; arr[idx] = e.target.value; setPreviousAnalysisData({...previousAnalysisData, fortalezas: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Análisis de Debilidades — col 1 */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-amber-500 lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Debilidades y Áreas de Mejora
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2">
                <p className="text-[11px] text-slate-500">¿Qué no funcionó? ¿Qué se debe cambiar o mejorar?</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-1.5">{idx + 1}</span>
                    <textarea data-testid={`prev-debilidad-${idx}`} className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={`Debilidad/Mejora ${idx + 1}...`} value={previousAnalysisData.debilidades[idx]} onChange={(e) => { const arr = [...previousAnalysisData.debilidades]; arr[idx] = e.target.value; setPreviousAnalysisData({...previousAnalysisData, debilidades: arr}); }} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Indicadores de Rendimiento — col 1 (lista dinámica creada por el entrenador) */}
            <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-emerald-500 lg:col-start-1">
              <CardHeader className="bg-white border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <BarChart className="w-4 h-4 text-emerald-500" />
                  Indicadores de Rendimiento
                </CardTitle>
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
                  <Plus className="w-3 h-3 mr-1" />Añadir
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                {(!previousAnalysisData.indicadoresLista || previousAnalysisData.indicadoresLista.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <BarChart className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Sin indicadores. Haz clic en <strong className="text-emerald-600">Añadir</strong> para crear el primero.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-1.5 px-2 text-slate-600 font-semibold uppercase tracking-wide text-[10px]">Indicador</th>
                          <th className="text-center py-1.5 px-1 text-slate-600 font-semibold uppercase tracking-wide text-[10px]">Inicial</th>
                          <th className="text-center py-1.5 px-1 text-slate-600 font-semibold uppercase tracking-wide text-[10px]">Final</th>
                          <th className="text-center py-1.5 px-1 text-slate-600 font-semibold uppercase tracking-wide text-[10px]">Delta%</th>
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
                  <Heart className="w-4 h-4 text-rose-500" />
                  Lesiones y Problemas de Salud
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">¿Hubo lesiones?</label>
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
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Días perdidos</label>
                    <Input data-testid="prev-dias-perdidos" type="number" placeholder="0" className="border-slate-200 h-9 text-sm" value={previousAnalysisData.diasPerdidos} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, diasPerdidos: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Descripción (causa, recuperación)</label>
                  <textarea data-testid="prev-desc-lesiones" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Describir las lesiones ocurridas, su causa probable y tiempo de recuperación..." value={previousAnalysisData.descripcionLesiones} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, descripcionLesiones: e.target.value})} />
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
                  <textarea data-testid="prev-conclusiones" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder="Resumen de los principales aprendizajes del plan anterior..." value={previousAnalysisData.conclusiones} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, conclusiones: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Recomendaciones para el Próximo Plan</label>
                  <textarea data-testid="prev-recomendaciones" className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder="Qué mantener, qué cambiar, qué nuevos enfoques aplicar..." value={previousAnalysisData.recomendaciones} onChange={(e) => setPreviousAnalysisData({...previousAnalysisData, recomendaciones: e.target.value})} />
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
                        localStorage.setItem('itrain_next_plan_seed', JSON.stringify({
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
                        toast.info('Continuando al wizard...');
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
                        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#CCFF00' }}>Cierra el ciclo</div>
                        <div className="text-sm font-bold truncate">Generar próximo plan basado en este análisis</div>
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
                    <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#CCFF00' }}>Gap Analysis con IA</div>
                    <div className="text-sm font-bold text-white">Diagnóstico Cruzado vs Modelos de Periodización</div>
                  </div>
                </div>
                {aiGapData && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: 'rgba(204,255,0,0.15)', color: '#CCFF00', border: '1px solid rgba(204,255,0,0.4)' }}>
                    {(aiGapData.provider || '').toUpperCase()} · {aiGapData.llm_model || ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Provider selector + multi-select de modelos */}
              <div className="grid md:grid-cols-[180px_1fr_auto] gap-3 items-start">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Motor IA</label>
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
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
                      className="text-[10px] text-slate-500 hover:text-slate-900 underline"
                      data-testid="ai-force-refresh-btn"
                    >Forzar regeneración</button>
                  )}
                </div>
              </div>

              {/* Resultado IA */}
              {!aiGapData && !aiGapLoading && (
                <div className="bg-gradient-to-br from-slate-50 to-white border border-dashed border-slate-300 rounded-xl p-6 text-center" data-testid="ai-empty-state">
                  <Sparkles className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-bold text-slate-700 mb-1">Análisis Inteligente de Brechas</p>
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
                      <div className="bg-slate-900 text-[#CCFF00] px-3 py-2 text-[10px] font-black uppercase tracking-widest grid grid-cols-[1fr_auto_70px] gap-2">
                        <span>Modelo</span>
                        <span>Brechas top 3</span>
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
                              <div className="font-bold text-slate-800 text-[12px] truncate">{c.model_name}</div>
                              <div className="flex flex-wrap gap-1 justify-start max-w-md">
                                {top3.length === 0 ? <span className="text-[11px] text-slate-400">Sin brechas</span> :
                                  top3.map((g, gi) => (
                                    <span key={gi} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 px-2">Recomendaciones Accionables</span>
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
                                {r.area && <div className="text-[10px] font-semibold text-slate-500 mt-0.5">Área: <span className="text-slate-700">{r.area}</span></div>}
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

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
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

    if (activeDataSection === 'period-tests') {
      return <TestEvaluations athleteId={selectedAthleteId} />;
    }

    if (activeDataSection === 'period-load') {
      return <LoadMetricsDashboard activePlan={activePlan} />;
    }

    if (activeDataSection === 'period-control') {
      return <TrainingControl athleteId={selectedAthleteId} athleteName={athletes.find(a => a.id === selectedAthleteId)?.name} />;
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
      return <EvaluationSection sectionId="control-anthropometric" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // ====== NUEVAS SECCIONES DE EVALUACIÓN ======

    // Análisis Biomecánico (legacy redirect to new EvaluationSection)
    if (activeDataSection === 'biomechanical' || activeDataSection === 'control-biomechanical') {
      return <EvaluationSection sectionId="control-biomechanical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Control Médico
    if (activeDataSection === 'control-medical') {
      return <EvaluationSection sectionId="control-medical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Control Físico
    if (activeDataSection === 'control-physical') {
      return <EvaluationSection sectionId="control-physical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Control Técnico
    if (activeDataSection === 'control-technical') {
      return <EvaluationSection sectionId="control-technical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Control Táctico
    if (activeDataSection === 'control-tactical') {
      return <EvaluationSection sectionId="control-tactical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Control Psicológico
    if (activeDataSection === 'control-psychological') {
      return <EvaluationSection sectionId="control-psychological" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Control Teórico
    if (activeDataSection === 'control-theoretical') {
      return <EvaluationSection sectionId="control-theoretical" activePlan={activePlan} athletes={athletes} selectedAthleteId={selectedAthleteId} />;
    }

    // Render Test Evaluations
    if (activeDataSection === 'tests') {
      return <TestEvaluations athleteId={selectedAthleteId} />;
    }

    // Render Training Load
    if (activeDataSection === 'load') {
      return <TrainingLoad athleteId={selectedAthleteId} />;
    }

    // Render Graphic Plan
    if (activeDataSection === 'graphic-plan') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <GraphicPlan 
          athleteId={selectedAthleteId} 
          periodizationData={periodizationData}
          athleteName={selectedAthlete?.name}
          activePlan={activePlan}
          competitions={planData?.competitions || []}
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

    if (activeDataSection === 'coaches') {
      return (
        <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]">
          <InfoSectionHeader
            catalogType="coaches"
            title="Entrenadores"
            subtitle="Staff técnico · perfiles profesionales · trayectoria · campeonatos"
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
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Alertas Inteligentes de Entrenamiento</h2>
              <p className="text-slate-500">Recomendaciones basadas en evaluaciones y calendario de competencias</p>
              {athletes.length > 0 && (
                <div className="mt-4">
                  <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Seleccionar atleta" />
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
                <SelectValue placeholder="Seleccionar atleta" />
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
            <p className="text-gray-500 mb-4">
              Esta sección está en desarrollo
            </p>
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
      const sectionsWithoutPlan = ['athletes', 'entities', 'training-system', 'exercises-lib', 'ai-generator', 'calculators', 'periodization-models', 'pdi-sheet', 'tactical-board', 'sports', 'tournaments', 'create-plan', 'period-overview', 'period-structure', 'period-tests', 'period-load', 'period-control'];

      return (
        <div className="flex h-full" data-testid="datos-layout">
          {/* ====== SIDEBAR DE PLANES ====== */}
          <PlanSidebar
            trainingPlans={trainingPlans}
            loadingPlans={loadingPlans}
            activePlan={activePlan}
            onSelectPlan={handleSetActivePlan}
            onDuplicatePlan={handleDuplicatePlan}
            onSharePlan={handleSharePlan}
            onDeletePlan={handleDeleteTrainingPlan}
            onExportPDF={handleExportPDF}
            onRefresh={fetchTrainingPlans}
            onCreatePlan={() => setActiveDataSection('create-plan')}
            t={t}
          />

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
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.15em] font-bold leading-none mb-0.5">Plan Activo</p>
                  <h2 className="text-slate-900 font-bold text-base leading-tight">{activePlan.name}</h2>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 ml-1">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full">
                    {activePlan.total_weeks} semanas
                  </span>
                  <span className="px-2.5 py-1 bg-[#E0F7FA] text-[#00838F] text-[11px] font-semibold rounded-full">
                    {activePlan.model_name || activePlan.model}
                  </span>
                  {activePlan.sport && (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-semibold rounded-full">
                      {activePlan.sport}
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
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Cambiar Plan
              </Button>
          </div>

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
                <h2 className="text-xl font-bold text-slate-800 mb-2">Selecciona un Plan</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Elige un plan de entrenamiento del panel izquierdo para acceder a sus secciones y datos.
                </p>
                <Button
                  onClick={() => setActiveDataSection('create-plan')}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
                  data-testid="welcome-create-plan-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Nuevo Plan
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      );
    }
    
    // Panel de Control - Resumen visual con estadísticas y gráficos
    const handleNavigateFromPanel = (panel, section) => {
      setActivePanel(panel);
      if (section) {
        setActiveDataSection(section);
      }
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

  return (
    <div className="min-h-screen bg-[#fafaf8]">
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
                        ? `${nav.color} text-white shadow-lg ${nav.shadow}`
                        : 'bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg'
                    }`}>
                      <NavIcon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'text-white' : 'group-hover:text-slate-700'}`} strokeWidth={isActive ? 2.5 : 1.8} />
                    </div>
                    <span className={`text-[8px] font-bold tracking-wide leading-tight text-center max-w-[56px] transition-colors duration-300 ${
                      isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                      {nav.label}
                    </span>
                  </button>
                );
              })}

              {/* PDF FAB */}
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                data-testid="export-pdf-btn"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg hover:text-emerald-600">
                  <Download className="w-[18px] h-[18px] transition-transform duration-300 group-hover:text-emerald-600" strokeWidth={1.8} />
                </div>
                <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-400 group-hover:text-emerald-600 transition-colors duration-300">
                  PDF
                </span>
              </button>

              {/* Filtros FAB */}
              <div className="relative">
                <button
                  onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                  className="group flex flex-col items-center gap-1 shrink-0 outline-none"
                  data-testid="filters-dropdown-btn"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
                    showFiltersDropdown
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg'
                  }`}>
                    <Filter className={`w-[18px] h-[18px] transition-transform duration-300 ${showFiltersDropdown ? 'text-white' : 'group-hover:text-amber-500'}`} strokeWidth={showFiltersDropdown ? 2.5 : 1.8} />
                  </div>
                  <span className={`text-[8px] font-bold tracking-wide leading-tight text-center transition-colors duration-300 ${
                    showFiltersDropdown ? 'text-amber-600' : 'text-slate-400 group-hover:text-amber-500'
                  }`}>
                    Filtros
                  </span>
                </button>

                {/* Filters Dropdown Panel */}
                {showFiltersDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowFiltersDropdown(false)}
                    />
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[320px]">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          <Filter className="w-4 h-4 text-amber-500" />
                          Filtros de Contexto
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFiltersDropdown(false)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Entidad</label>
                          <Select value={globalContext.entityId} onValueChange={handleEntityChange}>
                            <SelectTrigger className="w-full h-9 text-sm" data-testid="context-entity-select">
                              <Building2 className="w-4 h-4 mr-2 text-amber-500" />
                              <SelectValue placeholder="Seleccionar entidad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas las entidades</SelectItem>
                              {entities.filter(e => e.entity_type === 'federation').map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                              {entities.filter(e => e.entity_type === 'club').map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                              {entities.filter(e => e.entity_type === 'school').map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Equipo</label>
                          <Select value={globalContext.teamId} onValueChange={handleTeamChange}>
                            <SelectTrigger className="w-full h-9 text-sm" data-testid="context-team-select">
                              <Users className="w-4 h-4 mr-2 text-amber-500" />
                              <SelectValue placeholder="Seleccionar equipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos los equipos</SelectItem>
                              {filteredTeams.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Atleta</label>
                          <Select value={globalContext.athleteId} onValueChange={handleAthleteChange}>
                            <SelectTrigger className="w-full h-9 text-sm" data-testid="context-athlete-select">
                              <User className="w-4 h-4 mr-2 text-amber-500" />
                              <SelectValue placeholder="Seleccionar atleta" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos los atletas</SelectItem>
                              {filteredAthletes.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-slate-500 mb-1 block">Deporte</label>
                          <Select value={globalContext.sportId} onValueChange={handleSportChange}>
                            <SelectTrigger className="w-full h-9 text-sm" data-testid="context-sport-select">
                              <Trophy className="w-4 h-4 mr-2 text-amber-500" />
                              <SelectValue placeholder="Seleccionar deporte" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos los deportes</SelectItem>
                              {allSports.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {(globalContext.entityId !== 'all' || globalContext.teamId !== 'all' || 
                          globalContext.athleteId !== 'all' || globalContext.sportId !== 'all') && (
                          <div className="pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-500">Filtros activos</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setGlobalContext({ entityId: 'all', teamId: 'all', athleteId: 'all', sportId: 'all' });
                                }}
                                className="h-6 text-xs text-amber-600 hover:text-amber-700"
                              >
                                Limpiar todo
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
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
                          ? `${colors.bg} text-white shadow-lg ${colors.shadow}`
                          : `${colors.light} ${colors.text} shadow-sm hover:shadow-md`
                      }`}>
                        <SectionIcon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'text-white' : ''}`} strokeWidth={isActive ? 2.5 : 1.8} />
                      </div>
                      <span className={`text-[8px] font-bold tracking-wide leading-tight text-center max-w-[56px] transition-colors duration-300 ${
                        isActive ? colors.text : 'text-slate-400 group-hover:text-slate-600'
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
                              ? `${currentColors.bg} text-white shadow-lg ${currentColors.shadow}`
                              : `bg-white ${currentColors.text} border-2 ${currentColors.border} shadow-sm hover:shadow-md`
                          }`}>
                            <ItemIcon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? 'text-white' : ''}`} strokeWidth={isActive ? 2.5 : 1.8} />
                          </div>
                          <span className={`text-[8px] font-bold tracking-wide text-center max-w-[56px] leading-tight transition-colors duration-300 ${
                            isActive ? currentColors.text : 'text-slate-400 group-hover:text-slate-600'
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
            {/* Auto Testing System FAB */}
            <div className="hidden sm:block">
              <AutoTestingSystem 
                fabStyle
                onLoadTemplate={(plan) => {
                  const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
                  setGeneratedPlans(savedPlans);
                  setIsCoachDrawerOpen(true);
                  setCoachDrawerTab('history');
                  toast.success('Template cargado - Ver en Historial');
                }}
                onSavePlan={(plan) => {
                  const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
                  setGeneratedPlans(savedPlans);
                  setIsCoachDrawerOpen(true);
                  setCoachDrawerTab('history');
                }}
                currentUser={user}
                sportsCatalog={sportsCatalog}
              />
            </div>

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
                  Plan
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
                Salir
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
          {renderMainContent()}
        </div>
      </div>

      {/* ====== COACH AI FLOATING BUTTON ====== */}
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

      {/* ====== COACH AI DRAWER ====== */}
      {isCoachDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setIsCoachDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Coach AI</h2>
                    <p className="text-xs text-white/70">Tu asistente de entrenamiento</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCoachDrawerOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Drawer Tabs */}
              <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setCoachDrawerTab('coach')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                    coachDrawerTab === 'coach'
                      ? 'bg-white text-[#007AFF] shadow'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Coach AI
                </button>
                <button
                  onClick={() => setCoachDrawerTab('history')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                    coachDrawerTab === 'history'
                      ? 'bg-white text-[#007AFF] shadow'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Planes
                  {trainingPlans.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      coachDrawerTab === 'history' ? 'bg-blue-50 text-[#007AFF]' : 'bg-white/20'
                    }`}>
                      {trainingPlans.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-hidden flex flex-col">
              {coachDrawerTab === 'coach' ? (
                /* AI Assistant View */
                <AITrainingAssistant 
                  selectedAthlete={athletes.find(a => a.id === selectedAthleteId)}
                  sportsCatalog={sportsCatalog}
                />
              ) : (
                /* Plans History View - Shows real training plans from DB */
                <div className="flex-grow flex flex-col overflow-hidden">
                  {/* Plan Activo Indicator */}
                  {activePlan && (
                    <div className="p-3 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-emerald-600 font-medium">Plan Activo</p>
                          <p className="text-sm font-bold text-slate-700 truncate">{activePlan.name}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActivePlan(null)}
                          className="text-xs text-emerald-600 border-slate-300 hover:bg-emerald-50"
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* New Plan Button */}
                  <div className="p-3 border-b bg-slate-50">
                    <Button
                      onClick={() => {
                        setIsCoachDrawerOpen(false);
                        setActivePanel('datos');
                        setActiveDataSection('training-system');
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                      data-testid="new-plan-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Nuevo Plan
                    </Button>
                  </div>
                  
                  {/* Plans List from Database */}
                  <div className="flex-grow overflow-y-auto">
                    {loadingPlans ? (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                        <p className="text-sm text-slate-500">Cargando planes...</p>
                      </div>
                    ) : trainingPlans.length > 0 ? (
                      <div className="divide-y">
                        {trainingPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors group ${
                              activePlan?.id === plan.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                            }`}
                            onClick={() => handleSetActivePlan(plan)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-slate-900 truncate">
                                    {plan.name}
                                  </h4>
                                  {activePlan?.id === plan.id && (
                                    <Badge className="bg-emerald-50 text-emerald-700 text-xs">Activo</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {plan.sport || 'General'} • {plan.model_name || plan.model} • {plan.total_weeks} sem
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Inicio: {plan.start_date ? new Date(plan.start_date).toLocaleDateString('es-ES') : 'No definido'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCoachDrawerOpen(false);
                                    setActivePanel('datos');
                                    setActiveDataSection('training-system');
                                    // El componente PeriodizationComplete cargará el plan
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-slate-400 hover:text-blue-500"
                                  title="Ver/Editar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTrainingPlan(plan.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <FileText className="w-16 h-16 text-slate-200 mb-4" />
                        <p className="text-sm font-medium text-slate-500 mb-1">Sin planes de entrenamiento</p>
                        <p className="text-xs text-slate-400 mb-4">Crea tu primer plan para comenzar</p>
                        <Button
                          onClick={() => {
                            setIsCoachDrawerOpen(false);
                            setActivePanel('datos');
                            setActiveDataSection('training-system');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-[#007AFF] border-slate-200"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Plan
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer - User Info Only */}
            <div className="border-t bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500">
                    {USER_ROLES.find(r => r.id === user?.role)?.name || user?.role || 'Usuario'}
                  </p>
                </div>
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
    </div>
  );
};

export default DashboardPage;
