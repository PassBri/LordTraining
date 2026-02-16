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
  MoreVertical, Copy, Move, Settings, CalendarDays
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area
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
const PeriodizationComplete = ({ athleteId, athleteName }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState('history');
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
  const [generatedStructure, setGeneratedStructure] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Get token helper
  const getToken = () => localStorage.getItem('train_token');

  // Load sports catalog
  useEffect(() => {
    const loadSportsCatalog = async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_URL}/api/sports-catalog`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSportsCatalog(data);
        }
      } catch (error) {
        console.error('Error loading sports catalog:', error);
      }
    };
    loadSportsCatalog();
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
              modelName: plan.model_name || PERIODIZATION_MODELS[plan.model]?.name || plan.model,
              duration: plan.duration_type,
              totalWeeks: plan.total_weeks
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

  const handleSaveSession = (sessionData) => {
    if (!selectedPlan || !editingSessionLocation) return;
    const { macroIdx, mesoIdx, microIdx, sessionIdx } = editingSessionLocation;
    
    const updatedPlan = { ...selectedPlan };
    const session = updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].sessions[sessionIdx];
    Object.assign(session, { sessionData, edited: true });
    
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setSessionEditorOpen(false);
    setEditingSession(null);
    setEditingSessionLocation(null);
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
  const generateDefaultSessions = (count) => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const types = ['strength', 'endurance', 'speed', 'technical', 'recovery'];
    return Array.from({ length: count }, (_, i) => ({
      id: `session-${Date.now()}-${i}`,
      dayName: days[i % 7],
      type: types[i % types.length],
      duration: 60,
      intensity: 'medium'
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
                notes: session.notes || null
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
  };

  // ============ RENDER: HISTORY ============
  const renderHistory = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <History className="w-7 h-7 text-blue-500" />
            Historial de Planes
          </h2>
          <p className="text-slate-500 mt-1">Gestiona tus planes de periodización</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCalculator('1rm')}>
            <Activity className="w-4 h-4 mr-2" /> Calculadoras
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg text-white" onClick={() => { 
            setWizardStep(1); 
            setPlanConfig({ name: '', model: '', sport: 'general', duration: 'annual', startDate: '', sessionsPerWeek: 5, athleteLevel: 'intermediate', mainObjective: '', mainCompetition: '', mainCompetitionDate: '' }); 
            setGeneratedStructure(null);
            setActiveView('create'); 
          }}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Plan
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">Cargando planes...</p>
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="py-16 text-center">
            <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600">Sin planes</h3>
            <p className="text-slate-400 mb-4">Crea tu primer plan de periodización</p>
            <Button onClick={() => setActiveView('create')}><Plus className="w-4 h-4 mr-2" /> Crear Plan</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className="hover:shadow-lg transition-shadow cursor-pointer border-l-4" style={{ borderLeftColor: plan.macrocycles?.[0]?.phase?.color || '#3B82F6' }} onClick={() => { setSelectedPlan(plan); setActiveView('detail'); }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{plan.name}</h3>
                    <p className="text-sm text-slate-500">{plan.totalWeeks} semanas • {plan.macrocycles?.length || 0} macrociclos • {plan.modelName}</p>
                    {plan.apiId && <Badge className="bg-green-100 text-green-700 text-xs mt-1">Guardado en BD</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700">Activo</Badge>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDuplicatePlan(plan.id); }} title="Duplicar">
                    <Copy className="w-4 h-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }} title="Eliminar">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // ============ RENDER: CREATE WIZARD ============
  const renderCreate = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Crear Plan de Entrenamiento</h2>
        <Button variant="outline" onClick={() => { setActiveView('history'); setGeneratedStructure(null); }}><ChevronLeft className="w-4 h-4 mr-2" /> Volver</Button>
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
                        onClick={() => setPlanConfig({ ...planConfig, sport: sport.id, sessionsPerWeek: sport.sessions_per_week })}
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
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${planConfig.model === id ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`} 
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
                  <div key={id} className={`p-4 rounded-xl border-2 cursor-pointer text-center ${planConfig.duration === id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`} onClick={() => setPlanConfig({ ...planConfig, duration: id })}>
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
                    <p className="font-bold text-slate-700">{sportsCatalog[Object.keys(sportsCatalog).find(cat => sportsCatalog[cat].some(s => s.id === planConfig.sport))]?.find(s => s.id === planConfig.sport)?.name || planConfig.sport}</p>
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
                  placeholder={`Plan ${sportsCatalog[Object.keys(sportsCatalog).find(cat => sportsCatalog[cat].some(s => s.id === planConfig.sport))]?.find(s => s.id === planConfig.sport)?.name || ''} - ${PERIODIZATION_MODELS[planConfig.model]?.name || ''}`} 
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
                    <p className="font-bold text-slate-700">{sportsCatalog[Object.keys(sportsCatalog).find(cat => sportsCatalog[cat].some(s => s.id === planConfig.sport))]?.find(s => s.id === planConfig.sport)?.name || planConfig.sport}</p>
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
            <Button variant="outline" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setActiveView('history')}>
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

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{selectedPlan.name}</h2>
            <p className="text-slate-500">{selectedPlan.totalWeeks} semanas • {selectedPlan.modelName}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setActiveView('history'); setSelectedPlan(null); }}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <Button variant="outline" onClick={handleSavePlan} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
              Guardar
            </Button>
            <Button variant="outline" onClick={handleSharePlan}>
              <Copy className="w-4 h-4 mr-2" /> Compartir
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleExportPDF}>
              <FileText className="w-4 h-4 mr-2" /> Exportar PDF
            </Button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { id: 'structure', icon: Layers, label: 'Estructura' },
            { id: 'calendar', icon: CalendarDays, label: 'Calendario' },
            { id: 'chart', icon: BarChart3, label: 'Gráfico' }
          ].map(({ id, icon: Icon, label }) => (
            <button key={id} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-white/50'}`} onClick={() => setViewMode(id)}>
              <Icon className="w-4 h-4" /><span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {viewMode === 'structure' && renderStructureView()}
        {viewMode === 'calendar' && renderCalendarView()}
        {viewMode === 'chart' && renderChartView()}
      </div>
    );
  };

  // ============ RENDER: STRUCTURE (Material Design) ============
  const renderStructureView = () => (
    <div className="space-y-4">
      {/* Add Macrocycle Button */}
      <div className="flex justify-end">
        <Button onClick={handleAddMacrocycle} className="bg-blue-600 shadow-lg">
          <Plus className="w-4 h-4 mr-2" /> Agregar Macrociclo
        </Button>
      </div>

      {/* Macrocycles */}
      {selectedPlan.macrocycles?.map((macro, macroIdx) => (
        <Card key={macro.id} className="overflow-hidden shadow-lg border-0">
          {/* Macrocycle Header */}
          <div className="flex items-center justify-between p-4 cursor-pointer" style={{ background: `linear-gradient(135deg, ${macro.phase?.color}20 0%, ${macro.phase?.color}10 100%)`, borderLeft: `4px solid ${macro.phase?.color}` }} onClick={() => setExpandedMacro(expandedMacro === macroIdx ? null : macroIdx)}>
            <div className="flex items-center gap-4">
              {expandedMacro === macroIdx ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: macro.phase?.color }}>
                {macro.phase?.abbr}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">{macro.name}</h3>
                <p className="text-sm text-slate-500">{macro.weeks} semanas • {macro.mesocycles?.length || 0} mesociclos • Vol: {macro.phase?.volumePercent}% • Int: {macro.phase?.intensityPercent}%</p>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost" onClick={() => handleEditMacrocycle(macro, macroIdx)}><Edit2 className="w-4 h-4" /></Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteMacrocycle(macroIdx)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedMacro === macroIdx && (
            <CardContent className="p-4 bg-slate-50/50">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm font-semibold text-slate-500 uppercase">Mesociclos</p>
                <Button size="sm" variant="outline" onClick={() => handleAddMesocycle(macroIdx)}><Plus className="w-3 h-3 mr-1" /> Mesociclo</Button>
              </div>

              <div className="space-y-3">
                {macro.mesocycles?.map((meso, mesoIdx) => (
                  <Card key={meso.id} className="border shadow-sm overflow-hidden">
                    {/* Mesocycle Header */}
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50" style={{ borderLeft: `3px solid ${meso.type?.color}` }} onClick={() => setExpandedMeso(expandedMeso === `${macroIdx}-${mesoIdx}` ? null : `${macroIdx}-${mesoIdx}`)}>
                      <div className="flex items-center gap-3">
                        {expandedMeso === `${macroIdx}-${mesoIdx}` ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <Badge style={{ backgroundColor: meso.type?.color }} className="text-white">{meso.type?.name}</Badge>
                        <span className="font-semibold">{meso.name}</span>
                        <span className="text-sm text-slate-500">{meso.microcycles?.length || 0} semanas</span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => handleEditMesocycle(meso, macroIdx, mesoIdx)}><Edit2 className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteMesocycle(macroIdx, mesoIdx)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>

                    {/* Microcycles */}
                    {expandedMeso === `${macroIdx}-${mesoIdx}` && (
                      <div className="p-3 bg-white border-t">
                        <div className="flex justify-between items-center mb-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase">Microciclos (Semanas)</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleAddMicrocycle(macroIdx, mesoIdx)}><Plus className="w-3 h-3 mr-1" /> Semana</Button>
                        </div>

                        <div className="space-y-2">
                          {meso.microcycles?.map((micro, microIdx) => (
                            <div key={micro.id} className="border rounded-lg overflow-hidden">
                              {/* Microcycle Header */}
                              <div className="flex items-center justify-between p-2 bg-slate-50 cursor-pointer" onClick={() => setExpandedMicro(expandedMicro === `${macroIdx}-${mesoIdx}-${microIdx}` ? null : `${macroIdx}-${mesoIdx}-${microIdx}`)}>
                                <div className="flex items-center gap-2">
                                  {expandedMicro === `${macroIdx}-${mesoIdx}-${microIdx}` ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: micro.type?.color }} />
                                  <span className="font-medium text-sm">{micro.name}</span>
                                  <Badge variant="outline" className="text-xs">{micro.type?.name}</Badge>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs text-slate-500">{micro.sessions?.length || 0} sesiones</span>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleEditMicrocycle(micro, macroIdx, mesoIdx, microIdx)}><Edit2 className="w-3 h-3" /></Button>
                                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={() => handleDeleteMicrocycle(macroIdx, mesoIdx, microIdx)}><Trash2 className="w-3 h-3" /></Button>
                                </div>
                              </div>

                              {/* Sessions */}
                              {expandedMicro === `${macroIdx}-${mesoIdx}-${microIdx}` && (
                                <div className="p-3 bg-white">
                                  <div className="flex justify-between items-center mb-2">
                                    <p className="text-xs font-semibold text-slate-400">SESIONES</p>
                                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => handleAddSession(macroIdx, mesoIdx, microIdx)}><Plus className="w-3 h-3 mr-1" /> Sesión</Button>
                                  </div>
                                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                                    {micro.sessions?.map((session, sIdx) => {
                                      const sType = SESSION_TYPES.find(t => t.id === session.type);
                                      return (
                                        <div key={session.id} className={`p-2 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${sType?.bgColor || 'bg-slate-100'}`} onClick={() => handleEditSession(session, macroIdx, mesoIdx, microIdx, sIdx)}>
                                          <div className="flex justify-between items-start mb-1">
                                            <GripVertical className="w-3 h-3 text-slate-400" />
                                            <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
                                              <button className="p-0.5 hover:bg-white rounded" onClick={() => handleEditSession(session, macroIdx, mesoIdx, microIdx, sIdx)}><Edit2 className="w-2.5 h-2.5 text-blue-600" /></button>
                                              <button className="p-0.5 hover:bg-white rounded" onClick={() => handleDeleteSession(macroIdx, mesoIdx, microIdx, sIdx)}><Trash2 className="w-2.5 h-2.5 text-red-500" /></button>
                                            </div>
                                          </div>
                                          <p className="font-bold text-xs">{session.dayName}</p>
                                          <p className="text-[10px] text-slate-600">{sType?.name}</p>
                                          <p className="text-[10px] text-slate-500">{session.duration}min</p>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );

  // ============ RENDER: CALENDAR VIEW ============
  const renderCalendarView = () => {
    // Get all sessions organized by week
    const weeklyData = [];
    selectedPlan.macrocycles?.forEach(macro => {
      macro.mesocycles?.forEach(meso => {
        meso.microcycles?.forEach(micro => {
          weeklyData.push({
            name: micro.name,
            type: micro.type,
            phase: macro.phase,
            sessions: micro.sessions || []
          });
        });
      });
    });

    return (
      <div className="space-y-4">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2"><CalendarDays className="w-5 h-5" /> Vista de Calendario</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-3 text-left font-semibold text-slate-700 sticky left-0 bg-slate-100">Semana</th>
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
                      <th key={day} className="p-3 text-center font-semibold text-slate-700 min-w-[120px]">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyData.slice(0, 12).map((week, weekIdx) => (
                    <tr key={weekIdx} className="border-t hover:bg-slate-50">
                      <td className="p-3 sticky left-0 bg-white border-r">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-8 rounded" style={{ backgroundColor: week.phase?.color }} />
                          <div>
                            <p className="font-semibold text-sm">{week.name}</p>
                            <p className="text-xs text-slate-500">{week.type?.name}</p>
                          </div>
                        </div>
                      </td>
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, dayIdx) => {
                        const session = week.sessions.find(s => s.dayName === day) || week.sessions[dayIdx];
                        if (!session) return <td key={day} className="p-2 text-center border-l"><div className="h-16" /></td>;
                        const sType = SESSION_TYPES.find(t => t.id === session.type);
                        return (
                          <td key={day} className="p-2 border-l">
                            <div className={`p-2 rounded-lg border ${sType?.bgColor || 'bg-slate-100'} cursor-pointer hover:shadow-md transition-shadow`}>
                              <p className="font-semibold text-xs">{sType?.name}</p>
                              <p className="text-[10px] text-slate-500">{session.duration}min</p>
                              <Badge variant="outline" className="text-[10px] mt-1">{session.intensity === 'high' ? 'Alta' : session.intensity === 'medium' ? 'Media' : 'Baja'}</Badge>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============ RENDER: CHART VIEW ============
  const renderChartView = () => (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> Volumen e Intensidad</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={selectedPlan.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="volumen" fill="#3B82F6" stroke="#3B82F6" fillOpacity={0.3} name="Volumen" />
                <Line type="monotone" dataKey="intensidad" stroke="#EF4444" strokeWidth={3} name="Intensidad" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Phase distribution */}
      <Card className="shadow-lg">
        <CardHeader className="border-b">
          <CardTitle>Distribución de Fases</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex h-12 rounded-lg overflow-hidden">
            {selectedPlan.macrocycles?.map((macro, idx) => (
              <div key={idx} className="flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: macro.phase?.color, flex: macro.weeks }}>
                {macro.weeks > 3 && `${macro.phase?.abbr} (${macro.weeks}s)`}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
          sessionData={editingSession?.sessionData || null}
          onSave={handleSaveSession}
          sessionInfo={editingSession}
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
