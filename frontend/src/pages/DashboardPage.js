import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getDashboardStats, getAthletes, seedExercises } from '../services/api';
import { 
  Target, Send, Heart, Zap, Brain, ChevronLeft, ChevronRight,
  FileText, Users, Clipboard, Calendar, Award, BookOpen, 
  Activity, BarChart, LineChart, Loader2, LogOut, Save, Download
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

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState('periodizar');
  const [activeDataSection, setActiveDataSection] = useState(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('plan-grafico');
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: 'Bienvenido al asistente de planificación deportiva. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Navigation items for "Datos" panel
  const navItems = [
    { id: 'prev-plan', label: 'Análisis del plan anterior', icon: FileText, component: 'analysis' },
    { id: 'sport-char', label: 'Caracterización del deporte', icon: Target },
    { id: 'athlete-char', label: 'Caracterización de deportistas', icon: Users },
    { id: 'diagnostic', label: 'Diagnóstico', icon: Clipboard },
    { id: 'injuries', label: 'Lesiones', icon: Heart },
    { id: 'diseases', label: 'Enfermedades', icon: Activity },
    { id: 'anthropometric', label: 'Datos antropométricos', icon: LineChart },
    { id: 'tests', label: 'Test', icon: Clipboard },
    { id: 'events', label: 'Calendario de eventos', icon: Calendar },
    { id: 'competitions', label: 'Análisis de competencias', icon: Award },
    { id: 'principles', label: 'Principios del entrenamiento', icon: BookOpen },
    { id: 'exercises', label: 'Medios de entrenamiento', icon: Activity },
    { id: 'load', label: 'Carga de entrenamiento', icon: BarChart },
    { id: 'objectives', label: 'Objetivos e indicadores', icon: Target },
    { id: 'control', label: 'Control de entrenamiento', icon: LineChart },
  ];

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

    // Render Training Stages (Principles)
    if (activeDataSection === 'principles') {
      return <TrainingStages athleteId={selectedAthleteId} />;
    }

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
          <CardContent className="p-6">
            <p className="text-gray-600 mb-4">
              Contenido detallado para {sectionLabel}
            </p>
            {activeDataSection === 'athlete-char' && athletes.length > 0 && (
              <div className="space-y-3">
                {athletes.map(athlete => (
                  <div key={athlete.id} className="p-4 bg-gray-50 rounded-lg flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                      {athlete.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{athlete.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{athlete.sport} • {athlete.level}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeDataSection === 'athlete-char' && athletes.length === 0 && (
              <Link to="/athletes">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Users className="w-4 h-4 mr-2" />
                  Añadir Atletas
                </Button>
              </Link>
            )}
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
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveDataSection(item.id)}
                    className={`w-full p-4 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left ${
                      activeDataSection === item.id ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {isNavExpanded && <span className="truncate text-sm">{item.label}</span>}
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
    
    // Periodizar and Plan-grafico panels
    return (
      <div className="p-6 overflow-y-auto">
        {/* Header with metrics */}
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Planificador de Entrenamiento</h2>
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-3 text-white">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Heart className="h-4 w-4" />
                    <span>75 bpm</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Zap className="h-4 w-4" />
                    <span>85%</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg text-sm">
                    <Brain className="h-4 w-4" />
                    <span>Fatiga: Baja</span>
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
          <div className="bg-white p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Input placeholder="Competencia" className="h-10" />
            <Input placeholder="Tipo de Competencia" className="h-10" />
            <Input placeholder="Deporte" className="h-10" />
            <Input placeholder="Modalidad" className="h-10" />
            <Input placeholder="Categoría" className="h-10" />
            <Input placeholder="Entrenador" className="h-10" />
          </div>
          
          {/* Sub-navigation tabs */}
          <div className="bg-gray-50 border-t flex">
            {[
              { id: 'plan-grafico', label: 'Plan Gráfico' },
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
        ) : (
          <>
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-800">Planificación Anual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={trainingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#9ca3af" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
                        <Tooltip 
                          contentStyle={{ 
                            background: 'white', 
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                          }} 
                        />
                        <Line type="monotone" dataKey="volume" stroke="#2563eb" name="Volumen" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="intensity" stroke="#dc2626" name="Intensidad" strokeWidth={2} dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="fatigue" stroke="#7c3aed" name="Fatiga" strokeWidth={2} dot={{ r: 4 }} />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-semibold text-gray-800">Perfil de Rendimiento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={performanceData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis dataKey="ability" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis tick={{ fontSize: 10 }} />
                        <Radar dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{stats?.athletes_count || 0}</p>
              <p className="text-sm text-blue-600/70">Atletas</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats?.macrocycles_count || 0}</p>
              <p className="text-sm text-green-600/70">Planes</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-600">{stats?.completed_sessions || 0}</p>
              <p className="text-sm text-purple-600/70">Sesiones</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{stats?.ai_generations_used || 0}</p>
              <p className="text-sm text-amber-600/70">IA Usadas</p>
            </CardContent>
          </Card>
        </div>
          </>
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
          <Target className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold text-blue-600">Training AI</h1>
        </div>
        
        {/* Panel Tabs */}
        <div className="flex gap-2 mb-4">
          {['datos', 'periodizar', 'plan-grafico'].map((panel) => (
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
              {panel === 'datos' ? 'Datos' : panel === 'periodizar' ? 'Periodizar' : 'Plan-gráfico'}
            </button>
          ))}
        </div>

        {/* Quick Links */}
        <div className="space-y-1 mb-4">
          <Link to="/athletes" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <Users className="w-4 h-4" />
            Atletas
          </Link>
          <Link to="/exercises" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <Activity className="w-4 h-4" />
            Ejercicios
          </Link>
          <Link to="/calendar" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <Calendar className="w-4 h-4" />
            Calendario
          </Link>
          <Link to="/ai-generator" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg">
            <Brain className="w-4 h-4" />
            Generar con IA
          </Link>
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
