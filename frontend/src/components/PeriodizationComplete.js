import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  Plus, Save, Loader2, Calendar, Target, Activity, 
  ChevronDown, ChevronRight, ChevronLeft, Trash2, Edit2, BarChart3,
  TrendingUp, Layers, Zap, GripVertical, X, Check,
  CheckCircle, Clock, BookOpen, History, Eye, FileText,
  MoreVertical, Copy, Move, Settings, CalendarDays, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area, ReferenceLine
} from 'recharts';
import SessionEditor from './SessionEditor';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============ CONSTANTES ============
const MACROCYCLE_PHASES = [
  { id: 'prep_general', name: 'Preparatorio General', abbr: 'PG', color: '#3B82F6', volumePercent: 85, intensityPercent: 55 },
  { id: 'prep_specific', name: 'Preparatorio Específico', abbr: 'PE', color: '#8B5CF6', volumePercent: 70, intensityPercent: 75 },
  { id: 'precompetitive', name: 'Precompetitivo', abbr: 'PC', color: '#F59E0B', volumePercent: 55, intensityPercent: 88 },
  { id: 'competitive', name: 'Competitivo', abbr: 'CO', color: '#10B981', volumePercent: 40, intensityPercent: 95 },
  { id: 'transition', name: 'Transición', abbr: 'TR', color: '#6B7280', volumePercent: 30, intensityPercent: 45 }
];

const MESOCYCLE_TYPES = [
  { id: 'entrante', name: 'Entrante', color: '#94A3B8', loadFactor: 0.7 },
  { id: 'basico_desarrollador', name: 'Básico Desarrollador', color: '#3B82F6', loadFactor: 1.0 },
  { id: 'basico_estabilizador', name: 'Básico Estabilizador', color: '#10B981', loadFactor: 0.9 },
  { id: 'precompetitivo', name: 'Precompetitivo', color: '#F59E0B', loadFactor: 0.85 },
  { id: 'competitivo', name: 'Competitivo', color: '#EF4444', loadFactor: 0.75 },
  { id: 'recuperacion', name: 'Recuperación', color: '#A78BFA', loadFactor: 0.5 }
];

// Microcycle types array (legacy) - keeping for compatibility
const MICROCYCLE_TYPES_ARRAY = [
  { id: 'corriente', name: 'Corriente', color: '#64748B', loadPercent: 70 },
  { id: 'carga', name: 'De Carga', color: '#3B82F6', loadPercent: 85 },
  { id: 'choque', name: 'De Choque', color: '#EF4444', loadPercent: 100 },
  { id: 'competitivo', name: 'Competitivo', color: '#10B981', loadPercent: 60 },
  { id: 'aproximacion', name: 'De Aproximación', color: '#F59E0B', loadPercent: 75 },
  { id: 'restablecimiento', name: 'De Restablecimiento', color: '#A78BFA', loadPercent: 45 }
];

const SESSION_TYPES = [
  { id: 'strength', name: 'Fuerza', color: '#EF4444', bgColor: 'bg-red-100 border-red-300' },
  { id: 'endurance', name: 'Resistencia', color: '#3B82F6', bgColor: 'bg-blue-100 border-blue-300' },
  { id: 'speed', name: 'Velocidad', color: '#F59E0B', bgColor: 'bg-yellow-100 border-yellow-300' },
  { id: 'technical', name: 'Técnica', color: '#10B981', bgColor: 'bg-green-100 border-green-300' },
  { id: 'tactical', name: 'Táctica', color: '#8B5CF6', bgColor: 'bg-violet-100 border-violet-300' },
  { id: 'recovery', name: 'Recuperación', color: '#A78BFA', bgColor: 'bg-purple-100 border-purple-300' },
  { id: 'flexibility', name: 'Flexibilidad', color: '#EC4899', bgColor: 'bg-pink-100 border-pink-300' }
];

const CYCLE_DURATIONS = {
  olympic: { label: 'Ciclo Olímpico', weeks: 208 },
  biannual: { label: 'Bianual', weeks: 104 },
  annual: { label: 'Anual', weeks: 52 },
  semester: { label: 'Semestral', weeks: 26 },
  quarter: { label: 'Trimestral', weeks: 13 },
  monthly: { label: 'Mensual', weeks: 4 }
};

const PERIODIZATION_MODELS = {
  // Modelos Clásicos
  traditional: { 
    name: 'Tradicional (Matveiev)', 
    category: 'classic',
    description: 'Modelo soviético clásico con fases lineales de volumen a intensidad'
  },
  atr: { 
    name: 'ATR (Issurin)', 
    category: 'classic',
    description: 'Acumulación-Transformación-Realización en bloques concentrados'
  },
  blocks: { 
    name: 'Bloques Concentrados (Verkhoshansky)', 
    category: 'classic',
    description: 'Cargas unidireccionales concentradas en bloques específicos'
  },
  
  // Modelos Ondulatorios
  undulating_daily: { 
    name: 'Ondulatorio Diario (DUP)', 
    category: 'undulating',
    description: 'Variación diaria de volumen e intensidad para máxima adaptación'
  },
  undulating_weekly: { 
    name: 'Ondulatorio Semanal (WUP)', 
    category: 'undulating',
    description: 'Variación semanal de énfasis en cualidades físicas'
  },
  flexible_nonlinear: { 
    name: 'No Lineal Flexible (Kraemer)', 
    category: 'undulating',
    description: 'Ajuste diario basado en estado del atleta y recuperación'
  },
  
  // Modelos Contemporáneos
  conjugate: { 
    name: 'Conjugado (Westside/Simmons)', 
    category: 'contemporary',
    description: 'Desarrollo simultáneo de fuerza máxima y explosiva'
  },
  triphasic: { 
    name: 'Trifásico (Dietz)', 
    category: 'contemporary',
    description: 'Fases excéntrica, isométrica y concéntrica secuenciales'
  },
  vertical_integration: { 
    name: 'Integración Vertical (Francis)', 
    category: 'contemporary',
    description: 'Entrenamiento simultáneo de todas las cualidades con énfasis variable'
  },
  french_contrast: { 
    name: 'Contraste Francés', 
    category: 'contemporary',
    description: 'Combinación de fuerza pesada, pliometría y velocidad en cada sesión'
  },
  
  // Modelos por Deporte
  tactical: { 
    name: 'Periodización Táctica (Frade)', 
    category: 'sport_specific',
    description: 'Modelo para fútbol basado en el modelo de juego'
  },
  reverse_linear: { 
    name: 'Lineal Inversa', 
    category: 'sport_specific',
    description: 'De intensidad a volumen - ideal para deportes de resistencia'
  },
  concurrent: { 
    name: 'Concurrente', 
    category: 'sport_specific',
    description: 'Desarrollo paralelo de múltiples cualidades físicas'
  },
  polarized: { 
    name: 'Polarizado (Seiler)', 
    category: 'sport_specific',
    description: '80% baja intensidad / 20% alta intensidad - deportes de resistencia'
  },
  
  // Modelos Avanzados
  cybernetic: { 
    name: 'Cibernético (Bondarchuk)', 
    category: 'advanced',
    description: 'Auto-regulación basada en indicadores de rendimiento'
  },
  pendulum: { 
    name: 'Péndulo (Arosiev/Kalinin)', 
    category: 'advanced',
    description: 'Oscilación entre preparación general y específica'
  },
  sequential: { 
    name: 'Secuencial (Tschiene)', 
    category: 'advanced',
    description: 'Micro-bloques de 2-3 semanas con objetivos específicos'
  }
};

const MODEL_CATEGORIES = {
  classic: { name: 'Modelos Clásicos', color: 'bg-blue-100 border-blue-400', icon: '📚' },
  undulating: { name: 'Modelos Ondulatorios', color: 'bg-green-100 border-green-400', icon: '📈' },
  contemporary: { name: 'Modelos Contemporáneos', color: 'bg-purple-100 border-purple-400', icon: '🔬' },
  sport_specific: { name: 'Por Tipo de Deporte', color: 'bg-orange-100 border-orange-400', icon: '🏆' },
  advanced: { name: 'Modelos Avanzados', color: 'bg-red-100 border-red-400', icon: '🎯' }
};

const MICROCYCLE_TYPES = {
  restablecimiento: { id: 'restablecimiento', name: 'Restablecimiento', load: 45, description: 'Recuperación activa' },
  corriente: { id: 'corriente', name: 'Corriente', load: 70, description: 'Carga normal' },
  aproximacion: { id: 'aproximacion', name: 'Aproximación', load: 75, description: 'Pre-competencia' },
  carga: { id: 'carga', name: 'Carga', load: 85, description: 'Aumento de carga' },
  choque: { id: 'choque', name: 'Choque', load: 100, description: 'Carga máxima' },
  competitivo: { id: 'competitivo', name: 'Competitivo', load: 60, description: 'Semana de competencia' }
};

