import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  getAthletes, createAthlete, deleteAthlete, updateAthlete,
  getSportsCatalog, createSportCategory, deleteSportCategory, createSport, deleteSport,
  getTeams, createTeam, deleteTeam, addAthleteToTeam, removeAthleteFromTeam,
  getEntities, getTournaments, createTournament, deleteTournament, getTournament,
  addTournamentCategory, registerParticipant, generateBracket, getTournamentMatches,
  updateMatchScore, exportTournamentPDF
} from '../services/api';
import { 
  Plus, Search, Trash2, User, Loader2, Users, Trophy, 
  Edit2, ChevronDown, ChevronRight, X, Check, Building2,
  Calendar, MapPin, LayoutGrid, Medal, GitBranch, Share2, Download
} from 'lucide-react';
import { toast } from 'sonner';

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Élite', 'Profesional'];

const TOURNAMENT_FORMATS = [
  { value: 'single_elimination', label: 'Eliminación Directa', icon: '🏆' },
  { value: 'double_elimination', label: 'Doble Eliminación', icon: '🔄' },
  { value: 'round_robin', label: 'Todos contra Todos', icon: '🔁' },
  { value: 'group_stage_knockout', label: 'Grupos + Eliminación', icon: '📊' },
  { value: 'league', label: 'Liga', icon: '📈' },
  { value: 'swiss_system', label: 'Sistema Suizo', icon: '🇨🇭' },
];

const SCORING_SYSTEMS = [
  { value: 'standard', label: 'Estándar (3-1-0)' },
  { value: 'olympic', label: 'Olímpico' },
  { value: 'fifa', label: 'FIFA' },
  { value: 'custom', label: 'Personalizado' },
];

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  registration: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  registration: 'Inscripciones',
  in_progress: 'En Curso',
  completed: 'Finalizado',
};

