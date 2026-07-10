import React, { useState, useEffect, useCallback } from 'react';
import i18nInstance from '../i18n';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Users, Edit2, Trash2, Mail, Phone, MapPin, Building2, X, Link2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { api } from './scoutingApi';

// i18n: auto-traducción slug-based (scouting.lbl.*)
const _slug = (s) => (s == null ? '' : s.toString()).toLowerCase()
  .replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u').replace(/ñ/g,'n')
  .replace(/₂/g,'2').replace(/²/g,'2').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const tt = (s) => {
  if (s == null || s === '' || typeof s === 'number') return s;
  const k = _slug(s);
  return k ? i18nInstance.t(`scouting.lbl.${k}`, { defaultValue: s }) : s;
};

const ROLES = [
  ['agent', 'Agente', '#0ea5e9'], ['representative', 'Representante', '#8b5cf6'],
  ['parent', 'Padre / Tutor', '#10b981'], ['institution', 'Institución', '#f59e0b'],
  ['club', 'Club', '#ef4444'], ['scout', 'Ojeador', '#64748b'], ['other', 'Otro', '#475569'],
];
const roleMeta = (r) => ROLES.find(x => x[0] === r) || ROLES[6];
const emptyContact = () => ({ name: '', role: 'agent', organization: '', email: '', phone: '', location: '', notes: '', linked_prospect_ids: [] });

