import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  Calendar,
  Target,
  Activity,
  Clock,
  TrendingUp,
  BarChart,
  RefreshCw,
  Save,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const TrainingStages = ({ athleteId }) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

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

  const durationOptions = [
    { value: "4-semanas", label: "4 Semanas" },
    { value: "6-semanas", label: "6 Semanas" },
    { value: "8-semanas", label: "8 Semanas" },
    { value: "10-semanas", label: "10 Semanas" },
    { value: "12-semanas", label: "12 Semanas" },
    { value: "16-semanas", label: "16 Semanas" },
    { value: "personalizado", label: "Personalizado" }
  ];

  const [stages, setStages] = useState({
    general: {
      duration: '8-semanas',
      volume: 'alto',
      intensity: 'media',
      focus: 'Desarrollo de capacidades básicas',
      objective: '',
      keyPoints: [
        'Adaptación anatómica',
        'Resistencia de base',
        'Fuerza general',
        'Técnica básica'
      ]
    },
    specific: {
      duration: '6-semanas',
      volume: 'medio-alto',
      intensity: 'alta',
      focus: 'Desarrollo de capacidades específicas',
      objective: '',
      keyPoints: [
        'Resistencia específica',
        'Fuerza específica',
        'Técnica avanzada',
        'Velocidad específica'
      ]
    },
    precompetitive: {
      duration: '4-semanas',
      volume: 'medio',
      intensity: 'submaxima',
      focus: 'Preparación competitiva',
      objective: '',
      keyPoints: [
        'Integración técnico-táctica',
        'Simulación competitiva',
        'Ajustes finales',
        'Preparación mental'
      ]
    },
    competitive: {
      duration: '8-semanas',
      volume: 'medio-bajo',
      intensity: 'maxima',
      focus: 'Rendimiento máximo',
      objective: '',
      keyPoints: [
        'Pico de forma',
        'Rendimiento específico',
        'Recuperación entre competencias',
        'Mantenimiento'
      ]
    },
    transitory: {
      duration: '4-semanas',
      volume: 'muy-bajo',
      intensity: 'baja',
      focus: 'Recuperación activa',
      objective: '',
      keyPoints: [
        'Regeneración física',
        'Recuperación mental',
        'Actividades alternativas',
        'Planificación siguiente ciclo'
      ]
    }
  });

  const periods = [
    {
      title: "Período Preparatorio",
      description: "Fase fundamental donde se construyen las bases del rendimiento deportivo según los principios de progresión y adaptación",
      stages: ["general", "specific"],
      icon: Target,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500"
    },
    {
      title: "Período Competitivo",
      description: "Fase de máximo rendimiento aplicando principios de especificidad e individualización para optimizar el pico de forma",
      stages: ["precompetitive", "competitive"],
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500"
    },
    {
      title: "Período Transitorio",
      description: "Fase de recuperación activa basada en el principio de reversibilidad controlada y regeneración integral",
      stages: ["transitory"],
      icon: RefreshCw,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-l-orange-500"
    }
  ];

  const stageNames = {
    general: "General",
    specific: "Específica",
    precompetitive: "Precompetitiva",
    competitive: "Competitiva",
    transitory: "Transitoria"
  };

  const stageDescriptions = {
    general: "Desarrollo de las capacidades físicas básicas y adaptación progresiva a las cargas de entrenamiento. Se establece la base para el trabajo específico posterior aplicando el principio de multilateralidad.",
    specific: "Desarrollo de las capacidades específicas del deporte. El trabajo se orienta hacia los requerimientos técnicos y físicos de la disciplina aplicando el principio de especificidad.",
    precompetitive: "Integración de todos los aspectos del entrenamiento y simulación de condiciones competitivas. Ajustes finales de la preparación aplicando el principio de modelación competitiva.",
    competitive: "Optimización del rendimiento para las competencias principales. Mantenimiento de la forma deportiva y recuperación entre eventos aplicando el principio de supercompensación.",
    transitory: "Recuperación activa y regeneración física y mental. Evaluación del ciclo completado y planificación del siguiente aplicando el principio de ciclicidad."
  };

  useEffect(() => {
    if (athleteId) {
      loadStages();
    }
  }, [athleteId]);

  const loadStages = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/training-stages/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.stages) {
        setStages(response.data.stages);
      }
    } catch (error) {
      // No data found, use defaults
      console.log('No training stages found, using defaults');
    } finally {
      setLoading(false);
    }
  };

  const handleStageChange = (stage, field, value) => {
    setStages(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/training-stages`,
        { athlete_id: athleteId, stages },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Planificación guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar la planificación');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setStages({
      general: {
        duration: '8-semanas',
        volume: 'alto',
        intensity: 'media',
        focus: 'Desarrollo de capacidades básicas',
        objective: '',
        keyPoints: ['Adaptación anatómica', 'Resistencia de base', 'Fuerza general', 'Técnica básica']
      },
      specific: {
        duration: '6-semanas',
        volume: 'medio-alto',
        intensity: 'alta',
        focus: 'Desarrollo de capacidades específicas',
        objective: '',
        keyPoints: ['Resistencia específica', 'Fuerza específica', 'Técnica avanzada', 'Velocidad específica']
      },
      precompetitive: {
        duration: '4-semanas',
        volume: 'medio',
        intensity: 'submaxima',
        focus: 'Preparación competitiva',
        objective: '',
        keyPoints: ['Integración técnico-táctica', 'Simulación competitiva', 'Ajustes finales', 'Preparación mental']
      },
      competitive: {
        duration: '8-semanas',
        volume: 'medio-bajo',
        intensity: 'maxima',
        focus: 'Rendimiento máximo',
        objective: '',
        keyPoints: ['Pico de forma', 'Rendimiento específico', 'Recuperación entre competencias', 'Mantenimiento']
      },
      transitory: {
        duration: '4-semanas',
        volume: 'muy-bajo',
        intensity: 'baja',
        focus: 'Recuperación activa',
        objective: '',
        keyPoints: ['Regeneración física', 'Recuperación mental', 'Actividades alternativas', 'Planificación siguiente ciclo']
      }
    });
    toast.info('Valores restablecidos');
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          Planificación de Etapas de Entrenamiento
        </h1>
        <p className="opacity-90 text-sm md:text-base">
          Sistema profesional de periodización basado en los principios del entrenamiento deportivo
        </p>
      </div>

      {periods.map((period, index) => (
        <Card key={index} className={`shadow-lg border-l-4 ${period.borderColor}`}>
          <CardHeader className={`${period.bgColor}`}>
            <CardTitle className={`flex items-center gap-2 ${period.color} text-lg md:text-xl`}>
              <period.icon className="h-6 w-6" />
              {period.title}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">{period.description}</p>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="space-y-8">
              {period.stages.map((stageName) => (
                <div key={stageName} className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Clock className={`h-5 w-5 ${period.color}`} />
                    <h3 className="text-lg md:text-xl font-semibold">
                      Etapa {stageNames[stageName]}
                    </h3>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 text-sm md:text-base">
                      {stageDescriptions[stageName]}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="font-medium flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        Duración
                      </label>
                      <Select
                        value={stages[stageName].duration}
                        onValueChange={(value) => handleStageChange(stageName, 'duration', value)}
                      >
                        <SelectTrigger data-testid={`stage-${stageName}-duration`}>
                          <SelectValue placeholder="Seleccionar duración" />
                        </SelectTrigger>
                        <SelectContent>
                          {durationOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium flex items-center gap-2 text-sm">
                        <TrendingUp className="h-4 w-4" />
                        Volumen
                      </label>
                      <Select
                        value={stages[stageName].volume}
                        onValueChange={(value) => handleStageChange(stageName, 'volume', value)}
                      >
                        <SelectTrigger data-testid={`stage-${stageName}-volume`}>
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
                      <Select
                        value={stages[stageName].intensity}
                        onValueChange={(value) => handleStageChange(stageName, 'intensity', value)}
                      >
                        <SelectTrigger data-testid={`stage-${stageName}-intensity`}>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <label className="font-medium flex items-center gap-2 text-sm">
                        <Target className="h-4 w-4" />
                        Objetivo Específico
                      </label>
                      <Textarea
                        value={stages[stageName].objective}
                        onChange={(e) => handleStageChange(stageName, 'objective', e.target.value)}
                        placeholder="Define los objetivos específicos para esta etapa basados en los principios del entrenamiento..."
                        className="min-h-[120px]"
                        data-testid={`stage-${stageName}-objective`}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="font-medium flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        Puntos Clave de Entrenamiento
                      </label>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        {stages[stageName].keyPoints.map((point, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span className="text-sm">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleReset}
          data-testid="reset-stages-btn"
        >
          <RefreshCw className="h-4 w-4" />
          Restablecer
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          onClick={handleSave}
          disabled={saving}
          data-testid="save-stages-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar Planificación
        </Button>
      </div>
    </div>
  );
};

export default TrainingStages;
