import React, { useState, useEffect, useCallback } from 'react';
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
  getTournaments, createTournament, deleteTournament, getTournament,
  addTournamentCategory, registerParticipant, generateBracket,
  getTournamentMatches, updateMatchScore, getCategoryStandings,
  getTeams, getAthletes, getEntities, getSportsCatalog, exportTournamentPDF
} from '../services/api';
import { 
  Plus, Trophy, Calendar, MapPin, Users, Loader2, Trash2, 
  Play, Settings, Download, Share2, Eye, ChevronRight, 
  Medal, Target, Flag, Clock, CheckCircle, AlertCircle,
  Swords, LayoutGrid, List, GitBranch
} from 'lucide-react';
import { toast } from 'sonner';

const TOURNAMENT_FORMATS = [
  { value: 'single_elimination', label: 'Eliminación Directa', icon: '🏆', description: 'El perdedor queda eliminado' },
  { value: 'double_elimination', label: 'Doble Eliminación', icon: '🔄', description: 'Dos derrotas para ser eliminado' },
  { value: 'round_robin', label: 'Todos contra Todos', icon: '🔁', description: 'Todos juegan contra todos' },
  { value: 'group_stage_knockout', label: 'Grupos + Eliminación', icon: '📊', description: 'Fase de grupos y luego llaves' },
  { value: 'league', label: 'Liga', icon: '📈', description: 'Sistema de puntos' },
  { value: 'swiss_system', label: 'Sistema Suizo', icon: '🇨🇭', description: 'Emparejamiento por nivel' },
  { value: 'consolation', label: 'Con Repechaje', icon: '🎯', description: 'Segunda oportunidad para perdedores' },
];

const SCORING_SYSTEMS = [
  { value: 'standard', label: 'Estándar (3-1-0)' },
  { value: 'olympic', label: 'Olímpico' },
  { value: 'fifa', label: 'FIFA' },
  { value: 'fiba', label: 'FIBA (Baloncesto)' },
  { value: 'itf', label: 'ITF (Tenis)' },
  { value: 'fivb', label: 'FIVB (Voleibol)' },
  { value: 'custom', label: 'Personalizado' },
];

const STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-700',
  registration: 'bg-blue-100 text-blue-700',
  seeding: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  registration: 'Inscripciones',
  seeding: 'Sembrando',
  in_progress: 'En Curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

