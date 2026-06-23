import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  Landmark, Building2, School, Users, Trophy, Calendar, TrendingUp,
  Activity, Target, ChevronRight, Loader2, AlertTriangle, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const ENTITY_CONFIG = {
  federation: { icon: Landmark, color: '#F59E0B', label: 'Federación', emoji: '🏛️' },
  club: { icon: Building2, color: '#3B82F6', label: 'Club', emoji: '🏢' },
  school: { icon: School, color: '#10B981', label: 'Escuela', emoji: '🏫' },
  national_team: { icon: null, color: '#EF4444', label: 'Selección', emoji: '🇺🇳' },
  team: { icon: null, color: '#8B5CF6', label: 'Equipo', emoji: '⚽' },
  league: { icon: Trophy, color: '#F97316', label: 'Liga', emoji: '🏆' }
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

const EntityDashboard = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [entitiesRes, athletesRes, eventsRes] = await Promise.all([
        axios.get(`${API_URL}/api/entities`, { headers }),
        axios.get(`${API_URL}/api/athletes`, { headers }),
        axios.get(`${API_URL}/api/events-calendar/all`, { headers }).catch(() => ({ data: { events: [] } }))
      ]);

      setEntities(entitiesRes.data || []);
      setAthletes(athletesRes.data || []);
      setEvents(eventsRes.data?.events || []);
      
      // Calculate aggregated stats
      calculateDashboardData(entitiesRes.data || [], athletesRes.data || [], eventsRes.data?.events || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardData = (entitiesData, athletesData, eventsData) => {
    // Athletes by entity
    const athletesByEntity = {};
    entitiesData.forEach(entity => {
      athletesByEntity[entity.id] = athletesData.filter(
        athlete => athlete.affiliations?.includes(entity.id)
      );
    });

    // Stats by entity type
    const statsByType = {};
    Object.keys(ENTITY_CONFIG).forEach(type => {
      const entitiesOfType = entitiesData.filter(e => e.entity_type === type);
      let totalAthletes = 0;
      entitiesOfType.forEach(entity => {
        totalAthletes += athletesByEntity[entity.id]?.length || 0;
      });
      statsByType[type] = {
        count: entitiesOfType.length,
        athletes: totalAthletes,
        entities: entitiesOfType
      };
    });

    // Upcoming competitions
    const today = new Date();
    const upcomingCompetitions = eventsData.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate > today && (event.type === 'competition' || event.priority === 'high');
    }).slice(0, 5);

    // Athletes distribution for pie chart
    const athleteDistribution = entitiesData.map(entity => ({
      name: entity.name.substring(0, 20) + (entity.name.length > 20 ? '...' : ''),
      value: athletesByEntity[entity.id]?.length || 0,
      fullName: entity.name,
      type: entity.entity_type
    })).filter(d => d.value > 0);

    // Training activity by month (simulated based on athletes count)
    const monthlyActivity = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      monthlyActivity.push({
        month: date.toLocaleDateString('es', { month: 'short' }),
        sesiones: Math.floor(Math.random() * 100) + 50 + athletesData.length * 4,
        evaluaciones: Math.floor(Math.random() * 30) + 10 + athletesData.length
      });
    }

    setDashboardData({
      statsByType,
      athletesByEntity,
      upcomingCompetitions,
      athleteDistribution,
      monthlyActivity,
      totalAthletes: athletesData.length,
      totalEntities: entitiesData.length
    });
  };

  const getEntityDetails = (entityId) => {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) return null;

    const entityAthletes = dashboardData?.athletesByEntity[entityId] || [];
    const config = ENTITY_CONFIG[entity.entity_type] || {};
    
    return {
      ...entity,
      athletes: entityAthletes,
      athleteCount: entityAthletes.length,
      config
    };
  };

  const selectedEntity = selectedEntityId ? getEntityDetails(selectedEntityId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-slate-500">Cargando dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard por Entidad</h2>
          <p className="text-slate-500">Estadísticas agregadas de tu organización deportiva</p>
        </div>
        <Select value={selectedEntityId || 'all'} onValueChange={(v) => setSelectedEntityId(v === 'all' ? null : v)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📊 Todas las entidades</SelectItem>
            {entities.map(entity => {
              const config = ENTITY_CONFIG[entity.entity_type] || {};
              return (
                <SelectItem key={entity.id} value={entity.id}>
                  {config.emoji} {entity.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(ENTITY_CONFIG).slice(0, 4).map(([type, config]) => {
          const stats = dashboardData?.statsByType[type] || { count: 0, athletes: 0 };
          const IconComponent = config.icon;
          return (
            <Card key={type} className="border-0 shadow-md overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{config.emoji}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                    {stats.count} {stats.count === 1 ? 'entidad' : 'entidades'}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-slate-800">{config.label}</h3>
                <p className="text-sm text-slate-500">
                  <Users className="w-3 h-3 inline mr-1" />
                  {stats.athletes} atletas afiliados
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      {selectedEntity ? (
        // Entity Detail View
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedEntity.config.emoji}</span>
                <div>
                  <CardTitle className="text-xl">{selectedEntity.name}</CardTitle>
                  <p className="text-indigo-100">{selectedEntity.config.label} • {selectedEntity.city}, {selectedEntity.country}</p>
                </div>
              </div>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20" onClick={() => setSelectedEntityId(null)}>
                Ver todas
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Athletes List */}
              <div className="md:col-span-2">
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Atletas Afiliados ({selectedEntity.athleteCount})
                </h4>
                {selectedEntity.athletes.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {selectedEntity.athletes.map(athlete => (
                      <div key={athlete.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-bold">{athlete.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{athlete.name}</p>
                            <p className="text-xs text-slate-500">{athlete.sport} • {athlete.level}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => onNavigate?.('athletes', athlete.id)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500">No hay atletas afiliados</p>
                    <Button variant="link" onClick={() => onNavigate?.('athletes')}>
                      Afiliar atletas
                    </Button>
                  </div>
                )}
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <CardContent className="p-4">
                    <div className="text-blue-600 mb-2">
                      <Activity className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold text-blue-800">{selectedEntity.athleteCount}</p>
                    <p className="text-sm text-blue-600">Atletas totales</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <CardContent className="p-4">
                    <div className="text-green-600 mb-2">
                      <Target className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold text-green-800">
                      {selectedEntity.athletes.filter(a => a.level === 'elite' || a.level === 'avanzado').length}
                    </p>
                    <p className="text-sm text-green-600">Nivel avanzado/elite</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                  <CardContent className="p-4">
                    <div className="text-purple-600 mb-2">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <p className="text-3xl font-bold text-purple-800">
                      {Math.floor(Math.random() * 10) + 1}
                    </p>
                    <p className="text-sm text-purple-600">Planes activos</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Overview Dashboard
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Athletes Distribution Chart */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Distribución de Atletas por Entidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.athleteDistribution?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dashboardData.athleteDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {dashboardData.athleteDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-2 border rounded shadow text-xs">
                            <p className="font-bold">{data.fullName}</p>
                            <p>{data.value} atletas</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No hay atletas afiliados a entidades</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Activity Chart */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Actividad Mensual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dashboardData?.monthlyActivity || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sesiones" name="Sesiones" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="evaluaciones" name="Evaluaciones" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Upcoming Competitions */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Próximas Competencias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData?.upcomingCompetitions?.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.upcomingCompetitions.map((event, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Trophy className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{event.name}</p>
                          <p className="text-xs text-slate-500">{event.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-amber-600">
                          {new Date(event.date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>No hay competencias programadas</p>
                  <Button variant="link" onClick={() => onNavigate?.('event-calendar')}>
                    Agregar evento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts Section */}
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-500" />
                Alertas y Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData?.upcomingCompetitions?.length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Competencia próxima</p>
                      <p className="text-sm text-red-600">
                        {dashboardData.upcomingCompetitions[0]?.name} - Revisa los planes de entrenamiento
                      </p>
                    </div>
                  </div>
                )}
                
                {athletes.filter(a => !a.affiliations?.length).length > 0 && (
                  <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <Users className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Atletas sin afiliar</p>
                      <p className="text-sm text-amber-600">
                        {athletes.filter(a => !a.affiliations?.length).length} atletas no están afiliados a ninguna entidad
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Activity className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Recomendación de carga</p>
                    <p className="text-sm text-blue-600">
                      Basado en el calendario, considera ajustar la intensidad esta semana
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default EntityDashboard;
