'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSubscription, ApiError } from './api';
import type { Subscription } from './api';

interface AuthState {
  apiKey: string | null;
  authenticated: boolean;
  loading: boolean;
  plan: string | null;
  subscription: Subscription | null;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  apiKey: null,
  authenticated: false,
  loading: true,
  plan: null,
  subscription: null,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Validate key by calling the subscription endpoint
  const validateKey = async (key: string): Promise<Subscription | null> => {
    // Temporarily set the key so the API client can use it
    localStorage.setItem('fabric_api_key', key);
    try {
      const sub = await getSubscription();
      return sub;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return null;
      }
      // For non-401 errors (e.g. network), treat as valid key
      // (the gateway may not have a subscription endpoint)
      return { plan: 'unknown' } as Subscription;
    }
  };

  // On initial load, validate stored key in background
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('fabric_api_key') : null;
    if (stored) {
      validateKey(stored).then((sub) => {
        if (sub) {
          setApiKey(stored);
          setAuthenticated(true);
          setPlan(sub.plan || null);
          setSubscription(sub);
        } else {
          // Key is invalid, clear it
          localStorage.removeItem('fabric_api_key');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (key: string): Promise<boolean> => {
    if (!key.startsWith('fab_')) return false;
    const sub = await validateKey(key);
    if (!sub) {
      localStorage.removeItem('fabric_api_key');
      return false;
    }
    setApiKey(key);
    setAuthenticated(true);
    setPlan(sub.plan || null);
    setSubscription(sub);
    return true;
  };

  const logout = () => {
    localStorage.removeItem('fabric_api_key');
    setApiKey(null);
    setAuthenticated(false);
    setPlan(null);
    setSubscription(null);
  };

  return (
    <AuthContext.Provider value={{ apiKey, authenticated, loading, plan, subscription, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
