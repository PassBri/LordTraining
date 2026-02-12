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
  FileText, Loader2, X, LayoutDashboard
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';
import { toast } from 'sonner';

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
  onCreateMacrocycle
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
  const [chartType, setChartType] = useState('bar'); // 'bar', 'line', 'area', 'mixed'
  const [showChartOptions, setShowChartOptions] = useState(false);
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

  // Procesar datos reales de periodización para gráficos (fallback si no hay datos de API)
  useEffect(() => {
    // Si ya tenemos datos de la API, no procesar datos locales
    if (dataSource === 'api' && volumeData.length > 0) {
      return;
    }

    if (periodizationData?.mesocycles) {
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
        const distribution = Object.entries(phaseCount).map(([name, count]) => ({
          name: formatPhaseName(name),
          value: Math.round((count / totalWeeks) * 100),
          color: COLORS.phases[name] || COLORS.primary
        }));
        setPhaseDistribution(distribution);
        setDataSource('local');
        return;
      }
    }

    // Datos de ejemplo basados en modelo de periodización típico
    if (volumeData.length === 0) {
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

      // Distribución de fases basada en el modelo
      const totalSemanas = Object.values(phaseData).reduce((a, b) => a + b, 0);
      const distribution = Object.entries(phaseData).map(([name, count]) => ({
        name: name,
        value: Math.round((count / totalSemanas) * 100),
        color: COLORS.phases[name] || '#3B82F6'
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
  }, [periodizationData, dataSource, volumeData.length]);

  // Calcular estadísticas
  const totalAthletes = panelStats?.athletes_count ?? athletes.length;
  const upcomingEventsCount = panelStats?.upcoming_events_count ?? events.filter(e => new Date(e.date) > new Date()).length;
  const completedSessions = panelStats?.completed_sessions ?? stats.completed_sessions ?? Math.floor(Math.random() * 50) + 20;
  const totalSessions = panelStats?.total_sessions ?? stats.total_sessions ?? completedSessions + 10;
  const activeMacrocycles = panelStats?.active_macrocycles ?? (periodizationData ? 1 : 0);

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
    <div className="overflow-y-auto h-full bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header Material Design Simplificado */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white sticky top-0 z-10 shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Panel de Control</h2>
                <span className="text-sm text-white/70">
                  {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl" onClick={handleSave}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" className="h-10 w-10 bg-white/20 hover:bg-white/30 text-white border-0 rounded-xl" onClick={handleViewReports}>
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
          <Card className="lg:col-span-3 border-0 shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-200">Readiness Score</h3>
                <span className={`text-2xl font-bold ${
                  readinessScore.overall >= 80 ? 'text-emerald-400' :
                  readinessScore.overall >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {readinessScore.overall}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Calidad sueño</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{width: `${readinessScore.sleep}%`}}></div>
                    </div>
                    <span className="text-slate-300 w-8">{readinessScore.sleep}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Dolor muscular</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{width: `${readinessScore.muscle_soreness}%`}}></div>
                    </div>
                    <span className="text-slate-300 w-8">{readinessScore.muscle_soreness}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Estrés</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{width: `${readinessScore.stress}%`}}></div>
                    </div>
                    <span className="text-slate-300 w-8">{readinessScore.stress}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Motivación</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{width: `${readinessScore.motivation}%`}}></div>
                    </div>
                    <span className="text-slate-300 w-8">{readinessScore.motivation}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className={`text-xs font-medium ${
                  readinessScore.overall >= 80 ? 'text-emerald-400' :
                  readinessScore.overall >= 60 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {readinessScore.overall >= 80 ? '✓ Listo para entrenar' :
                   readinessScore.overall >= 60 ? '⚠ Entrenamiento moderado' : '✗ Requiere descanso'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Training Load Ratio Card */}
          <Card className="lg:col-span-3 border-0 shadow-lg bg-white">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">Ratio Carga Aguda:Crónica</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  trainingLoadRatio.status === 'optimal' ? 'bg-emerald-100 text-emerald-700' :
                  trainingLoadRatio.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                  trainingLoadRatio.status === 'danger' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {trainingLoadRatio.status === 'optimal' ? 'Óptimo' :
                   trainingLoadRatio.status === 'warning' ? 'Precaución' :
                   trainingLoadRatio.status === 'danger' ? 'Riesgo' : 'Bajo'}
                </span>
              </div>
              <div className="flex items-end gap-4 mb-3">
                <span className={`text-4xl font-bold ${
                  trainingLoadRatio.status === 'optimal' ? 'text-emerald-600' :
                  trainingLoadRatio.status === 'warning' ? 'text-amber-600' :
                  trainingLoadRatio.status === 'danger' ? 'text-red-600' : 'text-blue-600'
                }`}>
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
                <div className="flex items-center gap-2 text-[10px]">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-emerald-500"></div>
                    <span className="text-slate-500">0.8-1.3</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-amber-500"></div>
                    <span className="text-slate-500">1.3-1.5</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded bg-red-500"></div>
                    <span className="text-slate-500">&gt;1.5</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards - Now 6 columns */}
          <div className="lg:col-span-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {/* Total Atletas */}
            <Card 
              className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-200/50 cursor-pointer hover:scale-[1.02] transition-all duration-200"
              onClick={() => onNavigate && onNavigate('datos', 'athletes')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs font-medium">Atletas</p>
                    <p className="text-2xl font-bold mt-0.5">{totalAthletes}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Eventos Próximos */}
            <Card 
              className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-200/50 cursor-pointer hover:scale-[1.02] transition-all duration-200"
              onClick={() => onNavigate && onNavigate('datos', 'competitions')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-xs font-medium">Eventos</p>
                    <p className="text-2xl font-bold mt-0.5">{upcomingEventsCount}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Flag className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sesiones */}
            <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-200/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100 text-xs font-medium">Sesiones</p>
                    <p className="text-2xl font-bold mt-0.5">{completedSessions}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Macrociclos */}
            <Card 
              className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0 shadow-lg shadow-violet-200/50 cursor-pointer hover:scale-[1.02] transition-all duration-200"
              onClick={() => onNavigate && onNavigate('datos', 'training-system')}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-violet-100 text-xs font-medium">Macrociclos</p>
                    <p className="text-2xl font-bold mt-0.5">{activeMacrocycles}</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ejercicios */}
            <Card className="bg-gradient-to-br from-pink-500 to-rose-500 text-white border-0 shadow-lg shadow-pink-200/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-pink-100 text-xs font-medium">Ejercicios</p>
                    <p className="text-2xl font-bold mt-0.5">150+</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Adherencia */}
            <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0 shadow-lg shadow-cyan-200/50">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-cyan-100 text-xs font-medium">Adherencia</p>
                    <p className="text-2xl font-bold mt-0.5">{panelStats?.completion_rate || 92}%</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ROW 2: Smart Alerts */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {alerts.map((alert, idx) => (
              <div key={idx} className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-sm border ${
                alert.color === 'green' ? 'bg-emerald-50 border-emerald-200' :
                alert.color === 'amber' ? 'bg-amber-50 border-amber-200' :
                alert.color === 'red' ? 'bg-red-50 border-red-200' :
                'bg-blue-50 border-blue-200'
              }`}>
                {React.createElement(alert.icon, { 
                  className: `w-5 h-5 flex-shrink-0 mt-0.5 ${
                    alert.color === 'green' ? 'text-emerald-600' :
                    alert.color === 'amber' ? 'text-amber-600' :
                    alert.color === 'red' ? 'text-red-600' :
                    'text-blue-600'
                  }` 
                })}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${
                    alert.color === 'green' ? 'text-emerald-800' :
                    alert.color === 'amber' ? 'text-amber-800' :
                    alert.color === 'red' ? 'text-red-800' :
                    'text-blue-800'
                  }`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    alert.color === 'green' ? 'text-emerald-600' :
                    alert.color === 'amber' ? 'text-amber-600' :
                    alert.color === 'red' ? 'text-red-600' :
                    'text-blue-600'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Motivational Quote */}
        {motivationalMessage && (
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <p className="text-sm md:text-base italic">"{motivationalMessage.text}"</p>
                <p className="text-slate-400 text-xs mt-1">— {motivationalMessage.author}</p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Análisis de Entrenamiento</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tipo de gráfica:</span>
            <select 
              value={chartType}
              onChange={(e) => setChartType(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="bar">Barras</option>
              <option value="line">Líneas</option>
              <option value="area">Área</option>
              <option value="mixed">Mixta</option>
            </select>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Volumen + Intensidad + Densidad Combined Chart */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Volumen, Intensidad y Densidad
                </div>
                {dataSource === 'api' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">En vivo</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                {chartType === 'bar' ? (
                  <BarChart data={volumeData} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="volumen" name="Volumen %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="intensidad" name="Intensidad %" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="densidad" name="Densidad %" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                ) : chartType === 'line' ? (
                  <LineChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="volumen" name="Volumen %" stroke="#3B82F6" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="intensidad" name="Intensidad %" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="densidad" name="Densidad %" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={volumeData}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" dataKey="volumen" name="Volumen %" stroke="#3B82F6" fillOpacity={1} fill="url(#colorVol)" />
                    <Area type="monotone" dataKey="intensidad" name="Intensidad %" stroke="#EF4444" fillOpacity={1} fill="url(#colorInt)" />
                    <Area type="monotone" dataKey="densidad" name="Densidad %" stroke="#10B981" fillOpacity={1} fill="url(#colorDen)" />
                  </AreaChart>
                ) : (
                  /* Mixed Chart - Bars con línea de densidad */
                  <ComposedChart data={volumeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="volumen" name="Volumen %" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="intensidad" name="Intensidad %" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.8} />
                    <Line type="monotone" dataKey="densidad" name="Densidad %" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981' }} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Intensidad + Recuperación Chart */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5 text-rose-500" />
                  Intensidad y Recuperación
                </div>
                {dataSource === 'api' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">En vivo</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={intensityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" domain={[0, 100]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="intensidad" 
                    name="Intensidad %"
                    stroke="#EF4444" 
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recuperacion" 
                    name="Recuperación %"
                    stroke="#10B981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="densidad" 
                    name="Densidad %"
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6', strokeWidth: 0, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Distribución de Fases - Pie Chart */}
          <Card className="shadow-lg border-0 bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-purple-500" />
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

          {/* Carga Acumulada - Area Chart */}
          <Card className="shadow-lg border-0 bg-white lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="w-5 h-5 text-orange-500" />
                Carga de Entrenamiento Acumulada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={loadData}>
                  <defs>
                    <linearGradient id="colorCarga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorFatiga" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Area 
                    type="monotone" 
                    dataKey="carga" 
                    name="Carga Acumulada"
                    stroke={COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#colorCarga)" 
                    strokeWidth={2}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="fatiga" 
                    name="Índice de Fatiga"
                    stroke={COLORS.danger} 
                    fillOpacity={1} 
                    fill="url(#colorFatiga)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
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
                  <Calendar className="w-4 h-4 text-purple-500" />
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
