import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  ClipboardCheck,
  Timer,
  Zap,
  Heart,
  Activity,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const testCategories = {
  physical: {
    title: "Tests Físicos",
    icon: Zap,
    color: "border-l-blue-500",
    tests: [
      { id: 'cooper', name: 'Test de Cooper', unit: 'metros', description: 'Distancia recorrida en 12 minutos' },
      { id: 'vo2max', name: 'VO2 Máx', unit: 'ml/kg/min', description: 'Consumo máximo de oxígeno' },
      { id: 'sprint30', name: 'Sprint 30m', unit: 'segundos', description: 'Tiempo en 30 metros' },
      { id: 'sprint60', name: 'Sprint 60m', unit: 'segundos', description: 'Tiempo en 60 metros' },
      { id: 'agility', name: 'Test de Agilidad', unit: 'segundos', description: 'Test T o Illinois' },
      { id: 'verticalJump', name: 'Salto Vertical', unit: 'cm', description: 'Altura alcanzada' },
      { id: 'horizontalJump', name: 'Salto Horizontal', unit: 'cm', description: 'Distancia alcanzada' },
      { id: 'flexibility', name: 'Flexibilidad (Sit & Reach)', unit: 'cm', description: 'Alcance sentado' },
    ]
  },
  strength: {
    title: "Tests de Fuerza",
    icon: Activity,
    color: "border-l-green-500",
    tests: [
      { id: 'benchPress1rm', name: 'Press Banca 1RM', unit: 'kg', description: 'Repetición máxima' },
      { id: 'squat1rm', name: 'Sentadilla 1RM', unit: 'kg', description: 'Repetición máxima' },
      { id: 'deadlift1rm', name: 'Peso Muerto 1RM', unit: 'kg', description: 'Repetición máxima' },
      { id: 'pullups', name: 'Dominadas', unit: 'repeticiones', description: 'Máximo de repeticiones' },
      { id: 'pushups', name: 'Flexiones', unit: 'repeticiones', description: 'Máximo en 1 minuto' },
      { id: 'plank', name: 'Plancha', unit: 'segundos', description: 'Tiempo máximo' },
      { id: 'gripStrength', name: 'Fuerza de Agarre', unit: 'kg', description: 'Dinamometría' },
    ]
  },
  cardio: {
    title: "Tests Cardiovasculares",
    icon: Heart,
    color: "border-l-red-500",
    tests: [
      { id: 'restingHR', name: 'FC en Reposo', unit: 'bpm', description: 'Frecuencia cardíaca basal' },
      { id: 'maxHR', name: 'FC Máxima', unit: 'bpm', description: 'Frecuencia cardíaca máxima' },
      { id: 'recoveryHR', name: 'FC Recuperación', unit: 'bpm', description: 'FC tras 1 min de reposo' },
      { id: 'lactateThreshold', name: 'Umbral de Lactato', unit: 'bpm', description: 'FC en umbral anaeróbico' },
      { id: 'yoyo', name: 'Yo-Yo Test', unit: 'nivel', description: 'Nivel alcanzado' },
      { id: 'beepTest', name: 'Test de Leger', unit: 'nivel', description: 'Nivel/vuelta alcanzada' },
    ]
  },
  sport: {
    title: "Tests Específicos",
    icon: Timer,
    color: "border-l-purple-500",
    tests: [
      { id: 'specific1', name: 'Test Específico 1', unit: '', description: 'Personalizable' },
      { id: 'specific2', name: 'Test Específico 2', unit: '', description: 'Personalizable' },
      { id: 'specific3', name: 'Test Específico 3', unit: '', description: 'Personalizable' },
      { id: 'technical', name: 'Evaluación Técnica', unit: 'puntos', description: '1-10' },
      { id: 'tactical', name: 'Evaluación Táctica', unit: 'puntos', description: '1-10' },
    ]
  }
};

const TestEvaluations = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('physical');
  const [evaluations, setEvaluations] = useState([]);
  const [currentEvaluation, setCurrentEvaluation] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'physical',
    results: {},
    notes: ''
  });

  useEffect(() => {
    if (athleteId) loadEvaluations();
  }, [athleteId]);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/test-evaluations/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.evaluations) {
        setEvaluations(response.data.evaluations);
      }
    } catch (error) {
      console.log('No evaluations found');
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (testId, value) => {
    setCurrentEvaluation(prev => ({
      ...prev,
      results: { ...prev.results, [testId]: value }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const newEval = { 
        ...currentEvaluation, 
        id: Date.now().toString(),
        category: selectedCategory 
      };
      const updated = [...evaluations, newEval];
      
      await axios.post(
        `${BACKEND_URL}/api/test-evaluations`,
        { athlete_id: athleteId, evaluations: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setEvaluations(updated);
      setCurrentEvaluation({
        date: new Date().toISOString().split('T')[0],
        category: selectedCategory,
        results: {},
        notes: ''
      });
      toast.success('Evaluación guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (evalId) => {
    if (!window.confirm('¿Eliminar esta evaluación?')) return;
    const updated = evaluations.filter(e => e.id !== evalId);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/test-evaluations`,
        { athlete_id: athleteId, evaluations: updated },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEvaluations(updated);
      toast.success('Evaluación eliminada');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  const currentCategory = testCategories[selectedCategory];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Test y Evaluaciones Deportivas</h1>
            <p className="text-purple-100 text-sm">Registro de pruebas físicas y evaluaciones de rendimiento</p>
          </div>
        </div>
      </div>

      {/* Nueva Evaluación */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-purple-600" />
            Nueva Evaluación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Input
              type="date"
              value={currentEvaluation.date}
              onChange={(e) => setCurrentEvaluation(prev => ({ ...prev, date: e.target.value }))}
              className="w-48"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid grid-cols-4 mb-4">
              {Object.entries(testCategories).map(([key, cat]) => {
                const Icon = cat.icon;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs sm:text-sm">
                    <Icon className="h-4 w-4 mr-1 hidden sm:block" />
                    {cat.title.split(' ')[1] || cat.title}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(testCategories).map(([key, category]) => (
              <TabsContent key={key} value={key}>
                <div className={`border-l-4 ${category.color} pl-4`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {category.tests.map(test => (
                      <div key={test.id} className="bg-gray-50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-gray-700">{test.name}</label>
                        <p className="text-xs text-gray-500 mb-2">{test.description}</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0"
                            value={currentEvaluation.results[test.id] || ''}
                            onChange={(e) => handleResultChange(test.id, e.target.value)}
                            className="h-9"
                          />
                          <span className="text-xs text-gray-500 w-20">{test.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-4">
            <label className="text-sm font-medium text-gray-700">Observaciones</label>
            <Textarea
              placeholder="Notas adicionales sobre la evaluación..."
              value={currentEvaluation.notes}
              onChange={(e) => setCurrentEvaluation(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Evaluación
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      {evaluations.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Historial de Evaluaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluations.slice().reverse().map(evaluation => {
                const cat = testCategories[evaluation.category];
                return (
                  <div key={evaluation.id} className={`p-4 bg-gray-50 rounded-lg border-l-4 ${cat?.color || 'border-l-gray-300'}`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">{cat?.title || 'Evaluación'}</span>
                          <span className="text-sm text-gray-500">{evaluation.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(evaluation.results || {}).filter(([_, v]) => v).slice(0, 5).map(([testId, value]) => {
                            const test = cat?.tests.find(t => t.id === testId);
                            return (
                              <span key={testId} className="text-xs bg-white px-2 py-1 rounded border">
                                {test?.name || testId}: {value} {test?.unit}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(evaluation.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestEvaluations;
