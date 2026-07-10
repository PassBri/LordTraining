import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import {
  Ruler,
  Scale,
  Activity,
  Save,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const measurementFields = [
  { id: 'weight', label: 'Peso (kg)', icon: Scale, unit: 'kg' },
  { id: 'height', label: 'Talla (cm)', icon: Ruler, unit: 'cm' },
  { id: 'bodyFat', label: 'Grasa Corporal (%)', icon: Activity, unit: '%' },
  { id: 'muscleMass', label: 'Masa Muscular (kg)', icon: Activity, unit: 'kg' },
  { id: 'bmi', label: 'IMC', icon: Activity, unit: '' },
  { id: 'armCircumference', label: 'Circunferencia Brazo (cm)', icon: Ruler, unit: 'cm' },
  { id: 'chestCircumference', label: 'Circunferencia Pecho (cm)', icon: Ruler, unit: 'cm' },
  { id: 'waistCircumference', label: 'Circunferencia Cintura (cm)', icon: Ruler, unit: 'cm' },
  { id: 'hipCircumference', label: 'Circunferencia Cadera (cm)', icon: Ruler, unit: 'cm' },
  { id: 'thighCircumference', label: 'Circunferencia Muslo (cm)', icon: Ruler, unit: 'cm' },
  { id: 'calfCircumference', label: 'Circunferencia Pantorrilla (cm)', icon: Ruler, unit: 'cm' },
];

const skinfoldFields = [
  { id: 'triceps', label: 'Tríceps (mm)' },
  { id: 'subscapular', label: 'Subescapular (mm)' },
  { id: 'biceps', label: 'Bíceps (mm)' },
  { id: 'suprailiac', label: 'Suprailiaco (mm)' },
  { id: 'abdominal', label: 'Abdominal (mm)' },
  { id: 'thigh', label: 'Muslo (mm)' },
  { id: 'calf', label: 'Pantorrilla (mm)' },
];

const AnthropometricData = ({ athleteId, activePlan }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    measurements: {},
    skinfolds: {},
    notes: ''
  });

  useEffect(() => {
    if (activePlan) {
      loadPlanRecords();
    } else if (athleteId) {
      loadRecords();
    }
  }, [athleteId, activePlan]);

  const loadPlanRecords = async () => {
    if (!activePlan) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/plan-data/evaluations/${activePlan.id}/anthropometric`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(response.data || []);
    } catch (error) {
      console.log('No plan anthropometric data found');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/anthropometric/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data?.records) {
        setRecords(response.data.records);
      }
    } catch (error) {
      console.log('No anthropometric data found');
    } finally {
      setLoading(false);
    }
  };

  const handleMeasurementChange = (field, value) => {
    setCurrentRecord(prev => ({
      ...prev,
      measurements: { ...prev.measurements, [field]: value }
    }));
  };

  const handleSkinfoldChange = (field, value) => {
    setCurrentRecord(prev => ({
      ...prev,
      skinfolds: { ...prev.skinfolds, [field]: value }
    }));
  };

  const calculateBMI = () => {
    const weight = parseFloat(currentRecord.measurements.weight);
    const height = parseFloat(currentRecord.measurements.height) / 100;
    if (weight && height) {
      const bmi = (weight / (height * height)).toFixed(1);
      handleMeasurementChange('bmi', bmi);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const newRecord = { ...currentRecord, id: Date.now().toString() };
      const updatedRecords = [...records, newRecord];
      
      // Si hay plan activo, guardar vinculado al plan
      if (activePlan) {
        await axios.post(
          `${BACKEND_URL}/api/plan-data/evaluations`,
          { 
            plan_id: activePlan.id,
            athlete_id: athleteId,
            evaluation_type: 'anthropometric',
            date: currentRecord.date,
            results: { measurements: currentRecord.measurements, skinfolds: currentRecord.skinfolds },
            notes: currentRecord.notes
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        loadPlanRecords();
      } else {
        await axios.post(
          `${BACKEND_URL}/api/anthropometric`,
          { athlete_id: athleteId, records: updatedRecords },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRecords(updatedRecords);
      }
      
      setCurrentRecord({
        date: new Date().toISOString().split('T')[0],
        measurements: {},
        skinfolds: {},
        notes: ''
      });
      toast.success('Datos antropométricos guardados');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    
    const updatedRecords = records.filter(r => r.id !== recordId);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/anthropometric`,
        { athlete_id: athleteId, records: updatedRecords },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(updatedRecords);
      toast.success('Registro eliminado');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const getChangeIndicator = (current, previous) => {
    if (!current || !previous) return null;
    const diff = parseFloat(current) - parseFloat(previous);
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-[#B8912A]" /></div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center gap-3">
          <Ruler className="h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold">Datos Antropométricos</h1>
            <p className="text-teal-100 text-sm">Registro y seguimiento de medidas corporales</p>
          </div>
        </div>
      </div>

      {/* Nuevo Registro */}
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5 text-teal-600" />
            Nuevo Registro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Calendar className="h-5 w-5 text-gray-500" />
            <Input
              type="date"
              value={currentRecord.date}
              onChange={(e) => setCurrentRecord(prev => ({ ...prev, date: e.target.value }))}
              className="w-48"
            />
          </div>

          {/* Medidas Básicas */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Medidas Básicas</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {measurementFields.slice(0, 5).map(field => (
                <div key={field.id}>
                  <label className="text-xs font-medium text-gray-600">{field.label}</label>
                  <div className="flex gap-1 mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={currentRecord.measurements[field.id] || ''}
                      onChange={(e) => handleMeasurementChange(field.id, e.target.value)}
                      onBlur={field.id === 'weight' || field.id === 'height' ? calculateBMI : undefined}
                      className="h-9"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Circunferencias */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Circunferencias</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {measurementFields.slice(5).map(field => (
                <div key={field.id}>
                  <label className="text-xs font-medium text-gray-600">{field.label}</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={currentRecord.measurements[field.id] || ''}
                    onChange={(e) => handleMeasurementChange(field.id, e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Pliegues Cutáneos */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Pliegues Cutáneos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {skinfoldFields.map(field => (
                <div key={field.id}>
                  <label className="text-xs font-medium text-gray-600">{field.label}</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={currentRecord.skinfolds[field.id] || ''}
                    onChange={(e) => handleSkinfoldChange(field.id, e.target.value)}
                    className="h-9 mt-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Registro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial */}
      {records.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Historial de Mediciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Peso</th>
                    <th className="text-left p-2">Talla</th>
                    <th className="text-left p-2">IMC</th>
                    <th className="text-left p-2">Grasa %</th>
                    <th className="text-left p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice().reverse().map((record, idx) => {
                    const prevRecord = records[records.length - idx - 2];
                    return (
                      <tr key={record.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">{record.date}</td>
                        <td className="p-2 flex items-center gap-1">
                          {record.measurements?.weight || '-'}
                          {getChangeIndicator(record.measurements?.weight, prevRecord?.measurements?.weight)}
                        </td>
                        <td className="p-2">{record.measurements?.height || '-'}</td>
                        <td className="p-2">{record.measurements?.bmi || '-'}</td>
                        <td className="p-2">{record.measurements?.bodyFat || '-'}</td>
                        <td className="p-2">
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteRecord(record.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnthropometricData;
