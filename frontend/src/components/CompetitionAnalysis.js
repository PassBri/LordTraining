import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { 
  Trophy, Calendar, Target, Activity, Save, 
  ChevronDown, ChevronUp, Loader2, Trash2, MapPin, Plus, Filter,
  CheckCircle2, Clock, AlertCircle, Award, Flag
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));

// Material Design 3 surface palette
const MD3 = {
  primary: '#6750A4',         // primary
  primaryContainer: '#EADDFF',
  secondary: '#625B71',
  tertiary: '#7D5260',
  surface: '#FFFBFE',
  surfaceVariant: '#F4EFF4',
  outline: '#79747E',
  // Sport accents
  principal: '#D4AF37',       // gold for principal competitions
  secundaria: '#3B82F6',      // blue for secondary
  imprevista: '#94A3B8',      // gray for unexpected
  upcoming: '#10B981',        // green
  past: '#64748B',            // slate
  today: '#F59E0B',           // amber
};

const CompetitionAnalysis = ({ athleteId, onSave, activePlan }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [competitions, setCompetitions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  const [currentCompetition, setCurrentCompetition] = useState({
    name: '',
    type: '',
    category: '',
    date: '',
    result: '',
    objective: '',
    competitionFormat: '',
    location: '',
    duration: '',
    opponents: '',
    observations: '',
    preparationPhase: '',
    keyPerformanceIndicators: '',
    recoveryStrategy: '',
    status: 'pending'
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');  // all | principal | secundaria | imprevista
  const [filterStatus, setFilterStatus] = useState('all');      // all | upcoming | today | past

  // Smart status based on competition date
  const computedStatus = (dateStr) => {
    if (!dateStr) return 'past';
    const d = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dt.getTime() === today.getTime()) return 'today';
    return dt > today ? 'upcoming' : 'past';
  };

  const filteredCompetitions = useMemo(() => {
    return competitions
      .filter(c => filterCategory === 'all' || c.category === filterCategory)
      .filter(c => filterStatus === 'all' || computedStatus(c.date) === filterStatus)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [competitions, filterCategory, filterStatus]);

  const stats = useMemo(() => {
    const counts = { total: competitions.length, upcoming: 0, today: 0, past: 0, principal: 0 };
    competitions.forEach(c => {
      counts[computedStatus(c.date)] += 1;
      if (c.category === 'principal') counts.principal += 1;
    });
    return counts;
  }, [competitions]);

  useEffect(() => {
    // Cargar competencias del plan activo si existe, si no del atleta
    if (activePlan) {
      loadPlanCompetitions();
    } else if (athleteId) {
      loadCompetitions();
    }
  }, [athleteId, activePlan]);

  const loadPlanCompetitions = async () => {
    if (!activePlan) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/plan-data/competitions/${activePlan.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompetitions(response.data || []);
    } catch (error) {
      console.log('No plan competitions found');
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('train_token');
      const response = await axios.get(
        `${BACKEND_URL}/api/competitions/analysis/${athleteId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompetitions(response.data || []);
    } catch (error) {
      console.log('No competitions found');
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!currentCompetition.name) errors.name = 'El nombre es requerido';
    if (!currentCompetition.date) errors.date = 'La fecha es requerida';
    if (!currentCompetition.type) errors.type = 'El tipo es requerido';
    if (!currentCompetition.category) errors.category = 'La categoría es requerida';
    return errors;
  };

  const handleCompetitionChange = (field, value) => {
    setCurrentCompetition(prev => ({
      ...prev,
      [field]: value
    }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const addCompetition = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('train_token');
      
      // Si hay plan activo, guardar vinculado al plan
      if (activePlan) {
        await axios.post(
          `${BACKEND_URL}/api/plan-data/competitions`,
          { 
            ...currentCompetition, 
            plan_id: activePlan.id,
            athlete_id: athleteId 
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Competencia agregada al plan');
        loadPlanCompetitions();
      } else {
        await axios.post(
          `${BACKEND_URL}/api/competitions/analysis`,
          { ...currentCompetition, athlete_id: athleteId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Competencia agregada correctamente');
        loadCompetitions();
      }
      resetForm();
      setShowForm(false);
    } catch (error) {
      toast.error('Error al agregar competencia');
    } finally {
      setSaving(false);
    }
  };

  const deleteCompetition = async (compId) => {
    if (!window.confirm('¿Eliminar esta competencia?')) return;
    
    try {
      const token = localStorage.getItem('train_token');
      await axios.delete(
        `${BACKEND_URL}/api/competitions/analysis/${compId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Competencia eliminada');
      loadCompetitions();
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const resetForm = () => {
    setCurrentCompetition({
      name: '', type: '', category: '', date: '', result: '',
      objective: '', competitionFormat: '', location: '', duration: '',
      opponents: '', observations: '', preparationPhase: '',
      keyPerformanceIndicators: '', recoveryStrategy: '', status: 'pending'
    });
    setFormErrors({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: MD3.primary }} />
      </div>
    );
  }

  // Helpers Material Design 3
  const statusConfig = {
    upcoming: { label: 'Próxima',    color: MD3.upcoming, icon: Clock,        bg: '#D1FAE5' },
    today:    { label: 'Hoy',        color: MD3.today,    icon: AlertCircle,  bg: '#FEF3C7' },
    past:     { label: 'Realizada',  color: MD3.past,     icon: CheckCircle2, bg: '#E2E8F0' },
  };
  const categoryConfig = {
    principal:  { label: 'Principal (A)',  color: MD3.principal, bg: '#FFF7E6', border: '#FCD34D' },
    secundaria: { label: 'Secundaria (B)', color: MD3.secundaria, bg: '#DBEAFE', border: '#93C5FD' },
    imprevista: { label: 'Imprevista (C)', color: MD3.imprevista, bg: '#F1F5F9', border: '#CBD5E1' },
  };

  return (
    <div className="min-h-full bg-[#fafaf8] pb-12">
      {/* ─── Material Design 3 Hero Header ─── */}
      <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${MD3.primary} 0%, #4A148C 100%)` }}>
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.4) 1px, transparent 1px), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '32px 32px, 24px 24px'
        }} />
        <div className="relative max-w-6xl mx-auto px-6 py-7">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/60 mb-2">Análisis Competitivo</p>
              <h1 className="text-[28px] sm:text-[32px] font-bold text-white leading-tight tracking-tight" style={{ fontFamily: 'system-ui' }}>
                Calendario de Competencias
              </h1>
              <p className="text-[13px] text-white/70 mt-1.5 max-w-md leading-relaxed">
                Planifica, prioriza y analiza cada competencia. Vincula objetivos al plan activo y mide el rendimiento.
              </p>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="rounded-full px-5 h-11 text-[13px] font-bold shadow-lg shadow-black/20 transition-all hover:shadow-xl hover:scale-[1.02]"
              style={{ background: '#fff', color: MD3.primary }}
              data-testid="toggle-competition-form"
            >
              {showForm ? <ChevronUp className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
              {showForm ? 'Cerrar formulario' : 'Nueva competencia'}
            </Button>
          </div>

          {/* M3 Stats chips strip */}
          <div className="flex items-center gap-2 mt-6 flex-wrap">
            <StatChip label="Total" value={stats.total} icon={Trophy} color="#fff" outlined />
            <StatChip label="Próximas" value={stats.upcoming} icon={Clock} color="#fff" outlined />
            <StatChip label="Principales" value={stats.principal} icon={Award} color="#fff" outlined />
            {stats.today > 0 && <StatChip label={`HOY: ${stats.today}`} icon={AlertCircle} color={MD3.today} solid />}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-4 relative z-10 space-y-5">

        {/* Form (only when toggled) */}
        {showForm && (
          <Card className="border-0 shadow-2xl overflow-hidden rounded-2xl" style={{ background: MD3.surface }}>
            <CardHeader className="pb-3 border-b" style={{ background: MD3.primaryContainer, borderColor: MD3.outline + '20' }}>
              <CardTitle className="flex items-center gap-3 text-[15px]" style={{ color: MD3.primary }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: MD3.primary, color: '#fff' }}>
                  <Trophy className="h-4 w-4" />
                </div>
                Registro de Nueva Competencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
            {/* Información Básica */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-700">
                <Trophy className="h-4 w-4 text-blue-600" />
                Información Básica
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Nombre de la Competencia <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={currentCompetition.name}
                    onChange={(e) => handleCompetitionChange('name', e.target.value)}
                    placeholder="Nombre del evento competitivo..."
                    className={formErrors.name ? 'border-red-500' : 'border-gray-200'}
                    data-testid="comp-name"
                  />
                  {formErrors.name && <p className="text-red-500 text-xs">{formErrors.name}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={currentCompetition.date}
                    onChange={(e) => handleCompetitionChange('date', e.target.value)}
                    className={formErrors.date ? 'border-red-500' : 'border-gray-200'}
                    data-testid="comp-date"
                  />
                  {formErrors.date && <p className="text-red-500 text-xs">{formErrors.date}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Tipo de Competencia <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={currentCompetition.type}
                    onValueChange={(v) => handleCompetitionChange('type', v)}
                  >
                    <SelectTrigger className={formErrors.type ? 'border-red-500' : 'border-gray-200'} data-testid="comp-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="equipo">Equipo</SelectItem>
                      <SelectItem value="mixta">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.type && <p className="text-red-500 text-xs">{formErrors.type}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={currentCompetition.category}
                    onValueChange={(v) => handleCompetitionChange('category', v)}
                  >
                    <SelectTrigger className={formErrors.category ? 'border-red-500' : 'border-gray-200'} data-testid="comp-category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="principal">Principal (A)</SelectItem>
                      <SelectItem value="secundaria">Secundaria (B)</SelectItem>
                      <SelectItem value="imprevista">Imprevista (C)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formErrors.category && <p className="text-red-500 text-xs">{formErrors.category}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Ubicación</label>
                  <Input
                    value={currentCompetition.location}
                    onChange={(e) => handleCompetitionChange('location', e.target.value)}
                    placeholder="Ciudad, país o sede..."
                    className="border-gray-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Fase de Preparación</label>
                  <Select
                    value={currentCompetition.preparationPhase}
                    onValueChange={(v) => handleCompetitionChange('preparationPhase', v)}
                  >
                    <SelectTrigger className="border-gray-200">
                      <SelectValue placeholder="Seleccionar fase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="especifica">Específica</SelectItem>
                      <SelectItem value="precompetitiva">Precompetitiva</SelectItem>
                      <SelectItem value="competitiva">Competitiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Objetivos y Preparación */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-700">
                <Target className="h-4 w-4 text-blue-600" />
                Objetivos y Preparación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Marca/Resultado Esperado</label>
                  <Textarea
                    value={currentCompetition.result}
                    onChange={(e) => handleCompetitionChange('result', e.target.value)}
                    placeholder="Establece metas cuantificables y medibles..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Objetivo Específico</label>
                  <Textarea
                    value={currentCompetition.objective}
                    onChange={(e) => handleCompetitionChange('objective', e.target.value)}
                    placeholder="Define objetivos técnicos, tácticos y físicos..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Indicadores y Recuperación */}
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold mb-4 text-gray-700">
                <Activity className="h-4 w-4 text-blue-600" />
                Indicadores y Recuperación
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">KPIs (Indicadores Clave)</label>
                  <Textarea
                    value={currentCompetition.keyPerformanceIndicators}
                    onChange={(e) => handleCompetitionChange('keyPerformanceIndicators', e.target.value)}
                    placeholder="Define los indicadores que medirán el éxito..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Estrategia de Recuperación</label>
                  <Textarea
                    value={currentCompetition.recoveryStrategy}
                    onChange={(e) => handleCompetitionChange('recoveryStrategy', e.target.value)}
                    placeholder="Plan de recuperación post-competencia..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-gray-700">Observaciones</label>
                  <Textarea
                    value={currentCompetition.observations}
                    onChange={(e) => handleCompetitionChange('observations', e.target.value)}
                    placeholder="Notas adicionales, rivales, condiciones especiales..."
                    className="min-h-[80px] border-gray-200"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t" style={{ borderColor: MD3.outline + '20' }}>
              <Button
                onClick={addCompetition}
                disabled={saving}
                className="rounded-full px-6 h-11 text-[13px] font-bold text-white shadow-md hover:shadow-lg transition-all"
                style={{ background: MD3.primary }}
                data-testid="save-competition-btn"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar competencia
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Filter chips bar ─── */}
      {competitions.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <Filter className="w-3.5 h-3.5" /> Filtros
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterChip active={filterStatus === 'all'} onClick={() => setFilterStatus('all')} label={`Todas (${stats.total})`} />
              <FilterChip active={filterStatus === 'upcoming'} onClick={() => setFilterStatus('upcoming')} label={`Próximas (${stats.upcoming})`} dotColor={MD3.upcoming} />
              <FilterChip active={filterStatus === 'today'} onClick={() => setFilterStatus('today')} label={`Hoy (${stats.today})`} dotColor={MD3.today} />
              <FilterChip active={filterStatus === 'past'} onClick={() => setFilterStatus('past')} label={`Realizadas (${stats.past})`} dotColor={MD3.past} />
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1" />
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterChip active={filterCategory === 'all'} onClick={() => setFilterCategory('all')} label="Todas categorías" />
              <FilterChip active={filterCategory === 'principal'} onClick={() => setFilterCategory('principal')} label="Principal" dotColor={MD3.principal} />
              <FilterChip active={filterCategory === 'secundaria'} onClick={() => setFilterCategory('secundaria')} label="Secundaria" dotColor={MD3.secundaria} />
              <FilterChip active={filterCategory === 'imprevista'} onClick={() => setFilterCategory('imprevista')} label="Imprevista" dotColor={MD3.imprevista} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Competition List Material Cards ─── */}
      <div className="space-y-3">
        {competitions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4" style={{ background: MD3.primaryContainer }}>
              <Trophy className="h-7 w-7" style={{ color: MD3.primary }} />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Aún no hay competencias</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">Registra tu primera competencia para comenzar a planificar la temporada y vincular objetivos a tu plan activo.</p>
            <Button
              onClick={() => setShowForm(true)}
              className="rounded-full px-6 h-10 text-[13px] font-bold text-white shadow-md hover:shadow-lg"
              style={{ background: MD3.primary }}
              data-testid="empty-state-cta"
            >
              <Plus className="h-4 w-4 mr-1.5" /> Registrar primera competencia
            </Button>
          </div>
        ) : filteredCompetitions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-12 text-center">
            <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No hay competencias que coincidan con los filtros</p>
          </div>
        ) : (
          filteredCompetitions.map((comp) => {
            const status = computedStatus(comp.date);
            const sCfg = statusConfig[status];
            const cCfg = categoryConfig[comp.category] || categoryConfig.imprevista;
            const StatusIcon = sCfg.icon;
            return (
              <div
                key={comp.id}
                className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden relative"
                data-testid={`comp-card-${comp.id}`}
              >
                {/* Left status accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: cCfg.color }} />

                <div className="pl-6 pr-5 py-4 flex items-start gap-4">
                  {/* Date block (Material calendar tile) */}
                  <div className="flex-shrink-0 w-14 text-center rounded-xl py-2 border" style={{ background: cCfg.bg, borderColor: cCfg.border }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cCfg.color }}>
                      {comp.date ? new Date(comp.date).toLocaleDateString('es', { month: 'short' }).replace('.', '') : '—'}
                    </p>
                    <p className="text-[20px] font-black leading-none mt-0.5" style={{ color: cCfg.color }}>
                      {comp.date ? new Date(comp.date).getDate() : '?'}
                    </p>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-[15px] leading-tight">{comp.name}</h4>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: sCfg.bg, color: sCfg.color }}>
                            <StatusIcon className="w-2.5 h-2.5" /> {sCfg.label}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border" style={{ background: cCfg.bg, color: cCfg.color, borderColor: cCfg.border }}>
                            <Flag className="w-2.5 h-2.5 mr-1" /> {cCfg.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[12px] text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {comp.date ? new Date(comp.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                          </span>
                          {comp.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {comp.location}
                            </span>
                          )}
                          {comp.type && (
                            <span className="flex items-center gap-1 capitalize">
                              <Trophy className="w-3.5 h-3.5" /> {comp.type}
                            </span>
                          )}
                          {comp.preparationPhase && (
                            <span className="flex items-center gap-1 capitalize">
                              <Activity className="w-3.5 h-3.5" /> Fase {comp.preparationPhase}
                            </span>
                          )}
                        </div>

                        {(comp.objective || comp.result) && (
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {comp.objective && (
                              <div className="rounded-lg px-3 py-2" style={{ background: MD3.surfaceVariant }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: MD3.primary }}>Objetivo</p>
                                <p className="text-[12px] text-slate-700 leading-snug">{comp.objective}</p>
                              </div>
                            )}
                            {comp.result && (
                              <div className="rounded-lg px-3 py-2" style={{ background: MD3.surfaceVariant }}>
                                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: MD3.tertiary }}>Meta</p>
                                <p className="text-[12px] text-slate-700 leading-snug">{comp.result}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCompetition(comp.id)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`delete-comp-${comp.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      </div>
    </div>
  );
};

// ─── Material Design 3 helper components ───
const StatChip = ({ label, value, icon: Icon, color, outlined, solid }) => (
  <div
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${outlined ? 'border' : ''}`}
    style={{
      background: solid ? color : 'rgba(255,255,255,0.08)',
      borderColor: outlined ? 'rgba(255,255,255,0.25)' : 'transparent',
      color: solid ? '#0f172a' : color,
    }}
  >
    {Icon && <Icon className="w-3 h-3" />}
    {value !== undefined && <span className="font-black">{value}</span>}
    <span className="uppercase tracking-wider opacity-80">{label}</span>
  </div>
);

const FilterChip = ({ active, onClick, label, dotColor }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 ${
      active
        ? 'bg-slate-900 text-white shadow-md'
        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`}
  >
    {dotColor && <span className="w-2 h-2 rounded-full" style={{ background: dotColor }} />}
    {label}
  </button>
);

export default CompetitionAnalysis;
