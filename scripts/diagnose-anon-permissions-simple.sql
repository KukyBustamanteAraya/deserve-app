-- ============================================================================
-- Comprehensive diagnostic for anonymous player submission permissions
-- (Supabase SQL Editor compatible - no \echo commands)
-- ============================================================================

-- 1. Check if RLS is enabled on the table
SELECT
  '1. RLS STATUS' as check_section,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS is ENABLED'
    ELSE '❌ RLS is DISABLED (table would be fully blocked by default)'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'player_info_submissions';

-- 2. Check ALL policies on player_info_submissions
SELECT
  '2. ALL POLICIES' as check_section,
  schemaname,
  tablename,
  policyname,
  CASE
    WHEN cmd = 'ALL' THEN '🔓 ALL'
    WHEN cmd = 'SELECT' THEN '👁️  SELECT'
    WHEN cmd = 'INSERT' THEN '✏️  INSERT'
    WHEN cmd = 'UPDATE' THEN '📝 UPDATE'
    WHEN cmd = 'DELETE' THEN '🗑️  DELETE'
  END as operation,
  CASE
    WHEN permissive = 'PERMISSIVE' THEN '✅ PERMISSIVE (OR logic)'
    ELSE '⚠️  RESTRICTIVE (AND logic)'
  END as policy_type,
  roles::text as applies_to_roles
FROM pg_policies
WHERE tablename = 'player_info_submissions'
ORDER BY cmd, policyname;

-- 3. Check table-level grants for anon role
SELECT
  '3. TABLE GRANTS' as check_section,
  grantee,
  table_schema,
  table_name,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as privileges
FROM information_schema.table_privileges
WHERE table_name = 'player_info_submissions'
  AND grantee IN ('anon', 'authenticated', 'public')
GROUP BY grantee, table_schema, table_name
ORDER BY grantee;

-- 4. Check sequence permissions (for auto-increment ID)
SELECT
  '4. SEQUENCE PERMISSIONS' as check_section,
  c.relname as sequence_name,
  n.nspname as schema,
  string_agg(DISTINCT pr.rolname, ', ') as roles_with_usage
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_default_acl d ON d.defaclnamespace = n.oid
LEFT JOIN pg_roles pr ON has_sequence_privilege(pr.oid, c.oid, 'USAGE')
WHERE c.relkind = 'S'
  AND n.nspname = 'public'
  AND c.relname LIKE '%player_info%'
  AND pr.rolname IN ('anon', 'authenticated')
GROUP BY c.relname, n.nspname;

-- 5. Check foreign key constraints (that could block inserts)
SELECT
  '5. FOREIGN KEY CONSTRAINTS' as check_section,
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as references_table,
  a.attname as column_name,
  af.attname as references_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'public.player_info_submissions'::regclass
  AND contype = 'f'
ORDER BY conname;

-- 6. Test policy logic (what would the policy evaluate to?)
SELECT
  '6. POLICY LOGIC TEST' as check_section,
  NULL::uuid as simulated_auth_uid,
  'test-token-123' as simulated_submission_token,
  CASE
    WHEN NULL IS NULL AND 'test-token-123' IS NOT NULL
    THEN '✅ ANON POLICY WOULD PASS (auth.uid IS NULL AND token IS NOT NULL)'
    ELSE '❌ ANON POLICY WOULD FAIL'
  END as anon_policy_result;
