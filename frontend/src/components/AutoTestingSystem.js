import React, { useState, useCallback, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import {
  Bot, Play, Zap, FileText, Download, CheckCircle, XCircle, 
  AlertTriangle, Clock, ChevronDown, Loader2, Trophy, Target,
  Calendar, Dumbbell, Activity, Brain, BarChart, Trash2, Eye, Flame
} from 'lucide-react';

// ==================== TEMPLATES DE PLANES ====================

const PLAN_TEMPLATES = {
  tradicional_anual_futbol: {
    id: 'tradicional_anual_futbol',
    name: 'Tradicional - Anual - Fútbol',
    icon: '📊',
    sport: 'Fútbol',
    model: 'Tradicional (Matveev)',
    duration: 'Anual (52 semanas)',
    level: 'Intermedio',
    description: 'Plan completo de periodización tradicional para temporada de fútbol',
    data: {
      athlete: {
        name: 'Carlos Rodríguez (Demo)',
        sport: 'football',
        age: 24,
        level: 'intermedio',
        position: 'Mediocampista'
      },
      macrocycle: {
        name: 'Temporada 2025-2026',
        startDate: '2025-07-01',
        endDate: '2026-06-30',
        mainObjective: 'Campeonato Nacional',
        phases: [
          { name: 'Preparatorio General', weeks: 8, intensity: 60, volume: 85 },
          { name: 'Preparatorio Específico', weeks: 6, intensity: 75, volume: 75 },
          { name: 'Competitivo 1', weeks: 16, intensity: 90, volume: 50 },
          { name: 'Transición 1', weeks: 2, intensity: 40, volume: 30 },
          { name: 'Competitivo 2', weeks: 16, intensity: 90, volume: 50 },
          { name: 'Transición 2', weeks: 4, intensity: 30, volume: 25 }
        ]
      },
      mesocycles: [
        { name: 'Acumulación Base', weeks: 4, focus: 'Resistencia aeróbica', load: 'Alto volumen' },
        { name: 'Transformación', weeks: 4, focus: 'Fuerza resistencia', load: 'Medio-Alto' },
        { name: 'Realización Pre-Comp', weeks: 4, focus: 'Velocidad y potencia', load: 'Medio' },
        { name: 'Competición Liga', weeks: 8, focus: 'Mantenimiento competitivo', load: 'Variable' }
      ],
      microcycles: [
        { week: 1, type: 'Carga', volume: 80, intensity: 55, sessions: 6 },
        { week: 2, type: 'Carga', volume: 85, intensity: 60, sessions: 6 },
        { week: 3, type: 'Impacto', volume: 90, intensity: 65, sessions: 7 },
        { week: 4, type: 'Recuperación', volume: 60, intensity: 50, sessions: 4 }
      ],
      sessions: [
        { day: 'Lunes', type: 'Fuerza', duration: 90, exercises: ['Sentadilla', 'Peso muerto', 'Press banca', 'Core'] },
        { day: 'Martes', type: 'Técnico-Táctico', duration: 120, exercises: ['Posesión', 'Transiciones', 'Juego reducido'] },
        { day: 'Miércoles', type: 'Resistencia', duration: 75, exercises: ['Intervalos', 'Circuito físico', 'RSA'] },
        { day: 'Jueves', type: 'Recuperación', duration: 45, exercises: ['Regenerativo', 'Estiramientos', 'Piscina'] },
        { day: 'Viernes', type: 'Activación', duration: 60, exercises: ['Técnica individual', 'Tiros', 'Táctica fija'] },
        { day: 'Sábado', type: 'Partido', duration: 90, exercises: ['Competencia oficial'] }
      ]
    }
  },
  
  bloques_trimestral_atletismo: {
    id: 'bloques_trimestral_atletismo',
    name: 'Bloques - Trimestral - Atletismo',
    icon: '🧱',
    sport: 'Atletismo',
    model: 'ATR (Bloques)',
    duration: 'Trimestral (12 semanas)',
    level: 'Avanzado',
    description: 'Periodización por bloques para velocista 100m',
    data: {
      athlete: {
        name: 'María González (Demo)',
        sport: 'athletics',
        age: 22,
        level: 'avanzado',
        event: '100m planos'
      },
      macrocycle: {
        name: 'Preparación Campeonato Nacional',
        startDate: '2025-03-01',
        endDate: '2025-05-31',
        mainObjective: 'Clasificación Olímpica',
        phases: [
          { name: 'Bloque Acumulación', weeks: 4, intensity: 70, volume: 90, focus: 'Capacidad de trabajo' },
          { name: 'Bloque Transformación', weeks: 4, intensity: 85, volume: 65, focus: 'Conversión a potencia' },
          { name: 'Bloque Realización', weeks: 4, intensity: 95, volume: 40, focus: 'Máximo rendimiento' }
        ]
      },
      mesocycles: [
        { name: 'Acumulación', weeks: 4, focus: 'Fuerza máxima + Volumen técnico', load: 'Muy Alto' },
        { name: 'Transformación', weeks: 4, focus: 'Potencia + Velocidad específica', load: 'Alto' },
        { name: 'Realización', weeks: 4, focus: 'Velocidad máxima + Competición', load: 'Bajo volumen, Alta intensidad' }
      ],
      microcycles: [
        { week: 1, type: 'Acumulación A', volume: 95, intensity: 65, sessions: 10 },
        { week: 2, type: 'Acumulación B', volume: 90, intensity: 70, sessions: 10 },
        { week: 3, type: 'Acumulación C', volume: 85, intensity: 75, sessions: 9 },
        { week: 4, type: 'Transición', volume: 60, intensity: 60, sessions: 6 },
        { week: 5, type: 'Transformación A', volume: 70, intensity: 80, sessions: 8 },
        { week: 6, type: 'Transformación B', volume: 65, intensity: 85, sessions: 8 },
        { week: 7, type: 'Transformación C', volume: 55, intensity: 90, sessions: 7 },
        { week: 8, type: 'Transición', volume: 45, intensity: 75, sessions: 5 },
        { week: 9, type: 'Realización A', volume: 40, intensity: 92, sessions: 6 },
        { week: 10, type: 'Realización B', volume: 35, intensity: 95, sessions: 5 },
        { week: 11, type: 'Taper', volume: 25, intensity: 90, sessions: 4 },
        { week: 12, type: 'Competición', volume: 20, intensity: 100, sessions: 3 }
      ],
      sessions: [
        { day: 'Lunes AM', type: 'Velocidad', duration: 90, exercises: ['Aceleraciones 30m', 'Sprints 60m', 'Técnica carrera'] },
        { day: 'Lunes PM', type: 'Fuerza', duration: 75, exercises: ['Sentadilla', 'Cargadas', 'Pliometría'] },
        { day: 'Martes', type: 'Resistencia especial', duration: 60, exercises: ['Repeticiones 150m', 'Trabajo láctico'] },
        { day: 'Miércoles AM', type: 'Técnica', duration: 45, exercises: ['Salida tacos', 'Frecuencia', 'Video análisis'] },
        { day: 'Miércoles PM', type: 'Fuerza auxiliar', duration: 60, exercises: ['Core', 'Isquiotibiales', 'Glúteos'] },
        { day: 'Jueves', type: 'Recuperación', duration: 30, exercises: ['Masaje', 'Crioterapia', 'Movilidad'] },
        { day: 'Viernes', type: 'Velocidad máxima', duration: 75, exercises: ['Lanzados 40m', 'Flying sprints'] },
        { day: 'Sábado', type: 'Competición/Test', duration: 120, exercises: ['Test de control o competencia'] }
      ]
    }
  },
  
  ondulante_mensual_levantamiento: {
    id: 'ondulante_mensual_levantamiento',
    name: 'Ondulante - Mensual - Levantamiento',
    icon: '〰️',
    sport: 'Levantamiento de Pesas',
    model: 'Ondulante (DUP)',
    duration: 'Mensual (4 semanas)',
    level: 'Experto',
    description: 'Periodización ondulante diaria para halterofilia',
    data: {
      athlete: {
        name: 'Pedro Sánchez (Demo)',
        sport: 'weightlifting',
        age: 28,
        level: 'elite',
        category: '81kg'
      },
      macrocycle: {
        name: 'Prep Campeonato Regional',
        startDate: '2025-04-01',
        endDate: '2025-04-30',
        mainObjective: 'Totales de clasificación',
        phases: [
          { name: 'Semana Alta', weeks: 1, intensity: 85, volume: 80 },
          { name: 'Semana Media', weeks: 1, intensity: 80, volume: 70 },
          { name: 'Semana Alta 2', weeks: 1, intensity: 90, volume: 75 },
          { name: 'Semana Descarga', weeks: 1, intensity: 70, volume: 50 }
        ]
      },
      mesocycles: [
        { name: 'Ondulación 4 semanas', weeks: 4, focus: 'Variación diaria de estímulos', load: 'Ondulante' }
      ],
      microcycles: [
        { week: 1, type: 'Alta', volume: 80, intensity: 85, sessions: 6, pattern: 'H-M-L-H-M-L' },
        { week: 2, type: 'Media', volume: 70, intensity: 80, sessions: 5, pattern: 'M-H-L-M-H' },
        { week: 3, type: 'Alta', volume: 75, intensity: 90, sessions: 6, pattern: 'H-M-H-L-H-M' },
        { week: 4, type: 'Descarga', volume: 50, intensity: 70, sessions: 4, pattern: 'L-M-L-M' }
      ],
      sessions: [
        { day: 'Lunes', type: 'Pesado (H)', duration: 120, intensity: '85-95%', exercises: ['Arranque 5x2@90%', 'Sentadilla frontal 4x3@87%', 'Tirón arranque 3x3'] },
        { day: 'Martes', type: 'Medio (M)', duration: 90, intensity: '75-85%', exercises: ['Cargada 5x3@82%', 'Push press 4x4', 'Good mornings 3x8'] },
        { day: 'Miércoles', type: 'Ligero (L)', duration: 60, intensity: '60-75%', exercises: ['Técnica arranque', 'Muscle snatch', 'Core'] },
        { day: 'Jueves', type: 'Pesado (H)', duration: 120, intensity: '85-95%', exercises: ['Clean & Jerk 5x2@90%', 'Sentadilla espalda 5x3@88%'] },
        { day: 'Viernes', type: 'Medio (M)', duration: 90, intensity: '75-85%', exercises: ['Power clean 4x3', 'Jerk desde rack 4x2', 'Accesorios'] },
        { day: 'Sábado', type: 'Ligero (L)', duration: 45, intensity: '50-65%', exercises: ['Técnica cargada', 'Movilidad', 'Recuperación activa'] }
      ]
    }
  }
};

// ==================== VIRTUAL COACH ENGINE ====================

const VIRTUAL_COACH_SCRIPTS = {
  principiante: {
    name: 'Modo Principiante',
    description: 'Crea plan simple de 4 semanas',
    steps: [
      { action: 'select_sport', value: 'running', delay: 500 },
      { action: 'select_model', value: 'lineal', delay: 500 },
      { action: 'set_duration', value: 4, unit: 'weeks', delay: 300 },
      { action: 'set_objective', value: 'Mejorar condición física general', delay: 400 },
      { action: 'generate_macro', delay: 800 },
      { action: 'auto_fill_mesos', delay: 600 },
      { action: 'save_plan', delay: 500 }
    ],
    expectedDuration: 4000
  },
  intermedio: {
    name: 'Modo Intermedio', 
    description: 'Crea plan completo de 12 semanas con ejercicios',
    steps: [
      { action: 'select_sport', value: 'swimming', delay: 500 },
      { action: 'select_model', value: 'atr', delay: 500 },
      { action: 'set_duration', value: 12, unit: 'weeks', delay: 300 },
      { action: 'set_objective', value: 'Campeonato de natación masters', delay: 400 },
      { action: 'add_competition', value: { name: 'Campeonato Regional', date: '2025-06-15' }, delay: 500 },
      { action: 'generate_macro', delay: 1000 },
      { action: 'configure_phases', values: ['Acumulación', 'Transformación', 'Realización'], delay: 800 },
      { action: 'auto_fill_mesos', delay: 600 },
      { action: 'auto_fill_micros', delay: 800 },
      { action: 'add_exercises', count: 15, delay: 1200 },
      { action: 'save_plan', delay: 500 }
    ],
    expectedDuration: 7100
  },
  experto: {
    name: 'Modo Experto',
    description: 'Crea plan avanzado con análisis completo',
    steps: [
      { action: 'select_sport', value: 'triathlon', delay: 500 },
      { action: 'select_model', value: 'polarized', delay: 500 },
      { action: 'set_duration', value: 24, unit: 'weeks', delay: 300 },
      { action: 'set_athlete_profile', value: { age: 32, level: 'avanzado', experience: 8 }, delay: 600 },
      { action: 'add_test_results', values: ['VO2max: 58', 'FTP: 280W', 'VMA: 18km/h'], delay: 700 },
      { action: 'set_objective', value: 'Ironman 70.3 clasificación mundial', delay: 400 },
      { action: 'add_competition', value: { name: 'Ironman 70.3', date: '2025-09-01', priority: 'A' }, delay: 500 },
      { action: 'add_competition', value: { name: 'Media Maratón prep', date: '2025-07-15', priority: 'B' }, delay: 500 },
      { action: 'generate_macro', delay: 1200 },
      { action: 'configure_phases', values: ['Base 1', 'Base 2', 'Build 1', 'Build 2', 'Peak', 'Taper'], delay: 1000 },
      { action: 'set_weekly_hours', values: [12, 14, 16, 14, 18, 16, 12, 10], delay: 800 },
      { action: 'auto_fill_mesos', delay: 800 },
      { action: 'auto_fill_micros', delay: 1000 },
      { action: 'add_exercises', count: 40, delay: 2000 },
      { action: 'add_zones', values: ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'], delay: 600 },
      { action: 'validate_plan', delay: 800 },
      { action: 'save_plan', delay: 500 }
    ],
    expectedDuration: 12400
  }
};

// ==================== COMPONENT ====================

const AutoTestingSystem = ({ 
  onLoadTemplate, 
  onSavePlan,
  currentUser,
  sportsCatalog = [],
  fabStyle = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [showReports, setShowReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const abortRef = useRef(false);

  // Load reports from localStorage on mount
  React.useEffect(() => {
    const savedReports = localStorage.getItem('train_test_reports');
    if (savedReports) {
      setReports(JSON.parse(savedReports));
    }
  }, []);

  // Save reports to localStorage
  const saveReport = (report) => {
    const newReports = [report, ...reports].slice(0, 50); // Keep last 50 reports
    setReports(newReports);
    localStorage.setItem('train_test_reports', JSON.stringify(newReports));
  };

  // Add log entry
  const addLog = useCallback((type, message, details = null) => {
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type, // 'info', 'success', 'error', 'warning'
      message,
      details
    };
    setLogs(prev => [...prev, entry]);
    return entry;
  }, []);

  // Clear logs
  const clearLogs = () => setLogs([]);

  // ==================== QUICK LOAD ====================
  
  const handleQuickLoad = async (templateKey) => {
    const template = PLAN_TEMPLATES[templateKey];
    if (!template) {
      toast.error('Template no encontrado');
      return;
    }

    setIsRunning(true);
    clearLogs();
    addLog('info', `Iniciando carga de template: ${template.name}`);

    try {
      // Simulate loading process
      await new Promise(r => setTimeout(r, 500));
      addLog('info', 'Validando datos del template...');
      
      await new Promise(r => setTimeout(r, 300));
      addLog('success', `Atleta: ${template.data.athlete.name}`);
      
      await new Promise(r => setTimeout(r, 300));
      addLog('success', `Macrociclo: ${template.data.macrocycle.name}`);
      
      await new Promise(r => setTimeout(r, 300));
      addLog('success', `${template.data.mesocycles.length} mesociclos configurados`);
      
      await new Promise(r => setTimeout(r, 300));
      addLog('success', `${template.data.microcycles.length} microciclos configurados`);
      
      await new Promise(r => setTimeout(r, 300));
      addLog('success', `${template.data.sessions.length} sesiones tipo configuradas`);

      // Create plan object
      const plan = {
        id: `plan-${Date.now()}`,
        name: `${template.name} - ${new Date().toLocaleDateString('es-ES')}`,
        type: 'template',
        isTest: true,
        template: templateKey,
        sport: template.sport,
        model: template.model,
        duration: template.duration,
        level: template.level,
        createdAt: new Date().toISOString(),
        ...template.data
      };

      // Save to localStorage (plans history)
      const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
      localStorage.setItem('train_generated_plans', JSON.stringify([plan, ...savedPlans]));

      addLog('success', '✅ Plan cargado exitosamente en historial');
      
      // Create report
      const report = {
        id: `report-${Date.now()}`,
        type: 'quick_load',
        templateName: template.name,
        timestamp: new Date().toISOString(),
        duration: 1800,
        success: true,
        planId: plan.id,
        logs: logs.length + 1,
        errors: 0,
        warnings: 0
      };
      saveReport(report);

      toast.success(`✅ ${template.name} cargado correctamente`);
      
      if (onLoadTemplate) {
        onLoadTemplate(plan);
      }

    } catch (error) {
      addLog('error', `Error: ${error.message}`);
      toast.error('Error al cargar template');
    } finally {
      setIsRunning(false);
      setIsDropdownOpen(false);
    }
  };

  // ==================== VIRTUAL COACH ====================

  const runVirtualCoach = async (mode) => {
    const script = VIRTUAL_COACH_SCRIPTS[mode];
    if (!script) {
      toast.error('Modo no válido');
      return;
    }

    setIsRunning(true);
    setActiveSection('creation');
    clearLogs();
    abortRef.current = false;
    
    const startTime = Date.now();
    let errors = 0;
    let warnings = 0;

    addLog('info', `🤖 Virtual Coach iniciado: ${script.name}`);
    addLog('info', script.description);

    setTotalSteps(script.steps.length);
    setCurrentStep(0);
    setProgress(0);

    try {
      for (let i = 0; i < script.steps.length; i++) {
        if (abortRef.current) {
          addLog('warning', '⚠️ Proceso cancelado por el usuario');
          warnings++;
          break;
        }

        const step = script.steps[i];
        setCurrentStep(i + 1);
        setProgress(Math.round(((i + 1) / script.steps.length) * 100));

        // Simulate step execution
        addLog('info', `Ejecutando: ${formatStepAction(step.action)}`);
        await new Promise(r => setTimeout(r, step.delay));

        // Simulate potential errors (5% chance)
        if (Math.random() < 0.05 && step.action !== 'save_plan') {
          addLog('warning', `⚠️ Reintentando ${step.action}...`);
          warnings++;
          await new Promise(r => setTimeout(r, step.delay));
        }

        addLog('success', `✓ ${formatStepAction(step.action)} completado`);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Generate plan data
      const planData = generatePlanFromScript(mode, script);
      
      // Save to localStorage
      const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
      localStorage.setItem('train_generated_plans', JSON.stringify([planData, ...savedPlans]));

      addLog('success', `🎉 Plan "${planData.name}" creado exitosamente`);
      addLog('info', `⏱️ Tiempo total: ${(duration / 1000).toFixed(1)}s`);

      // Create report
      const report = {
        id: `report-${Date.now()}`,
        type: 'virtual_coach',
        mode: mode,
        modeName: script.name,
        timestamp: new Date().toISOString(),
        duration: duration,
        success: errors === 0,
        planId: planData.id,
        stepsTotal: script.steps.length,
        stepsCompleted: abortRef.current ? currentStep : script.steps.length,
        errors: errors,
        warnings: warnings,
        logs: logs.length
      };
      saveReport(report);

      toast.success(`✅ ${script.name} completado`);

      if (onSavePlan) {
        onSavePlan(planData);
      }

    } catch (error) {
      errors++;
      addLog('error', `❌ Error: ${error.message}`);
      toast.error('Error en Virtual Coach');
    } finally {
      setIsRunning(false);
      setProgress(100);
    }
  };

  // ==================== AUTO-TESTING ====================

  const runAutoTest = async (type) => {
    const planCount = type === 'stress' ? 100 : 7;
    
    setIsRunning(true);
    setActiveSection('autotesting');
    clearLogs();
    abortRef.current = false;

    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    let warningCount = 0;
    const createdPlans = [];

    addLog('info', `🚀 Iniciando ${type === 'stress' ? 'Stress Test' : 'Test Completo'}`);
    addLog('info', `Objetivo: Crear ${planCount} planes`);

    setTotalSteps(planCount);
    setProgress(0);

    const templates = Object.keys(PLAN_TEMPLATES);
    const modes = Object.keys(VIRTUAL_COACH_SCRIPTS);

    for (let i = 0; i < planCount; i++) {
      if (abortRef.current) {
        addLog('warning', '⚠️ Test cancelado por el usuario');
        warningCount++;
        break;
      }

      setCurrentStep(i + 1);
      setProgress(Math.round(((i + 1) / planCount) * 100));

      try {
        // Alternate between templates and virtual coach modes
        const useTemplate = i % 3 === 0;
        let planData;

        if (useTemplate) {
          const templateKey = templates[i % templates.length];
          const template = PLAN_TEMPLATES[templateKey];
          planData = {
            id: `test-plan-${Date.now()}-${i}`,
            name: `Test ${i + 1}: ${template.name}`,
            type: 'test',
            isTest: true,
            createdAt: new Date().toISOString(),
            ...template.data
          };
          addLog('info', `[${i + 1}/${planCount}] Template: ${template.name}`);
        } else {
          const modeKey = modes[i % modes.length];
          planData = generatePlanFromScript(modeKey, VIRTUAL_COACH_SCRIPTS[modeKey]);
          planData.id = `test-plan-${Date.now()}-${i}`;
          planData.name = `Test ${i + 1}: ${VIRTUAL_COACH_SCRIPTS[modeKey].name}`;
          planData.isTest = true;
          addLog('info', `[${i + 1}/${planCount}] Coach: ${VIRTUAL_COACH_SCRIPTS[modeKey].name}`);
        }

        // Simulate processing time (faster for stress test)
        await new Promise(r => setTimeout(r, type === 'stress' ? 50 : 200));

        // 2% error rate simulation
        if (Math.random() < 0.02) {
          throw new Error('Simulated validation error');
        }

        createdPlans.push(planData);
        successCount++;
        addLog('success', `✓ Plan ${i + 1} creado`);

      } catch (error) {
        errorCount++;
        addLog('error', `✗ Plan ${i + 1} falló: ${error.message}`);
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Save all plans to localStorage
    const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
    localStorage.setItem('train_generated_plans', JSON.stringify([...createdPlans, ...savedPlans]));

    // Summary
    const successRate = Math.round((successCount / planCount) * 100);
    addLog('info', '─'.repeat(40));
    addLog('info', '📊 RESUMEN DEL TEST');
    addLog('info', `✅ Exitosos: ${successCount}/${planCount} (${successRate}%)`);
    addLog(errorCount > 0 ? 'error' : 'info', `❌ Errores: ${errorCount}`);
    addLog(warningCount > 0 ? 'warning' : 'info', `⚠️ Warnings: ${warningCount}`);
    addLog('info', `⏱️ Tiempo: ${(duration / 1000).toFixed(1)}s`);
    addLog('info', `📈 Velocidad: ${(planCount / (duration / 1000)).toFixed(1)} planes/seg`);

    // Create report
    const report = {
      id: `report-${Date.now()}`,
      type: type === 'stress' ? 'stress_test' : 'full_test',
      timestamp: new Date().toISOString(),
      duration: duration,
      success: successRate >= 90,
      plansTotal: planCount,
      plansCreated: successCount,
      successRate: successRate,
      errors: errorCount,
      warnings: warningCount,
      createdPlanIds: createdPlans.map(p => p.id)
    };
    saveReport(report);

    if (successRate < 90) {
      toast.error(`⚠️ Success rate bajo: ${successRate}%`);
    } else {
      toast.success(`✅ Test completado: ${successRate}% éxito`);
    }

    setIsRunning(false);
  };

  // ==================== HELPERS ====================

  const formatStepAction = (action) => {
    const labels = {
      select_sport: 'Seleccionar deporte',
      select_model: 'Seleccionar modelo periodización',
      set_duration: 'Configurar duración',
      set_objective: 'Definir objetivo principal',
      set_athlete_profile: 'Configurar perfil del atleta',
      add_test_results: 'Agregar resultados de tests',
      add_competition: 'Agregar competencia',
      generate_macro: 'Generar macrociclo',
      configure_phases: 'Configurar fases',
      set_weekly_hours: 'Definir horas semanales',
      auto_fill_mesos: 'Auto-completar mesociclos',
      auto_fill_micros: 'Auto-completar microciclos',
      add_exercises: 'Agregar ejercicios',
      add_zones: 'Configurar zonas de entrenamiento',
      validate_plan: 'Validar plan completo',
      save_plan: 'Guardar plan'
    };
    return labels[action] || action;
  };

  const generatePlanFromScript = (mode, script) => {
    const sports = ['running', 'swimming', 'cycling', 'triathlon', 'weightlifting'];
    const models = ['tradicional', 'atr', 'ondulante', 'polarized'];
    
    return {
      id: `plan-${Date.now()}`,
      name: `Plan ${script.name} - ${new Date().toLocaleDateString('es-ES')}`,
      type: 'virtual_coach',
      mode: mode,
      isTest: true,
      createdAt: new Date().toISOString(),
      athlete: {
        name: `Atleta Virtual (${mode})`,
        sport: sports[Math.floor(Math.random() * sports.length)],
        level: mode
      },
      macrocycle: {
        name: `Macrociclo ${script.name}`,
        duration: mode === 'principiante' ? 4 : mode === 'intermedio' ? 12 : 24,
        model: models[Math.floor(Math.random() * models.length)]
      },
      mesocycles: Array.from({ length: mode === 'principiante' ? 1 : mode === 'intermedio' ? 3 : 6 }, (_, i) => ({
        id: `meso-${i}`,
        name: `Mesociclo ${i + 1}`,
        weeks: 4
      })),
      microcycles: Array.from({ length: mode === 'principiante' ? 4 : mode === 'intermedio' ? 12 : 24 }, (_, i) => ({
        id: `micro-${i}`,
        week: i + 1,
        type: ['Carga', 'Impacto', 'Recuperación'][i % 3]
      }))
    };
  };

  const cancelExecution = () => {
    abortRef.current = true;
    addLog('warning', '🛑 Cancelando...');
  };

  const deleteReport = (reportId) => {
    const newReports = reports.filter(r => r.id !== reportId);
    setReports(newReports);
    localStorage.setItem('train_test_reports', JSON.stringify(newReports));
    toast.success('Reporte eliminado');
  };

  const clearAllTestPlans = () => {
    if (!window.confirm('¿Eliminar todos los planes de test del historial?')) return;
    
    const savedPlans = JSON.parse(localStorage.getItem('train_generated_plans') || '[]');
    const filteredPlans = savedPlans.filter(p => !p.isTest);
    localStorage.setItem('train_generated_plans', JSON.stringify(filteredPlans));
    
    toast.success('Planes de test eliminados');
  };

  const exportReport = (report) => {
    const content = JSON.stringify(report, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${report.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Reporte exportado');
  };

  // ==================== RENDER ====================

  return (
    <>
      {/* Main Button */}
      <div className="relative">
        {fabStyle ? (
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="group flex flex-col items-center gap-1 shrink-0 outline-none"
            data-testid="auto-testing-btn"
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
              isDropdownOpen
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg'
            }`}>
              <Bot className={`w-[18px] h-[18px] transition-transform duration-300 ${isDropdownOpen ? 'text-white' : 'group-hover:text-violet-500'}`} strokeWidth={isDropdownOpen ? 2.5 : 1.8} />
            </div>
            <span className={`text-[8px] font-bold tracking-wide leading-tight text-center max-w-[56px] transition-colors duration-300 ${
              isDropdownOpen ? 'text-violet-600' : 'text-slate-400 group-hover:text-violet-500'
            }`}>
              Pruebas
            </span>
          </button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-300 hover:border-violet-400 hover:bg-violet-50"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            data-testid="auto-testing-btn"
          >
            <Bot className="w-4 h-4 text-violet-600" />
            <span className="hidden sm:inline text-violet-700">Sistema de Pruebas</span>
            <ChevronDown className={`w-4 h-4 text-violet-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </Button>
        )}

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            {/* Section 1: Quick Load */}
            <div className="p-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Carga Rápida de Templates
              </h4>
              <div className="space-y-1">
                {Object.entries(PLAN_TEMPLATES).map(([key, template]) => (
                  <button
                    key={key}
                    onClick={() => handleQuickLoad(key)}
                    disabled={isRunning}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-violet-50 transition-colors flex items-center gap-3 group"
                    data-testid={`quick-load-${key}`}
                  >
                    <span className="text-xl">{template.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{template.name}</p>
                      <p className="text-xs text-slate-400">{template.sport} • {template.level}</p>
                    </div>
                    <Play className="w-4 h-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Section 2: Virtual Coach */}
            <div className="p-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" />
                Creación Inteligente (Virtual Coach)
              </h4>
              <div className="space-y-1">
                {Object.entries(VIRTUAL_COACH_SCRIPTS).map(([key, script]) => (
                  <button
                    key={key}
                    onClick={() => runVirtualCoach(key)}
                    disabled={isRunning}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-3 group"
                    data-testid={`virtual-coach-${key}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      key === 'principiante' ? 'bg-green-100 text-green-600' :
                      key === 'intermedio' ? 'bg-amber-100 text-amber-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {key === 'principiante' ? '1' : key === 'intermedio' ? '2' : '3'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{script.name}</p>
                      <p className="text-xs text-slate-400">{script.description}</p>
                    </div>
                    <Bot className="w-4 h-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Auto-Testing */}
            <div className="p-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" />
                Auto-Testing
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => runAutoTest('full')}
                  disabled={isRunning}
                  className="px-3 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left"
                  data-testid="auto-test-full"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Test Completo</span>
                  </div>
                  <p className="text-xs text-blue-500">Crea 7 planes</p>
                </button>
                <button
                  onClick={() => runAutoTest('stress')}
                  disabled={isRunning}
                  className="px-3 py-2.5 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors text-left"
                  data-testid="auto-test-stress"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">Stress Test</span>
                  </div>
                  <p className="text-xs text-orange-500">Crea 100 planes</p>
                </button>
              </div>
              <button
                onClick={() => { setShowReports(true); setIsDropdownOpen(false); }}
                className="w-full mt-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                data-testid="view-reports-btn"
              >
                <BarChart className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Ver Reportes ({reports.length})</span>
              </button>
            </div>

            {/* Running State */}
            {isRunning && (
              <div className="p-3 bg-violet-50 border-t border-violet-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
                    <span className="text-sm font-medium text-violet-700">
                      {currentStep}/{totalSteps} pasos
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={cancelExecution}
                  >
                    Cancelar
                  </Button>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Dialog */}
      <Dialog open={isRunning && logs.length > 0} onOpenChange={() => {}}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-violet-600" />
              {activeSection === 'creation' ? 'Virtual Coach en Ejecución' : 
               activeSection === 'autotesting' ? 'Auto-Testing en Progreso' : 
               'Cargando Template'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Progreso: {currentStep}/{totalSteps}</span>
                <span className="font-medium text-violet-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Logs */}
            <div className="flex-1 overflow-y-auto bg-slate-900 rounded-lg p-3 font-mono text-xs">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`mb-1 ${
                    log.type === 'success' ? 'text-green-400' :
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    'text-slate-300'
                  }`}
                >
                  <span className="text-slate-500 mr-2">
                    {new Date(log.timestamp).toLocaleTimeString('es-ES')}
                  </span>
                  {log.message}
                </div>
              ))}
            </div>

            {/* Actions */}
            {isRunning && (
              <div className="mt-4 flex justify-end">
                <Button 
                  variant="outline" 
                  className="text-red-500 border-red-200 hover:bg-red-50"
                  onClick={cancelExecution}
                >
                  Cancelar Ejecución
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reports Dialog */}
      <Dialog open={showReports} onOpenChange={setShowReports}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart className="w-5 h-5 text-violet-600" />
                Reportes de Testing ({reports.length})
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={clearAllTestPlans}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Limpiar Tests
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No hay reportes aún</p>
                <p className="text-sm mt-1">Ejecuta tests para generar reportes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <div 
                    key={report.id}
                    className={`p-3 rounded-xl border-2 transition-all hover:shadow-md ${
                      report.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {report.success ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-slate-800">
                            {report.type === 'quick_load' ? `Template: ${report.templateName}` :
                             report.type === 'virtual_coach' ? `Coach: ${report.modeName}` :
                             report.type === 'stress_test' ? 'Stress Test (100 planes)' :
                             'Test Completo (7 planes)'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(report.timestamp).toLocaleString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {report.successRate !== undefined && (
                          <Badge variant={report.successRate >= 90 ? 'default' : 'destructive'}>
                            {report.successRate}% éxito
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => exportReport(report)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                          onClick={() => deleteReport(report.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {(report.duration / 1000).toFixed(1)}s
                      </span>
                      {report.plansCreated !== undefined && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {report.plansCreated}/{report.plansTotal} planes
                        </span>
                      )}
                      {report.errors > 0 && (
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-3.5 h-3.5" />
                          {report.errors} errores
                        </span>
                      )}
                      {report.warnings > 0 && (
                        <span className="flex items-center gap-1 text-amber-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {report.warnings} warnings
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AutoTestingSystem;
