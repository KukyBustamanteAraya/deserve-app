-- Add gender column to teams table
-- This column stores whether a team is male, female, or mixed gender
-- Used to filter appropriate products in the design request flow

ALTER TABLE teams
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'mixed'));

-- Add comment to document the column
COMMENT ON COLUMN teams.gender IS 'Team gender (male/female/mixed) - used for product filtering';
