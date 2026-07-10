import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Target, Activity, Award, AlertTriangle, Brain, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const PreviousPlanAnalysis = ({ athleteId, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    initialObjectives: '',
    achievementLevel: '',
    performanceIndicators: '',
    objectivesCompliance: '',
    recoveryProcess: '',
    fatiguePeriods: '',
    injuries: '',
    injuryImpact: '',
    injuryMeasures: '',
    planPositiveAspects: '',
    planImprovementAreas: '',
    nutritionHabits: '',
    hydrationHabits: '',
    nutritionImpact: '',
    stressManagement: '',
    competitionPressure: '',
    psychSupport: '',
    equipmentAdequacy: '',
    techNeeds: '',
    specificChanges: '',
    nextCycleChanges: '',
    stagnationPhases: '',
    stagnationReasons: '',
    performanceResults: '',
    planningCompliance: '',
    trainingLevels: '',
    difficulties: ''
  });

  useEffect(() => {
    if (athleteId) {
      loadAnalysis();
    }
  }, [athleteId]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/analysis/previous-plan/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data) {
        setFormData(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      // Si no existe, se usa el formulario vacío
      console.log('No previous analysis found');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/analysis/previous-plan`,
        { ...formData, athlete_id: athleteId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Análisis guardado correctamente');
      if (onSave) onSave(formData);
    } catch (error) {
      toast.error('Error al guardar el análisis');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: "1. Objetivos y Nivel de Cumplimiento",
      icon: Target,
      color: "blue",
      fields: [
        {
          label: "¿Cuáles eran los objetivos al inicio del plan de entrenamiento?",
          name: "initialObjectives",
          placeholder: "Detalla los objetivos iniciales establecidos..."
        },
        {
          label: "¿En qué medida consideras que has alcanzado estos objetivos?",
          name: "achievementLevel",
          placeholder: "Evalúa el nivel de cumplimiento de cada objetivo (0-100%)..."
        },
        {
          label: "Nivel de cumplimiento de objetivos planteados",
          name: "objectivesCompliance",
          placeholder: "Describe el nivel general de cumplimiento..."
        }
      ]
    },
    {
      title: "2. Rendimiento y Evolución",
      icon: Activity,
      color: "green",
      fields: [
        {
          label: "¿Cómo ha evolucionado el rendimiento en los indicadores clave?",
          name: "performanceIndicators",
          placeholder: "Describe la evolución en tiempos, pesos, distancias, etc..."
        },
        {
          label: "Resultados obtenidos - nivel de rendimiento de la temporada anterior",
          name: "performanceResults",
          placeholder: "Detalla los resultados y el nivel de rendimiento alcanzado..."
        }
      ]
    },
    {
      title: "3. Recuperación entre Sesiones",
      icon: Activity,
      color: "purple",
      fields: [
        {
          label: "¿Cómo calificarías tu proceso de recuperación entre sesiones de entrenamiento?",
          name: "recoveryProcess",
          placeholder: "Excelente / Bueno / Regular / Deficiente - Describe..."
        },
        {
          label: "¿Experimentaste algún periodo de fatiga prolongada?",
          name: "fatiguePeriods",
          placeholder: "Detalla los períodos de fatiga experimentados y su duración..."
        }
      ]
    },
    {
      title: "4. Lesiones y su Impacto",
      icon: AlertTriangle,
      color: "red",
      fields: [
        {
          label: "¿Sufriste alguna lesión durante el periodo de entrenamiento?",
          name: "injuries",
          placeholder: "Tipo de lesión, zona afectada, tiempo de recuperación..."
        },
        {
          label: "¿Cómo afectaron las lesiones a tu plan de entrenamiento?",
          name: "injuryImpact",
          placeholder: "Explica el impacto de las lesiones en tu entrenamiento..."
        },
        {
          label: "¿Qué medidas preventivas se implementaron?",
          name: "injuryMeasures",
          placeholder: "Describe las medidas de prevención aplicadas..."
        }
      ]
    },
    {
      title: "5. Aspectos del Plan de Entrenamiento",
      icon: Award,
      color: "amber",
      fields: [
        {
          label: "¿Qué aspectos del plan de entrenamiento funcionaron mejor para ti?",
          name: "planPositiveAspects",
          placeholder: "Identifica los aspectos más efectivos del plan..."
        },
        {
          label: "¿Cuáles crees que necesitan ajustes?",
          name: "planImprovementAreas",
          placeholder: "Señala las áreas que requieren mejoras..."
        },
        {
          label: "¿Hubo fases de estancamiento? ¿Cuáles fueron las razones?",
          name: "stagnationPhases",
          placeholder: "Describe los períodos de estancamiento y sus causas..."
        }
      ]
    },
    {
      title: "6. Nutrición e Hidratación",
      icon: Activity,
      color: "teal",
      fields: [
        {
          label: "¿Cómo ha sido tu alimentación a lo largo del plan de entrenamiento?",
          name: "nutritionHabits",
          placeholder: "Describe tus hábitos alimenticios, dieta, suplementación..."
        },
        {
          label: "¿Cómo ha sido tu hidratación durante el plan?",
          name: "hydrationHabits",
          placeholder: "Detalla tus hábitos de hidratación antes, durante y después..."
        },
        {
          label: "¿Cómo ha impactado la nutrición en tu rendimiento?",
          name: "nutritionImpact",
          placeholder: "Describe el impacto de la alimentación en tu desempeño..."
        }
      ]
    },
    {
      title: "7. Aspectos Psicológicos",
      icon: Brain,
      color: "indigo",
      fields: [
        {
          label: "¿Cómo has manejado el estrés asociado al entrenamiento?",
          name: "stressManagement",
          placeholder: "Técnicas de manejo del estrés, descanso mental..."
        },
        {
          label: "¿Cómo has manejado la presión durante la competición?",
          name: "competitionPressure",
          placeholder: "Explica cómo manejaste la presión competitiva..."
        },
        {
          label: "¿Recibiste apoyo psicológico?",
          name: "psychSupport",
          placeholder: "Describe el apoyo psicológico recibido y su efectividad..."
        }
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-[#B8912A] bg-[#D4AF37]',
      green: 'text-green-600 bg-green-50',
      purple: 'text-purple-600 bg-purple-50',
      red: 'text-red-600 bg-red-50',
      amber: 'text-amber-600 bg-amber-50',
      teal: 'text-teal-600 bg-teal-50',
      indigo: 'text-[#B8912A] bg-[#D4AF37]'
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#B8912A]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#D4AF37] to-[#D4AF37] text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-2">Análisis del Plan de Entrenamiento Anterior</h1>
        <p className="opacity-90 text-sm">
          Evaluación detallada del ciclo de entrenamiento previo para identificar fortalezas y áreas de mejora.
        </p>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-6">
        {sections.map((section, index) => (
          <Card key={index} className="shadow-md border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className={`p-2 rounded-lg ${getColorClasses(section.color)}`}>
                  <section.icon className="h-5 w-5" />
                </div>
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              {section.fields.map((field, fieldIndex) => (
                <div key={fieldIndex} className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">{field.label}</label>
                  <Textarea 
                    value={formData[field.name]}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    className="min-h-[100px] resize-y border-gray-200 focus:border-[#B8912A]"
                    data-testid={`analysis-${field.name}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end sticky bottom-4">
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="bg-[#D4AF37] hover:bg-[#D4AF37] text-white px-8 py-2 shadow-lg"
          data-testid="save-analysis-btn"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Análisis
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PreviousPlanAnalysis;
