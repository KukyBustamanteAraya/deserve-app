-- Migration: Add Enhanced Profile Fields
-- Date: 2025-01-18
-- Purpose: Add user_type, athletic_profile, manager_profile, and preferences to profiles table
-- Part of: Enhanced Profile System + Player Confirmation Integration
-- Dependencies: Requires 20251017_add_player_confirmation_tracking.sql

-- ============================================================================
-- STEP 1: Add user_type column
-- ============================================================================
-- Note: We use 'user_type' instead of 'role' because profiles.role is already
-- an enum type used for customer/admin/manufacturer distinction

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS user_type TEXT
  CHECK (user_type IS NULL OR user_type IN ('player', 'manager', 'athletic_director', 'hybrid'));

-- ============================================================================
-- STEP 2: Add athletic_profile column
-- ============================================================================
-- Purpose: Store player default preferences for form pre-filling
-- NOT used directly in order creation - only for convenience
-- Order creation uses player_info_submissions (confirmed data)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS athletic_profile JSONB
  DEFAULT '{}'::jsonb;

-- ============================================================================
-- STEP 3: Add manager_profile column
-- ============================================================================
-- Purpose: Store manager/athletic director organization info

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS manager_profile JSONB
  DEFAULT '{}'::jsonb;

-- ============================================================================
-- STEP 4: Add preferences column
-- ============================================================================
-- Purpose: Store user app preferences (notifications, language, etc)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB
  DEFAULT '{"notifications": {"email": true}, "language": "es"}'::jsonb;

-- ============================================================================
-- STEP 5: Add indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_user_type
  ON profiles(user_type)
  WHERE user_type IS NOT NULL;

-- ============================================================================
-- STEP 6: Add column comments (documentation)
-- ============================================================================

COMMENT ON COLUMN profiles.user_type IS
  'User type classification: player, manager, athletic_director, or hybrid. Separate from role enum.';

COMMENT ON COLUMN profiles.athletic_profile IS
  'Player default preferences - USED FOR FORM PRE-FILLING ONLY. Not source of truth for orders. Schema: {default_size, default_positions[], preferred_jersey_number, fabric_preferences{}, measurements{}}';

COMMENT ON COLUMN profiles.manager_profile IS
  'Manager/AD profile info - organization details, shipping, billing. Schema: {organization_name, organization_type, shipping_addresses[], billing_info{}, primary_contact{}}';

COMMENT ON COLUMN profiles.preferences IS
  'User app preferences. Schema: {notifications{email, push, sms}, language, theme}';

-- ============================================================================
-- STEP 7: Create validation function for athletic_profile JSON schema
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_athletic_profile(profile_data jsonb)
RETURNS boolean AS $$
BEGIN
  -- Allow empty object
  IF profile_data = '{}'::jsonb THEN
    RETURN true;
  END IF;

  -- Validate default_size if present
  IF profile_data ? 'default_size' THEN
    IF NOT (profile_data->>'default_size' IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL')) THEN
      RAISE EXCEPTION 'Invalid default_size in athletic_profile';
    END IF;
  END IF;

  -- Validate default_positions is array if present
  IF profile_data ? 'default_positions' THEN
    IF jsonb_typeof(profile_data->'default_positions') != 'array' THEN
      RAISE EXCEPTION 'default_positions must be an array';
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_athletic_profile IS
  'Validates athletic_profile JSONB structure before insert/update';

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to confirm)
-- ============================================================================

-- Check columns were added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- AND column_name IN ('user_type', 'athletic_profile', 'manager_profile', 'preferences');

-- Check indexes were created
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'profiles'
-- AND indexname LIKE '%user_type%';

-- Check comments were added
-- SELECT column_name, col_description('profiles'::regclass, ordinal_position)
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- AND column_name IN ('user_type', 'athletic_profile', 'manager_profile', 'preferences');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
