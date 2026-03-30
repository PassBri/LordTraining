import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { 
  Users, Calendar, Target, Activity, Dumbbell, TrendingUp, 
  BarChart3, Heart, Zap, ArrowUpRight, ArrowDownRight,
  Flag, Timer, Flame, Save, Download, AlertTriangle, 
  CheckCircle, Info, Sparkles, Trophy, Star, MessageCircle,
  FileText, Loader2, X, LayoutDashboard, Medal, MapPin,
  Clock, TrendingDown, Minus, CalendarDays
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis
} from 'recharts';
import { toast } from 'sonner';
import InteractiveChart from './InteractiveChart';

const API_URL = process.env.REACT_APP_BACKEND_URL;

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
  trainingPlans = []
}) => {
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

  // ===== NUEVOS DATOS PARA VISUALIZACIONES ADICIONALES =====
  
  // Progreso de Objetivos
  const [objectivesProgress] = useState([
    { id: 1, name: 'Aumentar fuerza máxima', progress: 78, target: 100, color: '#3B82F6' },
    { id: 2, name: 'Mejorar resistencia aeróbica', progress: 65, target: 100, color: '#10B981' },
    { id: 3, name: 'Reducir tiempo en 100m', progress: 45, target: 100, color: '#F59E0B' },
    { id: 4, name: 'Aumentar flexibilidad', progress: 90, target: 100, color: '#8B5CF6' },
    { id: 5, name: 'Mejorar técnica de salto', progress: 55, target: 100, color: '#EC4899' }
  ]);

  // Comparativa Semanal
  const [weeklyComparison] = useState([
    { metric: 'Volumen', actual: 85, anterior: 78, unidad: '%' },
    { metric: 'Intensidad', actual: 72, anterior: 80, unidad: '%' },
    { metric: 'Sesiones', actual: 5, anterior: 4, unidad: '' },
    { metric: 'Tiempo Total', actual: 8.5, anterior: 7, unidad: 'h' },
    { metric: 'RPE Promedio', actual: 7.2, anterior: 7.8, unidad: '' }
  ]);

  // Capacidades Físicas (Radar)
  const [physicalCapabilities] = useState([
    { ability: 'Fuerza', value: 82, fullMark: 100 },
    { ability: 'Resistencia', value: 75, fullMark: 100 },
    { ability: 'Velocidad', value: 68, fullMark: 100 },
    { ability: 'Flexibilidad', value: 60, fullMark: 100 },
    { ability: 'Potencia', value: 78, fullMark: 100 },
    { ability: 'Coordinación', value: 85, fullMark: 100 }
  ]);

  // Zonas de Entrenamiento
  const [trainingZones] = useState([
    { zone: 'Z1 - Recuperación', minutes: 45, percent: 15, color: '#94A3B8' },
    { zone: 'Z2 - Aeróbico Base', minutes: 90, percent: 30, color: '#3B82F6' },
    { zone: 'Z3 - Tempo', minutes: 75, percent: 25, color: '#10B981' },
    { zone: 'Z4 - Umbral', minutes: 60, percent: 20, color: '#F59E0B' },
    { zone: 'Z5 - VO2 Max', minutes: 30, percent: 10, color: '#EF4444' }
  ]);

  // Mini Calendario de Sesiones (mes actual)
  const [sessionCalendar] = useState(() => {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const sessions = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const status = i < today.getDate() 
        ? (Math.random() > 0.3 ? 'completed' : 'missed')
        : i === today.getDate() 
          ? 'today'
          : (Math.random() > 0.5 ? 'scheduled' : 'rest');
      sessions.push({ day: i, status });
    }
    return sessions;
  });

  // Próximas Competencias
  const [upcomingCompetitions] = useState([
    { id: 1, name: 'Campeonato Regional', date: '2026-02-28', daysLeft: 16, priority: 'high', location: 'Madrid' },
    { id: 2, name: 'Copa Nacional', date: '2026-03-15', daysLeft: 31, priority: 'high', location: 'Barcelona' },
    { id: 3, name: 'Torneo Preparatorio', date: '2026-02-20', daysLeft: 8, priority: 'medium', location: 'Valencia' },
    { id: 4, name: 'Meeting Internacional', date: '2026-04-10', daysLeft: 57, priority: 'low', location: 'París' }
  ]);

  // Récords Personales
  const [personalRecords] = useState([
    { id: 1, exercise: 'Sentadilla', value: 140, unit: 'kg', date: '2026-02-10', improvement: '+5kg' },
    { id: 2, exercise: 'Press Banca', value: 95, unit: 'kg', date: '2026-02-08', improvement: '+2.5kg' },
    { id: 3, exercise: '100m Sprint', value: 11.2, unit: 's', date: '2026-02-05', improvement: '-0.3s' },
    { id: 4, exercise: 'Salto Vertical', value: 62, unit: 'cm', date: '2026-02-12', improvement: '+3cm' },
    { id: 5, exercise: 'Cooper Test', value: 3200, unit: 'm', date: '2026-01-28', improvement: '+150m' }
  ]);

  // Seleccionar mensaje motivacional aleatorio
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    setMotivationalMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
  }, []);

  // Cargar estadísticas del Panel de Control desde API
  const fetchPanelStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/control-panel/stats`, {
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
  }, []);

  // Cargar stats al montar el componente
  useEffect(() => {
    fetchPanelStats();
  }, [fetchPanelStats]);

  // Función para formatear nombre de fase
  const formatPhaseName = (name) => {
    const phaseNames = {
      'preparatory_general': 'Prep. General',
      'preparatory_specific': 'Prep. Específico',
      'precompetitive': 'Precompetitivo',
      'competitive': 'Competitivo',
      'transition': 'Transición'
    };
    return phaseNames[name] || name;
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
        title: '¡Todo en orden!',
        message: 'El sistema está actualizado y listo para el entrenamiento.',
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
          color: COLORS.phases[name] || COLORS.phases[formatPhaseName(name)] || PHASE_COLORS[index % PHASE_COLORS.length]
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
          color: COLORS.phases[name] || COLORS.phases[formatPhaseName(name)] || PHASE_COLORS[index % PHASE_COLORS.length]
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
        name: name,
        value: Math.round((count / totalSemanas) * 100),
        color: COLORS.phases[name] || PHASE_COLORS[index % PHASE_COLORS.length]
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
  const completedSessions = panelStats?.completed_sessions ?? stats.completed_sessions ?? Math.floor(Math.random() * 50) + 20;
  const totalSessions = panelStats?.total_sessions ?? stats.total_sessions ?? completedSessions + 10;
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
        toast.success('Reporte PDF descargado correctamente');
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
                <h2 className="text-lg font-bold text-slate-900">Panel de Control</h2>
                <span className="text-[13px] text-slate-400">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
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
                  <h3 className="text-sm font-semibold text-slate-700">Readiness Score</h3>
                </div>
                <span className="text-3xl font-bold text-slate-900" style={{fontFamily:"'Barlow Condensed',sans-serif"}}>
                  {readinessScore.overall}%
                </span>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Calidad sueño', value: readinessScore.sleep, color: '#007AFF' },
                  { label: 'Dolor muscular', value: readinessScore.muscle_soreness, color: '#EF4444' },
                  { label: 'Estrés', value: readinessScore.stress, color: '#F59E0B' },
                  { label: 'Motivación', value: readinessScore.motivation, color: '#10B981' },
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
                  {readinessScore.overall >= 80 ? 'Listo para entrenar' :
                   readinessScore.overall >= 60 ? 'Entrenamiento moderado' : 'Requiere descanso'}
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
                  <h3 className="text-sm font-semibold text-slate-700">Ratio Carga Aguda:Crónica</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  trainingLoadRatio.status === 'optimal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  trainingLoadRatio.status === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  trainingLoadRatio.status === 'danger' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {trainingLoadRatio.status === 'optimal' ? 'Óptimo' :
                   trainingLoadRatio.status === 'warning' ? 'Precaución' :
                   trainingLoadRatio.status === 'danger' ? 'Riesgo' : 'Bajo'}
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
                  <span>{trainingLoadRatio.trend === 'increasing' ? 'Subiendo' : 
                         trainingLoadRatio.trend === 'decreasing' ? 'Bajando' : 'Estable'}</span>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Carga Aguda (7d)</span>
                  <span className="font-semibold text-slate-700">{trainingLoadRatio.acute} UA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Carga Crónica (28d)</span>
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
                      <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Plan Activo</p>
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
                      <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Plan Activo</p>
                      <p className="text-sm font-medium mt-0.5 text-slate-600">Sin plan seleccionado</p>
                      <p className="text-[11px] text-slate-400 mt-1">Click para seleccionar</p>
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
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Mis Planes</p>
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
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Atletas</p>
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
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Eventos</p>
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
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Sesiones</p>
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
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Ejercicios</p>
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
                    <p className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Adherencia</p>
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
          <h3 className="text-sm font-semibold text-slate-700">Análisis de Entrenamiento</h3>
          <p className="text-xs text-slate-400">Gráficos interactivos - Usa los controles para explorar</p>
        </div>

        {/* Charts Row 1 - Interactive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Volumen + Intensidad + Densidad Combined Chart */}
          <InteractiveChart
            title="Volumen, Intensidad y Densidad"
            icon={BarChart3}
            data={volumeData}
            dataKeys={[
              { key: 'volumen', name: 'Volumen %' },
              { key: 'intensidad', name: 'Intensidad %' },
              { key: 'densidad', name: 'Densidad %' }
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
            title="Intensidad y Recuperación"
            icon={TrendingUp}
            data={intensityData}
            dataKeys={[
              { key: 'intensidad', name: 'Intensidad %' },
              { key: 'recuperacion', name: 'Recuperación %' },
              { key: 'densidad', name: 'Densidad %' }
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
                Distribución de Fases
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
              title="Carga de Entrenamiento Acumulada"
              icon={Flame}
              data={loadData}
              dataKeys={[
                { key: 'carga', name: 'Carga Acumulada', color: COLORS.primary },
                { key: 'fatiga', name: 'Índice de Fatiga', color: COLORS.danger }
              ]}
              xAxisKey="semana"
              height={220}
              showBrush={true}
              showControls={true}
              defaultChartType="area"
              defaultTimeRange="sessions"
              yAxisDomain={[0, 700]}
              referenceAreas={[
                { y1: 550, y2: 700, color: '#EF4444', fillOpacity: 0.15, label: '⚠️ Sobrentrenamiento' },
                { y1: 350, y2: 550, color: '#10B981', fillOpacity: 0.12, label: '✓ Zona Óptima' },
                { y1: 150, y2: 350, color: '#F59E0B', fillOpacity: 0.12, label: '⚡ Carga Moderada' },
                { y1: 0, y2: 150, color: '#6B7280', fillOpacity: 0.1, label: '↓ Carga Baja' }
              ]}
              referenceLines={[
                { y: 550, color: '#EF4444', label: 'Límite Alto' },
                { y: 150, color: '#6B7280', label: 'Límite Bajo' }
              ]}
            />
          </div>
        </div>

        {/* ===== SECCIÓN DE VISUALIZACIONES ADICIONALES ===== */}
        <div className="border-t border-slate-200 pt-5 mt-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Métricas Detalladas</h3>
        </div>

        {/* Row 3: Progreso de Objetivos + Comparativa Semanal + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          
          {/* 1. Progreso de Objetivos */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-blue-500" />
                Progreso de Objetivos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {objectivesProgress.map((obj) => (
                <div key={obj.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 truncate pr-2">{obj.name}</span>
                    <span className="font-semibold" style={{ color: obj.color }}>{obj.progress}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${obj.progress}%`, backgroundColor: obj.color }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* 2. Comparativa Semanal */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Comparativa Semanal
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                          ant: {item.anterior}{item.unidad}
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
            </CardContent>
          </Card>

          {/* 3. Radar de Capacidades Físicas */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-slate-400" />
                Capacidades Físicas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={physicalCapabilities}>
                  <PolarGrid stroke="#E5E7EB" />
                  <PolarAngleAxis dataKey="ability" tick={{ fontSize: 10, fill: '#6B7280' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="Capacidades"
                    dataKey="value"
                    stroke="#007AFF"
                    fill="#007AFF"
                    fillOpacity={0.4}
                    strokeWidth={2}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Zonas de Entrenamiento + Mini Calendario */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* 4. Zonas de Entrenamiento */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-amber-500" />
                Zonas de Entrenamiento
                <span className="text-xs text-slate-400 font-normal ml-auto">Esta semana</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Barra apilada horizontal */}
              <div className="mb-4">
                <div className="h-8 rounded-lg overflow-hidden flex">
                  {trainingZones.map((zone, idx) => (
                    <div
                      key={idx}
                      className="h-full flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-80"
                      style={{ width: `${zone.percent}%`, backgroundColor: zone.color }}
                      title={`${zone.zone}: ${zone.minutes} min`}
                    >
                      {zone.percent >= 15 && `${zone.percent}%`}
                    </div>
                  ))}
                </div>
              </div>
              {/* Leyenda detallada */}
              <div className="grid grid-cols-2 gap-2">
                {trainingZones.map((zone, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: zone.color }} />
                    <span className="text-slate-600 truncate">{zone.zone}</span>
                    <span className="text-slate-400 ml-auto">{zone.minutes}min</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 5. Mini Calendario de Sesiones */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="w-5 h-5 text-slate-400" />
                Calendario de Sesiones
                <span className="text-xs text-slate-400 font-normal ml-auto">
                  {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-slate-400">
                    {day}
                  </div>
                ))}
              </div>
              {/* Días del mes */}
              <div className="grid grid-cols-7 gap-1">
                {/* Espacios vacíos para alinear el primer día */}
                {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() || 7 }).slice(1).map((_, idx) => (
                  <div key={`empty-${idx}`} className="w-8 h-8" />
                ))}
                {sessionCalendar.map((session) => (
                  <div
                    key={session.day}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-medium transition-all cursor-pointer hover:scale-110 ${
                      session.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      session.status === 'missed' ? 'bg-red-100 text-red-700' :
                      session.status === 'today' ? 'bg-blue-500 text-white ring-2 ring-blue-300' :
                      session.status === 'scheduled' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-50 text-slate-400'
                    }`}
                    title={
                      session.status === 'completed' ? 'Completada' :
                      session.status === 'missed' ? 'No realizada' :
                      session.status === 'today' ? 'Hoy' :
                      session.status === 'scheduled' ? 'Programada' : 'Descanso'
                    }
                  >
                    {session.day}
                  </div>
                ))}
              </div>
              {/* Leyenda */}
              <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded bg-emerald-100" />
                  <span className="text-slate-500">Completada</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded bg-amber-100" />
                  <span className="text-slate-500">Programada</span>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-3 h-3 rounded bg-red-100" />
                  <span className="text-slate-500">Perdida</span>
                </div>
              </div>
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
                Próximas Competencias
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingCompetitions.sort((a, b) => a.daysLeft - b.daysLeft).map((comp) => (
                <div 
                  key={comp.id} 
                  className={`p-3 rounded-xl border transition-all hover:shadow-md ${
                    comp.priority === 'high' ? 'border-red-200 bg-red-50/50' :
                    comp.priority === 'medium' ? 'border-amber-200 bg-amber-50/50' :
                    'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{comp.name}</h4>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {comp.location}
                        <span className="text-slate-300">•</span>
                        <Calendar className="w-3 h-3" />
                        {new Date(comp.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
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
                Récords Personales
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full ml-auto">PRs</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {personalRecords.map((pr) => (
                  <div 
                    key={pr.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                        <Trophy className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{pr.exercise}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(pr.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-slate-800">
                        {pr.value}<span className="text-sm text-slate-500 ml-1">{pr.unit}</span>
                      </p>
                      <p className="text-xs font-medium text-emerald-600 flex items-center justify-end gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        {pr.improvement}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Modal de Exportación PDF */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-red-500" />
              Exportar Reporte PDF
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-600">
              Selecciona las secciones que deseas incluir en tu reporte:
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
                  Resumen del Plan
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
                  Gráficos de Volumen
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
                  Gráficos de Intensidad
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
                  Calendario de Sesiones y Eventos
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-500 hover:bg-red-600" 
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar PDF
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
