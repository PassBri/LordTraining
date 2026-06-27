import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL&&process.env.REACT_APP_BACKEND_URL.indexOf('itrain.com')===-1?process.env.REACT_APP_BACKEND_URL:(typeof window!=='undefined'?window.location.origin:process.env.REACT_APP_BACKEND_URL));
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get token from localStorage
  const getToken = useCallback(() => {
    return localStorage.getItem('train_token');
  }, []);

  const getRefreshToken = useCallback(() => {
    return localStorage.getItem('train_refresh_token');
  }, []);

  // OWASP — renueva el access token con el refresh token (sin desloguear al usuario)
  const refreshAccessToken = useCallback(async () => {
    const rt = localStorage.getItem('train_refresh_token');
    if (!rt) return null;
    try {
      const res = await axios.post(`${API}/auth/refresh`, { refresh_token: rt });
      if (res.data?.token) {
        localStorage.setItem('train_token', res.data.token);
        if (res.data.refresh_token) localStorage.setItem('train_refresh_token', res.data.refresh_token);
        return res.data.token;
      }
    } catch (e) {
      return null;
    }
    return null;
  }, []);

  const fetchUser = useCallback(async () => {
    let currentToken = getToken();
    if (!currentToken) {
      setLoading(false);
      return;
    }
    const tryMe = async (tok) => axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${tok}` } });
    try {
      const response = await tryMe(currentToken);
      setUser(response.data);
    } catch (error) {
      // Access token vencido → intentar refresh una vez antes de desloguear
      const newTok = await refreshAccessToken();
      if (newTok) {
        try {
          const retry = await tryMe(newTok);
          setUser(retry.data);
          return;
        } catch (_) { /* fallthrough */ }
      }
      localStorage.removeItem('train_token');
      localStorage.removeItem('train_refresh_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getToken, refreshAccessToken]);

  // Initial auth check
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, refresh_token: refreshToken, user: userData } = response.data;
    localStorage.setItem('train_token', newToken);
    if (refreshToken) localStorage.setItem('train_refresh_token', refreshToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'coach') => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, role });
    return response.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('train_token');
    localStorage.removeItem('train_refresh_token');
    setUser(null);
  }, []);

  // OWASP — sesión: refresco proactivo (cada 50 min) + auto-logout por inactividad (30 min)
  useEffect(() => {
    if (!user) return;
    const INACTIVITY_MS = 30 * 60 * 1000;
    const REFRESH_MS = 50 * 60 * 1000;
    let lastActivity = Date.now();
    const bump = () => { lastActivity = Date.now(); };
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, bump, { passive: true }));

    const inactivityTimer = setInterval(() => {
      if (Date.now() - lastActivity >= INACTIVITY_MS) {
        logout();
        if (window.location.pathname !== '/auth' && !window.location.pathname.startsWith('/atleta')) {
          window.location.href = '/auth?expired=1';
        }
      }
    }, 60 * 1000);

    const refreshTimer = setInterval(() => { refreshAccessToken(); }, REFRESH_MS);

    return () => {
      events.forEach(e => window.removeEventListener(e, bump));
      clearInterval(inactivityTimer);
      clearInterval(refreshTimer);
    };
  }, [user, logout, refreshAccessToken]);

  const updateUser = (updatedUserData) => {
    setUser(prev => ({ ...prev, ...updatedUserData }));
  };

  const getAuthHeader = () => {
    const currentToken = getToken();
    return { headers: { Authorization: `Bearer ${currentToken}` } };
  };

  const token = getToken();

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, getAuthHeader, setUser, fetchUser, updateUser, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
