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
  Loader2,
  Trophy,
  Calendar,
  Share2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const planTypes = {
  individual: { title: "Plan Individual", description: "Diseñado para un atleta específico", icon: Target },
  group: { title: "Plan Grupal", description: "Para equipos o grupos", icon: Users },
  olympic: { title: "Ciclo Olímpico", description: "Planificación a 4 años", icon: Award }
};

const categoryOptions = ["Amateur", "Semi-profesional", "Profesional", "Elite"];
const classificationOptions = ["Principiante", "Intermedio", "Avanzado", "Elite"];

const trainingComponents = [
  { id: "physical", title: "Preparación Física General", icon: Dumbbell, aspects: ["General", "Específica"] },
  { id: "specialPhysical", title: "Preparación Física Especial", icon: Target, aspects: ["Fuerza", "Resistencia", "Velocidad"] },
  { id: "technical", title: "Preparación Técnica", icon: Share2, aspects: ["Fundamentos", "Técnica avanzada"] },
  { id: "tactical", title: "Preparación Táctica", icon: Gamepad2, aspects: ["Individual", "Colectiva"] },
  { id: "theoretical", title: "Preparación Teórica", icon: BookOpen, aspects: ["Conocimiento", "Análisis"] },
  { id: "psychological", title: "Preparación Psicológica", icon: Brain, aspects: ["Mental", "Emocional"] }
];

