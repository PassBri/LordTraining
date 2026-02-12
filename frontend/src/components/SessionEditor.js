import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { 
  Target, Zap, Brain, Dumbbell, Heart, Calendar, Plus, Trash2, 
  Save, Download, Activity, Clock, ChevronDown, ChevronRight,
  GripVertical, AlertCircle, Share2, Copy, Check, FileText, Link2, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Capacidades físicas
const CAPACIDADES_FISICAS = [
  { id: 'fuerza', name: 'Fuerza' },
  { id: 'resistencia', name: 'Resistencia' },
  { id: 'velocidad', name: 'Velocidad' },
  { id: 'flexibilidad', name: 'Flexibilidad' },
  { id: 'coordinacion', name: 'Coordinación' },
  { id: 'equilibrio', name: 'Equilibrio' },
  { id: 'agilidad', name: 'Agilidad' },
  { id: 'potencia', name: 'Potencia' }
];

// Métodos de entrenamiento predefinidos
const METODOS_ENTRENAMIENTO = [
  { id: 'continuo-uniforme', name: 'Continuo Uniforme' },
  { id: 'intervalos', name: 'Intervalos' },
  { id: 'series', name: 'Series' },
  { id: 'repetido', name: 'Repetido' },
  { id: 'velocidad', name: 'Velocidad' },
  { id: 'continuo-variable', name: 'Continuo Variable' },
  { id: 'fartlek', name: 'Fartlek' },
  { id: 'piramidal', name: 'Piramidal' },
  { id: 'circuito', name: 'Circuito' },
  { id: 'competitivo', name: 'Competitivo' },
  { id: 'juego', name: 'Juego' }
];

// Procedimientos organizativos
const PROC_ORGANIZATIVO = [
  { id: 'individual', name: 'Individual' },
  { id: 'parejas', name: 'En Parejas' },
  { id: 'grupos', name: 'En Grupos' },
  { id: 'equipo', name: 'Equipo Completo' },
  { id: 'estaciones', name: 'Por Estaciones' },
  { id: 'circuito', name: 'Circuito' }
];

// Estructura inicial de una actividad
const ACTIVIDAD_INICIAL = {
  id: '',
  ejercicio: '',
  ejercicioId: null,
  capacidadFisica: 'fuerza',
  metodo: 'series',
  series: 3,
  repeticiones: '10-12',
  intensidad: 70,
  volumen: 30,
  procOrganizativo: 'individual',
  recuperacion: '2 min'
};

// Estructura inicial de sesión
const SESION_INICIAL = {
  objetivos: {
    general: '',
    fisico: '',
    tecnico: '',
    tactico: '',
    psicologico: '',
    teorico: ''
  },
  fases: {
    inicial: {
      nombre: 'Fase Inicial',
      color: 'border-l-green-500',
      bgColor: 'bg-green-50',
      actividades: []
    },
    principal: {
      nombre: 'Fase Principal',
      color: 'border-l-orange-500',
      bgColor: 'bg-orange-50',
      actividades: []
    },
    final: {
      nombre: 'Fase Final',
      color: 'border-l-blue-500',
      bgColor: 'bg-blue-50',
      actividades: []
    }
  },
  monitoreo: {
    fcReposo: '',
    fcMaxima: ''
  },
  retroalimentacion: ''
};

const SessionEditor = ({ 
  isOpen, 
  onClose, 
  session, 
  onSave,
  exercises = {},
  trainingMethods = [],
  athleteId,
  athleteName
}) => {
  const [sessionData, setSessionData] = useState(SESION_INICIAL);
  const [expandedPhases, setExpandedPhases] = useState({
    inicial: true,
    principal: true,
    final: true
  });
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [showExercisePicker, setShowExercisePicker] = useState(null);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sessionContentRef = useRef(null);

  // Cargar datos de la sesión existente
  useEffect(() => {
    if (session && session.detailedData) {
      setSessionData(session.detailedData);
    } else {
      // Reset con datos básicos de la sesión
      setSessionData({
        ...SESION_INICIAL,
        objetivos: {
          ...SESION_INICIAL.objetivos,
          general: session?.type ? `Sesión de ${session.type}` : ''
        }
      });
    }
  }, [session]);

  // Actualizar objetivos
  const updateObjetivo = (key, value) => {
    setSessionData(prev => ({
      ...prev,
      objetivos: {
        ...prev.objetivos,
        [key]: value
      }
    }));
  };

  // Agregar actividad a una fase
  const addActividad = (faseKey) => {
    const newActividad = {
      ...ACTIVIDAD_INICIAL,
      id: `act-${Date.now()}`
    };
    setSessionData(prev => ({
      ...prev,
      fases: {
        ...prev.fases,
        [faseKey]: {
          ...prev.fases[faseKey],
          actividades: [...prev.fases[faseKey].actividades, newActividad]
        }
      }
    }));
  };

  // Actualizar actividad
  const updateActividad = (faseKey, actIdx, field, value) => {
    setSessionData(prev => {
      const newActividades = [...prev.fases[faseKey].actividades];
      newActividades[actIdx] = {
        ...newActividades[actIdx],
        [field]: value
      };
      return {
        ...prev,
        fases: {
          ...prev.fases,
          [faseKey]: {
            ...prev.fases[faseKey],
            actividades: newActividades
          }
        }
      };
    });
  };

  // Eliminar actividad
  const deleteActividad = (faseKey, actIdx) => {
    setSessionData(prev => ({
      ...prev,
      fases: {
        ...prev.fases,
        [faseKey]: {
          ...prev.fases[faseKey],
          actividades: prev.fases[faseKey].actividades.filter((_, i) => i !== actIdx)
        }
      }
    }));
  };

  // Seleccionar ejercicio del picker
  const selectExercise = (faseKey, actIdx, ejercicioNombre) => {
    updateActividad(faseKey, actIdx, 'ejercicio', ejercicioNombre);
    setShowExercisePicker(null);
    setExerciseSearchTerm('');
  };

  // Obtener ejercicios filtrados
  const getFilteredExercises = () => {
    const results = [];
    const term = exerciseSearchTerm.toLowerCase();
    
    Object.entries(exercises).forEach(([catId, cat]) => {
      if (cat.subcategorias) {
        Object.entries(cat.subcategorias).forEach(([subId, sub]) => {
          sub.ejercicios?.forEach(ej => {
            // Si no hay término de búsqueda, mostrar todos
            // Si hay término, filtrar por nombre de ejercicio o categoría
            if (!term || ej.nombre.toLowerCase().includes(term) || 
                cat.nombre.toLowerCase().includes(term)) {
              results.push({
                ...ej,
                categoria: cat.nombre,
                subcategoria: sub.nombre
              });
            }
          });
        });
      }
    });
    
    return results.slice(0, 15); // Limitar a 15 resultados
  };

  // Guardar sesión
  const handleSave = () => {
    const updatedSession = {
      ...session,
      detailedData: sessionData
    };
    onSave(updatedSession);
    toast.success('Sesión guardada correctamente');
    onClose();
  };

  // Renderizar tabla de actividades
  const renderActividadesTable = (faseKey, fase) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500 text-xs uppercase">
              <th className="py-2 px-2 w-44">Medios</th>
              <th className="py-2 px-2 w-28">Cap. Física</th>
              <th className="py-2 px-2 w-32">Métodos</th>
              <th className="py-2 px-2 w-16">Series</th>
              <th className="py-2 px-2 w-20">Reps</th>
              <th className="py-2 px-2 w-28">Intensidad</th>
              <th className="py-2 px-2 w-20">Volumen</th>
              <th className="py-2 px-2 w-28">Proc. Org.</th>
              <th className="py-2 px-2 w-20">Recup.</th>
              <th className="py-2 px-1 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {fase.actividades.map((act, idx) => (
              <tr key={act.id} className="border-b hover:bg-slate-50">
                {/* Medios (Ejercicio) */}
                <td className="py-2 px-2 relative">
                  <div className="relative">
                    <Input
                      value={act.ejercicio}
                      onChange={(e) => updateActividad(faseKey, idx, 'ejercicio', e.target.value)}
                      onFocus={() => setShowExercisePicker(`${faseKey}-${idx}`)}
                      placeholder="Ejercicio..."
                      className="h-8 text-xs"
                      data-testid={`exercise-input-${faseKey}-${idx}`}
                    />
                    {showExercisePicker === `${faseKey}-${idx}` && (
                      <div className="fixed z-[100] bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto"
                           style={{ width: '320px', transform: 'translateY(8px)' }}>
                        <div className="p-2 border-b sticky top-0 bg-white">
                          <Input
                            placeholder="Buscar ejercicio..."
                            value={exerciseSearchTerm}
                            onChange={(e) => setExerciseSearchTerm(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                          />
                        </div>
                        <div className="p-1 max-h-48 overflow-y-auto">
                          {getFilteredExercises().map((ej, ejIdx) => (
                            <button
                              key={`${ej.nombre}-${ejIdx}`}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded text-xs"
                              onClick={() => selectExercise(faseKey, idx, ej.nombre)}
                            >
                              <p className="font-medium text-slate-800">{ej.nombre}</p>
                              <p className="text-slate-400 text-[10px]">{ej.categoria} • {ej.musculos}</p>
                            </button>
                          ))}
                          {getFilteredExercises().length === 0 && (
                            <p className="text-center text-slate-400 py-4 text-xs">No se encontraron ejercicios</p>
                          )}
                        </div>
                        <button
                          className="w-full text-center text-slate-500 py-2 border-t text-xs hover:bg-slate-50"
                          onClick={() => setShowExercisePicker(null)}
                        >
                          Cerrar
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Capacidad Física */}
                <td className="py-2 px-2">
                  <Select 
                    value={act.capacidadFisica} 
                    onValueChange={(v) => updateActividad(faseKey, idx, 'capacidadFisica', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAPACIDADES_FISICAS.map(cap => (
                        <SelectItem key={cap.id} value={cap.id} className="text-xs">{cap.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                {/* Métodos */}
                <td className="py-2 px-2">
                  <Select 
                    value={act.metodo} 
                    onValueChange={(v) => updateActividad(faseKey, idx, 'metodo', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METODOS_ENTRENAMIENTO.map(met => (
                        <SelectItem key={met.id} value={met.id} className="text-xs">{met.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                {/* Series */}
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    value={act.series}
                    onChange={(e) => updateActividad(faseKey, idx, 'series', parseInt(e.target.value) || 0)}
                    className="h-8 text-xs text-center"
                    min={1}
                    max={20}
                  />
                </td>
                
                {/* Repeticiones */}
                <td className="py-2 px-2">
                  <Input
                    value={act.repeticiones}
                    onChange={(e) => updateActividad(faseKey, idx, 'repeticiones', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="10-12"
                  />
                </td>
                
                {/* Intensidad */}
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          act.intensidad > 80 ? 'bg-red-500' :
                          act.intensidad > 60 ? 'bg-orange-500' :
                          act.intensidad > 40 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        style={{ width: `${act.intensidad}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium w-10 text-right">{act.intensidad}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={act.intensidad}
                    onChange={(e) => updateActividad(faseKey, idx, 'intensidad', parseInt(e.target.value))}
                    className="w-full h-1 mt-1 accent-blue-500"
                  />
                </td>
                
                {/* Volumen */}
                <td className="py-2 px-2">
                  <Input
                    value={act.volumen}
                    onChange={(e) => updateActividad(faseKey, idx, 'volumen', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="30 min"
                  />
                </td>
                
                {/* Procedimiento Organizativo */}
                <td className="py-2 px-2">
                  <Select 
                    value={act.procOrganizativo} 
                    onValueChange={(v) => updateActividad(faseKey, idx, 'procOrganizativo', v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROC_ORGANIZATIVO.map(proc => (
                        <SelectItem key={proc.id} value={proc.id} className="text-xs">{proc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                
                {/* Recuperación */}
                <td className="py-2 px-2">
                  <Input
                    value={act.recuperacion}
                    onChange={(e) => updateActividad(faseKey, idx, 'recuperacion', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="2 min"
                  />
                </td>
                
                {/* Acciones */}
                <td className="py-2 px-1">
                  <button
                    onClick={() => deleteActividad(faseKey, idx)}
                    className="p-1 hover:bg-red-50 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {fase.actividades.length === 0 && (
          <div className="text-center py-6 text-slate-400 text-sm">
            No hay actividades en esta fase
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0" data-testid="session-editor-dialog">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-red-600 font-bold text-lg">
                Sesión #{session?.dayName || ''}
              </DialogTitle>
              <p className="text-sm text-slate-500 mt-1">
                {session?.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {session.date}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                defaultValue={session?.date}
                className="w-40 h-9"
              />
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Objetivos de la Sesión */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="w-5 h-5 text-cyan-500" />
                Objetivos de la Sesión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Objetivo General:</label>
                  <Input
                    value={sessionData.objetivos.general}
                    onChange={(e) => updateObjetivo('general', e.target.value)}
                    placeholder="Objetivo principal de la sesión..."
                    className="mt-1"
                    data-testid="objetivo-general"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Objetivo Físico:</label>
                  <Input
                    value={sessionData.objetivos.fisico}
                    onChange={(e) => updateObjetivo('fisico', e.target.value)}
                    placeholder="Desarrollo de capacidades físicas..."
                    className="mt-1"
                    data-testid="objetivo-fisico"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Objetivo Técnico:</label>
                  <Input
                    value={sessionData.objetivos.tecnico}
                    onChange={(e) => updateObjetivo('tecnico', e.target.value)}
                    placeholder="Mejora técnica específica..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Objetivo Táctico:</label>
                  <Input
                    value={sessionData.objetivos.tactico}
                    onChange={(e) => updateObjetivo('tactico', e.target.value)}
                    placeholder="Desarrollo táctico..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Objetivo Psicológico:</label>
                  <Input
                    value={sessionData.objetivos.psicologico}
                    onChange={(e) => updateObjetivo('psicologico', e.target.value)}
                    placeholder="Aspecto mental a trabajar..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase">Objetivo Teórico:</label>
                  <Input
                    value={sessionData.objetivos.teorico}
                    onChange={(e) => updateObjetivo('teorico', e.target.value)}
                    placeholder="Conocimiento teórico..."
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estructura de la Sesión */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-5 h-5 text-yellow-500" />
                Estructura de la Sesión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fases */}
              {Object.entries(sessionData.fases).map(([faseKey, fase]) => (
                <div key={faseKey} className={`border-l-4 ${fase.color} rounded-lg overflow-hidden`}>
                  <div className={`${fase.bgColor}`}>
                    <button
                      onClick={() => setExpandedPhases(prev => ({ ...prev, [faseKey]: !prev[faseKey] }))}
                      className="w-full flex items-center justify-between p-3 hover:bg-black/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {expandedPhases[faseKey] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <span className={`font-bold uppercase text-sm ${
                          faseKey === 'inicial' ? 'text-green-700' :
                          faseKey === 'principal' ? 'text-orange-700' :
                          'text-blue-700'
                        }`}>
                          {fase.nombre}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({fase.actividades.length} actividades)
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); addActividad(faseKey); }}
                        className={`h-7 text-xs ${
                          faseKey === 'inicial' ? 'border-green-500 text-green-700 hover:bg-green-100' :
                          faseKey === 'principal' ? 'border-orange-500 text-orange-700 hover:bg-orange-100' :
                          'border-blue-500 text-blue-700 hover:bg-blue-100'
                        }`}
                        data-testid={`add-activity-${faseKey}`}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Agregar Actividad
                      </Button>
                    </button>
                    
                    {expandedPhases[faseKey] && (
                      <div className="bg-white p-3 border-t">
                        {renderActividadesTable(faseKey, fase)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Monitoreo y Retroalimentación */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monitoreo de FC */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Heart className="w-5 h-5 text-red-500" />
                  Monitoreo de Frecuencia Cardíaca
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">FC Reposo:</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        value={sessionData.monitoreo.fcReposo}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcReposo: e.target.value }
                        }))}
                        placeholder="60"
                        className="text-center"
                        data-testid="fc-reposo"
                      />
                      <span className="text-sm text-slate-500">bpm</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase">FC Máxima:</label>
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        value={sessionData.monitoreo.fcMaxima}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMaxima: e.target.value }
                        }))}
                        placeholder="180"
                        className="text-center"
                        data-testid="fc-maxima"
                      />
                      <span className="text-sm text-slate-500">bpm</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Retroalimentación */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="w-5 h-5 text-blue-500" />
                  Retroalimentación
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={sessionData.retroalimentacion}
                  onChange={(e) => setSessionData(prev => ({ ...prev, retroalimentacion: e.target.value }))}
                  placeholder="Observaciones y comentarios de la sesión..."
                  className="min-h-[100px] resize-none"
                  data-testid="retroalimentacion"
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            data-testid="cancel-session-btn"
          >
            Cancelar
          </Button>
          <Button 
            variant="outline"
            className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
            data-testid="export-session-btn"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            className="bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSave}
            data-testid="save-session-btn"
          >
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionEditor;
