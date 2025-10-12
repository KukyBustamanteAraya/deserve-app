-- Check RLS status and policies on sports table
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'sports';

-- Check all policies on sports table
SELECT
  policyname,
  cmd,
  roles::text,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'sports'
ORDER BY cmd, policyname;

-- Check table grants
SELECT
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_name = 'sports'
  AND grantee IN ('anon', 'authenticated', 'public')
GROUP BY grantee
ORDER BY grantee;
