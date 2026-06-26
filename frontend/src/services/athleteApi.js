import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL && process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com') === -1
  ? process.env.REACT_APP_BACKEND_URL
  : (typeof window !== 'undefined' ? window.location.origin : process.env.REACT_APP_BACKEND_URL));
const API = `${BACKEND_URL}/api/athlete-portal`;

const aTok = () => localStorage.getItem('athlete_token');
const aHeader = () => ({ headers: { Authorization: `Bearer ${aTok()}` } });

// Public (no auth)
export const getPublicPortal = (shareId) => axios.get(`${API}/public/${shareId}`);
export const completePublicSession = (shareId, sessionId, body) => axios.post(`${API}/public/${shareId}/sessions/${sessionId}`, body);

// Athlete auth
export const athleteLogin = (email, password) => axios.post(`${API}/auth/login`, { email, password });
export const athleteRegister = (body) => axios.post(`${API}/auth/register`, body);
export const athleteMe = () => axios.get(`${API}/auth/me`, aHeader());
export const athleteChangePassword = (newPassword) => axios.post(`${API}/auth/change-password`, { new_password: newPassword }, aHeader());

// Athlete data
export const athleteGetPlan = () => axios.get(`${API}/me/plan`, aHeader());
export const athleteCompleteSession = (sessionId, body) => axios.post(`${API}/me/sessions/${sessionId}`, body, aHeader());
export const athleteSaveReadiness = (body) => axios.post(`${API}/me/readiness`, body, aHeader());
export const athleteGetReadiness = () => axios.get(`${API}/me/readiness`, aHeader());
export const athleteGetRecords = () => axios.get(`${API}/me/records`, aHeader());

// Coach (uses train_token)
const cHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('train_token')}` } });
export const createAthleteShare = (planId, athleteName) => axios.post(`${API}/share`, { plan_id: planId, athlete_name: athleteName }, cHeader());
export const getAthleteShare = (planId) => axios.get(`${API}/share/${planId}`, cHeader());
export const inviteAthlete = (athleteId, planId, email) => axios.post(`${API}/athletes/${athleteId}/invite`, { plan_id: planId, email }, cHeader());
export const createAthleteInviteCode = (planId, athleteName) => axios.post(`${API}/invite-code`, { plan_id: planId, athlete_name: athleteName }, cHeader());
export const coachGetReadiness = (athleteId) => axios.get(`${API}/coach/readiness/${athleteId}`, cHeader());

export const publicPortalUrl = (shareId) => `${typeof window !== 'undefined' ? window.location.origin : ''}/atleta/${shareId}`;
