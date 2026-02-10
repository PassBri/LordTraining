import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  ArrowLeft, ArrowRight, Check, Calendar, Target, Activity, Layers,
  Zap, Clock, Users, ChevronDown, ChevronRight, Edit2, Trash2, Plus,
  Save, Loader2, Info, BookOpen, BarChart3, Sparkles, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// =============== CONSTANTES DE PERIODIZACIÓN ===============

// Modelos de Periodización Organizados por Categoría
const PERIODIZATION_MODELS = {
  traditional: {
    id: 'traditional',
    name: 'Tradicional (Matveiev)',
    category: 'Clásico',
    description: 'Periodización lineal clásica con progresión gradual de volumen a intensidad',
    icon: '📊',
    color: '#3B82F6',
    phases: ['preparatory_general', 'preparatory_specific', 'precompetitive', 'competitive', 'transition'],
    characteristics: [
      'Progresión lineal de la carga',
      'Alto volumen inicial, baja intensidad',
      'Reducción progresiva de volumen',
      'Incremento gradual de intensidad'
    ]
  },
  atr: {
    id: 'atr',
    name: 'ATR (Issurin)',
    category: 'Clásico',
    description: 'Modelo de bloques concentrados: Acumulación, Transformación, Realización',
    icon: '🔄',
    color: '#8B5CF6',
    phases: ['accumulation', 'transformation', 'realization'],
    characteristics: [
      'Bloques de 2-4 semanas',
      'Desarrollo secuencial de capacidades',
      'Alta concentración de cargas',
      'Efecto residual del entrenamiento'
    ]
  },
  blocks: {
    id: 'blocks',
    name: 'Por Bloques (Verkhoshansky)',
    category: 'Clásico',
    description: 'Cargas concentradas con énfasis en capacidades específicas',
    icon: '📦',
    color: '#EF4444',
    phases: ['strength_block', 'power_block', 'speed_block', 'competition_block'],
    characteristics: [
      'Bloques de carga concentrada',
      'Una capacidad dominante por bloque',
      'Alta especificidad',
      'Para atletas avanzados'
    ]
  },
  undulating_daily: {
    id: 'undulating_daily',
    name: 'Ondulatorio Diario (DUP)',
    category: 'Ondulatorio',
    description: 'Variación diaria de volumen e intensidad',
    icon: '📈',
    color: '#10B981',
    phases: ['continuous'],
    characteristics: [
      'Cambio diario de estímulo',
      'Evita mesetas de entrenamiento',
      'Alta frecuencia de estímulos',
      'Ideal para fuerza/potencia'
    ]
  },
  undulating_weekly: {
    id: 'undulating_weekly',
    name: 'Ondulatorio Semanal (WUP)',
    category: 'Ondulatorio',
    description: 'Variación semanal con microciclos diferenciados',
    icon: '🌊',
    color: '#06B6D4',
    phases: ['heavy_week', 'moderate_week', 'light_week'],
    characteristics: [
      'Semanas de diferente intensidad',
      'Mejor recuperación',
      'Flexibilidad en planificación',
      'Adaptable a calendario'
    ]
  },
  pendulum: {
    id: 'pendulum',
    name: 'Péndulo (Arosiev)',
    category: 'Avanzado',
    description: 'Alternancia entre énfasis técnico-táctico y condicional',
    icon: '⚖️',
    color: '#F59E0B',
    phases: ['technical_emphasis', 'physical_emphasis', 'integration'],
    characteristics: [
      'Alternancia de énfasis',
      'Desarrollo paralelo',
      'Para deportes complejos',
      'Equilibrio técnico-físico'
    ]
  },
  structural_bells: {
    id: 'structural_bells',
    name: 'Campanas Estructurales (Forteza)',
    category: 'Avanzado',
    description: 'Acentuación de direcciones determinantes del rendimiento',
    icon: '🔔',
    color: '#EC4899',
    phases: ['general_direction', 'special_direction', 'competitive_direction'],
    characteristics: [
      'Direcciones determinantes',
      'Acentuación progresiva',
      'Para deportes técnicos',
      'Alta individualización'
    ]
  },
  polarized: {
    id: 'polarized',
    name: 'Polarizado',
    category: 'Específico',
    description: '80% baja intensidad / 20% alta intensidad',
    icon: '🎯',
    color: '#7C3AED',
    phases: ['low_intensity', 'high_intensity'],
    characteristics: [
      'Distribución 80/20',
      'Evita zona intermedia',
      'Para deportes de resistencia',
      'Base aeróbica + trabajo intenso'
    ]
  },
  conjugate: {
    id: 'conjugate',
    name: 'Conjugado (Westside)',
    category: 'Específico',
    description: 'Desarrollo simultáneo de fuerza máxima y velocidad',
    icon: '💪',
    color: '#DC2626',
    phases: ['max_effort', 'dynamic_effort', 'repetition'],
    characteristics: [
      'Método de esfuerzo máximo',
      'Método dinámico',
      'Rotación de ejercicios',
      'Para powerlifting/fuerza'
    ]
  },
  tactical: {
    id: 'tactical',
    name: 'Táctico Periodizado',
    category: 'Específico',
    description: 'Para deportes de equipo con calendario competitivo denso',
    icon: '⚽',
    color: '#059669',
    phases: ['preseason', 'in_season', 'postseason'],
    characteristics: [
      'Adaptado al calendario',
      'Mantenimiento en temporada',
      'Gestión de fatiga',
      'Preparación partido a partido'
    ]
  }
};

