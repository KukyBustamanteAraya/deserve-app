// User management types
export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: 'customer' | 'admin';
  team_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  email: string | null;
  display_name: string | null;
  role: 'customer' | 'admin';
}

export interface TeamDetails {
  id: string;
  name: string;
  slug: string;
  sport_id: string;
  sport_name: string;
  sport_slug: string;
  created_by: string;
  member_count: number;
  members: TeamMember[];
  created_at: string;
  updated_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  code: string;
  created_by: string;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamWithInvites extends TeamDetails {
  invites: TeamInvite[];
}

// API Request/Response types
export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface CreateTeamRequest {
  name: string;
  sport_slug: string;
}

export interface CreateInviteRequest {
  team_id: string;
  max_uses?: number;
  expires_at?: string; // ISO string
}

export interface JoinTeamRequest {
  code: string;
}

export interface SetUserRoleRequest {
  user_id: string;
  role: 'customer' | 'admin';
}

// API Response types
export interface TeamMeResponse {
  team: TeamDetails | null;
  profile: UserProfile;
}

export interface CreateTeamResponse {
  team: TeamDetails;
  invite: TeamInvite;
}

export interface JoinTeamResponse {
  success: boolean;
  team?: TeamDetails;
  error?: string;
}

export interface LeaveTeamResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface CreateInviteResponse {
  invite: TeamInvite;
}

// Utility types
export type UserRole = 'customer' | 'admin';