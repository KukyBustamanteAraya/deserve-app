-- ============================================================================
-- SECURITY FIXES VERIFICATION SCRIPT
-- ============================================================================
-- Run this script AFTER applying security migrations to verify all issues
-- are resolved.
--
-- Usage:
--   psql -h <your-db-host> -U postgres -d postgres -f scripts/verify-security-fixes.sql
-- ============================================================================

\echo ''
\echo '======================================================================'
\echo 'SECURITY FIXES VERIFICATION'
\echo '======================================================================'
\echo ''

-- ============================================================================
-- TEST 1: RLS Enabled on All Public Tables
-- ============================================================================
\echo '1. Checking RLS is enabled on all public tables...'
\echo '   Expected: 0 tables without RLS'

SELECT
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = false
ORDER BY tablename;

\echo ''
\echo '   If any tables shown above, RLS is still disabled!'
\echo ''

-- ============================================================================
-- TEST 2: No SECURITY DEFINER Views
-- ============================================================================
\echo '2. Checking for SECURITY DEFINER views...'
\echo '   Expected: 0 views with SECURITY DEFINER'

SELECT
  schemaname,
  viewname,
  '❌ SECURITY DEFINER FOUND' as status
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%SECURITY DEFINER%';

\echo ''
\echo '   If any views shown above, SECURITY DEFINER still present!'
\echo ''

-- ============================================================================
-- TEST 3: No Auth Users Exposure
-- ============================================================================
\echo '3. Checking for auth.users exposure in views...'
\echo '   Expected: 0 views referencing auth.users'

SELECT
  schemaname,
  viewname,
  '❌ AUTH.USERS REFERENCE FOUND' as status
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%auth.users%';

\echo ''
\echo '   If any views shown above, auth.users is still exposed!'
\echo ''

-- ============================================================================
-- TEST 4: Functions Have search_path Set
-- ============================================================================
\echo '4. Checking functions have search_path set...'
\echo '   Expected: 0 functions without search_path'

SELECT
  n.nspname as schema,
  p.proname as function_name,
  '❌ NO SEARCH_PATH' as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.proconfig IS NULL OR NOT p.proconfig::text LIKE '%search_path%')
ORDER BY p.proname;

\echo ''
\echo '   If any functions shown above, search_path not set!'
\echo ''

-- ============================================================================
-- TEST 5: Extensions in Correct Schema
-- ============================================================================
\echo '5. Checking extensions are in extensions schema...'
\echo '   Expected: unaccent and btree_gist in extensions schema'

SELECT
  e.extname,
  n.nspname as schema,
  CASE
    WHEN n.nspname = 'extensions' THEN '✅ CORRECT SCHEMA'
    ELSE '❌ WRONG SCHEMA'
  END as status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname IN ('unaccent', 'btree_gist');

\echo ''

-- ============================================================================
-- TEST 6: RLS Policies Exist
-- ============================================================================
\echo '6. Checking RLS policies exist for critical tables...'
\echo '   Expected: Multiple policies for teams, bundles, etc.'

SELECT
  schemaname,
  tablename,
  policyname,
  '✅ POLICY EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'bundles', 'fabric_aliases', 'product_types',
    'product_fabric_recommendations', 'sport_fabric_overrides',
    'component_pricing', 'activity_log'
  )
ORDER BY tablename, policyname;

\echo ''

-- ============================================================================
-- TEST 7: Count Summary
-- ============================================================================
\echo '======================================================================'
\echo 'SUMMARY'
\echo '======================================================================'

SELECT
  'Tables without RLS' as check_type,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
  AND rowsecurity = false

UNION ALL

SELECT
  'SECURITY DEFINER views',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%SECURITY DEFINER%'

UNION ALL

SELECT
  'Auth.users exposures',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%auth.users%'

UNION ALL

SELECT
  'Functions without search_path',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND (p.proconfig IS NULL OR NOT p.proconfig::text LIKE '%search_path%')

UNION ALL

SELECT
  'Extensions in wrong schema',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname IN ('unaccent', 'btree_gist')
  AND n.nspname != 'extensions';

\echo ''
\echo '======================================================================'
\echo 'VERIFICATION COMPLETE'
\echo '======================================================================'
\echo ''
\echo 'If all tests show ✅ PASS, security fixes are successfully applied!'
\echo ''
\echo 'Manual step remaining:'
\echo '  - Enable leaked password protection in Supabase Dashboard'
\echo '    (Authentication → Providers → Email → Password breach protection)'
\echo ''
