-- Migration: Add Gender Hierarchy Fields to Institution Sub-Teams
-- Date: 2025-10-20
-- Purpose: Support gender-based team organization and coach assignments

-- Add coach_name column to store coach information as text
-- This allows storing coach names before they have user accounts
ALTER TABLE institution_sub_teams
ADD COLUMN IF NOT EXISTS coach_name TEXT;

-- Add division_group column to link related teams (e.g., men's and women's Varsity)
-- Format: "{base_name}-{sport_id}-{timestamp}" (e.g., "varsity-1-z5qgr0")
ALTER TABLE institution_sub_teams
ADD COLUMN IF NOT EXISTS division_group TEXT;

-- Add comment explaining the columns
COMMENT ON COLUMN institution_sub_teams.coach_name IS 'Coach name as text - can be set before coach has a user account';
COMMENT ON COLUMN institution_sub_teams.division_group IS 'Groups related teams together (e.g., men and women teams with same base name)';

-- Create index on division_group for efficient querying of related teams
CREATE INDEX IF NOT EXISTS idx_institution_sub_teams_division_group
ON institution_sub_teams(division_group)
WHERE division_group IS NOT NULL;

-- Create index on gender_category for efficient filtering
CREATE INDEX IF NOT EXISTS idx_institution_sub_teams_gender_category
ON institution_sub_teams(gender_category);

-- Create composite index for sport and gender filtering (common query pattern)
CREATE INDEX IF NOT EXISTS idx_institution_sub_teams_sport_gender
ON institution_sub_teams(sport_id, gender_category);