// Duraciones de Ciclo
const CYCLE_DURATIONS = {
  olympic: {
    id: 'olympic',
    name: 'Ciclo Olímpico',
    duration: '4 años',
    weeks: 208,
    description: 'Planificación cuatrienal para competencias olímpicas',
    icon: '🏅',
    color: '#FFD700',
    macrocycles: 4,
    suggestedModels: ['traditional', 'blocks', 'atr']
  },
  biannual: {
    id: 'biannual',
    name: 'Bianual',
    duration: '2 años',
    weeks: 104,
    description: 'Dos temporadas completas con desarrollo progresivo',
    icon: '📅',
    color: '#3B82F6',
    macrocycles: 2,
    suggestedModels: ['traditional', 'blocks', 'structural_bells']
  },
  annual: {
    id: 'annual',
    name: 'Anual',
    duration: '1 año',
    weeks: 52,
    description: 'Macrociclo tradicional de una temporada',
    icon: '🗓️',
    color: '#10B981',
    macrocycles: 1,
    suggestedModels: ['traditional', 'atr', 'undulating_weekly', 'tactical']
  },
  semester: {
    id: 'semester',
    name: 'Semestral',
    duration: '6 meses',
    weeks: 26,
    description: 'Media temporada o preparación para evento específico',
    icon: '📆',
    color: '#F59E0B',
    macrocycles: 1,
    suggestedModels: ['atr', 'blocks', 'undulating_weekly']
  },
  quadrimester: {
    id: 'quadrimester',
    name: 'Cuatrimestral',
    duration: '4 meses',
    weeks: 16,
    description: 'Ciclo corto para picos de rendimiento',
    icon: '⏱️',
    color: '#8B5CF6',
    macrocycles: 1,
    suggestedModels: ['atr', 'blocks', 'undulating_daily']
  },
  trimester: {
    id: 'trimester',
    name: 'Trimestral',
    duration: '3 meses',
    weeks: 12,
    description: 'Ciclo intensivo o mesociclo extendido',
    icon: '🔥',
    color: '#EF4444',
    macrocycles: 1,
    suggestedModels: ['undulating_daily', 'polarized', 'conjugate']
  }
};

