// Team Hub Type Definitions

export type RoleType = 'owner' | 'sub_manager' | 'assistant' | 'member' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'payment_pending'
  | 'payment_complete'
  | 'in_production'
  | 'quality_check'
  | 'shipped'
  | 'delivered';

export type VariantType = 'mens' | 'womens' | 'unisex';
export type KitType = 'home' | 'away' | 'third';

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

export interface TeamMember {
  user_id: string;
  team_id: string;
  role_type: RoleType;
  joined_at: string;
  email?: string;
  full_name?: string;
  avatar_url?: string;
}

export interface DesignRequest {
  id: string;
  team_id: string;
  team_slug: string;
  product_name: string;
  product_slug: string;
  sport_slug: string;
  status: 'pending' | 'rendering' | 'ready' | 'approved' | 'changes_requested';
  mockup_urls?: string[];
  design_options?: DesignOption[];
  voting_enabled: boolean;
  voting_closes_at?: string;
  approval_votes_count: number;
  rejection_votes_count: number;
  required_approvals: number;
  approval_status?: 'pending' | 'approved' | 'changes_requested';
  revision_count: number;
  created_at: string;
  updated_at: string;
}

export interface DesignOption {
  index: number;
  mockup_urls: string[];
  votes_count?: number;
}

export interface DesignVote {
  id: string;
  design_request_id: string;
  user_id: string;
  vote: 'approve' | 'reject' | 'abstain';
  design_option_index: number;
  comment?: string;
  created_at: string;
}

export interface PlayerInfo {
  id: string;
  team_id: string;
  design_request_id?: string;
  user_id?: string;
  player_name: string;
  jersey_number: string;
  size: string;
  position?: string;
  gender?: 'male' | 'female';
  variant?: VariantType;
  kit_type?: KitType;
  additional_notes?: string;
  submitted_by_manager: boolean;
  submission_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  team_id: string;
  design_request_id: string;
  status: OrderStatus;
  payment_status: 'pending' | 'partial' | 'complete' | 'failed';
  payment_mode: 'split' | 'bulk';
  total_amount_cents: number;
  tracking_number?: string;
  carrier?: string;
  estimated_delivery_date?: string;
  variants: OrderVariant[];
  created_at: string;
  updated_at: string;
}

export interface OrderVariant {
  variant_type: VariantType;
  kit_type: KitType;
  quantity: number;
  name_enabled: boolean;
  number_enabled: boolean;
  sizes: SizeQuantity[];
}

export interface SizeQuantity {
  size: string;
  quantity: number;
}

export interface ActivityLogEntry {
  id: string;
  team_id: string;
  user_id?: string;
  user_role?: RoleType;
  action_type: 'design_created' | 'design_approved' | 'design_rejected' |
                'vote_cast' | 'player_info_submitted' | 'player_info_edited' |
                'order_created' | 'order_status_updated' | 'payment_received' |
                'member_invited' | 'member_joined' | 'role_changed' |
                'admin_assist' | 'settings_updated';
  action_description: string;
  metadata?: Record<string, any>;
  is_public: boolean; // If true, visible to all team members
  created_at: string;
}

export interface TeamStats {
  total_members: number;
  player_info_submitted: number;
  player_info_total: number;
  payment_received_cents: number;
  payment_total_cents: number;
  current_stage: 'design' | 'roster' | 'payment' | 'production' | 'shipping';
  design_status?: string;
  order_status?: OrderStatus;
}

// UI Component Props

export interface TeamHeaderProps {
  team: TeamWithDetails;
  currentUserRole: RoleType;
  isAdminMode?: boolean;
}

export interface NavTabsProps {
  teamSlug: string;
  currentSection: 'dashboard' | 'design' | 'roster' | 'orders' | 'activity';
  role: RoleType;
}

export interface ProgressBarProps {
  current: number;
  total: number;
  label: string;
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export interface NextStepCardProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
}

// Permissions Helper Types

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

// Notification Types

export interface Notification {
  id: string;
  user_id: string;
  team_id: string;
  type: 'design_ready' | 'vote_required' | 'payment_due' | 'order_shipped' |
        'info_reminder' | 'role_changed' | 'order_update';
  title: string;
  message: string;
  action_url?: string;
  read: boolean;
  created_at: string;
}
