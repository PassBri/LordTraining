import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  AlertTriangle, Bell, Activity, TrendingDown, TrendingUp, 
  Calendar, Loader2, CheckCircle, XCircle, ChevronRight,
  Zap, Heart, Brain, Target
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ALERT_TYPES = {
  overtraining: {
    icon: AlertTriangle,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: 'Riesgo de Sobreentrenamiento'
  },
  competition_near: {
    icon: Calendar,
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    title: 'Competencia Próxima'
  },
  load_increase: {
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    title: 'Aumentar Carga Recomendado'
  },
  load_decrease: {
    icon: TrendingDown,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Reducir Carga Recomendado'
  },
  evaluation_needed: {
    icon: Target,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    title: 'Evaluación Pendiente'
  },
  recovery: {
    icon: Heart,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    title: 'Fase de Recuperación'
  }
};

const SmartAlerts = ({ athleteId, athleteName, onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [athleteData, setAthleteData] = useState(null);

  useEffect(() => {
    if (athleteId) {
      loadAlertData();
    }
  }, [athleteId]);

  const loadAlertData = async () => {
    setLoading(true);
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // Load athlete tests, events, and periodization data
      const [testsRes, eventsRes, plansRes] = await Promise.all([
        axios.get(`${API_URL}/api/tests/${athleteId}`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/api/events/${athleteId}`, { headers }).catch(() => ({ data: { events: [] } })),
        axios.get(`${API_URL}/api/periodization/athlete/${athleteId}`, { headers }).catch(() => ({ data: [] }))
      ]);

      const tests = testsRes.data?.tests || [];
      const events = eventsRes.data?.events || [];
      const plans = plansRes.data || [];

      setAthleteData({ tests, events, plans });
      
      // Generate smart alerts
      generateAlerts(tests, events, plans);
    } catch (error) {
      console.error('Error loading alert data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = (tests, events, plans) => {
    const newAlerts = [];
    const newRecommendations = [];
    const today = new Date();

    // Check for upcoming competitions
    const upcomingCompetitions = events.filter(event => {
      const eventDate = new Date(event.date);
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      return daysUntil > 0 && daysUntil <= 14 && 
             (event.type === 'competition' || event.priority === 'high');
    });

    upcomingCompetitions.forEach(comp => {
      const eventDate = new Date(comp.date);
      const daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      
      newAlerts.push({
        id: `comp-${comp.id || Math.random()}`,
        type: 'competition_near',
        priority: daysUntil <= 7 ? 'high' : 'medium',
        message: `${comp.name} en ${daysUntil} días`,
        detail: daysUntil <= 7 
          ? 'Considera reducir volumen y mantener intensidad específica' 
          : 'Mantén el plan de preparación actual',
        date: eventDate
      });

      // Add taper recommendation if very close
      if (daysUntil <= 7) {
        newRecommendations.push({
          id: `rec-taper-${comp.id}`,
          type: 'load_decrease',
          message: 'Fase de Taper recomendada',
          detail: `Reduce el volumen 40-60% manteniendo intensidad para ${comp.name}`,
          action: 'Ajustar plan gráfico'
        });
      }
    });

    // Check test results for overtraining indicators
    if (tests.length > 0) {
      const recentTests = tests.slice(-5);
      const hasDecline = recentTests.some((test, idx) => {
        if (idx === 0) return false;
        const current = parseFloat(test.result) || 0;
        const previous = parseFloat(recentTests[idx - 1].result) || 0;
        return current < previous * 0.9; // 10% decline
      });

      if (hasDecline) {
        newAlerts.push({
          id: 'overtraining-risk',
          type: 'overtraining',
          priority: 'high',
          message: 'Posible fatiga acumulada detectada',
          detail: 'Los resultados de evaluaciones muestran descenso. Considera una fase de recuperación.',
          date: new Date()
        });

        newRecommendations.push({
          id: 'rec-recovery',
          type: 'recovery',
          message: 'Semana de descarga recomendada',
          detail: 'Reduce intensidad y volumen 50% para permitir supercompensación',
          action: 'Ver plan de recuperación'
        });
      }

      // Check if evaluation is needed (no tests in last 2 weeks)
      const lastTest = tests[tests.length - 1];
      if (lastTest) {
        const lastTestDate = new Date(lastTest.date);
        const daysSinceTest = Math.ceil((today - lastTestDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceTest > 14) {
          newAlerts.push({
            id: 'eval-needed',
            type: 'evaluation_needed',
            priority: 'low',
            message: 'Última evaluación hace ' + daysSinceTest + ' días',
            detail: 'Realiza una evaluación para ajustar la planificación',
            date: lastTestDate
          });
        }
      }
    } else {
      // No tests at all
      newAlerts.push({
        id: 'no-tests',
        type: 'evaluation_needed',
        priority: 'medium',
        message: 'Sin evaluaciones registradas',
        detail: 'Realiza evaluaciones iniciales para personalizar el entrenamiento',
        date: today
      });
    }

    // General load recommendations based on phase
    if (plans.length > 0) {
      const activePlan = plans[0];
      // Simulate phase-based recommendations
      newRecommendations.push({
        id: 'rec-phase',
        type: 'load_increase',
        message: 'Progresión de carga sugerida',
        detail: 'Incrementa volumen 10% esta semana según el plan de periodización',
        action: 'Ver plan gráfico'
      });
    }

    // Sort alerts by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    newAlerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    setAlerts(newAlerts);
    setRecommendations(newRecommendations);
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    toast.success('Alerta descartada');
  };

  if (!athleteId) {
    return (
      <Card className="border-dashed border-2 border-slate-200">
        <CardContent className="p-6 text-center">
          <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Selecciona un atleta</p>
          <p className="text-sm text-slate-400">Para ver alertas inteligentes</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mr-2" />
          <span className="text-slate-500">Analizando datos...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alerts Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Alertas Inteligentes
            {alerts.length > 0 && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full ml-2">
                {alerts.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map(alert => {
                const config = ALERT_TYPES[alert.type] || ALERT_TYPES.evaluation_needed;
                const IconComponent = config.icon;
                return (
                  <div 
                    key={alert.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className={`mt-0.5 ${config.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold text-sm ${config.color.replace('text-', 'text-').replace('500', '800')}`}>
                          {alert.message}
                        </p>
                        {alert.priority === 'high' && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{alert.detail}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-2" />
              <p className="text-green-600 font-medium">Sin alertas activas</p>
              <p className="text-xs text-slate-500">El atleta está en buen estado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations Card */}
      <Card className="border-0 shadow-md overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recomendaciones de Carga
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map(rec => {
                const config = ALERT_TYPES[rec.type] || ALERT_TYPES.load_increase;
                const IconComponent = config.icon;
                return (
                  <div 
                    key={rec.id} 
                    className={`flex items-start gap-3 p-3 rounded-lg border ${config.bgColor} ${config.borderColor}`}
                  >
                    <div className={`mt-0.5 ${config.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-slate-800">{rec.message}</p>
                      <p className="text-xs text-slate-600 mt-1">{rec.detail}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs h-7"
                      onClick={() => onNavigate?.('graphic-plan')}
                    >
                      {rec.action}
                      <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <Brain className="w-12 h-12 mx-auto opacity-30 mb-2" />
              <p className="text-sm">Agrega más datos para obtener recomendaciones</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SmartAlerts;
