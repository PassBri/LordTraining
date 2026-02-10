import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Zap,
  Clock,
  Target
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Legend, BarChart, Bar
} from 'recharts';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const intensityLevels = [
  { value: '1', label: '1 - Muy Baja (<50%)', color: '#22c55e' },
  { value: '2', label: '2 - Baja (50-60%)', color: '#84cc16' },
  { value: '3', label: '3 - Moderada (60-70%)', color: '#eab308' },
  { value: '4', label: '4 - Media-Alta (70-80%)', color: '#f97316' },
  { value: '5', label: '5 - Alta (80-90%)', color: '#ef4444' },
  { value: '6', label: '6 - Muy Alta (90-95%)', color: '#dc2626' },
  { value: '7', label: '7 - Máxima (>95%)', color: '#991b1b' },
];

const loadComponents = [
  { id: 'volume', label: 'Volumen (min)', icon: Clock, description: 'Duración total de trabajo' },
  { id: 'intensity', label: 'Intensidad (1-7)', icon: Zap, description: 'Nivel de esfuerzo' },
  { id: 'density', label: 'Densidad (%)', icon: Activity, description: 'Relación trabajo/descanso' },
  { id: 'complexity', label: 'Complejidad (1-10)', icon: Target, description: 'Dificultad técnico-táctica' },
];

const TrainingLoad = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    session: '',
    volume: '',
    intensity: '',
    density: '',
    complexity: '',
    rpe: '',
    notes: ''
  });

  useEffect(() => {
    if (athleteId) loadRecords();
  }, [athleteId]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/training-load/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.records) {
        setRecords(response.data.records);
      }
    } catch (error) {
      console.log('No training load data found');
    } finally {
      setLoading(false);
    }
  };

  const calculateLoad = () => {
    const volume = parseFloat(currentRecord.volume) || 0;
    const intensity = parseFloat(currentRecord.intensity) || 0;
    const rpe = parseFloat(currentRecord.rpe) || intensity;
    return Math.round(volume * rpe);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const load = calculateLoad();
      const newRecord = { ...currentRecord, id: Date.now().toString(), load };
      const updated = [...records, newRecord];
      
      await axios.post(
        `${BACKEND_URL}/api/training-load`,
        { athlete_id: athleteId, records: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setRecords(updated);
      setCurrentRecord({
        date: new Date().toISOString().split('T')[0],
        session: '',
        volume: '',
        intensity: '',
        density: '',
        complexity: '',
        rpe: '',
        notes: ''
      });
      toast.success('Carga registrada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    const updated = records.filter(r => r.id !== recordId);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/training-load`,
        { athlete_id: athleteId, records: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(updated);
      toast.success('Registro eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  // Preparar datos para gráficos
  const chartData = records.slice(-14).map(r => ({
    date: r.date?.slice(5) || '',
    volume: parseFloat(r.volume) || 0,
    intensity: parseFloat(r.intensity) || 0,
    load: r.load || 0,
    rpe: parseFloat(r.rpe) || 0
  }));

  // Calcular estadísticas
  const weeklyLoad = records.slice(-7).reduce((sum, r) => sum + (r.load || 0), 0);
  const prevWeekLoad = records.slice(-14, -7).reduce((sum, r) => sum + (r.load || 0), 0);
  const acwr = prevWeekLoad > 0 ? (weeklyLoad / (prevWeekLoad / 7 * 28 / 4)).toFixed(2) : 'N/A';

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Carga de Entrenamiento</h1>
            <p className="text-orange-100 text-sm">Monitoreo y análisis de la carga de trabajo</p>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{weeklyLoad}</p>
            <p className="text-xs text-blue-600/70">Carga Semanal (UA)</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{records.length}</p>
            <p className="text-xs text-green-600/70">Sesiones Totales</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{acwr}</p>
            <p className="text-xs text-purple-600/70">ACWR</p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {records.length > 0 ? Math.round(records.reduce((s, r) => s + (r.load || 0), 0) / records.length) : 0}
            </p>
            <p className="text-xs text-orange-600/70">Carga Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Matveyev */}
      {chartData.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Evolución de la Carga (Modelo Matveyev)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="volume" name="Volumen" stroke="#3b82f6" fill="url(#volumeGrad)" />
                  <Area type="monotone" dataKey="intensity" name="Intensidad" stroke="#ef4444" fill="url(#intensityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Carga Total */}
      {chartData.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Carga Total por Sesión (UA)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="load" name="Carga (UA)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nuevo Registro */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-orange-600" />
            Registrar Carga de Sesión
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha</label>
              <Input
                type="date"
                value={currentRecord.date}
                onChange={(e) => setCurrentRecord(prev => ({ ...prev, date: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Sesión</label>
              <Input
                placeholder="Ej: Fuerza, Técnica..."
                value={currentRecord.session}
                onChange={(e) => setCurrentRecord(prev => ({ ...prev, session: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Volumen (min)</label>
              <Input
                type="number"
                placeholder="90"
                value={currentRecord.volume}
                onChange={(e) => setCurrentRecord(prev => ({ ...prev, volume: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Intensidad (1-7)</label>
              <Select 
                value={currentRecord.intensity} 
                onValueChange={(v) => setCurrentRecord(prev => ({ ...prev, intensity: v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {intensityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Densidad (%)</label>
              <Input
                type="number"
                placeholder="70"
                value={currentRecord.density}
                onChange={(e) => setCurrentRecord(prev => ({ ...prev, density: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Complejidad (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="5"
                value={currentRecord.complexity}
                onChange={(e) => setCurrentRecord(prev => ({ ...prev, complexity: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">RPE (1-10)</label>
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="7"
                value={currentRecord.rpe}
                onChange={(e) => setCurrentRecord(prev => ({ ...prev, rpe: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <div className="bg-purple-100 p-3 rounded-lg w-full text-center">
                <p className="text-xs text-purple-600">Carga Calculada</p>
                <p className="text-xl font-bold text-purple-700">{calculateLoad()} UA</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Observaciones</label>
            <Textarea
              placeholder="Notas sobre la sesión..."
              value={currentRecord.notes}
              onChange={(e) => setCurrentRecord(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Carga
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      {records.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Historial de Cargas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Sesión</th>
                    <th className="text-left p-2">Vol.</th>
                    <th className="text-left p-2">Int.</th>
                    <th className="text-left p-2">RPE</th>
                    <th className="text-left p-2">Carga</th>
                    <th className="text-left p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice().reverse().slice(0, 10).map(record => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{record.date}</td>
                      <td className="p-2">{record.session || '-'}</td>
                      <td className="p-2">{record.volume || '-'} min</td>
                      <td className="p-2">{record.intensity || '-'}</td>
                      <td className="p-2">{record.rpe || '-'}</td>
                      <td className="p-2 font-semibold text-purple-600">{record.load || '-'} UA</td>
                      <td className="p-2">
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(record.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TrainingLoad;
