import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Target,
  Users,
  Award,
  Brain,
  Dumbbell,
  Gamepad2,
  BookOpen,
  RefreshCw,
  Save,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const planTypes = {
  individual: {
    title: "Plan Individual",
    description: "Diseñado para un atleta específico",
    icon: Target
  },
  group: {
    title: "Plan Grupal",
    description: "Para equipos o grupos",
    icon: Users
  },
  olympic: {
    title: "Ciclo Olímpico",
    description: "Planificación a 4 años",
    icon: Award
  }
};

const trainingComponents = [
  {
    id: "physical",
    title: "Preparación Física",
    icon: Dumbbell,
    aspects: ["General", "Específica"],
    levels: {
      initiation: ["Desarrollo motor básico", "Acondicionamiento general"],
      perfection: ["Especificidad deportiva", "Desarrollo avanzado"],
      highAchievement: ["Optimización del rendimiento", "Pico de forma"]
    }
  },
  {
    id: "technical",
    title: "Preparación Técnica",
    icon: Target,
    aspects: ["Fundamentos", "Técnica avanzada"],
    levels: {
      initiation: ["Técnicas básicas", "Patrones de movimiento"],
      perfection: ["Refinamiento técnico", "Automatización"],
      highAchievement: ["Maestría técnica", "Innovación"]
    }
  },
  {
    id: "tactical",
    title: "Preparación Táctica",
    icon: Gamepad2,
    aspects: ["Individual", "Colectiva"],
    levels: {
      initiation: ["Conceptos básicos", "Toma de decisiones"],
      perfection: ["Estrategias avanzadas", "Adaptación táctica"],
      highAchievement: ["Dominio táctico", "Innovación estratégica"]
    }
  },
  {
    id: "psychological",
    title: "Preparación Psicológica",
    icon: Brain,
    aspects: ["Mental", "Emocional"],
    levels: {
      initiation: ["Motivación básica", "Control emocional"],
      perfection: ["Concentración", "Resiliencia"],
      highAchievement: ["Excelencia mental", "Liderazgo"]
    }
  },
  {
    id: "theoretical",
    title: "Preparación Teórica",
    icon: BookOpen,
    aspects: ["Conocimiento", "Análisis"],
    levels: {
      initiation: ["Reglas básicas", "Fundamentos"],
      perfection: ["Análisis táctico", "Estrategia"],
      highAchievement: ["Innovación", "Maestría conceptual"]
    }
  }
];

const cycles = {
  macro: {
    title: "Macrociclos",
    types: [
      { id: "preparatorio", name: "Preparatorio", color: "bg-blue-100 border-blue-300" },
      { id: "precompetitivo", name: "Precompetitivo", color: "bg-yellow-100 border-yellow-300" },
      { id: "competitivo", name: "Competitivo", color: "bg-green-100 border-green-300" },
      { id: "transicion", name: "Transición", color: "bg-orange-100 border-orange-300" }
    ]
  },
  meso: {
    title: "Mesociclos",
    types: [
      { id: "entrante", name: "Entrante", color: "bg-slate-100 border-slate-300" },
      { id: "basico-desarrollador", name: "Básico Desarrollador", color: "bg-blue-100 border-blue-300" },
      { id: "basico-estabilizador", name: "Básico Estabilizador", color: "bg-cyan-100 border-cyan-300" },
      { id: "prep-control", name: "Preparatorio de Control", color: "bg-indigo-100 border-indigo-300" },
      { id: "precompetitivo", name: "Precompetitivo", color: "bg-yellow-100 border-yellow-300" },
      { id: "competitivo", name: "Competitivo", color: "bg-green-100 border-green-300" },
      { id: "recuperacion", name: "Recuperación", color: "bg-purple-100 border-purple-300" }
    ]
  },
  micro: {
    title: "Microciclos",
    types: [
      { id: "corriente", name: "Corriente", color: "bg-gray-100 border-gray-300" },
      { id: "carga", name: "Carga", color: "bg-blue-100 border-blue-300" },
      { id: "choque", name: "Choque", color: "bg-red-100 border-red-300" },
      { id: "competitivo", name: "Competitivo", color: "bg-green-100 border-green-300" },
      { id: "aproximacion", name: "Aproximación", color: "bg-yellow-100 border-yellow-300" },
      { id: "restablecimiento", name: "Restablecimiento", color: "bg-purple-100 border-purple-300" },
      { id: "mantenimiento", name: "Mantenimiento", color: "bg-teal-100 border-teal-300" },
      { id: "tapering", name: "Tapering", color: "bg-pink-100 border-pink-300" },
      { id: "transicion", name: "Transición", color: "bg-orange-100 border-orange-300" }
    ]
  }
};

