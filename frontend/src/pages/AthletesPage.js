import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { getAthletes, createAthlete, deleteAthlete } from '../services/api';
import { Plus, Search, Trash2, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SPORTS = [
  { value: 'football', label: 'Fútbol' },
  { value: 'athletics', label: 'Atletismo' },
  { value: 'swimming', label: 'Natación' },
  { value: 'cycling', label: 'Ciclismo' },
  { value: 'basketball', label: 'Baloncesto' },
  { value: 'tennis', label: 'Tenis' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'weightlifting', label: 'Halterofilia' },
  { value: 'other', label: 'Otro' },
];

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Élite', 'Profesional'];

const AthletesPage = () => {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    sport: '',
    age: '',
    level: '',
    notes: ''
  });

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      const response = await getAthletes();
      setAthletes(response.data);
    } catch (error) {
      toast.error('Error al cargar atletas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await createAthlete({
        ...formData,
        age: parseInt(formData.age)
      });
      toast.success('Atleta creado correctamente');
      setDialogOpen(false);
      setFormData({ name: '', email: '', sport: '', age: '', level: '', notes: '' });
      fetchAthletes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear atleta');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await deleteAthlete(id);
      toast.success('Atleta eliminado');
      fetchAthletes();
    } catch (error) {
      toast.error('Error al eliminar atleta');
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.sport.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSportLabel = (value) => SPORTS.find(s => s.value === value)?.label || value;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              ATLETAS
            </h1>
            <p className="text-slate-500 mt-1">Gestiona tu equipo de deportistas</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 font-bold uppercase tracking-wide" data-testid="add-athlete-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Atleta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  NUEVO ATLETA
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="athlete-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    data-testid="athlete-email-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deporte *</Label>
                    <Select 
                      value={formData.sport} 
                      onValueChange={(v) => setFormData({ ...formData, sport: v })}
                      required
                    >
                      <SelectTrigger data-testid="athlete-sport-select">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPORTS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Edad *</Label>
                    <Input
                      id="age"
                      type="number"
                      min="10"
                      max="100"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      required
                      data-testid="athlete-age-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nivel *</Label>
                  <Select 
                    value={formData.level} 
                    onValueChange={(v) => setFormData({ ...formData, level: v })}
                    required
                  >
                    <SelectTrigger data-testid="athlete-level-select">
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => (
                        <SelectItem key={l} value={l}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Observaciones, lesiones, objetivos..."
                    data-testid="athlete-notes-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#007AFF] hover:bg-blue-600 font-bold uppercase tracking-wide"
                  disabled={formLoading}
                  data-testid="athlete-submit-btn"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Crear Atleta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar atleta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="athlete-search-input"
          />
        </div>

        {/* Athletes Grid */}
        {filteredAthletes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAthletes.map((athlete) => (
              <Card key={athlete.id} className="border-slate-200 hover:border-slate-300 transition-colors" data-testid={`athlete-card-${athlete.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-100 text-slate-600 flex items-center justify-center rounded-full font-bold text-lg">
                        {athlete.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{athlete.name}</h3>
                        <p className="text-sm text-slate-500">{athlete.email || 'Sin email'}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-slate-400 hover:text-red-500"
                      onClick={() => handleDelete(athlete.id, athlete.name)}
                      data-testid={`delete-athlete-${athlete.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Deporte</span>
                      <span className="font-medium">{getSportLabel(athlete.sport)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Edad</span>
                      <span className="font-medium">{athlete.age} años</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Nivel</span>
                      <span className="badge badge-blue">{athlete.level}</span>
                    </div>
                  </div>

                  {athlete.notes && (
                    <p className="text-sm text-slate-500 border-t border-slate-100 pt-3 line-clamp-2">
                      {athlete.notes}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                    <Link to={`/plans?athlete=${athlete.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">Ver Planes</Button>
                    </Link>
                    <Link to={`/ai-generator?athlete=${athlete.id}`} className="flex-1">
                      <Button size="sm" className="w-full bg-[#007AFF]">Generar Plan</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <User className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                {searchQuery ? 'SIN RESULTADOS' : 'SIN ATLETAS'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchQuery 
                  ? 'No se encontraron atletas con ese criterio' 
                  : 'Comienza añadiendo tu primer atleta'
                }
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setDialogOpen(true)}
                  className="bg-slate-900"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Atleta
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AthletesPage;
