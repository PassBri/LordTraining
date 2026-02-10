import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getMacrocycles, getAthletes, getMacrocycle } from '../services/api';
import { FileText, Loader2, Download, ChevronRight, Calendar, Target, Layers } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const PlansPage = () => {
  const [searchParams] = useSearchParams();
  const [athletes, setAthletes] = useState([]);
  const [macrocycles, setMacrocycles] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(searchParams.get('athlete') || '');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    fetchAthletes();
  }, []);

  useEffect(() => {
    if (selectedAthlete) {
      fetchMacrocycles(selectedAthlete);
    } else {
      fetchAllMacrocycles();
    }
  }, [selectedAthlete]);

  const fetchAthletes = async () => {
    try {
      const response = await getAthletes();
      setAthletes(response.data);
    } catch (error) {
      console.error('Error fetching athletes:', error);
    }
  };

  const fetchAllMacrocycles = async () => {
    try {
      const response = await getMacrocycles();
      setMacrocycles(response.data);
    } catch (error) {
      toast.error('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const fetchMacrocycles = async (athleteId) => {
    setLoading(true);
    try {
      const response = await getMacrocycles(athleteId);
      setMacrocycles(response.data);
    } catch (error) {
      toast.error('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPlan = async (macroId) => {
    setPlanLoading(true);
    try {
      const response = await getMacrocycle(macroId);
      setSelectedPlan(response.data);
    } catch (error) {
      toast.error('Error al cargar el plan');
    } finally {
      setPlanLoading(false);
    }
  };

  const handleDownloadPDF = (macroId) => {
    const token = localStorage.getItem('train_token');
    window.open(`${BACKEND_URL}/api/export/plan/${macroId}/pdf?token=${token}`, '_blank');
  };

  const getAthleteName = (athleteId) => {
    const athlete = athletes.find(a => a.id === athleteId);
    return athlete?.name || 'Desconocido';
  };

  const getPlanningModelLabel = (model) => {
    const labels = {
      traditional: 'Tradicional',
      atr: 'ATR',
      blocks: 'Bloques',
      undulating: 'Ondulatorio',
      concurrent: 'Concurrente'
    };
    return labels[model] || model;
  };

  const getSportLabel = (sport) => {
    const labels = {
      football: 'Fútbol',
      athletics: 'Atletismo',
      swimming: 'Natación',
      cycling: 'Ciclismo',
      basketball: 'Baloncesto',
      crossfit: 'CrossFit',
      weightlifting: 'Halterofilia'
    };
    return labels[sport] || sport;
  };

  if (loading && macrocycles.length === 0) {
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              PLANES DE ENTRENAMIENTO
            </h1>
            <p className="text-slate-500 mt-1">Macrociclos, mesociclos y microciclos</p>
          </div>
          <Link to="/ai-generator">
            <Button className="bg-[#007AFF] hover:bg-blue-600 font-bold uppercase tracking-wide" data-testid="create-plan-btn">
              Crear Nuevo Plan
            </Button>
          </Link>
        </div>

        {/* Filter */}
        <div className="max-w-xs">
          <Select value={selectedAthlete || "all"} onValueChange={(v) => setSelectedAthlete(v === "all" ? "" : v)}>
            <SelectTrigger data-testid="filter-athlete-select">
              <SelectValue placeholder="Filtrar por atleta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los atletas</SelectItem>
              {athletes.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Plans List */}
          <div className="lg:col-span-5 space-y-4">
            {macrocycles.length > 0 ? (
              macrocycles.map((macro) => (
                <Card 
                  key={macro.id} 
                  className={`border-slate-200 cursor-pointer transition-all ${selectedPlan?.id === macro.id ? 'border-[#007AFF] ring-1 ring-[#007AFF]' : 'hover:border-slate-300'}`}
                  onClick={() => handleViewPlan(macro.id)}
                  data-testid={`plan-card-${macro.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-slate-900 truncate">{macro.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">{getAthleteName(macro.athlete_id)}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="badge badge-blue">{getSportLabel(macro.sport)}</span>
                          <span className="badge badge-lime">{getPlanningModelLabel(macro.planning_model)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {macro.start_date}
                      </span>
                      <span>→</span>
                      <span>{macro.end_date}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-16 text-center">
                  <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                    SIN PLANES
                  </h3>
                  <p className="text-slate-500 mb-6">
                    No hay planes de entrenamiento creados
                  </p>
                  <Link to="/ai-generator">
                    <Button className="bg-slate-900">
                      Crear con IA
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Plan Detail */}
          <div className="lg:col-span-7">
            {planLoading ? (
              <Card className="border-slate-200">
                <CardContent className="py-16 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
                </CardContent>
              </Card>
            ) : selectedPlan ? (
              <Card className="border-slate-200 sticky top-4">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                        {selectedPlan.name}
                      </CardTitle>
                      <p className="text-slate-500 mt-1">{selectedPlan.objective}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownloadPDF(selectedPlan.id)}
                      data-testid="download-pdf-btn"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="max-h-[60vh] overflow-y-auto">
                  <div className="space-y-4">
                    {selectedPlan.mesocycles?.length > 0 ? (
                      selectedPlan.mesocycles.map((meso, mesoIdx) => (
                        <div key={meso.id} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className="bg-slate-50 p-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#007AFF] text-white flex items-center justify-center rounded font-bold text-sm">
                                  M{mesoIdx + 1}
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900">{meso.name}</h4>
                                  <p className="text-xs text-slate-500">{meso.start_date} → {meso.end_date}</p>
                                </div>
                              </div>
                              <span className="badge badge-blue capitalize">{meso.phase}</span>
                            </div>
                          </div>
                          
                          <div className="p-4 space-y-3">
                            {meso.microcycles?.map((micro, microIdx) => (
                              <div key={micro.id} className="bg-slate-50 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-sm text-slate-900">
                                    <Layers className="w-4 h-4 inline mr-1" />
                                    {micro.name}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {micro.sessions?.length || 0} sesiones
                                  </span>
                                </div>
                                {micro.sessions?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {micro.sessions.map((session, sIdx) => (
                                      <span 
                                        key={session.id} 
                                        className={`text-xs px-2 py-1 rounded ${
                                          session.completed 
                                            ? 'bg-green-100 text-green-700' 
                                            : 'bg-slate-200 text-slate-600'
                                        }`}
                                        title={`${session.date} - ${session.session_type} - ${session.duration_minutes}min`}
                                      >
                                        D{sIdx + 1}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-500">
                        <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Este plan no tiene mesociclos aún</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200">
                <CardContent className="py-16 text-center">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500">Selecciona un plan para ver los detalles</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlansPage;
