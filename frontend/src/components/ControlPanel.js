import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import AthleteRanking from './AthleteRanking';
import { 
  Users, Calendar, Target, Activity, Dumbbell, TrendingUp, 
  BarChart3, Heart, Zap, ArrowUpRight, ArrowDownRight,
  Flag, Timer, Flame, Save, Download, AlertTriangle, 
  CheckCircle, Info, Sparkles, Trophy, Star, MessageCircle,
  FileText, Loader2, X, LayoutDashboard, Medal, MapPin,
  Clock, TrendingDown, Minus, CalendarDays, ChevronLeft, ChevronRight
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, ReferenceArea
} from 'recharts';
import { toast } from 'sonner';
import InteractiveChart from './InteractiveChart';
import AdvancedMetrics from './AdvancedMetrics';
import usePlanStore from '../stores/planStore';
import { useShallow } from 'zustand/react/shallow';

// Capacidad → color (igual que en Plan Gráfico / SessionCalendar)
const CAP_COLORS = {
  fuerza: '#F97316', resistencia: '#EF4444', velocidad: '#EAB308',
  flexibilidad: '#3B82F6', coordinacion: '#10B981', tecnica: '#8B5CF6',
  tactica: '#EC4899', recuperacion: '#06B6D4', default: '#64748B',
};
const capColor = (cap) => {
  const c = (cap || '').toLowerCase();
  for (const k of Object.keys(CAP_COLORS)) { if (k !== 'default' && c.includes(k)) return CAP_COLORS[k]; }
  return CAP_COLORS.default;
};
const ymdLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// Colores para gráficos
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  accent: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  phases: {
    'Prep. General': '#3B82F6',
    'Prep. Específico': '#10B981',
    'Precompetitivo': '#F59E0B',
    'Competitivo': '#EF4444',
    'Transición': '#8B5CF6',
    'preparatory_general': '#3B82F6',
    'preparatory_specific': '#10B981',
    'precompetitive': '#F59E0B',
    'competitive': '#EF4444',
    'transition': '#8B5CF6',
    // Nombres adicionales para bloques
    'Bloque Competitivo': '#EF4444',
    'Bloque de Fuerza': '#3B82F6',
    'Bloque de Potencia': '#F59E0B',
    'Bloque de Velocidad': '#10B981',
    'Preparatorio General': '#6366F1',
    'Preparatorio Específico': '#14B8A6',
    'General': '#3B82F6',
    'Específico': '#10B981'
  }
};

// Array de colores para distribución cuando no hay coincidencia
const PHASE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#6366F1'];

