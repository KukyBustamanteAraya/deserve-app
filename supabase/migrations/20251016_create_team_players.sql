-- Create team_players table for storing team roster information
-- This table links users to teams with their player-specific information

CREATE TABLE IF NOT EXISTS team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  jersey_number TEXT,
  position TEXT,
  size TEXT,
  is_starter BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one player record per user per team
  UNIQUE(team_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_team_players_user_id ON team_players(user_id);

-- Add RLS policies
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

-- Users can view players on teams they're members of
CREATE POLICY "Users can view team players if they are team members"
  ON team_players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = team_players.team_id
      AND team_memberships.user_id = auth.uid()
    )
  );

-- Users can insert their own player record
CREATE POLICY "Users can insert their own player record"
  ON team_players FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own player record
CREATE POLICY "Users can update their own player record"
  ON team_players FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Team managers can update any player record on their team
CREATE POLICY "Team managers can update any player record"
  ON team_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = team_players.team_id
      AND team_memberships.user_id = auth.uid()
      AND team_memberships.role IN ('owner', 'manager')
    )
  );

-- Add comment
COMMENT ON TABLE team_players IS 'Stores player-specific information for team members (roster data)';
