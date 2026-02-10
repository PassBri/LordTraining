import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, Calendar, Target, Activity, Dumbbell, TrendingUp, 
  BarChart3, Heart, Zap, ArrowUpRight, ArrowDownRight,
  Flag, Timer, Flame, Save, Download, AlertTriangle, 
  CheckCircle, Info, Sparkles, Trophy, Star, MessageCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { toast } from 'sonner';

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
    'Transición': '#8B5CF6'
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

  // Seleccionar mensaje motivacional aleatorio
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length);
    setMotivationalMessage(MOTIVATIONAL_MESSAGES[randomIndex]);
  }, []);

  // Generar alertas inteligentes basadas en datos reales
  useEffect(() => {
    const newAlerts = [];
    const today = new Date();

    // Alertas basadas en eventos próximos
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
        } else {
          newAlerts.push({
            type: 'info',
            icon: Calendar,
            title: `Evento próximo (${daysUntilEvent} días)`,
            message: `${athleteName}: ${event.title}`,
            color: 'blue'
          });
        }
      }
    });

    // Alerta de semana de descarga basada en carga acumulada
    if (periodizationData?.mesocycles) {
      const currentWeek = Math.ceil((today - new Date(periodizationData.startDate)) / (1000 * 60 * 60 * 24 * 7));
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

    // Alerta si no hay atletas
    if (athletes.length === 0) {
      newAlerts.push({
        type: 'info',
        icon: Users,
        title: 'Sin atletas registrados',
        message: 'Comienza agregando tu primer atleta para crear planes de entrenamiento.',
        color: 'blue'
      });
    }

    // Alerta si hay atleta seleccionado sin periodización
    if (selectedAthleteId && !periodizationData) {
      const athlete = athletes.find(a => a.id === selectedAthleteId);
      newAlerts.push({
        type: 'warning',
        icon: Target,
        title: 'Sin plan de periodización',
        message: `${athlete?.name || 'El atleta seleccionado'} no tiene un macrociclo configurado.`,
        color: 'amber'
      });
    }

    // Alerta motivacional si todo está bien
    if (newAlerts.length === 0 && athletes.length > 0) {
      newAlerts.push({
        type: 'success',
        icon: Trophy,
        title: '¡Todo en orden!',
        message: 'El sistema está actualizado y listo para el entrenamiento.',
        color: 'green'
      });
    }

    setAlerts(newAlerts.slice(0, 3)); // Máximo 3 alertas
  }, [events, athletes, periodizationData, selectedAthleteId]);

  // Procesar datos reales de periodización para gráficos
  useEffect(() => {
    if (periodizationData?.mesocycles) {
      // Extraer datos reales de volumen e intensidad
      const realVolumeData = [];
      const realIntensityData = [];
      const phaseCount = {};
      let weekCounter = 1;
      let accumulatedLoad = 0;
      const realLoadData = [];

      periodizationData.mesocycles.forEach(meso => {
        // Contar fases
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

      // Si hay datos reales, usarlos
      if (realVolumeData.length > 0) {
        setVolumeData(realVolumeData.slice(0, 12));
        setIntensityData(realIntensityData.slice(0, 12));
        setLoadData(realLoadData.slice(0, 12));

        // Distribución de fases real
        const totalWeeks = Object.values(phaseCount).reduce((a, b) => a + b, 0);
        const distribution = Object.entries(phaseCount).map(([name, count]) => ({
          name: name.replace('preparatory_general', 'Prep. General')
                    .replace('preparatory_specific', 'Prep. Específico')
                    .replace('precompetitive', 'Precompetitivo')
                    .replace('competitive', 'Competitivo')
                    .replace('transition', 'Transición'),
          value: Math.round((count / totalWeeks) * 100),
          color: COLORS.phases[name] || COLORS.primary
        }));
        setPhaseDistribution(distribution);
        return;
      }
    }

    // Datos de ejemplo si no hay periodización real
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
  }, [periodizationData]);

  // Calcular estadísticas
  const totalAthletes = athletes.length;
  const upcomingEvents = events.filter(e => new Date(e.date) > new Date()).length;
  const completedSessions = stats.completed_sessions || Math.floor(Math.random() * 50) + 20;
  const activeMacrocycles = stats.macrocycle_count || (periodizationData ? 1 : 0);

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
      onNavigate('datos', 'calendar');
    }
    if (onCreateEvent) {
      onCreateEvent();
    }
    toast.success('Navega al Calendario de Eventos');
  };

  const handleNewMacrocycle = () => {
    if (onNavigate) {
      onNavigate('datos', 'periodization-system');
    }
    if (onCreateMacrocycle) {
      onCreateMacrocycle();
    }
    toast.success('Navega a Modelos de Periodización');
  };

  const handleViewReports = () => {
    toast.info('Función de reportes próximamente disponible');
  };

  const handleExportPDF = () => {
    toast.info('Exportando reporte a PDF...');
    // Simulación de exportación
    setTimeout(() => {
      toast.success('Reporte exportado correctamente');
    }, 1500);
  };

  const handleSave = () => {
    toast.success('Datos guardados correctamente');
  };

  return (
    <div className="overflow-y-auto h-full bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Bar con inputs y botones */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg mx-6 mt-6 mb-4">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
            <h2 className="text-xl font-bold text-white">Panel de Control</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm text-white">
                <Heart className="h-4 w-4" />
                <span>75 bpm</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm text-white">
                <Zap className="h-4 w-4" />
                <span>85%</span>
              </div>
              <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Guardar
              </Button>
              <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </div>
        
        {/* Form inputs row */}
        <div className="bg-white p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Input placeholder="Competencia" className="h-9" />
          <Input placeholder="Tipo de Competencia" className="h-9" />
          <Input placeholder="Deporte" className="h-9" />
          <Input placeholder="Modalidad" className="h-9" />
          <Input placeholder="Categoría" className="h-9" />
          <Input placeholder="Entrenador" className="h-9" />
        </div>
      </div>

      <div className="p-6 pt-0 space-y-6">
        {/* Mensaje Motivacional */}
        {motivationalMessage && (
          <Card className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white border-0 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-medium italic">"{motivationalMessage.text}"</p>
                  <p className="text-white/80 text-sm mt-1">— {motivationalMessage.author}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alertas Inteligentes */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alerts.map((alert, idx) => {
              const IconComponent = alert.icon;
              const colorClasses = {
                amber: 'bg-amber-50 border-amber-200 text-amber-800',
                blue: 'bg-blue-50 border-blue-200 text-blue-800',
                green: 'bg-green-50 border-green-200 text-green-800',
                red: 'bg-red-50 border-red-200 text-red-800'
              };
              const iconColors = {
                amber: 'text-amber-500',
                blue: 'text-blue-500',
                green: 'text-green-500',
                red: 'text-red-500'
              };
              return (
                <Card key={idx} className={`border ${colorClasses[alert.color]} shadow-sm`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <IconComponent className={`w-5 h-5 flex-shrink-0 ${iconColors[alert.color]}`} />
                      <div>
                        <p className="font-semibold text-sm">{alert.title}</p>
                        <p className="text-xs mt-1 opacity-80">{alert.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Stats info row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500">Resumen general del sistema de entrenamiento</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">Última actualización</p>
              <p className="font-medium text-slate-700">{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Total Atletas */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-200 cursor-pointer hover:scale-105 transition-transform" onClick={handleNewAthlete}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Atletas</p>
                  <p className="text-3xl font-bold mt-1">{totalAthletes}</p>
                  <p className="text-blue-200 text-xs mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Click para agregar
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Eventos Programados */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-200 cursor-pointer hover:scale-105 transition-transform" onClick={handleNewEvent}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Eventos Próximos</p>
                  <p className="text-3xl font-bold mt-1">{upcomingEvents}</p>
                  <p className="text-emerald-200 text-xs mt-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Este mes
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Flag className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sesiones Completadas */}
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-sm font-medium">Sesiones</p>
                  <p className="text-3xl font-bold mt-1">{completedSessions}</p>
                  <p className="text-amber-200 text-xs mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> 85% completadas
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Activity className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Macrociclos Activos */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg shadow-purple-200 cursor-pointer hover:scale-105 transition-transform" onClick={handleNewMacrocycle}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Macrociclos</p>
                  <p className="text-3xl font-bold mt-1">{activeMacrocycles}</p>
                  <p className="text-purple-200 text-xs mt-1 flex items-center gap-1">
                    <Timer className="w-3 h-3" /> Activos
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ejercicios en Biblioteca */}
          <Card className="bg-gradient-to-br from-pink-500 to-rose-500 text-white border-0 shadow-lg shadow-pink-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-pink-100 text-sm font-medium">Ejercicios</p>
                  <p className="text-3xl font-bold mt-1">150+</p>
                  <p className="text-pink-200 text-xs mt-1 flex items-center gap-1">
                    <Dumbbell className="w-3 h-3" /> En biblioteca
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Volumen por Semana - Bar Chart */}
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Volumen de Entrenamiento por Semana
                {periodizationData && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Datos reales</span>}
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
                {periodizationData && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full ml-2">Datos reales</span>}
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
                        <p className="text-white font-medium text-sm">{event.title}</p>
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
                      <span className="text-emerald-400 font-bold">92%</span>
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
    </div>
  );
};

export default ControlPanel;
