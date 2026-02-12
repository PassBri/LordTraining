import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  Plus, Save, Loader2, Calendar, Target, Activity, 
  ChevronDown, ChevronRight, ChevronLeft, Trash2, Edit2, BarChart3,
  TrendingUp, PieChart, Layers, Zap, Heart, Brain, GripVertical, X, Check,
  CheckCircle, Clock, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart as RechartsPie, Pie, Cell, Area, AreaChart
} from 'recharts';
import SessionEditor from './SessionEditor';
import { EJERCICIOS_INICIALES } from './ExerciseLibrary';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Principios del entrenamiento aplicados
const TRAINING_PRINCIPLES = {
  progression: 'Incremento gradual de la carga (5-10% semanal)',
  specificity: 'Ejercicios específicos según fase',
  variability: 'Alternar estímulos para evitar estancamiento',
  supercompensation: 'Descanso adecuado para adaptación',
  recovery: 'Semanas de descarga cada 3-4 semanas',
  individuality: 'Ajustar según nivel del atleta'
};

// Fases de un macrociclo tradicional
const MACROCYCLE_PHASES = [
  { id: 'preparatory_general', name: 'Preparatorio General', weeks: 8, color: '#3B82F6', 
    description: 'Alto volumen, baja intensidad. Desarrollo de base aeróbica y fuerza general.',
    volumePercent: 80, intensityPercent: 50 },
  { id: 'preparatory_specific', name: 'Preparatorio Específico', weeks: 6, color: '#8B5CF6',
    description: 'Volumen medio-alto, intensidad creciente. Trabajo específico del deporte.',
    volumePercent: 70, intensityPercent: 70 },
  { id: 'precompetitive', name: 'Precompetitivo', weeks: 4, color: '#F59E0B',
    description: 'Reducción de volumen, alta intensidad. Puesta a punto.',
    volumePercent: 50, intensityPercent: 85 },
  { id: 'competitive', name: 'Competitivo', weeks: 8, color: '#10B981',
    description: 'Bajo volumen, máxima intensidad. Mantenimiento y competencias.',
    volumePercent: 40, intensityPercent: 95 },
  { id: 'transition', name: 'Transición', weeks: 2, color: '#6B7280',
    description: 'Recuperación activa. Descanso físico y mental.',
    volumePercent: 30, intensityPercent: 40 }
];

// Tipos de mesociclo
const MESOCYCLE_TYPES = [
  { id: 'entrante', name: 'Entrante', color: '#94A3B8', loadFactor: 0.6 },
  { id: 'desarrollo', name: 'Desarrollo', color: '#3B82F6', loadFactor: 0.85 },
  { id: 'choque', name: 'Choque', color: '#EF4444', loadFactor: 1.0 },
  { id: 'estabilizador', name: 'Estabilizador', color: '#10B981', loadFactor: 0.75 },
  { id: 'competitivo', name: 'Competitivo', color: '#F59E0B', loadFactor: 0.7 },
  { id: 'recuperacion', name: 'Recuperación', color: '#8B5CF6', loadFactor: 0.5 }
];

// Tipos de microciclo
const MICROCYCLE_TYPES = [
  { id: 'ordinario', name: 'Ordinario', loadPercent: 70 },
  { id: 'choque', name: 'Choque', loadPercent: 100 },
  { id: 'aproximacion', name: 'Aproximación', loadPercent: 80 },
  { id: 'competitivo', name: 'Competitivo', loadPercent: 60 },
  { id: 'recuperacion', name: 'Recuperación', loadPercent: 40 }
];

// Colores para gráficos
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

