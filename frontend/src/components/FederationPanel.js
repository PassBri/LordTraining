import React, { useEffect, useState, useMemo } from 'react';
import { tx as tt } from '../lib/autoTranslate';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Building2, Users, Trophy, Activity, ChevronDown, ChevronRight,
  UserCog, MapPin, Loader2, Crown, RefreshCw, FileBarChart2, X, Plus, Trash2,
  GraduationCap, Shield, BarChart3, Target,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';

const API = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));
const tokenH = () => {
  const t = localStorage.getItem('train_token') || localStorage.getItem('token');
  return { Authorization: `Bearer ${t}` };
};

const ENTITY_META = {
  federation: { icon: Crown, color: '#7C3AED', label: 'Federación' },
  club: { icon: Building2, color: '#0EA5E9', label: 'Club' },
  school: { icon: GraduationCap, color: '#10B981', label: 'Escuela' },
  national_team: { icon: Shield, color: '#EF4444', label: 'Selección' },
  team: { icon: Users, color: '#F59E0B', label: 'Equipo' },
  league: { icon: Trophy, color: '#EC4899', label: 'Liga' },
};

const KPI_TILES = [
  { key: 'clubs', label: 'Clubes', icon: Building2, color: '#0EA5E9' },
  { key: 'schools', label: 'Escuelas', icon: GraduationCap, color: '#10B981' },
  { key: 'teams', label: 'Equipos', icon: Users, color: '#F59E0B' },
  { key: 'athletes', label: 'Atletas', icon: Activity, color: '#EF4444' },
  { key: 'coaches', label: 'Coaches', icon: UserCog, color: '#7C3AED' },
  { key: 'plans_active', label: 'Planes Activos', icon: Target, color: '#22C55E' },
  { key: 'competitions_linked', label: 'Competencias', icon: Trophy, color: '#EC4899' },
  { key: 'evaluations_30d', label: 'Evaluaciones 30d', icon: BarChart3, color: '#06B6D4' },
];

