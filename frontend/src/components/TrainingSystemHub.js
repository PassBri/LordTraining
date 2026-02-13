import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import {
  Activity, BarChart3, Target, Clipboard, TrendingUp, 
  ChevronRight, Users, Zap, BookOpen, Layers, Settings,
  Calendar, Clock, AlertTriangle, CheckCircle, ArrowRight,
  Brain, Heart, Dumbbell
} from 'lucide-react';
import { toast } from 'sonner';

// Import sub-components
import PeriodizationComplete from './PeriodizationComplete';
import TestEvaluations from './TestEvaluations';
import TrainingLoad from './TrainingLoad';
import TrainingControl from './TrainingControl';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Modelos de Periodización disponibles
const PERIODIZATION_MODELS = {
  classic: [
    { id: 'traditional', name: 'Tradicional (Matveiev)', description: 'Ondulación gradual del volumen e intensidad', color: '#3B82F6' },
    { id: 'atr', name: 'ATR (Issurin)', description: 'Acumulación-Transformación-Realización', color: '#8B5CF6' },
    { id: 'blocks', name: 'Por Bloques (Verkhoshansky)', description: 'Concentración de cargas en bloques', color: '#10B981' }
  ],
  undulating: [
    { id: 'daily_undulating', name: 'Ondulatorio Diario', description: 'Variación diaria de estímulos', color: '#F59E0B' },
    { id: 'weekly_undulating', name: 'Ondulatorio Semanal', description: 'Variación semanal de cargas', color: '#EF4444' }
  ],
  advanced: [
    { id: 'pendulum', name: 'Péndulo (Arosiev)', description: 'Alternancia de énfasis preparación-competición', color: '#EC4899' },
    { id: 'structural_bells', name: 'Campanas Estructurales (Forteza)', description: 'Modelo de campanas para periodización', color: '#06B6D4' },
    { id: 'contemporary', name: 'Contemporáneo (Bondarchuk)', description: 'Individualización máxima', color: '#84CC16' },
    { id: 'inverse', name: 'Periodización Inversa', description: 'Intensidad primero, volumen después', color: '#A855F7' },
    { id: 'tactical', name: 'Táctico', description: 'Para deportes de equipo', color: '#F97316' }
  ],
  specific: [
    { id: 'concurrent', name: 'Concurrente', description: 'Desarrollo simultáneo de capacidades', color: '#14B8A6' },
    { id: 'conjugate', name: 'Conjugado (Westside)', description: 'Rotación de ejercicios principales', color: '#E11D48' },
    { id: 'polarized', name: 'Polarizado', description: '80% baja intensidad, 20% alta intensidad', color: '#7C3AED' }
  ]
};

