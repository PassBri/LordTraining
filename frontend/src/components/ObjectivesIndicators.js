import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Circle,
  Plus,
  Save,
  Loader2,
  Trash2,
  BarChart3,
  Calendar,
  Flag
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const objectiveCategories = [
  { id: 'performance', label: 'Rendimiento', color: 'bg-[#D4AF37]', icon: TrendingUp },
  { id: 'physical', label: 'Físico', color: 'bg-green-500', icon: Target },
  { id: 'technical', label: 'Técnico', color: 'bg-purple-500', icon: Target },
  { id: 'tactical', label: 'Táctico', color: 'bg-orange-500', icon: Target },
  { id: 'psychological', label: 'Psicológico', color: 'bg-pink-500', icon: Target },
  { id: 'competition', label: 'Competitivo', color: 'bg-red-500', icon: Flag },
];

const timeframes = [
  { value: 'short', label: 'Corto Plazo (1-3 meses)' },
  { value: 'medium', label: 'Medio Plazo (3-6 meses)' },
  { value: 'long', label: 'Largo Plazo (6-12 meses)' },
  { value: 'season', label: 'Temporada Completa' },
];

const indicatorTypes = [
  { value: 'quantitative', label: 'Cuantitativo' },
  { value: 'qualitative', label: 'Cualitativo' },
  { value: 'binary', label: 'Sí/No' },
];