const TournamentsPage = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [detailView, setDetailView] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sport: '',
    format: 'single_elimination',
    start_date: '',
    end_date: '',
    registration_deadline: '',
    venue: '',
    city: '',
    country: '',
    scoring_system: 'standard',
    points_win: 3,
    points_draw: 1,
    points_loss: 0,
    groups_count: 4,
    teams_per_group: 4,
    advance_per_group: 2,
    rules: '',
    primary_color: '#3B82F6',
    secondary_color: '#10B981',
    federation_id: '',
    club_id: '',
  });

  // Category form
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    gender: '',
    age_min: '',
    age_max: '',
    max_participants: ''
  });

  // Registration form
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({
    participant_type: 'team',
    participant_id: '',
    participant_name: '',
    seed: ''
  });

  // Match score form
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({
    participant1_score: '',
    participant2_score: ''
  });

  // Data for selectors
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [matches, setMatches] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tournamentsRes, teamsRes, athletesRes, entitiesRes, catalogRes] = await Promise.all([
        getTournaments(),
        getTeams(),
        getAthletes(),
        getEntities(),
        getSportsCatalog()
      ]);
      setTournaments(tournamentsRes.data);
      setTeams(teamsRes.data);
      setAthletes(athletesRes.data);
      setEntities(entitiesRes.data);
      setSportsCatalog(catalogRes.data);
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

  const fetchTournamentDetails = async (tournamentId) => {
    try {
      const [tournamentRes, matchesRes] = await Promise.all([
        getTournament(tournamentId),
        getTournamentMatches(tournamentId)
      ]);
      setSelectedTournament(tournamentRes.data);
      setMatches(matchesRes.data);
      setDetailView(true);
    } catch (error) {
      toast.error('Error al cargar torneo');
    }
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const payload = {
        ...formData,
        federation_id: formData.federation_id === 'none' ? null : formData.federation_id || null,
        club_id: formData.club_id === 'none' ? null : formData.club_id || null,
        groups_count: parseInt(formData.groups_count) || 4,
        teams_per_group: parseInt(formData.teams_per_group) || 4,
        advance_per_group: parseInt(formData.advance_per_group) || 2,
        categories: []
      };
      await createTournament(payload);
      toast.success('Torneo creado correctamente');
      setCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al crear torneo');
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', description: '', sport: '', format: 'single_elimination',
      start_date: '', end_date: '', registration_deadline: '',
      venue: '', city: '', country: '', scoring_system: 'standard',
      points_win: 3, points_draw: 1, points_loss: 0,
      groups_count: 4, teams_per_group: 4, advance_per_group: 2,
      rules: '', primary_color: '#3B82F6', secondary_color: '#10B981',
      federation_id: '', club_id: ''
    });
  };

  const handleDeleteTournament = async (id, name) => {
    if (!window.confirm(`¿Eliminar el torneo "${name}"?`)) return;
    try {
      await deleteTournament(id);
      toast.success('Torneo eliminado');
      fetchData();
    } catch (error) {
      toast.error('Error al eliminar torneo');
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!selectedTournament) return;
    setFormLoading(true);
    try {
      await addTournamentCategory(selectedTournament.id, {
        name: categoryForm.name,
        gender: categoryForm.gender || null,
        age_min: categoryForm.age_min ? parseInt(categoryForm.age_min) : null,
        age_max: categoryForm.age_max ? parseInt(categoryForm.age_max) : null,
        max_participants: categoryForm.max_participants ? parseInt(categoryForm.max_participants) : null
      });
      toast.success('Categoría añadida');
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', gender: '', age_min: '', age_max: '', max_participants: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al añadir categoría');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegisterParticipant = async (e) => {
    e.preventDefault();
    if (!selectedTournament || !selectedCategory) return;
    setFormLoading(true);
    try {
      await registerParticipant(selectedTournament.id, selectedCategory.id, {
        participant_type: registrationForm.participant_type,
        participant_id: registrationForm.participant_id,
        participant_name: registrationForm.participant_name,
        seed: registrationForm.seed ? parseInt(registrationForm.seed) : null
      });
      toast.success('Participante inscrito');
      setRegisterDialogOpen(false);
      setRegistrationForm({ participant_type: 'team', participant_id: '', participant_name: '', seed: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al inscribir participante');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenerateBracket = async (categoryId) => {
    if (!selectedTournament) return;
    try {
      await generateBracket(selectedTournament.id, categoryId);
      toast.success('Bracket generado correctamente');
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al generar bracket');
    }
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault();
    if (!selectedTournament || !selectedMatch) return;
    setFormLoading(true);
    try {
      await updateMatchScore(selectedTournament.id, selectedMatch.id, {
        participant1_score: parseInt(scoreForm.participant1_score) || 0,
        participant2_score: parseInt(scoreForm.participant2_score) || 0,
        status: 'completed'
      });
      toast.success('Resultado actualizado');
      setScoreDialogOpen(false);
      setScoreForm({ participant1_score: '', participant2_score: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al actualizar resultado');
    } finally {
      setFormLoading(false);
    }
  };

  const openScoreDialog = (match) => {
    setSelectedMatch(match);
    setScoreForm({
      participant1_score: match.participant1_score?.toString() || '',
      participant2_score: match.participant2_score?.toString() || ''
    });
    setScoreDialogOpen(true);
  };

  const handleExportPDF = () => {
    if (!selectedTournament) return;
    window.open(exportTournamentPDF(selectedTournament.id), '_blank');
  };

  const handleShare = () => {
    if (!selectedTournament?.share_id) return;
    const shareUrl = `${window.location.origin}/tournament/${selectedTournament.share_id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Enlace copiado al portapapeles');
  };

  const getFormatIcon = (format) => {
    const f = TOURNAMENT_FORMATS.find(f => f.value === format);
    return f?.icon || '🏆';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </DashboardLayout>
    );
  }

  // Tournament Detail View
  if (detailView && selectedTournament) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <Button variant="ghost" onClick={() => { setDetailView(false); setSelectedTournament(null); }} className="mb-2 -ml-2">
                <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Volver
              </Button>
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getFormatIcon(selectedTournament.format)}</span>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                    {selectedTournament.name}
                  </h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedTournament.status]}`}>
                      {STATUS_LABELS[selectedTournament.status]}
                    </span>
                    <span className="text-slate-500 text-sm flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {selectedTournament.start_date} - {selectedTournament.end_date}
                    </span>
                    {selectedTournament.venue && (
                      <span className="text-slate-500 text-sm flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedTournament.venue}, {selectedTournament.city}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleShare} data-testid="share-tournament-btn">
                <Share2 className="w-4 h-4 mr-2" /> Compartir
              </Button>
              <Button variant="outline" onClick={handleExportPDF} data-testid="export-tournament-pdf-btn">
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">Categorías</h2>
              <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="add-category-btn">
                    <Plus className="w-4 h-4 mr-1" /> Añadir Categoría
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nueva Categoría</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddCategory} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="Ej: Sub-17 Masculino"
                        required
                        data-testid="category-name-input"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Género</Label>
                        <Select value={categoryForm.gender} onValueChange={(v) => setCategoryForm({ ...categoryForm, gender: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Todos</SelectItem>
                            <SelectItem value="male">Masculino</SelectItem>
                            <SelectItem value="female">Femenino</SelectItem>
                            <SelectItem value="mixed">Mixto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Máx. Participantes</Label>
                        <Input
                          type="number"
                          min="2"
                          value={categoryForm.max_participants}
                          onChange={(e) => setCategoryForm({ ...categoryForm, max_participants: e.target.value })}
                          placeholder="16"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Edad Mínima</Label>
                        <Input
                          type="number"
                          min="5"
                          value={categoryForm.age_min}
                          onChange={(e) => setCategoryForm({ ...categoryForm, age_min: e.target.value })}
                          placeholder="15"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Edad Máxima</Label>
                        <Input
                          type="number"
                          min="5"
                          value={categoryForm.age_max}
                          onChange={(e) => setCategoryForm({ ...categoryForm, age_max: e.target.value })}
                          placeholder="17"
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={formLoading}>
                      {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Crear Categoría
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {selectedTournament.categories?.length > 0 ? (
              <div className="grid gap-4">
                {selectedTournament.categories.map((category) => (
                  <Card key={category.id} className="border-slate-200" data-testid={`category-${category.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Medal className="w-5 h-5 text-amber-500" />
                          {category.name}
                          <span className="text-sm font-normal text-slate-500">
                            ({category.participants?.length || 0} participantes)
                          </span>
                        </CardTitle>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => { setSelectedCategory(category); setRegisterDialogOpen(true); }}
                            data-testid={`register-${category.id}`}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Inscribir
                          </Button>
                          {category.participants?.length >= 2 && !category.bracket && (
                            <Button 
                              size="sm" 
                              onClick={() => handleGenerateBracket(category.id)}
                              data-testid={`generate-bracket-${category.id}`}
                            >
                              <GitBranch className="w-4 h-4 mr-1" /> Generar Bracket
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* Participants */}
                      {category.participants?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Participantes</h4>
                          <div className="flex flex-wrap gap-2">
                            {category.participants.map((p, idx) => (
                              <div 
                                key={p.id} 
                                className="px-3 py-1.5 bg-slate-100 rounded-full text-sm flex items-center gap-2"
                              >
                                {p.seed && <span className="text-xs text-amber-600 font-bold">#{p.seed}</span>}
                                {p.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Standings */}
                      {category.standings?.length > 0 && (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Tabla de Posiciones</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-slate-600">
                                  <th className="px-2 py-2 text-left">Pos</th>
                                  <th className="px-2 py-2 text-left">Equipo</th>
                                  <th className="px-2 py-2 text-center">PJ</th>
                                  <th className="px-2 py-2 text-center">G</th>
                                  <th className="px-2 py-2 text-center">E</th>
                                  <th className="px-2 py-2 text-center">P</th>
                                  <th className="px-2 py-2 text-center">GF</th>
                                  <th className="px-2 py-2 text-center">GC</th>
                                  <th className="px-2 py-2 text-center">DG</th>
                                  <th className="px-2 py-2 text-center font-bold">Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {category.standings.map((s, idx) => (
                                  <tr key={s.id} className={idx < 2 ? 'bg-green-50' : ''}>
                                    <td className="px-2 py-2 font-bold">{idx + 1}</td>
                                    <td className="px-2 py-2">{s.name}</td>
                                    <td className="px-2 py-2 text-center">{s.played}</td>
                                    <td className="px-2 py-2 text-center">{s.won}</td>
                                    <td className="px-2 py-2 text-center">{s.drawn}</td>
                                    <td className="px-2 py-2 text-center">{s.lost}</td>
                                    <td className="px-2 py-2 text-center">{s.goals_for}</td>
                                    <td className="px-2 py-2 text-center">{s.goals_against}</td>
                                    <td className="px-2 py-2 text-center">{s.goal_difference}</td>
                                    <td className="px-2 py-2 text-center font-bold text-blue-600">{s.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Matches */}
                      {matches.filter(m => m.category_id === category.id).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-slate-700 mb-2">Partidos</h4>
                          <div className="space-y-2">
                            {matches
                              .filter(m => m.category_id === category.id)
                              .sort((a, b) => (a.round_number - b.round_number) || (a.match_number - b.match_number))
                              .map((match) => (
                                <div 
                                  key={match.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    match.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                                  }`}
                                  data-testid={`match-${match.id}`}
                                >
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-slate-500 w-24">{match.round_name || `Ronda ${match.round_number}`}</span>
                                    <div className="flex items-center gap-3 min-w-[300px]">
                                      <span className={`font-medium ${match.winner_id === match.participant1_id ? 'text-green-700' : ''}`}>
                                        {match.participant1_name || 'TBD'}
                                      </span>
                                      <div className="flex items-center gap-1 px-3 py-1 bg-white rounded border">
                                        <span className="font-bold">{match.participant1_score ?? '-'}</span>
                                        <span className="text-slate-300">:</span>
                                        <span className="font-bold">{match.participant2_score ?? '-'}</span>
                                      </div>
                                      <span className={`font-medium ${match.winner_id === match.participant2_id ? 'text-green-700' : ''}`}>
                                        {match.participant2_name || 'TBD'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      match.status === 'completed' ? 'bg-green-100 text-green-700' :
                                      match.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
                                      'bg-slate-100 text-slate-600'
                                    }`}>
                                      {match.status === 'completed' ? 'Finalizado' :
                                       match.status === 'in_progress' ? 'En Curso' : 'Programado'}
                                    </span>
                                    {match.status !== 'completed' && match.participant1_id && match.participant2_id && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => openScoreDialog(match)}
                                        data-testid={`update-score-${match.id}`}
                                      >
                                        Resultado
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                  <LayoutGrid className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">No hay categorías. Añade una para comenzar.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Register Participant Dialog */}
          <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Inscribir Participante - {selectedCategory?.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegisterParticipant} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={registrationForm.participant_type} 
                    onValueChange={(v) => setRegistrationForm({ ...registrationForm, participant_type: v, participant_id: '', participant_name: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team">Equipo</SelectItem>
                      <SelectItem value="athlete">Atleta Individual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Participante *</Label>
                  <Select 
                    value={registrationForm.participant_id} 
                    onValueChange={(v) => {
                      const list = registrationForm.participant_type === 'team' ? teams : athletes;
                      const selected = list.find(x => x.id === v);
                      setRegistrationForm({ 
                        ...registrationForm, 
                        participant_id: v, 
                        participant_name: selected?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger data-testid="participant-select">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(registrationForm.participant_type === 'team' ? teams : athletes).map(item => (
                        <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cabeza de Serie (Seed)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={registrationForm.seed}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, seed: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={formLoading || !registrationForm.participant_id}>
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Inscribir
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Update Score Dialog */}
          <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Actualizar Resultado</DialogTitle>
              </DialogHeader>
              {selectedMatch && (
                <form onSubmit={handleUpdateScore} className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <p className="font-medium mb-2">{selectedMatch.participant1_name}</p>
                      <Input
                        type="number"
                        min="0"
                        value={scoreForm.participant1_score}
                        onChange={(e) => setScoreForm({ ...scoreForm, participant1_score: e.target.value })}
                        className="text-center text-2xl font-bold"
                        data-testid="score1-input"
                      />
                    </div>
                    <div className="text-center text-2xl text-slate-400">VS</div>
                    <div className="text-center">
                      <p className="font-medium mb-2">{selectedMatch.participant2_name}</p>
                      <Input
                        type="number"
                        min="0"
                        value={scoreForm.participant2_score}
                        onChange={(e) => setScoreForm({ ...scoreForm, participant2_score: e.target.value })}
                        className="text-center text-2xl font-bold"
                        data-testid="score2-input"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={formLoading}>
                    {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Guardar Resultado
                  </Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    );
  }

  // Tournaments List View
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              TORNEOS Y EVENTOS
            </h1>
            <p className="text-slate-500 mt-1">Crea y gestiona competencias deportivas</p>
          </div>
          
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-bold uppercase tracking-wide shadow-lg" data-testid="create-tournament-btn">
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Torneo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2" style={{ fontFamily: 'Barlow Condensed' }}>
                  <Trophy className="w-6 h-6 text-amber-500" />
                  CREAR TORNEO
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateTournament} className="space-y-6 mt-4">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Información Básica</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Nombre del Torneo *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: Copa Primavera 2026"
                        required
                        data-testid="tournament-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Deporte *</Label>
                      <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                        <SelectTrigger data-testid="tournament-sport-select">
                          <SelectValue placeholder="Seleccionar deporte" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {sportsCatalog.map(cat => (
                            <React.Fragment key={cat.id}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                                {cat.icon} {cat.name}
                              </div>
                              {cat.sports?.map(sport => (
                                <SelectItem key={sport.id} value={sport.name}>{sport.name}</SelectItem>
                              ))}
                            </React.Fragment>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Formato *</Label>
                      <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                        <SelectTrigger data-testid="tournament-format-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOURNAMENT_FORMATS.map(f => (
                            <SelectItem key={f.value} value={f.value}>
                              <span className="flex items-center gap-2">
                                <span>{f.icon}</span>
                                <span>{f.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descripción del torneo..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Fechas</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha Inicio *</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        required
                        data-testid="tournament-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha Fin *</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        required
                        data-testid="tournament-end-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cierre Inscripciones</Label>
                      <Input
                        type="date"
                        value={formData.registration_deadline}
                        onChange={(e) => setFormData({ ...formData, registration_deadline: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Ubicación</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Sede</Label>
                      <Input
                        value={formData.venue}
                        onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                        placeholder="Estadio, Complejo..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ciudad</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Ciudad"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>País</Label>
                      <Input
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="País"
                      />
                    </div>
                  </div>
                </div>

                {/* Scoring */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Sistema de Puntuación</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Sistema</Label>
                      <Select value={formData.scoring_system} onValueChange={(v) => setFormData({ ...formData, scoring_system: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_SYSTEMS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Pts. Victoria</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.points_win}
                        onChange={(e) => setFormData({ ...formData, points_win: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pts. Empate</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.points_draw}
                        onChange={(e) => setFormData({ ...formData, points_draw: parseInt(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pts. Derrota</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.points_loss}
                        onChange={(e) => setFormData({ ...formData, points_loss: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                {/* Groups Config (if applicable) */}
                {(formData.format === 'group_stage_knockout' || formData.format === 'round_robin') && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Configuración de Grupos</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Número de Grupos</Label>
                        <Input
                          type="number"
                          min="2"
                          max="8"
                          value={formData.groups_count}
                          onChange={(e) => setFormData({ ...formData, groups_count: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Equipos por Grupo</Label>
                        <Input
                          type="number"
                          min="2"
                          max="8"
                          value={formData.teams_per_group}
                          onChange={(e) => setFormData({ ...formData, teams_per_group: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Clasifican por Grupo</Label>
                        <Input
                          type="number"
                          min="1"
                          max="4"
                          value={formData.advance_per_group}
                          onChange={(e) => setFormData({ ...formData, advance_per_group: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Affiliation */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Afiliación (Opcional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Federación</Label>
                      <Select value={formData.federation_id} onValueChange={(v) => setFormData({ ...formData, federation_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ninguna" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguna</SelectItem>
                          {entities.filter(e => e.entity_type === 'federation').map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Club Organizador</Label>
                      <Select value={formData.club_id} onValueChange={(v) => setFormData({ ...formData, club_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Ninguno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Ninguno</SelectItem>
                          {entities.filter(e => e.entity_type === 'club').map(e => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Visual */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Colores</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Color Principal</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-14 h-10"
                        />
                        <Input
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Color Secundario</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="w-14 h-10"
                        />
                        <Input
                          value={formData.secondary_color}
                          onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-bold uppercase tracking-wide"
                  disabled={formLoading}
                  data-testid="submit-tournament-btn"
                >
                  {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Crear Torneo
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tournament Cards */}
        {tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card 
                key={tournament.id} 
                className="border-slate-200 hover:border-amber-300 transition-all duration-200 cursor-pointer group overflow-hidden"
                onClick={() => fetchTournamentDetails(tournament.id)}
                data-testid={`tournament-card-${tournament.id}`}
              >
                <div 
                  className="h-2" 
                  style={{ background: `linear-gradient(to right, ${tournament.primary_color}, ${tournament.secondary_color})` }}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getFormatIcon(tournament.format)}</span>
                      <div>
                        <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{tournament.name}</h3>
                        <p className="text-sm text-slate-500">{tournament.sport}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tournament.status]}`}>
                      {STATUS_LABELS[tournament.status]}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>{tournament.start_date} - {tournament.end_date}</span>
                    </div>
                    {tournament.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{tournament.venue}, {tournament.city}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-slate-400" />
                      <span>{tournament.categories?.length || 0} categorías</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-xs text-slate-400">
                      {TOURNAMENT_FORMATS.find(f => f.value === tournament.format)?.label}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => { e.stopPropagation(); handleDeleteTournament(tournament.id, tournament.name); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <Trophy className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                SIN TORNEOS
              </h3>
              <p className="text-slate-500 mb-6">Crea tu primer torneo para comenzar</p>
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                className="bg-gradient-to-r from-amber-500 to-orange-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Crear Torneo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TournamentsPage;
