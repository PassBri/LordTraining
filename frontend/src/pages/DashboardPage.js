import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getDashboardStats, getAthletes, seedExercises } from '../services/api';
import { 
  Target, Send, Heart, Zap, Brain, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  FileText, Users, Clipboard, Calendar, Award, BookOpen, 
  Activity, BarChart, LineChart, Loader2, LogOut, Save, Download, Layers, Plus, Dumbbell
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
import PeriodizationPlanner from '../components/PeriodizationPlanner';
import ExerciseLibrary from '../components/ExerciseLibrary';
import PeriodizationSystem from '../components/PeriodizationSystem';

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState('datos');
  const [activeDataSection, setActiveDataSection] = useState('athletes');
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('macrociclo');
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: 'Bienvenido al asistente de planificación deportiva. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Form States
  const [newAthlete, setNewAthlete] = useState({
    name: '', email: '', birthDate: '', gender: '', sport: '', category: '', level: ''
  });
  const [newEvent, setNewEvent] = useState({
    name: '', type: '', date: '', location: '', objective: '', priority: ''
  });
  const [events, setEvents] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [savingAthlete, setSavingAthlete] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);
  const [periodizationData, setPeriodizationData] = useState(null);

  // API Base URL
  const API_URL = process.env.REACT_APP_BACKEND_URL;

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

  // Create new athlete
  const handleCreateAthlete = async () => {
    if (!newAthlete.name || !newAthlete.sport) {
      alert('Por favor ingresa al menos el nombre y el deporte');
      return;
    }
    setSavingAthlete(true);
    try {
      const token = localStorage.getItem('train_token');
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
          notes: `Categoría: ${newAthlete.category || 'N/A'}, Género: ${newAthlete.gender || 'N/A'}`
        })
      });
      if (response.ok) {
        await fetchAthletes();
        setNewAthlete({ name: '', email: '', birthDate: '', gender: '', sport: '', category: '', level: '' });
      } else {
        const error = await response.json();
        alert(error.detail || 'Error al crear atleta');
      }
    } catch (error) {
      console.error('Error creating athlete:', error);
      alert('Error al crear atleta');
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

  // Navigation items for "Datos" panel - Ordenados por flujo de trabajo del entrenador
  const navItems = [
    // === 1. REGISTRO Y CARACTERIZACIÓN ===
    { id: 'athletes', label: 'Atletas', icon: Users, section: 'registro' },
    { id: 'sport-char', label: 'Caracterización del deporte', icon: Target, section: 'registro' },
    { id: 'athlete-char', label: 'Caracterización del deportista', icon: Users, section: 'registro' },
    
    // === 2. EVALUACIÓN INICIAL ===
    { id: 'anthropometric', label: 'Datos antropométricos', icon: LineChart, section: 'evaluacion' },
    { id: 'tests', label: 'Test y evaluaciones', icon: Clipboard, section: 'evaluacion' },
    { id: 'diagnostic', label: 'Diagnóstico', icon: Clipboard, section: 'evaluacion' },
    { id: 'injuries', label: 'Lesiones', icon: Heart, section: 'evaluacion' },
    { id: 'diseases', label: 'Enfermedades', icon: Activity, section: 'evaluacion' },
    
    // === 3. ANÁLISIS PREVIO ===
    { id: 'prev-plan', label: 'Análisis del plan anterior', icon: FileText, section: 'analisis' },
    { id: 'competitions', label: 'Análisis de competencias', icon: Award, section: 'analisis' },
    
    // === 4. DEFINICIÓN DE OBJETIVOS ===
    { id: 'events', label: 'Calendario de eventos', icon: Calendar, section: 'objetivos' },
    { id: 'objectives', label: 'Objetivos e indicadores', icon: Target, section: 'objetivos' },
    
    // === 5. PLANIFICACIÓN ===
    { id: 'periodization-models', label: 'Modelos de periodización', icon: BookOpen, section: 'planificacion' },
    { id: 'macrocycle-stages', label: 'Etapas del macrociclo', icon: BookOpen, section: 'planificacion' },
    { id: 'exercises', label: 'Medios de entrenamiento', icon: Activity, section: 'planificacion' },
    { id: 'exercises-lib', label: 'Biblioteca de ejercicios', icon: Dumbbell, section: 'planificacion' },
    
    // === 6. CONTROL Y SEGUIMIENTO ===
    { id: 'load', label: 'Carga de entrenamiento', icon: BarChart, section: 'control' },
    { id: 'control', label: 'Control de entrenamiento', icon: LineChart, section: 'control' },
    
    // === 7. HERRAMIENTAS ===
    { id: 'graphic-plan', label: 'Plan Gráfico', icon: Layers, section: 'herramientas' },
    { id: 'calendar-view', label: 'Calendario', icon: Calendar, section: 'herramientas' },
    { id: 'ai-generator', label: 'Generar con IA', icon: Brain, section: 'herramientas' },
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
          text: 'Gracias por tu consulta. Para generar un plan personalizado, ve a la sección "Periodizar" y configura los parámetros del atleta.' 
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
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="w-5 h-5" />
                  Gestión de Atletas
                </div>
                <span className="text-sm bg-white/20 px-3 py-1 rounded-full">{athletes.length} registrados</span>
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
                  <Button 
                    className="bg-indigo-500 hover:bg-indigo-600 h-10 font-medium"
                    onClick={handleCreateAthlete}
                    disabled={savingAthlete}
                  >
                    {savingAthlete ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                    Agregar
                  </Button>
                </div>
              </div>
              
              {/* Lista de atletas */}
              <div className="space-y-3">
                {athletes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No hay atletas registrados</p>
                    <p className="text-sm mt-1">Agrega tu primer atleta usando el formulario arriba</p>
                  </div>
                ) : (
                  athletes.map(athlete => (
                    <div key={athlete.id} className={`flex items-center justify-between p-4 bg-white border rounded-xl hover:shadow-md transition-all duration-200 ${selectedAthleteId === athlete.id ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-slate-200 hover:border-indigo-200'}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                          <span className="text-white font-bold text-lg">{athlete.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{athlete.name}</p>
                          <p className="text-sm text-slate-500">{athlete.sport} • {athlete.level || 'Sin nivel'} • {athlete.age} años</p>
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
                  ))
                )}
              </div>
            </CardContent>
          </Card>
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

    // Render Objetivos e Indicadores - COMPLETE
    if (activeDataSection === 'objectives') {
      return (
        <div className="p-4 space-y-4">
          <Card className="border-0 shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-violet-500 to-violet-600 text-white py-4 px-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Target className="w-5 h-5" />
                  Objetivos e Indicadores del Plan
                </div>
                <Button size="sm" className="bg-white/20 hover:bg-white/30 font-medium">
                  <Plus className="w-4 h-4 mr-1" /> Nuevo Objetivo
                </Button>
              </div>
            </div>
            <CardContent className="p-5">
              {/* Objetivos por categoría */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Objetivos Físicos - Rose */}
                <div className="border border-rose-200 rounded-xl overflow-hidden">
                  <div className="bg-rose-100 px-4 py-3 font-semibold text-rose-700 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" /> Objetivos Físicos
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50">
                      <span className="text-sm font-medium text-slate-700">VO2 Max</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">52</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">58 ml/kg/min</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50">
                      <span className="text-sm font-medium text-slate-700">Fuerza máxima (Sentadilla)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">120kg</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">140kg</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50/50">
                      <span className="text-sm font-medium text-slate-700">Velocidad 100m</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">11.5s</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">10.8s</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-rose-600 hover:bg-rose-50">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>

                {/* Objetivos Técnicos - Indigo */}
                <div className="border border-indigo-200 rounded-xl overflow-hidden">
                  <div className="bg-indigo-100 px-4 py-3 font-semibold text-indigo-700 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Objetivos Técnicos
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50">
                      <span className="text-sm font-medium text-slate-700">Eficiencia técnica salida</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">70%</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">90%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50">
                      <span className="text-sm font-medium text-slate-700">Tiempo de reacción</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">0.18s</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">0.14s</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-indigo-600 hover:bg-indigo-50">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>

                {/* Objetivos Tácticos - Amber */}
                <div className="border border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-100 px-4 py-3 font-semibold text-amber-700 flex items-center gap-2">
                    <Brain className="w-4 h-4" /> Objetivos Tácticos
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50">
                      <span className="text-sm font-medium text-slate-700">Gestión de carrera</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Mejorar distribución</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50">
                      <span className="text-sm font-medium text-slate-700">Estrategia competitiva</span>
                      <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">3 variantes tácticas</span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-amber-600 hover:bg-amber-50">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>

                {/* Objetivos Psicológicos - Violet */}
                <div className="border border-violet-200 rounded-xl overflow-hidden">
                  <div className="bg-violet-100 px-4 py-3 font-semibold text-violet-700 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Objetivos Psicológicos
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50">
                      <span className="text-sm font-medium text-slate-700">Control de ansiedad</span>
                      <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">Escala 3→7/10</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50">
                      <span className="text-sm font-medium text-slate-700">Concentración</span>
                      <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">Mantener foco 100%</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50">
                      <span className="text-sm font-medium text-slate-700">Motivación</span>
                      <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2 py-0.5 rounded">Alta constante</span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs text-violet-600 hover:bg-violet-50">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>
              </div>

              {/* KPIs Generales */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-5 rounded-xl border border-slate-200">
                <h4 className="font-semibold mb-4 text-slate-800 flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-violet-500" />
                  Indicadores Clave de Rendimiento (KPIs)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-indigo-100 text-center shadow-sm">
                    <p className="text-3xl font-bold text-indigo-500">85%</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Cumplimiento Plan</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-emerald-100 text-center shadow-sm">
                    <p className="text-3xl font-bold text-emerald-500">+12%</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Mejora Rendimiento</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-amber-100 text-center shadow-sm">
                    <p className="text-3xl font-bold text-amber-500">0.85</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Ratio Carga (ACWR)</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-violet-100 text-center shadow-sm">
                    <p className="text-3xl font-bold text-violet-500">92%</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Asistencia</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
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

    // Render Periodization System (Auto-generation with charts)
    if (activeDataSection === 'periodization-models') {
      const selectedAthlete = athletes.find(a => a.id === selectedAthleteId);
      return <PeriodizationSystem athleteId={selectedAthleteId} athleteName={selectedAthlete?.name} />;
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
                  { key: 'registro', title: 'Registro y Caracterización', color: 'indigo' },
                  { key: 'evaluacion', title: 'Evaluación Inicial', color: 'emerald' },
                  { key: 'analisis', title: 'Análisis Previo', color: 'amber' },
                  { key: 'objetivos', title: 'Definición de Objetivos', color: 'violet' },
                  { key: 'planificacion', title: 'Planificación', color: 'cyan' },
                  { key: 'control', title: 'Control y Seguimiento', color: 'rose' },
                  { key: 'herramientas', title: 'Herramientas', color: 'slate' },
                ];

                const colorClasses = {
                  indigo: { header: 'bg-indigo-500', item: 'indigo', active: 'bg-indigo-50 border-indigo-500 text-indigo-700', hover: 'hover:bg-indigo-50/50' },
                  emerald: { header: 'bg-emerald-500', item: 'emerald', active: 'bg-emerald-50 border-emerald-500 text-emerald-700', hover: 'hover:bg-emerald-50/50' },
                  amber: { header: 'bg-amber-500', item: 'amber', active: 'bg-amber-50 border-amber-500 text-amber-700', hover: 'hover:bg-amber-50/50' },
                  violet: { header: 'bg-violet-500', item: 'violet', active: 'bg-violet-50 border-violet-500 text-violet-700', hover: 'hover:bg-violet-50/50' },
                  cyan: { header: 'bg-cyan-500', item: 'cyan', active: 'bg-cyan-50 border-cyan-500 text-cyan-700', hover: 'hover:bg-cyan-50/50' },
                  rose: { header: 'bg-rose-500', item: 'rose', active: 'bg-rose-50 border-rose-500 text-rose-700', hover: 'hover:bg-rose-50/50' },
                  slate: { header: 'bg-slate-600', item: 'slate', active: 'bg-slate-100 border-slate-600 text-slate-800', hover: 'hover:bg-slate-50' },
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
    
    // Periodizar panel - Con tabs de navegación
    return (
      <div className="p-4 overflow-y-auto h-full">
        {/* Header con info y tabs */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg mb-4">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <h2 className="text-xl font-bold text-white">Planificador de Entrenamiento</h2>
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-2 text-white">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
                    <Heart className="h-4 w-4" />
                    <span>75 bpm</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg text-sm">
                    <Zap className="h-4 w-4" />
                    <span>85%</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                    <Save className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                  <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white">
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Form inputs row */}
          <div className="bg-white p-3 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Input placeholder="Competencia" className="h-9" />
            <Input placeholder="Tipo de Competencia" className="h-9" />
            <Input placeholder="Deporte" className="h-9" />
            <Input placeholder="Modalidad" className="h-9" />
            <Input placeholder="Categoría" className="h-9" />
            <Input placeholder="Entrenador" className="h-9" />
          </div>
          
          {/* Sub-navigation tabs */}
          <div className="bg-gray-50 border-t flex">
            {[
              { id: 'macrociclo', label: 'Macrociclo' },
              { id: 'mesociclos', label: 'Mesociclos' },
              { id: 'microciclos', label: 'Microciclos' },
              { id: 'sesion', label: 'Sesión' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeSubTab === tab.id 
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid={`subtab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Render content based on sub-tab */}
        {activeSubTab === 'sesion' ? (
          <SessionPlanning athleteId={selectedAthleteId} />
        ) : activeSubTab === 'macrociclo' || activeSubTab === 'mesociclos' || activeSubTab === 'microciclos' ? (
          <PeriodizationPlanner athleteId={selectedAthleteId} />
        ) : (
          <ComprehensiveTrainingPlanner athleteId={selectedAthleteId} />
        )}
      </div>
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
    <div className="flex h-screen max-h-screen overflow-hidden bg-gray-50">
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
          {['datos', 'periodizar'].map((panel) => (
            <button
              key={panel}
              onClick={() => {
                setActivePanel(panel);
                if (panel === 'datos') setActiveDataSection(null);
              }}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activePanel === panel 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
              data-testid={`tab-${panel}`}
            >
              {panel === 'datos' ? 'Datos' : 'Periodizar'}
            </button>
          ))}
        </div>

        {/* AI Chat Card */}
        <Card className="flex-grow flex flex-col shadow-lg overflow-hidden">
          <CardHeader className="bg-blue-600 py-3 px-4">
            <CardTitle className="text-base text-white">Asistente IA de Entrenamiento</CardTitle>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
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

        {/* User info and logout */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 uppercase">{user?.subscription || 'Free'}</p>
            </div>
          </div>
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
    </div>
  );
};

export default DashboardPage;
