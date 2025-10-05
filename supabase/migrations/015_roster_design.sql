-- Migration 015: Roster & Design Request
-- Implements roster CSV upload and design request/approval workflow

-- ============================================================================
-- PART 1: ROSTER MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS roster_members (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  number TEXT,
  size TEXT,
  email TEXT,
  phone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for team lookups
CREATE INDEX IF NOT EXISTS idx_roster_team_id ON roster_members(team_id);

-- ============================================================================
-- PART 2: DESIGN REQUESTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS design_requests (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brief TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'voting', 'approved', 'rejected')),
  selected_candidate_id BIGINT REFERENCES design_candidates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for team lookups
CREATE INDEX IF NOT EXISTS idx_design_requests_team_id ON design_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_design_requests_status ON design_requests(status);

-- ============================================================================
-- PART 3: TRIGGERS
-- ============================================================================

-- Auto-update updated_at for design_requests
DROP TRIGGER IF EXISTS design_requests_updated_at ON design_requests;
CREATE TRIGGER design_requests_updated_at
  BEFORE UPDATE ON design_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- PART 4: RLS POLICIES - ROSTER_MEMBERS
-- ============================================================================

ALTER TABLE roster_members ENABLE ROW LEVEL SECURITY;

-- SELECT: Team creator or team members can read roster for their team
DROP POLICY IF EXISTS "Team members can view roster" ON roster_members;
CREATE POLICY "Team members can view roster" ON roster_members
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      -- Teams where user is creator
      SELECT id FROM teams WHERE created_by = auth.uid()
      UNION
      -- Teams where user is a member
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: ONLY team captain (creator) can insert roster members
DROP POLICY IF EXISTS "Team captain can add roster members" ON roster_members;
CREATE POLICY "Team captain can add roster members" ON roster_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- UPDATE: Team captain can update roster members
DROP POLICY IF EXISTS "Team captain can update roster members" ON roster_members;
CREATE POLICY "Team captain can update roster members" ON roster_members
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- DELETE: Team captain can delete roster members
DROP POLICY IF EXISTS "Team captain can delete roster members" ON roster_members;
CREATE POLICY "Team captain can delete roster members" ON roster_members
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- PART 5: RLS POLICIES - DESIGN_REQUESTS
-- ============================================================================

ALTER TABLE design_requests ENABLE ROW LEVEL SECURITY;

-- SELECT: Team creator or team members can view design requests for their team
DROP POLICY IF EXISTS "Team members can view design requests" ON design_requests;
CREATE POLICY "Team members can view design requests" ON design_requests
  FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      -- Teams where user is creator
      SELECT id FROM teams WHERE created_by = auth.uid()
      UNION
      -- Teams where user is a member
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: ONLY team captain can create design requests
DROP POLICY IF EXISTS "Team captain can create design requests" ON design_requests;
CREATE POLICY "Team captain can create design requests" ON design_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- UPDATE: ONLY team captain can update design request status
DROP POLICY IF EXISTS "Team captain can update design requests" ON design_requests;
CREATE POLICY "Team captain can update design requests" ON design_requests
  FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- DELETE: Team captain can delete design requests
DROP POLICY IF EXISTS "Team captain can delete design requests" ON design_requests;
CREATE POLICY "Team captain can delete design requests" ON design_requests
  FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT id FROM teams WHERE created_by = auth.uid()
    )
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
