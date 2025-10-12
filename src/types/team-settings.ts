// Team Settings Types

export type ApprovalMode = 'owner_only' | 'any_member' | 'voting' | 'multi_design_vote';
export type PlayerInfoMode = 'self_service' | 'manager_only' | 'hybrid';
export type AccessMode = 'open' | 'invite_only' | 'private';
export type PaymentMode = 'individual' | 'manager_pays_all';

export interface TeamSettings {
  team_id: string;
  approval_mode: ApprovalMode;
  min_approvals_required: number;
  voting_deadline?: string;
  designated_voters: string[];
  player_info_mode: PlayerInfoMode;
  self_service_enabled: boolean;
  info_collection_link?: string;
  info_collection_token?: string;
  info_collection_expires_at?: string;
  access_mode: AccessMode;
  allow_member_invites: boolean;
  payment_mode: PaymentMode;
  notify_on_design_ready: boolean;
  notify_on_vote_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignVote {
  id: string;
  design_request_id: number;
  user_id: string;
  vote: 'approve' | 'reject' | 'abstain';
  design_option_index: number;
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface PlayerInfoSubmission {
  id: string;
  team_id: string;
  design_request_id?: number;
  user_id?: string;
  player_name: string;
  jersey_number?: string;
  size: string;
  position?: string;
  additional_notes?: string;
  submitted_by_manager: boolean;
  submission_token?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamOwnershipHistory {
  id: string;
  team_id: string;
  previous_owner_id?: string;
  new_owner_id?: string;
  transferred_by?: string;
  transfer_reason?: string;
  created_at: string;
}
