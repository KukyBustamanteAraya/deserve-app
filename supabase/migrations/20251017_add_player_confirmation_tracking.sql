-- Add columns to track player confirmation status
-- This enables soft-enforcement of player confirmations for better sizing accuracy

-- Add confirmation tracking to player_info_submissions
ALTER TABLE player_info_submissions
  ADD COLUMN IF NOT EXISTS confirmed_by_player BOOLEAN DEFAULT FALSE;

ALTER TABLE player_info_submissions
  ADD COLUMN IF NOT EXISTS confirmation_date TIMESTAMP;

ALTER TABLE player_info_submissions
  ADD COLUMN IF NOT EXISTS confirmation_method VARCHAR(50);

-- Add manager-only flag to teams table
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS manager_only_team BOOLEAN DEFAULT FALSE;

-- Add unconfirmed player tracking to orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS has_unconfirmed_players BOOLEAN DEFAULT FALSE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS unconfirmed_player_count INTEGER DEFAULT 0;

-- Update existing records: players with user_id are already confirmed
UPDATE player_info_submissions
SET
  confirmed_by_player = TRUE,
  confirmation_date = updated_at,
  confirmation_method = 'collection_link'
WHERE user_id IS NOT NULL AND confirmed_by_player = FALSE;

-- Add helpful comments
COMMENT ON COLUMN player_info_submissions.confirmed_by_player IS 'TRUE if player submitted their own info or confirmed manager entry';
COMMENT ON COLUMN player_info_submissions.confirmation_date IS 'When the player confirmed their information';
COMMENT ON COLUMN player_info_submissions.confirmation_method IS 'How confirmation happened: collection_link, email, or manual';
COMMENT ON COLUMN teams.manager_only_team IS 'TRUE if team creator chose manager-only option during setup';
COMMENT ON COLUMN orders.has_unconfirmed_players IS 'TRUE if order includes players who have not confirmed their info';
COMMENT ON COLUMN orders.unconfirmed_player_count IS 'Number of players in order without confirmation';
