import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Badge } from './ui/badge';
import {
  Plus, Save, Loader2, Calendar, Target, Activity, 
  ChevronDown, ChevronRight, ChevronLeft, Trash2, Edit2, BarChart3,
  TrendingUp, PieChart, Layers, Zap, Heart, Brain, GripVertical, X, Check,
  CheckCircle, Clock, BookOpen, History, Settings, Eye, FileText,
  Play, Pause, RotateCcw, AlertTriangle, Info
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============ CONSTANTES DE PERIODIZACIÓN ============

// Modelos de Periodización
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
  ]
};

// Duraciones de ciclo
const CYCLE_DURATIONS = [
  { id: 'olympic', label: 'Ciclo Olímpico', weeks: 208, description: '4 años' },
  { id: 'biannual', label: 'Bianual', weeks: 104, description: '2 años' },
  { id: 'annual', label: 'Anual', weeks: 52, description: '1 año' },
  { id: 'semester', label: 'Semestral', weeks: 26, description: '6 meses' },
  { id: 'quarter', label: 'Trimestral', weeks: 13, description: '3 meses' },
  { id: 'monthly', label: 'Mensual', weeks: 4, description: '1 mes' }
];

// Tipos de Macrociclo
const MACROCYCLE_TYPES = [
  { id: 'prep_general', name: 'Preparatorio General', color: '#3B82F6', volumeBase: 85, intensityBase: 55 },
  { id: 'prep_specific', name: 'Preparatorio Específico', color: '#8B5CF6', volumeBase: 70, intensityBase: 75 },
  { id: 'precompetitive', name: 'Precompetitivo', color: '#F59E0B', volumeBase: 50, intensityBase: 88 },
  { id: 'competitive', name: 'Competitivo', color: '#10B981', volumeBase: 40, intensityBase: 95 },
  { id: 'transition', name: 'Transición', color: '#6B7280', volumeBase: 30, intensityBase: 40 }
];

// Tipos de Mesociclo
const MESOCYCLE_TYPES = [
  { id: 'entrante', name: 'Entrante', color: '#94A3B8', description: 'Adaptación inicial' },
  { id: 'basico_desarrollador', name: 'Básico Desarrollador', color: '#3B82F6', description: 'Desarrollo de capacidades' },
  { id: 'basico_estabilizador', name: 'Básico Estabilizador', color: '#10B981', description: 'Consolidación de adaptaciones' },
  { id: 'precompetitivo', name: 'Precompetitivo', color: '#F59E0B', description: 'Puesta a punto' },
  { id: 'competitivo', name: 'Competitivo', color: '#EF4444', description: 'Rendimiento máximo' },
  { id: 'recuperacion', name: 'Recuperación', color: '#8B5CF6', description: 'Regeneración' }
];

// Tipos de Microciclo
const MICROCYCLE_TYPES = [
  { id: 'corriente', name: 'Corriente', color: '#64748B', loadPercent: 70 },
  { id: 'carga', name: 'De Carga', color: '#3B82F6', loadPercent: 85 },
  { id: 'choque', name: 'De Choque', color: '#EF4444', loadPercent: 100 },
  { id: 'competitivo', name: 'Competitivo', color: '#10B981', loadPercent: 60 },
  { id: 'aproximacion', name: 'De Aproximación', color: '#F59E0B', loadPercent: 75 },
  { id: 'restablecimiento', name: 'De Restablecimiento', color: '#8B5CF6', loadPercent: 45 }
];

// Magnitud de la carga
const LOAD_MAGNITUDES = [
  { id: 'muy_alta', name: 'Muy Alta', range: '98%-100%', color: '#DC2626' },
  { id: 'alta', name: 'Alta', range: '85%-95%', color: '#F97316' },
  { id: 'media', name: 'Media', range: '70%-80%', color: '#FBBF24' },
  { id: 'baja', name: 'Baja', range: '55%-65%', color: '#34D399' },
  { id: 'recuperacion', name: 'Recuperación', range: 'Hasta 50%', color: '#A78BFA' }
];

