-- =============================================
-- RLS Policies for design_requests Table
-- =============================================
-- Created: 2025-10-15
-- Purpose: Allow team owners/managers to create design requests
-- =============================================

-- Enable RLS on design_requests (if not already enabled)
ALTER TABLE public.design_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "design_requests_insert_by_team_member" ON public.design_requests;
DROP POLICY IF EXISTS "design_requests_select_by_team_member" ON public.design_requests;
DROP POLICY IF EXISTS "design_requests_update_by_team_member" ON public.design_requests;

-- =============================================
-- INSERT Policy: Allow team owners/managers to create design requests
-- =============================================
CREATE POLICY "design_requests_insert_by_team_member"
ON public.design_requests
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be the one creating the request
  auth.uid() = requested_by
  AND
  -- User must be owner or manager of the team
  EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'manager')
  )
);

-- =============================================
-- SELECT Policy: Allow team members to view their team's design requests
-- =============================================
CREATE POLICY "design_requests_select_by_team_member"
ON public.design_requests
FOR SELECT
TO authenticated
USING (
  -- User is a member of the team
  EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
  )
);

-- =============================================
-- UPDATE Policy: Allow team owners/managers to update their design requests
-- =============================================
CREATE POLICY "design_requests_update_by_team_member"
ON public.design_requests
FOR UPDATE
TO authenticated
USING (
  -- User is owner or manager of the team
  EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  -- User is owner or manager of the team
  EXISTS (
    SELECT 1
    FROM public.team_memberships tm
    WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'manager')
  )
);

-- =============================================
-- Verification
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies for design_requests created successfully';
  RAISE NOTICE '   - INSERT: Team owners/managers can create design requests';
  RAISE NOTICE '   - SELECT: Team members can view their team''s design requests';
  RAISE NOTICE '   - UPDATE: Team owners/managers can update design requests';
END $$;
