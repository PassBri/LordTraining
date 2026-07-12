import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Target, Loader2, Trophy, Video, Award, ArrowRight, X, Star, MapPin, Send, Building2, Mail, CheckCircle2 } from 'lucide-react';
import { VideoGallery } from '../components/VideoEmbed';

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

const scoreColor = (s) => s == null ? '#94a3b8' : s >= 80 ? '#10b981' : s >= 65 ? '#f59e0b' : '#ef4444';
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
  return (
    <button onClick={onOpen} data-testid={`showcase-card-${a.share_id}`}
      className="text-left rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10 hover:border-white/25 hover:-translate-y-0.5 transition-all group">
      <div className="relative h-52 bg-slate-800 overflow-hidden">
        {a.has_photo && a.share_id ? (
          <img src={photoUrl(a.share_id)} alt={a.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white/10">{(a.name || '?').slice(0, 1)}</div>
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 45%, rgba(10,15,30,.95))' }} />
        {rank <= 3 && (
          <div className="absolute top-3 left-3 w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black text-slate-900" style={{ background: ['#D4AF37', '#cbd5e1', '#d97706'][rank - 1] }}>{rank}</div>
        )}
        {a.overall_score != null && (
          <div className="absolute top-3 right-3 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white font-black leading-none shadow-lg" style={{ background: scoreColor(a.overall_score) }}>
            <span className="text-lg">{a.overall_score}</span><span className="text-[7px] tracking-widest opacity-90">SCORE</span>
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-white font-black text-lg leading-tight truncate">{a.name}</div>
          <div className="text-white/60 text-[12px] truncate">{[a.position, a.sport_name].filter(Boolean).join(' · ')}</div>
        </div>
      </div>
      <div className="p-3.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full shrink-0" style={{ background: a.level_color + '22', color: a.level_color }}>{a.level_label}</span>
          {a.current_club && <span className="text-white/45 text-[11px] truncate">{a.current_club}</span>}
        </div>
        <div className="flex items-center gap-1.5 text-white/40 shrink-0">
          {a.videos?.length > 0 && <span className="flex items-center gap-0.5 text-[11px]"><Video className="w-3.5 h-3.5" />{a.videos.length}</span>}
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: accent }} />
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
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 overflow-y-auto" style={{ background: 'rgba(5,10,20,.8)', backdropFilter: 'blur(6px)' }} onClick={onClose} data-testid="showcase-modal">
      <div className="w-full max-w-2xl bg-[#0b1220] border border-white/10 rounded-none sm:rounded-2xl overflow-hidden my-0 sm:my-8" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <div className="h-56 bg-slate-800 overflow-hidden">
            {a.has_photo && a.share_id ? <img src={photoUrl(a.share_id)} alt={a.name} className="w-full h-full object-cover object-top" /> : <div className="w-full h-full flex items-center justify-center text-7xl font-black text-white/10">{(a.name || '?').slice(0, 1)}</div>}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, #0b1220)' }} />
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white" data-testid="showcase-modal-close"><X className="w-5 h-5" /></button>
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <div className="text-white text-2xl font-black leading-tight">{a.name}</div>
              <div className="text-white/60 text-sm">{[a.position, a.sport_name, a.current_club].filter(Boolean).join(' · ')}</div>
              <div className="flex items-center gap-2 mt-1.5 text-white/50 text-[12px]">
                {a.age && <span>{a.age} años</span>}
                {a.nationality && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{a.nationality}</span>}
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: a.level_color + '22', color: a.level_color }}>{a.level_label}</span>
              </div>
            </div>
            {a.overall_score != null && <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white font-black shadow-lg" style={{ background: scoreColor(a.overall_score) }}><span className="text-2xl leading-none">{a.overall_score}</span><span className="text-[8px] tracking-widest">SCORE</span></div>}
          </div>
        </div>

        <div className="p-5 space-y-5">
          {a.top_metrics?.length > 0 && (
            <div data-testid="showcase-modal-metrics">
              <div className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-2">Mejores métricas</div>
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
              <div className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-2">Fortalezas (IA)</div>
              <ul className="space-y-1.5">
                {a.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-white/80"><Star className="w-4 h-4 shrink-0 mt-0.5" style={{ color: accent }} />{s}</li>
                ))}
              </ul>
            </div>
          )}

          {a.achievements?.length > 0 && (
            <div>
              <div className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-2">Logros</div>
              <div className="flex flex-wrap gap-2">
                {a.achievements.map((s, i) => <span key={i} className="flex items-center gap-1 text-[12px] text-white/80 bg-white/5 border border-white/10 rounded-full px-2.5 py-1"><Award className="w-3.5 h-3.5" style={{ color: accent }} />{s}</span>)}
              </div>
            </div>
          )}

          {a.videos?.length > 0 && (
            <div data-testid="showcase-modal-videos">
              <div className="text-white/40 text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5"><Video className="w-4 h-4" />Videos</div>
              <VideoGallery videos={a.videos} dark />
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
