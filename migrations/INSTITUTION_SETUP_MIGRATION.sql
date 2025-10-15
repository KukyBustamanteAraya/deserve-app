-- =====================================================================
-- INSTITUTION IMPLEMENTATION MIGRATION (FIXED)
-- =====================================================================
-- Created: 2025-10-12
-- Purpose: Add institution/multi-program team support to Deserve
--
-- APPROVED DECISIONS:
-- Decision 1: Extend team_memberships with institution_role column
-- Decision 2: Add sub_team_id to orders and design_requests tables
-- Decision 3: Create separate institution_sub_team_members table
--
-- IMPORTANT: Run this entire file in Supabase SQL Editor
-- Estimated execution time: 2-3 minutes
-- =====================================================================

-- =====================================================================
-- PHASE 1A: CREATE INSTITUTION TABLES FIRST
-- (Must create these before adding foreign keys)
-- =====================================================================

-- 1. Create institution_sub_teams table
-- Represents programs within an institution (e.g., "Varsity Soccer", "JV Basketball")
CREATE TABLE IF NOT EXISTS public.institution_sub_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,

  -- Sub-Team Identity
  name text NOT NULL,
  slug text,
  sport_id bigint NOT NULL REFERENCES public.sports(id),
  level text, -- "varsity", "jv", "freshman", "middle_school", etc.

  -- Management
  head_coach_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  coordinator_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Branding (can inherit from institution or customize)
  colors jsonb DEFAULT '{}',
  logo_url text,

  -- Status
  active boolean DEFAULT true,
  season_year text, -- "2024-2025", "2025-2026", etc.

  -- Metadata
  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique slugs within an institution
  CONSTRAINT unique_institution_sub_team_slug UNIQUE(institution_team_id, slug)
);

COMMENT ON TABLE public.institution_sub_teams IS
  'Sub-teams/programs within an institution (e.g., Varsity Soccer, JV Basketball). Each sub-team has its own roster and can place orders independently.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_teams_institution
  ON public.institution_sub_teams(institution_team_id);

CREATE INDEX IF NOT EXISTS idx_sub_teams_sport
  ON public.institution_sub_teams(sport_id);

CREATE INDEX IF NOT EXISTS idx_sub_teams_head_coach
  ON public.institution_sub_teams(head_coach_user_id)
  WHERE head_coach_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sub_teams_coordinator
  ON public.institution_sub_teams(coordinator_user_id)
  WHERE coordinator_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sub_teams_active
  ON public.institution_sub_teams(active)
  WHERE active = true;

-- 2. Create institution_sub_team_members table
-- Stores roster data for sub-team players (NO USER ACCOUNTS)
CREATE TABLE IF NOT EXISTS public.institution_sub_team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL REFERENCES public.institution_sub_teams(id) ON DELETE CASCADE,

  -- Player Information (NO USER ACCOUNT - roster data only)
  player_name text NOT NULL,
  email text, -- Optional, for notifications only (NOT for login)

  -- Roster Data
  position text, -- "Forward", "Defense", "Midfielder", "Point Guard", etc.
  jersey_number integer CHECK (jersey_number > 0 AND jersey_number <= 999),
  size text, -- "S", "M", "L", "XL", "XXL", etc.

  -- Flexible Data (grade level, parent contact, medical info, etc.)
  additional_info jsonb DEFAULT '{}',

  -- Metadata
  joined_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id), -- Coach who added this player

  -- Ensure email uniqueness within a sub-team (if provided)
  CONSTRAINT unique_sub_team_member_email UNIQUE(sub_team_id, email)
);

COMMENT ON TABLE public.institution_sub_team_members IS
  'Roster data for sub-team players. Players do NOT have user accounts - this is roster-only data managed by head coaches.';

COMMENT ON COLUMN public.institution_sub_team_members.email IS
  'Optional email for notifications. NOT used for authentication. Players do not have user accounts.';

COMMENT ON COLUMN public.institution_sub_team_members.additional_info IS
  'JSONB field for flexible data: grade level, parent contact, medical notes, emergency contacts, etc.';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_team_members_sub_team
  ON public.institution_sub_team_members(sub_team_id);

CREATE INDEX IF NOT EXISTS idx_sub_team_members_created_by
  ON public.institution_sub_team_members(created_by)
  WHERE created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sub_team_members_email
  ON public.institution_sub_team_members(email)
  WHERE email IS NOT NULL;

