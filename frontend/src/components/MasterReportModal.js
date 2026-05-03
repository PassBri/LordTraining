import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  FileBarChart2, Sparkles, Notebook, Activity,
  Image as ImageIcon, X, Download, Loader2, Crown, Trophy, Award, Medal,
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const STYLE_ICONS = {
  olimpico: Medal,
  atleta: Activity,
  sport: Activity,
  training: FileBarChart2,
  coach: Notebook,
  federation: Crown,
  campeon: Trophy,
  'primer-lugar': Award,
};

// Default sections preselected when modal opens
const DEFAULT_SELECTION = {
  cover: true, toc: true, introduction: true,
  diagnostic_active: true,
  periodization_structure: true,
  graphic_plan: true,
};

export default function MasterReportModal({ open, onOpenChange, plan, athleteName, coachName }) {
  const [styles, setStyles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [styleId, setStyleId] = useState('atleta');
  const [sections, setSections] = useState({ ...DEFAULT_SELECTION });
  const [orgName, setOrgName] = useState('');
  const [orgLogoB64, setOrgLogoB64] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('train_token') || localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/api/master-report/styles`, { headers })
      .then(r => setStyles(r.data.styles || []))
      .catch(() => toast.error('No se pudo cargar la lista de estilos'));
    axios.get(`${API}/api/master-report/sections-catalog`, { headers })
      .then(r => setGroups(r.data.groups || []))
      .catch(() => toast.error('No se pudo cargar el catálogo de secciones'));
    if (plan?.name) setTitle(plan.name);
  }, [open, plan]);

  const toggle = (id) => setSections(s => ({ ...s, [id]: !s[id] }));

  const handleLogoUpload = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1024 * 1024 * 2) {
      toast.error('Logo demasiado pesado (máx. 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setOrgLogoB64(reader.result);
    reader.readAsDataURL(f);
  };

  const selectAllInGroup = (groupItems, val) => {
    setSections(s => {
      const next = { ...s };
      groupItems.forEach(it => { next[it.id] = val; });
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!Object.values(sections).some(Boolean)) {
      toast.error('Selecciona al menos una sección');
      return;
    }
    setGenerating(true);
    try {
      const token = localStorage.getItem('train_token') || localStorage.getItem('token');
      const payload = {
        plan_id: plan?.id || null,
        title: title || plan?.name || 'Plan de Entrenamiento',
        subtitle: subtitle || '',
        style: styleId,
        sections,
        org_name: orgName || '',
        org_logo_b64: orgLogoB64 || '',
        coach_name: coachName || '',
        athlete_name: athleteName || '',
      };
      const res = await axios.post(`${API}/api/master-report/generate`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        validateStatus: () => true, // we handle non-2xx ourselves
      });
      // If server returned a JSON error with responseType=blob, decode it
      const ct = res.headers?.['content-type'] || '';
      if (res.status >= 400 || ct.includes('application/json')) {
        const errText = await res.data.text();
        let detail = errText;
        try { detail = JSON.parse(errText).detail || errText; } catch (_) {}
        toast.error(`Error generando reporte: ${detail || res.status}`);
        return;
      }
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_${(title || plan?.name || 'plan').toString().replace(/\s+/g, '_').toLowerCase()}_${styleId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Reporte Maestro descargado');
    } catch (err) {
      toast.error('Error generando reporte: ' + (err?.message || 'desconocido'));
    } finally {
      setGenerating(false);
    }
  };

  const totalSelected = Object.values(sections).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl max-h-[92vh] overflow-hidden p-0 flex flex-col bg-white"
        data-testid="master-report-modal"
      >
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800">
          <DialogTitle className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-[#CCFF00] flex items-center justify-center shadow-lg">
              <FileBarChart2 className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="text-base font-bold tracking-tight">Reporte Maestro · PDF</div>
              <DialogDescription className="text-[11px] text-slate-300 font-normal">
                Constructor selectivo · 5 estilos · logo del club · 22 secciones
              </DialogDescription>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT — meta + style + logo */}
            <div className="lg:col-span-5 space-y-5">
              <section className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                  Información del Documento
                </h3>
                <div className="space-y-2.5">
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Título</Label>
                    <Input
                      data-testid="mr-title-input"
                      value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Plan de Entrenamiento" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Subtítulo</Label>
                    <Input
                      data-testid="mr-subtitle-input"
                      value={subtitle} onChange={e => setSubtitle(e.target.value)}
                      placeholder="Macrociclo 2026 · Pre-temporada" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700">Organización</Label>
                    <Input
                      data-testid="mr-org-input"
                      value={orgName} onChange={e => setOrgName(e.target.value)}
                      placeholder="Club / Federación / Escuela" className="h-9 text-sm" />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> Logo (opcional · PNG/JPG)
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        data-testid="mr-logo-input"
                        type="file" accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="h-9 text-xs file:mr-2 file:rounded file:border-0 file:bg-slate-200 file:px-2 file:py-1 file:text-[10px]" />
                      {orgLogoB64 && (
                        <button
                          onClick={() => setOrgLogoB64('')}
                          className="p-1 rounded hover:bg-red-100 text-red-600"
                          title="Quitar logo">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    {orgLogoB64 && (
                      <div className="mt-2 p-2 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                        <img src={orgLogoB64} alt="logo" className="max-h-16 object-contain" />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                  Estilo del Documento
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {styles.map(s => {
                    const Icon = STYLE_ICONS[s.id] || FileBarChart2;
                    const active = styleId === s.id;
                    return (
                      <button
                        key={s.id}
                        data-testid={`mr-style-${s.id}`}
                        onClick={() => setStyleId(s.id)}
                        className={`text-left p-3 rounded-xl border-2 transition-all ${
                          active
                            ? 'border-slate-900 bg-slate-900 text-white shadow-lg scale-[1.02]'
                            : 'border-slate-200 bg-white hover:border-slate-400 text-slate-800'
                        }`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: active ? s.accent : s.primary, color: active ? s.primary : '#fff' }}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[12px] font-bold">{s.name}</span>
                        </div>
                        <p className={`text-[10px] leading-tight ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                          {s.vibe}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <span className="w-3 h-3 rounded" style={{ background: s.primary }} />
                          <span className="w-3 h-3 rounded" style={{ background: s.accent }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* RIGHT — sections */}
            <div className="lg:col-span-7">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  Secciones a incluir
                </h3>
                <span className="text-[11px] text-slate-600 bg-[#CCFF00] px-2 py-0.5 rounded-full font-bold">
                  {totalSelected} seleccionadas
                </span>
              </div>
              <div className="space-y-3">
                {groups.map(g => {
                  const allOn = g.items.every(it => sections[it.id]);
                  return (
                    <div key={g.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800">{g.title}</h4>
                        <button
                          data-testid={`mr-group-${g.id}-toggle-all`}
                          onClick={() => selectAllInGroup(g.items, !allOn)}
                          className="text-[10px] text-slate-600 hover:text-slate-900 font-semibold uppercase tracking-wide">
                          {allOn ? 'Quitar todo' : 'Marcar todo'}
                        </button>
                      </div>
                      <div className="p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {g.items.map(it => (
                          <label
                            key={it.id}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                              sections[it.id]
                                ? 'bg-emerald-50 border border-emerald-200'
                                : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                            }`}>
                            <Checkbox
                              data-testid={`mr-section-${it.id}`}
                              checked={!!sections[it.id]}
                              onCheckedChange={() => toggle(it.id)} />
                            <span className="text-xs text-slate-800">{it.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Plan: <strong className="text-slate-800">{plan?.name || '—'}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => onOpenChange(false)}
              disabled={generating}
              className="h-9 text-xs"
              data-testid="mr-cancel-btn">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-[#CCFF00] font-bold px-4"
              data-testid="mr-generate-btn">
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Generando…</>
              ) : (
                <><Download className="w-3.5 h-3.5 mr-1.5" />Generar Reporte</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
