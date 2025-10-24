-- Check what design requests exist for the "gays" team
SELECT
  dr.id,
  dr.team_id,
  dr.status,
  dr.created_at,
  dr.requested_by,
  t.name as team_name
FROM design_requests dr
JOIN teams t ON t.id = dr.team_id
WHERE dr.team_id = '43f516d0-03db-4958-b16a-234c2d6f8611'
ORDER BY dr.created_at DESC;

-- Also check if there are any player submissions linked to non-existent design requests
SELECT
  pis.id,
  pis.team_id,
  pis.design_request_id,
  pis.player_name,
  t.name as team_name
FROM player_info_submissions pis
JOIN teams t ON t.id = pis.team_id
WHERE pis.team_id = '43f516d0-03db-4958-b16a-234c2d6f8611';
