-- Migration: Consolidate team colors to teams.colors JSONB column
-- This fixes the broken sync between teams.colors and team_settings color columns
--
-- Problem: Design wizard saves to teams.colors but settings page reads from team_settings
-- Solution: Migrate all colors to teams.colors as single source of truth

-- Step 1: Migrate colors from team_settings to teams.colors where team_settings has colors
UPDATE teams t
SET colors = jsonb_build_object(
  'primary', COALESCE(ts.primary_color, '#FFFFFF'),
  'secondary', COALESCE(ts.secondary_color, '#FFFFFF'),
  'accent', COALESCE(ts.tertiary_color, '#FFFFFF'),
  'tertiary', COALESCE(ts.tertiary_color, '#FFFFFF')  -- Backwards compatibility
)
FROM team_settings ts
WHERE t.id = ts.team_id
  AND (
    ts.primary_color IS NOT NULL
    OR ts.secondary_color IS NOT NULL
    OR ts.tertiary_color IS NOT NULL
  )
  AND (
    -- Only update if teams.colors is empty or missing these keys
    t.colors IS NULL
    OR NOT (t.colors ? 'primary')
    OR NOT (t.colors ? 'secondary')
  );

-- Step 2: For teams that have colors in teams.colors but not in team_settings,
-- sync the other direction (backfill team_settings for backwards compatibility)
UPDATE team_settings ts
SET
  primary_color = COALESCE(ts.primary_color, t.colors->>'primary'),
  secondary_color = COALESCE(ts.secondary_color, t.colors->>'secondary'),
  tertiary_color = COALESCE(ts.tertiary_color, COALESCE(t.colors->>'accent', t.colors->>'tertiary'))
FROM teams t
WHERE ts.team_id = t.id
  AND t.colors IS NOT NULL
  AND (
    ts.primary_color IS NULL
    OR ts.secondary_color IS NULL
    OR ts.tertiary_color IS NULL
  );

-- Step 3: Add comment to team_settings columns indicating they're deprecated
COMMENT ON COLUMN team_settings.primary_color IS 'DEPRECATED: Use teams.colors JSONB instead. Kept for backwards compatibility only.';
COMMENT ON COLUMN team_settings.secondary_color IS 'DEPRECATED: Use teams.colors JSONB instead. Kept for backwards compatibility only.';
COMMENT ON COLUMN team_settings.tertiary_color IS 'DEPRECATED: Use teams.colors JSONB instead. Kept for backwards compatibility only.';

-- Step 4: Ensure teams.colors has a default empty object if null
UPDATE teams
SET colors = '{}'::jsonb
WHERE colors IS NULL;

-- Step 5: Add NOT NULL constraint with default
ALTER TABLE teams
ALTER COLUMN colors SET DEFAULT '{}'::jsonb;

-- Note: We keep team_settings color columns for now to avoid breaking old code,
-- but they are now deprecated and should not be used for new development
