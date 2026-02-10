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

export default API;
