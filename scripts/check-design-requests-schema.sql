-- Check the actual structure of design_requests table
-- Run this in Supabase SQL Editor to see what columns exist

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'design_requests'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if small_teams table exists
SELECT
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('teams', 'small_teams')
ORDER BY table_name;

-- Check team_memberships table structure
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'team_memberships'
  AND table_schema = 'public'
ORDER BY ordinal_position;
