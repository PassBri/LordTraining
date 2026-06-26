import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));
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

// Hotmart Billing
export const getHotmartConfig = () => axios.get(`${API}/billing/hotmart/config`);
export const createHotmartCheckout = (tier, cycle = 'monthly') =>
  axios.post(`${API}/billing/hotmart/checkout`, { tier, cycle }, getAuthHeader());
export const getMyHotmartSubscription = () => axios.get(`${API}/billing/hotmart/subscription`, getAuthHeader());
export const cancelHotmartSubscription = (reason = '') =>
  axios.post(`${API}/billing/hotmart/cancel`, { reason }, getAuthHeader());

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

// Plan Features (gating)
export const getPlanFeatures = () => axios.get(`${API}/plan-features`, getAuthHeader());

// Admin Hierarchy + Promo Codes
export const getAdminHierarchy = () => axios.get(`${API}/admin/hierarchy`, getAuthHeader());
export const getOrgMembers = (orgId) => axios.get(`${API}/admin/orgs/${orgId}/members`, getAuthHeader());
export const grantPlan = (data) => axios.post(`${API}/admin/grant-plan`, data, getAuthHeader());
export const createPromoCode = (data) => axios.post(`${API}/admin/codes/create`, data, getAuthHeader());
export const listPromoCodes = () => axios.get(`${API}/admin/codes`, getAuthHeader());
export const togglePromoCode = (codeId, active) => axios.patch(`${API}/admin/codes/${codeId}?active=${active}`, {}, getAuthHeader());
export const deletePromoCode = (codeId) => axios.delete(`${API}/admin/codes/${codeId}`, getAuthHeader());
export const redeemPromoCode = (code) => axios.post(`${API}/admin/codes/redeem?code=${encodeURIComponent(code)}`, {}, getAuthHeader());
export const setOrgEntityType = (orgId, entityType) => axios.post(`${API}/admin/orgs/${orgId}/set-entity-type?entity_type=${entityType}`, {}, getAuthHeader());
export const getFinanceDashboard = () => axios.get(`${API}/admin/finance`, getAuthHeader());
export const createRefund = (data) => axios.post(`${API}/admin/refunds`, data, getAuthHeader());
export const getAdminAlerts = () => axios.get(`${API}/admin/alerts`, getAuthHeader());

// Admin User Management (Super Admin)
export const adminListUsers = (params = {}) => axios.get(`${API}/admin/users`, { ...getAuthHeader(), params });
export const adminCreateUser = (data) => axios.post(`${API}/admin/users`, data, getAuthHeader());
export const adminUpdateUser = (uid, data) => axios.put(`${API}/admin/users/${uid}`, data, getAuthHeader());
export const adminResetPassword = (uid, new_password) => axios.post(`${API}/admin/users/${uid}/reset-password`, { new_password }, getAuthHeader());
export const adminSetUserStatus = (uid, active) => axios.patch(`${API}/admin/users/${uid}/status`, { active }, getAuthHeader());
export const adminDeleteUser = (uid) => axios.delete(`${API}/admin/users/${uid}`, getAuthHeader());

// Organization (Club / Federation / Institution)
export const createOrganization = (data) => axios.post(`${API}/org/create`, data, getAuthHeader());
export const getMyOrganization = () => axios.get(`${API}/org/me`, getAuthHeader());
export const getOrgCoaches = () => axios.get(`${API}/org/coaches`, getAuthHeader());
export const inviteCoach = (data) => axios.post(`${API}/org/coaches/invite`, data, getAuthHeader());
export const updateCoach = (coachId, data) => axios.patch(`${API}/org/coaches/${coachId}`, data, getAuthHeader());
export const resetCoachPassword = (coachId) => axios.post(`${API}/org/coaches/${coachId}/reset-password`, {}, getAuthHeader());
export const removeCoach = (coachId) => axios.delete(`${API}/org/coaches/${coachId}`, getAuthHeader());
export const getOrgStats = () => axios.get(`${API}/org/stats`, getAuthHeader());

// Branding (Super Admin)
export const getBrandingActive = () => axios.get(`${API}/branding/active`);
export const listBranding = () => axios.get(`${API}/branding/list`, getAuthHeader());
export const uploadBranding = (category, file) => {
  const fd = new FormData();
  fd.append('category', category);
  fd.append('file', file);
  return axios.post(`${API}/branding/upload`, fd, { ...getAuthHeader(), headers: { ...getAuthHeader().headers, 'Content-Type': 'multipart/form-data' } });
};
export const activateBranding = (id) => axios.post(`${API}/branding/${id}/activate`, {}, getAuthHeader());
export const deleteBranding = (id) => axios.delete(`${API}/branding/${id}`, getAuthHeader());
export const brandingFileUrl = (path) => `${BACKEND_URL}${path}`;

// Demo / Onboarding seed
export const seedDemoData = (planId = null) =>
  axios.post(`${API}/admin/seed-demo-data`, { plan_id: planId, all_plans: !planId }, getAuthHeader());
export const clearDemoData = () => axios.delete(`${API}/admin/seed-demo-data`, getAuthHeader());

export default API;
