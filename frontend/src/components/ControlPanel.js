import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { 
  Users, Calendar, Target, Activity, Dumbbell, TrendingUp, 
  BarChart3, Clock, Award, Heart, Zap, ArrowUpRight, ArrowDownRight,
  ChevronRight, Flag, Timer, Flame, Save, Download
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

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
    'Transición': '#8B5CF6'
  }
};

const ControlPanel = ({ 
  athletes = [], 
  events = [], 
  selectedAthleteId,
  periodizationData,
  stats = {}
}) => {
  const [volumeData, setVolumeData] = useState([]);
  const [intensityData, setIntensityData] = useState([]);
  const [phaseDistribution, setPhaseDistribution] = useState([]);
  const [loadData, setLoadData] = useState([]);

  // Generar datos de ejemplo para gráficos basados en periodización
  useEffect(() => {
    // Datos de volumen por semana
    const weeks = [];
    for (let i = 1; i <= 12; i++) {
      weeks.push({
        semana: `S${i}`,
        volumen: Math.floor(50 + Math.random() * 50),
        objetivo: 70 + (i % 4 === 0 ? -20 : (i % 3) * 5)
      });
    }
    setVolumeData(weeks);

    // Datos de intensidad
    const intensity = [];
    for (let i = 1; i <= 12; i++) {
      intensity.push({
        semana: `S${i}`,
        intensidad: Math.floor(40 + (i * 3) + Math.random() * 15),
        recuperacion: Math.floor(80 - (i * 2) + Math.random() * 10)
      });
    }
    setIntensityData(intensity);

    // Distribución de fases
    setPhaseDistribution([
      { name: 'Prep. General', value: 30, color: COLORS.phases['Prep. General'] },
      { name: 'Prep. Específico', value: 25, color: COLORS.phases['Prep. Específico'] },
      { name: 'Precompetitivo', value: 15, color: COLORS.phases['Precompetitivo'] },
      { name: 'Competitivo', value: 22, color: COLORS.phases['Competitivo'] },
      { name: 'Transición', value: 8, color: COLORS.phases['Transición'] }
    ]);

    // Carga acumulada
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
  const activeMacrocycles = stats.macrocycle_count || 1;

  // Atleta seleccionado
  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Panel de Control
          </h1>
          <p className="text-slate-500 mt-1">Resumen general del sistema de entrenamiento</p>
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
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Atletas</p>
                <p className="text-3xl font-bold mt-1">{totalAthletes}</p>
                <p className="text-blue-200 text-xs mt-1 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> +2 este mes
                </p>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eventos Programados */}
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-200">
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
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg shadow-purple-200">
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
                  <p className="text-slate-300 text-sm">Fase actual: <span className="text-emerald-400 font-medium">Preparatorio General</span></p>
                  <p className="text-slate-300 text-sm">Semana: <span className="text-white font-medium">4 de 52</span></p>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
                    <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '8%' }} />
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
        <Button className="h-auto py-4 bg-blue-500 hover:bg-blue-600 flex flex-col items-center gap-2">
          <Users className="w-6 h-6" />
          <span>Nuevo Atleta</span>
        </Button>
        <Button className="h-auto py-4 bg-emerald-500 hover:bg-emerald-600 flex flex-col items-center gap-2">
          <Calendar className="w-6 h-6" />
          <span>Programar Evento</span>
        </Button>
        <Button className="h-auto py-4 bg-purple-500 hover:bg-purple-600 flex flex-col items-center gap-2">
          <Target className="w-6 h-6" />
          <span>Crear Macrociclo</span>
        </Button>
        <Button className="h-auto py-4 bg-amber-500 hover:bg-amber-600 flex flex-col items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          <span>Ver Reportes</span>
        </Button>
      </div>
    </div>
  );
};

export default ControlPanel;
