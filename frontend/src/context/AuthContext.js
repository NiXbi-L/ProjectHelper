import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Настраиваем axios interceptor для автоматической установки токена
const setupAxiosInterceptor = () => {
  axios.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

// Инициализируем interceptor один раз
setupAxiosInterceptor();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const savedToken = localStorage.getItem('token');
  const [token, setToken] = useState(savedToken);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await axios.post('/api/auth/users/logout/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
  }, [token]);

  const fetchUser = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/users/me/');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token, fetchUser]);

  const login = (newToken, userData) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('token', newToken);
    // Токен будет автоматически добавлен через interceptor
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};



