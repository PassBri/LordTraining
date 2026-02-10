import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { generatePlan, getAthletes, createMacrocycle, createMesocycle, createMicrocycle, createSession } from '../services/api';
import { Sparkles, Loader2, Check, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SPORTS = [
  { value: 'football', label: 'Fútbol' },
  { value: 'athletics', label: 'Atletismo' },
  { value: 'swimming', label: 'Natación' },
  { value: 'cycling', label: 'Ciclismo' },
  { value: 'basketball', label: 'Baloncesto' },
  { value: 'crossfit', label: 'CrossFit' },
  { value: 'weightlifting', label: 'Halterofilia' },
];

const PLANNING_MODELS = [
  { value: 'traditional', label: 'Tradicional', description: 'Periodización lineal clásica' },
  { value: 'atr', label: 'ATR', description: 'Acumulación, Transformación, Realización' },
  { value: 'blocks', label: 'Bloques', description: 'Entrenamiento concentrado por bloques' },
  { value: 'undulating', label: 'Ondulatorio', description: 'Variación diaria/semanal de intensidad' },
  { value: 'concurrent', label: 'Concurrente', description: 'Desarrollo simultáneo de capacidades' },
];

const LEVELS = ['Principiante', 'Intermedio', 'Avanzado', 'Élite', 'Profesional'];

const AIGeneratorPage = () => {
  const [searchParams] = useSearchParams();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    athlete_id: searchParams.get('athlete') || '',
    sport: '',
    planning_model: 'atr',
    duration_weeks: 12,
    objective: '',
    current_level: '',
    available_days_per_week: 5,
    competitions: ''
  });

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      const response = await getAthletes();
      setAthletes(response.data);
      
      // Pre-fill sport if athlete is selected
      const athleteId = searchParams.get('athlete');
      if (athleteId) {
        const athlete = response.data.find(a => a.id === athleteId);
        if (athlete) {
          setFormData(prev => ({
            ...prev,
            athlete_id: athleteId,
            sport: athlete.sport,
            current_level: athlete.level
          }));
        }
      }
    } catch (error) {
      toast.error('Error al cargar atletas');
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteChange = (athleteId) => {
    const athlete = athletes.find(a => a.id === athleteId);
    if (athlete) {
      setFormData(prev => ({
        ...prev,
        athlete_id: athleteId,
        sport: athlete.sport,
        current_level: athlete.level
      }));
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!formData.athlete_id) {
      toast.error('Selecciona un atleta');
      return;
    }

    setGenerating(true);
    setGeneratedPlan(null);
    setSaved(false);

    try {
      const response = await generatePlan({
        ...formData,
        competitions: formData.competitions ? formData.competitions.split(',').map(c => c.trim()) : []
      });
      
      if (response.data.plan) {
        setGeneratedPlan(response.data.plan);
        toast.success('Plan generado correctamente');
      } else {
        toast.error('No se pudo generar el plan');
      }
    } catch (error) {
      const message = error.response?.data?.detail || 'Error al generar plan';
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSavePlan = async () => {
    if (!generatedPlan?.macrocycle) {
      toast.error('No hay plan para guardar');
      return;
    }

    setSaving(true);
    try {
      const macro = generatedPlan.macrocycle;
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + (formData.duration_weeks * 7));

      // Create macrocycle
      const macroRes = await createMacrocycle({
        name: macro.name || `Plan ${formData.sport} - ${formData.planning_model}`,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        sport: formData.sport,
        planning_model: formData.planning_model,
        objective: macro.objective || formData.objective
      }, formData.athlete_id);

      const macroId = macroRes.data.id;

      // Create mesocycles
      let currentDate = new Date(today);
      for (const meso of (macro.mesocycles || [])) {
        const mesoEndDate = new Date(currentDate);
        mesoEndDate.setDate(mesoEndDate.getDate() + ((meso.weeks || 4) * 7));

        const mesoRes = await createMesocycle({
          name: meso.name || 'Mesociclo',
          start_date: currentDate.toISOString().split('T')[0],
          end_date: mesoEndDate.toISOString().split('T')[0],
          phase: meso.phase || 'accumulation',
          objective: meso.objective
        }, macroId);

        const mesoId = mesoRes.data.id;

        // Create microcycles
        let microDate = new Date(currentDate);
        for (const micro of (meso.microcycles || [])) {
          const microEndDate = new Date(microDate);
          microEndDate.setDate(microEndDate.getDate() + 7);

          const microRes = await createMicrocycle({
            name: micro.name || 'Microciclo',
            start_date: microDate.toISOString().split('T')[0],
            end_date: microEndDate.toISOString().split('T')[0],
            objective: ''
          }, mesoId);

          const microId = microRes.data.id;

          // Create sessions
          for (const session of (micro.sessions || [])) {
            const sessionDate = new Date(microDate);
            sessionDate.setDate(sessionDate.getDate() + (session.day || 0));

            await createSession({
              date: sessionDate.toISOString().split('T')[0],
              session_type: session.session_type || 'physical',
              duration_minutes: session.duration_minutes || 60,
              volume: session.volume || 10,
              intensity: session.intensity || 'medium',
              exercises: (session.exercises || []).map(e => ({ name: e })),
              notes: session.notes || '',
              time_of_day: 'morning'
            }, microId);
          }

          microDate = microEndDate;
        }

        currentDate = mesoEndDate;
      }

      toast.success('Plan guardado correctamente');
      setSaved(true);
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Error al guardar el plan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3" style={{ fontFamily: 'Barlow Condensed' }}>
            <Sparkles className="w-8 h-8 text-[#007AFF]" />
            GENERADOR DE PLANES CON IA
          </h1>
          <p className="text-slate-500 mt-1">Genera planes de entrenamiento personalizados con GPT-5.2</p>
        </div>

        {athletes.length === 0 ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-amber-900">Necesitas al menos un atleta</h3>
                <p className="text-sm text-amber-700 mt-1">Crea un atleta primero para poder generar un plan de entrenamiento.</p>
                <Link to="/athletes">
                  <Button className="mt-3 bg-amber-600 hover:bg-amber-700">
                    Ir a Atletas
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Form */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  CONFIGURACIÓN DEL PLAN
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGenerate} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Atleta *</Label>
                    <Select value={formData.athlete_id} onValueChange={handleAthleteChange}>
                      <SelectTrigger data-testid="ai-athlete-select">
                        <SelectValue placeholder="Seleccionar atleta" />
                      </SelectTrigger>
                      <SelectContent>
                        {athletes.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.name} - {a.sport}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Deporte *</Label>
                      <Select value={formData.sport} onValueChange={(v) => setFormData({ ...formData, sport: v })}>
                        <SelectTrigger data-testid="ai-sport-select">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPORTS.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nivel *</Label>
                      <Select value={formData.current_level} onValueChange={(v) => setFormData({ ...formData, current_level: v })}>
                        <SelectTrigger data-testid="ai-level-select">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map(l => (
                            <SelectItem key={l} value={l}>{l}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Modelo de Planificación *</Label>
                    <Select value={formData.planning_model} onValueChange={(v) => setFormData({ ...formData, planning_model: v })}>
                      <SelectTrigger data-testid="ai-model-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLANNING_MODELS.map(m => (
                          <SelectItem key={m.value} value={m.value}>
                            <div>
                              <div className="font-medium">{m.label}</div>
                              <div className="text-xs text-slate-500">{m.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duración (semanas) *</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="4"
                        max="52"
                        value={formData.duration_weeks}
                        onChange={(e) => setFormData({ ...formData, duration_weeks: parseInt(e.target.value) })}
                        data-testid="ai-duration-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="days">Días/semana *</Label>
                      <Input
                        id="days"
                        type="number"
                        min="2"
                        max="7"
                        value={formData.available_days_per_week}
                        onChange={(e) => setFormData({ ...formData, available_days_per_week: parseInt(e.target.value) })}
                        data-testid="ai-days-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objective">Objetivo principal *</Label>
                    <Textarea
                      id="objective"
                      value={formData.objective}
                      onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                      placeholder="Ej: Mejorar velocidad máxima, preparación para maratón..."
                      required
                      data-testid="ai-objective-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="competitions">Competiciones objetivo (opcional)</Label>
                    <Input
                      id="competitions"
                      value={formData.competitions}
                      onChange={(e) => setFormData({ ...formData, competitions: e.target.value })}
                      placeholder="Campeonato Nacional, Copa Regional..."
                      data-testid="ai-competitions-input"
                    />
                    <p className="text-xs text-slate-500">Separa múltiples competiciones con comas</p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#007AFF] hover:bg-blue-600 font-bold uppercase tracking-wide h-12"
                    disabled={generating || !formData.athlete_id || !formData.objective}
                    data-testid="ai-generate-btn"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generar Plan con IA
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Result */}
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  PLAN GENERADO
                </CardTitle>
              </CardHeader>
              <CardContent>
                {generating ? (
                  <div className="py-16 text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-[#007AFF] mx-auto mb-4" />
                    <p className="text-slate-600">Generando plan con GPT-5.2...</p>
                    <p className="text-sm text-slate-400 mt-2">Esto puede tardar unos segundos</p>
                  </div>
                ) : generatedPlan?.macrocycle ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h3 className="font-bold text-slate-900 mb-2">{generatedPlan.macrocycle.name}</h3>
                      <p className="text-sm text-slate-600">{generatedPlan.macrocycle.objective}</p>
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                      {generatedPlan.macrocycle.mesocycles?.map((meso, idx) => (
                        <div key={idx} className="border border-slate-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-slate-900">{meso.name}</h4>
                            <span className="badge badge-blue">{meso.phase}</span>
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{meso.objective}</p>
                          <p className="text-xs text-slate-400">
                            {meso.weeks} semanas · {meso.microcycles?.length || 0} microciclos
                          </p>
                        </div>
                      ))}
                    </div>

                    <Button 
                      onClick={handleSavePlan}
                      className="w-full bg-slate-900 hover:bg-slate-800 font-bold uppercase tracking-wide h-12"
                      disabled={saving || saved}
                      data-testid="ai-save-btn"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Guardando...
                        </>
                      ) : saved ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Plan Guardado
                        </>
                      ) : (
                        <>
                          Guardar Plan
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>

                    {saved && (
                      <Link to="/plans">
                        <Button variant="outline" className="w-full">
                          Ver Mis Planes
                        </Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">Configura los parámetros y genera tu plan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AIGeneratorPage;