// Componentes de preparación
const PREPARATION_COMPONENTS = {
  general: [
    { id: 'fisica_general', name: 'Preparación Física General', category: 'general' },
    { id: 'fisica_especifica', name: 'Preparación Física Específica', category: 'general' },
    { id: 'tecnica', name: 'Preparación Técnica', category: 'general' },
    { id: 'tactica', name: 'Preparación Táctica', category: 'general' },
    { id: 'psicologica', name: 'Preparación Psicológica', category: 'general' },
    { id: 'teorica', name: 'Preparación Teórica', category: 'general' }
  ],
  fisica: [
    { id: 'resistencia', name: 'Resistencia', category: 'fisica' },
    { id: 'fuerza', name: 'Fuerza', category: 'fisica' },
    { id: 'velocidad', name: 'Velocidad', category: 'fisica' },
    { id: 'coordinativas', name: 'Capacidades Coordinativas', category: 'fisica' },
    { id: 'flexibilidad', name: 'Flexibilidad', category: 'fisica' }
  ],
  actividades: [
    { id: 'entrenamiento', name: 'Entrenamiento', category: 'actividades' },
    { id: 'control_dopaje', name: 'Control de Dopaje', category: 'actividades' },
    { id: 'comp_principal', name: 'Competencia Principal', category: 'actividades' },
    { id: 'comp_secundaria', name: 'Competencia Secundaria', category: 'actividades' },
    { id: 'recuperacion', name: 'Recuperación', category: 'actividades' }
  ],
  monitoreo: [
    { id: 'control_medico', name: 'Control Médico', category: 'monitoreo' },
    { id: 'control_fisico', name: 'Control Físico', category: 'monitoreo' },
    { id: 'control_tecnico', name: 'Control Técnico', category: 'monitoreo' },
    { id: 'control_tactico', name: 'Control Táctico', category: 'monitoreo' },
    { id: 'control_psicologico', name: 'Control Psicológico', category: 'monitoreo' },
    { id: 'control_teorico', name: 'Control Teórico', category: 'monitoreo' }
  ]
};

