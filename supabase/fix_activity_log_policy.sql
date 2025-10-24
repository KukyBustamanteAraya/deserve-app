-- ============================================================================
-- FIX: Activity Log Policies - CORRECTED
-- ============================================================================
-- Based on actual table structure:
--   - related_team_id (uuid, NOT NULL) - the team this activity belongs to
--   - related_user_id (uuid, NULLABLE) - the user who performed the action
--   - is_public (boolean) - whether the activity is publicly visible
--
-- Security Model: Team-based access
--   - Team members can see their team's activity logs
--   - Admins can see all activity logs
--   - Users can insert logs for teams they're members of
-- ============================================================================

-- Drop the failed policies from original migration
DROP POLICY IF EXISTS "activity_log_user_read" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_admin_read" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON public.activity_log;

-- ============================================================================
-- READ POLICIES
-- ============================================================================

-- Policy 1: Team members can read activity logs for their teams
CREATE POLICY "activity_log_team_member_read" ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_id = activity_log.related_team_id
        AND user_id = auth.uid()
    )
  );

-- Policy 2: Admins can read all activity logs
CREATE POLICY "activity_log_admin_read" ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policy 3: Public activity logs can be read by anyone (if is_public = true)
CREATE POLICY "activity_log_public_read" ON public.activity_log
  FOR SELECT TO authenticated, anon
  USING (is_public = true);

-- ============================================================================
-- WRITE POLICIES
-- ============================================================================

-- Policy 4: Users can insert activity logs for teams they're members of
CREATE POLICY "activity_log_team_member_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_id = related_team_id
        AND user_id = auth.uid()
    )
  );

-- Policy 5: Admins can insert activity logs for any team
CREATE POLICY "activity_log_admin_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Test these policies work correctly:
--
-- 1. As a team member, you should see your team's activity logs
-- 2. As an admin, you should see all activity logs
-- 3. Public logs (is_public = true) should be visible to everyone
-- 4. You can only insert logs for teams you're a member of
-- ============================================================================

COMMENT ON TABLE public.activity_log IS 'Team-based activity logs with RLS - Security fix applied 2025-01-23';