// Fases de entrenamiento por modelo
const TRAINING_PHASES = {
  preparatory_general: { name: 'Preparatorio General', color: '#3B82F6', volumeBase: 80, intensityBase: 50 },
  preparatory_specific: { name: 'Preparatorio Específico', color: '#8B5CF6', volumeBase: 70, intensityBase: 70 },
  precompetitive: { name: 'Precompetitivo', color: '#F59E0B', volumeBase: 55, intensityBase: 85 },
  competitive: { name: 'Competitivo', color: '#10B981', volumeBase: 40, intensityBase: 95 },
  transition: { name: 'Transición', color: '#6B7280', volumeBase: 30, intensityBase: 40 },
  accumulation: { name: 'Acumulación', color: '#3B82F6', volumeBase: 85, intensityBase: 55 },
  transformation: { name: 'Transformación', color: '#8B5CF6', volumeBase: 65, intensityBase: 80 },
  realization: { name: 'Realización', color: '#10B981', volumeBase: 45, intensityBase: 95 },
  strength_block: { name: 'Bloque de Fuerza', color: '#EF4444', volumeBase: 75, intensityBase: 85 },
  power_block: { name: 'Bloque de Potencia', color: '#F59E0B', volumeBase: 60, intensityBase: 90 },
  speed_block: { name: 'Bloque de Velocidad', color: '#10B981', volumeBase: 50, intensityBase: 95 },
  competition_block: { name: 'Bloque Competitivo', color: '#8B5CF6', volumeBase: 40, intensityBase: 98 },
  continuous: { name: 'Desarrollo Continuo', color: '#06B6D4', volumeBase: 70, intensityBase: 70 },
  heavy_week: { name: 'Semana Pesada', color: '#EF4444', volumeBase: 85, intensityBase: 85 },
  moderate_week: { name: 'Semana Moderada', color: '#F59E0B', volumeBase: 70, intensityBase: 70 },
  light_week: { name: 'Semana Ligera', color: '#10B981', volumeBase: 50, intensityBase: 50 },
  technical_emphasis: { name: 'Énfasis Técnico', color: '#3B82F6', volumeBase: 60, intensityBase: 60 },
  physical_emphasis: { name: 'Énfasis Físico', color: '#EF4444', volumeBase: 80, intensityBase: 80 },
  integration: { name: 'Integración', color: '#10B981', volumeBase: 65, intensityBase: 75 },
  general_direction: { name: 'Dirección General', color: '#3B82F6', volumeBase: 80, intensityBase: 55 },
  special_direction: { name: 'Dirección Especial', color: '#8B5CF6', volumeBase: 70, intensityBase: 75 },
  competitive_direction: { name: 'Dirección Competitiva', color: '#10B981', volumeBase: 50, intensityBase: 90 },
  low_intensity: { name: 'Baja Intensidad (80%)', color: '#10B981', volumeBase: 85, intensityBase: 55 },
  high_intensity: { name: 'Alta Intensidad (20%)', color: '#EF4444', volumeBase: 50, intensityBase: 95 },
  max_effort: { name: 'Esfuerzo Máximo', color: '#EF4444', volumeBase: 50, intensityBase: 100 },
  dynamic_effort: { name: 'Esfuerzo Dinámico', color: '#F59E0B', volumeBase: 70, intensityBase: 60 },
  repetition: { name: 'Repeticiones', color: '#3B82F6', volumeBase: 80, intensityBase: 65 },
  preseason: { name: 'Pretemporada', color: '#3B82F6', volumeBase: 80, intensityBase: 70 },
  in_season: { name: 'Temporada', color: '#10B981', volumeBase: 50, intensityBase: 85 },
  postseason: { name: 'Posttemporada', color: '#6B7280', volumeBase: 40, intensityBase: 40 }
};

