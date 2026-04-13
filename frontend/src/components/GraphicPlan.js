import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, ComposedChart, ReferenceLine, ReferenceArea
} from 'recharts';
import {
  Save,
  Loader2,
  Download,
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
  BarChart3,
  TrendingUp,
  Image,
  Timer,
  Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import html2canvas from 'html2canvas';
import usePlanStore from '../stores/planStore';
import InteractiveChart from './InteractiveChart';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

// Cycle duration options
const CYCLE_DURATIONS = {
  olympic: { label: 'Ciclo Olímpico (4 años)', weeks: 208, months: 48 },
  annual: { label: 'Anual (52 semanas)', weeks: 52, months: 12 },
  semester: { label: 'Semestral (6 meses)', weeks: 26, months: 6 },
  quarter: { label: 'Trimestral (3 meses)', weeks: 12, months: 3 }
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
  { id: 'physical', label: 'Control físico', color: 'bg-orange-100' },
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

const GraphicPlan = ({ athleteId, periodizationData, athleteName, activePlan, competitions = [] }) => {
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
  
  // Chart type selections (managed internally by InteractiveChart)
  // Legacy states kept for backward compatibility
  const [loadChartType] = useState('bars');
  const [volumeIntensityChartType] = useState('combined');
  const [densityChartType] = useState('area');
  const [durationChartType] = useState('stacked');
  
  // Calendar events
  const [events, setEvents] = useState([]);
  
  // General information
  const [generalInfo, setGeneralInfo] = useState({
    sport: '',
    category: '',
    athlete: '',
    coach: '',
    periodizationType: 'tradicional'
  });
  
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
    monitoring: {}
  });

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
      monitoring: {}
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
    toast.success('Datos de periodización importados correctamente');
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
      preparation: {}, physical: {}, activities: {}, monitoring: {}
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

  // Load data from active plan
  useEffect(() => {
    if (activePlan) {
      setGeneralInfo(prev => ({
        ...prev,
        sport: activePlan.sport || prev.sport,
        periodizationType: activePlan.model || activePlan.model_name || 'tradicional',
        athlete: athleteName || prev.athlete
      }));
      if (activePlan.macrocycles?.length > 0 && !v2Micros.length) {
        importPeriodizationData(activePlan.macrocycles[0]);
      }
    }
  }, [activePlan, athleteName, importPeriodizationData, v2Micros.length]);

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

  // Total weeks based on cycle duration - MUST be defined before useMemo that uses it
  const totalWeeks = CYCLE_DURATIONS[cycleDuration].weeks;

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
    competitions.forEach(comp => {
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
    
    return result;
  }, [events, competitions, totalWeeks, activePlan]);
  
  // Generate week numbers for display
  const weeks = useMemo(() => {
    return Array.from({ length: totalWeeks }, (_, i) => i + 1);
  }, [totalWeeks]);
  
  // Visible weeks based on scroll
  const displayedWeeks = useMemo(() => {
    const start = viewOffset;
    const end = Math.min(viewOffset + visibleWeeks, totalWeeks);
    return weeks.slice(start, end);
  }, [weeks, viewOffset, visibleWeeks, totalWeeks]);

  // ═══ CHART DATA FROM V2 STORE (real calculated metrics) ═══
  // Calculate load magnitude data for charts (Carga y Recuperación)
  const loadChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      // Try V2 micro data first
      const v2Micro = v2Micros.find(m => m.numero_semana === week);
      if (v2Micro && v2Micro.carga_total > 0) {
        const maxCarga = Math.max(...v2Micros.map(m => m.carga_total || 0), 1);
        const cargaPct = Math.round((v2Micro.carga_total / maxCarga) * 100);
        const phaseId = planData.phases?.[week];
        const phase = MACROCYCLE_TYPES.find(t => t.id === phaseId);
        return {
          week: `S${week}`,
          weekNum: week,
          carga: cargaPct,
          recuperacion: Math.max(0, 100 - cargaPct),
          fase: phase?.label || '',
          cargaUA: Math.round(v2Micro.carga_total),
          ACWR: v2Micro.ACWR || 0,
          RPE: v2Micro.RPE_promedio || 0,
        };
      }
      // Fallback to local planData
      let totalLoad = 0;
      INTENSITY_LEVELS.forEach((level, idx) => {
        const value = planData.intensity?.[`${level.id}_${week}`] || 0;
        totalLoad += value * (5 - idx);
      });
      const recovery = Math.max(0, 100 - totalLoad * 20);
      const phaseId = planData.phases?.[week];
      const phase = MACROCYCLE_TYPES.find(t => t.id === phaseId);
      return {
        week: `S${week}`,
        weekNum: week,
        carga: Math.min(100, totalLoad * 20),
        recuperacion: recovery,
        fase: phase?.label || '',
        cargaUA: 0,
        ACWR: 0,
        RPE: 0,
      };
    });
  }, [displayedWeeks, planData.intensity, planData.phases, v2Micros]);

  // Calculate volume and intensity data for charts
  const volumeIntensityChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      // Try V2 micro data first
      const v2Micro = v2Micros.find(m => m.numero_semana === week);
      if (v2Micro && (v2Micro.vol_calculado > 0 || v2Micro.int_calculado > 0)) {
        const mesocycleId = planData.mesocycles?.[week];
        const mesocycle = MESOCYCLE_TYPES.find(t => t.id === mesocycleId);
        return {
          week: `S${week}`,
          weekNum: week,
          volumen: Math.round(v2Micro.vol_calculado),
          intensidad: Math.round(v2Micro.int_calculado),
          mesociclo: mesocycle?.label || '',
          tonelaje: Math.round(v2Micro.tonelaje_kg || 0),
          carga: Math.round(v2Micro.carga_total || 0),
        };
      }
      // Fallback
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
        week: `S${week}`,
        weekNum: week,
        volumen: volumeCount > 0 ? Math.round(volumeSum / volumeCount * 20) : 0,
        intensidad: intensityCount > 0 ? Math.round(intensitySum / intensityCount) : 0,
        mesociclo: MESOCYCLE_TYPES.find(t => t.id === planData.mesocycles?.[week])?.label || '',
        tonelaje: 0,
        carga: 0,
      };
    });
  }, [displayedWeeks, planData.volume, planData.intensity, planData.mesocycles, v2Micros]);

  // ═══ NEW: Preparation chart data (from grid cells + V2) ═══
  const preparationChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      const row = { week: `S${week}` };
      PREPARATION_TYPES.forEach(prep => {
        row[prep.id] = (planData.preparation?.[`${prep.id}_${week}`] || 0) * 20; // scale 1-5 → 20-100
      });
      return row;
    });
  }, [displayedWeeks, planData.preparation]);

  // ═══ NEW: Physical preparation chart data (from grid + V2 exercises) ═══
  const physicalChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      const row = { week: `S${week}` };
      PHYSICAL_COMPONENTS.forEach(comp => {
        row[comp.id] = (planData.physical?.[`${comp.id}_${week}`] || 0) * 20;
      });
      return row;
    });
  }, [displayedWeeks, planData.physical]);

  // ═══ NEW: Activity chart data (from grid cells) ═══
  const activityChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      const v2Micro = v2Micros.find(m => m.numero_semana === week);
      const sessions = v2Micro ? v2Sesiones.filter(s => s.microciclo_id === v2Micro.id) : [];
      const hasTraining = planData.activities?.[`training_${week}`] || sessions.length > 0;
      const hasMainComp = planData.activities?.[`main_competition_${week}`];
      const hasSecComp = planData.activities?.[`secondary_competition_${week}`];
      const hasRecovery = planData.activities?.[`recovery_${week}`];
      return {
        week: `S${week}`,
        entrenamiento: hasTraining ? (sessions.length || 5) : 0,
        competenciaPrincipal: hasMainComp ? 1 : 0,
        competenciaSecundaria: hasSecComp ? 1 : 0,
        recuperacion: hasRecovery ? 1 : 0,
        totalSesiones: sessions.length,
      };
    });
  }, [displayedWeeks, planData.activities, v2Micros, v2Sesiones]);

  // ═══ NEW: Monitoring chart data ═══
  const monitoringChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      const row = { week: `S${week}` };
      MONITORING_AREAS.forEach(area => {
        row[area.id] = planData.monitoring?.[`${area.id}_${week}`] ? 1 : 0;
      });
      return row;
    });
  }, [displayedWeeks, planData.monitoring]);
  const densityChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      const v2Micro = v2Micros.find(m => m.numero_semana === week);
      const den = v2Micro?.den_calculado || 0;
      const denPct = Math.round(den * 100); // series/min → display scale
      const level = denPct > 12 ? 'alto' : denPct > 6 ? 'medio' : 'bajo';
      return {
        week: `S${week}`,
        weekNum: week,
        densidad: Math.round(den * 1000) / 10, // e.g. 0.0234 → 2.3
        nivel: level,
        fill: level === 'alto' ? '#EF4444' : level === 'medio' ? '#F59E0B' : '#10B981',
      };
    });
  }, [displayedWeeks, v2Micros]);

  // ═══ NEW: Duration chart data ═══
  const durationChartData = useMemo(() => {
    return displayedWeeks.map(week => {
      const v2Micro = v2Micros.find(m => m.numero_semana === week);
      const sessions = v2Micro ? v2Sesiones.filter(s => s.microciclo_id === v2Micro.id) : [];
      const totalMin = sessions.reduce((s, se) => s + (se.duracion_minutos || 0), 0);
      // Split into warmup (15%), main (70%), cooldown (15%)
      const warmup = Math.round(totalMin * 0.15);
      const main = Math.round(totalMin * 0.70);
      const cooldown = totalMin - warmup - main;
      return {
        week: `S${week}`,
        weekNum: week,
        calentamiento: warmup,
        principal: main,
        vueltaCalma: cooldown,
        total: totalMin,
        sesiones: sessions.length,
      };
    });
  }, [displayedWeeks, v2Micros, v2Sesiones]);

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
      
      toast.success('Plan gráfico guardado exitosamente');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  // Export plan as image
  const [exportingImage, setExportingImage] = useState(false);
  
  const handleExportAsImage = async () => {
    setExportingImage(true);
    try {
      // Find the plan content element
      const planElement = document.querySelector('[data-testid="graphic-plan-content"]');
      if (!planElement) {
        toast.error('No se encontró el plan gráfico');
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
      toast.error('Error al exportar imagen');
    } finally {
      setExportingImage(false);
    }
  };

  // Cell click handler
  const handleCellClick = (section, rowId, weekIndex) => {
    setPlanData(prev => {
      const sectionData = { ...prev[section] };
      const key = `${rowId}_${weekIndex}`;
      
      // Toggle or cycle through values
      if (section === 'intensity' || section === 'volume') {
        const currentValue = sectionData[key] || 0;
        sectionData[key] = currentValue >= 5 ? 0 : currentValue + 1;
      } else {
        sectionData[key] = !sectionData[key];
      }
      
      return { ...prev, [section]: sectionData };
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

  // Render intensity/volume cell
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
  const renderBooleanCell = (section, rowId, weekIndex, activeColor = 'bg-blue-500') => {
    const key = `${rowId}_${weekIndex}`;
    const isActive = planData[section]?.[key];
    
    return (
      <td
        key={`${section}-${rowId}-${weekIndex}`}
        className={`w-6 h-6 border border-gray-300 cursor-pointer hover:bg-gray-100 ${isActive ? activeColor : ''}`}
        onClick={() => handleCellClick(section, rowId, weekIndex)}
        data-testid={`cell-${section}-${rowId}-${weekIndex}`}
      />
    );
  };

  // Render cycle type row
  const renderCycleRow = (section, types) => {
    return (
      <tr>
        <td className="sticky left-0 bg-gray-100 px-2 py-1 text-xs font-medium border border-gray-300 min-w-[180px]">
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
              <Calendar className="w-6 h-6" />
              Plan Gráfico de Periodización
            </CardTitle>
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
                  title="Reimportar datos de periodización"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sincronizar
                </Button>
              )}
              {hasImportedData && (
                <span className="text-xs bg-green-400 px-2 py-1 rounded-full">
                  Datos importados
                </span>
              )}
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
                <span className="ml-1">Guardar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4" data-testid="graphic-plan-content">
          {/* General Information */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600">Deporte</label>
                <Input
                  value={generalInfo.sport}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, sport: e.target.value })}
                  placeholder="Deporte"
                  className="h-8 text-sm"
                  data-testid="input-sport"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Categoría</label>
                <Input
                  value={generalInfo.category}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, category: e.target.value })}
                  placeholder="Categoría"
                  className="h-8 text-sm"
                  data-testid="input-category"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Atleta</label>
                <Input
                  value={generalInfo.athlete}
                  onChange={(e) => setGeneralInfo({ ...generalInfo, athlete: e.target.value })}
                  placeholder="Atleta"
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
                <label className="text-xs font-medium text-gray-600">Tipo de Periodización</label>
                <Select 
                  value={generalInfo.periodizationType} 
                  onValueChange={(v) => setGeneralInfo({ ...generalInfo, periodizationType: v })}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tradicional">Tradicional</SelectItem>
                    <SelectItem value="atr">ATR</SelectItem>
                    <SelectItem value="bloques">Por Bloques</SelectItem>
                    <SelectItem value="ondulante">Ondulante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Navigation Slider Bar */}
          <div className="mb-3" data-testid="week-slider-nav">
            {/* Top row: Period selector + week range info */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Select value={cycleDuration} onValueChange={setCycleDuration}>
                  <SelectTrigger className="w-56 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CYCLE_DURATIONS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  S{viewOffset + 1} — S{Math.min(viewOffset + visibleWeeks, totalWeeks)} de {totalWeeks}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {[12, 24, 36, 52].map(n => (
                  <button
                    key={n}
                    onClick={() => { setVisibleWeeks(n); setViewOffset(Math.min(viewOffset, Math.max(0, totalWeeks - n))); }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${visibleWeeks === n ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >{n}s</button>
                ))}
              </div>
            </div>
            {/* Scrollbar track */}
            <div className="relative h-8 select-none" data-testid="week-slider-track">
              {/* Track background with week ticks */}
              <div className="absolute inset-x-0 top-3 h-2 bg-gradient-to-r from-slate-100 to-slate-200 rounded-full overflow-hidden">
                {/* Macro phase colors as background bands */}
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
              {/* Week tick marks */}
              {Array.from({ length: Math.min(totalWeeks, 52) }, (_, i) => {
                const w = Math.round((i / Math.min(totalWeeks - 1, 51)) * (totalWeeks - 1)) + 1;
                const showLabel = totalWeeks <= 52 ? (w % 4 === 0 || w === 1) : (w % 8 === 0 || w === 1);
                return showLabel ? (
                  <div key={w} className="absolute top-0 text-[8px] text-slate-400 font-medium" style={{ left: `${((w - 1) / totalWeeks) * 100}%`, transform: 'translateX(-50%)' }}>
                    {w}
                  </div>
                ) : null;
              })}
              {/* Draggable thumb (visible range) */}
              <div
                className="absolute top-1.5 h-5 rounded-full cursor-grab active:cursor-grabbing shadow-md border-2 border-white"
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
                {/* Grip lines inside thumb */}
                <div className="flex items-center justify-center h-full gap-[2px]">
                  <div className="w-[2px] h-2.5 rounded-full bg-white/40" />
                  <div className="w-[2px] h-2.5 rounded-full bg-white/40" />
                  <div className="w-[2px] h-2.5 rounded-full bg-white/40" />
                </div>
              </div>
              {/* Click on track to jump */}
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

          {/* Main Grid */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full border-collapse text-xs">
              {/* Week Numbers Header */}
              <thead>
                <tr className="bg-gray-200">
                  <th className="sticky left-0 bg-gray-200 px-2 py-1 border border-gray-300 min-w-[180px] text-left">
                    Semana
                  </th>
                  {displayedWeeks.map(week => (
                    <th key={week} className="w-6 h-6 border border-gray-300 text-center font-medium">
                      {week}
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody>
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
                
                {/* Macrocycle Duration - filled from V2 data */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Duracion del macrociclo
                  </td>
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
                
                {/* Period */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Período
                  </td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.periods?.[week];
                    const colors = { preparatorio: 'bg-blue-200', competitivo: 'bg-green-200', transicion: 'bg-orange-200' };
                    return (
                      <td
                        key={`period-${week}`}
                        className={`w-6 h-6 border border-gray-300 cursor-pointer ${colors[typeId] || ''}`}
                        onClick={() => {
                          const types = ['preparatorio', 'competitivo', 'transicion', null];
                          const currentIndex = types.indexOf(typeId);
                          const nextType = types[(currentIndex + 1) % types.length];
                          setPlanData(prev => ({
                            ...prev,
                            periods: { ...prev.periods, [week]: nextType }
                          }));
                        }}
                      />
                    );
                  })}
                </tr>
                
                {/* Phase/Stage */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Fase / Etapa
                  </td>
                  {displayedWeeks.map(week => {
                    const typeId = planData.phases?.[week];
                    const type = MACROCYCLE_TYPES.find(t => t.id === typeId);
                    return (
                      <td
                        key={`phase-${week}`}
                        className={`w-6 h-6 border border-gray-300 cursor-pointer ${type?.color || ''}`}
                        onClick={() => {
                          const currentIndex = MACROCYCLE_TYPES.findIndex(t => t.id === typeId);
                          const nextIndex = (currentIndex + 1) % (MACROCYCLE_TYPES.length + 1);
                          const nextType = nextIndex === MACROCYCLE_TYPES.length ? null : MACROCYCLE_TYPES[nextIndex];
                          setPlanData(prev => ({
                            ...prev,
                            phases: { ...prev.phases, [week]: nextType?.id || null }
                          }));
                        }}
                      />
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
                {renderCycleRow('microcycles', MICROCYCLE_TYPES)}
                
                {/* Microcycle type and duration */}
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Tipo de microciclo
                  </td>
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

                {/* LOAD MAGNITUDE SECTION */}
                <tr className="bg-gray-300">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold border border-gray-400">
                    <div className="flex items-center gap-1">
                      <Activity className="w-4 h-4" />
                      Magnitud de la carga
                    </div>
                  </td>
                </tr>
                
                {/* Intensity levels */}
                {INTENSITY_LEVELS.map((level, idx) => (
                  <tr key={level.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      <div className="flex items-center justify-between">
                        <span>{level.label}</span>
                        <span className="text-gray-400">{level.range}</span>
                      </div>
                    </td>
                    {displayedWeeks.map(week => renderLoadCell('intensity', level.id, week))}
                  </tr>
                ))}
                
                {/* Training frequency */}
                <tr>
                  <td className="sticky left-0 bg-gray-100 px-2 py-1 text-xs font-medium border border-gray-300">
                    Frecuencia de entrenamiento
                  </td>
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

                {/* PREPARATION SECTION */}
                <tr className="bg-green-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-green-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Dumbbell className="w-4 h-4" />
                      Preparación
                    </div>
                  </td>
                </tr>
                
                {PREPARATION_TYPES.map(prep => (
                  <tr key={prep.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {prep.label}
                    </td>
                    {displayedWeeks.map(week => renderLoadCell('preparation', prep.id, week))}
                  </tr>
                ))}

                {/* PHYSICAL PREPARATION SECTION */}
                <tr className="bg-orange-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-orange-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      Preparación física
                    </div>
                  </td>
                </tr>
                
                {PHYSICAL_COMPONENTS.map(comp => (
                  <tr key={comp.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {comp.label}
                    </td>
                    {displayedWeeks.map(week => renderLoadCell('physical', comp.id, week))}
                  </tr>
                ))}

                {/* ACTIVITY SECTION */}
                <tr className="bg-purple-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-purple-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      Actividad
                    </div>
                  </td>
                </tr>
                
                {ACTIVITY_TYPES.map(activity => (
                  <tr key={activity.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {activity.label}
                    </td>
                    {displayedWeeks.map(week => renderBooleanCell('activities', activity.id, week, activity.color))}
                  </tr>
                ))}

                {/* EVENTS ROW - Calendar Events with Interactive Tooltips */}
                <tr className="bg-purple-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-purple-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      Eventos / Competencias
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                    Calendario
                  </td>
                  {displayedWeeks.map(week => {
                    const weekEvents = eventsByWeek[week] || [];
                    const hasEvent = weekEvents.length > 0;
                    const isCompetition = weekEvents.some(e => e.type === 'competition' || e.priority === 'high');
                    const isMainComp = weekEvents.some(e => e.priority === 'high');
                    
                    return (
                      <td 
                        key={week} 
                        className={`border border-gray-300 text-center cursor-pointer relative group ${
                          hasEvent 
                            ? isMainComp
                              ? 'bg-red-500 text-white font-bold'
                              : isCompetition 
                                ? 'bg-amber-400 text-amber-900 font-bold' 
                                : 'bg-purple-200 text-purple-800'
                            : 'bg-white hover:bg-gray-100'
                        }`}
                        style={{ padding: hasEvent ? '2px' : '4px' }}
                      >
                        {hasEvent && (
                          <>
                            <span className="text-sm leading-none">{isMainComp ? '🏆' : isCompetition ? '🥇' : '📅'}</span>
                            {/* Tooltip popup */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none" style={{minWidth: '180px'}}>
                              <div className="bg-slate-900 text-white rounded-lg shadow-xl p-2.5 text-left" style={{fontSize: '11px'}}>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-900" />
                                {weekEvents.map((ev, i) => (
                                  <div key={i} className={i > 0 ? 'mt-2 pt-2 border-t border-slate-700' : ''}>
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-xs">{ev.priority === 'high' ? '🏆' : ev.type === 'competition' ? '🥇' : '📅'}</span>
                                      <span className="font-bold text-white leading-tight">{ev.name}</span>
                                    </div>
                                    {ev.date && (
                                      <div className="text-slate-400 text-[10px]">{new Date(ev.date).toLocaleDateString('es-ES', {day: 'numeric', month: 'short', year: 'numeric'})}</div>
                                    )}
                                    {ev.priority === 'high' && <span className="inline-block mt-1 px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded text-[9px] font-bold uppercase">Principal</span>}
                                    {ev.priority === 'normal' && ev.type === 'competition' && <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[9px] font-bold uppercase">Secundaria</span>}
                                  </div>
                                ))}
                                <div className="text-slate-500 mt-1.5 text-[9px]">Semana {week}</div>
                              </div>
                            </div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* MONITORING SECTION */}
                <tr className="bg-cyan-100">
                  <td colSpan={displayedWeeks.length + 1} className="px-2 py-1 font-bold text-cyan-800 border border-gray-300">
                    <div className="flex items-center gap-1">
                      <ClipboardCheck className="w-4 h-4" />
                      Monitoreo / Evaluaciones
                    </div>
                  </td>
                </tr>
                
                {MONITORING_AREAS.map(area => (
                  <tr key={area.id}>
                    <td className="sticky left-0 bg-gray-50 px-2 py-1 text-xs border border-gray-300">
                      {area.label}
                    </td>
                    {displayedWeeks.map(week => renderBooleanCell('monitoring', area.id, week, area.color))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CHARTS SECTION - Using InteractiveChart (same as Dashboard panel) */}
          <div className="mt-6 space-y-5">

            {/* 1. Magnitud de Carga y Recuperación */}
            <InteractiveChart
              title="Magnitud de Carga y Recuperacion"
              icon={Activity}
              data={loadChartData}
              dataKeys={[
                { key: 'carga', name: 'Carga %', color: '#EF4444' },
                { key: 'recuperacion', name: 'Recuperacion %', color: '#3B82F6' }
              ]}
              xAxisKey="week"
              height={260}
              showBrush={true}
              showControls={true}
              showLiveIndicator={true}
              defaultChartType="bar"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 100]}
              className="border border-slate-200"
            />

            {/* 2. Volumen, Intensidad y Densidad */}
            <InteractiveChart
              title="Volumen, Intensidad y Densidad"
              icon={TrendingUp}
              data={displayedWeeks.map(week => {
                const v2Micro = v2Micros.find(m => m.numero_semana === week);
                const vi = volumeIntensityChartData.find(d => d.week === `S${week}`);
                return {
                  week: `S${week}`,
                  volumen: vi?.volumen || 0,
                  intensidad: vi?.intensidad || 0,
                  densidad: v2Micro ? Math.round((v2Micro.den_calculado || 0) * 1000) / 10 : 0,
                };
              })}
              dataKeys={[
                { key: 'volumen', name: 'Volumen %', color: '#22C55E' },
                { key: 'intensidad', name: 'Intensidad %', color: '#EF4444' },
                { key: 'densidad', name: 'Densidad %', color: '#8B5CF6' }
              ]}
              xAxisKey="week"
              height={260}
              showBrush={true}
              showControls={true}
              showLiveIndicator={true}
              defaultChartType="line"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 100]}
              className="border border-slate-200"
            />

            {/* 3. Preparación por Componentes */}
            <InteractiveChart
              title="Preparacion por Componentes"
              icon={Dumbbell}
              data={preparationChartData}
              dataKeys={[
                { key: 'general_physical', name: 'Fisica General', color: '#3B82F6' },
                { key: 'specific_physical', name: 'Fisica Especifica', color: '#6366F1' },
                { key: 'technical', name: 'Tecnica', color: '#22C55E' },
                { key: 'tactical', name: 'Tactica', color: '#F59E0B' },
                { key: 'psychological', name: 'Psicologica', color: '#A855F7' },
                { key: 'theoretical', name: 'Teorica', color: '#EC4899' }
              ]}
              xAxisKey="week"
              height={260}
              showBrush={true}
              showControls={true}
              showLiveIndicator={true}
              defaultChartType="area"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 100]}
              className="border border-slate-200"
            />

            {/* 4. Preparación Física por Capacidades */}
            <InteractiveChart
              title="Preparacion Fisica por Capacidades"
              icon={Heart}
              data={physicalChartData}
              dataKeys={[
                { key: 'endurance', name: 'Resistencia', color: '#EF4444' },
                { key: 'strength', name: 'Fuerza', color: '#F97316' },
                { key: 'speed', name: 'Velocidad', color: '#EAB308' },
                { key: 'coordination', name: 'Coordinacion', color: '#22C55E' },
                { key: 'flexibility', name: 'Flexibilidad', color: '#3B82F6' }
              ]}
              xAxisKey="week"
              height={260}
              showBrush={true}
              showControls={true}
              showLiveIndicator={true}
              defaultChartType="line"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 100]}
              className="border border-slate-200"
            />

            {/* 5. Duración y Actividad Semanal */}
            <InteractiveChart
              title="Duracion y Actividad Semanal"
              icon={Timer}
              data={durationChartData}
              dataKeys={[
                { key: 'calentamiento', name: 'Calentamiento', color: '#FBBF24' },
                { key: 'principal', name: 'Parte principal', color: '#3B82F6' },
                { key: 'vueltaCalma', name: 'Vuelta a la calma', color: '#14B8A6' }
              ]}
              xAxisKey="week"
              height={260}
              showBrush={true}
              showControls={true}
              showLiveIndicator={true}
              defaultChartType="bar"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 'auto']}
              className="border border-slate-200"
            />

          </div>

          {/* Legend */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
            <h4 className="font-medium text-sm mb-2">Leyenda</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="font-medium mb-1">Intensidad / Volumen:</p>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-200 border"></div>
                  <span>Bajo</span>
                  <div className="w-4 h-4 bg-green-300 border"></div>
                  <span>Medio-bajo</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-4 h-4 bg-yellow-400 border"></div>
                  <span>Medio</span>
                  <div className="w-4 h-4 bg-orange-500 border"></div>
                  <span>Alto</span>
                  <div className="w-4 h-4 bg-red-600 border"></div>
                  <span>Máximo</span>
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Macrociclo:</p>
                <div className="flex flex-wrap gap-1">
                  {MACROCYCLE_TYPES.map(t => (
                    <div key={t.id} className={`px-1 ${t.color} text-[10px] rounded`}>{t.label}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Mesociclo:</p>
                <div className="flex flex-wrap gap-1">
                  {MESOCYCLE_TYPES.map(t => (
                    <div key={t.id} className={`px-1 ${t.color} text-[10px] rounded`}>{t.label}</div>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-medium mb-1">Microciclo:</p>
                <div className="flex flex-wrap gap-1">
                  {MICROCYCLE_TYPES.map(t => (
                    <div key={t.id} className={`px-1 ${t.color} text-[10px] rounded`}>{t.label}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GraphicPlan;
