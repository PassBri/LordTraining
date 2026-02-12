import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('train_token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Athletes
export const getAthletes = () => axios.get(`${API}/athletes`, getAuthHeader());
export const getAthlete = (id) => axios.get(`${API}/athletes/${id}`, getAuthHeader());
export const createAthlete = (data) => axios.post(`${API}/athletes`, data, getAuthHeader());
export const updateAthlete = (id, data) => axios.put(`${API}/athletes/${id}`, data, getAuthHeader());
export const deleteAthlete = (id) => axios.delete(`${API}/athletes/${id}`, getAuthHeader());

// Exercises
export const getExercises = (params) => axios.get(`${API}/exercises`, { ...getAuthHeader(), params });
export const createExercise = (data) => axios.post(`${API}/exercises`, data, getAuthHeader());

// Macrocycles
export const getMacrocycles = (athleteId) => axios.get(`${API}/macrocycles`, { ...getAuthHeader(), params: { athlete_id: athleteId } });
export const getMacrocycle = (id) => axios.get(`${API}/macrocycles/${id}`, getAuthHeader());
export const createMacrocycle = (data, athleteId) => axios.post(`${API}/macrocycles?athlete_id=${athleteId}`, data, getAuthHeader());

// Mesocycles
export const createMesocycle = (data, macrocycleId) => axios.post(`${API}/mesocycles?macrocycle_id=${macrocycleId}`, data, getAuthHeader());

// Microcycles
export const createMicrocycle = (data, mesocycleId) => axios.post(`${API}/microcycles?mesocycle_id=${mesocycleId}`, data, getAuthHeader());

// Sessions
export const createSession = (data, microcycleId) => axios.post(`${API}/sessions?microcycle_id=${microcycleId}`, data, getAuthHeader());
export const completeSession = (id) => axios.put(`${API}/sessions/${id}/complete`, {}, getAuthHeader());
export const getCalendarSessions = (athleteId, startDate, endDate) => 
  axios.get(`${API}/sessions/calendar`, { ...getAuthHeader(), params: { athlete_id: athleteId, start_date: startDate, end_date: endDate } });

// Competitions
export const getCompetitions = (athleteId) => axios.get(`${API}/competitions`, { ...getAuthHeader(), params: { athlete_id: athleteId } });
export const createCompetition = (data, athleteId) => axios.post(`${API}/competitions?athlete_id=${athleteId}`, data, getAuthHeader());

// Dashboard
export const getDashboardStats = () => axios.get(`${API}/dashboard/stats`, getAuthHeader());

// AI Plan Generation
export const generatePlan = (data) => axios.post(`${API}/plans/generate`, data, getAuthHeader());

// Payments
export const createCheckout = (plan, originUrl) => axios.post(`${API}/payments/checkout`, { plan, origin_url: originUrl }, getAuthHeader());
export const getPaymentStatus = (sessionId) => axios.get(`${API}/payments/status/${sessionId}`, getAuthHeader());

// Export
export const exportPlanPDF = (macrocycleId) => `${API}/export/plan/${macrocycleId}/pdf?token=${localStorage.getItem('train_token')}`;

// Seed
export const seedExercises = () => axios.post(`${API}/seed/exercises`, {}, getAuthHeader());

// Sports Catalog
export const getSportsCatalog = () => axios.get(`${API}/sports/catalog`, getAuthHeader());
export const createSportCategory = (data) => axios.post(`${API}/sports/categories`, data, getAuthHeader());
export const updateSportCategory = (id, data) => axios.put(`${API}/sports/categories/${id}`, data, getAuthHeader());
export const deleteSportCategory = (id) => axios.delete(`${API}/sports/categories/${id}`, getAuthHeader());
export const createSport = (data) => axios.post(`${API}/sports`, data, getAuthHeader());
export const deleteSport = (id) => axios.delete(`${API}/sports/${id}`, getAuthHeader());

// Teams
export const getTeams = () => axios.get(`${API}/teams`, getAuthHeader());
export const getTeam = (id) => axios.get(`${API}/teams/${id}`, getAuthHeader());
export const createTeam = (data) => axios.post(`${API}/teams`, data, getAuthHeader());
export const updateTeam = (id, data) => axios.put(`${API}/teams/${id}`, data, getAuthHeader());
export const deleteTeam = (id) => axios.delete(`${API}/teams/${id}`, getAuthHeader());
export const addAthleteToTeam = (teamId, athleteId) => axios.post(`${API}/teams/${teamId}/athletes/${athleteId}`, {}, getAuthHeader());
export const removeAthleteFromTeam = (teamId, athleteId) => axios.delete(`${API}/teams/${teamId}/athletes/${athleteId}`, getAuthHeader());

// Entities
export const getEntities = (entityType) => axios.get(`${API}/entities`, { ...getAuthHeader(), params: entityType ? { entity_type: entityType } : {} });
export const getEntity = (id) => axios.get(`${API}/entities/${id}`, getAuthHeader());
export const createEntity = (data) => axios.post(`${API}/entities`, data, getAuthHeader());
export const updateEntity = (id, data) => axios.put(`${API}/entities/${id}`, data, getAuthHeader());
export const deleteEntity = (id) => axios.delete(`${API}/entities/${id}`, getAuthHeader());
export const getEntitiesHierarchy = () => axios.get(`${API}/entities-hierarchy`, getAuthHeader());
export const getEntityTypes = () => axios.get(`${API}/entity-types`, getAuthHeader());

// Tournaments
export const getTournaments = (status) => axios.get(`${API}/tournaments`, { ...getAuthHeader(), params: status ? { status } : {} });
export const getTournament = (id) => axios.get(`${API}/tournaments/${id}`, getAuthHeader());
export const createTournament = (data) => axios.post(`${API}/tournaments`, data, getAuthHeader());
export const updateTournament = (id, data) => axios.put(`${API}/tournaments/${id}`, data, getAuthHeader());
export const deleteTournament = (id) => axios.delete(`${API}/tournaments/${id}`, getAuthHeader());

// Tournament Categories
export const addTournamentCategory = (tournamentId, data) => axios.post(`${API}/tournaments/${tournamentId}/categories`, data, getAuthHeader());
export const deleteTournamentCategory = (tournamentId, categoryId) => axios.delete(`${API}/tournaments/${tournamentId}/categories/${categoryId}`, getAuthHeader());

// Tournament Participants
export const registerParticipant = (tournamentId, categoryId, data) => axios.post(`${API}/tournaments/${tournamentId}/categories/${categoryId}/register`, data, getAuthHeader());
export const removeParticipant = (tournamentId, categoryId, participantId) => axios.delete(`${API}/tournaments/${tournamentId}/categories/${categoryId}/participants/${participantId}`, getAuthHeader());

// Tournament Bracket & Matches
export const generateBracket = (tournamentId, categoryId) => axios.post(`${API}/tournaments/${tournamentId}/categories/${categoryId}/generate-bracket`, {}, getAuthHeader());
export const getTournamentMatches = (tournamentId, categoryId, roundNumber, status) => 
  axios.get(`${API}/tournaments/${tournamentId}/matches`, { 
    ...getAuthHeader(), 
    params: { category_id: categoryId, round_number: roundNumber, status } 
  });
export const updateMatchScore = (tournamentId, matchId, data) => axios.put(`${API}/tournaments/${tournamentId}/matches/${matchId}/score`, data, getAuthHeader());
export const getCategoryStandings = (tournamentId, categoryId) => axios.get(`${API}/tournaments/${tournamentId}/standings/${categoryId}`, getAuthHeader());

// Tournament Public & Export
export const getPublicTournament = (shareId) => axios.get(`${API}/tournaments/public/${shareId}`);
export const exportTournamentPDF = (tournamentId) => `${API}/tournaments/${tournamentId}/export-pdf?token=${localStorage.getItem('train_token')}`;

export default API;
