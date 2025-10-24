-- Allow all team members to manage the roster (not just managers)
-- This supports player-run teams where everyone should be able to add/edit/delete players

-- Drop the restrictive policies that only allow users to manage their own records
DROP POLICY IF EXISTS "Users can insert their own player record" ON team_players;
DROP POLICY IF EXISTS "Users can update their own player record" ON team_players;
DROP POLICY IF EXISTS "Team managers can update any player record" ON team_players;

-- Allow any team member to insert player records for their team
CREATE POLICY "Team members can insert any player record"
  ON team_players FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = team_players.team_id
      AND team_memberships.user_id = auth.uid()
    )
  );

-- Allow any team member to update player records on their team
CREATE POLICY "Team members can update any player record"
  ON team_players FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = team_players.team_id
      AND team_memberships.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = team_players.team_id
      AND team_memberships.user_id = auth.uid()
    )
  );

-- Allow any team member to delete player records on their team
CREATE POLICY "Team members can delete any player record"
  ON team_players FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_memberships.team_id = team_players.team_id
      AND team_memberships.user_id = auth.uid()
    )
  );

-- Add comment
COMMENT ON POLICY "Team members can insert any player record" ON team_players IS 'Allows all team members to add players to the roster';
COMMENT ON POLICY "Team members can update any player record" ON team_players IS 'Allows all team members to edit player information';
COMMENT ON POLICY "Team members can delete any player record" ON team_players IS 'Allows all team members to remove players from the roster';
