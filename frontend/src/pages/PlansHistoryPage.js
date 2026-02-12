import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useGlobalContext } from '../context/GlobalContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getMacrocycles } from '../services/api';
import { 
  FileText, Search, Calendar, User, Users, Dumbbell, 
  Loader2, ChevronRight, Building2, Eye, Trash2, Filter
} from 'lucide-react';
import { toast } from 'sonner';

const PlansHistoryPage = () => {
  const {
    selectedEntity,
    selectedTeam,
    selectedAthlete,
    selectedSport,
    entities,
    teams,
    athletes
  } = useGlobalContext();

  const [plans, setPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMacrocycles();
      setPlans(response.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error al cargar planes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Apply filters
  useEffect(() => {
    let filtered = [...plans];

    // Filter by global context
    if (selectedAthlete) {
      filtered = filtered.filter(p => p.athlete_id === selectedAthlete.id);
    } else if (selectedTeam) {
      // Get athletes in selected team
      const teamAthleteIds = athletes
        .filter(a => a.team_id === selectedTeam.id)
        .map(a => a.id);
      filtered = filtered.filter(p => teamAthleteIds.includes(p.athlete_id));
    } else if (selectedEntity) {
      // Get teams affiliated with entity
      const entityTeamIds = teams
        .filter(t => {
          const aff = t.affiliations || {};
          return aff.federation_id === selectedEntity.id ||
                 aff.club_id === selectedEntity.id ||
                 aff.school_id === selectedEntity.id;
        })
        .map(t => t.id);
      // Get athletes in those teams
      const entityAthleteIds = athletes
        .filter(a => entityAthleteIds.includes(a.team_id))
        .map(a => a.id);
      filtered = filtered.filter(p => entityAthleteIds.includes(p.athlete_id));
    }

    // Filter by sport
    if (selectedSport) {
      filtered = filtered.filter(p => p.sport === selectedSport.value || p.sport === selectedSport.name);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.athlete_name?.toLowerCase().includes(query) ||
        p.objective?.toLowerCase().includes(query)
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        const startDate = new Date(p.start_date);
        const endDate = new Date(p.end_date);
        
        switch (dateFilter) {
          case 'active':
            return startDate <= now && endDate >= now;
          case 'upcoming':
            return startDate > now;
          case 'past':
            return endDate < now;
          default:
            return true;
        }
      });
    }

    // Sort by creation date (newest first)
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    setFilteredPlans(filtered);
  }, [plans, selectedEntity, selectedTeam, selectedAthlete, selectedSport, searchQuery, statusFilter, dateFilter, athletes, teams]);

  const getAthleteById = (athleteId) => athletes.find(a => a.id === athleteId);
  const getTeamById = (teamId) => teams.find(t => t.id === teamId);
  
  const getEntityForAthlete = (athleteId) => {
    const athlete = getAthleteById(athleteId);
    if (!athlete?.team_id) return null;
    const team = getTeamById(athlete.team_id);
    if (!team?.affiliations) return null;
    
    const aff = team.affiliations;
    if (aff.federation_id) return entities.find(e => e.id === aff.federation_id);
    if (aff.club_id) return entities.find(e => e.id === aff.club_id);
    if (aff.school_id) return entities.find(e => e.id === aff.school_id);
    return null;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPlanStatus = (plan) => {
    const now = new Date();
    const start = new Date(plan.start_date);
    const end = new Date(plan.end_date);
    
    if (now < start) return { label: 'Próximo', color: 'bg-blue-100 text-blue-700' };
    if (now > end) return { label: 'Finalizado', color: 'bg-slate-100 text-slate-600' };
    return { label: 'En curso', color: 'bg-green-100 text-green-700' };
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            HISTORIAL DE PLANES
          </h1>
          <p className="text-slate-500 mt-1">
            Todos los planes de entrenamiento generados
            {(selectedEntity || selectedTeam || selectedAthlete || selectedSport) && (
              <span className="text-blue-600"> (filtrado por contexto activo)</span>
            )}
          </p>
        </div>

        {/* Filters */}
        <Card className="border-slate-200">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar planes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="plans-search-input"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activos</SelectItem>
                    <SelectItem value="completed">Completados</SelectItem>
                    <SelectItem value="draft">Borradores</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Fecha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las fechas</SelectItem>
                    <SelectItem value="active">En curso</SelectItem>
                    <SelectItem value="upcoming">Próximos</SelectItem>
                    <SelectItem value="past">Pasados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm text-slate-500">
                {filteredPlans.length} de {plans.length} planes
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans List */}
        {filteredPlans.length > 0 ? (
          <div className="space-y-4">
            {filteredPlans.map((plan) => {
              const athlete = getAthleteById(plan.athlete_id);
              const team = athlete?.team_id ? getTeamById(athlete.team_id) : null;
              const entity = getEntityForAthlete(plan.athlete_id);
              const status = getPlanStatus(plan);

              return (
                <Card 
                  key={plan.id} 
                  className="border-slate-200 hover:border-blue-200 transition-colors"
                  data-testid={`plan-card-${plan.id}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg text-slate-900 truncate">
                            {plan.name || 'Plan sin nombre'}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                          {plan.objective || 'Sin objetivo definido'}
                        </p>

                        {/* Hierarchy breadcrumb */}
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          {entity && (
                            <>
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                                <Building2 className="w-3 h-3" />
                                {entity.name}
                              </span>
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                            </>
                          )}
                          {team && (
                            <>
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded text-emerald-700">
                                <Users className="w-3 h-3" />
                                {team.name}
                              </span>
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                            </>
                          )}
                          {athlete && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded text-blue-700">
                              <User className="w-3 h-3" />
                              {athlete.name}
                            </span>
                          )}
                          {plan.sport && (
                            <>
                              <span className="mx-1 text-slate-300">•</span>
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 rounded text-amber-700">
                                <Dumbbell className="w-3 h-3" />
                                {plan.sport}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right side info */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1 text-sm text-slate-500">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(plan.start_date)} - {formatDate(plan.end_date)}</span>
                        </div>
                        
                        <div className="text-xs text-slate-400">
                          {plan.weeks} semanas • {plan.mesocycles?.length || 0} mesociclos
                        </div>

                        <div className="flex gap-2 mt-2">
                          <Link to={`/plans/${plan.id}`}>
                            <Button size="sm" variant="outline" className="text-slate-600">
                              <Eye className="w-4 h-4 mr-1" /> Ver
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Barlow Condensed' }}>
                SIN PLANES
              </h3>
              <p className="text-slate-500 mb-6">
                {plans.length > 0 
                  ? 'No hay planes que coincidan con los filtros aplicados'
                  : 'No hay planes de entrenamiento generados'
                }
              </p>
              <Link to="/ai-generator">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Generar Plan con IA
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlansHistoryPage;
