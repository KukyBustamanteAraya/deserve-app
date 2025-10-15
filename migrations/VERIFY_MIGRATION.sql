-- =====================================================================
-- VERIFY INSTITUTION MIGRATION
-- =====================================================================
-- Run these queries to confirm migration was successful
-- =====================================================================

-- 1. Check new tables exist
SELECT
  'institution_sub_teams' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'institution_sub_teams'
UNION ALL
SELECT
  'institution_sub_team_members' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'institution_sub_team_members';
-- Expected: 2 rows showing table names with column counts

-- 2. Check institution_role column added to team_memberships
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_memberships'
  AND column_name = 'institution_role';
-- Expected: 1 row

-- 3. Check sub_team_id column added to orders
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'sub_team_id';
-- Expected: 1 row

-- 4. Check sub_team_id column added to design_requests
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'design_requests'
  AND column_name = 'sub_team_id';
-- Expected: 1 row

-- 5. Check team_settings institution columns
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_settings'
  AND column_name IN (
    'allow_program_autonomy',
    'require_ad_approval_for_orders',
    'budget_tracking_enabled',
    'budget_per_program_cents',
    'fiscal_year_start_month'
  )
ORDER BY column_name;
-- Expected: 5 rows

-- 6. Check RLS policies created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('institution_sub_teams', 'institution_sub_team_members')
ORDER BY tablename, policyname;
-- Expected: 9 rows (9 policies)

-- 7. Check helper functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_institution_sub_teams', 'has_institution_role')
ORDER BY routine_name;
-- Expected: 2 rows (2 functions)

-- 8. Summary
SELECT
  '✅ Migration Verification Complete' as status,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('institution_sub_teams', 'institution_sub_team_members')) as new_tables,
  (SELECT COUNT(*) FROM pg_policies
   WHERE schemaname = 'public'
   AND tablename IN ('institution_sub_teams', 'institution_sub_team_members')) as rls_policies,
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('get_institution_sub_teams', 'has_institution_role')) as helper_functions;
-- Expected: new_tables=2, rls_policies=9, helper_functions=2