const PeriodizationComplete = ({ athleteId, athleteName, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState('history'); // history, create, detail
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Plans History State - Load from localStorage
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem('train_periodization_plans');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Plan Creation State
  const [wizardStep, setWizardStep] = useState(1);
  const [planConfig, setPlanConfig] = useState({
    name: '',
    model: '',
    duration: 'annual',
    startDate: '',
    endDate: '',
    mainObjective: '',
    sessionsPerWeek: 5,
    mainCompetition: '',
    mainCompetitionDate: ''
  });
  
  // Generated Plan Structure
  const [generatedPlan, setGeneratedPlan] = useState(null);
  
  // Chart Data
  const [chartData, setChartData] = useState([]);
  
  // Planning Grid Data (for the comprehensive view)
  const [planningGrid, setPlanningGrid] = useState({
    weeks: [],
    preparation: {},
    activities: {},
    monitoring: {}
  });

  const getToken = () => localStorage.getItem('train_token');

  // Save plans to localStorage when they change
  useEffect(() => {
    localStorage.setItem('train_periodization_plans', JSON.stringify(plans));
  }, [plans]);

  // Load existing plans - now just uses localStorage
  const loadPlans = useCallback(async () => {
    // Plans are already loaded from localStorage in useState initializer
    // But we can try to sync with backend if needed
    if (!athleteId) return;
    
    setLoading(true);
    try {
      const token = getToken();
      // Try to fetch from backend as additional source
      const response = await fetch(`${API_URL}/api/periodization/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.id && !plans.find(p => p.id === data.id)) {
          // Add backend plan if not already in localStorage
          setPlans(prev => [...prev, data]);
        }
      }
    } catch (error) {
      console.error('Error syncing with backend:', error);
    }
    setLoading(false);
  }, [athleteId, plans]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  // Generate plan structure
  const generatePlanStructure = () => {
    const { duration, startDate, sessionsPerWeek, model } = planConfig;
    const durationInfo = CYCLE_DURATIONS.find(d => d.id === duration);
    const totalWeeks = durationInfo?.weeks || 52;
    
    const start = new Date(startDate);
    const weeks = [];
    const volumeIntensityData = [];
    
    // Generate weeks with volume/intensity curves based on model
    for (let w = 1; w <= totalWeeks; w++) {
      const weekDate = new Date(start);
      weekDate.setDate(weekDate.getDate() + (w - 1) * 7);
      
      // Calculate volume and intensity based on periodization wave
      const phaseProgress = w / totalWeeks;
      let volume, intensity;
      
      if (model === 'traditional') {
        // Traditional: Volume starts high and decreases, intensity increases
        volume = Math.round(85 - (phaseProgress * 45) + (Math.sin(w / 4) * 10));
        intensity = Math.round(50 + (phaseProgress * 45) + (Math.sin(w / 3) * 8));
      } else if (model === 'atr') {
        // ATR blocks
        const block = Math.floor((w - 1) / (totalWeeks / 3));
        if (block === 0) { // Accumulation
          volume = 80 + Math.random() * 10;
          intensity = 55 + Math.random() * 10;
        } else if (block === 1) { // Transformation
          volume = 65 + Math.random() * 10;
          intensity = 75 + Math.random() * 10;
        } else { // Realization
          volume = 45 + Math.random() * 10;
          intensity = 90 + Math.random() * 8;
        }
      } else if (model === 'undulating_weekly') {
        // Weekly undulation
        const weekInCycle = w % 4;
        const baseVolume = 85 - (phaseProgress * 30);
        const baseIntensity = 55 + (phaseProgress * 35);
        volume = baseVolume + (weekInCycle === 2 ? 15 : weekInCycle === 3 ? -20 : 0);
        intensity = baseIntensity + (weekInCycle === 2 ? 10 : weekInCycle === 3 ? -15 : 0);
      } else {
        // Default linear
        volume = Math.round(80 - (phaseProgress * 40));
        intensity = Math.round(55 + (phaseProgress * 40));
      }
      
      // Clamp values
      volume = Math.max(30, Math.min(100, Math.round(volume)));
      intensity = Math.max(40, Math.min(100, Math.round(intensity)));
      
      // Determine load magnitude
      let loadMagnitude;
      if (intensity >= 98) loadMagnitude = LOAD_MAGNITUDES[0];
      else if (intensity >= 85) loadMagnitude = LOAD_MAGNITUDES[1];
      else if (intensity >= 70) loadMagnitude = LOAD_MAGNITUDES[2];
      else if (intensity >= 55) loadMagnitude = LOAD_MAGNITUDES[3];
      else loadMagnitude = LOAD_MAGNITUDES[4];
      
      weeks.push({
        weekNumber: w,
        startDate: weekDate.toISOString().split('T')[0],
        volume,
        intensity,
        loadMagnitude: loadMagnitude.id,
        sessions: sessionsPerWeek
      });
      
      volumeIntensityData.push({
        semana: `S${w}`,
        week: w,
        volumen: volume,
        intensidad: intensity
      });
    }
    
    setChartData(volumeIntensityData);
    
    // Generate mesocycles (every 4 weeks)
    const mesocycles = [];
    for (let m = 0; m < Math.ceil(totalWeeks / 4); m++) {
      const mesoWeeks = weeks.slice(m * 4, (m + 1) * 4);
      const avgVolume = Math.round(mesoWeeks.reduce((s, w) => s + w.volume, 0) / mesoWeeks.length);
      const avgIntensity = Math.round(mesoWeeks.reduce((s, w) => s + w.intensity, 0) / mesoWeeks.length);
      
      // Determine mesocycle type based on position and load
      let mesoType;
      if (m === 0) mesoType = MESOCYCLE_TYPES[0]; // Entrante
      else if (avgIntensity >= 85) mesoType = MESOCYCLE_TYPES[4]; // Competitivo
      else if (avgVolume >= 75) mesoType = MESOCYCLE_TYPES[1]; // Básico Desarrollador
      else if (avgIntensity >= 70) mesoType = MESOCYCLE_TYPES[3]; // Precompetitivo
      else if (m === Math.ceil(totalWeeks / 4) - 1) mesoType = MESOCYCLE_TYPES[5]; // Recuperación
      else mesoType = MESOCYCLE_TYPES[2]; // Básico Estabilizador
      
      mesocycles.push({
        id: `meso-${m + 1}`,
        number: m + 1,
        name: `Mesociclo ${m + 1}`,
        type: mesoType,
        weeks: mesoWeeks,
        avgVolume,
        avgIntensity
      });
    }
    
    // Determine macrocycle phase based on weeks
    const determineMacroPhase = (weekNum) => {
      const progress = weekNum / totalWeeks;
      if (progress < 0.25) return MACROCYCLE_TYPES[0]; // Prep General
      if (progress < 0.45) return MACROCYCLE_TYPES[1]; // Prep Específico
      if (progress < 0.60) return MACROCYCLE_TYPES[2]; // Precompetitivo
      if (progress < 0.90) return MACROCYCLE_TYPES[3]; // Competitivo
      return MACROCYCLE_TYPES[4]; // Transición
    };
    
    const plan = {
      id: `plan-${Date.now()}`,
      name: planConfig.name || `Plan ${new Date().getFullYear()}`,
      athleteId,
      model: planConfig.model,
      duration: planConfig.duration,
      startDate: planConfig.startDate,
      endDate: weeks[weeks.length - 1]?.startDate,
      totalWeeks,
      sessionsPerWeek: planConfig.sessionsPerWeek,
      mainObjective: planConfig.mainObjective,
      mainCompetition: planConfig.mainCompetition,
      mainCompetitionDate: planConfig.mainCompetitionDate,
      weeks,
      mesocycles,
      macroPhases: MACROCYCLE_TYPES.map(phase => ({
        ...phase,
        weeksCount: weeks.filter(w => determineMacroPhase(w.weekNumber).id === phase.id).length
      })),
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    return plan;
  };

  // Create new plan
  const handleCreatePlan = async () => {
    if (!planConfig.startDate || !planConfig.model) {
      toast.error('Completa todos los campos requeridos');
      return;
    }
    
    setSaving(true);
    try {
      const plan = generatePlanStructure();
      setGeneratedPlan(plan);
      
      // Save to localStorage via state update
      setPlans(prev => [plan, ...prev]);
      
      // Try to save to backend (non-blocking)
      try {
        const token = getToken();
        await fetch(`${API_URL}/api/periodization`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            athlete_id: athleteId,
            ...plan
          })
        });
      } catch (backendError) {
        console.log('Backend save optional, plan saved locally');
      }
      
      toast.success('Plan de periodización creado exitosamente');
      setActiveView('detail');
      setSelectedPlan(plan);
    } catch (error) {
      console.error('Error creating plan:', error);
      toast.error('Error al crear el plan');
    }
    setSaving(false);
  };

  // Delete plan
  const handleDeletePlan = async (planId) => {
    if (!window.confirm('¿Eliminar este plan de periodización?')) return;
    
    try {
      const token = getToken();
      await fetch(`${API_URL}/api/periodization/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setPlans(prev => prev.filter(p => p.id !== planId));
      toast.success('Plan eliminado');
      
      if (selectedPlan?.id === planId) {
        setSelectedPlan(null);
        setActiveView('history');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  // View plan detail
  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    
    // Regenerate chart data from plan
    if (plan.weeks) {
      setChartData(plan.weeks.map(w => ({
        semana: `S${w.weekNumber}`,
        week: w.weekNumber,
        volumen: w.volume,
        intensidad: w.intensity
      })));
    }
    
    setActiveView('detail');
  };

  // ============ RENDER VIEWS ============

  // History View - List of plans
  const renderHistoryView = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <History className="w-7 h-7 text-blue-500" />
            Historial de Planes
          </h2>
          <p className="text-slate-500 mt-1">
            {athleteName ? `Planes de periodización para ${athleteName}` : 'Gestiona tus planes de entrenamiento'}
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          onClick={() => {
            setWizardStep(1);
            setPlanConfig({
              name: '',
              model: '',
              duration: 'annual',
              startDate: '',
              endDate: '',
              mainObjective: '',
              sessionsPerWeek: 5,
              mainCompetition: '',
              mainCompetitionDate: ''
            });
            setActiveView('create');
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Nuevo Plan
        </Button>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : plans.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Sin planes de periodización</h3>
            <p className="text-slate-500 mb-6">Crea tu primer plan para comenzar a estructurar el entrenamiento</p>
            <Button 
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => setActiveView('create')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <Card 
              key={plan.id} 
              className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer"
              onClick={() => handleViewPlan(plan)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {plan.totalWeeks || plan.weeks?.length || 0} semanas
                        </span>
                        <span>•</span>
                        <span>{PERIODIZATION_MODELS.classic.find(m => m.id === plan.model)?.name || 
                               PERIODIZATION_MODELS.undulating.find(m => m.id === plan.model)?.name ||
                               PERIODIZATION_MODELS.advanced.find(m => m.id === plan.model)?.name ||
                               plan.model}</span>
                        <span>•</span>
                        <span>{plan.startDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${plan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {plan.status === 'active' ? 'Activo' : 'Completado'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlan(plan.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // Create View - Wizard
  const renderCreateView = () => {
    const steps = [
      { number: 1, title: 'Modelo', subtitle: 'Tipo de periodización' },
      { number: 2, title: 'Duración', subtitle: 'Ciclo temporal' },
      { number: 3, title: 'Objetivos', subtitle: 'Metas del plan' },
      { number: 4, title: 'Configuración', subtitle: 'Detalles finales' }
    ];
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Crear Plan de Periodización</h2>
            <p className="text-slate-500 mt-1">Configura tu nuevo plan de entrenamiento</p>
          </div>
          <Button variant="outline" onClick={() => setActiveView('history')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-xl">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div 
                className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all ${
                  wizardStep === step.number 
                    ? 'bg-blue-500 text-white' 
                    : wizardStep > step.number 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-white text-slate-500'
                }`}
                onClick={() => step.number < wizardStep && setWizardStep(step.number)}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  wizardStep === step.number 
                    ? 'bg-white/20' 
                    : wizardStep > step.number 
                      ? 'bg-green-200' 
                      : 'bg-slate-100'
                }`}>
                  {wizardStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="hidden md:block">
                  <div className="font-semibold text-sm">{step.title}</div>
                  <div className="text-xs opacity-70">{step.subtitle}</div>
                </div>
              </div>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 text-slate-300" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Model Selection */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Elige el Modelo de Periodización</h3>
                  <p className="text-slate-500">Selecciona el enfoque metodológico para tu plan</p>
                </div>

                {Object.entries(PERIODIZATION_MODELS).map(([category, models]) => (
                  <div key={category} className="mb-6">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {category === 'classic' ? 'Clásicos' : category === 'undulating' ? 'Ondulatorios' : 'Avanzados'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {models.map(model => (
                        <div
                          key={model.id}
                          className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            planConfig.model === model.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-slate-200 hover:border-blue-300'
                          }`}
                          onClick={() => setPlanConfig({ ...planConfig, model: model.id })}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: model.color }}
                            />
                            <span className="font-semibold text-slate-800">{model.name}</span>
                          </div>
                          <p className="text-sm text-slate-500">{model.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Duration */}
            {wizardStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Duración del Ciclo</h3>
                  <p className="text-slate-500">Define el período temporal del plan</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {CYCLE_DURATIONS.map(duration => (
                    <div
                      key={duration.id}
                      className={`p-5 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        planConfig.duration === duration.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                      onClick={() => setPlanConfig({ ...planConfig, duration: duration.id })}
                    >
                      <div className="text-3xl font-bold text-blue-600 mb-1">{duration.weeks}</div>
                      <div className="text-sm text-slate-500">semanas</div>
                      <div className="font-semibold text-slate-800 mt-2">{duration.label}</div>
                      <div className="text-xs text-slate-400">{duration.description}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Inicio</label>
                    <Input 
                      type="date"
                      value={planConfig.startDate}
                      onChange={(e) => setPlanConfig({ ...planConfig, startDate: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sesiones por Semana</label>
                    <Select 
                      value={planConfig.sessionsPerWeek.toString()} 
                      onValueChange={(v) => setPlanConfig({ ...planConfig, sessionsPerWeek: parseInt(v) })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[3, 4, 5, 6, 7].map(n => (
                          <SelectItem key={n} value={n.toString()}>{n} sesiones</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Objectives */}
            {wizardStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Objetivos del Plan</h3>
                  <p className="text-slate-500">Define las metas principales</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nombre del Plan</label>
                  <Input 
                    placeholder="Ej: Preparación Campeonato Nacional 2025"
                    value={planConfig.name}
                    onChange={(e) => setPlanConfig({ ...planConfig, name: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Objetivo Principal</label>
                  <textarea 
                    className="w-full p-3 border rounded-lg resize-none h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe el objetivo principal del plan..."
                    value={planConfig.mainObjective}
                    onChange={(e) => setPlanConfig({ ...planConfig, mainObjective: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Competencia Principal</label>
                    <Input 
                      placeholder="Nombre del evento"
                      value={planConfig.mainCompetition}
                      onChange={(e) => setPlanConfig({ ...planConfig, mainCompetition: e.target.value })}
                      className="h-12"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Competencia</label>
                    <Input 
                      type="date"
                      value={planConfig.mainCompetitionDate}
                      onChange={(e) => setPlanConfig({ ...planConfig, mainCompetitionDate: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Final Configuration */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Resumen del Plan</h3>
                  <p className="text-slate-500">Revisa la configuración antes de crear</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {CYCLE_DURATIONS.find(d => d.id === planConfig.duration)?.weeks || 0}
                      </div>
                      <div className="text-sm text-slate-500">Semanas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{planConfig.sessionsPerWeek}</div>
                      <div className="text-sm text-slate-500">Sesiones/Sem</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {Math.ceil((CYCLE_DURATIONS.find(d => d.id === planConfig.duration)?.weeks || 0) / 4)}
                      </div>
                      <div className="text-sm text-slate-500">Mesociclos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-emerald-600">
                        {(CYCLE_DURATIONS.find(d => d.id === planConfig.duration)?.weeks || 0) * planConfig.sessionsPerWeek}
                      </div>
                      <div className="text-sm text-slate-500">Total Sesiones</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">Modelo</div>
                    <div className="font-semibold text-slate-800">
                      {PERIODIZATION_MODELS.classic.find(m => m.id === planConfig.model)?.name ||
                       PERIODIZATION_MODELS.undulating.find(m => m.id === planConfig.model)?.name ||
                       PERIODIZATION_MODELS.advanced.find(m => m.id === planConfig.model)?.name}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">Duración</div>
                    <div className="font-semibold text-slate-800">
                      {CYCLE_DURATIONS.find(d => d.id === planConfig.duration)?.label}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">Inicio</div>
                    <div className="font-semibold text-slate-800">{planConfig.startDate || 'No definido'}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">Competencia</div>
                    <div className="font-semibold text-slate-800">{planConfig.mainCompetition || 'No definida'}</div>
                  </div>
                </div>

                {planConfig.mainObjective && (
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <div className="text-sm text-slate-500 mb-1">Objetivo Principal</div>
                    <div className="text-slate-800">{planConfig.mainObjective}</div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button 
                variant="outline"
                onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setActiveView('history')}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {wizardStep > 1 ? 'Anterior' : 'Cancelar'}
              </Button>
              
              {wizardStep < 4 ? (
                <Button 
                  className="bg-blue-500 hover:bg-blue-600"
                  onClick={() => setWizardStep(wizardStep + 1)}
                  disabled={wizardStep === 1 && !planConfig.model}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  onClick={handleCreatePlan}
                  disabled={saving || !planConfig.startDate}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Crear Plan
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Detail View - Full plan visualization
  const renderDetailView = () => {
    const plan = selectedPlan || generatedPlan;
    if (!plan) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{plan.name}</h2>
            <p className="text-slate-500 mt-1">
              {plan.totalWeeks || plan.weeks?.length} semanas • {plan.sessionsPerWeek} sesiones/semana
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setActiveView('history')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600">
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="structure" className="w-full">
          <TabsList className="grid grid-cols-5 mb-6 h-auto p-1 bg-slate-100">
            <TabsTrigger value="structure" className="py-2">
              <Layers className="w-4 h-4 mr-2" />
              Estructura
            </TabsTrigger>
            <TabsTrigger value="charts" className="py-2">
              <BarChart3 className="w-4 h-4 mr-2" />
              Gráficos
            </TabsTrigger>
            <TabsTrigger value="preparation" className="py-2">
              <Target className="w-4 h-4 mr-2" />
              Preparación
            </TabsTrigger>
            <TabsTrigger value="activities" className="py-2">
              <Activity className="w-4 h-4 mr-2" />
              Actividades
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="py-2">
              <Eye className="w-4 h-4 mr-2" />
              Monitoreo
            </TabsTrigger>
          </TabsList>

          {/* Structure Tab */}
          <TabsContent value="structure">
            {/* Macrocycle Types Legend */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Tipos de Macrociclo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  {MACROCYCLE_TYPES.map(type => (
                    <div 
                      key={type.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{ borderColor: type.color + '60', backgroundColor: type.color + '10' }}
                    >
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                      <span className="font-medium text-sm">{type.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mesocycle Types */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Tipos de Mesociclo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {MESOCYCLE_TYPES.map(type => (
                    <div 
                      key={type.id}
                      className="p-3 rounded-lg border text-center"
                      style={{ borderColor: type.color + '60', backgroundColor: type.color + '10' }}
                    >
                      <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: type.color }} />
                      <div className="font-semibold text-sm text-slate-800">{type.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{type.description}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Microcycle Types */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Tipos de Microciclo
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {MICROCYCLE_TYPES.map(type => (
                    <div 
                      key={type.id}
                      className="p-3 rounded-lg border text-center"
                      style={{ borderColor: type.color + '60', backgroundColor: type.color + '10' }}
                    >
                      <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: type.color }} />
                      <div className="font-semibold text-sm text-slate-800">{type.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{type.loadPercent}% carga</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Load Magnitude */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Magnitud de la Carga
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-3">
                  {LOAD_MAGNITUDES.map(mag => (
                    <div 
                      key={mag.id}
                      className="p-4 rounded-lg text-center"
                      style={{ backgroundColor: mag.color + '20' }}
                    >
                      <div className="w-6 h-6 rounded-full mx-auto mb-2" style={{ backgroundColor: mag.color }} />
                      <div className="font-bold text-slate-800">{mag.name}</div>
                      <div className="text-sm text-slate-600 mt-1">{mag.range}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Charts Tab */}
          <TabsContent value="charts">
            {/* Volume & Intensity Chart */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  Volumen e Intensidad por Semana
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        formatter={(value, name) => [
                          `${value}%`,
                          name === 'volumen' ? 'Volumen' : 'Intensidad'
                        ]}
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="volumen" 
                        fill="#3B82F6" 
                        stroke="#3B82F6"
                        fillOpacity={0.3}
                        name="Volumen"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="intensidad" 
                        stroke="#EF4444" 
                        strokeWidth={3}
                        dot={{ fill: '#EF4444', strokeWidth: 2 }}
                        name="Intensidad"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Frequency Info */}
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  Frecuencia de Entrenamiento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-4 text-center">
                  {LOAD_MAGNITUDES.map(mag => (
                    <div key={mag.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="text-3xl font-bold" style={{ color: mag.color }}>
                        {mag.id === 'muy_alta' ? '6' : mag.id === 'alta' ? '5' : mag.id === 'media' ? '5' : mag.id === 'baja' ? '4' : '3'}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">sesiones/sem</div>
                      <div className="text-xs font-medium mt-2" style={{ color: mag.color }}>{mag.name}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preparation Tab */}
          <TabsContent value="preparation">
            {/* General Preparation */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4">
                <CardTitle className="text-base">Preparación General</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50">Componente</th>
                        {chartData.slice(0, 20).map((_, idx) => (
                          <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">
                            S{idx + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREPARATION_COMPONENTS.general.map(comp => (
                        <tr key={comp.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                          {chartData.slice(0, 20).map((week, idx) => {
                            const value = Math.round(30 + Math.random() * 50);
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                <div 
                                  className="w-6 h-6 mx-auto rounded text-xs flex items-center justify-center font-medium text-white"
                                  style={{ 
                                    backgroundColor: value > 70 ? '#EF4444' : value > 50 ? '#F59E0B' : value > 30 ? '#10B981' : '#94A3B8',
                                    opacity: 0.2 + (value / 100) * 0.8
                                  }}
                                >
                                  
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Physical Preparation */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4">
                <CardTitle className="text-base">Preparación Física</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50">Capacidad</th>
                        {chartData.slice(0, 20).map((_, idx) => (
                          <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">
                            S{idx + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREPARATION_COMPONENTS.fisica.map(comp => (
                        <tr key={comp.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                          {chartData.slice(0, 20).map((week, idx) => {
                            const value = Math.round(20 + Math.random() * 60);
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                <div 
                                  className="w-6 h-6 mx-auto rounded text-xs flex items-center justify-center font-medium text-white"
                                  style={{ 
                                    backgroundColor: value > 70 ? '#DC2626' : value > 50 ? '#F97316' : value > 30 ? '#22C55E' : '#A78BFA',
                                    opacity: 0.3 + (value / 100) * 0.7
                                  }}
                                >
                                  
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activities Tab */}
          <TabsContent value="activities">
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4">
                <CardTitle className="text-base">Actividades</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50">Actividad</th>
                        {chartData.slice(0, 20).map((_, idx) => (
                          <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">
                            S{idx + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREPARATION_COMPONENTS.actividades.map(comp => (
                        <tr key={comp.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                          {chartData.slice(0, 20).map((week, idx) => {
                            const hasActivity = Math.random() > 0.7;
                            const isMainComp = comp.id === 'comp_principal' && idx > 15;
                            const isSecComp = comp.id === 'comp_secundaria' && (idx === 8 || idx === 12);
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                {(hasActivity || isMainComp || isSecComp) && (
                                  <div 
                                    className={`w-6 h-6 mx-auto rounded flex items-center justify-center ${
                                      isMainComp ? 'bg-red-500' : isSecComp ? 'bg-amber-500' : 'bg-blue-400'
                                    }`}
                                  >
                                    {(isMainComp || isSecComp) && <CheckCircle className="w-4 h-4 text-white" />}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Events Calendar */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Eventos / Competencias - Calendario
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>El calendario de competencias se mostrará aquí</p>
                    <p className="text-sm mt-1">Agrega eventos en la sección de Competencias</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoring Tab */}
          <TabsContent value="monitoring">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-600 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Monitoreo / Evaluaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50">Control</th>
                        {chartData.slice(0, 20).map((_, idx) => (
                          <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">
                            S{idx + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PREPARATION_COMPONENTS.monitoreo.map(comp => (
                        <tr key={comp.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                          {chartData.slice(0, 20).map((week, idx) => {
                            // Schedule controls at specific intervals
                            const isControlWeek = 
                              (comp.id === 'control_medico' && (idx === 0 || idx === 12)) ||
                              (comp.id === 'control_fisico' && idx % 4 === 0) ||
                              (comp.id === 'control_tecnico' && idx % 3 === 0) ||
                              (comp.id === 'control_tactico' && idx % 5 === 0) ||
                              (comp.id === 'control_psicologico' && (idx === 0 || idx === 8 || idx === 16)) ||
                              (comp.id === 'control_teorico' && idx % 6 === 0);
                            
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                {isControlWeek && (
                                  <div className="w-6 h-6 mx-auto rounded bg-rose-500 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  // Main Render
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        {activeView === 'history' && renderHistoryView()}
        {activeView === 'create' && renderCreateView()}
        {activeView === 'detail' && renderDetailView()}
      </div>
    </div>
  );
};

export default PeriodizationComplete;
