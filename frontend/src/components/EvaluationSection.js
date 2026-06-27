import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Heart, Dumbbell, Target, Layers, Brain, BookOpen, FileText, Activity,
  Ruler, AlertTriangle, CheckCircle, Save, Loader2, Plus, Trash2,
  FileDown, Link2, Send, Library, Star, X, Calendar, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { EvaluationMiniChart } from './EvaluationEvolution';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const EVAL_CONFIGS = {
  'control-medical':       { type: 'medical',       title: 'Control Médico',       subtitle: 'Estado de salud y aptitud para el entrenamiento', icon: Heart,    color: '#EF4444', accent: 'red' },
  'control-physical':      { type: 'physical',      title: 'Control Físico',       subtitle: 'Capacidades físicas y condición',                  icon: Dumbbell, color: '#3B82F6', accent: 'blue' },
  'control-technical':     { type: 'technical',     title: 'Control Técnico',      subtitle: 'Habilidades técnicas específicas del deporte',     icon: Target,   color: '#8B5CF6', accent: 'violet' },
  'control-tactical':      { type: 'tactical',      title: 'Control Táctico',      subtitle: 'Comprensión táctica y toma de decisiones',         icon: Layers,   color: '#F59E0B', accent: 'amber' },
  'control-psychological': { type: 'psychological', title: 'Control Psicológico',  subtitle: 'Bienestar mental y habilidades psicológicas',      icon: Brain,    color: '#EC4899', accent: 'pink' },
  'control-theoretical':   { type: 'theoretical',   title: 'Control Teórico',      subtitle: 'Conocimiento teórico del deporte',                 icon: BookOpen, color: '#14B8A6', accent: 'teal' },
  'control-anthropometric': { type: 'anthropometric', title: 'Antropometría',      subtitle: 'Composición corporal y mediciones',                icon: Ruler,    color: '#06B6D4', accent: 'cyan' },
  'control-biomechanical':  { type: 'biomechanical',  title: 'Biomecánica',        subtitle: 'Análisis del movimiento y técnica deportiva',      icon: Activity, color: '#10B981', accent: 'emerald' },
};

const newId = () => Math.random().toString(36).slice(2, 12);
const todayISO = () => new Date().toISOString().split('T')[0];

const blankAspect = () => ({
  id: newId(),
  label: '',
  category: 'General',
  scale_min: 0,
  scale_max: 10,
  scale_unit: '/10',
  target: '',
  value: '',
  notes: ''
});

