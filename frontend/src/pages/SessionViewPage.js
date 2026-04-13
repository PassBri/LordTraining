import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { 
  Target, Zap, Heart, Calendar, Activity, Clock, 
  User, Eye, AlertCircle, Dumbbell, Download, ChevronDown, MapPin, LayoutGrid, Sun, Moon
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const DM = "'DM Sans', sans-serif";
const BC = "'Barlow Condensed', sans-serif";

const CAP = { fuerza:'Fuerza', resistencia:'Resistencia', velocidad:'Velocidad', flexibilidad:'Flexibilidad', coordinacion:'Coordinación', potencia:'Potencia', agilidad:'Agilidad', equilibrio:'Equilibrio' };
const MET = { continuo:'Continuo', intervalico:'Interválico', repeticiones:'Repeticiones', circuito:'Circuito', piramidal:'Piramidal', ondulatorio:'Ondulatorio', fartlek:'Fartlek', series:'Series' };
const ORG = { individual:'Individual', parejas:'Parejas', grupos:'Grupos', equipo:'Equipo' };

// Paletas de colores
const DARK = {
  bg: '#0a0a0f', headerBg: 'linear-gradient(135deg, #0a0a0f 0%, #14151e 100%)', headerBorder: 'rgba(204,255,0,0.08)',
  card: '#12131a', cardBorder: 'rgba(255,255,255,0.06)', sectionBorder: 'rgba(255,255,255,0.06)',
  title: '#fff', text: 'rgba(255,255,255,0.8)', muted: 'rgba(255,255,255,0.4)', subtle: 'rgba(255,255,255,0.3)',
  label: 'rgba(204,255,0,0.5)', cellBg: 'rgba(255,255,255,0.03)', cellBorder: 'rgba(255,255,255,0.06)',
  barBg: 'rgba(255,255,255,0.08)', badge: '#9EFF00', badgeText: '#0f0f13', accent: '#CCFF00',
  logoCircle: '#CCFF00', logoText: '#0f172a', boardBg: '#fff'
};
const LIGHT = {
  bg: '#ffffff', headerBg: '#f8f9fb', headerBorder: '#e5e7eb',
  card: '#f9fafb', cardBorder: '#e5e7eb', sectionBorder: '#e5e7eb',
  title: '#111827', text: '#374151', muted: '#6b7280', subtle: '#9ca3af',
  label: '#4d7c0f', cellBg: '#f3f4f6', cellBorder: '#e5e7eb',
  barBg: '#e5e7eb', badge: '#4d7c0f', badgeText: '#fff', accent: '#65a30d',
  logoCircle: '#CCFF00', logoText: '#0f172a', boardBg: '#fff'
};

const SessionViewPage = () => {
  const { shareId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const isLight = searchParams.get('theme') === 'light';
  const T = isLight ? LIGHT : DARK;
  const toggleTheme = () => setSearchParams(isLight ? {} : { theme: 'light' });

  const handleDownloadPDF = async (theme) => {
    if (downloading) return;
    setDownloading(theme);
    try {
      const response = await fetch(`${API_URL}/api/sessions/download-pdf/${shareId}?theme=${theme}`);
      if (!response.ok) throw new Error('Error');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `iTRAIN_${shareId}_${theme}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
    finally { setDownloading(null); }
  };

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
    <div className="min-h-screen flex items-center justify-center" style={{background:T.bg,fontFamily:DM}}>
      <Activity className="w-8 h-8 animate-spin" style={{color:T.accent}} />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:T.bg,fontFamily:DM}}>
      <div className="text-center max-w-sm">
        <AlertCircle className="w-10 h-10 mx-auto mb-3" style={{color:'#ef4444'}} />
        <h2 className="text-lg font-bold" style={{color:T.title}}>{error}</h2>
        <p className="text-sm mt-1" style={{color:T.muted}}>El enlace puede haber expirado.</p>
      </div>
    </div>
  );

  const session = data?.session_data?.detailedData || {};
  const obj = session.objetivos || {};
  const phases = session.fases || {};
  const mon = session.monitoreo || {};
  const feedback = session.retroalimentacion || '';

  const phaseTheme = {
    inicial: { accent: isLight ? '#4d7c0f' : '#CCFF00', bg: isLight ? 'rgba(77,124,15,0.05)' : 'rgba(204,255,0,0.06)', border: isLight ? 'rgba(77,124,15,0.2)' : 'rgba(204,255,0,0.2)' },
    principal: { accent: isLight ? '#374151' : '#fff', bg: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.04)', border: isLight ? '#e5e7eb' : 'rgba(255,255,255,0.1)' },
    final: { accent: '#3B82F6', bg: isLight ? 'rgba(59,130,246,0.04)' : 'rgba(59,130,246,0.06)', border: isLight ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.2)' }
  };
  const phaseNames = { inicial: 'Fase inicial', principal: 'Fase principal', final: 'Fase final' };

  return (
    <div className="min-h-screen" style={{background:T.bg,fontFamily:DM}} id="session-view-content">
      {/* Header */}
      <div style={{background:T.headerBg,borderBottom:`1px solid ${T.headerBorder}`}}>
        <div className="max-w-4xl mx-auto px-5 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:T.logoCircle}}>
                <span className="text-[20px] font-black" style={{color:T.logoText,fontFamily:BC}}>i</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold" style={{color:T.title}}>{session.sessionName || 'Sesión de entrenamiento'}</h1>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{background:T.badge,color:T.badgeText,fontFamily:BC}}>{shareId?.split('-').slice(0,2).join('-') || 'SES-001'}</span>
                </div>
                <div className="flex items-center gap-4 mt-0.5" style={{color:T.muted,fontSize:'12px'}}>
                  <span className="flex items-center gap-1"><User className="w-3 h-3" />{data?.athlete_name || 'Deportista'}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{data?.session_data?.date || 'Sin fecha'}</span>
                  {session.duration && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.duration} min</span>}
                  {session.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{session.location}</span>}
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{data?.views || 1} vistas</span>
                </div>
              </div>
            </div>
            <div id="download-btn" className="flex items-center gap-2">
              {/* Theme toggle */}
              <button onClick={toggleTheme} className="p-2 rounded-lg transition-all" style={{background: isLight ? '#f3f4f6' : 'rgba(255,255,255,0.06)', color: T.muted, border: `1px solid ${T.cardBorder}`}}>
                {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </button>
              {/* PDF Dark */}
              <button onClick={() => handleDownloadPDF('dark')} disabled={!!downloading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{background:'rgba(15,15,19,0.9)',color:'#CCFF00',border:'1px solid rgba(204,255,0,0.3)'}}>
                {downloading === 'dark' ? <Activity className="w-3 h-3 animate-spin" /> : <Moon className="w-3 h-3" />} PDF oscuro
              </button>
              {/* PDF Light */}
              <button onClick={() => handleDownloadPDF('light')} disabled={!!downloading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all"
                style={{background:'#f8f9fb',color:'#374151',border:'1px solid #d1d5db'}}>
                {downloading === 'light' ? <Activity className="w-3 h-3 animate-spin" /> : <Sun className="w-3 h-3" />} PDF claro
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-6 space-y-5">

        {/* Objetivos */}
        {Object.values(obj).some(v => v) && (
          <Card className="border-0 overflow-hidden rounded-2xl" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:`1px solid ${T.sectionBorder}`}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:T.accent}}><Target className="w-3 h-3" style={{color:T.logoText}} /></div>
              <span style={{fontSize:'14px',fontWeight:600,color:T.title}}>Objetivos de la sesión</span>
            </div>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { k:'general', l:'OBJETIVO GENERAL' }, { k:'fisico', l:'OBJETIVO FÍSICO' },
                  { k:'tecnico', l:'OBJETIVO TÉCNICO' }, { k:'tactico', l:'OBJETIVO TÁCTICO' },
                  { k:'psicologico', l:'OBJETIVO PSICOLÓGICO' }, { k:'teorico', l:'OBJETIVO TEÓRICO' }
                ].filter(o => obj[o.k]).map(o => (
                  <div key={o.k} className="rounded-xl p-3" style={{background:T.cellBg,border:`1px solid ${T.cellBorder}`}}>
                    <p style={{fontSize:'9px',fontWeight:600,letterSpacing:'0.08em',color:T.label,marginBottom:'4px'}}>{o.l}</p>
                    <p style={{color:T.text,fontSize:'13px'}}>{obj[o.k]}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estructura */}
        <Card className="border-0 overflow-hidden rounded-2xl" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
          <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:`1px solid ${T.sectionBorder}`}}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:T.accent}}><Zap className="w-3 h-3" style={{color:T.logoText}} /></div>
            <span style={{fontSize:'14px',fontWeight:600,color:T.title}}>Estructura de la sesión</span>
          </div>
          <CardContent className="p-5 space-y-4">
            {Object.entries(phases).map(([key, phase]) => {
              const acts = phase.actividades || [];
              if (acts.length === 0) return null;
              const c = phaseTheme[key];
              return (
                <div key={key} className="rounded-xl overflow-hidden" style={{background:c.bg,border:`1px solid ${c.border}`}}>
                  <div className="flex items-center gap-2 px-4 py-2.5" style={{borderBottom:`1px solid ${c.border}`}}>
                    <ChevronDown className="w-3.5 h-3.5" style={{color:c.accent}} />
                    <span style={{fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:c.accent}}>{phaseNames[key]}</span>
                    <span style={{fontSize:'11px',color:T.subtle}}>{acts.length} actividades</span>
                  </div>
                  <div className="divide-y" style={{borderColor:T.cellBorder}}>
                    {acts.map((act, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Dumbbell className="w-3.5 h-3.5 flex-shrink-0" style={{color:c.accent}} />
                              <span className="font-semibold text-[13px] truncate" style={{color:T.title}}>{act.ejercicio || 'Sin ejercicio'}</span>
                              {act.capacidadFisica && <span className="text-[8px] px-2 py-0.5 rounded-full flex-shrink-0" style={{background: isLight ? 'rgba(77,124,15,0.1)' : 'rgba(204,255,0,0.1)',color:T.label,border:`1px solid ${isLight ? 'rgba(77,124,15,0.2)' : 'rgba(204,255,0,0.15)'}`}}>{CAP[act.capacidadFisica] || act.capacidadFisica}</span>}
                            </div>
                            {act.descripcion && <p className="text-[11px] mb-2" style={{color:T.subtle}}>{act.descripcion}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {act.metodo && <div className="text-[10px]"><span style={{color:T.subtle}}>Método: </span><span style={{color:T.text}}>{MET[act.metodo] || act.metodo}</span></div>}
                              {act.series > 0 && <div className="text-[10px]"><span style={{color:T.subtle}}>Series: </span><span className="font-semibold" style={{color:T.text}}>{act.series}</span></div>}
                              {act.repeticiones && <div className="text-[10px]"><span style={{color:T.subtle}}>Reps: </span><span className="font-semibold" style={{color:T.text}}>{act.repeticiones}</span></div>}
                              {act.intensidad > 0 && (
                                <div className="text-[10px] flex items-center gap-1.5">
                                  <span style={{color:T.subtle}}>Intensidad:</span>
                                  <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{background:T.barBg}}>
                                    <div className="h-full rounded-full" style={{width:`${act.intensidad}%`,background: act.intensidad > 80 ? '#ef4444' : act.intensidad > 60 ? '#f59e0b' : '#22c55e'}} />
                                  </div>
                                  <span className="font-semibold" style={{color:T.text}}>{act.intensidad}%</span>
                                </div>
                              )}
                              {act.volumen && <div className="text-[10px]"><span style={{color:T.subtle}}>Vol: </span><span style={{color:T.text}}>{act.volumen}{act.unidadVolumen ? ` ${act.unidadVolumen}` : ''}</span></div>}
                              {act.densidad && <div className="text-[10px]"><span style={{color:T.subtle}}>Densidad: </span><span style={{color:T.text}}>{act.densidad}</span></div>}
                              {act.recuperacion && <div className="text-[10px]"><span style={{color:T.subtle}}>Rec: </span><span style={{color:T.text}}>{act.recuperacion}</span></div>}
                              {act.procOrganizativo && <div className="text-[10px]"><span style={{color:T.subtle}}>Org: </span><span style={{color:T.text}}>{ORG[act.procOrganizativo] || act.procOrganizativo}</span></div>}
                              {act.subtipo && <div className="text-[10px]"><span style={{color:T.subtle}}>Subtipo: </span><span style={{color:T.text}}>{act.subtipo}</span></div>}
                              {act.unidadIntensidad && <div className="text-[10px]"><span style={{color:T.subtle}}>Int. en: </span><span style={{color:T.text}}>{act.unidadIntensidad}</span></div>}
                              {act.complejidad && act.complejidad !== 3 && <div className="text-[10px]"><span style={{color:T.subtle}}>Complejidad: </span><span style={{color:T.text}}>{act.complejidad}/5</span></div>}
                              {act.frecuencia && <div className="text-[10px]"><span style={{color:T.subtle}}>Frecuencia: </span><span style={{color:T.text}}>{act.frecuencia}</span></div>}
                            </div>
                            {/* Métricas calculadas */}
                            {(() => {
                              const vol = parseFloat(act.volumen) || 0;
                              const int = parseFloat(act.intensidad) || 0;
                              const ser = parseFloat(act.series) || 0;
                              const ct = Math.round(vol * int / 100);
                              const cs = Math.round(ser * vol * int / 100);
                              if (ct <= 0) return null;
                              return (
                                <div className="flex flex-wrap gap-2 mt-2 pt-2" style={{borderTop:`1px solid ${T.cellBorder}`}}>
                                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: T.text}}>CT: {ct}</span>
                                  <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)', color: T.text}}>CS: {cs}</span>
                                  {act.progresion?.modelo && act.progresion.modelo !== 'lineal' && <span className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{background: isLight ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)', color: isLight ? '#059669' : '#34d399'}}>{act.progresion.modelo}</span>}
                                </div>
                              );
                            })()}
                            {act.materiales?.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2" style={{borderTop:`1px solid ${T.cellBorder}`}}>
                                <span className="text-[8px] font-bold uppercase tracking-wider mr-0.5" style={{color:T.subtle}}>Materiales:</span>
                                {act.materiales.map((m, mi) => (
                                  <span key={mi} className="text-[9px] font-medium px-2 py-0.5 rounded-md" style={{background: isLight ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.12)',color: isLight ? '#7c3aed' : 'rgba(168,85,247,0.8)',border:`1px solid ${isLight ? 'rgba(168,85,247,0.15)' : 'rgba(168,85,247,0.2)'}`}}>{m}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {act.boardThumbnail && (
                            <div className="w-[160px] h-[120px] flex-shrink-0 rounded-lg border overflow-hidden" style={{borderColor:T.cellBorder,background:T.boardBg}} dangerouslySetInnerHTML={{__html: act.boardThumbnail}} />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!Object.values(phases).some(p => p.actividades?.length > 0) && (
              <p className="text-center py-6 text-sm" style={{color:T.subtle}}>Sin actividades definidas</p>
            )}
          </CardContent>
        </Card>

        {/* Monitoreo */}
        {(mon.fcReposo || mon.fcMaxima || mon.fcAntesEntrenamiento || mon.nivelFatiga || mon.nivelEnergia) && (
          <Card className="border-0 overflow-hidden rounded-2xl" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:`1px solid ${T.sectionBorder}`}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:T.accent}}><Heart className="w-3 h-3" style={{color:T.logoText}} /></div>
              <span style={{fontSize:'14px',fontWeight:600,color:T.title}}>Monitoreo de rendimiento</span>
            </div>
            <CardContent className="p-5 space-y-5">
              {(mon.fcAntesEntrenamiento || mon.fcDuranteEntrenamiento) && (() => {
                const fcVisible = [
                  { l:'Antes', v:mon.fcAntesEntrenamiento, c:'#3b82f6' },
                  { l:'Durante', v:mon.fcDuranteEntrenamiento, c:'#ef4444' },
                  { l:'Después', v:mon.fcDespuesEntrenamiento, c:'#22c55e' },
                  { l:"Recup 1'", v:mon.fcRecuperacion1min, c:'#14b8a6' },
                  { l:"Recup 3'", v:mon.fcRecuperacion3min, c:'#a855f7' },
                  { l:"Recup 5'", v:mon.fcRecuperacion5min, c:'#6366f1' },
                ].filter(x => x.v);
                return (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{color:T.label}}>Frecuencia cardíaca por fases</p>
                  <div className={`grid gap-2 ${fcVisible.length <= 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-6'}`}>
                    {fcVisible.map((x, i) => (
                      <div key={i} className="text-center rounded-xl p-3" style={{background:T.cellBg,border:`1px solid ${T.cellBorder}`}}>
                        <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{background:x.c}} />
                        <p style={{fontSize:'8px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',color:x.c}}>{x.l}</p>
                        <p className="text-xl font-bold mt-0.5" style={{color:T.title}}>{x.v}</p>
                        <p className="text-[9px]" style={{color:T.subtle}}>bpm</p>
                      </div>
                    ))}
                  </div>
                </div>
                );
              })()}
              {(mon.fcReposo || mon.fcMedia || mon.fcMaxima) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{color:T.label}}>Frecuencia cardíaca general</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { l:'FC Reposo', v:mon.fcReposo, c: isLight ? '#16a34a' : '#CCFF00' },
                      { l:'FC Media', v:mon.fcMedia, c:'#f59e0b' },
                      { l:'FC Máxima', v:mon.fcMaxima, c:'#ef4444' }
                    ].filter(x => x.v).map((x, i) => (
                      <div key={i} className="text-center rounded-xl p-4" style={{background:T.cellBg,border:`1px solid ${T.cellBorder}`}}>
                        <p style={{fontSize:'9px',fontWeight:600,textTransform:'uppercase',color:x.c}}>{x.l}</p>
                        <p className="text-3xl font-bold mt-1" style={{color:T.title}}>{x.v}</p>
                        <p className="text-[10px]" style={{color:T.subtle}}>bpm</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {(mon.nivelFatiga || mon.nivelHidratacion || mon.calidadSueno || mon.nivelEnergia) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{color:T.label}}>Estado del deportista</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { l:'Nivel de fatiga', v:mon.nivelFatiga, from:'#22c55e', to:'#ef4444' },
                      { l:'Hidratación', v:mon.nivelHidratacion, from:'#ef4444', to:'#3b82f6' },
                      { l:'Calidad de sueño', v:mon.calidadSueno, from:'#6366f1', to:'#818cf8' },
                      { l:'Nivel de energía', v:mon.nivelEnergia, from:'#ef4444', to:'#22c55e' }
                    ].filter(x => x.v).map((x, i) => (
                      <div key={i} className="rounded-xl p-3" style={{background:T.cellBg,border:`1px solid ${T.cellBorder}`}}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[11px]" style={{color:T.muted}}>{x.l}</span>
                          <span className="text-[12px] font-bold" style={{color:T.title}}>{x.v}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{background:T.barBg}}>
                          <div className="h-full rounded-full" style={{width:`${x.v}%`,background:`linear-gradient(90deg, ${x.from}, ${x.to})`}} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {mon.dispositivoConectado && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background: isLight ? 'rgba(77,124,15,0.05)' : 'rgba(204,255,0,0.06)',border:`1px solid ${isLight ? 'rgba(77,124,15,0.15)' : 'rgba(204,255,0,0.1)'}`}}>
                  <Activity className="w-3.5 h-3.5" style={{color:T.accent}} />
                  <span className="text-[11px]" style={{color:T.muted}}>Dispositivo conectado: <span className="font-medium" style={{color:T.text}}>{mon.nombreDispositivo || 'Reloj inteligente'}</span></span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Observaciones */}
        {feedback && (
          <Card className="border-0 overflow-hidden rounded-2xl" style={{background:T.card,border:`1px solid ${T.cardBorder}`}}>
            <div className="flex items-center gap-2.5 px-5 py-3" style={{borderBottom:`1px solid ${T.sectionBorder}`}}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{background:T.accent}}><AlertCircle className="w-3 h-3" style={{color:T.logoText}} /></div>
              <span style={{fontSize:'14px',fontWeight:600,color:T.title}}>Observaciones</span>
            </div>
            <CardContent className="p-5">
              <p className="text-[13px] leading-relaxed" style={{color:T.text}}>{feedback}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-6">
          <div className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{background:T.logoCircle}}>
              <span className="text-[10px] font-black" style={{color:T.logoText,fontFamily:BC}}>i</span>
            </div>
            <span className="text-xs" style={{color:T.subtle}}>Generado con <span style={{color:T.accent,fontWeight:600}}>iTRAIN</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionViewPage;
