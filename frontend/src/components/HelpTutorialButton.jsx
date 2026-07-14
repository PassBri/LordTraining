import React, { useEffect, useState, useCallback } from 'react';
import { GraduationCap, X, PlayCircle, Video, Loader2 } from 'lucide-react';

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const SEEN_KEY = 'lt_seen_tutorials';

const getSeen = () => {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
  catch { return new Set(); }
};
const saveSeen = (set) => localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(set)));

// Mapea el módulo actual del dashboard a una categoría de tutorial.
export const resolveTutorialCategory = (activePanel, activeDataSection, section) => {
  if (activePanel === 'scouting') return 'scouting';
  if (activePanel === 'report') return 'reportes';
  if (activePanel === 'panel') return 'general';
  const byId = {
    'tactical-board': 'pizarra',
    'calculators': 'calculadoras',
    'calendar-view': 'calendario',
    'graphic-plan': 'periodizacion',
  };
  if (byId[activeDataSection]) return byId[activeDataSection];
  const bySection = {
    periodizacion: 'periodizacion',
    evaluacion: 'evaluacion',
    visualizacion: 'calendario',
    herramientas: 'pizarra',
    competencias: 'scouting',
  };
  if (bySection[section]) return bySection[section];
  return 'general';
};

const HelpTutorialButton = ({ category = 'general', variant = 'fab' }) => {
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState([]);
  const [catLabels, setCatLabels] = useState({});
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(null);
  const [seen, setSeen] = useState(getSeen);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/resources/videos`)
      .then((r) => (r.ok ? r.json() : { videos: [] }))
      .then((d) => { setVideos(d.videos || []); setCatLabels(d.categories || {}); })
      .catch(() => setVideos([]))
      .finally(() => setLoading(false));
  }, []);

  // Cargar al montar para poder mostrar el indicador "Nuevo".
  useEffect(() => { load(); }, [load]);

  const markSeen = (id) => {
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id); saveSeen(next); return next;
    });
  };

  const matched = videos.filter((v) => (v.category || 'general') === category);
  const list = matched.length ? matched : videos;
  const heading = matched.length ? (catLabels[category] || 'este módulo') : 'LordTraining';

  // "Nuevo" = video no visto por este entrenador.
  const unseenCount = videos.filter((v) => !seen.has(v.id)).length;
  const contextualUnseen = list.filter((v) => !seen.has(v.id)).length;

  return (
    <>
      {variant === 'topbar' ? (
        <button
          onClick={() => setOpen(true)}
          data-testid="help-tutorials-btn"
          title="Ver tutoriales de esta sección"
          className="group flex flex-col items-center gap-1 shrink-0 outline-none relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out bg-[#0A0F1E] text-[#D4AF37] shadow-md border border-[#D4AF37]/40 hover:shadow-lg relative">
            <GraduationCap className="w-[18px] h-[18px] transition-transform duration-300 group-hover:scale-110" strokeWidth={1.8} />
            {unseenCount > 0 && (
              <span data-testid="help-tutorials-badge"
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                {unseenCount}
              </span>
            )}
          </div>
          <span className="text-[8px] font-bold tracking-wide leading-tight text-center text-slate-400 group-hover:text-[#D4AF37] transition-colors duration-300">
            Tutoriales
          </span>
        </button>
      ) : (
      <button
        onClick={() => setOpen(true)}
        data-testid="help-tutorials-btn"
        title="Ver tutoriales de esta sección"
        className="group fixed bottom-6 right-24 z-40 w-14 h-14 rounded-full bg-[#0A0F1E] text-[#D4AF37] border border-[#D4AF37]/40 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center">
        <GraduationCap className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Tutoriales
        </span>
        {unseenCount > 0 && (
          <span data-testid="help-tutorials-badge"
            className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-black flex items-center justify-center border-2 border-[#fafaf8] animate-pulse">
            {unseenCount}
          </span>
        )}
      </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} data-testid="help-tutorials-drawer">
          <div className="w-full max-w-md h-full bg-[#0a0e14] border-l border-white/10 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-bold">Ayuda / Tutoriales</p>
                <h3 className="text-white font-bold">Aprende sobre {heading}</h3>
                {contextualUnseen > 0 && <p className="text-[11px] text-[#EF4444] font-semibold mt-0.5">{contextualUnseen} sin ver</p>}
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white" data-testid="help-tutorials-close"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {loading && <div className="text-center py-10 text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /></div>}
              {!loading && list.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  <Video className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                  Aún no hay tutoriales publicados.
                </div>
              )}
              {!loading && !matched.length && videos.length > 0 && (
                <p className="text-xs text-slate-500">No hay un tutorial específico para esta sección todavía. Aquí tienes todos los disponibles.</p>
              )}
              {!loading && list.map((v) => {
                const isNew = !seen.has(v.id);
                const playing = active?.id === v.id;
                return (
                  <button key={v.id} onClick={() => { setActive(playing ? null : v); markSeen(v.id); }} data-testid={`help-video-${v.id}`}
                    className="w-full text-left rounded-xl overflow-hidden border border-white/10 bg-slate-900/60 hover:border-[#D4AF37]/40 transition-all">
                    {playing && v.embed_url && v.platform !== 'link' ? (
                      <div className="aspect-video">
                        <iframe src={`${v.embed_url}?autoplay=1`} title={v.title} className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                      </div>
                    ) : (
                      <div className="relative aspect-video bg-slate-800">
                        {v.thumbnail_url ? <img src={v.thumbnail_url} alt={v.title} className="w-full h-full object-cover" loading="lazy" />
                          : <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-slate-600" /></div>}
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <PlayCircle className="w-12 h-12 text-white/90" strokeWidth={1.5} />
                        </div>
                        {v.category && catLabels[v.category] && (
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[9px] font-bold text-[#D4AF37] uppercase">{catLabels[v.category]}</span>
                        )}
                        {isNew && (
                          <span data-testid={`help-video-new-${v.id}`} className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#EF4444] text-white text-[9px] font-black uppercase tracking-wide">Nuevo</span>
                        )}
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-white text-sm font-semibold leading-snug">{v.title}</p>
                      {v.description && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{v.description}</p>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpTutorialButton;
