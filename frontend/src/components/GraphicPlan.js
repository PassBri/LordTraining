import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Dialog, DialogContent } from '../components/ui/dialog';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine, ReferenceArea
} from 'recharts';
import {
  Save,
  Loader2,
  Download,
  Link2,
  Send,
  Calendar,
  Target,
  Activity,
  Heart,
  Brain,
  Dumbbell,
  Trophy,
  ClipboardCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  FileInput,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  Image,
  Timer,
  Gauge,
  Share2,
  MessageCircle,
  Plus,
  X,
  Users
} from 'lucide-react';import { toast } from 'sonner';
import axios from 'axios';
import html2canvas from 'html2canvas';
import usePlanStore from '../stores/planStore';
import InteractiveChart from './InteractiveChart';
import MesoMevMavMrvChart from './charts/MesoMevMavMrvChart';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// Cycle duration options
const CYCLE_DURATIONS = {
  olympic: { label: 'Ciclo Olímpico (4 años)', weeks: 208, months: 48 },
  annual: { label: 'Anual (52 semanas)', weeks: 52, months: 12 },
  semester: { label: 'Semestral (6 meses)', weeks: 26, months: 6 },
  quarter: { label: 'Trimestral (3 meses)', weeks: 12, months: 3 }
};

// ── Feature A: unidades de medida del Volumen por fila/capacidad ──
// Set completo de unidades disponibles para todas las filas.
const VOLUME_UNITS = [
  { id: 'pct', label: '%', suffix: '%' },
  { id: 'km', label: 'Kilómetros (km)', suffix: 'km' },
  { id: 'm', label: 'Metros (m)', suffix: 'm' },
  { id: 'min', label: 'Minutos (min)', suffix: 'min' },
  { id: 'h', label: 'Horas (h)', suffix: 'h' },
  { id: 'ton', label: 'Tonelaje (kg)', suffix: 'kg' },
  { id: 'reps', label: 'Series·Reps', suffix: 'reps' },
];
const UNIT_SUFFIX = VOLUME_UNITS.reduce((acc, u) => { acc[u.id] = u.suffix; return acc; }, {});
// Unidad sugerida por defecto según la capacidad (el set completo sigue disponible).
const CAPACITY_DEFAULT_UNIT = {
  volumen: 'pct',
  endurance: 'km',
  strength: 'ton',
  speed: 'm',
  coordination: 'pct',
  flexibility: 'pct',
};


// Intensity levels
const INTENSITY_LEVELS = [
  { id: 'very_high', label: 'Muy alta', range: '98%-100%', color: 'bg-red-600', volumeLabel: 'Máximo' },
  { id: 'high', label: 'Alta', range: '85%-95%', color: 'bg-orange-500', volumeLabel: 'Sub-máximo' },
  { id: 'medium', label: 'Media', range: '70%-80%', color: 'bg-yellow-500', volumeLabel: 'Medio' },
  { id: 'low', label: 'Baja', range: '55%-65%', color: 'bg-green-500', volumeLabel: 'Sub-medio' },
  { id: 'recovery', label: 'Recuperación', range: 'Hasta 50%', color: 'bg-blue-400', volumeLabel: 'Bajo' }
];

// Preparation types
const PREPARATION_TYPES = [
  { id: 'general_physical', label: 'Preparación física general', color: 'bg-blue-200' },
  { id: 'specific_physical', label: 'Preparación física específica', color: 'bg-blue-300' },
  { id: 'technical', label: 'Preparación técnica', color: 'bg-green-200' },
  { id: 'tactical', label: 'Preparación táctica', color: 'bg-yellow-200' },
  { id: 'psychological', label: 'Preparación psicológica', color: 'bg-purple-200' },
  { id: 'theoretical', label: 'Preparación teórica', color: 'bg-pink-200' }
];

// Physical preparation components
const PHYSICAL_COMPONENTS = [
  { id: 'endurance', label: 'Resistencia', color: 'bg-red-100' },
  { id: 'strength', label: 'Fuerza', color: 'bg-orange-100' },
  { id: 'speed', label: 'Velocidad', color: 'bg-yellow-100' },
  { id: 'coordination', label: 'Capacidades coordinativas', color: 'bg-green-100' },
  { id: 'flexibility', label: 'Flexibilidad', color: 'bg-blue-100' }
];

// Activity types
const ACTIVITY_TYPES = [
  { id: 'training', label: 'Entrenamiento', color: 'bg-blue-200' },
  { id: 'doping_test', label: 'Control de dopaje', color: 'bg-red-200' },
  { id: 'main_competition', label: 'Competencia principal', color: 'bg-green-400' },
  { id: 'secondary_competition', label: 'Competencia secundaria', color: 'bg-green-200' },
  { id: 'recovery', label: 'Recuperación', color: 'bg-purple-200' }
];

// Monitoring areas
const MONITORING_AREAS = [
  { id: 'medical', label: 'Control médico', color: 'bg-red-100' },
  { id: 'anthropometric', label: 'Antropometría', color: 'bg-cyan-100' },
  { id: 'physical', label: 'Control físico', color: 'bg-orange-100' },
  { id: 'biomechanical', label: 'Biomecánica', color: 'bg-emerald-100' },
  { id: 'technical', label: 'Control técnico', color: 'bg-yellow-100' },
  { id: 'tactical', label: 'Control táctico', color: 'bg-green-100' },
  { id: 'psychological', label: 'Control psicológico', color: 'bg-blue-100' },
  { id: 'theoretical', label: 'Control teórico', color: 'bg-purple-100' }
];

// Macrocycle types
const MACROCYCLE_TYPES = [
  { id: 'preparatory_general', label: 'Preparatorio General', color: 'bg-blue-300' },
  { id: 'preparatory_specific', label: 'Preparatorio Específico', color: 'bg-blue-400' },
  { id: 'precompetitive', label: 'Precompetitivo', color: 'bg-yellow-300' },
  { id: 'competitive', label: 'Competitivo', color: 'bg-green-400' },
  { id: 'transition', label: 'Transición', color: 'bg-orange-300' }
];

// Mesocycle types
const MESOCYCLE_TYPES = [
  { id: 'entrante', label: 'Entrante', color: 'bg-slate-200' },
  { id: 'basico_desarrollador', label: 'Básico desarrollador', color: 'bg-blue-200' },
  { id: 'basico_estabilizador', label: 'Básico estabilizador', color: 'bg-cyan-200' },
  { id: 'precompetitivo', label: 'Precompetitivo', color: 'bg-yellow-200' },
  { id: 'competitivo', label: 'Competitivo', color: 'bg-green-200' },
  { id: 'recuperacion', label: 'Recuperación', color: 'bg-purple-200' }
];

// Microcycle types
const MICROCYCLE_TYPES = [
  { id: 'corriente', label: 'Corriente', color: 'bg-gray-200' },
  { id: 'carga', label: 'Carga', color: 'bg-blue-200' },
  { id: 'choque', label: 'Choque', color: 'bg-red-200' },
  { id: 'competitivo', label: 'Competitivo', color: 'bg-green-200' },
  { id: 'aproximacion', label: 'Aproximación', color: 'bg-yellow-200' },
  { id: 'restablecimiento', label: 'Restablecimiento', color: 'bg-purple-200' }
];

