-- Test if anonymous inserts work with the policy
-- This simulates what the browser is trying to do

-- First, check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'player_info_submissions';

-- Check the current role and if we can see policies
SELECT current_user, current_setting('role');

-- Try to simulate an anonymous insert (this will use your current role, but shows if the policy logic works)
-- We need to get a real team_id and design_request_id first
SELECT id as team_id FROM teams LIMIT 1;

-- Get a design request for that team
SELECT dr.id as design_request_id, dr.team_id
FROM design_requests dr
JOIN teams t ON t.id = dr.team_id
LIMIT 1;

-- Now try to understand why the policy isn't working
-- Let's check what the policy actually evaluates to
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'player_info_submissions'
  AND cmd = 'INSERT';
