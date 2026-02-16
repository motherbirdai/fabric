'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseQueryResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

/**
 * Simple data fetching hook. Calls fetcher on mount and returns { data, error, loading, refetch }.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): UseQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { execute(); }, [execute]);

  return { data, error, loading, refetch: execute };
}

/**
 * Mutation hook for POST/PUT/DELETE operations.
 */
export function useMutation<TInput, TOutput>(
  mutator: (input: TInput) => Promise<TOutput>
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (input: TInput): Promise<TOutput | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await mutator(input);
      return result;
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [mutator]);

  return { execute, loading, error };
}

/**
 * Auto-polling hook — refetches every intervalMs.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = []
): UseQueryResult<T> {
  const query = useQuery(fetcher, deps);

  useEffect(() => {
    const id = setInterval(query.refetch, intervalMs);
    return () => clearInterval(id);
  }, [query.refetch, intervalMs]);

  return query;
}
