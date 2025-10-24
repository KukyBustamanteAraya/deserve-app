export interface DesignMockup {
  id: string;
  mockup_url: string;
  is_primary: boolean;
  view_angle: string;
  product_type_slug: string;
}

export interface Design {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  designer_name: string | null;
  design_mockups: DesignMockup[];
}

export interface DesignRequest {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  design_id: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  feedback: string | null;
  sport_slug: string | null;
  sub_team_id: string | null;
  team_id: string;
  mockup_urls?: string[];
  designs?: Design;
  institution_sub_teams?: {
    id: string;
    name: string;
    slug: string;
  };
  teams?: {
    id: string;
    name: string;
    slug: string;
    team_type: string;
  };
}

export type UserRole = 'athletic_director' | 'coach' | 'assistant' | 'player' | null;
