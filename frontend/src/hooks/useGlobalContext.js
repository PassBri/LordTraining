import { useState, useEffect } from 'react';

/**
 * useGlobalContext(teams, athletes)
 *
 * Maneja el contexto global de filtros (entidad / equipo / atleta / deporte)
 * persistido en localStorage, los handlers en cascada y los datos filtrados.
 */
export const useGlobalContext = (teams = [], athletes = []) => {
  const [globalContext, setGlobalContext] = useState(() => {
    const defaults = { entityId: 'all', teamId: 'all', athleteId: 'all', sportId: 'all' };
    try {
      const saved = localStorage.getItem('train_dashboard_filters');
      const parsed = saved ? JSON.parse(saved) : null;
      // Init robusto: solo aceptar el objeto si tiene el esquema esperado.
      return parsed && typeof parsed.entityId === 'string' ? parsed : defaults;
    } catch (e) {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem('train_dashboard_filters', JSON.stringify(globalContext));
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
