-- Migration: Add Order Grouping Fields for Gender Hierarchy
-- Date: 2025-10-20
-- Purpose: Enable order grouping for gender-divided teams (e.g., Varsity Basketball Men + Women)
-- Phase: 1 (Order Grouping UI)
-- Dependencies: Requires institution_sub_teams.gender_category (Phase 0)

-- ========================================================================
-- STEP 1: Add columns to orders table
-- ========================================================================

-- Add division_group column (UUID to link orders from same division)
-- Example: Varsity Basketball Men and Varsity Basketball Women share the same division_group
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS division_group UUID;

-- Add team_gender_category column (denormalized for faster queries)
-- Stores the gender category of the sub-team that placed this order
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS team_gender_category TEXT
CHECK (team_gender_category IN ('male', 'female', 'both'));

-- ========================================================================
-- STEP 2: Create indexes for performance
-- ========================================================================

-- Index for efficient division_group queries
-- Partial index (WHERE division_group IS NOT NULL) saves space since most orders won't have this
CREATE INDEX IF NOT EXISTS idx_orders_division_group
ON orders(division_group)
WHERE division_group IS NOT NULL;

-- Index for filtering by gender category
CREATE INDEX IF NOT EXISTS idx_orders_team_gender_category
ON orders(team_gender_category)
WHERE team_gender_category IS NOT NULL;

-- ========================================================================
-- STEP 3: Add column comments for documentation
-- ========================================================================

COMMENT ON COLUMN orders.division_group IS
'Links orders from gender-divided teams (e.g., Varsity Basketball Men + Women share same division_group UUID). NULL for single-gender teams and non-institution orders.';

COMMENT ON COLUMN orders.team_gender_category IS
'Gender category of the sub-team that placed this order: male, female, or both (co-ed). Denormalized from institution_sub_teams.gender_category for faster queries and historical tracking.';

-- ========================================================================
-- STEP 4: Verification
-- ========================================================================

-- Verify columns were added
DO $$
BEGIN
  -- Check division_group column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
      AND column_name = 'division_group'
  ) THEN
    RAISE NOTICE 'SUCCESS: division_group column added to orders table';
  ELSE
    RAISE EXCEPTION 'FAILED: division_group column was not added';
  END IF;

  -- Check team_gender_category column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'orders'
      AND column_name = 'team_gender_category'
  ) THEN
    RAISE NOTICE 'SUCCESS: team_gender_category column added to orders table';
  ELSE
    RAISE EXCEPTION 'FAILED: team_gender_category column was not added';
  END IF;

  -- Check indexes were created
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'orders'
      AND indexname = 'idx_orders_division_group'
  ) THEN
    RAISE NOTICE 'SUCCESS: idx_orders_division_group index created';
  ELSE
    RAISE EXCEPTION 'FAILED: idx_orders_division_group index was not created';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'orders'
      AND indexname = 'idx_orders_team_gender_category'
  ) THEN
    RAISE NOTICE 'SUCCESS: idx_orders_team_gender_category index created';
  ELSE
    RAISE EXCEPTION 'FAILED: idx_orders_team_gender_category index was not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully - Orders table ready for gender hierarchy grouping';
END $$;

-- ========================================================================
-- NOTES FOR FUTURE REFERENCE
-- ========================================================================

/*
USAGE EXAMPLE:

When creating orders from design requests:

1. Fetch sub_team data:
   SELECT gender_category, division_group FROM institution_sub_teams WHERE id = sub_team_id;

2. Copy to order:
   INSERT INTO orders (
     ...,
     division_group,
     team_gender_category
   ) VALUES (
     ...,
     sub_team.division_group,  -- UUID or NULL
     sub_team.gender_category  -- 'male' | 'female' | 'both'
   );

3. Query grouped orders:
   SELECT *
   FROM orders
   WHERE team_id = institution_id
     AND division_group IS NOT NULL
   ORDER BY division_group, team_gender_category;

BACKWARD COMPATIBILITY:
- All existing orders will have division_group = NULL and team_gender_category = NULL
- This is correct behavior (they're from before gender hierarchy was implemented)
- UI should handle NULL gracefully by showing orders without grouping
*/
