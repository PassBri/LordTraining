import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  Target, Zap, Heart, Calendar, Activity, Clock, 
  User, Eye, AlertCircle, Dumbbell, Check, Download, Image
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Mapeo de IDs a nombres legibles
const CAPACIDADES_FISICAS = {
  fuerza: 'Fuerza',
  resistencia: 'Resistencia',
  velocidad: 'Velocidad',
  flexibilidad: 'Flexibilidad',
  coordinacion: 'Coordinación',
  potencia: 'Potencia',
  agilidad: 'Agilidad',
  equilibrio: 'Equilibrio'
};

const METODOS = {
  continuo: 'Continuo',
  intervalico: 'Interválico',
  repeticiones: 'Repeticiones',
  circuito: 'Circuito',
  piramidal: 'Piramidal',
  ondulatorio: 'Ondulatorio',
  fartlek: 'Fartlek',
  series: 'Series'
};

const SessionViewPage = () => {
  const { shareId } = useParams();
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('image'); // 'image' or 'details'

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${API_URL}/api/sessions/view/${shareId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Sesión no encontrada');
          } else if (response.status === 410) {
            throw new Error('El enlace ha expirado');
          }
          throw new Error('Error al cargar la sesión');
        }
        
        const data = await response.json();
        setSessionData(data);
        // Si no hay imagen, mostrar detalles por defecto
        if (!data.session_image) {
          setViewMode('details');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchSession();
    }
  }, [shareId]);

  // Descargar imagen
  const handleDownloadImage = () => {
    if (sessionData?.session_image) {
      const link = document.createElement('a');
      link.href = sessionData.session_image;
      link.download = `sesion_${sessionData?.athlete_name || 'entrenamiento'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-0 shadow-lg">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
            <p className="text-slate-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const session = sessionData?.session_data?.detailedData || {};
  const objectives = session.objetivos || {};
  const phases = session.fases || {};
  const monitoring = session.monitoreo || {};
  const feedback = session.retroalimentacion || '';
  const hasImage = !!sessionData?.session_image;

  const phaseConfig = {
    inicial: { name: 'Fase Inicial (Calentamiento)', color: 'bg-green-500', bgLight: 'bg-green-50', textColor: 'text-green-700' },
    principal: { name: 'Fase Principal', color: 'bg-orange-500', bgLight: 'bg-orange-50', textColor: 'text-orange-700' },
    final: { name: 'Fase Final (Vuelta a la calma)', color: 'bg-blue-500', bgLight: 'bg-blue-50', textColor: 'text-blue-700' }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Dumbbell className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Sesión de Entrenamiento</h1>
                <div className="flex items-center gap-4 text-blue-100 text-sm mt-1">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {sessionData?.athlete_name || 'Atleta'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {sessionData?.session_data?.date || 'Fecha no especificada'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {sessionData?.views || 1} vistas
                  </span>
                </div>
              </div>
            </div>
            
            {/* Botones de acción */}
            <div className="flex items-center gap-2">
              {hasImage && (
                <>
                  <div className="flex bg-white/10 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('image')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'image' 
                          ? 'bg-white text-indigo-600' 
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <Image className="w-4 h-4 inline mr-1" />
                      Imagen
                    </button>
                    <button
                      onClick={() => setViewMode('details')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        viewMode === 'details' 
                          ? 'bg-white text-indigo-600' 
                          : 'text-white/80 hover:text-white'
                      }`}
                    >
                      <Target className="w-4 h-4 inline mr-1" />
                      Detalles
                    </button>
                  </div>
                  <Button
                    onClick={handleDownloadImage}
                    className="bg-white/20 hover:bg-white/30 text-white border-0"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Vista de Imagen */}
        {viewMode === 'image' && hasImage && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <img 
              src={sessionData.session_image} 
              alt="Sesión de Entrenamiento"
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Vista de Detalles */}
        {viewMode === 'details' && (
          <div className="space-y-6">
            {/* Objetivos */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 border-b">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  Objetivos de la Sesión
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'Objetivo General', value: objectives.general },
                    { label: 'Objetivo Físico', value: objectives.fisico },
                    { label: 'Objetivo Técnico', value: objectives.tecnico },
                    { label: 'Objetivo Táctico', value: objectives.tactico },
                    { label: 'Objetivo Psicológico', value: objectives.psicologico },
                    { label: 'Objetivo Teórico', value: objectives.teorico }
                  ].filter(obj => obj.value).map((obj, idx) => (
                    <div key={idx} className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{obj.label}</p>
                      <p className="text-slate-800">{obj.value}</p>
                    </div>
                  ))}
                </div>
                {!Object.values(objectives).some(v => v) && (
                  <p className="text-slate-400 text-center py-4">No se han definido objetivos para esta sesión</p>
                )}
              </CardContent>
            </Card>

            {/* Estructura de la Sesión */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  Estructura de la Sesión
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {Object.entries(phases).map(([phaseKey, phase]) => {
                  const config = phaseConfig[phaseKey];
                  const activities = phase.actividades || [];
                  
                  if (activities.length === 0) return null;
                  
                  return (
                    <div key={phaseKey} className={`rounded-xl overflow-hidden border-l-4 ${config.color.replace('bg-', 'border-')}`}>
                      <div className={`${config.bgLight} px-4 py-3`}>
                        <h3 className={`font-bold uppercase text-sm ${config.textColor}`}>
                          {config.name}
                        </h3>
                        <p className="text-xs text-slate-500">{activities.length} actividades</p>
                      </div>
                      
                      <div className="bg-white overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                              <th className="py-3 px-4 font-semibold">Ejercicio</th>
                              <th className="py-3 px-3 font-semibold">Cap. Física</th>
                              <th className="py-3 px-3 font-semibold">Método</th>
                              <th className="py-3 px-3 font-semibold text-center">Series</th>
                              <th className="py-3 px-3 font-semibold text-center">Reps</th>
                              <th className="py-3 px-3 font-semibold text-center">Intensidad</th>
                              <th className="py-3 px-3 font-semibold">Volumen</th>
                              <th className="py-3 px-3 font-semibold">Recuperación</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activities.map((act, idx) => (
                              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <Check className={`w-4 h-4 ${config.textColor}`} />
                                    <span className="font-medium text-slate-800">{act.ejercicio || '-'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  {CAPACIDADES_FISICAS[act.capacidadFisica] || act.capacidadFisica || '-'}
                                </td>
                                <td className="py-3 px-3 text-slate-600">
                                  {METODOS[act.metodo] || act.metodo || '-'}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="bg-slate-100 px-2 py-1 rounded font-medium">{act.series || '-'}</span>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className="bg-slate-100 px-2 py-1 rounded font-medium">{act.repeticiones || '-'}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden max-w-[60px]">
                                      <div 
                                        className={`h-full transition-all ${
                                          act.intensidad > 80 ? 'bg-red-500' :
                                          act.intensidad > 60 ? 'bg-orange-500' :
                                          act.intensidad > 40 ? 'bg-yellow-500' :
                                          'bg-green-500'
                                        }`}
                                        style={{ width: `${act.intensidad || 0}%` }}
                                      />
                                    </div>
                                    <span className="text-xs font-medium w-8">{act.intensidad || 0}%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-600">{act.volumen || '-'}</td>
                                <td className="py-3 px-3 text-slate-600">{act.recuperacion || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
                
                {!Object.values(phases).some(p => p.actividades?.length > 0) && (
                  <p className="text-slate-400 text-center py-8">No hay actividades definidas para esta sesión</p>
                )}
              </CardContent>
            </Card>

            {/* Monitoreo de Rendimiento */}
            {(monitoring.fcReposo || monitoring.fcMaxima || monitoring.fcAntesEntrenamiento || monitoring.fatiga) && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                      <Activity className="w-5 h-5" />
                    </div>
                    Monitoreo de Rendimiento
                    <span className="text-sm font-normal opacity-80 ml-auto">Datos de frecuencia cardíaca y biométricos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  
                  {/* FC por Fases */}
                  {(monitoring.fcAntesEntrenamiento || monitoring.fcDuranteEntrenamiento || monitoring.fcDespuesEntrenamiento) && (
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
                        <Heart className="w-5 h-5 text-red-500" />
                        FRECUENCIA CARDÍACA POR FASES
                      </h3>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                          { label: 'ANTES', value: monitoring.fcAntesEntrenamiento, color: 'border-blue-400 bg-blue-50' },
                          { label: 'DURANTE', value: monitoring.fcDuranteEntrenamiento, color: 'border-green-400 bg-green-50' },
                          { label: 'DESPUÉS', value: monitoring.fcDespuesEntrenamiento, color: 'border-lime-400 bg-lime-50' },
                          { label: "RECUP 1'", value: monitoring.fcRecuperacion1min, color: 'border-slate-400 bg-slate-50' },
                          { label: "RECUP 3'", value: monitoring.fcRecuperacion3min, color: 'border-slate-400 bg-slate-50' },
                          { label: "RECUP 5'", value: monitoring.fcRecuperacion5min, color: 'border-slate-400 bg-slate-50' }
                        ].filter(item => item.value).map((item, idx) => (
                          <div key={idx} className={`text-center p-3 rounded-xl border-2 ${item.color}`}>
                            <p className="text-xs font-semibold text-slate-500 mb-1">{item.label}</p>
                            <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                            <p className="text-xs text-slate-400">bpm</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* FC Reposo, Media, Máxima */}
                  {(monitoring.fcReposo || monitoring.fcMedia || monitoring.fcMaxima) && (
                    <div className="grid grid-cols-3 gap-4">
                      {monitoring.fcReposo && (
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                          <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Heart className="w-7 h-7 text-white" />
                          </div>
                          <p className="text-sm font-bold text-blue-600 mb-2">FC REPOSO</p>
                          <p className="text-4xl font-bold text-slate-800">{monitoring.fcReposo}</p>
                          <p className="text-sm text-blue-500 mt-1">bpm</p>
                        </div>
                      )}
                      {monitoring.fcMedia && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 text-center">
                          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-7 h-7 text-white" />
                          </div>
                          <p className="text-sm font-bold text-amber-600 mb-2">FC MEDIA</p>
                          <p className="text-4xl font-bold text-slate-800">{monitoring.fcMedia}</p>
                          <p className="text-sm text-amber-500 mt-1">bpm</p>
                        </div>
                      )}
                      {monitoring.fcMaxima && (
                        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
                          <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-7 h-7 text-white" />
                          </div>
                          <p className="text-sm font-bold text-red-600 mb-2">FC MÁXIMA</p>
                          <p className="text-4xl font-bold text-slate-800">{monitoring.fcMaxima}</p>
                          <p className="text-sm text-red-500 mt-1">bpm</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Estado del Deportista */}
                  {(monitoring.fatiga || monitoring.hidratacion || monitoring.calidadSueno || monitoring.nivelEnergia) && (
                    <div>
                      <h3 className="flex items-center gap-2 font-semibold text-slate-700 mb-4">
                        <User className="w-5 h-5 text-indigo-500" />
                        ESTADO DEL DEPORTISTA
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { label: 'Nivel de Fatiga', value: monitoring.fatiga, color: 'from-green-500 via-yellow-500 to-red-500', low: 'Bajo', high: 'Alto' },
                          { label: 'Hidratación', value: monitoring.hidratacion, color: 'from-red-500 via-gray-400 to-blue-500', low: 'Deshidratado', high: 'Óptimo' },
                          { label: 'Calidad de Sueño', value: monitoring.calidadSueno, color: 'from-indigo-600 to-indigo-400', low: 'Malo', high: 'Excelente' },
                          { label: 'Nivel de Energía', value: monitoring.nivelEnergia, color: 'from-red-500 via-yellow-500 to-green-500', low: 'Bajo', high: 'Alto' }
                        ].filter(item => item.value).map((item, idx) => (
                          <div key={idx} className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-slate-600">{item.label}</span>
                              <span className="text-sm font-bold text-slate-800">{item.value}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all`}
                                style={{ width: `${item.value}%` }}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="text-xs text-slate-400">{item.low}</span>
                              <span className="text-xs text-slate-400">{item.high}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Observaciones */}
            {feedback && (
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
                  <CardTitle className="flex items-center gap-3 text-slate-800 text-base">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-white" />
                    </div>
                    Observaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5">
                  <p className="text-slate-700">{feedback}</p>
                </CardContent>
              </Card>
            )}

            {/* Footer */}
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">
                Sesión generada con <span className="font-semibold text-blue-500">Sistema TRAIN</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionViewPage;
