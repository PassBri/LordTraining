import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGlobalContext } from '../context/GlobalContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { 
  Building2, Users, User, Dumbbell, FileText, X, RefreshCw, ChevronRight
} from 'lucide-react';

const ENTITY_TYPE_LABELS = {
  federation: 'Federación',
  club: 'Club',
  school: 'Escuela'
};

const ENTITY_TYPE_ICONS = {
  federation: '🏛️',
  club: '🏟️',
  school: '🏫'
};

const TopContextBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    selectedEntity,
    selectedTeam,
    selectedAthlete,
    selectedSport,
    setSelectedEntity,
    setSelectedTeam,
    setSelectedAthlete,
    setSelectedSport,
    entities,
    getFilteredTeams,
    getFilteredAthletes,
    getAllSports,
    clearContext,
    loading
  } = useGlobalContext();

  const filteredTeams = getFilteredTeams();
  const filteredAthletes = getFilteredAthletes();
  const allSports = getAllSports();

  // Group entities by type
  const groupedEntities = entities.reduce((acc, entity) => {
    const type = entity.entity_type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity);
    return acc;
  }, {});

  const handleEntityChange = (entityId) => {
    if (entityId === 'all') {
      setSelectedEntity(null);
    } else {
      const entity = entities.find(e => e.id === entityId);
      setSelectedEntity(entity);
    }
  };

  const handleTeamChange = (teamId) => {
    if (teamId === 'all') {
      setSelectedTeam(null);
    } else {
      const team = filteredTeams.find(t => t.id === teamId);
      setSelectedTeam(team);
    }
  };

  const handleAthleteChange = (athleteId) => {
    if (athleteId === 'all') {
      setSelectedAthlete(null);
    } else {
      const athlete = filteredAthletes.find(a => a.id === athleteId);
      setSelectedAthlete(athlete);
    }
  };

  const handleSportChange = (sportValue) => {
    if (sportValue === 'all') {
      setSelectedSport(null);
    } else {
      const sport = allSports.find(s => s.value === sportValue);
      setSelectedSport(sport);
    }
  };

  const hasActiveFilters = selectedEntity || selectedTeam || selectedAthlete || selectedSport;

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2.5 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {/* Context Selectors */}
        <div className="flex items-center gap-3 flex-1 overflow-x-auto pb-1">
          {/* Entity Selector */}
          <div className="flex items-center gap-1.5 min-w-fit">
            <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Select 
              value={selectedEntity?.id || 'all'} 
              onValueChange={handleEntityChange}
            >
              <SelectTrigger className="h-8 min-w-[140px] max-w-[180px] text-sm border-slate-200" data-testid="context-entity-select">
                <SelectValue placeholder="Todas las entidades" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">
                  <span className="text-slate-500">Todas las entidades</span>
                </SelectItem>
                {Object.entries(groupedEntities).map(([type, entitiesList]) => (
                  <React.Fragment key={type}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 bg-slate-50">
                      {ENTITY_TYPE_ICONS[type]} {ENTITY_TYPE_LABELS[type] || type}
                    </div>
                    {entitiesList.map(entity => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Team Selector */}
          <div className="flex items-center gap-1.5 min-w-fit">
            <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Select 
              value={selectedTeam?.id || 'all'} 
              onValueChange={handleTeamChange}
            >
              <SelectTrigger className="h-8 min-w-[130px] max-w-[160px] text-sm border-slate-200" data-testid="context-team-select">
                <SelectValue placeholder="Todos los equipos" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">
                  <span className="text-slate-500">Todos los equipos</span>
                </SelectItem>
                {filteredTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
                {filteredTeams.length === 0 && (
                  <div className="px-2 py-3 text-sm text-slate-400 text-center">
                    Sin equipos
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Athlete Selector */}
          <div className="flex items-center gap-1.5 min-w-fit">
            <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Select 
              value={selectedAthlete?.id || 'all'} 
              onValueChange={handleAthleteChange}
            >
              <SelectTrigger className="h-8 min-w-[130px] max-w-[160px] text-sm border-slate-200" data-testid="context-athlete-select">
                <SelectValue placeholder="Todos los atletas" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">
                  <span className="text-slate-500">Todos los atletas</span>
                </SelectItem>
                {filteredAthletes.map(athlete => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </SelectItem>
                ))}
                {filteredAthletes.length === 0 && (
                  <div className="px-2 py-3 text-sm text-slate-400 text-center">
                    Sin atletas
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />

          {/* Sport Selector */}
          <div className="flex items-center gap-1.5 min-w-fit">
            <Dumbbell className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <Select 
              value={selectedSport?.value || 'all'} 
              onValueChange={handleSportChange}
            >
              <SelectTrigger className="h-8 min-w-[130px] max-w-[160px] text-sm border-slate-200" data-testid="context-sport-select">
                <SelectValue placeholder="Todos los deportes" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="all">
                  <span className="text-slate-500">Todos los deportes</span>
                </SelectItem>
                {allSports.map(sport => (
                  <SelectItem key={sport.id || sport.value} value={sport.value}>
                    {sport.categoryIcon} {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearContext}
              className="h-8 px-2 text-slate-400 hover:text-slate-600 flex-shrink-0"
              data-testid="clear-context-btn"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Plans History Button */}
          <Button 
            variant={location.pathname === '/plans-history' ? 'default' : 'outline'}
            size="sm" 
            onClick={() => navigate('/plans-history')}
            className={`h-8 text-sm font-medium ${
              location.pathname === '/plans-history' 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'border-blue-200 text-blue-600 hover:bg-blue-50'
            }`}
            data-testid="plans-history-btn"
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Historial de Planes
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-400">Filtros activos:</span>
          <div className="flex flex-wrap gap-1.5">
            {selectedEntity && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                {ENTITY_TYPE_ICONS[selectedEntity.entity_type]} {selectedEntity.name}
              </span>
            )}
            {selectedTeam && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                <Users className="w-3 h-3" /> {selectedTeam.name}
              </span>
            )}
            {selectedAthlete && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
                <User className="w-3 h-3" /> {selectedAthlete.name}
              </span>
            )}
            {selectedSport && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                {selectedSport.categoryIcon} {selectedSport.name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopContextBar;