// ============ COMPONENTE PRINCIPAL ============
const PeriodizationComplete = ({ athleteId, athleteName, activePlan, onPlanCreated, showWizardOnly = false, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState(showWizardOnly ? 'create' : 'history');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewMode, setViewMode] = useState('structure'); // structure, calendar, chart
  
  // Plans - Now loaded from API
  const [plans, setPlans] = useState([]);
  
  // Wizard
  const [wizardStep, setWizardStep] = useState(1);
  const [planConfig, setPlanConfig] = useState({
    name: '', model: '', sport: 'general', duration: 'annual', startDate: '', 
    sessionsPerWeek: 5, athleteLevel: 'intermediate',
    mainObjective: '', mainCompetition: '', mainCompetitionDate: ''
  });
  
  // Expanded states
  const [expandedMacro, setExpandedMacro] = useState(null);
  const [expandedMeso, setExpandedMeso] = useState(null);
  const [expandedMicro, setExpandedMicro] = useState(null);
  
  // Edit Modals
  const [editModal, setEditModal] = useState({ type: null, data: null, indices: null });
  const [sessionEditorOpen, setSessionEditorOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editingSessionLocation, setEditingSessionLocation] = useState(null);
  
  // Calculator modal
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorType, setCalculatorType] = useState('1rm');
  const [calculatorResult, setCalculatorResult] = useState(null);
  
  // Sports catalog
  const [sportsCatalog, setSportsCatalog] = useState({});
  const [userSports, setUserSports] = useState([]);
  const [generatedStructure, setGeneratedStructure] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState({});

  // Get token helper
  const getToken = () => localStorage.getItem('train_token');

  // Load sports catalog (static + user's custom sports)
  useEffect(() => {
    const loadAllSports = async () => {
      const token = getToken();
      if (!token) return;
      
      try {
        // Load static sports catalog
        const staticResponse = await fetch(`${API_URL}/api/sports-catalog`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (staticResponse.ok) {
          const staticData = await staticResponse.json();
          setSportsCatalog(staticData);
        }
        
        // Load user's custom sports from /api/sports/catalog
        const userResponse = await fetch(`${API_URL}/api/sports/catalog`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserSports(userData);
        }
      } catch (error) {
        console.error('Error loading sports catalogs:', error);
      }
    };
    loadAllSports();
  }, []);

  // Load plans from API
  useEffect(() => {
    const loadPlans = async () => {
      const token = getToken();
      if (!token) return;
      
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/training-plans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          // Transform API data to match local structure and rebuild chart data
          const transformedPlans = data.map(plan => {
            const transformed = {
              ...plan,
              apiId: plan.id, // Set apiId from backend id for save/update detection
              modelName: plan.model_name || PERIODIZATION_MODELS[plan.model]?.name || plan.model,
              duration: plan.duration_type,
              totalWeeks: plan.total_weeks,
              startDate: plan.start_date,
              sessionsPerWeek: plan.sessions_per_week
            };
            rebuildPlanData(transformed);
            return transformed;
          });
          setPlans(transformedPlans);
        }
      } catch (error) {
        console.error('Error loading plans:', error);
        // Fallback to localStorage
        const saved = localStorage.getItem('train_periodization_plans');
        if (saved) setPlans(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  // Also keep localStorage as backup
  useEffect(() => {
    if (plans.length > 0) {
      localStorage.setItem('train_periodization_plans', JSON.stringify(plans));
    }
  }, [plans]);

  // Auto-seleccionar plan activo cuando se proporicona desde la sidebar
  useEffect(() => {
    if (activePlan && plans.length > 0 && !showWizardOnly) {
      const matchingPlan = plans.find(p => p.apiId === activePlan.id || p.id === activePlan.id);
      if (matchingPlan && (!selectedPlan || selectedPlan.apiId !== activePlan.id)) {
        setSelectedPlan(matchingPlan);
        setActiveView('detail');
      }
    }
  }, [activePlan, plans, showWizardOnly]);

  // ============ CRUD HANDLERS ============
  
  // MACROCICLO CRUD
  const handleAddMacrocycle = () => {
    if (!selectedPlan) return;
    const newMacro = {
      id: `macro-${Date.now()}`,
      name: 'Nuevo Macrociclo',
      phase: MACROCYCLE_PHASES[0],
      startDate: selectedPlan.endDate || selectedPlan.startDate,
      weeks: 4,
      mesocycles: []
    };
    setEditModal({ type: 'macrocycle', data: newMacro, indices: { isNew: true } });
  };

  const handleEditMacrocycle = (macro, macroIdx) => {
    setEditModal({ type: 'macrocycle', data: { ...macro }, indices: { macroIdx } });
  };

  const handleSaveMacrocycle = () => {
    const { data, indices } = editModal;
    const updatedPlan = { ...selectedPlan };
    
    if (indices.isNew) {
      // Generate mesocycles for new macrocycle
      const meso = {
        id: `meso-${Date.now()}`,
        name: `${data.phase.name} - Meso 1`,
        type: MESOCYCLE_TYPES[0],
        phase: data.phase,
        weeks: data.weeks,
        microcycles: []
      };
      data.mesocycles = [meso];
      
      if (!updatedPlan.macrocycles) updatedPlan.macrocycles = [];
      updatedPlan.macrocycles.push(data);
    } else {
      updatedPlan.macrocycles[indices.macroIdx] = data;
    }
    
    // Rebuild chart data
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setEditModal({ type: null, data: null, indices: null });
    toast.success(indices.isNew ? 'Macrociclo creado' : 'Macrociclo actualizado');
  };

  const handleDeleteMacrocycle = (macroIdx) => {
    if (!window.confirm('¿Eliminar este macrociclo y todo su contenido?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles.splice(macroIdx, 1);
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success('Macrociclo eliminado');
  };

  // MESOCICLO CRUD
  const handleAddMesocycle = (macroIdx) => {
    const newMeso = {
      id: `meso-${Date.now()}`,
      name: 'Nuevo Mesociclo',
      type: MESOCYCLE_TYPES[0],
      weeks: 4,
      microcycles: []
    };
    setEditModal({ type: 'mesocycle', data: newMeso, indices: { macroIdx, isNew: true } });
  };

  const handleEditMesocycle = (meso, macroIdx, mesoIdx) => {
    setEditModal({ type: 'mesocycle', data: { ...meso }, indices: { macroIdx, mesoIdx } });
  };

  const handleSaveMesocycle = () => {
    const { data, indices } = editModal;
    const updatedPlan = { ...selectedPlan };
    
    if (indices.isNew) {
      // Generate microcycles
      const micros = [];
      for (let i = 0; i < data.weeks; i++) {
        micros.push({
          id: `micro-${Date.now()}-${i}`,
          name: `Semana ${i + 1}`,
          type: MICROCYCLE_TYPES[i % MICROCYCLE_TYPES.length],
          sessions: generateDefaultSessions(selectedPlan.sessionsPerWeek)
        });
      }
      data.microcycles = micros;
      updatedPlan.macrocycles[indices.macroIdx].mesocycles.push(data);
    } else {
      updatedPlan.macrocycles[indices.macroIdx].mesocycles[indices.mesoIdx] = data;
    }
    
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setEditModal({ type: null, data: null, indices: null });
    toast.success(indices.isNew ? 'Mesociclo creado' : 'Mesociclo actualizado');
  };

  const handleDeleteMesocycle = (macroIdx, mesoIdx) => {
    if (!window.confirm('¿Eliminar este mesociclo?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles.splice(mesoIdx, 1);
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success('Mesociclo eliminado');
  };

  // MICROCICLO CRUD
  const handleAddMicrocycle = (macroIdx, mesoIdx) => {
    const newMicro = {
      id: `micro-${Date.now()}`,
      name: 'Nueva Semana',
      type: MICROCYCLE_TYPES[0],
      sessions: generateDefaultSessions(selectedPlan?.sessionsPerWeek || 5)
    };
    setEditModal({ type: 'microcycle', data: newMicro, indices: { macroIdx, mesoIdx, isNew: true } });
  };

  const handleEditMicrocycle = (micro, macroIdx, mesoIdx, microIdx) => {
    setEditModal({ type: 'microcycle', data: { ...micro }, indices: { macroIdx, mesoIdx, microIdx } });
  };

  const handleSaveMicrocycle = () => {
    const { data, indices } = editModal;
    const updatedPlan = { ...selectedPlan };
    
    if (indices.isNew) {
      updatedPlan.macrocycles[indices.macroIdx].mesocycles[indices.mesoIdx].microcycles.push(data);
    } else {
      updatedPlan.macrocycles[indices.macroIdx].mesocycles[indices.mesoIdx].microcycles[indices.microIdx] = data;
    }
    
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setEditModal({ type: null, data: null, indices: null });
    toast.success(indices.isNew ? 'Microciclo creado' : 'Microciclo actualizado');
  };

  const handleDeleteMicrocycle = (macroIdx, mesoIdx, microIdx) => {
    if (!window.confirm('¿Eliminar este microciclo?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles.splice(microIdx, 1);
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success('Microciclo eliminado');
  };

  // SESION CRUD
  const handleAddSession = (macroIdx, mesoIdx, microIdx) => {
    const newSession = {
      id: `session-${Date.now()}`,
      dayName: 'Nueva',
      type: 'strength',
      duration: 60,
      intensity: 'medium'
    };
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].sessions.push(newSession);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    
    const sessionIdx = updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].sessions.length - 1;
    handleEditSession(newSession, macroIdx, mesoIdx, microIdx, sessionIdx);
  };

  const handleEditSession = (session, macroIdx, mesoIdx, microIdx, sessionIdx) => {
    setEditingSession(session);
    setEditingSessionLocation({ macroIdx, mesoIdx, microIdx, sessionIdx });
    setSessionEditorOpen(true);
  };

  const handleSaveSession = async (sessionData) => {
    if (!selectedPlan || !editingSessionLocation) return;
    const { macroIdx, mesoIdx, microIdx, sessionIdx } = editingSessionLocation;
    
    const updatedPlan = { ...selectedPlan };
    const session = updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].sessions[sessionIdx];
    
    // Merge detailedData into the session
    if (sessionData.detailedData) {
      session.sessionData = sessionData.detailedData;
      session.detailed_data = sessionData.detailedData;
    } else {
      Object.assign(session, { sessionData, edited: true });
    }
    session.edited = true;
    
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    
    // Persist to backend
    try {
      await savePlanToAPI(updatedPlan);
    } catch (e) {
      console.error('Error saving session to API:', e);
    }
    
    toast.success('Sesión guardada');
  };

  const handleDeleteSession = (macroIdx, mesoIdx, microIdx, sessionIdx) => {
    if (!window.confirm('¿Eliminar esta sesión?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].sessions.splice(sessionIdx, 1);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success('Sesión eliminada');
  };

  // ============ HELPERS ============
  
  // Helper to find sport name from both catalogs
  const getSportName = (sportId) => {
    // First check user's custom sports
    for (const category of userSports) {
      const sport = category.sports?.find(s => s.id === sportId);
      if (sport) return sport.name;
    }
    // Then check static catalog
    for (const category of Object.keys(sportsCatalog)) {
      const sport = sportsCatalog[category]?.find(s => s.id === sportId);
      if (sport) return sport.name;
    }
    // Fallback to planConfig.sportName or the id itself
    return planConfig.sportName || sportId;
  };
  
  const generateDefaultSessions = (count) => {
    const days = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
    const types = ['strength', 'endurance', 'speed', 'technical', 'recovery'];
    const objectives = ['Hipertrofia', 'Potencia', 'VO2max', 'Agilidad', 'Recuperacion activa'];
    const contents = ['Sentadillas, Press, Remo', 'Carrera continua', 'Sprints 30m', 'Tecnica especifica', 'Movilidad, Foam roller'];
    const muscles = ['Tren inferior', 'Cardiovascular', 'Tren superior', 'Core + Cadena posterior', 'General'];
    return Array.from({ length: count }, (_, i) => ({
      id: `session-${Date.now()}-${i}`,
      dayName: days[i % 7],
      type: types[i % types.length],
      duration: [90, 60, 45, 75, 40][i % 5],
      intensity: ['high', 'medium', 'high', 'medium', 'low'][i % 5],
      rpe: [8, 6, 9, 7, 4][i % 5],
      volume: [85, 70, 60, 75, 30][i % 5],
      internalLoad: [320, 220, 280, 250, 80][i % 5],
      externalLoad: [4500, 0, 0, 2000, 0][i % 5],
      status: 'planned',
      objective: objectives[i % 5],
      contents: contents[i % 5],
      muscleGroup: muscles[i % 5],
      fatigue: [7, 5, 8, 6, 2][i % 5],
      recovery: [48, 24, 72, 36, 12][i % 5],
      notes: ''
    }));
  };

  const rebuildPlanData = (plan) => {
    // Rebuild chart data from macrocycles
    const chartData = [];
    let weekNum = 1;
    
    plan.macrocycles?.forEach(macro => {
      macro.mesocycles?.forEach(meso => {
        meso.microcycles?.forEach(micro => {
          const phase = macro.phase || MACROCYCLE_PHASES[0];
          chartData.push({
            semana: `S${weekNum}`,
            week: weekNum,
            volumen: phase.volumePercent * (meso.type?.loadFactor || 1),
            intensidad: phase.intensityPercent,
            fase: phase.name,
            color: phase.color
          });
          weekNum++;
        });
      });
    });
    
    plan.chartData = chartData;
    plan.totalWeeks = weekNum - 1;
  };

  const generatePlanStructure = () => {
    const { duration, startDate, sessionsPerWeek, model, name } = planConfig;
    const totalWeeks = CYCLE_DURATIONS[duration]?.weeks || 52;
    
    // Create macrocycles based on duration
    const macrocycles = [];
    let phaseDist = [];
    
    if (totalWeeks >= 52) {
      phaseDist = [
        { phase: MACROCYCLE_PHASES[0], weeks: Math.floor(totalWeeks * 0.25) },
        { phase: MACROCYCLE_PHASES[1], weeks: Math.floor(totalWeeks * 0.20) },
        { phase: MACROCYCLE_PHASES[2], weeks: Math.floor(totalWeeks * 0.15) },
        { phase: MACROCYCLE_PHASES[3], weeks: Math.floor(totalWeeks * 0.35) },
        { phase: MACROCYCLE_PHASES[4], weeks: Math.floor(totalWeeks * 0.05) }
      ];
    } else if (totalWeeks >= 13) {
      phaseDist = [
        { phase: MACROCYCLE_PHASES[0], weeks: Math.floor(totalWeeks * 0.30) },
        { phase: MACROCYCLE_PHASES[1], weeks: Math.floor(totalWeeks * 0.25) },
        { phase: MACROCYCLE_PHASES[2], weeks: Math.floor(totalWeeks * 0.15) },
        { phase: MACROCYCLE_PHASES[3], weeks: Math.floor(totalWeeks * 0.25) },
        { phase: MACROCYCLE_PHASES[4], weeks: Math.floor(totalWeeks * 0.05) }
      ];
    } else {
      phaseDist = [
        { phase: MACROCYCLE_PHASES[0], weeks: 1 },
        { phase: MACROCYCLE_PHASES[1], weeks: totalWeeks - 2 },
        { phase: MACROCYCLE_PHASES[4], weeks: 1 }
      ];
    }

    phaseDist.forEach(({ phase, weeks }, idx) => {
      if (weeks <= 0) return;
      
      const mesocycles = [];
      const mesosCount = Math.ceil(weeks / 4);
      
      for (let m = 0; m < mesosCount; m++) {
        const mesoWeeks = Math.min(4, weeks - m * 4);
        if (mesoWeeks <= 0) continue;
        
        const microcycles = [];
        for (let w = 0; w < mesoWeeks; w++) {
          microcycles.push({
            id: `micro-${Date.now()}-${idx}-${m}-${w}`,
            name: `Semana ${w + 1}`,
            type: MICROCYCLE_TYPES[w % MICROCYCLE_TYPES.length],
            volume: phase.volumePercent,
            intensity: phase.intensityPercent,
            sessions: generateDefaultSessions(sessionsPerWeek)
          });
        }
        
        mesocycles.push({
          id: `meso-${Date.now()}-${idx}-${m}`,
          name: `${phase.abbr} - Meso ${m + 1}`,
          type: MESOCYCLE_TYPES[m % MESOCYCLE_TYPES.length],
          phase,
          microcycles
        });
      }
      
      macrocycles.push({
        id: `macro-${Date.now()}-${idx}`,
        name: phase.name,
        phase,
        weeks,
        mesocycles
      });
    });

    const plan = {
      id: `plan-${Date.now()}`,
      name: name || `Plan ${new Date().getFullYear()}`,
      athleteId,
      model,
      modelName: PERIODIZATION_MODELS[model]?.name || model,
      duration,
      startDate,
      sessionsPerWeek,
      mainObjective: planConfig.mainObjective,
      macrocycles,
      chartData: [],
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    rebuildPlanData(plan);
    return plan;
  };

  // Save plan to API
  const savePlanToAPI = async (plan) => {
    const token = getToken();
    if (!token) return plan;
    
    setSaving(true);
    try {
      // Transform to API format
      const apiPlan = {
        name: plan.name,
        athlete_id: plan.athleteId || athleteId || null,
        sport: plan.sport || 'General',
        model: plan.model,
        duration_type: plan.duration,
        total_weeks: plan.totalWeeks || CYCLE_DURATIONS[plan.duration]?.weeks || 52,
        start_date: plan.startDate,
        sessions_per_week: plan.sessionsPerWeek || 5,
        main_objective: plan.mainObjective || '',
        main_competition: plan.mainCompetition || null,
        main_competition_date: plan.mainCompetitionDate || null,
        macrocycles: plan.macrocycles.map(macro => ({
          id: macro.id,
          name: macro.name,
          phase: macro.phase?.id || macro.phase?.name || macro.phase || 'prep_general',
          start_date: macro.start_date || macro.startDate || plan.startDate,
          end_date: macro.end_date || macro.endDate || plan.startDate,
          weeks: macro.weeks || 4,
          volume_percent: macro.volume_percent || macro.phase?.volumePercent || 80,
          intensity_percent: macro.intensity_percent || macro.phase?.intensityPercent || 60,
          objectives: macro.objectives || [],
          mesocycles: (macro.mesocycles || []).map(meso => ({
            id: meso.id,
            name: meso.name,
            type: meso.type?.id || meso.type || 'basico_desarrollador',
            phase: meso.phase?.id || meso.phase || 'development',
            weeks: meso.weeks || meso.microcycles?.length || 4,
            load_factor: meso.load_factor || meso.type?.loadFactor || 1.0,
            volume_percent: meso.volume_percent || meso.volume || 80,
            intensity_percent: meso.intensity_percent || meso.intensity || 70,
            objectives: meso.objectives || [],
            microcycles: (meso.microcycles || []).map(micro => ({
              id: micro.id,
              name: micro.name,
              week_number: micro.week_number || micro.weekNumber || 1,
              type: micro.type?.id || micro.type || 'corriente',
              load_percent: micro.load_percent || micro.type?.load || 70,
              volume: micro.volume || 100,
              intensity: micro.intensity || 70,
              objectives: micro.objectives || [],
              sessions: (micro.sessions || []).map(session => ({
                id: session.id,
                day: session.day,
                name: session.name || 'Sesión',
                session_type: session.session_type || session.type || 'general',
                duration_minutes: session.duration_minutes || session.duration || 60,
                intensity: session.intensity || 70,
                volume: session.volume || 100,
                objectives: session.objectives || [],
                exercises: session.exercises || [],
                notes: session.notes || null,
                detailed_data: session.sessionData || session.detailed_data || null
              }))
            }))
          }))
        }))
      };
      
      let response;
      if (plan.apiId) {
        // Update existing
        response = await fetch(`${API_URL}/api/training-plans/${plan.apiId}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiPlan)
        });
      } else {
        // Create new
        response = await fetch(`${API_URL}/api/training-plans`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(apiPlan)
        });
      }
      
      if (response.ok) {
        const savedPlan = await response.json();
        plan.apiId = savedPlan.id;
        plan.shareToken = savedPlan.share_token;
        return plan;
      } else {
        const error = await response.json();
        console.error('API save error:', error);
      }
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setSaving(false);
    }
    return plan;
  };

  const handleCreatePlan = async () => {
    if (!planConfig.startDate || !planConfig.model) {
      toast.error('Completa los campos requeridos');
      return;
    }
    const plan = generatePlanStructure();
    
    // Save to API
    const savedPlan = await savePlanToAPI(plan);
    
    setPlans(prev => [savedPlan, ...prev]);
    setSelectedPlan(savedPlan);
    setActiveView('detail');
    toast.success('Plan creado y guardado exitosamente');
    
    // Callback to parent component
    if (onPlanCreated) {
      onPlanCreated(savedPlan);
    }
  };

  const handleSavePlan = async () => {
    if (!selectedPlan) return;
    
    const savedPlan = await savePlanToAPI(selectedPlan);
    setPlans(prev => prev.map(p => p.id === savedPlan.id ? savedPlan : p));
    setSelectedPlan(savedPlan);
    toast.success('Plan guardado exitosamente');
  };

  const handleDeletePlan = async (planId) => {
    if (!window.confirm('¿Eliminar este plan?')) return;
    
    const plan = plans.find(p => p.id === planId);
    
    // Delete from API if it has apiId
    if (plan?.apiId) {
      try {
        const token = getToken();
        await fetch(`${API_URL}/api/training-plans/${plan.apiId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (error) {
        console.error('Error deleting from API:', error);
      }
    }
    
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (selectedPlan?.id === planId) {
      setSelectedPlan(null);
      setActiveView('history');
    }
    toast.success('Plan eliminado');
  };

  const handleDuplicatePlan = async (planId) => {
    const original = plans.find(p => p.id === planId);
    if (!original) return;
    
    // Deep copy
    const duplicated = JSON.parse(JSON.stringify(original));
    duplicated.id = `plan-${Date.now()}`;
    duplicated.name = `${original.name} (Copia)`;
    duplicated.apiId = null; // Will create new on save
    duplicated.shareToken = null;
    duplicated.createdAt = new Date().toISOString();
    
    // Regenerate all IDs
    duplicated.macrocycles.forEach((macro, mi) => {
      macro.id = `macro-${Date.now()}-${mi}`;
      macro.mesocycles?.forEach((meso, msi) => {
        meso.id = `meso-${Date.now()}-${mi}-${msi}`;
        meso.microcycles?.forEach((micro, mici) => {
          micro.id = `micro-${Date.now()}-${mi}-${msi}-${mici}`;
          micro.sessions?.forEach((s, si) => {
            s.id = `session-${Date.now()}-${mi}-${msi}-${mici}-${si}`;
          });
        });
      });
    });
    
    rebuildPlanData(duplicated);
    const savedPlan = await savePlanToAPI(duplicated);
    
    setPlans(prev => [savedPlan, ...prev]);
    toast.success('Plan duplicado exitosamente');
  };

  const handleSharePlan = async () => {
    if (!selectedPlan?.apiId) {
      toast.error('Guarda el plan primero');
      return;
    }
    
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/training-plans/${selectedPlan.apiId}/share`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const shareUrl = `${window.location.origin}${data.share_url}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl);
        
        setSelectedPlan(prev => ({ ...prev, shareToken: data.share_token }));
        toast.success('Link copiado al portapapeles');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Error al compartir');
    }
  };

  const handleExportPDF = async () => {
    if (!selectedPlan?.apiId) {
      toast.error('Guarda el plan primero para exportar');
      return;
    }
    
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/training-plans/${selectedPlan.apiId}/export/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plan_${selectedPlan.name.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('PDF descargado');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar');
    }
  };

  // ============ SCIENTIFIC CALCULATORS ============
  const openCalculator = (type) => {
    setCalculatorType(type);
    setCalculatorResult(null);
    setCalculatorOpen(true);
  };

  const runCalculation = async (type, params) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/calculators/load`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ calculation_type: type, params })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalculatorResult(data);
        return data;
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Error en el cálculo');
    }
    return null;
  };

  // ============ AUTO GENERATE STRUCTURE ============
  const generateAutoStructure = async () => {
    if (!planConfig.model || !planConfig.sport || !planConfig.startDate) {
      toast.error('Selecciona modelo, deporte y fecha de inicio');
      return;
    }
    
    setGenerating(true);
    try {
      const token = getToken();
      const totalWeeks = CYCLE_DURATIONS[planConfig.duration]?.weeks || 52;
      
      const response = await fetch(`${API_URL}/api/generate-structure`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: planConfig.model,
          sport: planConfig.sport,
          total_weeks: totalWeeks,
          start_date: planConfig.startDate,
          sessions_per_week: planConfig.sessionsPerWeek,
          athlete_level: planConfig.athleteLevel,
          main_competition_date: planConfig.mainCompetitionDate || null
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setGeneratedStructure(data);
        toast.success('Estructura generada exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al generar estructura');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Error al generar estructura');
    } finally {
      setGenerating(false);
    }
  };

  // Create plan from generated structure
  const handleCreateFromGenerated = async () => {
    if (!generatedStructure) {
      toast.error('Primero genera la estructura');
      return;
    }
    
    const plan = {
      id: `plan-${Date.now()}`,
      name: planConfig.name || `Plan ${generatedStructure.sport_name} - ${generatedStructure.model_name}`,
      model: generatedStructure.model,
      modelName: generatedStructure.model_name,
      sport: generatedStructure.sport,
      sportName: generatedStructure.sport_name,
      duration: planConfig.duration,
      totalWeeks: generatedStructure.total_weeks,
      startDate: planConfig.startDate,
      sessionsPerWeek: generatedStructure.sessions_per_week,
      athleteLevel: planConfig.athleteLevel,
      mainObjective: planConfig.mainObjective || generatedStructure.primary_qualities.join(', '),
      mainCompetition: planConfig.mainCompetition,
      mainCompetitionDate: planConfig.mainCompetitionDate,
      macrocycles: generatedStructure.macrocycles.map(macro => ({
        ...macro,
        phase: {
          id: macro.phase,
          name: macro.name,
          volumePercent: macro.volume_percent,
          intensityPercent: macro.intensity_percent,
          color: ['#3B82F6', '#8B5CF6', '#F59E0B', '#10B981', '#6B7280'][Math.floor(Math.random() * 5)]
        },
        mesocycles: (macro.mesocycles || []).map(meso => ({
          ...meso,
          type: {
            id: meso.type,
            name: meso.name.split(' - ')[1] || meso.name,
            loadFactor: meso.load_factor || 1.0
          },
          microcycles: (meso.microcycles || []).map(micro => ({
            ...micro,
            type: MICROCYCLE_TYPES[micro.type] || { id: micro.type, name: micro.type, load: micro.load_percent }
          }))
        }))
      })),
      chartData: generatedStructure.volume_chart.map((v, i) => ({
        ...v,
        intensity: generatedStructure.intensity_chart[i]?.intensity || 0
      })),
      createdAt: new Date().toISOString()
    };
    
    rebuildPlanData(plan);
    
    // Save to API
    const savedPlan = await savePlanToAPI(plan);
    
    setPlans(prev => [savedPlan, ...prev]);
    setSelectedPlan(savedPlan);
    setActiveView('detail');
    setGeneratedStructure(null);
    toast.success('Plan creado exitosamente con estructura generada');
    
    // Callback to parent component
    if (onPlanCreated) {
      onPlanCreated(savedPlan);
    }
  };

  // ============ RENDER: HISTORY ============
  const renderHistory = () => (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-[#CCFF00]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Planes de Periodizacion</h2>
            <p className="text-slate-400 text-[13px]">{plans.length} planes creados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-lg h-9 text-[12px] border-slate-300" onClick={() => openCalculator('1rm')}>
            <Activity className="w-3.5 h-3.5 mr-1.5" /> Calculadoras
          </Button>
          <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 text-[12px] font-semibold" onClick={() => { 
            setWizardStep(1); 
            setPlanConfig({ name: '', model: '', sport: 'general', duration: 'annual', startDate: '', sessionsPerWeek: 5, athleteLevel: 'intermediate', mainObjective: '', mainCompetition: '', mainCompetitionDate: '' }); 
            setGeneratedStructure(null);
            setActiveView('create'); 
          }} data-testid="new-plan-btn">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Nuevo Plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando planes...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-500 mb-2">Sin planes de periodizacion</h3>
          <p className="text-slate-400 mb-5 text-sm">Crea tu primer plan con el wizard inteligente</p>
          <Button onClick={() => setActiveView('create')} className="bg-slate-900 text-white rounded-lg"><Plus className="w-4 h-4 mr-2" /> Crear Plan</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => {
            const phaseColor = plan.macrocycles?.[0]?.phase?.color || '#3B82F6';
            return (
            <div
              key={plan.id}
              className="group bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5"
              onClick={() => { setSelectedPlan(plan); setActiveView('detail'); }}
              data-testid={`plan-card-${plan.id}`}
            >
              <div className="flex items-center">
                {/* Color strip */}
                <div className="w-1.5 self-stretch" style={{ backgroundColor: phaseColor }} />
                <div className="flex-1 flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-[11px]" style={{ backgroundColor: phaseColor, fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {plan.macrocycles?.[0]?.phase?.abbr || 'PL'}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-[14px]">{plan.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">{plan.totalWeeks} sem</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[11px] text-slate-400">{plan.macrocycles?.length || 0} macro</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[11px] text-slate-500 font-medium">{plan.modelName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {plan.apiId && (
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-200">Guardado</span>
                    )}
                    {/* Phase mini bar */}
                    {plan.macrocycles?.length > 0 && (
                      <div className="hidden md:flex h-6 w-20 gap-[1px] items-end rounded overflow-hidden">
                        {plan.macrocycles.map((m, i) => (
                          <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.max(30, (m.phase?.volumePercent || 50))}%`, backgroundColor: m.phase?.color || '#94a3b8', opacity: 0.7 }} />
                        ))}
                      </div>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDuplicatePlan(plan.id); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============ RENDER: CREATE WIZARD ============
  const renderCreate = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Crear Plan de Entrenamiento</h2>
        <Button variant="outline" onClick={() => { if (showWizardOnly && onBack) { onBack(); } else { setActiveView('history'); } setGeneratedStructure(null); }}><ChevronLeft className="w-4 h-4 mr-2" /> Volver</Button>
      </div>

      {/* Steps */}
      <div className="flex justify-center gap-1 bg-slate-100 p-3 rounded-xl overflow-x-auto">
        {[1, 2, 3, 4, 5].map(step => (
          <div key={step} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${wizardStep === step ? 'bg-blue-500 text-white' : wizardStep > step ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500'}`}>
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold bg-white/20">{wizardStep > step ? <Check className="w-4 h-4" /> : step}</span>
            <span className="text-xs font-medium hidden md:inline">{['Deporte', 'Modelo', 'Duración', 'Estructura', 'Resumen'][step - 1]}</span>
          </div>
        ))}
      </div>

      <Card className="shadow-lg">
        <CardContent className="p-8">
          {/* STEP 1: SPORT SELECTION */}
          {wizardStep === 1 && (
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
              <h3 className="text-xl font-bold text-center sticky top-0 bg-white py-2 z-10">Selecciona el Deporte</h3>
              
              {/* User's Custom Sports from Información -> Deportes */}
              {userSports.length > 0 && userSports.some(cat => cat.sports?.length > 0) && (
                <div className="space-y-3">
                  <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-500">
                    <h4 className="font-bold text-blue-700">⭐ Mis Deportes (Personalizados)</h4>
                    <p className="text-xs text-blue-600">Deportes creados en Información → Deportes</p>
                  </div>
                  {userSports.filter(cat => cat.sports?.length > 0).map(category => (
                    <div key={category.id} className="pl-2">
                      <p className="text-sm font-medium text-slate-600 mb-2">{category.icon || '🏅'} {category.name}</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {category.sports.map(sport => (
                          <div 
                            key={sport.id} 
                            className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${planConfig.sport === sport.id ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-blue-200 hover:border-blue-300 hover:bg-blue-50/50'}`} 
                            onClick={() => setPlanConfig({ ...planConfig, sport: sport.id, sportName: sport.name, sessionsPerWeek: sport.sessions_per_week || 4 })}
                          >
                            <p className="font-semibold text-slate-800 text-sm">{sport.name}</p>
                            <p className="text-xs text-slate-500">{sport.sessions_per_week || 4} ses/sem</p>
                            {planConfig.sport === sport.id && <CheckCircle className="w-4 h-4 text-blue-500 mt-1" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Divider if both catalogs have content */}
              {userSports.length > 0 && userSports.some(cat => cat.sports?.length > 0) && Object.keys(sportsCatalog).length > 0 && (
                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-slate-200"></div>
                  <span className="text-xs text-slate-400 font-medium">Deportes Predefinidos</span>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>
              )}
              
              {/* Static Sports Catalog */}
              {Object.entries(sportsCatalog).map(([category, sports]) => (
                <div key={category} className="space-y-3">
                  <div className="px-3 py-2 rounded-lg bg-slate-100 border-l-4 border-slate-400">
                    <h4 className="font-bold text-slate-700 capitalize">{category === 'strength' ? '💪 Fuerza' : category === 'endurance' ? '🏃 Resistencia' : category === 'speed' ? '⚡ Velocidad' : category === 'team' ? '⚽ Equipos' : category === 'combat' ? '🥊 Combate' : category === 'racquet' ? '🎾 Raqueta' : category === 'fitness' ? '🏋️ Fitness' : '🏅 General'}</h4>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pl-2">
                    {sports.map(sport => (
                      <div 
                        key={sport.id} 
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${planConfig.sport === sport.id ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`} 
                        onClick={() => setPlanConfig({ ...planConfig, sport: sport.id, sportName: sport.name, sessionsPerWeek: sport.sessions_per_week })}
                      >
                        <p className="font-semibold text-slate-800 text-sm">{sport.name}</p>
                        <p className="text-xs text-slate-500">{sport.sessions_per_week} ses/sem</p>
                        {planConfig.sport === sport.id && <CheckCircle className="w-4 h-4 text-blue-500 mt-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Athlete Level */}
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-bold text-slate-700 mb-3">Nivel del Atleta</h4>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'beginner', name: 'Principiante', desc: '< 1 año' },
                    { id: 'intermediate', name: 'Intermedio', desc: '1-3 años' },
                    { id: 'advanced', name: 'Avanzado', desc: '3-6 años' },
                    { id: 'elite', name: 'Élite', desc: '6+ años' }
                  ].map(level => (
                    <button 
                      key={level.id}
                      className={`px-4 py-2 rounded-lg border-2 transition-all ${planConfig.athleteLevel === level.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                      onClick={() => setPlanConfig({ ...planConfig, athleteLevel: level.id })}
                    >
                      <p className="font-semibold text-sm">{level.name}</p>
                      <p className="text-xs text-slate-500">{level.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MODEL SELECTION */}
          {wizardStep === 2 && (
            <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-2">
              <h3 className="text-xl font-bold text-center sticky top-0 bg-white py-2 z-10">Modelo de Periodización</h3>
              {Object.entries(MODEL_CATEGORIES).map(([categoryId, category]) => {
                const modelsInCategory = Object.entries(PERIODIZATION_MODELS).filter(([_, m]) => m.category === categoryId);
                if (modelsInCategory.length === 0) return null;
                return (
                  <div key={categoryId} className="space-y-3">
                    <div className={`px-3 py-2 rounded-lg ${category.color} border-l-4`}>
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <span>{category.icon}</span> {category.name}
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                      {modelsInCategory.map(([id, model]) => (
                        <div 
                          key={id} 
                          className={`p-3 rounded-2xl border-2 cursor-pointer transition-all ${planConfig.model === id ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`} 
                          onClick={() => setPlanConfig({ ...planConfig, model: id })}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800 text-sm">{model.name}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{model.description}</p>
                            </div>
                            {planConfig.model === id && (
                              <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 3: DURATION */}
          {wizardStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-center">Duración del Ciclo</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(CYCLE_DURATIONS).map(([id, dur]) => (
                  <div key={id} className={`p-4 rounded-2xl border-2 cursor-pointer text-center ${planConfig.duration === id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`} onClick={() => setPlanConfig({ ...planConfig, duration: id })}>
                    <p className="text-2xl font-bold text-blue-600">{dur.weeks}</p>
                    <p className="text-sm text-slate-500">semanas</p>
                    <p className="font-semibold mt-1">{dur.label}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Fecha de Inicio</label>
                  <Input type="date" value={planConfig.startDate} onChange={(e) => setPlanConfig({ ...planConfig, startDate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Sesiones/Semana</label>
                  <Select value={planConfig.sessionsPerWeek.toString()} onValueChange={(v) => setPlanConfig({ ...planConfig, sessionsPerWeek: parseInt(v) })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{[3, 4, 5, 6, 7].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Competencia Principal (opcional)</label>
                  <Input placeholder="Ej: Campeonato Nacional" value={planConfig.mainCompetition} onChange={(e) => setPlanConfig({ ...planConfig, mainCompetition: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Fecha Competencia</label>
                  <Input type="date" value={planConfig.mainCompetitionDate} onChange={(e) => setPlanConfig({ ...planConfig, mainCompetitionDate: e.target.value })} className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: STRUCTURE GENERATION */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-center">Generar Estructura Automática</h3>
              <p className="text-center text-slate-500">El sistema generará la estructura óptima basada en el modelo, deporte y duración seleccionados</p>
              
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500">Deporte</p>
                    <p className="font-bold text-slate-700">{getSportName(planConfig.sport)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Modelo</p>
                    <p className="font-bold text-slate-700">{PERIODIZATION_MODELS[planConfig.model]?.name || planConfig.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Duración</p>
                    <p className="font-bold text-slate-700">{CYCLE_DURATIONS[planConfig.duration]?.weeks || 52} semanas</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Nivel</p>
                    <p className="font-bold text-slate-700 capitalize">{planConfig.athleteLevel}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-center">
                <Button 
                  onClick={generateAutoStructure} 
                  disabled={generating || !planConfig.startDate}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 text-lg"
                >
                  {generating ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando...</>
                  ) : (
                    <><Activity className="w-5 h-5 mr-2" /> Generar Estructura Científica</>
                  )}
                </Button>
                {!planConfig.startDate && <p className="text-sm text-red-500 mt-2">Selecciona fecha de inicio en el paso anterior</p>}
              </div>
              
              {/* Generated Structure Preview */}
              {generatedStructure && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 space-y-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-6 h-6" />
                    <h4 className="font-bold text-lg">Estructura Generada Exitosamente</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-blue-600">{generatedStructure.summary.total_macrocycles}</p>
                      <p className="text-xs text-slate-500">Macrociclos</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-purple-600">{generatedStructure.summary.total_mesocycles}</p>
                      <p className="text-xs text-slate-500">Mesociclos</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-green-600">{generatedStructure.summary.total_microcycles}</p>
                      <p className="text-xs text-slate-500">Microciclos</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-orange-600">{generatedStructure.summary.total_sessions}</p>
                      <p className="text-xs text-slate-500">Sesiones</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-slate-700">{generatedStructure.summary.avg_volume}%</p>
                      <p className="text-xs text-slate-500">Vol. Promedio</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-700 mb-2">Fases del Plan:</h5>
                    <div className="flex flex-wrap gap-2">
                      {generatedStructure.summary.phases.map((phase, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-700">
                          {phase.name}: {phase.weeks} sem
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-700 mb-2">Cualidades Principales:</h5>
                    <div className="flex flex-wrap gap-2">
                      {generatedStructure.primary_qualities.map((q, i) => (
                        <Badge key={i} className="bg-green-100 text-green-700 capitalize">
                          {q.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: SUMMARY */}
          {wizardStep === 5 && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-center">Resumen Final</h3>
              <div>
                <label className="text-sm font-medium">Nombre del Plan</label>
                <Input 
                  placeholder={`Plan ${getSportName(planConfig.sport)} - ${PERIODIZATION_MODELS[planConfig.model]?.name || ''}`} 
                  value={planConfig.name} 
                  onChange={(e) => setPlanConfig({ ...planConfig, name: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Objetivo Principal</label>
                <textarea className="w-full mt-1 p-3 border rounded-lg" rows={3} placeholder="Descripción del objetivo..." value={planConfig.mainObjective} onChange={(e) => setPlanConfig({ ...planConfig, mainObjective: e.target.value })} />
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                <h4 className="font-bold text-slate-700 mb-4 text-center">Configuración del Plan</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500">Deporte</p>
                    <p className="font-bold text-slate-700">{getSportName(planConfig.sport)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Modelo</p>
                    <p className="font-bold text-blue-600">{PERIODIZATION_MODELS[planConfig.model]?.name || planConfig.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Duración</p>
                    <p className="font-bold text-slate-700">{CYCLE_DURATIONS[planConfig.duration]?.weeks || 52} semanas</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Sesiones/Sem</p>
                    <p className="font-bold text-slate-700">{planConfig.sessionsPerWeek}</p>
                  </div>
                </div>
                
                {generatedStructure && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{generatedStructure.summary.total_macrocycles}</p>
                        <p className="text-xs text-slate-500">Macrociclos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{generatedStructure.summary.total_mesocycles}</p>
                        <p className="text-xs text-slate-500">Mesociclos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{generatedStructure.summary.total_microcycles}</p>
                        <p className="text-xs text-slate-500">Microciclos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{generatedStructure.summary.total_sessions}</p>
                        <p className="text-xs text-slate-500">Sesiones</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <Button variant="outline" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : (showWizardOnly && onBack ? onBack() : setActiveView('history'))}>
              <ChevronLeft className="w-4 h-4 mr-2" /> {wizardStep > 1 ? 'Anterior' : 'Cancelar'}
            </Button>
            {wizardStep < 5 ? (
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6" 
                onClick={() => setWizardStep(wizardStep + 1)} 
                disabled={(wizardStep === 1 && !planConfig.sport) || (wizardStep === 2 && !planConfig.model) || (wizardStep === 3 && !planConfig.startDate)}
              >
                Siguiente <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-6" 
                onClick={generatedStructure ? handleCreateFromGenerated : handleCreatePlan} 
                disabled={!planConfig.startDate}
              >
                <Check className="w-4 h-4 mr-2" /> {generatedStructure ? 'Crear con Estructura' : 'Crear Plan'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ============ RENDER: DETAIL VIEW ============
  const renderDetail = () => {
    if (!selectedPlan) return null;
    const BC = "'Barlow Condensed', sans-serif";
    const totalMesos = selectedPlan.macrocycles?.reduce((s, m) => s + (m.mesocycles?.length || 0), 0) || 0;
    const totalMicros = selectedPlan.macrocycles?.reduce((s, m) => s + m.mesocycles?.reduce((s2, me) => s2 + (me.microcycles?.length || 0), 0), 0) || 0;

    return (
      <div className="space-y-5">
        {/* Hero header */}
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden" data-testid="plan-detail-header">
          <div className="absolute inset-0 opacity-[0.06]">
            <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:16px_16px]" />
          </div>
          <div className="relative z-10 p-6">
            <div className="flex items-start justify-between">
              <div>
                {!activePlan && (
                <button onClick={() => { setActiveView('history'); setSelectedPlan(null); }} className="text-[11px] text-slate-400 hover:text-white transition-colors mb-3 flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> Volver a planes
                </button>
                )}
                <h2 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: BC }}>{selectedPlan.name}</h2>
                <p className="text-slate-400 text-sm mt-1">{selectedPlan.totalWeeks} sem &middot; {selectedPlan.modelName}</p>
                <div className="flex gap-5 mt-4">
                  {[
                    { v: selectedPlan.macrocycles?.length || 0, l: 'Macrociclos', c: '#007AFF' },
                    { v: totalMesos, l: 'Mesociclos', c: '#8B5CF6' },
                    { v: totalMicros, l: 'Semanas', c: '#10B981' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="text-xl font-black text-white leading-none" style={{ fontFamily: BC }}>{s.v}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: s.c }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSavePlan} disabled={saving} className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg h-9 text-[12px]" data-testid="save-plan-btn">
                  {saving ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />} Guardar
                </Button>
                <Button variant="outline" size="sm" onClick={handleSharePlan} className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg h-9 text-[12px]">
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Compartir
                </Button>
                <Button size="sm" onClick={handleExportPDF} className="bg-[#007AFF] hover:bg-[#0066dd] text-white rounded-lg h-9 text-[12px]" data-testid="export-pdf-btn">
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> PDF
                </Button>
              </div>
            </div>
            {/* Phase strip */}
            {selectedPlan.macrocycles?.length > 0 && (
              <div className="flex h-2 rounded-full overflow-hidden mt-5 gap-[2px]">
                {selectedPlan.macrocycles.map((macro, idx) => (
                  <div key={idx} className="rounded-full transition-all" style={{ backgroundColor: macro.phase?.color || '#475569', flex: macro.weeks || 1 }} title={`${macro.phase?.name || macro.name}: ${macro.weeks}s`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* View Mode Tabs - Floating Round Style */}
        <div className="flex items-start gap-4 pt-2" data-testid="view-mode-tabs">
          {[
            { id: 'structure', icon: Layers, label: 'Estructura', color: '#007AFF' },
            { id: 'calendar', icon: CalendarDays, label: 'Calendario', color: '#8B5CF6' },
            { id: 'chart', icon: BarChart3, label: 'Gráfico', color: '#10B981' }
          ].map(({ id, icon: Icon, label, color }) => (
            <button key={id} className="group flex flex-col items-center gap-1.5 outline-none" onClick={() => setViewMode(id)} data-testid={`view-${id}`}>
              <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${viewMode === id ? 'text-white shadow-lg' : 'bg-white text-slate-400 shadow-sm border border-slate-200 hover:shadow-md'}`} style={viewMode === id ? { backgroundColor: color } : {}}>
                <Icon className={`w-5 h-5 ${viewMode === id ? 'text-white' : 'group-hover:text-slate-600'}`} strokeWidth={viewMode === id ? 2.5 : 1.8} />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${viewMode === id ? 'font-bold' : 'text-slate-400 group-hover:text-slate-500'}`} style={viewMode === id ? { color } : {}}>
                {label}
              </span>
            </button>
          ))}
        </div>

        {viewMode === 'structure' && renderStructureView()}
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'chart' && renderChartView()}
      </div>
    );
  };

  // ============ RENDER: STRUCTURE (Premium Sports SaaS Design) ============
  const renderStructureView = () => {
    const BC = "'Barlow Condensed', sans-serif";
    const totalWeeks = selectedPlan.totalWeeks || 0;
    const completedWeeks = 0; // TODO: track from actual data
    const progressPct = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

    // Helpers
    const IntensityBadge = ({ level, size = 'sm' }) => {
      const cfg = { high: { label: 'ALTA', color: '#EF4444', bg: '#FEE2E2' }, medium: { label: 'MED', color: '#F59E0B', bg: '#FEF3C7' }, low: { label: 'BAJA', color: '#10B981', bg: '#D1FAE5' } };
      const c = cfg[level] || cfg.medium;
      return <span className={`inline-flex items-center font-bold rounded ${size === 'xs' ? 'text-[8px] px-1 py-[1px]' : 'text-[10px] px-1.5 py-0.5'}`} style={{ color: c.color, backgroundColor: c.bg }}>{c.label}</span>;
    };

    const StatusBadge = ({ status }) => {
      const cfg = { planned: { label: 'Planificada', color: '#3B82F6', bg: '#EFF6FF' }, completed: { label: 'Completada', color: '#10B981', bg: '#D1FAE5' }, adjusted: { label: 'Ajustada', color: '#F59E0B', bg: '#FEF3C7' }, cancelled: { label: 'Cancelada', color: '#6B7280', bg: '#F3F4F6' } };
      const c = cfg[status] || cfg.planned;
      return <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ color: c.color, backgroundColor: c.bg }}>{c.label}</span>;
    };

    const MiniBar = ({ value, max = 100, color = '#3B82F6', h = 'h-1.5' }) => (
      <div className={`w-full bg-slate-100 rounded-full ${h} overflow-hidden`}>
        <div className={`${h} rounded-full transition-all`} style={{ width: `${Math.min((value / max) * 100, 100)}%`, backgroundColor: color }} />
      </div>
    );

    const RPEDot = ({ value }) => {
      const color = value >= 8 ? '#EF4444' : value >= 6 ? '#F59E0B' : '#10B981';
      return (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[10px] font-bold" style={{ color }}>{value}</span>
        </div>
      );
    };

    return (
    <div className="space-y-4">
      {/* Add Macrocycle */}
      <div className="flex justify-end">
        <Button onClick={handleAddMacrocycle} className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg h-9 text-[12px] font-semibold shadow-sm" data-testid="add-macrocycle-btn">
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Macrociclo
        </Button>
      </div>

      {/* ═══ MACROCYCLES ═══ */}
      {selectedPlan.macrocycles?.map((macro, macroIdx) => {
        const phaseColor = macro.phase?.color || '#3B82F6';
        const isExpanded = expandedMacro === macroIdx;
        const vol = macro.volume_percent || macro.phase?.volumePercent || 0;
        const inten = macro.intensity_percent || macro.phase?.intensityPercent || 0;
        const totalMesoWeeks = macro.mesocycles?.reduce((s, m) => s + (m.microcycles?.length || 0), 0) || 0;
        const totalSessions = macro.mesocycles?.reduce((s, m) => s + m.microcycles?.reduce((s2, mi) => s2 + (mi.sessions?.length || 0), 0), 0) || 0;
        const loadBalance = vol > 0 && inten > 0 ? Math.abs(vol - inten) : 0;

        return (
        <div key={macro.id} className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm" data-testid={`macrocycle-${macroIdx}`}>
          {/* ── Macrocycle Header ── */}
          <div
            className="cursor-pointer transition-colors"
            style={{ borderLeft: `5px solid ${phaseColor}` }}
            onClick={() => setExpandedMacro(isExpanded ? null : macroIdx)}
          >
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`transition-transform duration-200 mt-1 ${isExpanded ? 'rotate-90' : ''}`}>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-[12px] shadow-lg" style={{ backgroundColor: phaseColor, fontFamily: BC }}>
                    {macro.phase?.abbr || 'MC'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-[15px]">{macro.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: phaseColor, backgroundColor: phaseColor + '15' }}>{macro.phase?.name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span className="font-medium">{macro.weeks} sem</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{macro.mesocycles?.length || 0} meso</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{totalSessions} sesiones</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {loadBalance > 30 && (
                    <span className="text-[10px] px-2 py-1 bg-amber-50 text-amber-600 rounded-lg font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Desbalance
                    </span>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600" onClick={() => handleEditMacrocycle(macro, macroIdx)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => handleDeleteMacrocycle(macroIdx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {/* Metric pills */}
              <div className="flex items-center gap-3 mt-3 ml-[60px]">
                <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-blue-400">Vol</span>
                  <div className="w-12"><MiniBar value={vol} color="#3B82F6" /></div>
                  <span className="text-[11px] font-bold text-blue-600">{vol}%</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-red-400">Int</span>
                  <div className="w-12"><MiniBar value={inten} color="#EF4444" /></div>
                  <span className="text-[11px] font-bold text-red-600">{inten}%</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-slate-400">Progreso</span>
                  <div className="w-10"><MiniBar value={progressPct} color="#10B981" /></div>
                  <span className="text-[11px] font-bold text-slate-600">{progressPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Expanded: Mesocycles ── */}
          {isExpanded && (
            <div className="border-t border-slate-100 bg-slate-50/60">
              <div className="flex justify-between items-center px-5 pt-3 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Mesociclos</span>
                <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-md border-slate-300" onClick={() => handleAddMesocycle(macroIdx)}>
                  <Plus className="w-3 h-3 mr-1" /> Mesociclo
                </Button>
              </div>

              <div className="px-4 pb-4 space-y-3">
                {macro.mesocycles?.map((meso, mesoIdx) => {
                  const mesoColor = meso.type?.color || '#64748B';
                  const mesoKey = `${macroIdx}-${mesoIdx}`;
                  const mesoExpanded = expandedMeso === mesoKey;
                  const mesoLoad = meso.type?.loadFactor || 0.7;
                  const mesoSessions = meso.microcycles?.reduce((s, mi) => s + (mi.sessions?.length || 0), 0) || 0;

                  return (
                  <div key={meso.id} className="rounded-xl overflow-hidden border border-slate-200 bg-white" data-testid={`mesocycle-${mesoKey}`}>
                    {/* ── Meso Header ── */}
                    <div
                      className="px-4 py-3 cursor-pointer hover:bg-slate-50/60 transition-colors"
                      style={{ borderLeft: `3px solid ${mesoColor}` }}
                      onClick={() => setExpandedMeso(mesoExpanded ? null : mesoKey)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`transition-transform duration-200 ${mesoExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                          <div className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white" style={{ backgroundColor: mesoColor }}>{meso.type?.name || 'Meso'}</div>
                          <span className="font-semibold text-[13px] text-slate-700">{meso.name}</span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="hidden sm:flex items-center gap-3 mr-2">
                            <span className="text-[10px] text-slate-400">{meso.microcycles?.length || 0} sem</span>
                            <span className="text-[10px] text-slate-400">{mesoSessions} ses</span>
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded">
                              <span className="text-[9px] text-slate-400">Carga</span>
                              <div className="w-8"><MiniBar value={mesoLoad * 100} color={mesoColor} h="h-1" /></div>
                              <span className="text-[10px] font-semibold" style={{ color: mesoColor }}>{Math.round(mesoLoad * 100)}%</span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => handleEditMesocycle(meso, macroIdx, mesoIdx)}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => handleDeleteMesocycle(macroIdx, mesoIdx)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>

                    {/* ── Microcycles ── */}
                    {mesoExpanded && (
                      <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2">

                        {/* ══ MEV → MAV → MRV Proyeccion del Mesociclo ══ */}
                        {(() => {
                          const micros = meso.microcycles || [];
                          if (micros.length === 0) return null;

                          const microData = micros.map((micro, mi) => {
                            const sessions = micro.sessions || [];
                            let totalSeries = 0;
                            let totalVolumen = 0;
                            let totalIntensidad = 0;
                            let actCount = 0;
                            let totalDensidad = 0;
                            let densCount = 0;
                            sessions.forEach(ses => {
                              const sd = ses.sessionData || ses.detailed_data;
                              if (sd?.fases) {
                                Object.values(sd.fases).forEach(fase => {
                                  (fase.actividades || []).forEach(act => {
                                    totalSeries += parseInt(act.series) || 0;
                                    totalVolumen += parseFloat(act.volumen) || 0;
                                    totalIntensidad += parseFloat(act.intensidad) || 0;
                                    actCount++;
                                    if (act.densidad) {
                                      const parts = act.densidad.split(':').map(Number);
                                      if (parts.length === 2 && parts[1] > 0) { totalDensidad += parts[0] / parts[1]; densCount++; }
                                    }
                                  });
                                });
                              } else {
                                totalSeries += Math.round((ses.duration || 60) / 5);
                                totalVolumen += ses.duration || 60;
                                totalIntensidad += 70;
                                actCount++;
                              }
                            });
                            const microLoad = micro.type?.load || micro.type?.loadPercent || 70;
                            const isDeload = (micro.type?.id === 'descarga' || micro.type?.id === 'recuperacion' || micro.type?.name?.toLowerCase().includes('descarga') || micro.type?.name?.toLowerCase().includes('recup'));
                            return {
                              name: `S${mi + 1}`,
                              series: totalSeries || Math.round(microLoad * 0.4),
                              volumen: Math.round(totalVolumen) || Math.round(microLoad * 0.6),
                              intensidad: actCount > 0 ? Math.round(totalIntensidad / actCount) : microLoad,
                              densidad: densCount > 0 ? +(totalDensidad / densCount).toFixed(2) : +(1 / (3 + mi * 0.3)).toFixed(2),
                              load: microLoad,
                              isDeload,
                              sessions: sessions.length
                            };
                          });

                          const maxSeries = Math.max(...microData.map(d => d.series), 1);
                          const mevLine = Math.round(maxSeries * 0.35);
                          const mavLine = Math.round(maxSeries * 0.7);
                          const mrvLine = Math.round(maxSeries * 1.05);

                          const mesoChartKey = `meso-chart-${macroIdx}-${mesoIdx}`;
                          const chartMode = expandedPanels?.[mesoChartKey] || 'mixta';
                          const mesoMetricKey = `meso-metric-${macroIdx}-${mesoIdx}`;
                          const activeMetrics = expandedPanels?.[mesoMetricKey] || { vol: true, int: true, den: false };

                          const setChartMode = (mode) => setExpandedPanels(prev => ({...prev, [mesoChartKey]: mode}));
                          const toggleMetric = (m) => setExpandedPanels(prev => {
                            const cur = prev[mesoMetricKey] || { vol: true, int: true, den: false };
                            return {...prev, [mesoMetricKey]: {...cur, [m]: !cur[m]}};
                          });

                          const showBars = chartMode === 'barras' || chartMode === 'mixta';
                          const showLines = chartMode === 'lineas' || chartMode === 'mixta';
                          const showDots = chartMode === 'puntos';

                          const CustomTooltipMeso = ({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0]?.payload;
                            const pct = d.series / maxSeries;
                            const zone = d.isDeload ? 'Descarga' : pct > 0.85 ? 'MRV' : pct > 0.5 ? 'MAV' : 'MEV';
                            const zoneColor = d.isDeload ? '#818cf8' : pct > 0.85 ? '#e11d48' : pct > 0.5 ? '#0891b2' : '#16a34a';
                            return (
                              <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-3.5" style={{fontFamily:"'DM Sans',sans-serif",minWidth:210}}>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-3 h-3 rounded" style={{background:zoneColor}} />
                                  <span className="text-[12px] font-bold text-slate-800">{label} — {zone}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] mb-2">
                                  <div className="flex justify-between"><span className="text-slate-400">Series</span><span className="font-bold text-slate-700">{d.series}</span></div>
                                  <div className="flex justify-between"><span className="text-slate-400">Volumen</span><span className="font-bold" style={{color:'#CCFF00'}}>{d.volumen}</span></div>
                                  <div className="flex justify-between"><span className="text-slate-400">Intensidad</span><span className="font-bold" style={{color:'#f59e0b'}}>{d.intensidad}%</span></div>
                                  <div className="flex justify-between"><span className="text-slate-400">Densidad</span><span className="font-bold" style={{color:'#8b5cf6'}}>{d.densidad}</span></div>
                                </div>
                                <div className="pt-1.5 border-t border-slate-100 text-[9px] text-slate-400">{d.sessions} sesiones · Carga {d.load}%</div>
                              </div>
                            );
                          };

                          return (
                            <div className="mb-4 rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid={`meso-chart-${macroIdx}-${mesoIdx}`}>
                              {/* Header */}
                              <div className="px-5 pt-4 pb-1 flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <TrendingUp className="w-4 h-4 text-cyan-600" />
                                    <span className="text-[14px] font-bold text-slate-800" style={{fontFamily:"'DM Sans',sans-serif"}}>Proyeccion MEV → MAV → MRV</span>
                                  </div>
                                  <p className="text-[11px] text-slate-400" style={{fontFamily:"'DM Sans',sans-serif"}}>Volumen semanal por microciclo — Modelo Dr. Mike Israetel (Renaissance Periodization)</p>
                                </div>
                                <div className="relative group/mevinfo">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center cursor-help hover:bg-slate-200 transition-colors">
                                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                                  </div>
                                  <div className="absolute right-0 top-8 w-[320px] p-4 rounded-xl bg-white shadow-2xl border border-slate-200 opacity-0 invisible group-hover/mevinfo:opacity-100 group-hover/mevinfo:visible transition-all z-50" style={{fontFamily:"'DM Sans',sans-serif"}}>
                                    <p className="text-[13px] font-bold text-slate-800 mb-3">Modelo de Volumen MEV → MAV → MRV</p>
                                    <table className="w-full text-[10px] mb-3">
                                      <thead><tr className="border-b border-slate-100"><th className="text-left py-1 font-bold text-slate-500">Sigla</th><th className="text-left py-1 font-bold text-slate-500">Significado</th><th className="text-left py-1 font-bold text-slate-500">Descripcion</th></tr></thead>
                                      <tbody>
                                        <tr className="border-b border-slate-50"><td className="py-1.5 font-bold" style={{color:'#16a34a'}}>MEV</td><td className="py-1.5 text-slate-600">Min. Volumen Efectivo</td><td className="py-1.5 text-slate-400">Minimo para generar adaptaciones</td></tr>
                                        <tr className="border-b border-slate-50"><td className="py-1.5 font-bold" style={{color:'#0891b2'}}>MAV</td><td className="py-1.5 text-slate-600">Max. Volumen Adaptativo</td><td className="py-1.5 text-slate-400">Optimo para maximizar ganancias</td></tr>
                                        <tr><td className="py-1.5 font-bold" style={{color:'#e11d48'}}>MRV</td><td className="py-1.5 text-slate-600">Max. Volumen Recuperable</td><td className="py-1.5 text-slate-400">Techo sin sobreentrenamiento</td></tr>
                                      </tbody>
                                    </table>
                                    <div className="space-y-1 text-[10px] text-slate-500">
                                      <p>• <b>Evitar sobreentrenamiento</b> — sabiendo cuando estas cerca del MRV</p>
                                      <p>• <b>Maximizar hipertrofia/fuerza</b> — operando en el rango MEV–MRV</p>
                                      <p>• <b>Planificar descargas</b> — la semana en <span className="font-bold" style={{color:'#818cf8'}}>violeta</span> es el deload</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Controls row: chart type + metric toggles */}
                              <div className="px-5 py-2 flex items-center justify-between">
                                {/* Chart type selector */}
                                <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                                  {[{id:'barras',label:'Barras'},{id:'lineas',label:'Lineas'},{id:'mixta',label:'Mixta'},{id:'puntos',label:'Puntos'}].map(t => (
                                    <button key={t.id} onClick={() => setChartMode(t.id)}
                                      className={`px-3 py-1 rounded-md transition-all text-[11px] font-medium ${chartMode === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                      style={{fontFamily:"'DM Sans',sans-serif"}}
                                    >{t.label}</button>
                                  ))}
                                </div>
                                {/* Metric toggles */}
                                <div className="flex items-center gap-1.5">
                                  <button onClick={() => toggleMetric('vol')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${activeMetrics.vol ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`} style={activeMetrics.vol ? {background:'#84cc16'} : {}}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{background: activeMetrics.vol ? 'white' : '#84cc16'}} /> VOL
                                  </button>
                                  <button onClick={() => toggleMetric('int')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${activeMetrics.int ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`} style={activeMetrics.int ? {background:'#f59e0b'} : {}}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{background: activeMetrics.int ? 'white' : '#f59e0b'}} /> INT
                                  </button>
                                  <button onClick={() => toggleMetric('den')} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${activeMetrics.den ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`} style={activeMetrics.den ? {background:'#8b5cf6'} : {}}>
                                    <div className="w-1.5 h-1.5 rounded-full" style={{background: activeMetrics.den ? 'white' : '#8b5cf6'}} /> DEN
                                  </button>
                                </div>
                              </div>

                              {/* Legend */}
                              <div className="px-5 pb-2 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#0891b2'}} /><span className="text-[10px] font-semibold text-slate-500">Series</span></div>
                                {activeMetrics.vol && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#84cc16'}} /><span className="text-[10px] font-semibold text-slate-500">Volumen</span></div>}
                                {activeMetrics.int && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#f59e0b'}} /><span className="text-[10px] font-semibold text-slate-500">Intensidad %</span></div>}
                                {activeMetrics.den && <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{background:'#8b5cf6'}} /><span className="text-[10px] font-semibold text-slate-500">Densidad</span></div>}
                                <span className="text-slate-300">|</span>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-[1px]" style={{borderTop:'2px dashed #16a34a'}} /><span className="text-[10px] font-semibold text-slate-500">MEV</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-[1px]" style={{borderTop:'2px dashed #0891b2'}} /><span className="text-[10px] font-semibold text-slate-500">MAV</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-4 h-[1px]" style={{borderTop:'2px dashed #e11d48'}} /><span className="text-[10px] font-semibold text-slate-500">MRV</span></div>
                              </div>

                              {/* Chart */}
                              <div className="px-2 pb-3">
                                <ResponsiveContainer width="100%" height={220}>
                                  <ComposedChart data={microData} margin={{top:10,right:25,left:0,bottom:5}}>
                                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.12)" />
                                    <XAxis dataKey="name" tick={{fontSize:11,fill:'#64748b',fontWeight:600}} axisLine={{stroke:'#e2e8f0'}} tickLine={false} />
                                    <YAxis yAxisId="left" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} domain={[0, mrvLine + 10]} />
                                    <YAxis yAxisId="right" orientation="right" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                                    <Tooltip content={<CustomTooltipMeso />} />
                                    <ReferenceLine yAxisId="left" y={mevLine} stroke="#16a34a" strokeDasharray="6 4" strokeWidth={1.5} label={{value:`MEV ${mevLine}`,position:'insideTopRight',fontSize:8,fill:'#16a34a',fontWeight:700}} />
                                    <ReferenceLine yAxisId="left" y={mavLine} stroke="#0891b2" strokeDasharray="6 4" strokeWidth={1.5} label={{value:`MAV ${mavLine}`,position:'insideTopRight',fontSize:8,fill:'#0891b2',fontWeight:700}} />
                                    <ReferenceLine yAxisId="left" y={mrvLine} stroke="#e11d48" strokeDasharray="6 4" strokeWidth={1.5} label={{value:`MRV ${mrvLine}`,position:'insideTopRight',fontSize:8,fill:'#e11d48',fontWeight:700}} />

                                    {/* Series bars */}
                                    {showBars && <Bar yAxisId="left" dataKey="series" fill="#0891b2" radius={[6,6,0,0]} maxBarSize={45} fillOpacity={0.85} />}
                                    {/* Volumen bars */}
                                    {showBars && activeMetrics.vol && <Bar yAxisId="left" dataKey="volumen" fill="#84cc16" radius={[6,6,0,0]} maxBarSize={45} fillOpacity={0.6} />}

                                    {/* Series line */}
                                    {(showLines || showDots) && <Line yAxisId="left" type="monotone" dataKey="series" stroke="#0891b2" strokeWidth={showDots ? 0 : 2.5} dot={{fill:'#0891b2',r:showDots ? 6 : 4,strokeWidth:2,stroke:'white'}} activeDot={{r:8,fill:'#0891b2',stroke:'white',strokeWidth:2}} />}
                                    {/* Volumen line */}
                                    {(showLines || showDots) && activeMetrics.vol && <Line yAxisId="left" type="monotone" dataKey="volumen" stroke="#84cc16" strokeWidth={showDots ? 0 : 2} strokeDasharray={showDots ? '' : '5 3'} dot={{fill:'#84cc16',r:showDots ? 6 : 3.5,strokeWidth:2,stroke:'white'}} activeDot={{r:7,fill:'#84cc16',stroke:'white',strokeWidth:2}} />}
                                    {/* Intensidad line */}
                                    {activeMetrics.int && <Line yAxisId="right" type="monotone" dataKey="intensidad" stroke="#f59e0b" strokeWidth={showDots ? 0 : 2} dot={{fill:'#f59e0b',r:showDots ? 6 : 3.5,strokeWidth:2,stroke:'white'}} activeDot={{r:7,fill:'#f59e0b',stroke:'white',strokeWidth:2}} />}
                                    {/* Densidad area */}
                                    {activeMetrics.den && <Area yAxisId="right" type="monotone" dataKey="densidad" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.08} strokeWidth={showDots ? 0 : 1.5} dot={{fill:'#8b5cf6',r:showDots ? 6 : 3,strokeWidth:2,stroke:'white'}} />}
                                  </ComposedChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Microciclos</span>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md border-slate-200 px-2" onClick={() => handleAddMicrocycle(macroIdx, mesoIdx)}>
                            <Plus className="w-2.5 h-2.5 mr-1" /> Semana
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {meso.microcycles?.map((micro, microIdx) => {
                            const microColor = micro.type?.color || MICROCYCLE_TYPES_ARRAY.find(t => t.id === micro.type?.id)?.color || '#94a3b8';
                            const microLoad = micro.type?.load || micro.type?.loadPercent || 70;
                            const microKey = `${macroIdx}-${mesoIdx}-${microIdx}`;
                            const microExpanded = expandedMicro === microKey;
                            const sessions = micro.sessions || [];
                            const totalDuration = sessions.reduce((s, se) => s + (se.duration || 0), 0);
                            const totalLoad = sessions.reduce((s, se) => s + (se.internalLoad || 0), 0);
                            const completedSessions = sessions.filter(se => se.status === 'completed').length;
                            const avgRPE = sessions.length > 0 ? (sessions.reduce((s, se) => s + (se.rpe || 6), 0) / sessions.length).toFixed(1) : '-';

                            return (
                            <div key={micro.id} className="rounded-lg border border-slate-150 overflow-hidden bg-white" data-testid={`microcycle-${microKey}`}>
                              {/* ── Micro Header ── */}
                              <div
                                className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setExpandedMicro(microExpanded ? null : microKey)}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`transition-transform duration-200 ${microExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight className="w-3 h-3 text-slate-300" />
                                  </div>
                                  <div className="w-2.5 h-6 rounded-sm" style={{ backgroundColor: microColor }} />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[13px] text-slate-700">{micro.name}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ color: microColor, backgroundColor: microColor + '18' }}>{micro.type?.name || '-'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  {/* Micro stats strip */}
                                  <div className="hidden lg:flex items-center gap-2 text-[10px] mr-1">
                                    <span className="text-slate-400">{sessions.length} ses</span>
                                    <span className="text-slate-400">{totalDuration}min</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-400">Carga</span>
                                      <div className="w-10"><MiniBar value={microLoad} color={microColor} h="h-1" /></div>
                                      <span className="font-semibold" style={{ color: microColor }}>{microLoad}%</span>
                                    </div>
                                    {totalLoad > 0 && <span className="text-slate-500 font-medium">UA:{totalLoad}</span>}
                                    <span className="text-slate-400">RPE:{avgRPE}</span>
                                    <span className="text-emerald-500 font-medium">{completedSessions}/{sessions.length}</span>
                                  </div>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-200 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md" onClick={() => handleEditMicrocycle(micro, macroIdx, mesoIdx, microIdx)} title="Editar"><Edit2 className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-slate-200 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md" onClick={() => handleDeleteMicrocycle(macroIdx, mesoIdx, microIdx)} title="Eliminar"><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              </div>

                              {/* ── Sessions Grid ── */}
                              {microExpanded && (
                                <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                                  <div className="flex justify-between items-center mb-2.5">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">Sesiones</span>
                                      <div className="flex items-center gap-1 text-[9px] text-slate-300">
                                        {SESSION_TYPES.slice(0, 5).map(st => (
                                          <span key={st.id} className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: st.color }} />{st.name}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-5 text-[9px] rounded px-1.5 border-slate-200" onClick={() => handleAddSession(macroIdx, mesoIdx, microIdx)}>
                                      <Plus className="w-2.5 h-2.5 mr-0.5" /> Sesion
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-2">
                                    {sessions.map((session, sIdx) => {
                                      const sType = SESSION_TYPES.find(t => t.id === session.type);
                                      const sColor = sType?.color || '#94a3b8';
                                      const rpe = session.rpe || 6;
                                      const rpeColor = rpe >= 8 ? '#EF4444' : rpe >= 6 ? '#F59E0B' : '#10B981';

                                      return (
                                        <div
                                          key={session.id}
                                          className="group relative rounded-xl border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5"
                                          style={{ borderColor: sColor + '30' }}
                                          onClick={() => handleEditSession(session, macroIdx, mesoIdx, microIdx, sIdx)}
                                          data-testid={`session-${sIdx}`}
                                        >
                                          {/* Color header bar */}
                                          <div className="h-1.5 w-full" style={{ backgroundColor: sColor }} />

                                          {/* Delete overlay on hover */}
                                          <div className="absolute top-2 right-1 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                                            <button className="p-0.5 rounded bg-white shadow-sm hover:bg-red-50" onClick={() => handleDeleteSession(macroIdx, mesoIdx, microIdx, sIdx)}>
                                              <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                            </button>
                                          </div>

                                          <div className="p-2.5">
                                            {/* Day + Status */}
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className="font-bold text-[13px] text-slate-800">{session.dayName}</span>
                                              <StatusBadge status={session.status || 'planned'} />
                                            </div>

                                            {/* Type */}
                                            <p className="text-[11px] font-semibold mb-1.5" style={{ color: sColor }}>{sType?.name || '-'}</p>

                                            {/* Objective */}
                                            {session.objective && <p className="text-[10px] text-slate-500 mb-1.5 truncate">{session.objective}</p>}

                                            {/* Metrics row */}
                                            <div className="grid grid-cols-3 gap-1 mb-1.5">
                                              <div className="text-center bg-slate-50 rounded px-1 py-0.5">
                                                <div className="text-[9px] text-slate-400">Dur</div>
                                                <div className="text-[11px] font-bold text-slate-700">{session.duration}m</div>
                                              </div>
                                              <div className="text-center bg-slate-50 rounded px-1 py-0.5">
                                                <div className="text-[9px] text-slate-400">Vol</div>
                                                <div className="text-[11px] font-bold text-slate-700">{session.volume || '-'}%</div>
                                              </div>
                                              <div className="text-center rounded px-1 py-0.5" style={{ backgroundColor: rpeColor + '10' }}>
                                                <div className="text-[9px] text-slate-400">RPE</div>
                                                <div className="text-[11px] font-bold" style={{ color: rpeColor }}>{rpe}</div>
                                              </div>
                                            </div>

                                            {/* Intensity + Load */}
                                            <div className="flex items-center justify-between mb-1">
                                              <IntensityBadge level={session.intensity} size="xs" />
                                              {session.internalLoad > 0 && <span className="text-[9px] text-slate-400 font-medium">UA:{session.internalLoad}</span>}
                                            </div>

                                            {/* Muscle + Fatigue */}
                                            <div className="flex items-center justify-between">
                                              {session.muscleGroup && <span className="text-[9px] text-slate-400 truncate max-w-[70%]">{session.muscleGroup}</span>}
                                              {session.fatigue && (
                                                <div className="flex items-center gap-0.5" title={`Fatiga: ${session.fatigue}/10 · Rec: ${session.recovery}h`}>
                                                  <Activity className="w-2.5 h-2.5 text-slate-300" />
                                                  <span className="text-[9px] font-medium" style={{ color: session.fatigue >= 7 ? '#EF4444' : session.fatigue >= 5 ? '#F59E0B' : '#10B981' }}>{session.fatigue}</span>
                                                </div>
                                              )}
                                            </div>

                                            {/* Contents preview */}
                                            {session.contents && <p className="text-[9px] text-slate-300 mt-1 truncate border-t border-slate-100 pt-1">{session.contents}</p>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        );
      })}
    </div>
    );
  };

  // ============ RENDER: CALENDAR VIEW ============
  const renderCalendarView = () => {
    const weeklyData = [];
    selectedPlan.macrocycles?.forEach(macro => {
      macro.mesocycles?.forEach(meso => {
        meso.microcycles?.forEach(micro => {
          weeklyData.push({ name: micro.name, type: micro.type, phase: macro.phase, sessions: micro.sessions || [] });
        });
      });
    });

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="calendar-view">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-800">Vista Calendario</h3>
          <span className="text-[11px] text-slate-400 ml-2">{weeklyData.length} semanas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sticky left-0 bg-slate-50 z-10 min-w-[140px]">Semana</th>
                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(day => (
                  <th key={day} className="px-2 py-2.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 min-w-[100px]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyData.slice(0, 16).map((week, weekIdx) => (
                <tr key={weekIdx} className="border-t border-slate-100 hover:bg-slate-50/40 transition-colors">
                  <td className="px-4 py-2 sticky left-0 bg-white z-10 border-r border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: week.phase?.color || '#94a3b8' }} />
                      <div>
                        <p className="font-semibold text-[12px] text-slate-700">{week.name}</p>
                        <p className="text-[10px] text-slate-400">{week.type?.name || '-'}</p>
                      </div>
                    </div>
                  </td>
                  {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((day, dayIdx) => {
                    const session = week.sessions.find(s => s.dayName === day) || week.sessions[dayIdx];
                    if (!session) return <td key={day} className="px-2 py-1.5 border-l border-slate-50"><div className="h-12 rounded-md bg-slate-50/50" /></td>;
                    const sType = SESSION_TYPES.find(t => t.id === session.type);
                    return (
                      <td key={day} className="px-1.5 py-1.5 border-l border-slate-50">
                        <div className="rounded-lg p-2 transition-all hover:shadow-sm cursor-pointer" style={{ background: sType?.color + '10', borderLeft: `2px solid ${sType?.color || '#94a3b8'}` }}>
                          <p className="font-semibold text-[11px]" style={{ color: sType?.color }}>{sType?.name || '-'}</p>
                          <p className="text-[10px] text-slate-400">{session.duration}min</p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============ RENDER: CHART VIEW ============
  const renderChartView = () => (
    <div className="space-y-5">
      {/* Volume & Intensity Chart */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="chart-view">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-800">Volumen e Intensidad</h3>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[#3B82F6]" /> Volumen</span>
            <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-[#EF4444]" /> Intensidad</span>
          </div>
        </div>
        <div className="p-5">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={selectedPlan.chartData}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="semana" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }} />
                <Area type="monotone" dataKey="volumen" fill="url(#volGrad)" stroke="#3B82F6" strokeWidth={2} name="Volumen" />
                <Line type="monotone" dataKey="intensidad" stroke="#EF4444" strokeWidth={2.5} dot={false} name="Intensidad" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Phase Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-5" data-testid="phase-distribution">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Distribucion de Fases</h3>
        <div className="flex h-10 rounded-xl overflow-hidden gap-[2px]">
          {selectedPlan.macrocycles?.map((macro, idx) => (
            <div key={idx} className="flex items-center justify-center text-white text-[10px] font-bold rounded-md transition-all hover:opacity-90" style={{ backgroundColor: macro.phase?.color, flex: macro.weeks, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {macro.weeks > 3 && `${macro.phase?.abbr || ''} ${macro.weeks}s`}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {selectedPlan.macrocycles?.map((macro, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: macro.phase?.color }} />
              {macro.phase?.name || macro.name}: {macro.weeks}s
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============ RENDER: EDIT MODALS ============
  const renderEditModals = () => (
    <>
      {/* Macrocycle Modal */}
      <Dialog open={editModal.type === 'macrocycle'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editModal.indices?.isNew ? 'Nuevo Macrociclo' : 'Editar Macrociclo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Fase</label>
              <Select value={editModal.data?.phase?.id || ''} onValueChange={(v) => setEditModal({ ...editModal, data: { ...editModal.data, phase: MACROCYCLE_PHASES.find(p => p.id === v) } })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{MACROCYCLE_PHASES.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Semanas</label>
              <Input type="number" value={editModal.data?.weeks || 4} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, weeks: parseInt(e.target.value) } })} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ type: null, data: null, indices: null })}>Cancelar</Button>
            <Button onClick={handleSaveMacrocycle}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mesocycle Modal */}
      <Dialog open={editModal.type === 'mesocycle'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editModal.indices?.isNew ? 'Nuevo Mesociclo' : 'Editar Mesociclo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={editModal.data?.type?.id || ''} onValueChange={(v) => setEditModal({ ...editModal, data: { ...editModal.data, type: MESOCYCLE_TYPES.find(t => t.id === v) } })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{MESOCYCLE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editModal.indices?.isNew && (
              <div>
                <label className="text-sm font-medium">Semanas</label>
                <Input type="number" value={editModal.data?.weeks || 4} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, weeks: parseInt(e.target.value) } })} className="mt-1" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ type: null, data: null, indices: null })}>Cancelar</Button>
            <Button onClick={handleSaveMesocycle}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Microcycle Modal */}
      <Dialog open={editModal.type === 'microcycle'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editModal.indices?.isNew ? 'Nuevo Microciclo' : 'Editar Microciclo'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={editModal.data?.type?.id || ''} onValueChange={(v) => setEditModal({ ...editModal, data: { ...editModal.data, type: MICROCYCLE_TYPES_ARRAY.find(t => t.id === v) } })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{MICROCYCLE_TYPES_ARRAY.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.loadPercent}%)</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ type: null, data: null, indices: null })}>Cancelar</Button>
            <Button onClick={handleSaveMicrocycle}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Editor */}
      {sessionEditorOpen && (
        <SessionEditor
          isOpen={sessionEditorOpen}
          onClose={() => { setSessionEditorOpen(false); setEditingSession(null); setEditingSessionLocation(null); }}
          session={{
            ...editingSession,
            detailedData: editingSession?.sessionData || editingSession?.detailed_data || null
          }}
          onSave={handleSaveSession}
        />
      )}
    </>
  );

  // ============ MAIN RENDER ============
  // ============ RENDER: CALCULATOR MODAL ============
  const renderCalculatorModal = () => (
    <Dialog open={calculatorOpen} onOpenChange={setCalculatorOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Calculadoras Científicas
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Calculator Type Selector */}
          <div className="flex gap-2 flex-wrap">
            {[
              { id: '1rm', label: '1RM', icon: '💪' },
              { id: 'heart_rate_zones', label: 'Zonas FC', icon: '❤️' },
              { id: 'vo2max', label: 'VO2máx', icon: '🫁' },
              { id: 'volume_distribution', label: 'Distribución Volumen', icon: '📊' },
              { id: 'intensity_scale', label: 'Escalas Intensidad', icon: '📈' }
            ].map(calc => (
              <button
                key={calc.id}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${calculatorType === calc.id ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                onClick={() => { setCalculatorType(calc.id); setCalculatorResult(null); }}
              >
                {calc.icon} {calc.label}
              </button>
            ))}
          </div>
          
          {/* Calculator Forms */}
          {calculatorType === '1rm' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700">Calcular 1RM (Repetición Máxima)</h4>
              <p className="text-sm text-slate-500">Fórmulas: Brzycki, Epley, Lander</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Peso levantado (kg)</label>
                  <Input type="number" id="calc-weight" placeholder="80" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Repeticiones</label>
                  <Input type="number" id="calc-reps" placeholder="8" className="mt-1" />
                </div>
              </div>
              <Button onClick={() => {
                const weight = parseFloat(document.getElementById('calc-weight').value);
                const reps = parseInt(document.getElementById('calc-reps').value);
                if (weight && reps) runCalculation('1rm', { weight, reps });
              }} className="bg-blue-600 hover:bg-blue-700 text-white">
                Calcular 1RM
              </Button>
            </div>
          )}
          
          {calculatorType === 'heart_rate_zones' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700">Zonas de Frecuencia Cardíaca</h4>
              <p className="text-sm text-slate-500">Fórmula de Karvonen</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Edad</label>
                  <Input type="number" id="calc-age" placeholder="30" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">FC Reposo</label>
                  <Input type="number" id="calc-resting" placeholder="60" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">FC Máx (opcional)</label>
                  <Input type="number" id="calc-maxhr" placeholder="190" className="mt-1" />
                </div>
              </div>
              <Button onClick={() => {
                const age = parseInt(document.getElementById('calc-age').value);
                const resting_hr = parseInt(document.getElementById('calc-resting').value);
                const max_hr = document.getElementById('calc-maxhr').value ? parseInt(document.getElementById('calc-maxhr').value) : null;
                if (age && resting_hr) runCalculation('heart_rate_zones', { age, resting_hr, max_hr });
              }} className="bg-blue-600 hover:bg-blue-700 text-white">
                Calcular Zonas
              </Button>
            </div>
          )}
          
          {calculatorType === 'vo2max' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700">Cálculo de VO2máx</h4>
              <div>
                <label className="text-sm font-medium text-slate-600">Tipo de Test</label>
                <Select onValueChange={(v) => document.getElementById('calc-test-type').value = v}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar test" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cooper">Test de Cooper (12 min)</SelectItem>
                    <SelectItem value="rockport">Rockport Walk Test</SelectItem>
                    <SelectItem value="1mile">Test 1.5 Millas</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" id="calc-test-type" defaultValue="cooper" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">Distancia (metros) / Tiempo (minutos)</label>
                <Input type="number" id="calc-distance" placeholder="2400" className="mt-1" />
              </div>
              <Button onClick={() => {
                const test_type = document.getElementById('calc-test-type').value || 'cooper';
                const distance_m = parseInt(document.getElementById('calc-distance').value);
                if (distance_m) runCalculation('vo2max', { test_type, distance_m });
              }} className="bg-blue-600 hover:bg-blue-700 text-white">
                Calcular VO2máx
              </Button>
            </div>
          )}
          
          {calculatorType === 'volume_distribution' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700">Distribución de Volumen</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">Volumen Total</label>
                  <Input type="number" id="calc-volume" placeholder="1000" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Semanas</label>
                  <Input type="number" id="calc-weeks" placeholder="12" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Progresión</label>
                  <Select onValueChange={(v) => document.getElementById('calc-progression').value = v}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Lineal</SelectItem>
                      <SelectItem value="undulating">Ondulatorio</SelectItem>
                      <SelectItem value="step">Escalón (3:1)</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" id="calc-progression" defaultValue="linear" />
                </div>
              </div>
              <Button onClick={() => {
                const total_volume = parseInt(document.getElementById('calc-volume').value);
                const weeks = parseInt(document.getElementById('calc-weeks').value);
                const progression = document.getElementById('calc-progression').value || 'linear';
                if (total_volume && weeks) runCalculation('volume_distribution', { total_volume, weeks, progression });
              }} className="bg-blue-600 hover:bg-blue-700 text-white">
                Calcular Distribución
              </Button>
            </div>
          )}
          
          {calculatorType === 'intensity_scale' && (
            <div className="space-y-4">
              <h4 className="font-bold text-slate-700">Escalas de Intensidad</h4>
              <p className="text-sm text-slate-500">Visualiza las escalas estándar de intensidad</p>
              <Button onClick={() => runCalculation('intensity_scale', {})} className="bg-blue-600 hover:bg-blue-700 text-white">
                Ver Escalas
              </Button>
            </div>
          )}
          
          {/* Results */}
          {calculatorResult && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">Resultados</h4>
              <p className="text-sm text-blue-600 mb-4">{calculatorResult.explanation}</p>
              
              {calculatorType === '1rm' && calculatorResult.result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-2xl font-bold text-blue-600">{calculatorResult.result['1rm_average']}</p>
                      <p className="text-xs text-slate-500">1RM Promedio</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-lg font-bold text-slate-700">{calculatorResult.result['1rm_brzycki']}</p>
                      <p className="text-xs text-slate-500">Brzycki</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-lg font-bold text-slate-700">{calculatorResult.result['1rm_epley']}</p>
                      <p className="text-xs text-slate-500">Epley</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-lg font-bold text-slate-700">{calculatorResult.result['1rm_lander']}</p>
                      <p className="text-xs text-slate-500">Lander</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <h5 className="font-semibold text-slate-700 mb-2">Zonas de Entrenamiento</h5>
                    {Object.entries(calculatorResult.result.recommended_zones || {}).map(([zone, value]) => (
                      <p key={zone} className="text-sm text-slate-600"><strong>{zone.replace('_', ' ')}:</strong> {value}</p>
                    ))}
                  </div>
                </div>
              )}
              
              {calculatorType === 'heart_rate_zones' && calculatorResult.result?.zones && (
                <div className="space-y-2">
                  {Object.entries(calculatorResult.result.zones).map(([zone, data]) => (
                    <div key={zone} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="font-semibold text-slate-700">{zone}</p>
                        <p className="text-xs text-slate-500">{data.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{data.range}</p>
                        <p className="text-xs text-slate-400">{data.percentage}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {calculatorType === 'vo2max' && (
                <div className="text-center">
                  <p className="text-4xl font-bold text-blue-600">{calculatorResult.result.vo2max}</p>
                  <p className="text-slate-500">ml/kg/min</p>
                  <Badge className={`mt-2 ${calculatorResult.result.fitness_level === 'excelente' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    Nivel: {calculatorResult.result.fitness_level}
                  </Badge>
                </div>
              )}
              
              {calculatorType === 'volume_distribution' && calculatorResult.result?.weekly_breakdown && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {calculatorResult.result.weekly_breakdown.map(week => (
                    <div key={week.week} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600 w-16">Sem {week.week}</span>
                      <div className="flex-1 bg-slate-200 rounded-full h-4 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${week.percentage}%` }}></div>
                      </div>
                      <span className="text-sm font-bold text-slate-700 w-16 text-right">{week.volume}</span>
                    </div>
                  ))}
                </div>
              )}
              
              {calculatorType === 'intensity_scale' && calculatorResult.result && (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-2">Escala Vasconcelos Raposo</h5>
                    <div className="grid grid-cols-5 gap-1">
                      {Object.entries(calculatorResult.result.vasconcelos_raposo || {}).map(([level, data]) => (
                        <div key={level} className="bg-white rounded p-2 text-center">
                          <p className="text-xs font-medium text-slate-600 capitalize">{level}</p>
                          <p className="text-sm font-bold text-blue-600">{data.range}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="font-semibold text-slate-700 mb-2">Tipos de Microciclo</h5>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(calculatorResult.result.microcycle_types || {}).map(([type, data]) => (
                        <div key={type} className="bg-white rounded p-2">
                          <p className="text-sm font-medium text-slate-700 capitalize">{type}</p>
                          <p className="text-lg font-bold text-blue-600">{data.load}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setCalculatorOpen(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {activeView === 'history' && renderHistory()}
        {activeView === 'create' && renderCreate()}
        {activeView === 'detail' && renderDetail()}
      </div>
      {renderEditModals()}
      {renderCalculatorModal()}
    </div>
  );
};

export default PeriodizationComplete;