// Tipos de Mesociclo
const MESOCYCLE_TYPES = [
  { id: 'entrante', name: 'Entrante', loadFactor: 0.6, description: 'Adaptación inicial' },
  { id: 'desarrollo', name: 'Desarrollo', loadFactor: 0.8, description: 'Construcción de base' },
  { id: 'choque', name: 'Choque', loadFactor: 1.0, description: 'Máxima carga' },
  { id: 'estabilizador', name: 'Estabilizador', loadFactor: 0.75, description: 'Consolidación' },
  { id: 'competitivo', name: 'Competitivo', loadFactor: 0.7, description: 'Puesta a punto' },
  { id: 'recuperacion', name: 'Recuperación', loadFactor: 0.5, description: 'Descarga activa' }
];

// Tipos de Microciclo
const MICROCYCLE_TYPES = [
  { id: 'ordinario', name: 'Ordinario', loadPercent: 70 },
  { id: 'choque', name: 'Choque', loadPercent: 100 },
  { id: 'aproximacion', name: 'Aproximación', loadPercent: 80 },
  { id: 'competitivo', name: 'Competitivo', loadPercent: 60 },
  { id: 'recuperacion', name: 'Recuperación', loadPercent: 40 }
];

// =============== COMPONENTE PRINCIPAL ===============

