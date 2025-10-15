-- Add branding customization columns to team_settings
-- This allows team managers to customize colors, logo, and banner

-- Add color columns for team branding
ALTER TABLE team_settings
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS tertiary_color TEXT;

-- Add image URL columns for team branding assets
ALTER TABLE team_settings
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN team_settings.primary_color IS 'Primary brand color for team (hex format, e.g., #e21c21)';
COMMENT ON COLUMN team_settings.secondary_color IS 'Secondary brand color for team (hex format)';
COMMENT ON COLUMN team_settings.tertiary_color IS 'Tertiary brand color for team (hex format)';
COMMENT ON COLUMN team_settings.logo_url IS 'URL to team logo image in Supabase Storage';
COMMENT ON COLUMN team_settings.banner_url IS 'URL to team banner image in Supabase Storage';
