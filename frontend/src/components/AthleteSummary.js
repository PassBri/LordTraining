import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import {
  User, Ruler, Scale, Activity, Heart, Brain, 
  TrendingUp, Calendar, Target, ChevronRight, ChevronDown, Loader2,
  Dumbbell, Zap, Save, Trophy, Apple, Users, AlertTriangle, 
  LineChart, UserCheck
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

const AthleteSummary = ({ athlete, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [anthropometricData, setAnthropometricData] = useState(null);
  const [testData, setTestData] = useState(null);
  const [showCharacterization, setShowCharacterization] = useState(false);
  const [saving, setSaving] = useState(false);
  const [charData, setCharData] = useState({
    name: '', experience: '', age: '', position: '', level: '', observation: '',
    inheritance: '', biologicalAge: '', optimalSelectionAge: '', healthStatus: '',
    anthropometricParams: '', physicalQualities: '', cognitiveCapabilities: '',
    psychologicalCharacteristics: '', socioeconomicCharacteristics: '', environment: '',
    nutritionalStatus: '', sportsTrajectory: '', otherSportsExperience: '',
    previousSeasonPerformance: '', objectives: '', trainingLevels: '', currentForm: '', injuries: ''
  });

  useEffect(() => {
    if (athlete?.id) {
      loadAthleteData();
    } else {
      setShowCharacterization(false);
    }
  }, [athlete?.id]);

  const loadAthleteData = async () => {
    setLoading(true);
    const token = localStorage.getItem('train_token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [anthropRes, testRes, charRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/anthropometric/${athlete.id}`, { headers }).catch(() => ({ data: null })),
        axios.get(`${BACKEND_URL}/api/tests/${athlete.id}`, { headers }).catch(() => ({ data: null })),
        axios.get(`${BACKEND_URL}/api/characterization/athlete/${athlete.id}`, { headers }).catch(() => ({ data: null }))
      ]);
      if (anthropRes.data?.records?.length > 0) {
        setAnthropometricData(anthropRes.data.records[anthropRes.data.records.length - 1]);
      }
      if (testRes.data) setTestData(testRes.data);
      if (charRes.data) setCharData(prev => ({ ...prev, ...charRes.data }));
    } catch (error) {
      console.error('Error loading athlete data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCharacterization = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      await axios.post(
        `${BACKEND_URL}/api/characterization/athlete`,
        { ...charData, athlete_id: athlete.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Caracterización guardada');
    } catch (error) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const calculateRecommendedLoad = () => {
    if (!testData?.tests || testData.tests.length === 0) return null;
    const recentTests = testData.tests.slice(-5);
    let totalScore = 0, count = 0;
    recentTests.forEach(test => {
      const score = parseFloat(test.result);
      if (!isNaN(score)) { totalScore += score; count++; }
    });
    if (count === 0) return null;
    const avg = totalScore / count;
    if (avg >= 90) return { level: 'Muy Alta', pct: '85-95%', color: '#ef4444' };
    if (avg >= 75) return { level: 'Alta', pct: '70-85%', color: '#f97316' };
    if (avg >= 60) return { level: 'Media', pct: '55-70%', color: '#eab308' };
    if (avg >= 40) return { level: 'Baja', pct: '40-55%', color: '#22c55e' };
    return { level: 'Recuperación', pct: '< 40%', color: '#3b82f6' };
  };

  const recommendedLoad = calculateRecommendedLoad();

  const charSections = [
    { title: 'Información General', icon: User, color: '#1976D2',
      fields: [
        { label: 'Nombre', key: 'name', type: 'input', ph: 'Nombre completo...' },
        { label: 'Edad', key: 'age', type: 'input', ph: 'Edad...' },
        { label: 'Experiencia', key: 'experience', type: 'input', ph: 'Años de experiencia...' },
        { label: 'Posición', key: 'position', type: 'input', ph: 'Posición o especialidad...' },
        { label: 'Nivel', key: 'level', type: 'input', ph: 'Nivel competitivo...' },
        { label: 'Observaciones', key: 'observation', type: 'textarea', ph: 'Observaciones relevantes...' }
      ]},
    { title: 'Aspectos Biológicos', icon: Brain, color: '#7B1FA2',
      fields: [
        { label: 'Herencia', key: 'inheritance', type: 'textarea', ph: 'Influencia genética...' },
        { label: 'Edad biológica', key: 'biologicalAge', type: 'textarea', ph: 'Edad biológica vs cronológica...' },
        { label: 'Edad óptima de selección', key: 'optimalSelectionAge', type: 'textarea', ph: 'Momento ideal...' }
      ]},
    { title: 'Salud y Condición Física', icon: Heart, color: '#D32F2F',
      fields: [
        { label: 'Estado de salud', key: 'healthStatus', type: 'textarea', ph: 'Revisión médica, estado general...' },
        { label: 'Parámetros antropométricos', key: 'anthropometricParams', type: 'textarea', ph: 'Estatura, peso, somatotipo...' },
        { label: 'Cualidades físicas', key: 'physicalQualities', type: 'textarea', ph: 'Habilidades físicas y coordinativas...' }
      ]},
    { title: 'Psicología y Cognición', icon: Brain, color: '#303F9F',
      fields: [
        { label: 'Características psicológicas', key: 'psychologicalCharacteristics', type: 'textarea', ph: 'Motivación, estrés, concentración...' },
        { label: 'Capacidades cognitivas', key: 'cognitiveCapabilities', type: 'textarea', ph: 'Percepción, memoria, decisiones...' }
      ]},
    { title: 'Entorno Socioeconómico', icon: Users, color: '#00796B',
      fields: [
        { label: 'Características socioeconómicas', key: 'socioeconomicCharacteristics', type: 'textarea', ph: 'Entorno, recursos, oportunidades...' },
        { label: 'Conocimiento del entorno', key: 'environment', type: 'textarea', ph: 'Actividades, educación, dedicación...' }
      ]},
    { title: 'Nutrición', icon: Apple, color: '#388E3C',
      fields: [
        { label: 'Estado nutricional', key: 'nutritionalStatus', type: 'textarea', ph: 'Dieta, macronutrientes...' }
      ]},
    { title: 'Trayectoria Deportiva', icon: Trophy, color: '#F57F17',
      fields: [
        { label: 'Trayectoria', key: 'sportsTrajectory', type: 'textarea', ph: 'Competiciones, logros, progresión...' },
        { label: 'Otros deportes', key: 'otherSportsExperience', type: 'textarea', ph: 'Otras disciplinas...' }
      ]},
    { title: 'Rendimiento y Objetivos', icon: LineChart, color: '#0097A7',
      fields: [
        { label: 'Rendimiento temporada anterior', key: 'previousSeasonPerformance', type: 'textarea', ph: 'Desempeño, estadísticas...' },
        { label: 'Objetivos cumplidos', key: 'objectives', type: 'textarea', ph: 'Objetivos y cumplimiento...' }
      ]},
    { title: 'Entrenamiento Actual', icon: Activity, color: '#E64A19',
      fields: [
        { label: 'Niveles de entrenamiento', key: 'trainingLevels', type: 'textarea', ph: 'Volumen e intensidad...' },
        { label: 'Forma actual', key: 'currentForm', type: 'textarea', ph: 'Condición física y técnica actual...' }
      ]},
    { title: 'Historial de Lesiones', icon: AlertTriangle, color: '#C62828',
      fields: [
        { label: 'Lesiones', key: 'injuries', type: 'textarea', ph: 'Historial, severidad, tratamientos...' }
      ]}
  ];

  if (!athlete) {
    return (
      <Card className="border border-dashed border-slate-300 bg-slate-50/50">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium text-base">Selecciona un atleta</p>
          <p className="text-sm text-slate-400 mt-1">Ver resumen y datos del atleta</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div data-testid="athlete-detail-panel">
      {/* Athlete Header - full width */}
      <div className="rounded-xl overflow-hidden shadow-lg mb-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <div className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            {athlete.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white truncate">{athlete.name}</h3>
            <p className="text-slate-300 text-xs">{athlete.sport} &middot; {athlete.level || 'Sin nivel'} &middot; {athlete.age} a.</p>
          </div>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-white/60" />}
          <div className="flex gap-1.5 flex-shrink-0">
            <Button variant="ghost" size="sm" className="text-xs h-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => onNavigate?.('periodization')}>
              <Calendar className="w-3 h-3 mr-1" /> Plan
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-white/70 hover:text-white hover:bg-white/10" onClick={() => onNavigate?.('graphic-plan')}>
              <TrendingUp className="w-3 h-3 mr-1" /> Gráfico
            </Button>
          </div>
        </div>
      </div>

      {/* Metrics Row - horizontal cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {/* Anthropometric */}
        <div className="rounded-xl p-3 border border-blue-100" style={{ backgroundColor: '#E3F2FD' }}>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-xs flex items-center gap-1.5" style={{ color: '#1565C0' }}>
              <Ruler className="w-3.5 h-3.5" /> Antropometría
            </h4>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" style={{ color: '#1565C0' }} onClick={() => onNavigate?.('anthropometric')}>
              Ver <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          {anthropometricData?.measurements ? (
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { icon: Scale, val: anthropometricData.measurements.weight, label: 'Peso' },
                { icon: Ruler, val: anthropometricData.measurements.height, label: 'Talla' },
                { icon: Activity, val: anthropometricData.measurements.bodyFat || anthropometricData.measurements.bmi, label: anthropometricData.measurements.bodyFat ? 'Grasa%' : 'IMC' }
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg p-1.5 text-center shadow-sm">
                  <item.icon className="w-3 h-3 mx-auto mb-0.5" style={{ color: '#1976D2' }} />
                  <p className="text-sm font-bold text-slate-800">{item.val || '--'}</p>
                  <p className="text-[9px] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-center py-1" style={{ color: '#1976D2' }}>Sin datos</p>
          )}
        </div>

        {/* Evaluations */}
        <div className="rounded-xl p-3 border border-green-100" style={{ backgroundColor: '#E8F5E9' }}>
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-xs flex items-center gap-1.5" style={{ color: '#2E7D32' }}>
              <Target className="w-3.5 h-3.5" /> Evaluaciones
            </h4>
            <Button variant="ghost" size="sm" className="h-5 text-[10px] px-1" style={{ color: '#2E7D32' }} onClick={() => onNavigate?.('tests')}>
              Ver <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
          <p className="text-xs" style={{ color: '#388E3C' }}>
            {testData?.tests?.length > 0
              ? <><span className="font-semibold">{testData.tests.length}</span> tests &middot; {testData.tests[testData.tests.length - 1]?.name || 'N/A'}</>
              : 'Sin evaluaciones registradas'}
          </p>
        </div>

        {/* Load Recommendation */}
        <div className="rounded-xl p-3 border border-orange-100" style={{ backgroundColor: '#FFF3E0' }}>
          <h4 className="font-semibold text-xs flex items-center gap-1.5 mb-1" style={{ color: '#E65100' }}>
            <Zap className="w-3.5 h-3.5" /> Carga Recomendada
          </h4>
          {recommendedLoad ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold" style={{ color: recommendedLoad.color }}>{recommendedLoad.level}</p>
                <p className="text-[10px]" style={{ color: '#E65100' }}>{recommendedLoad.pct}</p>
              </div>
              <Dumbbell className="w-5 h-5" style={{ color: recommendedLoad.color }} />
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#E65100' }}>Completa evaluaciones</p>
          )}
        </div>
      </div>

      {/* Characterization Toggle */}
      <Card className="border-0 shadow-lg overflow-hidden">
        <button
          className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
          onClick={() => setShowCharacterization(!showCharacterization)}
          data-testid="toggle-characterization-btn"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#E8EAF6' }}>
              <UserCheck className="w-5 h-5" style={{ color: '#283593' }} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Caracterización del Deportista</h3>
              <p className="text-xs text-slate-500">Diagnóstico completo de condiciones</p>
            </div>
          </div>
          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${showCharacterization ? 'rotate-180' : ''}`} />
        </button>

        {showCharacterization && (
          <div className="border-t border-slate-100">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {charSections.map((section, sIdx) => (
                  <div key={sIdx} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ backgroundColor: section.color + '18' }}>
                        <section.icon className="w-3.5 h-3.5" style={{ color: section.color }} />
                      </div>
                      <span className="font-semibold text-xs text-slate-700">{section.title}</span>
                    </div>
                    <div className="p-3 space-y-2 bg-white">
                      {section.fields.map((field) => (
                        <div key={field.key}>
                          <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">{field.label}</label>
                          {field.type === 'input' ? (
                            <Input
                              value={charData[field.key]}
                              onChange={(e) => setCharData({ ...charData, [field.key]: e.target.value })}
                              placeholder={field.ph}
                              className="h-8 text-xs border-slate-200 focus:border-blue-400"
                              data-testid={`char-${field.key}`}
                            />
                          ) : (
                            <Textarea
                              value={charData[field.key]}
                              onChange={(e) => setCharData({ ...charData, [field.key]: e.target.value })}
                              placeholder={field.ph}
                              className="min-h-[60px] text-xs border-slate-200 focus:border-blue-400 resize-y"
                              data-testid={`char-${field.key}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-3">
                <Button
                  onClick={handleSaveCharacterization}
                  disabled={saving}
                  className="text-white shadow-md text-xs px-5 h-8"
                  style={{ backgroundColor: '#1565C0' }}
                  data-testid="save-characterization-btn"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                  {saving ? 'Guardando...' : 'Guardar Caracterización'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AthleteSummary;
