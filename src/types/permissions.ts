// Permission and Role Types

export type RoleType = 'owner' | 'sub_manager' | 'assistant' | 'member' | 'admin';

export interface TeamWithDetails {
  id: string;
  slug: string;
  name: string;
  sport: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logo_url?: string;
  owner_id: string;
  current_owner_id: string;
  created_at: string;
  // From team_settings
  approval_mode: 'owner_only' | 'any_member' | 'voting' | 'multi_design_vote';
  min_approvals_required: number;
  player_info_mode: 'self_service' | 'manager_only' | 'hybrid';
  self_service_enabled: boolean;
  access_mode: 'open' | 'invite_only' | 'private';
  allow_member_invites: boolean;
}

export interface UserPermissions {
  canApproveDesign: boolean;
  canVoteOnDesign: boolean;
  canEditRoster: boolean;
  canViewFullRoster: boolean;
  canManagePayments: boolean;
  canManageMembers: boolean;
  canAccessSettings: boolean;
  canSendReminders: boolean;
  canExportData: boolean;
  canUpdateOrderStatus: boolean;
}
