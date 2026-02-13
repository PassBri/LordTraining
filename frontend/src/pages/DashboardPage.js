import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { getDashboardStats, getAthletes, seedExercises, getTournaments, createTournament, deleteTournament, getTournament, addTournamentCategory, registerParticipant, generateBracket, getTournamentMatches, updateMatchScore, exportTournamentPDF, getTeams as fetchTeamsApi } from '../services/api';
import { 
  Target, Send, Heart, Zap, Brain, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  FileText, Users, Clipboard, Calendar, Award, BookOpen, 
  Activity, BarChart, LineChart, Loader2, LogOut, Save, Download, Layers, Plus, Dumbbell,
  Shield, UserCheck, User, UserCircle, Settings, LayoutDashboard, Landmark,
  Building2, Building, GraduationCap, Trophy, Timer, Flame, Gamepad2, Lightbulb, X, Trash2,
  Medal, MapPin, LayoutGrid, GitBranch, Share2, History, Filter, CreditCard, Sparkles
} from 'lucide-react';
import { 
  LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { toast } from 'sonner';
import PreviousPlanAnalysis from '../components/PreviousPlanAnalysis';
import SessionPlanning from '../components/SessionPlanning';
import SportCharacterization from '../components/SportCharacterization';
import AthleteCharacterization from '../components/AthleteCharacterization';
import HealthRecords from '../components/HealthRecords';
import CompetitionAnalysis from '../components/CompetitionAnalysis';
import TrainingStages from '../components/TrainingStages';
import PeriodizationModels from '../components/PeriodizationModels';
import ComprehensiveTrainingPlanner from '../components/ComprehensiveTrainingPlanner';
import TrainingMethods from '../components/TrainingMethods';
import AnthropometricData from '../components/AnthropometricData';
import TestEvaluations from '../components/TestEvaluations';
import TrainingLoad from '../components/TrainingLoad';
import GraphicPlan from '../components/GraphicPlan';
import AthleteSummary from '../components/AthleteSummary';
import PeriodizationPlanner from '../components/PeriodizationPlanner';
import ExerciseLibrary from '../components/ExerciseLibrary';
import PeriodizationSystem from '../components/PeriodizationSystem';
import PeriodizationWizard from '../components/PeriodizationWizard';
import PlansList from '../components/PlansList';
import EntityManager from '../components/EntityManager';
import ControlPanel from '../components/ControlPanel';
import EntityDashboard from '../components/EntityDashboard';
import SmartAlerts from '../components/SmartAlerts';
import PDFExportModal from '../components/PDFExportModal';
import ObjectivesIndicators from '../components/ObjectivesIndicators';
import TrainingSystemHub from '../components/TrainingSystemHub';
import TournamentManager from '../components/TournamentManager';
import AutoTestingSystem from '../components/AutoTestingSystem';
import AITrainingAssistant from '../components/AITrainingAssistant';

// Definición de roles disponibles
const USER_ROLES = [
  { id: 'admin', name: 'Administrador', description: 'Acceso total al sistema', icon: Shield },
  { id: 'coach', name: 'Entrenador', description: 'Puede crear planes para múltiples atletas', icon: UserCheck },
  { id: 'personal_trainer', name: 'Entrenador Personal', description: 'Enfocado en clientes individuales', icon: Dumbbell },
  { id: 'athlete', name: 'Atleta', description: 'Solo puede ver su propio plan', icon: User },
  { id: 'team', name: 'Equipo', description: 'Grupo de atletas con plan compartido', icon: Users },
  { id: 'user', name: 'Usuario', description: 'Rol básico sin atletas asignados', icon: UserCircle }
];

const DashboardPage = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  // UI State
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState('panel');
  const [activeDataSection, setActiveDataSection] = useState('athletes');
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('macrociclo');
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: 'Bienvenido al asistente de planificación deportiva. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Form States
  const [newAthlete, setNewAthlete] = useState({
    name: '', email: '', birthDate: '', gender: '', sport: '', category: '', level: '',
    federation: '', club: '', school: ''
  });
  const [newEvent, setNewEvent] = useState({
    name: '', type: '', date: '', location: '', objective: '', priority: ''
  });
  const [events, setEvents] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [savingAthlete, setSavingAthlete] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [periodizationData, setPeriodizationData] = useState(null);
  
  // Entity States for Athlete Affiliations
  const [entities, setEntities] = useState([]);
  const [athleteFilterEntity, setAthleteFilterEntity] = useState('all');
  
  // Team States
  const [teams, setTeams] = useState([]);
  const [newTeam, setNewTeam] = useState({
    name: '', sport: '', category: '', federation: '', club: '', school: ''
  });
  const [activeAthleteTab, setActiveAthleteTab] = useState('athletes');
  
  // Sports Catalog State
  const [sportsCatalog, setSportsCatalog] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', icon: '🏆', color: '#3B82F6' });
  const [newSport, setNewSport] = useState({ name: '', category_id: '' });
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSport, setShowAddSport] = useState(null); // category_id or null
  
  // PDF Export Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // ====== SIDEBAR VIEW STATE ======
  const [sidebarView, setSidebarView] = useState('assistant'); // 'assistant' or 'history'
  const [generatedPlans, setGeneratedPlans] = useState([]); // List of generated plans

  // ====== GLOBAL CONTEXT STATE (Barra Superior) ======
  // Initialize from localStorage for persistence
  const [globalContext, setGlobalContext] = useState(() => {
    const saved = localStorage.getItem('train_global_context');
    return saved ? JSON.parse(saved) : {
      entityId: 'all',
      teamId: 'all',
      athleteId: 'all',
      sportId: 'all'
    };
  });

  // Save context to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('train_global_context', JSON.stringify(globalContext));
  }, [globalContext]);

  // Cascading filter handlers
  const handleEntityChange = (value) => {
    setGlobalContext({ entityId: value, teamId: 'all', athleteId: 'all', sportId: 'all' });
  };

  const handleTeamChange = (value) => {
    setGlobalContext(prev => ({ ...prev, teamId: value, athleteId: 'all' }));
  };

  const handleAthleteChange = (value) => {
    setGlobalContext(prev => ({ ...prev, athleteId: value }));
  };

  const handleSportChange = (value) => {
    setGlobalContext(prev => ({ ...prev, sportId: value }));
  };

  // Filtered data based on context
  const filteredTeams = globalContext.entityId === 'all' 
    ? teams 
    : teams.filter(t => t.federation === globalContext.entityId || t.club === globalContext.entityId);
  
  const filteredAthletes = athletes.filter(a => {
    if (globalContext.entityId !== 'all' && a.federation !== globalContext.entityId && a.club !== globalContext.entityId) return false;
    if (globalContext.teamId !== 'all' && a.team_id !== globalContext.teamId) return false;
    return true;
  });

  // Get unique sports from catalog
  const allSports = sportsCatalog.flatMap(cat => cat.sports || []);

  // Load generated plans from localStorage on mount
  useEffect(() => {
    const savedPlans = localStorage.getItem('train_generated_plans');
    if (savedPlans) {
      setGeneratedPlans(JSON.parse(savedPlans));
    }
  }, []);

  // Save a new generated plan
  const saveGeneratedPlan = (plan) => {
    const newPlan = {
      id: Date.now().toString(),
      ...plan,
      createdAt: new Date().toISOString()
    };
    const updatedPlans = [newPlan, ...generatedPlans];
    setGeneratedPlans(updatedPlans);
    localStorage.setItem('train_generated_plans', JSON.stringify(updatedPlans));
    return newPlan;
  };

  // Delete a plan
  const deletePlan = (planId) => {
    const updatedPlans = generatedPlans.filter(p => p.id !== planId);
    setGeneratedPlans(updatedPlans);
    localStorage.setItem('train_generated_plans', JSON.stringify(updatedPlans));
  };

  // Start new plan creation
  const handleNewPlan = () => {
    setSidebarView('assistant');
    toast.info('Usa el asistente IA para ayudarte a planificar');
  };

  // Tournaments State - Load from localStorage
  const [tournaments, setTournaments] = useState(() => {
    const saved = localStorage.getItem('train_tournaments');
    return saved ? JSON.parse(saved) : [];
  });
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [tournamentDetailView, setTournamentDetailView] = useState(false);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [tournamentForm, setTournamentForm] = useState({
    name: '', description: '', sport: '', format: 'single_elimination',
    start_date: '', end_date: '', venue: '', city: '', scoring_system: 'standard',
    points_win: 3, points_draw: 1, points_loss: 0, primary_color: '#3B82F6', secondary_color: '#10B981'
  });
  
  // Save tournaments to localStorage when they change
  useEffect(() => {
    localStorage.setItem('train_tournaments', JSON.stringify(tournaments));
  }, [tournaments]);
  
  const [categoryDialogOpenTournament, setCategoryDialogOpenTournament] = useState(false);
  const [tournamentCategoryForm, setTournamentCategoryForm] = useState({ name: '', gender: '', max_participants: '' });
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedTournamentCategory, setSelectedTournamentCategory] = useState(null);
  const [registrationForm, setRegistrationForm] = useState({ participant_type: 'team', participant_id: '', participant_name: '', seed: '' });
  const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scoreForm, setScoreForm] = useState({ participant1_score: '', participant2_score: '' });

  // Tournament constants
  const TOURNAMENT_FORMATS = [
    { value: 'single_elimination', label: 'Eliminación Directa', icon: '🏆' },
    { value: 'double_elimination', label: 'Doble Eliminación', icon: '🔄' },
    { value: 'round_robin', label: 'Todos contra Todos', icon: '🔁' },
    { value: 'group_stage_knockout', label: 'Grupos + Eliminación', icon: '📊' },
    { value: 'league', label: 'Liga', icon: '📈' },
  ];
  const STATUS_COLORS = { draft: 'bg-slate-100 text-slate-700', registration: 'bg-blue-100 text-blue-700', in_progress: 'bg-green-100 text-green-700', completed: 'bg-purple-100 text-purple-700' };
  const STATUS_LABELS = { draft: 'Borrador', registration: 'Inscripciones', in_progress: 'En Curso', completed: 'Finalizado' };

  // API Base URL
  const API_URL = process.env.REACT_APP_BACKEND_URL;

  // Fetch Sports Catalog
  const fetchSportsCatalog = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/catalog`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSportsCatalog(data);
      }
    } catch (error) {
      console.error('Error fetching sports catalog:', error);
    }
  };

  // Create Sport Category
  const handleCreateCategory = async () => {
    if (!newCategory.name) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCategory)
      });
      if (response.ok) {
        await fetchSportsCatalog();
        setNewCategory({ name: '', icon: '🏆', color: '#3B82F6' });
        setShowAddCategory(false);
      }
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  // Create Sport
  const handleCreateSport = async (categoryId) => {
    if (!newSport.name) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/sports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newSport.name, category_id: categoryId })
      });
      if (response.ok) {
        await fetchSportsCatalog();
        setNewSport({ name: '', category_id: '' });
        setShowAddSport(null);
      }
    } catch (error) {
      console.error('Error creating sport:', error);
    }
  };

  // Delete Sport
  const handleDeleteSport = async (sportId) => {
    if (!window.confirm('¿Eliminar este deporte?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/sports/${sportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchSportsCatalog();
    } catch (error) {
      console.error('Error deleting sport:', error);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('¿Eliminar esta categoría y todos sus deportes?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/sports/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await fetchSportsCatalog();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  // Fetch tournaments
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
      toast.error('Error al cargar torneo');
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
      toast.error('Error al crear torneo');
    }
  };

  const handleDeleteTournament = async (id, name) => {
    if (!window.confirm(`¿Eliminar el torneo "${name}"?`)) return;
    try {
      await deleteTournament(id);
      toast.success('Torneo eliminado');
      fetchTournamentsData();
    } catch (error) {
      toast.error('Error al eliminar torneo');
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
      toast.success('Categoría añadida');
      setCategoryDialogOpenTournament(false);
      setTournamentCategoryForm({ name: '', gender: '', max_participants: '' });
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al añadir categoría');
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
      toast.error('Error al inscribir');
    }
  };

  const handleGenerateBracket = async (categoryId) => {
    if (!selectedTournament) return;
    try {
      await generateBracket(selectedTournament.id, categoryId);
      toast.success('Bracket generado');
      fetchTournamentDetails(selectedTournament.id);
    } catch (error) {
      toast.error('Error al generar bracket');
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
      toast.error('Error al actualizar resultado');
    }
  };

  const getFormatIcon = (format) => TOURNAMENT_FORMATS.find(f => f.value === format)?.icon || '🏆';

  // Fetch athletes from backend
  const fetchAthletes = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/athletes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAthletes(data);
      }
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  // Fetch entities for athlete affiliations
  const fetchEntities = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/entities`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEntities(data);
      }
    } catch (error) {
      console.error('Error fetching entities:', error);
    }
  };

  // Update user profile (including role)
  const handleUpdateProfile = async (newRole) => {
    setUpdatingProfile(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        const updatedUser = await response.json();
        if (updateUser) {
          updateUser(updatedUser);
        }
        toast.success('Rol actualizado correctamente');
        setShowProfileDialog(false);
      } else {
        toast.error('Error al actualizar el perfil');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    }
    setUpdatingProfile(false);
  };

  // Create new athlete
  const handleCreateAthlete = async () => {
    if (!newAthlete.name || !newAthlete.sport) {
      alert('Por favor ingresa al menos el nombre y el deporte');
      return;
    }
    setSavingAthlete(true);
    try {
      const token = localStorage.getItem('train_token');
      // Build affiliations array from selected entities
      const affiliations = [];
      if (newAthlete.federation) affiliations.push(newAthlete.federation);
      if (newAthlete.club) affiliations.push(newAthlete.club);
      if (newAthlete.school) affiliations.push(newAthlete.school);
      
      const response = await fetch(`${API_URL}/api/athletes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newAthlete.name,
          email: newAthlete.email || null,
          sport: newAthlete.sport.toLowerCase() || 'other',
          age: newAthlete.birthDate ? new Date().getFullYear() - new Date(newAthlete.birthDate).getFullYear() : 20,
          level: newAthlete.level || 'intermedio',
          notes: `Categoría: ${newAthlete.category || 'N/A'}, Género: ${newAthlete.gender || 'N/A'}`,
          affiliations: affiliations
        })
      });
      if (response.ok) {
        await fetchAthletes();
        setNewAthlete({ name: '', email: '', birthDate: '', gender: '', sport: '', category: '', level: '', federation: '', club: '', school: '' });
        toast.success('Atleta creado exitosamente');
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Error al crear atleta');
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      toast.error('Error al crear atleta');
    }
    setSavingAthlete(false);
  };

  // Delete athlete
  const handleDeleteAthlete = async (athleteId) => {
    if (!window.confirm('¿Estás seguro de eliminar este atleta?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/athletes/${athleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchAthletes();
        if (selectedAthleteId === athleteId) setSelectedAthleteId(null);
      }
    } catch (error) {
      console.error('Error deleting athlete:', error);
    }
  };

  // Team Management Functions
  const fetchTeams = async () => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/teams`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTeams(data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name) {
      alert('Por favor ingresa el nombre del equipo');
      return;
    }
    try {
      const token = localStorage.getItem('train_token');
      const teamData = {
        name: newTeam.name,
        sport: newTeam.sport || 'other',
        category: newTeam.category || '',
        affiliations: {
          federation: newTeam.federation || null,
          club: newTeam.club || null,
          school: newTeam.school || null
        },
        athletes: []
      };
      const response = await fetch(`${API_URL}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(teamData)
      });
      if (response.ok) {
        await fetchTeams();
        setNewTeam({ name: '', sport: '', category: '', federation: '', club: '', school: '' });
      }
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('¿Estás seguro de eliminar este equipo?')) return;
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchTeams();
      }
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  // Fetch events for selected athlete
  const fetchEvents = async (athleteId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/events-calendar/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  // Save events
  const handleSaveEvent = async () => {
    if (!selectedAthleteId) {
      alert('Selecciona un atleta primero');
      return;
    }
    if (!newEvent.name || !newEvent.date) {
      alert('Por favor ingresa al menos el nombre y la fecha');
      return;
    }
    setSavingEvent(true);
    try {
      const token = localStorage.getItem('train_token');
      const updatedEvents = [...events, { ...newEvent, id: Date.now().toString() }];
      const response = await fetch(`${API_URL}/api/events-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          athlete_id: selectedAthleteId,
          events: updatedEvents
        })
      });
      if (response.ok) {
        setEvents(updatedEvents);
        setNewEvent({ name: '', type: '', date: '', location: '', objective: '', priority: '' });
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
    setSavingEvent(false);
  };

  // Delete event
  const handleDeleteEvent = async (eventId) => {
    if (!selectedAthleteId) return;
    try {
      const token = localStorage.getItem('train_token');
      const updatedEvents = events.filter(e => e.id !== eventId);
      await fetch(`${API_URL}/api/events-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          athlete_id: selectedAthleteId,
          events: updatedEvents
        })
      });
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Fetch objectives for selected athlete
  const fetchObjectives = async (athleteId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/objectives/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setObjectives(data.objectives || []);
      } else {
        setObjectives([]);
      }
    } catch (error) {
      console.error('Error fetching objectives:', error);
      setObjectives([]);
    }
  };

  // Fetch periodization data for selected athlete
  const fetchPeriodizationData = async (athleteId) => {
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/periodization/${athleteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPeriodizationData(data);
      } else {
        setPeriodizationData(null);
      }
    } catch (error) {
      console.error('Error fetching periodization:', error);
      setPeriodizationData(null);
    }
  };

  // Effect to fetch data when athlete is selected
  useEffect(() => {
    if (selectedAthleteId) {
      fetchEvents(selectedAthleteId);
      fetchObjectives(selectedAthleteId);
      fetchPeriodizationData(selectedAthleteId);
    } else {
      setPeriodizationData(null);
    }
  }, [selectedAthleteId]);

  // Navigation items for "Datos" panel - NUEVO FLUJO LÓGICO DEL ENTRENADOR
  const navItems = [
    // === 1. INFORMACIÓN (Fusión de Atletas + Organización) ===
    { id: 'entities', label: 'Entidades (Federación, Club...)', icon: Landmark, section: 'informacion' },
    { id: 'athletes', label: 'Atletas y Equipos', icon: Users, section: 'informacion' },
    { id: 'sport-char', label: 'Caracterización del Deporte', icon: Target, section: 'informacion' },
    { id: 'athlete-char', label: 'Caracterización del Deportista', icon: Users, section: 'informacion' },
    
    // === 2. EVALUACIÓN INICIAL ===
    { id: 'anthropometric', label: 'Datos Antropométricos', icon: LineChart, section: 'evaluacion' },
    { id: 'diagnostic', label: 'Historial Médico', icon: Heart, section: 'evaluacion' },
    
    // === 3. COMPETENCIAS Y OBJETIVOS ===
    { id: 'events', label: 'Calendario de Competencias', icon: Calendar, section: 'competencias' },
    { id: 'objectives', label: 'Objetivos del Plan', icon: Target, section: 'competencias' },
    { id: 'prev-plan', label: 'Análisis del Plan Anterior', icon: FileText, section: 'competencias' },
    
    // === 4. SISTEMA DE ENTRENAMIENTO (EJE CENTRAL) ===
    { id: 'training-system', label: 'Sistema de Entrenamiento', icon: Activity, section: 'entrenamiento' },
    { id: 'exercises', label: 'Métodos de Entrenamiento', icon: Dumbbell, section: 'entrenamiento' },
    { id: 'exercises-lib', label: 'Biblioteca de Ejercicios', icon: BookOpen, section: 'entrenamiento' },
    
    // === 5. VISUALIZACIÓN ===
    { id: 'graphic-plan', label: 'Plan Gráfico', icon: Layers, section: 'visualizacion' },
    { id: 'calendar-view', label: 'Calendario', icon: Calendar, section: 'visualizacion' },
    { id: 'smart-alerts', label: 'Alertas Inteligentes', icon: Zap, section: 'visualizacion' },
    
    // === 6. HERRAMIENTAS ===
    { id: 'ai-generator', label: 'Generar con IA', icon: Brain, section: 'herramientas' },
    { id: 'entity-dashboard', label: 'Dashboard General', icon: BarChart, section: 'herramientas' },
  ];

  // Estado para secciones colapsadas
  const [collapsedSections, setCollapsedSections] = useState({});

  // Mock data for charts
  const trainingData = stats?.weekly_load?.length > 0 
    ? stats.weekly_load.map((item, idx) => ({
        week: `Sem ${idx + 1}`,
        volume: Math.round(item.load * 10) || 80,
        intensity: Math.round(item.load * 8) || 60,
        fatigue: Math.round(item.load * 5) || 40
      }))
    : [
        { week: 'Sem 1', volume: 80, intensity: 60, fatigue: 40 },
        { week: 'Sem 2', volume: 85, intensity: 65, fatigue: 45 },
        { week: 'Sem 3', volume: 90, intensity: 70, fatigue: 55 },
        { week: 'Sem 4', volume: 75, intensity: 80, fatigue: 65 },
      ];

  const performanceData = [
    { ability: 'Resistencia', value: 80 },
    { ability: 'Velocidad', value: 65 },
    { ability: 'Fuerza', value: 75 },
    { ability: 'Técnica', value: 85 },
    { ability: 'Táctica', value: 70 }
  ];

  useEffect(() => {
    fetchData();
    fetchEntities();
    fetchTeams();
    fetchSportsCatalog();
    fetchTournamentsData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, athletesRes] = await Promise.all([
        getDashboardStats(),
        getAthletes()
      ]);
      setStats(statsRes.data);
      setAthletes(athletesRes.data);
      
      try {
        await seedExercises();
      } catch (e) {}
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      setChatMessages([...chatMessages, { type: 'user', text: inputMessage }]);
      setInputMessage('');
      // Simulate AI response
      setTimeout(() => {
        setChatMessages(prev => [...prev, { 
          type: 'ai', 
          text: 'Gracias por tu consulta. Para generar un plan personalizado, ve al "Panel de Control" para ver un resumen de todos tus datos y gráficas.' 
        }]);
      }, 1000);
    }
  };

  const renderDataContent = () => {
    if (!activeDataSection) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-gray-400">Seleccione una sección para ver los detalles</p>
          {athletes.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Atleta:</span>
              <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Seleccionar atleta" />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      );
    }

    // Render Atletas section inline - COMPLETE
    if (activeDataSection === 'athletes') {
      // Helper functions for entity display
      const getEntityById = (id) => entities.find(e => e.id === id);
      const getEntitiesByType = (type) => entities.filter(e => e.entity_type === type);
      const federations = getEntitiesByType('federation');
      const clubs = getEntitiesByType('club');
      const schools = getEntitiesByType('school');
      
      // Filter athletes by entity
      const filteredAthletes = athleteFilterEntity === 'all' 
        ? athletes 
        : athletes.filter(a => a.affiliations?.includes(athleteFilterEntity));
      
      // Get affiliation names for display
      const getAffiliationNames = (affiliationIds = []) => {
        return affiliationIds.map(id => {
          const entity = getEntityById(id);
          return entity ? { name: entity.name, type: entity.entity_type } : null;
        }).filter(Boolean);
      };

      // Filter entities by type for affiliation dropdowns (use different name to avoid conflicts)
      const entityFederations = entities.filter(e => e.entity_type === 'federation');
      const entityClubs = entities.filter(e => e.entity_type === 'club');
      const entitySchools = entities.filter(e => e.entity_type === 'school');

      // Get selected athlete for summary
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      
      return (
        <div className="p-4">
          {/* Tabs para Atletas, Equipos y Deportes */}
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200">
            <button
              onClick={() => setActiveAthleteTab('athletes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeAthleteTab === 'athletes' 
                  ? 'border-indigo-500 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Atletas
            </button>
            <button
              onClick={() => setActiveAthleteTab('teams')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeAthleteTab === 'teams' 
                  ? 'border-emerald-500 text-emerald-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Equipos
            </button>
            <button
              onClick={() => setActiveAthleteTab('sports')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeAthleteTab === 'sports' 
                  ? 'border-amber-500 text-amber-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Deportes
            </button>
            <button
              onClick={() => setActiveAthleteTab('tournaments')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeAthleteTab === 'tournaments' 
                  ? 'border-orange-500 text-orange-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Medal className="w-4 h-4 inline mr-2" />
              Torneos
            </button>
          </div>

          {/* Vista de Deportes por Categorías - EDITABLE */}
          {activeAthleteTab === 'sports' && (
            <div className="space-y-4">
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Trophy className="w-5 h-5" />
                      Catálogo de Deportes
                    </div>
                    <Button 
                      size="sm"
                      className="bg-white/20 hover:bg-white/30 text-white border-0"
                      onClick={() => setShowAddCategory(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nueva Categoría
                    </Button>
                  </div>
                </div>
                <CardContent className="p-5">
                  {/* Add Category Form */}
                  {showAddCategory && (
                    <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-amber-900">Nueva Categoría</h4>
                        <Button variant="ghost" size="sm" onClick={() => setShowAddCategory(false)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-3 items-end">
                        <Input 
                          placeholder="Nombre de categoría" 
                          className="flex-1 min-w-[200px]"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                        />
                        <Input 
                          placeholder="Icono (emoji)" 
                          className="w-20"
                          value={newCategory.icon}
                          onChange={(e) => setNewCategory({...newCategory, icon: e.target.value})}
                        />
                        <Input 
                          type="color"
                          className="w-16 h-10 p-1"
                          value={newCategory.color}
                          onChange={(e) => setNewCategory({...newCategory, color: e.target.value})}
                        />
                        <Button onClick={handleCreateCategory} className="bg-amber-500 hover:bg-amber-600">
                          Crear
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Categories Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sportsCatalog.map(category => (
                      <div 
                        key={category.id} 
                        className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                        style={{ borderColor: category.color + '40' }}
                      >
                        <div 
                          className="text-white px-4 py-3 flex items-center justify-between"
                          style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}dd)` }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{category.icon}</span>
                            <span className="font-semibold">{category.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-white/70 hover:text-white hover:bg-white/20 h-7 w-7 p-0"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="p-4 space-y-1 max-h-[250px] overflow-y-auto">
                          {category.sports?.map(sport => (
                            <div 
                              key={sport.id} 
                              className="flex items-center justify-between text-sm text-slate-700 hover:bg-slate-50 px-2 py-1.5 rounded group"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                ></div>
                                {sport.name}
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteSport(sport.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                          
                          {/* Add Sport to Category */}
                          {showAddSport === category.id ? (
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                              <Input 
                                placeholder="Nuevo deporte" 
                                className="h-8 text-sm flex-1"
                                value={newSport.name}
                                onChange={(e) => setNewSport({...newSport, name: e.target.value})}
                                onKeyDown={(e) => e.key === 'Enter' && handleCreateSport(category.id)}
                              />
                              <Button 
                                size="sm" 
                                className="h-8"
                                style={{ backgroundColor: category.color }}
                                onClick={() => handleCreateSport(category.id)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8"
                                onClick={() => setShowAddSport(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="w-full mt-2 text-slate-500 hover:text-slate-700 border border-dashed border-slate-300"
                              onClick={() => { setShowAddSport(category.id); setNewSport({ name: '', category_id: category.id }); }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Agregar deporte
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tip */}
                  <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Tip:</strong> Personaliza tu catálogo agregando las categorías y deportes que necesites. Los atletas y equipos podrán seleccionar de este catálogo.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Vista de Torneos - Nuevo componente profesional */}
          {activeAthleteTab === 'tournaments' && (
            <Card className="border-0 shadow-lg overflow-hidden">
              <TournamentManager
                tournaments={tournaments}
                sportsCatalog={sportsCatalog}
                onCreateTournament={(newTournament) => {
                  // Add tournament to local state with unique ID
                  const tournamentWithId = {
                    ...newTournament,
                    id: newTournament.id || `tournament-${Date.now()}`,
                    participants: newTournament.participants || [],
                    matches: newTournament.matches || [],
                    participants_count: 0,
                    status: 'draft'
                  };
                  setTournaments(prev => [...prev, tournamentWithId]);
                }}
                onUpdateTournament={(id, updatedData) => {
                  // Update tournament in local state (including participants and matches)
                  setTournaments(prev => prev.map(t => 
                    t.id === id ? { ...t, ...updatedData } : t
                  ));
                }}
                onDeleteTournament={(id) => {
                  // Remove tournament from local state
                  setTournaments(prev => prev.filter(t => t.id !== id));
                  toast.success('Torneo eliminado');
                }}
              />
            </Card>
          )}
          {/* Vista de Equipos */}
          {activeAthleteTab === 'teams' && (
            <div className="space-y-4">
              {/* Header Equipos */}
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Shield className="w-5 h-5" />
                      Gestión de Equipos
                    </div>
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{teams.length} equipos</span>
                  </div>
                </div>
                <CardContent className="p-5">
                  {/* Formulario nuevo equipo */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl mb-5 border border-emerald-100">
                    <h4 className="font-semibold mb-3 text-emerald-900 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Crear Nuevo Equipo
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input 
                        placeholder="Nombre del equipo" 
                        className="h-10 border-emerald-200 focus:border-emerald-400" 
                        value={newTeam.name}
                        onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                      />
                      <Select value={newTeam.sport} onValueChange={(v) => setNewTeam({...newTeam, sport: v})}>
                        <SelectTrigger className="h-10 border-emerald-200"><SelectValue placeholder="Deporte" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="football">Fútbol</SelectItem>
                          <SelectItem value="basketball">Baloncesto</SelectItem>
                          <SelectItem value="volleyball">Voleibol</SelectItem>
                          <SelectItem value="handball">Balonmano</SelectItem>
                          <SelectItem value="athletics">Atletismo</SelectItem>
                          <SelectItem value="swimming">Natación</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Categoría (ej: Sub-17, Senior)" 
                        className="h-10 border-emerald-200 focus:border-emerald-400" 
                        value={newTeam.category}
                        onChange={(e) => setNewTeam({...newTeam, category: e.target.value})}
                      />
                    </div>
                    
                    {/* Afiliación jerárquica de entidades */}
                    <div className="mt-4 pt-4 border-t border-emerald-200">
                      <h5 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                        <Landmark className="w-4 h-4" />
                        Afiliación a Entidades (Jerarquía)
                      </h5>
                      <div className="bg-white p-3 rounded-lg border border-emerald-100">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <Building2 className="w-4 h-4 text-amber-600" />
                            <Select 
                              value={newTeam.federation || 'none'} 
                              onValueChange={(v) => setNewTeam({...newTeam, federation: v === 'none' ? '' : v})}
                            >
                              <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent p-0 text-sm">
                                <SelectValue placeholder="Federación" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin federación</SelectItem>
                                {entityFederations.map(f => (
                                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                            <Building className="w-4 h-4 text-blue-600" />
                            <Select 
                              value={newTeam.club || 'none'} 
                              onValueChange={(v) => setNewTeam({...newTeam, club: v === 'none' ? '' : v})}
                            >
                              <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent p-0 text-sm">
                                <SelectValue placeholder="Club" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin club</SelectItem>
                                {entityClubs.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                          <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <GraduationCap className="w-4 h-4 text-emerald-600" />
                            <Select 
                              value={newTeam.school || 'none'} 
                              onValueChange={(v) => setNewTeam({...newTeam, school: v === 'none' ? '' : v})}
                            >
                              <SelectTrigger className="h-7 w-[140px] border-0 bg-transparent p-0 text-sm">
                                <SelectValue placeholder="Escuela" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Sin escuela</SelectItem>
                                {entitySchools.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {entities.length === 0 && (
                          <p className="text-xs text-slate-500 mt-2">
                            💡 Crea entidades en la sección <strong>Entidades</strong> para afiliar equipos
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <Button 
                        className="bg-emerald-500 hover:bg-emerald-600 h-10 font-medium px-6"
                        onClick={handleCreateTeam}
                        disabled={!newTeam.name}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Crear Equipo
                      </Button>
                    </div>
                  </div>

                  {/* Lista de equipos */}
                  <div className="space-y-3">
                    {teams.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        <Shield className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No hay equipos registrados</p>
                        <p className="text-sm mt-1">Crea tu primer equipo usando el formulario arriba</p>
                      </div>
                    ) : (
                      teams.map(team => (
                        <div key={team.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md hover:border-emerald-200 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-sm">
                              <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800">{team.name}</p>
                              <p className="text-sm text-slate-500">{team.sport} • {team.category || 'Sin categoría'} • {team.athletes?.length || 0} atletas</p>
                              {team.affiliations && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {team.affiliations.federation && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                      🏛️ {entityFederations.find(f => f.id === team.affiliations.federation)?.name || 'Federación'}
                                    </span>
                                  )}
                                  {team.affiliations.club && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                                      🏢 {entityClubs.find(c => c.id === team.affiliations.club)?.name || 'Club'}
                                    </span>
                                  )}
                                  {team.affiliations.school && (
                                    <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                                      🏫 {entitySchools.find(s => s.id === team.affiliations.school)?.name || 'Escuela'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {/* Manage team athletes */}}
                            >
                              <Users className="w-4 h-4 mr-1" />
                              Gestionar
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                              onClick={() => handleDeleteTeam(team.id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Vista de Atletas */}
          {activeAthleteTab === 'athletes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Athletes List - 2 columns */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Users className="w-5 h-5" />
                      Gestión de Atletas
                    </div>
                    <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{filteredAthletes.length} de {athletes.length}</span>
                  </div>
                </div>
                <CardContent className="p-5">
                  {/* Formulario nuevo atleta */}
                  <div className="bg-indigo-50/50 p-4 rounded-xl mb-5 border border-indigo-100">
                    <h4 className="font-semibold mb-3 text-indigo-900 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                  Registrar Nuevo Atleta
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input 
                    placeholder="Nombre completo" 
                    className="h-10 border-indigo-200 focus:border-indigo-400" 
                    value={newAthlete.name}
                    onChange={(e) => setNewAthlete({...newAthlete, name: e.target.value})}
                  />
                  <Input 
                    placeholder="Email" 
                    type="email" 
                    className="h-10 border-indigo-200 focus:border-indigo-400" 
                    value={newAthlete.email}
                    onChange={(e) => setNewAthlete({...newAthlete, email: e.target.value})}
                  />
                  <Input 
                    placeholder="Fecha nacimiento" 
                    type="date" 
                    className="h-10 border-indigo-200 focus:border-indigo-400" 
                    value={newAthlete.birthDate}
                    onChange={(e) => setNewAthlete({...newAthlete, birthDate: e.target.value})}
                  />
                  <Select value={newAthlete.gender} onValueChange={(v) => setNewAthlete({...newAthlete, gender: v})}>
                    <SelectTrigger className="h-10 border-indigo-200"><SelectValue placeholder="Género" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newAthlete.sport} onValueChange={(v) => setNewAthlete({...newAthlete, sport: v})}>
                    <SelectTrigger className="h-10 border-indigo-200"><SelectValue placeholder="Deporte" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="football">Fútbol</SelectItem>
                      <SelectItem value="athletics">Atletismo</SelectItem>
                      <SelectItem value="swimming">Natación</SelectItem>
                      <SelectItem value="cycling">Ciclismo</SelectItem>
                      <SelectItem value="basketball">Baloncesto</SelectItem>
                      <SelectItem value="tennis">Tenis</SelectItem>
                      <SelectItem value="crossfit">CrossFit</SelectItem>
                      <SelectItem value="weightlifting">Levantamiento</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Categoría" 
                    className="h-10 border-indigo-200 focus:border-indigo-400" 
                    value={newAthlete.category}
                    onChange={(e) => setNewAthlete({...newAthlete, category: e.target.value})}
                  />
                  <Select value={newAthlete.level} onValueChange={(v) => setNewAthlete({...newAthlete, level: v})}>
                    <SelectTrigger className="h-10 border-indigo-200"><SelectValue placeholder="Nivel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principiante">Principiante</SelectItem>
                      <SelectItem value="intermedio">Intermedio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Afiliaciones a entidades */}
                <div className="mt-4 pt-4 border-t border-indigo-200">
                  <h5 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    Afiliación a Entidades (opcional)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Select 
                      value={newAthlete.federation || 'none'} 
                      onValueChange={(v) => setNewAthlete({...newAthlete, federation: v === 'none' ? '' : v})}
                    >
                      <SelectTrigger className="h-10 border-amber-200 bg-amber-50/50">
                        <SelectValue placeholder="🏛️ Federación" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin federación</SelectItem>
                        {entityFederations.map(f => (
                          <SelectItem key={f.id} value={f.id}>🏛️ {f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={newAthlete.club || 'none'} 
                      onValueChange={(v) => setNewAthlete({...newAthlete, club: v === 'none' ? '' : v})}
                    >
                      <SelectTrigger className="h-10 border-blue-200 bg-blue-50/50">
                        <SelectValue placeholder="🏢 Club" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin club</SelectItem>
                        {entityClubs.map(c => (
                          <SelectItem key={c.id} value={c.id}>🏢 {c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={newAthlete.school || 'none'} 
                      onValueChange={(v) => setNewAthlete({...newAthlete, school: v === 'none' ? '' : v})}
                    >
                      <SelectTrigger className="h-10 border-emerald-200 bg-emerald-50/50">
                        <SelectValue placeholder="🏫 Escuela" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin escuela</SelectItem>
                        {entitySchools.map(s => (
                          <SelectItem key={s.id} value={s.id}>🏫 {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {entities.length === 0 && (
                    <p className="text-xs text-indigo-600 mt-2">
                      💡 Tip: Crea entidades en la sección <strong>Organización → Entidades</strong> para afiliar atletas
                    </p>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <Button 
                    className="bg-indigo-500 hover:bg-indigo-600 h-10 font-medium px-6"
                    onClick={handleCreateAthlete}
                    disabled={savingAthlete}
                  >
                    {savingAthlete ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    Agregar Atleta
                  </Button>
                </div>
              </div>
              
              {/* Filtro por entidad */}
              {entities.length > 0 && (
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-medium text-slate-600">Filtrar por:</span>
                  <Button 
                    variant={athleteFilterEntity === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setAthleteFilterEntity('all')}
                    className={athleteFilterEntity === 'all' ? 'bg-indigo-500' : ''}
                  >
                    Todos
                  </Button>
                  {entities.map(entity => {
                    const emoji = entity.entity_type === 'federation' ? '🏛️' : 
                                  entity.entity_type === 'club' ? '🏢' : 
                                  entity.entity_type === 'school' ? '🏫' : '🏆';
                    const isActive = athleteFilterEntity === entity.id;
                    return (
                      <Button 
                        key={entity.id}
                        variant={isActive ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAthleteFilterEntity(isActive ? 'all' : entity.id)}
                        className={isActive ? 'bg-indigo-500' : ''}
                      >
                        {emoji} {entity.name}
                      </Button>
                    );
                  })}
                </div>
              )}
              
              {/* Lista de atletas */}
              <div className="space-y-3">
                {filteredAthletes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">
                      {athleteFilterEntity !== 'all' ? 'No hay atletas en esta entidad' : 'No hay atletas registrados'}
                    </p>
                    <p className="text-sm mt-1">
                      {athleteFilterEntity !== 'all' 
                        ? 'Afilia atletas a esta entidad o cambia el filtro' 
                        : 'Agrega tu primer atleta usando el formulario arriba'}
                    </p>
                  </div>
                ) : (
                  filteredAthletes.map(athlete => {
                    const affiliationNames = getAffiliationNames(athlete.affiliations);
                    return (
                      <div key={athlete.id} className={`flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-all duration-200 ${selectedAthleteId === athlete.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-200'}`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                            <span className="text-white font-bold text-lg">{athlete.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{athlete.name}</p>
                            <p className="text-sm text-slate-500">{athlete.sport} • {athlete.level || 'Sin nivel'} • {athlete.age} años</p>
                            {affiliationNames.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {affiliationNames.map((aff, idx) => (
                                  <span 
                                    key={idx} 
                                    className={`text-xs px-2 py-0.5 rounded-full ${
                                      aff.type === 'federation' ? 'bg-amber-100 text-amber-700' :
                                      aff.type === 'club' ? 'bg-blue-100 text-blue-700' :
                                      aff.type === 'school' ? 'bg-emerald-100 text-emerald-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {aff.type === 'federation' ? '🏛️' : aff.type === 'club' ? '🏢' : '🏫'} {aff.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant={selectedAthleteId === athlete.id ? "default" : "outline"} 
                            size="sm" 
                            onClick={() => setSelectedAthleteId(selectedAthleteId === athlete.id ? null : athlete.id)} 
                            className={selectedAthleteId === athlete.id ? "bg-indigo-500" : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"}
                          >
                            {selectedAthleteId === athlete.id ? '✓ Seleccionado' : 'Seleccionar'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteAthlete(athlete.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
            </div>

            {/* Athlete Summary - 1 column */}
            <div className="lg:col-span-1">
              <AthleteSummary 
                athlete={selectedAthlete} 
                onNavigate={(section) => setActiveDataSection(section)}
              />
            </div>
          </div>
          )}
        </div>
      );
    }

    // Render Ejercicios section - Usando componente completo
    if (activeDataSection === 'exercises-lib') {
      return <ExerciseLibrary athleteId={selectedAthleteId} />;
    }

    // Render Calendario section inline - COMPLETE
    if (activeDataSection === 'calendar-view') {
      const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      const hoy = new Date();
      const diasMes = Array.from({ length: 35 }, (_, i) => {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fecha.setDate(fecha.getDate() - fecha.getDay() + 1 + i);
        return fecha;
      });
      
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="w-5 h-5" />
                  Calendario de Entrenamiento
                </div>
                <div className="flex gap-2 items-center">
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0">◀</Button>
                  <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm font-medium">{hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-full w-8 h-8 p-0">▶</Button>
                </div>
              </div>
            </div>
            <CardContent className="p-5">
              {/* Leyenda */}
              <div className="flex flex-wrap gap-4 mb-5 text-sm">
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Entrenamiento</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div> Competencia</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-full"></div> Test</span>
                <span className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-300 rounded-full"></div> Descanso</span>
              </div>
              
              {/* Calendario */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-7 bg-slate-100">
                  {diasSemana.map(dia => (
                    <div key={dia} className="p-3 text-center font-semibold text-sm text-slate-600">{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {diasMes.map((fecha, i) => {
                    const esHoy = fecha.toDateString() === hoy.toDateString();
                    const esMesActual = fecha.getMonth() === hoy.getMonth();
                    return (
                      <div 
                        key={i} 
                        className={`min-h-[85px] p-2 border-t border-l border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!esMesActual ? 'bg-slate-50/50 text-slate-400' : ''} ${esHoy ? 'bg-indigo-50' : ''}`}
                      >
                        <div className={`text-sm font-medium mb-1 ${esHoy ? 'bg-indigo-500 text-white w-7 h-7 rounded-full flex items-center justify-center' : ''}`}>
                          {fecha.getDate()}
                        </div>
                        {esMesActual && i % 3 === 0 && (
                          <div className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full truncate font-medium">Sesión</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Generar con IA section inline - COMPLETE
    if (activeDataSection === 'ai-generator') {
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white py-4 px-5">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Brain className="w-5 h-5" />
                Generar Plan con Inteligencia Artificial
              </div>
            </div>
            <CardContent className="p-5">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Parámetros del Plan
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Objetivo Principal</label>
                      <Input placeholder="Ej: Mejorar resistencia aeróbica" className="mt-1 border-amber-200 focus:border-amber-400" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Duración (semanas)</label>
                        <Input type="number" placeholder="12" className="mt-1 border-amber-200 focus:border-amber-400" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sesiones/semana</label>
                        <Input type="number" placeholder="5" className="mt-1 border-amber-200 focus:border-amber-400" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deporte</label>
                      <Input placeholder="Ej: Atletismo - Fondo" className="mt-1 border-amber-200 focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nivel del Atleta</label>
                      <Select>
                        <SelectTrigger className="border-amber-200"><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principiante">Principiante (0-1 año)</SelectItem>
                          <SelectItem value="intermedio">Intermedio (1-3 años)</SelectItem>
                          <SelectItem value="avanzado">Avanzado (3-5 años)</SelectItem>
                          <SelectItem value="elite">Elite (+5 años)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Competencia Objetivo</label>
                      <Input type="date" className="mt-1 border-amber-200 focus:border-amber-400" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observaciones adicionales</label>
                      <textarea className="w-full border border-amber-200 rounded-lg p-3 text-sm h-24 mt-1 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" placeholder="Lesiones previas, limitaciones, preferencias..." />
                    </div>
                    <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 font-semibold h-11">
                      <Brain className="w-4 h-4 mr-2" />
                      Generar Plan con IA
                    </Button>
                  </div>
                </div>
                
                {/* Preview */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
                  <h4 className="font-semibold text-amber-900 mb-4">Vista Previa del Plan</h4>
                  <div className="text-center py-12 text-amber-700/60">
                    <Brain className="w-20 h-20 mx-auto mb-4 opacity-30" />
                    <p className="font-medium">Configura los parámetros y genera tu plan personalizado</p>
                    <p className="text-sm mt-2 opacity-75">El plan incluirá macrociclos, mesociclos, microciclos y sesiones detalladas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Calendario de Eventos - COMPLETE
    if (activeDataSection === 'events') {
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div style={{ background: 'linear-gradient(to right, #8b5cf6, #7c3aed)' }} className="text-white py-4 px-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="w-5 h-5" />
                  Calendario de Eventos y Competencias
                </div>
                {selectedAthleteId && (
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{events.length} eventos</span>
                )}
              </div>
            </div>
            <CardContent className="p-5">
              {!selectedAthleteId ? (
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Selecciona un atleta primero</p>
                  <p className="text-sm mt-1">Ve a la sección "Atletas" y selecciona uno para gestionar sus eventos</p>
                </div>
              ) : (
                <>
                  {/* Formulario nuevo evento */}
                  <div className="bg-violet-50/50 p-4 rounded-xl mb-5 border border-violet-100">
                    <h4 className="font-semibold mb-3 text-violet-900 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Agregar Evento/Competencia
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input 
                        placeholder="Nombre del evento" 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.name}
                        onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                      />
                      <Select value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                        <SelectTrigger className="h-10 border-violet-200"><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="competencia_principal">Competencia Principal</SelectItem>
                          <SelectItem value="competencia_secundaria">Competencia Secundaria</SelectItem>
                          <SelectItem value="test">Test/Evaluación</SelectItem>
                          <SelectItem value="concentracion">Concentración</SelectItem>
                          <SelectItem value="viaje">Viaje</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        type="date" 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.date}
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      />
                      <Input 
                        placeholder="Lugar" 
                        className="h-10 border-violet-200 focus:border-violet-400" 
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <Input 
                        placeholder="Objetivo" 
                        className="h-10 col-span-2 border-violet-200 focus:border-violet-400" 
                        value={newEvent.objective}
                        onChange={(e) => setNewEvent({...newEvent, objective: e.target.value})}
                      />
                      <Select value={newEvent.priority} onValueChange={(v) => setNewEvent({...newEvent, priority: v})}>
                        <SelectTrigger className="h-10 border-violet-200"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta (A)</SelectItem>
                          <SelectItem value="media">Media (B)</SelectItem>
                          <SelectItem value="baja">Baja (C)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        className="bg-violet-500 hover:bg-violet-600 h-10 font-medium"
                        onClick={handleSaveEvent}
                        disabled={savingEvent}
                      >
                        {savingEvent ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                        Agregar
                      </Button>
                    </div>
                  </div>
                  
                  {/* Lista de eventos */}
                  <div className="space-y-3">
                    {events.length === 0 ? (
                      <div className="text-center py-8 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                        <p>No hay eventos registrados para este atleta</p>
                      </div>
                    ) : (
                      events.map(event => {
                        const priorityColors = {
                          alta: { bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
                          media: { bg: 'bg-amber-50', border: 'border-amber-200', bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700' },
                          baja: { bg: 'bg-indigo-50', border: 'border-indigo-200', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700' }
                        };
                        const colors = priorityColors[event.priority] || priorityColors.media;
                        const typeLabels = {
                          competencia_principal: 'Competencia Principal',
                          competencia_secundaria: 'Competencia Secundaria',
                          test: 'Test/Evaluación',
                          concentracion: 'Concentración',
                          viaje: 'Viaje'
                        };
                        return (
                          <div key={event.id} className={`flex items-center justify-between p-4 ${colors.bg} border ${colors.border} rounded-xl hover:shadow-sm transition-all`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-1.5 h-14 ${colors.bar} rounded-full`}></div>
                              <div>
                                <p className="font-semibold text-slate-800">{event.name}</p>
                                <p className="text-sm text-slate-500">
                                  {typeLabels[event.type] || event.type} • {event.date} {event.location && `• ${event.location}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-3 py-1.5 ${colors.badge} rounded-full text-xs font-semibold`}>
                                Prioridad {event.priority?.charAt(0).toUpperCase()}
                              </span>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDeleteEvent(event.id)}
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Objetivos e Indicadores - Using ObjectivesIndicators Component
    if (activeDataSection === 'objectives') {
      return <ObjectivesIndicators athleteId={selectedAthleteId} />;
    }

    // Render Analysis component for prev-plan section
    if (activeDataSection === 'prev-plan') {
      return <PreviousPlanAnalysis athleteId={selectedAthleteId} />;
    }

    // Render Sport Characterization component
    if (activeDataSection === 'sport-char') {
      return <SportCharacterization athleteId={selectedAthleteId} />;
    }

    // Render Athlete Characterization component
    if (activeDataSection === 'athlete-char') {
      return <AthleteCharacterization athleteId={selectedAthleteId} />;
    }

    // Render Health Records for injuries
    if (activeDataSection === 'injuries') {
      return <HealthRecords athleteId={selectedAthleteId} recordType="lesion" />;
    }

    // Render Health Records for diseases
    if (activeDataSection === 'diseases') {
      return <HealthRecords athleteId={selectedAthleteId} recordType="enfermedad" />;
    }

    // Render Health Records for diagnosis (all types)
    if (activeDataSection === 'diagnostic') {
      return <HealthRecords athleteId={selectedAthleteId} recordType="all" />;
    }

    // Render Competition Analysis
    if (activeDataSection === 'competitions') {
      return <CompetitionAnalysis athleteId={selectedAthleteId} />;
    }

    // Render Training System Hub (EJE CENTRAL - Integra Periodización, Tests, Carga y Control)
    if (activeDataSection === 'training-system') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <TrainingSystemHub 
          athleteId={selectedAthleteId} 
          athleteName={selectedAthlete?.name}
          onNavigate={(section) => setActiveDataSection(section)}
        />
      );
    }

    // Render Periodization System (Auto-generation with charts)
    if (activeDataSection === 'periodization-models') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      
      // Si no hay atleta seleccionado, mostrar pantalla de selección
      if (!selectedAthleteId) {
        return (
          <div className="h-full flex flex-col items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Activity className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">Selecciona un Atleta</h2>
              <p className="text-slate-500 mb-6">
                Ve a la sección "Atletas" y selecciona uno para crear su periodización
              </p>
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => setActiveDataSection('athletes')}
              >
                <Users className="w-4 h-4 mr-2" />
                Ir a Atletas
              </Button>
            </div>
          </div>
        );
      }
      
      // Mostrar el PeriodizationSystem completo con todas las funcionalidades de edición
      return (
        <PeriodizationSystem 
          athleteId={selectedAthleteId} 
          athleteName={selectedAthlete?.name}
        />
      );
    }

    // Render Macrocycle Stages (Training Stages)
    if (activeDataSection === 'macrocycle-stages') {
      return <TrainingStages athleteId={selectedAthleteId} />;
    }

    // Render Training Methods (Medios de entrenamiento)
    if (activeDataSection === 'exercises') {
      return <TrainingMethods athleteId={selectedAthleteId} />;
    }

    // Render Anthropometric Data
    if (activeDataSection === 'anthropometric') {
      return <AnthropometricData athleteId={selectedAthleteId} />;
    }

    // Render Test Evaluations
    if (activeDataSection === 'tests') {
      return <TestEvaluations athleteId={selectedAthleteId} />;
    }

    // Render Training Load
    if (activeDataSection === 'load') {
      return <TrainingLoad athleteId={selectedAthleteId} />;
    }

    // Render Graphic Plan
    if (activeDataSection === 'graphic-plan') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <GraphicPlan 
          athleteId={selectedAthleteId} 
          periodizationData={periodizationData}
          athleteName={selectedAthlete?.name}
        />
      );
    }

    // Render Entity Manager
    if (activeDataSection === 'entities') {
      return (
        <div className="p-4">
          <EntityManager />
        </div>
      );
    }

    // Render Entity Dashboard
    if (activeDataSection === 'entity-dashboard') {
      return (
        <EntityDashboard 
          onNavigate={(section, athleteId) => {
            if (athleteId) setSelectedAthleteId(athleteId);
            setActiveDataSection(section);
          }}
        />
      );
    }

    // Render Smart Alerts
    if (activeDataSection === 'smart-alerts') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-4">
          <div className="max-w-3xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Alertas Inteligentes de Entrenamiento</h2>
              <p className="text-slate-500">Recomendaciones basadas en evaluaciones y calendario de competencias</p>
              {athletes.length > 0 && (
                <div className="mt-4">
                  <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Seleccionar atleta" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <SmartAlerts 
              athleteId={selectedAthleteId} 
              athleteName={selectedAthlete?.name}
              onNavigate={(section) => setActiveDataSection(section)}
            />
          </div>
        </div>
      );
    }

    // For sections without specific components, show placeholder
    const sectionLabel = navItems.find(item => item.id === activeDataSection)?.label;
    
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-blue-600">{sectionLabel}</h2>
          {athletes.length > 0 && (
            <Select value={selectedAthleteId || ''} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Seleccionar atleta" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Card className="bg-white shadow-lg">
          <CardContent className="p-6 text-center">
            <p className="text-gray-500 mb-4">
              Esta sección está en desarrollo
            </p>
            <p className="text-sm text-gray-400">
              Pronto podrás gestionar {sectionLabel?.toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderMainContent = () => {
    if (activePanel === 'datos') {
      return (
        <div className="flex h-full">
          {/* Data Navigation */}
          <div className={`${isNavExpanded ? 'w-64' : 'w-16'} bg-white border-r shadow-sm transition-all duration-300 flex flex-col`}>
            <button
              onClick={() => setIsNavExpanded(!isNavExpanded)}
              className="p-4 flex justify-end hover:bg-gray-50 border-b"
            >
              {isNavExpanded ? <ChevronLeft className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
            </button>
            <div className="flex-1 overflow-y-auto">
              {/* Función para toggle de secciones */}
              {(() => {
                const toggleSection = (section) => {
                  setCollapsedSections(prev => ({
                    ...prev,
                    [section]: !prev[section]
                  }));
                };

                const sections = [
                  { key: 'informacion', title: '1. Información', color: 'indigo' },
                  { key: 'evaluacion', title: '2. Evaluación Inicial', color: 'emerald' },
                  { key: 'competencias', title: '3. Competencias y Objetivos', color: 'violet' },
                  { key: 'entrenamiento', title: '4. Sistema de Entrenamiento', color: 'blue' },
                  { key: 'visualizacion', title: '5. Visualización', color: 'amber' },
                  { key: 'herramientas', title: '6. Herramientas', color: 'slate' },
                ];

                const colorClasses = {
                  indigo: { header: 'bg-indigo-500', item: 'indigo', active: 'bg-indigo-50 border-indigo-500 text-indigo-700', hover: 'hover:bg-indigo-50/50' },
                  emerald: { header: 'bg-emerald-500', item: 'emerald', active: 'bg-emerald-50 border-emerald-500 text-emerald-700', hover: 'hover:bg-emerald-50/50' },
                  amber: { header: 'bg-amber-500', item: 'amber', active: 'bg-amber-50 border-amber-500 text-amber-700', hover: 'hover:bg-amber-50/50' },
                  violet: { header: 'bg-violet-500', item: 'violet', active: 'bg-violet-50 border-violet-500 text-violet-700', hover: 'hover:bg-violet-50/50' },
                  blue: { header: 'bg-blue-600', item: 'blue', active: 'bg-blue-50 border-blue-600 text-blue-700', hover: 'hover:bg-blue-50/50' },
                  cyan: { header: 'bg-cyan-500', item: 'cyan', active: 'bg-cyan-50 border-cyan-500 text-cyan-700', hover: 'hover:bg-cyan-50/50' },
                  rose: { header: 'bg-rose-500', item: 'rose', active: 'bg-rose-50 border-rose-500 text-rose-700', hover: 'hover:bg-rose-50/50' },
                  slate: { header: 'bg-slate-600', item: 'slate', active: 'bg-slate-100 border-slate-600 text-slate-800', hover: 'hover:bg-slate-50' },
                  orange: { header: 'bg-orange-500', item: 'orange', active: 'bg-orange-50 border-orange-500 text-orange-700', hover: 'hover:bg-orange-50/50' },
                };

                return sections.map((section, idx) => {
                  const colors = colorClasses[section.color];
                  const isCollapsed = collapsedSections[section.key];
                  const sectionItems = navItems.filter(i => i.section === section.key);

                  return (
                    <div key={section.key}>
                      {/* Section Header - Clickeable para colapsar */}
                      {isNavExpanded && (
                        <button
                          onClick={() => toggleSection(section.key)}
                          className={`w-full px-3 py-2.5 ${colors.header} text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-between gap-2 ${idx > 0 ? 'mt-1' : ''} hover:opacity-90 transition-opacity`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                            {section.title}
                          </div>
                          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                      )}
                      {/* Section Items */}
                      {!isCollapsed && sectionItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveDataSection(item.id)}
                            className={`w-full p-3 flex items-center gap-3 transition-all duration-200 text-left ${
                              activeDataSection === item.id 
                                ? `${colors.active} border-l-4 font-medium` 
                                : `text-slate-600 ${colors.hover} border-l-4 border-transparent`
                            }`}
                          >
                            <Icon className={`h-4 w-4 flex-shrink-0 ${activeDataSection === item.id ? `text-${section.color}-500` : 'text-slate-400'}`} />
                            {isNavExpanded && <span className="truncate text-sm">{item.label}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          {/* Data Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {renderDataContent()}
          </div>
        </div>
      );
    }
    
    // Panel de Control - Resumen visual con estadísticas y gráficos
    const handleNavigateFromPanel = (panel, section) => {
      setActivePanel(panel);
      if (section) {
        setActiveDataSection(section);
      }
    };

    return (
      <ControlPanel
        athletes={athletes}
        events={events}
        selectedAthleteId={selectedAthleteId}
        periodizationData={periodizationData}
        stats={stats}
        onNavigate={handleNavigateFromPanel}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ====== GLOBAL CONTEXT BAR (Material Design - Fixed at top) ====== */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg" data-testid="global-context-bar">
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          {/* Left: Filters with glass effect */}
          <div className="flex items-center gap-3 flex-1 overflow-x-auto">
            <div className="flex items-center gap-2 text-white/90 shrink-0">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Filter className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden lg:inline">Filtros</span>
            </div>
            
            {/* Filters Container with glass morphism */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-xl px-3 py-1.5">
              {/* Entity Selector */}
              <Select value={globalContext.entityId} onValueChange={handleEntityChange}>
                <SelectTrigger className="w-[140px] h-8 text-xs bg-white/90 border-0 shadow-sm rounded-lg hover:bg-white transition-colors" data-testid="context-entity-select">
                  <Building2 className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="Entidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  {entities.filter(e => e.entity_type === 'federation').map(e => (
                    <SelectItem key={e.id} value={e.id}>🏛️ {e.name}</SelectItem>
                  ))}
                  {entities.filter(e => e.entity_type === 'club').map(e => (
                    <SelectItem key={e.id} value={e.id}>🏢 {e.name}</SelectItem>
                  ))}
                  {entities.filter(e => e.entity_type === 'school').map(e => (
                    <SelectItem key={e.id} value={e.id}>🎓 {e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />

              {/* Team Selector */}
              <Select value={globalContext.teamId} onValueChange={handleTeamChange}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white/90 border-0 shadow-sm rounded-lg hover:bg-white transition-colors" data-testid="context-team-select">
                  <Users className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="Equipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filteredTeams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />

              {/* Athlete Selector */}
              <Select value={globalContext.athleteId} onValueChange={handleAthleteChange}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white/90 border-0 shadow-sm rounded-lg hover:bg-white transition-colors" data-testid="context-athlete-select">
                  <User className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="Atleta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {filteredAthletes.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />

              {/* Sport Selector */}
              <Select value={globalContext.sportId} onValueChange={handleSportChange}>
                <SelectTrigger className="w-[130px] h-8 text-xs bg-white/90 border-0 shadow-sm rounded-lg hover:bg-white transition-colors" data-testid="context-sport-select">
                  <Trophy className="w-3.5 h-3.5 mr-1.5 text-indigo-500 shrink-0" />
                  <SelectValue placeholder="Deporte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {allSports.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto Testing System */}
            <AutoTestingSystem 
              onLoadTemplate={(plan) => {
                // Refresh plans list
                const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
                setGeneratedPlans(savedPlans);
                setSidebarView('history');
                toast.success('Template cargado - Ver en Historial');
              }}
              onSavePlan={(plan) => {
                const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
                setGeneratedPlans(savedPlans);
                setSidebarView('history');
              }}
              currentUser={user}
              sportsCatalog={sportsCatalog}
            />
            
            <Button
              variant={sidebarView === 'history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSidebarView(sidebarView === 'history' ? 'assistant' : 'history')}
              className={`h-9 text-xs font-medium rounded-xl shadow-md transition-all ${
                sidebarView === 'history'
                  ? 'bg-white text-indigo-600 hover:bg-white/90'
                  : 'bg-white/20 border-0 text-white hover:bg-white/30'
              }`}
              data-testid="context-history-btn"
            >
              <History className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">Historial de Planes</span>
              <span className="sm:hidden">Historial</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content (with padding for fixed bar) */}
      <div className="pt-[60px] flex h-screen max-h-screen overflow-hidden">
      {/* Left Sidebar - AI Chat */}
      <div className="w-72 p-4 border-r flex flex-col bg-white shadow-lg">
        {/* Logo and Title */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gray-800">Tr</span>
            <span className="text-blue-600">AI</span>
            <span className="text-gray-800">n</span>
          </h1>
        </div>
        
        {/* Panel Tabs */}
        <div className="flex gap-2 mb-4">
          {['panel', 'datos'].map((panelType) => (
            <button
              key={panelType}
              onClick={() => {
                setActivePanel(panelType);
                if (panelType === 'datos') setActiveDataSection(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                activePanel === panelType 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              data-testid={`tab-${panelType}`}
            >
              {panelType === 'panel' ? 'Panel de Control' : 'Datos'}
            </button>
          ))}
        </div>

        {/* Plans History Button */}
        <Button
          variant={sidebarView === 'history' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSidebarView(sidebarView === 'history' ? 'assistant' : 'history')}
          className={`mb-2 w-full flex items-center justify-center gap-2 ${
            sidebarView === 'history'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
              : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
          }`}
          data-testid="sidebar-history-btn"
        >
          <History className="h-4 w-4" />
          Historial de Planes
          {generatedPlans.length > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
              sidebarView === 'history' ? 'bg-white/20' : 'bg-indigo-100'
            }`}>
              {generatedPlans.length}
            </span>
          )}
        </Button>

        {/* Export PDF Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsPdfModalOpen(true)}
          className="mb-4 w-full flex items-center justify-center gap-2 border-slate-300 text-slate-600 hover:bg-slate-50"
          data-testid="export-pdf-btn"
        >
          <Download className="h-4 w-4" />
          Exportar Reporte PDF
        </Button>

        {/* Conditional View: History or Assistant */}
        {sidebarView === 'history' ? (
          /* Plans History View */
          <Card className="flex-grow flex flex-col shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Mis Planes
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarView('assistant')}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-7 w-7 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col p-0 overflow-hidden">
              {/* New Plan Button */}
              <div className="p-3 border-b">
                <Button
                  onClick={handleNewPlan}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                  data-testid="new-plan-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Nuevo Plan
                </Button>
              </div>
              
              {/* Plans List */}
              <div className="flex-grow overflow-y-auto">
                {generatedPlans.length > 0 ? (
                  <div className="divide-y">
                    {generatedPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-3 hover:bg-slate-50 cursor-pointer transition-colors group"
                        onClick={() => {
                          // Could load plan details here
                          toast.info(`Plan: ${plan.title || plan.athleteName}`);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 truncate">
                              {plan.title || plan.name || `Plan para ${plan.athleteName || plan.athlete?.name || 'Atleta'}`}
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {plan.sport || plan.athlete?.sport || 'Deporte'} • {plan.duration || plan.macrocycle?.duration ? `${plan.macrocycle?.duration || ''} semanas` : 'Sin duración'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(plan.createdAt).toLocaleDateString('es-ES', { 
                                day: 'numeric', 
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              {plan.isTest && <span className="ml-2 text-violet-500 font-medium">(Test)</span>}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('¿Eliminar este plan?')) {
                                deletePlan(plan.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <FileText className="w-12 h-12 text-slate-200 mb-3" />
                    <p className="text-sm text-slate-500 mb-1">Sin planes generados</p>
                    <p className="text-xs text-slate-400">Crea tu primer plan con el asistente IA</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* AI Assistant View */
          <Card className="flex-grow flex flex-col shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 py-3 px-4">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Asistente IA de Entrenamiento
              </CardTitle>
            </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
            {/* Quick access to AI Coach */}
            <div className="p-3 border-b bg-gradient-to-r from-blue-50 to-purple-50">
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                onClick={() => setShowAICoach(true)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Panel de Expertos IA
              </Button>
              <p className="text-xs text-slate-500 text-center mt-2">
                4 modelos de IA colaborando para tu plan
              </p>
            </div>
            
            {/* Simple chat messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`p-3 rounded-lg text-sm ${
                  msg.type === 'user' 
                    ? 'bg-blue-50 ml-4 text-gray-800' 
                    : 'bg-gray-50 mr-4 text-gray-600'
                }`}>
                  {msg.text}
                </div>
              ))}
            </div>
            <div className="p-3 border-t flex gap-2">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe tu consulta..."
                className="flex-grow h-10 text-sm"
                data-testid="chat-input"
              />
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 p-0"
                onClick={handleSendMessage}
                data-testid="chat-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* User info and logout */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500">
                {USER_ROLES.find(r => r.id === user?.role)?.name || user?.role || 'Usuario'}
              </p>
            </div>
            <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1" data-testid="profile-settings-btn">
                  <Settings className="w-4 h-4 text-gray-400" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Configuración de Perfil</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Nombre</p>
                    <p className="font-medium">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-2">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-3">Cambiar tipo de cuenta</p>
                    <div className="grid gap-2">
                      {USER_ROLES.map(role => {
                        const IconComponent = role.icon;
                        const isSelected = user?.role === role.id;
                        return (
                          <Button
                            key={role.id}
                            variant={isSelected ? "default" : "outline"}
                            className={`justify-start h-auto py-3 ${isSelected ? 'bg-blue-600' : ''}`}
                            onClick={() => handleUpdateProfile(role.id)}
                            disabled={updatingProfile || isSelected}
                            data-testid={`role-${role.id}-btn`}
                          >
                            <IconComponent className="w-4 h-4 mr-3" />
                            <div className="text-left">
                              <div className="font-medium">{role.name}</div>
                              <div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>
                                {role.description}
                              </div>
                            </div>
                            {isSelected && (
                              <span className="ml-auto text-xs bg-white/20 px-2 py-1 rounded">Actual</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Link to="/subscription" className="w-full">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-500 hover:text-gray-700 text-sm mb-1"
              data-testid="subscription-btn"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Suscripción
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-500 hover:text-gray-700 text-sm"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow overflow-hidden">
        {renderMainContent()}
      </div>

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        athleteId={selectedAthleteId}
        athleteName={athletes.find(a => a.id === selectedAthleteId)?.name}
        periodizationData={periodizationData}
      />
      </div>
    </div>
  );
};

export default DashboardPage;