// ============ TREE NODE ============
function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(depth < 2);
  const meta = ENTITY_META[node.entity_type] || ENTITY_META.club;
  const Icon = meta.icon;
  const hasKids = (node.children || []).length > 0 || (node.athletes || []).length > 0;

  return (
    <div className="" data-testid={`tree-node-${node.id}`}>
      <div
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer group transition"
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
        onClick={() => hasKids && setOpen(!open)}
      >
        {hasKids ? (
          open
            ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        ) : <span className="w-3.5" />}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0"
          style={{ backgroundColor: `${meta.color}15`, color: meta.color }}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{node.name}</div>
          <div className="text-[10px] text-slate-500 flex items-center gap-2">
            <span style={{ color: meta.color }}>{meta.label}</span>
            {node.city && <span>· {node.city}</span>}
            {node.athletes_count > 0 && <span>· {node.athletes_count} atletas</span>}
            {(node.coaches || []).length > 0 && <span>· {node.coaches.length} coaches</span>}
          </div>
        </div>
      </div>
      {open && hasKids && (
        <div>
          {(node.children || []).map(c => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
          {(node.athletes || []).map(a => (
            <div
              key={a.id}
              className="flex items-center gap-2 px-2 py-1 text-xs text-slate-600"
              style={{ paddingLeft: `${(depth + 1) * 18 + 24}px` }}
              data-testid={`tree-athlete-${a.id}`}
            >
              <Activity className="w-3 h-3 text-slate-400" />
              <span className="font-medium">{a.name}</span>
              {a.sport && <span className="text-[10px] text-slate-400">· {a.sport}</span>}
              {a.age && <span className="text-[10px] text-slate-400">· {a.age}a</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ ASSIGN COACH MODAL ============
function AssignCoachModal({ open, onOpenChange, entityId, entityName, roles, onSaved }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('head_coach');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Ingresa el nombre del coach');
      return;
    }
    setSaving(true);
    try {
      // Generate a coach_id (tag UUID for non-user coaches)
      const coach_id = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await axios.post(`${API}/api/federations/assign-coach`, {
        coach_id, coach_name: name.trim(), entity_id: entityId, role, notes,
      }, { headers: tokenH() });
      toast.success('Coach asignado');
      setName(''); setRole('head_coach'); setNotes('');
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error('Error al asignar: ' + (e?.response?.data?.detail || e.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="fed-assign-coach-modal">
        <DialogHeader>
          <DialogTitle>Asignar coach / staff</DialogTitle>
          <DialogDescription>A entidad: <strong>{entityName}</strong></DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <Label className="text-xs">Nombre</Label>
            <Input
              data-testid="fed-coach-name"
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Nombre completo del coach o staff" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 text-sm" data-testid="fed-coach-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(roles || {}).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Notas (opcional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Especialidad, contacto, etc." className="h-9 text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving} data-testid="fed-coach-save"
              className="bg-slate-900 text-white hover:bg-slate-800">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
              Asignar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ MAIN ============
export default function FederationPanel({ onOpenMasterReport }) {
  useTranslation();
  const [federations, setFederations] = useState([]);
  const [activeId, setActiveId] = useState('');
  const [stats, setStats] = useState(null);
  const [tree, setTree] = useState(null);
  const [coachesData, setCoachesData] = useState({ items: [], roles: {} });
  const [compliance, setCompliance] = useState([]);
  const [plans, setPlans] = useState([]);
  const [comps, setComps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignModal, setAssignModal] = useState({ open: false, id: '', name: '' });

  const loadList = async () => {
    try {
      const r = await axios.get(`${API}/api/federations/list`, { headers: tokenH() });
      const items = r.data.items || [];
      setFederations(items);
      if (items.length && !activeId) setActiveId(items[0].id);
    } catch (e) {
      toast.error(tt('No se pudo cargar la lista de federaciones'));
    }
  };

  const loadDetails = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const headers = tokenH();
      const [s, t, c, comp, pl, cm] = await Promise.all([
        axios.get(`${API}/api/federations/stats/${id}`, { headers }),
        axios.get(`${API}/api/federations/tree/${id}`, { headers }),
        axios.get(`${API}/api/federations/coaches/${id}`, { headers }),
        axios.get(`${API}/api/federations/compliance/${id}`, { headers }),
        axios.get(`${API}/api/federations/plans/${id}?only_active=false&limit=100`, { headers }),
        axios.get(`${API}/api/federations/competitions/${id}`, { headers }),
      ]);
      setStats(s.data);
      setTree(t.data);
      setCoachesData(c.data);
      setCompliance(comp.data.items || []);
      setPlans(pl.data.items || []);
      setComps(cm.data.items || []);
    } catch (e) {
      toast.error(tt('Error cargando datos: ') + (e?.response?.data?.detail || e.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { if (activeId) loadDetails(activeId); }, [activeId]);

  const removeAssignment = async (assignmentId) => {
    if (!window.confirm('¿Quitar esta asignación?')) return;
    try {
      await axios.delete(`${API}/api/federations/assign-coach/${assignmentId}`, { headers: tokenH() });
      toast.success(tt('Asignación eliminada'));
      loadDetails(activeId);
    } catch (e) {
      toast.error(tt('Error: ') + (e?.response?.data?.detail || e.message));
    }
  };

  const activeFed = federations.find(f => f.id === activeId);
  const maxPct = useMemo(() => Math.max(...compliance.map(c => c.avg_pct), 100), [compliance]);

  if (!federations.length) {
    return (
      <div className="p-6 max-w-3xl mx-auto" data-testid="federation-empty">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <Crown className="w-12 h-12 text-violet-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">{tt('Panel de Federaciones')}</h2>
          <p className="text-sm text-slate-600 mb-4">
            Aún no tienes una entidad raíz. Crea una <strong>{tt('Federación')}</strong>, <strong>{tt('Club')}</strong> {tt('o')} <strong>{tt('Selección Nacional')}</strong> {tt('desde la sección')} <strong>{tt('Datos → Entidades')}</strong> para coordinar varios clubes, escuelas, coaches y atletas bajo un mismo paraguas.
          </p>
          <p className="text-xs text-slate-400">{tt('Una vez creada, este panel mostrará el árbol jerárquico, KPIs ejecutivos, asignaciones de staff y comparativa de cumplimiento entre clubes.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full bg-[#fafaf8]" data-testid="federation-panel">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-violet-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <Crown className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{tt('Panel de Federación')}</h1>
            <p className="text-[11px] text-slate-500 truncate">{tt('Coordinación multi-club · multi-coach · multi-athlete')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {federations.length > 1 && (
            <Select value={activeId} onValueChange={setActiveId}>
              <SelectTrigger className="h-9 w-56 text-sm" data-testid="fed-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {federations.map(f => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name} <span className="text-[10px] text-slate-400">({(ENTITY_META[f.entity_type] || {}).label})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline" size="sm" className="h-9 text-xs"
            onClick={() => loadDetails(activeId)} data-testid="fed-refresh-btn">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Actualizar
          </Button>
          <Button
            size="sm" className="h-9 text-xs bg-slate-900 text-[#CCFF00] hover:bg-slate-800"
            onClick={() => onOpenMasterReport?.({ entity_id: activeId, style: 'federation' })}
            data-testid="fed-master-report-btn">
            <FileBarChart2 className="w-3.5 h-3.5 mr-1.5" />Reporte Federación
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {KPI_TILES.map(tile => {
          const Icon = tile.icon;
          const v = stats?.[tile.key] ?? 0;
          return (
            <div
              key={tile.key}
              className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition"
              data-testid={`fed-kpi-${tile.key}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">{tile.label}</span>
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ background: `${tile.color}15`, color: tile.color }}>
                  <Icon className="w-3 h-3" />
                </div>
              </div>
              <div className="text-2xl font-black tabular-nums" style={{ color: tile.color }}>{v}</div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-500" />
        </div>
      )}

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* TREE */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col" style={{ minHeight: 420 }}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{tt('Árbol Jerárquico')}</h3>
            <span className="text-[10px] text-slate-400">{stats?.tree_size || 0} nodos</span>
          </div>
          <div className="p-2 overflow-y-auto flex-1" data-testid="fed-tree">
            {tree ? <TreeNode node={tree} /> : <div className="text-xs text-slate-400 p-4">{tt('Sin datos')}</div>}
          </div>
        </div>

        {/* COMPLIANCE COMPARISON */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col" style={{ minHeight: 420 }}>
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">{tt('Comparativa de Cumplimiento por Club')}</h3>
            <span className="text-[10px] text-slate-400">{compliance.length} entidades hijas</span>
          </div>
          <div className="p-3 overflow-y-auto flex-1 space-y-2" data-testid="fed-compliance">
            {compliance.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">{tt('No hay clubes/escuelas hijos directos.')}</div>
            ) : compliance.map(c => {
              const meta = ENTITY_META[c.type] || ENTITY_META.club;
              const Icon = meta.icon;
              const pct = c.avg_pct;
              const colorBar = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : pct > 0 ? '#EF4444' : '#94A3B8';
              return (
                <div key={c.id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${meta.color}15`, color: meta.color }}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{c.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {c.athletes} atletas · {c.evaluations} evaluaciones
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black tabular-nums" style={{ color: colorBar }}>{pct}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((pct / Math.max(maxPct, 1)) * 100, 100)}%`, background: colorBar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COACHES */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UserCog className="w-3.5 h-3.5 text-violet-500" />
              Staff Asignado ({coachesData.items.length})
            </h3>
            <Button
              variant="outline" size="sm" className="h-7 text-[10px] px-2"
              onClick={() => setAssignModal({ open: true, id: activeId, name: activeFed?.name || '' })}
              data-testid="fed-assign-btn">
              <Plus className="w-3 h-3 mr-1" />Asignar
            </Button>
          </div>
          <div className="p-3 overflow-y-auto max-h-96" data-testid="fed-coaches">
            {coachesData.items.length === 0 ? (
              <div className="text-xs text-slate-400 p-4 text-center">{tt('Sin staff asignado.')}</div>
            ) : coachesData.items.map(coach => (
              <div key={coach.coach_id} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 mb-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-xs">
                    {(coach.coach_name || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">{coach.coach_name}</div>
                    <div className="text-[10px] text-slate-500">{coach.assignments.length} asignación(es)</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {coach.assignments.map(a => (
                    <div key={a.id} className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] flex items-center gap-1.5"
                      data-testid={`fed-assign-${a.id}`}>
                      <span className="font-semibold text-slate-700">{a.entity_name}</span>
                      <span className="text-violet-600">· {a.role_label}</span>
                      <button
                        onClick={() => removeAssignment(a.id)}
                        className="text-slate-400 hover:text-red-500 ml-1"
                        title={tt('Quitar asignación')}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PLANS + COMPETITIONS */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                Planes ({plans.length})
              </h3>
            </div>
            <div className="p-2 overflow-y-auto max-h-44" data-testid="fed-plans">
              {plans.length === 0 ? (
                <div className="text-xs text-slate-400 p-3 text-center">{tt('Sin planes registrados.')}</div>
              ) : plans.map(p => (
                <div key={p.id} className="px-2 py-1.5 hover:bg-slate-50 rounded text-xs flex items-center gap-2">
                  {p.active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  <span className="font-semibold text-slate-800 truncate flex-1">{p.name}</span>
                  <span className="text-[10px] text-slate-500">{p.athlete_name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-pink-500" />
                Competencias ({comps.length})
              </h3>
            </div>
            <div className="p-2 overflow-y-auto max-h-44" data-testid="fed-competitions">
              {comps.length === 0 ? (
                <div className="text-xs text-slate-400 p-3 text-center">{tt('Sin competencias vinculadas.')}</div>
              ) : comps.map(c => (
                <div key={c.id} className="px-2 py-1.5 hover:bg-slate-50 rounded text-xs">
                  <div className="font-semibold text-slate-800 truncate">{c.name}</div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    {c.start_date && <span>📅 {c.start_date}</span>}
                    {c.location && <span>📍 {c.location}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AssignCoachModal
        open={assignModal.open}
        onOpenChange={(v) => setAssignModal({ ...assignModal, open: v })}
        entityId={assignModal.id}
        entityName={assignModal.name}
        roles={coachesData.roles}
        onSaved={() => loadDetails(activeId)} />
    </div>
  );
}
