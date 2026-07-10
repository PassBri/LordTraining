import React, { useEffect, useState } from 'react';
import { tx as tt } from '../lib/autoTranslate';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import {
  Plus, Edit2, Trash2, Mail, Phone, GraduationCap, Award, Briefcase,
  Trophy, Globe, Languages, X, UserCircle, MapPin, Calendar, Building2, BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const EMPTY_COACH = {
  name: '', photo_url: '', birth_date: '', nationality: '', gender: '', document_id: '',
  email: '', phone: '', address: '',
  specialty: '', sub_specialty: '', years_experience: 0, level: '', license_number: '',
  current_organization: '', role_in_org: '',
  studies: [], certifications: [], languages: [],
  career_history: [], achievements: [], athletes_coached: [],
  bio: '', methodology: '', social_links: {},
  is_active: true,
};

const SPECIALTIES = [
  'Preparador Físico', 'Entrenador Principal', 'Asistente Técnico', 'Director Técnico',
  'Preparador de Porteros', 'Analista de Vídeo', 'Fisiólogo del Deporte',
  'Psicólogo Deportivo', 'Nutricionista Deportivo', 'Fisioterapeuta',
  'Coach Mental', 'Scout / Ojeador', 'Otro',
];
const LEVELS = [
  'Iniciación', 'Nivel I', 'Nivel II', 'Nivel III', 'Nacional',
  'Internacional · Federación', 'UEFA Pro', 'Otro',
];

const TabBtn = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
      active ? 'bg-slate-900 text-[#D4AF37] shadow-sm' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >{children}</button>
);

const ListSection = ({ items, onAdd, onRemove, onChange, fields, addLabel, emptyLabel }) => (
  <div className="space-y-2">
    {items.length === 0 && <p className="text-[11px] text-slate-400 italic">{emptyLabel}</p>}
    {items.map((it, idx) => (
      <div key={idx} className="grid gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg" style={{ gridTemplateColumns: `repeat(${fields.length}, minmax(0, 1fr)) auto` }}>
        {fields.map(f => (
          <Input
            key={f.key}
            placeholder={f.placeholder}
            type={f.type || 'text'}
            value={it[f.key] || ''}
            onChange={(e) => onChange(idx, f.key, e.target.value)}
            className="h-8 text-[12px]"
          />
        ))}
        <button type="button" onClick={() => onRemove(idx)} className="text-slate-400 hover:text-red-500 px-1" title={tt('Eliminar')}>
          <X className="w-4 h-4" />
        </button>
      </div>
    ))}
    <Button variant="outline" size="sm" onClick={onAdd} className="h-8 text-[11px] border-dashed">
      <Plus className="w-3.5 h-3.5 mr-1" /> {addLabel}
    </Button>
  </div>
);

