'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, api } from './api';

interface AuthState {
  apiKey: string | null;
  authenticated: boolean;
  loading: boolean;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  apiKey: null,
  authenticated: false,
  loading: true,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check for stored key on mount
  useEffect(() => {
    const stored = getStoredApiKey();
    if (stored) {
      api.validateKey(stored)
        .then(() => {
          setApiKey(stored);
          setAuthenticated(true);
        })
        .catch(() => {
          clearStoredApiKey();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (key: string): Promise<boolean> => {
    try {
      await api.validateKey(key);
      setStoredApiKey(key);
      setApiKey(key);
      setAuthenticated(true);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearStoredApiKey();
    setApiKey(null);
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ apiKey, authenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
