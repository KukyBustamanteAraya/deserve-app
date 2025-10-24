-- Allow all team members to create and manage design requests (not just managers)
-- This supports player-run teams where everyone should be able to initiate design requests

-- Drop the restrictive INSERT policy that only allows managers to create design requests
DROP POLICY IF EXISTS "Team managers can create design requests" ON design_requests;

-- Drop the restrictive UPDATE policy that only allows managers to update design requests
DROP POLICY IF EXISTS "Team managers can update design requests" ON design_requests;

-- Allow any team member to create design requests for their team
CREATE POLICY "Team members can create design requests"
  ON design_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Allow any team member to update design requests for their team
CREATE POLICY "Team members can update design requests"
  ON design_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships tm
      WHERE tm.team_id = design_requests.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON POLICY "Team members can create design requests" ON design_requests IS 'Allows all team members to create design requests, not just managers';
COMMENT ON POLICY "Team members can update design requests" ON design_requests IS 'Allows all team members to update design requests for their team';
