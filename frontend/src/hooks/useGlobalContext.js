import { useState, useEffect } from 'react';

/**
 * useGlobalContext(teams, athletes)
 *
 * Maneja el contexto global de filtros (entidad / equipo / atleta / deporte)
 * persistido en localStorage, los handlers en cascada y los datos filtrados.
 */
export const useGlobalContext = (teams = [], athletes = []) => {
  const [globalContext, setGlobalContext] = useState(() => {
    const saved = localStorage.getItem('train_global_context');
    return saved ? JSON.parse(saved) : {
      entityId: 'all',
      teamId: 'all',
      athleteId: 'all',
      sportId: 'all'
    };
  });

  useEffect(() => {
    localStorage.setItem('train_global_context', JSON.stringify(globalContext));
  }, [globalContext]);

  const handleEntityChange = (value) => {
    setGlobalContext({ entityId: value, teamId: 'all', athleteId: 'all', sportId: 'all' });
  };

  const handleTeamChange = (value) => {
    setGlobalContext(prev => ({ ...prev, teamId: value, athleteId: 'all' }));
  };

  const handleAthleteChange = (value) => {
    setGlobalContext(prev => ({ ...prev, athleteId: value }));
  };

  const handleSportChange = (value) => {
    setGlobalContext(prev => ({ ...prev, sportId: value }));
  };

  const filteredTeams = globalContext.entityId === 'all'
    ? teams
    : teams.filter(t => t.federation === globalContext.entityId || t.club === globalContext.entityId);

  const filteredAthletes = athletes.filter(a => {
    if (globalContext.entityId !== 'all' && a.federation !== globalContext.entityId && a.club !== globalContext.entityId) return false;
    if (globalContext.teamId !== 'all' && a.team_id !== globalContext.teamId) return false;
    return true;
  });

  return {
    globalContext,
    setGlobalContext,
    handleEntityChange,
    handleTeamChange,
    handleAthleteChange,
    handleSportChange,
    filteredTeams,
    filteredAthletes,
  };
};

export default useGlobalContext;
