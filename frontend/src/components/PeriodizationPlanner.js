import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import {
  Save, Loader2, Plus, Trash2, ChevronDown, ChevronRight, Calendar, Target, Activity,
  Layers, Clock, Dumbbell, Zap, BarChart, Edit, Copy, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// Opciones de períodos
const PERIODOS = [
  { id: 'preparatorio_general', label: 'Preparatorio General', color: 'bg-blue-100 border-blue-400' },
  { id: 'preparatorio_especial', label: 'Preparatorio Especial', color: 'bg-blue-200 border-blue-500' },
  { id: 'precompetitivo', label: 'Precompetitivo', color: 'bg-yellow-100 border-yellow-400' },
  { id: 'competitivo', label: 'Competitivo', color: 'bg-green-100 border-green-400' },
  { id: 'transitorio', label: 'Transitorio', color: 'bg-orange-100 border-orange-400' }
];

// Opciones de etapas
const ETAPAS = [
  { id: 'acumulacion', label: 'Acumulación', color: 'bg-purple-100' },
  { id: 'transformacion', label: 'Transformación', color: 'bg-indigo-100' },
  { id: 'realizacion', label: 'Realización', color: 'bg-pink-100' }
];

// Tipos de mesociclos
const TIPOS_MESOCICLO = [
  { id: 'entrante', label: 'Entrante' },
  { id: 'basico_desarrollador', label: 'Básico Desarrollador' },
  { id: 'basico_estabilizador', label: 'Básico Estabilizador' },
  { id: 'precompetitivo', label: 'Precompetitivo' },
  { id: 'competitivo', label: 'Competitivo' },
  { id: 'recuperacion', label: 'Recuperación' }
];

// Tipos de microciclos
const TIPOS_MICROCICLO = [
  { id: 'corriente', label: 'Corriente' },
  { id: 'carga', label: 'Carga' },
  { id: 'choque', label: 'Choque' },
  { id: 'aproximacion', label: 'Aproximación' },
  { id: 'competitivo', label: 'Competitivo' },
  { id: 'restablecimiento', label: 'Restablecimiento' }
];

// Capacidades físicas
const CAPACIDADES = [
  { id: 'fuerza', label: 'Fuerza' },
  { id: 'resistencia', label: 'Resistencia' },
  { id: 'velocidad', label: 'Velocidad' },
  { id: 'flexibilidad', label: 'Flexibilidad' },
  { id: 'coordinacion', label: 'Coordinación' },
  { id: 'potencia', label: 'Potencia' }
];

// Métodos de entrenamiento
const METODOS = [
  { id: 'continuo', label: 'Continuo' },
  { id: 'intervalico', label: 'Interválico' },
  { id: 'repeticiones', label: 'Repeticiones' },
  { id: 'circuito', label: 'Circuito' },
  { id: 'juego', label: 'Juego' },
  { id: 'competitivo', label: 'Competitivo' }
];

const PeriodizationPlanner = ({ athleteId }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('macrociclo');
  const [expandedMeso, setExpandedMeso] = useState(null);
  const [expandedMicro, setExpandedMicro] = useState(null);

  // Estado del macrociclo
  const [macrociclo, setMacrociclo] = useState({
    id: null,
    nombre: '',
    fechaInicio: '',
    fechaFin: '',
    deporte: '',
    categoria: '',
    entrenador: '',
    objetivoGeneral: '',
    objetivosFisicos: '',
    objetivosTecnicos: '',
    objetivosTacticos: '',
    objetivosPsicologicos: ''
  });

  // Estado de mesociclos
  const [mesociclos, setMesociclos] = useState([]);
  
  // Estado de microciclos
  const [microciclos, setMicrociclos] = useState([]);

  // Estado de sesiones
  const [sesiones, setSesiones] = useState([]);

  // Cargar datos
  useEffect(() => {
    loadData();
  }, [athleteId]);

  const loadData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/periodization-plan/${athleteId || 'default'}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data) {
        setMacrociclo(response.data.macrociclo || macrociclo);
        setMesociclos(response.data.mesociclos || []);
        setMicrociclos(response.data.microciclos || []);
        setSesiones(response.data.sesiones || []);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error loading plan:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  // Guardar plan completo
  const handleSave = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(
        `${BACKEND_URL}/api/periodization-plan`,
        {
          athlete_id: athleteId || 'default',
          macrociclo,
          mesociclos,
          microciclos,
          sesiones
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Plan de periodización guardado');
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  // Agregar mesociclo
  const addMesociclo = () => {
    const newMeso = {
      id: `meso_${Date.now()}`,
      numero: mesociclos.length + 1,
      nombre: `Mesociclo ${mesociclos.length + 1}`,
      tipo: 'basico_desarrollador',
      periodo: 'preparatorio_general',
      etapa: 'acumulacion',
      fechaInicio: '',
      fechaFin: '',
      semanas: 4,
      objetivos: '',
      mediosPrincipales: [],
      metodosPrincipales: [],
      cargaVolumen: 'medio',
      cargaIntensidad: 'media'
    };
    setMesociclos([...mesociclos, newMeso]);
    setExpandedMeso(newMeso.id);
  };

  // Agregar microciclo a un mesociclo
  const addMicrociclo = (mesocicloId) => {
    const mesoMicros = microciclos.filter(m => m.mesocicloId === mesocicloId);
    const newMicro = {
      id: `micro_${Date.now()}`,
      mesocicloId,
      numero: mesoMicros.length + 1,
      nombre: `Microciclo ${mesoMicros.length + 1}`,
      tipo: 'corriente',
      fechaInicio: '',
      fechaFin: '',
      dias: 7,
      objetivos: '',
      medios: [],
      metodos: [],
      volumenTotal: '',
      intensidadPromedio: '',
      distribucionCarga: {
        lunes: 'medio',
        martes: 'alto',
        miercoles: 'bajo',
        jueves: 'alto',
        viernes: 'medio',
        sabado: 'bajo',
        domingo: 'descanso'
      }
    };
    setMicrociclos([...microciclos, newMicro]);
    setExpandedMicro(newMicro.id);
  };

  // Agregar sesión a un microciclo
  const addSesion = (microcicloId) => {
    const microSesiones = sesiones.filter(s => s.microcicloId === microcicloId);
    const newSesion = {
      id: `sesion_${Date.now()}`,
      microcicloId,
      numero: microSesiones.length + 1,
      fecha: '',
      hora: '',
      duracion: 90,
      objetivo: '',
      faseInicial: {
        duracion: 15,
        actividades: []
      },
      fasePrincipal: {
        duracion: 60,
        actividades: []
      },
      faseFinal: {
        duracion: 15,
        actividades: []
      },
      cargaTotal: '',
      observaciones: ''
    };
    setSesiones([...sesiones, newSesion]);
  };

  // Actualizar mesociclo
  const updateMesociclo = (id, field, value) => {
    setMesociclos(mesociclos.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // Actualizar microciclo
  const updateMicrociclo = (id, field, value) => {
    setMicrociclos(microciclos.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // Eliminar mesociclo
  const deleteMesociclo = (id) => {
    setMesociclos(mesociclos.filter(m => m.id !== id));
    // También eliminar sus microciclos y sesiones
    const microsToDelete = microciclos.filter(m => m.mesocicloId === id).map(m => m.id);
    setMicrociclos(microciclos.filter(m => m.mesocicloId !== id));
    setSesiones(sesiones.filter(s => !microsToDelete.includes(s.microcicloId)));
  };

  // Eliminar microciclo
  const deleteMicrociclo = (id) => {
    setMicrociclos(microciclos.filter(m => m.id !== id));
    setSesiones(sesiones.filter(s => s.microcicloId !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con información del macrociclo */}
      <Card className="border-2 border-blue-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5" />
              Estructura del Macrociclo
            </CardTitle>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-green-500 hover:bg-green-600"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span className="ml-1">Guardar Todo</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Nombre del Plan</label>
              <Input
                value={macrociclo.nombre}
                onChange={(e) => setMacrociclo({ ...macrociclo, nombre: e.target.value })}
                placeholder="Macrociclo 2025"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Fecha Inicio</label>
              <Input
                type="date"
                value={macrociclo.fechaInicio}
                onChange={(e) => setMacrociclo({ ...macrociclo, fechaInicio: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Fecha Fin</label>
              <Input
                type="date"
                value={macrociclo.fechaFin}
                onChange={(e) => setMacrociclo({ ...macrociclo, fechaFin: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Deporte</label>
              <Input
                value={macrociclo.deporte}
                onChange={(e) => setMacrociclo({ ...macrociclo, deporte: e.target.value })}
                placeholder="Atletismo"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Categoría</label>
              <Input
                value={macrociclo.categoria}
                onChange={(e) => setMacrociclo({ ...macrociclo, categoria: e.target.value })}
                placeholder="Senior"
                className="h-9"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Entrenador</label>
              <Input
                value={macrociclo.entrenador}
                onChange={(e) => setMacrociclo({ ...macrociclo, entrenador: e.target.value })}
                placeholder="Nombre"
                className="h-9"
              />
            </div>
          </div>
          
          {/* Objetivos del Macrociclo */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Objetivo General</label>
              <Textarea
                value={macrociclo.objetivoGeneral}
                onChange={(e) => setMacrociclo({ ...macrociclo, objetivoGeneral: e.target.value })}
                placeholder="Objetivo principal del macrociclo..."
                className="h-20 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-gray-500">Obj. Físicos</label>
                <Input
                  value={macrociclo.objetivosFisicos}
                  onChange={(e) => setMacrociclo({ ...macrociclo, objetivosFisicos: e.target.value })}
                  placeholder="Físicos"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Obj. Técnicos</label>
                <Input
                  value={macrociclo.objetivosTecnicos}
                  onChange={(e) => setMacrociclo({ ...macrociclo, objetivosTecnicos: e.target.value })}
                  placeholder="Técnicos"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Obj. Tácticos</label>
                <Input
                  value={macrociclo.objetivosTacticos}
                  onChange={(e) => setMacrociclo({ ...macrociclo, objetivosTacticos: e.target.value })}
                  placeholder="Tácticos"
                  className="h-9"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Obj. Psicológicos</label>
                <Input
                  value={macrociclo.objetivosPsicologicos}
                  onChange={(e) => setMacrociclo({ ...macrociclo, objetivosPsicologicos: e.target.value })}
                  placeholder="Psicológicos"
                  className="h-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen visual de la estructura */}
      <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg text-sm">
        <span className="font-medium">Estructura:</span>
        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">1 Macrociclo</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded">{mesociclos.length} Mesociclos</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">{microciclos.length} Microciclos</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{sesiones.length} Sesiones</span>
      </div>

      {/* Lista de Mesociclos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Mesociclos
          </h3>
          <Button size="sm" onClick={addMesociclo} className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-1" />
            Agregar Mesociclo
          </Button>
        </div>

        {mesociclos.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300">
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay mesociclos. Agrega el primero para comenzar.</p>
            </CardContent>
          </Card>
        ) : (
          mesociclos.map((meso, mesoIndex) => {
            const mesoMicros = microciclos.filter(m => m.mesocicloId === meso.id);
            const periodoInfo = PERIODOS.find(p => p.id === meso.periodo);
            const isExpanded = expandedMeso === meso.id;

            return (
              <Card key={meso.id} className={`border-l-4 ${periodoInfo?.color || 'border-gray-300'}`}>
                <CardHeader 
                  className="py-2 px-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedMeso(isExpanded ? null : meso.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      <span className="font-bold text-gray-800">Mesociclo {meso.numero}</span>
                      <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{meso.tipo.replace('_', ' ')}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{periodoInfo?.label}</span>
                      <span className="text-xs text-gray-500">{meso.semanas} semanas</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{mesoMicros.length} microciclos</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); deleteMesociclo(meso.id); }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 pb-4 px-4">
                    {/* Configuración del Mesociclo */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Tipo</label>
                        <Select value={meso.tipo} onValueChange={(v) => updateMesociclo(meso.id, 'tipo', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS_MESOCICLO.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Período</label>
                        <Select value={meso.periodo} onValueChange={(v) => updateMesociclo(meso.id, 'periodo', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERIODOS.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Etapa</label>
                        <Select value={meso.etapa} onValueChange={(v) => updateMesociclo(meso.id, 'etapa', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ETAPAS.map(e => (
                              <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Semanas</label>
                        <Input
                          type="number"
                          value={meso.semanas}
                          onChange={(e) => updateMesociclo(meso.id, 'semanas', parseInt(e.target.value))}
                          className="h-8 text-sm"
                          min={1}
                          max={8}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Volumen</label>
                        <Select value={meso.cargaVolumen} onValueChange={(v) => updateMesociclo(meso.id, 'cargaVolumen', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bajo">Bajo</SelectItem>
                            <SelectItem value="medio">Medio</SelectItem>
                            <SelectItem value="alto">Alto</SelectItem>
                            <SelectItem value="muy_alto">Muy Alto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Intensidad</label>
                        <Select value={meso.cargaIntensidad} onValueChange={(v) => updateMesociclo(meso.id, 'cargaIntensidad', v)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baja">Baja</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="muy_alta">Muy Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Objetivos del mesociclo */}
                    <div className="mb-4">
                      <label className="text-xs font-medium text-gray-500">Objetivos del Mesociclo</label>
                      <Textarea
                        value={meso.objetivos}
                        onChange={(e) => updateMesociclo(meso.id, 'objetivos', e.target.value)}
                        placeholder="Objetivos específicos de este mesociclo..."
                        className="h-16 text-sm"
                      />
                    </div>

                    {/* Microciclos del Mesociclo */}
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          Microciclos
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addMicrociclo(meso.id)}
                          className="h-7 text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Agregar Microciclo
                        </Button>
                      </div>

                      {mesoMicros.length === 0 ? (
                        <p className="text-xs text-gray-400 italic p-2">Sin microciclos</p>
                      ) : (
                        <div className="space-y-2">
                          {mesoMicros.map((micro, microIndex) => {
                            const microSesiones = sesiones.filter(s => s.microcicloId === micro.id);
                            const isMicroExpanded = expandedMicro === micro.id;

                            return (
                              <div key={micro.id} className="border rounded-lg bg-white">
                                <div 
                                  className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
                                  onClick={() => setExpandedMicro(isMicroExpanded ? null : micro.id)}
                                >
                                  <div className="flex items-center gap-2">
                                    {isMicroExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    <span className="text-sm font-medium">Microciclo {micro.numero}</span>
                                    <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs">{micro.tipo}</span>
                                    <span className="text-xs text-gray-500">{micro.dias} días</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">{microSesiones.length} sesiones</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => { e.stopPropagation(); deleteMicrociclo(micro.id); }}
                                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>

                                {isMicroExpanded && (
                                  <div className="p-3 bg-gray-50 border-t">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                      <div>
                                        <label className="text-xs text-gray-500">Tipo</label>
                                        <Select value={micro.tipo} onValueChange={(v) => updateMicrociclo(micro.id, 'tipo', v)}>
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {TIPOS_MICROCICLO.map(t => (
                                              <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500">Días</label>
                                        <Input
                                          type="number"
                                          value={micro.dias}
                                          onChange={(e) => updateMicrociclo(micro.id, 'dias', parseInt(e.target.value))}
                                          className="h-7 text-xs"
                                          min={5}
                                          max={10}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500">Volumen Total</label>
                                        <Input
                                          value={micro.volumenTotal}
                                          onChange={(e) => updateMicrociclo(micro.id, 'volumenTotal', e.target.value)}
                                          placeholder="ej: 450 min"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-500">Intensidad Prom.</label>
                                        <Input
                                          value={micro.intensidadPromedio}
                                          onChange={(e) => updateMicrociclo(micro.id, 'intensidadPromedio', e.target.value)}
                                          placeholder="ej: 75%"
                                          className="h-7 text-xs"
                                        />
                                      </div>
                                    </div>

                                    {/* Distribución de carga semanal */}
                                    <div className="mb-3">
                                      <label className="text-xs text-gray-500 mb-1 block">Distribución de Carga</label>
                                      <div className="flex gap-1">
                                        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day, idx) => {
                                          const dayKey = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'][idx];
                                          const carga = micro.distribucionCarga?.[dayKey] || 'medio';
                                          const colors = {
                                            descanso: 'bg-gray-200',
                                            bajo: 'bg-green-200',
                                            medio: 'bg-yellow-200',
                                            alto: 'bg-orange-300',
                                            muy_alto: 'bg-red-300'
                                          };
                                          return (
                                            <div
                                              key={day}
                                              className={`flex-1 text-center py-1 rounded text-xs cursor-pointer ${colors[carga]}`}
                                              onClick={() => {
                                                const levels = ['descanso', 'bajo', 'medio', 'alto', 'muy_alto'];
                                                const currentIdx = levels.indexOf(carga);
                                                const nextIdx = (currentIdx + 1) % levels.length;
                                                updateMicrociclo(micro.id, 'distribucionCarga', {
                                                  ...micro.distribucionCarga,
                                                  [dayKey]: levels[nextIdx]
                                                });
                                              }}
                                            >
                                              {day}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Sesiones */}
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-gray-500">{microSesiones.length} sesiones planificadas</span>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => addSesion(micro.id)}
                                        className="h-6 text-xs"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Agregar Sesión
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PeriodizationPlanner;