// ===== Aspect Row =====
const AspectRow = ({ aspect, color, onChange, onRemove, testidPrefix }) => {
  const norm = (() => {
    const v = parseFloat(aspect.value);
    const mn = parseFloat(aspect.scale_min);
    const mx = parseFloat(aspect.scale_max);
    if (isNaN(v) || mx === mn) return null;
    return Math.max(0, Math.min(100, ((v - mn) / (mx - mn)) * 100));
  })();
  const barColor = norm == null ? '#cbd5e1' : norm >= 80 ? '#10B981' : norm >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 hover:shadow-sm transition" data-testid={`${testidPrefix}-aspect-${aspect.id}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 grid grid-cols-12 gap-2">
          <Input className="col-span-12 md:col-span-6 h-9 font-semibold" placeholder="Nombre del aspecto a evaluar"
            value={aspect.label} onChange={(e) => onChange({ ...aspect, label: e.target.value })}
            data-testid={`${testidPrefix}-aspect-label-${aspect.id}`} />
          <Input className="col-span-6 md:col-span-3 h-9 text-sm" placeholder="Categoría"
            value={aspect.category} onChange={(e) => onChange({ ...aspect, category: e.target.value })} />
          <Input className="col-span-6 md:col-span-3 h-9 text-sm" placeholder="Unidad"
            value={aspect.scale_unit || ''} onChange={(e) => onChange({ ...aspect, scale_unit: e.target.value })} />
        </div>
        <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
          onClick={() => onRemove(aspect.id)} data-testid={`${testidPrefix}-aspect-remove-${aspect.id}`}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-6 md:col-span-2"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mín</label>
          <Input type="number" className="h-8 text-sm" value={aspect.scale_min} onChange={(e) => onChange({ ...aspect, scale_min: e.target.value })} /></div>
        <div className="col-span-6 md:col-span-2"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Máx</label>
          <Input type="number" className="h-8 text-sm" value={aspect.scale_max} onChange={(e) => onChange({ ...aspect, scale_max: e.target.value })} /></div>
        <div className="col-span-6 md:col-span-2"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Objetivo</label>
          <Input type="number" className="h-8 text-sm" value={aspect.target ?? ''} placeholder="—" onChange={(e) => onChange({ ...aspect, target: e.target.value })} /></div>
        <div className="col-span-6 md:col-span-3"><label className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>Valor medido</label>
          <Input type="number" step="0.01" className="h-9 text-base font-bold border-2"
            style={{ borderColor: norm == null ? '#e2e8f0' : barColor, color: norm == null ? '#0f172a' : barColor }}
            value={aspect.value ?? ''} placeholder="—" onChange={(e) => onChange({ ...aspect, value: e.target.value })}
            data-testid={`${testidPrefix}-aspect-value-${aspect.id}`} /></div>
        <div className="col-span-6 md:col-span-3"><label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">% Cumplimiento</label>
          <div className="h-9 flex items-center gap-2">
            <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${norm ?? 0}%`, background: barColor }} />
            </div>
            <span className="text-xs font-bold tabular-nums" style={{ color: barColor }}>{norm == null ? '—' : `${norm.toFixed(0)}%`}</span>
          </div></div>
      </div>
      <Input className="h-8 text-xs" placeholder="Nota (opcional)" value={aspect.notes || ''}
        onChange={(e) => onChange({ ...aspect, notes: e.target.value })} />
    </div>
  );
};

// ===== Templates Modal =====
const TemplatesModal = ({ open, onClose, evaluationType, color, currentAspects, onLoadTemplate, onSaveTemplate, refreshFlag }) => {
  const [items, setItems] = useState([]);
  const [systemDefault, setSystemDefault] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/templates/${evaluationType}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setItems(d.templates || []);
      setSystemDefault(d.system_default || null);
    } catch { toast.error('Error cargando plantillas'); }
    setLoading(false);
  }, [evaluationType, open]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates, refreshFlag]);

  const handleSetDefault = async (id) => {
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/plan-data/evaluations-export/templates/${id}/set-default`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Plantilla por defecto actualizada'); fetchTemplates();
    } catch { toast.error('Error'); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar plantilla?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/plan-data/evaluations-export/templates/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Plantilla eliminada'); fetchTemplates();
    } catch { toast.error('Error'); }
  };
  const handleSaveCurrent = async () => {
    if (!newName.trim()) return toast.error('Pon un nombre');
    if (!currentAspects?.length) return toast.error('No hay aspectos');
    setSaving(true); await onSaveTemplate(newName.trim()); setNewName(''); setSaving(false); fetchTemplates();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()} data-testid="eval-templates-modal">
        <div className="flex items-center justify-between p-5 border-b border-slate-200" style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: color }}><Library className="w-5 h-5 text-white" /></div>
            <div><h3 className="text-lg font-bold text-slate-900">Plantillas reutilizables</h3>
              <p className="text-xs text-slate-500">Reutiliza aspectos entre atletas y sesiones</p></div>
          </div>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Input placeholder="Nombre nueva plantilla" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="eval-template-name-input" />
            <Button onClick={handleSaveCurrent} disabled={saving || !newName.trim()} style={{ background: color }} className="text-white" data-testid="eval-template-save-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Guardar actual</>}
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Guarda los {currentAspects?.length || 0} aspectos actuales como plantilla</p>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-2" data-testid="eval-templates-list">
          {loading ? <p className="text-center text-slate-400 py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></p> : (
            <>
              {systemDefault && (
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  <div className="flex items-center gap-2"><Star className="w-4 h-4 text-slate-400" />
                    <div><p className="font-semibold text-sm text-slate-700">{systemDefault.name}</p>
                      <p className="text-[11px] text-slate-500">{systemDefault.aspects.length} aspectos</p></div></div>
                  <Button size="sm" variant="outline" onClick={() => onLoadTemplate(systemDefault)} data-testid="eval-template-load-system">Cargar</Button>
                </div>
              )}
              {items.length === 0 && !systemDefault && <p className="text-center text-slate-400 py-8">Sin plantillas</p>}
              {items.map(tpl => (
                <div key={tpl.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    {tpl.is_default ? <Star className="w-4 h-4 fill-amber-400 text-amber-500" /> : <Library className="w-4 h-4 text-slate-400" />}
                    <div><p className="font-semibold text-sm text-slate-900">{tpl.name}</p>
                      <p className="text-[11px] text-slate-500">{tpl.aspects.length} aspectos {tpl.is_default && '· Default'}</p></div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!tpl.is_default && <Button size="sm" variant="ghost" onClick={() => handleSetDefault(tpl.id)} className="h-8 px-2"><Star className="w-3.5 h-3.5" /></Button>}
                    <Button size="sm" variant="outline" onClick={() => onLoadTemplate(tpl)} data-testid={`eval-template-load-${tpl.id}`} className="h-8">Cargar</Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(tpl.id)} className="h-8 px-2 text-red-500"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};


// =============================================================
// MAIN
// =============================================================
const EvaluationSection = ({ sectionId, activePlan, athletes = [], selectedAthleteId }) => {
  const config = EVAL_CONFIGS[sectionId];
  const Icon = config?.icon;
  const [controls, setControls] = useState([]);  // Lista de controles guardados (resumen)
  const [activeId, setActiveId] = useState(null); // id del control activo (null = nuevo no guardado)
  const [aspects, setAspects] = useState([]);
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState('');
  const [fortalezas, setFortalezas] = useState('');
  const [areasMejora, setAreasMejora] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyExport, setBusyExport] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templatesRefresh, setTemplatesRefresh] = useState(0);
  const [fromTemplate, setFromTemplate] = useState('');

  const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
  const evalType = config?.type;

  // Lista de controles (cabecera de tabs)
  const fetchList = useCallback(async () => {
    if (!activePlan || !evalType) return [];
    try {
      const token = localStorage.getItem('train_token');
      const url = `${API_URL}/api/plan-data/evaluations-export/list/${activePlan.id}/${evalType}` +
        (selectedAthleteId ? `?athlete_id=${selectedAthleteId}` : '');
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const list = d.controls || [];
      setControls(list);
      return list;
    } catch { return []; }
  }, [activePlan, evalType, selectedAthleteId]);

  const loadControl = useCallback(async (evaluationId) => {
    if (!evaluationId) {
      // "Nuevo control": cargar template del sistema
      setLoading(true);
      try {
        const token = localStorage.getItem('train_token');
        const url = `${API_URL}/api/plan-data/evaluations-export/${activePlan.id}/${evalType}` +
          (selectedAthleteId ? `?athlete_id=${selectedAthleteId}` : '');
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        // Si retorna un control existente con id, ignoramos id (queremos uno NUEVO en blanco)
        const seedAspects = (d.aspects || []).map(a => ({ ...a, id: a.id || newId(), value: '', notes: '' }));
        setActiveId(null);
        setAspects(seedAspects);
        setDate(todayISO());
        setTitle('');
        setFortalezas('');
        setAreasMejora('');
        setNotes('');
        setFromTemplate(d.from_template || '');
      } catch { toast.error('Error'); }
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/by-id/${evaluationId}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      setActiveId(evaluationId);
      setAspects((d.aspects || []).map(a => ({ ...a, id: a.id || newId() })));
      setDate(d.date || todayISO());
      setTitle(d.title || '');
      setFortalezas(d.fortalezas || '');
      setAreasMejora(d.areas_mejora || '');
      setNotes(d.notes || '');
      setFromTemplate('');
    } catch { toast.error('Error cargando control'); }
    setLoading(false);
  }, [activePlan, evalType, selectedAthleteId]);

  // Carga inicial: lista + último control (si existe) o blank
  useEffect(() => {
    (async () => {
      if (!activePlan || !evalType) return;
      const list = await fetchList();
      if (list.length > 0) {
        await loadControl(list[0].id);
      } else {
        await loadControl(null);
      }
    })();
  }, [activePlan, evalType, selectedAthleteId, fetchList, loadControl]);

  if (!config) return null;

  const updateAspect = (u) => setAspects(prev => prev.map(a => a.id === u.id ? u : a));
  const removeAspect = (id) => setAspects(prev => prev.filter(a => a.id !== id));
  const addAspect = () => setAspects(prev => [...prev, blankAspect()]);

  const handleNewControl = () => {
    if (aspects.some(a => a.value !== '' && a.value !== null && !isNaN(parseFloat(a.value))) && !window.confirm('¿Crear un control nuevo? El que estás editando no se perderá si ya lo guardaste.')) return;
    loadControl(null);
    toast.success('Listo para registrar un nuevo control');
  };

  const buildPayload = () => ({
    id: activeId || undefined,
    plan_id: activePlan.id,
    athlete_id: selectedAthleteId || null,
    evaluation_type: evalType,
    date: date || todayISO(),
    title: title || '',
    aspects: aspects.map(a => ({
      id: a.id, label: a.label, category: a.category || 'General',
      scale_min: parseFloat(a.scale_min) || 0,
      scale_max: parseFloat(a.scale_max) || 10,
      scale_unit: a.scale_unit || '',
      target: a.target === '' || a.target === null ? null : parseFloat(a.target),
      value: a.value === '' || a.value === null ? null : parseFloat(a.value),
      notes: a.notes || '',
    })),
    fortalezas, areas_mejora: areasMejora, notes,
  });

  const handleSave = async () => {
    if (!activePlan) return toast.error('Selecciona un plan');
    if (!aspects.length) return toast.error('Agrega al menos un aspecto');
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload())
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setActiveId(d.id);
      toast.success(`${config.title} guardado`);
      // Refresca lista + dispara evento global para que GraphicPlan se actualice
      await fetchList();
      window.dispatchEvent(new CustomEvent('lordtraining:evaluation-saved', { detail: { plan_id: activePlan.id, evaluation_type: evalType, date } }));
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const handleSaveSilent = async () => {
    if (!activePlan) return null;
    const token = localStorage.getItem('train_token');
    const r = await fetch(`${API_URL}/api/plan-data/evaluations-export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(buildPayload())
    });
    if (!r.ok) return null;
    const d = await r.json();
    if (d.id) setActiveId(d.id);
    await fetchList();
    return d.id;
  };

  const handleDownloadPDF = async () => {
    if (!activePlan) return toast.error('Selecciona un plan');
    setBusyExport('pdf');
    try {
      const eid = await handleSaveSilent();
      if (!eid) throw new Error('No se pudo guardar');
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/by-id/${eid}/pdf?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('PDF error');
      const blob = await r.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${evalType}_${date || todayISO()}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      toast.success('PDF descargado');
    } catch (e) { toast.error(e.message || 'Error PDF'); }
    setBusyExport(null);
  };

  const handleShareLink = async () => {
    if (!activePlan) return toast.error('Selecciona un plan');
    setBusyExport('link');
    try {
      const eid = await handleSaveSilent();
      if (!eid) throw new Error('No se pudo guardar');
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/by-id/${eid}/share?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const fullUrl = `${window.location.origin}/api/plan-data/evaluations-export/shared/${d.share_id}`;
      await navigator.clipboard.writeText(fullUrl);
      toast.success('Enlace copiado al portapapeles');
    } catch { toast.error('Error al compartir'); }
    setBusyExport(null);
  };

  const handleShareWhatsApp = async () => {
    if (!activePlan) return toast.error('Selecciona un plan');
    setBusyExport('whatsapp');
    try {
      const eid = await handleSaveSilent();
      if (!eid) throw new Error('No se pudo guardar');
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/by-id/${eid}/share?lang=${(localStorage.getItem('train_language') || 'es').split('-')[0]}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      const fullUrl = `${window.location.origin}/api/plan-data/evaluations-export/shared/${d.share_id}`;
      const lbl = title ? `${config.title} · ${title}` : config.title;
      const msg = encodeURIComponent(`📊 ${lbl} · ${activePlan.name}${selectedAthlete ? ` · ${selectedAthlete.name}` : ''}\n${date}\n\n${fullUrl}`);
      window.open(`https://wa.me/?text=${msg}`, '_blank');
      toast.success('Compartiendo en WhatsApp');
    } catch { toast.error('Error al compartir'); }
    setBusyExport(null);
  };

  const handleDeleteControl = async () => {
    if (!activeId) return toast.error('Este control aún no está guardado');
    if (!window.confirm(`¿Eliminar el control "${title || date}"?`)) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/plan-data/evaluations-export/by-id/${activeId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Control eliminado');
      const list = await fetchList();
      if (list.length > 0) await loadControl(list[0].id);
      else await loadControl(null);
      window.dispatchEvent(new CustomEvent('lordtraining:evaluation-saved', { detail: { plan_id: activePlan.id, evaluation_type: evalType } }));
    } catch { toast.error('Error eliminando'); }
  };

  const handleSaveTemplate = async (name) => {
    try {
      const token = localStorage.getItem('train_token');
      const r = await fetch(`${API_URL}/api/plan-data/evaluations-export/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name, evaluation_type: evalType,
          aspects: aspects.map(a => ({
            id: a.id, label: a.label, category: a.category,
            scale_min: parseFloat(a.scale_min) || 0,
            scale_max: parseFloat(a.scale_max) || 10,
            scale_unit: a.scale_unit,
            target: a.target === '' ? null : parseFloat(a.target),
          })),
          is_default: false,
        })
      });
      if (!r.ok) throw new Error();
      toast.success('Plantilla guardada');
      setTemplatesRefresh(x => x + 1);
    } catch { toast.error('Error guardando plantilla'); }
  };

  const handleLoadTemplate = (tpl) => {
    if (!tpl?.aspects?.length) return;
    if (aspects.length && !window.confirm(`¿Reemplazar los ${aspects.length} aspectos por los ${tpl.aspects.length} de "${tpl.name}"?`)) return;
    setAspects(tpl.aspects.map(a => ({ ...a, id: newId(), value: '', notes: '' })));
    setFromTemplate(tpl.name);
    setShowTemplates(false);
    toast.success(`Plantilla "${tpl.name}" cargada`);
  };

  const grouped = aspects.reduce((acc, a) => {
    const cat = a.category || 'General';
    (acc[cat] = acc[cat] || []).push(a);
    return acc;
  }, {});

  const measured = aspects.filter(a => a.value !== '' && a.value !== null && !isNaN(parseFloat(a.value))).length;
  const globalAvg = (() => {
    const ns = aspects.map(a => {
      const v = parseFloat(a.value); const mn = parseFloat(a.scale_min); const mx = parseFloat(a.scale_max);
      if (isNaN(v) || mx === mn) return null;
      return Math.max(0, Math.min(100, ((v - mn) / (mx - mn)) * 100));
    }).filter(x => x !== null);
    return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
  })();

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]" data-testid={`eval-${evalType}`}>
      {/* Material Design Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-center gap-3 sticky top-0 z-10">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: config.color }}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{config.title}</h2>
          <p className="text-xs text-slate-500">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {activePlan && <Badge variant="outline" className="text-xs">{activePlan.name}</Badge>}
          {selectedAthlete && <Badge variant="outline" className="text-xs bg-slate-50">{selectedAthlete.name}</Badge>}
          {fromTemplate && !activeId && <Badge className="text-xs" style={{ background: `${config.color}20`, color: config.color }}>Tpl: {fromTemplate}</Badge>}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <Button size="sm" variant="default" onClick={handleNewControl} data-testid={`eval-${evalType}-new-control-btn`} style={{ background: config.color }} className="text-white" title={`Nuevo control de ${config.title}`}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo control
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)} data-testid={`eval-${evalType}-templates-btn`}>
            <Library className="w-4 h-4 mr-1" /> Plantillas
          </Button>
          <Button size="sm" variant="outline" onClick={handleDownloadPDF} disabled={busyExport === 'pdf' || !activePlan} data-testid={`eval-${evalType}-pdf-btn`}>
            {busyExport === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}<span className="hidden md:inline ml-1">PDF</span>
          </Button>
          <Button size="sm" variant="outline" onClick={handleShareLink} disabled={busyExport === 'link' || !activePlan} data-testid={`eval-${evalType}-link-btn`}>
            {busyExport === 'link' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}<span className="hidden md:inline ml-1">Enlace</span>
          </Button>
          <Button size="sm" variant="outline" onClick={handleShareWhatsApp} disabled={busyExport === 'whatsapp' || !activePlan} data-testid={`eval-${evalType}-whatsapp-btn`} className="text-green-600 border-green-300 hover:bg-green-50">
            {busyExport === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}<span className="hidden md:inline ml-1">WhatsApp</span>
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !activePlan} style={{ background: config.color }} className="text-white" data-testid={`eval-${evalType}-save-btn`}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Guardar
          </Button>
        </div>
      </div>

      {/* Multi-control selector + Date + Title */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3" data-testid={`eval-${evalType}-controls-bar`}>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1"><Calendar className="w-3 h-3" />Fecha del control</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-44" data-testid={`eval-${evalType}-date-input`} />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Título del control (opcional)</label>
            <Input placeholder="Ej: Control inicial pretemporada" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" data-testid={`eval-${evalType}-title-input`} />
          </div>
          {activeId && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">&nbsp;</label>
              <Button size="sm" variant="outline" onClick={handleDeleteControl} className="text-red-500 border-red-200 hover:bg-red-50 h-9" data-testid={`eval-${evalType}-delete-btn`}>
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar este control
              </Button>
            </div>
          )}
        </div>
        {controls.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Historial de controles ({controls.length})</p>
            <div className="flex items-center gap-2 flex-wrap" data-testid={`eval-${evalType}-history`}>
              {controls.map(c => (
                <button key={c.id} onClick={() => loadControl(c.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition border ${activeId === c.id ? 'text-white shadow-md scale-105' : 'bg-white text-slate-700 hover:border-slate-400'}`}
                  style={activeId === c.id ? { background: config.color, borderColor: config.color } : { borderColor: '#e2e8f0' }}
                  data-testid={`eval-${evalType}-history-item-${c.id}`}>
                  <Calendar className="w-3 h-3" />
                  <span>{c.date}</span>
                  {c.title && <span className="opacity-80">· {c.title.substring(0, 20)}</span>}
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ background: activeId === c.id ? 'rgba(255,255,255,0.2)' : `${config.color}15`, color: activeId === c.id ? '#fff' : config.color }}>{c.global_pct}%</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hero global stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl p-4 text-white shadow-md" style={{ background: `linear-gradient(135deg, ${config.color}, #0f172a)` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">% Promedio</p>
          <p className="text-3xl font-extrabold tabular-nums">{globalAvg.toFixed(0)}<span className="text-base opacity-70">%</span></p>
          <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-white rounded-full" style={{ width: `${globalAvg}%` }} /></div>
        </div>
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aspectos</p>
          <p className="text-3xl font-extrabold tabular-nums text-slate-900">{aspects.length}</p>
          <p className="text-xs text-slate-500 mt-1">definidos en total</p>
        </div>
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Medidos</p>
          <p className="text-3xl font-extrabold tabular-nums" style={{ color: config.color }}>{measured}</p>
          <p className="text-xs text-slate-500 mt-1">de {aspects.length} con valor</p>
        </div>
        <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categorías</p>
          <p className="text-3xl font-extrabold tabular-nums text-slate-900">{Object.keys(grouped).length}</p>
          <p className="text-xs text-slate-500 mt-1">grupos</p>
        </div>
      </div>

      {loading && <div className="text-center py-10 text-slate-400"><Loader2 className="w-6 h-6 animate-spin inline" /><p className="text-sm mt-2">Cargando aspectos...</p></div>}

      {!loading && controls.length >= 2 && (
        <EvaluationMiniChart controls={controls} color={config.color} type={evalType} />
      )}

      {!loading && Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} className="border-0 shadow-sm" data-testid={`eval-${evalType}-category-${cat}`}>
          <CardHeader className="bg-white border-b border-slate-100 py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: config.color }} />
              <span className="font-bold text-slate-900">{cat}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">{items.length} aspecto{items.length === 1 ? '' : 's'}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2 bg-slate-50/40">
            {items.map(a => (
              <AspectRow key={a.id} aspect={a} color={config.color} onChange={updateAspect} onRemove={removeAspect} testidPrefix={`eval-${evalType}`} />
            ))}
          </CardContent>
        </Card>
      ))}

      {!loading && (
        <Button onClick={addAspect} variant="outline" className="w-full h-12 border-dashed border-2 hover:border-solid"
          style={{ borderColor: config.color, color: config.color }} data-testid={`eval-${evalType}-add-aspect-btn`}>
          <Plus className="w-5 h-5 mr-2" /> Agregar aspecto a evaluar
        </Button>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
            <CardHeader className="py-3 bg-white"><CardTitle className="text-sm flex items-center gap-2 text-emerald-700"><CheckCircle className="w-4 h-4" />Fortalezas</CardTitle></CardHeader>
            <CardContent className="p-4">
              <textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
                placeholder="Aspectos positivos..." value={fortalezas} onChange={(e) => setFortalezas(e.target.value)} data-testid={`eval-${evalType}-fortalezas`} />
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
            <CardHeader className="py-3 bg-white"><CardTitle className="text-sm flex items-center gap-2 text-amber-700"><AlertTriangle className="w-4 h-4" />Áreas de Mejora</CardTitle></CardHeader>
            <CardContent className="p-4">
              <textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Aspectos a trabajar..." value={areasMejora} onChange={(e) => setAreasMejora(e.target.value)} data-testid={`eval-${evalType}-areas-mejora`} />
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3 bg-white"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" />Notas adicionales</CardTitle></CardHeader>
          <CardContent className="p-4">
            <textarea className="w-full h-20 p-2 text-sm border rounded-lg resize-none" placeholder="Observaciones..." value={notes} onChange={(e) => setNotes(e.target.value)} data-testid={`eval-${evalType}-notes`} />
          </CardContent>
        </Card>
      )}

      <TemplatesModal open={showTemplates} onClose={() => setShowTemplates(false)} evaluationType={evalType}
        color={config.color} currentAspects={aspects} onLoadTemplate={handleLoadTemplate}
        onSaveTemplate={handleSaveTemplate} refreshFlag={templatesRefresh} />
    </div>
  );
};

export default EvaluationSection;
export { EVAL_CONFIGS };