const PeriodizationSystem = ({ athleteId, athleteName }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  
  // Estado del macrociclo
  const [macrocycle, setMacrocycle] = useState(null);
  const [macrocycleConfig, setMacrocycleConfig] = useState({
    name: '',
    startDate: '',
    duration: 'annual', // olympic, biannual, annual, semester, quarter, monthly
    mainCompetition: '',
    mainCompetitionDate: '',
    sessionsPerWeek: 5,
    model: 'traditional' // Ver PERIODIZATION_MODELS
  });

  // Duraciones de ciclo disponibles
  const CYCLE_DURATIONS = {
    olympic: { label: 'Ciclo Olímpico (4 años)', weeks: 208, description: 'Planificación para competencias olímpicas' },
    biannual: { label: 'Bianual (2 años)', weeks: 104, description: 'Dos temporadas completas' },
    annual: { label: 'Anual (52 semanas)', weeks: 52, description: 'Macrociclo tradicional' },
    semester: { label: 'Semestral (26 semanas)', weeks: 26, description: 'Media temporada' },
    quarter: { label: 'Trimestral (13 semanas)', weeks: 13, description: 'Ciclo corto' },
    monthly: { label: 'Mensual (4 semanas)', weeks: 4, description: 'Mesociclo individual' }
  };

  // Modelos de periodización disponibles
  const PERIODIZATION_MODELS = {
    // Clásicos
    traditional: { label: 'Tradicional (Matveiev)', category: 'Clásico', description: 'Periodización lineal clásica' },
    atr: { label: 'ATR (Issurin)', category: 'Clásico', description: 'Acumulación-Transformación-Realización' },
    blocks: { label: 'Por Bloques (Verkhoshansky)', category: 'Clásico', description: 'Cargas concentradas' },
    // Ondulatorios
    undulating_daily: { label: 'Ondulatorio Diario', category: 'Ondulatorio', description: 'Variación día a día' },
    undulating_weekly: { label: 'Ondulatorio Semanal', category: 'Ondulatorio', description: 'Variación semanal' },
    // Avanzados
    pendulum: { label: 'Péndulo (Arosiev)', category: 'Avanzado', description: 'Alternancia de énfasis' },
    structural_bells: { label: 'Campanas Estructurales (Forteza)', category: 'Avanzado', description: 'Acentuación de direcciones' },
    contemporary: { label: 'Contemporáneo (Bondarchuk)', category: 'Avanzado', description: 'Para alto rendimiento' },
    inverse: { label: 'Periodización Inversa', category: 'Avanzado', description: 'Para deportes de resistencia' },
    tactical: { label: 'Táctico', category: 'Avanzado', description: 'Para deportes de equipo' },
    // Específicos
    concurrent: { label: 'Concurrente', category: 'Específico', description: 'Desarrollo simultáneo' },
    conjugate: { label: 'Conjugado (Westside)', category: 'Específico', description: 'Para fuerza/potencia' },
    polarized: { label: 'Polarizado', category: 'Específico', description: '80% baja / 20% alta intensidad' }
  };

  // Datos para gráficos
  const [chartData, setChartData] = useState({
    volumeByWeek: [],
    intensityByWeek: [],
    loadDistribution: [],
    componentDistribution: []
  });

  const getToken = () => localStorage.getItem('train_token');

  // Generar estructura automática del macrociclo
  const generateMacrocycleStructure = useCallback(() => {
    const { duration, startDate, sessionsPerWeek, mainCompetitionDate, model } = macrocycleConfig;
    
    // Usar el objeto CYCLE_DURATIONS para obtener las semanas
    const durationWeeks = CYCLE_DURATIONS[duration]?.weeks || 52;

    const start = new Date(startDate);
    const competitionDate = mainCompetitionDate ? new Date(mainCompetitionDate) : null;
    
    // Calcular distribución de fases según duración y modelo
    let phases = [];
    
    // Distribución de fases para modelo tradicional y otros similares
    if (duration === 'olympic') {
      // Ciclo olímpico: 4 macrociclos anuales
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 48 },  // Prep General - Año 1
        { ...MACROCYCLE_PHASES[1], weeks: 40 },  // Prep Específico
        { ...MACROCYCLE_PHASES[0], weeks: 24 },  // Prep General - Año 2
        { ...MACROCYCLE_PHASES[1], weeks: 24 },  // Prep Específico
        { ...MACROCYCLE_PHASES[2], weeks: 20 },  // Precompetitivo
        { ...MACROCYCLE_PHASES[3], weeks: 40 },  // Competitivo
        { ...MACROCYCLE_PHASES[4], weeks: 12 }   // Transición
      ];
    } else if (duration === 'biannual') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 24 },  // Prep General
        { ...MACROCYCLE_PHASES[1], weeks: 20 },  // Prep Específico
        { ...MACROCYCLE_PHASES[2], weeks: 12 },  // Precompetitivo
        { ...MACROCYCLE_PHASES[3], weeks: 40 },  // Competitivo
        { ...MACROCYCLE_PHASES[4], weeks: 8 }    // Transición
      ];
    } else if (duration === 'annual') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 12 }, // Prep General
        { ...MACROCYCLE_PHASES[1], weeks: 10 }, // Prep Específico
        { ...MACROCYCLE_PHASES[2], weeks: 6 },  // Precompetitivo
        { ...MACROCYCLE_PHASES[3], weeks: 20 }, // Competitivo
        { ...MACROCYCLE_PHASES[4], weeks: 4 }   // Transición
      ];
    } else if (duration === 'semester') {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 6 },
        { ...MACROCYCLE_PHASES[1], weeks: 5 },
        { ...MACROCYCLE_PHASES[2], weeks: 3 },
        { ...MACROCYCLE_PHASES[3], weeks: 10 },
        { ...MACROCYCLE_PHASES[4], weeks: 2 }
      ];
    } else if (duration === 'monthly') {
      // Mesociclo individual
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 1 },
        { ...MACROCYCLE_PHASES[1], weeks: 2 },
        { ...MACROCYCLE_PHASES[4], weeks: 1 }
      ];
    } else {
      phases = [
        { ...MACROCYCLE_PHASES[0], weeks: 3 },
        { ...MACROCYCLE_PHASES[1], weeks: 3 },
        { ...MACROCYCLE_PHASES[2], weeks: 2 },
        { ...MACROCYCLE_PHASES[3], weeks: 4 },
        { ...MACROCYCLE_PHASES[4], weeks: 1 }
      ];
    }

    // Generar mesociclos y microciclos
    const mesocycles = [];
    const volumeData = [];
    const intensityData = [];
    let currentDate = new Date(start);
    let weekNumber = 1;
    let mesocycleNumber = 1;

    phases.forEach((phase, phaseIndex) => {
      // Cada 4 semanas = 1 mesociclo aproximadamente
      const mesocyclesInPhase = Math.ceil(phase.weeks / 4);
      
      for (let m = 0; m < mesocyclesInPhase; m++) {
        const weeksInMeso = Math.min(4, phase.weeks - (m * 4));
        if (weeksInMeso <= 0) continue;

        // Determinar tipo de mesociclo según posición
        let mesoType;
        if (m === 0) mesoType = MESOCYCLE_TYPES[0]; // Entrante
        else if (m === mesocyclesInPhase - 1 && phase.id !== 'transition') mesoType = MESOCYCLE_TYPES[2]; // Choque
        else mesoType = MESOCYCLE_TYPES[1]; // Desarrollo

        const microcycles = [];
        
        for (let w = 0; w < weeksInMeso; w++) {
          // Aplicar principio de recuperación (semana de descarga cada 3-4)
          const isDeloadWeek = (weekNumber % 4 === 0) && phase.id !== 'transition';
          
          // Calcular volumen e intensidad con progresión
          const progressionFactor = 1 + (weekNumber * 0.02); // +2% por semana
          const deloadFactor = isDeloadWeek ? 0.6 : 1;
          
          const weekVolume = Math.round(phase.volumePercent * mesoType.loadFactor * deloadFactor * progressionFactor);
          const weekIntensity = Math.round(phase.intensityPercent * (isDeloadWeek ? 0.7 : 1));
          
          // Determinar tipo de microciclo
          let microType;
          if (isDeloadWeek) microType = MICROCYCLE_TYPES[4]; // Recuperación
          else if (w === weeksInMeso - 1) microType = MICROCYCLE_TYPES[1]; // Choque
          else microType = MICROCYCLE_TYPES[0]; // Ordinario

          // Generar sesiones de la semana
          const sessions = [];
          const sessionTypes = ['strength', 'endurance', 'speed', 'technical', 'recovery'];
          
          for (let s = 0; s < sessionsPerWeek; s++) {
            const sessionDate = new Date(currentDate);
            sessionDate.setDate(sessionDate.getDate() + s);
            
            // Distribuir tipos de sesión según día
            const dayOfWeek = sessionDate.getDay();
            let sessionType, sessionIntensity;
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              sessionType = 'recovery';
              sessionIntensity = 'low';
            } else if (dayOfWeek === 3) {
              sessionType = 'speed';
              sessionIntensity = 'high';
            } else if (dayOfWeek % 2 === 0) {
              sessionType = 'strength';
              sessionIntensity = weekIntensity > 70 ? 'high' : 'medium';
            } else {
              sessionType = 'endurance';
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
            isDeload: isDeloadWeek,
            sessions
          });

          // Datos para gráficos
          volumeData.push({
            week: weekNumber,
            semana: `S${weekNumber}`,
            volumen: weekVolume,
            fase: phase.name,
            color: phase.color
          });

          intensityData.push({
            week: weekNumber,
            semana: `S${weekNumber}`,
            intensidad: weekIntensity,
            volumen: weekVolume,
            fase: phase.name
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
          weeks: weeksInMeso,
          microcycles,
          totalVolume: microcycles.reduce((sum, mic) => sum + mic.volume, 0),
          avgIntensity: Math.round(microcycles.reduce((sum, mic) => sum + mic.intensity, 0) / microcycles.length)
        });

        mesocycleNumber++;
      }
    });

    // Calcular distribución de componentes
    const componentDist = [
      { name: 'Resistencia', value: 30, color: '#EF4444' },
      { name: 'Fuerza', value: 25, color: '#F59E0B' },
      { name: 'Velocidad', value: 15, color: '#FBBF24' },
      { name: 'Técnica', value: 20, color: '#10B981' },
      { name: 'Recuperación', value: 10, color: '#8B5CF6' }
    ];

    // Calcular distribución de carga por fase
    const loadDist = phases.map(phase => ({
      name: phase.name,
      semanas: phase.weeks,
      color: phase.color
    }));

    setChartData({
      volumeByWeek: volumeData,
      intensityByWeek: intensityData,
      componentDistribution: componentDist,
      loadDistribution: loadDist
    });

    return {
      id: `macro-${Date.now()}`,
      name: macrocycleConfig.name || `Macrociclo ${new Date().getFullYear()}`,
      athleteId,
      startDate: startDate,
      endDate: currentDate.toISOString().split('T')[0],
      duration,
      totalWeeks: weekNumber - 1,
      mainCompetition: macrocycleConfig.mainCompetition,
      mainCompetitionDate: macrocycleConfig.mainCompetitionDate,
      sessionsPerWeek,
      model: macrocycleConfig.model,
      phases: phases.map(p => ({ id: p.id, name: p.name, weeks: p.weeks, color: p.color })),
      mesocycles,
      createdAt: new Date().toISOString()
    };
  }, [macrocycleConfig, athleteId]);

  // Crear macrociclo
  const handleCreateMacrocycle = async () => {
    if (!macrocycleConfig.startDate) {
      toast.error('Selecciona una fecha de inicio');
      return;
    }
    if (!athleteId) {
      toast.error('Selecciona un atleta primero');
      return;
    }

    setSaving(true);
    try {
      const structure = generateMacrocycleStructure();
      setMacrocycle(structure);

      // Guardar en backend
      const token = getToken();
      await fetch(`${API_URL}/api/periodization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(structure)
      });

      toast.success('¡Macrociclo generado exitosamente!');
      setActiveTab('view');
    } catch (error) {
      console.error('Error creating macrocycle:', error);
      toast.error('Error al crear el macrociclo');
    }
    setSaving(false);
  };

  // Cargar macrociclo existente
  const loadMacrocycle = useCallback(async () => {
    if (!athleteId) return;
    
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/periodization/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.mesocycles) {
          setMacrocycle(data);
          
          // Regenerar datos de gráficos
          const volumeData = [];
          const intensityData = [];
          
          data.mesocycles.forEach(meso => {
            meso.microcycles?.forEach(micro => {
              volumeData.push({
                week: micro.weekNumber,
                semana: `S${micro.weekNumber}`,
                volumen: micro.volume,
                fase: meso.phaseName,
                color: meso.phaseColor
              });
              intensityData.push({
                week: micro.weekNumber,
                semana: `S${micro.weekNumber}`,
                intensidad: micro.intensity,
                volumen: micro.volume,
                fase: meso.phaseName
              });
            });
          });

          setChartData(prev => ({
            ...prev,
            volumeByWeek: volumeData,
            intensityByWeek: intensityData
          }));
          
          setActiveTab('view');
        }
      }
    } catch (error) {
      console.error('Error loading macrocycle:', error);
    }
    setLoading(false);
  }, [athleteId]);

  useEffect(() => {
    loadMacrocycle();
  }, [loadMacrocycle]);

  // Componente de información de principios
  const PrinciplesInfo = () => (
    <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100 mb-6">
      <h4 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
        <Brain className="w-5 h-5" />
        Principios del Entrenamiento Aplicados
      </h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        {Object.entries(TRAINING_PRINCIPLES).map(([key, value]) => (
          <div key={key} className="flex items-start gap-2 bg-white/60 p-2 rounded-lg">
            <div className="w-2 h-2 bg-indigo-500 rounded-full mt-1.5 flex-shrink-0"></div>
            <span className="text-slate-700">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Vista de creación
  // ============ WIZARD DE CREACIÓN INTEGRADO ============
  const [wizardStep, setWizardStep] = useState(1);
  
  // Vista de creación con wizard de pasos
  const CreateView = () => {
    const steps = [
      { number: 1, title: 'Modelo', subtitle: 'Tipo de periodización' },
      { number: 2, title: 'Duración', subtitle: 'Ciclo temporal' },
      { number: 3, title: 'Configuración', subtitle: 'Detalles del plan' }
    ];
    
    const isStepValid = (step) => {
      switch(step) {
        case 1: return !!macrocycleConfig.model;
        case 2: return !!macrocycleConfig.duration;
        case 3: return !!macrocycleConfig.startDate && !!macrocycleConfig.name;
        default: return false;
      }
    };
    
    const nextStep = () => {
      if (isStepValid(wizardStep) && wizardStep < 3) {
        setWizardStep(wizardStep + 1);
      }
    };
    
    const prevStep = () => {
      if (wizardStep > 1) {
        setWizardStep(wizardStep - 1);
      }
    };

    // Paso 1: Selección de Modelo
    const renderStep1 = () => (
      <div className="space-y-4">
        <p className="text-slate-600 text-center mb-4">El modelo determina cómo se distribuirán las cargas de entrenamiento</p>
        
        {/* Modelos Clásicos */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> Clásicos
          </h4>
          <div className="grid md:grid-cols-3 gap-2">
            {[
              { id: 'traditional', name: 'Tradicional (Matveiev)', icon: '📊', desc: 'Progresión lineal clásica' },
              { id: 'atr', name: 'ATR (Issurin)', icon: '🔄', desc: 'Bloques concentrados' },
              { id: 'blocks', name: 'Por Bloques', icon: '📦', desc: 'Cargas concentradas' }
            ].map(model => (
              <Card 
                key={model.id}
                className={`cursor-pointer hover:shadow-md transition-all ${macrocycleConfig.model === model.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setMacrocycleConfig({...macrocycleConfig, model: model.id})}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{model.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{model.name}</p>
                      <p className="text-xs text-slate-500">{model.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Modelos Ondulatorios */}
        <div className="mb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Ondulatorios</h4>
          <div className="grid md:grid-cols-2 gap-2">
            {[
              { id: 'undulating_daily', name: 'Ondulatorio Diario', icon: '📈', desc: 'Variación diaria' },
              { id: 'undulating_weekly', name: 'Ondulatorio Semanal', icon: '🌊', desc: 'Variación semanal' }
            ].map(model => (
              <Card 
                key={model.id}
                className={`cursor-pointer hover:shadow-md transition-all ${macrocycleConfig.model === model.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setMacrocycleConfig({...macrocycleConfig, model: model.id})}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{model.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{model.name}</p>
                      <p className="text-xs text-slate-500">{model.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Modelos Avanzados */}
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Avanzados / Específicos</h4>
          <div className="grid md:grid-cols-3 gap-2">
            {[
              { id: 'pendulum', name: 'Péndulo', icon: '⚖️', desc: 'Alternancia técnico-físico' },
              { id: 'conjugate', name: 'Conjugado', icon: '💪', desc: 'Fuerza máxima + velocidad' },
              { id: 'polarized', name: 'Polarizado', icon: '🎯', desc: '80% bajo / 20% alto' }
            ].map(model => (
              <Card 
                key={model.id}
                className={`cursor-pointer hover:shadow-md transition-all ${macrocycleConfig.model === model.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                onClick={() => setMacrocycleConfig({...macrocycleConfig, model: model.id})}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{model.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{model.name}</p>
                      <p className="text-xs text-slate-500">{model.desc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {macrocycleConfig.model && PERIODIZATION_MODELS[macrocycleConfig.model] && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Seleccionado:</strong> {PERIODIZATION_MODELS[macrocycleConfig.model].name}
            </p>
            <p className="text-xs text-blue-600 mt-1">{PERIODIZATION_MODELS[macrocycleConfig.model].description}</p>
          </div>
        )}
      </div>
    );
    
    // Paso 2: Selección de Duración
    const renderStep2 = () => (
      <div className="space-y-4">
        <p className="text-slate-600 text-center mb-4">Define el período de tiempo que abarcará tu plan</p>
        
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { id: 'olympic', name: 'Ciclo Olímpico', duration: '4 años', weeks: 208, icon: '🏅', color: '#FFD700' },
            { id: 'biannual', name: 'Bianual', duration: '2 años', weeks: 104, icon: '📅', color: '#3B82F6' },
            { id: 'annual', name: 'Anual', duration: '1 año', weeks: 52, icon: '🗓️', color: '#10B981' },
            { id: 'semester', name: 'Semestral', duration: '6 meses', weeks: 26, icon: '📆', color: '#F59E0B' },
            { id: 'quarter', name: 'Trimestral', duration: '3 meses', weeks: 12, icon: '🔥', color: '#EF4444' },
            { id: 'monthly', name: 'Mensual', duration: '1 mes', weeks: 4, icon: '⚡', color: '#8B5CF6' }
          ].map(duration => (
            <Card 
              key={duration.id}
              className={`cursor-pointer hover:shadow-md transition-all ${macrocycleConfig.duration === duration.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setMacrocycleConfig({...macrocycleConfig, duration: duration.id})}
            >
              <CardContent className="p-4 text-center">
                <span className="text-3xl block mb-2">{duration.icon}</span>
                <p className="font-bold">{duration.name}</p>
                <p className="text-sm font-medium" style={{ color: duration.color }}>{duration.duration}</p>
                <p className="text-xs text-slate-500">{duration.weeks} semanas</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {macrocycleConfig.duration && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
            <Clock className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-green-800">
                <strong>{CYCLE_DURATIONS[macrocycleConfig.duration]?.weeks}</strong> semanas de planificación
              </p>
              <p className="text-xs text-green-600">{CYCLE_DURATIONS[macrocycleConfig.duration]?.description}</p>
            </div>
          </div>
        )}
      </div>
    );
    
    // Paso 3: Configuración Final
    const renderStep3 = () => (
      <div className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Información del Ciclo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Nombre del Plan *</label>
                <Input
                  placeholder="Ej: Preparación Campeonato 2026"
                  value={macrocycleConfig.name}
                  onChange={(e) => setMacrocycleConfig({...macrocycleConfig, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Fecha de Inicio *</label>
                <Input
                  type="date"
                  value={macrocycleConfig.startDate}
                  onChange={(e) => setMacrocycleConfig({...macrocycleConfig, startDate: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Sesiones por Semana</label>
                <Select 
                  value={String(macrocycleConfig.sessionsPerWeek)} 
                  onValueChange={(v) => setMacrocycleConfig({...macrocycleConfig, sessionsPerWeek: parseInt(v)})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 sesiones</SelectItem>
                    <SelectItem value="4">4 sesiones</SelectItem>
                    <SelectItem value="5">5 sesiones</SelectItem>
                    <SelectItem value="6">6 sesiones</SelectItem>
                    <SelectItem value="7">7 sesiones</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                Objetivo Principal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Competencia Principal</label>
                <Input
                  placeholder="Ej: Campeonato Nacional"
                  value={macrocycleConfig.mainCompetition}
                  onChange={(e) => setMacrocycleConfig({...macrocycleConfig, mainCompetition: e.target.value})}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Fecha de Competencia</label>
                <Input
                  type="date"
                  value={macrocycleConfig.mainCompetitionDate}
                  onChange={(e) => setMacrocycleConfig({...macrocycleConfig, mainCompetitionDate: e.target.value})}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Resumen */}
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-800 mb-3">Resumen de configuración:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Modelo:</span>
                <p className="font-medium">{PERIODIZATION_MODELS[macrocycleConfig.model]?.name || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Duración:</span>
                <p className="font-medium">{CYCLE_DURATIONS[macrocycleConfig.duration]?.name || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Semanas:</span>
                <p className="font-medium">{CYCLE_DURATIONS[macrocycleConfig.duration]?.weeks || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Sesiones/sem:</span>
                <p className="font-medium">{macrocycleConfig.sessionsPerWeek}</p>
              </div>
            </div>
            
            {/* Preview de fases */}
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fases que se generarán:</p>
              <div className="flex rounded overflow-hidden h-6">
                {MACROCYCLE_PHASES.map((phase, idx) => (
                  <div 
                    key={phase.id} 
                    className="flex-1 flex items-center justify-center text-xs font-medium text-white"
                    style={{ backgroundColor: phase.color }}
                    title={phase.name}
                  >
                    {idx < 3 && phase.name.split(' ')[0]}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {MACROCYCLE_PHASES.map(phase => (
                  <span key={phase.id} className="flex items-center gap-1 text-xs">
                    <div className="w-2 h-2 rounded" style={{ backgroundColor: phase.color }} />
                    {phase.name}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
    
    return (
      <div className="space-y-6">
        {/* Header con pasos */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <React.Fragment key={step.number}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    wizardStep === step.number ? 'bg-white text-blue-600 ring-4 ring-blue-300' :
                    wizardStep > step.number ? 'bg-green-500 text-white' :
                    'bg-blue-500/30 text-blue-100'
                  }`}>
                    {wizardStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.number}
                  </div>
                  <span className="text-xs mt-1 font-medium">{step.title}</span>
                  <span className="text-xs text-blue-200">{step.subtitle}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-4 rounded ${wizardStep > step.number ? 'bg-green-400' : 'bg-blue-500/30'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Contenido del paso */}
        <Card className="border-0 shadow-md">
          <CardContent className="p-6">
            {wizardStep === 1 && renderStep1()}
            {wizardStep === 2 && renderStep2()}
            {wizardStep === 3 && renderStep3()}
          </CardContent>
        </Card>
        
        {/* Botones de navegación */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={prevStep} disabled={wizardStep === 1}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
          </Button>
          
          <span className="text-sm text-slate-500">Paso {wizardStep} de 3</span>
          
          {wizardStep < 3 ? (
            <Button onClick={nextStep} disabled={!isStepValid(wizardStep)} className="bg-blue-600 hover:bg-blue-700">
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleCreateMacrocycle} 
              disabled={saving || !isStepValid(3) || !athleteId}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Generar Plan</>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Vista de estructura con edición de sesiones y drag & drop
  const StructureView = () => {
    const [expandedMeso, setExpandedMeso] = useState(null);
    const [expandedMicro, setExpandedMicro] = useState(null);
    const [editingSession, setEditingSession] = useState(null);
    const [editedSessionData, setEditedSessionData] = useState({});
    const [draggedSession, setDraggedSession] = useState(null);
    const [dragOverSession, setDragOverSession] = useState(null);
    
    // Estado para el editor de sesión completo (modal)
    const [fullEditorSession, setFullEditorSession] = useState(null);
    const [fullEditorLocation, setFullEditorLocation] = useState(null);

    // Session types for editing
    const SESSION_TYPES = [
      { id: 'strength', name: 'Fuerza', color: 'bg-red-100 border-red-300' },
      { id: 'endurance', name: 'Resistencia', color: 'bg-blue-100 border-blue-300' },
      { id: 'speed', name: 'Velocidad', color: 'bg-yellow-100 border-yellow-300' },
      { id: 'technical', name: 'Técnica', color: 'bg-green-100 border-green-300' },
      { id: 'recovery', name: 'Recuperación', color: 'bg-violet-100 border-violet-300' },
      { id: 'tactical', name: 'Táctica', color: 'bg-orange-100 border-orange-300' },
      { id: 'flexibility', name: 'Flexibilidad', color: 'bg-pink-100 border-pink-300' }
    ];

    // Abrir el editor completo de sesión
    const openFullSessionEditor = (mesoIdx, microIdx, sessionIdx, session) => {
      setFullEditorSession(session);
      setFullEditorLocation({ mesoIdx, microIdx, sessionIdx });
    };

    // Cerrar el editor completo
    const closeFullSessionEditor = () => {
      setFullEditorSession(null);
      setFullEditorLocation(null);
    };

    // Guardar sesión desde el editor completo
    const saveFullEditorSession = (updatedSession) => {
      if (!fullEditorLocation) return;
      
      const { mesoIdx, microIdx, sessionIdx } = fullEditorLocation;
      const updatedMacrocycle = { ...macrocycle };
      updatedMacrocycle.mesocycles[mesoIdx].microcycles[microIdx].sessions[sessionIdx] = updatedSession;
      
      setMacrocycle(updatedMacrocycle);
      saveMacrocycleToBackend(updatedMacrocycle);
    };

    // Start editing a session (inline - ahora solo para edición rápida)
    const startEditSession = (mesoIdx, microIdx, sessionIdx, session) => {
      // Abrir el editor completo en vez del inline
      openFullSessionEditor(mesoIdx, microIdx, sessionIdx, session);
    };

    // Save edited session
    const saveEditedSession = () => {
      if (!editingSession) return;
      
      const { mesoIdx, microIdx, sessionIdx } = editingSession;
      const updatedMacrocycle = { ...macrocycle };
      updatedMacrocycle.mesocycles[mesoIdx].microcycles[microIdx].sessions[sessionIdx] = {
        ...updatedMacrocycle.mesocycles[mesoIdx].microcycles[microIdx].sessions[sessionIdx],
        ...editedSessionData
      };
      
      setMacrocycle(updatedMacrocycle);
      setEditingSession(null);
      setEditedSessionData({});
      toast.success('Sesión actualizada');
      
      // Save to backend
      saveMacrocycleToBackend(updatedMacrocycle);
    };

    // Cancel editing
    const cancelEdit = () => {
      setEditingSession(null);
      setEditedSessionData({});
    };

    // Drag and drop handlers
    const handleDragStart = (e, mesoIdx, microIdx, sessionIdx, session) => {
      setDraggedSession({ mesoIdx, microIdx, sessionIdx, session });
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, mesoIdx, microIdx, sessionIdx) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverSession({ mesoIdx, microIdx, sessionIdx });
    };

    const handleDragLeave = () => {
      setDragOverSession(null);
    };

    const handleDrop = (e, targetMesoIdx, targetMicroIdx, targetSessionIdx) => {
      e.preventDefault();
      
      if (!draggedSession) return;
      
      const { mesoIdx: sourceMesoIdx, microIdx: sourceMicroIdx, sessionIdx: sourceSessionIdx } = draggedSession;
      
      // Same position - do nothing
      if (sourceMesoIdx === targetMesoIdx && sourceMicroIdx === targetMicroIdx && sourceSessionIdx === targetSessionIdx) {
        setDraggedSession(null);
        setDragOverSession(null);
        return;
      }

      const updatedMacrocycle = { ...macrocycle };
      const sourceSessions = [...updatedMacrocycle.mesocycles[sourceMesoIdx].microcycles[sourceMicroIdx].sessions];
      const targetSessions = sourceMesoIdx === targetMesoIdx && sourceMicroIdx === targetMicroIdx 
        ? sourceSessions 
        : [...updatedMacrocycle.mesocycles[targetMesoIdx].microcycles[targetMicroIdx].sessions];

      // Get the dragged session
      const [movedSession] = sourceSessions.splice(sourceSessionIdx, 1);
      
      // If same microcycle, adjust target index
      let adjustedTargetIdx = targetSessionIdx;
      if (sourceMesoIdx === targetMesoIdx && sourceMicroIdx === targetMicroIdx && sourceSessionIdx < targetSessionIdx) {
        adjustedTargetIdx--;
      }
      
      // Insert at new position
      if (sourceMesoIdx === targetMesoIdx && sourceMicroIdx === targetMicroIdx) {
        sourceSessions.splice(adjustedTargetIdx, 0, movedSession);
        updatedMacrocycle.mesocycles[sourceMesoIdx].microcycles[sourceMicroIdx].sessions = sourceSessions;
      } else {
        targetSessions.splice(targetSessionIdx, 0, movedSession);
        updatedMacrocycle.mesocycles[sourceMesoIdx].microcycles[sourceMicroIdx].sessions = sourceSessions;
        updatedMacrocycle.mesocycles[targetMesoIdx].microcycles[targetMicroIdx].sessions = targetSessions;
      }

      setMacrocycle(updatedMacrocycle);
      setDraggedSession(null);
      setDragOverSession(null);
      toast.success('Sesión reorganizada');
      
      // Save to backend
      saveMacrocycleToBackend(updatedMacrocycle);
    };

    // Save macrocycle to backend
    const saveMacrocycleToBackend = async (data) => {
      try {
        const token = getToken();
        await fetch(`${API_URL}/api/periodization`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...data,
            athleteId: athleteId
          })
        });
      } catch (error) {
        console.error('Error saving macrocycle:', error);
      }
    };

    // Delete session
    const deleteSession = (mesoIdx, microIdx, sessionIdx) => {
      if (!window.confirm('¿Eliminar esta sesión?')) return;
      
      const updatedMacrocycle = { ...macrocycle };
      updatedMacrocycle.mesocycles[mesoIdx].microcycles[microIdx].sessions.splice(sessionIdx, 1);
      setMacrocycle(updatedMacrocycle);
      toast.success('Sesión eliminada');
      saveMacrocycleToBackend(updatedMacrocycle);
    };

    // Add new session
    const addSession = (mesoIdx, microIdx) => {
      const micro = macrocycle.mesocycles[mesoIdx].microcycles[microIdx];
      const newSession = {
        id: `session-new-${Date.now()}`,
        date: micro.startDate,
        dayName: 'Nuevo',
        type: 'strength',
        intensity: 'medium',
        duration: 60,
        volume: 50,
        completed: false
      };
      
      const updatedMacrocycle = { ...macrocycle };
      updatedMacrocycle.mesocycles[mesoIdx].microcycles[microIdx].sessions.push(newSession);
      setMacrocycle(updatedMacrocycle);
      toast.success('Sesión agregada');
      saveMacrocycleToBackend(updatedMacrocycle);
    };

    if (!macrocycle) {
      return (
        <div className="text-center py-12 text-slate-400">
          <Layers className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay macrociclo creado</p>
          <p className="text-sm mt-1">Crea uno en la pestaña "Crear"</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Resumen del macrociclo */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{macrocycle.name}</h3>
                <p className="text-slate-300 text-sm">
                  {macrocycle.startDate} → {macrocycle.endDate} • {macrocycle.totalWeeks} semanas
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-300">Competencia Principal</p>
                <p className="font-semibold">{macrocycle.mainCompetition || 'No definida'}</p>
              </div>
            </div>
          </div>
          
          {/* Distribución visual de fases */}
          <div className="p-4 bg-white">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Distribución de Fases</p>
            <div className="flex rounded-lg overflow-hidden h-8 mb-2">
              {macrocycle.mesocycles?.map((meso, idx) => {
                const percentage = (meso.weeks / macrocycle.totalWeeks) * 100;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-center text-xs font-medium text-white transition-all hover:opacity-80"
                    style={{ 
                      backgroundColor: meso.phaseColor, 
                      width: `${percentage}%`,
                      minWidth: percentage > 5 ? 'auto' : '20px'
                    }}
                    title={`${meso.phaseName}: ${meso.weeks} semanas`}
                  >
                    {percentage > 12 && meso.phaseName?.split(' ')[0]}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              {macrocycle.mesocycles?.filter((meso, idx, arr) => 
                arr.findIndex(m => m.phaseName === meso.phaseName) === idx
              ).map((meso, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: meso.phaseColor }} />
                  <span className="text-slate-600">{meso.phaseName}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Instrucciones de drag & drop */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
          <GripVertical className="w-5 h-5 text-blue-500" />
          <p className="text-sm text-blue-700">
            <strong>Tip:</strong> Arrastra las sesiones para reorganizarlas. Haz clic en una sesión para editarla.
          </p>
        </div>

        {/* Lista de mesociclos */}
        <div className="space-y-3">
          {macrocycle.mesocycles?.map((meso, mesoIdx) => (
            <Card key={meso.id} className="border-0 shadow-sm overflow-hidden">
              <button
                className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedMeso(expandedMeso === mesoIdx ? null : mesoIdx)}
                style={{ borderLeft: `4px solid ${meso.phaseColor}` }}
              >
                <div className="flex items-center gap-3">
                  {expandedMeso === mesoIdx ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  <div className="text-left">
                    <p className="font-semibold text-slate-800">{meso.name}</p>
                    <p className="text-sm text-slate-500">
                      {meso.weeks} semanas • {meso.type?.name} • Vol: {meso.totalVolume}% • Int: {meso.avgIntensity}%
                    </p>
                  </div>
                </div>
                <span 
                  className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: meso.phaseColor }}
                >
                  {meso.phaseName}
                </span>
              </button>

              {expandedMeso === mesoIdx && (
                <div className="border-t bg-slate-50 p-4">
                  <div className="space-y-2">
                    {meso.microcycles?.map((micro, microIdx) => (
                      <div key={micro.id}>
                        <button
                          className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                            micro.isDeload ? 'bg-violet-100 hover:bg-violet-200' : 'bg-white hover:bg-slate-100'
                          }`}
                          onClick={() => setExpandedMicro(expandedMicro === `${mesoIdx}-${microIdx}` ? null : `${mesoIdx}-${microIdx}`)}
                        >
                          <div className="flex items-center gap-2">
                            {expandedMicro === `${mesoIdx}-${microIdx}` ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <span className="font-medium">{micro.name}</span>
                            {micro.isDeload && (
                              <span className="px-2 py-0.5 bg-violet-500 text-white text-xs rounded-full">Descarga</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-500">{micro.startDate}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">Vol: {micro.volume}%</span>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">Int: {micro.intensity}%</span>
                          </div>
                        </button>

                        {expandedMicro === `${mesoIdx}-${microIdx}` && (
                          <div className="mt-2 ml-6 p-4 bg-white rounded-lg border">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-semibold text-slate-500 uppercase">Sesiones de la semana:</p>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => addSession(mesoIdx, microIdx)}
                                className="h-7 text-xs"
                              >
                                <Plus className="w-3 h-3 mr-1" /> Agregar sesión
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                              {micro.sessions?.map((session, sIdx) => {
                                const isEditing = editingSession?.mesoIdx === mesoIdx && 
                                                  editingSession?.microIdx === microIdx && 
                                                  editingSession?.sessionIdx === sIdx;
                                const isDragOver = dragOverSession?.mesoIdx === mesoIdx && 
                                                   dragOverSession?.microIdx === microIdx && 
                                                   dragOverSession?.sessionIdx === sIdx;
                                const sessionType = SESSION_TYPES.find(t => t.id === session.type) || SESSION_TYPES[0];

                                return (
                                  <div 
                                    key={session.id}
                                    draggable={!isEditing}
                                    onDragStart={(e) => handleDragStart(e, mesoIdx, microIdx, sIdx, session)}
                                    onDragOver={(e) => handleDragOver(e, mesoIdx, microIdx, sIdx)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleDrop(e, mesoIdx, microIdx, sIdx)}
                                    className={`relative p-3 rounded-lg border-2 transition-all ${
                                      isEditing ? 'ring-2 ring-cyan-400 border-cyan-400' :
                                      isDragOver ? 'border-dashed border-cyan-500 bg-cyan-50' :
                                      sessionType.color
                                    } ${!isEditing ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : ''}`}
                                  >
                                    {!isEditing ? (
                                      <>
                                        {/* Normal view */}
                                        <div className="flex items-center justify-between mb-2">
                                          <GripVertical className="w-4 h-4 text-slate-400" />
                                          <div className="flex gap-1">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); startEditSession(mesoIdx, microIdx, sIdx, session); }}
                                              className="p-1 hover:bg-white rounded"
                                              data-testid={`edit-session-${mesoIdx}-${microIdx}-${sIdx}`}
                                            >
                                              <Edit2 className="w-3 h-3 text-slate-500" />
                                            </button>
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); deleteSession(mesoIdx, microIdx, sIdx); }}
                                              className="p-1 hover:bg-white rounded"
                                              data-testid={`delete-session-${mesoIdx}-${microIdx}-${sIdx}`}
                                            >
                                              <Trash2 className="w-3 h-3 text-red-500" />
                                            </button>
                                          </div>
                                        </div>
                                        <p className="font-bold text-sm">{session.dayName}</p>
                                        <p className="text-xs font-medium capitalize text-slate-700">{sessionType.name}</p>
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
                                      </>
                                    ) : (
                                      <>
                                        {/* Edit mode */}
                                        <div className="space-y-2">
                                          <Input
                                            value={editedSessionData.dayName || ''}
                                            onChange={(e) => setEditedSessionData({...editedSessionData, dayName: e.target.value})}
                                            placeholder="Día"
                                            className="h-7 text-xs"
                                          />
                                          <Select 
                                            value={editedSessionData.type} 
                                            onValueChange={(v) => setEditedSessionData({...editedSessionData, type: v})}
                                          >
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {SESSION_TYPES.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <Input
                                            type="number"
                                            value={editedSessionData.duration || 60}
                                            onChange={(e) => setEditedSessionData({...editedSessionData, duration: parseInt(e.target.value)})}
                                            placeholder="Duración (min)"
                                            className="h-7 text-xs"
                                          />
                                          <Select 
                                            value={editedSessionData.intensity} 
                                            onValueChange={(v) => setEditedSessionData({...editedSessionData, intensity: v})}
                                          >
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue placeholder="Intensidad" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="low">Baja</SelectItem>
                                              <SelectItem value="medium">Media</SelectItem>
                                              <SelectItem value="high">Alta</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <div className="flex gap-1 mt-2">
                                            <Button size="sm" onClick={saveEditedSession} className="h-6 text-xs flex-1 bg-green-500 hover:bg-green-600">
                                              <Check className="w-3 h-3" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={cancelEdit} className="h-6 text-xs flex-1">
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>

        {/* Editor de Sesión Completo (Modal) */}
        <SessionEditor
          isOpen={!!fullEditorSession}
          onClose={closeFullSessionEditor}
          session={fullEditorSession}
          onSave={saveFullEditorSession}
          exercises={EJERCICIOS_INICIALES}
          athleteId={athleteId}
          athleteName={athleteName}
        />
      </div>
    );
  };

  // Vista de gráficos
  const ChartsView = () => {
    if (chartData.volumeByWeek.length === 0) {
      return (
        <div className="text-center py-12 text-slate-400">
          <BarChart3 className="w-16 h-16 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay datos para mostrar</p>
          <p className="text-sm mt-1">Crea un macrociclo primero</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Gráfico de Barras - Volumen por Semana */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5" />
              Volumen por Semana
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.volumeByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`${value}%`, 'Volumen']}
                />
                <Legend />
                <Bar 
                  dataKey="volumen" 
                  fill="#3B82F6" 
                  radius={[4, 4, 0, 0]}
                  name="Volumen (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Líneas - Volumen vs Intensidad */}
        <Card className="border-0 shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-xl py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5" />
              Evolución Volumen vs Intensidad
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.intensityByWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="semana" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="volumen" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                  name="Volumen (%)"
                />
                <Area 
                  type="monotone" 
                  dataKey="intensidad" 
                  stroke="#EF4444" 
                  fill="#EF4444" 
                  fillOpacity={0.3}
                  name="Intensidad (%)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráficos de Torta */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Distribución de Componentes */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-t-xl py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieChart className="w-5 h-5" />
                Distribución de Componentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={chartData.componentDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {chartData.componentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, '']} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {chartData.componentDistribution.map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                    {item.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Distribución por Fases */}
          <Card className="border-0 shadow-md">
            <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-t-xl py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="w-5 h-5" />
                Semanas por Fase
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={macrocycle?.phases || MACROCYCLE_PHASES}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="weeks"
                    label={({ name, weeks }) => `${weeks}sem`}
                    labelLine={false}
                  >
                    {(macrocycle?.phases || MACROCYCLE_PHASES).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} semanas`, props.payload.name]} />
                </RechartsPie>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {(macrocycle?.phases || MACROCYCLE_PHASES).map((item, idx) => (
                  <span key={idx} className="flex items-center gap-1 text-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                    {item.name}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  if (!athleteId) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-12 text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-600">Selecciona un Atleta</h3>
          <p className="text-slate-400 mt-2">Ve a la sección "Atletas" y selecciona uno para crear su periodización</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-6 h-6" />
              Sistema de Periodización
            </h2>
            <p className="text-cyan-100 text-sm mt-1">
              Atleta: {athleteName || 'Seleccionado'} • Generación automática basada en principios del entrenamiento
            </p>
          </div>
          {macrocycle && (
            <div className="text-right">
              <p className="text-sm text-cyan-100">Macrociclo activo</p>
              <p className="font-semibold">{macrocycle.totalWeeks} semanas</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="create" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
            <Plus className="w-4 h-4 mr-1" /> Crear
          </TabsTrigger>
          <TabsTrigger value="view" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
            <Layers className="w-4 h-4 mr-1" /> Estructura
          </TabsTrigger>
          <TabsTrigger value="charts" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
            <BarChart3 className="w-4 h-4 mr-1" /> Gráficos
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="create" className="mt-0">
            <CreateView />
          </TabsContent>
          <TabsContent value="view" className="mt-0">
            <StructureView />
          </TabsContent>
          <TabsContent value="charts" className="mt-0">
            <ChartsView />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default PeriodizationSystem;