-- =====================================================================
-- PHASE 1B: EXTEND EXISTING TABLES
-- (Now we can add foreign keys to institution_sub_teams)
-- =====================================================================

-- 1. Add institution_role to team_memberships
-- This allows us to distinguish between Athletic Director, Coordinator, Head Coach, etc.
ALTER TABLE public.team_memberships
  ADD COLUMN IF NOT EXISTS institution_role text
  CHECK (institution_role IN (
    'athletic_director',
    'program_coordinator',
    'head_coach',
    'assistant'
  ));

COMMENT ON COLUMN public.team_memberships.institution_role IS
  'Institution-specific role. NULL for single team members. Works alongside "role" column for fine-grained permissions.';

-- 2. Add sub_team_id to orders table
-- Links orders to specific sub-teams within an institution
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS sub_team_id uuid
  REFERENCES public.institution_sub_teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.orders.sub_team_id IS
  'References the specific sub-team (e.g., Varsity Soccer) within an institution. NULL for single team orders.';

CREATE INDEX IF NOT EXISTS idx_orders_sub_team
  ON public.orders(sub_team_id)
  WHERE sub_team_id IS NOT NULL;

-- 3. Add sub_team_id to design_requests table
-- Links design requests to specific sub-teams
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS sub_team_id uuid
  REFERENCES public.institution_sub_teams(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.design_requests.sub_team_id IS
  'References the specific sub-team making the design request. NULL for single team requests.';

CREATE INDEX IF NOT EXISTS idx_design_requests_sub_team
  ON public.design_requests(sub_team_id)
  WHERE sub_team_id IS NOT NULL;

-- 4. Extend team_settings with institution-specific settings
ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS allow_program_autonomy boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_ad_approval_for_orders boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS budget_tracking_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS budget_per_program_cents integer,
  ADD COLUMN IF NOT EXISTS fiscal_year_start_month integer DEFAULT 1 CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12);

COMMENT ON COLUMN public.team_settings.allow_program_autonomy IS
  'If true, head coaches can approve designs without Athletic Director approval.';

COMMENT ON COLUMN public.team_settings.require_ad_approval_for_orders IS
  'If true, all orders must be approved by Athletic Director before production.';

COMMENT ON COLUMN public.team_settings.budget_tracking_enabled IS
  'Enable budget tracking per program.';

COMMENT ON COLUMN public.team_settings.budget_per_program_cents IS
  'Default budget allocation per program in Chilean Pesos (CLP).';

COMMENT ON COLUMN public.team_settings.fiscal_year_start_month IS
  'Month when fiscal year starts (1=January, 7=July, etc.)';

-- =====================================================================
-- PHASE 2: ROW-LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Enable RLS on new tables
ALTER TABLE public.institution_sub_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_sub_team_members ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- RLS Policies for institution_sub_teams
-- ---------------------------------------------------------------------

-- Policy: Athletic Directors see all sub-teams in their institution
CREATE POLICY "athletic_directors_view_all_subteams"
ON public.institution_sub_teams
FOR SELECT
USING (
  institution_team_id IN (
    SELECT team_id
    FROM public.team_memberships
    WHERE user_id = auth.uid()
      AND institution_role = 'athletic_director'
  )
);

-- Policy: Athletic Directors can manage all sub-teams (INSERT, UPDATE, DELETE)
CREATE POLICY "athletic_directors_manage_all_subteams"
ON public.institution_sub_teams
FOR ALL
USING (
  institution_team_id IN (
    SELECT team_id
    FROM public.team_memberships
    WHERE user_id = auth.uid()
      AND institution_role = 'athletic_director'
  )
);

-- Policy: Head Coaches see only their assigned sub-team
CREATE POLICY "head_coaches_view_own_subteam"
ON public.institution_sub_teams
FOR SELECT
USING (
  head_coach_user_id = auth.uid()
);

-- Policy: Head Coaches can update only their sub-team (not create/delete)
CREATE POLICY "head_coaches_update_own_subteam"
ON public.institution_sub_teams
FOR UPDATE
USING (
  head_coach_user_id = auth.uid()
);

-- Policy: Program Coordinators see sub-teams they coordinate
CREATE POLICY "coordinators_view_coordinated_subteams"
ON public.institution_sub_teams
FOR SELECT
USING (
  coordinator_user_id = auth.uid()
);

