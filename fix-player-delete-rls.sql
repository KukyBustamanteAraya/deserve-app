-- Fix RLS policy to allow players to delete their own submissions
-- This allows players to leave teams by deleting their player_info_submissions

-- Drop existing DELETE policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Players can delete their own submissions" ON player_info_submissions;

-- Create new DELETE policy allowing players to delete their own submissions
CREATE POLICY "Players can delete their own submissions"
ON player_info_submissions
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id
);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'player_info_submissions' AND cmd = 'DELETE';
