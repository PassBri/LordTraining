import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  ClipboardList,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Save,
  Loader2,
  Plus,
  Trash2,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const controlTypes = [
  { id: 'daily', label: 'Control Diario', description: 'Registro de sensaciones y estado' },
  { id: 'session', label: 'Control de Sesión', description: 'Evaluación post-entrenamiento' },
  { id: 'weekly', label: 'Control Semanal', description: 'Resumen y análisis semanal' },
  { id: 'mesocycle', label: 'Control de Mesociclo', description: 'Evaluación de bloque' },
];

const wellnessMetrics = [
  { id: 'sleep', label: 'Calidad del Sueño', max: 10 },
  { id: 'fatigue', label: 'Nivel de Fatiga', max: 10, inverse: true },
  { id: 'stress', label: 'Estrés', max: 10, inverse: true },
  { id: 'mood', label: 'Estado de Ánimo', max: 10 },
  { id: 'soreness', label: 'Dolor Muscular', max: 10, inverse: true },
  { id: 'motivation', label: 'Motivación', max: 10 },
  { id: 'energy', label: 'Energía', max: 10 },
];

const sessionMetrics = [
  { id: 'technicalExecution', label: 'Ejecución Técnica', max: 10 },
  { id: 'tacticalDecisions', label: 'Decisiones Tácticas', max: 10 },
  { id: 'physicalPerformance', label: 'Rendimiento Físico', max: 10 },
  { id: 'mentalFocus', label: 'Concentración', max: 10 },
  { id: 'effort', label: 'Esfuerzo Percibido', max: 10 },
];

