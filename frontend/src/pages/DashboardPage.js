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

    // Render Atletas section inline - COMPLETE
    if (activeDataSection === 'athletes') {
      return (
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Gestión de Atletas
                </CardTitle>
                <span className="text-sm bg-white/20 px-2 py-1 rounded">{athletes.length} registrados</span>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Formulario nuevo atleta */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-3 text-gray-700">Registrar Nuevo Atleta</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input placeholder="Nombre completo" className="h-9" />
                  <Input placeholder="Email" type="email" className="h-9" />
                  <Input placeholder="Fecha nacimiento" type="date" className="h-9" />
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Género" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Deporte" className="h-9" />
                  <Input placeholder="Categoría" className="h-9" />
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Nivel" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principiante">Principiante</SelectItem>
                      <SelectItem value="intermedio">Intermedio</SelectItem>
                      <SelectItem value="avanzado">Avanzado</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-blue-600 hover:bg-blue-700 h-9">
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </Button>
                </div>
              </div>
              
              {/* Lista de atletas */}
              <div className="space-y-2">
                {athletes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No hay atletas registrados</p>
                  </div>
                ) : (
                  athletes.map(athlete => (
                    <div key={athlete.id} className="flex items-center justify-between p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold">{athlete.name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium">{athlete.name}</p>
                          <p className="text-xs text-gray-500">{athlete.sport} • {athlete.category || 'Sin categoría'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setSelectedAthleteId(athlete.id)}>Seleccionar</Button>
                        <Button variant="ghost" size="sm" className="text-red-500">Eliminar</Button>
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

    // Render Ejercicios section inline - COMPLETE
    if (activeDataSection === 'exercises-lib') {
      const ejerciciosPorCategoria = [
        { categoria: 'Fuerza', ejercicios: ['Sentadilla', 'Press banca', 'Peso muerto', 'Press militar', 'Remo'], color: 'bg-red-100 text-red-700' },
        { categoria: 'Resistencia', ejercicios: ['Carrera continua', 'Natación', 'Ciclismo', 'Remo ergómetro', 'Elíptica'], color: 'bg-blue-100 text-blue-700' },
        { categoria: 'Velocidad', ejercicios: ['Sprints 30m', 'Sprints 60m', 'Skipping', 'Salidas de tacos', 'Relevos'], color: 'bg-yellow-100 text-yellow-700' },
        { categoria: 'Flexibilidad', ejercicios: ['Estiramientos dinámicos', 'Yoga', 'PNF', 'Foam roller', 'Movilidad articular'], color: 'bg-green-100 text-green-700' },
        { categoria: 'Coordinación', ejercicios: ['Escalera agilidad', 'Slalom', 'Ejercicios con balón', 'Saltos coordinados', 'Multisaltos'], color: 'bg-purple-100 text-purple-700' },
        { categoria: 'Potencia', ejercicios: ['Salto vertical', 'Salto horizontal', 'Lanzamientos', 'Cargadas', 'Arrancadas'], color: 'bg-orange-100 text-orange-700' }
      ];
      
      return (
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="w-5 h-5" />
                  Biblioteca de Ejercicios
                </CardTitle>
                <Button size="sm" className="bg-white/20 hover:bg-white/30">
                  <Plus className="w-4 h-4 mr-1" /> Nuevo Ejercicio
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Buscador */}
              <div className="flex gap-3 mb-4">
                <Input placeholder="Buscar ejercicio..." className="flex-1" />
                <Select>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="fuerza">Fuerza</SelectItem>
                    <SelectItem value="resistencia">Resistencia</SelectItem>
                    <SelectItem value="velocidad">Velocidad</SelectItem>
                    <SelectItem value="flexibilidad">Flexibilidad</SelectItem>
                    <SelectItem value="coordinacion">Coordinación</SelectItem>
                    <SelectItem value="potencia">Potencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Grid de categorías */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ejerciciosPorCategoria.map(cat => (
                  <div key={cat.categoria} className="border rounded-lg overflow-hidden">
                    <div className={`px-3 py-2 font-medium ${cat.color}`}>{cat.categoria}</div>
                    <div className="p-3 space-y-1">
                      {cat.ejercicios.map(ej => (
                        <div key={ej} className="flex items-center justify-between py-1 px-2 hover:bg-gray-50 rounded text-sm">
                          <span>{ej}</span>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">Añadir</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );
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
          <Card>
            <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  Calendario de Entrenamiento
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">◀ Anterior</Button>
                  <span className="px-3 py-1 bg-white/20 rounded">{hoy.toLocaleDateString('es', { month: 'long', year: 'numeric' })}</span>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">Siguiente ▶</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Leyenda */}
              <div className="flex gap-4 mb-4 text-sm">
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded"></div> Entrenamiento</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Competencia</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Test</span>
                <span className="flex items-center gap-1"><div className="w-3 h-3 bg-gray-300 rounded"></div> Descanso</span>
              </div>
              
              {/* Calendario */}
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-7 bg-gray-100">
                  {diasSemana.map(dia => (
                    <div key={dia} className="p-2 text-center font-medium text-sm text-gray-600">{dia}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {diasMes.map((fecha, i) => {
                    const esHoy = fecha.toDateString() === hoy.toDateString();
                    const esMesActual = fecha.getMonth() === hoy.getMonth();
                    return (
                      <div 
                        key={i} 
                        className={`min-h-[80px] p-1 border-t border-l cursor-pointer hover:bg-gray-50 ${!esMesActual ? 'bg-gray-50 text-gray-400' : ''} ${esHoy ? 'bg-blue-50' : ''}`}
                      >
                        <div className={`text-sm font-medium ${esHoy ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}`}>
                          {fecha.getDate()}
                        </div>
                        {esMesActual && i % 3 === 0 && (
                          <div className="mt-1 text-xs bg-blue-100 text-blue-700 px-1 rounded truncate">Sesión</div>
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
          <Card>
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="w-5 h-5" />
                Generar Plan con Inteligencia Artificial
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Formulario */}
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">Parámetros del Plan</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Objetivo Principal</label>
                      <Input placeholder="Ej: Mejorar resistencia aeróbica" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Duración (semanas)</label>
                        <Input type="number" placeholder="12" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Sesiones/semana</label>
                        <Input type="number" placeholder="5" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Deporte</label>
                      <Input placeholder="Ej: Atletismo - Fondo" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Nivel del Atleta</label>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Seleccionar nivel" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="principiante">Principiante (0-1 año)</SelectItem>
                          <SelectItem value="intermedio">Intermedio (1-3 años)</SelectItem>
                          <SelectItem value="avanzado">Avanzado (3-5 años)</SelectItem>
                          <SelectItem value="elite">Elite (+5 años)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Competencia Objetivo</label>
                      <Input type="date" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500">Observaciones adicionales</label>
                      <textarea className="w-full border rounded-lg p-2 text-sm h-20" placeholder="Lesiones previas, limitaciones, preferencias..." />
                    </div>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600">
                      <Brain className="w-4 h-4 mr-2" />
                      Generar Plan con IA
                    </Button>
                  </div>
                </div>
                
                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-3">Vista Previa del Plan</h4>
                  <div className="text-center py-12 text-gray-400">
                    <Brain className="w-16 h-16 mx-auto mb-3 opacity-30" />
                    <p>Configura los parámetros y genera tu plan personalizado</p>
                    <p className="text-sm mt-2">El plan incluirá macrociclos, mesociclos, microciclos y sesiones detalladas</p>
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
          <Card>
            <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="w-5 h-5" />
                  Calendario de Eventos y Competencias
                </CardTitle>
                <Button size="sm" className="bg-white/20 hover:bg-white/30">
                  <Plus className="w-4 h-4 mr-1" /> Nuevo Evento
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Formulario nuevo evento */}
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium mb-3 text-gray-700">Agregar Evento/Competencia</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input placeholder="Nombre del evento" className="h-9" />
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="competencia_principal">Competencia Principal</SelectItem>
                      <SelectItem value="competencia_secundaria">Competencia Secundaria</SelectItem>
                      <SelectItem value="test">Test/Evaluación</SelectItem>
                      <SelectItem value="concentracion">Concentración</SelectItem>
                      <SelectItem value="viaje">Viaje</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" className="h-9" />
                  <Input placeholder="Lugar" className="h-9" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                  <Input placeholder="Objetivo" className="h-9 col-span-2" />
                  <Select>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta (A)</SelectItem>
                      <SelectItem value="media">Media (B)</SelectItem>
                      <SelectItem value="baja">Baja (C)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 h-9">
                    <Plus className="w-4 h-4 mr-1" /> Agregar
                  </Button>
                </div>
              </div>
              
              {/* Lista de eventos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-12 bg-green-500 rounded"></div>
                    <div>
                      <p className="font-medium">Campeonato Nacional</p>
                      <p className="text-xs text-gray-500">Competencia Principal • 15 Mar 2025 • Ciudad Capital</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Prioridad A</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-12 bg-yellow-500 rounded"></div>
                    <div>
                      <p className="font-medium">Torneo Regional</p>
                      <p className="text-xs text-gray-500">Competencia Secundaria • 28 Feb 2025 • Región Norte</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Prioridad B</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-12 bg-blue-500 rounded"></div>
                    <div>
                      <p className="font-medium">Test de Rendimiento</p>
                      <p className="text-xs text-gray-500">Evaluación • 10 Feb 2025 • Centro de Alto Rendimiento</p>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">Test</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render Objetivos e Indicadores - COMPLETE
    if (activeDataSection === 'objectives') {
      return (
        <div className="p-4 space-y-4">
          <Card>
            <CardHeader className="bg-gradient-to-r from-teal-600 to-teal-700 text-white py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5" />
                  Objetivos e Indicadores del Plan
                </CardTitle>
                <Button size="sm" className="bg-white/20 hover:bg-white/30">
                  <Plus className="w-4 h-4 mr-1" /> Nuevo Objetivo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Objetivos por categoría */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                {/* Objetivos Físicos */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-red-100 px-3 py-2 font-medium text-red-700 flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" /> Objetivos Físicos
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">VO2 Max</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Actual: 52</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-medium text-green-600">Meta: 58 ml/kg/min</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Fuerza máxima (Sentadilla)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Actual: 120kg</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-medium text-green-600">Meta: 140kg</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Velocidad 100m</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Actual: 11.5s</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-medium text-green-600">Meta: 10.8s</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>

                {/* Objetivos Técnicos */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-blue-100 px-3 py-2 font-medium text-blue-700 flex items-center gap-2">
                    <Target className="w-4 h-4" /> Objetivos Técnicos
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Eficiencia técnica salida</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Actual: 70%</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-medium text-green-600">Meta: 90%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Tiempo de reacción</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Actual: 0.18s</span>
                        <span className="text-xs">→</span>
                        <span className="text-xs font-medium text-green-600">Meta: 0.14s</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>

                {/* Objetivos Tácticos */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-yellow-100 px-3 py-2 font-medium text-yellow-700 flex items-center gap-2">
                    <Brain className="w-4 h-4" /> Objetivos Tácticos
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Gestión de carrera</span>
                      <span className="text-xs font-medium text-green-600">Mejorar distribución de esfuerzo</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Estrategia competitiva</span>
                      <span className="text-xs font-medium text-green-600">Dominar 3 variantes tácticas</span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>

                {/* Objetivos Psicológicos */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-purple-100 px-3 py-2 font-medium text-purple-700 flex items-center gap-2">
                    <Heart className="w-4 h-4" /> Objetivos Psicológicos
                  </div>
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Control de ansiedad</span>
                      <span className="text-xs font-medium text-green-600">Escala 3→7/10</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Concentración</span>
                      <span className="text-xs font-medium text-green-600">Mantener foco 100%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Motivación</span>
                      <span className="text-xs font-medium text-green-600">Alta constante</span>
                    </div>
                    <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                      <Plus className="w-3 h-3 mr-1" /> Agregar indicador
                    </Button>
                  </div>
                </div>
              </div>

              {/* KPIs Generales */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-gray-700">Indicadores Clave de Rendimiento (KPIs)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border text-center">
                    <p className="text-2xl font-bold text-blue-600">85%</p>
                    <p className="text-xs text-gray-500">Cumplimiento Plan</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center">
                    <p className="text-2xl font-bold text-green-600">+12%</p>
                    <p className="text-xs text-gray-500">Mejora Rendimiento</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center">
                    <p className="text-2xl font-bold text-orange-600">0.85</p>
                    <p className="text-xs text-gray-500">Ratio Carga (ACWR)</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg border text-center">
                    <p className="text-2xl font-bold text-purple-600">92%</p>
                    <p className="text-xs text-gray-500">Asistencia</p>
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
