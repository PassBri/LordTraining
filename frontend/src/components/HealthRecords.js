import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Heart, PlusCircle, Clipboard, Trash2, Save, Loader2, AlertTriangle, Pill, Activity } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const HealthRecords = ({ athleteId, recordType = 'all', onSave }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [currentRecord, setCurrentRecord] = useState({
    type: recordType !== 'all' ? recordType : '',
    description: '',
    dosage: '',
    frequency: '',
    affectedArea: '',
    date: new Date().toISOString().split('T')[0],
    treatment: '',
    severity: '',
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    if (athleteId) {
      loadRecords();
    }
  }, [athleteId, recordType]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const params = recordType !== 'all' ? `?type=${recordType}` : '';
      const response = await axios.get(
        `${BACKEND_URL}/api/health/records/${athleteId}${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRecords(response.data || []);
    } catch (error) {
      console.log('No records found');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCurrentRecord(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addRecord = async () => {
    if (!currentRecord.type || !currentRecord.description) {
      toast.error('Por favor completa el tipo y descripción');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/health/records`,
        { ...currentRecord, athlete_id: athleteId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Registro agregado correctamente');
      loadRecords();
      setCurrentRecord({
        type: recordType !== 'all' ? recordType : '',
        description: '',
        dosage: '',
        frequency: '',
        affectedArea: '',
        date: new Date().toISOString().split('T')[0],
        treatment: '',
        severity: '',
        status: 'active',
        notes: ''
      });
      if (onSave) onSave();
    } catch (error) {
      toast.error('Error al agregar registro');
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (recordId) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    
    try {
      const token = localStorage.getItem('train_token');
      await axios.delete(
        `${BACKEND_URL}/api/health/records/${recordId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Registro eliminado');
      loadRecords();
    } catch (error) {
      toast.error('Error al eliminar registro');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'lesion': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'enfermedad': return <Activity className="w-4 h-4 text-orange-500" />;
      case 'medicamento': return <Pill className="w-4 h-4 text-blue-500" />;
      default: return <Heart className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type) => {
    const labels = {
      lesion: 'Lesión',
      enfermedad: 'Enfermedad',
      medicamento: 'Medicamento',
      tratamiento: 'Tratamiento',
      otro: 'Otro'
    };
    return labels[type] || type;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'leve': return 'bg-green-100 text-green-700';
      case 'moderada': return 'bg-yellow-100 text-yellow-700';
      case 'grave': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-red-100 text-red-700';
      case 'recovering': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTitle = () => {
    switch (recordType) {
      case 'lesion': return 'Registro de Lesiones';
      case 'enfermedad': return 'Registro de Enfermedades';
      case 'medicamento': return 'Registro de Medicamentos';
      default: return 'Registro de Salud del Deportista';
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
        <h1 className="text-2xl font-bold mb-2">{getTitle()}</h1>
        <p className="opacity-90 text-sm">
          Registro detallado de condiciones de salud, lesiones, tratamientos y medicamentos
          para un manejo cuidadoso y personalizado del entrenamiento y recuperación.
        </p>
      </div>

      {/* Formulario de Nuevo Registro */}
      <Card className="shadow-md border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Heart className="h-5 w-5" />
            </div>
            Nuevo Registro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tipo de Registro */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo de Registro</label>
              <Select 
                value={currentRecord.type}
                onValueChange={(value) => handleInputChange('type', value)}
                disabled={recordType !== 'all'}
              >
                <SelectTrigger className="border-gray-200" data-testid="health-type-select">
                  <SelectValue placeholder="Selecciona el tipo de registro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lesion">Lesión</SelectItem>
                  <SelectItem value="enfermedad">Enfermedad</SelectItem>
                  <SelectItem value="medicamento">Medicamento</SelectItem>
                  <SelectItem value="tratamiento">Tratamiento</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fecha</label>
              <Input
                type="date"
                value={currentRecord.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="border-gray-200"
                data-testid="health-date"
              />
            </div>

            {/* Severidad */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Severidad</label>
              <Select 
                value={currentRecord.severity}
                onValueChange={(value) => handleInputChange('severity', value)}
              >
                <SelectTrigger className="border-gray-200" data-testid="health-severity-select">
                  <SelectValue placeholder="Selecciona la severidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve</SelectItem>
                  <SelectItem value="moderada">Moderada</SelectItem>
                  <SelectItem value="grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <Select 
                value={currentRecord.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger className="border-gray-200" data-testid="health-status-select">
                  <SelectValue placeholder="Selecciona el estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="recovering">En Recuperación</SelectItem>
                  <SelectItem value="resolved">Resuelto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Descripción *</label>
              <Textarea
                value={currentRecord.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Descripción detallada de la condición..."
                className="min-h-[80px] border-gray-200"
                data-testid="health-description"
              />
            </div>

            {/* Área Afectada */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Área Afectada</label>
              <Textarea
                value={currentRecord.affectedArea}
                onChange={(e) => handleInputChange('affectedArea', e.target.value)}
                placeholder="Especifica el área afectada (rodilla izquierda, hombro derecho, etc.)..."
                className="min-h-[80px] border-gray-200"
                data-testid="health-area"
              />
            </div>

            {/* Tratamiento/Medicamento */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tratamiento/Medicamento</label>
              <Textarea
                value={currentRecord.treatment}
                onChange={(e) => handleInputChange('treatment', e.target.value)}
                placeholder="Detalla el tratamiento o medicamento prescrito..."
                className="min-h-[80px] border-gray-200"
                data-testid="health-treatment"
              />
            </div>

            {/* Dosis/Frecuencia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Dosis/Frecuencia</label>
              <Textarea
                value={currentRecord.dosage}
                onChange={(e) => handleInputChange('dosage', e.target.value)}
                placeholder="Especifica la dosis y frecuencia (ej: 500mg cada 8 horas)..."
                className="min-h-[80px] border-gray-200"
                data-testid="health-dosage"
              />
            </div>

            {/* Notas */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-700">Notas/Comentarios</label>
              <Textarea
                value={currentRecord.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Información adicional relevante, indicaciones especiales, precauciones..."
                className="min-h-[80px] border-gray-200"
                data-testid="health-notes"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={addRecord}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="add-health-record-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Agregar Registro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Registros */}
      <Card className="shadow-md border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
              <Clipboard className="h-5 w-5" />
            </div>
            Historial de Registros ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {records.length === 0 ? (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No hay registros disponibles</p>
                <p className="text-sm text-gray-400">Agrega un nuevo registro arriba</p>
              </div>
            ) : (
              records.map((record) => (
                <Card key={record.id} className="border border-gray-200 hover:border-gray-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(record.type)}
                        <span className="font-semibold text-gray-800">{getTypeLabel(record.type)}</span>
                        {record.severity && (
                          <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(record.severity)}`}>
                            {record.severity}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(record.status)}`}>
                          {record.status === 'active' ? 'Activo' : 
                           record.status === 'recovering' ? 'Recuperación' : 'Resuelto'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{record.date}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRecord(record.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      {record.description && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">Descripción:</span>
                          <p className="text-gray-800 mt-1">{record.description}</p>
                        </div>
                      )}
                      {record.affectedArea && (
                        <div>
                          <span className="font-medium text-gray-600">Área Afectada:</span>
                          <p className="text-gray-800 mt-1">{record.affectedArea}</p>
                        </div>
                      )}
                      {record.treatment && (
                        <div>
                          <span className="font-medium text-gray-600">Tratamiento:</span>
                          <p className="text-gray-800 mt-1">{record.treatment}</p>
                        </div>
                      )}
                      {record.dosage && (
                        <div>
                          <span className="font-medium text-gray-600">Dosis/Frecuencia:</span>
                          <p className="text-gray-800 mt-1">{record.dosage}</p>
                        </div>
                      )}
                      {record.notes && (
                        <div className="md:col-span-2">
                          <span className="font-medium text-gray-600">Notas:</span>
                          <p className="text-gray-800 mt-1">{record.notes}</p>
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

export default HealthRecords;
