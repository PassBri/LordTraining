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
  Play, Pause, RotateCcw, AlertTriangle, Info, Dumbbell
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, ComposedChart, Cell, ReferenceLine
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ============ CONSTANTES DE PERIODIZACIÓN ============

// Fases del Macrociclo con porcentajes de volumen e intensidad
const MACROCYCLE_PHASES = [
  { id: 'prep_general', name: 'Preparatorio General', color: '#3B82F6', volumePercent: 85, intensityPercent: 55 },
  { id: 'prep_specific', name: 'Preparatorio Específico', color: '#8B5CF6', volumePercent: 70, intensityPercent: 75 },
  { id: 'precompetitive', name: 'Precompetitivo', color: '#F59E0B', volumePercent: 55, intensityPercent: 88 },
  { id: 'competitive', name: 'Competitivo', color: '#10B981', volumePercent: 40, intensityPercent: 95 },
  { id: 'transition', name: 'Transición', color: '#6B7280', volumePercent: 30, intensityPercent: 45 }
];

// Tipos de Mesociclo
const MESOCYCLE_TYPES = [
  { id: 'entrante', name: 'Entrante', color: '#94A3B8', loadFactor: 0.7, description: 'Adaptación inicial' },
  { id: 'basico_desarrollador', name: 'Básico Desarrollador', color: '#3B82F6', loadFactor: 1.0, description: 'Desarrollo de capacidades' },
  { id: 'basico_estabilizador', name: 'Básico Estabilizador', color: '#10B981', loadFactor: 0.9, description: 'Consolidación' },
  { id: 'precompetitivo', name: 'Precompetitivo', color: '#F59E0B', loadFactor: 0.85, description: 'Puesta a punto' },
  { id: 'competitivo', name: 'Competitivo', color: '#EF4444', loadFactor: 0.75, description: 'Rendimiento máximo' },
  { id: 'recuperacion', name: 'Recuperación', color: '#A78BFA', loadFactor: 0.5, description: 'Regeneración' }
];

// Tipos de Microciclo
const MICROCYCLE_TYPES = [
  { id: 'corriente', name: 'Corriente', color: '#64748B', loadPercent: 70 },
  { id: 'carga', name: 'De Carga', color: '#3B82F6', loadPercent: 85 },
  { id: 'choque', name: 'De Choque', color: '#EF4444', loadPercent: 100 },
  { id: 'competitivo', name: 'Competitivo', color: '#10B981', loadPercent: 60 },
  { id: 'aproximacion', name: 'De Aproximación', color: '#F59E0B', loadPercent: 75 },
  { id: 'restablecimiento', name: 'De Restablecimiento', color: '#A78BFA', loadPercent: 45 }
];

// Tipos de Sesión
const SESSION_TYPES = [
  { id: 'strength', name: 'Fuerza', color: '#EF4444' },
  { id: 'endurance', name: 'Resistencia', color: '#3B82F6' },
  { id: 'speed', name: 'Velocidad', color: '#F59E0B' },
  { id: 'technical', name: 'Técnica', color: '#10B981' },
  { id: 'tactical', name: 'Táctica', color: '#8B5CF6' },
  { id: 'recovery', name: 'Recuperación', color: '#A78BFA' },
  { id: 'flexibility', name: 'Flexibilidad', color: '#EC4899' }
];

// Magnitud de la carga
const LOAD_MAGNITUDES = [
  { id: 'muy_alta', name: 'Muy Alta', range: '98%-100%', color: '#DC2626', min: 98 },
  { id: 'alta', name: 'Alta', range: '85%-95%', color: '#F97316', min: 85 },
  { id: 'media', name: 'Media', range: '70%-80%', color: '#FBBF24', min: 70 },
  { id: 'baja', name: 'Baja', range: '55%-65%', color: '#34D399', min: 55 },
  { id: 'recuperacion', name: 'Recuperación', range: 'Hasta 50%', color: '#A78BFA', min: 0 }
];

// Modelos de Periodización
const PERIODIZATION_MODELS = {
  traditional: { name: 'Tradicional (Matveiev)', description: 'Ondulación gradual del volumen e intensidad', category: 'classic' },
  atr: { name: 'ATR (Issurin)', description: 'Acumulación-Transformación-Realización', category: 'classic' },
  blocks: { name: 'Por Bloques (Verkhoshansky)', description: 'Concentración de cargas', category: 'classic' },
  undulating_daily: { name: 'Ondulatorio Diario', description: 'Variación diaria', category: 'undulating' },
  undulating_weekly: { name: 'Ondulatorio Semanal', description: 'Variación semanal', category: 'undulating' },
  pendulum: { name: 'Péndulo (Arosiev)', description: 'Alternancia de énfasis', category: 'advanced' },
  structural_bells: { name: 'Campanas Estructurales', description: 'Acentuación de direcciones', category: 'advanced' },
  contemporary: { name: 'Contemporáneo (Bondarchuk)', description: 'Alto rendimiento', category: 'advanced' },
  inverse: { name: 'Periodización Inversa', description: 'Intensidad antes del volumen', category: 'advanced' },
  tactical: { name: 'Táctico', description: 'Para deportes de equipo', category: 'advanced' }
};

