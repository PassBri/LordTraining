import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Upload, Trash2, CheckCircle2, Image as ImageIcon, Star } from 'lucide-react';
import { listBranding, uploadBranding, activateBranding, deleteBranding, brandingFileUrl } from '../services/api';

const CATS = [
  { key: 'favicon', label: 'Favicon', desc: 'Ícono de la pestaña del navegador (recomendado cuadrado, ej. 64×64 o 512×512).' },
  { key: 'landing', label: 'Logo Landing Page', desc: 'Logo grande de la página de inicio pública.' },
  { key: 'login', label: 'Logo Login', desc: 'Logo de la pantalla de inicio de sesión.' },
];

const MAX = 5;

const BrandingManager = () => {
  const [data, setData] = useState({ favicon: [], landing: [], login: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // id or `upload-${cat}`
  const fileRefs = { favicon: useRef(null), landing: useRef(null), login: useRef(null) };

  const load = async () => {
    try {
      const res = await listBranding();
      setData(res.data);
    } catch (e) {
      toast.error('No se pudieron cargar las imágenes de marca');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onPick = async (cat, e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('La imagen supera 3MB'); return; }
    setBusy(`upload-${cat}`);
    try {
      await uploadBranding(cat, file);
      toast.success('Imagen subida');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al subir la imagen');
    } finally {
      setBusy(null);
    }
  };

  const onActivate = async (id) => {
    setBusy(id);
    try { await activateBranding(id); toast.success('Imagen activada'); await load(); }
    catch (e) { toast.error('No se pudo activar'); }
    finally { setBusy(null); }
  };

  const onDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return;
    setBusy(id);
    try { await deleteBranding(id); toast.success('Imagen eliminada'); await load(); }
    catch (e) { toast.error('No se pudo eliminar'); }
    finally { setBusy(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Cargando…</div>;
  }

  return (
    <div className="space-y-6" data-testid="branding-manager">
      <div className="rounded-2xl bg-white border border-slate-200 p-5">
        <h2 className="text-[15px] font-bold text-slate-900 flex items-center gap-2"><ImageIcon className="w-4 h-4 text-purple-600" /> Gestor de Marca</h2>
        <p className="text-[13px] text-slate-500 mt-1">Sube hasta {MAX} imágenes por categoría y elige cuál se muestra. Los cambios aplican globalmente. PNG, JPG, WEBP o ICO (máx. 3MB).</p>
      </div>

      {CATS.map(({ key, label, desc }) => {
        const items = data[key] || [];
        const full = items.length >= MAX;
        const uploading = busy === `upload-${key}`;
        return (
          <div key={key} className="rounded-2xl bg-white border border-slate-200 p-5" data-testid={`branding-section-${key}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className="text-[14px] font-bold text-slate-800">{label}</h3>
                <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-semibold">{items.length}/{MAX}</span>
                <input ref={fileRefs[key]} type="file" accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon,image/svg+xml" className="hidden" onChange={(e) => onPick(key, e)} data-testid={`branding-input-${key}`} />
                <button
                  disabled={full || uploading}
                  onClick={() => fileRefs[key].current?.click()}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${full || uploading ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                  data-testid={`branding-upload-btn-${key}`}
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Subir
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="text-[12px] text-slate-400 italic py-6 text-center border border-dashed border-slate-200 rounded-xl">Sin imágenes. Sube la primera y se activará automáticamente.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {items.map((it) => (
                  <div key={it.id} className={`relative rounded-xl border-2 p-2 transition-all ${it.is_active ? 'border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-slate-50'}`} data-testid={`branding-item-${it.id}`}>
                    <div className="aspect-square rounded-lg overflow-hidden flex items-center justify-center bg-[conic-gradient(#f1f5f9_90deg,#fff_90deg_180deg,#f1f5f9_180deg_270deg,#fff_270deg)] bg-[length:16px_16px]">
                      <img src={brandingFileUrl(it.url)} alt={it.original_filename} className="max-h-full max-w-full object-contain" />
                    </div>
                    {it.is_active && (
                      <span className="absolute top-1 left-1 inline-flex items-center gap-1 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Star className="w-2.5 h-2.5" /> Activa</span>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      {!it.is_active && (
                        <button onClick={() => onActivate(it.id)} disabled={busy === it.id} className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md py-1 transition-colors" data-testid={`branding-activate-${it.id}`}>
                          {busy === it.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Activar
                        </button>
                      )}
                      <button onClick={() => onDelete(it.id)} disabled={busy === it.id} className="inline-flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-md p-1.5 transition-colors" data-testid={`branding-delete-${it.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BrandingManager;
