import React, { createContext, useContext, useMemo, useState } from 'react';

import { api } from '../lib/api';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'authUser';

const readStoredUser = () => {
  if (typeof localStorage === 'undefined') return null;

  const rawUser = localStorage.getItem(USER_STORAGE_KEY);
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = async ({ username, password }) => {
    const response = await api.post('/auth/login', { username, password });
    const nextUser = response.data;

    localStorage.setItem('token', response.token);
    localStorage.removeItem('authToken');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setUser(nextUser);

    return nextUser;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    login,
    logout,
  }), [user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
