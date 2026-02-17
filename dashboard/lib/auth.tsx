'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('fabric_api_key') : null;
    if (stored) {
      setApiKey(stored);
      setAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (key: string): Promise<boolean> => {
    if (!key.startsWith('fab_')) return false;
    localStorage.setItem('fabric_api_key', key);
    setApiKey(key);
    setAuthenticated(true);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('fabric_api_key');
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
