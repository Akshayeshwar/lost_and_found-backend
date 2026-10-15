import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('campus_jwt_user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('campus_jwt_token') || null;
  });

  const [loading, setLoading] = useState(true);

  // Sync token to Axios default headers or local storage on change
  useEffect(() => {
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await apiClient.post('/users/login', {
      email: email.trim(),
      password: password.trim()
    });

    const data = response.data;
    const jwtToken = data.token;
    const userData = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role
    };

    localStorage.setItem('campus_jwt_token', jwtToken);
    localStorage.setItem('campus_jwt_user', JSON.stringify(userData));

    setToken(jwtToken);
    setUser(userData);
    return userData;
  }, []);

  const register = useCallback(async (registerData) => {
    const response = await apiClient.post('/users/register', {
      name: registerData.name?.trim(),
      email: registerData.email?.trim(),
      password: registerData.password,
      role: registerData.role || 'ROLE_STUDENT'
    });

    const data = response.data;
    const jwtToken = data.token;
    const userData = {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role
    };

    localStorage.setItem('campus_jwt_token', jwtToken);
    localStorage.setItem('campus_jwt_user', JSON.stringify(userData));

    setToken(jwtToken);
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('campus_jwt_token');
    localStorage.removeItem('campus_jwt_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