// Duraciones de ciclo
const CYCLE_DURATIONS = {
  olympic: { label: 'Ciclo Olímpico', weeks: 208, description: '4 años' },
  biannual: { label: 'Bianual', weeks: 104, description: '2 años' },
  annual: { label: 'Anual', weeks: 52, description: '1 año' },
  semester: { label: 'Semestral', weeks: 26, description: '6 meses' },
  quarter: { label: 'Trimestral', weeks: 13, description: '3 meses' },
  monthly: { label: 'Mensual', weeks: 4, description: '1 mes' }
};

// Componentes de preparación
const PREPARATION_COMPONENTS = {
  general: [
    { id: 'fisica_general', name: 'Preparación Física General' },
    { id: 'fisica_especifica', name: 'Preparación Física Específica' },
    { id: 'tecnica', name: 'Preparación Técnica' },
    { id: 'tactica', name: 'Preparación Táctica' },
    { id: 'psicologica', name: 'Preparación Psicológica' },
    { id: 'teorica', name: 'Preparación Teórica' }
  ],
  fisica: [
    { id: 'resistencia', name: 'Resistencia' },
    { id: 'fuerza', name: 'Fuerza' },
    { id: 'velocidad', name: 'Velocidad' },
    { id: 'coordinativas', name: 'Capacidades Coordinativas' },
    { id: 'flexibilidad', name: 'Flexibilidad' }
  ],
  actividades: [
    { id: 'entrenamiento', name: 'Entrenamiento' },
    { id: 'control_dopaje', name: 'Control de Dopaje' },
    { id: 'comp_principal', name: 'Competencia Principal' },
    { id: 'comp_secundaria', name: 'Competencia Secundaria' },
    { id: 'recuperacion', name: 'Recuperación' }
  ],
  monitoreo: [
    { id: 'control_medico', name: 'Control Médico' },
    { id: 'control_fisico', name: 'Control Físico' },
    { id: 'control_tecnico', name: 'Control Técnico' },
    { id: 'control_tactico', name: 'Control Táctico' },
    { id: 'control_psicologico', name: 'Control Psicológico' },
    { id: 'control_teorico', name: 'Control Teórico' }
  ]
};

