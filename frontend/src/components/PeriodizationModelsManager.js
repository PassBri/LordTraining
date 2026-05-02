import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Plus, Edit2, Trash2, Search, Filter, Copy, Layers, RotateCcw,
  Loader2, Save, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info,
  GitCompare
} from 'lucide-react';
import { toast } from 'sonner';
import PeriodizationComparator from './PeriodizationComparator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORIES = ['Clásico', 'Ondulatorio', 'Avanzado', 'Específico', 'Fuerza', 'Equipo', 'Custom'];
const CATEGORY_COLORS = {
  'Clásico': 'bg-blue-100 text-blue-700 border-blue-200',
  'Ondulatorio': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Avanzado': 'bg-purple-100 text-purple-700 border-purple-200',
  'Específico': 'bg-orange-100 text-orange-700 border-orange-200',
  'Fuerza': 'bg-rose-100 text-rose-700 border-rose-200',
  'Equipo': 'bg-teal-100 text-teal-700 border-teal-200',
  'Custom': 'bg-slate-900 text-[#CCFF00] border-slate-700',
};
const ICON_CHOICES = ['📊', '🔄', '📦', '📈', '🌊', '⚖️', '🎯', '💪', '⚽', '🔺', '⚡', '🔬', '🇳🇴', '📏', '🧱', '🎚️', '🎛️', '🤖', '⏩', '⬇️', '🔀', '👥', '🧩', '🏆', '🏈', '🎓', '🏋️', '🏃', '🎾'];
const COLOR_CHOICES = ['#CCFF00', '#3B82F6', '#8B5CF6', '#10B981', '#EF4444', '#F59E0B', '#06B6D4', '#A855F7', '#EC4899', '#FBBF24', '#0EA5E9', '#059669', '#DC2626'];

const emptyPhase = () => ({ name: '', color: '#3B82F6', volume: 70, intensity: 70, duration_weeks: '4', description: '' });

const emptyModel = () => ({
  name: '',
  author: '',
  category: 'Custom',
  description: '',
  icon: '📊',
  color: '#CCFF00',
  phases: [emptyPhase()],
  characteristics: [],
  applicable_sports: [],
  recommended_duration: '',
});