const TrainingSystemHub = ({ athleteId, athleteName, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [systemData, setSystemData] = useState({
    periodization: null,
    tests: [],
    load: null,
    control: null
  });
  const [selectedModel, setSelectedModel] = useState(null);

  // Fetch all training system data
  const fetchSystemData = async () => {
    if (!athleteId) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch periodization data
      const periodRes = await fetch(`${API_URL}/api/periodization/${athleteId}`, { headers });
      const periodData = periodRes.ok ? await periodRes.json() : null;

      // Fetch test evaluations
      const testsRes = await fetch(`${API_URL}/api/test-evaluations/${athleteId}`, { headers });
      const testsData = testsRes.ok ? await testsRes.json() : { evaluations: [] };

      // Fetch training load
      const loadRes = await fetch(`${API_URL}/api/training-load/${athleteId}`, { headers });
      const loadData = loadRes.ok ? await loadRes.json() : null;

      setSystemData({
        periodization: periodData,
        tests: testsData.evaluations || [],
        load: loadData,
        control: null // Se calculará basado en tests y load
      });
    } catch (error) {
      console.error('Error fetching system data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSystemData();
  }, [athleteId]);

  // Calcular estado general del sistema
  const calculateSystemHealth = () => {
    const health = {
      periodization: systemData.periodization ? 100 : 0,
      tests: systemData.tests.length > 0 ? Math.min(systemData.tests.length * 20, 100) : 0,
      load: systemData.load ? 80 : 0,
      overall: 0
    };
    health.overall = Math.round((health.periodization + health.tests + health.load) / 3);
    return health;
  };

  const health = calculateSystemHealth();

  // Vista general del sistema
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Banner de estado */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Sistema de Entrenamiento</h2>
            <p className="text-blue-100">
              {athleteName ? `Configuración para ${athleteName}` : 'Selecciona un atleta para comenzar'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{health.overall}%</div>
            <div className="text-sm text-blue-100">Completitud del Sistema</div>
          </div>
        </div>
      </div>

      {/* Cards de componentes del sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Modelos de Periodización */}
        <Card 
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          onClick={() => setActiveTab('periodization')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Modelos de Periodización</h3>
            <p className="text-sm text-slate-500 mb-3">Estructura del entrenamiento</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all" 
                  style={{ width: `${health.periodization}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{health.periodization}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Tests y Evaluaciones */}
        <Card 
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          onClick={() => setActiveTab('tests')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Clipboard className="w-6 h-6 text-emerald-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Tests y Evaluaciones</h3>
            <p className="text-sm text-slate-500 mb-3">Control de marcas y tiempos</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all" 
                  style={{ width: `${health.tests}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{systemData.tests.length} tests</span>
            </div>
          </CardContent>
        </Card>

        {/* Carga de Entrenamiento */}
        <Card 
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          onClick={() => setActiveTab('load')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Carga de Entrenamiento</h3>
            <p className="text-sm text-slate-500 mb-3">Volumen, intensidad, densidad</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all" 
                  style={{ width: `${health.load}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">{health.load}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Control de Rendimiento */}
        <Card 
          className="border-0 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
          onClick={() => setActiveTab('control')}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-rose-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Control de Rendimiento</h3>
            <p className="text-sm text-slate-500 mb-3">Seguimiento y ajustes</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-rose-500 h-2 rounded-full transition-all" 
                  style={{ width: `${Math.round((health.tests + health.load) / 2)}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-slate-600">Activo</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Flujo de trabajo del sistema */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="border-b bg-slate-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" />
            Flujo de Trabajo del Sistema de Entrenamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { icon: BookOpen, label: '1. Modelo', sublabel: 'Seleccionar modelo de periodización', color: 'blue' },
              { icon: Layers, label: '2. Estructura', sublabel: 'Macro → Meso → Micro → Sesiones', color: 'indigo' },
              { icon: Clipboard, label: '3. Evaluación', sublabel: 'Tests iniciales y de control', color: 'emerald' },
              { icon: BarChart3, label: '4. Carga', sublabel: 'Definir volumen e intensidad', color: 'amber' },
              { icon: TrendingUp, label: '5. Control', sublabel: 'Monitorear y ajustar', color: 'rose' },
              { icon: Target, label: '6. Plan Gráfico', sublabel: 'Visualización final', color: 'purple' },
            ].map((step, idx) => (
              <React.Fragment key={idx}>
                <div className={`flex flex-col items-center p-4 rounded-xl bg-${step.color}-50 border border-${step.color}-100 min-w-[140px]`}>
                  <div className={`w-10 h-10 rounded-full bg-${step.color}-100 flex items-center justify-center mb-2`}>
                    <step.icon className={`w-5 h-5 text-${step.color}-600`} />
                  </div>
                  <span className="font-semibold text-sm text-slate-800">{step.label}</span>
                  <span className="text-xs text-slate-500 text-center mt-1">{step.sublabel}</span>
                </div>
                {idx < 5 && <ArrowRight className="w-5 h-5 text-slate-300 hidden md:block" />}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumen de datos conectados */}
      {systemData.periodization && (
        <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h3 className="font-bold text-slate-800">Sistema Configurado</h3>
                <p className="text-sm text-slate-500">Los datos están conectados y listos para visualizar</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {systemData.periodization?.macrocycle?.mesocycles?.length || 0}
                </div>
                <div className="text-xs text-slate-500">Mesociclos</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-emerald-600">
                  {systemData.tests.length}
                </div>
                <div className="text-xs text-slate-500">Evaluaciones</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">
                  {systemData.periodization?.macrocycle?.config?.sessionsPerWeek || 0}
                </div>
                <div className="text-xs text-slate-500">Sesiones/Semana</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {systemData.periodization?.macrocycle?.config?.model ? 'Activo' : '-'}
                </div>
                <div className="text-xs text-slate-500">Modelo</div>
              </div>
            </div>
            <Button 
              className="w-full mt-4 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
              onClick={() => onNavigate && onNavigate('graphic-plan')}
            >
              <Target className="w-4 h-4 mr-2" />
              Ver Plan Gráfico Completo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Alerta si no hay atleta seleccionado */}
      {!athleteId && (
        <Card className="border-0 shadow-lg border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
              <div>
                <h3 className="font-bold text-slate-800">Selecciona un Atleta</h3>
                <p className="text-sm text-slate-500">
                  Para configurar el sistema de entrenamiento, primero selecciona un atleta en la sección de Información.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {/* Tabs de navegación */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-6 h-auto p-1 bg-slate-100">
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-white data-[state=active]:shadow py-3"
            >
              <Activity className="w-4 h-4 mr-2" />
              Resumen
            </TabsTrigger>
            <TabsTrigger 
              value="periodization"
              className="data-[state=active]:bg-white data-[state=active]:shadow py-3"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Periodización
            </TabsTrigger>
            <TabsTrigger 
              value="tests"
              className="data-[state=active]:bg-white data-[state=active]:shadow py-3"
            >
              <Clipboard className="w-4 h-4 mr-2" />
              Evaluaciones
            </TabsTrigger>
            <TabsTrigger 
              value="load"
              className="data-[state=active]:bg-white data-[state=active]:shadow py-3"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Carga
            </TabsTrigger>
            <TabsTrigger 
              value="control"
              className="data-[state=active]:bg-white data-[state=active]:shadow py-3"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Control
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0">
            {renderOverview()}
          </TabsContent>

          <TabsContent value="periodization" className="mt-0">
            <PeriodizationComplete 
              athleteId={athleteId} 
              athleteName={athleteName}
              onNavigate={onNavigate}
            />
          </TabsContent>

          <TabsContent value="tests" className="mt-0">
            <TestEvaluations athleteId={athleteId} />
          </TabsContent>

          <TabsContent value="load" className="mt-0">
            <TrainingLoad athleteId={athleteId} />
          </TabsContent>

          <TabsContent value="control" className="mt-0">
            <TrainingControl athleteId={athleteId} athleteName={athleteName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainingSystemHub;
