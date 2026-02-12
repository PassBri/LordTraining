import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getEntities, getTeams, getAthletes, getSportsCatalog } from '../services/api';

const GlobalContext = createContext(null);

const STORAGE_KEY = 'train_global_context';

export const GlobalContextProvider = ({ children }) => {
  // Selected context
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedSport, setSelectedSport] = useState(null);
  
  // Data lists
  const [entities, setEntities] = useState([]);
  const [teams, setTeams] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [sportsCatalog, setSportsCatalog] = useState([]);
  
  // Loading state
  const [loading, setLoading] = useState(true);

  // Load persisted context from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.selectedEntity) setSelectedEntity(parsed.selectedEntity);
        if (parsed.selectedTeam) setSelectedTeam(parsed.selectedTeam);
        if (parsed.selectedAthlete) setSelectedAthlete(parsed.selectedAthlete);
        if (parsed.selectedSport) setSelectedSport(parsed.selectedSport);
      }
    } catch (e) {
      console.error('Error loading context:', e);
    }
  }, []);

  // Persist context to localStorage
  useEffect(() => {
    try {
      const toStore = {
        selectedEntity,
        selectedTeam,
        selectedAthlete,
        selectedSport
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
      console.error('Error saving context:', e);
    }
  }, [selectedEntity, selectedTeam, selectedAthlete, selectedSport]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entitiesRes, teamsRes, athletesRes, catalogRes] = await Promise.all([
        getEntities(),
        getTeams(),
        getAthletes(),
        getSportsCatalog()
      ]);
      setEntities(entitiesRes.data || []);
      setTeams(teamsRes.data || []);
      setAthletes(athletesRes.data || []);
      setSportsCatalog(catalogRes.data || []);
    } catch (error) {
      console.error('Error fetching global data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('train_token');
    if (token) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  // Get filtered teams based on selected entity
  const getFilteredTeams = useCallback(() => {
    if (!selectedEntity) return teams;
    return teams.filter(t => {
      const affiliations = t.affiliations || {};
      return affiliations.federation_id === selectedEntity.id ||
             affiliations.club_id === selectedEntity.id ||
             affiliations.school_id === selectedEntity.id;
    });
  }, [teams, selectedEntity]);

  // Get filtered athletes based on selected team
  const getFilteredAthletes = useCallback(() => {
    if (!selectedTeam) return athletes;
    return athletes.filter(a => a.team_id === selectedTeam.id);
  }, [athletes, selectedTeam]);

  // Get all sports as flat list
  const getAllSports = useCallback(() => {
    const sports = [];
    sportsCatalog.forEach(cat => {
      cat.sports?.forEach(sport => {
        sports.push({ 
          id: sport.id,
          name: sport.name, 
          value: sport.name.toLowerCase().replace(/\s+/g, '_'),
          category: cat.name,
          categoryIcon: cat.icon
        });
      });
    });
    return sports;
  }, [sportsCatalog]);

  // Clear all selections
  const clearContext = () => {
    setSelectedEntity(null);
    setSelectedTeam(null);
    setSelectedAthlete(null);
    setSelectedSport(null);
  };

  // Handle entity change (cascades to team/athlete)
  const handleEntityChange = (entity) => {
    setSelectedEntity(entity);
    // Clear dependent selections if they don't belong to new entity
    if (selectedTeam) {
      const affiliations = selectedTeam.affiliations || {};
      if (entity && 
          affiliations.federation_id !== entity.id &&
          affiliations.club_id !== entity.id &&
          affiliations.school_id !== entity.id) {
        setSelectedTeam(null);
        setSelectedAthlete(null);
      }
    }
  };

  // Handle team change (cascades to athlete)
  const handleTeamChange = (team) => {
    setSelectedTeam(team);
    // Clear athlete if it doesn't belong to new team
    if (selectedAthlete && team && selectedAthlete.team_id !== team.id) {
      setSelectedAthlete(null);
    }
  };

  // Refresh data
  const refreshData = () => {
    fetchData();
  };

  const value = {
    // Selected values
    selectedEntity,
    selectedTeam,
    selectedAthlete,
    selectedSport,
    
    // Setters with cascade logic
    setSelectedEntity: handleEntityChange,
    setSelectedTeam: handleTeamChange,
    setSelectedAthlete,
    setSelectedSport,
    
    // Raw data
    entities,
    teams,
    athletes,
    sportsCatalog,
    
    // Filtered data
    getFilteredTeams,
    getFilteredAthletes,
    getAllSports,
    
    // Utilities
    clearContext,
    refreshData,
    loading
  };

  return (
    <GlobalContext.Provider value={value}>
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within GlobalContextProvider');
  }
  return context;
};

export default GlobalContext;
