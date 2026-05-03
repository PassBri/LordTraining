import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import {
  FileBarChart2, Sparkles, Notebook, Activity,
  Image as ImageIcon, X, Download, Loader2, Crown, Trophy, Award, Medal, Eye,
  GripVertical, Zap,
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
  conclusions: true,
};

const DEFAULT_COVER = {
  cover_layout: 'modern',
  author: '', advisor: '', program: '', department: '',
  institution: '', location: '', period: '', document_code: '', dedication: '',
};

export default function MasterReportModal({ open, onOpenChange, plan, athleteName, coachName }) {
  const [styles, setStyles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [layouts, setLayouts] = useState([]);
  const [styleId, setStyleId] = useState('atleta');
  const [sections, setSections] = useState({ ...DEFAULT_SELECTION });
  const [sectionOrder, setSectionOrder] = useState([]);  // ordered list of section ids
  const [dragSid, setDragSid] = useState(null);          // currently dragged section id
  const [autoPreview, setAutoPreview] = useState(true);  // auto-update preview on changes
  const [orgName, setOrgName] = useState('');
  const [orgLogoB64, setOrgLogoB64] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [coverData, setCoverData] = useState({ ...DEFAULT_COVER });
  const [customIntro, setCustomIntro] = useState('');
  const [customConclusions, setCustomConclusions] = useState('');
  const [activeTab, setActiveTab] = useState('design'); // design | cover | content | preview
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const debounceRef = useRef(null);
  const lastPayloadRef = useRef('');

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
    axios.get(`${API}/api/master-report/cover-layouts`, { headers })
      .then(r => setLayouts(r.data.layouts || [])).catch(() => {});
    if (plan?.name) setTitle(plan.name);
  }, [open, plan]);

  // Cleanup preview URL on unmount/close
  useEffect(() => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }, [open, previewUrl]);

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

  // ---- Section order helpers ----
  // Build the canonical ordered list of section ids that are currently enabled.
  const enabledSectionIds = useCallback(() => {
    return Object.entries(sections).filter(([, v]) => !!v).map(([k]) => k);
  }, [sections]);

  // Keep sectionOrder in sync with which sections are enabled.
  useEffect(() => {
    const enabled = enabledSectionIds();
    setSectionOrder(prev => {
      // Preserve existing order, append new ones, remove disabled ones.
      const kept = prev.filter(s => enabled.includes(s));
      const added = enabled.filter(s => !kept.includes(s));
      return [...kept, ...added];
    });
  }, [sections, enabledSectionIds]);

  const buildPayload = () => ({
    plan_id: plan?.id || null,
    title: title || plan?.name || 'Plan de Entrenamiento',
    subtitle: subtitle || '',
    style: styleId,
    sections,
    section_order: sectionOrder.length ? sectionOrder : undefined,
    org_name: orgName || '',
    org_logo_b64: orgLogoB64 || '',
    coach_name: coachName || '',
    athlete_name: athleteName || '',
    cover: coverData,
    custom_intro: customIntro || '',
    custom_conclusions: customConclusions || '',
  });

  const handlePreview = async () => {
    setPreviewing(true);
    try {
      const token = localStorage.getItem('train_token') || localStorage.getItem('token');
      const payload = buildPayload();
      lastPayloadRef.current = JSON.stringify(payload);
      const res = await axios.post(`${API}/api/master-report/preview`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
        validateStatus: () => true,
      });
      if (res.status >= 400) {
        const t = await res.data.text();
        toast.error('Error preview: ' + t.slice(0, 200));
        return;
      }
      const blob = new Blob([res.data], { type: 'image/png' });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      toast.error('Error preview: ' + (err?.message || ''));
    } finally {
      setPreviewing(false);
    }
  };

  // ---- Auto-preview with debounce 800ms ----
  useEffect(() => {
    if (!open || !autoPreview) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const payload = buildPayload();
      const sig = JSON.stringify(payload);
      if (sig === lastPayloadRef.current) return; // no real change
      handlePreview();
    }, 800);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoPreview, styleId, sections, sectionOrder, coverData, customIntro,
      customConclusions, title, subtitle, orgName, orgLogoB64]);

  // ---- Drag & drop reorder ----
  const onDragStart = (sid) => setDragSid(sid);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = (targetSid) => {
    if (!dragSid || dragSid === targetSid) return;
    setSectionOrder(prev => {
      const next = prev.filter(s => s !== dragSid);
      const idx = next.indexOf(targetSid);
      next.splice(idx === -1 ? next.length : idx, 0, dragSid);
      return next;
    });
    setDragSid(null);
  };

  const handleGenerate = async () => {
    if (!Object.values(sections).some(Boolean)) {
      toast.error('Selecciona al menos una sección');
      return;
    }
    setGenerating(true);
    try {
      const token = localStorage.getItem('train_token') || localStorage.getItem('token');
      const res = await axios.post(`${API}/api/master-report/generate`, buildPayload(), {
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
            <div className="flex-1">
              <div className="text-base font-bold tracking-tight">Reporte Maestro · PDF</div>
              <DialogDescription className="text-[11px] text-slate-300 font-normal">
                Constructor selectivo · 8 estilos · 4 layouts de portada · 23 secciones
              </DialogDescription>
            </div>
          </DialogTitle>
          {/* TABS */}
          <div className="flex items-center gap-1 mt-3 bg-slate-800/60 rounded-lg p-1 w-fit">
            {[
              { id: 'design', label: 'Diseño' },
              { id: 'cover', label: 'Portada' },
              { id: 'content', label: 'Contenido' },
              { id: 'preview', label: 'Vista previa' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                data-testid={`mr-tab-${t.id}`}
                className={`px-3 h-7 text-[11px] font-bold uppercase tracking-wider rounded-md transition ${
                  activeTab === t.id ? 'bg-[#CCFF00] text-slate-900' : 'text-slate-300 hover:text-white'
                }`}>{t.label}</button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* === TAB: DISEÑO (estilos + meta básica + logo) === */}
          {activeTab === 'design' && (
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
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
            </div>

            <div className="lg:col-span-7">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                Estilo del Documento <span className="text-slate-400 normal-case font-normal">· {styles.length} disponibles</span>
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
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
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
            </div>
          </div>
          )}

          {/* === TAB: PORTADA === */}
          {activeTab === 'cover' && (
          <div className="p-6 space-y-5">
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">
                Layout de portada
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                {layouts.map(l => {
                  const active = coverData.cover_layout === l.id;
                  return (
                    <button
                      key={l.id}
                      data-testid={`mr-layout-${l.id}`}
                      onClick={() => setCoverData(c => ({ ...c, cover_layout: l.id }))}
                      className={`p-3 rounded-xl border-2 text-left transition ${
                        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 hover:border-slate-400 bg-white'
                      }`}>
                      <div className="text-sm font-bold mb-1">{l.name}</div>
                      <div className={`text-[10px] leading-tight ${active ? 'text-slate-300' : 'text-slate-500'}`}>{l.vibe}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 col-span-full">
                Datos institucionales (opcionales)
              </h3>
              {[
                ['author', 'Autor / Responsable'],
                ['advisor', 'Director técnico / Asesor'],
                ['institution', 'Institución / Universidad'],
                ['department', 'Departamento / Facultad'],
                ['program', 'Programa / Disciplina'],
                ['location', 'Ubicación (Ciudad, País)'],
                ['period', 'Periodo / Temporada'],
                ['document_code', 'Código del documento'],
              ].map(([k, label]) => (
                <div key={k}>
                  <Label className="text-[11px] font-semibold text-slate-700">{label}</Label>
                  <Input
                    data-testid={`mr-cover-${k}`}
                    value={coverData[k] || ''}
                    onChange={e => setCoverData(c => ({ ...c, [k]: e.target.value }))}
                    className="h-9 text-sm" />
                </div>
              ))}
              <div className="col-span-full">
                <Label className="text-[11px] font-semibold text-slate-700">Dedicatoria (opcional)</Label>
                <Input
                  data-testid="mr-cover-dedication"
                  value={coverData.dedication || ''}
                  onChange={e => setCoverData(c => ({ ...c, dedication: e.target.value }))}
                  placeholder="Dedicado a…" className="h-9 text-sm" />
              </div>
            </div>
          </div>
          )}

          {/* === TAB: CONTENIDO (secciones + textos custom) === */}
          {activeTab === 'content' && (
          <div className="p-6 space-y-5">
            {/* Custom narratives */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2 block">
                  Introducción personalizada (opcional)
                </Label>
                <textarea
                  data-testid="mr-custom-intro"
                  value={customIntro}
                  onChange={e => setCustomIntro(e.target.value)}
                  rows={5}
                  placeholder="Escribe una introducción personalizada. Si lo dejas vacío, iTRAIN generará una por ti."
                  className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 resize-y" />
              </div>
              <div>
                <Label className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2 block">
                  Conclusiones personalizadas (opcional)
                </Label>
                <textarea
                  data-testid="mr-custom-conclusions"
                  value={customConclusions}
                  onChange={e => setCustomConclusions(e.target.value)}
                  rows={5}
                  placeholder="Resume los próximos pasos, hallazgos y compromisos del cuerpo técnico."
                  className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 resize-y" />
              </div>
            </div>

            {/* Sections selector */}
            <div>
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
          )}

          {/* === TAB: PREVIEW === */}
          {activeTab === 'preview' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Vista previa del documento</h3>
                  <p className="text-[11px] text-slate-500">Documento completo · scrollable como un Word · auto-actualiza al editar.</p>
                </div>
                <button
                  onClick={() => setAutoPreview(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                    autoPreview ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  }`}
                  data-testid="mr-auto-preview-toggle"
                  title="Activar/desactivar auto-actualización al editar">
                  <Zap className={`w-3 h-3 ${autoPreview ? 'fill-emerald-600' : ''}`} />
                  Auto · {autoPreview ? 'ON' : 'OFF'}
                </button>
              </div>
              <Button
                size="sm" onClick={handlePreview} disabled={previewing}
                className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                data-testid="mr-preview-btn">
                {previewing ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Renderizando…</> :
                  <><Eye className="w-3.5 h-3.5 mr-1.5" />Actualizar ahora</>}
              </Button>
            </div>
            <div className="bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 p-3 max-h-[640px] overflow-y-auto flex items-start justify-center"
              data-testid="mr-preview-canvas">
              {previewUrl ? (
                <div className="relative">
                  {previewing && (
                    <div className="absolute top-2 right-2 z-10 bg-slate-900/85 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-sm">
                      <Loader2 className="w-3 h-3 animate-spin" />Actualizando…
                    </div>
                  )}
                  <img src={previewUrl} alt="Vista previa"
                    className="max-w-full shadow-2xl rounded-lg border border-slate-300 bg-white"
                    style={{ maxWidth: '720px' }} />
                </div>
              ) : previewing ? (
                <div className="text-center text-slate-500 py-20">
                  <Loader2 className="w-10 h-10 mx-auto mb-2 animate-spin text-slate-400" />
                  <p className="text-sm">Renderizando documento…</p>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-20">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aún no hay vista previa generada.</p>
                  <p className="text-[11px]">Activa Auto · ON o pulsa "Actualizar ahora".</p>
                </div>
              )}
            </div>
            {/* Order editor */}
            {sectionOrder.length > 0 && (
              <div className="mt-4 bg-white border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Orden del documento <span className="normal-case font-normal text-slate-400">· arrastra para reorganizar</span>
                  </h4>
                  <span className="text-[10px] text-slate-500">{sectionOrder.length} secciones</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5" data-testid="mr-order-list">
                  {sectionOrder.map((sid, idx) => {
                    const label = (groups.flatMap(g => g.items).find(it => it.id === sid) || {}).label || sid;
                    const isDragging = dragSid === sid;
                    return (
                      <div
                        key={sid}
                        draggable
                        onDragStart={() => onDragStart(sid)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(sid)}
                        onDragEnd={() => setDragSid(null)}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border-2 cursor-move transition select-none ${
                          isDragging
                            ? 'opacity-40 border-slate-900 bg-slate-50'
                            : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50'
                        }`}
                        data-testid={`mr-order-item-${sid}`}
                      >
                        <GripVertical className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px] font-bold text-slate-400 tabular-nums w-5 text-center">{idx + 1}</span>
                        <span className="text-xs text-slate-800 truncate flex-1">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Plan: <strong className="text-slate-800">{plan?.name || '—'}</strong>
            <span className="text-slate-400">·</span>
            <span className="font-semibold text-slate-700">{styles.find(s => s.id === styleId)?.name || styleId}</span>
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
              variant="outline" size="sm"
              onClick={handlePreview}
              disabled={generating || previewing}
              className="h-9 text-xs"
              data-testid="mr-quick-preview-btn">
              {previewing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Eye className="w-3.5 h-3.5 mr-1.5" />}
              Vista previa
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
                <><Download className="w-3.5 h-3.5 mr-1.5" />Generar PDF</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