const AthletesPage = () => {
  const [activeTab, setActiveTab] = useState('athletes');
  const [loading, setLoading] = useState(true);
  
  // Athletes State
  const [athletes, setAthletes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [athleteDialogOpen, setAthleteDialogOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [athleteForm, setAthleteForm] = useState({
    name: '', email: '', sport: '', age: '', level: '', notes: '', team_id: ''
  });

  // Teams State
  const [teams, setTeams] = useState([]);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '', sport: '', category: '', federation_id: '', club_id: '', school_id: ''
  });

  // Sports Catalog State
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [sportDialogOpen, setSportDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🏆', color: '#3B82F6' });
  const [newSport, setNewSport] = useState({ name: '', category_id: '' });

  // Entities for team affiliation
  const [entities, setEntities] = useState({ federations: [], clubs: [], schools: [] });

  // Tournaments State
  const [tournaments, setTournaments] = useState([]);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetailView, setTournamentDetailView] = useState(false);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [tournamentForm, setTournamentForm] = useState({
    name: '', description: '', sport: '', format: 'single_elimination',
    start_date: '', end_date: '', registration_deadline: '',
    venue: '', city: '', country: '', scoring_system: 'standard',
    points_win: 3, points_draw: 1, points_loss: 0,
    federation_id: '', club_id: '', primary_color: '#3B82F6', secondary_color: '#10B981'
  });
  const [categoryDialogOpenTournament, setCategoryDialogOpenTournament] = useState(false);
  const [tournamentCategoryForm, setTournamentCategoryForm] = useState({
    name: '', gender: '', age_min: '', age_max: '', max_participants: ''
  });
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournamentCategory, setSelectedTournamentCategory] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    participant_type: 'team', participant_id: '', participant_name: '', seed: ''
  });
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ participant1_score: '', participant2_score: '' });

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [athletesRes, teamsRes, catalogRes, entitiesRes, tournamentsRes] = await Promise.all([
        getAthletes(),
        getTeams(),
        getSportsCatalog(),
        getEntities(),
        getTournaments()
      ]);
      setAthletes(athletesRes.data);
      setTeams(teamsRes.data);
      setSportsCatalog(catalogRes.data);
      setTournaments(tournamentsRes.data);
      
      // Organize entities by type
      const organized = { federations: [], clubs: [], schools: [] };
      entitiesRes.data.forEach(entity => {
        if (entity.entity_type === 'federation') organized.federations.push(entity);
        else if (entity.entity_type === 'club') organized.clubs.push(entity);
        else if (entity.entity_type === 'school') organized.schools.push(entity);
      });
      setEntities(organized);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get all sports as flat list for dropdowns
  const getAllSports = () => {
    const sports = [];
    sportsCatalog.forEach(cat => {
      cat.sports?.forEach(sport => {
        sports.push({ value: sport.name.toLowerCase().replace(/\s+/g, '_'), label: sport.name, category: cat.name });
      });
    });
    return sports;
  };

  const getSportLabel = (sportValue) => {
    const allSports = getAllSports();
    const found = allSports.find(s => s.value === sportValue);
    return found?.label || sportValue;
  };

  // Athletes handlers
  const handleAthleteSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const teamId = athleteForm.team_id === 'none' ? null : athleteForm.team_id;
      const payload = {
        ...athleteForm,
        age: parseInt(athleteForm.age),
        sport: athleteForm.sport || 'other',
        team_id: teamId || null
      };
      
      if (editingAthlete) {
        await updateAthlete(editingAthlete.id, payload);
        toast.success('Atleta actualizado');
      } else {
        const response = await createAthlete(payload);
        // If team selected, add to team
        if (teamId) {
          await addAthleteToTeam(teamId, response.data.id);
        }
        toast.success('Atleta creado correctamente');
      }
      setAthleteDialogOpen(false);
      resetAthleteForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar atleta');
    } finally {
      setFormLoading(false);
    }
  };

  const resetAthleteForm = () => {
    setAthleteForm({ name: '', email: '', sport: '', age: '', level: '', notes: '', team_id: '' });
    setEditingAthlete(null);
  };

  const handleEditAthlete = (athlete) => {
    setEditingAthlete(athlete);
    setAthleteForm({
      name: athlete.name,
      email: athlete.email || '',
      sport: athlete.sport,
      age: athlete.age.toString(),
      level: athlete.level,
      notes: athlete.notes || '',
      team_id: ''
    });
    setAthleteDialogOpen(true);
  };

  const handleDeleteAthlete = async (id, name) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await deleteAthlete(id);
      toast.success('Atleta eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar atleta');
    }
  };

  // Teams handlers
  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const fedId = teamForm.federation_id === 'none' ? null : teamForm.federation_id;
      const clubId = teamForm.club_id === 'none' ? null : teamForm.club_id;
      const schoolId = teamForm.school_id === 'none' ? null : teamForm.school_id;
      
      await createTeam({
        name: teamForm.name,
        sport: teamForm.sport || 'other',
        category: teamForm.category,
        affiliations: {
          federation_id: fedId || null,
          club_id: clubId || null,
          school_id: schoolId || null
        }
      });
      toast.success('Equipo creado correctamente');
      setTeamDialogOpen(false);
      setTeamForm({ name: '', sport: '', category: '', federation_id: '', club_id: '', school_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear equipo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTeam = async (id, name) => {
    if (!window.confirm(`¿Eliminar el equipo ${name}?`)) return;
    try {
      await deleteTeam(id);
      toast.success('Equipo eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar equipo');
    }
  };

  // Sports Catalog handlers
  const toggleCategory = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await createSportCategory(newCategory);
      toast.success('Categoría creada');
      setCategoryDialogOpen(false);
      setNewCategory({ name: '', icon: '🏆', color: '#3B82F6' });
      fetchData();
    } catch (error) {
      toast.error('Error al crear categoría');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async (catId, name) => {
    if (!window.confirm(`¿Eliminar la categoría "${name}" y todos sus deportes?`)) return;
    try {
      await deleteSportCategory(catId);
      toast.success('Categoría eliminada');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  const handleCreateSport = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      await createSport(newSport);
      toast.success('Deporte añadido');
      setSportDialogOpen(false);
      setNewSport({ name: '', category_id: '' });
      fetchData();
    } catch (error) {
      toast.error('Error al crear deporte');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteSport = async (sportId, name) => {
    if (!window.confirm(`¿Eliminar "${name}"?`)) return;
    try {
      await deleteSport(sportId);
      toast.success('Deporte eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar deporte');
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.sport.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTeamById = (teamId) => teams.find(t => t.id === teamId);

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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            ATLETAS Y EQUIPOS
          </h1>
          <p className="text-slate-500 mt-1">Gestiona deportistas, equipos y catálogo de deportes</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="athletes" className="flex items-center gap-2" data-testid="tab-athletes">
              <User className="w-4 h-4" />
              Atletas
            </TabsTrigger>
            <TabsTrigger value="teams" className="flex items-center gap-2" data-testid="tab-teams">
              <Users className="w-4 h-4" />
              Equipos
            </TabsTrigger>
            <TabsTrigger value="sports" className="flex items-center gap-2" data-testid="tab-sports">
              <Trophy className="w-4 h-4" />
              Deportes
            </TabsTrigger>
          </TabsList>

          {/* ATHLETES TAB */}
          <TabsContent value="athletes" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar atleta..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="athlete-search-input"
                />
              </div>
              
              <Dialog open={athleteDialogOpen} onOpenChange={(open) => { setAthleteDialogOpen(open); if (!open) resetAthleteForm(); }}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 font-bold uppercase tracking-wide" data-testid="add-athlete-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Atleta
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                      {editingAthlete ? 'EDITAR ATLETA' : 'NUEVO ATLETA'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAthleteSubmit} className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="name">Nombre completo *</Label>
                        <Input
                          id="name"
                          value={athleteForm.name}
                          onChange={(e) => setAthleteForm({ ...athleteForm, name: e.target.value })}
                          required
                          data-testid="athlete-name-input"
                        />
                      </div>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="email">Email (opcional)</Label>
                        <Input
                          id="email"
                          type="email"
                          value={athleteForm.email}
                          onChange={(e) => setAthleteForm({ ...athleteForm, email: e.target.value })}
                          data-testid="athlete-email-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Deporte *</Label>
                        <Select 
                          value={athleteForm.sport} 
                          onValueChange={(v) => setAthleteForm({ ...athleteForm, sport: v })}
                        >
                          <SelectTrigger data-testid="athlete-sport-select">
                            <SelectValue placeholder="Seleccionar deporte" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {sportsCatalog.map(cat => (
                              <React.Fragment key={cat.id}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                                  {cat.icon} {cat.name}
                                </div>
                                {cat.sports?.map(sport => (
                                  <SelectItem key={sport.id} value={sport.name.toLowerCase().replace(/\s+/g, '_')}>
                                    {sport.name}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                            <SelectItem value="other">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="age">Edad *</Label>
                        <Input
                          id="age"
                          type="number"
                          min="5"
                          max="100"
                          value={athleteForm.age}
                          onChange={(e) => setAthleteForm({ ...athleteForm, age: e.target.value })}
                          required
                          data-testid="athlete-age-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nivel *</Label>
                        <Select 
                          value={athleteForm.level} 
                          onValueChange={(v) => setAthleteForm({ ...athleteForm, level: v })}
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
                        <Label>Equipo (opcional)</Label>
                        <Select 
                          value={athleteForm.team_id} 
                          onValueChange={(v) => setAthleteForm({ ...athleteForm, team_id: v })}
                        >
                          <SelectTrigger data-testid="athlete-team-select">
                            <SelectValue placeholder="Sin equipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin equipo</SelectItem>
                            {teams.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notas</Label>
                      <Textarea
                        id="notes"
                        value={athleteForm.notes}
                        onChange={(e) => setAthleteForm({ ...athleteForm, notes: e.target.value })}
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
                      {editingAthlete ? 'Guardar Cambios' : 'Crear Atleta'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Athletes Grid */}
            {filteredAthletes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAthletes.map((athlete) => (
                  <Card key={athlete.id} className="border-slate-200 hover:border-slate-300 transition-colors group" data-testid={`athlete-card-${athlete.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center rounded-full font-bold text-lg shadow-md">
                            {athlete.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{athlete.name}</h3>
                            <p className="text-sm text-slate-500">{athlete.email || 'Sin email'}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-500"
                            onClick={() => handleEditAthlete(athlete)}
                            data-testid={`edit-athlete-${athlete.id}`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                            onClick={() => handleDeleteAthlete(athlete.id, athlete.name)}
                            data-testid={`delete-athlete-${athlete.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
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
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">{athlete.level}</span>
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
                    <Button onClick={() => setAthleteDialogOpen(true)} className="bg-slate-900">
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Atleta
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TEAMS TAB */}
          <TabsContent value="teams" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-slate-600">Organiza atletas en equipos y asígnalos a entidades</p>
              
              <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-wide" data-testid="add-team-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Equipo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                      CREAR EQUIPO
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleTeamSubmit} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="team-name">Nombre del equipo *</Label>
                      <Input
                        id="team-name"
                        value={teamForm.name}
                        onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                        placeholder="Ej: Sub-17 Masculino"
                        required
                        data-testid="team-name-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Deporte</Label>
                        <Select 
                          value={teamForm.sport} 
                          onValueChange={(v) => setTeamForm({ ...teamForm, sport: v })}
                        >
                          <SelectTrigger data-testid="team-sport-select">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {sportsCatalog.map(cat => (
                              <React.Fragment key={cat.id}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                                  {cat.icon} {cat.name}
                                </div>
                                {cat.sports?.map(sport => (
                                  <SelectItem key={sport.id} value={sport.name.toLowerCase().replace(/\s+/g, '_')}>
                                    {sport.name}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="team-category">Categoría</Label>
                        <Input
                          id="team-category"
                          value={teamForm.category}
                          onChange={(e) => setTeamForm({ ...teamForm, category: e.target.value })}
                          placeholder="Ej: Sub-17, Senior"
                          data-testid="team-category-input"
                        />
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Afiliación a Entidades
                      </p>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label>Federación</Label>
                          <Select 
                            value={teamForm.federation_id} 
                            onValueChange={(v) => setTeamForm({ ...teamForm, federation_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar federación" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ninguna</SelectItem>
                              {entities.federations.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Club</Label>
                          <Select 
                            value={teamForm.club_id} 
                            onValueChange={(v) => setTeamForm({ ...teamForm, club_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar club" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ninguno</SelectItem>
                              {entities.clubs.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Escuela</Label>
                          <Select 
                            value={teamForm.school_id} 
                            onValueChange={(v) => setTeamForm({ ...teamForm, school_id: v })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar escuela" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Ninguna</SelectItem>
                              {entities.schools.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold uppercase tracking-wide"
                      disabled={formLoading}
                      data-testid="team-submit-btn"
                    >
                      {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Crear Equipo
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Teams Grid */}
            {teams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => (
                  <Card key={team.id} className="border-slate-200 hover:border-emerald-300 transition-colors group" data-testid={`team-card-${team.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center rounded-xl font-bold text-lg shadow-md">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">{team.name}</h3>
                            <p className="text-sm text-slate-500">{getSportLabel(team.sport)}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteTeam(team.id, team.name)}
                          data-testid={`delete-team-${team.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {team.category && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-500">Categoría</span>
                            <span className="font-medium">{team.category}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-500">Atletas</span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                            {team.athletes?.length || 0}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-16 text-center">
                  <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                    SIN EQUIPOS
                  </h3>
                  <p className="text-slate-500 mb-6">Crea equipos para organizar tus atletas</p>
                  <Button onClick={() => setTeamDialogOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Equipo
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* SPORTS CATALOG TAB */}
          <TabsContent value="sports" className="space-y-6 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-slate-600">Administra las categorías y deportes disponibles</p>
              
              <div className="flex gap-2">
                <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="font-medium" data-testid="add-category-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva Categoría
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Nueva Categoría</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateCategory} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="cat-name">Nombre *</Label>
                        <Input
                          id="cat-name"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          placeholder="Ej: Deportes Acuáticos"
                          required
                          data-testid="category-name-input"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cat-icon">Icono</Label>
                          <Input
                            id="cat-icon"
                            value={newCategory.icon}
                            onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                            placeholder="🏆"
                            data-testid="category-icon-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cat-color">Color</Label>
                          <Input
                            id="cat-color"
                            type="color"
                            value={newCategory.color}
                            onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                            className="h-10"
                            data-testid="category-color-input"
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={formLoading} data-testid="category-submit-btn">
                        {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Crear Categoría
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={sportDialogOpen} onOpenChange={setSportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-amber-500 hover:bg-amber-600 font-bold uppercase tracking-wide" data-testid="add-sport-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuevo Deporte
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Añadir Deporte</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSport} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Categoría *</Label>
                        <Select 
                          value={newSport.category_id} 
                          onValueChange={(v) => setNewSport({ ...newSport, category_id: v })}
                        >
                          <SelectTrigger data-testid="sport-category-select">
                            <SelectValue placeholder="Seleccionar categoría" />
                          </SelectTrigger>
                          <SelectContent>
                            {sportsCatalog.map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sport-name">Nombre del deporte *</Label>
                        <Input
                          id="sport-name"
                          value={newSport.name}
                          onChange={(e) => setNewSport({ ...newSport, name: e.target.value })}
                          placeholder="Ej: Waterpolo"
                          required
                          data-testid="sport-name-input"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-amber-500 hover:bg-amber-600" 
                        disabled={formLoading || !newSport.category_id}
                        data-testid="sport-submit-btn"
                      >
                        {formLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Añadir Deporte
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-4">
              {sportsCatalog.map((category) => (
                <Card key={category.id} className="border-slate-200 overflow-hidden" data-testid={`category-card-${category.id}`}>
                  <div 
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleCategory(category.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        {category.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900">{category.name}</h3>
                        <p className="text-sm text-slate-500">{category.sports?.length || 0} deportes</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id, category.name); }}
                        data-testid={`delete-category-${category.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {expandedCategories[category.id] ? (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                  
                  {expandedCategories[category.id] && (
                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                      <div className="flex flex-wrap gap-2">
                        {category.sports?.map((sport) => (
                          <div 
                            key={sport.id} 
                            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 text-sm group"
                            data-testid={`sport-item-${sport.id}`}
                          >
                            <span>{sport.name}</span>
                            <button
                              onClick={() => handleDeleteSport(sport.id, sport.name)}
                              className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              data-testid={`delete-sport-${sport.id}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        {(!category.sports || category.sports.length === 0) && (
                          <p className="text-sm text-slate-400 italic">Sin deportes en esta categoría</p>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}

              {sportsCatalog.length === 0 && (
                <Card className="border-slate-200">
                  <CardContent className="py-16 text-center">
                    <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                      SIN CATEGORÍAS
                    </h3>
                    <p className="text-slate-500 mb-6">Crea categorías para organizar los deportes</p>
                    <Button onClick={() => setCategoryDialogOpen(true)} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Categoría
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AthletesPage;