const ComprehensiveTrainingPlanner = ({ athleteId }) => {
  const [selectedPlanType, setSelectedPlanType] = useState('individual');
  const [selectedCycle, setSelectedCycle] = useState('macro');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [planData, setPlanData] = useState({
    general: {
      title: '',
      objective: '',
      duration: '',
      level: 'initiation'
    },
    components: {
      physical: { enabled: true, focus: '', notes: '' },
      technical: { enabled: true, focus: '', notes: '' },
      tactical: { enabled: true, focus: '', notes: '' },
      psychological: { enabled: true, focus: '', notes: '' },
      theoretical: { enabled: true, focus: '', notes: '' }
    },
    cycles: {
      macro: {},
      meso: {},
      micro: {}
    }
  });

  useEffect(() => {
    if (athleteId) {
      loadPlanData();
    }
  }, [athleteId]);

  const loadPlanData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/comprehensive-plan/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.planData) {
        setPlanData(response.data.planData);
        setSelectedPlanType(response.data.planType || 'individual');
      }
    } catch (error) {
      console.log('No comprehensive plan found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleComponentChange = (component, field, value) => {
    setPlanData(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [component]: {
          ...prev.components[component],
          [field]: value
        }
      }
    }));
  };

  const handleCycleChange = (cycleType, cycleId, field, value) => {
    setPlanData(prev => ({
      ...prev,
      cycles: {
        ...prev.cycles,
        [cycleType]: {
          ...prev.cycles[cycleType],
          [cycleId]: {
            ...(prev.cycles[cycleType]?.[cycleId] || {}),
            [field]: value
          }
        }
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/comprehensive-plan`,
        { athlete_id: athleteId, planData, planType: selectedPlanType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Plan guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPlanData({
      general: { title: '', objective: '', duration: '', level: 'initiation' },
      components: {
        physical: { enabled: true, focus: '', notes: '' },
        technical: { enabled: true, focus: '', notes: '' },
        tactical: { enabled: true, focus: '', notes: '' },
        psychological: { enabled: true, focus: '', notes: '' },
        theoretical: { enabled: true, focus: '', notes: '' }
      },
      cycles: { macro: {}, meso: {}, micro: {} }
    });
    toast.info('Plan restablecido');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de Tipo de Plan */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Tipo de Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(planTypes).map(([key, type]) => {
              const Icon = type.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlanType(key)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    selectedPlanType === key 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                  data-testid={`plan-type-${key}`}
                >
                  <Icon className={`h-6 w-6 ${selectedPlanType === key ? 'text-blue-600' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <div className={`font-semibold text-sm ${selectedPlanType === key ? 'text-blue-700' : 'text-gray-700'}`}>
                      {type.title}
                    </div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Componentes del Entrenamiento */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Componentes del Entrenamiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trainingComponents.map(component => {
              const Icon = component.icon;
              return (
                <div key={component.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">{component.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Select
                      value={planData.components[component.id]?.focus || ''}
                      onValueChange={(value) => handleComponentChange(component.id, 'focus', value)}
                    >
                      <SelectTrigger data-testid={`component-${component.id}-focus`}>
                        <SelectValue placeholder="Seleccionar enfoque" />
                      </SelectTrigger>
                      <SelectContent>
                        {component.aspects.map(aspect => (
                          <SelectItem key={aspect} value={aspect.toLowerCase()}>
                            {aspect}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Textarea
                      placeholder={`Notas para ${component.title.toLowerCase()}...`}
                      value={planData.components[component.id]?.notes || ''}
                      onChange={(e) => handleComponentChange(component.id, 'notes', e.target.value)}
                      className="h-20 text-sm"
                      data-testid={`component-${component.id}-notes`}
                    />
                  </div>
                  
                  {/* Niveles de desarrollo */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {component.levels.initiation.map((level, idx) => (
                      <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {level}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Estructura de Ciclos */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Estructura de Ciclos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCycle} onValueChange={setSelectedCycle}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              {Object.entries(cycles).map(([key, cycle]) => (
                <TabsTrigger key={key} value={key} data-testid={`cycle-tab-${key}`}>
                  {cycle.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {Object.entries(cycles).map(([key, cycle]) => (
              <TabsContent key={key} value={key} className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {cycle.types.map((type) => (
                    <div 
                      key={type.id} 
                      className={`p-3 rounded-lg border-2 ${type.color}`}
                    >
                      <h4 className="font-medium text-sm mb-2 text-gray-800">{type.name}</h4>
                      <div className="space-y-2">
                        <Input 
                          placeholder="Duración" 
                          className="h-8 text-sm bg-white"
                          value={planData.cycles[key]?.[type.id]?.duration || ''}
                          onChange={(e) => handleCycleChange(key, type.id, 'duration', e.target.value)}
                          data-testid={`cycle-${key}-${type.id}-duration`}
                        />
                        <Textarea 
                          placeholder="Objetivos" 
                          className="h-16 text-sm bg-white"
                          value={planData.cycles[key]?.[type.id]?.objectives || ''}
                          onChange={(e) => handleCycleChange(key, type.id, 'objectives', e.target.value)}
                          data-testid={`cycle-${key}-${type.id}-objectives`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleReset}
          data-testid="reset-comprehensive-btn"
        >
          <RefreshCw className="h-4 w-4" />
          Restablecer
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          onClick={handleSave}
          disabled={saving}
          data-testid="save-comprehensive-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Plan
        </Button>
      </div>
    </div>
  );
};

export default ComprehensiveTrainingPlanner;
