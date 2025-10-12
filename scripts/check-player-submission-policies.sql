-- Check ALL policies on player_info_submissions table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'player_info_submissions'
ORDER BY cmd, policyname;
