import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ShieldCheck, Building2, Trophy, GraduationCap, Landmark,
  Users, UserCheck, BadgeCheck, Loader2, Search, Sparkles,
  Tag, Gift, Link2, Plus, Power, Trash2, Copy, Filter,
  TrendingUp, Award, Briefcase, ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import {
  getAdminHierarchy, getOrgMembers, grantPlan,
  createPromoCode, listPromoCodes, togglePromoCode, deletePromoCode,
  setOrgEntityType,
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

  useEffect(() => { refresh(); refreshCodes(); }, []);

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
            <TabBtn active={activeTab === 'codes'} onClick={() => setActiveTab('codes')} icon={Tag} label="Códigos & Promociones" />
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

                <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <PlanCount label="Free" value={stats.by_plan.free} />
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
      </div>

      {/* ─── Org members modal ─── */}
      <Dialog open={!!selectedOrg} onOpenChange={(o) => !o && setSelectedOrg(null)}>
        <DialogContent className="max-w-2xl" data-testid="org-detail-modal">
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
        <DialogContent className="max-w-md" data-testid="grant-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" /> Regalar plan</DialogTitle>
            <DialogDescription>Otorgas un plan premium temporal a <strong>{grantOpen?.name}</strong> ({grantOpen?.email}).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Plan</Label>
              <select value={grantForm.plan} onChange={(e) => setGrantForm({ ...grantForm, plan: e.target.value })} className="w-full mt-1.5 h-10 px-3 rounded-md border border-slate-200 text-sm bg-white">
                <option value="starter">Starter</option>
                <option value="basic">Pro</option>
                <option value="pro">Club / Academia</option>
                <option value="enterprise">Institucional</option>
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
        <DialogContent className="max-w-md" data-testid="create-code-modal">
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
                    <option value="starter">Starter</option>
                    <option value="basic">Pro</option>
                    <option value="pro">Club</option>
                    <option value="enterprise">Institucional</option>
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

export default SuperAdminPage;
