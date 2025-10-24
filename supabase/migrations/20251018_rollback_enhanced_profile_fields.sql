-- ROLLBACK: Enhanced Profile Fields Migration
-- Date: 2025-01-18
-- Purpose: Reverse 20251018_add_enhanced_profile_fields.sql migration
-- WARNING: This will DELETE all user profile data (user_type, athletic_profile, manager_profile, preferences)
-- Only run this if you need to completely reverse the enhanced profile system

-- ============================================================================
-- BACKUP REMINDER
-- ============================================================================
-- Before running this rollback, ensure you have a backup:
-- pg_dump deserve_production > backup_before_rollback_$(date +%Y%m%d_%H%M%S).sql

-- ============================================================================
-- STEP 1: Drop validation function
-- ============================================================================

DROP FUNCTION IF EXISTS validate_athletic_profile(jsonb);

-- ============================================================================
-- STEP 2: Drop indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_profiles_user_type;

-- ============================================================================
-- STEP 3: Drop columns (DATA WILL BE LOST)
-- ============================================================================

-- Remove preferences column
ALTER TABLE profiles DROP COLUMN IF EXISTS preferences;

-- Remove manager_profile column
ALTER TABLE profiles DROP COLUMN IF EXISTS manager_profile;

-- Remove athletic_profile column
ALTER TABLE profiles DROP COLUMN IF EXISTS athletic_profile;

-- Remove user_type column
ALTER TABLE profiles DROP COLUMN IF EXISTS user_type;

-- ============================================================================
-- VERIFICATION QUERIES (Run after rollback to confirm)
-- ============================================================================

-- Check columns were removed
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
-- AND column_name IN ('user_type', 'athletic_profile', 'manager_profile', 'preferences');
-- Expected result: 0 rows

-- Check indexes were removed
-- SELECT indexname
-- FROM pg_indexes
-- WHERE tablename = 'profiles'
-- AND indexname LIKE '%user_type%';
-- Expected result: 0 rows

-- ============================================================================
-- POST-ROLLBACK ACTIONS REQUIRED
-- ============================================================================

-- 1. Update any API routes that reference these columns
-- 2. Update frontend components that use profile data
-- 3. Disable ENABLE_ENHANCED_PROFILES feature flag
-- 4. Notify users that enhanced profiles have been disabled

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
