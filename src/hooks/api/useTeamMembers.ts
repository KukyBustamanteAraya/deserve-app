'use client';

// SWR hook for team members
import useSWR from 'swr';
import { swrRealtimeConfig } from '@/lib/swr/config';

interface TeamMember {
  user_id: string;
  role: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface UseTeamMembersReturn {
  members: TeamMember[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Fetch members for a specific team
 * Revalidates frequently for real-time updates
 */
export function useTeamMembers(teamId: string | null): UseTeamMembersReturn {
  const { data, error, isLoading, mutate } = useSWR<TeamMember[]>(
    teamId ? `/api/teams/${teamId}/members` : null,
    swrRealtimeConfig
  );

  return {
    members: data,
    isLoading,
    error,
    mutate,
  };
}
