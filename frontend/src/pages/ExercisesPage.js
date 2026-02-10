import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getExercises, createExercise } from '../services/api';
import { Dumbbell, Search, Plus, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';

const SPORTS = [
  { value: 'football', label: 'Fútbol' },
  { value: 'athletics', label: 'Atletismo' },
  { value: 'swimming', label: 'Natación' },
  { value: 'cycling', label: 'Ciclismo' },
  { value: 'basketball', label: 'Baloncesto' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'weightlifting', label: 'Halterofilia' },
  { value: 'other', label: 'Otro' },
];

const CATEGORIES = [
  'fuerza', 'resistencia', 'velocidad', 'potencia', 
  'tecnico', 'tactico', 'flexibilidad', 'metabolico', 'recuperacion'
];

const ExercisesPage = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSport, setFilterSport] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    category: '',
    description: '',
    muscles: '',
    video_url: ''
  });

  useEffect(() => {
    fetchExercises();
  }, [filterSport, filterCategory]);

  const fetchExercises = async () => {
    try {
      const params = {};
      if (filterSport) params.sport = filterSport;
      if (filterCategory) params.category = filterCategory;
      const response = await getExercises(params);
      setExercises(response.data);
    } catch (error) {
      toast.error('Error al cargar ejercicios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await createExercise({
        ...formData,
        muscles: formData.muscles ? formData.muscles.split(',').map(m => m.trim()) : []
      });
      toast.success('Ejercicio creado correctamente');
      setDialogOpen(false);
      setFormData({ name: '', sport: '', category: '', description: '', muscles: '', video_url: '' });
      fetchExercises();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear ejercicio');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSportLabel = (value) => SPORTS.find(s => s.value === value)?.label || value;

  const groupedExercises = filteredExercises.reduce((acc, ex) => {
    const sport = ex.sport || 'other';
    if (!acc[sport]) acc[sport] = [];
    acc[sport].push(ex);
    return acc;
  }, {});

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
              BIBLIOTECA DE EJERCICIOS
            </h1>
            <p className="text-slate-500 mt-1">Explora y añade ejercicios a tu biblioteca</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-slate-900 hover:bg-slate-800 font-bold uppercase tracking-wide" data-testid="add-exercise-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Ejercicio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  NUEVO EJERCICIO
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="exercise-name-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Deporte *</Label>
                    <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                      <SelectTrigger data-testid="exercise-sport-select">
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
                    <Label>Categoría *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger data-testid="exercise-category-select">
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe el ejercicio..."
                    data-testid="exercise-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="muscles">Músculos involucrados</Label>
                  <Input
                    id="muscles"
                    value={formData.muscles}
                    onChange={(e) => setFormData({ ...formData, muscles: e.target.value })}
                    placeholder="cuadriceps, gluteos, core..."
                    data-testid="exercise-muscles-input"
                  />
                  <p className="text-xs text-slate-500">Separa con comas</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="video_url">URL de video (opcional)</Label>
                  <Input
                    id="video_url"
                    type="url"
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                    data-testid="exercise-video-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#007AFF] hover:bg-blue-600 font-bold uppercase tracking-wide"
                  disabled={formLoading || !formData.name || !formData.sport || !formData.category}
                  data-testid="exercise-submit-btn"
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Crear Ejercicio
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Buscar ejercicio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="exercise-search-input"
            />
          </div>
          <Select value={filterSport} onValueChange={setFilterSport}>
            <SelectTrigger className="w-[180px]" data-testid="filter-sport-select">
              <SelectValue placeholder="Todos los deportes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos los deportes</SelectItem>
              {SPORTS.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]" data-testid="filter-category-select">
              <SelectValue placeholder="Todas las categorías" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas las categorías</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Exercises by sport */}
        {Object.keys(groupedExercises).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedExercises).map(([sport, sportExercises]) => (
              <div key={sport}>
                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
                  {getSportLabel(sport)}
                  <span className="text-sm font-normal text-slate-500">({sportExercises.length})</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sportExercises.map((exercise) => (
                    <Card key={exercise.id} className="border-slate-200 hover:border-slate-300 transition-colors" data-testid={`exercise-card-${exercise.id}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900">{exercise.name}</h3>
                            <span className="badge badge-blue mt-1 capitalize">{exercise.category}</span>
                          </div>
                          {exercise.video_url && (
                            <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-[#007AFF]">
                              <Video className="w-5 h-5" />
                            </a>
                          )}
                        </div>
                        
                        {exercise.description && (
                          <p className="text-sm text-slate-600 mb-3 line-clamp-2">{exercise.description}</p>
                        )}
                        
                        {exercise.muscles?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {exercise.muscles.map((muscle, idx) => (
                              <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                {muscle}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <Dumbbell className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                {searchQuery || filterSport || filterCategory ? 'SIN RESULTADOS' : 'SIN EJERCICIOS'}
              </h3>
              <p className="text-slate-500 mb-6">
                {searchQuery || filterSport || filterCategory 
                  ? 'No se encontraron ejercicios con ese criterio' 
                  : 'Añade ejercicios a tu biblioteca'
                }
              </p>
              {!searchQuery && !filterSport && !filterCategory && (
                <Button onClick={() => setDialogOpen(true)} className="bg-slate-900">
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir Ejercicio
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExercisesPage;