const PeriodizationComplete = ({ athleteId, athleteName, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState('history');
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  // Plans from localStorage
  const [plans, setPlans] = useState(() => {
    const saved = localStorage.getItem('train_periodization_plans');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [planConfig, setPlanConfig] = useState({
    name: '',
    model: '',
    duration: 'annual',
    startDate: '',
    sessionsPerWeek: 5,
    mainObjective: '',
    mainCompetition: '',
    mainCompetitionDate: ''
  });
  
  // Generated Plan Structure
  const [generatedPlan, setGeneratedPlan] = useState(null);
  
  // Expanded states for structure view
  const [expandedMeso, setExpandedMeso] = useState(null);
  const [expandedMicro, setExpandedMicro] = useState(null);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('train_periodization_plans', JSON.stringify(plans));
  }, [plans]);

  // Get load magnitude from intensity
  const getLoadMagnitude = (intensity) => {
    for (const mag of LOAD_MAGNITUDES) {
      if (intensity >= mag.min) return mag;
    }
    return LOAD_MAGNITUDES[4];
  };

  // ============ GENERATE FULL PLAN STRUCTURE ============
  const generatePlanStructure = () => {
    const { duration, startDate, sessionsPerWeek, model, name } = planConfig;
    const durationWeeks = CYCLE_DURATIONS[duration]?.weeks || 52;
    const start = new Date(startDate);
    
    // Determine phase distribution based on duration
    let phases = [];
    
    if (duration === 'olympic') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 48 },
        { ...MACROCYCLE_PHASES[1], weeks: 40 },
        { ...MACROCYCLE_PHASES[0], weeks: 24 },
        { ...MACROCYCLE_PHASES[1], weeks: 24 },
        { ...MACROCYCLE_PHASES[2], weeks: 20 },
        { ...MACROCYCLE_PHASES[3], weeks: 40 },
        { ...MACROCYCLE_PHASES[4], weeks: 12 }
      ];
    } else if (duration === 'biannual') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 24 },
        { ...MACROCYCLE_PHASES[1], weeks: 20 },
        { ...MACROCYCLE_PHASES[2], weeks: 12 },
        { ...MACROCYCLE_PHASES[3], weeks: 40 },
        { ...MACROCYCLE_PHASES[4], weeks: 8 }
      ];
    } else if (duration === 'annual') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 12 },
        { ...MACROCYCLE_PHASES[1], weeks: 10 },
        { ...MACROCYCLE_PHASES[2], weeks: 6 },
        { ...MACROCYCLE_PHASES[3], weeks: 20 },
        { ...MACROCYCLE_PHASES[4], weeks: 4 }
      ];
    } else if (duration === 'semester') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 6 },
        { ...MACROCYCLE_PHASES[1], weeks: 5 },
        { ...MACROCYCLE_PHASES[2], weeks: 3 },
        { ...MACROCYCLE_PHASES[3], weeks: 10 },
        { ...MACROCYCLE_PHASES[4], weeks: 2 }
      ];
    } else if (duration === 'quarter') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 3 },
        { ...MACROCYCLE_PHASES[1], weeks: 3 },
        { ...MACROCYCLE_PHASES[2], weeks: 2 },
        { ...MACROCYCLE_PHASES[3], weeks: 4 },
        { ...MACROCYCLE_PHASES[4], weeks: 1 }
      ];
    } else {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 1 },
        { ...MACROCYCLE_PHASES[1], weeks: 2 },
        { ...MACROCYCLE_PHASES[4], weeks: 1 }
      ];
    }

    // Generate mesocycles, microcycles, and sessions
    const mesocycles = [];
    const volumeData = [];
    const intensityData = [];
    let currentDate = new Date(start);
    let weekNumber = 1;
    let mesocycleNumber = 1;

    phases.forEach((phase) => {
      const mesocyclesInPhase = Math.ceil(phase.weeks / 4);
      
      for (let m = 0; m < mesocyclesInPhase; m++) {
        const weeksInMeso = Math.min(4, phase.weeks - (m * 4));
        if (weeksInMeso <= 0) continue;

        // Determine mesocycle type based on position
        let mesoType;
        if (m === 0) mesoType = MESOCYCLE_TYPES[0];
        else if (m === mesocyclesInPhase - 1 && phase.id !== 'transition') mesoType = MESOCYCLE_TYPES[2];
        else mesoType = MESOCYCLE_TYPES[1];

        const microcycles = [];
        
        for (let w = 0; w < weeksInMeso; w++) {
          const isDeloadWeek = (weekNumber % 4 === 0) && phase.id !== 'transition';
          
          // Calculate volume and intensity with progression
          const progressionFactor = 1 + (weekNumber * 0.015);
          const deloadFactor = isDeloadWeek ? 0.6 : 1;
          
          const weekVolume = Math.round(phase.volumePercent * mesoType.loadFactor * deloadFactor * progressionFactor);
          const weekIntensity = Math.round(phase.intensityPercent * (isDeloadWeek ? 0.7 : 1));
          
          // Determine microcycle type
          let microType;
          if (isDeloadWeek) microType = MICROCYCLE_TYPES[5];
          else if (w === weeksInMeso - 1) microType = MICROCYCLE_TYPES[2];
          else if (w === 0) microType = MICROCYCLE_TYPES[0];
          else microType = MICROCYCLE_TYPES[1];

          // Generate sessions
          const sessions = [];
          const sessionTypeRotation = ['strength', 'endurance', 'speed', 'technical', 'recovery', 'tactical', 'flexibility'];
          
          for (let s = 0; s < sessionsPerWeek; s++) {
            const sessionDate = new Date(currentDate);
            sessionDate.setDate(sessionDate.getDate() + s);
            const dayOfWeek = sessionDate.getDay();
            
            let sessionType, sessionIntensity;
            if (dayOfWeek === 0) {
              sessionType = 'recovery';
              sessionIntensity = 'low';
            } else if (dayOfWeek === 3) {
              sessionType = 'speed';
              sessionIntensity = 'high';
            } else if (dayOfWeek % 2 === 0) {
              sessionType = 'strength';
              sessionIntensity = weekIntensity > 70 ? 'high' : 'medium';
            } else {
              sessionType = sessionTypeRotation[s % sessionTypeRotation.length];
              sessionIntensity = 'medium';
            }

            sessions.push({
              id: `session-${weekNumber}-${s}`,
              date: sessionDate.toISOString().split('T')[0],
              dayName: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek],
              type: sessionType,
              intensity: sessionIntensity,
              duration: sessionType === 'recovery' ? 45 : 90,
              volume: Math.round((weekVolume / sessionsPerWeek) * (sessionType === 'recovery' ? 0.5 : 1)),
              completed: false
            });
          }

          microcycles.push({
            id: `micro-${weekNumber}`,
            weekNumber,
            name: `Semana ${weekNumber}`,
            type: microType,
            startDate: currentDate.toISOString().split('T')[0],
            endDate: new Date(currentDate.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            volume: weekVolume,
            intensity: weekIntensity,
            loadMagnitude: getLoadMagnitude(weekIntensity),
            isDeload: isDeloadWeek,
            sessions
          });

          volumeData.push({
            week: weekNumber,
            semana: `S${weekNumber}`,
            volumen: weekVolume,
            intensidad: weekIntensity,
            fase: phase.name,
            color: phase.color
          });

          currentDate.setDate(currentDate.getDate() + 7);
          weekNumber++;
        }

        mesocycles.push({
          id: `meso-${mesocycleNumber}`,
          number: mesocycleNumber,
          name: `${phase.name} - Meso ${m + 1}`,
          phase: phase.id,
          phaseName: phase.name,
          phaseColor: phase.color,
          type: mesoType,
          startDate: microcycles[0]?.startDate,
          endDate: microcycles[microcycles.length - 1]?.endDate,
          microcycles,
          avgVolume: Math.round(microcycles.reduce((s, mc) => s + mc.volume, 0) / microcycles.length),
          avgIntensity: Math.round(microcycles.reduce((s, mc) => s + mc.intensity, 0) / microcycles.length)
        });
        
        mesocycleNumber++;
      }
    });

    const plan = {
      id: `plan-${Date.now()}`,
      name: name || `Plan ${new Date().getFullYear()}`,
      athleteId,
      model,
      modelName: PERIODIZATION_MODELS[model]?.name || model,
      duration,
      durationLabel: CYCLE_DURATIONS[duration]?.label,
      startDate,
      endDate: mesocycles[mesocycles.length - 1]?.endDate,
      totalWeeks: weekNumber - 1,
      sessionsPerWeek,
      mainObjective: planConfig.mainObjective,
      mainCompetition: planConfig.mainCompetition,
      mainCompetitionDate: planConfig.mainCompetitionDate,
      phases: phases.map(p => ({ ...p, percentage: Math.round((p.weeks / durationWeeks) * 100) })),
      mesocycles,
      chartData: volumeData,
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
      setPlans(prev => [plan, ...prev]);
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
  const handleDeletePlan = (planId) => {
    if (!window.confirm('¿Eliminar este plan de periodización?')) return;
    setPlans(prev => prev.filter(p => p.id !== planId));
    toast.success('Plan eliminado');
    if (selectedPlan?.id === planId) {
      setSelectedPlan(null);
      setActiveView('history');
    }
  };

  // View plan
  const handleViewPlan = (plan) => {
    setSelectedPlan(plan);
    setActiveView('detail');
  };

  // ============ RENDER: HISTORY VIEW ============
  const renderHistoryView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <History className="w-7 h-7 text-blue-500" />
            Historial de Planes
          </h2>
          <p className="text-slate-500 mt-1">Gestiona tus planes de entrenamiento</p>
        </div>
        <Button 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          onClick={() => {
            setWizardStep(1);
            setPlanConfig({ name: '', model: '', duration: 'annual', startDate: '', sessionsPerWeek: 5, mainObjective: '', mainCompetition: '', mainCompetitionDate: '' });
            setActiveView('create');
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Nuevo Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Sin planes de periodización</h3>
            <p className="text-slate-500 mb-6">Crea tu primer plan para comenzar</p>
            <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setActiveView('create')}>
              <Plus className="w-4 h-4 mr-2" /> Crear Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <Card key={plan.id} className="border-0 shadow-md hover:shadow-lg transition-all cursor-pointer" onClick={() => handleViewPlan(plan)}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-lg">{plan.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{plan.totalWeeks} semanas</span>
                        <span>•</span>
                        <span>{plan.modelName}</span>
                        <span>•</span>
                        <span>{plan.mesocycles?.length || 0} mesociclos</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-700">Activo</Badge>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}>
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

  // ============ RENDER: CREATE WIZARD ============
  const renderCreateView = () => {
    const steps = [
      { number: 1, title: 'Modelo', subtitle: 'Tipo de periodización' },
      { number: 2, title: 'Duración', subtitle: 'Ciclo temporal' },
      { number: 3, title: 'Objetivos', subtitle: 'Metas del plan' },
      { number: 4, title: 'Configuración', subtitle: 'Resumen final' }
    ];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-800">Crear Plan de Periodización</h2>
          <Button variant="outline" onClick={() => setActiveView('history')}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 bg-slate-50 p-4 rounded-xl">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className={`flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer transition-all ${wizardStep === step.number ? 'bg-blue-500 text-white' : wizardStep > step.number ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500'}`} onClick={() => step.number < wizardStep && setWizardStep(step.number)}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${wizardStep === step.number ? 'bg-white/20' : wizardStep > step.number ? 'bg-green-200' : 'bg-slate-100'}`}>
                  {wizardStep > step.number ? <Check className="w-4 h-4" /> : step.number}
                </div>
                <div className="hidden md:block">
                  <div className="font-semibold text-sm">{step.title}</div>
                  <div className="text-xs opacity-70">{step.subtitle}</div>
                </div>
              </div>
              {idx < steps.length - 1 && <ChevronRight className="w-5 h-5 text-slate-300" />}
            </React.Fragment>
          ))}
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Model */}
            {wizardStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Elige el Modelo de Periodización</h3>
                  <p className="text-slate-500">Selecciona el enfoque metodológico para tu plan</p>
                </div>

                {['classic', 'undulating', 'advanced'].map(category => (
                  <div key={category} className="mb-6">
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      {category === 'classic' ? 'Clásicos' : category === 'undulating' ? 'Ondulatorios' : 'Avanzados'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(PERIODIZATION_MODELS).filter(([_, m]) => m.category === category).map(([id, model]) => (
                        <div key={id} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${planConfig.model === id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`} onClick={() => setPlanConfig({ ...planConfig, model: id })}>
                          <span className="font-semibold text-slate-800">{model.name}</span>
                          <p className="text-sm text-slate-500 mt-1">{model.description}</p>
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
                  {Object.entries(CYCLE_DURATIONS).map(([id, dur]) => (
                    <div key={id} className={`p-5 rounded-xl border-2 cursor-pointer transition-all text-center ${planConfig.duration === id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`} onClick={() => setPlanConfig({ ...planConfig, duration: id })}>
                      <div className="text-3xl font-bold text-blue-600 mb-1">{dur.weeks}</div>
                      <div className="text-sm text-slate-500">semanas</div>
                      <div className="font-semibold text-slate-800 mt-2">{dur.label}</div>
                      <div className="text-xs text-slate-400">{dur.description}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Inicio</label>
                    <Input type="date" value={planConfig.startDate} onChange={(e) => setPlanConfig({ ...planConfig, startDate: e.target.value })} className="h-12" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Sesiones por Semana</label>
                    <Select value={planConfig.sessionsPerWeek.toString()} onValueChange={(v) => setPlanConfig({ ...planConfig, sessionsPerWeek: parseInt(v) })}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[3, 4, 5, 6, 7].map(n => <SelectItem key={n} value={n.toString()}>{n} sesiones</SelectItem>)}
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
                  <Input placeholder="Ej: Preparación Campeonato Nacional 2025" value={planConfig.name} onChange={(e) => setPlanConfig({ ...planConfig, name: e.target.value })} className="h-12" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Objetivo Principal</label>
                  <textarea className="w-full p-3 border rounded-lg resize-none h-24 focus:ring-2 focus:ring-blue-500" placeholder="Describe el objetivo principal..." value={planConfig.mainObjective} onChange={(e) => setPlanConfig({ ...planConfig, mainObjective: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Competencia Principal</label>
                    <Input placeholder="Nombre del evento" value={planConfig.mainCompetition} onChange={(e) => setPlanConfig({ ...planConfig, mainCompetition: e.target.value })} className="h-12" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de Competencia</label>
                    <Input type="date" value={planConfig.mainCompetitionDate} onChange={(e) => setPlanConfig({ ...planConfig, mainCompetitionDate: e.target.value })} className="h-12" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Summary */}
            {wizardStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Resumen del Plan</h3>
                  <p className="text-slate-500">Revisa la configuración antes de crear</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><div className="text-2xl font-bold text-blue-600">{CYCLE_DURATIONS[planConfig.duration]?.weeks || 0}</div><div className="text-sm text-slate-500">Semanas</div></div>
                    <div><div className="text-2xl font-bold text-indigo-600">{planConfig.sessionsPerWeek}</div><div className="text-sm text-slate-500">Sesiones/Sem</div></div>
                    <div><div className="text-2xl font-bold text-purple-600">{Math.ceil((CYCLE_DURATIONS[planConfig.duration]?.weeks || 0) / 4)}</div><div className="text-sm text-slate-500">Mesociclos</div></div>
                    <div><div className="text-2xl font-bold text-emerald-600">{(CYCLE_DURATIONS[planConfig.duration]?.weeks || 0) * planConfig.sessionsPerWeek}</div><div className="text-sm text-slate-500">Total Sesiones</div></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Modelo</div><div className="font-semibold">{PERIODIZATION_MODELS[planConfig.model]?.name}</div></div>
                  <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Duración</div><div className="font-semibold">{CYCLE_DURATIONS[planConfig.duration]?.label}</div></div>
                  <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Inicio</div><div className="font-semibold">{planConfig.startDate || 'No definido'}</div></div>
                  <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Competencia</div><div className="font-semibold">{planConfig.mainCompetition || 'No definida'}</div></div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button variant="outline" onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setActiveView('history')}>
                <ChevronLeft className="w-4 h-4 mr-2" /> {wizardStep > 1 ? 'Anterior' : 'Cancelar'}
              </Button>
              
              {wizardStep < 4 ? (
                <Button className="bg-blue-500 hover:bg-blue-600" onClick={() => setWizardStep(wizardStep + 1)} disabled={wizardStep === 1 && !planConfig.model}>
                  Siguiente <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button className="bg-gradient-to-r from-blue-500 to-indigo-600" onClick={handleCreatePlan} disabled={saving || !planConfig.startDate}>
                  {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creando...</> : <><Check className="w-4 h-4 mr-2" /> Crear Plan</>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============ RENDER: DETAIL VIEW ============
  const renderDetailView = () => {
    const plan = selectedPlan || generatedPlan;
    if (!plan) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{plan.name}</h2>
            <p className="text-slate-500 mt-1">{plan.totalWeeks} semanas • {plan.sessionsPerWeek} sesiones/semana • {plan.mesocycles?.length} mesociclos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => { setActiveView('history'); setSelectedPlan(null); }}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Volver
            </Button>
            <Button className="bg-blue-500 hover:bg-blue-600"><FileText className="w-4 h-4 mr-2" /> Exportar PDF</Button>
          </div>
        </div>

        <Tabs defaultValue="structure" className="w-full">
          <TabsList className="grid grid-cols-5 mb-6 h-auto p-1 bg-slate-100">
            <TabsTrigger value="structure" className="py-2"><Layers className="w-4 h-4 mr-2" />Estructura</TabsTrigger>
            <TabsTrigger value="charts" className="py-2"><BarChart3 className="w-4 h-4 mr-2" />Plan Gráfico</TabsTrigger>
            <TabsTrigger value="preparation" className="py-2"><Target className="w-4 h-4 mr-2" />Preparación</TabsTrigger>
            <TabsTrigger value="activities" className="py-2"><Activity className="w-4 h-4 mr-2" />Actividades</TabsTrigger>
            <TabsTrigger value="monitoring" className="py-2"><Eye className="w-4 h-4 mr-2" />Monitoreo</TabsTrigger>
          </TabsList>

          {/* STRUCTURE TAB */}
          <TabsContent value="structure">
            {/* Macrocycle Phases */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2"><Layers className="w-5 h-5" />Fases del Macrociclo</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex h-12 rounded-lg overflow-hidden mb-4">
                  {plan.phases?.map((phase, idx) => (
                    <div key={idx} className="flex items-center justify-center text-xs font-medium text-white px-2" style={{ backgroundColor: phase.color, width: `${phase.percentage}%` }} title={`${phase.name}: ${phase.weeks} semanas (${phase.percentage}%)`}>
                      {phase.percentage > 10 && <span>{phase.name.split(' ')[0]}</span>}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {MACROCYCLE_PHASES.map(phase => (
                    <span key={phase.id} className="flex items-center gap-2 text-xs px-2 py-1 bg-slate-50 rounded">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: phase.color }} />
                      {phase.name} ({phase.volumePercent}%V / {phase.intensityPercent}%I)
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Mesocycles */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="w-5 h-5" />Mesociclos ({plan.mesocycles?.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {/* Instrucciones */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 mb-4">
                  <GripVertical className="w-5 h-5 text-blue-500" />
                  <p className="text-sm text-blue-700">
                    <strong>Tip:</strong> Expande cada mesociclo para ver y editar los microciclos y sesiones de entrenamiento.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {plan.mesocycles?.map((meso, mesoIdx) => (
                    <div key={meso.id} className="border rounded-lg overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors" style={{ borderLeft: `4px solid ${meso.phaseColor}` }} onClick={() => setExpandedMeso(expandedMeso === mesoIdx ? null : mesoIdx)}>
                        <div className="flex items-center gap-3">
                          {expandedMeso === mesoIdx ? <ChevronDown className="w-5 h-5 text-slate-500" /> : <ChevronRight className="w-5 h-5 text-slate-500" />}
                          <Badge className="text-white" style={{ backgroundColor: meso.type.color }}>{meso.type.name}</Badge>
                          <div>
                            <span className="font-semibold text-slate-800">{meso.name}</span>
                            <span className="text-sm text-slate-500 ml-2">• {meso.microcycles?.length} semanas</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">{meso.avgVolume}% Vol</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-sm font-medium">{meso.avgIntensity}% Int</span>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: meso.phaseColor }}>
                            {meso.phaseName}
                          </span>
                        </div>
                      </div>
                      
                      {expandedMeso === mesoIdx && (
                        <div className="bg-slate-50 p-4 border-t">
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Microciclos (Semanas):</p>
                          <div className="space-y-2">
                            {meso.microcycles?.map((micro, microIdx) => (
                              <div key={micro.id} className="bg-white rounded-lg border shadow-sm overflow-hidden">
                                <div 
                                  className={`flex items-center justify-between p-3 cursor-pointer transition-colors ${micro.isDeload ? 'bg-violet-50 hover:bg-violet-100' : 'hover:bg-slate-50'}`}
                                  onClick={() => setExpandedMicro(expandedMicro === `${mesoIdx}-${microIdx}` ? null : `${mesoIdx}-${microIdx}`)}
                                >
                                  <div className="flex items-center gap-3">
                                    {expandedMicro === `${mesoIdx}-${microIdx}` ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: micro.type.color }} />
                                    <span className="font-semibold">{micro.name}</span>
                                    <Badge variant="outline" className="text-xs" style={{ borderColor: micro.type.color, color: micro.type.color }}>{micro.type.name}</Badge>
                                    {micro.isDeload && <Badge className="bg-violet-500 text-white text-xs">Descarga</Badge>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-500">{micro.startDate}</span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{micro.volume}% Vol</span>
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">{micro.intensity}% Int</span>
                                    <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: micro.loadMagnitude?.color }}>{micro.loadMagnitude?.name}</span>
                                  </div>
                                </div>
                                  </div>
                                </div>
                                
                                {expandedMicro === `${mesoIdx}-${microIdx}` && (
                                  <div className="border-t p-4 bg-white">
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-semibold text-slate-500 uppercase">Sesiones de la semana:</p>
                                      <Button size="sm" variant="outline" className="h-7 text-xs">
                                        <Plus className="w-3 h-3 mr-1" /> Agregar sesión
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                                      {micro.sessions?.map((session, sIdx) => {
                                        const sessionType = SESSION_TYPES.find(t => t.id === session.type);
                                        const colorMap = {
                                          strength: 'bg-red-100 border-red-300',
                                          endurance: 'bg-blue-100 border-blue-300',
                                          speed: 'bg-yellow-100 border-yellow-300',
                                          technical: 'bg-green-100 border-green-300',
                                          recovery: 'bg-violet-100 border-violet-300',
                                          tactical: 'bg-orange-100 border-orange-300',
                                          flexibility: 'bg-pink-100 border-pink-300'
                                        };
                                        return (
                                          <div 
                                            key={session.id} 
                                            className={`relative p-3 rounded-lg border-2 hover:shadow-md transition-all cursor-pointer ${colorMap[session.type] || 'bg-slate-100 border-slate-300'}`}
                                          >
                                            <div className="flex items-center justify-between mb-2">
                                              <GripVertical className="w-4 h-4 text-slate-400" />
                                              <div className="flex gap-1">
                                                <button className="p-1 hover:bg-white rounded">
                                                  <Edit2 className="w-3 h-3 text-slate-500" />
                                                </button>
                                                <button className="p-1 hover:bg-white rounded">
                                                  <Trash2 className="w-3 h-3 text-red-500" />
                                                </button>
                                              </div>
                                            </div>
                                            <p className="font-bold text-sm">{session.dayName}</p>
                                            <p className="text-xs font-medium capitalize text-slate-700">{sessionType?.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{session.duration} min</p>
                                            <div className="mt-2 flex gap-1">
                                              <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                                                session.intensity === 'high' ? 'bg-red-200 text-red-800' :
                                                session.intensity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                                                'bg-green-200 text-green-800'
                                              }`}>
                                                {session.intensity === 'high' ? 'Alta' : session.intensity === 'medium' ? 'Media' : 'Baja'}
                                              </span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Types Legend */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-0 shadow-md">
                <CardHeader className="py-3"><CardTitle className="text-sm">Tipos de Mesociclo</CardTitle></CardHeader>
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {MESOCYCLE_TYPES.map(t => (
                      <span key={t.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ backgroundColor: t.color + '20' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-md">
                <CardHeader className="py-3"><CardTitle className="text-sm">Tipos de Microciclo</CardTitle></CardHeader>
                <CardContent className="p-3">
                  <div className="flex flex-wrap gap-2">
                    {MICROCYCLE_TYPES.map(t => (
                      <span key={t.id} className="flex items-center gap-1 text-xs px-2 py-1 rounded" style={{ backgroundColor: t.color + '20' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />{t.name} ({t.loadPercent}%)
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CHARTS TAB - PLAN GRÁFICO */}
          <TabsContent value="charts">
            {/* Main Volume/Intensity Chart */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" />Volumen e Intensidad por Semana</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={plan.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} formatter={(value, name) => [`${value}%`, name === 'volumen' ? 'Volumen' : 'Intensidad']} />
                      <Legend />
                      <Area type="monotone" dataKey="volumen" fill="#3B82F6" stroke="#3B82F6" fillOpacity={0.3} name="Volumen" />
                      <Line type="monotone" dataKey="intensidad" stroke="#EF4444" strokeWidth={3} dot={{ fill: '#EF4444', strokeWidth: 2 }} name="Intensidad" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Phases Distribution Bar */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Distribución de Fases</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-16 flex rounded-lg overflow-hidden mb-4">
                  {plan.phases?.map((phase, idx) => (
                    <div key={idx} className="flex items-center justify-center text-white text-xs font-medium" style={{ backgroundColor: phase.color, width: `${phase.percentage}%` }}>
                      {phase.percentage > 8 && `${phase.weeks}s`}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {plan.phases?.map((phase, idx) => (
                    <div key={idx} className="text-center p-2 rounded" style={{ backgroundColor: phase.color + '15' }}>
                      <div className="text-xs font-medium" style={{ color: phase.color }}>{phase.name.split(' ')[0]}</div>
                      <div className="text-lg font-bold">{phase.weeks}</div>
                      <div className="text-xs text-slate-500">semanas</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Load Magnitude */}
            <Card className="border-0 shadow-md mb-6">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2"><Zap className="w-5 h-5" />Magnitud de la Carga</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-3">
                  {LOAD_MAGNITUDES.map(mag => (
                    <div key={mag.id} className="p-4 rounded-lg text-center" style={{ backgroundColor: mag.color + '20' }}>
                      <div className="w-6 h-6 rounded-full mx-auto mb-2" style={{ backgroundColor: mag.color }} />
                      <div className="font-bold text-slate-800">{mag.name}</div>
                      <div className="text-sm text-slate-600 mt-1">{mag.range}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Frequency Table */}
            <Card className="border-0 shadow-md">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2"><Clock className="w-5 h-5 text-emerald-500" />Frecuencia de Entrenamiento</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-5 gap-4 text-center">
                  {LOAD_MAGNITUDES.map(mag => (
                    <div key={mag.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="text-3xl font-bold" style={{ color: mag.color }}>{mag.id === 'muy_alta' ? 6 : mag.id === 'alta' ? 5 : mag.id === 'media' ? 5 : mag.id === 'baja' ? 4 : 3}</div>
                      <div className="text-sm text-slate-500 mt-1">sesiones/sem</div>
                      <div className="text-xs font-medium mt-2" style={{ color: mag.color }}>{mag.name}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PREPARATION TAB */}
          <TabsContent value="preparation">
            {Object.entries({ general: 'Preparación General', fisica: 'Preparación Física' }).map(([key, title]) => (
              <Card key={key} className="border-0 shadow-md mb-6">
                <CardHeader className={`${key === 'general' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-emerald-500 to-green-500'} text-white py-4`}>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50">Componente</th>
                          {plan.chartData?.slice(0, 20).map((_, idx) => <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">S{idx + 1}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {PREPARATION_COMPONENTS[key]?.map(comp => (
                          <tr key={comp.id} className="border-t hover:bg-slate-50">
                            <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                            {plan.chartData?.slice(0, 20).map((week, idx) => {
                              const value = Math.round(week.volumen * (0.5 + Math.random() * 0.5));
                              return (
                                <td key={idx} className="px-2 py-3 text-center">
                                  <div className="w-6 h-6 mx-auto rounded text-xs flex items-center justify-center font-medium text-white" style={{ backgroundColor: value > 70 ? '#EF4444' : value > 50 ? '#F59E0B' : value > 30 ? '#10B981' : '#94A3B8', opacity: 0.3 + (value / 100) * 0.7 }} />
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
            ))}
          </TabsContent>

          {/* ACTIVITIES TAB */}
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
                        {plan.chartData?.slice(0, 20).map((_, idx) => <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">S{idx + 1}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {PREPARATION_COMPONENTS.actividades?.map(comp => (
                        <tr key={comp.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                          {plan.chartData?.slice(0, 20).map((_, idx) => {
                            const isMainComp = comp.id === 'comp_principal' && idx > 15;
                            const isSecComp = comp.id === 'comp_secundaria' && (idx === 8 || idx === 12);
                            const hasActivity = comp.id === 'entrenamiento' || Math.random() > 0.8;
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                {(hasActivity || isMainComp || isSecComp) && (
                                  <div className={`w-6 h-6 mx-auto rounded flex items-center justify-center ${isMainComp ? 'bg-red-500' : isSecComp ? 'bg-amber-500' : comp.id === 'entrenamiento' ? 'bg-blue-400' : 'bg-slate-300'}`}>
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
          </TabsContent>

          {/* MONITORING TAB */}
          <TabsContent value="monitoring">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-rose-500 to-pink-600 text-white py-4">
                <CardTitle className="text-base flex items-center gap-2"><Eye className="w-5 h-5" />Monitoreo / Evaluaciones</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50">Control</th>
                        {plan.chartData?.slice(0, 20).map((_, idx) => <th key={idx} className="px-2 py-3 text-center text-xs font-medium text-slate-500 min-w-[40px]">S{idx + 1}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {PREPARATION_COMPONENTS.monitoreo?.map(comp => (
                        <tr key={comp.id} className="border-t hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-700 sticky left-0 bg-white">{comp.name}</td>
                          {plan.chartData?.slice(0, 20).map((_, idx) => {
                            const isControlWeek = (comp.id === 'control_medico' && (idx === 0 || idx === 12)) || (comp.id === 'control_fisico' && idx % 4 === 0) || (comp.id === 'control_tecnico' && idx % 3 === 0) || (comp.id === 'control_tactico' && idx % 5 === 0) || (comp.id === 'control_psicologico' && (idx === 0 || idx === 8 || idx === 16)) || (comp.id === 'control_teorico' && idx % 6 === 0);
                            return (
                              <td key={idx} className="px-2 py-3 text-center">
                                {isControlWeek && <div className="w-6 h-6 mx-auto rounded bg-rose-500 flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div>}
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
