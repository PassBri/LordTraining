import React, { useState, useEffect } from 'react';
import { tx as tt } from '../lib/autoTranslate';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Activity, Dumbbell, Zap, Timer, Target, Flame, BarChart, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const SportCharacterization = ({ athleteId, onSave }) => {
  useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    sportName: '',
    movementOrganization: '',
    predominantEnergy: '',
    determinantEnergy: '',
    muscularFibers: '',
    energySubstrate: '',
    generalMotor: '',
    specialMotor: '',
    effortType: '',
    observation: '',
    description: '',
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
        `${BACKEND_URL}/api/characterization/sport/${athleteId}`,
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
        `${BACKEND_URL}/api/characterization/sport`,
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
      title: "1. Identificación del Deporte",
      icon: Target,
      color: "blue",
      fields: [
        {
          label: "Nombre del deporte o actividad física",
          name: "sportName",
          placeholder: "Especifica el nombre del deporte o actividad física..."
        },
        {
          label: "Observación",
          name: "observation",
          placeholder: "Añade observaciones generales sobre el deporte..."
        },
        {
          label: "Descripción",
          name: "description",
          placeholder: "Proporciona una descripción general del deporte..."
        }
      ]
    },
    {
      title: "2. Organización del Movimiento",
      icon: Activity,
      color: "green",
      fields: [
        {
          label: "Organización de los movimientos",
          name: "movementOrganization",
          placeholder: "Describe cómo se estructuran y coordinan los movimientos (cíclicos, acíclicos, combinados)..."
        }
      ]
    },
    {
      title: "3. Sistemas Energéticos",
      icon: Zap,
      color: "amber",
      fields: [
        {
          label: "Sistema Energético Predominante",
          name: "predominantEnergy",
          placeholder: "Identifica el sistema energético principal (ATP-PC, glucolítico, oxidativo)..."
        },
        {
          label: "Sistema energético determinante",
          name: "determinantEnergy",
          placeholder: "Señala el sistema energético que limita el rendimiento..."
        }
      ]
    },
    {
      title: "4. Características Musculares",
      icon: Dumbbell,
      color: "red",
      fields: [
        {
          label: "Tipos de fibras musculares",
          name: "muscularFibers",
          placeholder: "Especifica los tipos de fibras musculares predominantes (Tipo I, Tipo IIa, Tipo IIx)..."
        }
      ]
    },
    {
      title: "5. Metabolismo Energético",
      icon: Flame,
      color: "orange",
      fields: [
        {
          label: "Sustrato energético utilizado",
          name: "energySubstrate",
          placeholder: "Describe los principales combustibles metabólicos (ATP, glucógeno, ácidos grasos)..."
        }
      ]
    },
    {
      title: "6. Cualidades Motrices",
      icon: BarChart,
      color: "purple",
      fields: [
        {
          label: "Cualidades motrices generales",
          name: "generalMotor",
          placeholder: "Incluye las cualidades motrices generales (fuerza, resistencia, velocidad, flexibilidad)..."
        },
        {
          label: "Cualidades motrices especiales",
          name: "specialMotor",
          placeholder: "Describe las habilidades específicas del deporte..."
        }
      ]
    },
    {
      title: "7. Caracterización del Esfuerzo",
      icon: Timer,
      color: "teal",
      fields: [
        {
          label: "Tipo de esfuerzo predominante",
          name: "effortType",
          placeholder: "Clasifica el esfuerzo según duración e intensidad (explosivo, intermitente, prolongado)..."
        }
      ]
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-50',
      green: 'text-green-600 bg-green-50',
      amber: 'text-amber-600 bg-amber-50',
      red: 'text-red-600 bg-red-50',
      orange: 'text-orange-600 bg-orange-50',
      purple: 'text-purple-600 bg-purple-50',
      teal: 'text-teal-600 bg-teal-50'
    };
    return colors[color] || colors.blue;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-2">{tt('Caracterización del Deporte')}</h1>
        <p className="opacity-90 text-sm">
          Esta estructura proporciona una vista holística del deporte o actividad física,
          permitiendo entender las demandas específicas y orientar el entrenamiento.
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
                    className="min-h-[100px] resize-y border-gray-200 focus:border-blue-500"
                    data-testid={`sport-${field.name}`}
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
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 shadow-lg"
          data-testid="save-sport-btn"
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

export default SportCharacterization;
