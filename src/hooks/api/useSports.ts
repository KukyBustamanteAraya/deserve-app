'use client';

// SWR hook for fetching sports catalog
import useSWR from 'swr';
import { swrImmutableConfig } from '@/lib/swr/config';
import type { Sport } from '@/types/catalog';

interface UseSportsReturn {
  sports: Sport[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Fetch all sports (immutable data - rarely changes)
 * Uses SWR for automatic caching and revalidation
 */
export function useSports(): UseSportsReturn {
  const { data, error, isLoading, mutate } = useSWR<Sport[]>(
    '/api/catalog/sports',
    swrImmutableConfig
  );

  return {
    sports: data || [],
    isLoading,
    error,
    mutate,
  };
}
