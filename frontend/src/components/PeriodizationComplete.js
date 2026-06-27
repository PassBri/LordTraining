import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import InteractiveChart from './InteractiveChart';
import usePlanStore from '../stores/planStore';
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
  MoreVertical, Copy, Move, Settings, CalendarDays, AlertCircle, Sparkles, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area, ReferenceLine
} from 'recharts';
import SessionEditor from './SessionEditor';
import DashboardGeneral from './DashboardGeneral';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// ============ CONSTANTES ============
const MACROCYCLE_PHASES = [
  { id: 'prep_general', name: 'Preparatorio General', abbr: 'PG', color: '#3B82F6', volumePercent: 85, intensityPercent: 55 },
  { id: 'prep_specific', name: 'Preparatorio Específico', abbr: 'PE', color: '#8B5CF6', volumePercent: 70, intensityPercent: 75 },
  { id: 'precompetitive', name: 'Precompetitivo', abbr: 'PC', color: '#F59E0B', volumePercent: 55, intensityPercent: 88 },
  { id: 'competitive', name: 'Competitivo', abbr: 'CO', color: '#10B981', volumePercent: 40, intensityPercent: 95 },
  { id: 'transition', name: 'Transición', abbr: 'TR', color: '#6B7280', volumePercent: 30, intensityPercent: 45 },
  { id: 'accumulation', name: 'Acumulación', abbr: 'AC', color: '#3B82F6', volumePercent: 85, intensityPercent: 60 },
  { id: 'transformation', name: 'Transformación', abbr: 'TF', color: '#F59E0B', volumePercent: 60, intensityPercent: 85 },
  { id: 'realization', name: 'Realización', abbr: 'RE', color: '#10B981', volumePercent: 40, intensityPercent: 95 },
  { id: 'recovery', name: 'Recuperación', abbr: 'RC', color: '#6B7280', volumePercent: 35, intensityPercent: 40 }
];

// Resolve phase: can be string id, object with id, or full object
const resolvePhase = (macro) => {
  const p = macro?.phase;
  if (!p) return MACROCYCLE_PHASES[0];
  if (typeof p === 'string') return MACROCYCLE_PHASES.find(ph => ph.id === p) || MACROCYCLE_PHASES.find(ph => p.toLowerCase().includes(ph.id.slice(0,4))) || { id: p, name: macro.name || p, abbr: (macro.name || p).slice(0,2).toUpperCase(), color: '#3B82F6', volumePercent: 70, intensityPercent: 60 };
  if (p.color && p.name) return p;
  if (p.id) return MACROCYCLE_PHASES.find(ph => ph.id === p.id) || p;
  return MACROCYCLE_PHASES[0];
};

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
  // Material Design 3 vivid palette — coincide con la gráfica "Capacidades Físicas"
  { id: 'strength', name: 'Fuerza', color: '#F44336', bgColor: 'bg-red-100 border-red-300' },         // Material Red 500
  { id: 'endurance', name: 'Resistencia', color: '#2196F3', bgColor: 'bg-blue-100 border-blue-300' }, // Material Blue 500
  { id: 'speed', name: 'Velocidad', color: '#FF9800', bgColor: 'bg-orange-100 border-orange-300' },   // Material Orange 500
  { id: 'technical', name: 'Técnica', color: '#4CAF50', bgColor: 'bg-green-100 border-green-300' },   // Material Green 500
  { id: 'tactical', name: 'Táctica', color: '#9C27B0', bgColor: 'bg-purple-100 border-purple-300' },  // Material Purple 500
  { id: 'recovery', name: 'Recuperación', color: '#00BCD4', bgColor: 'bg-cyan-100 border-cyan-300' }, // Material Cyan 500
  { id: 'flexibility', name: 'Flexibilidad', color: '#E91E63', bgColor: 'bg-pink-100 border-pink-300' } // Material Pink 500
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

// ============ HELPERS DE VOLUMEN / INTENSIDAD ============
// Convierte un valor (numérico o nivel string) a número 0-100
const viNum = (x) => {
  if (x == null || x === '') return null;
  if (typeof x === 'number') return x;
  const map = { high: 85, medium: 65, low: 40, very_high: 95, alta: 85, media: 65, baja: 40 };
  if (typeof x === 'string') {
    const k = x.toLowerCase();
    if (k in map) return map[k];
    const n = parseInt(x);
    return isNaN(n) ? null : n;
  }
  return null;
};
// Devuelve el nivel ('high' | 'medium' | 'low') a partir de un valor numérico
const viLevel = (n) => {
  const v = viNum(n) ?? 0;
  return v >= 75 ? 'high' : v >= 50 ? 'medium' : 'low';
};
// Sincroniza todas las variantes de keys de volumen/intensidad en un nodo
const mirrorVI = (node) => {
  if (!node) return;
  const v = viNum(node.volume_percent ?? node.volume ?? node.volume_pct);
  const i = viNum(node.intensity_percent ?? node.intensity ?? node.intensity_pct);
  if (v != null) { node.volume = v; node.volume_percent = v; node.volume_pct = v; }
  if (i != null) { node.intensity = i; node.intensity_percent = i; node.intensity_pct = i; }
};

