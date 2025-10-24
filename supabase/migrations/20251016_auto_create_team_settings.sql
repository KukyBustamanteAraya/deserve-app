-- Migration: Auto-create team_settings when a new team is created
-- This eliminates the 406 error for new teams
-- Date: 2025-10-16

-- Create function to auto-create team_settings
CREATE OR REPLACE FUNCTION create_team_settings_for_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row in team_settings with the new team's ID
  INSERT INTO team_settings (team_id)
  VALUES (NEW.id)
  ON CONFLICT (team_id) DO NOTHING;  -- Don't error if settings already exist

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a team is inserted
DROP TRIGGER IF EXISTS create_team_settings_trigger ON teams;

CREATE TRIGGER create_team_settings_trigger
  AFTER INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION create_team_settings_for_new_team();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION create_team_settings_for_new_team() TO authenticated;

-- Backfill existing teams without settings (optional but recommended)
INSERT INTO team_settings (team_id)
SELECT id FROM teams
WHERE id NOT IN (SELECT team_id FROM team_settings)
ON CONFLICT (team_id) DO NOTHING;

-- Verify the trigger was created
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'create_team_settings_trigger';
