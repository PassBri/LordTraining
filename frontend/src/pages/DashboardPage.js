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
  Activity, BarChart, LineChart, Loader2, LogOut, Save, Download, Layers
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

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState('datos');
  const [activeDataSection, setActiveDataSection] = useState('graphic-plan');
  const [selectedAthleteId, setSelectedAthleteId] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('macrociclo');
  const [chatMessages, setChatMessages] = useState([
    { type: 'ai', text: 'Bienvenido al asistente de planificación deportiva. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Navigation items for "Datos" panel
  const navItems = [
    { id: 'graphic-plan', label: 'Plan Gráfico', icon: Layers },
    { id: 'athletes', label: 'Atletas', icon: Users },
    { id: 'exercises-lib', label: 'Ejercicios', icon: Activity },
    { id: 'calendar-view', label: 'Calendario', icon: Calendar },
    { id: 'ai-generator', label: 'Generar con IA', icon: Brain },
    { id: 'prev-plan', label: 'Análisis del plan anterior', icon: FileText },
    { id: 'sport-char', label: 'Caracterización del deporte', icon: Target },
    { id: 'athlete-char', label: 'Caracterización de deportistas', icon: Users },
    { id: 'diagnostic', label: 'Diagnóstico', icon: Clipboard },
    { id: 'injuries', label: 'Lesiones', icon: Heart },
    { id: 'diseases', label: 'Enfermedades', icon: Activity },
    { id: 'anthropometric', label: 'Datos antropométricos', icon: LineChart },
    { id: 'tests', label: 'Test', icon: Clipboard },
    { id: 'events', label: 'Calendario de eventos', icon: Calendar },
    { id: 'competitions', label: 'Análisis de competencias', icon: Award },
    { id: 'periodization-models', label: 'Modelos de periodización', icon: BookOpen },
    { id: 'macrocycle-stages', label: 'Etapas del macrociclo', icon: BookOpen },
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

    // Render Atletas section inline
    if (activeDataSection === 'athletes') {
      return (
        <div className="p-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestión de Atletas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-gray-600">Total: {athletes.length} atletas registrados</p>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Nuevo Atleta
                  </Button>
                </div>
                {athletes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No hay atletas registrados</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {athletes.map(athlete => (
                      <div key={athlete.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold">{athlete.name?.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{athlete.name}</p>
                            <p className="text-sm text-gray-500">{athlete.sport || 'Sin deporte asignado'}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setSelectedAthleteId(athlete.id)}>
                          Seleccionar
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Ejercicios section inline
    if (activeDataSection === 'exercises-lib') {
      return (
        <div className="p-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Biblioteca de Ejercicios
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Biblioteca de ejercicios por categoría</p>
                <p className="text-sm mt-2">Fuerza, Resistencia, Velocidad, Flexibilidad, Coordinación</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Calendario section inline
    if (activeDataSection === 'calendar-view') {
      return (
        <div className="p-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Calendario de Entrenamiento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Vista de calendario con sesiones planificadas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Generar con IA section inline
    if (activeDataSection === 'ai-generator') {
      return (
        <div className="p-6">
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Generar Plan con IA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                <p className="text-gray-600">Genera un plan de entrenamiento personalizado usando inteligencia artificial.</p>
                <div className="grid gap-3">
                  <Input placeholder="Objetivo principal del plan" />
                  <Input placeholder="Duración del plan (semanas)" type="number" />
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Nivel del atleta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principiante">Principiante</SelectItem>
                      <SelectItem value="intermedio">Intermedio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Brain className="w-4 h-4 mr-2" />
                    Generar Plan
                  </Button>
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

    // Render Periodization Models
    if (activeDataSection === 'periodization-models') {
      return <PeriodizationModels athleteId={selectedAthleteId} />;
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
      return <GraphicPlan athleteId={selectedAthleteId} />;
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