const CoachesManager = () => {
  useTranslation();
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null); // null | new | coach object
  const [tab, setTab] = useState('personal');
  const [form, setForm] = useState(EMPTY_COACH);

  const fetchCoaches = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/coaches`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setCoaches(await res.json());
      else toast.error(tt('Error cargando entrenadores'));
    } catch { toast.error(tt('Error de red')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoaches(); }, []);

  const openNew = () => { setEditing('new'); setForm({ ...EMPTY_COACH }); setTab('personal'); };
  const openEdit = (c) => { setEditing(c); setForm({ ...EMPTY_COACH, ...c }); setTab('personal'); };
  const close = () => { setEditing(null); };

  const save = async () => {
    if (!form.name.trim()) { toast.error(tt('El nombre es obligatorio')); return; }
    try {
      const token = localStorage.getItem('train_token');
      const isNew = editing === 'new';
      const url = isNew ? `${API_URL}/api/coaches` : `${API_URL}/api/coaches/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, years_experience: parseInt(form.years_experience) || 0 }),
      });
      if (!res.ok) { toast.error(tt('Error guardando')); return; }
      toast.success(isNew ? 'Entrenador creado' : 'Cambios guardados');
      close();
      await fetchCoaches();
    } catch { toast.error(tt('Error de red')); }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este entrenador?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/coaches/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { toast.success(tt('Entrenador eliminado')); fetchCoaches(); }
      else toast.error(tt('Error eliminando'));
    } catch { toast.error(tt('Error de red')); }
  };

  // Helpers de listas en el form
  const addItem = (key, template) => setForm(p => ({ ...p, [key]: [...(p[key] || []), template] }));
  const removeItem = (key, idx) => setForm(p => ({ ...p, [key]: (p[key] || []).filter((_, i) => i !== idx) }));
  const changeItem = (key, idx, field, val) => setForm(p => ({
    ...p,
    [key]: (p[key] || []).map((it, i) => i === idx ? { ...it, [field]: val } : it),
  }));

  const completeness = (c) => {
    const fields = [c.name, c.specialty, c.years_experience, c.email, c.bio,
      (c.studies || []).length, (c.achievements || []).length];
    const filled = fields.filter(f => f && f !== 0).length;
    return Math.round((filled / fields.length) * 100);
  };

  return (
    <div className="space-y-3" data-testid="coaches-manager">
      {/* Toolbar local */}
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] text-slate-500">
          <span className="font-bold text-slate-700">{coaches.length}</span> entrenador{coaches.length === 1 ? '' : 'es'} registrado{coaches.length === 1 ? '' : 's'}
        </div>
        <Button size="sm" onClick={openNew} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="coach-new-btn">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo Entrenador
        </Button>
      </div>

      {loading && <p className="text-center text-slate-400 text-sm py-6">{tt('Cargando...')}</p>}

      {!loading && coaches.length === 0 && (
        <div className="bg-gradient-to-br from-white to-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
          <UserCircle className="w-14 h-14 mx-auto text-slate-300 mb-3" />
          <p className="text-base font-bold text-slate-700 mb-1">{tt('Sin entrenadores registrados')}</p>
          <p className="text-[12.5px] text-slate-500 max-w-md mx-auto leading-relaxed mb-4">
            Crea perfiles completos de tu staff técnico: especialidad, estudios, certificaciones, trayectoria y campeonatos ganados.
          </p>
          <Button onClick={openNew} className="bg-slate-900 hover:bg-slate-800 text-white">
            <Plus className="w-4 h-4 mr-1.5" /> Crear primer entrenador
          </Button>
        </div>
      )}

      {/* Grid de cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {coaches.map(c => {
          const pct = completeness(c);
          const ring = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#cbd5e1';
          const initial = (c.name || 'C')[0].toUpperCase();
          return (
            <div
              key={c.id}
              data-testid={`coach-card-${c.id}`}
              className="group bg-gradient-to-br from-white to-slate-50/40 border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="relative flex-shrink-0">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt={c.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md" />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center text-white font-black text-xl shadow-md"
                      style={{ background: `linear-gradient(135deg, ${ring}, #0f172a)` }}
                    >{initial}</div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${ring} ${pct}%, #e2e8f0 ${pct}% 100%)` }}>
                    <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[8px] font-black tabular-nums" style={{ color: ring }}>{pct}</div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-black text-[14px] text-slate-900 leading-tight truncate">{c.name}</div>
                  <div className="text-[10.5px] font-semibold text-slate-600 truncate">{c.specialty || '—'}</div>
                  {c.current_organization && (
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 truncate">
                      <Building2 className="w-3 h-3 flex-shrink-0" />{c.current_organization}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-base font-black tabular-nums" style={{ color: ring }}>{c.years_experience || 0}<span className="text-[10px]">{tt('a')}</span></div>
                    <div className="text-[8px] uppercase tracking-wider font-bold text-slate-500">{tt('Exp.')}</div>
                  </div>
                </div>
              </div>

              {/* Pills */}
              {(c.level || c.nationality) && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.level && <Badge className="bg-[#D4AF37] text-[#B8912A] border border-[#B8912A] text-[9.5px] font-bold">{c.level}</Badge>}
                  {c.nationality && <Badge className="bg-slate-100 text-slate-700 border border-slate-200 text-[9.5px] font-bold"><Globe className="w-2.5 h-2.5 mr-1" />{c.nationality}</Badge>}
                </div>
              )}

              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-1.5 mb-3 text-center">
                <div className="bg-slate-50 rounded-md px-1 py-1.5 border border-slate-100">
                  <div className="text-[12px] font-black text-slate-900">{(c.studies || []).length}</div>
                  <div className="text-[7.5px] uppercase tracking-wider font-bold text-slate-500">{tt('Estudios')}</div>
                </div>
                <div className="bg-amber-50 rounded-md px-1 py-1.5 border border-amber-100">
                  <div className="text-[12px] font-black text-amber-700">{(c.achievements || []).length}</div>
                  <div className="text-[7.5px] uppercase tracking-wider font-bold text-amber-700">{tt('Logros')}</div>
                </div>
                <div className="bg-emerald-50 rounded-md px-1 py-1.5 border border-emerald-100">
                  <div className="text-[12px] font-black text-emerald-700">{(c.career_history || []).length}</div>
                  <div className="text-[7.5px] uppercase tracking-wider font-bold text-emerald-700">{tt('Clubes')}</div>
                </div>
              </div>

              {/* Contact row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 min-w-0">
                  {c.email && <span className="truncate flex items-center gap-1"><Mail className="w-3 h-3 flex-shrink-0" />{c.email}</span>}
                  {!c.email && c.phone && <span className="truncate flex items-center gap-1"><Phone className="w-3 h-3 flex-shrink-0" />{c.phone}</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-500 hover:text-[#B8912A] hover:bg-[#D4AF37] rounded-md" onClick={() => openEdit(c)} data-testid={`coach-edit-${c.id}`}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md" onClick={() => remove(c.id)} data-testid={`coach-delete-${c.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de creación / edición */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl" data-testid="coach-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <UserCircle className="w-5 h-5 text-[#B8912A]" />
              {editing === 'new' ? 'Nuevo Entrenador' : 'Editar Entrenador'}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg">
            <TabBtn active={tab === 'personal'} onClick={() => setTab('personal')}>{tt('👤 Personal')}</TabBtn>
            <TabBtn active={tab === 'profesional'} onClick={() => setTab('profesional')}>{tt('💼 Profesional')}</TabBtn>
            <TabBtn active={tab === 'educacion'} onClick={() => setTab('educacion')}>{tt('🎓 Educación')}</TabBtn>
            <TabBtn active={tab === 'trayectoria'} onClick={() => setTab('trayectoria')}>{tt('📈 Trayectoria')}</TabBtn>
            <TabBtn active={tab === 'logros'} onClick={() => setTab('logros')}>{tt('🏆 Logros')}</TabBtn>
            <TabBtn active={tab === 'extra'} onClick={() => setTab('extra')}>{tt('✨ Extra')}</TabBtn>
          </div>

          {/* PERSONAL */}
          {tab === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Nombre completo *')}</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={tt('Ej: Brian Mendoza')} data-testid="coach-name-input" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('URL Foto')}</label>
                <Input value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} placeholder={tt('https://...')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Documento ID')}</label>
                <Input value={form.document_id} onChange={e => setForm({ ...form, document_id: e.target.value })} placeholder={tt('DNI / Cédula / Pasaporte')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Fecha de nacimiento')}</label>
                <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Nacionalidad')}</label>
                <Input value={form.nationality} onChange={e => setForm({ ...form, nationality: e.target.value })} placeholder={tt('Ej: Colombiana')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Género')}</label>
                <Select value={form.gender || ''} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue placeholder={tt('Seleccionar')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{tt('Masculino')}</SelectItem>
                    <SelectItem value="F">{tt('Femenino')}</SelectItem>
                    <SelectItem value="O">{tt('Otro / Prefiere no decir')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Email')}</label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder={tt('coach@email.com')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Teléfono')}</label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+57 300 123 4567" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Dirección')}</label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder={tt('Ciudad, país')} />
              </div>
            </div>
          )}

          {/* PROFESIONAL */}
          {tab === 'profesional' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Especialidad principal')}</label>
                <Select value={form.specialty || ''} onValueChange={v => setForm({ ...form, specialty: v })}>
                  <SelectTrigger><SelectValue placeholder={tt('Seleccionar')} /></SelectTrigger>
                  <SelectContent>{SPECIALTIES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Sub-especialidad')}</label>
                <Input value={form.sub_specialty} onChange={e => setForm({ ...form, sub_specialty: e.target.value })} placeholder={tt('Ej: Hipertrofia funcional')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Años de experiencia')}</label>
                <Input type="number" min="0" max="80" value={form.years_experience} onChange={e => setForm({ ...form, years_experience: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Nivel / Certificación')}</label>
                <Select value={form.level || ''} onValueChange={v => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue placeholder={tt('Seleccionar')} /></SelectTrigger>
                  <SelectContent>{LEVELS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('N° Licencia')}</label>
                <Input value={form.license_number} onChange={e => setForm({ ...form, license_number: e.target.value })} placeholder={tt('Ej: COL-PF-2024-0123')} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Organización actual')}</label>
                <Input value={form.current_organization} onChange={e => setForm({ ...form, current_organization: e.target.value })} placeholder={tt('Club, federación, escuela')} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Rol en la organización')}</label>
                <Input value={form.role_in_org} onChange={e => setForm({ ...form, role_in_org: e.target.value })} placeholder={tt('Ej: Director de la división juvenil')} />
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Idiomas')}</label>
                <Input
                  value={(form.languages || []).join(', ')}
                  onChange={e => setForm({ ...form, languages: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  placeholder={tt('Español, Inglés, Portugués')}
                />
                <p className="text-[10px] text-slate-400 italic">{tt('Separados por coma')}</p>
              </div>
            </div>
          )}

          {/* EDUCACIÓN */}
          {tab === 'educacion' && (
            <div className="space-y-4 pt-2">
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#B8912A]" /> Estudios académicos
                </h4>
                <ListSection
                  items={form.studies}
                  onAdd={() => addItem('studies', { title: '', institution: '', year: '', type: 'Universitario' })}
                  onRemove={(i) => removeItem('studies', i)}
                  onChange={(i, k, v) => changeItem('studies', i, k, v)}
                  fields={[
                    { key: 'title', placeholder: 'Título (ej: Lic. Educación Física)' },
                    { key: 'institution', placeholder: 'Institución' },
                    { key: 'year', placeholder: 'Año', type: 'number' },
                  ]}
                  addLabel="Agregar estudio"
                  emptyLabel="Sin estudios registrados"
                />
              </div>
              <div>
                <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-violet-500" /> Certificaciones / Cursos
                </h4>
                <ListSection
                  items={form.certifications}
                  onAdd={() => addItem('certifications', { title: '', institution: '', year: '' })}
                  onRemove={(i) => removeItem('certifications', i)}
                  onChange={(i, k, v) => changeItem('certifications', i, k, v)}
                  fields={[
                    { key: 'title', placeholder: 'Certificación (ej: UEFA B)' },
                    { key: 'institution', placeholder: 'Entidad emisora' },
                    { key: 'year', placeholder: 'Año', type: 'number' },
                  ]}
                  addLabel="Agregar certificación"
                  emptyLabel="Sin certificaciones registradas"
                />
              </div>
            </div>
          )}

          {/* TRAYECTORIA */}
          {tab === 'trayectoria' && (
            <div className="pt-2">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-500" /> Trayectoria profesional
              </h4>
              <ListSection
                items={form.career_history}
                onAdd={() => addItem('career_history', { organization: '', role: '', from_year: '', to_year: '' })}
                onRemove={(i) => removeItem('career_history', i)}
                onChange={(i, k, v) => changeItem('career_history', i, k, v)}
                fields={[
                  { key: 'organization', placeholder: 'Club / Organización' },
                  { key: 'role', placeholder: 'Cargo / Rol' },
                  { key: 'from_year', placeholder: 'Desde', type: 'number' },
                  { key: 'to_year', placeholder: 'Hasta (vacío = actual)', type: 'number' },
                ]}
                addLabel="Agregar trayectoria"
                emptyLabel="Sin trayectoria registrada"
              />
              <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-700 mb-2 mt-4 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-amber-500" /> Atletas / Equipos formados
              </h4>
              <ListSection
                items={form.athletes_coached}
                onAdd={() => addItem('athletes_coached', { name: '', sport: '', highlight: '' })}
                onRemove={(i) => removeItem('athletes_coached', i)}
                onChange={(i, k, v) => changeItem('athletes_coached', i, k, v)}
                fields={[
                  { key: 'name', placeholder: 'Nombre del atleta/equipo' },
                  { key: 'sport', placeholder: 'Deporte' },
                  { key: 'highlight', placeholder: 'Logro destacado' },
                ]}
                addLabel="Agregar atleta/equipo"
                emptyLabel="Sin atletas/equipos formados registrados"
              />
            </div>
          )}

          {/* LOGROS */}
          {tab === 'logros' && (
            <div className="pt-2">
              <h4 className="text-[12px] font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Campeonatos ganados, medallas y premios
              </h4>
              <ListSection
                items={form.achievements}
                onAdd={() => addItem('achievements', { title: '', year: '', level: '', sport: '' })}
                onRemove={(i) => removeItem('achievements', i)}
                onChange={(i, k, v) => changeItem('achievements', i, k, v)}
                fields={[
                  { key: 'title', placeholder: 'Título (ej: Campeón Nacional Sub-23)' },
                  { key: 'year', placeholder: 'Año', type: 'number' },
                  { key: 'level', placeholder: 'Nivel (Local/Nacional/Internacional)' },
                  { key: 'sport', placeholder: 'Deporte' },
                ]}
                addLabel="Agregar logro / campeonato"
                emptyLabel="Sin logros registrados"
              />
            </div>
          )}

          {/* EXTRA */}
          {tab === 'extra' && (
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Biografía / Filosofía')}</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm({ ...form, bio: e.target.value })}
                  rows={4}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none"
                  placeholder={tt('Breve descripción profesional, filosofía de entrenamiento, motivaciones...')}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">{tt('Metodología propia')}</label>
                <textarea
                  value={form.methodology}
                  onChange={e => setForm({ ...form, methodology: e.target.value })}
                  rows={3}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none"
                  placeholder={tt('Pilares metodológicos, principios de entrenamiento, enfoque diferenciador...')}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {['linkedin', 'twitter', 'instagram', 'web'].map(k => (
                  <div key={k} className="space-y-1">
                    <label className="text-[11px] font-bold uppercase text-slate-600">{k}</label>
                    <Input
                      value={form.social_links?.[k] || ''}
                      onChange={e => setForm({ ...form, social_links: { ...form.social_links, [k]: e.target.value } })}
                      placeholder={`URL de ${k}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close}>{tt('Cancelar')}</Button>
            <Button onClick={save} className="bg-slate-900 hover:bg-slate-800 text-white" data-testid="coach-save-btn">
              {editing === 'new' ? 'Crear entrenador' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachesManager;
