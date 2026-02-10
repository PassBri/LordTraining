import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { getDashboardStats, getAthletes, seedExercises } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, FileText, Calendar, Sparkles, TrendingUp, ArrowRight, Plus, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const DashboardPage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, athletesRes] = await Promise.all([
        getDashboardStats(),
        getAthletes()
      ]);
      setStats(statsRes.data);
      setAthletes(athletesRes.data.slice(0, 5));
      
      // Seed exercises on first load
      try {
        await seedExercises();
      } catch (e) {
        // Ignore if already seeded
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              BIENVENIDO, {user?.name?.toUpperCase()}
            </h1>
            <p className="text-slate-500 mt-1">Aquí tienes un resumen de tu actividad</p>
          </div>
          <Link to="/ai-generator">
            <Button className="bg-[#007AFF] hover:bg-blue-600 font-bold uppercase tracking-wide" data-testid="generate-plan-btn">
              <Sparkles className="w-4 h-4 mr-2" />
              Generar Plan con IA
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-slate-200" data-testid="stat-athletes">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-50 text-[#007AFF] flex items-center justify-center rounded-lg">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {stats?.athletes_count || 0}/{stats?.athletes_limit || 2}
                </span>
              </div>
              <div className="stat-value">{stats?.athletes_count || 0}</div>
              <div className="stat-label">Atletas</div>
              <Progress value={(stats?.athletes_count / stats?.athletes_limit) * 100} className="mt-4 h-1" />
            </CardContent>
          </Card>

          <Card className="border-slate-200" data-testid="stat-plans">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-lime-50 text-[#65a30d] flex items-center justify-center rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <div className="stat-value">{stats?.macrocycles_count || 0}</div>
              <div className="stat-label">Planes Activos</div>
            </CardContent>
          </Card>

          <Card className="border-slate-200" data-testid="stat-sessions">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 flex items-center justify-center rounded-lg">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
              <div className="stat-value">{stats?.completed_sessions || 0}</div>
              <div className="stat-label">Sesiones Completadas</div>
              <div className="text-sm text-slate-500 mt-2">
                {stats?.completion_rate || 0}% tasa de cumplimiento
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200" data-testid="stat-ai">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 flex items-center justify-center rounded-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {stats?.ai_generations_used || 0}/{stats?.ai_generations_limit || 3}
                </span>
              </div>
              <div className="stat-value">{stats?.ai_generations_used || 0}</div>
              <div className="stat-label">Generaciones IA</div>
              <Progress value={(stats?.ai_generations_used / stats?.ai_generations_limit) * 100} className="mt-4 h-1" />
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Load Chart */}
          <Card className="lg:col-span-8 border-slate-200" data-testid="load-chart">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                CARGA DE ENTRENAMIENTO
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.weekly_load?.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.weekly_load}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'white', 
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                        }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="load" 
                        stroke="#007AFF" 
                        strokeWidth={2}
                        dot={{ fill: '#007AFF', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hay datos de carga disponibles</p>
                    <p className="text-sm mt-1">Crea planes y sesiones para ver el progreso</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Athletes List */}
          <Card className="lg:col-span-4 border-slate-200" data-testid="athletes-list">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                ATLETAS
              </CardTitle>
              <Link to="/athletes">
                <Button variant="ghost" size="sm" className="text-[#007AFF]">
                  Ver todos <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {athletes.length > 0 ? (
                <div className="space-y-3">
                  {athletes.map((athlete) => (
                    <Link 
                      key={athlete.id} 
                      to={`/athletes/${athlete.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-slate-200 text-slate-600 flex items-center justify-center rounded-full font-bold text-sm">
                        {athlete.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{athlete.name}</div>
                        <div className="text-xs text-slate-500 capitalize">{athlete.sport}</div>
                      </div>
                      <span className="badge badge-blue">{athlete.level}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Users className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 mb-4">No tienes atletas aún</p>
                  <Link to="/athletes">
                    <Button size="sm" className="bg-slate-900">
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Atleta
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscription Banner */}
        {user?.subscription === 'free' && (
          <Card className="border-[#007AFF] bg-blue-50/50" data-testid="upgrade-banner">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#007AFF] text-white flex items-center justify-center rounded-lg">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Barlow Condensed' }}>
                    ACTUALIZA A PRO
                  </h3>
                  <p className="text-sm text-slate-600">
                    Desbloquea atletas ilimitados, más generaciones con IA y funciones premium
                  </p>
                </div>
              </div>
              <Link to="/subscription">
                <Button className="bg-[#007AFF] hover:bg-blue-600 font-bold uppercase tracking-wide whitespace-nowrap">
                  Ver Planes
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
