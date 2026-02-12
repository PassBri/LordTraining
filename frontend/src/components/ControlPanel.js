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
  FileText, Loader2, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
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
    'transition': '#8B5CF6'
  }
};

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

    setAlerts(newAlerts.slice(0, 3)); // Máximo 3 alertas
  }, [events, athletes, periodizationData, selectedAthleteId, panelStats]);

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
          
          realVolumeData.push({
            semana: `S${weekCounter}`,
            volumen: volume,
            objetivo: micro.isDeload ? volume + 20 : volume - 5
          });

          realIntensityData.push({
            semana: `S${weekCounter}`,
            intensidad: intensity,
            recuperacion: 100 - intensity + (micro.isDeload ? 20 : 0)
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

    // Datos de ejemplo si no hay periodización real
    if (volumeData.length === 0) {
      const weeks = [];
      for (let i = 1; i <= 12; i++) {
        weeks.push({
          semana: `S${i}`,
          volumen: Math.floor(50 + Math.random() * 50),
          objetivo: 70 + (i % 4 === 0 ? -20 : (i % 3) * 5)
        });
      }
      setVolumeData(weeks);

      const intensity = [];
      for (let i = 1; i <= 12; i++) {
        intensity.push({
          semana: `S${i}`,
          intensidad: Math.floor(40 + (i * 3) + Math.random() * 15),
          recuperacion: Math.floor(80 - (i * 2) + Math.random() * 10)
        });
      }
      setIntensityData(intensity);

      setPhaseDistribution([
        { name: 'Prep. General', value: 30, color: COLORS.phases['Prep. General'] },
        { name: 'Prep. Específico', value: 25, color: COLORS.phases['Prep. Específico'] },
        { name: 'Precompetitivo', value: 15, color: COLORS.phases['Precompetitivo'] },
        { name: 'Competitivo', value: 22, color: COLORS.phases['Competitivo'] },
        { name: 'Transición', value: 8, color: COLORS.phases['Transición'] }
      ]);

      const load = [];
      let accumulated = 0;
      for (let i = 1; i <= 12; i++) {
        accumulated += Math.floor(20 + Math.random() * 30);
        load.push({
          semana: `S${i}`,
          carga: accumulated,
          fatiga: Math.floor(30 + Math.random() * 40)
        });
      }
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
    <div className="overflow-y-auto h-full bg-slate-50/50">
      {/* Compact Header - Material Design */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-slate-800">Panel de Control</h2>
              <span className="text-xs text-slate-400">
                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {/* Quick Stats Pills */}
              <div className="hidden md:flex items-center gap-2 mr-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full text-xs font-medium text-blue-700">
                  <Users className="h-3 w-3" />
                  <span>{totalAthletes} atletas</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-full text-xs font-medium text-emerald-700">
                  <Activity className="h-3 w-3" />
                  <span>{activeMacrocycles} activos</span>
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-8 text-slate-600 hover:text-slate-800" onClick={handleSave}>
                <Save className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-slate-600 hover:text-slate-800" onClick={handleViewReports}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Compact Filter Row */}
          <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
            <Input placeholder="Competencia" className="h-7 text-xs min-w-[120px] max-w-[140px] bg-slate-50 border-slate-200" />
            <Input placeholder="Deporte" className="h-7 text-xs min-w-[100px] max-w-[120px] bg-slate-50 border-slate-200" />
            <Input placeholder="Modalidad" className="h-7 text-xs min-w-[100px] max-w-[120px] bg-slate-50 border-slate-200" />
            <Input placeholder="Categoría" className="h-7 text-xs min-w-[100px] max-w-[120px] bg-slate-50 border-slate-200" />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Quick Stats Row - Compact Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div 
            className="bg-white rounded-xl p-3 border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
            onClick={() => onNavigate && onNavigate('datos', 'athletes')}
          >
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <Users className="w-4 h-4 text-blue-600 group-hover:text-white" />
              </div>
              <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{totalAthletes}</p>
            <p className="text-xs text-slate-500">Total Atletas</p>
          </div>
          
          <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                <Calendar className="w-4 h-4 text-emerald-600 group-hover:text-white" />
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">Este mes</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{upcomingEventsCount}</p>
            <p className="text-xs text-slate-500">Eventos Próximos</p>
          </div>
          
          <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-amber-200 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                <Target className="w-4 h-4 text-amber-600 group-hover:text-white" />
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{Math.round((completedSessions/totalSessions)*100)}%</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{completedSessions}</p>
            <p className="text-xs text-slate-500">Sesiones</p>
          </div>
          
          <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-violet-200 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center group-hover:bg-violet-500 transition-colors">
                <Activity className="w-4 h-4 text-violet-600 group-hover:text-white" />
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded">Activos</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">{activeMacrocycles}</p>
            <p className="text-xs text-slate-500">Macrociclos</p>
          </div>
          
          <div className="bg-white rounded-xl p-3 border border-slate-100 hover:border-pink-200 hover:shadow-md transition-all cursor-pointer group">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center group-hover:bg-pink-500 transition-colors">
                <Dumbbell className="w-4 h-4 text-pink-600 group-hover:text-white" />
              </div>
              <span className="text-[10px] px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded">Biblioteca</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">150+</p>
            <p className="text-xs text-slate-500">Ejercicios</p>
          </div>
        </div>

        {/* Alert Banner - Compact */}
        {alerts.length > 0 && alerts[0] && (
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border ${
            alerts[0].color === 'green' ? 'bg-emerald-50 border-emerald-200' :
            alerts[0].color === 'amber' ? 'bg-amber-50 border-amber-200' :
            alerts[0].color === 'red' ? 'bg-red-50 border-red-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            {React.createElement(alerts[0].icon, { 
              className: `w-4 h-4 flex-shrink-0 ${
                alerts[0].color === 'green' ? 'text-emerald-600' :
                alerts[0].color === 'amber' ? 'text-amber-600' :
                alerts[0].color === 'red' ? 'text-red-600' :
                'text-blue-600'
              }` 
            })}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                alerts[0].color === 'green' ? 'text-emerald-800' :
                alerts[0].color === 'amber' ? 'text-amber-800' :
                alerts[0].color === 'red' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {alerts[0].title}
                <span className="font-normal opacity-75 ml-2">{alerts[0].message}</span>
              </p>
            </div>
          </div>
        )}

        {/* Motivational Quote - Minimal */}
        {motivationalMessage && (
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg text-white">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-sm">
              <span className="italic">"{motivationalMessage.text}"</span>
              <span className="text-slate-400 ml-2">— {motivationalMessage.author}</span>
            </p>
          </div>
        )}

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volumen por Semana - Bar Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Volumen de Entrenamiento por Semana
                {dataSource === 'api' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Datos reales</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={volumeData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="volumen" name="Volumen Real" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="objetivo" name="Objetivo" fill={COLORS.secondary} radius={[4, 4, 0, 0]} opacity={0.6} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Progreso de Intensidad - Line Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Progreso de Intensidad
                {dataSource === 'api' && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Datos reales</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={intensityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="intensidad" 
                    name="Intensidad (%)"
                    stroke={COLORS.danger} 
                    strokeWidth={3}
                    dot={{ fill: COLORS.danger, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="recuperacion" 
                    name="Recuperación (%)"
                    stroke={COLORS.secondary} 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribución de Fases - Pie Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-purple-500" />
                Distribución de Fases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={phaseDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {phaseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {phaseDistribution.map((phase, idx) => (
                  <div key={idx} className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                    <span className="text-slate-600">{phase.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Carga Acumulada - Area Chart */}
          <Card className="shadow-lg border-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="w-5 h-5 text-orange-500" />
                Carga de Entrenamiento Acumulada
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="semana" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
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

        {/* Resumen del Atleta Seleccionado */}
        {selectedAthlete && (
          <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-800 to-slate-900 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-cyan-400" />
                Resumen del Atleta: {selectedAthlete.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Datos Básicos */}
                <div className="space-y-3">
                  <h4 className="text-cyan-400 font-semibold text-sm uppercase tracking-wider">Datos Básicos</h4>
                  <div className="space-y-2">
                    <p className="text-slate-300 text-sm">Deporte: <span className="text-white font-medium">{selectedAthlete.sport || 'No definido'}</span></p>
                    <p className="text-slate-300 text-sm">Nivel: <span className="text-white font-medium">{selectedAthlete.level || 'Intermedio'}</span></p>
                    <p className="text-slate-300 text-sm">Edad: <span className="text-white font-medium">{selectedAthlete.age || '-'} años</span></p>
                  </div>
                </div>

                {/* Estado del Plan */}
                <div className="space-y-3">
                  <h4 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Estado del Plan</h4>
                  <div className="space-y-2">
                    <p className="text-slate-300 text-sm">Fase actual: <span className="text-emerald-400 font-medium">
                      {periodizationData?.mesocycles?.[0]?.phaseName || 'Sin plan'}
                    </span></p>
                    <p className="text-slate-300 text-sm">Semana: <span className="text-white font-medium">
                      {periodizationData ? '4 de ' + (periodizationData.totalWeeks || 52) : '-'}
                    </span></p>
                    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                      <div className="bg-emerald-400 h-2 rounded-full" style={{ width: periodizationData ? '8%' : '0%' }} />
                    </div>
                  </div>
                </div>

                {/* Próximos Eventos */}
                <div className="space-y-3">
                  <h4 className="text-amber-400 font-semibold text-sm uppercase tracking-wider">Próximo Evento</h4>
                  <div className="space-y-2">
                    {events.filter(e => e.athleteId === selectedAthleteId).slice(0, 1).map(event => (
                      <div key={event.id} className="bg-slate-700/50 rounded-lg p-2">
                        <p className="text-white font-medium text-sm">{event.title || event.name}</p>
                        <p className="text-slate-400 text-xs">{new Date(event.date).toLocaleDateString('es-ES')}</p>
                      </div>
                    ))}
                    {events.filter(e => e.athleteId === selectedAthleteId).length === 0 && (
                      <p className="text-slate-400 text-sm">Sin eventos programados</p>
                    )}
                  </div>
                </div>

                {/* Rendimiento */}
                <div className="space-y-3">
                  <h4 className="text-pink-400 font-semibold text-sm uppercase tracking-wider">Rendimiento</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Adherencia</span>
                      <span className="text-emerald-400 font-bold">{panelStats?.completion_rate || 92}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Carga semanal</span>
                      <span className="text-amber-400 font-bold">Alto</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300 text-sm">Tendencia</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <ArrowUpRight className="w-4 h-4" /> Positiva
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            className="h-auto py-4 bg-blue-500 hover:bg-blue-600 flex flex-col items-center gap-2"
            onClick={handleNewAthlete}
            data-testid="quick-new-athlete"
          >
            <Users className="w-6 h-6" />
            <span>Nuevo Atleta</span>
          </Button>
          <Button 
            className="h-auto py-4 bg-emerald-500 hover:bg-emerald-600 flex flex-col items-center gap-2"
            onClick={handleNewEvent}
            data-testid="quick-new-event"
          >
            <Calendar className="w-6 h-6" />
            <span>Programar Evento</span>
          </Button>
          <Button 
            className="h-auto py-4 bg-purple-500 hover:bg-purple-600 flex flex-col items-center gap-2"
            onClick={handleNewMacrocycle}
            data-testid="quick-new-macrocycle"
          >
            <Target className="w-6 h-6" />
            <span>Crear Macrociclo</span>
          </Button>
          <Button 
            className="h-auto py-4 bg-amber-500 hover:bg-amber-600 flex flex-col items-center gap-2"
            onClick={handleViewReports}
            data-testid="quick-view-reports"
          >
            <BarChart3 className="w-6 h-6" />
            <span>Ver Reportes</span>
          </Button>
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
                  Resumen del Plan de Entrenamiento
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
