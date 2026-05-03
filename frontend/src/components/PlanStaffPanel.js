import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { UserPlus, X, Users, Search } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const ROLES = [
  'Director Técnico', 'Entrenador Principal', 'Asistente Técnico',
  'Preparador Físico', 'Preparador de Porteros', 'Analista de Vídeo',
  'Fisioterapeuta', 'Médico Deportivo', 'Nutricionista',
  'Psicólogo Deportivo', 'Coach Mental', 'Scout / Ojeador', 'Otro',
];

const PlanStaffPanel = ({ planId }) => {
  const [staff, setStaff] = useState([]);
  const [allCoaches, setAllCoaches] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState('');
  const [selectedRole, setSelectedRole] = useState('Asistente Técnico');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const fetchStaff = async () => {
    if (!planId) return;
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/coaches/by-plan/${planId}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setStaff(await res.json());
    } catch { /* silent */ }
  };

  const fetchAllCoaches = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/coaches`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAllCoaches(await res.json());
    } catch { /* silent */ }
  };

  useEffect(() => { fetchStaff(); }, [planId]); // eslint-disable-line

  const openAssignDialog = async () => {
    if (allCoaches.length === 0) await fetchAllCoaches();
    setShowDialog(true);
    setSelectedCoach('');
    setSelectedRole('Asistente Técnico');
    setNotes('');
    setSearch('');
  };

  const assign = async () => {
    if (!selectedCoach) { toast.error('Selecciona un entrenador'); return; }
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/coaches/by-plan/${planId}/staff`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: selectedCoach, role: selectedRole, notes }),
      });
      if (!res.ok) { toast.error('Error asignando entrenador'); return; }
      toast.success('Entrenador asignado al plan');
      setShowDialog(false);
      fetchStaff();
    } catch { toast.error('Error de red'); }
  };

  const remove = async (coachId) => {
    if (!window.confirm('¿Quitar este entrenador del cuerpo técnico?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/coaches/by-plan/${planId}/staff/${coachId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { toast.success('Entrenador removido'); fetchStaff(); }
    } catch { toast.error('Error de red'); }
  };

  const assignedIds = new Set(staff.map(s => s.coach_id));
  const filtered = allCoaches.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.specialty?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card className="border-0 shadow-md overflow-hidden border-l-4 border-l-sky-500" data-testid="plan-staff-panel">
      <CardHeader className="bg-white border-b border-slate-100 py-3 px-4">
        <CardTitle className="flex items-center justify-between gap-2 text-sm font-bold text-slate-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" />
            Cuerpo Técnico Asignado
            <span className="text-[10px] font-medium text-slate-500 italic">{staff.length} miembro{staff.length === 1 ? '' : 's'}</span>
          </div>
          <Button size="sm" variant="outline" className="h-8 text-[11px] border-sky-300 text-sky-700 hover:bg-sky-50" onClick={openAssignDialog} data-testid="staff-assign-btn">
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Asignar entrenador
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3.5">
        {staff.length === 0 ? (
          <div className="text-center py-6 text-slate-400 italic text-[12px]">
            Aún no hay entrenadores asignados. Asigna staff técnico para que aparezca en el PDF del plan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5" data-testid="staff-list">
            {staff.map(s => {
              const initial = (s.name || 'C')[0].toUpperCase();
              return (
                <div key={s.coach_id} className="bg-gradient-to-br from-white to-slate-50/40 border border-slate-200 rounded-xl p-2.5 hover:shadow-md transition-all">
                  <div className="flex items-center gap-2.5">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-sm shadow" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0f172a)' }}>{initial}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] font-black uppercase tracking-wider text-sky-600">{s.role}</div>
                      <div className="font-bold text-[12px] text-slate-900 truncate leading-tight">{s.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.specialty || '—'}</div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 flex-shrink-0" onClick={() => remove(s.coach_id)} title="Remover del staff" data-testid={`staff-remove-${s.coach_id}`}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-2xl" data-testid="staff-assign-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5 text-sky-500" /> Asignar Entrenador al Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar entrenador por nombre o especialidad..." className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <p className="text-center text-slate-400 italic text-sm py-6">No hay entrenadores. Crea uno en la sección Información → Entrenadores.</p>
              ) : filtered.map(c => {
                const isAssigned = assignedIds.has(c.id);
                const isSelected = selectedCoach === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isAssigned}
                    onClick={() => setSelectedCoach(c.id)}
                    data-testid={`staff-pick-${c.id}`}
                    className={`w-full text-left px-3 py-2 flex items-center gap-3 transition-colors ${isAssigned ? 'opacity-40 cursor-not-allowed' : isSelected ? 'bg-sky-50 ring-2 ring-sky-300 ring-inset' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shadow" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0f172a)' }}>{(c.name || 'C')[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[13px] text-slate-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{c.specialty || '—'} · {c.years_experience || 0} años exp.</div>
                    </div>
                    {isAssigned && <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Asignado</span>}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">Rol en el plan</label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">Notas (opcional)</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Dispone los lunes y miércoles" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={assign} disabled={!selectedCoach} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="staff-assign-confirm">
              <UserPlus className="w-4 h-4 mr-1.5" /> Asignar al plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PlanStaffPanel;
