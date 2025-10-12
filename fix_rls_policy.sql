-- Manually apply the RLS policy fix for authenticated collection submissions

-- Drop existing authenticated INSERT policy
DROP POLICY IF EXISTS "player_info_authenticated_insert" ON public.player_info_submissions;

-- Recreate with collection link support
CREATE POLICY "player_info_authenticated_insert"
  ON public.player_info_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow collection link submissions (even if user is logged in)
    submission_token IS NOT NULL
    OR
    -- Allow authenticated users to insert for themselves
    (user_id = auth.uid() OR user_id IS NULL)
    OR
    -- Allow managers to insert for players
    submitted_by_manager = true
  );

COMMENT ON POLICY "player_info_authenticated_insert" ON public.player_info_submissions
  IS 'Authenticated role: Allow collection link submissions, self-inserts, and manager inserts';
