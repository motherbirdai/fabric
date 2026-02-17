'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from './api';
import type {
  Provider,
  ProviderEvaluation,
  WalletsResponse,
  Budget,
  Favorite,
  Subscription,
  Invoice,
  HealthStatus,
} from './api';

// ─── Page Title ─────────────────────────────────────────────────

export function useTitle(page: string) {
  useEffect(() => {
    document.title = page + ' · Fabric';
  }, [page]);
}

// ─── In-Memory Cache (stale-while-revalidate) ───────────────────

const apiCache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 30_000; // 30 seconds

/** Clear a specific cache entry (call after mutations) */
export function invalidateCache(key: string) {
  apiCache.delete(key);
}

/** Clear all cached data */
export function clearCache() {
  apiCache.clear();
}

// ─── Generic Hook ────────────────────────────────────────────────

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: api.ApiError | Error | null;
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  cacheKey?: string,
): UseApiResult<T> {
  // Check cache for initial state
  const cached = cacheKey ? apiCache.get(cacheKey) : undefined;
  const isFresh = cached != null && Date.now() - cached.ts < CACHE_TTL;

  const [data, setData] = useState<T | null>(isFresh ? (cached!.data as T) : null);
  const [loading, setLoading] = useState(!isFresh);
  const [error, setError] = useState<api.ApiError | Error | null>(null);
  const mountedRef = useRef(true);
  const skipCacheRef = useRef(false);

  const fetchData = useCallback(() => {
    // Serve from cache if fresh (unless refetch bypassing)
    if (!skipCacheRef.current && cacheKey) {
      const entry = apiCache.get(cacheKey);
      if (entry && Date.now() - entry.ts < CACHE_TTL) {
        setData(entry.data as T);
        setLoading(false);
        return;
      }
    }
    skipCacheRef.current = false;

    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          if (cacheKey) {
            apiCache.set(cacheKey, { data: result, ts: Date.now() });
          }
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    skipCacheRef.current = true;
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// ─── Data Hooks ──────────────────────────────────────────────────

export function useProviders(): UseApiResult<Provider[]> {
  return useApi(() => api.listProviders().then((r) => r.providers), [], 'providers');
}

export function useProvider(id: string): UseApiResult<Provider> {
  return useApi(() => api.getProvider(id), [id], `provider:${id}`);
}

export function useProviderEvaluation(id: string): UseApiResult<ProviderEvaluation> {
  return useApi(() => api.evaluateProvider(id), [id], `evaluation:${id}`);
}

export function useWallets(): UseApiResult<WalletsResponse> {
  return useApi(() => api.listWallets(), [], 'wallets');
}

export function useBudgets(): UseApiResult<Budget[]> {
  return useApi(() => api.listBudgets().then((r) => r.budgets), [], 'budgets');
}

export function useFavorites(agentId: string | null): UseApiResult<Favorite[]> {
  return useApi(
    () => (agentId ? api.listFavorites(agentId).then((r) => r.favorites) : Promise.resolve([])),
    [agentId],
    agentId ? `favorites:${agentId}` : undefined,
  );
}

export function useSubscription(): UseApiResult<Subscription> {
  return useApi(() => api.getSubscription(), [], 'subscription');
}

export function useInvoices(): UseApiResult<Invoice[]> {
  return useApi(() => api.listInvoices().then((r) => r.invoices), [], 'invoices');
}

export function useHealth(): UseApiResult<HealthStatus> {
  return useApi(() => api.health(), [], 'health');
}

// ─── SSE Event Stream ────────────────────────────────────────────

export interface GatewayEvent {
  id?: string;
  type: string;
  data: unknown;
  timestamp?: string;
}

interface UseEventStreamResult {
  events: GatewayEvent[];
  connected: boolean;
  error: string | null;
  clear: () => void;
  pause: () => void;
  resume: () => void;
  paused: boolean;
}

export function useEventStream(): UseEventStreamResult {
  const [events, setEvents] = useState<GatewayEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const pausedRef = useRef(false);

  const connect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
    }

    const key = typeof window !== 'undefined' ? localStorage.getItem('fabric_api_key') : null;
    const url = key ? `/api/events?token=${encodeURIComponent(key)}` : '/api/events';

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (e) => {
      if (pausedRef.current) return;
      try {
        const parsed = JSON.parse(e.data) as GatewayEvent;
        setEvents((prev) => [parsed, ...prev].slice(0, 500));
      } catch {
        setEvents((prev) =>
          [{ type: 'message', data: e.data, timestamp: new Date().toISOString() }, ...prev].slice(0, 500),
        );
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost. Reconnecting...');
      es.close();
      setTimeout(() => {
        if (esRef.current === es) {
          connect();
        }
      }, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  const clear = useCallback(() => setEvents([]), []);
  const pause = useCallback(() => { pausedRef.current = true; setPaused(true); }, []);
  const resume = useCallback(() => { pausedRef.current = false; setPaused(false); }, []);

  return { events, connected, error, clear, pause, resume, paused };
}
