import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import {
  Building2, School, Users, Trophy, Flag, Landmark, Plus, Edit2, Trash2,
  MapPin, Phone, Mail, Globe, Facebook, Instagram, Twitter, Calendar,
  FileText, Loader2, ChevronRight, UserPlus, X, Search, Building, Crown
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Iconos y colores por tipo de entidad
const ENTITY_CONFIG = {
  federation: { 
    icon: Landmark, 
    color: '#FFD700', 
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    label: 'Federación',
    emoji: '🏛️'
  },
  club: { 
    icon: Building2, 
    color: '#3B82F6', 
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    label: 'Club',
    emoji: '🏢'
  },
  school: { 
    icon: School, 
    color: '#10B981', 
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    label: 'Escuela',
    emoji: '🏫'
  },
  national_team: { 
    icon: Flag, 
    color: '#EF4444', 
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    label: 'Selección Nacional',
    emoji: '🇺🇳'
  },
  team: { 
    icon: Users, 
    color: '#8B5CF6', 
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    label: 'Equipo',
    emoji: '👥'
  },
  league: { 
    icon: Trophy, 
    color: '#F59E0B', 
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    label: 'Liga/Torneo',
    emoji: '🏆'
  }
};

const EntityManager = ({ onSelectEntity, selectedEntityId }) => {
  const [entities, setEntities] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingEntity, setEditingEntity] = useState(null);
  const [entityToDelete, setEntityToDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    entity_type: 'club',
    description: '',
    logo_url: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    legal_representative: '',
    tax_id: '',
    foundation_date: '',
    facebook: '',
    instagram: '',
    twitter: '',
    parent_entity_id: '',
    sport: ''
  });

  // Cargar entidades
  const fetchEntities = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const [entitiesRes, hierarchyRes] = await Promise.all([
        fetch(`${API_URL}/api/entities`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/entities-hierarchy`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (entitiesRes.ok) {
        const data = await entitiesRes.json();
        setEntities(data);
      }
      if (hierarchyRes.ok) {
        const data = await hierarchyRes.json();
        setHierarchy(data);
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      entity_type: 'club',
      description: '',
      logo_url: '',
      address: '',
      city: '',
      country: '',
      phone: '',
      email: '',
      website: '',
      legal_representative: '',
      tax_id: '',
      foundation_date: '',
      facebook: '',
      instagram: '',
      twitter: '',
      parent_entity_id: '',
      sport: ''
    });
    setEditingEntity(null);
  };

  // Abrir modal para crear
  const handleCreate = (type = 'club') => {
    resetForm();
    setFormData(prev => ({ ...prev, entity_type: type }));
    setShowCreateModal(true);
  };

  // Abrir modal para editar
  const handleEdit = (entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name || '',
      entity_type: entity.entity_type || 'club',
      description: entity.description || '',
      logo_url: entity.logo_url || '',
      address: entity.address || '',
      city: entity.city || '',
      country: entity.country || '',
      phone: entity.phone || '',
      email: entity.email || '',
      website: entity.website || '',
      legal_representative: entity.legal_representative || '',
      tax_id: entity.tax_id || '',
      foundation_date: entity.foundation_date || '',
      facebook: entity.facebook || '',
      instagram: entity.instagram || '',
      twitter: entity.twitter || '',
      parent_entity_id: entity.parent_entity_id || '',
      sport: entity.sport || ''
    });
    setShowCreateModal(true);
  };

  // Guardar entidad
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const url = editingEntity 
        ? `${API_URL}/api/entities/${editingEntity.id}`
        : `${API_URL}/api/entities`;
      
      const response = await fetch(url, {
        method: editingEntity ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success(editingEntity ? 'Entidad actualizada' : 'Entidad creada');
        setShowCreateModal(false);
        resetForm();
        fetchEntities();
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error saving entity:', error);
      toast.error('Error al guardar la entidad');
    }
    setSaving(false);
  };

  // Eliminar entidad
  const handleDelete = async () => {
    if (!entityToDelete) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/entities/${entityToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Entidad eliminada');
        setShowDeleteModal(false);
        setEntityToDelete(null);
        fetchEntities();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      console.error('Error deleting entity:', error);
      toast.error('Error al eliminar la entidad');
    }
    setSaving(false);
  };

  // Filtrar entidades
  const filteredEntities = entities.filter(entity => {
    const matchesSearch = entity.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = activeTab === 'all' || entity.entity_type === activeTab;
    return matchesSearch && matchesType;
  });

  // Contar por tipo
  const countByType = (type) => entities.filter(e => e.entity_type === type).length;

  // Renderizar tarjeta de entidad
  const EntityCard = ({ entity }) => {
    const config = ENTITY_CONFIG[entity.entity_type] || ENTITY_CONFIG.club;
    const IconComponent = config.icon;
    
    return (
      <Card 
        className={`hover:shadow-lg transition-all cursor-pointer border-l-4 ${config.borderColor} ${
          selectedEntityId === entity.id ? 'ring-2 ring-blue-500' : ''
        }`}
        onClick={() => onSelectEntity && onSelectEntity(entity)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div 
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgColor}`}
              >
                <IconComponent className="w-6 h-6" style={{ color: config.color }} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{entity.name}</h3>
                <p className="text-sm text-slate-500">{config.label}</p>
                {entity.city && (
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {entity.city}, {entity.country}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: config.color }}>
                  {entity.athletes_count || 0}
                </p>
                <p className="text-xs text-slate-500">atletas</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleEdit(entity); }}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={(e) => { 
                e.stopPropagation(); 
                setEntityToDelete(entity);
                setShowDeleteModal(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Renderizar tarjeta de creación rápida
  const QuickCreateCard = ({ type }) => {
    const config = ENTITY_CONFIG[type];
    const IconComponent = config.icon;
    
    return (
      <Card 
        className={`hover:shadow-lg transition-all cursor-pointer border-2 border-dashed ${config.borderColor} hover:border-solid`}
        onClick={() => handleCreate(type)}
      >
        <CardContent className="p-4 flex flex-col items-center justify-center min-h-[120px]">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.bgColor} mb-2`}>
            <Plus className="w-6 h-6" style={{ color: config.color }} />
          </div>
          <p className="font-medium text-slate-700">Crear {config.label}</p>
          <p className="text-xs text-slate-500">{config.emoji}</p>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestión de Entidades</h2>
          <p className="text-slate-500">Federaciones, Clubes, Escuelas y más</p>
        </div>
        <Button onClick={() => handleCreate()} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Entidad
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ENTITY_CONFIG).map(([type, config]) => {
          const IconComponent = config.icon;
          const count = countByType(type);
          return (
            <Card 
              key={type}
              className={`cursor-pointer transition-all hover:shadow-md ${activeTab === type ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setActiveTab(activeTab === type ? 'all' : type)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.bgColor}`}>
                  <IconComponent className="w-5 h-5" style={{ color: config.color }} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-800">{count}</p>
                  <p className="text-xs text-slate-500">{config.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
        <Input
          placeholder="Buscar entidades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista de entidades o estado vacío */}
      {filteredEntities.length === 0 ? (
        <div className="space-y-6">
          <Card className="border-dashed border-2">
            <CardContent className="py-12 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                {searchTerm ? 'No se encontraron resultados' : 'Sin entidades registradas'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchTerm 
                  ? 'Intenta con otro término de búsqueda'
                  : 'Comienza creando tu primera federación, club o escuela'
                }
              </p>
            </CardContent>
          </Card>
          
          {!searchTerm && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.keys(ENTITY_CONFIG).map(type => (
                <QuickCreateCard key={type} type={type} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map(entity => (
            <EntityCard key={entity.id} entity={entity} />
          ))}
        </div>
      )}

      {/* Modal de Crear/Editar */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingEntity ? (
                <>
                  <Edit2 className="w-5 h-5 text-blue-500" />
                  Editar {ENTITY_CONFIG[formData.entity_type]?.label}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 text-green-500" />
                  Nueva Entidad
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tipo de entidad */}
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Tipo de Entidad *</Label>
              <Select 
                value={formData.entity_type} 
                onValueChange={(v) => setFormData({...formData, entity_type: v})}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        {config.emoji} {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Información básica */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nombre de la entidad"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Deporte Principal</Label>
                <Input
                  value={formData.sport}
                  onChange={(e) => setFormData({...formData, sport: e.target.value})}
                  placeholder="Ej: Natación, Atletismo"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Breve descripción"
                className="mt-1"
              />
            </div>

            {/* Ubicación */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Dirección</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Dirección"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Ciudad</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Ciudad"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">País</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  placeholder="País"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Contacto */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+57 300 123 4567"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Email</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@entidad.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Sitio Web</Label>
                <Input
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  placeholder="https://..."
                  className="mt-1"
                />
              </div>
            </div>

            {/* Datos legales */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Representante Legal</Label>
                <Input
                  value={formData.legal_representative}
                  onChange={(e) => setFormData({...formData, legal_representative: e.target.value})}
                  placeholder="Nombre completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">RUC/NIT</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => setFormData({...formData, tax_id: e.target.value})}
                  placeholder="Identificación fiscal"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Fecha de Fundación</Label>
                <Input
                  type="date"
                  value={formData.foundation_date}
                  onChange={(e) => setFormData({...formData, foundation_date: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Redes sociales */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Facebook className="w-3 h-3" /> Facebook
                </Label>
                <Input
                  value={formData.facebook}
                  onChange={(e) => setFormData({...formData, facebook: e.target.value})}
                  placeholder="URL de Facebook"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Instagram className="w-3 h-3" /> Instagram
                </Label>
                <Input
                  value={formData.instagram}
                  onChange={(e) => setFormData({...formData, instagram: e.target.value})}
                  placeholder="@usuario"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1">
                  <Twitter className="w-3 h-3" /> Twitter/X
                </Label>
                <Input
                  value={formData.twitter}
                  onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                  placeholder="@usuario"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Entidad padre */}
            {entities.length > 0 && (
              <div>
                <Label className="text-xs font-semibold text-slate-500 uppercase">Entidad Padre (opcional)</Label>
                <Select 
                  value={formData.parent_entity_id || 'none'} 
                  onValueChange={(v) => setFormData({...formData, parent_entity_id: v === 'none' ? '' : v})}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Seleccionar entidad padre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin entidad padre</SelectItem>
                    {entities.filter(e => e.id !== editingEntity?.id).map(entity => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {ENTITY_CONFIG[entity.entity_type]?.emoji} {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Guardando...</>
              ) : (
                <>{editingEntity ? 'Actualizar' : 'Crear'}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar Entidad
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              ¿Estás seguro de que deseas eliminar <strong>"{entityToDelete?.name}"</strong>?
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Los atletas afiliados perderán esta afiliación pero no serán eliminados.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando...</>
              ) : (
                <>Eliminar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EntityManager;
