import { createSupabaseServer } from '@/lib/supabase/server-client';
import { getBrowserClient } from '@/lib/supabase/client';

export type TeamRole = 'owner' | 'manager' | 'member' | 'viewer';

export type TeamPermissions = {
  canEditSettings: boolean;
  canTransferOwnership: boolean;
  canInviteMembers: boolean;
  canCreateDesignRequest: boolean;
  canApproveDesign: boolean;
  canVoteOnDesign: boolean;
  canSubmitPlayerInfo: boolean;
  canManagePlayerInfo: boolean;
  canManagePayments: boolean;
  canViewDelivery: boolean;
};

/**
 * Get user's role in a team
 */
export async function getUserTeamRole(
  teamId: string,
  userId: string,
  supabase: ReturnType<typeof createSupabaseServer> | ReturnType<typeof getBrowserClient>
): Promise<TeamRole | null> {
  // First check if user is the team owner
  const { data: team } = await supabase
    .from('teams')
    .select('current_owner_id, owner_id')
    .eq('id', teamId)
    .single();

  if (!team) return null;

  // Check if user is the current owner
  if (team.current_owner_id === userId || team.owner_id === userId) {
    return 'owner';
  }

  // Check team membership
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('role_type')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .single();

  if (!membership) return null;

  // Map role_type to TeamRole
  const roleMap: Record<string, TeamRole> = {
    owner: 'owner',
    sub_manager: 'manager',
    manager: 'manager',
    member: 'member',
    viewer: 'viewer',
  };

  return roleMap[membership.role_type] || 'viewer';
}

/**
 * Get user's permissions for a team
 */
export async function getUserTeamPermissions(
  teamId: string,
  userId: string,
  supabase: ReturnType<typeof createSupabaseServer> | ReturnType<typeof getBrowserClient>
): Promise<TeamPermissions> {
  const role = await getUserTeamRole(teamId, userId, supabase);

  if (!role) {
    // No access - return all false
    return {
      canEditSettings: false,
      canTransferOwnership: false,
      canInviteMembers: false,
      canCreateDesignRequest: false,
      canApproveDesign: false,
      canVoteOnDesign: false,
      canSubmitPlayerInfo: false,
      canManagePlayerInfo: false,
      canManagePayments: false,
      canViewDelivery: false,
    };
  }

  // Get team settings to determine dynamic permissions
  const { data: settings } = await supabase
    .from('team_settings')
    .select('*')
    .eq('team_id', teamId)
    .single();

  // Default permissions based on role
  const basePermissions: Record<TeamRole, TeamPermissions> = {
    owner: {
      canEditSettings: true,
      canTransferOwnership: true,
      canInviteMembers: true,
      canCreateDesignRequest: true,
      canApproveDesign: true,
      canVoteOnDesign: true,
      canSubmitPlayerInfo: true,
      canManagePlayerInfo: true,
      canManagePayments: true,
      canViewDelivery: true,
    },
    manager: {
      canEditSettings: true,
      canTransferOwnership: false,
      canInviteMembers: true,
      canCreateDesignRequest: true,
      canApproveDesign: true,
      canVoteOnDesign: true,
      canSubmitPlayerInfo: true,
      canManagePlayerInfo: true,
      canManagePayments: true,
      canViewDelivery: true,
    },
    member: {
      canEditSettings: false,
      canTransferOwnership: false,
      canInviteMembers: false,
      canCreateDesignRequest: false,
      canApproveDesign: false,
      canVoteOnDesign: false, // Will be overridden by settings
      canSubmitPlayerInfo: false, // Will be overridden by settings
      canManagePlayerInfo: false,
      canManagePayments: false,
      canViewDelivery: true,
    },
    viewer: {
      canEditSettings: false,
      canTransferOwnership: false,
      canInviteMembers: false,
      canCreateDesignRequest: false,
      canApproveDesign: false,
      canVoteOnDesign: false,
      canSubmitPlayerInfo: false,
      canManagePlayerInfo: false,
      canManagePayments: false,
      canViewDelivery: true,
    },
  };

  const permissions = { ...basePermissions[role] };

  // Apply team settings overrides
  if (settings) {
    // Approval mode overrides
    if (settings.approval_mode === 'any_member' && role === 'member') {
      permissions.canApproveDesign = true;
    }
    if (settings.approval_mode === 'voting' && role === 'member') {
      permissions.canVoteOnDesign = true;
    }

    // Player info mode overrides
    if (settings.self_service_enabled && role === 'member') {
      permissions.canSubmitPlayerInfo = true;
    }

    // Invite permissions
    if (settings.allow_member_invites && role === 'member') {
      permissions.canInviteMembers = true;
    }
  }

  return permissions;
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  teamId: string,
  userId: string,
  permission: keyof TeamPermissions,
  supabase: ReturnType<typeof createSupabaseServer> | ReturnType<typeof getBrowserClient>
): Promise<boolean> {
  const permissions = await getUserTeamPermissions(teamId, userId, supabase);
  return permissions[permission];
}

/**
 * Require a specific permission or throw error
 */
export async function requirePermission(
  teamId: string,
  userId: string,
  permission: keyof TeamPermissions,
  supabase: ReturnType<typeof createSupabaseServer> | ReturnType<typeof getBrowserClient>
): Promise<void> {
  const hasPermission = await checkPermission(teamId, userId, permission, supabase);

  if (!hasPermission) {
    throw new Error(`Permission denied: ${permission}`);
  }
}
