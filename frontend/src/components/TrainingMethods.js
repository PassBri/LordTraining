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
    <div key={method.id} className="bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-sm text-slate-900">{method.method}</h3>
          <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5">
            {method.classification}
          </span>
        </div>
        <div className="flex gap-0.5">
          <Button 
            size="sm" variant="ghost" 
            className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
            onClick={() => handleEditMethod(method, category)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button 
            size="sm" variant="ghost" 
            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
            onClick={() => handleDeleteMethod(method.id, category)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{method.description}</p>

      <div className="bg-slate-50 rounded-lg p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Object.entries(method.header).map(([key, value]) => {
            const Icon = icons[key];
            return (
              <div key={key} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Icon className="h-2.5 w-2.5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] text-slate-400 block truncate uppercase tracking-wider">{labels[key]}</span>
                  <span className="text-[11px] font-semibold text-slate-700 truncate block">{value}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Métodos de Entrenamiento</h2>
              <p className="text-xs text-slate-400 mt-0.5">Gestión y clasificación según la metodología deportiva</p>
            </div>
          </div>
          <Button 
            onClick={handleSaveMethods}
            disabled={saving}
            className="bg-blue-500 hover:bg-blue-600 text-white border-0 rounded-xl text-xs"
            data-testid="save-methods-btn"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
            Guardar
          </Button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-lg p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900">
              {editingMethod ? 'Editar Método' : 'Nuevo Método'}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="rounded-full h-7 w-7 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nombre del Método *</label>
              <Input
                value={formData.method}
                onChange={(e) => setFormData(prev => ({ ...prev, method: e.target.value }))}
                placeholder="Ej: Intervalos Extensivos"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Clasificación</label>
              <Input
                value={formData.classification}
                onChange={(e) => setFormData(prev => ({ ...prev, classification: e.target.value }))}
                placeholder="Ej: Intervalos"
                className="rounded-xl"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Descripción *</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descripción del método..."
              className="min-h-[80px] rounded-xl"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Categoría</label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
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
                <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{labels[key]}</label>
                <Input
                  value={formData.header[key] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, header: { ...prev.header, [key]: e.target.value } }))}
                  placeholder={labels[key]}
                  className="h-9 text-sm rounded-lg"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleFormSubmit} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
              <Save className="h-4 w-4 mr-2" />
              {editingMethod ? 'Actualizar' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}

      {/* Methods Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
            <TabsList className="grid grid-cols-3 bg-slate-100 rounded-xl p-1">
              <TabsTrigger 
                value="standard"
                className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                data-testid="methods-tab-standard"
              >
                Estándar
              </TabsTrigger>
              <TabsTrigger 
                value="variable"
                className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                data-testid="methods-tab-variable"
              >
                Variables
              </TabsTrigger>
              <TabsTrigger 
                value="combined"
                className="text-xs sm:text-sm rounded-lg data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-sm"
                data-testid="methods-tab-combined"
              >
                Combinados
              </TabsTrigger>
            </TabsList>

            <Button 
              onClick={handleAddMethod}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              size="sm"
              data-testid="add-method-btn"
            >
              <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Agregar Método
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
      </div>
    </div>
  );
};

export default TrainingMethods;
