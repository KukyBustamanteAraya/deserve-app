import type { RoleType, TeamWithDetails, UserPermissions } from '@/types/team-hub';

/**
 * Calculate user permissions based on their role and team settings
 */
export function calculatePermissions(
  role: RoleType,
  teamSettings: TeamWithDetails,
  isAdminMode: boolean = false
): UserPermissions {
  // Admin mode has all permissions
  if (isAdminMode || role === 'admin') {
    return {
      canApproveDesign: true,
      canVoteOnDesign: true,
      canEditRoster: true,
      canViewFullRoster: true,
      canManagePayments: true,
      canManageMembers: true,
      canAccessSettings: true,
      canSendReminders: true,
      canExportData: true,
      canUpdateOrderStatus: true,
    };
  }

  // Owner permissions
  if (role === 'owner') {
    return {
      canApproveDesign: true,
      canVoteOnDesign: true,
      canEditRoster: true,
      canViewFullRoster: true,
      canManagePayments: true,
      canManageMembers: true,
      canAccessSettings: true,
      canSendReminders: true,
      canExportData: true,
      canUpdateOrderStatus: false, // Only admin
    };
  }

  // Sub-manager / Assistant permissions
  if (role === 'sub_manager' || role === 'assistant') {
    return {
      canApproveDesign: false, // Cannot approve
      canVoteOnDesign: teamSettings.approval_mode !== 'owner_only', // Can vote if enabled
      canEditRoster: true, // Can edit roster
      canViewFullRoster: true,
      canManagePayments: false, // Cannot handle payments
      canManageMembers: false, // Cannot manage members
      canAccessSettings: false,
      canSendReminders: true, // Can send reminders
      canExportData: true,
      canUpdateOrderStatus: false,
    };
  }

  // Member permissions (most restrictive)
  const canApprove = teamSettings.approval_mode === 'any_member';
  const canVote = ['voting', 'multi_design_vote', 'any_member'].includes(teamSettings.approval_mode);
  const canSelfService = teamSettings.self_service_enabled &&
    (teamSettings.player_info_mode === 'self_service' || teamSettings.player_info_mode === 'hybrid');

  return {
    canApproveDesign: canApprove,
    canVoteOnDesign: canVote,
    canEditRoster: canSelfService, // Can only edit own info
    canViewFullRoster: false, // Cannot see full roster
    canManagePayments: false,
    canManageMembers: false,
    canAccessSettings: false,
    canSendReminders: false,
    canExportData: false,
    canUpdateOrderStatus: false,
  };
}

/**
 * Check if a specific action is allowed
 */
export function can(
  action: keyof UserPermissions,
  permissions: UserPermissions
): boolean {
  return permissions[action];
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: RoleType): string {
  const roleNames: Record<RoleType, string> = {
    owner: 'Manager',
    sub_manager: 'Sub-Manager',
    assistant: 'Assistant',
    member: 'Player',
    admin: 'Admin (Deserve Staff)',
  };
  return roleNames[role] || role;
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: RoleType): string {
  const colors: Record<RoleType, string> = {
    owner: 'bg-blue-600 text-white',
    sub_manager: 'bg-purple-600 text-white',
    assistant: 'bg-green-600 text-white',
    member: 'bg-gray-600 text-white',
    admin: 'bg-red-600 text-white',
  };
  return colors[role] || 'bg-gray-600 text-white';
}