// ============ COMPONENTE PRINCIPAL ============
const PeriodizationComplete = ({ athleteId, athleteName, activePlan, onPlanCreated, showWizardOnly = false, onBack, focusTarget = null }) => {
  const { t } = useTranslation();
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

  // ── B2: calcular semanas a partir de fecha de inicio → fecha de competencia principal ──
  const computeWeeksFromDates = (startDate, compDate) => {
    if (!startDate || !compDate) return null;
    const s = new Date(startDate), c = new Date(compDate);
    if (isNaN(s.getTime()) || isNaN(c.getTime()) || c <= s) return null;
    const weeks = Math.ceil((c - s) / (1000 * 60 * 60 * 24 * 7));
    return Math.max(1, Math.min(208, weeks));
  };
  // Semanas efectivas: prioriza las fechas (autollenado); si no hay competencia, usa el ciclo elegido.
  const effectiveTotalWeeks = computeWeeksFromDates(planConfig.startDate, planConfig.mainCompetitionDate)
    || CYCLE_DURATIONS[planConfig.duration]?.weeks || 52;

  
  // Expanded states
  const [expandedMacro, setExpandedMacro] = useState(null);
  const [expandedMeso, setExpandedMeso] = useState(null);
  const [expandedMicro, setExpandedMicro] = useState(null);
  const [highlightMicroKey, setHighlightMicroKey] = useState(null);

  // ── Deep-link: abrir y resaltar el microciclo (semana) de una sesión venida del Panel ──
  const lastFocusRef = useRef(null);
  useEffect(() => {
    if (!focusTarget || !focusTarget.week || !selectedPlan?.macrocycles) return;
    const focusId = `${focusTarget.week}-${focusTarget.ts || ''}`;
    if (lastFocusRef.current === focusId) return;
    // Aplanar microciclos en orden para ubicar la semana global
    let counter = 0; let found = null;
    (selectedPlan.macrocycles || []).forEach((macro, macroIdx) => {
      (macro.mesocycles || []).forEach((meso, mesoIdx) => {
        (meso.microcycles || []).forEach((micro, microIdx) => {
          counter += 1;
          const matchByWeek = counter === focusTarget.week;
          const matchByDate = focusTarget.date && micro.startDate && micro.startDate.slice(0, 10) === focusTarget.date.slice(0, 10);
          if (!found && (matchByWeek || matchByDate)) found = { macroIdx, mesoIdx, microIdx };
        });
      });
    });
    if (!found) return;
    lastFocusRef.current = focusId;
    const microKey = `${found.macroIdx}-${found.mesoIdx}-${found.microIdx}`;
    setActiveView('history');
    setExpandedMacro(found.macroIdx);
    setExpandedMeso(`${found.macroIdx}-${found.mesoIdx}`);
    setExpandedMicro(microKey);
    setHighlightMicroKey(microKey);
    setTimeout(() => {
      const el = document.querySelector(`[data-testid="microcycle-${microKey}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);
    setTimeout(() => setHighlightMicroKey(null), 3500);
  }, [focusTarget, selectedPlan]);
  
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

  // Modelos de periodización dinámicos (incluyendo custom del usuario)
  const [apiModels, setApiModels] = useState([]);
  // ============ SEED desde "Plan Anterior" (ciclo retroalimentado) ============
  const [nextPlanSeed, setNextPlanSeed] = useState(null);
  const [seedDismissed, setSeedDismissed] = useState(false);
  const [seedApplied, setSeedApplied] = useState(false);

  // Mapa de áreas para mostrar etiquetas humanas en el banner
  const PREV_AREA_LABELS = {
    general: 'Objetivo General',
    fisica: 'Preparación Física',
    tecnica: 'Preparación Técnica',
    tactica: 'Preparación Táctica',
    psicologica: 'Preparación Psicológica',
    teorica: 'Preparación Teórica',
    reglamento: 'Reglamento del Deporte',
  };

  // Detectar seed al montar
  useEffect(() => {
    try {
      const raw = localStorage.getItem('lordtraining_next_plan_seed');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setNextPlanSeed(parsed);
          // Forzar wizard si no estamos ya en create
          if (showWizardOnly === false) setActiveView('create');
        }
      }
    } catch (_) { /* silent */ }
  }, []);
  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await fetch(`${API_URL}/api/periodization-library`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('train_token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setApiModels(Array.isArray(data) ? data : []);
        }
      } catch (_) { /* silent */ }
    };
    loadModels();
  }, []);

  // Mapear categorías de la API a las categorías UI legacy
  const mapCategory = (apiCat) => {
    const map = {
      'Clásico': 'classic',
      'Ondulatorio': 'undulating',
      'Avanzado': 'advanced',
      'Específico': 'sport_specific',
      'Fuerza': 'contemporary',
      'Equipo': 'sport_specific',
      'Custom': 'custom',
    };
    return map[apiCat] || 'custom';
  };

  const modelSlug = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  const tModelName = (name) => t('models.' + modelSlug(name), { defaultValue: name });

  // Construir modelos efectivos: combina los de API (con defaults + custom del usuario)
  // Si la API responde, usa esos. Caso contrario fallback a PERIODIZATION_MODELS hardcoded.
  const effectiveModels = React.useMemo(() => {
    if (apiModels.length === 0) {
      const dict = {};
      Object.entries(PERIODIZATION_MODELS).forEach(([id, m]) => {
        dict[id] = { ...m, name: tModelName(m.name) };
      });
      return dict;
    }
    const dict = {};
    apiModels.forEach(m => {
      dict[m.id] = {
        name: tModelName(m.name),
        category: mapCategory(m.category),
        description: m.description || '',
        author: m.author || '',
        icon: m.icon || '📊',
        color: m.color || '#3B82F6',
        phases: m.phases || [],
        isCustom: !m.is_default,
      };
    });
    return dict;
  }, [apiModels, t]);

  const effectiveCategories = React.useMemo(() => ({
    ...MODEL_CATEGORIES,
    custom: { name: 'Mis Modelos Personalizados', color: 'bg-[#CCFF00]/20 border-[#CCFF00]', icon: '✨' },
  }), []);

  // Aplicar el seed al planConfig una vez que los modelos estén disponibles
  useEffect(() => {
    if (!nextPlanSeed || seedApplied || seedDismissed) return;
    if (Object.keys(effectiveModels).length === 0) return;

    const seedModel = nextPlanSeed.source_model || '';
    const focusKey = nextPlanSeed.focus_area || '';
    const focusLabel = PREV_AREA_LABELS[focusKey] || focusKey;
    const recos = (nextPlanSeed.recomendaciones || '').trim();
    const conc = (nextPlanSeed.conclusiones || '').trim();

    // Construir mainObjective sugerido a partir del análisis
    const lines = [];
    if (focusLabel) lines.push(`Énfasis principal: ${focusLabel} (mayor brecha vs ideal).`);
    if (recos) lines.push(`Recomendaciones del análisis anterior: ${recos}`);
    if (conc) lines.push(`Conclusiones previas: ${conc}`);
    const suggestedObjective = lines.join('\n');

    setPlanConfig((prev) => ({
      ...prev,
      // Sólo precargar modelo si el seed lo provee y existe en la biblioteca
      model: prev.model || (seedModel && effectiveModels[seedModel] ? seedModel : prev.model),
      mainObjective: prev.mainObjective || suggestedObjective,
    }));
    // Si ya tenemos modelo pre-seleccionado, avanzar al paso 2 (Modelo) para que el coach
    // visualice la pre-selección antes de continuar
    setSeedApplied(true);
  }, [nextPlanSeed, effectiveModels, seedApplied, seedDismissed]);

  const clearNextPlanSeed = useCallback(() => {
    try { localStorage.removeItem('lordtraining_next_plan_seed'); } catch (_) { /* ignore */ }
    setNextPlanSeed(null);
  }, []);

  const dismissSeed = () => {
    setSeedDismissed(true);
    clearNextPlanSeed();
    toast.info(t('periodization.tPreselectDiscarded'));
  };

  const [generatedStructure, setGeneratedStructure] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [expandedPanels, setExpandedPanels] = useState({});

  // Get token helper
  const getToken = () => localStorage.getItem('train_token');

  // V2 Cascade Store
  const v2Store = usePlanStore();
  const v2Alertas = v2Store.alertas || [];
  const v2Metricas = v2Store.metricas || {};
  const v2Macros = v2Store.macrociclos || [];
  const v2Mesos = v2Store.mesociclos || [];
  const v2Micros = v2Store.microciclos || [];
  const v2Sesiones = v2Store.sesiones || [];
  const v2Loading = v2Store.loading;

  // Sync V1 plan to V2 when a plan is selected
  useEffect(() => {
    if (selectedPlan?.apiId && activeView === 'detail') {
      v2Store.syncFromV1(selectedPlan.apiId);
    }
  }, [selectedPlan?.apiId, activeView]);

  // Helper: get V2 macro metrics by index
  const getV2MacroMetrics = (macroIdx) => {
    return v2Macros[macroIdx] || null;
  };

  // Helper: get V2 meso metrics
  const getV2MesoMetrics = (macroIdx, mesoIdx) => {
    const macro = v2Macros[macroIdx];
    if (!macro) return null;
    const mesos = v2Mesos.filter(m => m.macrociclo_id === macro.id);
    return mesos[mesoIdx] || null;
  };

  // Helper: get V2 micro metrics
  const getV2MicroMetrics = (macroIdx, mesoIdx, microIdx) => {
    const meso = getV2MesoMetrics(macroIdx, mesoIdx);
    if (!meso) return null;
    const micros = v2Micros.filter(m => m.mesociclo_id === meso.id);
    return micros[microIdx] || null;
  };

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
              modelName: plan.model_name || effectiveModels[plan.model]?.name || plan.model,
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
      name: t('periodization.newMacro'),
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
    if (!indices.isNew) data.viLocked = true;
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
    toast.success(indices.isNew ? t('periodization.macroCreated') : t('periodization.macroUpdated'));
  };

  const handleDeleteMacrocycle = (macroIdx) => {
    if (!window.confirm('¿Eliminar este macrociclo y todo su contenido?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles.splice(macroIdx, 1);
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success(t('periodization.tMacroDeleted'));
  };

  // MESOCICLO CRUD
  const handleAddMesocycle = (macroIdx) => {
    const newMeso = {
      id: `meso-${Date.now()}`,
      name: t('periodization.newMeso'),
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
    if (!indices.isNew) data.viLocked = true;
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
    toast.success(indices.isNew ? t('periodization.mesoCreated') : t('periodization.mesoUpdated'));
  };

  const handleDeleteMesocycle = (macroIdx, mesoIdx) => {
    if (!window.confirm('¿Eliminar este mesociclo?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles.splice(mesoIdx, 1);
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success(t('periodization.tMesoDeleted'));
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
    if (!indices.isNew) data.viLocked = true;
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
    toast.success(indices.isNew ? t('periodization.microCreated') : t('periodization.microUpdated'));
  };

  const handleDeleteMicrocycle = (macroIdx, mesoIdx, microIdx) => {
    if (!window.confirm('¿Eliminar este microciclo?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles.splice(microIdx, 1);
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success(t('periodization.tMicroDeleted'));
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
      // Trigger V2 cascade re-sync
      if (updatedPlan.apiId) {
        v2Store.syncFromV1(updatedPlan.apiId);
      }
    } catch (e) {
      console.error('Error saving session to API:', e);
    }
    
    toast.success(t('periodization.tSessionSaved'));
  };

  const handleDeleteSession = (macroIdx, mesoIdx, microIdx, sessionIdx) => {
    if (!window.confirm('¿Eliminar esta sesión?')) return;
    const updatedPlan = { ...selectedPlan };
    updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].sessions.splice(sessionIdx, 1);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    toast.success(t('periodization.tSessionDeleted'));
  };

  // Edición rápida de Volumen / Intensidad de la sesión (modal con fondo blanco)
  const handleEditSessionVI = (session, macroIdx, mesoIdx, microIdx, sessionIdx) => {
    setEditModal({
      type: 'session',
      data: {
        ...session,
        volume: viNum(session.volume) ?? 100,
        intensity: viNum(session.intensity) ?? 70,
        progress: session.progress ?? 0,
      },
      indices: { macroIdx, mesoIdx, microIdx, sessionIdx },
    });
  };

  const handleSaveSessionVI = () => {
    const { data, indices } = editModal;
    const { macroIdx, mesoIdx, microIdx, sessionIdx } = indices;
    const updatedPlan = { ...selectedPlan };
    const micro = updatedPlan.macrocycles[macroIdx].mesocycles[mesoIdx].microcycles[microIdx];
    const session = micro.sessions[sessionIdx];
    session.volume = viNum(data.volume) ?? 100;
    session.intensity = viNum(data.intensity) ?? 70;
    session.progress = Number(data.progress) || 0;
    if (data.name != null) session.name = data.name;
    if (data.duration != null) session.duration = parseInt(data.duration) || session.duration;
    session.edited = true;
    mirrorVI(session);
    // Desbloquear micro para que la suma en cascada recalcule desde las sesiones
    micro.viLocked = false;
    rebuildPlanData(updatedPlan);
    setPlans(prev => prev.map(p => p.id === selectedPlan.id ? updatedPlan : p));
    setSelectedPlan(updatedPlan);
    setEditModal({ type: null, data: null, indices: null });
    savePlanToAPI(updatedPlan).catch(e => console.error('Error guardando sesión:', e));
    toast.success(t('periodization.tSessionUpdated'));
  };


  // ============ HELPERS ============
  
  // Helper to find sport name from both catalogs
  const getSportName = (sportId) => {
    let raw = planConfig.sportName || sportId;
    // First check user's custom sports
    for (const category of userSports) {
      const sport = category.sports?.find(s => s.id === sportId);
      if (sport) { raw = sport.name; break; }
    }
    // Then check static catalog
    for (const category of Object.keys(sportsCatalog)) {
      const sport = sportsCatalog[category]?.find(s => s.id === sportId);
      if (sport) { raw = sport.name; break; }
    }
    return t('catalog.sport_' + sportId, { defaultValue: raw });
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
      intensity: [85, 65, 88, 70, 40][i % 5],
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

  // Consolida (de abajo hacia arriba) volumen/intensidad/progreso:
  // sesiones -> microciclo -> mesociclo -> macrociclo. Usa promedio (los valores
  // son porcentajes) y guarda también la suma total en *_total para referencia.
  const computeRollups = (plan) => {
    const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    const sum = (arr) => arr.reduce((a, b) => a + (Number(b) || 0), 0);
    (plan.macrocycles || []).forEach(macro => {
      const mesoVols = [], mesoInts = [], mesoProgs = [];
      (macro.mesocycles || []).forEach(meso => {
        const microVols = [], microInts = [], microProgs = [];
        (meso.microcycles || []).forEach(micro => {
          const sess = micro.sessions || [];
          (sess || []).forEach(s => mirrorVI(s));
          const sVols = sess.map(s => viNum(s.volume)).filter(n => n != null);
          const sInts = sess.map(s => viNum(s.intensity)).filter(n => n != null);
          const sProgs = sess.map(s => Number(s.progress)).filter(n => !isNaN(n));
          if (sVols.length && !micro.viLocked) micro.volume = avg(sVols);
          if (sInts.length && !micro.viLocked) micro.intensity = avg(sInts);
          if (sProgs.length && !micro.viLocked) micro.progress = avg(sProgs);
          micro.volume_total = sum(sVols);
          micro.intensity_total = sum(sInts);
          mirrorVI(micro);
          if (micro.volume != null) microVols.push(Number(micro.volume));
          if (micro.intensity != null) microInts.push(Number(micro.intensity));
          if (micro.progress != null) microProgs.push(Number(micro.progress));
        });
        if (microVols.length && !meso.viLocked) meso.volume_percent = avg(microVols);
        if (microInts.length && !meso.viLocked) meso.intensity_percent = avg(microInts);
        if (microProgs.length && !meso.viLocked) meso.progress = avg(microProgs);
        meso.volume_total = sum(microVols);
        meso.intensity_total = sum(microInts);
        mirrorVI(meso);
        if (meso.volume_percent != null) mesoVols.push(Number(meso.volume_percent));
        if (meso.intensity_percent != null) mesoInts.push(Number(meso.intensity_percent));
        if (meso.progress != null) mesoProgs.push(Number(meso.progress));
      });
      if (mesoVols.length && !macro.viLocked) macro.volume_percent = avg(mesoVols);
      if (mesoInts.length && !macro.viLocked) macro.intensity_percent = avg(mesoInts);
      if (mesoProgs.length && !macro.viLocked) macro.progress = avg(mesoProgs);
      macro.volume_total = sum(mesoVols);
      macro.intensity_total = sum(mesoInts);
      mirrorVI(macro);
    });
  };

  const rebuildPlanData = (plan) => {
    computeRollups(plan);
    // Rebuild chart data from macrocycles
    const chartData = [];
    let weekNum = 1;
    
    plan.macrocycles?.forEach(macro => {
      macro.mesocycles?.forEach(meso => {
        meso.microcycles?.forEach(micro => {
          const phase = resolvePhase(macro);
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
    const totalWeeks = computeWeeksFromDates(planConfig.startDate, planConfig.mainCompetitionDate)
      || CYCLE_DURATIONS[duration]?.weeks || 52;
    
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
      modelName: effectiveModels[model]?.name || model,
      duration,
      totalWeeks,
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

      // Unifica todas las variantes de keys (volume / volume_percent / volume_pct, idem intensity)
      (apiPlan.macrocycles || []).forEach(ma => {
        mirrorVI(ma);
        (ma.mesocycles || []).forEach(me => {
          mirrorVI(me);
          (me.microcycles || []).forEach(mi => {
            mirrorVI(mi);
            (mi.sessions || []).forEach(se => mirrorVI(se));
          });
        });
      });

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
      toast.error(t('periodization.tCompleteRequired'));
      return;
    }
    const plan = generatePlanStructure();
    
    // Save to API
    const savedPlan = await savePlanToAPI(plan);
    
    setPlans(prev => [savedPlan, ...prev]);
    setSelectedPlan(savedPlan);
    setActiveView('detail');
    toast.success(t('periodization.tPlanCreatedSaved'));
    clearNextPlanSeed();

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
    toast.success(t('periodization.tPlanSaved'));
    
    // Re-sync V2 cascade
    if (savedPlan.apiId) {
      v2Store.syncFromV1(savedPlan.apiId);
    }
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
    toast.success(t('periodization.tPlanDeleted'));
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
    toast.success(t('periodization.tPlanDuplicated'));
  };

  const handleSharePlan = async () => {
    if (!selectedPlan?.apiId) {
      toast.error(t('periodization.tSavePlanFirst'));
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
        toast.success(t('periodization.tLinkCopied'));
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error(t('periodization.tShareError'));
    }
  };

  const handleExportPDF = async () => {
    if (!selectedPlan?.apiId) {
      toast.error(t('periodization.tSavePlanFirstExport'));
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
        toast.success(t('periodization.tPdfDownloaded'));
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error(t('periodization.tExportError'));
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
      toast.error(t('periodization.tCalcError'));
    }
    return null;
  };

  // ============ AUTO GENERATE STRUCTURE ============
  const generateAutoStructure = async () => {
    if (!planConfig.model || !planConfig.sport || !planConfig.startDate) {
      toast.error(t('periodization.tSelectModelSportDate'));
      return;
    }
    
    setGenerating(true);
    try {
      const token = getToken();
      const totalWeeks = computeWeeksFromDates(planConfig.startDate, planConfig.mainCompetitionDate)
        || CYCLE_DURATIONS[planConfig.duration]?.weeks || 52;
      
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
        toast.success(t('periodization.tStructGenerated'));
      } else {
        const error = await response.json();
        toast.error(error.detail || t('periodization.tGenStructError'));
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(t('periodization.tGenStructError'));
    } finally {
      setGenerating(false);
    }
  };

  // Create plan from generated structure
  const handleCreateFromGenerated = async () => {
    if (!generatedStructure) {
      toast.error(t('periodization.tGenStructFirst'));
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
    toast.success(t('periodization.tPlanCreatedStruct'));
    clearNextPlanSeed();

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
            <h2 className="text-lg font-bold text-slate-800">{t('periodization.periodizationPlans')}</h2>
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
          <p className="text-slate-400 text-sm">{t('periodization.loadingPlans')}</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-500 mb-2">{t('periodization.noPeriodizationPlans')}</h3>
          <p className="text-slate-400 mb-5 text-sm">{t('periodization.createFirstPlan')}</p>
          <Button onClick={() => setActiveView('create')} className="bg-slate-900 text-white rounded-lg"><Plus className="w-4 h-4 mr-2" /> {t('periodization.createPlan')}</Button>
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
                      <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-200">{t('periodization.saved')}</span>
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
  const renderCreate = () => {
    const stepLabels = [t('periodization.sport'), t('periodization.model'), t('periodization.duration'), t('periodization.stepStructure'), t('periodization.stepSummary')];
    const canAdvance = !((wizardStep === 1 && !planConfig.sport) || (wizardStep === 2 && !planConfig.model) || (wizardStep === 3 && !planConfig.startDate));
    return (
    <div className="w-full" data-testid="create-plan-wizard">
      {/* BANNER: Pre-carga desde Plan Anterior (cierra el ciclo) */}
      {nextPlanSeed && !seedDismissed && (
        <div
          data-testid="next-plan-seed-banner"
          className="mb-3 rounded-2xl overflow-hidden border-2 border-[#CCFF00] shadow-lg shadow-[#CCFF00]/20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative"
        >
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,#CCFF00_0%,transparent_60%)]" />
          <div className="relative p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-[#CCFF00]/30" style={{ background: '#CCFF00' }}>
              <Sparkles className="w-6 h-6 text-slate-900" strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: '#CCFF00' }}>{t('periodization.closeCycle')}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">·</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/60">{t('periodization.prevAnalysis')}</span>
              </div>
              <h3 className="text-[15px] font-black text-white leading-tight mb-1.5">
                Detectamos que vienes del análisis del Plan Anterior
              </h3>
              <p className="text-[12px] text-white/75 leading-snug mb-2">
                {nextPlanSeed.source_model_name && (
                  <>{t('periodization.preSelectedModel')} <span className="font-bold text-[#CCFF00]">{nextPlanSeed.source_model_name}</span>. </>
                )}
                {nextPlanSeed.focus_area && PREV_AREA_LABELS[nextPlanSeed.focus_area] && (
                  <>{t('periodization.phaseOf')} <span className="font-bold text-[#CCFF00]">{PREV_AREA_LABELS[nextPlanSeed.focus_area]}</span> {t('periodization.phaseEmphasis')} </>
                )}
                Tus recomendaciones se cargaron como objetivo principal.
              </p>
              {Array.isArray(nextPlanSeed.gap_analysis) && nextPlanSeed.gap_analysis.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5" data-testid="seed-gap-chips">
                  {nextPlanSeed.gap_analysis.slice(0, 4).map((g, i) => {
                    const label = PREV_AREA_LABELS[g.area] || g.area;
                    const gapNum = Math.max(0, Math.round(Number(g.gap) || 0));
                    if (gapNum <= 0) return null;
                    return (
                      <span key={i} className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/15 text-white/80 bg-white/5">
                        {label} <span className="text-[#CCFF00]">−{gapNum}%</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              data-testid="seed-dismiss-btn"
              onClick={dismissSeed}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title={t('periodization.discardPreselect')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Compact Header + Stepper in a single LordTraining-branded bar */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-xl">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#CCFF00] flex items-center justify-center shadow-md shadow-[#CCFF00]/30">
              <Target className="w-4 h-4 text-slate-900" />
            </div>
            <div className="leading-tight">
              <h2 className="text-sm font-black text-white tracking-tight">{t('periodization.createTrainingPlan')}</h2>
              <p className="text-[10px] text-white/50">{t('periodization.stepCounter', { n: wizardStep })} · {stepLabels[wizardStep - 1]}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => { if (showWizardOnly && onBack) { onBack(); } else { setActiveView('history'); } setGeneratedStructure(null); }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Material stepper - compact */}
        <div className="px-4 py-2.5 bg-slate-900/60">
          <div className="flex items-center justify-between relative">
            {[1, 2, 3, 4, 5].map((step, i) => {
              const isActive = wizardStep === step;
              const isDone = wizardStep > step;
              return (
                <React.Fragment key={step}>
                  <button
                    type="button"
                    onClick={() => (isDone || isActive) && setWizardStep(step)}
                    className="flex flex-col items-center gap-0.5 flex-shrink-0 group z-10"
                    data-testid={`wizard-step-${step}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 border-2 ${
                        isActive
                          ? 'bg-[#CCFF00] text-slate-900 border-[#CCFF00] shadow-md shadow-[#CCFF00]/40 scale-110'
                          : isDone
                            ? 'bg-[#CCFF00]/20 text-[#CCFF00] border-[#CCFF00]/60'
                            : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : step}
                    </div>
                    <span className={`text-[9px] font-semibold tracking-wide hidden sm:block transition-colors ${
                      isActive ? 'text-[#CCFF00]' : isDone ? 'text-white/70' : 'text-white/30'
                    }`}>
                      {stepLabels[i]}
                    </span>
                  </button>
                  {i < 4 && (
                    <div className="flex-1 h-0.5 mx-1 md:mx-2 -mt-3 relative overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#CCFF00] transition-all duration-500"
                        style={{ width: wizardStep > step ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Step content area */}
        <div className="bg-white">
          <div className="px-4 py-3">
            {/* STEP 1: SPORT SELECTION */}
            {wizardStep === 1 && (
              <div className="space-y-3" data-testid="wizard-step-1-content">
              
              {/* User's Custom Sports from Información -> Deportes */}
              {userSports.length > 0 && userSports.some(cat => cat.sports?.length > 0) && (
                <div className="space-y-2">
                  <div className="px-2 py-1 rounded-md bg-gradient-to-r from-blue-100 to-indigo-100 border-l-2 border-blue-500 flex items-center gap-1.5">
                    <span className="text-xs">⭐</span>
                    <h4 className="font-bold text-blue-700 text-[11px] uppercase tracking-wider">{t('periodization.mySports')}</h4>
                  </div>
                  {userSports.filter(cat => cat.sports?.length > 0).map(category => (
                    <div key={category.id}>
                      <p className="text-[10px] font-medium text-slate-500 mb-1">{category.icon || '🏅'} {category.name}</p>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                        {category.sports.map(sport => (
                          <button
                            key={sport.id}
                            type="button"
                            className={`p-2 rounded-md border text-left cursor-pointer transition-all ${planConfig.sport === sport.id ? 'border-[#CCFF00] bg-[#CCFF00]/10 ring-1 ring-[#CCFF00]' : 'border-blue-200 hover:border-slate-900 hover:bg-blue-50/50'}`}
                            onClick={() => setPlanConfig({ ...planConfig, sport: sport.id, sportName: sport.name, sessionsPerWeek: sport.sessions_per_week || 4 })}
                          >
                            <p className="font-bold text-slate-800 text-[11px] truncate leading-tight">{t('catalog.sport_' + sport.id, { defaultValue: sport.name })}</p>
                            <p className="text-[9px] text-slate-400">{sport.sessions_per_week || 4}/{t('loadPanel.semShort')}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Static Sports Catalog */}
              {Object.entries(sportsCatalog).map(([category, sports]) => (
                <div key={category} className="space-y-1.5">
                  <div className="px-2 py-1 rounded-md bg-slate-100 border-l-2 border-slate-400 flex items-center gap-1.5">
                    <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{category === 'strength' ? '💪' : category === 'endurance' ? '🏃' : category === 'speed' ? '⚡' : category === 'team' ? '⚽' : category === 'combat' ? '🥊' : category === 'racquet' ? '🎾' : category === 'fitness' ? '🏋️' : '🏅'} {t('catalog.cat_' + category, { defaultValue: category })}</h4>
                    <span className="text-[9px] text-slate-400 ml-auto">{sports.length}</span>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-1.5">
                    {sports.map(sport => (
                      <button
                        key={sport.id}
                        type="button"
                        className={`p-2 rounded-md border text-left cursor-pointer transition-all ${planConfig.sport === sport.id ? 'border-[#CCFF00] bg-[#CCFF00]/10 ring-1 ring-[#CCFF00]' : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50'}`}
                        onClick={() => setPlanConfig({ ...planConfig, sport: sport.id, sportName: sport.name, sessionsPerWeek: sport.sessions_per_week })}
                      >
                        <p className="font-bold text-slate-800 text-[11px] truncate leading-tight">{t('catalog.sport_' + sport.id, { defaultValue: sport.name })}</p>
                        <p className="text-[9px] text-slate-400">{sport.sessions_per_week}/{t('loadPanel.semShort')}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Athlete Level */}
              <div className="pt-2 border-t flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('periodization.athleteLevel')}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { id: 'beginner', name: t('catalog.level_beginner'), desc: '< 1 año' },
                    { id: 'intermediate', name: t('catalog.level_intermediate'), desc: '1-3 años' },
                    { id: 'advanced', name: t('catalog.level_advanced'), desc: '3-6 años' },
                    { id: 'elite', name: t('catalog.level_elite'), desc: '6+ años' }
                  ].map(level => (
                    <button 
                      key={level.id}
                      className={`px-3 py-1 rounded-md border text-left transition-all ${planConfig.athleteLevel === level.id ? 'border-[#CCFF00] bg-[#CCFF00]/10 ring-1 ring-[#CCFF00]' : 'border-slate-200 hover:border-slate-900'}`}
                      onClick={() => setPlanConfig({ ...planConfig, athleteLevel: level.id })}
                    >
                      <span className="font-bold text-[11px]">{level.name}</span>
                      <span className="text-[9px] text-slate-400 ml-1.5">{level.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: MODEL SELECTION */}
          {wizardStep === 2 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">Modelo de Periodización · {Object.keys(effectiveModels).length} disponibles</h3>
              {Object.entries(effectiveCategories).map(([categoryId, category]) => {
                const modelsInCategory = Object.entries(effectiveModels).filter(([_, m]) => m.category === categoryId);
                if (modelsInCategory.length === 0) return null;
                return (
                  <div key={categoryId} className="space-y-1.5">
                    <div className={`px-2 py-1 rounded-md ${category.color} border-l-2 flex items-center gap-1.5`}>
                      <span className="text-xs">{category.icon}</span>
                      <h4 className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">{category.name}</h4>
                      <span className="text-[9px] text-slate-400 ml-auto">{modelsInCategory.length}</span>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {modelsInCategory.map(([id, model]) => (
                        <div 
                          key={id} 
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all ${planConfig.model === id ? 'border-[#CCFF00] bg-[#CCFF00]/10 shadow-md ring-1 ring-[#CCFF00]' : 'border-slate-200 hover:border-slate-900 hover:bg-slate-50'}`} 
                          onClick={() => setPlanConfig({ ...planConfig, model: id })}
                          data-testid={`model-option-${id}`}
                          title={model.description}
                        >
                          <div className="flex items-start gap-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                {model.icon && <span className="text-xs">{model.icon}</span>}
                                <p className="font-bold text-slate-800 text-[11px] leading-tight truncate">{model.name}</p>
                                {model.isCustom && (
                                  <span className="text-[8px] font-bold text-slate-900 bg-[#CCFF00] px-1 py-px rounded flex-shrink-0">MIO</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 leading-snug line-clamp-2">{model.description}</p>
                            </div>
                            {planConfig.model === id && (
                              <CheckCircle className="w-4 h-4 text-[#CCFF00] fill-slate-900 flex-shrink-0" />
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
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">{t('periodization.cycleDuration')}</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                {Object.entries(CYCLE_DURATIONS).map(([id, dur]) => (
                  <button
                    type="button"
                    key={id}
                    className={`p-2 rounded-md border text-center cursor-pointer transition-all ${planConfig.duration === id ? 'border-[#CCFF00] bg-[#CCFF00]/10 ring-1 ring-[#CCFF00]' : 'border-slate-200 hover:border-slate-900'}`}
                    onClick={() => setPlanConfig({ ...planConfig, duration: id })}
                  >
                    <p className="text-lg font-black text-slate-900 leading-none">{dur.weeks}</p>
                    <p className="text-[9px] text-slate-400 uppercase">{t('periodization.weeksLower')}</p>
                    <p className="text-[10px] font-bold text-slate-700 truncate">{dur.label}</p>
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('periodization.startDate')}</label>
                  <Input type="date" value={planConfig.startDate} onChange={(e) => setPlanConfig({ ...planConfig, startDate: e.target.value })} className="mt-0.5 h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('periodization.sessionsPerWeek')}</label>
                  <Select value={planConfig.sessionsPerWeek.toString()} onValueChange={(v) => setPlanConfig({ ...planConfig, sessionsPerWeek: parseInt(v) })}>
                    <SelectTrigger className="mt-0.5 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[3, 4, 5, 6, 7].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('periodization.mainCompetition')}</label>
                  <Input placeholder={t('periodization.phOptional')} value={planConfig.mainCompetition} onChange={(e) => setPlanConfig({ ...planConfig, mainCompetition: e.target.value })} className="mt-0.5 h-8 text-xs" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('periodization.competitionDate')}</label>
                  <Input type="date" value={planConfig.mainCompetitionDate} onChange={(e) => setPlanConfig({ ...planConfig, mainCompetitionDate: e.target.value })} className="mt-0.5 h-8 text-xs" />
                  {computeWeeksFromDates(planConfig.startDate, planConfig.mainCompetitionDate) && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1" data-testid="computed-weeks-hint">
                      {computeWeeksFromDates(planConfig.startDate, planConfig.mainCompetitionDate)} semanas hasta la competencia
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: STRUCTURE GENERATION */}
          {wizardStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100">{t('periodization.generateAuto')}</h3>
              <p className="text-center text-slate-500">{t('periodization.systemWillGenerate')}</p>
              
              <div className="bg-slate-50 p-4 rounded-xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.sport')}</p>
                    <p className="font-bold text-slate-700">{getSportName(planConfig.sport)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.model')}</p>
                    <p className="font-bold text-slate-700">{effectiveModels[planConfig.model]?.name || planConfig.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.duration')}</p>
                    <p className="font-bold text-slate-700">{effectiveTotalWeeks} semanas</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.level')}</p>
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
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> {t('periodization.generating')}</>
                  ) : (
                    <><Activity className="w-5 h-5 mr-2" /> {t('periodization.generateScientific')}</>
                  )}
                </Button>
                {!planConfig.startDate && <p className="text-sm text-red-500 mt-2">{t('periodization.selectStartDatePrev')}</p>}
              </div>
              
              {/* Generated Structure Preview */}
              {generatedStructure && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 space-y-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-6 h-6" />
                    <h4 className="font-bold text-lg">{t('periodization.structGeneratedHeading')}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-blue-600">{generatedStructure.summary.total_macrocycles}</p>
                      <p className="text-xs text-slate-500">{t('periodization.macrocyclesTab')}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-purple-600">{generatedStructure.summary.total_mesocycles}</p>
                      <p className="text-xs text-slate-500">{t('periodization.mesocyclesTab')}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-green-600">{generatedStructure.summary.total_microcycles}</p>
                      <p className="text-xs text-slate-500">{t('periodization.microcyclesTab')}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-orange-600">{generatedStructure.summary.total_sessions}</p>
                      <p className="text-xs text-slate-500">{t('periodization.sessions')}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-2xl font-bold text-slate-700">{generatedStructure.summary.avg_volume}%</p>
                      <p className="text-xs text-slate-500">{t('periodization.avgVol')}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-700 mb-2">{t('periodization.planPhases')}</h5>
                    <div className="flex flex-wrap gap-2">
                      {generatedStructure.summary.phases.map((phase, i) => (
                        <Badge key={i} className="bg-blue-100 text-blue-700">
                          {phase.name}: {phase.weeks} {t('periodization.weekShort')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg">
                    <h5 className="font-semibold text-slate-700 mb-2">{t('periodization.mainQualities')}</h5>
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
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 pb-3 border-b border-slate-100">{t('periodization.finalSummary')}</h3>
              <div>
                <label className="text-sm font-medium">{t('periodization.planName')}</label>
                <Input 
                  placeholder={`Plan ${getSportName(planConfig.sport)} - ${effectiveModels[planConfig.model]?.name || ''}`} 
                  value={planConfig.name} 
                  onChange={(e) => setPlanConfig({ ...planConfig, name: e.target.value })} 
                  className="mt-1" 
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t('periodization.mainObjective')}</label>
                <textarea className="w-full mt-1 p-3 border rounded-lg" rows={3} placeholder={t('periodization.phObjectiveDesc')} value={planConfig.mainObjective} onChange={(e) => setPlanConfig({ ...planConfig, mainObjective: e.target.value })} />
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl">
                <h4 className="font-bold text-slate-700 mb-4 text-center">{t('periodization.planConfig')}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.sport')}</p>
                    <p className="font-bold text-slate-700">{getSportName(planConfig.sport)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.model')}</p>
                    <p className="font-bold text-blue-600">{effectiveModels[planConfig.model]?.name || planConfig.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.duration')}</p>
                    <p className="font-bold text-slate-700">{effectiveTotalWeeks} semanas</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t('periodization.sessionsPerWeekShort')}</p>
                    <p className="font-bold text-slate-700">{planConfig.sessionsPerWeek}</p>
                  </div>
                </div>
                
                {generatedStructure && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{generatedStructure.summary.total_macrocycles}</p>
                        <p className="text-xs text-slate-500">{t('periodization.macrocyclesTab')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{generatedStructure.summary.total_mesocycles}</p>
                        <p className="text-xs text-slate-500">{t('periodization.mesocyclesTab')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{generatedStructure.summary.total_microcycles}</p>
                        <p className="text-xs text-slate-500">{t('periodization.microcyclesTab')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-600">{generatedStructure.summary.total_sessions}</p>
                        <p className="text-xs text-slate-500">{t('periodization.sessions')}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          </div>

          {/* Navigation Buttons - LordTraining sticky footer */}
          <div className="px-5 md:px-6 py-3.5 border-t border-slate-200 bg-gradient-to-b from-slate-50 to-white flex items-center justify-between rounded-b-2xl">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-slate-600 hover:text-slate-900"
              onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : (showWizardOnly && onBack ? onBack() : setActiveView('history'))}
              data-testid="wizard-prev-btn"
            >
              <ChevronLeft className="w-4 h-4" /> {wizardStep > 1 ? 'Anterior' : 'Cancelar'}
            </Button>
            <div className="text-[11px] text-slate-400 hidden md:block">
              {wizardStep === 1 && !planConfig.sport && 'Selecciona un deporte para continuar'}
              {wizardStep === 2 && !planConfig.model && 'Selecciona un modelo de periodización'}
              {wizardStep === 3 && !planConfig.startDate && 'Define la fecha de inicio'}
              {canAdvance && wizardStep < 5 && 'Todo listo · puedes avanzar'}
              {wizardStep === 5 && 'Paso final · crea tu plan'}
            </div>
            {wizardStep < 5 ? (
              <Button
                className="bg-[#CCFF00] hover:bg-[#b8e600] text-slate-900 font-bold px-5 gap-1.5 shadow-md shadow-[#CCFF00]/20 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={!canAdvance}
                data-testid="wizard-next-btn"
              >
                Siguiente <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                className="bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-[#CCFF00] font-bold px-5 gap-1.5 shadow-lg disabled:opacity-50"
                onClick={generatedStructure ? handleCreateFromGenerated : handleCreatePlan}
                disabled={!planConfig.startDate}
                data-testid="wizard-create-btn"
              >
                <Check className="w-4 h-4" /> {generatedStructure ? t('periodization.createWithStructure') : t('periodization.createPlan')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  };

  // ============ RENDER: DETAIL VIEW ============
  const renderDetail = () => {
    if (!selectedPlan) return null;
    const BC = "'Barlow Condensed', sans-serif";
    const totalMesos = selectedPlan.macrocycles?.reduce((s, m) => s + (m.mesocycles?.length || 0), 0) || 0;
    const totalMicros = selectedPlan.macrocycles?.reduce((s, m) => s + m.mesocycles?.reduce((s2, me) => s2 + (me.microcycles?.length || 0), 0), 0) || 0;

    return (
      <div className="space-y-5">
        {/* B3: Alerta de conflicto de fechas (visible donde se editan fechas/etapas) */}
        {(() => {
          const sd = selectedPlan.startDate || selectedPlan.start_date;
          const cd = selectedPlan.mainCompetitionDate || selectedPlan.main_competition_date;
          const tw = selectedPlan.totalWeeks || selectedPlan.total_weeks;
          if (!sd || !cd || !tw) return null;
          const s = new Date(sd), c = new Date(cd);
          if (isNaN(s.getTime()) || isNaN(c.getTime())) return null;
          let msg = null;
          if (c <= s) msg = t('graphicPlan.conflicto_competencia_antes_inicio');
          else {
            const compWeek = Math.max(1, Math.ceil((c - s) / (1000 * 60 * 60 * 24 * 7)));
            if (compWeek > tw) msg = `${t('graphicPlan.conflicto_competencia_fuera')} (${t('graphicPlan.semana')} ${compWeek} > ${tw})`;
            else if (compWeek < Math.ceil(tw * 0.6)) msg = `${t('graphicPlan.conflicto_competencia_temprana')} (${t('graphicPlan.semana')} ${compWeek}/${tw})`;
          }
          if (!msg) return null;
          return (
            <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 flex items-start gap-3" data-testid="periodization-date-conflict">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800">{t('graphicPlan.conflicto_de_fechas')}</p>
                <p className="text-xs text-amber-700">{msg}</p>
              </div>
            </div>
          );
        })()}
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
                  <ChevronLeft className="w-3 h-3" /> {t('periodization.backToPlans')}
                </button>
                )}
                <h2 className="text-2xl font-black text-white tracking-tight" style={{ fontFamily: BC }}>{selectedPlan.name}</h2>
                <p className="text-slate-400 text-sm mt-1">{selectedPlan.totalWeeks} {t('periodization.weekShort')} &middot; {selectedPlan.modelName}</p>
                <div className="flex gap-5 mt-4">
                  {[
                    { v: selectedPlan.macrocycles?.length || 0, l: t('periodization.macrocyclesLabel'), c: '#007AFF' },
                    { v: totalMesos, l: t('periodization.mesocyclesLabel'), c: '#8B5CF6' },
                    { v: totalMicros, l: t('periodization.weeksLabel'), c: '#10B981' },
                  ].map((s, i) => (
                    <div key={i}>
                      <div className="text-xl font-black text-white leading-none" style={{ fontFamily: BC }}>{s.v}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: s.c }}>{s.l}</div>
                    </div>
                  ))}
                  {/* V2 Cascade Metrics */}
                  {v2Metricas.total_sesiones > 0 && (
                    <>
                      <div className="w-px h-8 bg-slate-700 mx-1" />
                      <div>
                        <div className="text-xl font-black text-white leading-none" style={{ fontFamily: BC }}>{v2Metricas.tonelaje_global_kg ? `${(v2Metricas.tonelaje_global_kg / 1000).toFixed(1)}t` : '0'}</div>
                        <div className="text-[10px] mt-0.5 text-orange-400">{t('periodization.tonnage')}</div>
                      </div>
                      <div>
                        <div className="text-xl font-black text-white leading-none" style={{ fontFamily: BC }}>{Math.round(v2Metricas.progreso_global || 0)}%</div>
                        <div className="text-[10px] mt-0.5 text-emerald-400">{t('periodization.progress')}</div>
                      </div>
                    </>
                  )}
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
                  <div key={idx} className="rounded-full transition-all" style={{ backgroundColor: resolvePhase(macro).color, flex: macro.weeks || 1 }} title={`${resolvePhase(macro).name}: ${macro.weeks}s`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* V2 Cascade Alerts Panel */}
        {v2Alertas.length > 0 && (
          <div className="rounded-xl border overflow-hidden" data-testid="v2-alerts-panel" style={{ borderColor: v2Alertas.some(a => a.severidad === 'error') ? '#FCA5A5' : '#FDE68A' }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: v2Alertas.some(a => a.severidad === 'error') ? '#FEF2F2' : '#FFFBEB' }}>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" style={{ color: v2Alertas.some(a => a.severidad === 'error') ? '#EF4444' : '#F59E0B' }} />
                <span className="text-[12px] font-bold" style={{ color: v2Alertas.some(a => a.severidad === 'error') ? '#991B1B' : '#92400E' }}>
                  {v2Alertas.length} alerta{v2Alertas.length !== 1 ? 's' : ''} del motor de cascada
                </span>
              </div>
              <span className="text-[10px] font-medium text-slate-400">{t('periodization.v2autocalc')}</span>
            </div>
            <div className="px-4 py-2 space-y-1 max-h-[120px] overflow-y-auto bg-white">
              {v2Alertas.slice(0, 8).map((alerta, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: alerta.severidad === 'error' ? '#EF4444' : '#F59E0B' }} />
                  <span className="text-slate-600">{alerta.mensaje}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 flex-shrink-0">{alerta.nivel}</span>
                </div>
              ))}
              {v2Alertas.length > 8 && (
                <div className="text-[10px] text-slate-400 font-medium pl-4">+{v2Alertas.length - 8} mas...</div>
              )}
            </div>
          </div>
        )}

        {/* View Mode Tabs - Floating Round Style */}
        <div className="flex items-start gap-4 pt-2" data-testid="view-mode-tabs">
          {[
            { id: 'dashboard', icon: Activity, label: 'Dashboard', color: '#0891B2' },
            { id: 'structure', icon: Layers, label: t('periodization.viewStructure'), color: '#007AFF' },
            { id: 'calendar', icon: CalendarDays, label: t('periodization.viewCalendar'), color: '#8B5CF6' },
            { id: 'chart', icon: BarChart3, label: t('periodization.viewChart'), color: '#10B981' }
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

        {viewMode === 'dashboard' && selectedPlan?.apiId && <DashboardGeneral planId={selectedPlan.apiId} />}
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
    const v2Progress = v2Metricas.progreso_global || 0;
    const progressPct = totalWeeks > 0 ? Math.round(v2Progress) : 0;

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
          <Plus className="w-3.5 h-3.5 mr-1.5" /> {t('periodization.addMacro')}
        </Button>
      </div>

      {/* ═══ MACROCYCLES ═══ */}
      {selectedPlan.macrocycles?.map((macro, macroIdx) => {
        const _phase = resolvePhase(macro);
        const phaseColor = _phase.color;
        const isExpanded = expandedMacro === macroIdx;
        const vol = macro.volume_percent || _phase.volumePercent || 0;
        const inten = macro.intensity_percent || _phase.intensityPercent || 0;
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
                    {resolvePhase(macro).abbr || 'MC'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-[15px]">{macro.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: phaseColor, backgroundColor: phaseColor + '15' }}>{resolvePhase(macro).name}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                      <span className="font-medium">{macro.weeks} {t('periodization.weekShort')}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{macro.mesocycles?.length || 0} {t('periodization.mesoShort')}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{totalSessions} {t('periodization.sessionsLong')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {loadBalance > 30 && (
                    <span className="text-[10px] px-2 py-1 bg-amber-50 text-amber-600 rounded-lg font-semibold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {t('periodization.imbalance')}
                    </span>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600" onClick={() => handleEditMacrocycle(macro, macroIdx)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => handleDeleteMacrocycle(macroIdx)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>

              {/* Metric pills */}
              {(() => {
                const v2m = getV2MacroMetrics(macroIdx);
                const macroACWR = v2m?.ACWR || 0;
                const macroCarga = v2m?.carga_total || 0;
                const macroProgreso = v2m?.progreso_porcentaje || 0;
                return (
              <div className="flex items-center gap-2.5 mt-3 ml-[60px] flex-wrap">
                <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-blue-400">Vol</span>
                  <div className="w-12"><MiniBar value={v2m?.vol_calculado || vol} color="#3B82F6" /></div>
                  <span className="text-[11px] font-bold text-blue-600">{v2m?.vol_calculado ? v2m.vol_calculado.toFixed(0) : vol}%</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-red-400">Int</span>
                  <div className="w-12"><MiniBar value={v2m?.int_calculado || inten} color="#EF4444" /></div>
                  <span className="text-[11px] font-bold text-red-600">{v2m?.int_calculado ? v2m.int_calculado.toFixed(0) : inten}%</span>
                </div>
                {macroACWR > 0 && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${macroACWR > 1.5 ? 'bg-red-50' : macroACWR < 0.8 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <span className="text-[10px]" style={{ color: macroACWR > 1.5 ? '#EF4444' : macroACWR < 0.8 ? '#F59E0B' : '#10B981' }}>ACWR</span>
                    <span className="text-[11px] font-bold" style={{ color: macroACWR > 1.5 ? '#EF4444' : macroACWR < 0.8 ? '#F59E0B' : '#10B981' }}>{macroACWR.toFixed(2)}</span>
                  </div>
                )}
                {macroCarga > 0 && (
                  <div className="flex items-center gap-1.5 bg-violet-50 px-2.5 py-1 rounded-lg">
                    <span className="text-[10px] text-violet-400">{t('periodization.load')}</span>
                    <span className="text-[11px] font-bold text-violet-600">{macroCarga.toFixed(0)} UA</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg">
                  <span className="text-[10px] text-slate-400">{t('periodization.progress')}</span>
                  <div className="w-10"><MiniBar value={macroProgreso} color="#10B981" /></div>
                  <span className="text-[11px] font-bold text-slate-600">{Math.round(macroProgreso)}%</span>
                </div>
              </div>
                );
              })()}
            </div>
          </div>

          {/* ── Expanded: Mesocycles ── */}
          {isExpanded && (
            <div className="border-t border-slate-100 bg-slate-50/60">
              <div className="flex justify-between items-center px-5 pt-3 pb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('periodization.mesocyclesTab')}</span>
                <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-md border-slate-300" onClick={() => handleAddMesocycle(macroIdx)}>
                  <Plus className="w-3 h-3 mr-1" /> {t('periodization.addMeso')}
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
                            <span className="text-[10px] text-slate-400">{mesoSessions} {t('periodization.sesShort')}</span>
                            <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded">
                              <span className="text-[9px] text-slate-400">{t('periodization.load')}</span>
                              <div className="w-8"><MiniBar value={mesoLoad * 100} color={mesoColor} h="h-1" /></div>
                              <span className="text-[10px] font-semibold" style={{ color: mesoColor }}>{Math.round(mesoLoad * 100)}%</span>
                            </div>
                            {/* V2 Cascade Metrics */}
                            {(() => {
                              const v2m = getV2MesoMetrics(macroIdx, mesoIdx);
                              if (!v2m || !v2m.carga_total) return null;
                              return (
                                <>
                                  {v2m.tonelaje_kg > 0 && <span className="text-[10px] text-orange-500 font-semibold">{(v2m.tonelaje_kg / 1000).toFixed(1)}t</span>}
                                  {v2m.ACWR > 0 && <span className={`text-[10px] font-bold ${v2m.ACWR > 1.5 ? 'text-red-500' : v2m.ACWR < 0.8 ? 'text-amber-500' : 'text-emerald-500'}`}>ACWR:{v2m.ACWR.toFixed(2)}</span>}
                                  {v2m.RPE_promedio > 0 && <span className="text-[10px] text-slate-500">RPE:{v2m.RPE_promedio.toFixed(1)}</span>}
                                </>
                              );
                            })()}
                          </div>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600" onClick={() => handleEditMesocycle(meso, macroIdx, mesoIdx)}><Edit2 className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => handleDeleteMesocycle(macroIdx, mesoIdx)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    </div>

                    {/* ── Microcycles ── */}
                    {mesoExpanded && (
                      <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-2">

                        {/* MEV → MAV → MRV chart REMOVED · ahora aparece dentro del Plan Gráfico por mesociclo */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('periodization.microcyclesTab')}</span>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-md border-slate-200 px-2" onClick={() => handleAddMicrocycle(macroIdx, mesoIdx)}>
                            <Plus className="w-2.5 h-2.5 mr-1" /> {t('periodization.week')}
                          </Button>
                        </div>

                        <div className="space-y-3">
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
                            const DAY_COLORS = {
                              'Lun':{ bg:'#06b6d4', light:'#ecfeff', text:'#0e7490', name:'Lunes' },
                              'Mar':{ bg:'#8b5cf6', light:'#f5f3ff', text:'#6d28d9', name:'Martes' },
                              'Mie':{ bg:'#10b981', light:'#ecfdf5', text:'#047857', name:'Miercoles' },
                              'Jue':{ bg:'#f59e0b', light:'#fffbeb', text:'#b45309', name:'Jueves' },
                              'Vie':{ bg:'#ef4444', light:'#fef2f2', text:'#b91c1c', name:'Viernes' },
                              'Sab':{ bg:'#3b82f6', light:'#eff6ff', text:'#1d4ed8', name:'Sabado' },
                              'Dom':{ bg:'#6b7280', light:'#f9fafb', text:'#374151', name:'Domingo' },
                              'Nueva':{ bg:'#94a3b8', light:'#f8fafc', text:'#475569', name:'Nueva' }
                            };
                            const microStartDate = micro.startDate || null;

                            return (
                            <div key={micro.id} className="rounded-2xl overflow-hidden bg-white transition-all" style={{border: highlightMicroKey === microKey ? '2px solid #3B82F6' : '1px solid rgba(0,0,0,0.06)', boxShadow: highlightMicroKey === microKey ? '0 0 0 4px rgba(59,130,246,0.18)' : '0 1px 4px rgba(0,0,0,0.03)'}} data-testid={`microcycle-${microKey}`}>
                              {/* ── Micro Header ── */}
                              <div
                                className="flex items-center justify-between px-4 py-3 cursor-pointer transition-all"
                                onClick={() => setExpandedMicro(microExpanded ? null : microKey)}
                                style={{background: microExpanded ? `linear-gradient(135deg, ${microColor}08 0%, transparent 100%)` : 'white'}}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`transition-transform duration-200 ${microExpanded ? 'rotate-90' : ''}`}>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  </div>
                                  <div className="w-1 h-7 rounded-full" style={{ backgroundColor: microColor }} />
                                  <div className="flex items-center gap-2.5">
                                    <span className="font-bold text-[13px] text-slate-800" style={{fontFamily:"'DM Sans',sans-serif"}}>{micro.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ color: microColor, backgroundColor: microColor + '12', border:`1px solid ${microColor}20` }}>{micro.type?.name || '-'}</span>
                                  </div>
                                  {/* Date picker inline */}
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <input
                                      type="date"
                                      value={microStartDate || ''}
                                      onChange={(e) => {
                                        const newMacros = [...(selectedPlan?.macrocycles || [])];
                                        if (newMacros[macroIdx]?.mesocycles?.[mesoIdx]?.microcycles?.[microIdx]) {
                                          newMacros[macroIdx].mesocycles[mesoIdx].microcycles[microIdx].startDate = e.target.value;
                                          setSelectedPlan(prev => ({...prev, macrocycles: newMacros}));
                                        }
                                      }}
                                      className="text-[10px] font-medium text-slate-500 border-0 bg-transparent p-0 w-[100px] focus:outline-none cursor-pointer"
                                      style={{fontFamily:"'DM Sans',sans-serif"}}
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                  <div className="hidden lg:flex items-center gap-3 text-[10px] mr-1" style={{fontFamily:"'DM Sans',sans-serif"}}>
                                    <span className="text-slate-500 font-medium">{sessions.length} {t('periodization.sesShort')}</span>
                                    <span className="text-slate-400">{totalDuration}min</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-slate-400">{t('periodization.load')}</span>
                                      <div className="w-12"><MiniBar value={microLoad} color={microColor} h="h-1.5" /></div>
                                      <span className="font-bold" style={{ color: microColor }}>{microLoad}%</span>
                                    </div>
                                    {totalLoad > 0 && <span className="text-slate-500 font-medium">UA:{totalLoad}</span>}
                                    <span className="text-slate-400">RPE:<span className="font-semibold text-slate-600">{avgRPE}</span></span>
                                    {/* V2 ACWR badge */}
                                    {(() => {
                                      const v2mic = getV2MicroMetrics(macroIdx, mesoIdx, microIdx);
                                      if (!v2mic || !v2mic.ACWR) return null;
                                      const acwr = v2mic.ACWR;
                                      const acwrColor = acwr > 1.5 ? '#EF4444' : acwr < 0.8 ? '#F59E0B' : '#10B981';
                                      return <span className="font-bold px-1.5 py-0.5 rounded" style={{ color: acwrColor, backgroundColor: acwrColor + '15' }}>ACWR:{acwr.toFixed(2)}</span>;
                                    })()}
                                    <span className="font-semibold" style={{color: completedSessions > 0 ? '#10b981' : '#94a3b8'}}>{completedSessions}/{sessions.length}</span>
                                  </div>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" onClick={() => handleEditMicrocycle(micro, macroIdx, mesoIdx, microIdx)} title={t('periodization.edit')}><Edit2 className="w-3.5 h-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={() => handleDeleteMicrocycle(macroIdx, mesoIdx, microIdx)} title={t('periodization.delete')}><Trash2 className="w-3.5 h-3.5" /></Button>
                                </div>
                              </div>

                              {/* ── Sessions Grid ── */}
                              {microExpanded && (
                                <div className="border-t px-4 pb-4 pt-3" style={{borderColor:'rgba(0,0,0,0.05)',background:'rgba(248,250,252,0.5)'}}>
                                  <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-3">
                                      <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500" style={{fontFamily:"'DM Sans',sans-serif"}}>{t('periodization.sessions')}</span>
                                      <div className="flex items-center gap-2 text-[9px]">
                                        {SESSION_TYPES.slice(0, 5).map(st => (
                                          <span key={st.id} className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />{st.name}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-lg px-2.5 border-slate-200 font-medium" style={{fontFamily:"'DM Sans',sans-serif"}} onClick={() => handleAddSession(macroIdx, mesoIdx, microIdx)}>
                                      <Plus className="w-3 h-3 mr-1" /> Sesion
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
                                    {sessions.map((session, sIdx) => {
                                      const sType = SESSION_TYPES.find(t => t.id === session.type);
                                      const sColor = sType?.color || '#94a3b8';
                                      const rpe = session.rpe || 6;
                                      const rpeColor = rpe >= 8 ? '#EF4444' : rpe >= 6 ? '#F59E0B' : '#10B981';
                                      const dayInfo = DAY_COLORS[session.dayName] || DAY_COLORS['Nueva'];
                                      const dayColor = dayInfo.bg;
                                      const intensityVal = viNum(session.intensity) ?? 50;
                                      const volVal = viNum(session.volume) ?? 54;
                                      const densVal = (() => {
                                        // Density = series/min from real session data
                                        const sd = session.sessionData || session.detailed_data;
                                        if (sd?.fases) {
                                          let totalSeries = 0, totalRecupSec = 0, actCount = 0;
                                          Object.values(sd.fases).forEach(fase => {
                                            (fase.actividades || []).forEach(act => {
                                              totalSeries += parseInt(act.series) || 0;
                                              const recMin = parseFloat(act.recuperacion) || 2;
                                              const reps = parseInt(act.repeticiones) || 10;
                                              totalRecupSec += (parseInt(act.series) || 0) * (reps * 3 + recMin * 60);
                                              actCount++;
                                            });
                                          });
                                          if (totalRecupSec > 0) return +(totalSeries / (totalRecupSec / 60)).toFixed(2);
                                        }
                                        // Fallback: series/duration
                                        const dur = session.duration || 60;
                                        return dur > 0 ? +(20 / dur).toFixed(2) : 0;
                                      })();

                                      // Calculate actual date if micro has startDate
                                      const dayOffsets = {'Lun':0,'Mar':1,'Mie':2,'Jue':3,'Vie':4,'Sab':5,'Dom':6};
                                      let sessionDateStr = '';
                                      if (microStartDate) {
                                        const base = new Date(microStartDate + 'T12:00:00');
                                        const offset = dayOffsets[session.dayName] ?? sIdx;
                                        base.setDate(base.getDate() + offset);
                                        sessionDateStr = base.toLocaleDateString('es-ES', {day:'numeric', month:'short'});
                                      }

                                      return (
                                        <div
                                          key={session.id}
                                          className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5"
                                          style={{
                                            background: `linear-gradient(160deg, #ffffff 55%, ${dayColor}10 100%)`,
                                            boxShadow: `0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px ${dayColor}26`,
                                          }}
                                          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 8px 20px -6px ${dayColor}55, 0 0 0 1.5px ${dayColor}66`; }}
                                          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 1px 3px rgba(0,0,0,0.06), 0 0 0 1px ${dayColor}26`; }}
                                          onClick={() => handleEditSession(session, macroIdx, mesoIdx, microIdx, sIdx)}
                                          data-testid={`session-${sIdx}`}
                                        >
                                          {/* Top accent strip */}
                                          <div
                                            className="h-1.5"
                                            style={{ background: `linear-gradient(90deg, ${dayColor} 0%, ${dayColor}cc 55%, ${sColor}99 100%)` }}
                                          />

                                          {/* Action buttons on hover (Editar + Eliminar) */}
                                          <div
                                            className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <button
                                              className="p-0.5 rounded-full bg-white shadow-md hover:bg-blue-50 transition-colors"
                                              onClick={() => handleEditSessionVI(session, macroIdx, mesoIdx, microIdx, sIdx)}
                                              title={t('periodization.editVolInt')}
                                              data-testid={`session-${sIdx}-edit-btn`}
                                            >
                                              <Edit2 className="w-2.5 h-2.5 text-blue-500" />
                                            </button>
                                            <button
                                              className="p-0.5 rounded-full bg-white shadow-md hover:bg-red-50 transition-colors"
                                              onClick={() => handleDeleteSession(macroIdx, mesoIdx, microIdx, sIdx)}
                                              title={t('periodization.delete')}
                                              data-testid={`session-${sIdx}-delete-btn`}
                                            >
                                              <Trash2 className="w-2.5 h-2.5 text-red-400" />
                                            </button>
                                          </div>

                                          <div className="p-2">
                                            {/* Row 1: Day pill + status — compact */}
                                            <div className="flex items-center justify-between gap-1 mb-1.5">
                                              <div className="flex items-center gap-1.5 min-w-0">
                                                <div
                                                  className="flex items-center justify-center w-7 h-7 rounded-lg text-white font-black text-[10px] shadow-sm shrink-0"
                                                  style={{ background: dayColor, fontFamily: "'DM Sans',sans-serif" }}
                                                >
                                                  {(session.dayName || 'N').slice(0, 3)}
                                                </div>
                                                <div className="min-w-0">
                                                  <div className="text-[10px] font-bold text-slate-800 leading-tight truncate" style={{ fontFamily: "'DM Sans',sans-serif" }}>
                                                    {sessionDateStr || dayInfo.name}
                                                  </div>
                                                  <span
                                                    className="inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider leading-none mt-0.5 truncate max-w-full"
                                                    style={{ background: `${sColor}1f`, color: sColor }}
                                                  >
                                                    <span className="w-1 h-1 rounded-full" style={{ background: sColor }} />
                                                    {sType?.name || 'General'}
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="shrink-0 scale-75 origin-right">
                                                <StatusBadge status={session.status || 'planned'} />
                                              </div>
                                            </div>

                                            {/* Metrics — compact 2x2 grid */}
                                            <div className="grid grid-cols-2 gap-1 mb-1.5">
                                              {[
                                                { l: 'DUR', v: `${session.duration || 0}m`, c: dayColor },
                                                { l: 'VOL', v: `${volVal}%`, c: '#84cc16' },
                                                { l: 'INT', v: `${intensityVal}%`, c: '#f59e0b' },
                                                { l: 'RPE', v: `${rpe}`, c: rpeColor },
                                              ].map((chip, ci) => (
                                                <div
                                                  key={ci}
                                                  className="text-center py-0.5 px-0.5 rounded-md"
                                                  style={{ background: `${chip.c}10`, border: `1px solid ${chip.c}20` }}
                                                >
                                                  <div className="text-[7px] font-black uppercase tracking-wider leading-none" style={{ color: `${chip.c}aa` }}>
                                                    {chip.l}
                                                  </div>
                                                  <div className="text-[10px] font-black leading-none mt-0.5" style={{ color: chip.c, fontFamily: "'DM Sans',sans-serif" }}>
                                                    {chip.v}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>

                                            {/* Visual stacked load bar — compact */}
                                            <div className="flex h-1 rounded-full overflow-hidden mb-1.5" style={{ background: '#f1f5f9' }}>
                                              <div style={{ width: `${intensityVal * 0.5}%`, background: dayColor }} />
                                              <div style={{ width: `${volVal * 0.3}%`, background: '#f59e0b' }} />
                                              <div style={{ width: `${rpe * 3}%`, background: rpeColor }} />
                                              <div style={{ width: `${Math.min(densVal * 20, 15)}%`, background: '#8b5cf6' }} />
                                            </div>

                                            {/* Bottom row: tiny indicators */}
                                            <div className="flex items-center justify-between gap-1">
                                              <div className="scale-75 origin-left">
                                                <IntensityBadge level={viLevel(intensityVal)} size="xs" />
                                              </div>
                                              <div className="flex items-center gap-0.5 shrink-0">
                                                {densVal > 0 && (
                                                  <span className="text-[8px] font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.10)', color: '#7c3aed' }}>
                                                    {densVal}
                                                  </span>
                                                )}
                                                {session.fatigue > 0 && (
                                                  <span
                                                    className="text-[8px] font-bold px-1 py-0.5 rounded"
                                                    style={{
                                                      background: session.fatigue >= 7 ? '#fef2f2' : session.fatigue >= 5 ? '#fffbeb' : '#ecfdf5',
                                                      color: session.fatigue >= 7 ? '#dc2626' : session.fatigue >= 5 ? '#d97706' : '#059669',
                                                    }}
                                                  >
                                                    F{session.fatigue}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
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
          <h3 className="text-sm font-semibold text-slate-800">{t('periodization.calendarView')}</h3>
          <span className="text-[11px] text-slate-400 ml-2">{weeklyData.length} semanas</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sticky left-0 bg-slate-50 z-10 min-w-[140px]">{t('periodization.week')}</th>
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
  const renderChartView = () => {
    const macros = selectedPlan?.macrocycles || [];
    const chartData = [];
    let weekNum = 1;

    macros.forEach(macro => {
      const phase = resolvePhase(macro);
      const baseVol = phase.volumePercent || 70;
      const baseInt = phase.intensityPercent || 60;
      const baseDen = Math.round((baseVol + baseInt) / 3);
      const weeks = macro.weeks || 4;

      const hasMicros = macro.mesocycles?.some(m => m.microcycles?.length > 0);
      if (hasMicros) {
        macro.mesocycles.forEach(meso => {
          const mesoLoad = meso.type?.loadFactor || 1;
          (meso.microcycles || []).forEach(micro => {
            const sessions = micro.sessions || [];
            let realVol = 0, realInt = 0, actCount = 0, totalSeries = 0, totalTimeSec = 0;
            sessions.forEach(ses => {
              const sd = ses.sessionData || ses.detailed_data;
              if (sd?.fases) {
                Object.values(sd.fases).forEach(fase => {
                  (fase.actividades || []).forEach(act => {
                    realVol += parseFloat(act.volumen) || 0;
                    realInt += parseFloat(act.intensidad) || 0;
                    const s = parseInt(act.series) || 0;
                    totalSeries += s;
                    const r = parseInt(act.repeticiones) || 10;
                    const rec = parseFloat(act.recuperacion) || 2;
                    totalTimeSec += s * (r * 3 + rec * 60);
                    actCount++;
                  });
                });
              }
            });
            const vol = actCount > 0 ? Math.min(Math.round(realVol / actCount), 100) : Math.round(baseVol * mesoLoad * (0.9 + Math.random() * 0.2));
            const int = actCount > 0 ? Math.min(Math.round(realInt / actCount), 100) : Math.round(baseInt * (0.9 + Math.random() * 0.15));
            // Density: series/min normalized to 0-100 scale (0.5 ser/min = 100)
            const denRaw = totalTimeSec > 0 ? totalSeries / (totalTimeSec / 60) : 0;
            const den = denRaw > 0 ? Math.min(Math.round(denRaw * 200), 100) : Math.round((vol * 0.3 + int * 0.3 + baseDen * 0.4));
            const carga = Math.round(vol * int / 100);
            chartData.push({ semana: `S${weekNum}`, volumen: Math.min(vol, 100), intensidad: Math.min(int, 100), densidad: Math.min(den, 100), carga, fase: phase.name, color: phase.color });
            weekNum++;
          });
        });
      } else {
        for (let w = 0; w < weeks; w++) {
          const progress = w / Math.max(weeks - 1, 1);
          const wave = Math.sin(w * 0.8) * 8;
          const deload = (w + 1) % 4 === 0;
          const vol = deload ? Math.round(baseVol * 0.55) : Math.round(baseVol + wave - progress * 10);
          const int = deload ? Math.round(baseInt * 0.6) : Math.round(baseInt + progress * 12 + wave * 0.3);
          // Synthetic density: higher vol & lower rest = higher density
          const den = deload ? Math.round(baseDen * 0.5) : Math.round(baseDen + (vol - baseVol) * 0.3 + wave * 0.5);
          const carga = Math.round(vol * int / 100);
          chartData.push({ semana: `S${weekNum}`, volumen: Math.min(Math.max(vol, 15), 100), intensidad: Math.min(Math.max(int, 15), 100), densidad: Math.min(Math.max(den, 10), 100), carga: Math.min(carga, 100), fase: phase.name, color: phase.color });
          weekNum++;
        }
      }
    });

    if (chartData.length === 0) {
      for (let i = 1; i <= 12; i++) {
        chartData.push({ semana: `S${i}`, volumen: 60 + Math.sin(i) * 15, intensidad: 50 + i * 2, densidad: 40 + Math.sin(i * 0.5) * 10, carga: 30 + i, fase: 'Demo', color: '#3B82F6' });
      }
    }

    // Reference lines for phase boundaries
    const refLines = [];
    let cumWeeks = 0;
    macros.forEach((macro, i) => {
      const rp = resolvePhase(macro);
      const w = chartData.filter(d => d.fase === rp.name).length || macro.weeks || 0;
      if (i > 0 && cumWeeks > 0) {
        refLines.push({ y: null, x: `S${cumWeeks}`, color: '#cbd5e1', label: rp.abbr || '', dashed: true });
      }
      cumWeeks += w;
    });

    // Stats
    const totalWeeks = chartData.length;
    const avgVol = totalWeeks ? Math.round(chartData.reduce((s,d) => s + d.volumen, 0) / totalWeeks) : 0;
    const avgInt = totalWeeks ? Math.round(chartData.reduce((s,d) => s + d.intensidad, 0) / totalWeeks) : 0;
    const avgDen = totalWeeks ? Math.round(chartData.reduce((s,d) => s + d.densidad, 0) / totalWeeks) : 0;
    const avgCarga = totalWeeks ? Math.round(chartData.reduce((s,d) => s + d.carga, 0) / totalWeeks) : 0;

    return (
      <div className="space-y-4">
        {/* Main Chart — using InteractiveChart component */}
        <InteractiveChart
          title={t('periodization.planPeriodization')}
          icon={TrendingUp}
          data={chartData}
          dataKeys={[
            { key: 'volumen', name: 'Volumen %', color: '#3B82F6' },
            { key: 'intensidad', name: 'Intensidad %', color: '#EF4444' },
            { key: 'densidad', name: 'Densidad %', color: '#10B981' },
            { key: 'carga', name: 'Carga Total', color: '#F59E0B' }
          ]}
          xAxisKey="semana"
          height={340}
          showBrush={true}
          showControls={true}
          defaultChartType="line"
          defaultTimeRange="sessions"
          yAxisDomain={[0, 100]}
          referenceLines={refLines}
        />

        {/* Phase Distribution — Enhanced */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="phase-distribution">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100">
            <h3 className="text-[14px] font-bold text-slate-800" style={{fontFamily:"'DM Sans',sans-serif"}}>{t('periodization.phaseDistribMacro')}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{t('periodization.phaseProportion')}</p>
          </div>

          {/* Timeline bar */}
          <div className="px-5 py-4">
            <div className="flex h-12 rounded-xl overflow-hidden gap-[2px] mb-1">
              {macros.map((macro, idx) => {
                const phase = resolvePhase(macro);
                const w = chartData.filter(d => d.fase === phase.name).length || macro.weeks || 1;
                const pct = totalWeeks > 0 ? Math.round((w / totalWeeks) * 100) : 0;
                return (
                  <div key={idx} className="relative flex items-center justify-center text-white rounded-lg cursor-pointer transition-all hover:brightness-110 hover:scale-y-105 overflow-hidden"
                    style={{ backgroundColor: phase.color, flex: w }}>
                    <div className="absolute inset-0" style={{background:'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)'}} />
                    <div className="relative text-center z-10">
                      <div className="text-[11px] font-black tracking-wide" style={{fontFamily:"'Barlow Condensed',sans-serif", textShadow:'0 1px 2px rgba(0,0,0,0.2)'}}>{phase.abbr || phase.name}</div>
                      <div className="text-[9px] font-medium opacity-80">{w}s · {pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Week markers */}
            <div className="flex">
              {macros.map((macro, idx) => {
                const phase = resolvePhase(macro);
                const w = chartData.filter(d => d.fase === phase.name).length || macro.weeks || 1;
                return <div key={idx} className="text-center text-[8px] text-slate-400" style={{flex: w}}>{w} semanas</div>;
              })}
            </div>
          </div>

          {/* Phase detail cards */}
          <div className="px-5 pb-5">
            <div className="grid gap-3" style={{gridTemplateColumns: `repeat(${Math.min(macros.length, 4)}, 1fr)`}}>
              {macros.map((macro, idx) => {
                const phase = resolvePhase(macro);
                const w = chartData.filter(d => d.fase === phase.name).length || macro.weeks || 1;
                const phaseData = chartData.filter(d => d.fase === phase.name);
                const phaseAvgVol = phaseData.length ? Math.round(phaseData.reduce((s,d)=>s+d.volumen,0)/phaseData.length) : (phase.volumePercent || 0);
                const phaseAvgInt = phaseData.length ? Math.round(phaseData.reduce((s,d)=>s+d.intensidad,0)/phaseData.length) : (phase.intensityPercent || 0);
                const phaseAvgDen = phaseData.length ? Math.round(phaseData.reduce((s,d)=>s+d.densidad,0)/phaseData.length) : 0;
                const phaseAvgCarga = phaseData.length ? Math.round(phaseData.reduce((s,d)=>s+d.carga,0)/phaseData.length) : 0;

                return (
                  <div key={idx} className="rounded-xl overflow-hidden" style={{border:`1px solid ${phase.color}20`}}>
                    {/* Card header */}
                    <div className="px-3.5 py-2.5 flex items-center gap-2.5" style={{background: `linear-gradient(135deg, ${phase.color}10 0%, ${phase.color}05 100%)`}}>
                      <div className="w-3 h-8 rounded-full" style={{background: phase.color}} />
                      <div>
                        <div className="text-[12px] font-bold" style={{color: phase.color, fontFamily:"'DM Sans',sans-serif"}}>{phase.name}</div>
                        <div className="text-[10px] text-slate-400">{w} semanas · {totalWeeks > 0 ? Math.round((w/totalWeeks)*100) : 0}% del plan</div>
                      </div>
                    </div>
                    {/* Metrics */}
                    <div className="px-3.5 py-3 space-y-2">
                      {[
                        { label:'Volumen', val: phaseAvgVol, color:'#3B82F6' },
                        { label:'Intensidad', val: phaseAvgInt, color:'#EF4444' },
                        { label:'Densidad', val: phaseAvgDen, color:'#10B981' }
                      ].map((m, mi) => (
                        <div key={mi}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] font-semibold text-slate-500">{m.label}</span>
                            <span className="text-[11px] font-black" style={{color: m.color}}>{m.val}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{width:`${m.val}%`, background: m.color}} />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 mt-1" style={{borderTop:`1px solid ${phase.color}10`}}>
                        <span className="text-[9px] font-semibold text-slate-400">{t('periodization.avgLoad')}</span>
                        <span className="text-[13px] font-black" style={{color: phase.color}}>{phaseAvgCarga}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Metrics Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Vol. Promedio', val: `${avgVol}%`, color: '#3B82F6', sub: `${totalWeeks} semanas` },
            { label: 'Int. Promedio', val: `${avgInt}%`, color: '#EF4444', sub: `Max: ${Math.max(...chartData.map(d=>d.intensidad))}%` },
            { label: 'Den. Promedio', val: `${avgDen}%`, color: '#10B981', sub: `Min: ${Math.min(...chartData.map(d=>d.densidad))}%` },
            { label: 'Carga Promedio', val: `${avgCarga}`, color: '#F59E0B', sub: `Total: ${chartData.reduce((s,d) => s + d.carga, 0)}` }
          ].map((card, ci) => (
            <div key={ci} className="bg-white rounded-xl border border-slate-200 p-4" style={{borderTop:`3px solid ${card.color}`}}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{color: card.color}}>{card.label}</div>
              <div className="text-[22px] font-black text-slate-800" style={{fontFamily:"'DM Sans',sans-serif"}}>{card.val}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{card.sub}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============ RENDER: EDIT MODALS ============
  const renderEditModals = () => (
    <>
      {/* Macrocycle Modal */}
      <Dialog open={editModal.type === 'macrocycle'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200">
          <DialogHeader><DialogTitle className="text-slate-900">{editModal.indices?.isNew ? t('periodization.newMacro') : t('periodization.editMacro')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.name')}</label>
              <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1 bg-white text-slate-900" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.phase')}</label>
              <Select value={editModal.data?.phase?.id || ''} onValueChange={(v) => setEditModal({ ...editModal, data: { ...editModal.data, phase: MACROCYCLE_PHASES.find(p => p.id === v) } })}>
                <SelectTrigger className="mt-1 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent>{MACROCYCLE_PHASES.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.weeks')}</label>
              <Input type="number" value={editModal.data?.weeks || 4} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, weeks: parseInt(e.target.value) } })} className="mt-1 bg-white text-slate-900" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.volumePct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.volume_percent ?? editModal.data?.phase?.volumePercent ?? 80} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, volume_percent: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="macro-volume-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.intensityPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.intensity_percent ?? editModal.data?.phase?.intensityPercent ?? 60} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, intensity_percent: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="macro-intensity-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.progressPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.progress ?? 0} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, progress: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="macro-progress-input" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-[12px] text-slate-500 mr-auto">{t('periodization.totalVolAccum')} <strong className="text-slate-800">{editModal.data?.volume_total ?? '—'}</strong></span>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setEditModal({ type: null, data: null, indices: null })}>{t('periodization.cancel')}</Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveMacrocycle} data-testid="save-macrocycle-btn">{t('periodization.save')}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mesocycle Modal */}
      <Dialog open={editModal.type === 'mesocycle'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200">
          <DialogHeader><DialogTitle className="text-slate-900">{editModal.indices?.isNew ? t('periodization.newMeso') : t('periodization.editMeso')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.name')}</label>
              <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1 bg-white text-slate-900" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.type')}</label>
              <Select value={editModal.data?.type?.id || ''} onValueChange={(v) => setEditModal({ ...editModal, data: { ...editModal.data, type: MESOCYCLE_TYPES.find(t => t.id === v) } })}>
                <SelectTrigger className="mt-1 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent>{MESOCYCLE_TYPES.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {editModal.indices?.isNew && (
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.weeks')}</label>
                <Input type="number" value={editModal.data?.weeks || 4} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, weeks: parseInt(e.target.value) } })} className="mt-1 bg-white text-slate-900" />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.volumePct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.volume_percent ?? editModal.data?.volume ?? 80} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, volume_percent: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="meso-volume-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.intensityPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.intensity_percent ?? editModal.data?.intensity ?? 70} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, intensity_percent: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="meso-intensity-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.progressPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.progress ?? 0} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, progress: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="meso-progress-input" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-[12px] text-slate-500 mr-auto">{t('periodization.totalVolAccum')} <strong className="text-slate-800">{editModal.data?.volume_total ?? '—'}</strong></span>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setEditModal({ type: null, data: null, indices: null })}>{t('periodization.cancel')}</Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveMesocycle} data-testid="save-mesocycle-btn">{t('periodization.save')}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Microcycle Modal */}
      <Dialog open={editModal.type === 'microcycle'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200">
          <DialogHeader><DialogTitle className="text-slate-900">{editModal.indices?.isNew ? t('periodization.newMicro') : t('periodization.editMicro')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.name')}</label>
              <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1 bg-white text-slate-900" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.type')}</label>
              <Select value={editModal.data?.type?.id || ''} onValueChange={(v) => setEditModal({ ...editModal, data: { ...editModal.data, type: MICROCYCLE_TYPES_ARRAY.find(t => t.id === v) } })}>
                <SelectTrigger className="mt-1 bg-white text-slate-900"><SelectValue /></SelectTrigger>
                <SelectContent>{MICROCYCLE_TYPES_ARRAY.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.loadPercent}%)</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.volumePct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.volume ?? 100} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, volume: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="micro-volume-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.intensityPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.intensity ?? 70} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, intensity: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="micro-intensity-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.progressPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.progress ?? 0} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, progress: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="micro-progress-input" />
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-[12px] text-slate-500 mr-auto">{t('periodization.totalVolAccum')} <strong className="text-slate-800">{editModal.data?.volume_total ?? '—'}</strong></span>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setEditModal({ type: null, data: null, indices: null })}>{t('periodization.cancel')}</Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveMicrocycle} data-testid="save-microcycle-btn">{t('periodization.save')}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Quick-Edit Modal (Volumen / Intensidad) */}
      <Dialog open={editModal.type === 'session'} onOpenChange={() => setEditModal({ type: null, data: null, indices: null })}>
        <DialogContent className="max-w-lg bg-white text-slate-900 border border-slate-200">
          <DialogHeader><DialogTitle className="text-slate-900">{t('periodization.editSession')}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.name')}</label>
                <Input value={editModal.data?.name || ''} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, name: e.target.value } })} className="mt-1 bg-white text-slate-900" placeholder={t('periodization.phSession')} data-testid="session-name-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.durationMin')}</label>
                <Input type="number" min="0" value={editModal.data?.duration ?? 60} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, duration: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="session-duration-input" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.volumePct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.volume ?? 100} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, volume: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="session-volume-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.intensityPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.intensity ?? 70} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, intensity: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="session-intensity-input" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">{t('periodization.progressPct')}</label>
                <Input type="number" min="0" max="100" value={editModal.data?.progress ?? 0} onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, progress: parseInt(e.target.value) || 0 } })} className="mt-1 bg-white text-slate-900" data-testid="session-progress-input" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">{t('periodization.intensityLevel')}</label>
              <div className="flex gap-2 mt-1">
                {[{ id: 'low', label: 'Baja', val: 40, color: '#10B981' }, { id: 'medium', label: 'Media', val: 65, color: '#F59E0B' }, { id: 'high', label: 'Alta', val: 85, color: '#EF4444' }].map(lvl => {
                  const active = viLevel(editModal.data?.intensity ?? 70) === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setEditModal({ ...editModal, data: { ...editModal.data, intensity: lvl.val } })}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border"
                      style={active ? { background: lvl.color, color: '#fff', borderColor: lvl.color } : { background: `${lvl.color}12`, color: lvl.color, borderColor: `${lvl.color}33` }}
                      data-testid={`session-level-${lvl.id}`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <span className="text-[12px] text-slate-500 mr-auto">{t('periodization.cascadeRecalc')}</span>
            <div className="flex gap-2">
              <Button variant="outline" className="border-slate-300 text-slate-700" onClick={() => setEditModal({ type: null, data: null, indices: null })}>{t('periodization.cancel')}</Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white" onClick={handleSaveSessionVI} data-testid="save-session-btn">{t('periodization.save')}</Button>
            </div>
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
              <h4 className="font-bold text-slate-700">{t('periodization.calc1rm')}</h4>
              <p className="text-sm text-slate-500">{t('periodization.formulas1rm')}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.weightLifted')}</label>
                  <Input type="number" id="calc-weight" placeholder="80" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.reps')}</label>
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
              <h4 className="font-bold text-slate-700">{t('periodization.hrZones')}</h4>
              <p className="text-sm text-slate-500">{t('periodization.karvonen')}</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.age')}</label>
                  <Input type="number" id="calc-age" placeholder="30" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.restingHr')}</label>
                  <Input type="number" id="calc-resting" placeholder="60" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.maxHrOptional')}</label>
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
              <h4 className="font-bold text-slate-700">{t('periodization.vo2calc')}</h4>
              <div>
                <label className="text-sm font-medium text-slate-600">{t('periodization.testType')}</label>
                <Select onValueChange={(v) => document.getElementById('calc-test-type').value = v}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder={t('periodization.phSelectTest')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cooper">{t('periodization.cooperTest')}</SelectItem>
                    <SelectItem value="rockport">Rockport Walk Test</SelectItem>
                    <SelectItem value="1mile">{t('periodization.test15miles')}</SelectItem>
                  </SelectContent>
                </Select>
                <input type="hidden" id="calc-test-type" defaultValue="cooper" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">{t('periodization.distanceTime')}</label>
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
              <h4 className="font-bold text-slate-700">{t('periodization.volumeDistrib')}</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.totalVolume')}</label>
                  <Input type="number" id="calc-volume" placeholder="1000" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.weeks')}</label>
                  <Input type="number" id="calc-weeks" placeholder="12" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">{t('periodization.progression')}</label>
                  <Select onValueChange={(v) => document.getElementById('calc-progression').value = v}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={t('periodization.phType')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">{t('periodization.modelLinear')}</SelectItem>
                      <SelectItem value="undulating">{t('periodization.modelUndulating')}</SelectItem>
                      <SelectItem value="step">{t('periodization.stepScale')}</SelectItem>
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
              <h4 className="font-bold text-slate-700">{t('periodization.intensityScales')}</h4>
              <p className="text-sm text-slate-500">{t('periodization.viewIntensityScales')}</p>
              <Button onClick={() => runCalculation('intensity_scale', {})} className="bg-blue-600 hover:bg-blue-700 text-white">
                Ver Escalas
              </Button>
            </div>
          )}
          
          {/* Results */}
          {calculatorResult && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">{t('periodization.results')}</h4>
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
                    <h5 className="font-semibold text-slate-700 mb-2">{t('periodization.trainingZones')}</h5>
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
                    <h5 className="font-semibold text-slate-700 mb-2">{t('periodization.microcycleTypes')}</h5>
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
          <Button variant="outline" onClick={() => setCalculatorOpen(false)}>{t('periodization.close')}</Button>
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
