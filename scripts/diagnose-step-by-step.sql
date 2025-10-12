-- Run each query separately in your Supabase SQL editor
-- Copy/paste one at a time to see all results

-- ============================================================================
-- QUERY 1: Check if RLS is enabled
-- ============================================================================
SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS is ENABLED'
    ELSE '❌ RLS is DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'player_info_submissions';


-- ============================================================================
-- QUERY 2: Check ALL policies on player_info_submissions
-- ============================================================================
SELECT
  policyname,
  CASE
    WHEN cmd = 'INSERT' THEN '✏️  INSERT'
    WHEN cmd = 'SELECT' THEN '👁️  SELECT'
    WHEN cmd = 'UPDATE' THEN '📝 UPDATE'
    WHEN cmd = 'DELETE' THEN '🗑️  DELETE'
  END as operation,
  roles::text as applies_to_roles,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN '✅ PERMISSIVE'
    ELSE '⚠️  RESTRICTIVE'
  END as policy_type
FROM pg_policies
WHERE tablename = 'player_info_submissions'
ORDER BY cmd, policyname;


-- ============================================================================
-- QUERY 3: Check table-level grants for anon role
-- ============================================================================
SELECT
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_name = 'player_info_submissions'
  AND grantee IN ('anon', 'authenticated', 'public')
GROUP BY grantee
ORDER BY grantee;


-- ============================================================================
-- QUERY 4: Check if anon can use sequences (for auto-incrementing ID)
-- ============================================================================
SELECT
  c.relname as sequence_name,
  CASE
    WHEN has_sequence_privilege('anon', c.oid, 'USAGE')
    THEN '✅ anon has USAGE'
    ELSE '❌ anon lacks USAGE'
  END as anon_can_use
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'S'
  AND n.nspname = 'public'
  AND c.relname LIKE '%player_info%';


-- ============================================================================
-- QUERY 5: Check foreign key constraints
-- ============================================================================
SELECT
  conname as constraint_name,
  confrelid::regclass as references_table,
  a.attname as column_name,
  af.attname as references_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'public.player_info_submissions'::regclass
  AND contype = 'f'
ORDER BY conname;