const PeriodizationModelsManager = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [comparatorOpen, setComparatorOpen] = useState(false);

  const MAX_COMPARE = 3;
  const toggleCompare = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_COMPARE) {
        toast.error(`Máximo ${MAX_COMPARE} modelos en el comparador`);
        return prev;
      }
      return [...prev, id];
    });
  };
  const clearCompare = () => setCompareIds([]);
  const removeFromCompare = (id) => setCompareIds(prev => prev.filter(x => x !== id));
  const selectedForCompare = useMemo(() => compareIds.map(id => models.find(m => m.id === id)).filter(Boolean), [compareIds, models]);

  const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('train_token')}` });

  const fetchModels = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/periodization-library`, { headers: getHeaders() });
      setModels(data || []);
    } catch (e) {
      toast.error('No se pudieron cargar los modelos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  const filtered = useMemo(() => {
    return models.filter(m => {
      const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.author?.toLowerCase().includes(search.toLowerCase()) ||
        m.description?.toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'all' || m.category === filterCategory;
      return matchSearch && matchCat;
    });
  }, [models, search, filterCategory]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(m => {
      if (!g[m.category]) g[m.category] = [];
      g[m.category].push(m);
    });
    return g;
  }, [filtered]);

  const openCreate = () => { setEditing({ ...emptyModel(), _isNew: true }); setEditorOpen(true); };
  const openEdit = (m) => { setEditing(JSON.parse(JSON.stringify(m))); setEditorOpen(true); };
  const openDuplicate = (m) => {
    const copy = JSON.parse(JSON.stringify(m));
    delete copy.id;
    copy._isNew = true;
    copy.is_default = false;
    copy.name = `${m.name} (Copia)`;
    copy.category = 'Custom';
    setEditing(copy);
    setEditorOpen(true);
  };

  const saveModel = async () => {
    if (!editing.name?.trim()) { toast.error('El nombre es obligatorio'); return; }
    if (!editing.phases?.length) { toast.error('Agrega al menos una fase'); return; }
    setSaving(true);
    try {
      const payload = {
        name: editing.name.trim(),
        author: editing.author || '',
        category: editing.category || 'Custom',
        description: editing.description || '',
        icon: editing.icon || '📊',
        color: editing.color || '#CCFF00',
        phases: editing.phases.map(p => ({
          name: p.name || 'Fase',
          color: p.color || '#3B82F6',
          volume: Number(p.volume) || 0,
          intensity: Number(p.intensity) || 0,
          duration_weeks: String(p.duration_weeks || '4'),
          description: p.description || '',
        })),
        characteristics: editing.characteristics || [],
        applicable_sports: editing.applicable_sports || [],
        recommended_duration: editing.recommended_duration || '',
      };
      if (editing._isNew) {
        await axios.post(`${API}/periodization-library`, payload, { headers: getHeaders() });
        toast.success('Modelo creado');
      } else {
        await axios.put(`${API}/periodization-library/${editing.id}`, payload, { headers: getHeaders() });
        toast.success('Modelo actualizado');
      }
      setEditorOpen(false);
      setEditing(null);
      fetchModels();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    try {
      await axios.delete(`${API}/periodization-library/${confirmDelete.id}`, { headers: getHeaders() });
      toast.success('Modelo eliminado');
      setConfirmDelete(null);
      fetchModels();
    } catch (e) {
      toast.error('No se pudo eliminar');
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm('Esto re-creará los 29 modelos por defecto. Los modelos personalizados no se tocan. ¿Continuar?')) return;
    try {
      const { data } = await axios.post(`${API}/periodization-library/reset-defaults`, {}, { headers: getHeaders() });
      setModels(data);
      toast.success('Biblioteca por defecto restaurada');
    } catch (e) {
      toast.error('Error al restaurar');
    }
  };

  // ============ Editor helpers ============
  const updField = (field, value) => setEditing(prev => ({ ...prev, [field]: value }));
  const updPhase = (idx, field, value) => {
    setEditing(prev => {
      const phases = [...prev.phases];
      phases[idx] = { ...phases[idx], [field]: value };
      return { ...prev, phases };
    });
  };
  const addPhase = () => setEditing(prev => ({ ...prev, phases: [...prev.phases, emptyPhase()] }));
  const removePhase = (idx) => setEditing(prev => ({ ...prev, phases: prev.phases.filter((_, i) => i !== idx) }));
  const movePhase = (idx, dir) => {
    setEditing(prev => {
      const phases = [...prev.phases];
      const j = idx + dir;
      if (j < 0 || j >= phases.length) return prev;
      [phases[idx], phases[j]] = [phases[j], phases[idx]];
      return { ...prev, phases };
    });
  };

  // characteristics/sports list editor
  const addListItem = (field) => setEditing(prev => ({ ...prev, [field]: [...(prev[field] || []), ''] }));
  const updListItem = (field, idx, value) => setEditing(prev => {
    const arr = [...(prev[field] || [])];
    arr[idx] = value;
    return { ...prev, [field]: arr };
  });
  const removeListItem = (field, idx) => setEditing(prev => ({ ...prev, [field]: (prev[field] || []).filter((_, i) => i !== idx) }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="periodization-models-manager">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#007AFF]" />
            Modelos de Periodización
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {models.length} modelos disponibles · Se usan al crear planes de entrenamiento
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {compareIds.length > 0 && (
            <Button
              onClick={() => setComparatorOpen(true)}
              className="gap-2 bg-slate-900 text-[#CCFF00] hover:bg-slate-800 font-bold"
              data-testid="open-comparator-btn"
            >
              <GitCompare className="w-4 h-4" />
              Comparar {compareIds.length} modelo{compareIds.length > 1 ? 's' : ''}
              {compareIds.length >= 2 && <span className="text-[10px] ml-1">✓</span>}
            </Button>
          )}
          <Button variant="outline" onClick={resetDefaults} data-testid="reset-defaults-btn" className="gap-2">
            <RotateCcw className="w-4 h-4" /> Restaurar defaults
          </Button>
          <Button onClick={openCreate} className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] gap-2" data-testid="create-model-btn">
            <Plus className="w-4 h-4" /> Nuevo Modelo
          </Button>
        </div>
      </div>

      {/* Compare info bar */}
      {compareIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-2.5 rounded-lg flex items-center gap-3" data-testid="compare-info-bar">
          <GitCompare className="w-4 h-4 text-[#CCFF00]" />
          <span className="text-sm">
            <strong className="text-[#CCFF00]">{compareIds.length}</strong> modelo{compareIds.length > 1 ? 's seleccionados' : ' seleccionado'} para comparar
            {compareIds.length < 2 && <span className="text-slate-400 ml-2">(selecciona al menos 2)</span>}
          </span>
          <button onClick={clearCompare} className="ml-auto text-xs text-slate-300 hover:text-white underline">
            Limpiar selección
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, autor o descripción..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
            data-testid="search-models-input"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[200px]" data-testid="filter-category-select">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Listing grouped */}
      <div className="space-y-6">
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No se encontraron modelos con esos filtros.
          </div>
        )}
        {CATEGORIES.filter(cat => grouped[cat]).map(cat => (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${CATEGORY_COLORS[cat]}`}>
                {cat}
              </div>
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">{grouped[cat].length} modelos</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {grouped[cat].map(m => (
                <div
                  key={m.id}
                  className={`bg-white border rounded-xl p-4 hover:shadow-lg transition-shadow relative group ${compareIds.includes(m.id) ? 'border-[#CCFF00] ring-2 ring-[#CCFF00]/30' : 'border-slate-200'}`}
                  data-testid={`model-card-${m.id}`}
                >
                  {/* Compare toggle */}
                  <button
                    onClick={() => toggleCompare(m.id)}
                    className={`absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center border-2 transition-all ${compareIds.includes(m.id) ? 'bg-[#CCFF00] border-[#CCFF00] text-slate-900' : 'bg-white border-slate-300 text-slate-300 hover:border-slate-900'}`}
                    title={compareIds.includes(m.id) ? 'Quitar del comparador' : 'Añadir al comparador'}
                    data-testid={`toggle-compare-${m.id}`}
                  >
                    {compareIds.includes(m.id) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <GitCompare className="w-3 h-3" />}
                  </button>
                  <div className="flex items-start gap-3 mb-2 pr-7">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${m.color}20`, border: `1px solid ${m.color}40` }}
                    >
                      {m.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-[15px] leading-tight truncate" title={m.name}>{m.name}</h3>
                      {m.author && <p className="text-[11px] text-slate-500 mt-0.5">{m.author}</p>}
                    </div>
                    {m.is_default ? (
                      <span className="text-[9px] font-bold text-[#007AFF] bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100">
                        DEFAULT
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-900 bg-[#CCFF00] px-1.5 py-0.5 rounded-full">
                        MIO
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">{m.description}</p>
                  <div className="flex items-center gap-1 mb-3 flex-wrap">
                    {m.phases?.slice(0, 5).map((p, i) => (
                      <div key={i} className="h-2 rounded-sm flex-1 min-w-[12px]" style={{ background: p.color }} title={p.name} />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                    <span>{m.phases?.length || 0} fases</span>
                    {m.recommended_duration && <span className="truncate ml-2">{m.recommended_duration}</span>}
                  </div>
                  {expandedId === m.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      <div className="text-[11px] font-bold text-slate-700 uppercase">Fases</div>
                      <div className="space-y-1.5">
                        {m.phases?.map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <span className="flex-1 truncate text-slate-700">{p.name}</span>
                            <span className="text-slate-500">V{p.volume}%</span>
                            <span className="text-slate-500">I{p.intensity}%</span>
                            <span className="text-slate-400 tabular-nums">{p.duration_weeks} sem</span>
                          </div>
                        ))}
                      </div>
                      {m.applicable_sports?.length > 0 && (
                        <div className="text-[11px] text-slate-600 pt-2">
                          <strong>Deportes:</strong> {m.applicable_sports.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                      className="flex-1 text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1 py-1"
                      data-testid={`expand-model-${m.id}`}
                    >
                      {expandedId === m.id ? <><ChevronUp className="w-3 h-3" /> Menos</> : <><ChevronDown className="w-3 h-3" /> Ver detalle</>}
                    </button>
                    <button
                      onClick={() => openDuplicate(m)}
                      className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900"
                      title="Duplicar"
                      data-testid={`duplicate-model-${m.id}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(m)}
                      className="p-1.5 hover:bg-blue-50 rounded text-slate-500 hover:text-blue-600"
                      title="Editar"
                      data-testid={`edit-model-${m.id}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(m)}
                      className="p-1.5 hover:bg-rose-50 rounded text-slate-500 hover:text-rose-600"
                      title="Eliminar"
                      data-testid={`delete-model-${m.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Editor Dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white text-slate-900" data-testid="model-editor-dialog">
          <DialogHeader>
            <DialogTitle>{editing?._isNew ? 'Nuevo Modelo de Periodización' : 'Editar Modelo'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label>Nombre *</Label>
                  <Input value={editing.name} onChange={e => updField('name', e.target.value)} placeholder="Ej: Mi Modelo Personalizado" data-testid="model-name-input" />
                </div>
                <div>
                  <Label>Autor / Creador</Label>
                  <Input value={editing.author} onChange={e => updField('author', e.target.value)} placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <Label>Categoría</Label>
                  <Select value={editing.category} onValueChange={v => updField('category', v)}>
                    <SelectTrigger data-testid="model-category-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label>Descripción</Label>
                  <Textarea value={editing.description} onChange={e => updField('description', e.target.value)} rows={2} placeholder="Breve descripción del modelo y su lógica..." />
                </div>
                <div>
                  <Label>Duración recomendada</Label>
                  <Input value={editing.recommended_duration} onChange={e => updField('recommended_duration', e.target.value)} placeholder="Ej: 12-16 semanas" />
                </div>
                <div>
                  <Label>Ícono y color</Label>
                  <div className="flex gap-2">
                    <Select value={editing.icon} onValueChange={v => updField('icon', v)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {ICON_CHOICES.map(i => <SelectItem key={i} value={i}><span className="text-lg">{i}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1 flex-wrap flex-1">
                      {COLOR_CHOICES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => updField('color', c)}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${editing.color === c ? 'border-slate-900 scale-110' : 'border-slate-200'}`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Phases editor */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-bold">Fases / Bloques</Label>
                  <Button size="sm" variant="outline" onClick={addPhase} className="gap-1" data-testid="add-phase-btn">
                    <Plus className="w-3 h-3" /> Agregar fase
                  </Button>
                </div>
                <div className="space-y-2">
                  {editing.phases.map((p, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2" data-testid={`phase-editor-${i}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md flex items-center justify-center bg-white font-bold text-xs text-slate-500 border border-slate-200">
                          {i + 1}
                        </div>
                        <Input
                          value={p.name}
                          onChange={e => updPhase(i, 'name', e.target.value)}
                          placeholder="Nombre de la fase"
                          className="flex-1"
                        />
                        <div className="flex gap-1">
                          <button onClick={() => movePhase(i, -1)} disabled={i === 0} className="p-1.5 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                          <button onClick={() => movePhase(i, 1)} disabled={i === editing.phases.length - 1} className="p-1.5 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                          <button onClick={() => removePhase(i)} className="p-1.5 hover:bg-rose-100 rounded text-rose-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-slate-500">Duración (sem)</Label>
                          <Input value={p.duration_weeks} onChange={e => updPhase(i, 'duration_weeks', e.target.value)} placeholder="4" />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500">Volumen %</Label>
                          <Input type="number" min={0} max={100} value={p.volume} onChange={e => updPhase(i, 'volume', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500">Intensidad %</Label>
                          <Input type="number" min={0} max={100} value={p.intensity} onChange={e => updPhase(i, 'intensity', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-[10px] text-slate-500">Color</Label>
                          <div className="flex gap-1 flex-wrap">
                            {COLOR_CHOICES.slice(0, 7).map(c => (
                              <button
                                key={c}
                                type="button"
                                onClick={() => updPhase(i, 'color', c)}
                                className={`w-6 h-6 rounded-full border-2 ${p.color === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                                style={{ background: c }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <Input value={p.description} onChange={e => updPhase(i, 'description', e.target.value)} placeholder="Descripción breve de la fase" className="text-xs" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Characteristics */}
              <ListEditor
                title="Características distintivas"
                items={editing.characteristics}
                onAdd={() => addListItem('characteristics')}
                onUpdate={(i, v) => updListItem('characteristics', i, v)}
                onRemove={(i) => removeListItem('characteristics', i)}
                placeholder="Ej: Progresión lineal del volumen"
              />

              {/* Applicable sports */}
              <ListEditor
                title="Deportes aplicables"
                items={editing.applicable_sports}
                onAdd={() => addListItem('applicable_sports')}
                onUpdate={(i, v) => updListItem('applicable_sports', i, v)}
                onRemove={(i) => removeListItem('applicable_sports', i)}
                placeholder="Ej: Atletismo, Natación"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancelar</Button>
            <Button onClick={saveModel} disabled={saving} className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] gap-2" data-testid="save-model-btn">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="max-w-md bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-rose-500" /> ¿Eliminar modelo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Vas a eliminar <strong>{confirmDelete?.name}</strong>. Esta acción no se puede deshacer (aunque podrás restaurar los modelos por defecto).
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
            <Button onClick={doDelete} className="bg-rose-600 text-white hover:bg-rose-700 gap-2" data-testid="confirm-delete-btn">
              <Trash2 className="w-4 h-4" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Comparator Dialog */}
      <PeriodizationComparator
        open={comparatorOpen}
        onOpenChange={setComparatorOpen}
        models={selectedForCompare}
        onRemoveModel={removeFromCompare}
      />
    </div>
  );
};

const ListEditor = ({ title, items, onAdd, onUpdate, onRemove, placeholder }) => (
  <div className="pt-3 border-t">
    <div className="flex items-center justify-between mb-2">
      <Label className="font-bold">{title}</Label>
      <Button size="sm" variant="outline" onClick={onAdd} className="gap-1">
        <Plus className="w-3 h-3" /> Agregar
      </Button>
    </div>
    <div className="space-y-1.5">
      {(items || []).map((it, i) => (
        <div key={i} className="flex gap-2">
          <Input value={it} onChange={e => onUpdate(i, e.target.value)} placeholder={placeholder} />
          <Button size="sm" variant="ghost" onClick={() => onRemove(i)} className="px-2 text-rose-500 hover:bg-rose-50"><X className="w-4 h-4" /></Button>
        </div>
      ))}
      {(!items || items.length === 0) && (
        <p className="text-xs text-slate-400 italic">Sin ítems. Haz clic en "Agregar" para añadir uno.</p>
      )}
    </div>
  </div>
);

export default PeriodizationModelsManager;
