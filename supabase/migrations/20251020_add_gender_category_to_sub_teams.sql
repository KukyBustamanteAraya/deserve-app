-- Migration: Add Gender Category to Institution Sub-Teams
-- Date: 2025-10-20
-- Purpose: Fix critical bug - bulk team creation API requires this column
-- Phase: 0 (Foundation)

-- Add gender_category column to institution_sub_teams
-- This is REQUIRED for the bulk team creation API we built in Phase 3
ALTER TABLE institution_sub_teams
ADD COLUMN IF NOT EXISTS gender_category TEXT DEFAULT 'male'
CHECK (gender_category IN ('male', 'female', 'both'));

-- Add comment explaining the column
COMMENT ON COLUMN institution_sub_teams.gender_category IS
'Gender category of the team: male, female, or both (co-ed). Required for proper team organization and order management.';

-- Create index for efficient filtering by gender
CREATE INDEX IF NOT EXISTS idx_institution_sub_teams_gender_category
ON institution_sub_teams(gender_category);

-- Update existing teams to have proper gender_category
-- All existing teams default to 'male' unless we have specific data to update
UPDATE institution_sub_teams
SET gender_category = 'male'
WHERE gender_category IS NULL;

-- Verify the column was added correctly
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'institution_sub_teams'
      AND column_name = 'gender_category'
  ) THEN
    RAISE NOTICE 'SUCCESS: gender_category column added to institution_sub_teams';
  ELSE
    RAISE EXCEPTION 'FAILED: gender_category column was not added';
  END IF;
END $$;
