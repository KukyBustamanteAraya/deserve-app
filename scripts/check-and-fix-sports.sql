-- ============================================================================
-- SQL Diagnostics: Check and Fix Sport Field Issues
-- ============================================================================

-- 1. Check all teams and their sport values
SELECT
  id,
  name,
  slug,
  sport,
  CASE
    WHEN sport IS NULL THEN '❌ NULL (needs fix)'
    ELSE '✅ Has value'
  END as status
FROM teams
ORDER BY created_at DESC;

-- 2. Count teams by sport (including NULLs)
SELECT
  COALESCE(sport, '(NULL)') as sport_value,
  COUNT(*) as team_count
FROM teams
GROUP BY sport
ORDER BY team_count DESC;

-- 3. Check what sport values are currently in use
SELECT DISTINCT sport
FROM teams
WHERE sport IS NOT NULL
ORDER BY sport;

-- ============================================================================
-- FIX: Update NULL sports to 'futbol' (most common default)
-- ============================================================================

-- Preview what will be updated (run this first to verify)
SELECT
  id,
  name,
  slug,
  sport as current_sport,
  'futbol' as new_sport
FROM teams
WHERE sport IS NULL;

-- Actual UPDATE (uncomment and run after verifying above)
-- UPDATE teams
-- SET sport = 'futbol'
-- WHERE sport IS NULL;

-- ============================================================================
-- FIX: Update specific team by ID (if you want to set a different sport)
-- ============================================================================

-- Replace 'YOUR_TEAM_ID' with actual team ID
-- Replace 'futbol' with desired sport: 'futbol', 'basketball', 'volleyball', 'baseball', 'rugby'
/*
UPDATE teams
SET sport = 'futbol'
WHERE id = 'YOUR_TEAM_ID';
*/

-- ============================================================================
-- VERIFY: Check your specific team's sport value
-- ============================================================================

-- Replace 'your-team-slug' with your actual team slug
SELECT
  id,
  name,
  slug,
  sport,
  created_at
FROM teams
WHERE slug = 'your-team-slug';

-- ============================================================================
-- PREVENTION: Add NOT NULL constraint (optional - for future)
-- ============================================================================

-- This will prevent NULL sports in the future, but requires all existing teams to have sports first
-- Only run this AFTER fixing all NULL values above

/*
-- First, ensure NO NULLs exist
UPDATE teams SET sport = 'futbol' WHERE sport IS NULL;

-- Then add the constraint
ALTER TABLE teams
ALTER COLUMN sport SET DEFAULT 'futbol',
ALTER COLUMN sport SET NOT NULL;
*/

-- ============================================================================
-- RECOMMENDED VALID SPORT VALUES
-- ============================================================================

-- Based on your codebase, these are the valid sport slugs:
-- 'futbol'      - Soccer/Football
-- 'basketball'  - Basketball
-- 'volleyball'  - Volleyball
-- 'baseball'    - Baseball
-- 'rugby'       - Rugby

-- Note: The database uses 'futbol' (Spanish), not 'soccer'
