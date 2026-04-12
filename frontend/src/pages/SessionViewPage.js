import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { 
  Target, Zap, Heart, Calendar, Activity, Clock, 
  User, Eye, AlertCircle, Dumbbell, Download, ChevronDown, MapPin, LayoutGrid
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const DM = "'DM Sans', sans-serif";
const BC = "'Barlow Condensed', sans-serif";

const CAP = { fuerza:'Fuerza', resistencia:'Resistencia', velocidad:'Velocidad', flexibilidad:'Flexibilidad', coordinacion:'Coordinación', potencia:'Potencia', agilidad:'Agilidad', equilibrio:'Equilibrio' };
const MET = { continuo:'Continuo', intervalico:'Interválico', repeticiones:'Repeticiones', circuito:'Circuito', piramidal:'Piramidal', ondulatorio:'Ondulatorio', fartlek:'Fartlek', series:'Series' };
const ORG = { individual:'Individual', parejas:'Parejas', grupos:'Grupos', equipo:'Equipo' };

const SessionViewPage = () => {
  const { shareId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${API_URL}/api/sessions/view/${shareId}`);
        if (!r.ok) throw new Error(r.status === 404 ? 'Sesión no encontrada' : r.status === 410 ? 'El enlace ha expirado' : 'Error al cargar');
        setData(await r.json());
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    };
    if (shareId) load();
  }, [shareId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0a0a0f',fontFamily:DM}}>
      <div className="text-center">
        <Activity className="w-8 h-8 animate-spin mx-auto mb-3" style={{color:'#CCFF00'}} />
        <p className="text-white/50 text-sm">Cargando sesión...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0a0a0f',fontFamily:DM}}>
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{background:'rgba(239,68,68,0.15)'}}>
          <AlertCircle className="w-7 h-7 text-red-400" />
        </div>
        <h2 className="text-lg font-bold text-white mb-1">{error}</h2>
        <p className="text-white/40 text-sm">El enlace puede haber expirado o la sesión fue eliminada.</p>
      </div>
    </div>
  );

  const session = data?.session_data?.detailedData || {};
  const obj = session.objetivos || {};
  const phases = session.fases || {};
  const mon = session.monitoreo || {};
  const feedback = session.retroalimentacion || '';

  const phaseColors = {
    inicial: { accent: '#CCFF00', bg: 'rgba(204,255,0,0.06)', border: 'rgba(204,255,0,0.2)' },
    principal: { accent: '#fff', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' },
    final: { accent: '#3B82F6', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.2)' }
  };
  const phaseNames = { inicial: 'Fase inicial', principal: 'Fase principal', final: 'Fase final' };

  return (
    <div className="min-h-screen" style={{background:'#0a0a0f',fontFamily:DM}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)',borderBottom:'1px solid rgba(204,255,0,0.08)'}}>
        <div className="max-w-4xl mx-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:'#CCFF00'}}>
                <span className="text-[20px] font-black" style={{color:'#0f172a',fontFamily:BC}}>i</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{session.sessionName || 'Sesión de entrenamiento'}</h1>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{background:'#9EFF00',color:'#0f0f13',fontFamily:BC}}>{shareId?.split('-').slice(0,2).join('-') || 'SES-001'}</span>
                </div>
                <div className="flex items-center gap-4 mt-0.5" style={{color:'rgba(255,255,255,0.4)',fontSize:'12px'}}>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{data?.athlete_name || 'Deportista'}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{data?.session_data?.date || 'Sin fecha'}</span>
                  {session.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration} min</span>}
                  {session.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.location}</span>}
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{data?.views || 1} vistas</span>
                </div>
              </div>
            </div>
            {data?.session_image && (
              <button onClick={() => { const a=document.createElement('a'); a.href=data.session_image; a.download=`iTRAIN_${shareId}.png`; a.click(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all" 
                style={{background:'rgba(204,255,0,0.1)',color:'#CCFF00',border:'1px solid rgba(204,255,0,0.2)'}}>
                <Download className="w-3.5 h-3.5" /> Descargar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">

        {/* Objetivos */}
        {Object.values(obj).some(v => v) && (
          <Card className="border-0 overflow-hidden rounded-2xl" style={{background:'#12131a',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}><Target className="w-3 h-3 text-slate-900" /></div>
              <span className="text-[14px] font-semibold text-white">Objetivos de la sesión</span>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { k:'general', l:'OBJETIVO GENERAL' }, { k:'fisico', l:'OBJETIVO FÍSICO' },
                  { k:'tecnico', l:'OBJETIVO TÉCNICO' }, { k:'tactico', l:'OBJETIVO TÁCTICO' },
                  { k:'psicologico', l:'OBJETIVO PSICOLÓGICO' }, { k:'teorico', l:'OBJETIVO TEÓRICO' }
                ].filter(o => obj[o.k]).map(o => (
                  <div key={o.k} className="rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.05)'}}>
                    <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',color:'rgba(204,255,0,0.5)',marginBottom:'4px'}}>{o.l}</p>
                    <p className="text-white/80 text-[13px]">{obj[o.k]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estructura */}
        <Card className="border-0 overflow-hidden rounded-2xl" style={{background:'#12131a',border:'1px solid rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}><Zap className="w-3 h-3 text-slate-900" /></div>
            <span className="text-[14px] font-semibold text-white">Estructura de la sesión</span>
          </div>
          <CardContent className="p-5 space-y-4">
            {Object.entries(phases).map(([key, phase]) => {
              const acts = phase.actividades || [];
              if (acts.length === 0) return null;
              const c = phaseColors[key];
              return (
                <div key={key} className="rounded-xl overflow-hidden" style={{background:c.bg,border:`1px solid ${c.border}`}}>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{borderBottom:`1px solid ${c.border}`}}>
                    <ChevronDown className="w-3.5 h-3.5" style={{color:c.accent}} />
                    <span style={{fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:c.accent}}>{phaseNames[key]}</span>
                    <span style={{fontSize:'11px',color:'rgba(255,255,255,0.3)'}}>{acts.length} actividades</span>
                  </div>
                  <div className="divide-y" style={{borderColor:'rgba(255,255,255,0.04)'}}>
                    {acts.map((act, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" style={{color:c.accent}} />
                              <span className="text-white font-semibold text-[13px] truncate">{act.ejercicio || 'Sin ejercicio'}</span>
                              {act.capacidadFisica && <span className="text-[8px] px-2 py-0.5 rounded-full flex-shrink-0" style={{background:'rgba(204,255,0,0.1)',color:'rgba(204,255,0,0.7)',border:'1px solid rgba(204,255,0,0.15)'}}>{CAP[act.capacidadFisica] || act.capacidadFisica}</span>}
                            </div>
                            {act.descripcion && <p className="text-white/30 text-[11px] mb-2">{act.descripcion}</p>}
                            {/* Stats row */}
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {act.metodo && <div className="text-[10px]"><span className="text-white/30">Método: </span><span className="text-white/70">{MET[act.metodo] || act.metodo}</span></div>}
                              {act.series > 0 && <div className="text-[10px]"><span className="text-white/30">Series: </span><span className="text-white/70 font-semibold">{act.series}</span></div>}
                              {act.repeticiones && <div className="text-[10px]"><span className="text-white/30">Reps: </span><span className="text-white/70 font-semibold">{act.repeticiones}</span></div>}
                              {act.intensidad > 0 && (
                                <div className="text-[10px] flex items-center gap-1.5">
                                  <span className="text-white/30">Intensidad:</span>
                                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{background:'rgba(255,255,255,0.1)'}}>
                                    <div className="h-full rounded-full" style={{width:`${act.intensidad}%`,background: act.intensidad > 80 ? '#ef4444' : act.intensidad > 60 ? '#f59e0b' : '#22c55e'}} />
                                  </div>
                                  <span className="text-white/70 font-semibold">{act.intensidad}%</span>
                                </div>
                              )}
                              {act.volumen && <div className="text-[10px]"><span className="text-white/30">Vol: </span><span className="text-white/70">{act.volumen}</span></div>}
                              {act.recuperacion && <div className="text-[10px]"><span className="text-white/30">Rec: </span><span className="text-white/70">{act.recuperacion}</span></div>}
                              {act.procOrganizativo && <div className="text-[10px]"><span className="text-white/30">Org: </span><span className="text-white/70">{ORG[act.procOrganizativo] || act.procOrganizativo}</span></div>}
                            </div>
                            {/* Materiales */}
                            {act.materiales?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {act.materiales.map((m, mi) => (
                                  <span key={mi} className="text-[8px] px-1.5 py-0.5 rounded-full" style={{background:'rgba(168,85,247,0.1)',color:'rgba(168,85,247,0.7)',border:'1px solid rgba(168,85,247,0.15)'}}>{m}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Board thumbnail */}
                          {act.boardThumbnail && (
                            <div className="w-[100px] h-[70px] flex-shrink-0 rounded-lg border overflow-hidden" style={{borderColor:'rgba(255,255,255,0.08)',background:'#fff'}} dangerouslySetInnerHTML={{__html: act.boardThumbnail}} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!Object.values(phases).some(p => p.actividades?.length > 0) && (
              <p className="text-white/20 text-center py-6 text-sm">Sin actividades definidas</p>
            )}
          </CardContent>
        </Card>

        {/* Monitoreo */}
        {(mon.fcReposo || mon.fcMaxima || mon.fcAntesEntrenamiento) && (
          <Card className="border-0 overflow-hidden rounded-2xl" style={{background:'#12131a',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}><Heart className="w-3 h-3 text-slate-900" /></div>
              <span className="text-[14px] font-semibold text-white">Monitoreo de rendimiento</span>
            </div>
            <CardContent className="p-5 space-y-4">
              {/* FC por fases */}
              {(mon.fcAntesEntrenamiento || mon.fcDuranteEntrenamiento) && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[
                    { l:'Antes', v:mon.fcAntesEntrenamiento, c:'#3b82f6' },
                    { l:'Durante', v:mon.fcDuranteEntrenamiento, c:'#ef4444' },
                    { l:'Después', v:mon.fcDespuesEntrenamiento, c:'#22c55e' },
                    { l:"Recup 1'", v:mon.fcRecuperacion1min, c:'#14b8a6' },
                    { l:"Recup 3'", v:mon.fcRecuperacion3min, c:'#a855f7' },
                    { l:"Recup 5'", v:mon.fcRecuperacion5min, c:'#6366f1' },
                  ].filter(x => x.v).map((x, i) => (
                    <div key={i} className="text-center rounded-xl p-3" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{background:x.c}} />
                      <p style={{fontSize:'8px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:x.c}}>{x.l}</p>
                      <p className="text-xl font-bold text-white mt-0.5">{x.v}</p>
                      <p className="text-[9px] text-white/30">bpm</p>
                    </div>
                  ))}
                </div>
              )}
              {/* FC Reposo/Media/Max */}
              {(mon.fcReposo || mon.fcMedia || mon.fcMaxima) && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l:'FC Reposo', v:mon.fcReposo, c:'#CCFF00' },
                    { l:'FC Media', v:mon.fcMedia, c:'#f59e0b' },
                    { l:'FC Máxima', v:mon.fcMaxima, c:'#ef4444' }
                  ].filter(x => x.v).map((x, i) => (
                    <div key={i} className="text-center rounded-xl p-4" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                      <p style={{fontSize:'9px',fontWeight:600,textTransform:'uppercase',color:x.c}}>{x.l}</p>
                      <p className="text-3xl font-bold text-white mt-1">{x.v}</p>
                      <p className="text-[10px] text-white/30">bpm</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Observaciones */}
        {feedback && (
          <Card className="border-0 overflow-hidden rounded-2xl" style={{background:'#12131a',border:'1px solid rgba(255,255,255,0.06)'}}>
            <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:'#CCFF00'}}><AlertCircle className="w-3 h-3 text-slate-900" /></div>
              <span className="text-[14px] font-semibold text-white">Observaciones</span>
            </div>
            <CardContent className="p-5">
              <p className="text-white/70 text-[13px] leading-relaxed">{feedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:'#CCFF00'}}>
              <span className="text-[10px] font-black" style={{color:'#0f172a',fontFamily:BC}}>i</span>
            </div>
            <span className="text-white/20 text-xs">Generado con <span style={{color:'#CCFF00',fontWeight:600}}>iTRAIN</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionViewPage;
