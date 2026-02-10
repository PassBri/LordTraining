import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { 
  Dumbbell, 
  Activity,
  Clock,
  PlusCircle,
  Edit2,
  Trash2,
  Target,
  BarChart,
  TrendingUp,
  Save,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const defaultTrainingMethods = {
  standard: [
    {
      id: 'continuo-uniforme',
      method: "Continuo Uniforme",
      description: "Repetición continua del ejercicio estándar con carga constante.",
      classification: "Estándar Continuo",
      header: {
        effortDuration: "Larga",
        restDuration: "Mínima o nula",
        continuity: "Continua",
        volume: "Media-Alta",
        intensity: "Uniforme"
      }
    },
    {
      id: 'intervalos',
      method: "Intervalos",
      description: "Carga repetida con intervalos de descanso estables.",
      classification: "Intervalos",
      header: {
        effortDuration: "Corta-Media",
        restDuration: "Corta",
        continuity: "Intervalos",
        volume: "Alto",
        intensity: "Alta"
      }
    },
    {
      id: 'series',
      method: "Series",
      description: "Varias repeticiones por serie con mayor descanso entre series.",
      classification: "Series",
      header: {
        effortDuration: "Larga",
        restDuration: "Larga",
        continuity: "Intervalos",
        volume: "Media-Alta",
        intensity: "Muy alta"
      }
    },
    {
      id: 'repetido',
      method: "Repetido",
      description: "Ejercicios breves con pausas cortas entre repeticiones.",
      classification: "Intervalos",
      header: {
        effortDuration: "Corta",
        restDuration: "Media",
        continuity: "Intervalos",
        volume: "Medio",
        intensity: "Alta"
      }
    },
    {
      id: 'velocidad',
      method: "Velocidad",
      description: "Tramos cortos a velocidad máxima con descansos prolongados.",
      classification: "Series",
      header: {
        effortDuration: "Muy corta",
        restDuration: "Larga",
        continuity: "Intervalos",
        volume: "Bajo",
        intensity: "Máxima"
      }
    }
  ],
  variable: [
    {
      id: 'continuo-variable',
      method: "Continuo Variable",
      description: "Ciclos naturales variando ritmo y velocidad.",
      classification: "Variable",
      header: {
        effortDuration: "Variable",
        restDuration: "N/A",
        continuity: "Continua",
        volume: "Variable",
        intensity: "Alto"
      }
    },
    {
      id: 'progresivo',
      method: "Progresivo",
      description: "Aumento riguroso de la carga con descansos para incremento.",
      classification: "Variable",
      header: {
        effortDuration: "Variable",
        restDuration: "Ajustable",
        continuity: "Progresiva",
        volume: "Ascendente",
        intensity: "Variable"
      }
    },
    {
      id: 'decreciente',
      method: "Decreciente",
      description: "Disminución de la carga con variación en factores secundarios.",
      classification: "Variable",
      header: {
        effortDuration: "Variable",
        restDuration: "Ajustable",
        continuity: "Decreciente",
        volume: "Descendente",
        intensity: "Variable"
      }
    }
  ],
  combined: [
    {
      id: 'progresivo-repetido',
      method: "Progresivo Repetido",
      description: "Disminución de descansos y aumento de velocidad.",
      classification: "Combinado",
      header: {
        effortDuration: "Corta-Media",
        restDuration: "Variable",
        continuity: "Progresivo",
        volume: "Variable",
        intensity: "Medio-Alto"
      }
    },
    {
      id: 'multiseriado',
      method: "Multiseriado",
      description: "Planificación para varias clases, no una única sesión.",
      classification: "Combinado",
      header: {
        effortDuration: "Variable",
        restDuration: "Variable",
        continuity: "Variable",
        volume: "Alto",
        intensity: "Alto"
      }
    },
    {
      id: 'intervalo-estandar',
      method: "Intervalo Estándar",
      description: "Combinación de repetido y variable con carga variable reiterada.",
      classification: "Combinado",
      header: {
        effortDuration: "Variable",
        restDuration: "Corta",
        continuity: "Mixta",
        volume: "Variable",
        intensity: "Alta"
      }
    }
  ]
};

const TrainingMethods = ({ athleteId }) => {
  const [selectedCategory, setSelectedCategory] = useState('standard');
  const [methodsData, setMethodsData] = useState(defaultTrainingMethods);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    method: '',
    description: '',
    classification: '',
    category: 'standard',
    header: {
      effortDuration: '',
      restDuration: '',
      continuity: '',
      volume: '',
      intensity: ''
    }
  });

  useEffect(() => {
    loadMethods();
  }, [athleteId]);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/training-methods`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data && response.data.methods) {
        setMethodsData(response.data.methods);
      }
    } catch (error) {
      console.log('Using default training methods');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMethods = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/training-methods`,
        { methods: methodsData },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Métodos guardados correctamente');
    } catch (error) {
      toast.error('Error al guardar los métodos');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMethod = () => {
    setEditingMethod(null);
    setFormData({
      method: '',
      description: '',
      classification: '',
      category: selectedCategory,
      header: {
        effortDuration: '',
        restDuration: '',
        continuity: '',
        volume: '',
        intensity: ''
      }
    });
    setShowForm(true);
  };

  const handleEditMethod = (method, category) => {
    setEditingMethod({ ...method, category });
    setFormData({
      ...method,
      category
    });
    setShowForm(true);
  };

  const handleDeleteMethod = (methodId, category) => {
    if (window.confirm('¿Está seguro de que desea eliminar este método?')) {
      setMethodsData(prev => ({
        ...prev,
        [category]: prev[category].filter(m => m.id !== methodId)
      }));
      toast.success('Método eliminado');
    }
  };

  const handleFormSubmit = () => {
    if (!formData.method || !formData.description) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    const newMethod = {
      id: editingMethod?.id || `custom-${Date.now()}`,
      method: formData.method,
      description: formData.description,
      classification: formData.classification || formData.category,
      header: formData.header
    };

    if (editingMethod) {
      setMethodsData(prev => ({
        ...prev,
        [formData.category]: prev[formData.category].map(m => 
          m.id === editingMethod.id ? newMethod : m
        )
      }));
      toast.success('Método actualizado');
    } else {
      setMethodsData(prev => ({
        ...prev,
        [formData.category]: [...prev[formData.category], newMethod]
      }));
      toast.success('Método agregado');
    }

    setShowForm(false);
    setEditingMethod(null);
  };

  const icons = {
    effortDuration: Clock,
    restDuration: Activity,
    continuity: BarChart,
    volume: TrendingUp,
    intensity: Target
  };

  const labels = {
    effortDuration: 'Duración Esfuerzo',
    restDuration: 'Duración Descanso',
    continuity: 'Continuidad',
    volume: 'Volumen',
    intensity: 'Intensidad'
  };

  const renderMethodCard = (method, category) => (
    <Card key={method.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-bold text-base text-gray-900">{method.method}</h3>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full mt-1">
              {method.classification}
            </span>
          </div>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
              onClick={() => handleEditMethod(method, category)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
              onClick={() => handleDeleteMethod(method.id, category)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3">{method.description}</p>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(method.header).map(([key, value]) => {
              const Icon = icons[key];
              return (
                <div key={key} className="flex items-center gap-2">
                  <Icon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs text-gray-500 block truncate">{labels[key]}</span>
                    <span className="text-xs font-medium text-gray-900 truncate block">{value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Métodos de Entrenamiento</h1>
            <p className="text-blue-100 text-sm mt-1">Gestión y clasificación de métodos según la metodología deportiva</p>
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <Card className="border-2 border-blue-200 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">
                {editingMethod ? 'Editar Método' : 'Nuevo Método'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre del Método *</label>
                <Input
                  value={formData.method}
                  onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                  placeholder="Ej: Intervalos Extensivos"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Clasificación</label>
                <Input
                  value={formData.classification}
                  onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))}
                  placeholder="Ej: Intervalos"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Descripción *</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del método..."
                className="min-h-[80px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Categoría</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Métodos Estándar</SelectItem>
                  <SelectItem value="variable">Métodos Variables</SelectItem>
                  <SelectItem value="combined">Métodos Combinados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.keys(labels).map(key => (
                <div key={key}>
                  <label className="text-xs font-medium text-gray-600">{labels[key]}</label>
                  <Input
                    value={formData.header[key] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      header: { ...prev.header, [key]: e.target.value }
                    }))}
                    placeholder={labels[key]}
                    className="h-9 text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button onClick={handleFormSubmit} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-2" />
                {editingMethod ? 'Actualizar' : 'Agregar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Methods Tabs */}
      <Card className="shadow-md">
        <CardContent className="p-4">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
              <TabsList className="grid grid-cols-3 bg-gray-100">
                <TabsTrigger 
                  value="standard"
                  className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  data-testid="methods-tab-standard"
                >
                  Estándar
                </TabsTrigger>
                <TabsTrigger 
                  value="variable"
                  className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  data-testid="methods-tab-variable"
                >
                  Variables
                </TabsTrigger>
                <TabsTrigger 
                  value="combined"
                  className="text-xs sm:text-sm data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  data-testid="methods-tab-combined"
                >
                  Combinados
                </TabsTrigger>
              </TabsList>

              <Button 
                onClick={handleAddMethod}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
                data-testid="add-method-btn"
              >
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Método
              </Button>
            </div>
            
            {Object.entries(methodsData).map(([category, methods]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {methods.map(method => renderMethodCard(method, category))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSaveMethods}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="save-methods-btn"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Métodos
        </Button>
      </div>
    </div>
  );
};

export default TrainingMethods;
