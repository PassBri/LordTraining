import React, { useEffect, useState } from 'react';
import { ChevronDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ResourceLayout from '../components/ResourceLayout';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

function StatusBadge() {
  const [st, setSt] = useState(null);
  useEffect(() => {
    const load = () => fetch(`${BACKEND}/api/resources/status`).then(r => r.json()).then(setSt).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (!st) return null;
  const ok = st.overall === 'operational';
  const up = st.uptime_seconds || 0;
  const upStr = up > 86400 ? `${Math.floor(up / 86400)}d` : up > 3600 ? `${Math.floor(up / 3600)}h` : `${Math.floor(up / 60)}m`;
  return (
    <div className="rounded-xl bg-slate-800 border border-slate-700 p-5" data-testid="system-status">
      <div className="flex items-center gap-2 mb-3">
        {ok ? <CheckCircle2 className="w-5 h-5 text-[#D4AF37]" /> : <AlertTriangle className="w-5 h-5 text-orange-400" />}
        <h3 className="font-bold text-white" data-testid="system-status-overall">{ok ? 'Todos los sistemas operativos' : 'Servicio degradado'}</h3>
      </div>
      <div className="space-y-2">
        {(st.components || []).map((c, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-slate-300">{c.name}{c.latency_ms != null ? ` · ${c.latency_ms}ms` : ''}</span>
            <span className={`flex items-center gap-1.5 font-medium ${c.status === 'operational' ? 'text-[#D4AF37]' : 'text-orange-400'}`}>
              <span className={`w-2 h-2 rounded-full ${c.status === 'operational' ? 'bg-[#D4AF37]' : 'bg-orange-400'}`} />
              {c.status === 'operational' ? 'Operativo' : 'Caído'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-3">Uptime: {upStr} · Verificado {new Date(st.checked_at).toLocaleTimeString()}</p>
    </div>
  );
}

export default function SupportPage() {
  const [faqs, setFaqs] = useState([]);
  const [settings, setSettings] = useState({});
  const [open, setOpen] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/resources/support`).then(r => r.json()).then(d => { setFaqs(d.faqs || []); setSettings(d.settings || {}); }).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return;
    setSending(true);
    try {
      const res = await fetch(`${BACKEND}/api/resources/support/contact`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const d = await res.json();
      toast.success(d.message || 'Mensaje enviado');
      setForm({ name: '', email: '', message: '' });
    } catch { toast.error('No se pudo enviar el mensaje'); }
    finally { setSending(false); }
  };

  return (
    <ResourceLayout active="/support">
      <div data-testid="support-page">
        <p className="text-[#D4AF37] text-xs font-bold tracking-widest uppercase mb-2">Resources</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3" data-testid="support-title">Soporte</h1>
        <p className="text-slate-400 mb-8 max-w-2xl">{settings.intro || '¿Necesitas ayuda? Estamos para ti.'}</p>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">Preguntas frecuentes</h2>
            <div className="space-y-2">
              {faqs.map(f => (
                <div key={f.id} className="rounded-xl bg-slate-800 border border-slate-700 overflow-hidden" data-testid={`faq-${f.id}`}>
                  <button onClick={() => setOpen(open === f.id ? null : f.id)} className="w-full flex items-center justify-between p-4 text-left">
                    <span className="font-medium text-white">{f.question}</span>
                    <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${open === f.id ? 'rotate-180' : ''}`} />
                  </button>
                  {open === f.id && <div className="px-4 pb-4 text-sm text-slate-400">{f.answer}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <StatusBadge />
            <form onSubmit={submit} className="rounded-xl bg-slate-800 border border-slate-700 p-5 space-y-3" data-testid="support-contact-form">
              <h3 className="font-bold text-white">Contáctanos</h3>
              <input data-testid="contact-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
              <input data-testid="contact-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email" className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
              <textarea data-testid="contact-message" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Mensaje" rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm" />
              <button type="submit" disabled={sending} data-testid="contact-submit" className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-slate-900 font-bold text-sm disabled:opacity-60">{sending ? 'Enviando…' : 'Enviar mensaje'}</button>
              {settings.email && <p className="text-xs text-slate-500 text-center">o escríbenos a <span className="text-slate-300">{settings.email}</span></p>}
              {settings.tutorials_url && <a href={settings.tutorials_url} className="block text-center text-xs text-[#D4AF37]">Ver tutoriales y videos →</a>}
            </form>
          </div>
        </div>
      </div>
    </ResourceLayout>
  );
}