const ObjectivesIndicators = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [objectives, setObjectives] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [currentObjective, setCurrentObjective] = useState({
    title: '',
    description: '',
    category: 'performance',
    timeframe: 'short',
    startDate: '',
    targetDate: '',
    indicators: [{ name: '', type: 'quantitative', baseline: '', target: '', current: '', unit: '' }],
    progress: 0,
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    loadObjectives();
  }, [athleteId]);

  const loadObjectives = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/objectives/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setObjectives(response.data?.objectives || []);
    } catch (error) {
      console.log('No objectives found');
    } finally {
      setLoading(false);
    }
  };

  const addIndicator = () => {
    setCurrentObjective(prev => ({
      ...prev,
      indicators: [...prev.indicators, { name: '', type: 'quantitative', baseline: '', target: '', current: '', unit: '' }]
    }));
  };

  const updateIndicator = (index, field, value) => {
    setCurrentObjective(prev => ({
      ...prev,
      indicators: prev.indicators.map((ind, i) => i === index ? { ...ind, [field]: value } : ind)
    }));
  };

  const removeIndicator = (index) => {
    setCurrentObjective(prev => ({
      ...prev,
      indicators: prev.indicators.filter((_, i) => i !== index)
    }));
  };

  const calculateProgress = (indicators) => {
    if (!indicators || indicators.length === 0) return 0;
    const validIndicators = indicators.filter(i => i.target && i.current && i.baseline !== undefined);
    if (validIndicators.length === 0) return 0;
    
    const totalProgress = validIndicators.reduce((sum, ind) => {
      const baseline = parseFloat(ind.baseline) || 0;
      const target = parseFloat(ind.target) || 0;
      const current = parseFloat(ind.current) || 0;
      const range = target - baseline;
      if (range === 0) return sum + (current >= target ? 100 : 0);
      return sum + Math.min(100, Math.max(0, ((current - baseline) / range) * 100));
    }, 0);
    
    return Math.round(totalProgress / validIndicators.length);
  };

  const handleSave = async () => {
    if (!currentObjective.title) {
      toast.error('El título es requerido');
      return;
    }
    
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const progress = calculateProgress(currentObjective.indicators);
      const newObjective = { ...currentObjective, id: editingId || Date.now().toString(), progress };
      
      let updatedObjectives;
      if (editingId) {
        updatedObjectives = objectives.map(o => o.id === editingId ? newObjective : o);
      } else {
        updatedObjectives = [...objectives, newObjective];
      }
      
      await axios.post(
        `${BACKEND_URL}/api/objectives`,
        { athlete_id: athleteId, objectives: updatedObjectives },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setObjectives(updatedObjectives);
      resetForm();
      toast.success(editingId ? 'Objetivo actualizado' : 'Objetivo creado');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este objetivo?')) return;
    
    try {
      const token = localStorage.getItem('train_token');
      const updated = objectives.filter(o => o.id !== id);
      await axios.post(
        `${BACKEND_URL}/api/objectives`,
        { athlete_id: athleteId, objectives: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setObjectives(updated);
      toast.success('Objetivo eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const editObjective = (obj) => {
    setCurrentObjective(obj);
    setEditingId(obj.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setCurrentObjective({
      title: '', description: '', category: 'performance', timeframe: 'short',
      startDate: '', targetDate: '',
      indicators: [{ name: '', type: 'quantitative', baseline: '', target: '', current: '', unit: '' }],
      progress: 0, status: 'active', notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#B8912A]" /></div>;
  }

  const activeObjectives = objectives.filter(o => o.status === 'active');
  const completedObjectives = objectives.filter(o => o.status === 'completed');

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Objetivos e Indicadores</h1>
            <p className="text-emerald-100 text-sm">Definición y seguimiento de metas deportivas</p>
          </div>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-[#D4AF37] border-[#B8912A]">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-[#B8912A]">{objectives.length}</p>
            <p className="text-xs text-[#B8912A]/70">Total Objetivos</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeObjectives.length}</p>
            <p className="text-xs text-green-600/70">Activos</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{completedObjectives.length}</p>
            <p className="text-xs text-purple-600/70">Completados</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {activeObjectives.length > 0 ? Math.round(activeObjectives.reduce((s, o) => s + (o.progress || 0), 0) / activeObjectives.length) : 0}%
            </p>
            <p className="text-xs text-orange-600/70">Progreso Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Objetivos */}
      <div className="space-y-4">
        {objectives.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No hay objetivos definidos. Crea tu primer objetivo.
          </Card>
        ) : (
          objectives.map(obj => {
            const category = objectiveCategories.find(c => c.id === obj.category);
            return (
              <Card key={obj.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${category?.color || 'bg-gray-400'}`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-800">{obj.title}</h3>
                        <p className="text-sm text-gray-500">{category?.label} • {timeframes.find(t => t.value === obj.timeframe)?.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${obj.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-[#D4AF37] text-[#B8912A]'}`}>
                        {obj.status === 'completed' ? 'Completado' : 'Activo'}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => editObjective(obj)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(obj.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  
                  {obj.description && <p className="text-sm text-gray-600 mb-3">{obj.description}</p>}
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progreso</span>
                      <span className="font-medium">{obj.progress || 0}%</span>
                    </div>
                    <Progress value={obj.progress || 0} className="h-2" />
                  </div>
                  
                  {obj.indicators && obj.indicators.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {obj.indicators.filter(i => i.name).map((ind, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {ind.name}: {ind.current || '0'}/{ind.target} {ind.unit}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Botón Agregar */}
      <Button onClick={() => setShowForm(true)} className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg bg-emerald-600 hover:bg-emerald-700">
        <Plus className="h-6 w-6" />
      </Button>

      {/* Modal Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Objetivo' : 'Nuevo Objetivo'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Título *</label>
                <Input
                  value={currentObjective.title}
                  onChange={(e) => setCurrentObjective(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ej: Mejorar velocidad en 30m"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Categoría</label>
                  <Select value={currentObjective.category} onValueChange={(v) => setCurrentObjective(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {objectiveCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Plazo</label>
                  <Select value={currentObjective.timeframe} onValueChange={(v) => setCurrentObjective(p => ({ ...p, timeframe: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {timeframes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={currentObjective.description}
                  onChange={(e) => setCurrentObjective(p => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción detallada del objetivo"
                />
              </div>
              
              {/* Indicadores */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Indicadores de Seguimiento</label>
                  <Button size="sm" variant="outline" onClick={addIndicator}>
                    <Plus className="h-4 w-4 mr-1" /> Indicador
                  </Button>
                </div>
                <div className="space-y-3">
                  {currentObjective.indicators.map((ind, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <Input
                          placeholder="Nombre del indicador"
                          value={ind.name}
                          onChange={(e) => updateIndicator(idx, 'name', e.target.value)}
                          className="flex-1 mr-2"
                        />
                        <Button size="sm" variant="ghost" onClick={() => removeIndicator(idx)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input placeholder="Línea base" value={ind.baseline} onChange={(e) => updateIndicator(idx, 'baseline', e.target.value)} />
                        <Input placeholder="Meta" value={ind.target} onChange={(e) => updateIndicator(idx, 'target', e.target.value)} />
                        <Input placeholder="Actual" value={ind.current} onChange={(e) => updateIndicator(idx, 'current', e.target.value)} />
                        <Input placeholder="Unidad" value={ind.unit} onChange={(e) => updateIndicator(idx, 'unit', e.target.value)} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ObjectivesIndicators;
