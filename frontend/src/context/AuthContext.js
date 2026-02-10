import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
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

  const fetchUser = useCallback(async () => {
    const currentToken = getToken();
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Auth error:', error);
      // Clear invalid token
      localStorage.removeItem('train_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Initial auth check
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('train_token', newToken);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'coach') => {
    const response = await axios.post(`${API}/auth/register`, { email, password, name, role });
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('train_token');
    setUser(null);
  };

  const getAuthHeader = () => {
    const currentToken = getToken();
    return { headers: { Authorization: `Bearer ${currentToken}` } };
  };

  const token = getToken();

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, getAuthHeader, setUser, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