-- Policy: Program Coordinators can update sub-teams they coordinate
CREATE POLICY "coordinators_update_coordinated_subteams"
ON public.institution_sub_teams
FOR UPDATE
USING (
  coordinator_user_id = auth.uid()
);

-- ---------------------------------------------------------------------
-- RLS Policies for institution_sub_team_members
-- ---------------------------------------------------------------------

-- Policy: Head Coaches manage their own roster (full CRUD access)
CREATE POLICY "head_coaches_manage_own_roster"
ON public.institution_sub_team_members
FOR ALL
USING (
  sub_team_id IN (
    SELECT id
    FROM public.institution_sub_teams
    WHERE head_coach_user_id = auth.uid()
  )
);

-- Policy: Athletic Directors see all rosters in their institution
CREATE POLICY "athletic_directors_view_all_rosters"
ON public.institution_sub_team_members
FOR SELECT
USING (
  sub_team_id IN (
    SELECT st.id
    FROM public.institution_sub_teams st
    INNER JOIN public.team_memberships tm
      ON st.institution_team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND tm.institution_role = 'athletic_director'
  )
);

-- Policy: Program Coordinators see rosters for sub-teams they coordinate
CREATE POLICY "coordinators_view_coordinated_rosters"
ON public.institution_sub_team_members
FOR SELECT
USING (
  sub_team_id IN (
    SELECT id
    FROM public.institution_sub_teams
    WHERE coordinator_user_id = auth.uid()
  )
);

-- Policy: Assistants see roster of sub-teams where they assist
-- (Future enhancement - when we add assistant assignments to sub_teams)
-- CREATE POLICY "assistants_view_assigned_rosters" ...

-- =====================================================================
-- PHASE 3: HELPER FUNCTIONS (Optional but useful)
-- =====================================================================

-- Function to get all sub-teams for an institution
CREATE OR REPLACE FUNCTION get_institution_sub_teams(institution_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  sport_id bigint,
  sport_name text,
  level text,
  head_coach_name text,
  roster_count bigint,
  active boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.name,
    st.slug,
    st.sport_id,
    s.name as sport_name,
    st.level,
    p.full_name as head_coach_name,
    COUNT(m.id) as roster_count,
    st.active
  FROM public.institution_sub_teams st
  LEFT JOIN public.sports s ON st.sport_id = s.id
  LEFT JOIN auth.users u ON st.head_coach_user_id = u.id
  LEFT JOIN public.profiles p ON u.id = p.id
  LEFT JOIN public.institution_sub_team_members m ON st.id = m.sub_team_id
  WHERE st.institution_team_id = institution_id
  GROUP BY st.id, st.name, st.slug, st.sport_id, s.name, st.level, p.full_name, st.active
  ORDER BY st.active DESC, s.name, st.level;
END;
$$;

COMMENT ON FUNCTION get_institution_sub_teams IS
  'Returns all sub-teams for an institution with aggregated data (sport name, coach name, roster count)';

-- Function to check if user has institution role
CREATE OR REPLACE FUNCTION has_institution_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_memberships
    WHERE team_id = p_team_id
      AND user_id = p_user_id
      AND institution_role = p_role
  );
END;
$$;

COMMENT ON FUNCTION has_institution_role IS
  'Check if a user has a specific institution role (athletic_director, program_coordinator, head_coach, assistant)';

-- =====================================================================
-- PHASE 4: DATA VALIDATION
-- =====================================================================

-- Verify teams table supports institution type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teams'
      AND column_name = 'team_type'
  ) THEN
    RAISE EXCEPTION 'teams.team_type column not found. Cannot proceed.';
  END IF;
END $$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ Institution implementation migration completed successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables created/modified:';
  RAISE NOTICE '  - institution_sub_teams (NEW TABLE - created first)';
  RAISE NOTICE '  - institution_sub_team_members (NEW TABLE - created second)';
  RAISE NOTICE '  - team_memberships (added institution_role column)';
  RAISE NOTICE '  - orders (added sub_team_id column with FK to sub_teams)';
  RAISE NOTICE '  - design_requests (added sub_team_id column with FK to sub_teams)';
  RAISE NOTICE '  - team_settings (added 5 institution settings)';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies created: 9 policies';
  RAISE NOTICE 'Helper functions created: 2 functions';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test with sample data (see TESTING_GUIDE.md)';
  RAISE NOTICE '  2. Verify RLS policies work correctly';
  RAISE NOTICE '  3. Begin Phase 1 implementation (API routes)';
END $$;
