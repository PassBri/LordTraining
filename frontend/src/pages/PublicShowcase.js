import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Target, Loader2, Trophy, Video, Award, ArrowRight, X, Star, MapPin, Send, Building2, Mail, CheckCircle2, Download, Share2 } from 'lucide-react';
import { VideoGallery } from '../components/VideoEmbed';

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

const photoUrl = (sid) => `${API_URL}/api/recruiting/public/${sid}/photo`;

export default function PublicShowcase() {
  const { showcaseId } = useParams();
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/recruiting/public/showcase/${showcaseId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setState('ok'); document.title = d.title || 'Cantera · Top Talentos'; })
      .catch(() => setState('error'));
    // Registrar visita (no bloqueante)
    fetch(`${API_URL}/api/recruiting/public/showcase/${showcaseId}/visit`, { method: 'POST' }).catch(() => {});
  }, [showcaseId]);

  if (state === 'loading') return <Center><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#D4AF37' }} /></Center>;
  if (state === 'error') return (
    <Center>
      <div className="text-center">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h1 className="text-white text-xl font-black">Vitrina no disponible</h1>
        <p className="text-slate-400 text-sm mt-1">Este enlace fue desactivado o no existe.</p>
        <Link to="/" className="inline-block mt-4 font-bold text-sm" style={{ color: '#D4AF37' }}>Ir a LordTraining →</Link>
      </div>
    </Center>
  );

  const accent = data.branding?.accent_color || '#D4AF37';
  const b = data.branding || {};

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #13203a 0%, #0b1220 55%, #070d18 100%)' }} data-testid="public-showcase">
      {/* Header con marca */}
      <div className="border-b border-white/10" style={{ background: 'linear-gradient(180deg, rgba(10,15,30,.85), rgba(10,15,30,.4))' }}>
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
          <div className="flex items-center gap-4 mb-5">
            {b.has_logo ? (
              <img src={`${API_URL}/api/recruiting/public/showcase/${showcaseId}/logo`} alt="logo" className="w-16 h-16 rounded-xl object-contain bg-white/5 p-1.5 border border-white/10" data-testid="showcase-logo" />
            ) : (
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: accent }}><Trophy className="w-8 h-8 text-slate-900" strokeWidth={2.4} /></div>
            )}
            <div>
              {b.entity_name && <div className="text-white/70 text-sm font-bold uppercase tracking-widest">{b.entity_name}</div>}
              <h1 className="text-white text-3xl sm:text-4xl font-black tracking-tight" style={{ fontFamily: "'DM Sans',sans-serif" }} data-testid="showcase-title">{data.title}</h1>
              {b.slogan && <p className="text-sm mt-0.5" style={{ color: accent }}>{b.slogan}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-white/50 text-xs font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" style={{ color: accent }} />{data.count} talento{data.count === 1 ? '' : 's'}</span>
            <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" />Scouting · LordTraining</span>
          </div>
        </div>
      </div>

      {/* Grid de talentos */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {data.athletes.length === 0 ? (
          <div className="text-center py-20 text-slate-400" data-testid="showcase-empty">Aún no hay talentos publicados en esta vitrina.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {data.athletes.map((a, i) => (
              <AthleteCard key={a.share_id || i} a={a} rank={i + 1} accent={accent} onOpen={() => setSelected(a)} />
            ))}
          </div>
        )}
        <div className="text-center mt-10">
          <a href="https://lordtraining.com" target="_blank" rel="noreferrer" className="text-white/40 text-xs font-semibold hover:text-white/70 transition">Vitrina creada con LordTraining · lordtraining.com</a>
        </div>
      </div>

      {selected && <AthleteModal a={selected} accent={accent} showcaseId={showcaseId} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AthleteCard({ a, rank, accent, onOpen }) {
  const medals = {
    1: 'linear-gradient(135deg, #FDE047 0%, #D4AF37 50%, #B45309 100%)',
    2: 'linear-gradient(135deg, #F8FAFC 0%, #CBD5E1 50%, #64748B 100%)',
    3: 'linear-gradient(135deg, #FDBA74 0%, #D97706 50%, #78350F 100%)',
  };
  const metrics = (a.top_metrics || []).slice(0, 3);
  const cond = { fontFamily: "'Barlow Condensed', sans-serif" };
  return (
    <button onClick={onOpen} data-testid={`showcase-card-${a.share_id}`}
      className="relative w-full aspect-[2.7/4] rounded-2xl overflow-hidden flex flex-col justify-end group border border-white/10 ring-1 ring-inset ring-white/5 transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] hover:border-white/30"
      style={{ background: '#0A0F1E', boxShadow: '0 10px 30px -12px rgba(0,0,0,.7)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 24px 48px -12px ${accent}44`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 10px 30px -12px rgba(0,0,0,.7)'; }}>

      {/* Photo layer */}
      {a.has_photo && a.share_id ? (
        <>
          <img src={photoUrl(a.share_id)} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-125 blur-3xl opacity-40" />
          <img src={photoUrl(a.share_id)} alt={a.name} data-testid={`showcase-card-photo-${a.share_id}`}
            className="absolute left-0 right-0 bottom-[26%] w-full h-[72%] object-contain object-bottom z-10 transition-transform duration-500 group-hover:scale-105"
            style={{ filter: 'drop-shadow(0 15px 18px rgba(0,0,0,.85))' }} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-8xl font-black text-white/10" style={cond}>{(a.name || '?').slice(0, 1)}</div>
      )}

      {/* Vignette */}
      <div className="absolute inset-0 z-10 pointer-events-none" style={{ boxShadow: 'inset 0 0 60px rgba(0,0,0,.85)' }} />

      {/* Rank medal */}
      {rank <= 3 && (
        <div className="absolute top-3 left-3 z-30 w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-slate-900 shadow-lg shadow-black/50" style={{ background: medals[rank], ...cond }} data-testid={`showcase-card-rank-${a.share_id}`}>{rank}</div>
      )}

      {/* Overall score */}
      {a.overall_score != null && (
        <div className="absolute top-3 right-3 z-30 flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl border-t-2 shadow-xl backdrop-blur-md"
          style={{ background: 'rgba(10,15,30,.55)', borderColor: accent }}>
          <span className="text-3xl font-black leading-none tracking-tighter text-white" style={cond}>{a.overall_score}</span>
          <span className="text-[7px] font-bold tracking-[0.2em]" style={{ color: accent }}>OVR</span>
        </div>
      )}

      {/* Holographic foil sweep on hover */}
      <div className="absolute inset-0 z-40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,.35) 45%, rgba(212,175,55,.35) 52%, transparent 62%)', mixBlendMode: 'overlay' }} />

      {/* Info panel */}
      <div className="relative z-20 w-full pb-4 px-4 flex flex-col items-center" style={{ background: '#070d16' }}>
        <div className="absolute -top-12 left-0 right-0 h-12 pointer-events-none" style={{ background: 'linear-gradient(to top, #070d16, transparent)' }} />
        <div className="pt-3 w-full flex flex-col items-center">
        {a.level_label && (
          <span className="relative z-30 mb-2 px-3 py-0.5 rounded-full text-[10px] font-black tracking-widest border backdrop-blur-md"
            style={{ color: a.level_color, borderColor: a.level_color + '55', background: a.level_color + '1a', ...cond }}>{a.level_label}</span>
        )}
        <div className="text-white text-2xl font-black uppercase tracking-wide text-center leading-none truncate w-full" style={{ ...cond, textShadow: '0 2px 8px rgba(0,0,0,.9)' }} data-testid={`showcase-card-name-${a.share_id}`}>{a.name}</div>
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/60 font-semibold mt-1 flex-wrap">
          {[a.position, a.sport_name].filter(Boolean).map((x, i) => <span key={i}>{x}</span>)}
        </div>
        {(a.age || a.nationality || a.current_club || a.videos?.length > 0) && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-white/45 mt-1 flex-wrap">
            {a.age && <span>{a.age} años</span>}
            {a.nationality && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{a.nationality}</span>}
            {a.current_club && <span className="truncate max-w-[120px]">{a.current_club}</span>}
            {a.videos?.length > 0 && <span className="flex items-center gap-0.5"><Video className="w-3 h-3" />{a.videos.length}</span>}
          </div>
        )}

        {/* Top metrics mini-bars */}
        {metrics.length > 0 && (
          <div className="w-full grid gap-3 border-t border-white/10 pt-3 mt-3" style={{ gridTemplateColumns: `repeat(${metrics.length}, 1fr)` }} data-testid={`showcase-card-metrics-${a.share_id}`}>
            {metrics.map((m, i) => (
              <div key={i} className="flex flex-col items-center min-w-0">
                <span className="text-lg font-black text-white leading-none" style={cond}>{m.value}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/45 truncate w-full text-center mt-0.5">{m.label}</span>
                <div className="w-full h-1 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, m.value))}%`, background: accent }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 text-[11px] font-black tracking-wide mt-3 group-hover:gap-2 transition-all" style={{ color: accent }}>
          VER FICHA <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
        </div>
      </div>
    </button>
  );
}

function AthleteModal({ a, accent, showcaseId, onClose }) {
  const [form, setForm] = useState({ from_name: '', organization: '', email: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [dl, setDl] = useState(false);
  const [copied, setCopied] = useState(false);
  const cardImg = `${API_URL}/api/recruiting/public/${a.share_id}/card?format=post`;
  const cardPage = `${API_URL}/api/recruiting/public/${a.share_id}/card-page?format=post`;
  const downloadCard = async () => {
    setDl(true);
    try {
      const res = await fetch(cardImg);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(a.name || 'talento').replace(/\s+/g, '_')}_LordTraining.png`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setDl(false);
  };
  const shareCard = async () => {
    const data = { title: `${a.name} · LordTraining`, text: `Mira la carta de scouting de ${a.name} en la Cantera de LordTraining`, url: cardPage };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(cardPage);
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  const submit = async (e) => {
    e.preventDefault();
    const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
    if (!form.from_name.trim()) { setError('Ingresa tu nombre.'); return; }
    if (!emailOk) { setError('Ingresa un email válido.'); return; }
    if (form.message.trim().length < 5) { setError('El mensaje debe tener al menos 5 caracteres.'); return; }
    setError('');
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/recruiting/public/showcase/${showcaseId}/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, prospect_share_id: a.share_id }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch { setError('No se pudo enviar el mensaje. Verifica tu email e intenta de nuevo.'); }
    setSending(false);
  };
  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/40';
  const cond = { fontFamily: "'Barlow Condensed', sans-serif" };
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" style={{ background: 'rgba(5,10,20,.85)', backdropFilter: 'blur(6px)' }} onClick={onClose} data-testid="showcase-modal">
      <div className="w-full max-w-2xl rounded-none sm:rounded-2xl overflow-hidden my-0 sm:my-8 relative"
        style={{ background: '#0A0F1E', border: `1px solid ${accent}55`, boxShadow: `0 0 0 1px rgba(255,255,255,.04) inset, 0 30px 60px -20px rgba(0,0,0,.8), 0 0 40px -18px ${accent}` }}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 z-30 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 border border-white/10 flex items-center justify-center text-white" data-testid="showcase-modal-close"><X className="w-5 h-5" /></button>

        {/* Barra de marca LordTraining */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-14" style={{ borderBottom: `1px solid ${accent}22` }}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: accent }}><Trophy className="w-4 h-4 text-slate-900" strokeWidth={2.6} /></div>
            <div className="leading-none">
              <span className="text-white font-black text-sm tracking-wide" style={cond}>LORD</span>
              <span className="font-black text-sm tracking-wide" style={{ ...cond, color: accent }}>TRAINING</span>
            </div>
          </div>
          <span className="text-[10px] font-black tracking-[0.25em]" style={{ color: accent, ...cond }}>SCOUTING REPORT</span>
        </div>

        {/* Encabezado premium: foto enmarcada + datos + score */}
        <div className="relative flex items-stretch gap-4 p-5" style={{ background: `radial-gradient(600px 200px at 15% 0%, ${accent}14, transparent 70%)` }}>
          <div className="shrink-0 w-28 sm:w-32 aspect-[3/4] rounded-xl overflow-hidden relative" style={{ background: '#0f172a', border: `2px solid ${accent}`, boxShadow: `0 0 20px -6px ${accent}` }} data-testid="showcase-modal-photo-box">
            {a.has_photo && a.share_id ? (
              <>
                <img src={photoUrl(a.share_id)} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40" />
                <img src={photoUrl(a.share_id)} alt={a.name} className="relative z-[1] w-full h-full object-contain" data-testid="showcase-modal-photo" />
              </>
            ) : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white/15" style={cond}>{(a.name || '?').slice(0, 1)}</div>}
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                {a.level_label && <span className="inline-block mb-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest" style={{ color: a.level_color, border: `1px solid ${a.level_color}55`, background: a.level_color + '1a', ...cond }}>{a.level_label}</span>}
                <div className="text-white text-2xl sm:text-3xl font-black uppercase tracking-wide leading-none break-words" style={cond}>{a.name}</div>
                <div className="text-sm mt-1 font-semibold" style={{ color: accent }}>{[a.position, a.sport_name].filter(Boolean).join(' · ')}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-white/50 text-[12px]">
                  {a.age && <span>{a.age} años</span>}
                  {a.nationality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.nationality}</span>}
                  {a.current_club && <span className="truncate max-w-[160px]">{a.current_club}</span>}
                </div>
              </div>
              {a.overall_score != null && (
                <div className="shrink-0 flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl" style={{ background: '#070d16', border: `2px solid ${accent}`, boxShadow: `0 0 18px -6px ${accent}` }}>
                  <span className="text-2xl sm:text-3xl font-black leading-none text-white tracking-tighter" style={cond}>{a.overall_score}</span>
                  <span className="text-[8px] font-bold tracking-[0.2em]" style={{ color: accent }}>OVERALL</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {a.top_metrics?.length > 0 && (
            <div data-testid="showcase-modal-metrics">
              <div className="text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: accent }}>Mejores métricas</div>
              <div className="space-y-2.5">
                {a.top_metrics.map((m, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[13px] mb-1"><span className="text-white/80 font-semibold">{m.label}</span><span className="font-black" style={{ color: accent }}>{m.value}</span></div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${m.value}%`, background: accent }} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.strengths?.length > 0 && (
            <div data-testid="showcase-modal-strengths">
              <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: accent }}>Fortalezas (IA)</div>
              <ul className="space-y-1.5">
                {a.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-white/80"><Star className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />{s}</li>
                ))}
              </ul>
            </div>
          )}

          {a.achievements?.length > 0 && (
            <div>
              <div className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: accent }}>Logros</div>
              <div className="flex flex-wrap gap-2">
                {a.achievements.map((s, i) => <span key={i} className="flex items-center gap-1 text-[12px] text-white/80 bg-white/5 border border-white/10 rounded-full px-2.5 py-1"><Award className="w-3.5 h-3.5" style={{ color: accent }} />{s}</span>)}
              </div>
            </div>
          )}

          {a.videos?.length > 0 && (
            <div data-testid="showcase-modal-videos">
              <div className="text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: accent }}><Video className="w-4 h-4" />Videos</div>
              <VideoGallery videos={a.videos} dark />
            </div>
          )}

          {/* Compartir / descargar carta */}
          {a.share_id && (
            <div className="grid grid-cols-2 gap-2.5" data-testid="showcase-card-actions">
              <button onClick={downloadCard} disabled={dl} data-testid="showcase-download-card-btn"
                className="flex items-center justify-center gap-2 font-black py-2.5 rounded-xl text-slate-900 transition hover:opacity-90 disabled:opacity-60"
                style={{ background: accent }}>
                {dl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Descargar carta
              </button>
              <button onClick={shareCard} data-testid="showcase-share-card-btn"
                className="flex items-center justify-center gap-2 font-black py-2.5 rounded-xl text-white border transition hover:bg-white/5"
                style={{ borderColor: accent + '66' }}>
                {copied ? <CheckCircle2 className="w-4 h-4" style={{ color: accent }} /> : <Share2 className="w-4 h-4" style={{ color: accent }} />}{copied ? '¡Enlace copiado!' : 'Compartir'}
              </button>
            </div>
          )}

          {/* Contacto directo por este atleta */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid="showcase-contact">
            {sent ? (
              <div className="text-center py-3" data-testid="showcase-contact-sent">
                <CheckCircle2 className="w-9 h-9 mx-auto mb-2" style={{ color: accent }} />
                <p className="text-white font-bold">¡Mensaje enviado!</p>
                <p className="text-white/50 text-[13px] mt-0.5">El responsable se pondrá en contacto contigo.</p>
              </div>
            ) : !showForm ? (
              <button onClick={() => setShowForm(true)} data-testid="showcase-contact-open-btn"
                className="w-full flex items-center justify-center gap-2 text-white font-bold py-2.5 rounded-lg border border-white/15 hover:bg-white/5 transition">
                <Mail className="w-4 h-4" style={{ color: accent }} />Contactar por {a.name?.split(' ')[0] || 'este atleta'}
              </button>
            ) : (
              <form onSubmit={submit} className="space-y-2.5" data-testid="showcase-contact-form">
                <div className="text-white/70 text-[12px] font-semibold uppercase tracking-wider">Interesado en este talento</div>
                <input className={inputCls} placeholder="Tu nombre *" value={form.from_name} maxLength={120}
                  onChange={e => setForm(f => ({ ...f, from_name: e.target.value }))} data-testid="contact-name-input" />
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-white/30" />
                  <input className={inputCls + ' pl-9'} placeholder="Club / Universidad / Agencia" value={form.organization} maxLength={160}
                    onChange={e => setForm(f => ({ ...f, organization: e.target.value }))} data-testid="contact-org-input" />
                </div>
                <input type="email" className={inputCls} placeholder="Tu email *" value={form.email} maxLength={160}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} data-testid="contact-email-input" />
                <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Tu mensaje *" value={form.message} maxLength={1500}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))} data-testid="contact-message-input" />
                {error && <p className="text-red-400 text-[12px] font-semibold" data-testid="contact-error">{error}</p>}
                <button type="submit" disabled={sending} data-testid="contact-submit-btn"
                  className="w-full flex items-center justify-center gap-2 font-black py-2.5 rounded-lg text-slate-900 transition hover:opacity-90 disabled:opacity-60"
                  style={{ background: accent }}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}Enviar mensaje
                </button>
              </form>
            )}
          </div>

          {a.share_id && (
            <a href={`/scouting/p/${a.share_id}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full font-black py-3 rounded-xl text-slate-900 transition hover:opacity-90"
              style={{ background: accent }} data-testid="showcase-full-profile-btn">
              Ver ficha completa <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

const Center = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: '#070d18' }}>{children}</div>
);
