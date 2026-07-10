import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import {
  Plus, Edit2, Trash2, Calendar, Clock, Target, Activity,
  Layers, ChevronRight, Eye, BarChart3, Loader2, AlertTriangle,
  CheckCircle, Play, Pause, Archive
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// Nombres de fases en español
const PHASE_NAMES = {
  'preparatory_general': 'Prep. General',
  'preparatory_specific': 'Prep. Específico', 
  'precompetitive': 'Precompetitivo',
  'competitive': 'Competitivo',
  'transition': 'Transición',
  'accumulation': 'Acumulación',
  'transformation': 'Transformación',
  'realization': 'Realización'
};

// Colores de fases
const PHASE_COLORS = {
  'preparatory_general': '#D4AF37',
  'preparatory_specific': '#8B5CF6',
  'precompetitive': '#F59E0B',
  'competitive': '#10B981',
  'transition': '#6B7280',
  'accumulation': '#D4AF37',
  'transformation': '#8B5CF6',
  'realization': '#10B981'
};

const PlansList = ({ 
  athleteId, 
  athleteName, 
  onCreateNew, 
  onEditPlan,
  onViewPlan 
}) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  // Cargar planes del atleta
  useEffect(() => {
    const fetchPlans = async () => {
      if (!athleteId) return;
      
      setLoading(true);
      try {
        const token = localStorage.getItem('train_token');
        const response = await fetch(`${API_URL}/api/periodization/${athleteId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          // Si es un solo plan, convertir a array
          if (data && !Array.isArray(data)) {
            setPlans([data]);
          } else if (Array.isArray(data)) {
            setPlans(data);
          } else {
            setPlans([]);
          }
        } else if (response.status === 404) {
          setPlans([]);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setPlans([]);
      }
      setLoading(false);
    };

    fetchPlans();
  }, [athleteId]);

  // Eliminar plan
  const handleDelete = async () => {
    if (!planToDelete) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await fetch(`${API_URL}/api/periodization/${athleteId}/${planToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setPlans(plans.filter(p => p.id !== planToDelete.id));
        toast.success('Plan eliminado correctamente');
      } else {
        toast.error('Error al eliminar el plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Error al eliminar el plan');
    }
    setDeleting(false);
    setDeleteModalOpen(false);
    setPlanToDelete(null);
  };

  // Calcular progreso del plan
  const calculateProgress = (plan) => {
    if (!plan.startDate) return 0;
    
    const start = new Date(plan.startDate);
    const end = plan.endDate ? new Date(plan.endDate) : new Date(start.getTime() + (plan.totalWeeks || 12) * 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    return Math.round((elapsed / total) * 100);
  };

  // Obtener fase actual
  const getCurrentPhase = (plan) => {
    if (!plan.mesocycles || plan.mesocycles.length === 0) return null;
    
    const progress = calculateProgress(plan);
    const totalMesos = plan.mesocycles.length;
    const currentMesoIndex = Math.min(Math.floor((progress / 100) * totalMesos), totalMesos - 1);
    
    return plan.mesocycles[currentMesoIndex];
  };

  // Ver detalles del plan
  const handleViewDetails = (plan) => {
    setSelectedPlan(plan);
    setViewModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#B8912A]" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Planes de Periodización</h2>
          <p className="text-slate-500">
            {athleteName ? `Planes de entrenamiento para ${athleteName}` : 'Gestiona los planes de entrenamiento'}
          </p>
        </div>
        <Button 
          className="bg-[#D4AF37] hover:bg-[#D4AF37] gap-2"
          onClick={onCreateNew}
          data-testid="create-new-plan-btn"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo Plan
        </Button>
      </div>

      {/* Lista de planes o estado vacío */}
      {plans.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              Sin planes de periodización
            </h3>
            <p className="text-slate-500 text-center mb-6 max-w-md">
              Este atleta aún no tiene planes de entrenamiento. Crea su primer plan
              de periodización para comenzar a planificar su preparación.
            </p>
            <Button 
              className="bg-[#D4AF37] hover:bg-[#D4AF37] gap-2"
              onClick={onCreateNew}
            >
              <Plus className="w-4 h-4" />
              Crear Primer Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plans.map((plan) => {
            const progress = calculateProgress(plan);
            const currentPhase = getCurrentPhase(plan);
            const isActive = progress > 0 && progress < 100;
            const isCompleted = progress >= 100;
            const isPending = progress === 0;

            return (
              <Card 
                key={plan.id} 
                className={`hover:shadow-lg transition-shadow ${
                  isActive ? 'border-l-4 border-l-green-500' :
                  isCompleted ? 'border-l-4 border-l-slate-400' :
                  'border-l-4 border-l-blue-500'
                }`}
                data-testid={`plan-card-${plan.id}`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    {/* Info del plan */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800">
                          {plan.name || 'Plan sin nombre'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-green-100 text-green-700' :
                          isCompleted ? 'bg-slate-100 text-slate-600' :
                          'bg-[#D4AF37] text-[#B8912A]'
                        }`}>
                          {isActive ? 'En progreso' : isCompleted ? 'Completado' : 'Pendiente'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>
                            {plan.startDate ? new Date(plan.startDate).toLocaleDateString('es-ES') : 'Sin fecha'}
                            {plan.endDate && ` - ${new Date(plan.endDate).toLocaleDateString('es-ES')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>{plan.totalWeeks || 0} semanas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Layers className="w-4 h-4 text-slate-400" />
                          <span>{plan.mesocycles?.length || 0} mesociclos</span>
                        </div>
                        {plan.modelName && (
                          <div className="flex items-center gap-1">
                            <Activity className="w-4 h-4 text-slate-400" />
                            <span>{plan.modelName}</span>
                          </div>
                        )}
                      </div>

                      {/* Barra de progreso */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Progreso del plan</span>
                          <span className="font-medium text-slate-700">{progress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              isCompleted ? 'bg-slate-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Fase actual */}
                      {currentPhase && isActive && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Fase actual:</span>
                          <span 
                            className="px-2 py-0.5 rounded text-white text-xs font-medium"
                            style={{ backgroundColor: currentPhase.phaseColor || PHASE_COLORS[currentPhase.phaseId] || '#D4AF37' }}
                          >
                            {currentPhase.phaseName || PHASE_NAMES[currentPhase.phaseId] || 'Fase'}
                          </span>
                        </div>
                      )}

                      {/* Timeline de fases */}
                      {plan.mesocycles && plan.mesocycles.length > 0 && (
                        <div className="flex rounded overflow-hidden h-2 mt-3">
                          {plan.mesocycles.map((meso, idx) => (
                            <div
                              key={idx}
                              className="flex-1"
                              style={{ backgroundColor: meso.phaseColor || PHASE_COLORS[meso.phaseId] || '#94A3B8' }}
                              title={meso.phaseName || PHASE_NAMES[meso.phaseId]}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-[#B8912A]"
                        onClick={() => handleViewDetails(plan)}
                        data-testid={`view-plan-${plan.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-amber-600"
                        onClick={() => onEditPlan && onEditPlan(plan)}
                        data-testid={`edit-plan-${plan.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-600 hover:text-red-600"
                        onClick={() => {
                          setPlanToDelete(plan);
                          setDeleteModalOpen(true);
                        }}
                        data-testid={`delete-plan-${plan.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Plan
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-slate-600">
              ¿Estás seguro de que deseas eliminar el plan <strong>"{planToDelete?.name}"</strong>?
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Esta acción no se puede deshacer. Se eliminarán todos los mesociclos, microciclos y sesiones asociadas.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de vista detallada */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#B8912A]" />
              {selectedPlan?.name || 'Detalles del Plan'}
            </DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6 py-4">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase mb-1">Modelo</p>
                    <p className="font-semibold">{selectedPlan.modelName || selectedPlan.model || 'Tradicional'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase mb-1">Duración</p>
                    <p className="font-semibold">{selectedPlan.totalWeeks} semanas</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase mb-1">Fecha Inicio</p>
                    <p className="font-semibold">
                      {selectedPlan.startDate ? new Date(selectedPlan.startDate).toLocaleDateString('es-ES') : 'No definida'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 uppercase mb-1">Fecha Fin</p>
                    <p className="font-semibold">
                      {selectedPlan.endDate ? new Date(selectedPlan.endDate).toLocaleDateString('es-ES') : 'No definida'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Mesociclos */}
              <div>
                <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Mesociclos ({selectedPlan.mesocycles?.length || 0})
                </h4>
                <div className="space-y-2">
                  {selectedPlan.mesocycles?.map((meso, idx) => (
                    <Card key={idx} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-10 rounded"
                              style={{ backgroundColor: meso.phaseColor || PHASE_COLORS[meso.phaseId] || '#D4AF37' }}
                            />
                            <div>
                              <p className="font-medium text-slate-800">
                                {meso.phaseName || PHASE_NAMES[meso.phaseId] || `Mesociclo ${idx + 1}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                {meso.weeks || meso.microcycles?.length || 0} semanas • Tipo: {meso.type?.name || 'Desarrollo'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">
                              {meso.microcycles?.length || 0} microciclos
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Competencia principal */}
              {selectedPlan.mainCompetition && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Target className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="text-xs text-amber-600 uppercase">Competencia Principal</p>
                      <p className="font-semibold text-amber-800">{selectedPlan.mainCompetition}</p>
                      {selectedPlan.mainCompetitionDate && (
                        <p className="text-sm text-amber-700">
                          {new Date(selectedPlan.mainCompetitionDate).toLocaleDateString('es-ES')}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewModalOpen(false)}>
              Cerrar
            </Button>
            <Button 
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => {
                setViewModalOpen(false);
                if (onEditPlan) onEditPlan(selectedPlan);
              }}
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlansList;
