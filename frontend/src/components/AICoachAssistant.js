import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import {
  Bot, Send, Users, Target, Calendar, Dumbbell, Brain, Sparkles,
  ChevronRight, ChevronLeft, Check, Loader2, MessageSquare,
  User, Trophy, Clock, Zap, BarChart, Settings, Play, Download,
  RefreshCw, Volume2, AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Expert configurations (matching backend)
const EXPERTS = {
  strategist: {
    name: "Coach Estratega",
    emoji: "🎯",
    color: "bg-blue-500",
    lightColor: "bg-blue-50 text-blue-700 border-blue-200",
    specialty: "Diseño de periodización"
  },
  analyst: {
    name: "Analista de Rendimiento",
    emoji: "📊",
    color: "bg-purple-500",
    lightColor: "bg-purple-50 text-purple-700 border-purple-200",
    specialty: "Evaluación y carga"
  },
  exercise: {
    name: "Especialista en Ejercicios",
    emoji: "💪",
    color: "bg-green-500",
    lightColor: "bg-green-50 text-green-700 border-green-200",
    specialty: "Técnica y metodología"
  },
  assistant: {
    name: "Asistente Rápido",
    emoji: "⚡",
    color: "bg-amber-500",
    lightColor: "bg-amber-50 text-amber-700 border-amber-200",
    specialty: "Respuestas rápidas"
  }
};

// Wizard Steps
const WIZARD_STEPS = [
  { id: 'athlete', title: 'Atleta', icon: User, description: 'Selecciona o crea el atleta' },
  { id: 'sport', title: 'Deporte', icon: Trophy, description: 'Configura el deporte' },
  { id: 'objectives', title: 'Objetivos', icon: Target, description: 'Define las metas' },
  { id: 'competitions', title: 'Competencias', icon: Calendar, description: 'Calendario competitivo' },
  { id: 'periodization', title: 'Periodización', icon: BarChart, description: 'Modelo de entrenamiento' },
  { id: 'duration', title: 'Duración', icon: Clock, description: 'Tiempo del plan' },
  { id: 'methods', title: 'Métodos', icon: Settings, description: 'Metodología' },
  { id: 'generate', title: 'Generar', icon: Sparkles, description: 'IA genera el plan' }
];

// Main Component
const AICoachAssistant = ({ 
  isOpen, 
  onClose, 
  athletes = [], 
  sportsCatalog = [],
  onPlanGenerated,
  selectedAthlete = null
}) => {
  // Wizard State
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState({
    athlete: selectedAthlete || null,
    athleteName: '',
    sport: '',
    sportCategory: '',
    level: 'intermedio',
    mainObjective: '',
    secondaryObjectives: [],
    competitions: [],
    periodizationModel: 'tradicional',
    durationWeeks: 12,
    methods: [],
    sessionsPerWeek: 5
  });
  
  // Chat State
  const [activeTab, setActiveTab] = useState('wizard'); // 'wizard' | 'chat' | 'panel'
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  const chatEndRef = useRef(null);
  const sessionId = useRef(`session-${Date.now()}`);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setChatMessages([{
        type: 'system',
        text: '¡Bienvenido al Panel de Expertos IA! Puedes usar el Wizard para crear un plan paso a paso, o chatear directamente con nuestros expertos.',
        timestamp: new Date().toISOString()
      }]);
      if (selectedAthlete) {
        setWizardData(prev => ({ ...prev, athlete: selectedAthlete, athleteName: selectedAthlete.name }));
      }
    }
  }, [isOpen, selectedAthlete]);

  // Send message to AI
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    const userMessage = {
      type: 'user',
      text: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    
    try {
      const endpoint = activeTab === 'panel' ? '/api/ai-coach/panel-discussion' : '/api/ai-coach/chat';
      
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          session_id: sessionId.current,
          expert: selectedExpert,
          athlete_context: wizardData.athlete ? {
            name: wizardData.athlete.name || wizardData.athleteName,
            sport: wizardData.sport,
            level: wizardData.level,
            objectives: wizardData.mainObjective
          } : null
        })
      });
      
      if (!response.ok) throw new Error('Error en la respuesta');
      
      const data = await response.json();
      
      if (activeTab === 'panel') {
        // Panel discussion - multiple responses
        data.responses.forEach(r => {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            expert: r.expert,
            expertName: r.name,
            expertEmoji: r.emoji,
            text: r.response,
            timestamp: r.timestamp
          }]);
        });
        
        if (data.panel_summary) {
          setChatMessages(prev => [...prev, {
            type: 'summary',
            text: data.panel_summary,
            timestamp: new Date().toISOString()
          }]);
        }
      } else {
        // Single expert response
        const r = data.responses[0];
        setChatMessages(prev => [...prev, {
          type: 'assistant',
          expert: r.expert,
          expertName: r.name,
          expertEmoji: r.emoji,
          text: r.response,
          timestamp: r.timestamp
        }]);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        type: 'error',
        text: 'Error al comunicar con los expertos. Por favor intenta de nuevo.',
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate plan with AI
  const handleGeneratePlan = async () => {
    if (!wizardData.athleteName || !wizardData.sport || !wizardData.mainObjective) {
      toast.error('Completa los campos requeridos');
      return;
    }
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 10, 90));
    }, 800);
    
    try {
      const response = await fetch(`${API_URL}/api/ai-coach/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athlete_name: wizardData.athleteName || wizardData.athlete?.name,
          sport: wizardData.sport,
          level: wizardData.level,
          duration_weeks: wizardData.durationWeeks,
          main_objective: wizardData.mainObjective,
          competitions: wizardData.competitions,
          periodization_model: wizardData.periodizationModel,
          session_id: sessionId.current
        })
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      if (!response.ok) throw new Error('Error generando plan');
      
      const plan = await response.json();
      setGeneratedPlan(plan);
      
      // Save to localStorage
      const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
      const planToSave = {
        ...plan,
        isAIGenerated: true,
        wizardData: wizardData,
        createdAt: new Date().toISOString()
      };
      localStorage.setItem('train_generated_plans', JSON.stringify([planToSave, ...savedPlans]));
      
      toast.success('¡Plan generado exitosamente!');
      
      if (onPlanGenerated) {
        onPlanGenerated(planToSave);
      }
      
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Error al generar el plan');
      clearInterval(progressInterval);
    } finally {
      setIsGenerating(false);
    }
  };

  // Wizard navigation
  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const updateWizardData = (field, value) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  // Add competition
  const addCompetition = () => {
    setWizardData(prev => ({
      ...prev,
      competitions: [...prev.competitions, { name: '', date: '', priority: 'B' }]
    }));
  };

  const updateCompetition = (index, field, value) => {
    setWizardData(prev => {
      const newComps = [...prev.competitions];
      newComps[index] = { ...newComps[index], [field]: value };
      return { ...prev, competitions: newComps };
    });
  };

  const removeCompetition = (index) => {
    setWizardData(prev => ({
      ...prev,
      competitions: prev.competitions.filter((_, i) => i !== index)
    }));
  };

  // Render wizard step content
  const renderWizardStep = () => {
    const step = WIZARD_STEPS[currentStep];
    
    switch (step.id) {
      case 'athlete':
        return (
          <div className="space-y-4">
            <div>
              <Label>Seleccionar Atleta Existente</Label>
              <Select 
                value={wizardData.athlete?.id || ''} 
                onValueChange={(id) => {
                  const athlete = athletes.find(a => a.id === id);
                  updateWizardData('athlete', athlete);
                  updateWizardData('athleteName', athlete?.name || '');
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un atleta..." />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-sm text-slate-400">o crea uno nuevo</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>
            <div>
              <Label>Nombre del Atleta *</Label>
              <Input 
                value={wizardData.athleteName}
                onChange={(e) => updateWizardData('athleteName', e.target.value)}
                placeholder="Ej: Juan García"
              />
            </div>
            <div>
              <Label>Nivel del Atleta *</Label>
              <Select value={wizardData.level} onValueChange={(v) => updateWizardData('level', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principiante">Principiante</SelectItem>
                  <SelectItem value="intermedio">Intermedio</SelectItem>
                  <SelectItem value="avanzado">Avanzado</SelectItem>
                  <SelectItem value="elite">Elite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'sport':
        return (
          <div className="space-y-4">
            <div>
              <Label>Categoría Deportiva</Label>
              <Select 
                value={wizardData.sportCategory}
                onValueChange={(v) => updateWizardData('sportCategory', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {sportsCatalog.map(cat => (
                    <SelectItem key={cat.category} value={cat.category}>
                      {cat.icon} {cat.category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Deporte Específico *</Label>
              <Select value={wizardData.sport} onValueChange={(v) => updateWizardData('sport', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona deporte..." />
                </SelectTrigger>
                <SelectContent>
                  {wizardData.sportCategory && sportsCatalog
                    .find(c => c.category === wizardData.sportCategory)?.sports
                    .map(s => (
                      <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                    ))
                  }
                  {!wizardData.sportCategory && (
                    <>
                      <SelectItem value="Fútbol">Fútbol</SelectItem>
                      <SelectItem value="Atletismo">Atletismo</SelectItem>
                      <SelectItem value="Natación">Natación</SelectItem>
                      <SelectItem value="Baloncesto">Baloncesto</SelectItem>
                      <SelectItem value="Ciclismo">Ciclismo</SelectItem>
                      <SelectItem value="Triatlón">Triatlón</SelectItem>
                      <SelectItem value="Halterofilia">Halterofilia</SelectItem>
                      <SelectItem value="Tenis">Tenis</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'objectives':
        return (
          <div className="space-y-4">
            <div>
              <Label>Objetivo Principal *</Label>
              <Textarea 
                value={wizardData.mainObjective}
                onChange={(e) => updateWizardData('mainObjective', e.target.value)}
                placeholder="Ej: Mejorar tiempos en 100m planos, clasificar al campeonato nacional..."
                rows={3}
              />
            </div>
            <div>
              <Label>Objetivos Secundarios</Label>
              <Textarea 
                value={wizardData.secondaryObjectives.join('\n')}
                onChange={(e) => updateWizardData('secondaryObjectives', e.target.value.split('\n').filter(Boolean))}
                placeholder="Un objetivo por línea..."
                rows={3}
              />
            </div>
          </div>
        );
        
      case 'competitions':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Calendario de Competencias</Label>
              <Button size="sm" variant="outline" onClick={addCompetition}>
                + Agregar
              </Button>
            </div>
            {wizardData.competitions.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                Sin competencias programadas (opcional)
              </p>
            ) : (
              <div className="space-y-3">
                {wizardData.competitions.map((comp, i) => (
                  <div key={i} className="flex gap-2 items-start p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input 
                        placeholder="Nombre de la competencia"
                        value={comp.name}
                        onChange={(e) => updateCompetition(i, 'name', e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Input 
                          type="date"
                          value={comp.date}
                          onChange={(e) => updateCompetition(i, 'date', e.target.value)}
                        />
                        <Select value={comp.priority} onValueChange={(v) => updateCompetition(i, 'priority', v)}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">Prioridad A</SelectItem>
                            <SelectItem value="B">Prioridad B</SelectItem>
                            <SelectItem value="C">Prioridad C</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeCompetition(i)}>
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
        
      case 'periodization':
        return (
          <div className="space-y-4">
            <Label>Modelo de Periodización *</Label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'tradicional', name: 'Tradicional (Matveev)', desc: 'Fases lineales: Preparatorio → Competitivo → Transición', icon: '📊' },
                { id: 'atr', name: 'ATR (Bloques)', desc: 'Acumulación → Transformación → Realización', icon: '🧱' },
                { id: 'ondulante', name: 'Ondulante (DUP)', desc: 'Variación diaria/semanal de estímulos', icon: '〰️' }
              ].map(model => (
                <button
                  key={model.id}
                  onClick={() => updateWizardData('periodizationModel', model.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    wizardData.periodizationModel === model.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{model.icon}</span>
                    <div>
                      <p className="font-medium">{model.name}</p>
                      <p className="text-sm text-slate-500">{model.desc}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
        
      case 'duration':
        return (
          <div className="space-y-4">
            <div>
              <Label>Duración del Plan (semanas) *</Label>
              <Select 
                value={wizardData.durationWeeks.toString()} 
                onValueChange={(v) => updateWizardData('durationWeeks', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="4">4 semanas (Mensual)</SelectItem>
                  <SelectItem value="8">8 semanas (Bimensual)</SelectItem>
                  <SelectItem value="12">12 semanas (Trimestral)</SelectItem>
                  <SelectItem value="16">16 semanas (Cuatrimestral)</SelectItem>
                  <SelectItem value="24">24 semanas (Semestral)</SelectItem>
                  <SelectItem value="36">36 semanas (9 meses)</SelectItem>
                  <SelectItem value="52">52 semanas (Anual)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sesiones por Semana</Label>
              <Select 
                value={wizardData.sessionsPerWeek.toString()} 
                onValueChange={(v) => updateWizardData('sessionsPerWeek', parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <SelectItem key={n} value={n.toString()}>{n} sesiones</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
        
      case 'methods':
        return (
          <div className="space-y-4">
            <Label>Métodos de Entrenamiento Preferidos</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Fuerza Máxima', 'Hipertrofia', 'Resistencia', 'Potencia',
                'Pliometría', 'HIIT', 'Técnica', 'Táctico',
                'Flexibilidad', 'Regenerativo', 'Circuitos', 'Intervalos'
              ].map(method => (
                <button
                  key={method}
                  onClick={() => {
                    const methods = wizardData.methods.includes(method)
                      ? wizardData.methods.filter(m => m !== method)
                      : [...wizardData.methods, method];
                    updateWizardData('methods', methods);
                  }}
                  className={`p-2 text-sm rounded-lg border transition-all ${
                    wizardData.methods.includes(method)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {wizardData.methods.includes(method) && '✓ '}{method}
                </button>
              ))}
            </div>
          </div>
        );
        
      case 'generate':
        return (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Resumen del Plan
              </h3>
              <div className="space-y-2 text-sm">
                <p><strong>Atleta:</strong> {wizardData.athleteName || wizardData.athlete?.name || 'No especificado'}</p>
                <p><strong>Deporte:</strong> {wizardData.sport || 'No especificado'}</p>
                <p><strong>Nivel:</strong> {wizardData.level}</p>
                <p><strong>Objetivo:</strong> {wizardData.mainObjective || 'No especificado'}</p>
                <p><strong>Modelo:</strong> {wizardData.periodizationModel}</p>
                <p><strong>Duración:</strong> {wizardData.durationWeeks} semanas</p>
                <p><strong>Competencias:</strong> {wizardData.competitions.length}</p>
                <p><strong>Métodos:</strong> {wizardData.methods.length > 0 ? wizardData.methods.join(', ') : 'No especificados'}</p>
              </div>
            </div>
            
            {(!wizardData.athleteName && !wizardData.athlete?.name) || !wizardData.sport || !wizardData.mainObjective ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <p className="text-sm text-amber-700">
                  Completa los campos obligatorios: Atleta, Deporte y Objetivo para generar el plan.
                </p>
              </div>
            ) : null}
            
            {isGenerating && (
              <div className="space-y-3 p-4 bg-white rounded-xl border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Generando plan con 4 Expertos IA...</span>
                  <span className="font-medium text-blue-600">{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="h-2" />
                <p className="text-xs text-center text-slate-500">
                  {generationProgress < 30 ? '🎯 Estratega diseñando estructura...' :
                   generationProgress < 60 ? '📊 Analista calculando cargas...' :
                   generationProgress < 90 ? '💪 Especialista seleccionando ejercicios...' :
                   '⚡ Finalizando...'}
                </p>
              </div>
            )}
            
            {generatedPlan && (
              <div className="space-y-3">
                <div className="p-4 bg-green-50 rounded-xl border border-green-200 flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <p className="font-medium text-green-700">¡Plan generado exitosamente!</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('results')}
                >
                  Ver Plan Completo
                </Button>
              </div>
            )}
          </div>
        );
                  <p className="font-medium text-green-700 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    ¡Plan generado exitosamente!
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setActiveTab('results')}
                >
                  Ver Plan Completo
                </Button>
              </div>
            )}
            
            {isGenerating && (
              <div className="space-y-2">
                <Progress value={generationProgress} className="h-2" />
                <p className="text-sm text-center text-slate-500">
                  {generationProgress < 30 ? '🎯 Estratega diseñando estructura...' :
                   generationProgress < 60 ? '📊 Analista calculando cargas...' :
                   generationProgress < 90 ? '💪 Especialista seleccionando ejercicios...' :
                   '⚡ Finalizando...'}
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  // Render chat messages
  const renderMessages = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {chatMessages.map((msg, i) => (
        <div 
          key={i} 
          className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.type === 'user' ? (
            <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2">
              {msg.text}
            </div>
          ) : msg.type === 'assistant' ? (
            <div className="max-w-[85%] space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{msg.expertEmoji}</span>
                <span className="text-sm font-medium text-slate-600">{msg.expertName}</span>
                <Badge variant="outline" className={EXPERTS[msg.expert]?.lightColor}>
                  {EXPERTS[msg.expert]?.specialty}
                </Badge>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <p className="text-slate-700 whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ) : msg.type === 'summary' ? (
            <div className="w-full bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
              <p className="text-sm font-medium text-purple-700 mb-1">📋 Resumen del Panel</p>
              <p className="text-slate-700">{msg.text}</p>
            </div>
          ) : msg.type === 'system' ? (
            <div className="w-full text-center">
              <p className="text-sm text-slate-400 bg-slate-50 inline-block px-4 py-2 rounded-full">
                {msg.text}
              </p>
            </div>
          ) : msg.type === 'error' ? (
            <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{msg.text}</p>
            </div>
          ) : null}
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  );

  // Render generated plan results
  const renderPlanResults = () => {
    if (!generatedPlan) return null;
    
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-6">
          <h3 className="text-xl font-bold mb-2">{generatedPlan.macrocycle?.name}</h3>
          <p className="opacity-90">{generatedPlan.summary}</p>
        </div>
        
        <Tabs defaultValue="strategist" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="strategist">🎯 Periodización</TabsTrigger>
            <TabsTrigger value="analyst">📊 Cargas</TabsTrigger>
            <TabsTrigger value="exercise">💪 Ejercicios</TabsTrigger>
          </TabsList>
          
          <TabsContent value="strategist" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>🎯</span> Plan del Estratega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{generatedPlan.strategist_plan}</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="analyst" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>📊</span> Análisis de Cargas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{generatedPlan.analyst_review}</p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="exercise" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>💪</span> Ejercicios Recomendados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{generatedPlan.exercise_recommendations}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => setActiveTab('wizard')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Crear Otro Plan
          </Button>
          <Button className="flex-1">
            <Download className="w-4 h-4 mr-2" />
            Guardar Plan
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0 bg-white overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 p-4 rounded-t-lg">
          <DialogTitle className="text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Panel de Expertos IA</h2>
              <p className="text-sm text-white/80">4 modelos de IA colaborando para tu plan</p>
            </div>
          </DialogTitle>
          
          {/* Expert badges */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {Object.entries(EXPERTS).map(([key, expert]) => (
              <Badge 
                key={key}
                variant="outline"
                className="bg-white/10 border-white/20 text-white cursor-pointer hover:bg-white/20"
                onClick={() => {
                  setSelectedExpert(key);
                  setActiveTab('chat');
                }}
              >
                {expert.emoji} {expert.name}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Tabs */}
        <div className="border-b bg-slate-50 px-4">
          <div className="flex gap-1">
            {[
              { id: 'wizard', label: 'Wizard', icon: Sparkles },
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'panel', label: 'Panel de Expertos', icon: Users },
              ...(generatedPlan ? [{ id: 'results', label: 'Resultados', icon: Trophy }] : [])
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-white">
          {activeTab === 'wizard' ? (
            <div className="flex flex-col h-full">
              {/* Wizard Progress */}
              <div className="p-4 border-b bg-white shrink-0">
                <div className="flex items-center justify-between mb-2">
                  {WIZARD_STEPS.map((step, i) => (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => setCurrentStep(i)}
                        className={`flex flex-col items-center gap-1 ${
                          i === currentStep ? 'text-blue-600' :
                          i < currentStep ? 'text-green-600' : 'text-slate-300'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          i === currentStep ? 'bg-blue-600 text-white' :
                          i < currentStep ? 'bg-green-100 text-green-600' : 'bg-slate-100'
                        }`}>
                          {i < currentStep ? <Check className="w-4 h-4" /> : i + 1}
                        </div>
                        <span className="text-xs hidden sm:block">{step.title}</span>
                      </button>
                      {i < WIZARD_STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 ${i < currentStep ? 'bg-green-300' : 'bg-slate-200'}`} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              
              {/* Wizard Step Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                <div className="max-w-lg mx-auto bg-white rounded-xl p-6 shadow-sm">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      {React.createElement(WIZARD_STEPS[currentStep].icon, { className: "w-6 h-6 text-blue-600" })}
                      {WIZARD_STEPS[currentStep].title}
                    </h3>
                    <p className="text-slate-500">{WIZARD_STEPS[currentStep].description}</p>
                  </div>
                  {renderWizardStep()}
                </div>
              </div>
              
              {/* Wizard Navigation - Fixed at bottom */}
              <div className="p-4 border-t bg-white flex justify-between shrink-0">
                <Button 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                {currentStep === WIZARD_STEPS.length - 1 ? (
                  <Button 
                    onClick={handleGeneratePlan}
                    disabled={isGenerating || !wizardData.athleteName || !wizardData.sport || !wizardData.mainObjective}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar Plan con IA
                      </>
                    )}
                  </Button>
                ) : (
                  <Button onClick={nextStep}>
                    Siguiente
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          ) : activeTab === 'results' ? (
            renderPlanResults()
          ) : (
            <>
              {/* Expert selector for chat */}
              {activeTab === 'chat' && (
                <div className="p-3 border-b bg-slate-50 flex items-center gap-2">
                  <span className="text-sm text-slate-500">Hablar con:</span>
                  <Select value={selectedExpert || ''} onValueChange={setSelectedExpert}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Auto-detectar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">🔄 Auto-detectar</SelectItem>
                      {Object.entries(EXPERTS).map(([key, expert]) => (
                        <SelectItem key={key} value={key}>
                          {expert.emoji} {expert.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {activeTab === 'panel' && (
                <div className="p-3 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <strong>Modo Panel:</strong> Todos los expertos responderán a tu consulta
                  </p>
                </div>
              )}
              
              {/* Messages */}
              {renderMessages()}
              
              {/* Input */}
              <div className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={activeTab === 'panel' 
                      ? "Pregunta a todos los expertos..." 
                      : "Escribe tu consulta..."
                    }
                    disabled={isLoading}
                  />
                  <Button onClick={handleSendMessage} disabled={isLoading || !inputMessage.trim()}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AICoachAssistant;
