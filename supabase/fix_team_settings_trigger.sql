-- Fix team_settings trigger function to work with search_path = ''
-- The function was broken by the security fixes that set search_path = ''

DROP FUNCTION IF EXISTS public.create_team_settings_for_new_team() CASCADE;

CREATE OR REPLACE FUNCTION public.create_team_settings_for_new_team()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new row in team_settings with the new team's ID
  -- IMPORTANT: Use public. prefix since search_path = ''
  INSERT INTO public.team_settings (team_id)
  VALUES (NEW.id)
  ON CONFLICT (team_id) DO NOTHING;  -- Don't error if settings already exist

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Recreate trigger
DROP TRIGGER IF EXISTS create_team_settings_trigger ON public.teams;

CREATE TRIGGER create_team_settings_trigger
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.create_team_settings_for_new_team();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_team_settings_for_new_team() TO authenticated, anon, service_role;

-- Test that it works by checking the trigger exists
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'create_team_settings_trigger';
