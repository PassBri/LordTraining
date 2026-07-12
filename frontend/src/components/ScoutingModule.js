import React, { useState, useEffect, useCallback, useRef } from 'react';
import i18nInstance from '../i18n';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { VideoGallery } from './VideoEmbed';
import ProspectStats from './ProspectStats';
import ScoutingAlerts from './ScoutingAlerts';
import ScoutingContacts from './ScoutingContacts';
import ScoutingMap from './ScoutingMap';
import { SCOUTING_TABS as SCOUTING_TABS_SHARED } from '../lib/scoutingTabs';
import {
  Target, Plus, Users, Trello, ClipboardCheck, Trophy, X, Trash2, Edit2, Sparkles,
  FileDown, UserPlus, Camera, Video, Star, ChevronRight, MapPin, Loader2, Award,
  TrendingUp, AlertTriangle, GitCompare, Phone, Mail, Instagram, Share2, Copy, Globe, Check,
  BellRing, Contact, Map as MapIcon, Crown, CalendarClock, MessageCircle, Facebook, Download,
  Eye, Flame, Link2, EyeOff, Pin
} from 'lucide-react';

// i18n: auto-traducción slug-based (scouting.lbl.*)
const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
  .replace(/₂/g,'2').replace(/²/g,'2').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const tt = (s) => {
  if (s == null || s === '' || typeof s === 'number') return s;
  const k = _slug(s);
  return k ? i18nInstance.t(`scouting.lbl.${k}`, { defaultValue: s }) : s;
};

const API_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1 ? process.env.REACT_APP_BACKEND_URL : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));

const token = () => localStorage.getItem('train_token');
const api = async (path, { method = 'GET', body, raw } = {}) => {
  const res = await fetch(`${API_URL}/api/recruiting${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token()}`, ...(body && !raw ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? (raw ? body : JSON.stringify(body)) : undefined,
  });
  if (!res.ok) { const t = await res.text(); throw new Error(t || res.statusText); }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res;
};

const photoUrl = (p) => p ? `${API_URL}/api/recruiting/files/${p}?auth=${token()}` : null;

const STAGES = [
  { key: 'prospect', label: 'Prospect', color: '#64748b' },
  { key: 'contacted', label: 'Contacted', color: '#0ea5e9' },
  { key: 'trial', label: 'Trial', color: '#f59e0b' },
  { key: 'decision', label: 'Decision', color: '#8b5cf6' },
];
const stageMeta = (k) => STAGES.find(s => s.key === k) || STAGES[0];
const scoreColor = (s) => s == null ? '#94a3b8' : s >= 80 ? '#10b981' : s >= 65 ? '#f59e0b' : '#ef4444';
const verdictColor = (v) => v === 'RECRUIT' ? '#10b981' : v === 'MONITOR' ? '#f59e0b' : v === 'PASS' ? '#ef4444' : '#64748b';

export const SCOUTING_TABS = SCOUTING_TABS_SHARED;
const TABS = SCOUTING_TABS_SHARED;

const emptyProspect = () => ({
  name: '', sport: 'football', sport_name: 'Fútbol', level: 'amateur', position: '', current_club: '', age: '',
  nationality: '', gender: '', height_cm: '', weight_kg: '', dominant_side: '', email: '', phone: '',
  guardian_contact: '', photo_path: null, bio: '', social_links: {}, video_links: [], achievements: [],
  key_stats: {}, tags: [], stage: 'prospect', outcome: null,
  market_value: '', market_currency: 'USD', market_value_public: false, sponsorships: [], transfers: [],
  contract_end: '', origin_city: '', origin_country: '', origin_lat: '', origin_lng: '',
});

const VIDEO_CATS = [['technical', 'Técnico'], ['physical', 'Físico'], ['match', 'Partido'], ['tactical', 'Táctico'], ['highlights', 'Highlights'], ['interview', 'Entrevista']];
const VCAT_LABEL = Object.fromEntries(VIDEO_CATS);

const SPORTS = [
  ['football', 'Fútbol'], ['basketball', 'Baloncesto'], ['volleyball', 'Voleibol'],
  ['tennis', 'Tenis'], ['handball', 'Balonmano'], ['rugby', 'Rugby'], ['other', 'Otro'],
];

export default function ScoutingModule({ activeTab, onTabChange } = {}) {
  useTranslation();
  const [internalTab, setInternalTab] = useState('prospects');
  const tab = activeTab !== undefined && activeTab !== null ? activeTab : internalTab;
  const setTab = onTabChange || setInternalTab;
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);     // prospect being viewed
  const [editing, setEditing] = useState(null);   // prospect being edited (form)
  const [dash, setDash] = useState(null);
  const [teams, setTeams] = useState([]);
  const [compare, setCompare] = useState([]);      // ids selected to compare

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/prospects');
      setProspects(data);
    } catch (e) { toast.error(tt('Error cargando prospectos')); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'ranking') api('/dashboard').then(setDash).catch(() => {});
  }, [tab, prospects]);
  useEffect(() => {
    fetch(`${API_URL}/api/teams`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.ok ? r.json() : []).then(setTeams).catch(() => {});
  }, []);

  const refreshOne = async (id) => {
    const p = await api(`/prospects/${id}`);
    setProspects(prev => prev.map(x => x.id === id ? p : x));
    if (detail?.id === id) setDetail(p);
    return p;
  };

  const openById = async (id) => {
    const local = prospects.find(x => x.id === id);
    if (local) { setDetail(local); return; }
    try { setDetail(await api(`/prospects/${id}`)); } catch { toast.error(tt('No se pudo abrir el prospecto')); }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto" data-testid="scouting-module">
      {/* Header */}
      <div className="rounded-2xl p-5 mb-5 relative overflow-hidden" style={{ background: 'linear-gradient(120deg,#0f172a 0%,#13203a 55%,#0b1220 100%)' }}>
        <div className="absolute -right-8 -top-8 opacity-10"><Target className="w-40 h-40 text-[#CCFF00]" /></div>
        <div className="flex items-center gap-3 relative">
          <div className="w-12 h-12 rounded-xl bg-[#CCFF00] flex items-center justify-center shadow-lg"><Target className="w-7 h-7 text-slate-900" strokeWidth={2.5} /></div>
          <div>
            <h1 className="text-white text-2xl font-black tracking-tight" style={{ fontFamily: "'DM Sans',sans-serif" }}>{tt('Recruiting & Talent ID')}</h1>
            <p className="text-[#CCFF00] text-sm font-medium">{tt('Identifica el talento. Construye el futuro.')}</p>
          </div>
        </div>
      </div>

      {/* Internal Tabs */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon; const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} data-testid={`scouting-tab-${t.key}`}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={active ? { background: '#0f172a', color: '#CCFF00' } : { background: '#fff', color: '#475569', border: '1px solid #e2e8f0' }}>
              <Icon className="w-4 h-4" /> {tt(t.label)}
            </button>
          );
        })}
        <div className="flex-1" />
        {tab === 'prospects' && (
          <Button onClick={() => setEditing(emptyProspect())} data-testid="scouting-new-prospect-btn" className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold rounded-full">
            <Plus className="w-4 h-4 mr-1" /> {tt('Nuevo Prospecto')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : (
        <>
          {tab === 'prospects' && <ProspectsGrid prospects={prospects} onOpen={setDetail} onEdit={setEditing} />}
          {tab === 'pipeline' && <Pipeline prospects={prospects} onOpen={setDetail} onMoved={refreshOne} setProspects={setProspects} />}
          {tab === 'evaluation' && <EvaluationTab prospects={prospects} onSaved={refreshOne} />}
          {tab === 'ranking' && <RankingTab dash={dash} prospects={prospects} compare={compare} setCompare={setCompare} onOpen={setDetail} />}
          {tab === 'showcase' && <ShowcaseManager prospects={prospects} onOpen={setDetail} />}
          {tab === 'alerts' && <ScoutingAlerts onOpen={openById} />}
          {tab === 'contacts' && <ScoutingContacts prospects={prospects} />}
          {tab === 'map' && <ScoutingMap onOpen={openById} />}
        </>
      )}

      {detail && <ProspectDetail prospect={detail} teams={teams} onClose={() => setDetail(null)}
        onChanged={refreshOne} onDeleted={(id) => { setProspects(prev => prev.filter(x => x.id !== id)); setDetail(null); }}
        onEdit={(p) => { setDetail(null); setEditing(p); }} />}

      {editing && <ProspectForm initial={editing} onClose={() => setEditing(null)}
        onSaved={(p) => { setEditing(null); load(); }} />}
    </div>
  );
}

