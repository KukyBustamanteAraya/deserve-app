-- ============================================================================
-- SECURITY WARNINGS FIX - Supabase Security Advisor
-- ============================================================================
-- Generated: 2025-01-23
-- Priority: MEDIUM/LOW
--
-- This migration addresses WARN-level security issues from Supabase
-- Security Advisor. These are less critical than errors but should still
-- be addressed for best security practices.
-- ============================================================================

-- ============================================================================
-- PART 1: MOVE EXTENSIONS OUT OF PUBLIC SCHEMA
-- ============================================================================
-- Issue: extension_in_public - unaccent and btree_gist in public schema
--
-- Extensions should be in the 'extensions' schema for better security
-- and organization. This prevents namespace pollution and potential conflicts.
-- ============================================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move unaccent extension
-- Note: We need to drop and recreate because PostgreSQL doesn't support
-- moving extensions between schemas directly
DROP EXTENSION IF EXISTS unaccent CASCADE;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Move btree_gist extension
DROP EXTENSION IF EXISTS btree_gist CASCADE;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Check extensions are in correct schema:
-- SELECT extname, nspname
-- FROM pg_extension e
-- JOIN pg_namespace n ON e.extnamespace = n.oid
-- WHERE extname IN ('unaccent', 'btree_gist');
--
-- Expected result: Both should be in 'extensions' schema
-- ============================================================================

COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions - moved from public for security (2025-01-23)';
