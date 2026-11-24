import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setInMemoryToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/api/admin/auth/status');
      setNeedsBootstrap(res.needsBootstrap);
      setUser(res.authenticated && res.user ? res.user : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const login = useCallback(async (email, password) => {
    const res = await apiRequest('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setInMemoryToken(res.token);
    setUser(res.user);
    setNeedsBootstrap(false);
    return res.user;
  }, []);

  const bootstrapAdmin = useCallback(async (fullName, email, password) => {
    const res = await apiRequest('/api/admin/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password }),
    });
    setInMemoryToken(res.token);
    setUser(res.user);
    setNeedsBootstrap(false);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/admin/auth/logout', { method: 'POST' });
    } finally {
      setInMemoryToken(null);
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (code) => {
      if (!user) return false;
      if (user.roles.includes('super_admin')) return true;
      return user.permissions.includes(code);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, needsBootstrap, loading, refreshStatus, login, bootstrapAdmin, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