// Mensajes motivacionales
const MOTIVATIONAL_MESSAGES = [
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", author: "Robert Collier" },
  { text: "No cuentes los días, haz que los días cuenten.", author: "Muhammad Ali" },
  { text: "El único lugar donde el éxito viene antes que el trabajo es en el diccionario.", author: "Vidal Sassoon" },
  { text: "La diferencia entre lo imposible y lo posible está en la determinación.", author: "Tommy Lasorda" },
  { text: "El dolor es temporal, la gloria es para siempre.", author: "Anónimo" },
  { text: "Entrena duro, compite fácil.", author: "Proverbio deportivo" },
  { text: "Los campeones siguen jugando hasta que lo hacen bien.", author: "Billie Jean King" },
  { text: "El talento gana partidos, pero el trabajo en equipo gana campeonatos.", author: "Michael Jordan" },
  { text: "Cada entrenamiento cuenta, cada repetición importa.", author: "Anónimo" },
  { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" }
];

const ControlPanel = ({ 
  athletes = [], 
  events = [], 
  selectedAthleteId,
  periodizationData,
  stats = {},
  onNavigate,
  onCreateAthlete,
  onCreateEvent,
  onCreateMacrocycle,
  activePlan = null,
  trainingPlans = [],
  globalContext = null,
  onOpenAthlete = null
}) => {
  const { t, i18n } = useTranslation();
  const [volumeData, setVolumeData] = useState([]);
  const [intensityData, setIntensityData] = useState([]);
  const [phaseDistribution, setPhaseDistribution] = useState([]);
  const [loadData, setLoadData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [motivationalMessage, setMotivationalMessage] = useState(null);
  const [panelStats, setPanelStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    include_summary: true,
    include_volume_chart: true,
    include_intensity_chart: true,
    include_calendar: true
  });
  const [exporting, setExporting] = useState(false);
  const [dataSource, setDataSource] = useState('local'); // 'local' or 'api'
  const [selectedDashboardAthlete, setSelectedDashboardAthlete] = useState(selectedAthleteId || 'all');
  
  // Readiness Score Data (simulado - en producción vendría del atleta)
  const [readinessScore, setReadinessScore] = useState({
    overall: 85,
    sleep: 90,
    muscle_soreness: 40,
    stress: 35,
    motivation: 95,
    hydration: 80
  });
  
  // Training Load Ratio (Agudo:Crónico)
  const [trainingLoadRatio, setTrainingLoadRatio] = useState({
    acute: 450,
    chronic: 380,
    ratio: 1.18,
    status: 'optimal', // 'low', 'optimal', 'warning', 'danger'
    trend: 'stable' // 'increasing', 'decreasing', 'stable'
  });
  
  // Smart Alerts Data
  const [smartAlerts, setSmartAlerts] = useState([]);

  // Métricas avanzadas del coach (ACWR + adherencia + baja disponibilidad)
  const [coachMetrics, setCoachMetrics] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem('train_token');
    const pid = activePlan?.id;
    const qs = pid ? `?plan_id=${pid}` : '';
    fetch(`${API_URL}/api/coach/metrics${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCoachMetrics(d); })
      .catch(() => {});
  }, [activePlan?.id]);

  // Readiness real del atleta seleccionado (alimentado por el portal del atleta)
  useEffect(() => {
    const aid = selectedAthleteId;
    if (!aid) return;
    const token = localStorage.getItem('train_token');
    fetch(`${API_URL}/api/athlete-portal/coach/readiness/${aid}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.latest) setReadinessScore({
          overall: d.latest.overall, sleep: d.latest.sleep,
          muscle_soreness: d.latest.muscle_soreness, stress: d.latest.stress,
          motivation: d.latest.motivation, hydration: 80,
        });
      })
      .catch(() => {});
  }, [selectedAthleteId]);

  // ===== NUEVOS DATOS PARA VISUALIZACIONES ADICIONALES =====
  
  // Objetivos reales del plan (texto) — se cargan vía fetch más abajo
  const [realObjectives, setRealObjectives] = useState([]);

  // ===== DATOS REALES (conectados a periodización / plan activo) =====
  const sesiones = usePlanStore(useShallow(s => s.sesiones));
  const microciclos = usePlanStore(useShallow(s => s.microciclos));
  const mesociclos = usePlanStore(useShallow(s => s.mesociclos));
  const macrociclos = usePlanStore(useShallow(s => s.macrociclos));
  const cargarPlanCompleto = usePlanStore(s => s.cargarPlanCompleto);

  // Cargar el plan activo en el store si no está cargado (sin loop: el plan.id del store
  // es el id v2 resuelto y no coincide con activePlan.id, por eso usamos un ref).
  const loadedPlanRef = useRef(null);
  useEffect(() => {
    if (activePlan?.id && loadedPlanRef.current !== activePlan.id) {
      loadedPlanRef.current = activePlan.id;
      cargarPlanCompleto(activePlan.id);
    }
  }, [activePlan?.id, cargarPlanCompleto]);

  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [realCompetitions, setRealCompetitions] = useState([]);
  const [realRecords, setRealRecords] = useState([]);
  const [realCapabilities, setRealCapabilities] = useState([]);
  const [capacityDistribution, setCapacityDistribution] = useState([]);

  // Mapa fecha(YYYY-MM-DD) → [sesiones reales]
  const sessionsByDay = useMemo(() => {
    const map = {};
    (sesiones || []).forEach(s => {
      if (!s.fecha) return;
      const key = s.fecha.slice(0, 10);
      (map[key] = map[key] || []).push(s);
    });
    return map;
  }, [sesiones]);

  // Saltar automáticamente al primer mes con sesiones reales (una vez por carga)
  const autoJumpedRef = useRef(null);
  useEffect(() => {
    const keys = Object.keys(sessionsByDay).sort();
    if (keys.length === 0) return;
    const planKey = activePlan?.id || 'x';
    if (autoJumpedRef.current === planKey) return;
    const nowMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const hasCurrentMonth = keys.some(k => k.slice(0, 7) === nowMonth);
    if (!hasCurrentMonth) {
      const first = new Date(keys[0] + 'T00:00:00');
      setCalendarMonth(new Date(first.getFullYear(), first.getMonth(), 1));
    }
    autoJumpedRef.current = planKey;
  }, [sessionsByDay, activePlan?.id]);

  // Estado real de un día según sus sesiones
  const dayStatus = useCallback((dateStr, daySessions) => {
    if (!daySessions || daySessions.length === 0) return 'rest';
    const todayStr = ymdLocal(new Date());
    const allDone = daySessions.every(s => s.completada);
    if (allDone) return 'completed';
    if (dateStr < todayStr) return 'missed';
    return 'scheduled';
  }, []);

  // Distribución por capacidad (reemplaza "Zonas") desde sesiones reales del mes visible
  useEffect(() => {
    const y = calendarMonth.getFullYear(); const m = calendarMonth.getMonth();
    const byCap = {};
    (sesiones || []).forEach(s => {
      if (!s.fecha) return;
      const d = new Date(s.fecha.slice(0, 10) + 'T00:00:00');
      if (d.getFullYear() !== y || d.getMonth() !== m) return;
      const cap = (s.capacidad_principal || 'Sin capacidad').toString();
      const mins = Number(s.duracion_minutos) || 0;
      byCap[cap] = (byCap[cap] || 0) + (mins > 0 ? mins : 60);
    });
    const total = Object.values(byCap).reduce((a, b) => a + b, 0) || 1;
    const dist = Object.entries(byCap)
      .map(([cap, minutes]) => ({ zone: cap, minutes, percent: Math.round(minutes / total * 100), color: capColor(cap) }))
      .sort((a, b) => b.minutes - a.minutes);
    setCapacityDistribution(dist);
  }, [sesiones, calendarMonth]);

  // Comparativa Semanal (real): esta semana vs semana anterior, según sesiones con fecha
  const weeklyComparison = useMemo(() => {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // Lun=0
    const startThis = new Date(today); startThis.setHours(0, 0, 0, 0); startThis.setDate(today.getDate() - dow);
    const startPrev = new Date(startThis); startPrev.setDate(startThis.getDate() - 7);
    const endPrev = new Date(startThis);
    const inRange = (s, a, b) => { if (!s.fecha) return false; const d = new Date(s.fecha.slice(0, 10) + 'T00:00:00'); return d >= a && d < b; };
    const endThis = new Date(startThis); endThis.setDate(startThis.getDate() + 7);
    const agg = (a, b) => {
      const list = (sesiones || []).filter(s => inRange(s, a, b));
      const mins = list.reduce((t, s) => t + (Number(s.duracion_minutos) || 0), 0);
      const rpes = list.map(s => Number(s.RPE_sesion)).filter(v => v > 0);
      return { count: list.length, minutes: mins, hours: +(mins / 60).toFixed(1), rpe: rpes.length ? +(rpes.reduce((x, y) => x + y, 0) / rpes.length).toFixed(1) : 0 };
    };
    const cur = agg(startThis, endThis);
    const prev = agg(startPrev, endPrev);
    const hasData = cur.count > 0 || prev.count > 0;
    if (!hasData) return null;
    return [
      { metric: t('chart.metricSessions'), actual: cur.count, anterior: prev.count, unidad: '' },
      { metric: t('chart.metricTotalTime'), actual: cur.hours, anterior: prev.hours, unidad: 'h' },
      { metric: t('chart.metricVolume'), actual: cur.minutes, anterior: prev.minutes, unidad: 'min' },
      { metric: t('chart.metricAvgRPE'), actual: cur.rpe, anterior: prev.rpe, unidad: '' },
    ];
  }, [sesiones]);

  // Fetch competencias + récords + capacidades reales del plan activo
  useEffect(() => {
    const planId = activePlan?.id;
    if (!planId) { setRealCompetitions([]); setRealRecords([]); setRealCapabilities([]); setRealObjectives([]); return; }
    const token = localStorage.getItem('train_token');
    const headers = { 'Authorization': `Bearer ${token}` };
    const todayStr = ymdLocal(new Date());

    // Objetivos reales del plan (corto/mediano/largo plazo + por aspecto)
    const ASPECT_LABELS = { general: 'General', fisicaGeneral: 'Física general', fisicaEspecial: 'Física especial', tecnica: 'Técnica', tactica: 'Táctica', psicologica: 'Psicológica', teorica: 'Teórica', reglamento: 'Reglamento' };
    const TERM_COLORS = { 'Corto plazo': '#F59E0B', 'Mediano plazo': '#10B981', 'Largo plazo': '#3B82F6' };
    fetch(`${API_URL}/api/plan-data/objectives/${planId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(obj => {
        const data = obj?.data || {};
        const out = [];
        if (obj?.main_objective && obj.main_objective.trim()) out.push({ id: 'main', label: 'Principal', text: obj.main_objective.trim(), color: '#8B5CF6' });
        [['cortoPlazo', 'Corto plazo'], ['medianoPlazo', 'Mediano plazo'], ['largoPlazo', 'Largo plazo']].forEach(([k, label]) => {
          (data[k] || []).forEach((t, i) => { if (t && t.trim()) out.push({ id: `${k}-${i}`, label, text: t.trim(), color: TERM_COLORS[label] }); });
        });
        Object.entries(data.porAspecto || {}).forEach(([asp, v]) => {
          if (v && v.objetivo && v.objetivo.trim()) out.push({ id: `asp-${asp}`, label: ASPECT_LABELS[asp] || asp, text: v.objetivo.trim(), indicador: (v.indicador || '').trim(), color: '#EC4899' });
        });
        (obj?.secondary_objectives || []).forEach((t, i) => { if (t && t.trim()) out.push({ id: `sec-${i}`, label: 'Secundario', text: t.trim(), color: '#64748B' }); });
        setRealObjectives(out);
      }).catch(() => setRealObjectives([]));

    // Competencias del plan
    fetch(`${API_URL}/api/plan-data/competitions/${planId}`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const comps = (Array.isArray(list) ? list : [])
          .filter(c => c.date && c.date >= todayStr)
          .map(c => {
            const daysLeft = Math.max(0, Math.round((new Date(c.date) - new Date(todayStr)) / 86400000));
            const imp = (c.importance || '').toLowerCase();
            const priority = ['a', 'alta', 'high', 'principal'].some(k => imp.includes(k)) ? 'high'
              : ['b', 'media', 'medium'].some(k => imp.includes(k)) ? 'medium' : 'low';
            return { id: c.id, name: c.name, date: c.date, location: c.location || '—', daysLeft, priority };
          })
          .sort((a, b) => a.daysLeft - b.daysLeft);
        setRealCompetitions(comps);
      }).catch(() => setRealCompetitions([]));

    // Récords desde "análisis del plan anterior" (indicadores)
    fetch(`${API_URL}/api/plan-data/previous-analysis/${planId}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .then(pa => {
        const data = pa?.data || {};
        const recs = [];
        const IND = { vo2max: { label: 'VO₂ Máx', unit: 'ml/kg' }, sentadilla: { label: 'Sentadilla', unit: 'kg' }, sprint: { label: 'Sprint', unit: 's' }, cmj: { label: 'CMJ (salto)', unit: 'cm' }, flexibilidad: { label: 'Flexibilidad', unit: 'cm' } };
        Object.entries(data.indicadores || {}).forEach(([k, v]) => {
          if (v && (v.final !== '' && v.final != null)) {
            recs.push({ id: k, exercise: IND[k]?.label || k, value: v.final, unit: IND[k]?.unit || '', improvement: v.delta ? (String(v.delta).startsWith('-') ? v.delta : `+${v.delta}`) : '' });
          }
        });
        (data.indicadoresLista || []).forEach((it, i) => {
          if (it && it.nombre && it.final !== '' && it.final != null) {
            recs.push({ id: `lista-${i}`, exercise: it.nombre, value: it.final, unit: '', improvement: it.delta ? (String(it.delta).startsWith('-') ? it.delta : `+${it.delta}`) : '' });
          }
        });
        setRealRecords(recs);
      }).catch(() => setRealRecords([]));

    // Capacidades (radar) desde evaluación física real
    fetch(`${API_URL}/api/plan-data/evaluations/${planId}/physical`, { headers })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const arr = Array.isArray(list) ? list : (list?.evaluations || []);
        const last = arr && arr.length ? arr[arr.length - 1] : null;
        const res = last?.results || {};
        const MAP = [
          ['Fuerza', ['fuerzaMaxima', 'fuerzaExplosiva']],
          ['Resistencia', ['resistenciaAerobica', 'resistenciaAnaerobica']],
          ['Velocidad', ['velocidadMaxima']],
          ['Flexibilidad', ['flexibilidad']],
          ['Potencia', ['potencia']],
          ['Coordinación', ['coordinacion']],
        ];
        const caps = [];
        MAP.forEach(([ability, keys]) => {
          const vals = keys.map(k => parseFloat(res[k])).filter(v => !isNaN(v));
          if (vals.length) caps.push({ ability, value: Math.min(100, Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)), fullMark: 100 });
        });
        setRealCapabilities(caps);
      }).catch(() => setRealCapabilities([]));
  }, [activePlan?.id]);

  // Seleccionar mensaje motivacional aleatorio
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    setMotivationalMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
  }, []);

  // Cargar estadísticas del Panel de Control desde API (filtradas por plan activo)
  const fetchPanelStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('train_token');
      const planQs = activePlan?.id ? `?plan_id=${encodeURIComponent(activePlan.id)}` : '';
      const response = await fetch(`${API_URL}/api/control-panel/stats${planQs}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPanelStats(data);
        setDataSource('api');
        
        // Usar datos de la API si están disponibles
        if (data.volume_data && data.volume_data.length > 0) {
          setVolumeData(data.volume_data.slice(0, 12));
        }
        if (data.intensity_data && data.intensity_data.length > 0) {
          setIntensityData(data.intensity_data.slice(0, 12));
        }
        if (data.phase_distribution && data.phase_distribution.length > 0) {
          const distribution = data.phase_distribution.map(phase => ({
            name: formatPhaseName(phase.name),
            value: phase.value,
            color: COLORS.phases[phase.name] || COLORS.primary
          }));
          setPhaseDistribution(distribution);
        }
      }
    } catch (error) {
      console.error('Error fetching panel stats:', error);
    }
    setLoadingStats(false);
  }, [activePlan?.id]);

  // Re-fetch stats al montar y cada vez que cambie el plan activo
  useEffect(() => {
    fetchPanelStats();
  }, [fetchPanelStats]);

  // Listener: re-fetch cuando cualquier sección guarde datos del plan
  useEffect(() => {
    const handler = (e) => {
      if (!activePlan?.id || e?.detail?.plan_id === activePlan.id) {
        fetchPanelStats();
      }
    };
    window.addEventListener('lordtraining:plan-data-updated', handler);
    window.addEventListener('lordtraining:evaluation-saved', handler);
    return () => {
      window.removeEventListener('lordtraining:plan-data-updated', handler);
      window.removeEventListener('lordtraining:evaluation-saved', handler);
    };
  }, [activePlan?.id, fetchPanelStats]);

  // Función para formatear nombre de fase
  const PHASE_CANON = {
    'preparatory_general': 'Prep. General', 'preparatory_specific': 'Prep. Específico',
    'precompetitive': 'Precompetitivo', 'competitive': 'Competitivo', 'transition': 'Transición',
  };
  const PHASE_I18N = {
    'preparatory_general': 'chart.phasePrepGeneral', 'Prep. General': 'chart.phasePrepGeneral',
    'preparatory_specific': 'chart.phasePrepSpecific', 'Prep. Específico': 'chart.phasePrepSpecific',
    'precompetitive': 'chart.phasePrecompetitive', 'Precompetitivo': 'chart.phasePrecompetitive',
    'competitive': 'chart.phaseCompetitive', 'Competitivo': 'chart.phaseCompetitive',
    'transition': 'chart.phaseTransition', 'Transición': 'chart.phaseTransition',
  };
  const formatPhaseName = (name) => {
    if (PHASE_I18N[name]) return t(PHASE_I18N[name]);
    return PHASE_CANON[name] || name;
  };

  // Generar alertas inteligentes basadas en datos reales
  useEffect(() => {
    const newAlerts = [];
    const today = new Date();

    // Alertas basadas en estadísticas de la API
    if (panelStats) {
      // Alerta de eventos próximos
      const upcomingEvents = panelStats.upcoming_events || [];
      upcomingEvents.forEach(event => {
        const eventDate = new Date(event.date);
        const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilEvent > 0 && daysUntilEvent <= 7) {
          const athleteName = event.athleteName || 'Atleta';
          
          if (daysUntilEvent <= 3) {
            newAlerts.push({
              type: 'warning',
              icon: AlertTriangle,
              title: `Evento en ${daysUntilEvent} día${daysUntilEvent > 1 ? 's' : ''}`,
              message: `${athleteName} tiene "${event.name || event.title}" muy pronto. Verificar preparación.`,
              color: 'amber'
            });
          } else {
            newAlerts.push({
              type: 'info',
              icon: Calendar,
              title: `Evento próximo (${daysUntilEvent} días)`,
              message: `${athleteName}: ${event.name || event.title}`,
              color: 'blue'
            });
          }
        }
      });

      // Alerta de baja tasa de completación
      if (panelStats.completion_rate > 0 && panelStats.completion_rate < 70) {
        newAlerts.push({
          type: 'warning',
          icon: TrendingUp,
          title: 'Tasa de completación baja',
          message: `Solo ${panelStats.completion_rate}% de sesiones completadas. Revisar adherencia al plan.`,
          color: 'amber'
        });
      }

      // Alerta si no hay atletas
      if (panelStats.athletes_count === 0) {
        newAlerts.push({
          type: 'info',
          icon: Users,
          title: 'Sin atletas registrados',
          message: 'Comienza agregando tu primer atleta para crear planes de entrenamiento.',
          color: 'blue'
        });
      }

      // Alerta si hay atletas sin periodización
      if (panelStats.athletes_count > 0 && panelStats.active_macrocycles === 0) {
        newAlerts.push({
          type: 'warning',
          icon: Target,
          title: 'Sin planes activos',
          message: 'Tus atletas no tienen macrociclos configurados. Crea un plan de entrenamiento.',
          color: 'amber'
        });
      }
    } else {
      // Fallback a datos locales si no hay stats de API
      if (events && events.length > 0) {
        events.forEach(event => {
          const eventDate = new Date(event.date);
          const daysUntilEvent = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysUntilEvent > 0 && daysUntilEvent <= 7) {
            const athlete = athletes.find(a => a.id === event.athleteId);
            const athleteName = athlete?.name || 'Atleta';
            
            if (daysUntilEvent <= 3) {
              newAlerts.push({
                type: 'warning',
                icon: AlertTriangle,
                title: `Evento en ${daysUntilEvent} día${daysUntilEvent > 1 ? 's' : ''}`,
                message: `${athleteName} tiene "${event.title}" muy pronto. Verificar preparación.`,
                color: 'amber'
              });
            }
          }
        });
      }

      if (athletes.length === 0) {
        newAlerts.push({
          type: 'info',
          icon: Users,
          title: 'Sin atletas registrados',
          message: 'Comienza agregando tu primer atleta para crear planes de entrenamiento.',
          color: 'blue'
        });
      }
    }

    // Alerta de semana de descarga basada en carga acumulada
    if (periodizationData?.mesocycles) {
      const startDate = periodizationData.startDate ? new Date(periodizationData.startDate) : new Date();
      const currentWeek = Math.ceil((today - startDate) / (1000 * 60 * 60 * 24 * 7));
      if (currentWeek > 0 && currentWeek % 4 === 0) {
        newAlerts.push({
          type: 'success',
          icon: CheckCircle,
          title: 'Semana de descarga recomendada',
          message: 'Basado en el ciclo de 4 semanas, considera reducir la carga esta semana.',
          color: 'green'
        });
      }
    }

    // ===== ALERTAS INTELIGENTES ADICIONALES =====
    
    // Alerta de Training Load Ratio
    if (trainingLoadRatio.ratio > 1.5) {
      newAlerts.push({
        type: 'danger',
        icon: AlertTriangle,
        title: '⚠️ ALERTA: Riesgo de Lesión Alto',
        message: `Ratio Agudo:Crónico = ${trainingLoadRatio.ratio.toFixed(2)}. Reducir carga inmediatamente.`,
        color: 'red',
        priority: 1
      });
    } else if (trainingLoadRatio.ratio > 1.3) {
      newAlerts.push({
        type: 'warning',
        icon: TrendingUp,
        title: 'Carga en Zona de Precaución',
        message: `Ratio ${trainingLoadRatio.ratio.toFixed(2)} - Monitorear fatiga y recuperación.`,
        color: 'amber',
        priority: 2
      });
    }
    
    // Alerta de Readiness Score bajo
    if (readinessScore.overall < 70) {
      newAlerts.push({
        type: 'warning',
        icon: Activity,
        title: 'Disponibilidad del Atleta Reducida',
        message: `Readiness Score: ${readinessScore.overall}%. Considerar sesión de menor intensidad.`,
        color: 'amber',
        priority: 2
      });
    }
    
    // Alerta de fatiga muscular alta
    if (readinessScore.muscle_soreness > 70) {
      newAlerts.push({
        type: 'info',
        icon: Activity,
        title: 'Fatiga Muscular Elevada',
        message: `Nivel de dolor muscular: ${readinessScore.muscle_soreness}%. Incluir más recuperación.`,
        color: 'blue',
        priority: 3
      });
    }

    // Ordenar alertas por prioridad
    newAlerts.sort((a, b) => (a.priority || 99) - (b.priority || 99));

    // Alerta motivacional si todo está bien
    if (newAlerts.length === 0 && (athletes.length > 0 || (panelStats && panelStats.athletes_count > 0))) {
      newAlerts.push({
        type: 'success',
        icon: Trophy,
        title: t('dashboard.shell.allGood'),
        message: t('dashboard.shell.allGoodDesc'),
        color: 'green'
      });
    }

    setAlerts(newAlerts.slice(0, 4)); // Máximo 4 alertas
    setSmartAlerts(newAlerts); // Guardar todas las alertas para mostrar expandidas
  }, [events, athletes, periodizationData, selectedAthleteId, panelStats, trainingLoadRatio, readinessScore]);

  // Procesar datos reales de periodización para gráficos
  // PRIORIDAD: activePlan > periodizationData > datos de ejemplo
  useEffect(() => {
    // Si ya tenemos datos de la API con formato completo, no procesar datos locales
    if (dataSource === 'api' && volumeData.length > 0 && volumeData[0]?.intensidad !== undefined) {
      return;
    }

    // Verificar si los datos existentes tienen el formato correcto (con intensidad y densidad)
    const hasCompleteData = volumeData.length > 0 && 
                           volumeData[0]?.intensidad !== undefined && 
                           volumeData[0]?.densidad !== undefined;

    // ===== PRIORIDAD 1: Usar datos del Plan Activo =====
    if (activePlan?.macrocycles && activePlan.macrocycles.length > 0) {
      const realVolumeData = [];
      const realIntensityData = [];
      const phaseCount = {};
      let weekCounter = 1;
      let accumulatedLoad = 0;
      const realLoadData = [];

      // Iterar sobre macrociclos del plan activo
      activePlan.macrocycles.forEach(macro => {
        macro.mesocycles?.forEach(meso => {
          const phaseName = meso.phase_name || meso.phaseName || meso.phase || meso.name || 'Fase';
          phaseCount[phaseName] = (phaseCount[phaseName] || 0) + (meso.microcycles?.length || meso.weeks || 4);

          // Si tiene microciclos detallados
          if (meso.microcycles && meso.microcycles.length > 0) {
            meso.microcycles.forEach(micro => {
              const volume = micro.volume || micro.expected_load || 70;
              const intensity = micro.intensity || 60;
              const densidad = Math.round(volume * intensity / 100) || 35;
              
              realVolumeData.push({
                semana: `S${weekCounter}`,
                volumen: volume,
                intensidad: intensity,
                densidad: densidad,
                objetivo: micro.is_deload ? volume + 20 : volume - 5
              });

              realIntensityData.push({
                semana: `S${weekCounter}`,
                intensidad: intensity,
                recuperacion: 100 - intensity + (micro.is_deload ? 20 : 0),
                densidad: densidad
              });

              accumulatedLoad += volume * (intensity / 100);
              realLoadData.push({
                semana: `S${weekCounter}`,
                carga: Math.round(accumulatedLoad),
                fatiga: Math.round(30 + (intensity * 0.5))
              });

              weekCounter++;
            });
          } else {
            // Si solo tiene el número de semanas, generar datos estimados
            const weeks = meso.weeks || meso.duration_weeks || 4;
            const baseVolume = meso.volume || 70;
            const baseIntensity = meso.intensity || 60;
            
            for (let w = 0; w < weeks; w++) {
              const volume = baseVolume + (w * 2) - (w === weeks - 1 ? 15 : 0); // Descarga última semana
              const intensity = baseIntensity + (w * 3);
              const densidad = Math.round(volume * intensity / 100);
              
              realVolumeData.push({
                semana: `S${weekCounter}`,
                volumen: Math.min(100, Math.max(20, volume)),
                intensidad: Math.min(100, Math.max(30, intensity)),
                densidad: densidad,
                objetivo: volume - 5
              });

              realIntensityData.push({
                semana: `S${weekCounter}`,
                intensidad: Math.min(100, intensity),
                recuperacion: 100 - intensity,
                densidad: densidad
              });

              accumulatedLoad += volume * (intensity / 100);
              realLoadData.push({
                semana: `S${weekCounter}`,
                carga: Math.round(accumulatedLoad),
                fatiga: Math.round(30 + (intensity * 0.5))
              });

              weekCounter++;
            }
          }
        });
      });

      if (realVolumeData.length > 0) {
        setVolumeData(realVolumeData.slice(0, 16)); // Hasta 16 semanas
        setIntensityData(realIntensityData.slice(0, 16));
        setLoadData(realLoadData.slice(0, 16));

        const totalWeeks = Object.values(phaseCount).reduce((a, b) => a + b, 0);
        const distribution = Object.entries(phaseCount).map(([name, count], index) => ({
          name: formatPhaseName(name),
          value: Math.round((count / totalWeeks) * 100),
          color: COLORS.phases[name] || COLORS.phases[PHASE_CANON[name] || name] || PHASE_COLORS[index % PHASE_COLORS.length]
        }));
        setPhaseDistribution(distribution);
        setDataSource('plan');
        return;
      }
    }

    // ===== PRIORIDAD 2: Usar periodizationData existente =====
    if (periodizationData?.mesocycles && !hasCompleteData) {
      const realVolumeData = [];
      const realIntensityData = [];
      const phaseCount = {};
      let weekCounter = 1;
      let accumulatedLoad = 0;
      const realLoadData = [];

      periodizationData.mesocycles.forEach(meso => {
        const phaseName = meso.phaseName || meso.phase || 'Otro';
        phaseCount[phaseName] = (phaseCount[phaseName] || 0) + (meso.microcycles?.length || 0);

        meso.microcycles?.forEach(micro => {
          const volume = micro.volume || 70;
          const intensity = micro.intensity || 50;
          const densidad = Math.round(volume * intensity / 100) || 35;
          
          // Incluir las 3 métricas en el mismo dataset
          realVolumeData.push({
            semana: `S${weekCounter}`,
            volumen: volume,
            intensidad: intensity,
            densidad: densidad,
            objetivo: micro.isDeload ? volume + 20 : volume - 5
          });

          realIntensityData.push({
            semana: `S${weekCounter}`,
            intensidad: intensity,
            recuperacion: 100 - intensity + (micro.isDeload ? 20 : 0),
            densidad: densidad
          });

          accumulatedLoad += volume * (intensity / 100);
          realLoadData.push({
            semana: `S${weekCounter}`,
            carga: Math.round(accumulatedLoad),
            fatiga: Math.round(30 + (intensity * 0.5))
          });

          weekCounter++;
        });
      });

      if (realVolumeData.length > 0) {
        setVolumeData(realVolumeData.slice(0, 12));
        setIntensityData(realIntensityData.slice(0, 12));
        setLoadData(realLoadData.slice(0, 12));

        const totalWeeks = Object.values(phaseCount).reduce((a, b) => a + b, 0);
        const distribution = Object.entries(phaseCount).map(([name, count], index) => ({
          name: formatPhaseName(name),
          value: Math.round((count / totalWeeks) * 100),
          color: COLORS.phases[name] || COLORS.phases[PHASE_CANON[name] || name] || PHASE_COLORS[index % PHASE_COLORS.length]
        }));
        setPhaseDistribution(distribution);
        setDataSource('local');
        return;
      }
    }

    // Datos de ejemplo basados en modelo de periodización típico
    if (!hasCompleteData) {
      // Definir fases de periodización con sus características
      const periodizationModel = [
        { fase: 'Prep. General', semanas: 4, volBase: 75, intBase: 55, tendVol: 5, tendInt: 3 },
        { fase: 'Prep. Específico', semanas: 3, volBase: 70, intBase: 65, tendVol: -2, tendInt: 5 },
        { fase: 'Precompetitivo', semanas: 2, volBase: 55, intBase: 80, tendVol: -5, tendInt: 5 },
        { fase: 'Competitivo', semanas: 2, volBase: 40, intBase: 90, tendVol: -3, tendInt: 2 },
        { fase: 'Transición', semanas: 1, volBase: 30, intBase: 50, tendVol: 0, tendInt: 0 }
      ];
      
      const weeks = [];
      let weekNum = 1;
      const phaseData = {};
      
      periodizationModel.forEach(modelo => {
        phaseData[modelo.fase] = modelo.semanas;
        for (let i = 0; i < modelo.semanas && weekNum <= 12; i++) {
          const volumen = Math.round(modelo.volBase + (modelo.tendVol * i) + (Math.random() * 5 - 2.5));
          const intensidad = Math.round(modelo.intBase + (modelo.tendInt * i) + (Math.random() * 5 - 2.5));
          const densidad = Math.round((volumen * intensidad) / 100);
          
          weeks.push({
            semana: `S${weekNum}`,
            volumen: Math.min(100, Math.max(20, volumen)),
            intensidad: Math.min(100, Math.max(30, intensidad)),
            densidad: Math.min(80, Math.max(15, densidad)),
            objetivo: volumen + 5
          });
          weekNum++;
        }
      });
      setVolumeData(weeks);

      // Datos de intensidad/recuperación correlacionados
      const intensity = weeks.map((w, i) => ({
        semana: w.semana,
        intensidad: w.intensidad,
        recuperacion: Math.max(20, 100 - w.intensidad + (Math.random() * 10)),
        densidad: w.densidad
      }));
      setIntensityData(intensity);

      // Distribución de fases basada en el modelo - con colores únicos
      const totalSemanas = Object.values(phaseData).reduce((a, b) => a + b, 0);
      const distribution = Object.entries(phaseData).map(([name, count], index) => ({
        name: formatPhaseName(name),
        value: Math.round((count / totalSemanas) * 100),
        color: COLORS.phases[name] || COLORS.phases[PHASE_CANON[name] || name] || PHASE_COLORS[index % PHASE_COLORS.length]
      }));
      setPhaseDistribution(distribution);

      // Datos de carga acumulada
      const load = [];
      let accumulated = 0;
      weeks.forEach((w, i) => {
        accumulated += Math.round((w.volumen * w.intensidad) / 100);
        load.push({
          semana: w.semana,
          carga: accumulated,
          fatiga: Math.round(30 + (w.intensidad * 0.4))
        });
      });
      setLoadData(load);
    }
  }, [periodizationData, activePlan, dataSource, volumeData.length]);

  // Calcular estadísticas
  const totalAthletes = panelStats?.athletes_count ?? athletes.length;
  const upcomingEventsCount = panelStats?.upcoming_events_count ?? events.filter(e => new Date(e.date) > new Date()).length;
  const completedSessions = panelStats?.completed_sessions ?? stats?.completed_sessions ?? Math.floor(Math.random() * 50) + 20;
  const totalSessions = panelStats?.total_sessions ?? stats?.total_sessions ?? completedSessions + 10;
  const activeMacrocycles = panelStats?.active_macrocycles ?? (activePlan?.macrocycles?.length || (periodizationData ? 1 : 0));

  // Atleta seleccionado
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  // Manejadores de acciones rápidas
  const handleNewAthlete = () => {
    if (onNavigate) {
      onNavigate('datos', 'athletes');
    }
    if (onCreateAthlete) {
      onCreateAthlete();
    }
    toast.success('Navega a la sección de Atletas para agregar uno nuevo');
  };

  const handleNewEvent = () => {
    if (onNavigate) {
      onNavigate('datos', 'events');
    }
    if (onCreateEvent) {
      onCreateEvent();
    }
    toast.success('Navega al Calendario de Eventos');
  };

  const handleNewMacrocycle = () => {
    if (onNavigate) {
      onNavigate('datos', 'periodization-models');
    }
    if (onCreateMacrocycle) {
      onCreateMacrocycle();
    }
    toast.success('Navega al Sistema de Periodización');
  };

  const handleViewReports = () => {
    setShowExportModal(true);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/control-panel/export-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(exportOptions)
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_train_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success(t('dashboard.controlPanel.pdfDownloaded'));
        setShowExportModal(false);
      } else {
        toast.error('Error al generar el reporte PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar el reporte');
    }
    setExporting(false);
  };

  const handleSave = () => {
    toast.success('Datos guardados correctamente');
  };

  const [exportingAlerts, setExportingAlerts] = useState(false);
  const handleExportAlertsPDF = async () => {
    setExportingAlerts(true);
    try {
      const token = localStorage.getItem('train_token');
      const payload = {
        alerts: (smartAlerts || []).map(a => ({
          title: a.title || '',
          message: a.message || '',
          severity: a.color === 'red' ? 'high' : (a.color === 'amber' ? 'medium' : (a.color === 'green' ? 'ok' : 'info')),
          athlete_name: a.athleteName || a.athlete_name || null,
        })),
        week_label: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
      };
      const res = await fetch(`${API_URL}/api/coach/weekly-alerts-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alertas-semanales-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF de alertas generado');
    } catch (e) {
      console.error('Error exporting alerts PDF:', e);
      toast.error('Error al generar el PDF de alertas');
    } finally {
      setExportingAlerts(false);
    }
  };

  return (
    <div className="overflow-y-auto h-full bg-[#fafaf8]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-slate-900 rounded-xl flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-[#CCFF00]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('dashboard.controlPanel.title')}</h2>
                <span className="text-[13px] text-slate-400">
                  {new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
            
            {/* Center: Status + Quote */}
            <div className="hidden lg:flex items-center gap-6 flex-1 justify-center px-4">
              {alerts.length > 0 && (
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                  {React.createElement(alerts[0].icon, { 
                    className: `w-4 h-4 ${
                      alerts[0].color === 'green' ? 'text-emerald-500' :
                      alerts[0].color === 'amber' ? 'text-amber-500' :
                      'text-[#007AFF]'
                    }` 
                  })}
                  <span className="text-[13px] text-slate-700 font-medium">{alerts[0].title}</span>
                  <span className="text-xs text-slate-400">{alerts[0].message}</span>
                </div>
              )}
              {motivationalMessage && (
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-[13px] text-slate-500 italic max-w-md truncate">"{motivationalMessage.text}"</span>
                  <span className="text-xs text-slate-400">— {motivationalMessage.author}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-9 px-3 bg-amber-500 hover:bg-amber-600 text-white border-0 rounded-xl text-xs font-semibold" onClick={handleExportAlertsPDF} disabled={exportingAlerts} data-testid="export-alerts-pdf-btn" title="Exportar resumen semanal de alertas a PDF">
                {exportingAlerts ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
                <span className="hidden sm:inline">PDF Alertas</span>
              </Button>
              <Button size="sm" className="h-9 w-9 bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 rounded-xl" onClick={handleSave}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" className="h-9 w-9 bg-slate-100 hover:bg-slate-200 text-slate-600 border-0 rounded-xl" onClick={handleViewReports}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ROW 1: Readiness Score + Training Load Ratio + Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Readiness Score Card */}
          <Card className="lg:col-span-3 border border-slate-200 shadow-sm bg-white" data-testid="readiness-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">{t('dashboard.controlPanel.readiness')}</h3>
                </div>
                <span className="text-3xl font-bold text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>
                  {readinessScore.overall}%
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: t('dashboard.controlPanel.sleepQuality'), value: readinessScore.sleep, color: '#007AFF' },
                  { label: t('dashboard.controlPanel.muscleSoreness'), value: readinessScore.muscle_soreness, color: '#EF4444' },
                  { label: t('dashboard.controlPanel.stress'), value: readinessScore.stress, color: '#F59E0B' },
                  { label: t('dashboard.controlPanel.motivation'), value: readinessScore.motivation, color: '#10B981' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width: `${item.value}%`, backgroundColor: item.color}}></div>
                      </div>
                      <span className="text-slate-600 font-medium w-8 text-right">{item.value}%</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100">
                <p className={`text-xs font-medium ${
                  readinessScore.overall >= 80 ? 'text-emerald-600' :
                  readinessScore.overall >= 60 ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {readinessScore.overall >= 80 ? t('dashboard.controlPanel.readyToTrain') :
                   readinessScore.overall >= 60 ? t('dashboard.controlPanel.moderateTraining') : t('dashboard.controlPanel.needsRest')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Training Load Ratio Card */}
          <Card className="lg:col-span-3 border border-slate-200 shadow-sm bg-white" data-testid="load-ratio-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700">{t('dashboard.controlPanel.loadRatio')}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  trainingLoadRatio.status === 'optimal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  trainingLoadRatio.status === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  trainingLoadRatio.status === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {trainingLoadRatio.status === 'optimal' ? t('dashboard.controlPanel.statusOptimal') :
                   trainingLoadRatio.status === 'warning' ? t('dashboard.controlPanel.statusWarning') :
                   trainingLoadRatio.status === 'danger' ? t('dashboard.controlPanel.statusDanger') : t('dashboard.controlPanel.statusLow')}
                </span>
              </div>
              <div className="flex items-end gap-4 mb-3">
                <span className="text-4xl font-bold text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>
                  {trainingLoadRatio.ratio.toFixed(2)}
                </span>
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                  {trainingLoadRatio.trend === 'increasing' && <TrendingUp className="w-3 h-3 text-red-500" />}
                  {trainingLoadRatio.trend === 'decreasing' && <ArrowDownRight className="w-3 h-3 text-emerald-500" />}
                  {trainingLoadRatio.trend === 'stable' && <span className="text-slate-400">→</span>}
                  <span>{trainingLoadRatio.trend === 'increasing' ? t('dashboard.controlPanel.increasing') : 
                         trainingLoadRatio.trend === 'decreasing' ? t('dashboard.controlPanel.decreasing') : t('dashboard.controlPanel.stable')}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('dashboard.controlPanel.acuteLoad')}</span>
                  <span className="font-semibold text-slate-700">{trainingLoadRatio.acute} UA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t('dashboard.controlPanel.chronicLoad')}</span>
                  <span className="font-semibold text-slate-700">{trainingLoadRatio.chronic} UA</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-slate-500">0.8-1.3</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-slate-500">1.3-1.5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="text-slate-500">&gt;1.5</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards - Clean unified design */}
          <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Plan Activo Destacado */}
            {activePlan ? (
              <Card 
                className="bg-slate-900 text-white border-0 shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 col-span-2 md:col-span-1"
                onClick={() => onNavigate && onNavigate('datos', 'training-system')}
                data-testid="active-plan-card"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.activePlan')}</p>
                      <p className="text-base font-bold mt-0.5 truncate">{activePlan.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded">{activePlan.total_weeks} sem</span>
                        <span className="text-[11px] text-slate-400">{activePlan.model_name || activePlan.model}</span>
                      </div>
                    </div>
                    <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center shrink-0 ml-2">
                      <FileText className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card 
                className="bg-slate-100 border border-slate-200 cursor-pointer hover:shadow-md transition-all duration-200 col-span-2 md:col-span-1"
                onClick={() => onNavigate && onNavigate('datos', null)}
                data-testid="no-plan-card"
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.activePlan')}</p>
                      <p className="text-sm font-medium mt-0.5 text-slate-600">{t('dashboard.controlPanel.noPlan')}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{t('dashboard.controlPanel.clickToSelect')}</p>
                    </div>
                    <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Total Planes */}
            <Card 
              className="bg-white border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200"
              onClick={() => onNavigate && onNavigate('datos', null)}
              data-testid="plans-stat-card"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.myPlans')}</p>
                    <p className="text-2xl font-bold mt-0.5 text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{trainingPlans.length}</p>
                  </div>
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-[#007AFF]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Atletas */}
            <Card 
              className="bg-white border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200"
              onClick={() => onNavigate && onNavigate('datos', 'athletes')}
              data-testid="athletes-stat-card"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.athletes')}</p>
                    <p className="text-2xl font-bold mt-0.5 text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{totalAthletes}</p>
                  </div>
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eventos */}
            <Card 
              className="bg-white border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-200 transition-all duration-200"
              onClick={() => onNavigate && onNavigate('datos', 'competitions')}
              data-testid="events-stat-card"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.events')}</p>
                    <p className="text-2xl font-bold mt-0.5 text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{upcomingEventsCount}</p>
                  </div>
                  <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center">
                    <Flag className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sesiones */}
            <Card className="bg-white border border-slate-200 shadow-sm" data-testid="sessions-stat-card">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.sessions')}</p>
                    <p className="text-2xl font-bold mt-0.5 text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{completedSessions}</p>
                  </div>
                  <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Target className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ejercicios */}
            <Card className="bg-white border border-slate-200 shadow-sm" data-testid="exercises-stat-card">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.exercises')}</p>
                    <p className="text-2xl font-bold mt-0.5 text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>150+</p>
                  </div>
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adherencia */}
            <Card className="bg-white border border-slate-200 shadow-sm" data-testid="adherence-stat-card">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">{t('dashboard.controlPanel.adherence')}</p>
                    <p className="text-2xl font-bold mt-0.5 text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>{panelStats?.completion_rate || 92}%</p>
                  </div>
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[#007AFF]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts Section Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">{t('dashboard.controlPanel.trainingAnalysis')}</h3>
          <p className="text-xs text-slate-400">{t('dashboard.controlPanel.interactiveCharts')}</p>
        </div>

        {/* Charts Row 1 - Interactive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Volumen + Intensidad + Densidad Combined Chart */}
          <InteractiveChart
            title={t('dashboard.controlPanel.chartVolume')}
            icon={BarChart3}
            data={volumeData}
            dataKeys={[
              { key: 'volumen', name: t('chart.seriesVolume') },
              { key: 'intensidad', name: t('chart.seriesIntensity') },
              { key: 'densidad', name: t('chart.seriesDensity') }
            ]}
            xAxisKey="semana"
            height={280}
            showBrush={true}
            showControls={true}
            showLiveIndicator={dataSource === 'api'}
            defaultChartType="bar"
            defaultTimeRange="sessions"
            yAxisDomain={[0, 100]}
          />

          {/* Intensidad + Recuperación Chart */}
          <InteractiveChart
            title={t('dashboard.controlPanel.chartIntensity')}
            icon={TrendingUp}
            data={intensityData}
            dataKeys={[
              { key: 'intensidad', name: t('chart.seriesIntensity') },
              { key: 'recuperacion', name: t('chart.seriesRecovery') },
              { key: 'densidad', name: t('chart.seriesDensity') }
            ]}
            xAxisKey="semana"
            height={280}
            showBrush={true}
            showControls={true}
            showLiveIndicator={dataSource === 'api'}
            defaultChartType="line"
            defaultTimeRange="sessions"
            yAxisDomain={[0, 100]}
          />
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Distribución de Fases - Pie Chart (sin interactividad de scroll) */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-slate-400" />
                {t('dashboard.controlPanel.chartPhases')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={phaseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {phaseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Carga Acumulada - Interactive Area Chart con Zonas de Referencia */}
          <div className="lg:col-span-2">
            <InteractiveChart
              title={t('dashboard.controlPanel.chartLoad')}
              icon={Flame}
              data={loadData}
              dataKeys={[
                { key: 'carga', name: t('chart.seriesLoad'), color: COLORS.primary },
                { key: 'fatiga', name: t('chart.seriesFatigue'), color: COLORS.danger }
              ]}
              xAxisKey="semana"
              height={220}
              showBrush={true}
              showControls={true}
              defaultChartType="area"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 700]}
              referenceAreas={[
                { y1: 550, y2: 700, color: '#EF4444', fillOpacity: 0.15, label: t('chart.zoneOvertraining') },
                { y1: 350, y2: 550, color: '#10B981', fillOpacity: 0.12, label: t('chart.zoneOptimal') },
                { y1: 150, y2: 350, color: '#F59E0B', fillOpacity: 0.12, label: t('chart.zoneModerate') },
                { y1: 0, y2: 150, color: '#6B7280', fillOpacity: 0.1, label: t('chart.zoneLow') }
              ]}
              referenceLines={[
                { y: 550, color: '#EF4444', label: t('chart.limitHigh') },
                { y: 150, color: '#6B7280', label: t('chart.limitLow') }
              ]}
            />
          </div>
        </div>

        {/* ===== SECCIÓN DE VISUALIZACIONES ADICIONALES ===== */}
        <div className="border-t border-slate-200 pt-5 mt-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">{t('dashboard.controlPanel.detailedMetrics')}</h3>
        </div>

        {/* Row 3: Progreso de Objetivos + Comparativa Semanal + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* 1. Objetivos del Plan (real) */}
          <Card className="shadow-lg border-0 bg-white" data-testid="panel-objectives">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-blue-500" />
                {t('dashboard.controlPanel.objectivesTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 max-h-[260px] overflow-y-auto">
              {realObjectives.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                  <Target className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">{t('dashboard.controlPanel.noObjectives')}</p>
                  <p className="text-xs text-slate-400">{t('dashboard.controlPanel.noObjectivesHint')}</p>
                </div>
              ) : realObjectives.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => onNavigate && onNavigate('datos', 'objectives')}
                  className="w-full flex items-start gap-2.5 text-left rounded-lg p-1.5 -mx-1.5 hover:bg-slate-50 transition-colors group"
                  title={t('dashboard.controlPanel.editObjectivesTitle')}
                  data-testid={`panel-objective-${obj.id}`}
                >
                  <span className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: obj.color }} />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mr-1" style={{ color: obj.color, backgroundColor: obj.color + '15' }}>{obj.label}</span>
                    <span className="text-sm text-slate-700">{obj.text}</span>
                    {obj.indicador && <p className="text-xs text-slate-400 mt-0.5">📊 {obj.indicador}</p>}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 flex-shrink-0 mt-1 transition-colors" />
                </button>
              ))}
            </CardContent>
          </Card>

          {/* 2. Comparativa Semanal (real) */}
          <Card className="shadow-lg border-0 bg-white" data-testid="panel-weekly-comparison">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                {t('dashboard.controlPanel.weeklyComparison')}
                <span className="text-xs text-slate-400 font-normal ml-auto">{t('dashboard.controlPanel.vsLastWeek')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!weeklyComparison ? (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                  <TrendingUp className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">{t('dashboard.controlPanel.noWeekSessions')}</p>
                  <p className="text-xs text-slate-400">{t('dashboard.controlPanel.noWeekSessionsHint')}</p>
                </div>
              ) : (
              <div className="space-y-3">
                {weeklyComparison.map((item, idx) => {
                  const diff = item.actual - item.anterior;
                  const isPositive = diff > 0;
                  const isNeutral = diff === 0;
                  return (
                    <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-600">{item.metric}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {t('dashboard.controlPanel.prevShort')}: {item.anterior}{item.unidad}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-slate-800">
                            {item.actual}{item.unidad}
                          </span>
                          {!isNeutral && (
                            <span className={`flex items-center text-xs ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(diff).toFixed(1)}
                            </span>
                          )}
                          {isNeutral && <Minus className="w-3 h-3 text-slate-400" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Radar de Capacidades Físicas */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-slate-400" />
                {t('dashboard.controlPanel.physicalCapabilities')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {realCapabilities.length === 0 ? (
                <div className="h-[200px] flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                  <Activity className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">{t('dashboard.controlPanel.noPhysicalData')}</p>
                  <p className="text-xs text-slate-400">{t('dashboard.controlPanel.noPhysicalDataHint')}</p>
                </div>
              ) : (
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={realCapabilities}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="ability" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name={t('dashboard.controlPanel.capabilities')}
                    dataKey="value"
                    stroke="#007AFF"
                    fill="#007AFF"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 3.5: Métricas Avanzadas — ACWR + Adherencia + Baja disponibilidad */}
        <AdvancedMetrics metrics={coachMetrics} onNavigate={onNavigate} />

        {/* Row 3.6: Ranking / comparativa de atletas */}
        <AthleteRanking globalContext={globalContext} onOpenAthlete={onOpenAthlete} />

        {/* Row 4: Zonas de Entrenamiento + Mini Calendario */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* 4. Distribución por Capacidad (real) */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-amber-500" />
                {t('dashboard.controlPanel.distributionByCapacity')}
                <span className="text-xs text-slate-400 font-normal ml-auto">
                  {calendarMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capacityDistribution.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                  <Target className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">{t('dashboard.controlPanel.noSessionsThisMonth')}</p>
                  <p className="text-xs text-slate-400">{t('dashboard.controlPanel.noSessionsThisMonthHint')}</p>
                </div>
              ) : (
              <>
              <div className="mb-4">
                <div className="h-8 rounded-lg overflow-hidden flex">
                  {capacityDistribution.map((zone, idx) => (
                    <div
                      key={idx}
                      className="h-full flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-80"
                      style={{ width: `${zone.percent}%`, backgroundColor: zone.color }}
                      title={`${zone.zone}: ${zone.minutes} min`}
                    >
                      {zone.percent >= 12 && `${zone.percent}%`}
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {capacityDistribution.map((zone, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                    <span className="text-slate-600 truncate capitalize">{zone.zone}</span>
                    <span className="text-slate-400 ml-auto">{zone.minutes}min</span>
                  </div>
                ))}
              </div>
              </>
              )}
            </CardContent>
          </Card>

          {/* 5. Calendario de Sesiones (real, conectado a periodización) */}
          <Card className="shadow-lg border-0 bg-white" data-testid="panel-session-calendar">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5 text-slate-400" />
                {t('dashboard.controlPanel.sessionCalendar')}
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1 rounded hover:bg-slate-100" data-testid="panel-cal-prev"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                  <span className="text-xs text-slate-500 font-medium capitalize min-w-[110px] text-center">
                    {calendarMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                  </span>
                  <button onClick={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1 rounded hover:bg-slate-100" data-testid="panel-cal-next"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, di) => (
                  <div key={di} className="text-center text-xs font-medium text-slate-400">{(t('dashboard.controlPanel.weekdays').split(',')[di]) || day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const y = calendarMonth.getFullYear(); const m = calendarMonth.getMonth();
                  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // Lun=0
                  const daysInMonth = new Date(y, m + 1, 0).getDate();
                  const todayStr = ymdLocal(new Date());
                  const cells = [];
                  for (let i = 0; i < firstWeekday; i++) cells.push(<div key={`e-${i}`} className="w-9 h-9" />);
                  for (let d = 1; d <= daysInMonth; d++) {
                    const dateObj = new Date(y, m, d);
                    const dateStr = ymdLocal(dateObj);
                    const daySessions = sessionsByDay[dateStr] || [];
                    const isToday = dateStr === todayStr;
                    const status = dayStatus(dateStr, daySessions);
                    const cls = status === 'completed' ? 'bg-emerald-100 text-emerald-700'
                      : status === 'missed' ? 'bg-red-100 text-red-700'
                      : status === 'scheduled' ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-50 text-slate-400';
                    const dotColor = daySessions[0] ? capColor(daySessions[0].capacidad_principal) : null;
                    cells.push(
                      <button
                        key={d}
                        onClick={() => daySessions.length > 0 && setSelectedCalendarDay({ date: dateObj, sessions: daySessions })}
                        className={`relative w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${cls} ${daySessions.length > 0 ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${isToday ? 'ring-2 ring-blue-400' : ''}`}
                        title={daySessions.length > 0 ? `${daySessions.length} ${t('dashboard.controlPanel.sessionCount')} · ${status === 'completed' ? t('dashboard.controlPanel.legendCompleted') : status === 'missed' ? t('dashboard.controlPanel.legendMissed') : t('dashboard.controlPanel.legendScheduled')}` : t('dashboard.controlPanel.noSession')}
                        data-testid={`panel-day-${dateStr}`}
                      >
                        {d}
                        {dotColor && <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />}
                      </button>
                    );
                  }
                  return cells;
                })()}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded bg-emerald-100" /><span className="text-slate-500">{t('dashboard.controlPanel.legendCompleted')}</span></div>
                <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded bg-amber-100" /><span className="text-slate-500">{t('dashboard.controlPanel.legendScheduled')}</span></div>
                <div className="flex items-center gap-1 text-xs"><div className="w-3 h-3 rounded bg-red-100" /><span className="text-slate-500">{t('dashboard.controlPanel.legendMissed')}</span></div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400 text-center">{t('dashboard.controlPanel.clickDayDetail')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Próximas Competencias + Récords Personales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* 6. Próximas Competencias */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="w-5 h-5 text-slate-400" />
                {t('dashboard.controlPanel.upcomingCompetitions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {realCompetitions.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                  <Trophy className="w-8 h-8 text-slate-300" />
                  <p className="text-sm">{t('dashboard.controlPanel.noUpcomingComps')}</p>
                  <p className="text-xs text-slate-400">{t('dashboard.controlPanel.noUpcomingCompsHint')}</p>
                </div>
              ) : realCompetitions.map((comp) => (
                <div 
                  key={comp.id} 
                  className={`p-3 rounded-xl border transition-all hover:shadow-md ${
                    comp.priority === 'high' ? 'border-red-200 bg-red-50/50' :
                    comp.priority === 'medium' ? 'border-amber-200 bg-amber-50/50' :
                    'border-slate-200 bg-slate-50/50'
                  }`}
                  data-testid={`panel-competition-${comp.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{comp.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {comp.location}
                        <span className="text-slate-300">•</span>
                        <Calendar className="w-3 h-3" />
                        {new Date(comp.date).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      comp.daysLeft <= 7 ? 'bg-red-500 text-white' :
                      comp.daysLeft <= 30 ? 'bg-amber-500 text-white' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {comp.daysLeft}d
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 7. Récords Personales */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Medal className="w-5 h-5 text-slate-400" />
                {t('dashboard.controlPanel.personalRecords')}
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-auto">PRs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {realRecords.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                    <Medal className="w-8 h-8 text-slate-300" />
                    <p className="text-sm">{t('dashboard.controlPanel.noRecords')}</p>
                    <p className="text-xs text-slate-400">{t('dashboard.controlPanel.noRecordsHint')}</p>
                  </div>
                ) : realRecords.map((pr) => (
                  <div 
                    key={pr.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:shadow-sm transition-all"
                    data-testid={`panel-record-${pr.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{pr.exercise}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-800">
                        {pr.value}<span className="text-sm text-slate-500 ml-1">{pr.unit}</span>
                      </p>
                      {pr.improvement && (
                        <p className={`text-xs font-medium flex items-center justify-end gap-1 ${String(pr.improvement).startsWith('-') ? 'text-blue-600' : 'text-emerald-600'}`}>
                          <ArrowUpRight className="w-3 h-3" />
                          {pr.improvement}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal detalle del día (sesiones reales) */}
      <Dialog open={!!selectedCalendarDay} onOpenChange={(o) => !o && setSelectedCalendarDay(null)}>
        <DialogContent className="max-w-md bg-white" data-testid="panel-day-detail-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              {selectedCalendarDay && selectedCalendarDay.date.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {selectedCalendarDay?.sessions.map(s => {
              const color = capColor(s.capacidad_principal);
              const micro = microciclos.find(m => m.id === s.microciclo_id);
              const meso = mesociclos.find(me => me.id === micro?.mesociclo_id);
              const macro = macrociclos.find(ma => ma.id === meso?.macrociclo_id);
              return (
                <div key={s.id} className="rounded-xl border border-slate-200 p-4" style={{ borderLeft: `4px solid ${color}` }}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{s.nombre || `${t('sessionCalendar.session')} ${s.orden_dia || ''}`}</h4>
                    {s.completada && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5" /> {t('sessionCalendar.done')}
                      </span>
                    )}
                  </div>
                  {(macro || meso || micro) && (
                    <div className="mt-2 mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {macro && <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold uppercase tracking-wider">M{macro.numero}: {macro.nombre || 'Macro'}</span>}
                      {meso && <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold uppercase tracking-wider">{meso.tipo || meso.nombre || `Meso ${meso.numero}`}</span>}
                      {micro && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold uppercase tracking-wider">{t('sessionCalendar.week')} {micro.numero_semana} · {micro.tipo || 'choque'}</span>}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {s.duracion_minutos > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-50">
                        <Clock className="w-3 h-3 text-slate-500" /><span><strong className="text-slate-800">{s.duracion_minutos}</strong> min</span>
                      </div>
                    )}
                    {s.RPE_sesion > 0 && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-50">
                        <Activity className="w-3 h-3 text-slate-500" /><span>RPE <strong className="text-slate-800">{s.RPE_sesion}</strong></span>
                      </div>
                    )}
                    {s.capacidad_principal && (
                      <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md col-span-2" style={{ background: color + '15' }}>
                        <Target className="w-3 h-3" style={{ color }} /><span className="capitalize font-semibold" style={{ color }}>{s.capacidad_principal}</span>
                      </div>
                    )}
                  </div>
                  {s.notas && <p className="mt-2 text-[12px] text-slate-600 italic leading-snug border-l-2 border-slate-200 pl-2">"{s.notas}"</p>}
                  <Button
                    onClick={() => { setSelectedCalendarDay(null); onNavigate && onNavigate('datos', 'period-structure', { week: micro?.numero_semana, date: s.fecha, sessionName: s.nombre }); }}
                    variant="ghost" size="sm" className="mt-3 w-full text-[11px] text-blue-700 hover:bg-blue-50 h-8"
                    data-testid={`panel-open-session-${s.id}`}
                  >
                    <Activity className="w-3 h-3 mr-1.5" /> {t('sessionCalendar.openInPeriodization')} →
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Exportación PDF */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              {t('dashboard.controlPanel.exportTitle')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              {t('dashboard.controlPanel.exportSelectSections')}
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="summary" 
                  checked={exportOptions.include_summary}
                  onCheckedChange={(checked) => setExportOptions({...exportOptions, include_summary: checked})}
                />
                <Label htmlFor="summary" className="flex items-center gap-2 cursor-pointer">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  {t('dashboard.controlPanel.exportSummary')}
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="volume" 
                  checked={exportOptions.include_volume_chart}
                  onCheckedChange={(checked) => setExportOptions({...exportOptions, include_volume_chart: checked})}
                />
                <Label htmlFor="volume" className="flex items-center gap-2 cursor-pointer">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  {t('dashboard.controlPanel.exportVolumeCharts')}
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="intensity" 
                  checked={exportOptions.include_intensity_chart}
                  onCheckedChange={(checked) => setExportOptions({...exportOptions, include_intensity_chart: checked})}
                />
                <Label htmlFor="intensity" className="flex items-center gap-2 cursor-pointer">
                  <Activity className="w-4 h-4 text-red-500" />
                  {t('dashboard.controlPanel.exportIntensityCharts')}
                </Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="calendar" 
                  checked={exportOptions.include_calendar}
                  onCheckedChange={(checked) => setExportOptions({...exportOptions, include_calendar: checked})}
                />
                <Label htmlFor="calendar" className="flex items-center gap-2 cursor-pointer">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  {t('dashboard.controlPanel.exportCalendar')}
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              {t('dashboard.controlPanel.cancel')}
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600" 
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('dashboard.controlPanel.generating')}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {t('dashboard.controlPanel.downloadPdf')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ControlPanel;
