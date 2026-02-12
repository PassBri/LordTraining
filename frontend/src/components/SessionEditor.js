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
  GripVertical, AlertCircle, Share2, Copy, Check, FileText, Link2, Eye,
  Watch, Droplets, Battery, Moon, TrendingUp, TrendingDown, Bluetooth
} from 'lucide-react';
import { toast } from 'sonner';

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
    // Frecuencia Cardíaca
    fcReposo: '',
    fcMaxima: '',
    fcMedia: '',
    // Fases de FC
    fcAntesEntrenamiento: '',
    fcDuranteEntrenamiento: '',
    fcDespuesEntrenamiento: '',
    fcRecuperacion5min: '',
    // Zonas de trabajo (%)
    zonaAerobica: '',
    zonaAnaerobica: '',
    zonaRecuperacion: '',
    // Estado físico
    nivelFatiga: 50, // 0-100
    nivelHidratacion: 80, // 0-100
    calidadSueno: 75, // 0-100
    nivelEnergia: 70, // 0-100
    // Conexión dispositivo
    dispositivoConectado: false,
    nombreDispositivo: ''
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

  // Exportar sesión como PDF
  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('train_token');
      
      // Preparar datos de la sesión para el PDF
      const pdfData = {
        athlete_id: athleteId,
        athlete_name: athleteName || 'Atleta',
        session: {
          date: session?.date || new Date().toISOString().split('T')[0],
          day: session?.dayName || 'Sesión',
          type: session?.type || 'Entrenamiento',
          objectives: sessionData.objetivos,
          phases: sessionData.fases,
          monitoring: sessionData.monitoreo,
          feedback: sessionData.retroalimentacion
        }
      };
      
      const response = await fetch(`${API_URL}/api/export/session-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pdfData)
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sesion_${session?.date || 'entrenamiento'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('PDF descargado exitosamente');
      } else {
        throw new Error('Error al generar PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Error al exportar PDF');
    }
    setExporting(false);
  };

  // Generar enlace para compartir
  const handleGenerateShareLink = async () => {
    try {
      const token = localStorage.getItem('train_token');
      
      if (!athleteId) {
        toast.error('Selecciona un atleta primero');
        return;
      }
      
      // Guardar primero la sesión si tiene cambios
      const sessionToShare = {
        athlete_id: athleteId,
        athlete_name: athleteName || 'Atleta',
        session_data: {
          ...session,
          detailedData: sessionData
        }
      };
      
      const response = await fetch(`${API_URL}/api/sessions/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(sessionToShare)
      });
      
      if (response.ok) {
        const data = await response.json();
        const fullLink = `${window.location.origin}/session/view/${data.share_id}`;
        setShareLink(fullLink);
        setShowShareDialog(true);
        toast.success('Enlace generado exitosamente');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al generar enlace');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      toast.error(error.message || 'Error al generar enlace para compartir');
    }
  };

  // Copiar enlace al portapapeles
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      toast.success('Enlace copiado al portapapeles');
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      toast.error('Error al copiar enlace');
    }
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
                <td className="py-2 px-2" style={{ position: 'static' }}>
                  <div style={{ position: 'relative', zIndex: showExercisePicker === `${faseKey}-${idx}` ? 10000 : 'auto' }}>
                    <Input
                      value={act.ejercicio}
                      onChange={(e) => updateActividad(faseKey, idx, 'ejercicio', e.target.value)}
                      onFocus={() => setShowExercisePicker(`${faseKey}-${idx}`)}
                      placeholder="Ejercicio..."
                      className="h-8 text-xs"
                      data-testid={`exercise-input-${faseKey}-${idx}`}
                    />
                    {showExercisePicker === `${faseKey}-${idx}` && (
                      <div 
                        className="fixed bg-white border-2 border-blue-200 rounded-xl shadow-2xl overflow-hidden"
                        style={{ 
                          width: '340px',
                          maxHeight: '320px',
                          zIndex: 99999,
                          transform: 'translateY(4px)'
                        }}>
                        <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 sticky top-0">
                          <Input
                            placeholder="Buscar ejercicio..."
                            value={exerciseSearchTerm}
                            onChange={(e) => setExerciseSearchTerm(e.target.value)}
                            className="h-9 text-sm bg-white"
                            autoFocus
                          />
                        </div>
                        <div className="p-2 max-h-52 overflow-y-auto bg-white">
                          {getFilteredExercises().map((ej, ejIdx) => (
                            <button
                              key={`${ej.nombre}-${ejIdx}`}
                              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded-lg text-sm transition-colors"
                              onClick={() => selectExercise(faseKey, idx, ej.nombre)}
                            >
                              <p className="font-medium text-slate-800">{ej.nombre}</p>
                              <p className="text-slate-400 text-xs mt-0.5">{ej.categoria} • {ej.musculos}</p>
                            </button>
                          ))}
                          {getFilteredExercises().length === 0 && (
                            <p className="text-center text-slate-400 py-6 text-sm">No se encontraron ejercicios</p>
                          )}
                        </div>
                        <button
                          className="w-full text-center text-blue-600 py-2.5 border-t bg-slate-50 text-sm font-medium hover:bg-slate-100 transition-colors"
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
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 bg-white" data-testid="session-editor-dialog">
          {/* Header con gradiente */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white font-bold text-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <span>Sesión de Entrenamiento</span>
                    {session?.dayName && (
                      <span className="ml-2 text-white/80 font-normal text-base">#{session.dayName}</span>
                    )}
                  </div>
                </DialogTitle>
                {athleteName && (
                  <p className="text-blue-100 text-sm mt-2 ml-[52px]">
                    Atleta: {athleteName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/80" />
                  <Input
                    type="date"
                    defaultValue={session?.date}
                    className="w-36 h-8 bg-white/20 border-white/30 text-white placeholder:text-white/50 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contenido Principal - Fondo blanco */}
          <div ref={sessionContentRef} className="overflow-y-auto max-h-[calc(90vh-180px)] bg-white">
            <div className="p-6 space-y-6">
              {/* Objetivos de la Sesión */}
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-white" />
                    </div>
                    Objetivos de la Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo General</label>
                      <Input
                        value={sessionData.objetivos.general}
                        onChange={(e) => updateObjetivo('general', e.target.value)}
                        placeholder="Objetivo principal de la sesión..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                        data-testid="objetivo-general"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Físico</label>
                      <Input
                        value={sessionData.objetivos.fisico}
                        onChange={(e) => updateObjetivo('fisico', e.target.value)}
                        placeholder="Desarrollo de capacidades físicas..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                        data-testid="objetivo-fisico"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Técnico</label>
                      <Input
                        value={sessionData.objetivos.tecnico}
                        onChange={(e) => updateObjetivo('tecnico', e.target.value)}
                        placeholder="Mejora técnica específica..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Táctico</label>
                      <Input
                        value={sessionData.objetivos.tactico}
                        onChange={(e) => updateObjetivo('tactico', e.target.value)}
                        placeholder="Desarrollo táctico..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Psicológico</label>
                      <Input
                        value={sessionData.objetivos.psicologico}
                        onChange={(e) => updateObjetivo('psicologico', e.target.value)}
                        placeholder="Aspecto mental a trabajar..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Objetivo Teórico</label>
                      <Input
                        value={sessionData.objetivos.teorico}
                        onChange={(e) => updateObjetivo('teorico', e.target.value)}
                        placeholder="Conocimiento teórico..."
                        className="bg-white border-slate-200 focus:border-cyan-400 focus:ring-cyan-400"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estructura de la Sesión */}
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    Estructura de la Sesión
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 bg-white">
                  {/* Fases */}
                  {Object.entries(sessionData.fases).map(([faseKey, fase]) => {
                    const faseColors = {
                      inicial: { border: 'border-l-green-500', bg: 'bg-green-50', header: 'bg-green-100', text: 'text-green-700', btn: 'border-green-500 text-green-700 hover:bg-green-100' },
                      principal: { border: 'border-l-orange-500', bg: 'bg-orange-50', header: 'bg-orange-100', text: 'text-orange-700', btn: 'border-orange-500 text-orange-700 hover:bg-orange-100' },
                      final: { border: 'border-l-blue-500', bg: 'bg-blue-50', header: 'bg-blue-100', text: 'text-blue-700', btn: 'border-blue-500 text-blue-700 hover:bg-blue-100' }
                    };
                    const colors = faseColors[faseKey];
                    
                    return (
                      <div key={faseKey} className={`border-l-4 ${colors.border} rounded-xl overflow-hidden shadow-sm bg-white`}>
                        <button
                          onClick={() => setExpandedPhases(prev => ({ ...prev, [faseKey]: !prev[faseKey] }))}
                          className={`w-full flex items-center justify-between p-4 ${colors.header} hover:opacity-90 transition-all`}
                        >
                          <div className="flex items-center gap-3">
                            {expandedPhases[faseKey] ? 
                              <ChevronDown className={`w-5 h-5 ${colors.text}`} /> : 
                              <ChevronRight className={`w-5 h-5 ${colors.text}`} />
                            }
                            <span className={`font-bold uppercase text-sm ${colors.text}`}>
                              {fase.nombre}
                            </span>
                            <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-full">
                              {fase.actividades.length} actividades
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); addActividad(faseKey); }}
                            className={`h-8 text-xs ${colors.btn} bg-white`}
                            data-testid={`add-activity-${faseKey}`}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Agregar Actividad
                          </Button>
                        </button>
                        
                        {expandedPhases[faseKey] && (
                          <div className="bg-white p-4 border-t border-slate-100">
                            {renderActividadesTable(faseKey, fase)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Monitoreo Avanzado - Conexión con Relojes Inteligentes */}
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-red-50 via-pink-50 to-purple-50 border-b border-slate-100 pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                      <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <Watch className="w-4 h-4 text-white" />
                      </div>
                      Monitoreo de Rendimiento
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs ${sessionData.monitoreo.dispositivoConectado ? 'border-green-500 text-green-700 bg-green-50' : 'border-slate-300'}`}
                        onClick={() => {
                          setSessionData(prev => ({
                            ...prev,
                            monitoreo: { 
                              ...prev.monitoreo, 
                              dispositivoConectado: !prev.monitoreo.dispositivoConectado,
                              nombreDispositivo: !prev.monitoreo.dispositivoConectado ? 'Apple Watch / Garmin' : ''
                            }
                          }));
                          toast.success(sessionData.monitoreo.dispositivoConectado ? 'Dispositivo desconectado' : 'Simulando conexión con dispositivo');
                        }}
                      >
                        <Bluetooth className={`w-3 h-3 mr-1 ${sessionData.monitoreo.dispositivoConectado ? 'text-green-600' : ''}`} />
                        {sessionData.monitoreo.dispositivoConectado ? 'Conectado' : 'Conectar Dispositivo'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 bg-white space-y-6">
                  {/* Gráfica de Frecuencia Cardíaca por Fases */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      Frecuencia Cardíaca por Fases
                    </h4>
                    <div className="bg-slate-50 rounded-xl p-4">
                      {/* Gráfica visual simulada */}
                      <div className="flex items-end justify-between h-32 gap-2 mb-3">
                        {/* Antes */}
                        <div className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-400 to-blue-300 rounded-t-lg transition-all duration-500"
                            style={{ height: `${Math.min(100, (parseInt(sessionData.monitoreo.fcAntesEntrenamiento) || 70) / 2)}%` }}
                          />
                          <span className="text-[10px] text-slate-500 mt-1">Antes</span>
                          <span className="text-xs font-bold text-blue-600">{sessionData.monitoreo.fcAntesEntrenamiento || '70'}</span>
                        </div>
                        {/* Durante */}
                        <div className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-red-500 to-orange-400 rounded-t-lg transition-all duration-500"
                            style={{ height: `${Math.min(100, (parseInt(sessionData.monitoreo.fcDuranteEntrenamiento) || 150) / 2)}%` }}
                          />
                          <span className="text-[10px] text-slate-500 mt-1">Durante</span>
                          <span className="text-xs font-bold text-red-600">{sessionData.monitoreo.fcDuranteEntrenamiento || '150'}</span>
                        </div>
                        {/* Después */}
                        <div className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-green-400 to-emerald-300 rounded-t-lg transition-all duration-500"
                            style={{ height: `${Math.min(100, (parseInt(sessionData.monitoreo.fcDespuesEntrenamiento) || 90) / 2)}%` }}
                          />
                          <span className="text-[10px] text-slate-500 mt-1">Después</span>
                          <span className="text-xs font-bold text-green-600">{sessionData.monitoreo.fcDespuesEntrenamiento || '90'}</span>
                        </div>
                        {/* Recuperación */}
                        <div className="flex flex-col items-center flex-1">
                          <div 
                            className="w-full bg-gradient-to-t from-purple-400 to-indigo-300 rounded-t-lg transition-all duration-500"
                            style={{ height: `${Math.min(100, (parseInt(sessionData.monitoreo.fcRecuperacion5min) || 75) / 2)}%` }}
                          />
                          <span className="text-[10px] text-slate-500 mt-1">Recup. 5min</span>
                          <span className="text-xs font-bold text-purple-600">{sessionData.monitoreo.fcRecuperacion5min || '75'}</span>
                        </div>
                      </div>
                      {/* Inputs */}
                      <div className="grid grid-cols-4 gap-2 mt-4">
                        <Input
                          type="number"
                          value={sessionData.monitoreo.fcAntesEntrenamiento}
                          onChange={(e) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, fcAntesEntrenamiento: e.target.value }
                          }))}
                          placeholder="70"
                          className="text-center h-8 text-xs"
                        />
                        <Input
                          type="number"
                          value={sessionData.monitoreo.fcDuranteEntrenamiento}
                          onChange={(e) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, fcDuranteEntrenamiento: e.target.value }
                          }))}
                          placeholder="150"
                          className="text-center h-8 text-xs"
                        />
                        <Input
                          type="number"
                          value={sessionData.monitoreo.fcDespuesEntrenamiento}
                          onChange={(e) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, fcDespuesEntrenamiento: e.target.value }
                          }))}
                          placeholder="90"
                          className="text-center h-8 text-xs"
                        />
                        <Input
                          type="number"
                          value={sessionData.monitoreo.fcRecuperacion5min}
                          onChange={(e) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, fcRecuperacion5min: e.target.value }
                          }))}
                          placeholder="75"
                          className="text-center h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FC Reposo, Media y Máxima */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <Heart className="w-5 h-5 text-blue-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 mb-1">FC Reposo</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcReposo}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcReposo: e.target.value }
                        }))}
                        placeholder="60"
                        className="text-center text-lg font-bold h-10 border-0 bg-transparent"
                      />
                      <span className="text-[10px] text-slate-400">bpm</span>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-4 text-center">
                      <Activity className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 mb-1">FC Media</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcMedia}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMedia: e.target.value }
                        }))}
                        placeholder="135"
                        className="text-center text-lg font-bold h-10 border-0 bg-transparent"
                      />
                      <span className="text-[10px] text-slate-400">bpm</span>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center">
                      <TrendingUp className="w-5 h-5 text-red-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 mb-1">FC Máxima</p>
                      <Input
                        type="number"
                        value={sessionData.monitoreo.fcMaxima}
                        onChange={(e) => setSessionData(prev => ({
                          ...prev,
                          monitoreo: { ...prev.monitoreo, fcMaxima: e.target.value }
                        }))}
                        placeholder="180"
                        className="text-center text-lg font-bold h-10 border-0 bg-transparent"
                      />
                      <span className="text-[10px] text-slate-400">bpm</span>
                    </div>
                  </div>

                  {/* Estado del Deportista */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Battery className="w-4 h-4 text-green-500" />
                      Estado del Deportista
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Nivel de Fatiga */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Nivel de Fatiga
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.nivelFatiga > 70 ? 'text-red-600' :
                            sessionData.monitoreo.nivelFatiga > 40 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {sessionData.monitoreo.nivelFatiga}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.nivelFatiga]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, nivelFatiga: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-gradient-to-r [&>span]:from-green-500 [&>span]:via-amber-500 [&>span]:to-red-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Bajo</span>
                          <span>Alto</span>
                        </div>
                      </div>

                      {/* Nivel de Hidratación */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-500" />
                            Hidratación
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.nivelHidratacion < 50 ? 'text-red-600' :
                            sessionData.monitoreo.nivelHidratacion < 70 ? 'text-amber-600' :
                            'text-blue-600'
                          }`}>
                            {sessionData.monitoreo.nivelHidratacion}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.nivelHidratacion]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, nivelHidratacion: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-gradient-to-r [&>span]:from-red-500 [&>span]:via-amber-500 [&>span]:to-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Deshidratado</span>
                          <span>Óptimo</span>
                        </div>
                      </div>

                      {/* Calidad de Sueño */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Moon className="w-3 h-3 text-indigo-500" />
                            Calidad de Sueño
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.calidadSueno < 50 ? 'text-red-600' :
                            sessionData.monitoreo.calidadSueno < 70 ? 'text-amber-600' :
                            'text-indigo-600'
                          }`}>
                            {sessionData.monitoreo.calidadSueno}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.calidadSueno]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, calidadSueno: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-indigo-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Malo</span>
                          <span>Excelente</span>
                        </div>
                      </div>

                      {/* Nivel de Energía */}
                      <div className="bg-slate-50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            Nivel de Energía
                          </span>
                          <span className={`text-xs font-bold ${
                            sessionData.monitoreo.nivelEnergia < 40 ? 'text-red-600' :
                            sessionData.monitoreo.nivelEnergia < 60 ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {sessionData.monitoreo.nivelEnergia}%
                          </span>
                        </div>
                        <Slider
                          value={[sessionData.monitoreo.nivelEnergia]}
                          onValueChange={(v) => setSessionData(prev => ({
                            ...prev,
                            monitoreo: { ...prev.monitoreo, nivelEnergia: v[0] }
                          }))}
                          max={100}
                          step={5}
                          className="[&>span]:bg-gradient-to-r [&>span]:from-red-500 [&>span]:via-yellow-500 [&>span]:to-green-500"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                          <span>Bajo</span>
                          <span>Alto</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Retroalimentación */}
              <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-base text-slate-800">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    Observaciones y Retroalimentación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 bg-white">
                  <Textarea
                    value={sessionData.retroalimentacion}
                    onChange={(e) => setSessionData(prev => ({ ...prev, retroalimentacion: e.target.value }))}
                    placeholder="Observaciones y comentarios de la sesión..."
                    className="min-h-[100px] resize-none bg-white border-slate-200 focus:border-indigo-400"
                    data-testid="retroalimentacion"
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Footer con botones mejorado */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center shadow-lg">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleGenerateShareLink}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                data-testid="share-session-btn"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={onClose}
                className="border-slate-300"
                data-testid="cancel-session-btn"
              >
                Cancelar
              </Button>
              <Button 
                variant="outline"
                onClick={handleExportPDF}
                disabled={exporting}
                className="border-amber-400 text-amber-700 hover:bg-amber-50"
                data-testid="export-session-btn"
              >
                {exporting ? (
                  <>
                    <Activity className="w-4 h-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar PDF
                  </>
                )}
              </Button>
              <Button 
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md"
                onClick={handleSave}
                data-testid="save-session-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                Guardar Sesión
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de compartir enlace */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md bg-white p-0 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Link2 className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-white text-lg font-bold">Compartir Sesión</DialogTitle>
                <p className="text-purple-100 text-sm mt-1">
                  El deportista podrá ver la sesión sin necesidad de iniciar sesión
                </p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Enlace para compartir:</label>
              <div className="flex gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="bg-slate-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className={linkCopied ? 'border-green-500 text-green-600' : 'border-slate-300'}
                >
                  {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Vista del deportista</p>
                  <p className="text-xs text-blue-600 mt-1">
                    El deportista verá la sesión completa con objetivos, ejercicios y parámetros de entrenamiento.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowShareDialog(false)}
              >
                Cerrar
              </Button>
              <Button
                onClick={handleCopyLink}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copiar Enlace
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SessionEditor;
