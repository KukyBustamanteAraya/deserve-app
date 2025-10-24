-- Migration: Add jersey_name columns to player tables
-- Date: 2025-10-18
-- Description: Adds jersey_name field to distinguish between full legal name and jersey print name

-- Add jersey_name to team_players table
ALTER TABLE team_players
ADD COLUMN IF NOT EXISTS jersey_name TEXT;

-- Add jersey_name to player_info_submissions table
ALTER TABLE player_info_submissions
ADD COLUMN IF NOT EXISTS jersey_name TEXT;

-- Add helpful comments
COMMENT ON COLUMN team_players.jersey_name IS 'Name to be printed on jersey (can be nickname, apellido, first name, etc.)';
COMMENT ON COLUMN player_info_submissions.jersey_name IS 'Name to be printed on jersey (can be nickname, apellido, first name, etc.)';

-- Note: player_name in both tables will now represent:
-- - team_players.player_name: Display name for mini field (usually jersey_name)
-- - player_info_submissions.player_name: Full legal name for official roster
