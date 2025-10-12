-- Check the actual conditions of SELECT policies
SELECT
  policyname,
  cmd,
  roles::text,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE tablename = 'player_info_submissions'
  AND cmd = 'SELECT'
ORDER BY policyname;