const cycles = {
  macro: {
    title: "Macrociclos",
    types: [
      { id: "preparatorio", name: "Preparatorio", color: "bg-[#D4AF37] border-[#B8912A]" },
      { id: "precompetitivo", name: "Precompetitivo", color: "bg-yellow-100 border-yellow-300" },
      { id: "competitivo", name: "Competitivo", color: "bg-green-100 border-green-300" },
      { id: "transicion", name: "Transición", color: "bg-orange-100 border-orange-300" }
    ]
  },
  meso: {
    title: "Mesociclos",
    types: [
      { id: "entrante", name: "Entrante", color: "bg-slate-100 border-slate-300" },
      { id: "basico-desarrollador", name: "Básico Desarrollador", color: "bg-[#D4AF37] border-[#B8912A]" },
      { id: "basico-estabilizador", name: "Básico Estabilizador", color: "bg-cyan-100 border-cyan-300" },
      { id: "prep-control", name: "Preparatorio de Control", color: "bg-[#D4AF37] border-[#B8912A]" },
      { id: "precompetitivo", name: "Precompetitivo", color: "bg-yellow-100 border-yellow-300" },
      { id: "competitivo", name: "Competitivo", color: "bg-green-100 border-green-300" },
      { id: "recuperacion", name: "Recuperación", color: "bg-purple-100 border-purple-300" }
    ]
  },
  micro: {
    title: "Microciclos",
    types: [
      { id: "corriente", name: "Corriente", color: "bg-gray-100 border-gray-300" },
      { id: "carga", name: "Carga", color: "bg-[#D4AF37] border-[#B8912A]" },
      { id: "choque", name: "Choque", color: "bg-red-100 border-red-300" },
      { id: "competitivo", name: "Competitivo", color: "bg-green-100 border-green-300" },
      { id: "aproximacion", name: "Aproximación", color: "bg-yellow-100 border-yellow-300" },
      { id: "restablecimiento", name: "Restablecimiento", color: "bg-purple-100 border-purple-300" },
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
  const [expandedSections, setExpandedSections] = useState({
    basicInfo: true,
    objectives: true,
    components: false,
    cycles: false
  });
  
  const [planData, setPlanData] = useState({
    // Información Básica
    basicInfo: {
      sport: '',
      category: '',
      ageRange: '',
      classification: '',
      startDate: '',
      endDate: '',
      coach: ''
    },
    // Objetivos del Plan
    objectives: {
      shortTerm: ['', '', ''],
      mediumTerm: ['', '', ''],
      longTerm: ['', '', '']
    },
    // Componentes del Entrenamiento
    components: {
      physical: { focus: '', notes: '' },
      specialPhysical: { focus: '', notes: '' },
      technical: { focus: '', notes: '' },
      tactical: { focus: '', notes: '' },
      theoretical: { focus: '', notes: '' },
      psychological: { focus: '', notes: '' }
    },
    // Estructura de Ciclos
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
        setPlanData(prev => ({ ...prev, ...response.data.planData }));
        setSelectedPlanType(response.data.planType || 'individual');
      }
    } catch (error) {
      console.log('No comprehensive plan found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleBasicInfoChange = (field, value) => {
    setPlanData(prev => ({
      ...prev,
      basicInfo: { ...prev.basicInfo, [field]: value }
    }));
  };

  const handleObjectiveChange = (term, index, value) => {
    setPlanData(prev => ({
      ...prev,
      objectives: {
        ...prev.objectives,
        [term]: prev.objectives[term].map((obj, i) => i === index ? value : obj)
      }
    }));
  };

  const handleComponentChange = (component, field, value) => {
    setPlanData(prev => ({
      ...prev,
      components: {
        ...prev.components,
        [component]: { ...prev.components[component], [field]: value }
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
          [cycleId]: { ...(prev.cycles[cycleType]?.[cycleId] || {}), [field]: value }
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
      toast.success('Plan de entrenamiento guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setPlanData({
      basicInfo: { sport: '', category: '', ageRange: '', classification: '', startDate: '', endDate: '', coach: '' },
      objectives: { shortTerm: ['', '', ''], mediumTerm: ['', '', ''], longTerm: ['', '', ''] },
      components: {
        physical: { focus: '', notes: '' },
        specialPhysical: { focus: '', notes: '' },
        technical: { focus: '', notes: '' },
        tactical: { focus: '', notes: '' },
        theoretical: { focus: '', notes: '' },
        psychological: { focus: '', notes: '' }
      },
      cycles: { macro: {}, meso: {}, micro: {} }
    });
    toast.info('Plan restablecido');
  };

  const SectionHeader = ({ title, icon: Icon, section, color = "text-[#B8912A]" }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <span className={`font-semibold ${color}`}>{title}</span>
      </div>
      {expandedSections[section] ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#B8912A]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tipo de Plan */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(planTypes).map(([key, type]) => {
              const Icon = type.icon;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedPlanType(key)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedPlanType === key ? 'border-[#B8912A] bg-[#D4AF37]' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  data-testid={`plan-type-${key}`}
                >
                  <Icon className={`h-5 w-5 ${selectedPlanType === key ? 'text-[#B8912A]' : 'text-gray-500'}`} />
                  <div className="text-left">
                    <div className={`font-semibold text-sm ${selectedPlanType === key ? 'text-[#B8912A]' : 'text-gray-700'}`}>
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

      {/* Información Básica */}
      <Card className="shadow-md overflow-hidden">
        <SectionHeader title="Información Básica" icon={Trophy} section="basicInfo" />
        {expandedSections.basicInfo && (
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Deporte/Objetivo</label>
                <Input
                  placeholder="Ej: Fútbol, Natación..."
                  value={planData.basicInfo.sport}
                  onChange={(e) => handleBasicInfoChange('sport', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Categoría</label>
                <Select value={planData.basicInfo.category} onValueChange={(v) => handleBasicInfoChange('category', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(opt => <SelectItem key={opt} value={opt.toLowerCase()}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Rango de Edad</label>
                <Input
                  placeholder="Ej: 18-24"
                  value={planData.basicInfo.ageRange}
                  onChange={(e) => handleBasicInfoChange('ageRange', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Clasificación</label>
                <Select value={planData.basicInfo.classification} onValueChange={(v) => handleBasicInfoChange('classification', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {classificationOptions.map(opt => <SelectItem key={opt} value={opt.toLowerCase()}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha Inicio</label>
                <Input
                  type="date"
                  value={planData.basicInfo.startDate}
                  onChange={(e) => handleBasicInfoChange('startDate', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha Fin</label>
                <Input
                  type="date"
                  value={planData.basicInfo.endDate}
                  onChange={(e) => handleBasicInfoChange('endDate', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-sm font-medium text-gray-700">Entrenador</label>
                <Input
                  placeholder="Nombre del entrenador"
                  value={planData.basicInfo.coach}
                  onChange={(e) => handleBasicInfoChange('coach', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Objetivos del Plan */}
      <Card className="shadow-md overflow-hidden">
        <SectionHeader title="Objetivos del Plan" icon={Target} section="objectives" />
        {expandedSections.objectives && (
          <CardContent className="p-4 pt-2 space-y-6">
            {[
              { key: 'shortTerm', title: 'Corto Plazo', desc: '1-3 meses', color: 'border-l-green-500' },
              { key: 'mediumTerm', title: 'Medio Plazo', desc: '3-6 meses', color: 'border-l-yellow-500' },
              { key: 'longTerm', title: 'Largo Plazo', desc: '6-12 meses', color: 'border-l-blue-500' }
            ].map(term => (
              <div key={term.key} className={`border-l-4 ${term.color} pl-4`}>
                <h4 className="font-semibold text-gray-800">{term.title} <span className="text-sm font-normal text-gray-500">({term.desc})</span></h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {[0, 1, 2].map(idx => (
                    <Textarea
                      key={idx}
                      placeholder={`Objetivo ${idx + 1}...`}
                      value={planData.objectives[term.key][idx]}
                      onChange={(e) => handleObjectiveChange(term.key, idx, e.target.value)}
                      className="min-h-[80px] text-sm"
                    />
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Componentes del Entrenamiento */}
      <Card className="shadow-md overflow-hidden">
        <SectionHeader title="Componentes del Entrenamiento" icon={Dumbbell} section="components" />
        {expandedSections.components && (
          <CardContent className="p-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainingComponents.map(comp => {
                const Icon = comp.icon;
                return (
                  <div key={comp.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="h-4 w-4 text-[#B8912A]" />
                      <span className="font-medium text-sm text-gray-800">{comp.title}</span>
                    </div>
                    <Select
                      value={planData.components[comp.id]?.focus || ''}
                      onValueChange={(v) => handleComponentChange(comp.id, 'focus', v)}
                    >
                      <SelectTrigger className="mb-2 h-9"><SelectValue placeholder="Enfoque" /></SelectTrigger>
                      <SelectContent>
                        {comp.aspects.map(a => <SelectItem key={a} value={a.toLowerCase()}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Notas y objetivos específicos..."
                      value={planData.components[comp.id]?.notes || ''}
                      onChange={(e) => handleComponentChange(comp.id, 'notes', e.target.value)}
                      className="min-h-[60px] text-sm"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Estructura de Ciclos */}
      <Card className="shadow-md overflow-hidden">
        <SectionHeader title="Estructura de Ciclos" icon={Calendar} section="cycles" />
        {expandedSections.cycles && (
          <CardContent className="p-4 pt-2">
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
                      <div key={type.id} className={`p-3 rounded-lg border-2 ${type.color}`}>
                        <h4 className="font-medium text-sm mb-2 text-gray-800">{type.name}</h4>
                        <Input 
                          placeholder="Duración" 
                          className="h-8 text-sm bg-white mb-2"
                          value={planData.cycles[key]?.[type.id]?.duration || ''}
                          onChange={(e) => handleCycleChange(key, type.id, 'duration', e.target.value)}
                        />
                        <Textarea 
                          placeholder="Objetivos" 
                          className="h-16 text-sm bg-white"
                          value={planData.cycles[key]?.[type.id]?.objectives || ''}
                          onChange={(e) => handleCycleChange(key, type.id, 'objectives', e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        )}
      </Card>

      {/* Botones de Acción */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
        <Button variant="outline" className="gap-2" onClick={handleReset} data-testid="reset-plan-btn">
          <RefreshCw className="h-4 w-4" /> Restablecer
        </Button>
        <Button className="bg-[#D4AF37] hover:bg-[#D4AF37] text-white gap-2" onClick={handleSave} disabled={saving} data-testid="save-plan-btn">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Plan
        </Button>
      </div>
    </div>
  );
};

export default ComprehensiveTrainingPlanner;
