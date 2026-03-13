import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { 
  Trophy, Calendar, Target, Activity, Star, Save, 
  ChevronDown, ChevronUp, Loader2, Trash2, MapPin
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CompetitionAnalysis = ({ athleteId, onSave, activePlan }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [competitions, setCompetitions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const [currentCompetition, setCurrentCompetition] = useState({
    name: '',
    type: '',
    category: '',
    date: '',
    result: '',
    objective: '',
    competitionFormat: '',
    location: '',
    duration: '',
    opponents: '',
    observations: '',
    preparationPhase: '',
    keyPerformanceIndicators: '',
    recoveryStrategy: '',
    status: 'pending'
  });

  useEffect(() => {
    // Cargar competencias del plan activo si existe, si no del atleta
    if (activePlan) {
      loadPlanCompetitions();
    } else if (athleteId) {
      loadCompetitions();
    }
  }, [athleteId, activePlan]);

  const loadPlanCompetitions = async () => {
    if (!activePlan) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/plan-data/competitions/${activePlan.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompetitions(response.data || []);
    } catch (error) {
      console.log('No plan competitions found');
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/competitions/analysis/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompetitions(response.data || []);
    } catch (error) {
      console.log('No competitions found');
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!currentCompetition.name) errors.name = 'El nombre es requerido';
    if (!currentCompetition.date) errors.date = 'La fecha es requerida';
    if (!currentCompetition.type) errors.type = 'El tipo es requerido';
    if (!currentCompetition.category) errors.category = 'La categoría es requerida';
    return errors;
  };

  const handleCompetitionChange = (field, value) => {
    setCurrentCompetition(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addCompetition = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      
      // Si hay plan activo, guardar vinculado al plan
      if (activePlan) {
        await axios.post(
          `${BACKEND_URL}/api/plan-data/competitions`,
          { 
            ...currentCompetition, 
            plan_id: activePlan.id,
            athlete_id: athleteId 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Competencia agregada al plan');
        loadPlanCompetitions();
      } else {
        await axios.post(
          `${BACKEND_URL}/api/competitions/analysis`,
          { ...currentCompetition, athlete_id: athleteId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Competencia agregada correctamente');
        loadCompetitions();
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error('Error al agregar competencia');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompetition = async (compId) => {
    if (!window.confirm('¿Eliminar esta competencia?')) return;
    
    try {
      const token = localStorage.getItem('train_token');
      await axios.delete(
        `${BACKEND_URL}/api/competitions/analysis/${compId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Competencia eliminada');
      loadCompetitions();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setCurrentCompetition({
      name: '', type: '', category: '', date: '', result: '',
      objective: '', competitionFormat: '', location: '', duration: '',
      opponents: '', observations: '', preparationPhase: '',
      keyPerformanceIndicators: '', recoveryStrategy: '', status: 'pending'
    });
    setFormErrors({});
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'principal': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'secundaria': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'imprevista': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'upcoming': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
        <h1 className="text-2xl font-bold mb-2">Análisis y Calendario de Competencias</h1>
        <p className="opacity-90 text-sm">
          Sistema integral de planificación y seguimiento competitivo
        </p>
      </div>

      {/* Toggle Form Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="toggle-competition-form"
        >
          {showForm ? (
            <><ChevronUp className="h-4 w-4 mr-2" /> Ocultar Formulario</>
          ) : (
            <><ChevronDown className="h-4 w-4 mr-2" /> Nueva Competencia</>
          )}
        </Button>
      </div>

      {/* Competition Form */}
      {showForm && (
        <Card className="shadow-md border-blue-100">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-lg text-blue-700">
              <div className="p-2 rounded-lg bg-blue-50">
                <Trophy className="h-5 w-5" />
              </div>
              Registro de Nueva Competencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información Básica */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-700">
                <Trophy className="h-4 w-4 text-blue-600" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nombre de la Competencia <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={currentCompetition.name}
                    onChange={(e) => handleCompetitionChange('name', e.target.value)}
                    placeholder="Nombre del evento competitivo..."
                    className={formErrors.name ? 'border-red-500' : 'border-gray-200'}
                    data-testid="comp-name"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={currentCompetition.date}
                    onChange={(e) => handleCompetitionChange('date', e.target.value)}
                    className={formErrors.date ? 'border-red-500' : 'border-gray-200'}
                    data-testid="comp-date"
                  />
                  {formErrors.date && <p className="text-red-500 text-xs">{formErrors.date}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de Competencia <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={currentCompetition.type}
                    onValueChange={(v) => handleCompetitionChange('type', v)}
                  >
                    <SelectTrigger className={formErrors.type ? 'border-red-500' : 'border-gray-200'} data-testid="comp-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="equipo">Equipo</SelectItem>
                      <SelectItem value="mixta">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.type && <p className="text-red-500 text-xs">{formErrors.type}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={currentCompetition.category}
                    onValueChange={(v) => handleCompetitionChange('category', v)}
                  >
                    <SelectTrigger className={formErrors.category ? 'border-red-500' : 'border-gray-200'} data-testid="comp-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal">Principal (A)</SelectItem>
                      <SelectItem value="secundaria">Secundaria (B)</SelectItem>
                      <SelectItem value="imprevista">Imprevista (C)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-red-500 text-xs">{formErrors.category}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Ubicación</label>
                  <Input
                    value={currentCompetition.location}
                    onChange={(e) => handleCompetitionChange('location', e.target.value)}
                    placeholder="Ciudad, país o sede..."
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fase de Preparación</label>
                  <Select
                    value={currentCompetition.preparationPhase}
                    onValueChange={(v) => handleCompetitionChange('preparationPhase', v)}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Seleccionar fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="especifica">Específica</SelectItem>
                      <SelectItem value="precompetitiva">Precompetitiva</SelectItem>
                      <SelectItem value="competitiva">Competitiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Objetivos y Preparación */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-700">
                <Target className="h-4 w-4 text-blue-600" />
                Objetivos y Preparación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Marca/Resultado Esperado</label>
                  <Textarea
                    value={currentCompetition.result}
                    onChange={(e) => handleCompetitionChange('result', e.target.value)}
                    placeholder="Establece metas cuantificables y medibles..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Objetivo Específico</label>
                  <Textarea
                    value={currentCompetition.objective}
                    onChange={(e) => handleCompetitionChange('objective', e.target.value)}
                    placeholder="Define objetivos técnicos, tácticos y físicos..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Indicadores y Recuperación */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-700">
                <Activity className="h-4 w-4 text-blue-600" />
                Indicadores y Recuperación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">KPIs (Indicadores Clave)</label>
                  <Textarea
                    value={currentCompetition.keyPerformanceIndicators}
                    onChange={(e) => handleCompetitionChange('keyPerformanceIndicators', e.target.value)}
                    placeholder="Define los indicadores que medirán el éxito..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Estrategia de Recuperación</label>
                  <Textarea
                    value={currentCompetition.recoveryStrategy}
                    onChange={(e) => handleCompetitionChange('recoveryStrategy', e.target.value)}
                    placeholder="Plan de recuperación post-competencia..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-gray-700">Observaciones</label>
                  <Textarea
                    value={currentCompetition.observations}
                    onChange={(e) => handleCompetitionChange('observations', e.target.value)}
                    placeholder="Notas adicionales, rivales, condiciones especiales..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={addCompetition}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="save-competition-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar Competencia
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Competition List */}
      <Card className="shadow-md border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
              <Calendar className="h-5 w-5" />
            </div>
            Calendario de Competencias ({competitions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {competitions.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay competencias registradas</p>
                <p className="text-sm text-gray-400">Utiliza el botón "Nueva Competencia" para comenzar</p>
              </div>
            ) : (
              competitions.sort((a, b) => new Date(a.date) - new Date(b.date)).map((comp) => (
                <Card key={comp.id} className="border border-gray-200 hover:border-blue-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-800 text-lg">{comp.name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {comp.date}
                          </span>
                          {comp.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {comp.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(comp.category)}`}>
                          {comp.category === 'principal' ? 'Principal' : 
                           comp.category === 'secundaria' ? 'Secundaria' : 'Imprevista'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCompetition(comp.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-blue-600" />
                        <span className="capitalize">{comp.type}</span>
                      </div>
                      {comp.preparationPhase && (
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-600" />
                          <span className="capitalize">Fase {comp.preparationPhase}</span>
                        </div>
                      )}
                      {comp.objective && (
                        <div className="md:col-span-2 mt-2">
                          <span className="font-medium text-gray-600">Objetivo:</span>
                          <p className="text-gray-700 mt-1">{comp.objective}</p>
                        </div>
                      )}
                      {comp.result && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">Meta:</span>
                          <p className="text-gray-700 mt-1">{comp.result}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompetitionAnalysis;
