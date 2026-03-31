import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  Building2, School, Users, Trophy, Flag, Landmark, Plus, Edit2, Trash2,
  MapPin, Phone, Mail, Globe, Facebook, Instagram, Twitter,
  Loader2, Search, ChevronDown, ChevronUp, Shield
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ENTITY_TYPES = {
  // Públicas
  federation:    { label: 'Federación',        icon: Landmark,  color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A', group: 'publica' },
  national_team: { label: 'Selección Nacional', icon: Flag,      color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9', group: 'publica' },
  league:        { label: 'Liga / Torneo',      icon: Trophy,    color: '#E65100', bg: '#FFF3E0', border: '#FFCC80', group: 'publica' },
  // Privadas
  club:          { label: 'Club Deportivo',     icon: Shield,    color: '#2E7D32', bg: '#E8F5E9', border: '#A5D6A7', group: 'privada' },
  school:        { label: 'Escuela Deportiva',  icon: School,    color: '#6A1B9A', bg: '#F3E5F5', border: '#CE93D8', group: 'privada' },
  team:          { label: 'Equipo / Grupo',     icon: Users,     color: '#00838F', bg: '#E0F7FA', border: '#80DEEA', group: 'privada' },
};

const EntityManager = () => {
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroup, setExpandedGroup] = useState('publica');
  const [formData, setFormData] = useState({
    name: '', entity_type: 'club', description: '', address: '', city: '', country: '',
    phone: '', email: '', website: '', legal_representative: '', tax_id: '',
    foundation_date: '', facebook: '', instagram: '', twitter: '', parent_entity_id: '', sport: ''
  });

  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/entities`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setEntities(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEntities(); }, [fetchEntities]);

  const resetForm = () => {
    setFormData({ name: '', entity_type: 'club', description: '', address: '', city: '', country: '',
      phone: '', email: '', website: '', legal_representative: '', tax_id: '',
      foundation_date: '', facebook: '', instagram: '', twitter: '', parent_entity_id: '', sport: '' });
    setEditingEntity(null);
  };

  const openCreate = (type = 'club') => { resetForm(); setFormData(p => ({ ...p, entity_type: type })); setShowModal(true); };
  const openEdit = (entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name || '', entity_type: entity.entity_type || 'club', description: entity.description || '',
      address: entity.address || '', city: entity.city || '', country: entity.country || '',
      phone: entity.phone || '', email: entity.email || '', website: entity.website || '',
      legal_representative: entity.legal_representative || '', tax_id: entity.tax_id || '',
      foundation_date: entity.foundation_date || '', facebook: entity.facebook || '',
      instagram: entity.instagram || '', twitter: entity.twitter || '', parent_entity_id: entity.parent_entity_id || '',
      sport: entity.sport || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const url = editingEntity ? `${API_URL}/api/entities/${editingEntity.id}` : `${API_URL}/api/entities`;
      const res = await fetch(url, {
        method: editingEntity ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) { toast.success(editingEntity ? 'Entidad actualizada' : 'Entidad creada'); setShowModal(false); resetForm(); fetchEntities(); }
      else { const err = await res.json(); toast.error(err.detail || 'Error al guardar'); }
    } catch (e) { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!entityToDelete) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const res = await fetch(`${API_URL}/api/entities/${entityToDelete.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) { toast.success('Entidad eliminada'); setShowDeleteModal(false); setEntityToDelete(null); fetchEntities(); }
      else toast.error('Error al eliminar');
    } catch (e) { toast.error('Error al eliminar'); }
    setSaving(false);
  };

  const filtered = entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const publicEntities = filtered.filter(e => ['federation', 'national_team', 'league'].includes(e.entity_type));
  const privateEntities = filtered.filter(e => ['club', 'school', 'team'].includes(e.entity_type));
  const countByType = (type) => entities.filter(e => e.entity_type === type).length;

  const cfg = ENTITY_TYPES[formData.entity_type] || ENTITY_TYPES.club;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#1565C0' }} /></div>;

  const renderEntityRow = (entity) => {
    const c = ENTITY_TYPES[entity.entity_type] || ENTITY_TYPES.club;
    const Icon = c.icon;
    return (
      <div key={entity.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 group" data-testid={`entity-row-${entity.id}`}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.bg }}>
          <Icon className="w-4.5 h-4.5" style={{ color: c.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate">{entity.name}</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span style={{ color: c.color }} className="font-medium">{c.label}</span>
            {entity.city && <><span className="text-slate-300">|</span><span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{entity.city}{entity.country ? `, ${entity.country}` : ''}</span></>}
            {entity.sport && <><span className="text-slate-300">|</span><span>{entity.sport}</span></>}
          </div>
        </div>
        <div className="text-right mr-2">
          <p className="text-lg font-bold" style={{ color: c.color }}>{entity.athletes_count || 0}</p>
          <p className="text-[10px] text-slate-400">atletas</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(entity)} data-testid={`edit-entity-${entity.id}`}>
            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEntityToDelete(entity); setShowDeleteModal(true); }}>
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          </Button>
        </div>
      </div>
    );
  };

  const renderGroup = (title, subtitle, groupEntities, groupKey, types) => {
    const isExpanded = expandedGroup === groupKey;
    return (
      <Card className="border-0 shadow-lg overflow-hidden" data-testid={`group-${groupKey}`}>
        <button className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-slate-50 transition-colors" onClick={() => setExpandedGroup(isExpanded ? null : groupKey)}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: groupKey === 'publica' ? '#E3F2FD' : '#E8F5E9' }}>
              {groupKey === 'publica' ? <Landmark className="w-5 h-5" style={{ color: '#1565C0' }} /> : <Building2 className="w-5 h-5" style={{ color: '#2E7D32' }} />}
            </div>
            <div className="text-left">
              <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: groupKey === 'publica' ? '#E3F2FD' : '#E8F5E9', color: groupKey === 'publica' ? '#1565C0' : '#2E7D32' }}>
              {groupEntities.length}
            </span>
          </div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </button>
        {isExpanded && (
          <div className="border-t border-slate-100">
            {/* Quick-add buttons */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 overflow-x-auto">
              {types.map(type => {
                const tc = ENTITY_TYPES[type];
                const TIcon = tc.icon;
                return (
                  <button key={type} onClick={() => openCreate(type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed transition-all hover:shadow-sm text-xs font-medium flex-shrink-0" style={{ borderColor: tc.border, color: tc.color, backgroundColor: 'white' }} data-testid={`quick-add-${type}`}>
                    <Plus className="w-3 h-3" /> {tc.label}
                  </button>
                );
              })}
            </div>
            {/* Entity list */}
            {groupEntities.length > 0 ? (
              <div>{groupEntities.map(renderEntityRow)}</div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin entidades en esta categoría</p>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4 p-2" data-testid="entity-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestión de Entidades</h2>
          <p className="text-xs text-slate-500">Organiza federaciones, clubes, escuelas y más en tu estructura deportiva</p>
        </div>
        <Button onClick={() => openCreate()} className="text-white text-xs h-8 px-3" style={{ backgroundColor: '#1565C0' }} data-testid="new-entity-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> Nueva Entidad
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(ENTITY_TYPES).map(([type, c]) => {
          const Icon = c.icon;
          const count = countByType(type);
          return (
            <button key={type} onClick={() => openCreate(type)} className="rounded-xl p-2 text-center transition-all hover:shadow-md border" style={{ backgroundColor: c.bg, borderColor: c.border }} data-testid={`stat-${type}`}>
              <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: c.color }} />
              <p className="text-lg font-bold" style={{ color: c.color }}>{count}</p>
              <p className="text-[10px] font-medium text-slate-600 leading-tight">{c.label}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input placeholder="Buscar entidades..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm border-slate-200" data-testid="entity-search" />
      </div>

      {/* Groups */}
      {renderGroup('Entidades Públicas', 'Federaciones, Selecciones Nacionales, Ligas y Torneos', publicEntities, 'publica', ['federation', 'national_team', 'league'])}
      {renderGroup('Entidades Privadas', 'Clubes Deportivos, Escuelas, Equipos y Grupos', privateEntities, 'privada', ['club', 'school', 'team'])}

      {/* Create/Edit Modal - Compact */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg bg-white" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-800">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                <cfg.icon className="w-4 h-4" style={{ color: cfg.color }} />
              </div>
              {editingEntity ? 'Editar Entidad' : 'Nueva Entidad'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Row 1: Classification + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Clasificación</Label>
                <Select value={cfg.group} onValueChange={(v) => {
                  const firstOfGroup = Object.entries(ENTITY_TYPES).find(([, c]) => c.group === v);
                  if (firstOfGroup) setFormData({ ...formData, entity_type: firstOfGroup[0] });
                }}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 bg-white text-slate-800" data-testid="form-classification"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="publica">Pública</SelectItem>
                    <SelectItem value="privada">Privada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Tipo de Entidad</Label>
                <Select value={formData.entity_type} onValueChange={(v) => setFormData({ ...formData, entity_type: v })}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 bg-white text-slate-800" data-testid="form-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {Object.entries(ENTITY_TYPES).filter(([, c]) => c.group === cfg.group).map(([type, c]) => (
                      <SelectItem key={type} value={type}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Name + Sport */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Nombre *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nombre de la entidad" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" data-testid="form-name" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Deporte</Label>
                <Input value={formData.sport} onChange={(e) => setFormData({ ...formData, sport: e.target.value })} placeholder="Ej: Atletismo" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
            </div>

            {/* Row 3: Country + City + Address */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">País</Label>
                <Input value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="País" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" data-testid="form-country" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Ciudad</Label>
                <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="Ciudad" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Dirección</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Dirección" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
            </div>

            {/* Row 4: Contact */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Teléfono</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+57 300 123 4567" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Email</Label>
                <Input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="email@entidad.com" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Sitio Web</Label>
                <Input value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
            </div>

            {/* Row 5: Legal */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Representante</Label>
                <Input value={formData.legal_representative} onChange={(e) => setFormData({ ...formData, legal_representative: e.target.value })} placeholder="Nombre" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">RUC/NIT</Label>
                <Input value={formData.tax_id} onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })} placeholder="ID fiscal" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Fundación</Label>
                <Input type="date" value={formData.foundation_date} onChange={(e) => setFormData({ ...formData, foundation_date: e.target.value })} className="h-9 text-sm border-slate-200 bg-white text-slate-800" />
              </div>
            </div>

            {/* Row 6: Description */}
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Descripción</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Breve descripción (opcional)" className="h-9 text-sm border-slate-200 bg-white text-slate-800 placeholder:text-slate-400" />
            </div>

            {/* Parent Entity */}
            {entities.length > 0 && (
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Entidad Padre (opcional)</Label>
                <Select value={formData.parent_entity_id || 'none'} onValueChange={(v) => setFormData({ ...formData, parent_entity_id: v === 'none' ? '' : v })}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 bg-white text-slate-800"><SelectValue placeholder="Sin entidad padre" /></SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="none">Sin entidad padre</SelectItem>
                    {entities.filter(e => e.id !== editingEntity?.id).map(e => {
                      const ec = ENTITY_TYPES[e.entity_type] || ENTITY_TYPES.club;
                      return <SelectItem key={e.id} value={e.id}>{ec.label}: {e.name}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="h-8 text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-xs text-white" style={{ backgroundColor: cfg.color }} data-testid="save-entity-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {saving ? 'Guardando...' : editingEntity ? 'Actualizar' : 'Crear Entidad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> Eliminar Entidad
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-700">¿Eliminar <strong>"{entityToDelete?.name}"</strong>?</p>
            <p className="text-xs text-slate-500 mt-2">Los atletas afiliados perderán esta afiliación pero no serán eliminados.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)} className="h-9 text-sm border-slate-300 text-slate-700 bg-white">Cancelar</Button>
            <Button onClick={handleDelete} disabled={saving} className="h-9 text-sm text-white bg-rose-600 hover:bg-rose-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
              {saving ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EntityManager;
