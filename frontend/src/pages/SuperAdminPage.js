import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ShieldCheck, Building2, Trophy, GraduationCap, Landmark,
  Users, UserCheck, BadgeCheck, Loader2, Search, Sparkles,
  Tag, Gift, Link2, Plus, Power, Trash2, Copy, Filter,
  TrendingUp, TrendingDown, Award, Briefcase, ChevronRight, DollarSign, RefreshCw, Banknote,
  AlertTriangle, Bell, UserMinus, RotateCcw, Info,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import AdminUserManagement from '../components/AdminUserManagement';
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, FunnelChart, Funnel, LabelList, Cell } from 'recharts';
import {
  getAdminHierarchy, getOrgMembers, grantPlan,
  createPromoCode, listPromoCodes, togglePromoCode, deletePromoCode,
  setOrgEntityType, getFinanceDashboard, createRefund, getAdminAlerts,
} from '../services/api';

// Material Design 3 palette
const MD3 = {
  primary: '#6750A4',
  primaryContainer: '#EADDFF',
  onPrimaryContainer: '#21005D',
  secondary: '#625B71',
  surface: '#FFFBFE',
  surfaceVariant: '#F4EFF4',
  outline: 'rgba(121, 116, 126, 0.25)',
};

// Entity type → icon + color
const ENTITY = {
  federation: { label: 'Federación / Universidad', icon: Landmark, color: '#9C27B0', tint: '#F3E5F5', desc: 'Federaciones, ligas nacionales y universidades' },
  university: { label: 'Federación / Universidad', icon: Landmark, color: '#9C27B0', tint: '#F3E5F5', desc: 'Federaciones, ligas nacionales y universidades' },
  league: { label: 'Liga', icon: Trophy, color: '#FF6F00', tint: '#FFF3E0', desc: 'Ligas y competiciones organizadas' },
  club: { label: 'Club', icon: Building2, color: '#1976D2', tint: '#E3F2FD', desc: 'Clubes deportivos' },
  school: { label: 'Escuela / Academia', icon: GraduationCap, color: '#388E3C', tint: '#E8F5E9', desc: 'Escuelas y academias deportivas' },
};

const PLAN_BADGE = {
  free: 'bg-slate-100 text-slate-600',
  starter: 'bg-slate-200 text-slate-700',
  basic: 'bg-blue-100 text-blue-700',
  pro: 'bg-emerald-100 text-emerald-700',
  enterprise: 'bg-amber-100 text-amber-800',
};

const SuperAdminPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('hierarchy');  // hierarchy | codes
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Codes
  const [codes, setCodes] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCode, setNewCode] = useState({ code_type: 'discount', code: '', discount_percent: 20, gift_days: 30, gift_plan: 'basic', max_uses: 100, expires_in_days: 30, description: '' });

  // Finance
  const [finance, setFinance] = useState(null);
  const [refundOpen, setRefundOpen] = useState(null); // sale object
  const [refundForm, setRefundForm] = useState({ amount: 0, reason: '' });
  const [alerts, setAlerts] = useState([]);

  // Grant plan
  const [grantOpen, setGrantOpen] = useState(null); // user object
  const [grantForm, setGrantForm] = useState({ plan: 'basic', duration_days: 30, reason: '' });

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await getAdminHierarchy();
      setData(res.data);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error cargando jerarquía');
      if (e.response?.status === 403) navigate('/dashboard');
    } finally { setLoading(false); }
  };

  const refreshCodes = async () => {
    try {
      const res = await listPromoCodes();
      setCodes(res.data.codes || []);
    } catch (e) { /* not super admin */ }
  };

  const refreshFinance = async () => {
    try {
      const res = await getFinanceDashboard();
      setFinance(res.data);
    } catch (e) { /* not super admin */ }
  };

  const refreshAlerts = async () => {
    try {
      const res = await getAdminAlerts();
      setAlerts(res.data.alerts || []);
    } catch (e) { /* not super admin */ }
  };

  useEffect(() => { refresh(); refreshCodes(); refreshFinance(); refreshAlerts(); }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>;
  }
  if (!data) return null;

  const { level, stats, groups, is_super_admin: isSuper, scope } = data;

  // ─── Selecting an org → load members ───
  const openOrg = async (org) => {
    setSelectedOrg(org);
    setLoadingMembers(true);
    try {
      const res = await getOrgMembers(org.id);
      setMembers(res.data.members || []);
    } catch (e) {
      toast.error('Error cargando miembros');
    } finally { setLoadingMembers(false); }
  };

  const handleSetEntityType = async (orgId, et) => {
    try {
      await setOrgEntityType(orgId, et);
      toast.success('Tipo actualizado');
      refresh();
    } catch (e) { toast.error('Error'); }
  };

  const handleGrant = async () => {
    if (!grantOpen) return;
    try {
      await grantPlan({ user_id: grantOpen.id, ...grantForm });
      toast.success(`Plan ${grantForm.plan} otorgado por ${grantForm.duration_days} días`);
      setGrantOpen(null);
      refresh();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleCreateCode = async () => {
    try {
      const res = await createPromoCode(newCode);
      toast.success(`Código ${res.data.code} creado`);
      setCreateOpen(false);
      setNewCode({ ...newCode, code: '', description: '' });
      refreshCodes();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  const handleRefund = async () => {
    if (!refundOpen || !refundForm.amount) return;
    try {
      await createRefund({ user_id: refundOpen.user_id, amount: parseFloat(refundForm.amount), reason: refundForm.reason });
      toast.success('Devolución registrada');
      setRefundOpen(null);
      setRefundForm({ amount: 0, reason: '' });
      refreshFinance();
    } catch (e) { toast.error(e.response?.data?.detail || 'Error'); }
  };

  // Filtering
  const filterUsers = (users) => {
    if (!search) return users;
    const s = search.toLowerCase();
    return users.filter(u =>
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  };

  const TitleByLevel = {
    super: 'Super Admin · Vista Global',
    federation: 'Admin · Federación / Universidad',
    league: 'Admin · Liga',
    club: 'Admin · Club',
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1280px] mx-auto px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">Panel Administrativo</p>
              <h1 className="text-[15px] font-bold text-slate-900 leading-tight">{TitleByLevel[level] || 'Admin'}</h1>
            </div>
          </div>
          {isSuper && (
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-0 text-[10px] uppercase">
              <ShieldCheck className="w-3 h-3 mr-1" /> Super Admin
            </Badge>
          )}
        </div>
        {isSuper && (
          <div className="max-w-[1280px] mx-auto px-6 flex items-center gap-1 -mb-px">
            <TabBtn active={activeTab === 'hierarchy'} onClick={() => setActiveTab('hierarchy')} icon={Users} label="Jerarquía & Usuarios" />
            <TabBtn active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={UserCheck} label="Gestión de Usuarios" />
            <TabBtn active={activeTab === 'codes'} onClick={() => setActiveTab('codes')} icon={Tag} label="Códigos & Promociones" />
            <TabBtn active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={DollarSign} label="Finanzas" />
          </div>
        )}
      </div>

      <div className="max-w-[1280px] mx-auto px-6 pt-6 space-y-6">
        {/* HERO STATS */}
        {activeTab === 'hierarchy' && (
          <>
            <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${MD3.primary} 0%, #4A148C 100%)` }}>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '32px 32px',
              }} />
              <div className="relative">
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/60 font-bold mb-1.5">Resumen Global</p>
                <h2 className="text-3xl font-bold text-white">{stats.total_users} usuarios totales</h2>
                <p className="text-[13px] text-white/70 mt-1.5">{stats.total_orgs} organizaciones · {stats.total_plans} planes · {stats.total_athletes} atletas</p>

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <PlanCount label="Starter" value={stats.by_plan.starter} />
                  <PlanCount label="Pro" value={stats.by_plan.basic} />
                  <PlanCount label="Club" value={stats.by_plan.pro} />
                  <PlanCount label="Institucional" value={stats.by_plan.enterprise} highlight />
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="pl-9 h-11 bg-white border-slate-200"
                data-testid="search-input"
              />
            </div>

            {/* Hierarchy Groups */}
            <HierarchyGroup
              title="Federaciones / Universidades"
              entityKey="federation"
              orgs={groups.federations}
              onOpen={openOrg}
              onSetType={handleSetEntityType}
              isSuper={isSuper}
            />
            <HierarchyGroup
              title="Ligas"
              entityKey="league"
              orgs={groups.leagues}
              onOpen={openOrg}
              onSetType={handleSetEntityType}
              isSuper={isSuper}
            />
            <HierarchyGroup
              title="Clubes / Academias / Escuelas"
              entityKey="club"
              orgs={groups.clubs}
              onOpen={openOrg}
              onSetType={handleSetEntityType}
              isSuper={isSuper}
            />

            {/* Independent coaches */}
            {isSuper && groups.independent_coaches.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#F3F4F6' }}>
                    <UserCheck className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[14px] font-bold text-slate-900">Entrenadores Independientes</h3>
                    <p className="text-[11px] text-slate-500">{groups.independent_coaches.length} entrenadores sin organización asociada</p>
                  </div>
                </div>
                <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                  {filterUsers(groups.independent_coaches).map(u => (
                    <div key={u.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50" data-testid={`coach-row-${u.id}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white bg-slate-500">
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{u.name || 'Sin nombre'}</p>
                          <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PLAN_BADGE[u.subscription] || PLAN_BADGE.free}`}>
                          {u.subscription}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[11px]"
                          onClick={() => setGrantOpen(u)}
                          data-testid={`grant-${u.id}`}
                        >
                          <Sparkles className="w-3 h-3 mr-1" /> Regalar plan
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* PROMO CODES TAB */}
        {activeTab === 'users' && isSuper && (
          <div className="rounded-3xl bg-white/60 p-1">
            <AdminUserManagement />
          </div>
        )}

        {activeTab === 'codes' && isSuper && (
          <>
            <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #00BFA5 0%, #00695C 100%)' }}>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.4) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
              }} />
              <div className="relative flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[11px] tracking-[0.2em] uppercase text-white/60 font-bold mb-1.5">Códigos & Promociones</p>
                  <h2 className="text-3xl font-bold text-white">{codes.length} códigos creados</h2>
                  <p className="text-[13px] text-white/70 mt-1.5">{codes.filter(c => c.active).length} activos · {codes.reduce((acc, c) => acc + (c.current_uses || 0), 0)} usos totales</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="rounded-full px-5 h-11 bg-white text-emerald-700 hover:bg-white/95 font-bold" data-testid="new-code-btn">
                  <Plus className="w-4 h-4 mr-1.5" /> Nuevo código
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {codes.length === 0 && (
                <div className="col-span-full bg-white rounded-2xl border border-slate-200 py-12 text-center">
                  <Tag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Aún no hay códigos creados</p>
                </div>
              )}
              {codes.map(c => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                const exhausted = c.current_uses >= c.max_uses;
                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 relative overflow-hidden" data-testid={`code-${c.code}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {c.code_type === 'discount' && <Tag className="w-3.5 h-3.5 text-blue-600" />}
                          {c.code_type === 'gift' && <Gift className="w-3.5 h-3.5 text-purple-600" />}
                          {c.code_type === 'referral' && <Link2 className="w-3.5 h-3.5 text-amber-600" />}
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500">{c.code_type}</span>
                        </div>
                        <p className="text-[18px] font-mono font-black tracking-wider text-slate-900 mt-1.5">{c.code}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {c.code_type === 'discount' && `${c.discount_percent}% off`}
                          {c.code_type === 'gift' && `${c.gift_plan} · ${c.gift_days} días`}
                          {c.description && ` · ${c.description}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { navigator.clipboard?.writeText(c.code); toast.success('Copiado'); }}>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={async () => { await togglePromoCode(c.id, !c.active); refreshCodes(); }} title={c.active ? 'Desactivar' : 'Activar'}>
                          <Power className={`w-3.5 h-3.5 ${c.active ? 'text-emerald-600' : 'text-slate-400'}`} />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={async () => { if (!window.confirm('¿Eliminar?')) return; await deletePromoCode(c.id); refreshCodes(); }}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                      <Stat label="Usos" value={`${c.current_uses}/${c.max_uses}`} />
                      <Stat label="Estado" value={!c.active ? 'Off' : exhausted ? 'Agotado' : expired ? 'Expirado' : 'Activo'} color={!c.active || exhausted || expired ? '#EF4444' : '#10B981'} />
                      <Stat label="Expira" value={c.expires_at ? new Date(c.expires_at).toLocaleDateString('es', { day: '2-digit', month: 'short' }) : '—'} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {/* FINANCE TAB */}
        {activeTab === 'finance' && isSuper && (
          <FinanceDashboard finance={finance} alerts={alerts} onRefund={(sale) => { setRefundOpen(sale); setRefundForm({ amount: sale.monthly_fee, reason: '' }); }} />
        )}
      </div>

      {/* ─── Org members modal ─── */}
      <Dialog open={!!selectedOrg} onOpenChange={(o) => !o && setSelectedOrg(null)}>
        <DialogContent className="max-w-2xl bg-white" data-testid="org-detail-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedOrg && (() => {
                const cfg = ENTITY[selectedOrg.entity_type] || ENTITY.club;
                const Ico = cfg.icon;
                return (<>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.tint }}>
                    <Ico className="w-4 h-4" style={{ color: cfg.color }} />
                  </div>
                  {selectedOrg.name}
                </>);
              })()}
            </DialogTitle>
            <DialogDescription>
              {selectedOrg && <>Plan: <strong className="capitalize">{selectedOrg.plan}</strong> · {selectedOrg.member_count} miembros · Owner: {selectedOrg.owner_name || selectedOrg.owner_email}</>}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 -mx-6">
            {loadingMembers ? (
              <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400 mx-auto" /></div>
            ) : members.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">Sin miembros</p>
            ) : members.map(m => (
              <div key={m.id} className="px-6 py-3 flex items-center justify-between" data-testid={`member-row-${m.id}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: m.org_role === 'admin' ? '#10B981' : '#64748B' }}>
                    {m.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-slate-800 truncate">{m.name}</p>
                    <p className="text-[11px] text-slate-500">{m.email} · {m.org_role_label || m.org_role}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PLAN_BADGE[m.subscription] || PLAN_BADGE.free}`}>{m.subscription}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Grant plan modal ─── */}
      <Dialog open={!!grantOpen} onOpenChange={(o) => !o && setGrantOpen(null)}>
        <DialogContent className="max-w-md bg-white" data-testid="grant-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Regalar plan</DialogTitle>
            <DialogDescription>Otorgas un plan premium temporal a <strong>{grantOpen?.name}</strong> ({grantOpen?.email}).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan</Label>
              <select value={grantForm.plan} onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value })} className="w-full mt-1.5 h-10 px-3 rounded-md border border-slate-200 text-sm bg-white">
                <option value="starter">Starter — $9.99/mes</option>
                <option value="basic">Pro — $19.99/mes</option>
                <option value="pro">Club / Academia — $49.99/mes</option>
                <option value="enterprise">Institucional — $149.99/mes</option>
              </select>
            </div>
            <div>
              <Label>Duración (días)</Label>
              <Input type="number" value={grantForm.duration_days} onChange={(e) => setGrantForm({ ...grantForm, duration_days: parseInt(e.target.value || '0') || 30 })} className="mt-1.5" />
            </div>
            <div>
              <Label>Razón (opcional)</Label>
              <Input value={grantForm.reason} onChange={(e) => setGrantForm({ ...grantForm, reason: e.target.value })} placeholder="Ej. Influencer · Demo · Beta tester" className="mt-1.5" />
            </div>
            <Button onClick={handleGrant} className="w-full bg-purple-600 hover:bg-purple-700 text-white" data-testid="grant-confirm">Otorgar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create code modal ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md bg-white" data-testid="create-code-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Tag className="w-5 h-5 text-emerald-600" /> Nuevo código</DialogTitle>
            <DialogDescription>Crea un código de descuento, regalo o referido.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                {[
                  { id: 'discount', label: 'Descuento', icon: Tag, c: '#3B82F6' },
                  { id: 'gift', label: 'Regalo', icon: Gift, c: '#9333EA' },
                  { id: 'referral', label: 'Referido', icon: Link2, c: '#F59E0B' },
                ].map(t => (
                  <button key={t.id} onClick={() => setNewCode({ ...newCode, code_type: t.id })} className={`px-3 py-2.5 rounded-lg border text-[12px] font-semibold flex flex-col items-center gap-1 transition-all ${newCode.code_type === t.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400'}`}>
                    <t.icon className="w-4 h-4" style={{ color: t.c }} />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Código (opcional)</Label>
              <Input value={newCode.code} onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="Auto-generado si vacío" className="mt-1.5 font-mono" />
            </div>
            {newCode.code_type === 'discount' && (
              <div>
                <Label>% Descuento</Label>
                <Input type="number" min="5" max="100" value={newCode.discount_percent} onChange={(e) => setNewCode({ ...newCode, discount_percent: parseInt(e.target.value || '0') || 20 })} className="mt-1.5" />
              </div>
            )}
            {newCode.code_type === 'gift' && (
              <>
                <div>
                  <Label>Plan a regalar</Label>
                  <select value={newCode.gift_plan} onChange={(e) => setNewCode({ ...newCode, gift_plan: e.target.value })} className="w-full mt-1.5 h-10 px-3 rounded-md border border-slate-200 text-sm bg-white">
                    <option value="starter">Starter — $9.99</option>
                    <option value="basic">Pro — $19.99</option>
                    <option value="pro">Club — $49.99</option>
                    <option value="enterprise">Institucional — $149.99</option>
                  </select>
                </div>
                <div>
                  <Label>Días gratis</Label>
                  <Input type="number" value={newCode.gift_days} onChange={(e) => setNewCode({ ...newCode, gift_days: parseInt(e.target.value || '0') || 30 })} className="mt-1.5" />
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Máx. usos</Label>
                <Input type="number" value={newCode.max_uses} onChange={(e) => setNewCode({ ...newCode, max_uses: parseInt(e.target.value || '0') || 100 })} className="mt-1.5" />
              </div>
              <div>
                <Label>Expira en (días)</Label>
                <Input type="number" value={newCode.expires_in_days} onChange={(e) => setNewCode({ ...newCode, expires_in_days: parseInt(e.target.value || '0') || 30 })} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label>Descripción</Label>
              <Input value={newCode.description} onChange={(e) => setNewCode({ ...newCode, description: e.target.value })} placeholder="Black Friday 2026" className="mt-1.5" />
            </div>
            <Button onClick={handleCreateCode} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="create-code-confirm">Crear código</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Refund modal ─── */}
      <Dialog open={!!refundOpen} onOpenChange={(o) => !o && setRefundOpen(null)}>
        <DialogContent className="max-w-md bg-white" data-testid="refund-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5 text-amber-600" /> Registrar devolución</DialogTitle>
            <DialogDescription>Registras una devolución manual a <strong>{refundOpen?.name}</strong> ({refundOpen?.email}). Cuando integremos Stripe, esto será automático vía webhook.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto a devolver (USD)</Label>
              <Input type="number" step="0.01" value={refundForm.amount} onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })} className="mt-1.5" />
              <p className="text-[11px] text-slate-500 mt-1">Sugerido: ${refundOpen?.monthly_fee} (cuota mensual del plan)</p>
            </div>
            <div>
              <Label>Razón</Label>
              <Input value={refundForm.reason} onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })} placeholder="Cancelación · Insatisfacción · Cobro duplicado" className="mt-1.5" />
            </div>
            <Button onClick={handleRefund} className="w-full bg-amber-600 hover:bg-amber-700 text-white" data-testid="refund-confirm">Registrar devolución</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────
const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button onClick={onClick} className={`px-4 py-2.5 text-[12px] font-semibold flex items-center gap-1.5 border-b-2 transition-all ${active ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`} data-testid={`tab-${label.toLowerCase().split(' ')[0]}`}>
    <Icon className="w-3.5 h-3.5" /> {label}
  </button>
);

const PlanCount = ({ label, value, highlight }) => (
  <div className={`rounded-xl px-3 py-2 ${highlight ? 'bg-white text-slate-900' : 'bg-white/10 text-white'}`}>
    <p className={`text-[10px] uppercase tracking-wider font-bold ${highlight ? 'text-amber-600' : 'text-white/60'}`}>{label}</p>
    <p className={`text-xl font-black mt-0.5 ${highlight ? 'text-slate-900' : ''}`}>{value}</p>
  </div>
);

const Stat = ({ label, value, color }) => (
  <div className="rounded-md bg-slate-50 px-2 py-1.5 text-center">
    <p className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{label}</p>
    <p className="text-[11px] font-bold mt-0.5" style={{ color: color || '#0f172a' }}>{value}</p>
  </div>
);

const HierarchyGroup = ({ title, entityKey, orgs, onOpen, onSetType, isSuper }) => {
  const cfg = ENTITY[entityKey] || ENTITY.club;
  const Icon = cfg.icon;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: cfg.tint }}>
          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1">
          <h3 className="text-[14px] font-bold text-slate-900">{title} <span className="text-slate-400 font-normal">({orgs.length})</span></h3>
          <p className="text-[11px] text-slate-500">{cfg.desc}</p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {orgs.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[12px] text-slate-400">Aún no hay {title.toLowerCase()}</p>
          </div>
        ) : orgs.map(o => (
          <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 cursor-pointer group" onClick={() => onOpen(o)} data-testid={`org-${o.id}`}>
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[12px] font-bold" style={{ background: cfg.tint, color: cfg.color }}>
                {o.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{o.name}</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${PLAN_BADGE[o.plan] || PLAN_BADGE.free}`}>{o.plan}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{o.member_count}/{o.max_coaches === 999 ? '∞' : o.max_coaches} miembros · {o.plan_count} planes · Owner: {o.owner_name || o.owner_email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSuper && (
                <select
                  value={o.entity_type}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onSetType(o.id, e.target.value)}
                  className="text-[10px] h-7 px-2 rounded-md border border-slate-200 bg-white"
                  data-testid={`entity-type-${o.id}`}
                >
                  <option value="club">Club</option>
                  <option value="school">Escuela</option>
                  <option value="league">Liga</option>
                  <option value="federation">Federación</option>
                  <option value="university">Universidad</option>
                </select>
              )}
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Finance Dashboard component ─────────────────────
const PLAN_DISPLAY = {
  starter: { label: 'Starter', color: '#64748B' },
  basic:   { label: 'Pro', color: '#3B82F6' },
  pro:     { label: 'Club', color: '#10B981' },
  enterprise: { label: 'Institucional', color: '#F59E0B' },
};

const FinanceDashboard = ({ finance, alerts, onRefund }) => {
  if (!finance) {
    return <div className="py-16 text-center text-sm text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  }
  const planChartData = Object.entries(finance.plan_breakdown).map(([k, v]) => ({
    name: PLAN_DISPLAY[k]?.label || k,
    color: PLAN_DISPLAY[k]?.color || '#94A3B8',
    revenue: v.monthly_revenue,
    count: v.count,
  }));

  const ALERT_STYLE = {
    danger:  { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-600', dot: 'bg-red-500' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600', dot: 'bg-amber-500' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600', dot: 'bg-emerald-500' },
    info:    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600', dot: 'bg-blue-500' },
  };
  const ALERT_ICON = {
    trending_down: TrendingDown,
    trending_up: TrendingUp,
    user_minus: UserMinus,
    award: Award,
    tag: Tag,
    rotate_ccw: RotateCcw,
    info: Info,
  };

  return (
    <div className="space-y-6">
      {/* Smart Alerts */}
      {(alerts && alerts.length > 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Bell className="w-4 h-4 text-purple-700" />
            </div>
            <div className="flex-1">
              <h3 className="text-[14px] font-bold text-slate-900">Alertas inteligentes <span className="text-slate-400 font-normal">({alerts.length})</span></h3>
              <p className="text-[11px] text-slate-500">Detecciones automáticas sobre tu MRR, churn y oportunidades</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.map((a, idx) => {
              const st = ALERT_STYLE[a.level] || ALERT_STYLE.info;
              const Ico = ALERT_ICON[a.icon] || Info;
              return (
                <div key={idx} className={`px-5 py-3.5 flex items-start gap-3 ${st.bg}`} data-testid={`alert-${idx}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.bg} ${st.border} border`}>
                    <Ico className={`w-4 h-4 ${st.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-[13px] font-bold ${st.text}`}>{a.title}</p>
                      {a.value && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${st.dot} text-white`}>{a.value}</span>}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #022C22 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(204,255,0,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#CCFF00]/80 font-bold mb-1.5">Resumen Financiero</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">MRR</p>
              <p className="text-3xl font-black text-white">${finance.mrr.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
              <p className="text-[11px] text-white/50">por mes recurrente</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">ARR</p>
              <p className="text-3xl font-black text-[#CCFF00]">${finance.arr.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
              <p className="text-[11px] text-white/50">proyección anual</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">Clientes</p>
              <p className="text-3xl font-black text-white">{finance.total_paying_users}<span className="text-base text-white/50">/{finance.total_users}</span></p>
              <p className="text-[11px] text-white/50">{finance.total_users ? ((finance.total_paying_users/finance.total_users)*100).toFixed(1) : 0}% conversión</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-white/50">Devoluciones</p>
              <p className="text-3xl font-black text-amber-400">${finance.total_refunded.toLocaleString('en-US', {minimumFractionDigits:2})}</p>
              <p className="text-[11px] text-white/50">{finance.refunds.length} registradas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-bold text-slate-900">Ingresos mensuales</h3>
              <p className="text-[11px] text-slate-500">Últimos 12 meses</p>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={finance.monthly_history}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v, name) => name === 'revenue' ? [`$${v}`, 'Ingresos'] : [v, 'Suscripciones']} />
              <Bar dataKey="revenue" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[13px] font-bold text-slate-900">Ingreso por plan</h3>
              <p className="text-[11px] text-slate-500">Distribución del MRR</p>
            </div>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={planChartData} layout="vertical">
              <CartesianGrid stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `$${v}`} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#0f172a', fontWeight: 600 }} width={100} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`$${v}`, 'Ingresos']} />
              <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
                {planChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[13px] font-bold text-slate-900">Embudo de conversión</h3>
            <p className="text-[11px] text-slate-500">Starter → Pro → Club → Institucional</p>
          </div>
          <Award className="w-4 h-4 text-purple-600" />
        </div>
        <div className="space-y-2">
          {finance.funnel.map((f, idx) => {
            const widthPct = f.rate;
            return (
              <div key={f.stage} className="flex items-center gap-3">
                <span className="w-28 text-[12px] font-semibold text-slate-700 truncate">{f.stage}</span>
                <div className="flex-1 h-9 bg-slate-100 rounded-lg overflow-hidden relative">
                  <div className="h-full rounded-lg flex items-center px-3 transition-all duration-700" style={{ width: `${Math.max(widthPct, 4)}%`, background: `linear-gradient(90deg, ${['#94A3B8','#64748B','#3B82F6','#10B981','#F59E0B'][idx]} 0%, ${['#64748B','#475569','#1E40AF','#047857','#92400E'][idx]} 100%)` }}>
                    <span className="text-white text-[11px] font-bold tracking-wider">{f.count} ({f.rate}%)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex-1">
            <h3 className="text-[14px] font-bold text-slate-900">Ventas activas <span className="text-slate-400 font-normal">({finance.sales.length})</span></h3>
            <p className="text-[11px] text-slate-500">Cada usuario pagando, su plan y su cuota</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
          {finance.sales.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-slate-500">Aún no hay ventas (todos los usuarios en Free)</p>
          ) : finance.sales.map(s => {
            const cfg = PLAN_DISPLAY[s.plan] || { label: s.plan, color: '#94A3B8' };
            return (
              <div key={s.user_id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/50" data-testid={`sale-${s.user_id}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: cfg.color }}>
                    {s.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold text-slate-900 truncate">{s.name || 'Sin nombre'}</p>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white" style={{ background: cfg.color }}>{cfg.label}</span>
                      {s.granted && <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">Regalado</span>}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{s.email} · desde {s.subscribed_since ? new Date(s.subscribed_since).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[14px] font-black text-slate-900">${s.monthly_fee}<span className="text-[10px] text-slate-400 font-normal">/mes</span></p>
                  <p className="text-[10px] text-slate-500">${s.annual_value}/año</p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-amber-600" onClick={() => onRefund(s)} title="Registrar devolución" data-testid={`refund-btn-${s.user_id}`}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {finance.refunds.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-slate-900">Devoluciones registradas <span className="text-slate-400 font-normal">({finance.refunds.length})</span></h3>
              <p className="text-[11px] text-slate-500">Total: ${finance.total_refunded.toFixed(2)}</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
            {finance.refunds.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">{r.user_name || r.user_email}</p>
                  <p className="text-[11px] text-slate-500">{r.reason || 'Sin razón'} · {new Date(r.created_at).toLocaleDateString('es')}</p>
                </div>
                <p className="text-[14px] font-black text-amber-700">−${r.amount}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminPage;
