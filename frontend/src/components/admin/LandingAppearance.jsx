import React, { useEffect, useState } from 'react';
import { Check, Loader2, Save, Globe, Eye } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND = process.env.REACT_APP_BACKEND_URL;

const SOCIAL_FIELDS = [
  { id: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/lordtraining' },
  { id: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/lordtraining' },
  { id: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/lordtraining' },
  { id: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@lordtraining' },
  { id: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@lordtraining' },
  { id: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/lordtraining' },
];

// PUT con manejo de refresh token (reutilizable)
const putWithAuth = async (url, body) => {
  const doPut = async (token) => fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  let token = localStorage.getItem('train_token');
  let res = await doPut(token);
  if (res.status === 401) {
    const rt = localStorage.getItem('train_refresh_token');
    if (rt) {
      const rr = await fetch(`${BACKEND}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (rr.ok) {
        const rd = await rr.json();
        if (rd.token) {
          localStorage.setItem('train_token', rd.token);
          if (rd.refresh_token) localStorage.setItem('train_refresh_token', rd.refresh_token);
          res = await doPut(rd.token);
        }
      }
    }
  }
  return res;
};

const SocialLinksEditor = () => {
  const [links, setLinks] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${BACKEND}/api/landing/social`)
      .then(r => r.json())
      .then(d => setLinks(d?.links || {}))
      .catch(() => setLinks({}));
  }, []);

  const save = async () => {
    if (saving || !links) return;
    setSaving(true);
    try {
      const res = await putWithAuth(`${BACKEND}/api/landing/social`, links);
      if (res.status === 401) { toast.error('Tu sesión expiró. Vuelve a iniciar sesión.'); return; }
      if (res.status === 403) { toast.error('Solo el Super Admin puede editar las redes sociales.'); return; }
      if (!res.ok) throw new Error('Error');
      const d = await res.json();
      setLinks(d.links || links);
      toast.success('Enlaces de redes sociales guardados');
    } catch (e) {
      toast.error('No se pudieron guardar los enlaces. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-slate-700/40" data-testid="social-links-section">
      <div className="mb-5 flex items-center gap-2">
        <Globe className="w-5 h-5 text-[#CCFF00]" />
        <div>
          <h2 className="text-xl font-bold text-slate-900">Redes Sociales</h2>
          <p className="text-sm text-slate-500">Agrega los enlaces de las redes de LordTraining. Aparecerán como íconos en el pie del landing. Deja vacío para ocultar un ícono.</p>
        </div>
      </div>
      {links === null ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SOCIAL_FIELDS.map(f => (
              <div key={f.id}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <input
                  type="url"
                  value={links[f.id] || ''}
                  onChange={(e) => setLinks(prev => ({ ...prev, [f.id]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:border-[#1565C0] focus:ring-1 focus:ring-[#1565C0] outline-none"
                  data-testid={`social-input-${f.id}`}
                />
              </div>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 h-11 px-6 rounded-full bg-[#1565C0] text-white font-bold text-sm hover:bg-[#0d4a91] transition-colors disabled:opacity-60"
            data-testid="social-save-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar enlaces
          </button>
        </>
      )}
    </div>
  );
};

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
      if (!res.ok) {
        let detail = '';
        try { const j = await res.json(); detail = j.detail || ''; } catch (_) {}
        throw new Error(`HTTP ${res.status}${detail ? ' · ' + detail : ''}`);
      }
      const d = await res.json();
      setActive(d.active_theme);
      toast.success(`Apariencia del landing actualizada: ${THEMES.find(t => t.id === id)?.name}`);
    } catch (e) {
      toast.error(`No se pudo cambiar la apariencia (${e.message || 'error de red/CORS'}). Inténtalo de nuevo.`);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div data-testid="landing-appearance-section">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-900">Apariencia de Landing</h2>
        <p className="text-sm text-slate-500">Usa <span className="font-semibold">Vista previa</span> para probar un tema en una pestaña nueva sin publicarlo. Pulsa la tarjeta para <span className="font-semibold">activarlo</span> para todos los visitantes.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {THEMES.map(th => {
          const isActive = active === th.id;
          return (
            <div
              key={th.id}
              data-testid={`landing-theme-${th.id}`}
              onClick={() => applyTheme(th.id)}
              role="button"
              tabIndex={0}
              className={`text-left rounded-xl p-3 border-2 transition-all cursor-pointer ${isActive ? 'border-[#CCFF00] ring-2 ring-[#CCFF00]/30' : 'border-slate-700 hover:border-slate-500'}`}
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
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); window.open(`/?previewTheme=${th.id}`, '_blank', 'noopener'); }}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-lg border border-slate-600 text-slate-200 text-[12px] font-semibold hover:border-[#CCFF00]/50 hover:text-[#CCFF00] transition-colors"
                data-testid={`landing-theme-preview-${th.id}`}
              >
                <Eye className="w-3.5 h-3.5" /> Vista previa
              </button>
            </div>
          );
        })}
      </div>
      <SocialLinksEditor />
    </div>
  );
};

export default LandingAppearance;
