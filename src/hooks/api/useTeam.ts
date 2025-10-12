'use client';

// SWR hooks for team data
import useSWR from 'swr';
import { swrRealtimeConfig } from '@/lib/swr/config';
import type { TeamMeResponse } from '@/types/user';

interface UseTeamMeReturn {
  team: TeamMeResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Fetch current user's team and profile
 * Revalidates frequently for real-time updates
 */
export function useTeamMe(): UseTeamMeReturn {
  const { data, error, isLoading, mutate } = useSWR<TeamMeResponse>(
    '/api/teams/me',
    swrRealtimeConfig
  );

  return {
    team: data,
    isLoading,
    error,
    mutate,
  };
}