/* ---------------- Prospect Card (social style) ---------------- */
function ProspectCard({ p, onOpen, onEdit, draggable, onDragStart, compact }) {
  const sc = p.overall_score;
  const sm = stageMeta(p.stage);
  const verdict = p.ai_recommendation?.verdict;
  return (
    <div data-testid={`prospect-card-${p.id}`} draggable={draggable} onDragStart={onDragStart}
      onClick={() => onOpen(p)}
      className="group relative rounded-2xl overflow-hidden cursor-pointer bg-white transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,.08), 0 0 0 1px rgba(15,23,42,.06)' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 16px 34px -10px rgba(15,23,42,.35)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,.08), 0 0 0 1px rgba(15,23,42,.06)'}>
      <div className="relative" style={{ aspectRatio: compact ? '16/9' : '4/3', background: 'linear-gradient(135deg,#1e293b,#0f172a)' }}>
        {p.photo_path ? (
          <img src={photoUrl(p.photo_path)} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-5xl font-black">{(p.name || '?').slice(0, 1)}</div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: 'linear-gradient(to top,rgba(15,23,42,.92),transparent)' }} />
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide" style={{ background: sm.color + 'e6', color: '#fff' }}>{tt(sm.label)}</div>
        {sc != null && (
          <div className="absolute top-2 right-2 w-11 h-11 rounded-full flex flex-col items-center justify-center" style={{ background: scoreColor(sc), boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>
            <span className="text-white font-black text-base leading-none">{sc}</span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-white font-black text-lg leading-tight truncate" style={{ fontFamily: "'DM Sans',sans-serif" }}>{p.name}</div>
          <div className="text-[#CCFF00] text-[11px] font-bold truncate">{p.position || '—'} · {p.sport_name || p.sport}</div>
        </div>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1"><MapPin className="w-3 h-3" />{p.current_club || 'Sin club'}{p.age ? ` · ${p.age}a` : ''}</div>
        <div className="flex items-center gap-1">
          {verdict && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: verdictColor(verdict) + '22', color: verdictColor(verdict) }}>{verdict}</span>}
          {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(p); }} className="text-slate-300 hover:text-blue-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>}
        </div>
      </div>
    </div>
  );
}

function ProspectsGrid({ prospects, onOpen, onEdit }) {
  if (!prospects.length) return <EmptyState text={tt('Aún no hay prospectos. Crea el primero con “Nuevo Prospecto”.')} />;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {prospects.map(p => <ProspectCard key={p.id} p={p} onOpen={onOpen} onEdit={onEdit} />)}
    </div>
  );
}

/* ---------------- Pipeline (Kanban with drag & drop) ---------------- */
function Pipeline({ prospects, onOpen, onMoved, setProspects }) {
  const [dragId, setDragId] = useState(null);
  const move = async (id, stage) => {
    const p = prospects.find(x => x.id === id);
    if (!p || p.stage === stage) return;
    setProspects(prev => prev.map(x => x.id === id ? { ...x, stage } : x));  // optimistic
    try {
      await api(`/prospects/${id}/stage`, { method: 'PATCH', body: { stage, outcome: stage === 'decision' ? (p.outcome || null) : null } });
      onMoved(id);
      toast.success(`Movido a ${stageMeta(stage).label}`);
    } catch { toast.error(tt('No se pudo mover')); setProspects(prev => prev.map(x => x.id === id ? p : x)); }
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STAGES.map(st => {
        const items = prospects.filter(p => p.stage === st.key);
        return (
          <div key={st.key} data-testid={`kanban-col-${st.key}`}
            onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragId) move(dragId, st.key); setDragId(null); }}
            className="rounded-2xl p-3 min-h-[300px]" style={{ background: '#f8fafc', border: `2px dashed ${st.color}33` }}>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: st.color }} />
                <span className="text-sm font-black text-slate-700">{tt(st.label)}</span>
              </div>
              <span className="text-xs font-bold text-slate-400">{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map(p => (
                <ProspectCard key={p.id} p={p} onOpen={onOpen} compact draggable
                  onDragStart={() => setDragId(p.id)} />
              ))}
              {!items.length && <div className="text-center text-[11px] text-slate-300 py-8">{tt('Arrastra aquí')}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Evaluation Tab ---------------- */
function EvaluationTab({ prospects, onSaved }) {
  const [pid, setPid] = useState('');
  const prospect = prospects.find(p => p.id === pid);
  const [criteria, setCriteria] = useState(null);
  const [scores, setScores] = useState({});
  const [saving, setSaving] = useState(false);
  const [aiProvider, setAiProvider] = useState('openai');
  const [aiLoading, setAiLoading] = useState(false);
  const [ai, setAi] = useState(null);
  const [localCustom, setLocalCustom] = useState({});         // {block: {key: label}} alcance prospecto
  const [addForm, setAddForm] = useState({ block: null, label: '', scope: 'prospect' });

  const buildScores = (blocks, prev) => {
    const init = {};
    blocks.forEach(b => { init[b.key] = {}; b.criteria.forEach(cr => { init[b.key][cr.key] = prev?.[b.key]?.[cr.key] ?? prospect?.evaluation?.scores?.[b.key]?.[cr.key] ?? 50; }); });
    return init;
  };
  const loadCriteria = async (preserve) => {
    const c = await api(`/criteria?sport=${prospect.sport || ''}&level=${prospect.level || 'amateur'}`);
    const pc = prospect.evaluation?.custom_labels || {};
    c.blocks.forEach(b => {
      Object.entries(pc[b.key] || {}).forEach(([k, lbl]) => {
        if (!b.criteria.find(x => x.key === k)) b.criteria.push({ key: k, label: lbl, custom: true, scope: 'prospect' });
      });
    });
    setCriteria(c);
    if (!preserve) setLocalCustom(pc);
    setScores(s => buildScores(c.blocks, preserve ? s : null));
  };

  useEffect(() => {
    if (!prospect) return;
    setAi(prospect.ai_recommendation || null);
    setLocalCustom(prospect.evaluation?.custom_labels || {});
    loadCriteria(false);
  }, [pid]); // eslint-disable-line

  const allVals = Object.values(scores).flatMap(o => Object.values(o));
  const overall = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 0;
  const std = criteria?.level_standard ?? criteria?.club_standard ?? 70;
  const stdLevel = criteria?.level || prospect?.level || 'amateur';

  const addCriterion = async () => {
    const { block, label, scope } = addForm;
    if (!label.trim() || !block) return;
    if (scope === 'prospect') {
      const key = 'cst_' + Math.random().toString(36).slice(2, 10);
      setCriteria(c => ({ ...c, blocks: c.blocks.map(b => b.key === block ? { ...b, criteria: [...b.criteria, { key, label: label.trim(), custom: true, scope: 'prospect' }] } : b) }));
      setLocalCustom(lc => ({ ...lc, [block]: { ...(lc[block] || {}), [key]: label.trim() } }));
      setScores(s => ({ ...s, [block]: { ...(s[block] || {}), [key]: 50 } }));
      toast.success(tt('Criterio agregado a este prospecto'));
    } else {
      try { await api('/criteria/custom', { method: 'POST', body: { scope, block, label: label.trim(), sport: prospect.sport } }); await loadCriteria(true); toast.success(scope === 'sport' ? 'Criterio guardado para el deporte' : 'Criterio guardado para el club'); }
      catch { toast.error(tt('Error agregando criterio')); }
    }
    setAddForm({ block: null, label: '', scope: 'prospect' });
  };
  const removeCriterion = async (block, cr) => {
    if (cr.scope === 'prospect') {
      setCriteria(c => ({ ...c, blocks: c.blocks.map(b => b.key === block ? { ...b, criteria: b.criteria.filter(x => x.key !== cr.key) } : b) }));
      setLocalCustom(lc => { const n = { ...lc, [block]: { ...(lc[block] || {}) } }; delete n[block][cr.key]; return n; });
      setScores(s => { const n = { ...s, [block]: { ...(s[block] || {}) } }; delete n[block][cr.key]; return n; });
    } else {
      try { await api(`/criteria/custom/${cr.id}`, { method: 'DELETE' }); await loadCriteria(true); toast.success(tt('Criterio eliminado')); }
      catch { toast.error(tt('Error')); }
    }
  };

  const save = async () => {
    setSaving(true);
    try { const p = await api(`/prospects/${pid}/evaluation`, { method: 'POST', body: { scores, custom_labels: localCustom } }); onSaved(pid); toast.success(`Evaluación guardada · Score ${p.overall_score}`); }
    catch { toast.error(tt('Error guardando')); }
    setSaving(false);
  };
  const runAI = async () => {
    setAiLoading(true);
    try { const r = await api(`/prospects/${pid}/ai-recommendation`, { method: 'POST', body: { provider: aiProvider } }); setAi(r); onSaved(pid); toast.success(tt('Informe IA generado')); }
    catch (e) { toast.error(tt('Error de IA')); }
    setAiLoading(false);
  };

  return (
    <div>
      <div className="mb-4 max-w-sm">
        <label className="text-xs font-bold text-slate-500 uppercase">{tt('Selecciona prospecto')}</label>
        <Select value={pid} onValueChange={setPid}>
          <SelectTrigger className="mt-1 bg-white" data-testid="eval-select-prospect"><SelectValue placeholder={tt('Elegir prospecto...')} /></SelectTrigger>
          <SelectContent>{prospects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {!prospect ? <EmptyState text="Elige un prospecto para evaluarlo por criterios." /> : (
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            {(criteria?.blocks || []).map(b => (
              <div key={b.key} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-black text-slate-800 mb-3">{tt(b.label)}</div>
                <div className="space-y-3">
                  {b.criteria.map(cr => {
                    const val = scores[b.key]?.[cr.key] ?? 50;
                    return (
                      <div key={cr.key}>
                        <div className="flex justify-between items-center text-[12px] mb-1">
                          <span className="text-slate-600 font-medium flex items-center gap-1.5">
                            {tt(cr.label)}
                            {cr.custom && <span className="text-[8px] font-black uppercase px-1 py-0.5 rounded" style={{ background: cr.scope === 'global' ? '#8b5cf622' : cr.scope === 'sport' ? '#0ea5e922' : '#64748b22', color: cr.scope === 'global' ? '#8b5cf6' : cr.scope === 'sport' ? '#0ea5e9' : '#64748b' }}>{cr.scope === 'global' ? 'club' : cr.scope === 'sport' ? 'deporte' : 'propio'}</span>}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-black" style={{ color: scoreColor(val) }}>{val}</span>
                            {cr.custom && <button onClick={() => removeCriterion(b.key, cr)} className="text-slate-300 hover:text-red-500" title={tt('Quitar criterio')} data-testid={`eval-remove-${b.key}-${cr.key}`}><X className="w-3.5 h-3.5" /></button>}
                          </div>
                        </div>
                        <input type="range" min="0" max="100" value={val} data-testid={`eval-slider-${b.key}-${cr.key}`}
                          onChange={(e) => setScores(s => ({ ...s, [b.key]: { ...s[b.key], [cr.key]: parseInt(e.target.value) } }))}
                          className="w-full accent-slate-900" style={{ accentColor: scoreColor(val) }} />
                      </div>
                    );
                  })}
                </div>
                {/* Agregar criterio */}
                {addForm.block === b.key ? (
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <Input autoFocus value={addForm.label} onChange={(e) => setAddForm(f => ({ ...f, label: e.target.value }))} placeholder={tt('Nuevo criterio (ej. Definición pie izquierdo)')} className="bg-white h-8 text-[13px]" data-testid="eval-new-criterion-label" onKeyDown={(e) => e.key === 'Enter' && addCriterion()} />
                    <div className="flex gap-2">
                      <Select value={addForm.scope} onValueChange={(v) => setAddForm(f => ({ ...f, scope: v }))}>
                        <SelectTrigger className="bg-white h-8 text-[12px]" data-testid="eval-new-criterion-scope"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="prospect">{tt('Solo este prospecto')}</SelectItem>
                          <SelectItem value="sport">{tt('Plantilla del deporte')}</SelectItem>
                          <SelectItem value="global">{tt('Plantilla global del club')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={addCriterion} className="bg-slate-900 text-white h-8" data-testid="eval-add-criterion-confirm">{tt('Añadir')}</Button>
                      <Button size="sm" variant="outline" onClick={() => setAddForm({ block: null, label: '', scope: 'prospect' })} className="h-8">{tt('Cancelar')}</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddForm({ block: b.key, label: '', scope: 'prospect' })} className="mt-3 flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-slate-700" data-testid={`eval-add-criterion-${b.key}`}>
                    <Plus className="w-3.5 h-3.5" /> Agregar criterio
                  </button>
                )}
              </div>
            ))}
            <Button onClick={save} disabled={saving} data-testid="eval-save-btn" className="bg-slate-900 hover:bg-slate-800 text-white font-bold">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Guardar Evaluación
            </Button>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
              <div className="text-xs font-bold text-slate-400 uppercase">{tt('Score General')}</div>
              <div className="text-6xl font-black my-1" style={{ color: scoreColor(overall) }}>{overall}</div>
              <div className="text-[11px] text-slate-500">{tt('Estándar nivel')} <b className="capitalize">{stdLevel}</b>: <b>{std}</b></div>
              <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden relative">
                <div className="h-full" style={{ width: `${overall}%`, background: scoreColor(overall) }} />
                <div className="absolute top-0 h-full w-0.5 bg-slate-900" style={{ left: `${std}%` }} title={tt('Estándar')} />
              </div>
              <div className="text-[11px] mt-2 font-bold" style={{ color: overall >= std ? '#10b981' : '#ef4444' }}>
                {overall >= std ? `+${overall - std} sobre estándar` : `${overall - std} bajo estándar`}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-amber-500" /><span className="text-sm font-black text-slate-800">{tt('Recomendación IA')}</span></div>
              <div className="flex gap-1 mb-3">
                {[['openai', 'GPT-5.5'], ['anthropic', 'Claude 4.6']].map(([v, l]) => (
                  <button key={v} onClick={() => setAiProvider(v)} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition"
                    style={aiProvider === v ? { background: '#0f172a', color: '#CCFF00', borderColor: '#0f172a' } : { background: '#fff', color: '#64748b', borderColor: '#e2e8f0' }} data-testid={`ai-provider-${v}`}>{l}</button>
                ))}
              </div>
              <Button onClick={runAI} disabled={aiLoading} data-testid="ai-run-btn" className="w-full bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold mb-3">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />} Generar informe
              </Button>
              {ai && <AIReport ai={ai} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AIReport({ ai }) {
  return (
    <div className="text-[12px] space-y-2" data-testid="ai-report">
      {ai.verdict && (
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: verdictColor(ai.verdict) + '22', color: verdictColor(ai.verdict) }}>{ai.verdict}</span>
          {ai.confidence != null && <span className="text-slate-400 text-[10px]">Confianza {ai.confidence}%</span>}
          {ai.model && <span className="text-slate-300 text-[9px] ml-auto">{ai.model}</span>}
        </div>
      )}
      {ai.summary && <p className="text-slate-700 leading-relaxed">{ai.summary}</p>}
      {ai.strengths?.length > 0 && <div><div className="text-[10px] uppercase text-slate-400 font-bold">{tt('Fortalezas')}</div><ul className="list-disc pl-4 text-emerald-600">{ai.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
      {ai.weaknesses?.length > 0 && <div><div className="text-[10px] uppercase text-slate-400 font-bold">{tt('A mejorar')}</div><ul className="list-disc pl-4 text-red-500">{ai.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
      {ai.development_plan?.length > 0 && <div><div className="text-[10px] uppercase text-slate-400 font-bold">{tt('Plan de desarrollo')}</div><ul className="list-disc pl-4 text-slate-600">{ai.development_plan.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
    </div>
  );
}

/* ---------------- Ranking / Dashboard ---------------- */
function ShowcaseManager({ prospects, onOpen }) {
  const [cfg, setCfg] = useState(null);
  const [title, setTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leads, setLeads] = useState(null);
  const [metrics, setMetrics] = useState(null);

  const loadLeads = () => api('/showcase/leads').then(setLeads).catch(() => setLeads({ items: [], unread: 0 }));
  const loadMetrics = () => api('/showcase/metrics').then(setMetrics).catch(() => setMetrics(null));
  useEffect(() => {
    api('/showcase-settings').then(s => { setCfg(s); setTitle(s.showcase_title || ''); }).catch(() => setCfg({ showcase_enabled: false }));
    loadLeads();
    loadMetrics();
  }, []);

  const shared = (prospects || []).filter(p => p.share_enabled);
  const viewUrl = cfg?.showcase_id ? `${window.location.origin}/cantera/${cfg.showcase_id}` : null;
  const shareUrl = cfg?.showcase_id ? `${window.location.origin}/api/recruiting/public/showcase/${cfg.showcase_id}/share?b=${encodeURIComponent(window.location.origin)}` : null;
  const hidden = new Set(cfg?.showcase_hidden || []);
  const pinned = new Set(cfg?.showcase_pinned || []);

  const toggleEnabled = async (val) => {
    setSaving(true);
    try { const s = await api('/showcase-settings', { method: 'POST', body: { enabled: val, title: title || undefined } }); setCfg(s); toast.success(val ? tt('Vitrina activada') : tt('Vitrina desactivada')); }
    catch { toast.error(tt('Error')); }
    setSaving(false);
  };
  const saveTitle = async () => {
    try { const s = await api('/showcase-settings', { method: 'POST', body: { title } }); setCfg(s); toast.success(tt('Título guardado')); }
    catch { toast.error(tt('Error')); }
  };
  const copyLink = () => { if (!shareUrl) return; navigator.clipboard?.writeText(shareUrl); setCopied(true); toast.success(tt('Enlace copiado')); setTimeout(() => setCopied(false), 1800); };
  const markRead = async (id) => { try { await api(`/showcase/leads/${id}/read`, { method: 'POST' }); loadLeads(); loadMetrics(); } catch {} };
  const delLead = async (id) => { try { await api(`/showcase/leads/${id}`, { method: 'DELETE' }); loadLeads(); loadMetrics(); toast.success(tt('Mensaje eliminado')); } catch {} };
  const setProspect = async (pid, patch) => {
    try {
      const r = await api(`/showcase/prospect/${pid}`, { method: 'POST', body: patch });
      setCfg(c => {
        const h = new Set(c.showcase_hidden || []); const pn = (c.showcase_pinned || []).filter(x => x !== pid);
        if (r.hidden) h.add(pid); else h.delete(pid);
        const npin = r.pinned ? [pid, ...pn] : pn;
        return { ...c, showcase_hidden: [...h], showcase_pinned: npin };
      });
    } catch { toast.error(tt('Error')); }
  };

  if (!cfg) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  const visibleCount = shared.filter(p => !hidden.has(p.id)).length;

  return (
    <div className="space-y-5" data-testid="showcase-manager">
      {/* Panel de activación */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#0f172a] flex items-center justify-center shrink-0"><Star className="w-6 h-6 text-[#D4AF37]" /></div>
            <div>
              <h3 className="font-black text-slate-800 text-lg leading-tight">{tt('Vitrina pública "Cantera"')}</h3>
              <p className="text-[13px] text-slate-500 mt-0.5 max-w-lg">{tt('Una página pública con tu mejor talento (videos + caracterización) para universidades y agencias. Sin necesidad de cuenta.')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={!!cfg.showcase_enabled} onCheckedChange={toggleEnabled} disabled={saving} data-testid="showcase-enable-switch" />
          </div>
        </div>

        {cfg.showcase_enabled && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tt('Título de la vitrina')}</label>
              <div className="flex gap-2 mt-1">
                <Input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Cantera · Top Talentos" className="bg-slate-50 text-[13px]" data-testid="showcase-title-input" />
                <Button onClick={saveTitle} variant="outline" className="border-slate-300 shrink-0" data-testid="showcase-title-save-btn"><Check className="w-4 h-4" /></Button>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{tt('Enlace público')}</label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={shareUrl || ''} onFocus={e => e.target.select()} className="bg-slate-50 text-slate-700 text-[13px]" data-testid="showcase-link-input" />
                <Button onClick={copyLink} className="bg-slate-900 text-white shrink-0" data-testid="showcase-link-copy-btn">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}</Button>
                <a href={viewUrl || '#'} target="_blank" rel="noreferrer"><Button variant="outline" className="border-slate-300 px-3" data-testid="showcase-link-open-btn"><Globe className="w-4 h-4" /></Button></a>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">{visibleCount} {tt('talento(s) visibles')} · {tt('al pegar el enlace en WhatsApp/redes se muestra una portada con tu marca. Personaliza logo, lema y color en el diálogo de Compartir de un prospecto.')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Métricas de la vitrina */}
      {cfg.showcase_enabled && metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="showcase-metrics">
          {[
            { k: 'views', l: 'Visitas', Icon: Eye, c: '#2563eb' },
            { k: 'total_leads', l: 'Contactos', Icon: Mail, c: '#16a34a' },
            { k: 'unread', l: 'Sin leer', Icon: BellRing, c: '#f59e0b' },
          ].map(({ k, l, Icon, c }) => (
            <div key={k} className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3" data-testid={`metric-${k}`}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: c + '18' }}><Icon className="w-5 h-5" style={{ color: c }} /></div>
              <div>
                <div className="text-2xl font-black text-slate-800 leading-none" data-testid={`metric-${k}-value`}>{metrics[k] || 0}</div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{tt(l)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contactos por atleta */}
      {cfg.showcase_enabled && metrics?.per_athlete?.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="metrics-per-athlete">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /><span className="font-black text-slate-800">{tt('Contactos por atleta')}</span>
            <span className="text-[11px] text-slate-400 ml-auto">{tt('Quién genera más interés de reclutadores.')}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {metrics.per_athlete.slice(0, 8).map((a, i) => {
              const max = metrics.per_athlete[0].leads || 1;
              return (
                <div key={a.prospect_id || i} className="flex items-center gap-3 px-4 py-2.5" data-testid={`per-athlete-${a.prospect_id || 'general'}`}>
                  <span className="text-slate-400 font-black text-sm w-5">{i + 1}</span>
                  <span className="flex-1 min-w-0 font-bold text-slate-700 text-sm truncate">{a.name}</span>
                  <div className="w-28 h-2 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(a.leads / max * 100)}%` }} />
                  </div>
                  <span className="text-emerald-600 font-black text-sm w-8 text-right">{a.leads}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selección de talentos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /><span className="font-black text-slate-800">{tt('Talentos de la vitrina')}</span>
          <span className="text-[11px] text-slate-400 ml-2">{tt('Solo aparecen prospectos con enlace público activo. Fija o oculta a tu gusto.')}</span>
        </div>
        {shared.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm" data-testid="showcase-no-shared">{tt('Activa el "Enlace de Scouting público" de un prospecto (botón Compartir) para incluirlo aquí.')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shared
              .slice()
              .sort((a, b) => (pinned.has(b.id) - pinned.has(a.id)) || ((b.overall_score || -1) - (a.overall_score || -1)))
              .map(p => {
                const isHidden = hidden.has(p.id); const isPinned = pinned.has(p.id);
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 ${isHidden ? 'opacity-50' : ''}`} data-testid={`showcase-item-${p.id}`}>
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
                      {p.photo_path ? <img src={photoUrl(p.photo_path)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black">{p.name.slice(0, 1)}</div>}
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(p)}>
                      <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">{p.name}{isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}</div>
                      <div className="text-[11px] text-slate-400 truncate">{p.position || '—'}{p.sport_name ? ` · ${p.sport_name}` : ''}</div>
                    </div>
                    {p.overall_score != null && <div className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-white text-sm shrink-0" style={{ background: scoreColor(p.overall_score) }}>{p.overall_score}</div>}
                    <Button size="sm" variant="outline" onClick={() => setProspect(p.id, { pinned: !isPinned })} title={isPinned ? 'Desfijar' : 'Fijar arriba'} data-testid={`showcase-pin-${p.id}`}
                      className={`px-2.5 ${isPinned ? 'border-amber-300 text-amber-600 bg-amber-50' : 'border-slate-300 text-slate-500'}`}><Pin className="w-4 h-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => setProspect(p.id, { hidden: !isHidden })} title={isHidden ? 'Mostrar' : 'Ocultar'} data-testid={`showcase-hide-${p.id}`}
                      className={`px-2.5 ${isHidden ? 'border-slate-300 text-slate-400' : 'border-emerald-200 text-emerald-600 bg-emerald-50'}`}>{isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</Button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Mensajes recibidos (leads) */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="showcase-leads">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-500" /><span className="font-black text-slate-800">{tt('Mensajes recibidos')}</span>
          {leads?.unread > 0 && <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-600" data-testid="showcase-leads-unread">{leads.unread} {tt('nuevos')}</span>}
          <span className="text-[11px] text-slate-400 ml-auto">{tt('Contactos de agencias/universidades desde tu vitrina.')}</span>
        </div>
        {!leads ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : leads.items.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm" data-testid="showcase-leads-empty">{tt('Aún no hay mensajes. Comparte tu vitrina para empezar a recibir contactos.')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leads.items.map(l => (
              <div key={l.id} className={`px-4 py-3 ${l.read ? '' : 'bg-blue-50/40'}`} data-testid={`lead-${l.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{l.from_name}</span>
                      {!l.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      {l.organization && <span className="text-[11px] text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{l.organization}</span>}
                    </div>
                    <a href={`mailto:${l.email}`} className="text-[12px] text-blue-600 hover:underline">{l.email}</a>
                    {l.prospect_name && <div className="text-[11px] text-slate-400 mt-0.5">{tt('Interesado en')}: <b className="text-slate-600">{l.prospect_name}</b></div>}
                    <p className="text-[13px] text-slate-700 mt-1.5 whitespace-pre-wrap">{l.message}</p>
                    <div className="text-[11px] text-slate-400 mt-1">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a href={`mailto:${l.email}?subject=${encodeURIComponent('Re: tu interés en ' + (l.prospect_name || 'un talento'))}`}>
                      <Button size="sm" className="bg-slate-900 text-white h-8 px-3 w-full" data-testid={`lead-reply-${l.id}`}>{tt('Responder')}</Button>
                    </a>
                    {!l.read && <Button size="sm" variant="outline" className="border-slate-300 h-8 px-3 text-[12px]" onClick={() => markRead(l.id)} data-testid={`lead-read-${l.id}`}>{tt('Leído')}</Button>}
                    <Button size="sm" variant="outline" className="border-red-200 text-red-500 h-8 px-3" onClick={() => delLead(l.id)} data-testid={`lead-del-${l.id}`}><X className="w-4 h-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SharedTalentsBoard({ onOpenId, limit = 5, className = '' }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`/share-ranking?limit=${limit}`).then(r => setRows(r.items || [])).catch(() => setRows([]));
  }, [limit]);
  const medal = ['#D4AF37', '#94A3B8', '#B45309'];
  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`} data-testid="shared-talents-board">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-500" /><span className="font-black text-slate-800">{tt('Talentos más compartidos')}</span>
      </div>
      {rows === null ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-sm" data-testid="shared-talents-empty">{tt('Comparte o descarga tarjetas de tus prospectos para ver aquí quién genera más interés.')}</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 px-4 py-2.5 ${onOpenId ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
              onClick={() => onOpenId?.(r.id)} data-testid={`shared-talent-row-${r.id}`}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0" style={{ background: medal[i] || '#cbd5e1' }}>{i + 1}</div>
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
                {r.has_photo && r.share_id ? <img src={`${API_URL}/api/recruiting/public/${r.share_id}/photo`} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black">{(r.name || '?').slice(0, 1)}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-sm truncate">{r.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{r.position || '—'}{r.sport_name ? ` · ${r.sport_name}` : ''}</div>
              </div>
              {r.trending && (
                <span className="flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 shrink-0"
                  data-testid={`trend-badge-${r.id}`} title={`+${r.recent7} en los últimos 7 días`}>
                  <Flame className="w-3 h-3" />+{r.recent7}
                </span>
              )}
              <div className="flex items-center gap-2.5 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-0.5" title="Descargas"><Download className="w-3.5 h-3.5" />{r.downloads}</span>
                <span className="flex items-center gap-0.5" title="Compartidos"><Share2 className="w-3.5 h-3.5" />{r.shares}</span>
                <span className="flex items-center gap-0.5" title="Vistas"><Eye className="w-3.5 h-3.5" />{r.views}</span>
              </div>
              <div className="w-9 text-right font-black text-orange-500">{r.total}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingTab({ dash, prospects, compare, setCompare, onOpen }) {
  if (!dash) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;
  const toggle = (id) => setCompare(c => c.includes(id) ? c.filter(x => x !== id) : c.length < 3 ? [...c, id] : c);
  const cmpItems = compare.map(id => prospects.find(p => p.id === id)).filter(Boolean);
  const stats = [
    { l: 'Prospectos', v: dash.total, c: '#0f172a' },
    { l: 'Reclutados', v: dash.recruited, c: '#10b981' },
    { l: 'Score Prom.', v: dash.avg_score, c: '#f59e0b' },
    { l: 'En Trial', v: dash.by_stage?.trial || 0, c: '#8b5cf6' },
  ];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4" style={{ borderTop: `3px solid ${s.c}` }}>
            <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: s.c }}>{tt(s.l)}</div>
            <div className="text-3xl font-black text-slate-800">{s.v}</div>
          </div>
        ))}
      </div>

      {dash.follow_ups?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-amber-700 font-bold text-sm mb-2"><AlertTriangle className="w-4 h-4" /> Alertas de seguimiento</div>
          <div className="flex flex-wrap gap-2">
            {dash.follow_ups.map(f => <span key={f.id} className="text-[11px] bg-white border border-amber-200 rounded-full px-2.5 py-1 text-amber-800">{f.name} · {f.reason}</span>)}
          </div>
        </div>
      )}

      {cmpItems.length >= 2 && <Comparison items={cmpItems} />}

      <SharedTalentsBoard onOpenId={(id) => onOpen(prospects.find(x => x.id === id))} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" /><span className="font-black text-slate-800">{tt('Ranking de Prospectos')}</span>
          <span className="text-[11px] text-slate-400 ml-2 flex items-center gap-1"><GitCompare className="w-3 h-3" /> Marca hasta 3 para comparar</span>
        </div>
        <div className="divide-y divide-slate-100">
          {dash.ranking.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50" data-testid={`ranking-row-${p.id}`}>
              <div className="w-7 text-center font-black text-slate-400">{i + 1}</div>
              <input type="checkbox" checked={compare.includes(p.id)} onChange={() => toggle(p.id)} className="accent-slate-900" data-testid={`compare-check-${p.id}`} />
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
                {p.photo_path ? <img src={photoUrl(p.photo_path)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-500 font-black">{p.name.slice(0, 1)}</div>}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(prospects.find(x => x.id === p.id))}>
                <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                <div className="text-[11px] text-slate-400 truncate">{p.position || '—'} · {p.sport_name} {p.current_club ? `· ${p.current_club}` : ''}</div>
              </div>
              {p.verdict && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: verdictColor(p.verdict) + '22', color: verdictColor(p.verdict) }}>{p.verdict}</span>}
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-white" style={{ background: scoreColor(p.overall_score) }}>{p.overall_score}</div>
            </div>
          ))}
          {!dash.ranking.length && <div className="p-8 text-center text-slate-400 text-sm">{tt('Evalúa prospectos para verlos en el ranking.')}</div>}
        </div>
      </div>
    </div>
  );
}

function Comparison({ items }) {
  const cats = ['technical', 'physical', 'tactical', 'mental'];
  const catLabel = { technical: 'Técnico', physical: 'Físico', tactical: 'Táctico', mental: 'Mental' };
  // Filas comparables: score, categorías y atributos físicos
  const rows = [
    { key: 'overall', label: 'Score General', val: p => p.overall_score, higher: true, badge: true },
    ...cats.map(c => ({ key: c, label: catLabel[c], val: p => p.evaluation?.category_averages?.[c], higher: true })),
    { key: 'age', label: 'Edad', val: p => p.age, higher: false, suffix: ' a' },
    { key: 'height_cm', label: 'Altura', val: p => p.height_cm, higher: true, suffix: ' cm' },
    { key: 'weight_kg', label: 'Peso', val: p => p.weight_kg, higher: false, suffix: ' kg' },
  ];
  // Conteo de victorias por categoría de evaluación (para el ganador)
  const wins = {};
  items.forEach(p => { wins[p.id] = 0; });
  ['overall', ...cats].forEach(key => {
    const row = rows.find(r => r.key === key);
    let best = -Infinity, bestId = null, tie = false;
    items.forEach(p => { const v = row.val(p); if (typeof v === 'number') { if (v > best) { best = v; bestId = p.id; tie = false; } else if (v === best) tie = true; } });
    if (bestId && !tie) wins[bestId] += 1;
  });
  const winnerId = items.reduce((bestId, p) => (wins[p.id] > wins[bestId] ? p.id : bestId), items[0]?.id);
  const winnerName = items.find(p => p.id === winnerId)?.name;

  const bestForRow = (row) => {
    const vals = items.map(p => row.val(p)).filter(v => typeof v === 'number');
    if (!vals.length) return null;
    return row.higher ? Math.max(...vals) : Math.min(...vals);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 overflow-x-auto" data-testid="comparison-panel">
      <div className="flex items-center gap-2 mb-1"><GitCompare className="w-4 h-4 text-slate-500" /><span className="font-black text-slate-800">{tt('Comparativa lado a lado')}</span></div>
      {winnerName && Math.max(...Object.values(wins)) > 0 && (
        <div className="flex items-center gap-1.5 mb-3 text-[12px] font-bold text-amber-600" data-testid="comparison-winner">
          <Crown className="w-4 h-4" />Líder de la comparativa: <span className="text-slate-900">{winnerName}</span>
          <span className="text-slate-400 font-medium">({wins[winnerId]} categorías ganadas)</span>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr><th className="text-left text-[11px] text-slate-400 uppercase font-bold pb-2">{tt('Criterio')}</th>
          {items.map(p => (
            <th key={p.id} className="px-3 pb-2 text-center text-slate-800 font-bold">
              <span className="inline-flex items-center gap-1">{p.id === winnerId && Math.max(...Object.values(wins)) > 0 && <Crown className="w-3.5 h-3.5 text-amber-500" />}{p.name.split(' ')[0]}</span>
            </th>
          ))}</tr></thead>
        <tbody>
          {rows.map(row => {
            const best = bestForRow(row);
            return (
              <tr key={row.key} className="border-t border-slate-100">
                <td className="py-2 font-medium text-slate-600">{tt(row.label)}</td>
                {items.map(p => {
                  const v = row.val(p);
                  const isBest = typeof v === 'number' && v === best && items.filter(x => row.val(x) === best).length === 1;
                  if (row.badge) {
                    return <td key={p.id} className="text-center"><span className="inline-block w-9 h-9 leading-9 rounded-lg text-white font-black" style={{ background: scoreColor(v), outline: isBest ? '2px solid #f59e0b' : 'none', outlineOffset: '2px' }}>{v ?? '—'}</span></td>;
                  }
                  return (
                    <td key={p.id} className="text-center font-black" style={{ color: row.key in catLabel || ['technical','physical','tactical','mental'].includes(row.key) ? scoreColor(v) : '#0f172a' }}>
                      <span className={isBest ? 'px-1.5 py-0.5 rounded bg-amber-100 text-amber-700' : ''}>{v != null ? `${v}${row.suffix || ''}` : '—'}</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Prospect Detail (social profile) ---------------- */
function ProspectDetail({ prospect: p, teams, onClose, onChanged, onDeleted, onEdit }) {
  const [obs, setObs] = useState('');
  const [obsCtx, setObsCtx] = useState('');
  const [convertOpen, setConvertOpen] = useState(false);
  const [teamId, setTeamId] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareId, setShareId] = useState(p.share_enabled ? p.share_id : null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardLinkCopied, setCardLinkCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('resumen');
  const shareUrl = shareId ? `${window.location.origin}/scouting/p/${shareId}` : null;
  const sm = stageMeta(p.stage);
  const ev = p.evaluation;
  const catLabel = { technical: 'Técnico', physical: 'Físico', tactical: 'Táctico', mental: 'Mental' };

  const addObs = async () => {
    if (!obs.trim()) return;
    try { await api(`/prospects/${p.id}/observations`, { method: 'POST', body: { note: obs, context: obsCtx } }); setObs(''); setObsCtx(''); onChanged(p.id); toast.success(tt('Observación añadida')); }
    catch { toast.error(tt('Error')); }
  };
  const del = async () => { if (!window.confirm('¿Eliminar prospecto?')) return; try { await api(`/prospects/${p.id}`, { method: 'DELETE' }); onDeleted(p.id); toast.success(tt('Eliminado')); } catch { toast.error(tt('Error')); } };
  const convert = async () => {
    try { const r = await api(`/prospects/${p.id}/convert`, { method: 'POST', body: { team_id: teamId || null } }); setConvertOpen(false); onChanged(p.id); toast.success(r.already ? 'Ya era atleta' : '¡Reclutado! Ahora es atleta en Equipos.'); }
    catch { toast.error(tt('Error al convertir')); }
  };
  const pdf = async (theme = 'dark') => {
    setPdfLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/recruiting/prospects/${p.id}/profile-pdf?theme=${theme}&origin=${encodeURIComponent(window.location.origin)}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `scouting_${(p.name || 'prospecto').replace(/\s+/g, '_').toLowerCase()}_${theme}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success(`Ficha PDF (${theme === 'light' ? 'clara' : 'oscura'}) descargada`);
    } catch (e) { toast.error(tt('No se pudo generar el PDF')); }
    setPdfLoading(false);
  };

  const openShare = async () => {
    setShareOpen(true);
    if (!shareId) {
      setSharing(true);
      try { const r = await api(`/prospects/${p.id}/share`, { method: 'POST' }); setShareId(r.share_id); onChanged(p.id); }
      catch { toast.error(tt('No se pudo crear el enlace')); }
      setSharing(false);
    }
  };
  const copyLink = () => { navigator.clipboard?.writeText(shareUrl); setCopied(true); toast.success(tt('Enlace copiado')); setTimeout(() => setCopied(false), 1800); };
  const [cardLoading, setCardLoading] = useState('');
  const [branding, setBranding] = useState({ entity_name: '', slogan: '', logo_path: null, accent_color: '#D4AF37' });
  const [brandSaving, setBrandSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [previewFmt, setPreviewFmt] = useState('post');
  const [previewUrl, setPreviewUrl] = useState('');
  const logoRef = useRef(null);
  const cardParams = () => {
    const q = new URLSearchParams();
    q.set('entity', branding.entity_name || '');
    q.set('slogan', branding.slogan || '');
    q.set('accent', branding.accent_color || '#D4AF37');
    if (branding.logo_path) q.set('logo_path', branding.logo_path);
    return q.toString();
  };
  useEffect(() => {
    if (!shareOpen) return;
    api('/settings').then(s => setBranding({ entity_name: s.entity_name || '', slogan: s.slogan || '', logo_path: s.logo_path || null, accent_color: s.accent_color || '#D4AF37' })).catch(() => {});
  }, [shareOpen]);
  // Vista previa en vivo (debounce)
  useEffect(() => {
    if (!shareOpen) { setPreviewUrl(''); return; }
    const t = setTimeout(() => {
      const url = `${API_URL}/api/recruiting/prospects/${p.id}/social-card?format=${previewFmt}&auth=${encodeURIComponent(token())}&${cardParams()}&_t=${Date.now()}`;
      setPreviewUrl(url);
    }, 450);
    return () => clearTimeout(t);
  }, [shareOpen, previewFmt, branding.entity_name, branding.slogan, branding.logo_path, branding.accent_color]);
  const uploadLogo = async (file) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api('/upload-logo', { method: 'POST', body: fd, raw: true });
      setBranding(b => ({ ...b, logo_path: r.path }));
      toast.success(tt('Logo subido'));
    } catch { toast.error(tt('No se pudo subir el logo')); }
    setLogoUploading(false);
  };
  const saveBranding = async () => {
    setBrandSaving(true);
    try {
      await api('/settings', { method: 'PUT', body: { eval_days: 14, expiry_days: 30, ...branding } });
      toast.success(tt('Marca guardada'));
    } catch { toast.error(tt('Error al guardar')); }
    setBrandSaving(false);
  };
  const socialCard = async (format) => {
    setCardLoading(format);
    try {
      const res = await fetch(`${API_URL}/api/recruiting/prospects/${p.id}/social-card?format=${format}&${cardParams()}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${(p.name || 'prospecto').replace(/\s+/g, '_')}-${format}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      track('download');
      toast.success(format === 'story' ? 'Tarjeta Story descargada' : 'Tarjeta Post descargada');
    } catch { toast.error(tt('No se pudo generar la tarjeta')); }
    setCardLoading('');
  };
  const track = (action) => {
    api(`/prospects/${p.id}/track`, { method: 'POST', body: { action } })
      .then(() => onChanged?.(p.id)).catch(() => {});
  };
  const cardLink = (fmt) => shareId
    ? `${API_URL}/api/recruiting/public/${shareId}/card-page?format=${fmt}&b=${encodeURIComponent(API_URL)}&fo=${encodeURIComponent(window.location.origin)}`
    : null;
  const copyCardLink = () => {
    const link = cardLink(previewFmt);
    if (!link) return;
    navigator.clipboard?.writeText(link);
    setCardLinkCopied(true); track('share');
    toast.success(tt('Enlace de la tarjeta copiado'));
    setTimeout(() => setCardLinkCopied(false), 1800);
  };
  const qrUrl = (fmt) => {
    const link = cardLink(fmt);
    if (!link) return null;
    return `${API_URL}/api/recruiting/qr?data=${encodeURIComponent(link)}&color=${encodeURIComponent(branding.accent_color || '#0A0F1E')}&auth=${encodeURIComponent(token())}`;
  };
  const downloadQr = async () => {
    const u = qrUrl(previewFmt);
    if (!u) return;
    try {
      const res = await fetch(u);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${(p.name || 'prospecto').replace(/\s+/g, '_')}-qr.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      track('share');
      toast.success(tt('QR descargado'));
    } catch { toast.error(tt('No se pudo generar el QR')); }
  };
  const cardFile = async (format) => {
    const res = await fetch(`${API_URL}/api/recruiting/prospects/${p.id}/social-card?format=${format}&${cardParams()}`, { headers: { Authorization: `Bearer ${token()}` } });
    if (!res.ok) throw new Error();
    const blob = await res.blob();
    return new File([blob], `${(p.name || 'prospecto').replace(/\s+/g, '_')}-${format}.png`, { type: 'image/png' });
  };
  const shareNative = async () => {
    setCardLoading('share');
    try {
      const file = await cardFile(previewFmt);
      const text = `${p.name || 'Prospecto'} · Scouting Report — LordTraining`;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: text, text });
        track('share');
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a'); a.href = url; a.download = file.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        track('download');
        toast.info(tt('Tu equipo no permite compartir directo. Descargamos la imagen para que la subas.'), { duration: 4000 });
      }
    } catch (e) {
      if (e?.name !== 'AbortError') toast.error(tt('No se pudo compartir la tarjeta'));
    }
    setCardLoading('');
  };
  const shareWhatsApp = () => {
    const link = cardLink(previewFmt) || shareUrl;
    const text = link
      ? `${p.name || 'Prospecto'} · Scouting Report — LordTraining ${link}`
      : `${p.name || 'Prospecto'} · Scouting Report — LordTraining`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
    track('share');
  };
  const shareFacebook = () => {
    const link = cardLink(previewFmt) || shareUrl;
    if (!link) { toast.info(tt('Activa el enlace público para compartir en Facebook.')); return; }
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, '_blank', 'noopener');
    track('share');
  };
  const shareInstagram = async () => {
    await socialCard(previewFmt);
    toast.info(tt('Imagen descargada. Ábrela en Instagram para publicarla.'), { duration: 4000 });
  };
  const disableShare = async () => {
    try { await api(`/prospects/${p.id}/share`, { method: 'DELETE' }); setShareId(null); setShareOpen(false); onChanged(p.id); toast.success(tt('Enlace desactivado')); }
    catch { toast.error(tt('Error')); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[92vh] overflow-y-auto bg-white" data-testid="prospect-detail">
        <DialogHeader className="sr-only">
          <DialogTitle>{tt('Perfil del prospecto')} {p.name}</DialogTitle>
          <DialogDescription>{tt('Ficha de scouting con evaluación, informe IA, observaciones y acciones.')}</DialogDescription>
        </DialogHeader>
        {/* Hero */}
        <div className="relative p-6 text-white" style={{ background: 'linear-gradient(120deg,#0f172a,#13203a 60%,#0b1220)' }}>
          <div className="flex gap-5 items-center">
            <div className="w-28 h-32 rounded-2xl overflow-hidden border-2 border-[#CCFF00] shrink-0 bg-slate-800">
              {p.photo_path ? <img src={photoUrl(p.photo_path)} alt={p.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-4xl font-black text-slate-600">{p.name.slice(0, 1)}</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase inline-block mb-1" style={{ background: sm.color, color: '#fff' }}>{tt(sm.label)}{p.outcome ? ` · ${p.outcome}` : ''}</div>
              <h2 className="text-3xl font-black leading-none" style={{ fontFamily: "'DM Sans',sans-serif" }}>{p.name}</h2>
              <div className="text-[#CCFF00] font-bold text-sm mt-1">{p.position || '—'} · {p.sport_name || p.sport}</div>
              <div className="text-slate-300 text-[12px] mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {p.current_club && <span>🏟 {p.current_club}</span>}{p.age && <span>🎂 {p.age} años</span>}
                {p.height_cm && <span>📏 {p.height_cm} cm</span>}{p.weight_kg && <span>⚖ {p.weight_kg} kg</span>}
                {p.dominant_side && <span>🦶 {p.dominant_side}</span>}{p.nationality && <span>🌍 {p.nationality}</span>}
              </div>
            </div>
            <div className="text-center shrink-0">
              <div className="text-[10px] text-slate-400 uppercase">{tt('Score')}</div>
              <div className="text-5xl font-black" style={{ color: scoreColor(p.overall_score) }}>{p.overall_score ?? '—'}</div>
            </div>
          </div>
          {/* Action bar */}
          <div className="flex flex-wrap gap-2 mt-5">
            <Button size="sm" onClick={() => onEdit(p)} className="bg-white/10 hover:bg-white/20 text-white border border-white/20" data-testid="detail-edit-btn"><Edit2 className="w-3.5 h-3.5 mr-1" />Editar</Button>
            <Button size="sm" onClick={() => pdf('dark')} disabled={pdfLoading} className="bg-slate-900 hover:bg-slate-800 text-[#CCFF00] border border-white/20" data-testid="detail-pdf-dark-btn">{pdfLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1" />}PDF Oscuro</Button>
            <Button size="sm" onClick={() => pdf('light')} disabled={pdfLoading} className="bg-white hover:bg-slate-100 text-slate-900 border border-white/20" data-testid="detail-pdf-light-btn">{pdfLoading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FileDown className="w-3.5 h-3.5 mr-1" />}PDF Claro</Button>
            <Button size="sm" onClick={openShare} className="bg-white/10 hover:bg-white/20 text-white border border-white/20" data-testid="detail-share-btn"><Share2 className="w-3.5 h-3.5 mr-1" />Compartir</Button>
            {!p.converted_athlete_id ? (
              <Button size="sm" onClick={() => setConvertOpen(true)} className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold" data-testid="detail-convert-btn"><UserPlus className="w-3.5 h-3.5 mr-1" />Reclutar → Atleta</Button>
            ) : <span className="text-[11px] text-emerald-300 self-center flex items-center gap-1"><Award className="w-4 h-4" />Reclutado como atleta</span>}
            <Button size="sm" onClick={del} className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30 ml-auto"><Trash2 className="w-3.5 h-3.5" /></Button>
            <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Detail tabs */}
        <div className="flex items-center gap-2 px-5 pt-4">
          {[['resumen', 'Resumen'], ['estadisticas', 'Estadísticas']].map(([k, l]) => (
            <button key={k} onClick={() => setDetailTab(k)} data-testid={`detail-tab-${k}`}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition"
              style={detailTab === k ? { background: '#0f172a', color: '#CCFF00' } : { background: '#f1f5f9', color: '#64748b' }}>{l}</button>
          ))}
        </div>

        {detailTab === 'resumen' && (<>
        <div className="p-5 grid md:grid-cols-2 gap-5">
          {/* Evaluation bars */}
          <div>
            <SectionTitle>{tt('Evaluación por área')}</SectionTitle>
            {ev?.category_averages ? Object.entries(ev.category_averages).map(([k, v]) => (
              <div key={k} className="mb-2.5">
                <div className="flex justify-between text-[12px] font-bold mb-1"><span className="text-slate-600">{catLabel[k] || k}</span><span style={{ color: scoreColor(v) }}>{v}</span></div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden relative"><div className="h-full" style={{ width: `${v}%`, background: scoreColor(v) }} /><div className="absolute top-0 h-full w-0.5 bg-slate-900" style={{ left: `${ev.club_standard || 70}%` }} /></div>
              </div>
            )) : <p className="text-[12px] text-slate-400">{tt('Sin evaluación. Usa la pestaña Evaluación.')}</p>}
            {Object.keys(p.key_stats || {}).length > 0 && (<>
              <SectionTitle className="mt-4">{tt('Stats clave')}</SectionTitle>
              <div className="grid grid-cols-3 gap-2">{Object.entries(p.key_stats).map(([k, v]) => (
                <div key={k} className="bg-slate-900 rounded-lg p-2 text-center"><div className="text-[8px] text-slate-400 uppercase">{k}</div><div className="text-[#CCFF00] font-black">{v}</div></div>
              ))}</div></>)}
          </div>
          {/* AI */}
          <div>
            <SectionTitle>{tt('Informe IA')}</SectionTitle>
            {p.ai_recommendation ? <AIReport ai={p.ai_recommendation} /> : <p className="text-[12px] text-slate-400">{p.bio || 'Sin informe. Genera uno en la pestaña Evaluación.'}</p>}
          </div>
        </div>

        {/* Videos / achievements / contact */}
        <div className="px-5 pb-4 grid md:grid-cols-2 gap-5">
          <div>
            {p.video_links?.length > 0 && <><SectionTitle>{tt('Galería de Videos')}</SectionTitle>
              {(() => {
                const byCat = {};
                p.video_links.forEach(v => { const c = v.category || v.type || 'highlights'; (byCat[c] = byCat[c] || []).push(v); });
                return (<div className="space-y-3">
                  {Object.entries(byCat).map(([c, vids]) => (
                    <div key={c}>
                      <div className="text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1.5">{tt(VCAT_LABEL[c] || c)}<span className="text-slate-300">· {vids.length}</span></div>
                      <VideoGallery videos={vids} />
                    </div>
                  ))}
                </div>);
              })()}</>}
            {p.achievements?.length > 0 && <><SectionTitle className="mt-3">{tt('Logros')}</SectionTitle><ul className="list-disc pl-5 text-[12px] text-slate-600">{p.achievements.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
          </div>
          <div className="text-[12px] text-slate-600 space-y-1">
            <SectionTitle>{tt('Contacto')}</SectionTitle>
            {p.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" />{p.email}</div>}
            {p.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" />{p.phone}</div>}
            {p.guardian_contact && <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400" />Tutor: {p.guardian_contact}</div>}
            {p.social_links?.instagram && <div className="flex items-center gap-2"><Instagram className="w-3.5 h-3.5 text-slate-400" />{p.social_links.instagram}</div>}
          </div>
        </div>

        {/* Observations timeline */}
        <div className="px-5 pb-6">
          <SectionTitle>{tt('Observaciones de scouting')}</SectionTitle>
          <div className="flex gap-2 mb-3">
            <Input value={obsCtx} onChange={(e) => setObsCtx(e.target.value)} placeholder={tt('Contexto (ej. Partido vs X)')} className="bg-white w-48" data-testid="obs-context" />
            <Input value={obs} onChange={(e) => setObs(e.target.value)} placeholder={tt('Nueva observación...')} className="bg-white flex-1" data-testid="obs-note" onKeyDown={(e) => e.key === 'Enter' && addObs()} />
            <Button onClick={addObs} className="bg-slate-900 text-white" data-testid="obs-add-btn"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="space-y-2">
            {(p.observations || []).slice().reverse().map(o => (
              <div key={o.id} className="bg-slate-50 rounded-lg p-2.5 text-[12px]">
                <div className="flex justify-between"><span className="font-bold text-slate-700">{o.context || 'Observación'}</span><span className="text-slate-400 text-[10px]">{(o.date || '').slice(0, 10)}</span></div>
                <div className="text-slate-600">{o.note}</div>
              </div>
            ))}
            {!(p.observations || []).length && <p className="text-[12px] text-slate-400">{tt('Sin observaciones aún.')}</p>}
          </div>
        </div>

        {/* Mercado y trayectoria */}
        {(p.market_value != null || (p.sponsorships || []).length > 0 || (p.transfers || []).length > 0) && (
          <div className="px-5 pb-6 grid md:grid-cols-2 gap-5">
            <div>
              <SectionTitle>{tt('Valor & Patrocinios')}</SectionTitle>
              {p.market_value != null && <div className="text-2xl font-black text-slate-900 mb-2" data-testid="detail-market-value">{p.market_currency || 'USD'} {Number(p.market_value).toLocaleString()}<span className="text-[11px] font-medium text-slate-400 ml-1">{tt('valor comercial')}</span></div>}
              {(p.sponsorships || []).length > 0 && <div className="flex flex-wrap gap-1.5">{p.sponsorships.map((s, i) => <span key={i} className="text-[11px] bg-slate-100 rounded-full px-2.5 py-1 text-slate-700">{s.name}{s.amount ? ` · ${s.currency || ''}${s.amount}` : ''}</span>)}</div>}
            </div>
            <div>
              {(p.transfers || []).length > 0 && <><SectionTitle>{tt('Trayectoria / Transferencias')}</SectionTitle>
                <div className="space-y-1.5">{p.transfers.map((t, i) => (
                  <div key={i} className="text-[12px] text-slate-600 flex items-center gap-1.5">
                    <span className="font-bold text-slate-700">{t.from_entity || '—'}</span>
                    <span className="text-slate-400">→</span>
                    <span className="font-bold text-slate-700">{t.to_entity || '—'}</span>
                    {t.type && <span className="text-[9px] uppercase bg-slate-100 rounded px-1 py-0.5 text-slate-500">{t.type}</span>}
                    {t.date && <span className="text-slate-400 text-[10px] ml-auto">{t.date}</span>}
                  </div>
                ))}</div></>}
            </div>
          </div>
        )}
        </>)}

        {detailTab === 'estadisticas' && (
          <div className="p-5"><ProspectStats prospectId={p.id} sport={p.sport} onStatsChanged={() => onChanged(p.id)} /></div>
        )}

        {/* Share dialog */}
        {shareOpen && (
          <Dialog open onOpenChange={() => setShareOpen(false)}>
            <DialogContent className="max-w-md bg-white" data-testid="share-dialog">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-emerald-500" />Link de Scouting público</DialogTitle>
                <DialogDescription>{tt('Cualquiera con este enlace puede ver la ficha del deportista, sin necesidad de cuenta. Ideal para universidades y agencias.')}</DialogDescription>
              </DialogHeader>
              {sharing ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
              ) : shareUrl ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input readOnly value={shareUrl} className="bg-slate-50 text-slate-700 text-[13px]" data-testid="share-url-input" onFocus={(e) => e.target.select()} />
                    <Button onClick={copyLink} className="bg-slate-900 text-white shrink-0" data-testid="share-copy-btn">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <a href={shareUrl} target="_blank" rel="noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full border-slate-300" data-testid="share-open-btn"><Globe className="w-4 h-4 mr-1" />Abrir ficha</Button>
                    </a>
                    <Button variant="outline" onClick={disableShare} className="border-red-200 text-red-500 hover:bg-red-50" data-testid="share-disable-btn">{tt('Desactivar enlace')}</Button>
                  </div>

                  {/* Tarjeta para redes sociales */}
                  <div className="pt-3 mt-1 border-t border-slate-150">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5"><Instagram className="w-3.5 h-3.5" />Tarjeta para redes</p>
                    <p className="text-[12px] text-slate-500 mb-2.5">Descarga una imagen lista para publicar en Instagram, Facebook o TikTok.</p>

                    {/* Editor de marca de la entidad */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mb-3 space-y-2" data-testid="branding-editor">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tu marca (opcional)</p>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => logoRef.current?.click()} disabled={logoUploading}
                          className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 hover:border-slate-400" data-testid="branding-logo-btn">
                          {logoUploading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                            : branding.logo_path ? <img src={photoUrl(branding.logo_path)} alt="logo" className="w-full h-full object-contain" />
                            : <Camera className="w-5 h-5 text-slate-400" />}
                        </button>
                        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0])} data-testid="branding-logo-input" />
                        <div className="flex-1 space-y-2">
                          <Input value={branding.entity_name} onChange={e => setBranding(b => ({ ...b, entity_name: e.target.value }))} placeholder={tt('Nombre de la entidad / club')} className="bg-white h-8 text-[13px]" data-testid="branding-entity-input" maxLength={60} />
                          <Input value={branding.slogan} onChange={e => setBranding(b => ({ ...b, slogan: e.target.value }))} placeholder={tt('Tu lema (ej. Formando campeones)')} className="bg-white h-8 text-[13px]" data-testid="branding-slogan-input" maxLength={80} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] font-semibold text-slate-500">Color:</span>
                        {['#D4AF37', '#CCFF00', '#EF4444', '#3B82F6', '#22C55E', '#8B5CF6', '#F97316', '#0EA5E9'].map(c => (
                          <button key={c} type="button" onClick={() => setBranding(b => ({ ...b, accent_color: c }))}
                            data-testid={`accent-${c.replace('#', '')}`}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${branding.accent_color?.toUpperCase() === c ? 'border-slate-900 scale-110' : 'border-white'}`}
                            style={{ backgroundColor: c }} />
                        ))}
                        <input type="color" value={branding.accent_color || '#D4AF37'} onChange={e => setBranding(b => ({ ...b, accent_color: e.target.value }))}
                          data-testid="accent-custom" className="w-7 h-7 rounded cursor-pointer border border-slate-200 bg-white p-0.5" title="Color personalizado" />
                      </div>
                      <Button size="sm" onClick={saveBranding} disabled={brandSaving} variant="outline" className="w-full border-slate-300 h-8 text-[12px]" data-testid="branding-save-btn">
                        {brandSaving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}Guardar marca
                      </Button>
                    </div>

                    {/* Vista previa en vivo */}
                    <div className="mb-3" data-testid="card-preview-wrap">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vista previa</span>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200">
                          <button onClick={() => setPreviewFmt('post')} data-testid="preview-fmt-post"
                            className={`px-2.5 py-1 text-[11px] font-semibold ${previewFmt === 'post' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>Post</button>
                          <button onClick={() => setPreviewFmt('story')} data-testid="preview-fmt-story"
                            className={`px-2.5 py-1 text-[11px] font-semibold ${previewFmt === 'story' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500'}`}>Story</button>
                        </div>
                      </div>
                      <div className="flex justify-center rounded-xl bg-slate-100 p-3">
                        {previewUrl ? (
                          <img src={previewUrl} alt="preview" data-testid="card-preview-img"
                            className={`rounded-lg shadow-md ${previewFmt === 'story' ? 'h-64' : 'h-56'} w-auto object-contain`} />
                        ) : (
                          <div className="h-56 flex items-center justify-center text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={() => socialCard('post')} disabled={!!cardLoading} className="flex-1 bg-gradient-to-br from-[#0A0F1E] to-[#1a2340] text-[#D4AF37] hover:opacity-90" data-testid="social-card-post-btn">
                        {cardLoading === 'post' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}Post (1:1.25)
                      </Button>
                      <Button onClick={() => socialCard('story')} disabled={!!cardLoading} className="flex-1 bg-gradient-to-br from-[#0A0F1E] to-[#1a2340] text-[#D4AF37] hover:opacity-90" data-testid="social-card-story-btn">
                        {cardLoading === 'story' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}Story (9:16)
                      </Button>
                    </div>

                    {/* Compartir directo (nativo + redes) */}
                    <div className="mt-3 pt-3 border-t border-slate-100" data-testid="native-share-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Compartir directo · {previewFmt === 'story' ? 'Story' : 'Post'}
                      </span>
                      <div className="flex gap-2 mt-1.5">
                        <Button onClick={shareNative} disabled={!!cardLoading} className="flex-1 bg-slate-900 text-white hover:bg-slate-800" data-testid="share-native-btn">
                          {cardLoading === 'share' ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Share2 className="w-4 h-4 mr-1" />}Compartir
                        </Button>
                        <Button onClick={shareWhatsApp} variant="outline" className="border-green-200 text-green-600 hover:bg-green-50 px-3" title="WhatsApp" data-testid="share-whatsapp-btn"><MessageCircle className="w-4 h-4" /></Button>
                        <Button onClick={shareFacebook} variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 px-3" title="Facebook" data-testid="share-facebook-btn"><Facebook className="w-4 h-4" /></Button>
                        <Button onClick={shareInstagram} disabled={!!cardLoading} variant="outline" className="border-pink-200 text-pink-500 hover:bg-pink-50 px-3" title="Instagram" data-testid="share-instagram-btn"><Instagram className="w-4 h-4" /></Button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">En el móvil, "Compartir" abre WhatsApp, Instagram, TikTok y más con la imagen adjunta.</p>
                    </div>

                    {/* Enlace directo a la tarjeta (con vista previa en redes / Open Graph) */}
                    <div className="mt-3 pt-3 border-t border-slate-100" data-testid="card-link-wrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" />Enlace de la tarjeta · {previewFmt === 'story' ? 'Story' : 'Post'}</span>
                      <div className="flex gap-2 mt-1.5">
                        <Input readOnly value={cardLink(previewFmt) || ''} onFocus={(e) => e.target.select()}
                          className="bg-slate-50 text-slate-700 text-[12px]" data-testid="card-link-input" />
                        <Button onClick={copyCardLink} className="bg-slate-900 text-white shrink-0" data-testid="card-link-copy-btn">
                          {cardLinkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <a href={cardLink(previewFmt) || '#'} target="_blank" rel="noreferrer">
                          <Button variant="outline" className="border-slate-300 px-3" data-testid="card-link-open-btn"><Globe className="w-4 h-4" /></Button>
                        </a>
                      </div>
                      <div className="flex items-center gap-3 mt-2.5" data-testid="card-qr-wrap">
                        <img src={qrUrl(previewFmt) || ''} alt="QR" data-testid="card-qr-img"
                          className="w-[76px] h-[76px] rounded-lg border border-slate-200 bg-white p-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-slate-400 mb-1.5">Al pegar el enlace en WhatsApp o Facebook mostrará la vista previa de la tarjeta. Comparte también el QR.</p>
                          <Button size="sm" variant="outline" onClick={downloadQr} className="border-slate-300 h-8 text-[12px]" data-testid="card-qr-download-btn">
                            <Download className="w-3.5 h-3.5 mr-1" />Descargar QR
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Contadores de compartición */}
                    <div className="mt-3 grid grid-cols-3 gap-2" data-testid="share-stats">
                      {[
                        { k: 'downloads', l: 'Descargas', Icon: Download, c: '#0f172a' },
                        { k: 'shares', l: 'Compartidos', Icon: Share2, c: '#16a34a' },
                        { k: 'views', l: 'Vistas', Icon: Eye, c: '#2563eb' },
                      ].map(({ k, l, Icon, c }) => (
                        <div key={k} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center" data-testid={`share-stat-${k}`}>
                          <Icon className="w-4 h-4 mx-auto mb-0.5" style={{ color: c }} />
                          <div className="text-lg font-black text-slate-800 leading-none" data-testid={`share-stat-${k}-value`}>{(p.share_stats && p.share_stats[k]) || 0}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide mt-0.5">{tt(l)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">{tt('No se pudo generar el enlace.')}</p>
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* Convert dialog */}
        {convertOpen && (
          <Dialog open onOpenChange={() => setConvertOpen(false)}>
            <DialogContent className="max-w-sm bg-white">
              <DialogHeader><DialogTitle>{tt('Reclutar → Convertir en Atleta')}</DialogTitle>
                <DialogDescription>{tt('Se creará un atleta en Gestión de Equipos con los datos del prospecto.')}</DialogDescription>
              </DialogHeader>
              <p className="text-[13px] text-slate-500">{tt('Se creará un atleta en Gestión de Equipos con los datos del prospecto.')}</p>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Equipo (opcional)</label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="mt-1 bg-white" data-testid="convert-team-select"><SelectValue placeholder={tt('Sin equipo')} /></SelectTrigger>
                  <SelectContent>{teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConvertOpen(false)}>{tt('Cancelar')}</Button>
                <Button className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold" onClick={convert} data-testid="convert-confirm-btn">{tt('Reclutar')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

const SectionTitle = ({ children, className = '' }) => (
  <div className={`text-[11px] font-black uppercase tracking-wide text-slate-400 mb-2 ${className}`}>{children}</div>
);

/* ---------------- Prospect Form (create/edit) ---------------- */
function ProspectForm({ initial, onClose, onSaved }) {
  const NULLABLE = ['age', 'height_cm', 'weight_kg', 'nationality', 'position', 'current_club', 'dominant_side', 'email', 'phone', 'gender', 'guardian_contact', 'bio'];
  const [f, setF] = useState(() => { const n = { ...initial }; NULLABLE.forEach(k => { if (n[k] == null) n[k] = ''; }); return n; });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const isEdit = !!initial.id;
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const [catalog, setCatalog] = useState({});
  useEffect(() => { fetch(`${API_URL}/api/sports-catalog`).then(r => r.json()).then(setCatalog).catch(() => {}); }, []);
  const CAT_LABELS = { team: 'Deportes de equipo', combat: 'Combate', racquet: 'Raqueta', endurance: 'Resistencia', strength: 'Fuerza', speed: 'Velocidad/Atletismo', fitness: 'Fitness', general: 'General' };
  const sportNameOf = (id) => { for (const arr of Object.values(catalog)) { const s = arr.find(x => x.id === id); if (s) return s.name; } return id; };

  // Videos
  const videos = f.video_links || [];
  const setVideos = (v) => set('video_links', v);
  const addVideo = () => setVideos([...videos, { title: '', url: '', category: 'highlights', recorded_at: '', notes: '', is_public: true }]);
  const updVideo = (i, k, val) => setVideos(videos.map((v, idx) => idx === i ? { ...v, [k]: val } : v));
  const rmVideo = (i) => setVideos(videos.filter((_, idx) => idx !== i));
  // Patrocinios
  const sponsors = Array.isArray(f.sponsorships) ? f.sponsorships : [];
  const setSponsors = (s) => set('sponsorships', s);
  const addSponsor = () => setSponsors([...sponsors, { name: '', amount: '', is_public: true }]);
  const updSponsor = (i, k, val) => setSponsors(sponsors.map((s, idx) => idx === i ? { ...s, [k]: val } : s));
  const rmSponsor = (i) => setSponsors(sponsors.filter((_, idx) => idx !== i));
  // Transferencias
  const transfers = f.transfers || [];
  const setTransfers = (t) => set('transfers', t);
  const addTransfer = () => setTransfers([...transfers, { from_entity: '', to_entity: '', type: 'club', date: '' }]);
  const updTransfer = (i, k, val) => setTransfers(transfers.map((t, idx) => idx === i ? { ...t, [k]: val } : t));
  const rmTransfer = (i) => setTransfers(transfers.filter((_, idx) => idx !== i));

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await api('/upload-photo', { method: 'POST', body: fd, raw: true });
      set('photo_path', r.path); toast.success(tt('Foto subida'));
    } catch { toast.error(tt('Error subiendo foto')); }
    setUploading(false);
  };

  const save = async () => {
    if (!f.name?.trim()) { toast.error(tt('El nombre es obligatorio')); return; }
    setSaving(true);
    const payload = {
      ...f,
      age: f.age ? parseInt(f.age) : null,
      height_cm: f.height_cm ? parseInt(f.height_cm) : null,
      weight_kg: f.weight_kg ? parseInt(f.weight_kg) : null,
      market_value: f.market_value !== '' && f.market_value != null ? parseFloat(f.market_value) : null,
      contract_end: f.contract_end || null,
      origin_lat: f.origin_lat !== '' && f.origin_lat != null ? parseFloat(f.origin_lat) : null,
      origin_lng: f.origin_lng !== '' && f.origin_lng != null ? parseFloat(f.origin_lng) : null,
      sponsorships: typeof f.sponsorships === 'string'
        ? f.sponsorships.split('\n').filter(Boolean).map(l => { const [name, amount] = l.split('|').map(x => x.trim()); return amount ? { name, amount } : { name }; })
        : (f.sponsorships || []),
      transfers: (f.transfers || []).filter(t => t.from_entity || t.to_entity),
      video_links: (f.video_links || []).filter(v => v.url && v.url.trim()),
      achievements: typeof f.achievements === 'string' ? f.achievements.split('\n').filter(Boolean) : f.achievements,
    };
    try {
      if (isEdit) await api(`/prospects/${initial.id}`, { method: 'PUT', body: payload });
      else await api('/prospects', { method: 'POST', body: payload });
      toast.success(isEdit ? 'Prospecto actualizado' : 'Prospecto creado'); onSaved();
    } catch { toast.error(tt('Error guardando')); }
    setSaving(false);
  };

  const achievementsStr = Array.isArray(f.achievements) ? f.achievements.join('\n') : (f.achievements || '');
  const sponsorshipsStr = Array.isArray(f.sponsorships) ? f.sponsorships.map(s => s.amount ? `${s.name} | ${s.amount}` : s.name).join('\n') : (f.sponsorships || '');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white max-h-[92vh] overflow-y-auto" data-testid="prospect-form">
        <DialogHeader><DialogTitle>{isEdit ? tt('Editar Prospecto') : tt('Nuevo Prospecto')}</DialogTitle>
          <DialogDescription>{tt('Completa los datos del prospecto. Solo el nombre es obligatorio.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Photo */}
          <div className="flex items-center gap-4">
            <div className="w-24 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
              {f.photo_path ? <img src={photoUrl(f.photo_path)} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Camera className="w-7 h-7" /></div>}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} data-testid="photo-input" />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Camera className="w-4 h-4 mr-1" />} Subir foto
              </Button>
              <p className="text-[11px] text-slate-400 mt-1">{tt('JPG/PNG/WebP · máx 8MB')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={tt('Nombre *')}><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-white" data-testid="form-name" /></Field>
            <Field label={tt('Deporte')}>
              <Select value={f.sport} onValueChange={(v) => { set('sport', v); set('sport_name', sportNameOf(v)); }}>
                <SelectTrigger className="bg-white" data-testid="form-sport"><SelectValue placeholder={tt('Elegir deporte')} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(catalog).map(([cat, sports]) => (
                    <div key={cat}>
                      <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400">{CAT_LABELS[cat] || cat}</div>
                      {sports.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={tt('Posición')}><Input value={f.position} onChange={e => set('position', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Nivel')}>
              <Select value={f.level || 'amateur'} onValueChange={v => set('level', v)}>
                <SelectTrigger className="bg-white" data-testid="form-level"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">{tt('Principiante')}</SelectItem>
                  <SelectItem value="amateur">{tt('Amateur')}</SelectItem>
                  <SelectItem value="semiprofesional">{tt('Semiprofesional')}</SelectItem>
                  <SelectItem value="profesional">{tt('Profesional')}</SelectItem>
                  <SelectItem value="elite">{tt('Élite')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label={tt('Club actual')}><Input value={f.current_club} onChange={e => set('current_club', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Edad')}><Input type="number" value={f.age} onChange={e => set('age', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Nacionalidad')}><Input value={f.nationality} onChange={e => set('nationality', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Altura (cm)')}><Input type="number" value={f.height_cm} onChange={e => set('height_cm', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Peso (kg)')}><Input type="number" value={f.weight_kg} onChange={e => set('weight_kg', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Lado dominante')}><Input value={f.dominant_side} onChange={e => set('dominant_side', e.target.value)} placeholder={tt('Derecha / Izquierda')} className="bg-white" /></Field>
            <Field label={tt('Estado')}>
              <Select value={f.stage} onValueChange={v => set('stage', v)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{STAGES.map(s => <SelectItem key={s.key} value={s.key}>{tt(s.label)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label={tt('Email')}><Input value={f.email} onChange={e => set('email', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Teléfono')}><Input value={f.phone} onChange={e => set('phone', e.target.value)} className="bg-white" /></Field>
            <Field label={tt('Ciudad de origen')}><Input value={f.origin_city} onChange={e => set('origin_city', e.target.value)} className="bg-white" placeholder={tt('Ej. Medellín')} data-testid="form-origin-city" /></Field>
            <Field label={tt('País de origen')}><Input value={f.origin_country} onChange={e => set('origin_country', e.target.value)} className="bg-white" placeholder={tt('Ej. Colombia (se ubica en el mapa)')} data-testid="form-origin-country" /></Field>
            <Field label={tt('Fin de contrato (alertas)')}><Input type="date" value={f.contract_end || ''} onChange={e => set('contract_end', e.target.value)} className="bg-white" data-testid="form-contract-end" /></Field>
          </div>
          {/* Videos múltiples (entrenando / jugando) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Videos (YouTube / Vimeo)</label>
              <button type="button" onClick={addVideo} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1" data-testid="form-add-video"><Plus className="w-3.5 h-3.5" />Agregar video</button>
            </div>
            <div className="space-y-2">
              {videos.map((v, i) => (
                <div key={i} className="flex flex-wrap gap-1.5 items-center bg-slate-50 rounded-lg p-2" data-testid={`form-video-${i}`}>
                  <Input value={v.title || ''} onChange={e => updVideo(i, 'title', e.target.value)} placeholder={tt('Título')} className="bg-white w-32" />
                  <Input value={v.url || ''} onChange={e => updVideo(i, 'url', e.target.value)} placeholder={tt('https://youtube.com/...')} className="bg-white flex-1 min-w-[160px]" data-testid={`form-video-url-${i}`} />
                  <Select value={v.category || 'highlights'} onValueChange={val => updVideo(i, 'category', val)}>
                    <SelectTrigger className="bg-white w-32 shrink-0" data-testid={`form-video-cat-${i}`}><SelectValue /></SelectTrigger>
                    <SelectContent>{VIDEO_CATS.map(([val, l]) => <SelectItem key={val} value={val}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={v.recorded_at || ''} onChange={e => updVideo(i, 'recorded_at', e.target.value)} className="bg-white w-36 shrink-0" />
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer" title={tt('Visible en perfil público/PDF')}>
                    <input type="checkbox" checked={v.is_public !== false} onChange={e => updVideo(i, 'is_public', e.target.checked)} className="accent-slate-900" data-testid={`form-video-public-${i}`} />Público
                  </label>
                  <button type="button" onClick={() => rmVideo(i)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                  <Input value={v.notes || ''} onChange={e => updVideo(i, 'notes', e.target.value)} placeholder={tt('Notas (opcional)')} className="bg-white w-full" />
                </div>
              ))}
              {!videos.length && <p className="text-[11px] text-slate-400">Agrega videos del prospecto (técnico, físico, partido, táctico, highlights, entrevista).</p>}
            </div>
          </div>

          {/* Valor comercial + patrocinios */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={tt('Valor comercial / precio')}>
              <div className="flex gap-1.5">
                <Select value={f.market_currency || 'USD'} onValueChange={v => set('market_currency', v)}>
                  <SelectTrigger className="bg-white w-24 shrink-0"><SelectValue /></SelectTrigger>
                  <SelectContent>{['USD', 'EUR', 'COP', 'MXN', 'ARS', 'BRL'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" value={f.market_value ?? ''} onChange={e => set('market_value', e.target.value)} className="bg-white" placeholder="0" data-testid="form-market-value" />
              </div>
              <label className="flex items-center gap-1 text-[11px] font-bold text-slate-500 cursor-pointer mt-1">
                <input type="checkbox" checked={!!f.market_value_public} onChange={e => set('market_value_public', e.target.checked)} className="accent-slate-900" data-testid="form-market-public" />Mostrar en perfil público
              </label>
            </Field>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{tt('Patrocinios')}</label>
                <button type="button" onClick={addSponsor} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1" data-testid="form-add-sponsor"><Plus className="w-3.5 h-3.5" />Agregar</button>
              </div>
              <div className="space-y-1.5">
                {sponsors.map((s, i) => (
                  <div key={i} className="flex gap-1.5 items-center" data-testid={`form-sponsor-${i}`}>
                    <Input value={s.name || ''} onChange={e => updSponsor(i, 'name', e.target.value)} placeholder={tt('Marca')} className="bg-white flex-1" />
                    <Input value={s.amount || ''} onChange={e => updSponsor(i, 'amount', e.target.value)} placeholder={tt('Monto')} className="bg-white w-24" />
                    <Input type="date" value={s.expires_at || ''} onChange={e => updSponsor(i, 'expires_at', e.target.value)} className="bg-white w-36 shrink-0" title={tt('Vencimiento (alertas)')} data-testid={`form-sponsor-expires-${i}`} />
                    <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                      <input type="checkbox" checked={s.is_public !== false} onChange={e => updSponsor(i, 'is_public', e.target.checked)} className="accent-slate-900" data-testid={`form-sponsor-public-${i}`} />Púb.
                    </label>
                    <button type="button" onClick={() => rmSponsor(i)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
                {!sponsors.length && <p className="text-[11px] text-slate-400">{tt('Sin patrocinios.')}</p>}
              </div>
            </div>
          </div>

          {/* Transferencias / trayectoria */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{tt('Transferencias / Trayectoria')}</label>
              <button type="button" onClick={addTransfer} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1" data-testid="form-add-transfer"><Plus className="w-3.5 h-3.5" />Agregar</button>
            </div>
            <div className="space-y-2">
              {transfers.map((t, i) => (
                <div key={i} className="flex gap-1.5 items-center" data-testid={`form-transfer-${i}`}>
                  <Input value={t.from_entity || ''} onChange={e => updTransfer(i, 'from_entity', e.target.value)} placeholder={tt('Desde (escuela...)')} className="bg-white flex-1" />
                  <span className="text-slate-400">→</span>
                  <Input value={t.to_entity || ''} onChange={e => updTransfer(i, 'to_entity', e.target.value)} placeholder={tt('Hacia (club...)')} className="bg-white flex-1" />
                  <Select value={t.type || 'club'} onValueChange={val => updTransfer(i, 'type', val)}>
                    <SelectTrigger className="bg-white w-32 shrink-0"><SelectValue /></SelectTrigger>
                    <SelectContent>{['escuela', 'club', 'equipo', 'institución', 'federación', 'universidad'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input type="date" value={t.date || ''} onChange={e => updTransfer(i, 'date', e.target.value)} className="bg-white w-36 shrink-0" />
                  <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500 cursor-pointer">
                    <input type="checkbox" checked={t.is_public !== false} onChange={e => updTransfer(i, 'is_public', e.target.checked)} className="accent-slate-900" data-testid={`form-transfer-public-${i}`} />Púb.
                  </label>
                  <button type="button" onClick={() => rmTransfer(i)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
              {!transfers.length && <p className="text-[11px] text-slate-400">Ej: Escuela X → Club Y (universidad/federación/institución).</p>}
            </div>
          </div>

          <Field label={tt('Logros (uno por línea)')}>
            <Textarea rows={2} value={achievementsStr} onChange={e => set('achievements', e.target.value)} className="bg-white" />
          </Field>
          <Field label={tt('Bio / notas de scouting')}>
            <Textarea rows={2} value={f.bio || ''} onChange={e => set('bio', e.target.value)} className="bg-white" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tt('Cancelar')}</Button>
          <Button onClick={save} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800" data-testid="form-save-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Field = ({ label, children }) => (
  <div><label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">{label}</label><div className="mt-1">{children}</div></div>
);

const EmptyState = ({ text }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Target className="w-8 h-8 text-slate-300" /></div>
    <p className="text-slate-400 text-sm max-w-xs">{text}</p>
  </div>
);