const PeriodizationWizard = ({ athleteId, athleteName, onComplete, onCancel }) => {
  // Estado del wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  
  // Configuración del plan
  const [config, setConfig] = useState({
    model: '',
    duration: '',
    name: '',
    startDate: '',
    mainCompetition: '',
    mainCompetitionDate: '',
    sessionsPerWeek: 5,
    includeDeloadWeeks: true,
    autoGenerateSessions: true
  });

  // Estructura generada
  const [structure, setStructure] = useState(null);
  const [saving, setSaving] = useState(false);

  // Categorías de modelos para el selector
  const modelCategories = useMemo(() => {
    const categories = {};
    Object.values(PERIODIZATION_MODELS).forEach(model => {
      if (!categories[model.category]) {
        categories[model.category] = [];
      }
      categories[model.category].push(model);
    });
    return categories;
  }, []);

  // Verificar si el paso actual está completo
  const isStepValid = useCallback((step) => {
    switch (step) {
      case 1: return !!config.model;
      case 2: return !!config.duration;
      case 3: return !!config.startDate && !!config.name;
      case 4: return structure !== null;
      case 5: return true;
      default: return false;
    }
  }, [config, structure]);

  // Generar estructura del plan
  const generateStructure = useCallback(() => {
    if (!config.model || !config.duration || !config.startDate) return null;

    const model = PERIODIZATION_MODELS[config.model];
    const duration = CYCLE_DURATIONS[config.duration];
    const startDate = new Date(config.startDate);
    
    // Obtener fases según el modelo
    const phases = model.phases.map(phaseId => ({
      ...TRAINING_PHASES[phaseId],
      id: phaseId
    }));

    // Calcular distribución de semanas por fase
    const totalWeeks = duration.weeks;
    const weeksPerPhase = Math.floor(totalWeeks / phases.length);
    let remainingWeeks = totalWeeks % phases.length;

    // Generar mesociclos y microciclos
    const mesocycles = [];
    let currentDate = new Date(startDate);
    let weekNumber = 1;
    let mesocycleNumber = 1;

    phases.forEach((phase, phaseIndex) => {
      let phaseWeeks = weeksPerPhase + (remainingWeeks > 0 ? 1 : 0);
      if (remainingWeeks > 0) remainingWeeks--;

      // Cada 4 semanas = 1 mesociclo aproximadamente
      const mesocyclesInPhase = Math.ceil(phaseWeeks / 4);

      for (let m = 0; m < mesocyclesInPhase; m++) {
        const weeksInMeso = Math.min(4, phaseWeeks - (m * 4));
        if (weeksInMeso <= 0) continue;

        // Determinar tipo de mesociclo
        let mesoType;
        if (m === 0) mesoType = MESOCYCLE_TYPES[0]; // Entrante
        else if (m === mesocyclesInPhase - 1) mesoType = MESOCYCLE_TYPES[2]; // Choque
        else mesoType = MESOCYCLE_TYPES[1]; // Desarrollo

        const microcycles = [];

        for (let w = 0; w < weeksInMeso; w++) {
          const isDeloadWeek = config.includeDeloadWeeks && (weekNumber % 4 === 0);
          
          // Calcular volumen e intensidad
          const progressionFactor = 1 + (weekNumber * 0.015);
          const deloadFactor = isDeloadWeek ? 0.6 : 1;
          
          const weekVolume = Math.round(phase.volumeBase * mesoType.loadFactor * deloadFactor * progressionFactor);
          const weekIntensity = Math.round(phase.intensityBase * (isDeloadWeek ? 0.7 : 1));

          // Tipo de microciclo
          let microType;
          if (isDeloadWeek) microType = MICROCYCLE_TYPES[4];
          else if (w === weeksInMeso - 1) microType = MICROCYCLE_TYPES[1];
          else microType = MICROCYCLE_TYPES[0];

          // Generar sesiones
          const sessions = [];
          if (config.autoGenerateSessions) {
            for (let s = 0; s < config.sessionsPerWeek; s++) {
              const sessionDate = new Date(currentDate);
              sessionDate.setDate(sessionDate.getDate() + s);
              
              sessions.push({
                id: `session-${weekNumber}-${s}`,
                date: sessionDate.toISOString().split('T')[0],
                dayOfWeek: sessionDate.getDay(),
                type: s % 2 === 0 ? 'strength' : 'endurance',
                intensity: weekIntensity > 70 ? 'high' : 'medium',
                duration: 90,
                volume: Math.round(weekVolume / config.sessionsPerWeek),
                completed: false,
                exercises: []
              });
            }
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

          currentDate.setDate(currentDate.getDate() + 7);
          weekNumber++;
        }

        mesocycles.push({
          id: `meso-${mesocycleNumber}`,
          number: mesocycleNumber,
          name: `${phase.name} - Mesociclo ${m + 1}`,
          phaseId: phase.id,
          phaseName: phase.name,
          phaseColor: phase.color,
          type: mesoType,
          weeks: weeksInMeso,
          microcycles
        });

        mesocycleNumber++;
      }
    });

    return {
      id: `plan-${Date.now()}`,
      athleteId,
      name: config.name,
      model: config.model,
      modelName: model.name,
      duration: config.duration,
      durationName: duration.name,
      startDate: config.startDate,
      endDate: currentDate.toISOString().split('T')[0],
      totalWeeks: weekNumber - 1,
      mainCompetition: config.mainCompetition,
      mainCompetitionDate: config.mainCompetitionDate,
      sessionsPerWeek: config.sessionsPerWeek,
      phases: phases.map(p => ({ id: p.id, name: p.name, color: p.color })),
      mesocycles,
      createdAt: new Date().toISOString()
    };
  }, [config, athleteId]);

  // Avanzar al siguiente paso
  const nextStep = () => {
    if (currentStep === 3 && !structure) {
      const newStructure = generateStructure();
      setStructure(newStructure);
    }
    if (isStepValid(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
      setCurrentStep(currentStep + 1);
    }
  };

  // Retroceder
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Guardar el plan
  const savePlan = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/periodization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(structure)
      });

      if (response.ok) {
        toast.success('¡Plan de periodización creado exitosamente!');
        if (onComplete) onComplete(structure);
      } else {
        throw new Error('Error saving');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al guardar el plan');
    }
    setSaving(false);
  };

  // Pasos del wizard
  const steps = [
    { number: 1, title: 'Modelo', description: 'Tipo de periodización' },
    { number: 2, title: 'Duración', description: 'Ciclo temporal' },
    { number: 3, title: 'Configuración', description: 'Detalles del plan' },
    { number: 4, title: 'Estructura', description: 'Mesociclos y fases' },
    { number: 5, title: 'Confirmar', description: 'Revisar y guardar' }
  ];

  // =============== RENDERIZADO DE PASOS ===============

  // PASO 1: Selección de Modelo
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Selecciona el Modelo de Periodización</h2>
        <p className="text-slate-500 mt-2">El modelo determina cómo se distribuirán las cargas de entrenamiento</p>
      </div>

      {Object.entries(modelCategories).map(([category, models]) => (
        <div key={category} className="mb-6">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            {category}
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {models.map(model => (
              <Card
                key={model.id}
                className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
                  config.model === model.id 
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50' 
                    : 'border-transparent hover:border-slate-200'
                }`}
                onClick={() => setConfig({ ...config, model: model.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{model.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 truncate">{model.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{model.description}</p>
                    </div>
                    {config.model === model.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {config.model && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-blue-800">
                  {PERIODIZATION_MODELS[config.model].name}
                </h4>
                <ul className="mt-2 space-y-1">
                  {PERIODIZATION_MODELS[config.model].characteristics.map((char, idx) => (
                    <li key={idx} className="text-sm text-blue-700 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      {char}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // PASO 2: Selección de Duración
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Selecciona la Duración del Ciclo</h2>
        <p className="text-slate-500 mt-2">Define el período de tiempo que abarcará tu plan de entrenamiento</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.values(CYCLE_DURATIONS).map(duration => (
          <Card
            key={duration.id}
            className={`cursor-pointer transition-all hover:shadow-lg border-2 ${
              config.duration === duration.id
                ? 'border-blue-500 ring-2 ring-blue-200'
                : 'border-transparent hover:border-slate-200'
            }`}
            onClick={() => setConfig({ ...config, duration: duration.id })}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{duration.icon}</span>
                {config.duration === duration.id && (
                  <CheckCircle2 className="w-5 h-5 text-blue-500" />
                )}
              </div>
              <h4 className="font-bold text-lg text-slate-800">{duration.name}</h4>
              <p className="text-sm font-medium mt-1" style={{ color: duration.color }}>
                {duration.duration} ({duration.weeks} semanas)
              </p>
              <p className="text-xs text-slate-500 mt-2">{duration.description}</p>
              
              {config.model && duration.suggestedModels.includes(config.model) && (
                <div className="mt-3 flex items-center gap-1 text-xs text-green-600">
                  <Sparkles className="w-3 h-3" />
                  <span>Recomendado para {PERIODIZATION_MODELS[config.model].name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {config.duration && (
        <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-emerald-500" />
              <div>
                <span className="font-semibold text-emerald-800">
                  {CYCLE_DURATIONS[config.duration].weeks} semanas
                </span>
                <span className="text-emerald-700 mx-2">•</span>
                <span className="text-emerald-700">
                  ~{Math.ceil(CYCLE_DURATIONS[config.duration].weeks / 4)} mesociclos
                </span>
                <span className="text-emerald-700 mx-2">•</span>
                <span className="text-emerald-700">
                  {CYCLE_DURATIONS[config.duration].macrocycles} macrociclo(s)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // PASO 3: Configuración Detallada
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Configura tu Plan</h2>
        <p className="text-slate-500 mt-2">Define los detalles específicos de tu macrociclo</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Columna izquierda */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Información del Ciclo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">
                Nombre del Plan *
              </Label>
              <Input
                placeholder="Ej: Preparación Campeonato 2026"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">
                Fecha de Inicio *
              </Label>
              <Input
                type="date"
                value={config.startDate}
                onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">
                Sesiones por Semana
              </Label>
              <Select
                value={String(config.sessionsPerWeek)}
                onValueChange={(v) => setConfig({ ...config, sessionsPerWeek: parseInt(v) })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 sesiones</SelectItem>
                  <SelectItem value="4">4 sesiones</SelectItem>
                  <SelectItem value="5">5 sesiones</SelectItem>
                  <SelectItem value="6">6 sesiones</SelectItem>
                  <SelectItem value="7">7 sesiones (diario)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Columna derecha */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" />
              Objetivo Principal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">
                Competencia Principal
              </Label>
              <Input
                placeholder="Ej: Campeonato Nacional"
                value={config.mainCompetition}
                onChange={(e) => setConfig({ ...config, mainCompetition: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">
                Fecha de Competencia
              </Label>
              <Input
                type="date"
                value={config.mainCompetitionDate}
                onChange={(e) => setConfig({ ...config, mainCompetitionDate: e.target.value })}
                className="mt-1"
              />
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="deload"
                  checked={config.includeDeloadWeeks}
                  onCheckedChange={(checked) => setConfig({ ...config, includeDeloadWeeks: checked })}
                />
                <Label htmlFor="deload" className="text-sm cursor-pointer">
                  Incluir semanas de descarga (cada 4 semanas)
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <Checkbox
                  id="autosessions"
                  checked={config.autoGenerateSessions}
                  onCheckedChange={(checked) => setConfig({ ...config, autoGenerateSessions: checked })}
                />
                <Label htmlFor="autosessions" className="text-sm cursor-pointer">
                  Generar sesiones automáticamente
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de selección */}
      {config.model && config.duration && (
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <h4 className="font-semibold text-slate-800 mb-3">Resumen de configuración:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Modelo:</span>
                <p className="font-medium">{PERIODIZATION_MODELS[config.model].name}</p>
              </div>
              <div>
                <span className="text-slate-500">Duración:</span>
                <p className="font-medium">{CYCLE_DURATIONS[config.duration].name}</p>
              </div>
              <div>
                <span className="text-slate-500">Semanas:</span>
                <p className="font-medium">{CYCLE_DURATIONS[config.duration].weeks}</p>
              </div>
              <div>
                <span className="text-slate-500">Sesiones/semana:</span>
                <p className="font-medium">{config.sessionsPerWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // PASO 4: Vista de Estructura (Mesociclos)
  const renderStep4 = () => {
    if (!structure) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-500">Generando estructura del plan...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Estructura del Plan</h2>
          <p className="text-slate-500 mt-2">
            {structure.totalWeeks} semanas • {structure.mesocycles.length} mesociclos • {structure.phases.length} fases
          </p>
        </div>

        {/* Timeline visual de fases */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              Distribución de Fases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex rounded-lg overflow-hidden h-8">
              {structure.phases.map((phase, idx) => {
                const phaseWeeks = structure.mesocycles
                  .filter(m => m.phaseId === phase.id)
                  .reduce((sum, m) => sum + m.weeks, 0);
                const percentage = (phaseWeeks / structure.totalWeeks) * 100;
                
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-center text-xs font-medium text-white"
                    style={{ 
                      backgroundColor: phase.color, 
                      width: `${percentage}%`,
                      minWidth: percentage > 5 ? 'auto' : '20px'
                    }}
                    title={`${phase.name}: ${phaseWeeks} semanas`}
                  >
                    {percentage > 10 && phase.name.split(' ')[0]}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {structure.phases.map((phase, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: phase.color }} />
                  <span className="text-slate-600">{phase.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Mesociclos */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Mesociclos ({structure.mesocycles.length})
          </h3>
          
          <div className="grid gap-3">
            {structure.mesocycles.map((meso, idx) => (
              <Card key={meso.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-2 h-12 rounded-full"
                        style={{ backgroundColor: meso.phaseColor }}
                      />
                      <div>
                        <h4 className="font-semibold text-slate-800">
                          Mesociclo {meso.number}: {meso.phaseName}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {meso.weeks} semanas • Tipo: {meso.type.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-slate-500">Microciclos</p>
                      <p className="font-semibold text-lg">{meso.microcycles.length}</p>
                    </div>
                  </div>
                  
                  {/* Mini vista de microciclos */}
                  <div className="flex gap-1 mt-3">
                    {meso.microcycles.map((micro, mIdx) => (
                      <div
                        key={micro.id}
                        className={`flex-1 h-2 rounded ${micro.isDeload ? 'bg-green-300' : 'bg-blue-300'}`}
                        title={`Semana ${micro.weekNumber}: ${micro.isDeload ? 'Descarga' : 'Normal'}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // PASO 5: Confirmación
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">¡Todo Listo!</h2>
        <p className="text-slate-500 mt-2">Revisa el resumen de tu plan antes de guardar</p>
      </div>

      {structure && (
        <Card className="bg-gradient-to-br from-slate-50 to-blue-50">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Detalles del Plan
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nombre:</span>
                    <span className="font-medium">{structure.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Atleta:</span>
                    <span className="font-medium">{athleteName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Modelo:</span>
                    <span className="font-medium">{structure.modelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Duración:</span>
                    <span className="font-medium">{structure.durationName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Inicio:</span>
                    <span className="font-medium">{new Date(structure.startDate).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fin:</span>
                    <span className="font-medium">{new Date(structure.endDate).toLocaleDateString('es-ES')}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-500" />
                  Estructura
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-white">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-blue-600">{structure.totalWeeks}</p>
                      <p className="text-xs text-slate-500 uppercase">Semanas</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-purple-600">{structure.mesocycles.length}</p>
                      <p className="text-xs text-slate-500 uppercase">Mesociclos</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-emerald-600">{structure.phases.length}</p>
                      <p className="text-xs text-slate-500 uppercase">Fases</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white">
                    <CardContent className="p-4 text-center">
                      <p className="text-3xl font-bold text-amber-600">{config.sessionsPerWeek}</p>
                      <p className="text-xs text-slate-500 uppercase">Sesiones/sem</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {config.mainCompetition && (
              <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-800">Objetivo Principal:</span>
                  <span className="text-amber-700">{config.mainCompetition}</span>
                  {config.mainCompetitionDate && (
                    <span className="text-amber-600 ml-2">
                      ({new Date(config.mainCompetitionDate).toLocaleDateString('es-ES')})
                    </span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );

  // =============== RENDER PRINCIPAL ===============

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-lg overflow-hidden" style={{ maxHeight: 'calc(100vh - 120px)' }}>
      {/* Header con pasos */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Sistema de Periodización</h1>
            <p className="text-blue-100 text-sm">
              {athleteName ? `Creando plan para ${athleteName}` : 'Asistente de creación de planes'}
            </p>
          </div>
          {onCancel && (
            <Button variant="ghost" className="text-white hover:bg-white/20" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-between relative">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                    currentStep === step.number
                      ? 'bg-white text-blue-600 ring-4 ring-blue-300'
                      : completedSteps.includes(step.number)
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500/30 text-blue-100'
                  }`}
                >
                  {completedSteps.includes(step.number) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </div>
                <span className="text-xs mt-2 font-medium hidden md:block">{step.title}</span>
                <span className="text-xs text-blue-200 hidden md:block">{step.description}</span>
              </div>
              {idx < steps.length - 1 && (
                <div 
                  className={`flex-1 h-1 mx-2 rounded transition-all ${
                    completedSteps.includes(step.number) ? 'bg-green-400' : 'bg-blue-500/30'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Contenido del paso actual */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
      </div>

      {/* Footer con botones de navegación */}
      <div className="border-t bg-slate-50 p-4 flex items-center justify-between relative z-50 flex-shrink-0" style={{ minHeight: '70px' }}>
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="gap-2"
          data-testid="wizard-anterior-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Anterior
        </Button>

        <div className="text-sm text-slate-500">
          Paso {currentStep} de {steps.length}
        </div>

        {currentStep < 5 ? (
          <Button
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            data-testid="wizard-siguiente-btn"
          >
            Siguiente
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={savePlan}
            disabled={saving}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Plan
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PeriodizationWizard;