const GraphicPlan = ({ athleteId, periodizationData, athleteName, athleteCategory, coachName, activePlan, competitions = [], onPlanUpdated, teamAthleteIds = null, teamName = null }) => {
  const { t } = useTranslation();
  // ═══ V2 STORE CONNECTION ═══
  const v2Store = usePlanStore();
  const v2Macros = v2Store.macrociclos;
  const v2Mesos = v2Store.mesociclos;
  const v2Micros = v2Store.microciclos;
  const v2Sesiones = v2Store.sesiones;
  const v2Ejercicios = v2Store.ejercicios;
  const v2Capacidades = v2Store.capacidades;
  const v2Plan = v2Store.plan;
  const v2Alertas = v2Store.alertas;
  const v2Historico = v2Store.historicoCarga;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cycleDuration, setCycleDuration] = useState('annual');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewOffset, setViewOffset] = useState(0);
  const [visibleWeeks, setVisibleWeeks] = useState(24);
  const [hasImportedData, setHasImportedData] = useState(false);
  // MEV→MAV→MRV chart dialog
  const [mevChartMeso, setMevChartMeso] = useState(null);
  
  // Chart type selections (managed internally by InteractiveChart)
  // Legacy states kept for backward compatibility
  const [loadChartType] = useState('bars');
  const [volumeIntensityChartType] = useState('combined');
  const [densityChartType] = useState('area');
  const [durationChartType] = useState('stacked');
  
  // Calendar events
  const [events, setEvents] = useState([]);
  // Competencias del plan (sincronizadas con el módulo Competencias) + modal de fecha
  const [localCompetitions, setLocalCompetitions] = useState(competitions);
  const [compModal, setCompModal] = useState(null); // { type, week, date, name, id }
  useEffect(() => { setLocalCompetitions(competitions); }, [competitions]);
  
  // General information
  const [generalInfo, setGeneralInfo] = useState({
    sport: '',
    category: '',
    athlete: '',
    coach: '',
    periodizationType: 'tradicional',
    duration: '',
    model: ''
  });
  // Catálogos para resolver IDs (deporte/modelo) → nombre legible
  const [sportMap, setSportMap] = useState({});
  const [modelMap, setModelMap] = useState({});
  // Último plan cuya periodización se importó (para reimportar al cambiar de plan)
  const lastImportedPlanRef = useRef(null);
  
  // Plan data structure
  const [planData, setPlanData] = useState({
    // Cycle structure
    macrocycles: {},
    periods: {},
    phases: {},
    mesocycles: {},
    microcycles: {},
    // Load magnitude
    intensity: {},
    volume: {},
    frequency: {},
    // Preparation
    preparation: {},
    // Physical preparation
    physical: {},
    // Activities
    activities: {},
    // Monitoring
    monitoring: {},
    // Manual chart overrides (0-5 scale, clickable)
    load_chart: {},
    volint_chart: {},
    duration_chart: {},
    // Per-row volume unit preferences { rowId: { unit, mode } } + real values { rowId_week: number }
    volume_units: {},
    volume_values: {},
    // Celdas editadas manualmente por el entrenador (no se sobrescriben al cargar plantilla)
    // clave: `${section}:${rowId}:${week}`
    manual_cells: {}
  });

  // Inline edit state for value-mode cells { rowId, week }
  const [editingCell, setEditingCell] = useState(null);

  // Import periodization data when available
  const importPeriodizationData = useCallback((macrocycle) => {
    if (!macrocycle || !macrocycle.mesocycles) return;

    const newPlanData = {
      macrocycles: {},
      periods: {},
      phases: {},
      mesocycles: {},
      microcycles: {},
      intensity: {},
      volume: {},
      frequency: {},
      preparation: {},
      physical: {},
      activities: {},
      monitoring: {},
      load_chart: {},
      volint_chart: {},
      duration_chart: {}
    };

    // Map phase IDs to our types
    const phaseMapping = {
      'preparatory_general': 'preparatory_general',
      'preparatory_specific': 'preparatory_specific',
      'precompetitive': 'precompetitive',
      'competitive': 'competitive',
      'transition': 'transition'
    };

    // Map mesocycle types
    const mesoTypeMapping = {
      'entrante': 'entrante',
      'desarrollo': 'basico_desarrollador',
      'choque': 'basico_desarrollador',
      'estabilizador': 'basico_estabilizador',
      'competitivo': 'competitivo',
      'recuperacion': 'recuperacion'
    };

    // Map microcycle types  
    const microTypeMapping = {
      'ordinario': 'corriente',
      'choque': 'choque',
      'aproximacion': 'aproximacion',
      'competitivo': 'competitivo',
      'recuperacion': 'restablecimiento'
    };

    // Process each mesocycle
    macrocycle.mesocycles.forEach(meso => {
      meso.microcycles?.forEach(micro => {
        const week = micro.weekNumber;
        
        // Set macrocycle phase
        const phaseId = phaseMapping[meso.phase] || 'preparatory_general';
        newPlanData.macrocycles[week] = phaseId;
        newPlanData.phases[week] = phaseId;
        
        // Set period based on phase
        if (['preparatory_general', 'preparatory_specific'].includes(meso.phase)) {
          newPlanData.periods[week] = 'preparatorio';
        } else if (['competitive', 'precompetitive'].includes(meso.phase)) {
          newPlanData.periods[week] = 'competitivo';
        } else {
          newPlanData.periods[week] = 'transicion';
        }

        // Set mesocycle type
        const mesoTypeId = mesoTypeMapping[meso.type?.id] || 'basico_desarrollador';
        newPlanData.mesocycles[week] = mesoTypeId;

        // Set microcycle type
        const microTypeId = microTypeMapping[micro.type?.id] || 'corriente';
        newPlanData.microcycles[week] = microTypeId;

        // Set volume and intensity levels (convert 0-100 to 1-5 scale)
        const volumeLevel = Math.min(5, Math.max(1, Math.ceil(micro.volume / 20)));
        const intensityLevel = Math.min(5, Math.max(1, Math.ceil(micro.intensity / 20)));
        
        // Set intensity by level
        const intensityLevels = ['recovery', 'low', 'medium', 'high', 'very_high'];
        newPlanData.intensity[`${intensityLevels[intensityLevel - 1]}_${week}`] = intensityLevel;
        
        // Set frequency based on sessions
        const sessionsCount = micro.sessions?.length || 5;
        newPlanData.frequency[week] = String(sessionsCount);

        // Set preparation emphasis based on phase
        if (meso.phase === 'preparatory_general') {
          newPlanData.preparation[`general_physical_${week}`] = volumeLevel;
          newPlanData.physical[`endurance_${week}`] = volumeLevel;
          newPlanData.physical[`strength_${week}`] = Math.max(1, volumeLevel - 1);
        } else if (meso.phase === 'preparatory_specific') {
          newPlanData.preparation[`specific_physical_${week}`] = volumeLevel;
          newPlanData.preparation[`technical_${week}`] = volumeLevel;
          newPlanData.physical[`strength_${week}`] = volumeLevel;
          newPlanData.physical[`speed_${week}`] = Math.max(1, volumeLevel - 1);
        } else if (meso.phase === 'precompetitive') {
          newPlanData.preparation[`technical_${week}`] = volumeLevel;
          newPlanData.preparation[`tactical_${week}`] = volumeLevel;
          newPlanData.physical[`speed_${week}`] = volumeLevel;
        } else if (meso.phase === 'competitive') {
          newPlanData.preparation[`tactical_${week}`] = volumeLevel;
          newPlanData.preparation[`psychological_${week}`] = volumeLevel;
          newPlanData.activities[`main_competition_${week}`] = micro.sessions?.some(s => s.type === 'competition');
        }

        // Set training activity for all weeks
        newPlanData.activities[`training_${week}`] = true;

        // Deload weeks get recovery
        if (micro.isDeload) {
          newPlanData.activities[`recovery_${week}`] = true;
          newPlanData.microcycles[week] = 'restablecimiento';
        }
      });
    });

    setPlanData(newPlanData);
    
    // Update cycle duration based on total weeks
    if (macrocycle.totalWeeks <= 13) {
      setCycleDuration('quarter');
    } else if (macrocycle.totalWeeks <= 26) {
      setCycleDuration('semester');
    } else {
      setCycleDuration('annual');
    }

    // Update general info
    setGeneralInfo(prev => ({
      ...prev,
      athlete: athleteName || prev.athlete,
      periodizationType: macrocycle.model || 'tradicional'
    }));

    setHasImportedData(true);
    toast.success(t('graphicPlan.datos_de_periodizacion_importados_correcta'));
  }, [athleteName]);

  // ═══ V2 SYNC: Auto-sync V1 plan to V2 when activePlan loads ═══
  useEffect(() => {
    if (activePlan?.id && !v2Plan) {
      v2Store.syncFromV1(activePlan.id);
    }
  }, [activePlan?.id]);

  // ═══ V2 SYNC: Populate grid from V2 data when available ═══
  useEffect(() => {
    if (!v2Micros.length || !v2Mesos.length || !v2Macros.length) return;

    const newPlanData = {
      macrocycles: {}, periods: {}, phases: {}, mesocycles: {},
      microcycles: {}, intensity: {}, volume: {}, frequency: {},
      preparation: {}, physical: {}, activities: {}, monitoring: {}, load_chart: {}, volint_chart: {}, duration_chart: {}
    };

    // Build lookup maps
    const mesoByMacro = {};
    v2Mesos.forEach(m => {
      if (!mesoByMacro[m.macrociclo_id]) mesoByMacro[m.macrociclo_id] = [];
      mesoByMacro[m.macrociclo_id].push(m);
    });
    const microByMeso = {};
    v2Micros.forEach(m => {
      if (!microByMeso[m.mesociclo_id]) microByMeso[m.mesociclo_id] = [];
      microByMeso[m.mesociclo_id].push(m);
    });
    const sesionesByMicro = {};
    v2Sesiones.forEach(s => {
      if (!sesionesByMicro[s.microciclo_id]) sesionesByMicro[s.microciclo_id] = [];
      sesionesByMicro[s.microciclo_id].push(s);
    });
    const ejerciciosBySesion = {};
    v2Ejercicios.forEach(e => {
      if (!ejerciciosBySesion[e.sesion_id]) ejerciciosBySesion[e.sesion_id] = [];
      ejerciciosBySesion[e.sesion_id].push(e);
    });

    const macroPhaseMap = {
      accumulation: 'preparatory_general', prep_general: 'preparatory_general',
      transformation: 'preparatory_specific', prep_specific: 'preparatory_specific',
      realization: 'competitive', competitive: 'competitive',
      precompetitive: 'precompetitive',
      transition: 'transition', recovery: 'transition'
    };
    const mesoTypeMap = {
      basico_desarrollador: 'basico_desarrollador', basico_estabilizador: 'basico_estabilizador',
      entrante: 'entrante', competitivo: 'competitivo', recuperacion: 'recuperacion',
      precompetitivo: 'precompetitivo'
    };
    const microTypeMap = {
      corriente: 'corriente', carga: 'carga', choque: 'choque',
      competitivo: 'competitivo', aproximacion: 'aproximacion', restablecimiento: 'restablecimiento'
    };

    // Compute global max for normalization
    const allMicroCarga = v2Micros.map(m => m.carga_total || 0);
    const maxCarga = Math.max(...allMicroCarga, 1);

    v2Macros.forEach(macro => {
      const mesos = (mesoByMacro[macro.id] || []).sort((a, b) => (a.orden || 0) - (b.orden || 0));
      mesos.forEach(meso => {
        const micros = (microByMeso[meso.id] || []).sort((a, b) => (a.numero_semana || 0) - (b.numero_semana || 0));
        micros.forEach(micro => {
          const w = micro.numero_semana;
          if (!w) return;

          const phase = macro.tipo;
          const sessions = sesionesByMicro[micro.id] || [];

          // ── CICLO rows ──
          newPlanData.macrocycles[w] = macroPhaseMap[phase] || 'preparatory_general';
          newPlanData.phases[w] = macroPhaseMap[phase] || 'preparatory_general';
          if (['accumulation', 'prep_general', 'prep_specific', 'transformation'].includes(phase)) {
            newPlanData.periods[w] = 'preparatorio';
          } else if (['competitive', 'realization', 'precompetitive'].includes(phase)) {
            newPlanData.periods[w] = 'competitivo';
          } else {
            newPlanData.periods[w] = 'transicion';
          }
          newPlanData.mesocycles[w] = mesoTypeMap[meso.tipo] || 'basico_desarrollador';
          newPlanData.microcycles[w] = microTypeMap[micro.tipo] || 'corriente';

          // ── MAGNITUD DE LA CARGA rows ──
          newPlanData.frequency[w] = String(sessions.length || 0);

          // Compute intensity from V2 RPE and carga
          const avgRPE = sessions.length > 0
            ? sessions.reduce((s, se) => s + (se.RPE_sesion || 0), 0) / sessions.length : 0;
          const cargaPct = micro.carga_total ? Math.round((micro.carga_total / maxCarga) * 100) : 0;
          const intensityPct = Math.max(avgRPE * 10, cargaPct);

          // Fill ALL intensity level rows for this week (the active level + below)
          const levels = [
            { id: 'very_high', min: 90, val: 5 },
            { id: 'high', min: 75, val: 4 },
            { id: 'medium', min: 55, val: 3 },
            { id: 'low', min: 35, val: 2 },
            { id: 'recovery', min: 0, val: 1 }
          ];
          levels.forEach(lvl => {
            if (intensityPct >= lvl.min) {
              newPlanData.intensity[`${lvl.id}_${w}`] = lvl.val;
            }
          });

          // Volume row: fill similarly based on V2 vol_calculado
          const volPct = micro.vol_calculado || 0;
          levels.forEach(lvl => {
            if (volPct >= lvl.min * 0.5) {
              if (!newPlanData.volume[`${lvl.id}_${w}`]) {
                newPlanData.volume[`${lvl.id}_${w}`] = Math.min(5, Math.ceil(volPct / 20));
              }
            }
          });

          // ── PREPARACION rows (fill ALL 6 types based on phase + proportional) ──
          const baseLevel = Math.max(1, Math.min(5, Math.ceil(intensityPct / 20)));
          const isPrep = ['accumulation', 'prep_general'].includes(phase);
          const isSpecific = ['transformation', 'prep_specific'].includes(phase);
          const isComp = ['realization', 'competitive', 'precompetitive'].includes(phase);
          const isRecov = micro.tipo === 'restablecimiento';

          // Always fill all preparation types with proportional values
          newPlanData.preparation[`general_physical_${w}`] = isRecov ? 1 : isPrep ? Math.min(5, baseLevel + 1) : isSpecific ? baseLevel : Math.max(1, baseLevel - 1);
          newPlanData.preparation[`specific_physical_${w}`] = isRecov ? 1 : isSpecific ? Math.min(5, baseLevel + 1) : isComp ? baseLevel : Math.max(1, baseLevel - 1);
          newPlanData.preparation[`technical_${w}`] = isRecov ? 1 : isSpecific ? baseLevel : isComp ? Math.min(5, baseLevel + 1) : Math.max(1, baseLevel - 1);
          newPlanData.preparation[`tactical_${w}`] = isRecov ? 1 : isComp ? Math.min(5, baseLevel + 1) : isSpecific ? baseLevel : Math.max(1, baseLevel - 1);
          newPlanData.preparation[`psychological_${w}`] = isRecov ? 1 : isComp ? baseLevel : Math.max(1, baseLevel - 1);
          newPlanData.preparation[`theoretical_${w}`] = isRecov ? 1 : isPrep ? baseLevel : Math.max(1, baseLevel - 1);

          // ── PREPARACION FISICA rows (fill ALL 5 from exercises + phase) ──
          const capCount = {};
          let totalSeries = 0;
          sessions.forEach(s => {
            (ejerciciosBySesion[s.id] || []).forEach(e => {
              const cap = e.capacidad_tipo || '';
              const ser = e.series || 0;
              capCount[cap] = (capCount[cap] || 0) + ser;
              totalSeries += ser;
            });
          });

          // From exercises if available, otherwise distribute by phase
          if (totalSeries > 0) {
            const scale = (count) => Math.min(5, Math.max(1, Math.ceil(count / Math.max(totalSeries / 5, 1) * 5)));
            newPlanData.physical[`endurance_${w}`] = scale((capCount.resistencia_aerobica || 0) + (capCount.resistencia_anaerobica || 0));
            newPlanData.physical[`strength_${w}`] = scale((capCount.fuerza_maxima || 0) + (capCount.fuerza_explosiva || 0) + (capCount.fuerza_resistencia || 0));
            newPlanData.physical[`speed_${w}`] = scale((capCount.velocidad || 0) + (capCount.velocidad_reaccion || 0));
            newPlanData.physical[`coordination_${w}`] = scale((capCount.coordinacion || 0) + (capCount.agilidad || 0));
            newPlanData.physical[`flexibility_${w}`] = scale(capCount.flexibilidad || 0);
          } else {
            // Distribute by phase
            newPlanData.physical[`endurance_${w}`] = isRecov ? 1 : isPrep ? Math.min(5, baseLevel + 1) : isSpecific ? baseLevel : Math.max(1, baseLevel - 1);
            newPlanData.physical[`strength_${w}`] = isRecov ? 1 : isPrep ? baseLevel : isSpecific ? Math.min(5, baseLevel + 1) : Math.max(1, baseLevel - 1);
            newPlanData.physical[`speed_${w}`] = isRecov ? 1 : isComp ? baseLevel : isSpecific ? Math.max(1, baseLevel - 1) : Math.max(1, baseLevel - 2);
            newPlanData.physical[`coordination_${w}`] = isRecov ? 1 : isComp ? baseLevel : Math.max(1, baseLevel - 1);
            newPlanData.physical[`flexibility_${w}`] = isRecov ? 2 : Math.max(1, baseLevel - 1);
          }

          // ── ACTIVIDAD rows (fill ALL types) ──
          newPlanData.activities[`training_${w}`] = sessions.length > 0;
          newPlanData.activities[`recovery_${w}`] = isRecov || micro.tipo === 'restablecimiento';
          if (isComp && micro.tipo === 'competitivo') {
            newPlanData.activities[`main_competition_${w}`] = true;
          }

          // ── MONITOREO rows (fill based on mesocycle boundaries + phase) ──
          const isFirstMicroOfMeso = micros[0]?.id === micro.id;
          const isLastMicroOfMeso = micros[micros.length - 1]?.id === micro.id;
          if (isFirstMicroOfMeso || isLastMicroOfMeso) {
            newPlanData.monitoring[`physical_${w}`] = true;
            newPlanData.monitoring[`medical_${w}`] = true;
          }
          if (isFirstMicroOfMeso) {
            newPlanData.monitoring[`technical_${w}`] = true;
            newPlanData.monitoring[`tactical_${w}`] = true;
          }
          if (isLastMicroOfMeso) {
            newPlanData.monitoring[`psychological_${w}`] = true;
            newPlanData.monitoring[`theoretical_${w}`] = true;
          }
        });
      });
    });

    setPlanData(newPlanData);

    if (v2Micros.length > 0) {
      setHasImportedData(true);
    }
  }, [v2Macros, v2Mesos, v2Micros, v2Sesiones, v2Ejercicios]);

  // Watch for periodization data changes (only if V2 hasn't loaded)
  useEffect(() => {
    if (periodizationData && !v2Micros.length) {
      importPeriodizationData(periodizationData);
    }
  }, [periodizationData, importPeriodizationData, v2Micros.length]);

  // Load data from active plan — auto-llena el encabezado con datos reales
  useEffect(() => {
    if (activePlan) {
      // Calcular duración legible (ej: "26 semanas · 6 meses")
      const totalWeeks = activePlan.total_weeks || 0;
      const months = totalWeeks > 0 ? Math.round(totalWeeks / 4.33) : 0;
      let durationStr = '';
      if (totalWeeks > 0) {
        durationStr = `${totalWeeks} sem`;
        if (months > 0) {
          if (months >= 12) {
            const years = Math.round((months / 12) * 10) / 10;
            durationStr += ` · ${years} año${years === 1 ? '' : 's'}`;
          } else {
            durationStr += ` · ${months} mes${months === 1 ? '' : 'es'}`;
          }
        }
      }
      // Resolver nombres legibles (los planes guardan IDs en sport/model)
      const isUuidLike = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v);
      const modelName = modelMap[activePlan.model]
        || (activePlan.model_name && !isUuidLike(activePlan.model_name) ? activePlan.model_name : null)
        || (!isUuidLike(activePlan.model) ? activePlan.model : '—');
      // Derivar tipo de periodización (familia) desde el nombre/clave del modelo
      const derivePeriodType = (key, name) => {
        const s = `${key || ''} ${name || ''}`.toLowerCase();
        if (s.includes('pdi') || s.includes('dual integrada')) return 'pdi';
        if (s.includes('atr')) return 'atr';
        if (s.includes('bloque')) return 'bloques';
        if (s.includes('polariz')) return 'polarizado';
        if (s.includes('ondula') || s.includes('dup') || s.includes('no lineal') || s.includes('nonlinear')) return 'ondulante';
        if (s.includes('lineal') || s.includes('linear')) return 'lineal';
        if (s.includes('tradicional') || s.includes('matveiev') || s.includes('matveev')) return 'tradicional';
        const known = ['tradicional', 'atr', 'bloques', 'ondulante', 'lineal', 'polarizado', 'pdi'];
        return known.includes((key || '').toLowerCase()) ? key.toLowerCase() : '';
      };
      const periodType = derivePeriodType(activePlan.model, modelName);
      setGeneralInfo(prev => ({
        ...prev,
        sport: (sportMap[activePlan.sport] || activePlan.sport_name || activePlan.sport) || prev.sport,
        category: athleteCategory || activePlan.category || prev.category,
        athlete: athleteName || prev.athlete,
        coach: coachName || activePlan.coach_name || prev.coach,
        periodizationType: periodType || prev.periodizationType || 'tradicional',
        duration: durationStr || prev.duration,
        model: modelName || prev.model,
      }));
      if (activePlan.macrocycles?.length > 0 && lastImportedPlanRef.current !== activePlan.id) {
        lastImportedPlanRef.current = activePlan.id;
        importPeriodizationData(activePlan.macrocycles[0]);
      }
    }
  }, [activePlan, athleteName, athleteCategory, coachName, importPeriodizationData, sportMap, modelMap]);

  // Load calendar events
  useEffect(() => {
    const loadEvents = async () => {
      if (!athleteId) return;
      try {
        const token = localStorage.getItem('train_token');
        const response = await axios.get(
          `${BACKEND_URL}/api/events-calendar/${athleteId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (response.data?.events) {
          setEvents(response.data.events);
        }
      } catch (error) {
        // No events found - that's ok
        console.log('No events loaded');
      }
    };
    loadEvents();
  }, [athleteId]);

  // Load evaluation controls timeline → auto-mark monitoring weeks based on real control dates
  useEffect(() => {
    if (!activePlan?.id) return;
    let cancelled = false;
    const loadEvaluations = async () => {
      try {
        const token = localStorage.getItem('train_token');
        const r = await axios.get(
          `${BACKEND_URL}/api/plan-data/evaluations-export/timeline/${activePlan.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (cancelled) return;
        const list = r.data?.controls || [];
        if (!list.length) return;
        const startDate = activePlan?.start_date ? new Date(activePlan.start_date) : null;
        if (!startDate || isNaN(startDate.getTime())) return;
        setPlanData(prev => {
          const monitoring = { ...(prev.monitoring || {}) };
          list.forEach(ctrl => {
            if (!ctrl.date || !ctrl.evaluation_type) return;
            const ctrlDate = new Date(ctrl.date);
            if (isNaN(ctrlDate.getTime())) return;
            const diffDays = Math.floor((ctrlDate - startDate) / (1000 * 60 * 60 * 24));
            const weekIdx = Math.floor(diffDays / 7) + 1; // 1-based week
            if (weekIdx >= 1 && weekIdx <= 52) {
              monitoring[`${ctrl.evaluation_type}_${weekIdx}`] = true;
            }
          });
          return { ...prev, monitoring };
        });
      } catch (e) {
        // No timeline data — ok
      }
    };
    loadEvaluations();
    // Re-run when an evaluation is saved/deleted from EvaluationSection
    const handler = (e) => {
      if (e?.detail?.plan_id === activePlan.id) loadEvaluations();
    };
    window.addEventListener('lordtraining:evaluation-saved', handler);
    return () => { cancelled = true; window.removeEventListener('lordtraining:evaluation-saved', handler); };
  }, [activePlan?.id, activePlan?.start_date]);

  // Total weeks — usa las semanas REALES del plan (B2/B3); fallback al ciclo seleccionado.
  const totalWeeks = activePlan?.total_weeks || CYCLE_DURATIONS[cycleDuration].weeks;

  // Calculate which weeks have events (including competitions from plan)
  const eventsByWeek = useMemo(() => {
    const result = {};
    const startDate = activePlan?.start_date ? new Date(activePlan.start_date) : new Date(new Date().getFullYear(), 0, 1);
    
    events.forEach(event => {
      if (event.date) {
        const eventDate = new Date(event.date);
        const diffTime = Math.abs(eventDate - startDate);
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
        const weekNum = Math.min(diffWeeks, totalWeeks);
        
        if (!result[weekNum]) {
          result[weekNum] = [];
        }
        result[weekNum].push(event);
      }
    });

    // Add competitions from plan data
    localCompetitions.forEach(comp => {
      if (comp.date) {
        const compDate = new Date(comp.date);
        const diffTime = compDate - startDate;
        const diffWeeks = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7)));
        const weekNum = Math.min(diffWeeks, totalWeeks);
        if (weekNum > 0) {
          if (!result[weekNum]) result[weekNum] = [];
          result[weekNum].push({
            name: comp.name || comp.competition_name || 'Competencia',
            date: comp.date,
            type: 'competition',
            priority: comp.importance === 'alta' || comp.importance === 'principal' ? 'high' : 'normal'
          });
        }
      }
    });
    
    // Competencia principal del plan (B2) — marcador de alta prioridad
    if (activePlan?.main_competition_date) {
      const compDate = new Date(activePlan.main_competition_date);
      if (!isNaN(compDate.getTime())) {
        const diffWeeks = Math.max(1, Math.ceil((compDate - startDate) / (1000 * 60 * 60 * 24 * 7)));
        const weekNum = Math.min(diffWeeks, totalWeeks);
        if (weekNum > 0) {
          if (!result[weekNum]) result[weekNum] = [];
          result[weekNum].push({
            name: activePlan.main_competition || 'Competencia Principal',
            date: activePlan.main_competition_date,
            type: 'competition',
            priority: 'high'
          });
        }
      }
    }

    return result;
  }, [events, localCompetitions, totalWeeks, activePlan]);

  // Convierte un nº de semana a fecha ISO (YYYY-MM-DD) según el inicio del plan
  const weekToDate = (week) => {
    const sd = activePlan?.start_date ? new Date(activePlan.start_date) : new Date();
    const d = new Date(sd);
    d.setDate(d.getDate() + (Math.max(1, week) - 1) * 7);
    return d.toISOString().split('T')[0];
  };

  // Abrir el modal de fecha para una celda genérica (eventos/monitoreo)
  const openCellDateModal = (section, rowId, week, label, dates, active) => {
    const list = (Array.isArray(dates) && dates.length) ? [...dates] : [weekToDate(week)];
    setCompModal({ kind: 'cell', section, rowId, week, label: label || rowId, dates: list, active: !!active });
  };

  // Replica eventos a TODOS los atletas del equipo (excepto el representante, ya guardado).
  // Para cada atleta: fetch sus eventos, reemplaza los del mismo baseKey, y guarda (merge, no sobrescribe).
  const replicateToTeam = async ({ baseKey, newEvs }) => {
    if (!Array.isArray(teamAthleteIds) || teamAthleteIds.length === 0) return;
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };
    const others = teamAthleteIds.filter(id => id && id !== athleteId);
    await Promise.all(others.map(async (aid) => {
      let existing = [];
      try {
        const r = await axios.get(`${BACKEND_URL}/api/events-calendar/${aid}`, { headers });
        existing = r.data?.events || [];
      } catch (e) { existing = []; }
      const kept = existing.filter(e => !(e.id || '').startsWith(baseKey));
      const updated = [...kept, ...newEvs];
      try {
        await axios.post(`${BACKEND_URL}/api/events-calendar`, { athlete_id: aid, events: updated }, { headers });
      } catch (e) { /* continuar con los demás */ }
    }));
  };

  // Sincroniza un evento del Plan Gráfico con el Calendario Drag & Drop (events_calendar por atleta)
  const syncCalendarEvent = async ({ key, name, date, type, priority = 'C', remove = false }) => {
    if (!athleteId) return false; // el calendario es por atleta
    let updated;
    if (remove) {
      updated = events.filter(e => e.id !== key);
    } else {
      const ev = { id: key, name, date, type, priority, source: 'graphic_plan' };
      updated = events.some(e => e.id === key)
        ? events.map(e => (e.id === key ? { ...e, ...ev } : e))
        : [...events, ev];
    }
    setEvents(updated);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(`${BACKEND_URL}/api/events-calendar`, { athlete_id: athleteId, events: updated },
        { headers: { Authorization: `Bearer ${token}` } });
      // Modo equipo: replicar a todos los atletas del equipo
      const newEvs = remove ? [] : [{ id: key, name, date, type, priority, source: 'graphic_plan' }];
      await replicateToTeam({ baseKey: key, newEvs });
      return true;
    } catch (e) { return false; }
  };

  // Sincroniza N fechas de una celda como N eventos (limpia los previos con el mismo baseKey)
  const syncCellEvents = async ({ baseKey, name, dates, type, priority = 'C' }) => {
    if (!athleteId) return false;
    const kept = events.filter(e => !(e.id || '').startsWith(baseKey));
    const newEvs = dates.map((d, i) => ({ id: `${baseKey}_${i}`, name, date: d, type, priority, source: 'graphic_plan' }));
    const updated = [...kept, ...newEvs];
    setEvents(updated);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(`${BACKEND_URL}/api/events-calendar`, { athlete_id: athleteId, events: updated },
        { headers: { Authorization: `Bearer ${token}` } });
      // Modo equipo: replicar a todos los atletas del equipo
      await replicateToTeam({ baseKey, newEvs });
      return true;
    } catch (e) { return false; }
  };

  // Guardar (o quitar) las fechas de una celda en planData + sincronizar calendario
  const applyCellDate = (remove = false) => {
    if (!compModal || compModal.kind !== 'cell') return;
    const { section, rowId, week, label } = compModal;
    const dates = remove ? [] : (compModal.dates || []).filter(Boolean);
    setPlanData(prev => {
      const sec = { ...(prev[section] || {}) };
      if (dates.length === 0) {
        delete sec[`${rowId}_${week}`];
        delete sec[`${rowId}_date_${week}`];
        delete sec[`${rowId}_dates_${week}`];
      } else {
        sec[`${rowId}_${week}`] = true;
        sec[`${rowId}_dates_${week}`] = dates;
        sec[`${rowId}_date_${week}`] = dates[0];
      }
      return { ...prev, [section]: sec };
    });
    syncCellEvents({
      baseKey: `gp_${section}_${rowId}_${week}`,
      name: label,
      dates,
      type: section === 'monitoring' ? 'Evaluación' : 'Entrenamiento',
      priority: 'C',
    }).then(synced => {
      const teamSuffix = (Array.isArray(teamAthleteIds) && teamAthleteIds.length) ? ` · replicado a ${teamAthleteIds.length} atletas del equipo` : '';
      toast.success(dates.length === 0
        ? 'Marca eliminada'
        : (synced ? `${dates.length} fecha(s) añadida(s) al calendario${teamSuffix}` : `${dates.length} fecha(s) asignada(s) (selecciona un atleta para el calendario)`));
    });
    setCompModal(null);
  };

  // Abrir el modal de fecha al hacer clic en una celda de competencia
  const openCompModal = (type, week) => {
    if (type === 'main_competition') {
      setCompModal({
        type, week,
        name: activePlan?.main_competition || 'Competencia Principal',
        date: activePlan?.main_competition_date ? activePlan.main_competition_date.split('T')[0] : weekToDate(week),
      });
    } else {
      setCompModal({ type, week, name: '', date: weekToDate(week), id: null });
    }
  };

  // Guardar la competencia (principal → plan; secundaria → plan_competitions)
  const saveCompModal = async () => {
    if (!compModal || !activePlan) return;
    if (compModal.kind === 'cell') { applyCellDate(false); return; }
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      if (compModal.type === 'main_competition') {
        await axios.patch(
          `${BACKEND_URL}/api/training-plans/${activePlan.id}/competition`,
          { main_competition: compModal.name || 'Competencia Principal', main_competition_date: compModal.date },
          { headers }
        );
        onPlanUpdated && onPlanUpdated({ main_competition: compModal.name || 'Competencia Principal', main_competition_date: compModal.date });
        await syncCalendarEvent({ key: 'gp_main_competition', name: compModal.name || 'Competencia Principal', date: compModal.date, type: 'Competencia', priority: 'A' });
        toast.success('Competencia principal actualizada' + (athleteId ? ' y añadida al calendario' : ''));
      } else {
        const res = await axios.post(
          `${BACKEND_URL}/api/plan-data/competitions`,
          { plan_id: activePlan.id, athlete_id: athleteId, name: compModal.name || 'Competencia Secundaria', date: compModal.date, importance: 'secundaria' },
          { headers }
        );
        setLocalCompetitions(prev => [...prev, res.data]);
        await syncCalendarEvent({ key: `gp_sec_${res.data.id || compModal.date}`, name: compModal.name || 'Competencia Secundaria', date: compModal.date, type: 'Competencia', priority: 'B' });
        toast.success('Competencia secundaria agregada (sincronizada con módulo Competencias' + (athleteId ? ' y calendario' : '') + ')');
      }
      setCompModal(null);
    } catch (e) {
      toast.error('No se pudo guardar la competencia');
    }
  };
  
  // Generate week numbers for display
  const weeks = useMemo(() => {
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }, [totalWeeks]);

  // ── B3: detección de conflictos de fecha + re-sincronización ──
  const dateConflict = useMemo(() => {
    const sd = activePlan?.start_date ? new Date(activePlan.start_date) : null;
    const cd = activePlan?.main_competition_date ? new Date(activePlan.main_competition_date) : null;
    if (!sd || !cd || isNaN(sd.getTime()) || isNaN(cd.getTime())) return null;
    if (cd <= sd) {
      return { type: 'before_start', message: t('graphicPlan.conflicto_competencia_antes_inicio'), suggestWeeks: null };
    }
    const compWeek = Math.max(1, Math.ceil((cd - sd) / (1000 * 60 * 60 * 24 * 7)));
    if (compWeek > totalWeeks) {
      return {
        type: 'outside', suggestWeeks: compWeek,
        message: `${t('graphicPlan.conflicto_competencia_fuera')} (${t('graphicPlan.semana')} ${compWeek} > ${totalWeeks})`,
      };
    }
    if (compWeek < Math.ceil(totalWeeks * 0.6)) {
      return {
        type: 'too_early', suggestWeeks: compWeek,
        message: `${t('graphicPlan.conflicto_competencia_temprana')} (${t('graphicPlan.semana')} ${compWeek}/${totalWeeks})`,
      };
    }
    return null;
  }, [activePlan, totalWeeks, t]);

  const [adjustingDuration, setAdjustingDuration] = useState(false);

  // Remapea claves por semana (`${id}_${week}` o `${section}:${id}:${week}`) de oldTotal→newTotal proporcionalmente.
  const remapWeekKeys = (obj, oldTotal, newTotal, sep = '_') => {
    if (!obj || oldTotal <= 0) return obj || {};
    const out = {};
    Object.entries(obj).forEach(([key, val]) => {
      const idx = key.lastIndexOf(sep);
      if (idx === -1) { out[key] = val; return; }
      const prefix = key.slice(0, idx);
      const wk = parseInt(key.slice(idx + sep.length), 10);
      if (isNaN(wk)) { out[key] = val; return; }
      const newWk = Math.max(1, Math.min(newTotal, Math.round(wk * newTotal / oldTotal)));
      out[`${prefix}${sep}${newWk}`] = val;
    });
    return out;
  };

  const handleAutoAdjustDuration = async () => {
    if (!activePlan?.id || !dateConflict?.suggestWeeks) return;
    const oldTotal = totalWeeks;
    const newTotal = dateConflict.suggestWeeks;
    setAdjustingDuration(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.patch(`${BACKEND_URL}/api/training-plans/${activePlan.id}/duration`,
        { total_weeks: newTotal },
        { headers: { Authorization: `Bearer ${token}` } });

      // Redistribución proporcional de cargas/valores por semana (B3+)
      if (oldTotal && newTotal && oldTotal !== newTotal) {
        setPlanData(prev => ({
          ...prev,
          load_chart: remapWeekKeys(prev.load_chart, oldTotal, newTotal),
          volint_chart: remapWeekKeys(prev.volint_chart, oldTotal, newTotal),
          preparation: remapWeekKeys(prev.preparation, oldTotal, newTotal),
          physical: remapWeekKeys(prev.physical, oldTotal, newTotal),
          volume: remapWeekKeys(prev.volume, oldTotal, newTotal),
          intensity: remapWeekKeys(prev.intensity, oldTotal, newTotal),
          duration_chart: remapWeekKeys(prev.duration_chart, oldTotal, newTotal),
          volume_values: remapWeekKeys(prev.volume_values, oldTotal, newTotal),
          manual_cells: remapWeekKeys(prev.manual_cells, oldTotal, newTotal, ':'),
        }));
      }

      toast.success(`${t('graphicPlan.duracion_ajustada')}: ${newTotal} ${t('graphicPlan.semanas')}`);
      if (onPlanUpdated) onPlanUpdated({ total_weeks: newTotal });
      window.dispatchEvent(new CustomEvent('lordtraining:plan-data-updated', { detail: { plan_id: activePlan.id } }));
    } catch (e) {
      console.error('Error adjusting duration:', e);
      toast.error(t('graphicPlan.error_ajustar_duracion'));
    } finally {
      setAdjustingDuration(false);
    }
  };
  
  // Visible weeks based on scroll
  const displayedWeeks = useMemo(() => {
    const start = viewOffset;
    const end = Math.min(viewOffset + visibleWeeks, totalWeeks);
    return weeks.slice(start, end);
  }, [weeks, viewOffset, visibleWeeks, totalWeeks]);

  // ═══ CHART DATA FROM V2 STORE (real calculated metrics) ═══
  // Mapper functions parametrizables — usados en 2 versiones:
  //   • con `displayedWeeks` para las filas inline de la tabla
  //   • con `weeks` (full range) para el InteractiveChart expandido en Dialog
  const _buildLoadData = (weekList) => weekList.map(week => {
    const manualCarga = planData.load_chart?.[`carga_${week}`];
    const manualRecup = planData.load_chart?.[`recuperacion_${week}`];
    if (manualCarga !== undefined || manualRecup !== undefined) {
      return {
        week: `S${week}`, weekNum: week,
        carga: (manualCarga || 0) * 10, recuperacion: (manualRecup || 0) * 10,
        fase: MACROCYCLE_TYPES.find(t => t.id === planData.phases?.[week])?.label || '',
        cargaUA: 0, ACWR: 0, RPE: 0,
      };
    }
    const v2Micro = v2Micros.find(m => m.numero_semana === week);
    if (v2Micro && v2Micro.carga_total > 0) {
      const maxCarga = Math.max(...v2Micros.map(m => m.carga_total || 0), 1);
      const cargaPct = Math.round((v2Micro.carga_total / maxCarga) * 100);
      return {
        week: `S${week}`, weekNum: week,
        carga: cargaPct, recuperacion: Math.max(0, 100 - cargaPct),
        fase: MACROCYCLE_TYPES.find(t => t.id === planData.phases?.[week])?.label || '',
        cargaUA: Math.round(v2Micro.carga_total), ACWR: v2Micro.ACWR || 0, RPE: v2Micro.RPE_promedio || 0,
      };
    }
    let totalLoad = 0;
    INTENSITY_LEVELS.forEach((level, idx) => {
      const value = planData.intensity?.[`${level.id}_${week}`] || 0;
      totalLoad += value * (5 - idx);
    });
    return {
      week: `S${week}`, weekNum: week,
      carga: Math.min(100, totalLoad * 20), recuperacion: Math.max(0, 100 - totalLoad * 20),
      fase: MACROCYCLE_TYPES.find(t => t.id === planData.phases?.[week])?.label || '',
      cargaUA: 0, ACWR: 0, RPE: 0,
    };
  });
  const loadChartData = useMemo(() => _buildLoadData(displayedWeeks), [displayedWeeks, planData.intensity, planData.phases, planData.load_chart, v2Micros]);
  const loadChartDataFull = useMemo(() => _buildLoadData(weeks), [weeks, planData.intensity, planData.phases, planData.load_chart, v2Micros]);

  const _buildVolIntData = (weekList) => weekList.map(week => {
    const manualVol = planData.volint_chart?.[`volumen_${week}`];
    const manualInt = planData.volint_chart?.[`intensidad_${week}`];
    if (manualVol !== undefined || manualInt !== undefined) {
      return {
        week: `S${week}`, weekNum: week,
        volumen: (manualVol || 0) * 10, intensidad: (manualInt || 0) * 10,
        mesociclo: MESOCYCLE_TYPES.find(t => t.id === planData.mesocycles?.[week])?.label || '',
        tonelaje: 0, carga: 0,
      };
    }
    const v2Micro = v2Micros.find(m => m.numero_semana === week);
    if (v2Micro && (v2Micro.vol_calculado > 0 || v2Micro.int_calculado > 0)) {
      return {
        week: `S${week}`, weekNum: week,
        volumen: Math.round(v2Micro.vol_calculado), intensidad: Math.round(v2Micro.int_calculado),
        mesociclo: MESOCYCLE_TYPES.find(t => t.id === planData.mesocycles?.[week])?.label || '',
        tonelaje: Math.round(v2Micro.tonelaje_kg || 0), carga: Math.round(v2Micro.carga_total || 0),
      };
    }
    let volumeSum = 0, volumeCount = 0;
    INTENSITY_LEVELS.forEach(level => {
      const value = planData.volume?.[`${level.id}_${week}`];
      if (value) { volumeSum += value; volumeCount++; }
    });
    let intensitySum = 0, intensityCount = 0;
    INTENSITY_LEVELS.forEach((level, idx) => {
      const value = planData.intensity?.[`${level.id}_${week}`];
      if (value) { intensitySum += value * (100 - idx * 15); intensityCount += value; }
    });
    return {
      week: `S${week}`, weekNum: week,
      volumen: volumeCount > 0 ? Math.round(volumeSum / volumeCount * 20) : 0,
      intensidad: intensityCount > 0 ? Math.round(intensitySum / intensityCount) : 0,
      mesociclo: MESOCYCLE_TYPES.find(t => t.id === planData.mesocycles?.[week])?.label || '',
      tonelaje: 0, carga: 0,
    };
  });
  const volumeIntensityChartData = useMemo(() => _buildVolIntData(displayedWeeks), [displayedWeeks, planData.volume, planData.intensity, planData.mesocycles, planData.volint_chart, v2Micros]);
  const volumeIntensityChartDataFull = useMemo(() => _buildVolIntData(weeks), [weeks, planData.volume, planData.intensity, planData.mesocycles, planData.volint_chart, v2Micros]);

  const _buildPrepData = (weekList) => weekList.map(week => {
    const row = { week: `S${week}` };
    PREPARATION_TYPES.forEach(prep => {
      row[prep.id] = (planData.preparation?.[`${prep.id}_${week}`] || 0) * 10;
    });
    return row;
  });
  const preparationChartData = useMemo(() => _buildPrepData(displayedWeeks), [displayedWeeks, planData.preparation]);
  const preparationChartDataFull = useMemo(() => _buildPrepData(weeks), [weeks, planData.preparation]);

  const _buildPhysData = (weekList) => weekList.map(week => {
    const row = { week: `S${week}` };
    PHYSICAL_COMPONENTS.forEach(comp => {
      row[comp.id] = (planData.physical?.[`${comp.id}_${week}`] || 0) * 10;
    });
    return row;
  });
  const physicalChartData = useMemo(() => _buildPhysData(displayedWeeks), [displayedWeeks, planData.physical]);
  const physicalChartDataFull = useMemo(() => _buildPhysData(weeks), [weeks, planData.physical]);

  const _buildActivityData = (weekList) => weekList.map(week => {
    const v2Micro = v2Micros.find(m => m.numero_semana === week);
    const sessions = v2Micro ? v2Sesiones.filter(s => s.microciclo_id === v2Micro.id) : [];
    const hasTraining = planData.activities?.[`training_${week}`] || sessions.length > 0;
    return {
      week: `S${week}`,
      entrenamiento: hasTraining ? (sessions.length || 5) : 0,
      competenciaPrincipal: planData.activities?.[`main_competition_${week}`] ? 1 : 0,
      competenciaSecundaria: planData.activities?.[`secondary_competition_${week}`] ? 1 : 0,
      recuperacion: planData.activities?.[`recovery_${week}`] ? 1 : 0,
      totalSesiones: sessions.length,
    };
  });
  const activityChartData = useMemo(() => _buildActivityData(displayedWeeks), [displayedWeeks, planData.activities, v2Micros, v2Sesiones]);

  const _buildMonitoringData = (weekList) => weekList.map(week => {
    const row = { week: `S${week}` };
    MONITORING_AREAS.forEach(area => {
      row[area.id] = planData.monitoring?.[`${area.id}_${week}`] ? 1 : 0;
    });
    return row;
  });
  const monitoringChartData = useMemo(() => _buildMonitoringData(displayedWeeks), [displayedWeeks, planData.monitoring]);

  const _buildDensityData = (weekList) => weekList.map(week => {
    const v2Micro = v2Micros.find(m => m.numero_semana === week);
    const den = v2Micro?.den_calculado || 0;
    const denPct = Math.round(den * 100);
    const level = denPct > 12 ? 'alto' : denPct > 6 ? 'medio' : 'bajo';
    return {
      week: `S${week}`, weekNum: week,
      densidad: Math.round(den * 1000) / 10, nivel: level,
      fill: level === 'alto' ? '#EF4444' : level === 'medio' ? '#F59E0B' : '#10B981',
    };
  });
  const densityChartData = useMemo(() => _buildDensityData(displayedWeeks), [displayedWeeks, v2Micros]);

  const _buildDurationData = (weekList) => weekList.map(week => {
    const manualCal = planData.duration_chart?.[`calentamiento_${week}`];
    const manualPri = planData.duration_chart?.[`principal_${week}`];
    const manualVc = planData.duration_chart?.[`vueltaCalma_${week}`];
    if (manualCal !== undefined || manualPri !== undefined || manualVc !== undefined) {
      // Valores manuales en minutos (tiempo semanal)
      return {
        week: `S${week}`, weekNum: week,
        calentamiento: (manualCal || 0), principal: (manualPri || 0),
        vueltaCalma: (manualVc || 0),
        total: ((manualCal || 0) + (manualPri || 0) + (manualVc || 0)), sesiones: 0,
      };
    }
    const v2Micro = v2Micros.find(m => m.numero_semana === week);
    const sessions = v2Micro ? v2Sesiones.filter(s => s.microciclo_id === v2Micro.id) : [];
    const totalMin = sessions.reduce((s, se) => s + (se.duracion_minutos || 0), 0);
    const warmup = Math.round(totalMin * 0.15);
    const main = Math.round(totalMin * 0.70);
    return {
      week: `S${week}`, weekNum: week,
      calentamiento: warmup, principal: main, vueltaCalma: totalMin - warmup - main,
      total: totalMin, sesiones: sessions.length,
    };
  });
  const durationChartData = useMemo(() => _buildDurationData(displayedWeeks), [displayedWeeks, v2Micros, v2Sesiones, planData.duration_chart]);
  const durationChartDataFull = useMemo(() => _buildDurationData(weeks), [weeks, v2Micros, v2Sesiones, planData.duration_chart]);

  // Load existing plan
  useEffect(() => {
    const loadPlan = async () => {
      if (!athleteId) return;
      
      setLoading(true);
      const token = localStorage.getItem('train_token');
      
      try {
        const response = await axios.get(
          `${BACKEND_URL}/api/graphic-plan/${athleteId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data) {
          setGeneralInfo(response.data.generalInfo || generalInfo);
          setPlanData(response.data.planData || planData);
          setCycleDuration(response.data.cycleDuration || 'annual');
        }
      } catch (error) {
        if (error.response?.status !== 404) {
          console.error('Error loading plan:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadPlan();
  }, [athleteId]);

  // Save plan
  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('train_token');
    
    try {
      await axios.post(
        `${BACKEND_URL}/api/graphic-plan`,
        {
          athlete_id: athleteId,
          generalInfo,
          planData,
          cycleDuration
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(t('graphicPlan.plan_grafico_guardado_exitosamente'));
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error(t('graphicPlan.error_al_guardar_el_plan'));
    } finally {
      setSaving(false);
    }
  };

  // ── B1: Cargar plantilla del modelo (autollenado por fase, respeta ediciones manuales) ──
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Cargar catálogos (deportes + modelos de periodización) → mapas id→nombre
  useEffect(() => {
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };
    // Deportes (estructura anidada categoría→deportes; ambos tienen id+name)
    axios.get(`${BACKEND_URL}/api/sports/catalog`, { headers })
      .then(res => {
        const map = {};
        const walk = (o) => {
          if (Array.isArray(o)) { o.forEach(walk); return; }
          if (o && typeof o === 'object') {
            if (o.id && o.name) map[o.id] = o.name;
            Object.values(o).forEach(walk);
          }
        };
        walk(res.data);
        setSportMap(map);
      }).catch(() => {});
    // Modelos de periodización (id→name)
    axios.get(`${BACKEND_URL}/api/periodization-library`, { headers })
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : (res.data?.models || res.data?.items || []);
        const map = {};
        (items || []).forEach(m => { if (m && m.id && m.name) map[m.id] = m.name; });
        setModelMap(map);
      }).catch(() => {});
  }, []);

  // ═══ Niveles del deportista: topes de carga (warning no bloqueante) ═══
  const [levelCaps, setLevelCaps] = useState(null);
  const [levelName, setLevelName] = useState(null);
  useEffect(() => {
    const lvl = activePlan?.athlete_level;
    if (!lvl) { setLevelCaps(null); setLevelName(null); return; }
    const token = localStorage.getItem('train_token');
    const alias = { beginner: 'principiante', intermediate: 'semiprofesional', advanced: 'profesional', elite: 'elite' };
    axios.get(`${BACKEND_URL}/api/plan-templates/levels`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const levels = res.data?.levels || [];
        const key = levels.find(l => l.level === lvl) ? lvl : (alias[lvl] || lvl);
        const cfg = levels.find(l => l.level === key);
        if (cfg) {
          setLevelCaps({ max_load: cfg.max_load, max_volume: cfg.max_volume, max_intensity: cfg.max_intensity });
          setLevelName(cfg.name);
        } else { setLevelCaps(null); setLevelName(null); }
      })
      .catch(() => { setLevelCaps(null); setLevelName(null); });
  }, [activePlan?.athlete_level]);

  // Semanas cuya carga/volumen/intensidad exceden el tope del nivel (warning)
  const loadWarnings = useMemo(() => {
    if (!levelCaps) return [];
    const out = [];
    (loadChartDataFull || []).forEach(d => {
      if (d.carga > levelCaps.max_load) out.push({ week: d.weekNum, type: t('graphicPlan.carga', { defaultValue: 'Carga' }), value: Math.round(d.carga), max: levelCaps.max_load });
    });
    (volumeIntensityChartDataFull || []).forEach(d => {
      if (d.volumen > levelCaps.max_volume) out.push({ week: d.weekNum, type: t('graphicPlan.volumen', { defaultValue: 'Volumen' }), value: Math.round(d.volumen), max: levelCaps.max_volume });
      if (d.intensidad > levelCaps.max_intensity) out.push({ week: d.weekNum, type: t('graphicPlan.intensidad', { defaultValue: 'Intensidad' }), value: Math.round(d.intensidad), max: levelCaps.max_intensity });
    });
    return out.sort((a, b) => a.week - b.week);
  }, [levelCaps, loadChartDataFull, volumeIntensityChartDataFull, t]);


  const PREP_COMPONENTS = ['general_physical', 'specific_physical', 'technical', 'tactical', 'psychological', 'theoretical'];
  // Fallback de fase si el modelo no define exactamente esa fase genérica
  const PHASE_FALLBACK = {
    precompetitive: ['precompetitive', 'competitive', 'preparatory_specific'],
    competitive: ['competitive', 'precompetitive', 'preparatory_specific'],
    preparatory_specific: ['preparatory_specific', 'preparatory_general'],
    preparatory_general: ['preparatory_general', 'preparatory_specific'],
    transition: ['transition', 'preparatory_general'],
  };

  const handleLoadModelTemplate = async () => {
    const modelKey = activePlan?.model || generalInfo?.model;
    if (!modelKey) { toast.error(t('graphicPlan.no_hay_modelo')); return; }

    // Comprobar que hay fases por semana (periodización sincronizada)
    const phaseWeeks = weeks.filter(w => planData.phases?.[w]);
    if (phaseWeeks.length === 0) {
      toast.error(t('graphicPlan.configura_periodizacion_primero'));
      return;
    }
    if (!window.confirm(t('graphicPlan.confirmar_cargar_plantilla'))) return;

    setLoadingTemplate(true);
    try {
      const token = localStorage.getItem('train_token');
      const levelParam = activePlan?.athlete_level ? `?level=${encodeURIComponent(activePlan.athlete_level)}` : '';
      const res = await axios.get(`${BACKEND_URL}/api/plan-templates/${modelKey}${levelParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tplPhases = res.data?.phases || {};

      setPlanData(prev => {
        const manual = prev.manual_cells || {};
        const load_chart = { ...(prev.load_chart || {}) };
        const volint_chart = { ...(prev.volint_chart || {}) };
        const preparation = { ...(prev.preparation || {}) };
        const isManual = (section, rowId, w) => !!manual[`${section}:${rowId}:${w}`];
        const setIfNotManual = (obj, section, rowId, w, pct) => {
          if (isManual(section, rowId, w)) return;
          obj[`${rowId}_${w}`] = Math.round((pct / 10) * 10) / 10; // guarda 0–10 (×10 = %)
        };

        let filled = 0;
        phaseWeeks.forEach(w => {
          const phaseId = prev.phases[w];
          const chain = PHASE_FALLBACK[phaseId] || [phaseId];
          const phaseKey = chain.find(p => tplPhases[p]);
          const tpl = phaseKey ? tplPhases[phaseKey] : null;
          if (!tpl) return;
          setIfNotManual(load_chart, 'load_chart', 'carga', w, tpl.carga);
          setIfNotManual(load_chart, 'load_chart', 'recuperacion', w, tpl.recuperacion);
          setIfNotManual(volint_chart, 'volint_chart', 'volumen', w, tpl.volumen);
          setIfNotManual(volint_chart, 'volint_chart', 'intensidad', w, tpl.intensidad);
          PREP_COMPONENTS.forEach(c => setIfNotManual(preparation, 'preparation', c, w, (tpl.preparation || {})[c] || 0));
          filled++;
        });

        toast.success(`${t('graphicPlan.plantilla_cargada')} (${filled} ${t('graphicPlan.semanas')})`);
        return { ...prev, load_chart, volint_chart, preparation };
      });
    } catch (error) {
      console.error('Error loading model template:', error);
      toast.error(t('graphicPlan.error_cargar_plantilla'));
    } finally {
      setLoadingTemplate(false);
    }
  };


  // Export plan as image
  const [exportingImage, setExportingImage] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [expandedChart, setExpandedChart] = useState(null);
  // Offscreen capture: when set, renders an InteractiveChart in a hidden container
  // so we can capture an image of it without showing the dialog
  const [offscreenChart, setOffscreenChart] = useState(null);
  const offscreenRef = useRef(null);

  // Wait until offscreen chart is rendered, then capture & return base64 PNG
  const captureOffscreenChart = async (chartConfig) => {
    setOffscreenChart(chartConfig);
    // Wait for DOM render + Recharts ResponsiveContainer to size
    await new Promise(res => setTimeout(res, 600));
    const node = offscreenRef.current;
    if (!node) {
      setOffscreenChart(null);
      throw new Error('No se pudo renderizar el gráfico');
    }
    const canvas = await html2canvas(node, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    setOffscreenChart(null);
    return { imgData, canvas };
  };

  const handleChartDownload = async (chartConfig) => {
    setSharing(true);
    try {
      const { imgData } = await captureOffscreenChart(chartConfig);
      const slug = (chartConfig.title || 'grafica').replace(/\s+/g, '_').toLowerCase();
      const a = document.createElement('a');
      a.href = imgData;
      a.download = `${slug}_${activePlan?.name?.replace(/\s+/g, '_') || 'plan'}_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Imagen descargada');
    } catch (e) {
      console.error(e);
      toast.error(t('graphicPlan.error_al_descargar_la_grafica'));
    } finally { setSharing(false); }
  };

  const handleChartShareLink = async (chartConfig) => {
    setSharing(true);
    try {
      const { imgData } = await captureOffscreenChart(chartConfig);
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${BACKEND_URL}/api/graphic-plan/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: activePlan?.id, image_b64: imgData, plan_name: `${activePlan?.name || 'Plan'} · ${chartConfig.title}` })
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const fullUrl = `${window.location.origin}/api/graphic-plan/shared/${d.share_id}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success(t('graphicPlan.enlace_de_la_grafica_copiado'));
    } catch (e) {
      console.error(e);
      toast.error(t('graphicPlan.error_al_compartir_la_grafica'));
    } finally { setSharing(false); }
  };

  const handleChartShareWhatsApp = async (chartConfig) => {
    setSharing(true);
    try {
      const { imgData } = await captureOffscreenChart(chartConfig);
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${BACKEND_URL}/api/graphic-plan/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: activePlan?.id, image_b64: imgData, plan_name: `${activePlan?.name || 'Plan'} · ${chartConfig.title}` })
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const fullUrl = `${window.location.origin}/api/graphic-plan/shared/${d.share_id}`;
      const msg = encodeURIComponent(`📊 ${chartConfig.title}\n${activePlan?.name || ''}\n\n${fullUrl}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
      toast.success(t('graphicPlan.compartiendo_por_whatsapp'));
    } catch (e) {
      console.error(e);
      toast.error(t('graphicPlan.error_al_compartir'));
    } finally { setSharing(false); }
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      const planElement = document.querySelector('[data-testid="graphic-plan-content"]');
      if (!planElement) { toast.error(t('graphicPlan.no_se_encontro_el_plan_grafico')); return; }
      const canvas = await html2canvas(planElement, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      // jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.addImage(imgData, 'PNG', (pageW - w) / 2, (pageH - h) / 2, w, h);
      pdf.save(`plan_grafico_${generalInfo.athlete?.replace(/\s+/g, '_') || 'atleta'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF generado');
    } catch (e) {
      console.error(e); toast.error('Error generando PDF');
    } finally { setExportingPdf(false); }
  };

  const handleShareLink = async () => {
    setSharing(true);
    try {
      const planElement = document.querySelector('[data-testid="graphic-plan-content"]');
      if (!planElement) { toast.error(t('graphicPlan.no_se_encontro_el_plan_grafico')); return; }
      const canvas = await html2canvas(planElement, { backgroundColor: '#ffffff', scale: 1.5, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${BACKEND_URL}/api/graphic-plan/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: activePlan?.id, image_b64: imgData, plan_name: activePlan?.name || 'Plan' })
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const fullUrl = `${window.location.origin}/api/graphic-plan/shared/${d.share_id}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success(t('graphicPlan.enlace_copiado_al_portapapeles'));
    } catch { toast.error('Error compartiendo'); }
    setSharing(false);
  };

  const handleShareWhatsApp = async () => {
    setSharing(true);
    try {
      const planElement = document.querySelector('[data-testid="graphic-plan-content"]');
      if (!planElement) return;
      const canvas = await html2canvas(planElement, { backgroundColor: '#ffffff', scale: 1.5, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${BACKEND_URL}/api/graphic-plan/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: activePlan?.id, image_b64: imgData, plan_name: activePlan?.name || 'Plan' })
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const fullUrl = `${window.location.origin}/api/graphic-plan/shared/${d.share_id}`;
      const msg = encodeURIComponent(`📊 Plan Gráfico · ${activePlan?.name || ''}\n\n${fullUrl}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
      toast.success(t('graphicPlan.compartiendo_por_whatsapp'));
    } catch { toast.error('Error compartiendo'); }
    setSharing(false);
  };

  const handleExportAsImage = async () => {
    setExportingImage(true);
    try {
      // Find the plan content element
      const planElement = document.querySelector('[data-testid="graphic-plan-content"]');
      if (!planElement) {
        toast.error(t('graphicPlan.no_se_encontro_el_plan_grafico'));
        return;
      }
      
      const canvas = await html2canvas(planElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `plan_grafico_${generalInfo.athlete?.replace(/\s+/g, '_') || 'atleta'}_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Imagen exportada exitosamente');
    } catch (error) {
      console.error('Error exporting image:', error);
      toast.error(t('graphicPlan.error_al_exportar_imagen'));
    } finally {
      setExportingImage(false);
    }
  };

  // Cell click handler
  // ── Feature A helpers: unidades del Volumen por fila ──
  const getUnitCfg = (rowId) => {
    const fallback = { unit: CAPACITY_DEFAULT_UNIT[rowId] || 'pct', mode: 'label' };
    return { ...fallback, ...(planData.volume_units?.[rowId] || {}) };
  };
  const setUnitCfg = (rowId, patch) => {
    setPlanData(prev => ({
      ...prev,
      volume_units: {
        ...(prev.volume_units || {}),
        [rowId]: { ...{ unit: CAPACITY_DEFAULT_UNIT[rowId] || 'pct', mode: 'label' }, ...(prev.volume_units?.[rowId] || {}), ...patch },
      },
    }));
  };
  const getRealValue = (rowId, week) => {
    const v = planData.volume_values?.[`${rowId}_${week}`];
    return (v === undefined || v === null || v === '') ? null : Number(v);
  };
  const setRealValue = (rowId, week, val) => {
    setPlanData(prev => {
      const vv = { ...(prev.volume_values || {}) };
      if (val === '' || val === null || val === undefined || isNaN(Number(val))) delete vv[`${rowId}_${week}`];
      else vv[`${rowId}_${week}`] = Number(val);
      return { ...prev, volume_values: vv };
    });
  };

  // Adaptar datos de gráficas grandes/PDF: en filas en modo "valor real" usar el valor real.
  const _adaptChartForUnits = (fullData, weekList, rowIds) => {
    if (!rowIds.some(id => getUnitCfg(id).mode === 'value')) return fullData;
    return fullData.map((row, idx) => {
      const week = weekList[idx];
      const out = { ...row };
      rowIds.forEach(id => { if (getUnitCfg(id).mode === 'value') out[id] = getRealValue(id, week) || 0; });
      return out;
    });
  };
  const _adaptDataKeys = (baseKeys) => baseKeys.map(k => {
    const cfg = getUnitCfg(k.key);
    if (cfg.mode === 'value' && cfg.unit !== 'pct') {
      return { ...k, name: `${k.name.replace(/\s*%$/, '')} (${UNIT_SUFFIX[cfg.unit]})` };
    }
    return k;
  });
  const VOLINT_UNIT_ROWS = ['volumen'];
  const PHYS_UNIT_ROWS = ['endurance', 'strength', 'speed', 'coordination', 'flexibility'];
  const anyValueMode = (rowIds) => rowIds.some(id => getUnitCfg(id).mode === 'value');

  const handleCellClick = (section, rowId, weekIndex) => {
    setPlanData(prev => {
      const sectionData = { ...prev[section] };
      const key = `${rowId}_${weekIndex}`;
      
      // Toggle or cycle through values
      if (section === 'intensity' || section === 'volume' || section === 'preparation' || section === 'physical' || section === 'load_chart' || section === 'volint_chart' || section === 'duration_chart') {
        const currentValue = sectionData[key] || 0;
        sectionData[key] = currentValue >= 10 ? 0 : currentValue + 1;
      } else {
        sectionData[key] = !sectionData[key];
      }
      
      // Marcar la celda como editada manualmente
      const manual = { ...(prev.manual_cells || {}), [`${section}:${rowId}:${weekIndex}`]: true };
      return { ...prev, [section]: sectionData, manual_cells: manual };
    });
  };

  // Set cycle type for a week range
  const setCycleType = (section, typeId, startWeek, endWeek) => {
    setPlanData(prev => {
      const sectionData = { ...prev[section] };
      for (let w = startWeek; w <= endWeek; w++) {
        sectionData[w] = typeId;
      }
      return { ...prev, [section]: sectionData };
    });
  };

  // Navigation handlers
  const scrollLeft = () => {
    setViewOffset(prev => Math.max(0, prev - 4));
  };
  
  const scrollRight = () => {
    setViewOffset(prev => Math.min(totalWeeks - visibleWeeks, prev + 4));
  };

  // ═══ SPARKLINE ROW: Mini inline chart replacing colored cells ═══
  const SparklineRow = ({ label, section, rowId, color = '#3B82F6', maxVal = 5 }) => {
    const values = displayedWeeks.map(w => planData[section]?.[`${rowId}_${w}`] || 0);
    const hasData = values.some(v => v > 0);

    return (
      <tr>
        <td className="sticky left-0 bg-gray-50 px-2 py-0 text-xs border border-gray-300 z-10" style={{ width: 160 }}>
          {label}
        </td>
        {displayedWeeks.map((week, i) => {
          const v = values[i];
          if (!hasData) return <td key={`${section}-${rowId}-${week}`} className="border border-gray-200 p-0" style={{ height: 34 }} />;
          const barH = v > 0 ? Math.max(3, (v / maxVal) * 28) : 0;
          const opacity = v > 0 ? 0.35 + (v / maxVal) * 0.65 : 0;
          return (
            <td key={`${section}-${rowId}-${week}`} className="border border-gray-200 p-0 relative" style={{ height: 34 }} data-testid={`cell-${section}-${rowId}-${week}`}
              onClick={() => handleCellClick(section, rowId, week)}>
              <div className="absolute bottom-0 left-[2px] right-[2px] rounded-t-sm cursor-pointer transition-all hover:opacity-100"
                style={{ height: barH, backgroundColor: color, opacity }} />
              {v >= 3 && <span className="absolute top-0 left-0 right-0 text-center text-[8px] font-bold" style={{ color }}>{v}</span>}
            </td>
          );
        })}
      </tr>
    );
  };

  // ═══ BOOLEAN SPARKLINE ROW: Markers for events/monitoring ═══
  const BooleanSparklineRow = ({ label, section, rowId, color = '#3B82F6', icon }) => {
    return (
      <tr>
        <td className="sticky left-0 bg-gray-50 px-2 py-0 text-xs border border-gray-300 z-10" style={{ width: 160 }}>
          {label}
        </td>
        {displayedWeeks.map(week => {
          const isActive = planData[section]?.[`${rowId}_${week}`];
          return (
            <td key={`${section}-${rowId}-${week}`} className="border border-gray-200 p-0 text-center cursor-pointer" style={{ height: 24 }}
              onClick={() => handleCellClick(section, rowId, week)}
              data-testid={`cell-${section}-${rowId}-${week}`}>
              {isActive && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                    style={{ backgroundColor: color }}>
                    {icon || '✓'}
                  </div>
                </div>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  // Render intensity/volume cell (kept for backward compatibility)
  const renderLoadCell = (section, rowId, weekIndex) => {
    const key = `${rowId}_${weekIndex}`;
    const value = planData[section]?.[key] || 0;
    const levels = ['', 'bg-blue-200', 'bg-green-300', 'bg-yellow-400', 'bg-orange-500', 'bg-red-600'];
    
    return (
      <td
        key={`${section}-${rowId}-${weekIndex}`}
        className={`w-6 h-6 border border-gray-300 cursor-pointer hover:bg-gray-100 ${levels[value]}`}
        onClick={() => handleCellClick(section, rowId, weekIndex)}
        data-testid={`cell-${section}-${rowId}-${weekIndex}`}
      />
    );
  };

  // Render boolean cell
  // Devuelve el array de fechas de una celda (soporta legacy de fecha única)
  const getCellDates = (section, rowId, week) => {
    const arr = planData[section]?.[`${rowId}_dates_${week}`];
    if (Array.isArray(arr)) return arr.filter(Boolean);
    const single = planData[section]?.[`${rowId}_date_${week}`];
    return single ? [single] : [];
  };

  const renderBooleanCell = (section, rowId, weekIndex, activeColor = 'bg-blue-500', label = '') => {
    const key = `${rowId}_${weekIndex}`;
    const dates = getCellDates(section, rowId, weekIndex);
    const isActive = !!planData[section]?.[key] || dates.length > 0;
    const ddmm = (d) => d.split('-').slice(1).reverse().join('/');
    const tip = dates.length ? `${label}: ${dates.map(ddmm).join(', ')}` : `Asignar fecha(s) de ${label || rowId} (semana ${weekIndex})`;

    return (
      <td
        key={`${section}-${rowId}-${weekIndex}`}
        className={`relative w-6 h-6 border border-gray-300 cursor-pointer hover:bg-amber-100 ${isActive ? activeColor : ''}`}
        onClick={() => openCellDateModal(section, rowId, weekIndex, label, dates, isActive)}
        title={tip}
        data-testid={`cell-${section}-${rowId}-${weekIndex}`}
      >
        {dates.length > 1 && (
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-extrabold text-white leading-none">{dates.length}</span>
        )}
        {dates.length === 1 && (
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white leading-none">{ddmm(dates[0])}</span>
        )}
        {isActive && dates.length === 0 && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/70" />
        )}
      </td>
    );
  };

  // ═══ INLINE CHART ROW: Proportional bars perfectly aligned with week columns ═══
  const InlineChartRow = ({ label, data, dataKey, color, maxVal = 100, rowHeight = 40, onCellClick, section, enableUnits = false }) => {
    const rowId = dataKey;
    const cfg = enableUnits ? getUnitCfg(rowId) : null;
    const isValueMode = enableUnits && cfg?.mode === 'value';
    const suffix = enableUnits ? (UNIT_SUFFIX[cfg.unit] || '') : '';
    // En modo "valor real" la barra se escala al máximo real de la fila.
    const realVals = isValueMode ? displayedWeeks.map(w => getRealValue(rowId, w) || 0) : [];
    const realMax = isValueMode ? Math.max(1, ...realVals) : 1;
    return (
      <tr>
        <td className="sticky left-0 bg-gray-50 px-2 py-0 text-[10px] border border-gray-300 z-10" style={{ width: 160 }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="truncate flex-1">{label}{enableUnits && cfg.unit !== 'pct' ? ` (${suffix})` : ''}</span>
            {enableUnits && (
              <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <Select value={cfg.unit} onValueChange={(v) => setUnitCfg(rowId, { unit: v })}>
                  <SelectTrigger className="h-5 px-1 text-[9px] w-[58px] border-gray-300" data-testid={`unit-select-${rowId}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUME_UNITS.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">{u.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => setUnitCfg(rowId, { mode: isValueMode ? 'label' : 'value' })}
                  title={isValueMode ? 'Modo: valor real (clic para escala 1–10)' : 'Modo: escala 1–10 (clic para valor real)'}
                  data-testid={`unit-mode-${rowId}`}
                  className={`h-5 w-5 rounded text-[9px] font-bold flex items-center justify-center border ${isValueMode ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-500 border-gray-300'}`}
                >
                  {isValueMode ? '#' : '~'}
                </button>
              </div>
            )}
          </div>
        </td>
        {displayedWeeks.map((week, i) => {
          if (isValueMode) {
            const rv = getRealValue(rowId, week);
            const isEditing = editingCell && editingCell.rowId === rowId && editingCell.week === week;
            const barH = rv ? Math.max(2, (rv / realMax) * (rowHeight - 6)) : 0;
            return (
              <td key={`${dataKey}-${week}`}
                className="border border-gray-200 p-0 relative cursor-text hover:bg-emerald-50"
                style={{ height: rowHeight }}
                onClick={() => setEditingCell({ rowId, week })}
                data-testid={`chart-${dataKey}-${week}`}>
                {isEditing ? (
                  <input
                    type="number"
                    autoFocus
                    defaultValue={rv ?? ''}
                    onBlur={(e) => { setRealValue(rowId, week, e.target.value); setEditingCell(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { setRealValue(rowId, week, e.target.value); setEditingCell(null); } if (e.key === 'Escape') setEditingCell(null); }}
                    className="absolute inset-0 w-full h-full text-center text-[9px] outline-none border-2 border-emerald-500 z-10"
                    data-testid={`chart-input-${dataKey}-${week}`}
                  />
                ) : rv != null ? (
                  <>
                    <div className="absolute bottom-0 left-[1px] right-[1px] rounded-t-sm transition-all" style={{ height: barH, backgroundColor: color, opacity: 0.8 }} />
                    <span className="absolute top-[1px] left-0 right-0 text-center text-[7px] font-bold leading-none" style={{ color }}>{rv}</span>
                  </>
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-300">+</span>
                )}
              </td>
            );
          }
          const weekData = data[i];
          const value = weekData?.[dataKey] || 0;
          const effectiveMax = maxVal === 'auto' ? Math.max(1, ...data.map(d => d?.[dataKey] || 0)) : maxVal;
          const barH = effectiveMax > 0 ? Math.max(0, (value / effectiveMax) * (rowHeight - 6)) : 0;
          const isClickable = !!onCellClick;
          return (
            <td key={`${dataKey}-${week}`}
              className={`border border-gray-200 p-0 relative ${isClickable ? 'cursor-pointer hover:bg-gray-100 active:bg-gray-200' : ''}`}
              style={{ height: rowHeight }}
              onClick={isClickable ? () => onCellClick(section, dataKey, week) : undefined}
              data-testid={`chart-${dataKey}-${week}`}>
              {value > 0 && (
                <>
                  <div className="absolute bottom-0 left-[1px] right-[1px] rounded-t-sm transition-all"
                    style={{ height: barH, backgroundColor: color, opacity: 0.8 }} />
                  <span className="absolute top-[1px] left-0 right-0 text-center text-[7px] font-bold leading-none"
                    style={{ color }}>{Math.round(value)}</span>
                </>
              )}
              {isClickable && value === 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-[8px] text-gray-300">+</span>
              )}
            </td>
          );
        })}
      </tr>
    );
  };

  // ═══ CHART SECTION HEADER: Title row with expand button ═══
  const ChartSectionHeader = ({ title, icon: Icon, bgColor, textColor, chartConfig }) => {
    const slug = title.replace(/\s/g, '-').toLowerCase();
    return (
      <tr className={bgColor}>
        <td colSpan={displayedWeeks.length + 1} className={`px-2 py-1.5 font-bold ${textColor} border border-gray-300`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs">
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {title}
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleChartShareLink(chartConfig)}
                disabled={sharing}
                className="p-1 rounded hover:bg-black/10 transition-colors disabled:opacity-40"
                title={t('graphicPlan.compartir_enlace_de_la_grafica')}
                data-testid={`chart-share-${slug}`}
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleChartShareWhatsApp(chartConfig)}
                disabled={sharing}
                className="p-1 rounded hover:bg-emerald-200/40 text-emerald-700 transition-colors disabled:opacity-40"
                title={t('graphicPlan.compartir_por_whatsapp')}
                data-testid={`chart-whatsapp-${slug}`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleChartDownload(chartConfig)}
                disabled={sharing}
                className="p-1 rounded hover:bg-black/10 transition-colors disabled:opacity-40"
                title="Descargar imagen PNG"
                data-testid={`chart-download-${slug}`}
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setExpandedChart(chartConfig)}
                className="p-1 rounded hover:bg-black/10 transition-colors"
                title={t('graphicPlan.expandir_grafico_interactivo')}
                data-testid={`expand-chart-${slug}`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  };

  // Render cycle type row
  const renderCycleRow = (section, types) => {
    return (
      <tr>
        <td className="sticky left-0 bg-gray-100 px-2 py-1 text-xs font-medium border border-gray-300" style={{ width: 160 }}>
          {section === 'macrocycles' ? 'Macrociclo' : section === 'mesocycles' ? 'Mesociclo' : 'Microciclo'}
        </td>
        {displayedWeeks.map(week => {
          const typeId = planData[section]?.[week];
          const type = types.find(t => t.id === typeId);
          return (
            <td
              key={`${section}-${week}`}
              className={`w-6 h-6 border border-gray-300 cursor-pointer hover:opacity-80 ${type?.color || 'bg-white'}`}
              onClick={() => {
                // Cycle through types
                const currentIndex = types.findIndex(t => t.id === typeId);
                const nextIndex = (currentIndex + 1) % (types.length + 1);
                const nextType = nextIndex === types.length ? null : types[nextIndex];
                setPlanData(prev => ({
                  ...prev,
                  [section]: { ...prev[section], [week]: nextType?.id || null }
                }));
              }}
              title={type?.label || 'Click para seleccionar'}
              data-testid={`cell-${section}-${week}`}
            />
          );
        })}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto p-4' : ''}`}>
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-6 h-6" />{t('graphicPlan.plan_grafico_de_periodizacion')}</CardTitle>
            <div className="flex items-center gap-2">
              {periodizationData && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/10"
                  onClick={() => {
                    setHasImportedData(false);
                    importPeriodizationData(periodizationData);
                  }}
                  title={t('graphicPlan.reimportar_datos_de_periodizacion')}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sincronizar
                </Button>
              )}
              {hasImportedData && (
                <span className="text-xs bg-green-400 px-2 py-1 rounded-full">{t('graphicPlan.datos_importados')}</span>
              )}
              {(activePlan?.model || generalInfo?.model) && (
                <Button size="sm" variant="ghost" className="text-white hover:bg-amber-400/30"
                  onClick={handleLoadModelTemplate} disabled={loadingTemplate}
                  title={t('graphicPlan.cargar_plantilla_del_modelo')}
                  data-testid="load-model-template-btn">
                  {loadingTemplate ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Gauge className="w-4 h-4 mr-1" />}
                  {t('graphicPlan.cargar_plantilla')}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10"
                onClick={handleExportPDF} disabled={exportingPdf}
                data-testid="graphic-plan-pdf-btn">
                {exportingPdf ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                PDF
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/10"
                onClick={handleShareLink} disabled={sharing}
                data-testid="graphic-plan-link-btn">
                {sharing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Link2 className="w-4 h-4 mr-1" />}
                Enlace
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-green-500/30"
                onClick={handleShareWhatsApp} disabled={sharing}
                data-testid="graphic-plan-whatsapp-btn">
                <Send className="w-4 h-4 mr-1" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/10"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>
              <Button
                size="sm"
                className="bg-indigo-500 hover:bg-indigo-600"
                onClick={handleExportAsImage}
                disabled={exportingImage}
                data-testid="export-image-btn"
              >
                {exportingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
                <span className="ml-1">Imagen</span>
              </Button>
              <Button
                size="sm"
                className="bg-green-500 hover:bg-green-600"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-1">{t('graphicPlan.guardar')}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4" data-testid="graphic-plan-content">
          {/* Modo Equipo: las fechas se replican a todos los atletas del equipo */}
          {Array.isArray(teamAthleteIds) && teamAthleteIds.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-blue-300 bg-blue-50 flex items-start gap-3" data-testid="graphic-team-mode-banner">
              <Users className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-800">Modo Equipo{teamName ? ` · ${teamName}` : ''}</p>
                <p className="text-xs text-blue-700">Las fechas de Eventos/Competencias y Monitoreo que asignes se replicarán al calendario de los {teamAthleteIds.length} atletas del equipo.</p>
              </div>
            </div>
          )}
          {/* B3: Alerta de conflicto de fechas */}
          {dateConflict && (
            <div className="mb-4 p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-3" data-testid="date-conflict-alert">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-800">{t('graphicPlan.conflicto_de_fechas')}</p>
                <p className="text-xs text-amber-700">{dateConflict.message}</p>
              </div>
              {dateConflict.suggestWeeks && (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0"
                  onClick={handleAutoAdjustDuration} disabled={adjustingDuration}
                  data-testid="auto-adjust-duration-btn">
                  {adjustingDuration ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                  {t('graphicPlan.ajustar_automaticamente')}
                </Button>
              )}
            </div>
          )}
          {/* Advertencia de exceso de carga según nivel del deportista (no bloqueante) */}
          {levelCaps && loadWarnings.length > 0 && (
            <div className="mb-4 p-3 rounded-lg border border-orange-300 bg-orange-50 flex items-start gap-3" data-testid="level-load-warning">
              <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-800">
                  {t('graphicPlan.exceso_carga_nivel', { defaultValue: 'Cargas por encima del nivel' })}
                  {levelName ? ` · ${levelName}` : ''}
                </p>
                <p className="text-xs text-orange-700 mb-1">
                  {t('graphicPlan.exceso_carga_nivel_desc', { defaultValue: 'Estas semanas superan el tope sugerido para el nivel del deportista (tope carga {{l}}% · vol {{v}}% · int {{i}}%):', l: levelCaps.max_load, v: levelCaps.max_volume, i: levelCaps.max_intensity })}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {loadWarnings.slice(0, 24).map((w, idx) => (
                    <span key={idx} className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-200 text-orange-800" data-testid={`level-warning-chip-${idx}`}>
                      S{w.week} · {w.type} {w.value}% &gt; {w.max}%
                    </span>
                  ))}
                  {loadWarnings.length > 24 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-orange-200 text-orange-800">+{loadWarnings.length - 24}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">{t('graphicPlan.deporte')}</label>
                <Input
                  value={generalInfo.sport}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, sport: e.target.value })}
                  placeholder={t('graphicPlan.deporte')}
                  className="h-8 text-sm"
                  data-testid="input-sport"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">{t('graphicPlan.categoria')}</label>
                <Input
                  value={generalInfo.category}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, category: e.target.value })}
                  placeholder={t('graphicPlan.categoria')}
                  className="h-8 text-sm"
                  data-testid="input-category"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">{t('graphicPlan.atleta')}</label>
                <Input
                  value={generalInfo.athlete}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, athlete: e.target.value })}
                  placeholder={t('graphicPlan.atleta')}
                  className="h-8 text-sm"
                  data-testid="input-athlete"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Entrenador</label>
                <Input
                  value={generalInfo.coach}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, coach: e.target.value })}
                  placeholder="Entrenador"
                  className="h-8 text-sm"
                  data-testid="input-coach"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">{t('graphicPlan.tipo_de_periodizacion')}</label>
                <Select 
                  value={generalInfo.periodizationType} 
                  onValueChange={(v) => setGeneralInfo({ ...generalInfo, periodizationType: v })}
                >
                  <SelectTrigger className="h-8 text-sm" data-testid="input-periodization-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tradicional">Tradicional</SelectItem>
                    <SelectItem value="atr">ATR</SelectItem>
                    <SelectItem value="bloques">{t('graphicPlan.por_bloques')}</SelectItem>
                    <SelectItem value="ondulante">Ondulante</SelectItem>
                    <SelectItem value="lineal">Lineal</SelectItem>
                    <SelectItem value="polarizado">Polarizado</SelectItem>
                    <SelectItem value="pdi">PDI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">{t('graphicPlan.duracion')}</label>
                <Input
                  value={generalInfo.duration}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, duration: e.target.value })}
                  placeholder={t('graphicPlan.duracion')}
                  className="h-8 text-sm"
                  data-testid="input-duration"
                  readOnly={!!activePlan?.total_weeks}
                  title={activePlan?.total_weeks ? 'Calculado automáticamente desde el plan activo' : ''}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">{t('graphicPlan.modelo_de_entrenamiento')}</label>
                <Input
                  value={generalInfo.model}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, model: e.target.value })}
                  placeholder="Modelo"
                  className="h-8 text-sm"
                  data-testid="input-model"
                  readOnly={!!activePlan?.model_name}
                  title={activePlan?.model_name ? 'Auto-rellenado desde el plan activo' : ''}
                />
              </div>
            </div>
          </div>

          {/* Main Grid */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
              {/* Week Numbers Header */}
              <thead>
                <tr className="bg-gray-200">
                  <th className="sticky left-0 bg-gray-200 px-2 py-1 border border-gray-300 text-left" style={{ width: 160 }}>{t('graphicPlan.semana')}</th>
                  {displayedWeeks.map(week => {
                    const startDate = activePlan?.start_date ? new Date(activePlan.start_date) : null;
                    let weekDate = '';
                    if (startDate && !isNaN(startDate.getTime())) {
                      const d = new Date(startDate);
                      d.setDate(d.getDate() + (week - 1) * 7);
                      weekDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                    }
                    return (
                      <th key={week} className="border border-gray-300 text-center font-medium px-1 py-1" style={{ minWidth: 38 }}>
                        <div className="text-xs font-bold text-slate-900">{week}</div>
                        {weekDate && <div className="text-[9px] font-normal text-slate-500 tabular-nums leading-tight">{weekDate}</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              
              <tbody>
                {/* ETAPA rows (at the top as requested) */}
                <tr>
                  <td className="sticky left-0 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800 border border-gray-300" style={{ width: 160 }}>
                    Etapa
                  </td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.periods?.[week];
                    const colors = { preparatorio: 'bg-blue-200', competitivo: 'bg-green-200', transicion: 'bg-orange-200' };
                    const labels = { preparatorio: 'Prep', competitivo: 'Comp', transicion: 'Trans' };
                    return (
                      <td
                        key={`etapa-${week}`}
                        className={`border border-gray-300 cursor-pointer text-center text-[8px] font-medium ${colors[typeId] || ''}`}
                        onClick={() => {
                          const types = ['preparatorio', 'competitivo', 'transicion', null];
                          const currentIndex = types.indexOf(typeId);
                          const nextType = types[(currentIndex + 1) % types.length];
                          setPlanData(prev => ({
                            ...prev,
                            periods: { ...prev.periods, [week]: nextType }
                          }));
                        }}
                        data-testid={`cell-etapa-${week}`}
                      >
                        {labels[typeId] || ''}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="sticky left-0 bg-amber-50/60 px-2 py-1 text-xs border border-gray-300" style={{ width: 160 }}>{t('graphicPlan.tipo_de_etapa')}</td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.phases?.[week];
                    const type = MACROCYCLE_TYPES.find(t => t.id === typeId);
                    return (
                      <td
                        key={`tipo-etapa-${week}`}
                        className={`border border-gray-300 cursor-pointer text-center text-[7px] ${type?.color || ''}`}
                        onClick={() => {
                          const currentIndex = MACROCYCLE_TYPES.findIndex(t => t.id === typeId);
                          const nextIndex = (currentIndex + 1) % (MACROCYCLE_TYPES.length + 1);
                          const nextType = nextIndex === MACROCYCLE_TYPES.length ? null : MACROCYCLE_TYPES[nextIndex];
                          setPlanData(prev => ({
                            ...prev,
                            phases: { ...prev.phases, [week]: nextType?.id || null }
                          }));
                        }}
                        data-testid={`cell-tipo-etapa-${week}`}
                      >
                        {type?.label?.substring(0, 6) || ''}
                      </td>
                    );
                  })}
                </tr>

                {/* CYCLE SECTION */}
                <tr className="bg-blue-50">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-blue-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Ciclo
                    </div>
                  </td>
                </tr>
                
                {/* Macrocycle */}
                {renderCycleRow('macrocycles', MACROCYCLE_TYPES)}
                
                {/* Tipo de macrociclo (text labels) */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">{t('graphicPlan.tipo_de_macrociclo')}</td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.macrocycles?.[week];
                    const type = MACROCYCLE_TYPES.find(t => t.id === typeId);
                    return (
                      <td key={`macro-type-${week}`} className="border border-gray-300 text-center text-[7px]">
                        {type?.label?.substring(0, 6) || ''}
                      </td>
                    );
                  })}
                </tr>
                
                {/* Macrocycle Duration */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">{t('graphicPlan.duracion_del_macrociclo')}</td>
                  {displayedWeeks.map(week => {
                    // Find which macro this week belongs to and show its duration
                    let durLabel = '';
                    let durColor = '';
                    v2Macros.forEach(macro => {
                      const mesos = v2Mesos.filter(m => m.macrociclo_id === macro.id);
                      const micros = [];
                      mesos.forEach(meso => {
                        v2Micros.filter(m => m.mesociclo_id === meso.id).forEach(m => micros.push(m));
                      });
                      const weekNums = micros.map(m => m.numero_semana).filter(Boolean);
                      if (weekNums.includes(week)) {
                        durLabel = `${macro.duracion_semanas || weekNums.length}`;
                        durColor = 'bg-slate-100';
                      }
                    });
                    return (
                      <td key={`macro-dur-${week}`} className={`w-6 h-4 border border-gray-300 text-center text-[9px] font-medium text-slate-500 ${durColor}`}>
                        {durLabel}
                      </td>
                    );
                  })}
                </tr>
                
                {/* Mesocycle */}
                {renderCycleRow('mesocycles', MESOCYCLE_TYPES)}
                
                {/* Month indicator */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Mes
                  </td>
                  {displayedWeeks.map(week => (
                    <td key={`month-${week}`} className="w-6 h-4 border border-gray-300 text-center text-[10px]">
                      {Math.ceil(week / 4)}
                    </td>
                  ))}
                </tr>
                
                {/* Microcycle */}
                {(() => {
                  // Construir mapping week → meso con un contador cumulativo
                  // (los microcycles del backend a veces traen week_number duplicados;
                  //  por eso siempre asignamos posiciones secuenciales 1..N a través
                  //  del plan completo)
                  const weekToMeso = {};
                  let weekCounter = 1;
                  (activePlan?.macrocycles || []).forEach((macro, mi) => {
                    (macro.mesocycles || []).forEach((meso, mei) => {
                      const microsCount = (meso.microcycles || []).length;
                      if (microsCount === 0) return;
                      const mesoWeeks = Array.from({ length: microsCount }, (_, idx) => weekCounter + idx);
                      const startWeek = mesoWeeks[0];
                      const colorPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                      const fallbackColor = colorPalette[(mi * 3 + mei) % colorPalette.length];
                      mesoWeeks.forEach(w => {
                        weekToMeso[w] = {
                          meso, mesoIdx: mei, macroIdx: mi, startWeek,
                          color: meso.color || fallbackColor,
                        };
                      });
                      weekCounter += microsCount;
                    });
                  });
                  if (Object.keys(weekToMeso).length === 0) return null;
                  return (
                    <tr data-testid="gp-mev-projection-row">
                      <td className="sticky left-0 bg-cyan-50 px-2 py-1 text-[11px] font-semibold border border-gray-300 text-cyan-700" style={{ width: 160 }}>
                        <span className="flex items-center gap-1.5">
                          <BarChart3 className="w-3 h-3" />{t('graphicPlan.proyeccion')}</span>
                      </td>
                      {displayedWeeks.map(week => {
                        const info = weekToMeso[week];
                        const isStart = info && info.startWeek === week;
                        const inMeso = !!info;
                        if (!inMeso) {
                          return <td key={`mev-${week}`} className="w-6 h-6 border border-gray-300 bg-slate-50/40" />;
                        }
                        return (
                          <td
                            key={`mev-${week}`}
                            className="w-6 h-6 border border-gray-300 relative"
                            style={{ background: `${info.color}10` }}
                            title={`Mesociclo: ${info.meso.name || `M${info.mesoIdx + 1}`}`}
                          >
                            {isStart && (
                              <button
                                onClick={() => setMevChartMeso(info.meso)}
                                className="absolute inset-0 flex items-center justify-center hover:bg-cyan-100/60 transition-colors group"
                                data-testid={`gp-mev-btn-${info.macroIdx}-${info.mesoIdx}`}
                                title={`Ver proyección MEV → MAV → MRV de ${info.meso.name || 'mesociclo'}`}
                              >
                                <span
                                  className="flex items-center justify-center w-5 h-5 rounded-md text-white font-black text-[8px] shadow-sm group-hover:scale-110 transition-transform"
                                  style={{ background: info.color }}
                                >
                                  <BarChart3 className="w-3 h-3" strokeWidth={2.5} />
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })()}

                {/* Microcycle */}
                {renderCycleRow('microcycles', MICROCYCLE_TYPES)}
                
                {/* Microcycle type */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">{t('graphicPlan.tipo_de_microciclo')}</td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.microcycles?.[week];
                    const type = MICROCYCLE_TYPES.find(t => t.id === typeId);
                    return (
                      <td key={`micro-type-${week}`} className="w-6 h-4 border border-gray-300 text-center text-[8px]">
                        {type?.label?.substring(0, 3) || ''}
                      </td>
                    );
                  })}
                </tr>

                {/* Training frequency (moved up) */}
                <tr>
                  <td className="sticky left-0 bg-gray-100 px-2 py-1 text-xs font-medium border border-gray-300">{t('graphicPlan.frecuencia_de_entrenamiento')}</td>
                  {displayedWeeks.map(week => (
                    <td key={`freq-${week}`} className="w-6 h-6 border border-gray-300">
                      <input
                        type="text"
                        className="w-full h-full text-center text-xs border-0 bg-transparent"
                        maxLength={1}
                        value={planData.frequency?.[week] || ''}
                        onChange={(e) => {
                          setPlanData(prev => ({
                            ...prev,
                            frequency: { ...prev.frequency, [week]: e.target.value }
                          }));
                        }}
                      />
                    </td>
                  ))}
                </tr>

                {/* EVENTS ROW (moved up) */}
                <tr className="bg-purple-50">
                  <td className="sticky left-0 bg-purple-50 px-2 py-1 text-xs font-bold text-purple-800 border border-gray-300">
                    Eventos / Competencias
                  </td>
                  {displayedWeeks.map(week => {
                    const weekEvents = eventsByWeek[week] || [];
                    const hasEvent = weekEvents.length > 0;
                    const isMainComp = weekEvents.some(e => e.priority === 'high');
                    const isCompetition = weekEvents.some(e => e.type === 'competition' || e.priority === 'high');
                    return (
                      <td 
                        key={`ev-${week}`} 
                        className={`border border-gray-300 text-center cursor-pointer relative group ${
                          hasEvent 
                            ? isMainComp ? 'bg-red-500 text-white font-bold'
                              : isCompetition ? 'bg-amber-400 text-amber-900 font-bold' 
                              : 'bg-purple-200 text-purple-800'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                        style={{ padding: hasEvent ? '2px' : '4px' }}
                      >
                        {hasEvent && (
                          <>
                            <span className="text-sm leading-none">{isMainComp ? '🏆' : isCompetition ? '🥇' : '📅'}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none" style={{minWidth: '180px'}}>
                              <div className="bg-slate-900 text-white rounded-lg shadow-xl p-2.5 text-left" style={{fontSize: '11px'}}>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900" />
                                {weekEvents.map((ev, i) => (
                                  <div key={i} className={i > 0 ? 'mt-2 pt-2 border-t border-slate-700' : ''}>
                                    <div className="font-bold text-white leading-tight">{ev.name}</div>
                                    {ev.date && <div className="text-slate-400 text-[10px]">{new Date(ev.date).toLocaleDateString('es-ES', {day: 'numeric', month: 'short'})}</div>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ACTIVITY TYPE sub-rows with colored squares */}
                {ACTIVITY_TYPES.map(act => {
                  const isComp = act.id === 'main_competition' || act.id === 'secondary_competition';
                  return (
                  <tr key={`act-${act.id}`} className="bg-purple-50/50">
                    <td className="sticky left-0 bg-purple-50/50 px-2 py-0 text-[10px] border border-gray-300 z-10 pl-4" style={{ width: 160 }}>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${act.color}`} />
                        {act.label}
                      </div>
                    </td>
                    {displayedWeeks.map(week => {
                      if (isComp) {
                        const active = !!planData.activities?.[`${act.id}_${week}`];
                        return (
                          <td key={`${act.id}-${week}`}
                            className={`w-6 h-6 border border-gray-300 cursor-pointer hover:bg-amber-100 ${active ? act.color : ''}`}
                            onClick={() => openCompModal(act.id, week)}
                            title={`Asignar fecha de ${act.label.toLowerCase()} (semana ${week})`}
                            data-testid={`comp-cell-${act.id}-${week}`}
                          />
                        );
                      }
                      return renderBooleanCell('activities', act.id, week, act.color, act.label);
                    })}
                  </tr>
                  );
                })}

                {/* MONITORING (moved up, compact) */}
                <tr className="bg-cyan-50">
                  <td className="sticky left-0 bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-800 border border-gray-300">
                    Monitoreo / Evaluaciones
                  </td>
                  {displayedWeeks.map(week => {
                    const checks = MONITORING_AREAS.filter(a => planData.monitoring?.[`${a.id}_${week}`]);
                    const colors = { medical: '#DC2626', anthropometric: '#06B6D4', physical: '#EA580C', biomechanical: '#10B981', technical: '#CA8A04', tactical: '#16A34A', psychological: '#2563EB', theoretical: '#9333EA' };
                    return (
                      <td key={`mon-${week}`} className="border border-gray-300 p-0 text-center" style={{ height: 24 }}>
                        {checks.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-[1px] py-0.5">
                            {checks.map(c => (
                              <div key={c.id} className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[c.id] || '#94A3B8' }} title={c.label} />
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* MONITORING AREA sub-rows with colored squares */}
                {MONITORING_AREAS.map(area => {
                  const monColors = { medical: 'bg-red-500', anthropometric: 'bg-cyan-500', physical: 'bg-orange-500', biomechanical: 'bg-emerald-500', technical: 'bg-yellow-500', tactical: 'bg-green-500', psychological: 'bg-blue-500', theoretical: 'bg-purple-500' };
                  return (
                    <tr key={`mon-${area.id}`} className="bg-cyan-50/50">
                      <td className="sticky left-0 bg-cyan-50/50 px-2 py-0 text-[10px] border border-gray-300 z-10 pl-4" style={{ width: 160 }}>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${monColors[area.id] || 'bg-slate-200'}`} />
                          {area.label}
                        </div>
                      </td>
                      {displayedWeeks.map(week => renderBooleanCell('monitoring', area.id, week, monColors[area.id] || 'bg-slate-400', area.label))}
                    </tr>
                  );
                })}

                {/* ══════════ INLINE CHARTS — perfectly aligned with week columns ══════════ */}

                {/* CHART 1: Magnitud de Carga y Recuperación */}
                <ChartSectionHeader
                  title={t('graphicPlan.magnitud_de_carga_y_recuperacion')}
                  icon={Activity}
                  bgColor="bg-red-50"
                  textColor="text-red-800"
                  chartConfig={{
                    title: 'Magnitud de Carga y Recuperacion',
                    icon: Activity,
                    data: loadChartDataFull,
                    dataKeys: [
                      { key: 'carga', name: 'Carga %', color: '#EF4444' },
                      { key: 'recuperacion', name: 'Recuperacion %', color: '#3B82F6' }
                    ],
                    chartType: 'bar',
                    yAxisDomain: [0, 100]
                  }}
                />
                <InlineChartRow label="Carga %" data={loadChartData} dataKey="carga" color="#EF4444" maxVal={100} onCellClick={handleCellClick} section="load_chart" />
                <InlineChartRow label="Recuperación %" data={loadChartData} dataKey="recuperacion" color="#3B82F6" maxVal={100} onCellClick={handleCellClick} section="load_chart" />

                {/* CHART 2: Volumen, Intensidad y Densidad */}
                <ChartSectionHeader
                  title={t('graphicPlan.volumen_e_intensidad')}
                  icon={TrendingUp}
                  bgColor="bg-green-50"
                  textColor="text-green-800"
                  chartConfig={{
                    title: 'Volumen, Intensidad y Densidad',
                    icon: TrendingUp,
                    data: _adaptChartForUnits(volumeIntensityChartDataFull, weeks, VOLINT_UNIT_ROWS),
                    dataKeys: _adaptDataKeys([
                      { key: 'volumen', name: 'Volumen %', color: '#22C55E' },
                      { key: 'intensidad', name: 'Intensidad %', color: '#EF4444' }
                    ]),
                    chartType: 'line',
                    yAxisDomain: anyValueMode(VOLINT_UNIT_ROWS) ? [0, 'auto'] : [0, 100]
                  }}
                />
                <InlineChartRow label="Volumen %" data={volumeIntensityChartData} dataKey="volumen" color="#22C55E" maxVal={100} onCellClick={handleCellClick} section="volint_chart" enableUnits />
                <InlineChartRow label="Intensidad %" data={volumeIntensityChartData} dataKey="intensidad" color="#EF4444" maxVal={100} onCellClick={handleCellClick} section="volint_chart" />

                {/* CHART 2: Preparación por Componentes */}
                <ChartSectionHeader
                  title={t('graphicPlan.preparacion_por_componentes')}
                  icon={Dumbbell}
                  bgColor="bg-indigo-50"
                  textColor="text-indigo-800"
                  chartConfig={{
                    title: 'Preparacion por Componentes',
                    icon: Dumbbell,
                    data: preparationChartDataFull,
                    dataKeys: [
                      { key: 'general_physical', name: 'Física General', color: '#2563EB' },
                      { key: 'specific_physical', name: 'Física Específica', color: '#6366F1' },
                      { key: 'technical', name: 'Técnica', color: '#16A34A' },
                      { key: 'tactical', name: 'Táctica', color: '#F59E0B' },
                      { key: 'psychological', name: 'Psicológica', color: '#A855F7' },
                      { key: 'theoretical', name: 'Teórica', color: '#EC4899' }
                    ],
                    chartType: 'area',
                    yAxisDomain: [0, 100]
                  }}
                />
                <InlineChartRow label="Física General" data={preparationChartData} dataKey="general_physical" color="#2563EB" maxVal={100} onCellClick={handleCellClick} section="preparation" />
                <InlineChartRow label="Física Específica" data={preparationChartData} dataKey="specific_physical" color="#6366F1" maxVal={100} onCellClick={handleCellClick} section="preparation" />
                <InlineChartRow label="Técnica" data={preparationChartData} dataKey="technical" color="#16A34A" maxVal={100} onCellClick={handleCellClick} section="preparation" />
                <InlineChartRow label="Táctica" data={preparationChartData} dataKey="tactical" color="#F59E0B" maxVal={100} onCellClick={handleCellClick} section="preparation" />
                <InlineChartRow label="Psicológica" data={preparationChartData} dataKey="psychological" color="#A855F7" maxVal={100} onCellClick={handleCellClick} section="preparation" />
                <InlineChartRow label="Teórica" data={preparationChartData} dataKey="theoretical" color="#EC4899" maxVal={100} onCellClick={handleCellClick} section="preparation" />

                {/* CHART 3: Preparación Física por Capacidades */}
                <ChartSectionHeader
                  title={t('graphicPlan.capacidades_fisicas')}
                  icon={Heart}
                  bgColor="bg-orange-50"
                  textColor="text-orange-800"
                  chartConfig={{
                    title: 'Preparacion Fisica por Capacidades',
                    icon: Heart,
                    data: _adaptChartForUnits(physicalChartDataFull, weeks, PHYS_UNIT_ROWS),
                    dataKeys: _adaptDataKeys([
                      { key: 'endurance', name: 'Resistencia', color: '#DC2626' },
                      { key: 'strength', name: 'Fuerza', color: '#EA580C' },
                      { key: 'speed', name: 'Velocidad', color: '#CA8A04' },
                      { key: 'coordination', name: 'Coordinación', color: '#16A34A' },
                      { key: 'flexibility', name: 'Flexibilidad', color: '#3B82F6' }
                    ]),
                    chartType: 'line',
                    yAxisDomain: anyValueMode(PHYS_UNIT_ROWS) ? [0, 'auto'] : [0, 100]
                  }}
                />
                <InlineChartRow label="Resistencia" data={physicalChartData} dataKey="endurance" color="#DC2626" maxVal={100} onCellClick={handleCellClick} section="physical" enableUnits />
                <InlineChartRow label="Fuerza" data={physicalChartData} dataKey="strength" color="#EA580C" maxVal={100} onCellClick={handleCellClick} section="physical" enableUnits />
                <InlineChartRow label="Velocidad" data={physicalChartData} dataKey="speed" color="#CA8A04" maxVal={100} onCellClick={handleCellClick} section="physical" enableUnits />
                <InlineChartRow label="Coordinación" data={physicalChartData} dataKey="coordination" color="#16A34A" maxVal={100} onCellClick={handleCellClick} section="physical" enableUnits />
                <InlineChartRow label="Flexibilidad" data={physicalChartData} dataKey="flexibility" color="#3B82F6" maxVal={100} onCellClick={handleCellClick} section="physical" enableUnits />

                {/* CHART 4: Duración y Actividad Semanal */}
                <ChartSectionHeader
                  title={t('graphicPlan.duracion_y_actividad')}
                  icon={Timer}
                  bgColor="bg-teal-50"
                  textColor="text-teal-800"
                  chartConfig={{
                    title: 'Duracion y Actividad Semanal',
                    icon: Timer,
                    data: durationChartDataFull,
                    dataKeys: [
                      { key: 'calentamiento', name: 'Calentamiento', color: '#FBBF24' },
                      { key: 'principal', name: 'Parte principal', color: '#3B82F6' },
                      { key: 'vueltaCalma', name: 'Vuelta a la calma', color: '#14B8A6' }
                    ],
                    chartType: 'bar',
                    yAxisDomain: [0, 'auto']
                  }}
                />
                <InlineChartRow label="Calentamiento (min)" data={durationChartData} dataKey="calentamiento" color="#FBBF24" maxVal="auto" onCellClick={handleCellClick} section="duration_chart" />
                <InlineChartRow label="Parte principal (min)" data={durationChartData} dataKey="principal" color="#3B82F6" maxVal="auto" onCellClick={handleCellClick} section="duration_chart" />
                <InlineChartRow label="Vuelta a la calma (min)" data={durationChartData} dataKey="vueltaCalma" color="#14B8A6" maxVal="auto" onCellClick={handleCellClick} section="duration_chart" />

              </tbody>
            </table>
          </div>

          {/* Dialog: MEV→MAV→MRV chart por mesociclo */}
          <Dialog open={!!mevChartMeso} onOpenChange={(o) => !o && setMevChartMeso(null)}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#CCFF00]/15 border border-[#CCFF00]/40 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-[#CCFF00]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base tracking-tight">{t('graphicPlan.proyeccion_mev_mav_mrv')}</h3>
                    <p className="text-[11px] text-slate-300">{mevChartMeso?.name || 'Mesociclo'} · {(mevChartMeso?.microcycles || []).length} microciclos</p>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-slate-50 max-h-[70vh] overflow-y-auto">
                {mevChartMeso && (
                  <MesoMevMavMrvChart
                    microcycles={mevChartMeso.microcycles || []}
                    testId="dialog-mev-chart"
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Navigation Slider Bar — sticky at bottom while scrolling through table */}
          <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-sm border-t py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]" data-testid="week-slider-nav">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-3">
                <Select value={cycleDuration} onValueChange={setCycleDuration}>
                  <SelectTrigger className="w-48 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CYCLE_DURATIONS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  S{viewOffset + 1} — S{Math.min(viewOffset + visibleWeeks, totalWeeks)} de {totalWeeks}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[12, 24, 36, 52].map(n => (
                  <button
                    key={n}
                    onClick={() => { setVisibleWeeks(n); setViewOffset(Math.min(viewOffset, Math.max(0, totalWeeks - n))); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${visibleWeeks === n ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >{n}s</button>
                ))}
              </div>
            </div>
            <div className="relative h-7 select-none" data-testid="week-slider-track">
              <div className="absolute inset-x-0 top-2.5 h-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full overflow-hidden">
                {(() => {
                  const bands = [];
                  let lastPhase = null;
                  let bandStart = 0;
                  const phaseColors = {
                    preparatory_general: '#3B82F6', preparatory_specific: '#8B5CF6',
                    precompetitive: '#F59E0B', competitive: '#10B981', transition: '#94A3B8'
                  };
                  for (let w = 1; w <= totalWeeks; w++) {
                    const phase = planData.phases?.[w] || null;
                    if (phase !== lastPhase) {
                      if (lastPhase && bandStart > 0) {
                        bands.push({ start: bandStart, end: w - 1, color: phaseColors[lastPhase] || '#E2E8F0' });
                      }
                      bandStart = w;
                      lastPhase = phase;
                    }
                  }
                  if (lastPhase) bands.push({ start: bandStart, end: totalWeeks, color: phaseColors[lastPhase] || '#E2E8F0' });
                  return bands.map((b, i) => (
                    <div key={i} className="absolute top-0 h-full" style={{
                      left: `${((b.start - 1) / totalWeeks) * 100}%`,
                      width: `${((b.end - b.start + 1) / totalWeeks) * 100}%`,
                      backgroundColor: b.color,
                      opacity: 0.5
                    }} />
                  ));
                })()}
              </div>
              {Array.from({ length: Math.min(totalWeeks, 52) }, (_, i) => {
                const w = Math.round((i / Math.min(totalWeeks - 1, 51)) * (totalWeeks - 1)) + 1;
                const showLabel = totalWeeks <= 52 ? (w % 4 === 0 || w === 1) : (w % 8 === 0 || w === 1);
                return showLabel ? (
                  <div key={w} className="absolute top-0 text-[8px] text-slate-400 font-medium" style={{ left: `${((w - 1) / totalWeeks) * 100}%`, transform: 'translateX(-50%)' }}>
                    {w}
                  </div>
                ) : null;
              })}
              <div
                className="absolute top-1 h-5 rounded-full cursor-grab active:cursor-grabbing shadow-md border-2 border-white"
                style={{
                  left: `${(viewOffset / totalWeeks) * 100}%`,
                  width: `${Math.max(4, (visibleWeeks / totalWeeks) * 100)}%`,
                  background: 'linear-gradient(135deg, #1E293B 0%, #475569 100%)',
                  minWidth: '40px'
                }}
                data-testid="week-slider-thumb"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const track = e.currentTarget.parentElement;
                  const trackRect = track.getBoundingClientRect();
                  const startX = e.clientX;
                  const startOffset = viewOffset;
                  const onMove = (ev) => {
                    const dx = ev.clientX - startX;
                    const dWeeks = Math.round((dx / trackRect.width) * totalWeeks);
                    const newOffset = Math.max(0, Math.min(totalWeeks - visibleWeeks, startOffset + dWeeks));
                    setViewOffset(newOffset);
                  };
                  const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
                  document.addEventListener('mousemove', onMove);
                  document.addEventListener('mouseup', onUp);
                }}
                onTouchStart={(e) => {
                  const track = e.currentTarget.parentElement;
                  const trackRect = track.getBoundingClientRect();
                  const startX = e.touches[0].clientX;
                  const startOffset = viewOffset;
                  const onMove = (ev) => {
                    const dx = ev.touches[0].clientX - startX;
                    const dWeeks = Math.round((dx / trackRect.width) * totalWeeks);
                    const newOffset = Math.max(0, Math.min(totalWeeks - visibleWeeks, startOffset + dWeeks));
                    setViewOffset(newOffset);
                  };
                  const onUp = () => { document.removeEventListener('touchmove', onMove); document.removeEventListener('touchend', onUp); };
                  document.addEventListener('touchmove', onMove);
                  document.addEventListener('touchend', onUp);
                }}
              >
                <div className="flex items-center justify-center h-full gap-[2px]">
                  <div className="w-[2px] h-2.5 rounded-full bg-white/40" />
                  <div className="w-[2px] h-2.5 rounded-full bg-white/40" />
                  <div className="w-[2px] h-2.5 rounded-full bg-white/40" />
                </div>
              </div>
              <div
                className="absolute inset-0 cursor-pointer z-[-1]"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPct = (e.clientX - rect.left) / rect.width;
                  const targetWeek = Math.round(clickPct * totalWeeks);
                  const newOffset = Math.max(0, Math.min(totalWeeks - visibleWeeks, targetWeek - Math.floor(visibleWeeks / 2)));
                  setViewOffset(newOffset);
                }}
              />
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Dialog for expanded interactive chart — full premium experience */}
      <Dialog open={!!expandedChart} onOpenChange={() => setExpandedChart(null)}>
        <DialogContent className="!max-w-[96vw] w-[96vw] !max-h-[94vh] h-[94vh] overflow-hidden p-0 flex flex-col">
          {expandedChart && (
            <>
              <div className="px-6 py-3 border-b border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#CCFF00]/15 border border-[#CCFF00]/40 flex items-center justify-center">
                    {expandedChart.icon && <expandedChart.icon className="w-5 h-5 text-[#CCFF00]" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg tracking-tight">{expandedChart.title}</h3>
                    <p className="text-[11px] text-slate-300">
                      {(expandedChart.data || []).length} semanas · {(expandedChart.dataKeys || []).length} series ·
                      Plan {cycleDuration === 'olympic' ? '4 años (208 sem)' : cycleDuration === 'biannual' ? '2 años (104 sem)' : cycleDuration === 'annual' ? '1 año (52 sem)' : 'corto (12 sem)'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-6 bg-slate-50">
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-4">
                  <InteractiveChart
                    title={expandedChart.title}
                    icon={expandedChart.icon}
                    data={expandedChart.data}
                    dataKeys={expandedChart.dataKeys}
                    xAxisKey="week"
                    height={Math.max(420, Math.floor(window.innerHeight * 0.62))}
                    showBrush={true}
                    showControls={true}
                    showLiveIndicator={true}
                    defaultChartType={expandedChart.chartType || 'bar'}
                    defaultTimeRange={
                      cycleDuration === 'olympic' ? 'olympic'
                      : cycleDuration === 'biannual' ? '2years'
                      : cycleDuration === 'annual' ? '1year'
                      : 'sessions'
                    }
                    yAxisDomain={expandedChart.yAxisDomain || [0, 100]}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Offscreen capture surface for individual chart export */}
      {offscreenChart && (
        <div
          ref={offscreenRef}
          style={{
            position: 'fixed',
            left: '-99999px',
            top: 0,
            width: '1280px',
            height: '720px',
            background: '#ffffff',
            padding: '32px',
            zIndex: -1,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
          data-testid="offscreen-chart-capture"
        >
          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>{offscreenChart.title}</div>
            <div style={{ fontSize: '11px', color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {(offscreenChart.data || []).length} semanas · {activePlan?.name || 'Plan'} · {generalInfo.athlete || 'Atleta'}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', height: '600px' }}>
            <InteractiveChart
              title={offscreenChart.title}
              icon={offscreenChart.icon}
              data={offscreenChart.data}
              dataKeys={offscreenChart.dataKeys}
              xAxisKey="week"
              height={560}
              showBrush={false}
              showControls={false}
              showLiveIndicator={false}
              defaultChartType={offscreenChart.chartType || 'bar'}
              defaultTimeRange={
                cycleDuration === 'olympic' ? 'olympic'
                : cycleDuration === 'biannual' ? '2years'
                : cycleDuration === 'annual' ? '1year'
                : 'sessions'
              }
              yAxisDomain={offscreenChart.yAxisDomain || [0, 100]}
            />
          </div>
        </div>
      )}

      {/* Modal: asignar fecha de competencia (sincronizado con módulo Competencias) */}
      {compModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setCompModal(null)} data-testid="comp-date-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {compModal.kind === 'cell' ? compModal.label : (compModal.type === 'main_competition' ? 'Competencia principal' : 'Competencia secundaria')}
            </h3>
            <p className="text-xs text-slate-500 mb-4">Semana {compModal.week} · {compModal.kind === 'cell' ? 'Asigna la fecha específica; las celdas con fecha se marcan en color.' : 'La fecha se sincroniza con el módulo Datos → Competencias.'}</p>
            {compModal.kind !== 'cell' && (<>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Nombre</label>
            <input
              type="text"
              value={compModal.name}
              onChange={(e) => setCompModal({ ...compModal, name: e.target.value })}
              placeholder={compModal.type === 'main_competition' ? 'Competencia Principal' : 'Competencia Secundaria'}
              className="w-full h-10 px-3 mt-1 mb-3 rounded-lg border border-slate-200 text-sm"
              data-testid="comp-modal-name"
            />
            </>)}
            {compModal.kind === 'cell' ? (
              <>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fechas (puedes agregar varias)</label>
                <div className="space-y-2 mt-1 mb-3 max-h-48 overflow-y-auto">
                  {(compModal.dates || []).map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="date"
                        value={d}
                        onChange={(e) => { const nd = [...compModal.dates]; nd[i] = e.target.value; setCompModal({ ...compModal, dates: nd }); }}
                        className="flex-1 h-10 px-3 rounded-lg border border-slate-200 text-sm"
                        data-testid={`comp-modal-date-${i}`}
                      />
                      {compModal.dates.length > 1 && (
                        <button onClick={() => setCompModal({ ...compModal, dates: compModal.dates.filter((_, j) => j !== i) })} className="w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center" data-testid={`comp-modal-date-remove-${i}`}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setCompModal({ ...compModal, dates: [...(compModal.dates || []), weekToDate(compModal.week)] })} className="text-xs font-semibold text-slate-700 hover:text-slate-900 mb-4 flex items-center gap-1" data-testid="comp-modal-add-date">
                  <Plus className="w-3.5 h-3.5" /> Agregar fecha
                </button>
              </>
            ) : (
              <>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fecha específica</label>
                <input
                  type="date"
                  value={compModal.date}
                  onChange={(e) => setCompModal({ ...compModal, date: e.target.value })}
                  className="w-full h-10 px-3 mt-1 mb-4 rounded-lg border border-slate-200 text-sm"
                  data-testid="comp-modal-date"
                />
              </>
            )}
            <div className="flex items-center justify-between gap-2">
              {compModal.kind === 'cell' && compModal.active ? (
                <button onClick={() => applyCellDate(true)} className="px-3 py-2 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50" data-testid="comp-modal-remove">Quitar todo</button>
              ) : <span />}
              <div className="flex items-center gap-2">
                <button onClick={() => setCompModal(null)} className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100" data-testid="comp-modal-cancel">Cancelar</button>
                <button onClick={saveCompModal} disabled={compModal.kind === 'cell' ? !(compModal.dates || []).filter(Boolean).length : !compModal.date} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50" data-testid="comp-modal-save">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphicPlan;
