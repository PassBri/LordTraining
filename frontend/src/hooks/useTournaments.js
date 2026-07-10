import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  getTournaments, createTournament, deleteTournament, getTournament,
  addTournamentCategory, registerParticipant, generateBracket,
  getTournamentMatches, updateMatchScore
} from '../services/api';

/**
 * useTournaments({ t })
 *
 * Torneos: estado, constantes, fetch y handlers (CRUD, categorías, brackets, scores).
 */
export const useTournaments = ({ t }) => {
  const [tournaments, setTournaments] = useState([]);
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetailView, setTournamentDetailView] = useState(false);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [tournamentForm, setTournamentForm] = useState({
    name: '', description: '', sport: '', format: 'single_elimination',
    start_date: '', end_date: '', venue: '', city: '', scoring_system: 'standard',
    points_win: 3, points_draw: 1, points_loss: 0, primary_color: '#3B82F6', secondary_color: '#10B981'
  });
  const [categoryDialogOpenTournament, setCategoryDialogOpenTournament] = useState(false);
  const [tournamentCategoryForm, setTournamentCategoryForm] = useState({ name: '', gender: '', max_participants: '' });
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournamentCategory, setSelectedTournamentCategory] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({ participant_type: 'team', participant_id: '', participant_name: '', seed: '' });
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ participant1_score: '', participant2_score: '' });

  const TOURNAMENT_FORMATS = [
    { value: 'single_elimination', label: t('data.x_eliminacion_directa'), icon: '🏆' },
    { value: 'double_elimination', label: t('data.x_doble_eliminacion'), icon: '🔄' },
    { value: 'round_robin', label: 'Todos contra Todos', icon: '🔁' },
    { value: 'group_stage_knockout', label: t('data.x_grupos_eliminacion'), icon: '📊' },
    { value: 'league', label: 'Liga', icon: '📈' },
  ];
  const STATUS_COLORS = { draft: 'bg-slate-100 text-slate-700', registration: 'bg-blue-100 text-blue-700', in_progress: 'bg-green-100 text-green-700', completed: 'bg-purple-100 text-purple-700' };
  const STATUS_LABELS = { draft: 'Borrador', registration: 'Inscripciones', in_progress: 'En Curso', completed: 'Finalizado' };
  const getFormatIcon = (format) => TOURNAMENT_FORMATS.find(f => f.value === format)?.icon || '🏆';

  const fetchTournamentsData = async () => {
    try {
      const res = await getTournaments();
      setTournaments(res.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    }
  };

  const fetchTournamentDetails = async (tournamentId) => {
    try {
      const [tournamentRes, matchesRes] = await Promise.all([
        getTournament(tournamentId),
        getTournamentMatches(tournamentId)
      ]);
      setSelectedTournament(tournamentRes.data);
      setTournamentMatches(matchesRes.data);
      setTournamentDetailView(true);
    } catch (error) {
      toast.error(t('data.error_al_cargar_torneo'));
    }
  };

  const handleCreateTournament = async () => {
    if (!tournamentForm.name) return;
    try {
      await createTournament({ ...tournamentForm, categories: [] });
      toast.success('Torneo creado');
      setTournamentDialogOpen(false);
      setTournamentForm({ name: '', description: '', sport: '', format: 'single_elimination', start_date: '', end_date: '', venue: '', city: '', scoring_system: 'standard', points_win: 3, points_draw: 1, points_loss: 0, primary_color: '#3B82F6', secondary_color: '#10B981' });
      fetchTournamentsData();
    } catch (error) {
      toast.error(t('data.error_al_crear_torneo'));
    }
  };

  const handleDeleteTournament = async (id, name) => {
    if (!window.confirm(`¿Eliminar el torneo "${name}"?`)) return;
    try {
      await deleteTournament(id);
      toast.success('Torneo eliminado');
      fetchTournamentsData();
    } catch (error) {
      toast.error(t('data.error_al_eliminar_torneo'));
    }
  };

  const handleAddTournamentCategory = async () => {
    if (!selectedTournament || !tournamentCategoryForm.name) return;
    try {
      await addTournamentCategory(selectedTournament.id, {
        name: tournamentCategoryForm.name,
        gender: tournamentCategoryForm.gender || null,
        max_participants: tournamentCategoryForm.max_participants ? parseInt(tournamentCategoryForm.max_participants) : null
      });
      toast.success(t('data.categoria_anadida'));
      setCategoryDialogOpenTournament(false);
      setTournamentCategoryForm({ name: '', gender: '', max_participants: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error(t('data.error_al_anadir_categoria'));
    }
  };

  const handleRegisterParticipant = async () => {
    if (!selectedTournament || !selectedTournamentCategory || !registrationForm.participant_id) return;
    try {
      await registerParticipant(selectedTournament.id, selectedTournamentCategory.id, {
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
      toast.error(t('data.error_al_inscribir'));
    }
  };

  const handleGenerateBracket = async (categoryId) => {
    if (!selectedTournament) return;
    try {
      await generateBracket(selectedTournament.id, categoryId);
      toast.success('Bracket generado');
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error(t('data.error_al_generar_bracket'));
    }
  };

  const handleUpdateScore = async () => {
    if (!selectedTournament || !selectedMatch) return;
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
      toast.error(t('data.error_al_actualizar_resultado'));
    }
  };

  useEffect(() => { fetchTournamentsData(); }, []);

  return {
    tournaments, setTournaments,
    tournamentDialogOpen, setTournamentDialogOpen,
    selectedTournament, setSelectedTournament,
    tournamentDetailView, setTournamentDetailView,
    tournamentMatches, setTournamentMatches,
    tournamentForm, setTournamentForm,
    categoryDialogOpenTournament, setCategoryDialogOpenTournament,
    tournamentCategoryForm, setTournamentCategoryForm,
    registerDialogOpen, setRegisterDialogOpen,
    selectedTournamentCategory, setSelectedTournamentCategory,
    registrationForm, setRegistrationForm,
    scoreDialogOpen, setScoreDialogOpen,
    selectedMatch, setSelectedMatch,
    scoreForm, setScoreForm,
    TOURNAMENT_FORMATS, STATUS_COLORS, STATUS_LABELS, getFormatIcon,
    fetchTournamentsData, fetchTournamentDetails,
    handleCreateTournament, handleDeleteTournament, handleAddTournamentCategory,
    handleRegisterParticipant, handleGenerateBracket, handleUpdateScore,
  };
};

export default useTournaments;
