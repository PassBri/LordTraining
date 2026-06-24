import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Search, UserCog, KeyRound, Power, Trash2, ShieldCheck, Pencil, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from '../context/AuthContext';
import { adminListUsers, adminCreateUser, adminUpdateUser, adminResetPassword, adminSetUserStatus, adminDeleteUser } from '../services/api';

const ROLES = [['coach', 'Entrenador'], ['athlete', 'Atleta'], ['admin', 'Administrador']];
const PLANS = [['free', 'Free'], ['starter', 'Starter'], ['basic', 'Basic'], ['pro', 'Pro'], ['enterprise', 'Enterprise']];
const PLAN_BADGE = { free: 'bg-slate-100 text-slate-600', starter: 'bg-slate-200 text-slate-700', basic: 'bg-blue-100 text-blue-700', pro: 'bg-emerald-100 text-emerald-700', enterprise: 'bg-amber-100 text-amber-800' };
const labelOf = (arr, k) => (arr.find(x => x[0] === k) || [k, k])[1];
const emptyUser = () => ({ name: '', email: '', password: '', role: 'coach', subscription: 'starter', is_super_admin: false });

const err = (e, f = 'Error') => toast.error(e?.response?.data?.detail || f);

export default function AdminUserManagement() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [plan, setPlan] = useState('all');
  const [editing, setEditing] = useState(null);     // user object or emptyUser()
  const [pwTarget, setPwTarget] = useState(null);    // user to reset pw

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (role !== 'all') params.role = role;
      if (plan !== 'all') params.plan = plan;
      const res = await adminListUsers(params);
      setUsers(res.data.users || []);
    } catch (e) { err(e, 'Error cargando usuarios'); }
    finally { setLoading(false); }
  }, [search, role, plan]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const toggleStatus = async (u) => {
    try { await adminSetUserStatus(u.id, !(u.active !== false)); toast.success(u.active !== false ? 'Cuenta desactivada' : 'Cuenta activada'); load(); }
    catch (e) { err(e); }
  };
  const remove = async (u) => {
    if (!window.confirm(`¿Eliminar definitivamente a ${u.email}? Esta acción no se puede deshacer.`)) return;
    try { await adminDeleteUser(u.id); toast.success('Usuario eliminado'); load(); }
    catch (e) { err(e); }
  };

  return (
    <div data-testid="admin-users-section" className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email…" className="pl-9 bg-white" data-testid="users-search" />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-40 bg-white" data-testid="users-filter-role"><SelectValue placeholder="Rol" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los roles</SelectItem>{ROLES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="w-40 bg-white" data-testid="users-filter-plan"><SelectValue placeholder="Plan" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos los planes</SelectItem>{PLANS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={() => setEditing(emptyUser())} className="bg-[#6750A4] hover:bg-[#56438c] text-white rounded-full" data-testid="users-new-btn"><Plus className="w-4 h-4 mr-1" />Nuevo Usuario</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 text-[11px] font-black uppercase text-slate-400">
          <UserCog className="w-4 h-4" />Usuarios ({users.length})
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-slate-300" /></div>
        ) : !users.length ? (
          <div className="py-16 text-center text-slate-400 text-sm">No se encontraron usuarios.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map(u => {
              const isSelf = me && u.id === me.id;
              const active = u.active !== false;
              return (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50" data-testid={`user-row-${u.id}`}>
                  <div className="w-9 h-9 rounded-full bg-[#EADDFF] text-[#21005D] flex items-center justify-center font-black shrink-0">{(u.name || u.email || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800 truncate">{u.name || '—'}</span>
                      {u.is_super_admin && <Badge className="bg-purple-100 text-purple-700 border-0 text-[9px] uppercase"><ShieldCheck className="w-2.5 h-2.5 mr-0.5" />Super</Badge>}
                      {isSelf && <span className="text-[9px] text-slate-400 font-bold uppercase">(tú)</span>}
                      {!active && <Badge className="bg-red-100 text-red-600 border-0 text-[9px] uppercase">Inactivo</Badge>}
                    </div>
                    <div className="text-[12px] text-slate-500 truncate">{u.email}</div>
                  </div>
                  <Badge className="border-0 text-[10px] uppercase bg-slate-100 text-slate-600">{labelOf(ROLES, u.role)}</Badge>
                  <Badge className={`border-0 text-[10px] uppercase ${PLAN_BADGE[u.subscription] || 'bg-slate-100 text-slate-600'}`}>{labelOf(PLANS, u.subscription)}</Badge>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditing(u)} title="Editar" className="p-1.5 text-slate-400 hover:text-[#6750A4] hover:bg-slate-100 rounded-lg" data-testid={`user-edit-${u.id}`}><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setPwTarget(u)} title="Restablecer contraseña" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg" data-testid={`user-pw-${u.id}`}><KeyRound className="w-4 h-4" /></button>
                    {!isSelf && <button onClick={() => toggleStatus(u)} title={active ? 'Desactivar' : 'Activar'} className={`p-1.5 hover:bg-slate-100 rounded-lg ${active ? 'text-slate-400 hover:text-amber-600' : 'text-emerald-500'}`} data-testid={`user-status-${u.id}`}><Power className="w-4 h-4" /></button>}
                    {!isSelf && <button onClick={() => remove(u)} title="Eliminar" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg" data-testid={`user-delete-${u.id}`}><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && <UserFormDialog initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {pwTarget && <PasswordDialog user={pwTarget} onClose={() => setPwTarget(null)} />}
    </div>
  );
}

function UserFormDialog({ initial, onClose, onSaved }) {
  const isEdit = !!initial.id;
  const [f, setF] = useState({ ...emptyUser(), ...initial, password: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  const save = async () => {
    if (!isEdit && (!f.email.trim() || !f.password)) { toast.error('Email y contraseña son obligatorios'); return; }
    if (!isEdit && f.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await adminUpdateUser(initial.id, { name: f.name, role: f.role, subscription: f.subscription, is_super_admin: f.is_super_admin });
        toast.success('Usuario actualizado');
      } else {
        await adminCreateUser({ name: f.name, email: f.email, password: f.password, role: f.role, subscription: f.subscription, is_super_admin: f.is_super_admin });
        toast.success('Usuario creado');
      }
      onSaved();
    } catch (e) { err(e, 'Error guardando'); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white" data-testid="user-form-dialog">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Modifica el rol, plan y privilegios.' : 'Crea una cuenta con su contraseña inicial.'}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div><Label className="text-xs">Nombre</Label><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-white mt-1" data-testid="user-form-name" /></div>
          {!isEdit && <div><Label className="text-xs">Email *</Label><Input type="email" value={f.email} onChange={e => set('email', e.target.value)} className="bg-white mt-1" data-testid="user-form-email" /></div>}
          {!isEdit && <div><Label className="text-xs">Contraseña *</Label><Input type="text" value={f.password} onChange={e => set('password', e.target.value)} className="bg-white mt-1" placeholder="Mínimo 6 caracteres" data-testid="user-form-password" /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Rol</Label>
              <Select value={f.role} onValueChange={v => set('role', v)}>
                <SelectTrigger className="bg-white mt-1" data-testid="user-form-role"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Plan</Label>
              <Select value={f.subscription} onValueChange={v => set('subscription', v)}>
                <SelectTrigger className="bg-white mt-1" data-testid="user-form-plan"><SelectValue /></SelectTrigger>
                <SelectContent>{PLANS.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50">
            <input type="checkbox" checked={f.is_super_admin} onChange={e => set('is_super_admin', e.target.checked)} className="w-4 h-4 accent-[#6750A4]" data-testid="user-form-superadmin" />
            <span className="text-sm text-slate-700 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-purple-500" />Otorgar privilegios de Super Admin</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-[#6750A4] hover:bg-[#56438c] text-white" data-testid="user-form-save">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ user, onClose }) {
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (pw.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return; }
    setSaving(true);
    try { await adminResetPassword(user.id, pw); toast.success('Contraseña restablecida. Compártela con el usuario.'); onClose(); }
    catch (e) { err(e); }
    setSaving(false);
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-white" data-testid="password-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-blue-500" />Restablecer contraseña</DialogTitle>
          <DialogDescription>Define una nueva contraseña para <b>{user.email}</b>. Compártesela de forma segura.</DialogDescription>
        </DialogHeader>
        <div className="py-1">
          <Label className="text-xs">Nueva contraseña</Label>
          <Input type="text" value={pw} onChange={e => setPw(e.target.value)} className="bg-white mt-1" placeholder="Mínimo 6 caracteres" autoFocus data-testid="password-input" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="password-save">{saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Actualizar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
