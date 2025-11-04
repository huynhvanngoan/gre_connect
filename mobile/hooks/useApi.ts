import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiResponse, apiService } from '@/services/api';
import { useAuth } from '@clerk/clerk-expo';

export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: any[] = [],
  options?: { enabled?: boolean }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(options?.enabled !== false);
  // Track if we've done at least one successful fetch to avoid full-screen loading on refetch
  const hasLoadedRef = useRef<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();
  const prevDepsRef = useRef<string>('');

  const enabled = options?.enabled !== false;

  // Create a stable reference for getToken
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Only show initial loading spinner if we don't have data yet
    if (!hasLoadedRef.current) {
      setLoading(true);
    }
    setError(null);

    try {
      // Get and set auth token before making API call
      try {
        const token = await getTokenRef.current?.();
        if (token) {
          apiService.setAuthToken(token);
        }
      } catch (tokenError) {
        // Token might not be available, that's ok for public endpoints
      }

      const response = await apiCall();

      if (response.success && response.data !== undefined) {
        setData(response.data);
        hasLoadedRef.current = true;
      } else {
        setError(response.error || 'Failed to fetch data');
        setData(null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      setData(null);
    } finally {
      // Stop initial loading spinner if it was shown
      if (loading) setLoading(false);
    }
  }, [...dependencies, enabled]); // Removed getToken from dependencies

  useEffect(() => {
    // Serialize dependencies to string for comparison
    const depsString = JSON.stringify(dependencies);
    
    // Only fetch if dependencies actually changed
    if (prevDepsRef.current !== depsString) {
      prevDepsRef.current = depsString;
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const refetch = useCallback(() => {
    return fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

