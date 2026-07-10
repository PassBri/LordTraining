import React, { useState, useEffect } from 'react';
import { tx as tt } from '../lib/autoTranslate';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { 
  User, Brain, Heart, Activity, LineChart, Trophy,
  Apple, Users, AlertTriangle, Save, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const AthleteCharacterization = ({ athleteId, onSave }) => {
  useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Datos Básicos
    name: '',
    experience: '',
    age: '',
    position: '',
    level: '',
    observation: '',
    // Aspectos Biológicos
    inheritance: '',
    biologicalAge: '',
    optimalSelectionAge: '',
    healthStatus: '',
    // Medidas y Desarrollo
    anthropometricParams: '',
    physicalQualities: '',
    cognitiveCapabilities: '',
    psychologicalCharacteristics: '',
    // Aspectos Socioeconómicos
    socioeconomicCharacteristics: '',
    environment: '',
    // Estado Actual y Trayectoria
    nutritionalStatus: '',
    sportsTrajectory: '',
    otherSportsExperience: '',
    previousSeasonPerformance: '',
    objectives: '',
    trainingLevels: '',
    currentForm: '',
    injuries: ''
  });

  useEffect(() => {
    if (athleteId) {
      loadCharacterization();
    }
  }, [athleteId]);

  const loadCharacterization = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/characterization/athlete/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data) {
        setFormData(prev => ({ ...prev, ...response.data }));
      }
    } catch (error) {
      console.log('No previous characterization found');
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
        `${BACKEND_URL}/api/characterization/athlete`,
        { ...formData, athlete_id: athleteId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(tt('Caracterización guardada correctamente'));
      if (onSave) onSave(formData);
    } catch (error) {
      toast.error(tt('Error al guardar la caracterización'));
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      title: "1. Información General",
      icon: User,
      color: "blue",
      fields: [
        { label: "Nombre", name: "name", type: "input", placeholder: "Nombre completo del deportista..." },
        { label: "Edad", name: "age", type: "input", placeholder: "Edad del deportista..." },
        { label: "Experiencia", name: "experience", type: "input", placeholder: "Años de experiencia..." },
        { label: "Posición", name: "position", type: "input", placeholder: "Posición o especialidad..." },
        { label: "Nivel", name: "level", type: "input", placeholder: "Nivel competitivo..." },
        { label: "Observaciones generales", name: "observation", type: "textarea", placeholder: "Observaciones relevantes sobre el deportista..." }
      ]
    },
    {
      title: "2. Aspectos Biológicos y Hereditarios",
      icon: Brain,
      color: "purple",
      fields: [
        { label: "Herencia", name: "inheritance", type: "textarea", placeholder: "Influencia genética en capacidades físicas y talentos específicos..." },
        { label: "Edad biológica", name: "biologicalAge", type: "textarea", placeholder: "Evaluación de la edad biológica vs cronológica..." },
        { label: "Edad óptima de selección", name: "optimalSelectionAge", type: "textarea", placeholder: "Momento ideal para iniciar el entrenamiento específico..." }
      ]
    },
    {
      title: "3. Estado de Salud y Condición Física",
      icon: Heart,
      color: "red",
      fields: [
        { label: "Estado de salud", name: "healthStatus", type: "textarea", placeholder: "Resultados de revisión médica, evaluaciones y estado general de salud..." },
        { label: "Parámetros antropométricos", name: "anthropometricParams", type: "textarea", placeholder: "Medidas corporales: estatura, peso, somatotipo, composición muscular..." },
        { label: "Desarrollo de cualidades físicas y coordinativas", name: "physicalQualities", type: "textarea", placeholder: "Capacidad para mejorar habilidades físicas y coordinativas..." }
      ]
    },
    {
      title: "4. Aspectos Psicológicos y Cognitivos",
      icon: Brain,
      color: "indigo",
      fields: [
        { label: "Características psicológicas", name: "psychologicalCharacteristics", type: "textarea", placeholder: "Motivación, estrés, concentración, resiliencia..." },
        { label: "Capacidades cognitivas", name: "cognitiveCapabilities", type: "textarea", placeholder: "Habilidades de pensamiento, percepción, memoria y toma de decisiones..." }
      ]
    },
    {
      title: "5. Entorno Socioeconómico",
      icon: Users,
      color: "teal",
      fields: [
        { label: "Características socio-económicas", name: "socioeconomicCharacteristics", type: "textarea", placeholder: "Influencia del entorno socio-económico en recursos y oportunidades..." },
        { label: "Conocimiento de su entorno", name: "environment", type: "textarea", placeholder: "Actividades laborales, educativas y dedicación al deporte..." }
      ]
    },
    {
      title: "6. Nutrición y Estado Actual",
      icon: Apple,
      color: "green",
      fields: [
        { label: "Estado nutricional del deportista", name: "nutritionalStatus", type: "textarea", placeholder: "Evaluación de dieta, macronutrientes y micronutrientes..." }
      ]
    },
    {
      title: "7. Trayectoria Deportiva",
      icon: Trophy,
      color: "amber",
      fields: [
        { label: "Trayectoria deportiva", name: "sportsTrajectory", type: "textarea", placeholder: "Historial de competiciones, logros y progresión..." },
        { label: "Experiencia en otros deportes", name: "otherSportsExperience", type: "textarea", placeholder: "Participación en otras disciplinas deportivas..." }
      ]
    },
    {
      title: "8. Rendimiento y Objetivos",
      icon: LineChart,
      color: "cyan",
      fields: [
        { label: "¿Cuál fue su rendimiento en la temporada anterior?", name: "previousSeasonPerformance", type: "textarea", placeholder: "Desempeño, estadísticas y logros de la última temporada..." },
        { label: "¿Qué objetivos se plantearon y qué porcentaje se cumplió?", name: "objectives", type: "textarea", placeholder: "Objetivos propuestos y nivel de cumplimiento..." }
      ]
    },
    {
      title: "9. Entrenamiento y Forma Actual",
      icon: Activity,
      color: "orange",
      fields: [
        { label: "Niveles de entrenamiento realizados", name: "trainingLevels", type: "textarea", placeholder: "Volumen e intensidad de los entrenamientos..." },
        { label: "¿Cuál es su forma actual?", name: "currentForm", type: "textarea", placeholder: "Condición física y técnica actual..." }
      ]
    },
    {
      title: "10. Historial de Lesiones",
      icon: AlertTriangle,
      color: "rose",
      fields: [
        { label: "Lesiones", name: "injuries", type: "textarea", placeholder: "Historial de lesiones, severidad, tratamientos y recuperación..." }
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-[#B8912A] bg-[#D4AF37]',
      purple: 'text-purple-600 bg-purple-50',
      red: 'text-red-600 bg-red-50',
      indigo: 'text-[#B8912A] bg-[#D4AF37]',
      teal: 'text-teal-600 bg-teal-50',
      green: 'text-green-600 bg-green-50',
      amber: 'text-amber-600 bg-amber-50',
      cyan: 'text-cyan-600 bg-cyan-50',
      orange: 'text-orange-600 bg-orange-50',
      rose: 'text-rose-600 bg-rose-50'
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
        <h1 className="text-2xl font-bold mb-2">{tt('Caracterización del Deportista')}</h1>
        <p className="opacity-90 text-sm">
          Diagnóstico completo de las condiciones del deportista para la planificación
          y optimización de su entrenamiento y desarrollo deportivo.
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
                  {field.type === 'input' ? (
                    <Input
                      value={formData[field.name]}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="border-gray-200 focus:border-[#B8912A]"
                      data-testid={`athlete-${field.name}`}
                    />
                  ) : (
                    <Textarea 
                      value={formData[field.name]}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      placeholder={field.placeholder}
                      className="min-h-[100px] resize-y border-gray-200 focus:border-[#B8912A]"
                      data-testid={`athlete-${field.name}`}
                    />
                  )}
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
          data-testid="save-athlete-char-btn"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Guardar Caracterización
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AthleteCharacterization;
