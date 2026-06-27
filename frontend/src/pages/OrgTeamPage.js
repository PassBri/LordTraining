import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import i18nInstance from '../i18n';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Users, UserPlus, Shield, KeyRound, Pause, Play, Trash2, Copy,
  ArrowLeft, Building2, Sparkles, CheckCircle2, XCircle, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import {
  createOrganization, getMyOrganization, getOrgCoaches, inviteCoach,
  updateCoach, resetCoachPassword, removeCoach, getOrgStats,
} from '../services/api';
import usePlanGate from '../hooks/usePlanGate';

// i18n: auto-traducción slug-based (orgteam.lbl.*)
const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
  .replace(/₂/g,'2').replace(/²/g,'2').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const tt = (s) => {
  if (s == null || s === '' || typeof s === 'number') return s;
  const k = _slug(s);
  return k ? i18nInstance.t(`orgteam.lbl.${k}`, { defaultValue: s }) : s;
};

const ROLE_LABELS = {
  coach: 'Entrenador',
  physical_trainer: 'Preparador Físico',
  analyst: 'Analista',
  assistant: 'Asistente',
  admin: 'Administrador',
};

const OrgTeamPage = () => {
  const navigate = useNavigate();
  const { plan, allowed: canManage, loading: loadingPlan, requiredPlan } = usePlanGate('org_management');

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [coaches, setCoaches] = useState([]);
  const [stats, setStats] = useState(null);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [tempPasswordDialog, setTempPasswordDialog] = useState(null); // { coach, password }

  // Form fields
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('club');
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role_label: 'coach' });
  const [acting, setActing] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const meRes = await getMyOrganization();
      const o = meRes.data.organization;
      setOrg(o);
      setIsAdmin(meRes.data.is_admin);
      if (o && meRes.data.is_admin) {
        const [coachesRes, statsRes] = await Promise.all([getOrgCoaches(), getOrgStats()]);
        setCoaches(coachesRes.data.coaches || []);
        setStats(statsRes.data);
      }
    } catch (e) {
      toast.error(e.response?.data?.detail?.message || 'Error cargando organización');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loadingPlan) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingPlan]);

  // ─── Plan gate ───
  if (loadingPlan || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf8]">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-5">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Gestión de Organización</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Esta función te permite gestionar entrenadores, contraseñas y permisos para tu Club, Federación o Institución.
            Disponible a partir del plan <strong className="text-emerald-600">{requiredPlan === 'pro' ? 'Club / Academia' : 'Institucional'}</strong>.
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/dashboard')} data-testid="org-back-btn">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Volver
            </Button>
            <Button onClick={() => navigate('/subscription')} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="org-upgrade-btn">
              <Sparkles className="w-4 h-4 mr-1.5" /> Mejorar plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Actions ───
  const handleCreateOrg = async () => {
    if (!orgName.trim()) return toast.error('Ingresa un nombre');
    setActing(true);
    try {
      await createOrganization({ name: orgName.trim(), entity_type: orgType });
      toast.success('Organización creada');
      setCreateOpen(false);
      setOrgName('');
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail?.message || e.response?.data?.detail || 'Error creando organización');
    } finally { setActing(false); }
  };

  const handleInvite = async () => {
    if (!inviteForm.email || !inviteForm.name) return toast.error('Email y nombre son requeridos');
    setActing(true);
    try {
      const res = await inviteCoach(inviteForm);
      if (res.data.email_sent) {
        toast.success('Entrenador invitado. Email enviado con sus credenciales.');
      } else {
        toast.success('Entrenador invitado. Comparte la contraseña manualmente.');
      }
      setInviteOpen(false);
      setTempPasswordDialog({ coach: res.data.coach, password: res.data.temp_password, emailSent: res.data.email_sent });
      setInviteForm({ email: '', name: '', role_label: 'coach' });
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail?.message || e.response?.data?.detail || 'Error invitando');
    } finally { setActing(false); }
  };

  const handleToggleStatus = async (coach) => {
    const newStatus = coach.status === 'suspended' ? 'active' : 'suspended';
    setActing(true);
    try {
      await updateCoach(coach.id, { status: newStatus });
      toast.success(newStatus === 'active' ? 'Reactivado' : 'Suspendido');
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error');
    } finally { setActing(false); }
  };

  const handleResetPwd = async (coach) => {
    if (!window.confirm(`¿Generar nueva contraseña temporal para ${coach.name}?`)) return;
    setActing(true);
    try {
      const res = await resetCoachPassword(coach.id);
      setTempPasswordDialog({ coach, password: res.data.temp_password, emailSent: res.data.email_sent });
      if (res.data.email_sent) toast.success('Nueva contraseña enviada por email');
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error');
    } finally { setActing(false); }
  };

  const handleRemove = async (coach) => {
    if (!window.confirm(`¿Remover a ${coach.name} de la organización? Mantendrá su cuenta pero perderá acceso al plan.`)) return;
    setActing(true);
    try {
      await removeCoach(coach.id);
      toast.success('Entrenador removido');
      await refresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Error');
    } finally { setActing(false); }
  };

  // ─── Render: no org yet ───
  if (!org) {
    return (
      <div className="min-h-screen bg-[#fafaf8]">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="text-sm font-semibold text-slate-800">Mi Organización</span>
          </div>
        </div>
        <div className="max-w-md mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 mx-auto bg-emerald-50 rounded-2xl flex items-center justify-center mb-5">
            <Building2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Crea tu organización</h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Como administrador podrás invitar entrenadores, gestionar contraseñas y ver estadísticas del equipo.
          </p>
          <Button onClick={() => setCreateOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-org-btn">
            <Building2 className="w-4 h-4 mr-1.5" />
            Crear organización
          </Button>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md bg-white" data-testid="create-org-modal">
            <DialogHeader>
              <DialogTitle>Nueva Organización</DialogTitle>
              <DialogDescription>Configura el nombre y tipo de tu Club, Federación o Institución.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Nombre</Label>
                <Input id="org-name" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Ej. Club Atlético del Norte" data-testid="org-name-input" />
              </div>
              <div>
                <Label htmlFor="org-type">Tipo</Label>
                <select
                  id="org-type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value)}
                  className="w-full mt-1.5 h-10 px-3 rounded-md border border-slate-200 text-sm bg-white"
                  data-testid="org-type-select"
                >
                  <option value="club">Club deportivo</option>
                  <option value="federation">Federación</option>
                  <option value="school">Escuela / Academia</option>
                  <option value="university">Universidad</option>
                </select>
              </div>
              <Button onClick={handleCreateOrg} disabled={acting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="create-org-confirm">
                {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear organización'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── Render: org dashboard ───
  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1100px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-slate-800">{org.name}</span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{org.entity_type}</Badge>
            </div>
          </div>
          {isAdmin && (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] uppercase">
              <Shield className="w-3 h-3 mr-1" /> Admin
            </Badge>
          )}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8 space-y-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Users} label="Entrenadores" value={`${stats.total_coaches}/${org.max_coaches === 999 ? '∞' : org.max_coaches}`} color="#10B981" />
            <StatCard icon={CheckCircle2} label="Activos" value={stats.active_coaches} color="#3B82F6" />
            <StatCard icon={Sparkles} label="Planes creados" value={stats.total_plans} color="#8B5CF6" />
            <StatCard icon={Users} label="Atletas totales" value={stats.total_athletes} color="#F59E0B" />
          </div>
        )}

        {/* Coaches table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden" data-testid="coaches-table">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-[13px] font-semibold text-slate-800">Entrenadores ({coaches.length})</h2>
            </div>
            <Button onClick={() => setInviteOpen(true)} size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-[12px]" data-testid="invite-coach-btn">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invitar
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {coaches.map(c => {
              const isOwner = c.id === org.owner_id;
              const suspended = c.status === 'suspended';
              return (
                <div key={c.id} className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50" data-testid={`coach-row-${c.id}`}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white" style={{ background: isOwner ? '#10B981' : '#64748B' }}>
                      {c.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{c.name}</p>
                        {isOwner && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[9px] uppercase">Owner</Badge>}
                        {suspended && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-[9px] uppercase">Suspendido</Badge>}
                        {c.must_change_password && !isOwner && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[9px] uppercase">Pendiente</Badge>}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="truncate">{c.email}</span>
                        <span>·</span>
                        <span>{ROLE_LABELS[c.org_role_label] || ROLE_LABELS[c.org_role] || 'Entrenador'}</span>
                      </div>
                    </div>
                  </div>

                  {!isOwner && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600" title="Resetear contraseña" onClick={() => handleResetPwd(c)} disabled={acting} data-testid={`reset-pwd-${c.id}`}>
                        <KeyRound className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600" title={suspended ? 'Reactivar' : 'Suspender'} onClick={() => handleToggleStatus(c)} disabled={acting} data-testid={`toggle-${c.id}`}>
                        {suspended ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-red-600" title="Remover" onClick={() => handleRemove(c)} disabled={acting} data-testid={`remove-${c.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
            {coaches.length === 0 && (
              <div className="px-5 py-12 text-center">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Aún no has invitado entrenadores</p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center">Plan: <strong className="text-slate-600 capitalize">{plan}</strong> · Máx. entrenadores: {org.max_coaches === 999 ? 'Ilimitado' : org.max_coaches}</p>
      </div>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-md bg-white" data-testid="invite-modal">
          <DialogHeader>
            <DialogTitle>Invitar entrenador</DialogTitle>
            <DialogDescription>Se generará una contraseña temporal que deberás compartir de forma segura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="inv-email">Email</Label>
              <Input id="inv-email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="coach@club.com" data-testid="invite-email-input" />
            </div>
            <div>
              <Label htmlFor="inv-name">Nombre completo</Label>
              <Input id="inv-name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="María García" data-testid="invite-name-input" />
            </div>
            <div>
              <Label htmlFor="inv-role">Rol</Label>
              <select
                id="inv-role"
                value={inviteForm.role_label}
                onChange={(e) => setInviteForm({ ...inviteForm, role_label: e.target.value })}
                className="w-full mt-1.5 h-10 px-3 rounded-md border border-slate-200 text-sm bg-white"
                data-testid="invite-role-select"
              >
                <option value="coach">Entrenador</option>
                <option value="physical_trainer">Preparador Físico</option>
                <option value="analyst">Analista</option>
                <option value="assistant">Asistente</option>
              </select>
            </div>
            <Button onClick={handleInvite} disabled={acting} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="invite-confirm">
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-1.5" /> Invitar</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPasswordDialog} onOpenChange={(o) => !o && setTempPasswordDialog(null)}>
        <DialogContent className="max-w-md bg-white" data-testid="temp-password-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" /> Contraseña temporal
            </DialogTitle>
            <DialogDescription>
              {tempPasswordDialog?.emailSent ? (
                <>Email enviado a <strong>{tempPasswordDialog?.coach?.email}</strong> con sus credenciales.</>
              ) : (
                <>Comparte estos datos manualmente con <strong>{tempPasswordDialog?.coach?.name}</strong>. Se le pedirá cambiar la contraseña al iniciar sesión.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {tempPasswordDialog?.emailSent ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-[12px] text-emerald-700 font-medium">Email enviado correctamente</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                <XCircle className="w-4 h-4 text-amber-600" />
                <span className="text-[12px] text-amber-700 font-medium">Email automático no enviado — copia los datos manualmente</span>
              </div>
            )}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
              <p className="text-[11px] text-slate-500 uppercase tracking-wider mb-1">Email</p>
              <p className="text-sm font-mono text-slate-800">{tempPasswordDialog?.coach?.email}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-amber-700 uppercase tracking-wider mb-1">Contraseña</p>
                <p className="text-sm font-mono text-amber-900 font-bold">{tempPasswordDialog?.password}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText(tempPasswordDialog.password);
                  toast.success('Copiada al portapapeles');
                }}
                className="text-amber-700 hover:text-amber-800"
                data-testid="copy-pwd-btn"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => setTempPasswordDialog(null)} variant="outline" className="w-full" data-testid="close-pwd-dialog">
              Listo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold text-slate-900 leading-none mt-0.5">{value}</p>
    </div>
  </div>
);

export default OrgTeamPage;