const TrainingControl = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('daily');
  const [showForm, setShowForm] = useState(false);
  
  const [currentRecord, setCurrentRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'daily',
    wellness: {},
    session: {},
    notes: '',
    adjustments: '',
    hrResting: '',
    hrv: '',
    weight: ''
  });

  useEffect(() => {
    loadRecords();
  }, [athleteId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/training-control/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(response.data?.records || []);
    } catch (error) {
      console.log('No control records found');
    } finally {
      setLoading(false);
    }
  };

  const handleWellnessChange = (metric, value) => {
    setCurrentRecord(prev => ({
      ...prev,
      wellness: { ...prev.wellness, [metric]: value }
    }));
  };

  const handleSessionChange = (metric, value) => {
    setCurrentRecord(prev => ({
      ...prev,
      session: { ...prev.session, [metric]: value }
    }));
  };

  const calculateWellnessScore = (wellness) => {
    if (!wellness) return 0;
    const values = wellnessMetrics.map(m => {
      const val = parseFloat(wellness[m.id]) || 0;
      return m.inverse ? (10 - val) : val;
    }).filter(v => v > 0);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) : 0;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const wellnessScore = calculateWellnessScore(currentRecord.wellness);
      const newRecord = { ...currentRecord, id: Date.now().toString(), wellnessScore };
      const updated = [...records, newRecord];
      
      await axios.post(
        `${BACKEND_URL}/api/training-control`,
        { athlete_id: athleteId, records: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRecords(updated);
      resetForm();
      toast.success('Control guardado');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const updated = records.filter(r => r.id !== id);
      await axios.post(
        `${BACKEND_URL}/api/training-control`,
        { athlete_id: athleteId, records: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(updated);
      toast.success('Registro eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setCurrentRecord({
      date: new Date().toISOString().split('T')[0],
      type: activeTab,
      wellness: {},
      session: {},
      notes: '',
      adjustments: '',
      hrResting: '',
      hrv: '',
      weight: ''
    });
    setShowForm(false);
  };

  // Preparar datos para gráficos
  const last14Days = records.filter(r => r.type === 'daily').slice(-14);
  const wellnessChartData = last14Days.map(r => ({
    date: r.date?.slice(5) || '',
    score: r.wellnessScore || 0,
    fatigue: 10 - (parseFloat(r.wellness?.fatigue) || 5),
    sleep: parseFloat(r.wellness?.sleep) || 5
  }));

  const radarData = wellnessMetrics.map(m => {
    const lastRecord = records.filter(r => r.wellness?.[m.id]).slice(-1)[0];
    return {
      metric: m.label.split(' ')[0],
      value: lastRecord?.wellness?.[m.id] || 0,
      fullMark: 10
    };
  });

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const avgWellness = records.length > 0 
    ? Math.round(records.slice(-7).reduce((s, r) => s + (r.wellnessScore || 0), 0) / Math.min(records.length, 7)) 
    : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <ClipboardList className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Control de Entrenamiento</h1>
            <p className="text-cyan-100 text-sm">Monitoreo del bienestar y rendimiento del deportista</p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{avgWellness}%</p>
            <p className="text-xs text-green-600/70">Bienestar Promedio</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{records.length}</p>
            <p className="text-xs text-blue-600/70">Registros Totales</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {records.slice(-1)[0]?.hrResting || '-'}
            </p>
            <p className="text-xs text-purple-600/70">FC Reposo (bpm)</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {records.slice(-1)[0]?.hrv || '-'}
            </p>
            <p className="text-xs text-orange-600/70">HRV (ms)</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      {wellnessChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Evolución del Bienestar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wellnessChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" name="Bienestar %" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Perfil de Bienestar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
                    <Radar dataKey="value" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Control */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          {controlTypes.map(type => (
            <TabsTrigger key={type.id} value={type.id} className="text-xs sm:text-sm">
              {type.label.split(' ')[1]}
            </TabsTrigger>
          ))}
        </TabsList>

        {controlTypes.map(type => (
          <TabsContent key={type.id} value={type.id}>
            <Card className="shadow-md">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">{type.label}</CardTitle>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                  <Button onClick={() => { setCurrentRecord(p => ({ ...p, type: type.id })); setShowForm(true); }} className="bg-cyan-600 hover:bg-cyan-700">
                    <Plus className="h-4 w-4 mr-2" /> Nuevo Registro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {records.filter(r => r.type === type.id).slice().reverse().slice(0, 10).map(record => (
                    <div key={record.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">{record.date}</span>
                          {record.wellnessScore && (
                            <span className={`text-sm px-2 py-0.5 rounded ${
                              record.wellnessScore >= 70 ? 'bg-green-100 text-green-700' :
                              record.wellnessScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {record.wellnessScore}% Bienestar
                            </span>
                          )}
                        </div>
                        {record.notes && <p className="text-sm text-gray-600 mt-1">{record.notes}</p>}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {record.hrResting && <span className="text-xs bg-blue-100 px-2 py-1 rounded">FC: {record.hrResting} bpm</span>}
                          {record.hrv && <span className="text-xs bg-purple-100 px-2 py-1 rounded">HRV: {record.hrv} ms</span>}
                          {record.weight && <span className="text-xs bg-gray-100 px-2 py-1 rounded">Peso: {record.weight} kg</span>}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                  {records.filter(r => r.type === type.id).length === 0 && (
                    <p className="text-center text-gray-500 py-8">No hay registros de {type.label.toLowerCase()}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Modal Formulario */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Nuevo Registro de Control</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha</label>
                  <Input type="date" value={currentRecord.date} onChange={(e) => setCurrentRecord(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Control</label>
                  <Select value={currentRecord.type} onValueChange={(v) => setCurrentRecord(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {controlTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Métricas de Bienestar */}
              <div>
                <h3 className="font-semibold mb-3">Métricas de Bienestar (1-10)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {wellnessMetrics.map(m => (
                    <div key={m.id}>
                      <label className="text-xs text-gray-600">{m.label}</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={currentRecord.wellness[m.id] || ''}
                        onChange={(e) => handleWellnessChange(m.id, e.target.value)}
                        placeholder="1-10"
                        className="h-9"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Datos Fisiológicos */}
              <div>
                <h3 className="font-semibold mb-3">Datos Fisiológicos</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">FC Reposo (bpm)</label>
                    <Input value={currentRecord.hrResting} onChange={(e) => setCurrentRecord(p => ({ ...p, hrResting: e.target.value }))} placeholder="60" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">HRV (ms)</label>
                    <Input value={currentRecord.hrv} onChange={(e) => setCurrentRecord(p => ({ ...p, hrv: e.target.value }))} placeholder="50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Peso (kg)</label>
                    <Input value={currentRecord.weight} onChange={(e) => setCurrentRecord(p => ({ ...p, weight: e.target.value }))} placeholder="75" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Observaciones</label>
                <Textarea
                  value={currentRecord.notes}
                  onChange={(e) => setCurrentRecord(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Notas sobre el estado general, sensaciones, etc."
                />
              </div>

              <div>
                <label className="text-sm font-medium">Ajustes Recomendados</label>
                <Textarea
                  value={currentRecord.adjustments}
                  onChange={(e) => setCurrentRecord(p => ({ ...p, adjustments: e.target.value }))}
                  placeholder="Modificaciones sugeridas al plan de entrenamiento"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={resetForm}>Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="bg-cyan-600 hover:bg-cyan-700">
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

export default TrainingControl;
