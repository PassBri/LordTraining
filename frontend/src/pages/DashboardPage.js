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
  Medal, MapPin, LayoutGrid, GitBranch, Share2, History, Filter, CreditCard, Sparkles,
  AlertTriangle, CheckCircle, TrendingUp, RefreshCw, Clock, Edit
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
import { Badge } from '../components/ui/badge';

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

  // Filters Dropdown State
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);

  // ====== COACH AI DRAWER STATE ======
  const [isCoachDrawerOpen, setIsCoachDrawerOpen] = useState(false);
  const [coachDrawerTab, setCoachDrawerTab] = useState('coach'); // 'coach' or 'history'
  const [generatedPlans, setGeneratedPlans] = useState([]); // List of generated plans

  // ====== PLAN ACTIVO STATE ======
  const [activePlan, setActivePlan] = useState(null); // El plan actualmente seleccionado
  const [trainingPlans, setTrainingPlans] = useState([]); // Lista de planes de la BD
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showPlanSelector, setShowPlanSelector] = useState(false); // Modal para seleccionar plan

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
    setIsCoachDrawerOpen(true);
    setCoachDrawerTab('coach');
    toast.info('Usa el Coach AI para ayudarte a planificar');
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

  // ====== TRAINING PLANS FUNCTIONS ======
  // Fetch training plans from API
  const fetchTrainingPlans = async () => {
    setLoadingPlans(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/training-plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrainingPlans(data);
        
        // Si hay un plan activo guardado, restaurarlo
        const savedActivePlanId = localStorage.getItem('train_active_plan_id');
        if (savedActivePlanId) {
          const savedPlan = data.find(p => p.id === savedActivePlanId);
          if (savedPlan) {
            setActivePlan(savedPlan);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching training plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  // Set active plan and persist
  const handleSetActivePlan = (plan) => {
    setActivePlan(plan);
    if (plan) {
      localStorage.setItem('train_active_plan_id', plan.id);
    } else {
      localStorage.removeItem('train_active_plan_id');
    }
    setShowPlanSelector(false);
  };

  // Delete a training plan
  const handleDeleteTrainingPlan = async (planId) => {
    if (!window.confirm('¿Eliminar este plan de entrenamiento?')) return;
    try {
      const token = localStorage.getItem('train_token');
      await fetch(`${API_URL}/api/training-plans/${planId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      toast.success('Plan eliminado');
      
      // Si era el plan activo, limpiarlo
      if (activePlan?.id === planId) {
        handleSetActivePlan(null);
      }
      
      fetchTrainingPlans();
    } catch (error) {
      toast.error('Error al eliminar plan');
    }
  };

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
    // === 0. PUNTO DE PARTIDA (Lo primero que necesita el entrenador) ===
    { id: 'prev-plan', label: 'Análisis del Plan Anterior', icon: FileText, section: 'punto-partida' },
    { id: 'objectives', label: 'Objetivos del Plan', icon: Target, section: 'punto-partida' },
    
    // === 1. INFORMACIÓN ===
    { id: 'entities', label: 'Entidades (Federación, Club...)', icon: Landmark, section: 'informacion' },
    { id: 'athletes', label: 'Atletas y Equipos', icon: Users, section: 'informacion' },
    { id: 'sport-char', label: 'Caracterización del Deporte', icon: Target, section: 'informacion' },
    
    // === 2. EVALUACIÓN INICIAL ===
    { id: 'anthropometric', label: 'Datos Antropométricos', icon: LineChart, section: 'evaluacion' },
    { id: 'biomechanical', label: 'Análisis Biomecánico', icon: Activity, section: 'evaluacion' },
    { id: 'control-medical', label: 'Control Médico', icon: Heart, section: 'evaluacion' },
    { id: 'control-physical', label: 'Control Físico', icon: Dumbbell, section: 'evaluacion' },
    { id: 'control-technical', label: 'Control Técnico', icon: Target, section: 'evaluacion' },
    { id: 'control-tactical', label: 'Control Táctico', icon: Layers, section: 'evaluacion' },
    { id: 'control-psychological', label: 'Control Psicológico', icon: Brain, section: 'evaluacion' },
    { id: 'control-theoretical', label: 'Control Teórico', icon: BookOpen, section: 'evaluacion' },
    
    // === 3. COMPETENCIAS ===
    { id: 'events', label: 'Calendario de Competencias', icon: Calendar, section: 'competencias' },
    
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
    fetchTrainingPlans(); // Cargar planes de entrenamiento
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
    // ====== SELECTOR DE PLAN ACTIVO ======
    // Si no hay plan activo, mostrar el selector de planes
    if (!activePlan && activePanel === 'datos') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8">
          <div className="max-w-2xl w-full">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clipboard className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Selecciona o Crea un Plan</h2>
              <p className="text-slate-500">Para trabajar con los datos, primero debes seleccionar un plan de entrenamiento activo</p>
            </div>

            {/* Crear Nuevo Plan */}
            <div className="mb-6">
              <Button
                onClick={() => {
                  setActiveDataSection('training-system');
                  // Navegar al sistema de entrenamiento para crear un nuevo plan
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-6 text-lg shadow-lg"
              >
                <Plus className="w-6 h-6 mr-3" />
                Crear Nuevo Plan de Entrenamiento
              </Button>
            </div>

            {/* Divider */}
            {trainingPlans.length > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-sm text-slate-400">o selecciona un plan existente</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>
            )}

            {/* Lista de Planes */}
            {loadingPlans ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-slate-500">Cargando planes...</p>
              </div>
            ) : trainingPlans.length > 0 ? (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {trainingPlans.map(plan => (
                  <div 
                    key={plan.id}
                    onClick={() => handleSetActivePlan(plan)}
                    className="p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow">
                          <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{plan.name}</h3>
                          <p className="text-sm text-slate-500">
                            {plan.total_weeks} semanas • {plan.model_name || plan.model} • {plan.sport || 'General'}
                          </p>
                          <p className="text-xs text-slate-400">
                            Inicio: {plan.start_date ? new Date(plan.start_date).toLocaleDateString('es') : 'No definido'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-700">Activo</Badge>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-1">No tienes planes creados</p>
                <p className="text-sm text-slate-400">Crea tu primer plan para comenzar a trabajar</p>
              </div>
            )}

            {/* Info adicional */}
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">¿Por qué necesito un plan?</p>
                  <p className="text-xs text-blue-600 mt-1">
                    El plan es el contenedor que agrupa toda la información: datos del atleta, evaluaciones, 
                    competencias, periodización y más. Cada sección que llenes se guardará asociada al plan activo.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!activeDataSection) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-gray-400">Seleccione una sección para ver los detalles</p>
          {/* Mostrar plan activo */}
          {activePlan && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200 max-w-md w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Plan Activo</p>
                    <p className="font-bold text-slate-800">{activePlan.name}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetActivePlan(null)}
                  className="text-xs"
                >
                  Cambiar Plan
                </Button>
              </div>
            </div>
          )}
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
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6 overflow-y-auto h-full bg-gradient-to-br from-slate-50 to-blue-50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl shadow-lg mb-4">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Información General y Objetivos del Plan</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Esta sección sirve como la introducción al plan de entrenamiento, estableciendo las bases para la identificación de metas y la planificación efectiva.
            </p>
          </div>

          {/* Grid Principal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* INFORMACIÓN GENERAL */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="w-5 h-5" />
                  Información General
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Deporte/Objetivo */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      Deporte / Objetivo de Entrenamiento
                    </label>
                    <Input placeholder="Ej: Fútbol - Preparación pretemporada" className="border-slate-200" />
                  </div>
                  
                  {/* 2. Categoría */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      Categoría
                    </label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="infantil">Infantil</SelectItem>
                        <SelectItem value="cadete">Cadete</SelectItem>
                        <SelectItem value="juvenil">Juvenil</SelectItem>
                        <SelectItem value="sub23">Sub-23</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="master">Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 3. Edad */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      Edad / Rango de Edades
                    </label>
                    <Input placeholder="Ej: 18-22 años" className="border-slate-200" />
                  </div>
                  
                  {/* 4. Clasificación */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      Clasificación / Nivel
                    </label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="iniciacion">Iniciación</SelectItem>
                        <SelectItem value="formacion">Formación</SelectItem>
                        <SelectItem value="perfeccionamiento">Perfeccionamiento</SelectItem>
                        <SelectItem value="alto-rendimiento">Alto Rendimiento</SelectItem>
                        <SelectItem value="elite">Élite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* 5. Fechas */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                      Fecha de Inicio
                    </label>
                    <Input type="date" className="border-slate-200" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                      Fecha de Finalización
                    </label>
                    <Input type="date" className="border-slate-200" />
                  </div>
                </div>
                
                {/* 6. Entrenador */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <span className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">6</span>
                    Entrenador Responsable
                  </label>
                  <Input placeholder="Nombre del entrenador" defaultValue={user?.name || ''} className="border-slate-200" />
                </div>
              </CardContent>
            </Card>

            {/* OBJETIVOS A LARGO PLAZO */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Objetivos a Largo Plazo
                  <Badge className="bg-white/20 text-white ml-2">Macrociclo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-slate-500 mb-3">Ejemplo: Mejorar el rendimiento general, alcanzar el pico en la competencia principal del año.</p>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xs font-bold">{num}</span>
                      Objetivo {num}
                    </label>
                    <textarea 
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={2}
                      placeholder={`Describir objetivo a largo plazo ${num}...`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* OBJETIVOS A MEDIO PLAZO */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Objetivos a Medio Plazo
                  <Badge className="bg-white/20 text-white ml-2">Mesociclo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-slate-500 mb-3">Ejemplo: Incrementar la resistencia base, mejorar la técnica específica del deporte.</p>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold">{num}</span>
                      Objetivo {num}
                    </label>
                    <textarea 
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      rows={2}
                      placeholder={`Describir objetivo a medio plazo ${num}...`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* OBJETIVOS A CORTO PLAZO */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Objetivos a Corto Plazo
                  <Badge className="bg-white/20 text-white ml-2">Microciclo</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-slate-500 mb-3">Ejemplo: Mejorar el tiempo en una distancia específica, aumentar la capacidad de recuperación post-entrenamiento.</p>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">{num}</span>
                      Objetivo {num}
                    </label>
                    <textarea 
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder={`Describir objetivo a corto plazo ${num}...`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* TABLA DE OBJETIVOS POR ASPECTO DE PREPARACIÓN */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="w-5 h-5" />
                Objetivos por Aspecto de Preparación
              </CardTitle>
              <p className="text-sm text-white/80 mt-1">Defina los objetivos e indicadores para cada aspecto de la preparación deportiva</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-48">Tipo de Objetivo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Objetivo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-64">Indicador</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* General */}
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-slate-400 rounded-sm"></span>
                          <span className="font-medium text-slate-700">General</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivo general del plan..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="¿Cómo se medirá?" />
                      </td>
                    </tr>
                    
                    {/* Preparación Física General */}
                    <tr className="hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
                          <span className="font-medium text-slate-700">Prep. Física General</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivos de condición física base..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Tests, marcas, % mejora..." />
                      </td>
                    </tr>
                    
                    {/* Preparación Física Especial */}
                    <tr className="hover:bg-indigo-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-indigo-500 rounded-sm"></span>
                          <span className="font-medium text-slate-700">Prep. Física Especial</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivos de preparación específica..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Indicadores específicos..." />
                      </td>
                    </tr>
                    
                    {/* Preparación Técnica */}
                    <tr className="hover:bg-emerald-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-emerald-500 rounded-sm"></span>
                          <span className="font-medium text-slate-700">Prep. Técnica</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivos técnicos del deporte..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Evaluaciones técnicas..." />
                      </td>
                    </tr>
                    
                    {/* Preparación Táctica */}
                    <tr className="hover:bg-amber-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-amber-500 rounded-sm"></span>
                          <span className="font-medium text-slate-700">Prep. Táctica</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivos tácticos y estratégicos..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Análisis de rendimiento táctico..." />
                      </td>
                    </tr>
                    
                    {/* Preparación Teórica */}
                    <tr className="hover:bg-cyan-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-cyan-500 rounded-sm"></span>
                          <span className="font-medium text-slate-700">Prep. Teórica</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivos de conocimiento teórico..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Evaluaciones teóricas..." />
                      </td>
                    </tr>
                    
                    {/* Preparación Psicológica */}
                    <tr className="hover:bg-pink-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-pink-500 rounded-sm"></span>
                          <span className="font-medium text-slate-700">Prep. Psicológica</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Objetivos psicológicos y mentales..." />
                      </td>
                      <td className="px-4 py-2">
                        <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="Escalas psicológicas, cuestionarios..." />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Nota Final */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-4 text-center shadow-lg">
            <p className="text-white/90 text-sm">
              <Sparkles className="w-4 h-4 inline mr-2 text-amber-400" />
              La claridad en esta sección es crucial para guiar el desarrollo del programa de entrenamiento y medir el progreso hacia los objetivos establecidos.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="border-slate-300">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg">
              <Save className="w-4 h-4 mr-2" />
              Guardar Objetivos del Plan
            </Button>
          </div>
        </div>
      );
    }

    // Render Analysis component for prev-plan section
    if (activeDataSection === 'prev-plan') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6 overflow-y-auto h-full bg-gradient-to-br from-slate-50 to-rose-50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-rose-500 to-red-500 rounded-2xl shadow-lg mb-4">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Análisis del Plan Anterior</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Evaluación retrospectiva del plan de entrenamiento previo para identificar fortalezas, debilidades y oportunidades de mejora.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información del Plan Anterior */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  Información del Plan Anterior
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fecha de Inicio</label>
                    <Input type="date" className="border-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Fecha de Finalización</label>
                    <Input type="date" className="border-slate-200" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Duración Total (semanas)</label>
                  <Input type="number" placeholder="Ej: 12" className="border-slate-200" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Objetivo Principal del Plan</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder="¿Cuál era el objetivo principal?" />
                </div>
              </CardContent>
            </Card>

            {/* Cumplimiento de Objetivos */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle className="w-5 h-5" />
                  Cumplimiento de Objetivos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-3">
                  {['Objetivo General', 'Preparación Física', 'Preparación Técnica', 'Preparación Táctica', 'Preparación Psicológica'].map((obj, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-700">{obj}</span>
                      <Select defaultValue="parcial">
                        <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="total">✅ Cumplido Total</SelectItem>
                          <SelectItem value="parcial">🟡 Cumplido Parcial</SelectItem>
                          <SelectItem value="no">❌ No Cumplido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">% Global de Cumplimiento</label>
                  <Input type="number" placeholder="75" max="100" className="border-slate-200" />
                </div>
              </CardContent>
            </Card>

            {/* Análisis de Fortalezas */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="w-5 h-5" />
                  Fortalezas del Plan Anterior
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-slate-500">¿Qué funcionó bien? ¿Qué aspectos se deben mantener?</p>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">{num}</span>
                    <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={`Fortaleza ${num}...`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Análisis de Debilidades */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5" />
                  Debilidades y Áreas de Mejora
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <p className="text-xs text-slate-500">¿Qué no funcionó? ¿Qué se debe cambiar o mejorar?</p>
                {[1, 2, 3].map((num) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="w-6 h-6 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">{num}</span>
                    <textarea className="w-full p-2 border border-slate-200 rounded-lg text-sm resize-none" rows={2} placeholder={`Debilidad/Mejora ${num}...`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Indicadores de Rendimiento */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart className="w-5 h-5" />
                  Indicadores de Rendimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 text-slate-600">Indicador</th>
                        <th className="text-center py-2 px-2 text-slate-600">Inicial</th>
                        <th className="text-center py-2 px-2 text-slate-600">Final</th>
                        <th className="text-center py-2 px-2 text-slate-600">Δ%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['VO2 Máx', '1RM Sentadilla', 'Sprint 30m', 'CMJ (salto)', 'Flexibilidad'].map((ind, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-2 px-2 font-medium text-slate-700">{ind}</td>
                          <td className="py-2 px-2"><Input className="h-8 w-20 text-center" placeholder="--" /></td>
                          <td className="py-2 px-2"><Input className="h-8 w-20 text-center" placeholder="--" /></td>
                          <td className="py-2 px-2"><Input className="h-8 w-20 text-center" placeholder="--%" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Lesiones y Problemas */}
            <Card className="border-0 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white py-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="w-5 h-5" />
                  Lesiones y Problemas de Salud
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">¿Hubo lesiones durante el plan?</label>
                  <Select defaultValue="no">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No hubo lesiones</SelectItem>
                      <SelectItem value="leve">Lesiones leves</SelectItem>
                      <SelectItem value="moderada">Lesiones moderadas</SelectItem>
                      <SelectItem value="grave">Lesiones graves</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Descripción de lesiones/problemas</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder="Describir las lesiones ocurridas, su causa probable y tiempo de recuperación..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Días perdidos por lesión</label>
                  <Input type="number" placeholder="0" className="border-slate-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conclusiones y Recomendaciones */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lightbulb className="w-5 h-5" />
                Conclusiones y Recomendaciones para el Nuevo Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Conclusiones Principales</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none" rows={4} placeholder="Resumen de los principales aprendizajes del plan anterior..." />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Recomendaciones para el Próximo Plan</label>
                <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none" rows={4} placeholder="Qué mantener, qué cambiar, qué nuevos enfoques aplicar..." />
              </div>
            </CardContent>
          </Card>

          {/* Nota Final */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-xl p-4 text-center shadow-lg">
            <p className="text-white/90 text-sm">
              <Sparkles className="w-4 h-4 inline mr-2 text-amber-400" />
              Este análisis es fundamental para la mejora continua del proceso de entrenamiento y evitar repetir errores del pasado.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" className="border-slate-300">
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button className="bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 text-white shadow-lg">
              <Save className="w-4 h-4 mr-2" />
              Guardar Análisis
            </Button>
          </div>
        </div>
      );
    }

    // Render Sport Characterization component
    if (activeDataSection === 'sport-char') {
      return (
        <div className="p-6 space-y-6 overflow-y-auto h-full bg-gradient-to-br from-slate-50 to-amber-50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-lg mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Catálogo de Deportes</h1>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Organiza los deportes por categorías. Este catálogo se utilizará para asignar deportes a atletas y equipos.
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Trophy className="w-5 h-5" />
                  Categorías y Deportes
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
                      style={{ backgroundColor: category.color }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{category.icon}</span>
                        <span className="font-semibold">{category.name}</span>
                        <Badge className="bg-white/20 text-white border-0 ml-1">
                          {category.sports?.length || 0}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-white/70 hover:text-white hover:bg-white/20"
                          onClick={() => {
                            setShowAddSport(category.id);
                            setNewSport({ name: '', category_id: category.id });
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-white/70 hover:text-red-200 hover:bg-white/20"
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-3">
                      {/* Add sport form for this category */}
                      {showAddSport === category.id && (
                        <div className="mb-3 flex gap-2">
                          <Input 
                            placeholder="Nombre del deporte"
                            value={newSport.name}
                            onChange={(e) => setNewSport({...newSport, name: e.target.value})}
                            className="flex-1 h-8 text-sm"
                          />
                          <Button 
                            size="sm" 
                            className="h-8"
                            style={{ backgroundColor: category.color }}
                            onClick={() => handleAddSport(category.id)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-8"
                            onClick={() => setShowAddSport(null)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                      {/* Sports List */}
                      <div className="flex flex-wrap gap-2">
                        {category.sports && category.sports.length > 0 ? (
                          category.sports.map(sport => (
                            <div 
                              key={sport.id}
                              className="group flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors"
                              style={{ 
                                backgroundColor: category.color + '15',
                                color: category.color
                              }}
                            >
                              {sport.name}
                              <button 
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteSport(category.id, sport.id)}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin deportes agregados</span>
                        )}
                      </div>
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

          {/* Caracterización Técnica del Deporte */}
          <Card className="border-0 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5" />
                Caracterización Técnica del Deporte
              </CardTitle>
              <p className="text-sm text-white/80 mt-1">Selecciona un deporte para definir sus características específicas</p>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Seleccionar Deporte</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar deporte del catálogo" /></SelectTrigger>
                    <SelectContent>
                      {sportsCatalog.map(cat => (
                        <React.Fragment key={cat.id}>
                          <div className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-50">{cat.icon} {cat.name}</div>
                          {cat.sports?.map(sport => (
                            <SelectItem key={sport.id} value={sport.id}>{sport.name}</SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Organización del Movimiento</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ciclico">Cíclico</SelectItem>
                      <SelectItem value="aciclico">Acíclico</SelectItem>
                      <SelectItem value="mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Vía Energética Predominante</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar vía" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aerobica">Aeróbica</SelectItem>
                      <SelectItem value="anaerobica-lactica">Anaeróbica Láctica</SelectItem>
                      <SelectItem value="anaerobica-alactica">Anaeróbica Aláctica</SelectItem>
                      <SelectItem value="mixta">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sustrato Energético Principal</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar sustrato" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atp-pc">ATP-PC (Fosfágenos)</SelectItem>
                      <SelectItem value="glucogeno">Glucógeno</SelectItem>
                      <SelectItem value="lipidos">Lípidos</SelectItem>
                      <SelectItem value="mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tipo de Fibra Predominante</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tipo-i">Tipo I (Lentas/Oxidativas)</SelectItem>
                      <SelectItem value="tipo-iia">Tipo IIA (Rápidas Oxidativas)</SelectItem>
                      <SelectItem value="tipo-iib">Tipo IIB (Rápidas Glucolíticas)</SelectItem>
                      <SelectItem value="mixto">Mixto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Tipo de Esfuerzo</label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Seleccionar esfuerzo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="continuo">Continuo</SelectItem>
                      <SelectItem value="intermitente">Intermitente</SelectItem>
                      <SelectItem value="intervalo">Por Intervalos</SelectItem>
                      <SelectItem value="repeticion">Por Repeticiones</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Capacidades Motrices Generales</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder="Fuerza, resistencia, velocidad, flexibilidad, coordinación..." />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Capacidades Motrices Especiales</label>
                  <textarea className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none" rows={3} placeholder="Capacidades específicas del deporte..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline">Cancelar</Button>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar Caracterización
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
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

    // ====== NUEVAS SECCIONES DE EVALUACIÓN ======

    // Análisis Biomecánico
    if (activeDataSection === 'biomechanical') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Activity className="w-7 h-7 text-emerald-500" />
                Análisis Biomecánico
              </h2>
              <p className="text-slate-500 mt-1">Evaluación del movimiento y técnica deportiva</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-emerald-100 text-emerald-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Análisis de Marcha/Carrera */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Análisis de Marcha/Carrera
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Tipo de Pisada</label>
                  <Select defaultValue="neutral">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pronador">Pronador</SelectItem>
                      <SelectItem value="supinador">Supinador</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Longitud de Zancada (cm)</label>
                  <Input type="number" placeholder="120" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Frecuencia de Paso (pasos/min)</label>
                  <Input type="number" placeholder="180" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Tiempo de Contacto (ms)</label>
                  <Input type="number" placeholder="200" />
                </div>
              </CardContent>
            </Card>

            {/* Análisis Postural */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Análisis Postural
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Alineación Columna</label>
                  <Select defaultValue="normal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="cifosis">Cifosis</SelectItem>
                      <SelectItem value="lordosis">Lordosis</SelectItem>
                      <SelectItem value="escoliosis">Escoliosis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Inclinación Pélvica</label>
                  <Select defaultValue="neutral">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anterior">Anterior</SelectItem>
                      <SelectItem value="posterior">Posterior</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Alineación Rodillas</label>
                  <Select defaultValue="normal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="valgo">Valgo (X)</SelectItem>
                      <SelectItem value="varo">Varo (O)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Rangos de Movimiento */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Rangos de Movimiento (ROM)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Hombro Flex.</label>
                    <Input type="number" placeholder="180°" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Hombro Ext.</label>
                    <Input type="number" placeholder="60°" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Cadera Flex.</label>
                    <Input type="number" placeholder="120°" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Cadera Ext.</label>
                    <Input type="number" placeholder="30°" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Rodilla Flex.</label>
                    <Input type="number" placeholder="135°" className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Tobillo Dorsi.</label>
                    <Input type="number" placeholder="20°" className="h-8" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Análisis de Fuerza */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Asimetrías de Fuerza
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Fuerza Pierna Izq (kg)</label>
                  <Input type="number" placeholder="85" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Fuerza Pierna Der (kg)</label>
                  <Input type="number" placeholder="90" />
                </div>
                <div className="p-2 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Índice de Asimetría</p>
                  <p className="text-lg font-bold text-orange-600">5.7%</p>
                  <p className="text-xs text-slate-400">Normal: &lt;10%</p>
                </div>
              </CardContent>
            </Card>

            {/* Eficiencia del Movimiento */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Eficiencia del Movimiento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">FMS Score Total (0-21)</label>
                  <Input type="number" placeholder="17" max="21" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Sentadilla Profunda (0-3)</label>
                  <Select defaultValue="2">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Dolor</SelectItem>
                      <SelectItem value="1">1 - Incapaz</SelectItem>
                      <SelectItem value="2">2 - Compensación</SelectItem>
                      <SelectItem value="3">3 - Óptimo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Observaciones */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Observaciones y Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <textarea 
                  className="w-full h-32 p-2 text-sm border rounded-lg resize-none"
                  placeholder="Notas sobre patrones de movimiento, limitaciones observadas, recomendaciones de trabajo correctivo..."
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Evaluación
            </Button>
          </div>
        </div>
      );
    }

    // Control Médico
    if (activeDataSection === 'control-medical') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Heart className="w-7 h-7 text-red-500" />
                Control Médico
              </h2>
              <p className="text-slate-500 mt-1">Estado de salud y aptitud para el entrenamiento</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-red-100 text-red-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Signos Vitales */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-red-500 to-pink-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Signos Vitales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">FC Reposo (lpm)</label>
                    <Input type="number" placeholder="60" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">FC Máxima (lpm)</label>
                    <Input type="number" placeholder="185" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">PA Sistólica (mmHg)</label>
                    <Input type="number" placeholder="120" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">PA Diastólica (mmHg)</label>
                    <Input type="number" placeholder="80" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500">Saturación O2 (%)</label>
                  <Input type="number" placeholder="98" />
                </div>
              </CardContent>
            </Card>

            {/* Antecedentes */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Antecedentes Médicos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Enfermedades Crónicas</label>
                  <textarea className="w-full h-16 p-2 text-sm border rounded-lg resize-none" placeholder="Asma, diabetes, hipertensión..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Alergias</label>
                  <Input placeholder="Medicamentos, alimentos..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Cirugías Previas</label>
                  <Input placeholder="Tipo y fecha" />
                </div>
              </CardContent>
            </Card>

            {/* Lesiones Actuales */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-violet-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Lesiones Actuales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Lesión Activa</label>
                  <Select defaultValue="none">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin lesiones</SelectItem>
                      <SelectItem value="muscular">Muscular</SelectItem>
                      <SelectItem value="articular">Articular</SelectItem>
                      <SelectItem value="osea">Ósea</SelectItem>
                      <SelectItem value="ligamentosa">Ligamentosa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Zona Afectada</label>
                  <Input placeholder="Ej: Rodilla derecha" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Estado de Recuperación</label>
                  <Select defaultValue="na">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="na">N/A</SelectItem>
                      <SelectItem value="aguda">Fase Aguda</SelectItem>
                      <SelectItem value="subaguda">Fase Subaguda</SelectItem>
                      <SelectItem value="rehabilitacion">En Rehabilitación</SelectItem>
                      <SelectItem value="reintegro">Reintegro Deportivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Aptitud Médica */}
            <Card className="border-0 shadow-md col-span-full lg:col-span-1">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Aptitud Médica
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Estado de Aptitud</label>
                  <Select defaultValue="apto">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apto">Apto sin restricciones</SelectItem>
                      <SelectItem value="apto-restriccion">Apto con restricciones</SelectItem>
                      <SelectItem value="no-apto-temporal">No apto temporalmente</SelectItem>
                      <SelectItem value="no-apto">No apto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Fecha Último Chequeo</label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Próximo Chequeo</label>
                  <Input type="date" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Control Médico
            </Button>
          </div>
        </div>
      );
    }

    // Control Físico
    if (activeDataSection === 'control-physical') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Dumbbell className="w-7 h-7 text-blue-500" />
                Control Físico
              </h2>
              <p className="text-slate-500 mt-1">Evaluación de capacidades físicas y condición</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-blue-100 text-blue-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fuerza */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Fuerza
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">1RM Sentadilla (kg)</label>
                  <Input type="number" placeholder="120" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">1RM Press Banca (kg)</label>
                  <Input type="number" placeholder="80" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">1RM Peso Muerto (kg)</label>
                  <Input type="number" placeholder="140" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Fuerza Prensil (kg)</label>
                  <Input type="number" placeholder="45" />
                </div>
              </CardContent>
            </Card>

            {/* Resistencia */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Resistencia
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">VO2 Máx (ml/kg/min)</label>
                  <Input type="number" placeholder="55" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Test Cooper (m)</label>
                  <Input type="number" placeholder="3000" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Umbral Anaeróbico (lpm)</label>
                  <Input type="number" placeholder="165" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Test Yo-Yo (nivel)</label>
                  <Input type="number" placeholder="18.5" />
                </div>
              </CardContent>
            </Card>

            {/* Velocidad */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Velocidad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Sprint 10m (seg)</label>
                  <Input type="number" step="0.01" placeholder="1.80" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Sprint 30m (seg)</label>
                  <Input type="number" step="0.01" placeholder="4.20" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Sprint 60m (seg)</label>
                  <Input type="number" step="0.01" placeholder="7.50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Velocidad Máx (km/h)</label>
                  <Input type="number" step="0.1" placeholder="32.5" />
                </div>
              </CardContent>
            </Card>

            {/* Potencia y Salto */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Potencia / Salto
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">CMJ - Salto Vertical (cm)</label>
                  <Input type="number" placeholder="45" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">SJ - Squat Jump (cm)</label>
                  <Input type="number" placeholder="40" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Salto Horizontal (cm)</label>
                  <Input type="number" placeholder="250" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">RSI (índice)</label>
                  <Input type="number" step="0.01" placeholder="2.50" />
                </div>
              </CardContent>
            </Card>

            {/* Flexibilidad */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Flexibilidad
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Sit and Reach (cm)</label>
                  <Input type="number" placeholder="10" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Test Thomas (grados)</label>
                  <Input type="number" placeholder="15" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Elevación Pierna Recta (°)</label>
                  <Input type="number" placeholder="80" />
                </div>
              </CardContent>
            </Card>

            {/* Agilidad */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-rose-500 to-red-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Agilidad / Coordinación
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Test Illinois (seg)</label>
                  <Input type="number" step="0.01" placeholder="15.50" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Test T (seg)</label>
                  <Input type="number" step="0.01" placeholder="9.80" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">505 Agility (seg)</label>
                  <Input type="number" step="0.01" placeholder="2.40" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Control Físico
            </Button>
          </div>
        </div>
      );
    }

    // Control Técnico
    if (activeDataSection === 'control-technical') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Target className="w-7 h-7 text-violet-500" />
                Control Técnico
              </h2>
              <p className="text-slate-500 mt-1">Evaluación de habilidades técnicas específicas del deporte</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-violet-100 text-violet-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Técnica General */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Evaluación Técnica General
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {['Técnica básica', 'Técnica específica', 'Ejecución bajo presión', 'Consistencia técnica', 'Eficiencia del gesto'].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-600">{item}</label>
                      <span className="text-xs text-slate-400">1-10</span>
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} className="w-8 h-8 rounded-lg border border-slate-200 text-xs hover:bg-violet-100 hover:border-violet-300 transition-colors">
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Habilidades Específicas */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Habilidades Específicas del Deporte
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Habilidad 1</label>
                  <div className="flex gap-2">
                    <Input placeholder="Nombre de la habilidad" className="flex-1" />
                    <Select defaultValue="7">
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Habilidad 2</label>
                  <div className="flex gap-2">
                    <Input placeholder="Nombre de la habilidad" className="flex-1" />
                    <Select defaultValue="6">
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Habilidad 3</label>
                  <div className="flex gap-2">
                    <Input placeholder="Nombre de la habilidad" className="flex-1" />
                    <Select defaultValue="8">
                      <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Habilidad
                </Button>
              </CardContent>
            </Card>

            {/* Observaciones Técnicas */}
            <Card className="border-0 shadow-md col-span-full">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Observaciones y Áreas de Mejora
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Fortalezas Técnicas</label>
                  <textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Describir puntos fuertes técnicos..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Áreas de Mejora</label>
                  <textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Aspectos a trabajar y mejorar..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-violet-600 hover:bg-violet-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Control Técnico
            </Button>
          </div>
        </div>
      );
    }

    // Control Táctico
    if (activeDataSection === 'control-tactical') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Layers className="w-7 h-7 text-amber-500" />
                Control Táctico
              </h2>
              <p className="text-slate-500 mt-1">Evaluación de inteligencia táctica y toma de decisiones</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-amber-100 text-amber-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Capacidades Tácticas */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Capacidades Tácticas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  'Lectura del juego',
                  'Toma de decisiones',
                  'Anticipación',
                  'Posicionamiento',
                  'Comunicación táctica',
                  'Adaptabilidad'
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-slate-600">{item}</label>
                      <span className="text-xs text-slate-400">1-10</span>
                    </div>
                    <div className="flex gap-1">
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <button key={n} className="w-8 h-8 rounded-lg border border-slate-200 text-xs hover:bg-amber-100 hover:border-amber-300 transition-colors">
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Comprensión del Sistema */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Comprensión del Sistema de Juego
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Conocimiento del sistema</label>
                  <Select defaultValue="bueno">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="deficiente">Deficiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Ejecución de roles</label>
                  <Select defaultValue="bueno">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="deficiente">Deficiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Transiciones ofensivas</label>
                  <Select defaultValue="bueno">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="deficiente">Deficiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Transiciones defensivas</label>
                  <Select defaultValue="bueno">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="deficiente">Deficiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Análisis de Situaciones */}
            <Card className="border-0 shadow-md col-span-full">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Análisis y Observaciones Tácticas
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Fortalezas Tácticas</label>
                  <textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Puntos fuertes en lo táctico..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Aspectos a Mejorar</label>
                  <textarea className="w-full h-24 p-2 text-sm border rounded-lg resize-none" placeholder="Áreas de mejora táctica..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Control Táctico
            </Button>
          </div>
        </div>
      );
    }

    // Control Psicológico
    if (activeDataSection === 'control-psychological') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Brain className="w-7 h-7 text-pink-500" />
                Control Psicológico
              </h2>
              <p className="text-slate-500 mt-1">Evaluación del estado mental y habilidades psicológicas</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-pink-100 text-pink-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Estado Emocional */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Estado Emocional Actual
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Nivel de Estrés (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="5" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Nivel de Ansiedad (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="4" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Estado de Ánimo</label>
                  <Select defaultValue="positivo">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="muy-positivo">Muy Positivo</SelectItem>
                      <SelectItem value="positivo">Positivo</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="bajo">Bajo</SelectItem>
                      <SelectItem value="muy-bajo">Muy Bajo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Motivación */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Motivación y Compromiso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Motivación Intrínseca (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="8" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Motivación Extrínseca (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="7" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Compromiso con el Equipo (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="9" />
                </div>
              </CardContent>
            </Card>

            {/* Habilidades Mentales */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Habilidades Mentales
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Concentración (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="7" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Autoconfianza (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="8" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Control de Emociones (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="6" />
                </div>
              </CardContent>
            </Card>

            {/* Rendimiento bajo Presión */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Rendimiento bajo Presión
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Manejo de Presión</label>
                  <Select defaultValue="bueno">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="deficiente">Deficiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Recuperación de Errores</label>
                  <Select defaultValue="bueno">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excelente">Excelente</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="deficiente">Deficiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Calidad de Sueño y Descanso */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Sueño y Descanso
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Horas de Sueño/Noche</label>
                  <Input type="number" step="0.5" placeholder="7.5" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Calidad del Sueño (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="7" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Nivel de Fatiga Mental (1-10)</label>
                  <Input type="number" min="1" max="10" placeholder="4" />
                </div>
              </CardContent>
            </Card>

            {/* Observaciones */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Observaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <textarea 
                  className="w-full h-32 p-2 text-sm border rounded-lg resize-none"
                  placeholder="Notas sobre estado psicológico, situaciones personales relevantes, recomendaciones..."
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-pink-600 hover:bg-pink-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Control Psicológico
            </Button>
          </div>
        </div>
      );
    }

    // Control Teórico
    if (activeDataSection === 'control-theoretical') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <BookOpen className="w-7 h-7 text-cyan-500" />
                Control Teórico
              </h2>
              <p className="text-slate-500 mt-1">Evaluación de conocimientos teóricos del deporte</p>
            </div>
            {selectedAthlete && (
              <Badge className="bg-cyan-100 text-cyan-700">{selectedAthlete.name}</Badge>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Conocimiento del Reglamento */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Conocimiento del Reglamento
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  'Reglas básicas del deporte',
                  'Reglas de competencia',
                  'Sistema de puntuación',
                  'Infracciones y penalizaciones',
                  'Actualizaciones reglamentarias'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item}</span>
                    <Select defaultValue="bueno">
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excelente">Excelente</SelectItem>
                        <SelectItem value="bueno">Bueno</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="deficiente">Deficiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Conocimiento Táctico-Estratégico */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Conocimiento Táctico-Estratégico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  'Sistemas de juego propios',
                  'Análisis de rivales',
                  'Estrategias de competencia',
                  'Roles y funciones',
                  'Principios tácticos'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item}</span>
                    <Select defaultValue="bueno">
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excelente">Excelente</SelectItem>
                        <SelectItem value="bueno">Bueno</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="deficiente">Deficiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Conocimiento Técnico */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-emerald-500 to-green-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Conocimiento Técnico
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  'Fundamentos técnicos',
                  'Progresiones de aprendizaje',
                  'Errores comunes y correcciones',
                  'Biomecánica del gesto',
                  'Tendencias técnicas actuales'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item}</span>
                    <Select defaultValue="bueno">
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excelente">Excelente</SelectItem>
                        <SelectItem value="bueno">Bueno</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="deficiente">Deficiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Conocimiento de Preparación Física */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Conocimiento de Preparación Física
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {[
                  'Principios del entrenamiento',
                  'Nutrición deportiva básica',
                  'Prevención de lesiones',
                  'Métodos de recuperación',
                  'Periodización'
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{item}</span>
                    <Select defaultValue="regular">
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excelente">Excelente</SelectItem>
                        <SelectItem value="bueno">Bueno</SelectItem>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="deficiente">Deficiente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Evaluación y Observaciones */}
            <Card className="border-0 shadow-md col-span-full">
              <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-700 text-white py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Evaluación General y Recomendaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Nota Global Teórica</label>
                  <Select defaultValue="7">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => (
                        <SelectItem key={n} value={String(n)}>{n} - {n <= 3 ? 'Deficiente' : n <= 5 ? 'Regular' : n <= 7 ? 'Bueno' : 'Excelente'}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium text-slate-500">Temas a Reforzar</label>
                  <textarea className="w-full h-20 p-2 text-sm border rounded-lg resize-none" placeholder="Lista de temas que el atleta debe estudiar o reforzar..." />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancelar</Button>
            <Button className="bg-cyan-600 hover:bg-cyan-700">
              <Save className="w-4 h-4 mr-2" />
              Guardar Control Teórico
            </Button>
          </div>
        </div>
      );
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
      // Define sections and colors for horizontal navigation
      const sections = [
        { key: 'punto-partida', title: 'Punto de Partida', color: 'rose', icon: FileText },
        { key: 'informacion', title: 'Información', color: 'indigo', icon: Building2 },
        { key: 'evaluacion', title: 'Evaluación', color: 'emerald', icon: LineChart },
        { key: 'competencias', title: 'Competencias', color: 'violet', icon: Trophy },
        { key: 'entrenamiento', title: 'Entrenamiento', color: 'blue', icon: Activity },
        { key: 'visualizacion', title: 'Visualización', color: 'amber', icon: Layers },
        { key: 'herramientas', title: 'Herramientas', color: 'slate', icon: Settings },
      ];

      const colorClasses = {
        rose: { bg: 'bg-rose-500', hover: 'hover:bg-rose-600', shadow: 'shadow-rose-200', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-500' },
        indigo: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', shadow: 'shadow-indigo-200', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-500' },
        emerald: { bg: 'bg-emerald-500', hover: 'hover:bg-emerald-600', shadow: 'shadow-emerald-200', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-500' },
        violet: { bg: 'bg-violet-500', hover: 'hover:bg-violet-600', shadow: 'shadow-violet-200', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-500' },
        blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', shadow: 'shadow-blue-200', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-600' },
        amber: { bg: 'bg-amber-500', hover: 'hover:bg-amber-600', shadow: 'shadow-amber-200', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500' },
        slate: { bg: 'bg-slate-600', hover: 'hover:bg-slate-700', shadow: 'shadow-slate-200', light: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-600' },
      };

      // Get current section based on active data section
      const currentSection = navItems.find(n => n.id === activeDataSection)?.section || 'punto-partida';
      const currentSectionData = sections.find(s => s.key === currentSection);
      const currentColors = colorClasses[currentSectionData?.color || 'rose'];
      const sectionItems = navItems.filter(i => i.section === currentSection);

      return (
        <div className="flex flex-col h-full">
          {/* Header Bar - Section Categories */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-4 py-3 shadow-xl">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {sections.map((section) => {
                const SectionIcon = section.icon;
                const colors = colorClasses[section.color];
                const isActive = currentSection === section.key;
                
                return (
                  <button
                    key={section.key}
                    onClick={() => {
                      const firstItem = navItems.find(n => n.section === section.key);
                      if (firstItem) setActiveDataSection(firstItem.id);
                    }}
                    className={`group relative px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
                      isActive
                        ? `${colors.bg} text-white shadow-lg ${colors.shadow} scale-105`
                        : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <SectionIcon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/60 group-hover:text-white'}`} />
                    <span className="hidden sm:inline">{section.title}</span>
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-lg" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sub-navigation - Floating Pills */}
          <div className="bg-white border-b shadow-sm px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {sectionItems.map((item) => {
                const ItemIcon = item.icon;
                const isActive = activeDataSection === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveDataSection(item.id)}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                      isActive
                        ? `${currentColors.bg} text-white shadow-lg ${currentColors.shadow} transform scale-105`
                        : `${currentColors.light} ${currentColors.text} hover:shadow-md hover:scale-102 border ${currentColors.border} border-opacity-30`
                    }`}
                    style={{
                      boxShadow: isActive ? `0 4px 14px 0 ${currentSectionData?.color === 'indigo' ? 'rgba(99, 102, 241, 0.4)' : 
                        currentSectionData?.color === 'emerald' ? 'rgba(16, 185, 129, 0.4)' :
                        currentSectionData?.color === 'violet' ? 'rgba(139, 92, 246, 0.4)' :
                        currentSectionData?.color === 'blue' ? 'rgba(37, 99, 235, 0.4)' :
                        currentSectionData?.color === 'amber' ? 'rgba(245, 158, 11, 0.4)' :
                        'rgba(100, 116, 139, 0.4)'}` : undefined
                    }}
                  >
                    <ItemIcon className={`w-4 h-4 ${isActive ? 'text-white' : ''}`} />
                    {item.label}
                  </button>
                );
              })}
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
        <div className="flex items-center justify-between px-4 py-2 gap-3">
          {/* Left: Logo + Navigation */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-md">
                <span className="text-blue-600 font-bold text-lg">T</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight hidden sm:block">
                <span className="text-white">Tr</span>
                <span className="text-blue-200">AI</span>
                <span className="text-white">n</span>
              </h1>
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-white/20 hidden md:block" />

            {/* Panel Tabs */}
            <div className="hidden md:flex items-center gap-1 bg-white/10 rounded-xl p-1">
              {['panel', 'datos'].map((panelType) => (
                <button
                  key={panelType}
                  onClick={() => {
                    setActivePanel(panelType);
                    if (panelType === 'datos') setActiveDataSection(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                    activePanel === panelType 
                      ? 'bg-white text-indigo-600 shadow-md' 
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                  data-testid={`tab-${panelType}`}
                >
                  {panelType === 'panel' ? (
                    <>
                      <LayoutDashboard className="w-3.5 h-3.5" />
                      <span>Panel</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Datos</span>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Export PDF Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPdfModalOpen(true)}
              className="h-8 text-xs bg-white/20 border-0 text-white hover:bg-white/30 rounded-xl"
              data-testid="export-pdf-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>

          {/* Right: Filters Dropdown + Auto Testing */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Filters Dropdown Button */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
                className={`h-8 text-xs rounded-xl transition-all ${
                  showFiltersDropdown
                    ? 'bg-white text-indigo-600 hover:bg-white/90'
                    : 'bg-white/20 border-0 text-white hover:bg-white/30'
                }`}
                data-testid="filters-dropdown-btn"
              >
                <Filter className="w-3.5 h-3.5 mr-1" />
                <span className="hidden sm:inline">Filtros</span>
                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${showFiltersDropdown ? 'rotate-180' : ''}`} />
              </Button>

              {/* Filters Dropdown Panel */}
              {showFiltersDropdown && (
                <>
                  {/* Backdrop to close on click outside */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowFiltersDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 min-w-[320px]">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        <Filter className="w-4 h-4 text-indigo-500" />
                        Filtros de Contexto
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFiltersDropdown(false)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Entity Selector */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Entidad</label>
                        <Select value={globalContext.entityId} onValueChange={handleEntityChange}>
                          <SelectTrigger className="w-full h-9 text-sm" data-testid="context-entity-select">
                            <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
                            <SelectValue placeholder="Seleccionar entidad" />
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
                      </div>

                      {/* Team Selector */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Equipo</label>
                        <Select value={globalContext.teamId} onValueChange={handleTeamChange}>
                          <SelectTrigger className="w-full h-9 text-sm" data-testid="context-team-select">
                            <Users className="w-4 h-4 mr-2 text-indigo-500" />
                            <SelectValue placeholder="Seleccionar equipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los equipos</SelectItem>
                            {filteredTeams.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Athlete Selector */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Atleta</label>
                        <Select value={globalContext.athleteId} onValueChange={handleAthleteChange}>
                          <SelectTrigger className="w-full h-9 text-sm" data-testid="context-athlete-select">
                            <User className="w-4 h-4 mr-2 text-indigo-500" />
                            <SelectValue placeholder="Seleccionar atleta" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los atletas</SelectItem>
                            {filteredAthletes.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sport Selector */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Deporte</label>
                        <Select value={globalContext.sportId} onValueChange={handleSportChange}>
                          <SelectTrigger className="w-full h-9 text-sm" data-testid="context-sport-select">
                            <Trophy className="w-4 h-4 mr-2 text-indigo-500" />
                            <SelectValue placeholder="Seleccionar deporte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos los deportes</SelectItem>
                            {allSports.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Active Filters Summary */}
                      {(globalContext.entityId !== 'all' || globalContext.teamId !== 'all' || 
                        globalContext.athleteId !== 'all' || globalContext.sportId !== 'all') && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500">Filtros activos</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setGlobalContext({ entityId: 'all', teamId: 'all', athleteId: 'all', sportId: 'all' });
                              }}
                              className="h-6 text-xs text-indigo-600 hover:text-indigo-700"
                            >
                              Limpiar todo
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Auto Testing System */}
            <div className="hidden sm:block">
              <AutoTestingSystem 
                onLoadTemplate={(plan) => {
                  const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
                  setGeneratedPlans(savedPlans);
                  setIsCoachDrawerOpen(true);
                  setCoachDrawerTab('history');
                  toast.success('Template cargado - Ver en Historial');
                }}
                onSavePlan={(plan) => {
                  const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
                  setGeneratedPlans(savedPlans);
                  setIsCoachDrawerOpen(true);
                  setCoachDrawerTab('history');
                }}
                currentUser={user}
                sportsCatalog={sportsCatalog}
              />
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-white/20 hidden md:block" />

            {/* User Actions */}
            <div className="flex items-center gap-1">
              <Link to="/subscription">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs bg-white/10 hover:bg-white/20 text-white rounded-xl"
                  data-testid="subscription-btn"
                >
                  <CreditCard className="w-3.5 h-3.5 mr-1" />
                  <span className="hidden lg:inline">Suscripción</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="h-8 px-3 text-xs bg-white/10 hover:bg-red-500/80 text-white rounded-xl"
                data-testid="logout-btn"
              >
                <LogOut className="w-3.5 h-3.5 mr-1" />
                <span className="hidden lg:inline">Salir</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content (with padding for fixed bar) */}
      <div className="pt-[52px] h-screen max-h-screen overflow-hidden">
        {/* Mobile Panel Tabs - Only visible on small screens */}
        <div className="flex md:hidden gap-2 p-4 bg-white border-b">
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
              data-testid={`tab-mobile-${panelType}`}
            >
              {panelType === 'panel' ? 'Panel' : 'Datos'}
            </button>
          ))}
        </div>

        {/* Main Content - Full Width */}
        <div className="h-full overflow-hidden">
          {renderMainContent()}
        </div>
      </div>

      {/* ====== COACH AI FLOATING BUTTON ====== */}
      <button
        onClick={() => setIsCoachDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        data-testid="coach-ai-fab"
      >
        <Brain className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-10 right-0 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Coach AI
        </span>
      </button>

      {/* ====== COACH AI DRAWER ====== */}
      {isCoachDrawerOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setIsCoachDrawerOpen(false)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed right-0 top-0 h-full w-96 max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Coach AI</h2>
                    <p className="text-xs text-white/70">Tu asistente de entrenamiento</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCoachDrawerOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              
              {/* Drawer Tabs */}
              <div className="flex gap-1 bg-white/10 rounded-lg p-1">
                <button
                  onClick={() => setCoachDrawerTab('coach')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                    coachDrawerTab === 'coach'
                      ? 'bg-white text-indigo-600 shadow'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Brain className="w-4 h-4" />
                  Coach AI
                </button>
                <button
                  onClick={() => setCoachDrawerTab('history')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                    coachDrawerTab === 'history'
                      ? 'bg-white text-indigo-600 shadow'
                      : 'text-white/80 hover:bg-white/10'
                  }`}
                >
                  <History className="w-4 h-4" />
                  Planes
                  {trainingPlans.length > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      coachDrawerTab === 'history' ? 'bg-indigo-100 text-indigo-600' : 'bg-white/20'
                    }`}>
                      {trainingPlans.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-grow overflow-hidden flex flex-col">
              {coachDrawerTab === 'coach' ? (
                /* AI Assistant View */
                <AITrainingAssistant 
                  selectedAthlete={athletes.find(a => a.id === selectedAthleteId)}
                  sportsCatalog={sportsCatalog}
                />
              ) : (
                /* Plans History View - Shows real training plans from DB */
                <div className="flex-grow flex flex-col overflow-hidden">
                  {/* Plan Activo Indicator */}
                  {activePlan && (
                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-emerald-600 font-medium">Plan Activo</p>
                          <p className="text-sm font-bold text-emerald-800 truncate">{activePlan.name}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetActivePlan(null)}
                          className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-100"
                        >
                          Cambiar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* New Plan Button */}
                  <div className="p-3 border-b bg-slate-50">
                    <Button
                      onClick={() => {
                        setIsCoachDrawerOpen(false);
                        setActivePanel('datos');
                        setActiveDataSection('training-system');
                      }}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                      data-testid="new-plan-btn"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Nuevo Plan
                    </Button>
                  </div>
                  
                  {/* Plans List from Database */}
                  <div className="flex-grow overflow-y-auto">
                    {loadingPlans ? (
                      <div className="flex flex-col items-center justify-center h-full p-6">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                        <p className="text-sm text-slate-500">Cargando planes...</p>
                      </div>
                    ) : trainingPlans.length > 0 ? (
                      <div className="divide-y">
                        {trainingPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors group ${
                              activePlan?.id === plan.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                            }`}
                            onClick={() => handleSetActivePlan(plan)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-medium text-slate-900 truncate">
                                    {plan.name}
                                  </h4>
                                  {activePlan?.id === plan.id && (
                                    <Badge className="bg-emerald-100 text-emerald-700 text-xs">Activo</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {plan.sport || 'General'} • {plan.model_name || plan.model} • {plan.total_weeks} sem
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  Inicio: {plan.start_date ? new Date(plan.start_date).toLocaleDateString('es-ES') : 'No definido'}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsCoachDrawerOpen(false);
                                    setActivePanel('datos');
                                    setActiveDataSection('training-system');
                                    // El componente PeriodizationComplete cargará el plan
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-slate-400 hover:text-blue-500"
                                  title="Ver/Editar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTrainingPlan(plan.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                        <FileText className="w-16 h-16 text-slate-200 mb-4" />
                        <p className="text-sm font-medium text-slate-500 mb-1">Sin planes de entrenamiento</p>
                        <p className="text-xs text-slate-400 mb-4">Crea tu primer plan para comenzar</p>
                        <Button
                          onClick={() => {
                            setIsCoachDrawerOpen(false);
                            setActivePanel('datos');
                            setActiveDataSection('training-system');
                          }}
                          variant="outline"
                          size="sm"
                          className="text-indigo-600 border-indigo-200"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Crear Plan
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer - User Info Only */}
            <div className="border-t bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500">
                    {USER_ROLES.find(r => r.id === user?.role)?.name || user?.role || 'Usuario'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        athleteId={selectedAthleteId}
        athleteName={athletes.find(a => a.id === selectedAthleteId)?.name}
        periodizationData={periodizationData}
      />
    </div>
  );
};

export default DashboardPage;
