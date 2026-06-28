import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const THEMES = [
  { id: 'classic', name: 'Clásico LORD', desc: 'Diseño actual', bg: '#050A14', surface: '#0C1322', text: '#FFFFFF', accent: '#CCFF00' },
  { id: 'material', name: 'Material', desc: 'Material Design 3', bg: '#121212', surface: '#2C2C2C', text: '#E3E3E3', accent: '#CCFF00' },
  { id: 'futuristic', name: 'Futurista', desc: 'Linear · Vercel · Stripe', bg: '#050A14', surface: '#0A0F1E', text: '#FFFFFF', accent: '#FFFFFF' },
  { id: 'light', name: 'Light', desc: 'Notion · Linear light', bg: '#FFFFFF', surface: '#F5F7FA', text: '#0A0F1E', accent: '#0A0F1E' },
];

const ThemePreview = ({ th }) => (
  <div className="rounded-lg overflow-hidden border" style={{ borderColor: th.id === 'light' ? '#E2E8F0' : 'rgba(255,255,255,0.12)', background: th.bg }}>
    <div className="h-24 p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="w-8 h-2 rounded-full" style={{ background: th.accent }} />
        <div className="w-12 h-2 rounded-full" style={{ background: th.text, opacity: 0.3 }} />
      </div>
      <div className="w-3/4 h-3 rounded mt-1" style={{ background: th.text, opacity: 0.85 }} />
      <div className="w-1/2 h-2 rounded" style={{ background: th.text, opacity: 0.4 }} />
      <div className="flex gap-1.5 mt-auto">
        <div className="w-10 h-4 rounded" style={{ background: th.accent }} />
        <div className="w-10 h-4 rounded border" style={{ borderColor: th.text, opacity: 0.4 }} />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-1 px-3 pb-3">
      {[0, 1, 2].map(i => <div key={i} className="h-6 rounded" style={{ background: th.surface }} />)}
    </div>
  </div>
);

export const LandingAppearance = () => {
  const [active, setActive] = useState(null);
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    fetch(`${BACKEND}/api/landing/theme`)
      .then(r => r.json())
      .then(d => setActive(d?.active_theme || 'classic'))
      .catch(() => setActive('classic'));
  }, []);

  const applyTheme = async (id) => {
    if (id === active || saving) return;
    setSaving(id);
    const doPut = async (token) => fetch(`${BACKEND}/api/landing/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ theme: id }),
    });
    try {
      let token = localStorage.getItem('train_token');
      let res = await doPut(token);
      // Si el access token expiró (401), refrescar y reintentar una vez
      if (res.status === 401) {
        const rt = localStorage.getItem('train_refresh_token');
        if (rt) {
          const rr = await fetch(`${BACKEND}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: rt }),
          });
          if (rr.ok) {
            const rd = await rr.json();
            if (rd.token) {
              localStorage.setItem('train_token', rd.token);
              if (rd.refresh_token) localStorage.setItem('train_refresh_token', rd.refresh_token);
              token = rd.token;
              res = await doPut(token);
            }
          }
        }
      }
      if (res.status === 401) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.');
        return;
      }
      if (res.status === 403) {
        toast.error('Solo el Super Admin puede cambiar la apariencia.');
        return;
      }
      if (!res.ok) throw new Error('Error');
      const d = await res.json();
      setActive(d.active_theme);
      toast.success(`Apariencia del landing actualizada: ${THEMES.find(t => t.id === id)?.name}`);
    } catch (e) {
      toast.error('No se pudo cambiar la apariencia. Inténtalo de nuevo.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div data-testid="landing-appearance-section">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Apariencia de Landing</h2>
        <p className="text-sm text-slate-500">Elige la versión visual que verán todos los visitantes. El cambio se aplica en tiempo real.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {THEMES.map(th => {
          const isActive = active === th.id;
          return (
            <button
              key={th.id}
              data-testid={`landing-theme-${th.id}`}
              onClick={() => applyTheme(th.id)}
              className={`text-left rounded-xl p-3 border-2 transition-all ${isActive ? 'border-[#CCFF00] ring-2 ring-[#CCFF00]/30' : 'border-slate-700 hover:border-slate-500'}`}
              style={{ background: '#0f172a' }}
            >
              <ThemePreview th={th} />
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-sm font-bold text-white">{th.name}</p>
                  <p className="text-[11px] text-slate-400">{th.desc}</p>
                </div>
                {saving === th.id ? (
                  <Loader2 className="w-5 h-5 text-[#CCFF00] animate-spin" />
                ) : isActive ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#CCFF00] bg-[#CCFF00]/10 px-2 py-1 rounded-full" data-testid="landing-theme-active-badge">
                    <Check className="w-3.5 h-3.5" /> Activa
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LandingAppearance;