export default function ScoutingContacts({ prospects = [] }) {
  useTranslation();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api('/contacts').then(setContacts).catch(() => toast.error(tt('Error cargando contactos'))).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    if (!window.confirm('¿Eliminar contacto?')) return;
    try { await api(`/contacts/${id}`, { method: 'DELETE' }); setContacts(c => c.filter(x => x.id !== id)); toast.success(tt('Eliminado')); }
    catch { toast.error(tt('Error')); }
  };

  const shown = filter ? contacts.filter(c => c.role === filter) : contacts;
  const nameOf = (id) => prospects.find(p => p.id === id)?.name;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>;

  return (
    <div data-testid="scouting-contacts">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilter('')} className="px-3 py-1.5 rounded-full text-xs font-bold transition" style={!filter ? { background: '#0f172a', color: '#CCFF00' } : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }} data-testid="contacts-filter-all">{tt('Todos')} · {contacts.length}</button>
        {ROLES.map(([k, l, c]) => {
          const n = contacts.filter(x => x.role === k).length;
          if (!n) return null;
          return <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-full text-xs font-bold transition" style={filter === k ? { background: c, color: '#fff' } : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }} data-testid={`contacts-filter-${k}`}>{tt(l)} · {n}</button>;
        })}
        <div className="flex-1" />
        <Button onClick={() => setEditing(emptyContact())} className="bg-[#CCFF00] text-slate-900 hover:bg-[#b8e600] font-bold rounded-full" data-testid="contacts-new-btn"><Plus className="w-4 h-4 mr-1" />{tt('Nuevo Contacto')}</Button>
      </div>

      {!shown.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-3"><Users className="w-8 h-8 text-slate-300" /></div>
          <p className="text-slate-400 text-sm max-w-xs">{tt('Gestiona agentes, representantes, padres e instituciones de origen de tus prospectos.')}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shown.map(c => {
            const rm = roleMeta(c.role);
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-lg transition" data-testid={`contact-card-${c.id}`}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shrink-0" style={{ background: rm[2] }}>{(c.name || '?').slice(0, 1).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-slate-800 truncate">{c.name}</div>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: rm[2] + '22', color: rm[2] }}>{tt(rm[1])}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(c)} className="text-slate-300 hover:text-blue-600 p-1" data-testid={`contact-edit-${c.id}`}><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => del(c.id)} className="text-slate-300 hover:text-red-500 p-1" data-testid={`contact-delete-${c.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-[12px] text-slate-600">
                  {c.organization && <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" />{c.organization}</div>}
                  {c.email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-400" />{c.email}</div>}
                  {c.phone && <div className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-400" />{c.phone}</div>}
                  {c.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-400" />{c.location}</div>}
                </div>
                {(c.linked_prospect_ids || []).length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Link2 className="w-3 h-3" />Prospectos</div>
                    <div className="flex flex-wrap gap-1">
                      {c.linked_prospect_ids.map(id => nameOf(id) && <span key={id} className="text-[10px] bg-slate-100 rounded-full px-2 py-0.5 text-slate-600">{nameOf(id)}</span>)}
                    </div>
                  </div>
                )}
                {c.notes && <p className="mt-2 text-[11px] text-slate-400 line-clamp-2">{c.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {editing && <ContactForm initial={editing} prospects={prospects} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function ContactForm({ initial, prospects, onClose, onSaved }) {
  const [f, setF] = useState({ ...emptyContact(), ...initial });
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial.id;
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const toggleLink = (id) => setF(s => ({ ...s, linked_prospect_ids: s.linked_prospect_ids.includes(id) ? s.linked_prospect_ids.filter(x => x !== id) : [...s.linked_prospect_ids, id] }));

  const save = async () => {
    if (!f.name.trim()) { toast.error(tt('El nombre es obligatorio')); return; }
    setSaving(true);
    const payload = { name: f.name, role: f.role, organization: f.organization, email: f.email, phone: f.phone, location: f.location, notes: f.notes, linked_prospect_ids: f.linked_prospect_ids };
    try {
      if (isEdit) await api(`/contacts/${initial.id}`, { method: 'PUT', body: payload });
      else await api('/contacts', { method: 'POST', body: payload });
      toast.success(isEdit ? 'Contacto actualizado' : 'Contacto creado'); onSaved();
    } catch { toast.error(tt('Error guardando')); }
    setSaving(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white max-h-[92vh] overflow-y-auto" data-testid="contact-form">
        <DialogHeader>
          <DialogTitle>{isEdit ? tt('Editar Contacto') : tt('Nuevo Contacto')}</DialogTitle>
          <DialogDescription>{tt('Agentes, representantes, padres, clubes e instituciones de origen.')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Nombre *')}</label><Input value={f.name} onChange={e => set('name', e.target.value)} className="bg-white mt-1" data-testid="contact-name" /></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Rol')}</label>
              <Select value={f.role} onValueChange={v => set('role', v)}>
                <SelectTrigger className="bg-white mt-1" data-testid="contact-role"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(([k, l]) => <SelectItem key={k} value={k}>{tt(l)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Organización')}</label><Input value={f.organization} onChange={e => set('organization', e.target.value)} className="bg-white mt-1" placeholder={tt('Agencia / Club / Institución')} /></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Ubicación')}</label><Input value={f.location} onChange={e => set('location', e.target.value)} className="bg-white mt-1" /></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Email')}</label><Input value={f.email} onChange={e => set('email', e.target.value)} className="bg-white mt-1" /></div>
            <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Teléfono')}</label><Input value={f.phone} onChange={e => set('phone', e.target.value)} className="bg-white mt-1" /></div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Prospectos vinculados')}</label>
            <div className="mt-1 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-lg border border-slate-200">
              {prospects.length ? prospects.map(p => (
                <button key={p.id} type="button" onClick={() => toggleLink(p.id)} className="text-[11px] px-2 py-1 rounded-full font-bold transition" style={f.linked_prospect_ids.includes(p.id) ? { background: '#0f172a', color: '#CCFF00' } : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }} data-testid={`contact-link-${p.id}`}>{p.name}</button>
              )) : <span className="text-[11px] text-slate-400">{tt('Sin prospectos aún.')}</span>}
            </div>
          </div>
          <div><label className="text-[11px] font-bold text-slate-500 uppercase">{tt('Notas')}</label><Textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} className="bg-white mt-1" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tt('Cancelar')}</Button>
          <Button onClick={save} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800" data-testid="contact-save-btn">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
