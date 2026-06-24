import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Target, Loader2, FileDown, Video, Award, Mail, Phone, ShieldCheck, ArrowRight } from 'lucide-react';
import { VideoGallery } from '../components/VideoEmbed';

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

const scoreColor = (s) => s == null ? '#94a3b8' : s >= 80 ? '#10b981' : s >= 65 ? '#f59e0b' : '#ef4444';
const verdictColor = (v) => v === 'RECRUIT' ? '#10b981' : v === 'MONITOR' ? '#f59e0b' : v === 'PASS' ? '#ef4444' : '#64748b';
const catLabel = { technical: 'Técnico', physical: 'Físico', tactical: 'Táctico', mental: 'Mental' };

export default function PublicScoutingProfile() {
  const { shareId } = useParams();
  const [p, setP] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | error
  const [dl, setDl] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/api/recruiting/public/${shareId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setP(d); setState('ok'); document.title = `${d.name} · Scouting Report`; })
      .catch(() => setState('error'));
  }, [shareId]);

  if (state === 'loading') return <Center><Loader2 className="w-8 h-8 animate-spin text-[#CCFF00]" /></Center>;
  if (state === 'error') return (
    <Center>
      <div className="text-center">
        <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h1 className="text-white text-xl font-black">Ficha no disponible</h1>
        <p className="text-slate-400 text-sm mt-1">Este enlace fue desactivado o no existe.</p>
        <Link to="/" className="inline-block mt-4 text-[#CCFF00] font-bold text-sm">Ir a LordTraining →</Link>
      </div>
    </Center>
  );

  const ev = p.evaluation; const ai = p.ai; const std = ev?.club_standard ?? 70;
  const downloadPdf = async () => {
    setDl(true);
    try {
      const res = await fetch(`${API_URL}/api/recruiting/public/${shareId}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `scouting_${(p.name || 'prospecto').replace(/\s+/g, '_').toLowerCase()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { alert('No se pudo generar la ficha PDF. Intenta de nuevo.'); }
    setDl(false);
  };

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #13203a 0%, #0b1220 55%, #070d18 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#CCFF00] flex items-center justify-center"><Target className="w-5 h-5 text-slate-900" strokeWidth={2.5} /></div>
            <span className="text-white font-black tracking-tight">Lord<span className="text-[#CCFF00]">Training</span></span>
          </Link>
          <button onClick={downloadPdf} disabled={dl} data-testid="public-pdf-btn"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-bold px-3 py-2 rounded-full border border-white/20 transition disabled:opacity-60">
            {dl ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Descargar Ficha
          </button>
        </div>

        {/* Hero card */}
        <div className="rounded-3xl overflow-hidden border border-white/10" style={{ background: 'linear-gradient(160deg,#0f172a,#13203a 60%,#0b1220)', boxShadow: '0 30px 70px -20px rgba(0,0,0,.7)' }} data-testid="public-profile">
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
            <div className="w-36 h-44 rounded-2xl overflow-hidden border-2 border-[#CCFF00] shrink-0 bg-slate-800">
              {p.has_photo
                ? <img src={`${API_URL}/api/recruiting/public/${shareId}/photo`} alt={p.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-slate-600">{(p.name || '?').slice(0, 1)}</div>}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="text-[10px] font-black uppercase tracking-[2px] text-[#CCFF00] mb-1">Scouting Report</div>
              <h1 className="text-white text-4xl font-black leading-none" style={{ fontFamily: "'DM Sans',sans-serif" }}>{p.name}</h1>
              <div className="text-[#CCFF00] font-bold mt-2">{p.position || '—'} · {p.sport_name || p.sport}</div>
              <div className="text-slate-300 text-sm mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-center sm:justify-start">
                {p.current_club && <span>🏟 {p.current_club}</span>}
                {p.age && <span>🎂 {p.age} años</span>}
                {p.height_cm && <span>📏 {p.height_cm} cm</span>}
                {p.weight_kg && <span>⚖ {p.weight_kg} kg</span>}
                {p.dominant_side && <span>🦶 {p.dominant_side}</span>}
                {p.nationality && <span>🌍 {p.nationality}</span>}
              </div>
              {ai?.verdict && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: verdictColor(ai.verdict) + '22' }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: verdictColor(ai.verdict) }} />
                  <span className="text-sm font-black" style={{ color: verdictColor(ai.verdict) }}>{ai.verdict}</span>
                </div>
              )}
            </div>
            <div className="text-center shrink-0">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Overall</div>
              <div className="text-6xl font-black" style={{ color: scoreColor(p.overall_score) }}>{p.overall_score ?? '—'}</div>
              <div className="text-[10px] text-slate-500">/ estándar {std}</div>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white/[0.03] border-t border-white/10 p-6 sm:p-8 grid md:grid-cols-2 gap-7">
            {/* Eval */}
            <div>
              <H>Evaluación por área</H>
              {ev?.category_averages ? Object.entries(ev.category_averages).map(([k, v]) => (
                <div key={k} className="mb-3">
                  <div className="flex justify-between text-xs font-bold mb-1"><span className="text-slate-300">{catLabel[k] || k}</span><span style={{ color: scoreColor(v) }}>{v}</span></div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden relative">
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: scoreColor(v) }} />
                    <div className="absolute top-0 h-full w-0.5 bg-white/70" style={{ left: `${std}%` }} />
                  </div>
                </div>
              )) : <p className="text-slate-500 text-sm">Sin evaluación publicada.</p>}

              {Object.keys(p.key_stats || {}).length > 0 && (<>
                <H className="mt-5">Stats clave</H>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(p.key_stats).map(([k, v]) => (
                    <div key={k} className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                      <div className="text-[8px] text-slate-400 uppercase tracking-wide">{k}</div>
                      <div className="text-[#CCFF00] font-black text-lg">{v}</div>
                    </div>
                  ))}
                </div>
              </>)}
            </div>

            {/* AI / bio */}
            <div>
              <H>Informe del scout</H>
              <p className="text-slate-300 text-sm leading-relaxed">{ai?.summary || p.bio || 'Sin resumen publicado.'}</p>
              {ai?.strengths?.length > 0 && <Block title="Fortalezas" color="#86efac" items={ai.strengths} />}
              {ai?.weaknesses?.length > 0 && <Block title="A mejorar" color="#fca5a5" items={ai.weaknesses} />}
              {ai?.projected_ceiling && <p className="text-xs text-slate-400 mt-3"><b className="text-slate-300">Techo proyectado:</b> {ai.projected_ceiling}</p>}
            </div>
          </div>

          {/* Videos + achievements + contact */}
          <div className="border-t border-white/10 p-6 sm:p-8 grid md:grid-cols-2 gap-7">
            <div>
              {p.video_links?.length > 0 && (<>
                <H>Video Highlights</H>
                <VideoGallery videos={p.video_links} dark />
              </>)}
              {p.achievements?.length > 0 && (<>
                <H className="mt-4">Logros</H>
                <ul className="space-y-1.5">
                  {p.achievements.map((a, i) => <li key={i} className="flex items-start gap-2 text-sm text-slate-300"><Award className="w-4 h-4 text-[#CCFF00] mt-0.5 shrink-0" />{a}</li>)}
                </ul>
              </>)}
            </div>
            <div>
              <H>Contacto</H>
              <div className="space-y-2 text-sm text-slate-300">
                {p.contact?.email && <a href={`mailto:${p.contact.email}`} className="flex items-center gap-2 hover:text-white"><Mail className="w-4 h-4 text-slate-400" />{p.contact.email}</a>}
                {p.contact?.phone && <a href={`tel:${p.contact.phone}`} className="flex items-center gap-2 hover:text-white"><Phone className="w-4 h-4 text-slate-400" />{p.contact.phone}</a>}
                {!p.contact?.email && !p.contact?.phone && <p className="text-slate-500">Contacto no publicado.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Viral CTA */}
        <div className="mt-6 rounded-2xl border border-[#CCFF00]/30 bg-[#CCFF00]/5 p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <div className="text-white font-black">¿Eres entrenador o club?</div>
            <div className="text-slate-400 text-sm">Crea fichas de scouting profesionales como esta con LordTraining.</div>
          </div>
          <Link to="/auth" data-testid="public-cta-btn" className="flex items-center gap-2 bg-[#CCFF00] text-slate-900 font-black px-5 py-2.5 rounded-full hover:bg-[#b8e600] transition shrink-0">
            Empezar gratis <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <p className="text-center text-slate-600 text-xs mt-5">Identifica el talento. Construye el futuro. · Powered by LordTraining</p>
      </div>
    </div>
  );
}

const Center = ({ children }) => <div className="min-h-screen flex items-center justify-center" style={{ background: '#0b1220' }}>{children}</div>;
const H = ({ children, className = '' }) => <div className={`text-[11px] font-black uppercase tracking-wide text-[#CCFF00] mb-3 ${className}`}>{children}</div>;
const Block = ({ title, color, items }) => (
  <div className="mt-3">
    <div className="text-[10px] uppercase text-slate-400 font-bold mb-1">{title}</div>
    <ul className="list-disc pl-4 text-sm" style={{ color }}>{items.map((s, i) => <li key={i}>{s}</li>)}</ul>
  </div>
);
