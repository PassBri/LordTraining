import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  Shield, Plus, Edit2, Trash2, Users, Loader2, Building2, UserPlus, X, Check
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const TeamManager = () => {
  const [teams, setTeams] = useState([]);
  const [entities, setEntities] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamToDelete, setTeamToDelete] = useState(null);
  const [managingTeam, setManagingTeam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sport: '', category: '', entity_id: ''
  });

  const getToken = () => localStorage.getItem('train_token');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      const [teamsRes, entitiesRes, athletesRes, sportsRes] = await Promise.all([
        fetch(`${API_URL}/api/teams`, { headers }),
        fetch(`${API_URL}/api/entities`, { headers }),
        fetch(`${API_URL}/api/athletes`, { headers }),
        fetch(`${API_URL}/api/sports/catalog`, { headers })
      ]);
      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (entitiesRes.ok) setEntities(await entitiesRes.json());
      if (athletesRes.ok) setAthletes(await athletesRes.json());
      if (sportsRes.ok) setSportsCatalog(await sportsRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const allSports = sportsCatalog.flatMap(cat => cat.sports || []);

  const resetForm = () => {
    setFormData({ name: '', sport: '', category: '', entity_id: '' });
    setEditingTeam(null);
  };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name || '',
      sport: team.sport || '',
      category: team.category || '',
      entity_id: team.entity_id || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error('El nombre es requerido'); return; }
    setSaving(true);
    try {
      const token = getToken();
      const url = editingTeam ? `${API_URL}/api/teams/${editingTeam.id}` : `${API_URL}/api/teams`;
      const body = {
        name: formData.name,
        sport: formData.sport || 'other',
        category: formData.category || null,
        entity_id: formData.entity_id || null,
        athletes: editingTeam?.athletes || []
      };
      const res = await fetch(url, {
        method: editingTeam ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success(editingTeam ? 'Equipo actualizado' : 'Equipo creado');
        setShowModal(false);
        resetForm();
        fetchAll();
      } else {
        const err = await res.json();
        toast.error(err.detail || 'Error al guardar');
      }
    } catch (e) { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!teamToDelete) return;
    setSaving(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/teams/${teamToDelete.id}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Equipo eliminado');
        setShowDeleteModal(false);
        setTeamToDelete(null);
        fetchAll();
      } else toast.error('Error al eliminar');
    } catch (e) { toast.error('Error al eliminar'); }
    setSaving(false);
  };

  const handleAddAthlete = async (teamId, athleteId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/teams/${teamId}/athletes/${athleteId}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { toast.success('Atleta agregado'); fetchAll(); }
      else toast.error('Error al agregar atleta');
    } catch (e) { toast.error('Error al agregar atleta'); }
  };

  const handleRemoveAthlete = async (teamId, athleteId) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/teams/${teamId}/athletes/${athleteId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) { toast.success('Atleta removido'); fetchAll(); }
      else toast.error('Error al remover atleta');
    } catch (e) { toast.error('Error al remover atleta'); }
  };

  const getEntityName = (id) => entities.find(e => e.id === id)?.name || '';
  const getSportName = (sportId) => {
    const s = allSports.find(sp => sp.id === sportId);
    return s?.name || sportId || '-';
  };
  const getAthleteName = (id) => athletes.find(a => a.id === id)?.name || 'Desconocido';

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#00838F' }} /></div>;

  return (
    <div className="space-y-4 p-2" data-testid="team-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestión de Equipos</h2>
          <p className="text-xs text-slate-500">Crea equipos, asigna deportes, entidades y gestiona sus atletas</p>
        </div>
        <Button onClick={openCreate} className="text-white text-xs h-8 px-3" style={{ backgroundColor: '#00838F' }} data-testid="new-team-btn">
          <Plus className="w-3.5 h-3.5 mr-1" /> Nuevo Equipo
        </Button>
      </div>

      {/* Team List */}
      {teams.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <div className="text-center py-12 text-slate-400">
            <Shield className="w-14 h-14 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-slate-500">No hay equipos creados</p>
            <p className="text-xs mt-1 text-slate-400">Crea tu primer equipo con el botón superior</p>
            <Button onClick={openCreate} className="mt-4 text-white text-xs" style={{ backgroundColor: '#00838F' }} data-testid="create-first-team">
              <Plus className="w-3.5 h-3.5 mr-1" /> Crear Primer Equipo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {teams.map(team => {
            const isExpanded = expandedTeam === team.id;
            const teamAthletes = (team.athletes || []).map(id => athletes.find(a => a.id === id)).filter(Boolean);
            const entityName = team.entity_id ? getEntityName(team.entity_id) : null;
            return (
              <Card key={team.id} className="border-0 shadow-md overflow-hidden" data-testid={`team-card-${team.id}`}>
                <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedTeam(isExpanded ? null : team.id)}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E0F7FA' }}>
                    <Shield className="w-5 h-5" style={{ color: '#00838F' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800">{team.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                      <span className="font-medium" style={{ color: '#00838F' }}>{getSportName(team.sport)}</span>
                      {team.category && <><span className="text-slate-300">|</span><span>{team.category}</span></>}
                      {entityName && <><span className="text-slate-300">|</span><span className="flex items-center gap-0.5"><Building2 className="w-3 h-3" />{entityName}</span></>}
                    </div>
                  </div>
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold" style={{ color: '#00838F' }}>{teamAthletes.length}</p>
                    <p className="text-[10px] text-slate-400">atletas</p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setManagingTeam(team); setShowMembersModal(true); }} data-testid={`manage-team-${team.id}`}>
                      <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(team)} data-testid={`edit-team-${team.id}`}>
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setTeamToDelete(team); setShowDeleteModal(true); }}>
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </Button>
                  </div>
                </div>
                {/* Expanded: show team athletes */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-600">Miembros del equipo</p>
                      <button onClick={() => { setManagingTeam(team); setShowMembersModal(true); }} className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#00838F', backgroundColor: '#E0F7FA' }}>
                        + Gestionar
                      </button>
                    </div>
                    {teamAthletes.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {teamAthletes.map(a => (
                          <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full border border-slate-200 text-xs">
                            <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                              {a.name?.charAt(0)?.toUpperCase()}
                            </div>
                            <span className="text-slate-700">{a.name}</span>
                            <button onClick={() => handleRemoveAthlete(team.id, a.id)} className="text-rose-400 hover:text-rose-600 ml-0.5">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Sin miembros asignados</p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md bg-white" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-800">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0F7FA' }}>
                <Shield className="w-4 h-4" style={{ color: '#00838F' }} />
              </div>
              {editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Nombre del Equipo *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej: Sub-17 Masculino" className="h-9 text-sm border-slate-200 bg-white text-slate-800" data-testid="team-form-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Deporte</Label>
                <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                  <SelectTrigger className="h-9 text-sm border-slate-200 bg-white text-slate-800" data-testid="team-form-sport"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-white">
                    {allSports.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                    {allSports.length === 0 && <SelectItem value="other">Otro</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500 mb-1 block">Categoría</Label>
                <Input value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="Ej: Sub-17, Senior" className="h-9 text-sm border-slate-200 bg-white text-slate-800" data-testid="team-form-category" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-500 mb-1 block">Entidad Asociada</Label>
              <Select value={formData.entity_id || 'none'} onValueChange={(v) => setFormData({ ...formData, entity_id: v === 'none' ? '' : v })}>
                <SelectTrigger className="h-9 text-sm border-slate-200 bg-white text-slate-800" data-testid="team-form-entity"><SelectValue placeholder="Sin entidad" /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="none">Sin entidad</SelectItem>
                  {entities.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} className="h-8 text-xs border-slate-300 text-slate-700 bg-white hover:bg-slate-50">Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-xs text-white" style={{ backgroundColor: '#00838F' }} data-testid="save-team-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
              {saving ? 'Guardando...' : editingTeam ? 'Actualizar' : 'Crear Equipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Members Modal */}
      <Dialog open={showMembersModal} onOpenChange={setShowMembersModal}>
        <DialogContent className="max-w-md bg-white" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-slate-800">
              <Users className="w-5 h-5" style={{ color: '#00838F' }} />
              Miembros: {managingTeam?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {/* Current Members */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">En el equipo ({managingTeam?.athletes?.length || 0})</p>
              {(managingTeam?.athletes || []).length > 0 ? (
                <div className="space-y-1">
                  {(managingTeam?.athletes || []).map(aid => {
                    const a = athletes.find(at => at.id === aid);
                    if (!a) return null;
                    return (
                      <div key={aid} className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-800">
                            {a.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{a.name}</p>
                            <p className="text-[10px] text-slate-500">{a.sport}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-rose-400 hover:text-rose-600" onClick={() => handleRemoveAthlete(managingTeam.id, aid)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic px-2">Sin miembros</p>
              )}
            </div>
            {/* Available Athletes */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Atletas disponibles</p>
              {athletes.filter(a => !(managingTeam?.athletes || []).includes(a.id)).length > 0 ? (
                <div className="space-y-1">
                  {athletes.filter(a => !(managingTeam?.athletes || []).includes(a.id)).map(a => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                          {a.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{a.name}</p>
                          <p className="text-[10px] text-slate-500">{a.sport}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-emerald-500 hover:text-emerald-700" onClick={() => handleAddAthlete(managingTeam.id, a.id)} data-testid={`add-athlete-${a.id}`}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic px-2">Todos los atletas ya están en el equipo</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMembersModal(false)} className="h-8 text-xs border-slate-300 text-slate-700 bg-white">Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-white" style={{ backgroundColor: '#ffffff' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5" /> Eliminar Equipo
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <p className="text-sm text-slate-700">¿Eliminar el equipo <strong>"{teamToDelete?.name}"</strong>?</p>
            <p className="text-xs text-slate-500 mt-2">Los atletas asociados no serán eliminados.</p>
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

export default TeamManager;
