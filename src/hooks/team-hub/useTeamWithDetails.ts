import useSWR from 'swr';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamWithDetails, RoleType, UserPermissions } from '@/types/team-hub';
import { calculatePermissions } from '@/lib/permissions';
import { logger } from '@/lib/logger';

interface UseTeamWithDetailsResult {
  team: TeamWithDetails | null;
  currentUserId: string | null;
  currentUserRole: RoleType | null;
  permissions: UserPermissions | null;
  isOwner: boolean;
  isManager: boolean;
  isPlayer: boolean;
  isAdmin: boolean;
  loading: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
}

/**
 * Fetch team data with settings, user role, and computed permissions
 * Uses SWR for caching and automatic revalidation
 */
export function useTeamWithDetails(slug: string): UseTeamWithDetailsResult {
  const supabase = getBrowserClient();

  // Fetcher function for SWR
  const fetcher = async (key: string) => {
    const [, teamSlug] = key.split(':');

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Fetch team
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', teamSlug)
      .single();

    if (teamError) throw teamError;

    // Fetch team settings
    const { data: settingsData, error: settingsError } = await supabase
      .from('team_settings')
      .select('*')
      .eq('team_id', teamData.id)
      .single();

    // Settings might not exist yet (PGRST116 = no rows returned)
    if (settingsError && settingsError.code !== 'PGRST116') {
      throw settingsError;
    }

    // Fetch user's membership and role
    const { data: membershipData, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role_type')
      .eq('team_id', teamData.id)
      .eq('user_id', user.id)
      .single();

    // User might not be a member yet (PGRST116)
    if (membershipError && membershipError.code !== 'PGRST116') {
      throw membershipError;
    }

    // Check if user is admin
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    // Determine role
    let role: RoleType | null = membershipData?.role_type || null;

    // If user is the owner but no membership exists, they're the owner
    if (!role && teamData.current_owner_id === user.id) {
      role = 'owner';
    }

    // Admins have admin role
    if (profileData?.is_admin) {
      role = 'admin';
    }

    // Merge team + settings
    const teamWithDetails: TeamWithDetails = {
      ...teamData,
      approval_mode: settingsData?.approval_mode || 'any_member',
      min_approvals_required: settingsData?.min_approvals_required || 1,
      player_info_mode: settingsData?.player_info_mode || 'hybrid',
      self_service_enabled: settingsData?.self_service_enabled ?? true,
      access_mode: settingsData?.access_mode || 'invite_only',
      allow_member_invites: settingsData?.allow_member_invites ?? false,
    };

    return {
      team: teamWithDetails,
      userId: user.id,
      role,
    };
  };

  // Use SWR with the slug as key
  const { data, error, mutate, isLoading } = useSWR(
    slug ? `team:${slug}` : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  );

  // Compute permissions if we have team and role data
  const permissions = data?.team && data?.role
    ? calculatePermissions(data.role, data.team)
    : null;

  // Helper booleans for role checking
  const isOwner = data?.role === 'owner';
  const isManager = data?.role === 'owner' || data?.role === 'sub_manager';
  const isPlayer = data?.role === 'member';
  const isAdmin = data?.role === 'admin';

  return {
    team: data?.team || null,
    currentUserId: data?.userId || null,
    currentUserRole: data?.role || null,
    permissions,
    isOwner,
    isManager,
    isPlayer,
    isAdmin,
    loading: isLoading,
    error: error || null,
    mutate: async () => { await mutate(); },
  };
}
