// Shared types for team pages

export type Team = {
  id: string;
  name: string;
  slug: string;
  sport_id?: number;
  sport?: {
    id: number;
    slug: string;
    name: string;
  };
  team_type?: 'single_team' | 'institution';
  sports?: string[];
  institution_name?: string;
  created_at: string;
  logo_url?: string;
};

export type TeamColors = {
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
};

export type DesignRequest = {
  id: number;
  team_id: string;
  product_id: number;
  status: string;
  mockup_urls: string[] | null;
  mockup_preference?: 'home' | 'away' | 'both'; // Mockup display preference
  mockups?: {  // Structured mockups (home/away)
    home?: { front?: string; back?: string };
    away?: { front?: string; back?: string };
  };
  requested_by: string;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  dislikes_count?: number;
  user_reaction?: 'like' | 'dislike' | null;
};

export type SubTeam = {
  id: string;
  name: string;
  slug: string;
  sport_id?: number;
  sport?: {
    id: number;
    slug: string;
    name: string;
  };
  member_count: number;
  design_status?: string;
};

export type Player = {
  id: string;
  player_name: string;
  jersey_number?: string;
  size: string;
  position?: string;
  additional_notes?: string;
  created_at?: string; // Optional since MiniFieldMap may not always provide it
};

export type PaymentSummary = {
  totalOrders: number;
  totalAmountClp: number;
  totalPaidClp: number;
  totalPendingClp: number;
  myPendingPayments: number;
};
