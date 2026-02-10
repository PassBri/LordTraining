import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Target,
  Activity,
  TrendingUp,
  BarChart,
  RefreshCw,
  Save,
  CheckCircle2,
  LayoutPanelTop,
  Waves,
  Triangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PhaseCharacteristics = ({ characteristics }) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      {characteristics.map((char, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-sm">{char}</span>
        </div>
      ))}
    </div>
  );
};

const TrainingParameters = ({ onChange, values }) => {
  const volumeOptions = [
    { value: "muy-alto", label: "Muy Alto (90-100%)" },
    { value: "alto", label: "Alto (80-90%)" },
    { value: "medio-alto", label: "Medio-Alto (70-80%)" },
    { value: "medio", label: "Medio (60-70%)" },
    { value: "medio-bajo", label: "Medio-Bajo (50-60%)" },
    { value: "bajo", label: "Bajo (40-50%)" },
    { value: "muy-bajo", label: "Muy Bajo (<40%)" }
  ];

  const intensityOptions = [
    { value: "maxima", label: "Máxima (90-100%)" },
    { value: "submaxima", label: "Submáxima (80-90%)" },
    { value: "alta", label: "Alta (70-80%)" },
    { value: "media-alta", label: "Media-Alta (60-70%)" },
    { value: "media", label: "Media (50-60%)" },
    { value: "baja", label: "Baja (30-50%)" },
    { value: "muy-baja", label: "Muy Baja (<30%)" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="font-medium flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4" />
          Volumen
        </label>
        <Select value={values.volume} onValueChange={(value) => onChange('volume', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar volumen" />
          </SelectTrigger>
          <SelectContent>
            {volumeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="font-medium flex items-center gap-2 text-sm">
          <BarChart className="h-4 w-4" />
          Intensidad
        </label>
        <Select value={values.intensity} onValueChange={(value) => onChange('intensity', value)}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar intensidad" />
          </SelectTrigger>
          <SelectContent>
            {intensityOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const PeriodizationModels = ({ athleteId }) => {
  const [selectedModel, setSelectedModel] = useState('traditional');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [planData, setPlanData] = useState({
    traditional: {
      phases: {
        preparatory: {
          general: {
            volume: 'alto',
            intensity: 'baja',
            objectives: '',
            keyPoints: [
              'Desarrollo de capacidades básicas',
              'Adaptación anatómica',
              'Resistencia base',
              'Fuerza general'
            ]
          },
          specific: {
            volume: 'medio-alto',
            intensity: 'media-alta',
            objectives: '',
            keyPoints: [
              'Desarrollo técnico',
              'Fuerza específica',
              'Resistencia específica',
              'Velocidad base'
            ]
          }
        },
        competitive: {
          preCompetitive: {
            volume: 'medio',
            intensity: 'alta',
            objectives: '',
            keyPoints: [
              'Integración técnico-táctica',
              'Simulaciones competitivas',
              'Ajustes finales',
              'Preparación mental'
            ]
          },
          competitive: {
            volume: 'bajo',
            intensity: 'maxima',
            objectives: '',
            keyPoints: [
              'Pico de forma',
              'Rendimiento óptimo',
              'Recuperación entre competencias',
              'Mantenimiento'
            ]
          }
        },
        transition: {
          recovery: {
            volume: 'muy-bajo',
            intensity: 'baja',
            objectives: '',
            keyPoints: [
              'Recuperación activa',
              'Regeneración física',
              'Evaluación',
              'Planificación siguiente ciclo'
            ]
          }
        }
      }
    },
    atr: {
      blocks: {
        accumulation: {
          volume: 'alto',
          intensity: 'media',
          objectives: '',
          keyPoints: [
            'Desarrollo de capacidades básicas',
            'Alto volumen de entrenamiento',
            'Trabajo general',
            'Base funcional'
          ]
        },
        transformation: {
          volume: 'medio',
          intensity: 'alta',
          objectives: '',
          keyPoints: [
            'Conversión a capacidades específicas',
            'Intensidad creciente',
            'Trabajo específico',
            'Integración técnico-táctica'
          ]
        },
        realization: {
          volume: 'bajo',
          intensity: 'maxima',
          objectives: '',
          keyPoints: [
            'Puesta a punto',
            'Modelamiento competitivo',
            'Velocidad específica',
            'Preparación mental'
          ]
        }
      }
    },
    contemporary: {
      phases: {
        multilateral: {
          volume: 'medio-alto',
          intensity: 'media',
          objectives: '',
          keyPoints: [
            'Desarrollo multifacético',
            'Integración de capacidades',
            'Base técnico-táctica',
            'Adaptación progresiva'
          ]
        },
        specific: {
          volume: 'medio',
          intensity: 'alta',
          objectives: '',
          keyPoints: [
            'Especialización progresiva',
            'Capacidades específicas',
            'Perfeccionamiento técnico',
            'Preparación integral'
          ]
        },
        competitive: {
          volume: 'bajo',
          intensity: 'maxima',
          objectives: '',
          keyPoints: [
            'Rendimiento sostenido',
            'Picos múltiples',
            'Adaptación continua',
            'Recuperación optimizada'
          ]
        }
      }
    }
  });

  const phaseLabels = {
    preparatory: 'Período Preparatorio',
    competitive: 'Período Competitivo',
    transition: 'Período de Transición',
    general: 'Etapa General',
    specific: 'Etapa Específica',
    preCompetitive: 'Etapa Precompetitiva',
    recovery: 'Recuperación',
    accumulation: 'Bloque de Acumulación',
    transformation: 'Bloque de Transformación',
    realization: 'Bloque de Realización',
    multilateral: 'Fase Multilateral'
  };

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
        `${BACKEND_URL}/api/periodization-models/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.planData) {
        setPlanData(response.data.planData);
      }
    } catch (error) {
      console.log('No periodization data found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleDataChange = (model, phase, subphase, field, value) => {
    setPlanData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      if (model === 'traditional') {
        newData[model].phases[phase][subphase][field] = value;
      } else if (model === 'atr') {
        newData[model].blocks[phase][field] = value;
      } else {
        newData[model].phases[phase][field] = value;
      }
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/periodization-models`,
        { athlete_id: athleteId, planData, selectedModel },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Modelo de periodización guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar el modelo');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    loadPlanData();
    toast.info('Datos restablecidos');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">Modelos de Periodización</h1>
        <p className="opacity-90 text-sm md:text-base">
          Selecciona y personaliza el modelo de periodización según la metodología del entrenamiento deportivo
        </p>
      </div>

      <Tabs value={selectedModel} onValueChange={setSelectedModel} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="traditional" className="data-[state=active]:bg-blue-100" data-testid="tab-traditional">
            <LayoutPanelTop className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Tradicional</span>
            <span className="sm:hidden">Trad.</span>
          </TabsTrigger>
          <TabsTrigger value="atr" className="data-[state=active]:bg-green-100" data-testid="tab-atr">
            <Waves className="h-4 w-4 mr-2" />
            ATR
          </TabsTrigger>
          <TabsTrigger value="contemporary" className="data-[state=active]:bg-purple-100" data-testid="tab-contemporary">
            <Triangle className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Contemporáneo</span>
            <span className="sm:hidden">Cont.</span>
          </TabsTrigger>
        </TabsList>

        {/* MODELO TRADICIONAL */}
        <TabsContent value="traditional" className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-800 mb-2">Modelo Tradicional (Matveyev)</h3>
            <p className="text-sm text-blue-700">
              Basado en la periodización clásica con fases bien diferenciadas: preparación general, 
              específica, competitiva y transitoria. Ideal para deportes con una competencia principal anual.
            </p>
          </div>
          
          {Object.entries(planData.traditional.phases).map(([phase, phaseData]) => (
            <Card key={phase} className="border-l-4 border-l-blue-500 shadow-md">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center gap-2 text-blue-700">
                  <Target className="h-5 w-5" />
                  {phaseLabels[phase] || phase}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 p-6">
                {Object.entries(phaseData).map(([subphase, data]) => (
                  <div key={subphase} className="space-y-4 border-b border-gray-100 pb-6 last:border-0">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {phaseLabels[subphase] || subphase}
                    </h3>
                    <TrainingParameters
                      values={data}
                      onChange={(field, value) => 
                        handleDataChange('traditional', phase, subphase, field, value)
                      }
                    />
                    <Textarea
                      placeholder="Define los objetivos específicos para esta etapa..."
                      value={data.objectives}
                      onChange={(e) => 
                        handleDataChange('traditional', phase, subphase, 'objectives', e.target.value)
                      }
                      className="mt-4 min-h-[80px]"
                    />
                    <PhaseCharacteristics characteristics={data.keyPoints} />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* MODELO ATR */}
        <TabsContent value="atr" className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-green-800 mb-2">Modelo ATR (Issurin/Kaverin)</h3>
            <p className="text-sm text-green-700">
              Acumulación-Transformación-Realización. Modelo de bloques concentrados que permite 
              múltiples picos de forma. Ideal para deportes con varias competencias importantes.
            </p>
          </div>
          
          {Object.entries(planData.atr.blocks).map(([block, data]) => (
            <Card key={block} className="border-l-4 border-l-green-500 shadow-md">
              <CardHeader className="bg-green-50">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <Activity className="h-5 w-5" />
                  {phaseLabels[block] || block}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <TrainingParameters
                  values={data}
                  onChange={(field, value) => handleDataChange('atr', block, null, field, value)}
                />
                <Textarea
                  placeholder="Define los objetivos específicos para este bloque..."
                  value={data.objectives}
                  onChange={(e) => handleDataChange('atr', block, null, 'objectives', e.target.value)}
                  className="mt-4 min-h-[80px]"
                />
                <PhaseCharacteristics characteristics={data.keyPoints} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* MODELO CONTEMPORÁNEO */}
        <TabsContent value="contemporary" className="space-y-6">
          <div className="bg-purple-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-purple-800 mb-2">Modelo Contemporáneo (Bondarchuk)</h3>
            <p className="text-sm text-purple-700">
              Enfoque integrado con desarrollo simultáneo de capacidades. Permite adaptación continua 
              y múltiples picos. Ideal para deportistas de alto nivel con calendario competitivo extenso.
            </p>
          </div>
          
          {Object.entries(planData.contemporary.phases).map(([phase, data]) => (
            <Card key={phase} className="border-l-4 border-l-purple-500 shadow-md">
              <CardHeader className="bg-purple-50">
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Triangle className="h-5 w-5" />
                  {phaseLabels[phase] || phase}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <TrainingParameters
                  values={data}
                  onChange={(field, value) => handleDataChange('contemporary', phase, null, field, value)}
                />
                <Textarea
                  placeholder="Define los objetivos específicos para esta fase..."
                  value={data.objectives}
                  onChange={(e) => 
                    handleDataChange('contemporary', phase, null, 'objectives', e.target.value)
                  }
                  className="mt-4 min-h-[80px]"
                />
                <PhaseCharacteristics characteristics={data.keyPoints} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleReset}
          data-testid="reset-periodization-btn"
        >
          <RefreshCw className="h-4 w-4" />
          Restablecer
        </Button>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          onClick={handleSave}
          disabled={saving}
          data-testid="save-periodization-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Modelo
        </Button>
      </div>
    </div>
  );
};

export default PeriodizationModels;
