-- =============================================
-- Check Current RLS State for design_requests
-- =============================================

-- 1. Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'design_requests';

-- 2. Check existing policies
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
WHERE tablename = 'design_requests'
ORDER BY policyname;

-- 3. Check table structure (columns we'll reference)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'design_requests'
  AND column_name IN ('id', 'team_id', 'requested_by', 'status')
ORDER BY column_name;

-- 4. Check if team_memberships table exists and has required columns
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'team_memberships'
  AND column_name IN ('team_id', 'user_id', 'role')
ORDER BY column_name;
