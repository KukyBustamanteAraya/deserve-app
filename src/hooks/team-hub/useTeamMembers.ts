import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamMember } from '@/types/team-hub';
import { logger } from '@/lib/logger';

interface UseTeamMembersResult {
  members: TeamMember[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch team members with their roles
 * Note: We can't join profiles due to RLS, so we get basic member data only
 */
export function useTeamMembers(teamId: string): UseTeamMembersResult {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getBrowserClient();

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('team_memberships')
        .select('user_id, team_id, role, created_at')
        .eq('team_id', teamId);

      if (fetchError) throw fetchError;

      // Map to TeamMember type (role -> role_type, created_at -> joined_at)
      const teamMembers: TeamMember[] = (data || []).map(m => ({
        user_id: m.user_id,
        team_id: m.team_id,
        role_type: (m.role === 'owner' || m.role === 'manager') ? 'owner' : 'member', // Map existing roles
        joined_at: m.created_at,
      }));

      setMembers(teamMembers);
    } catch (err) {
      setError(err as Error);
      logger.error('Error fetching team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchMembers();
    }
  }, [teamId]);

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
  };
}
