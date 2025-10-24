-- Migration: Add Bulk Order Support for Multi-Team Design Requests
-- Date: 2025-10-20
-- Purpose: Enable Athletic Directors to create bulk orders across multiple teams/sports
-- Phase: Institution Wizard Revamp - Phase 1
-- Dependencies: Requires design_requests table

-- ========================================================================
-- STEP 1: Add columns to design_requests table
-- ========================================================================

-- Add bulk_order_id column (UUID to link design requests from same bulk order)
-- Example: Athletic Director orders for 4 teams at once - all 4 design_requests share the same bulk_order_id
ALTER TABLE design_requests
ADD COLUMN IF NOT EXISTS bulk_order_id UUID;

-- Add is_part_of_bulk column (flag to indicate if this request is part of a bulk order)
-- TRUE = part of a bulk order submission
-- FALSE/NULL = single-team design request (default behavior)
ALTER TABLE design_requests
ADD COLUMN IF NOT EXISTS is_part_of_bulk BOOLEAN DEFAULT FALSE;

-- ========================================================================
-- STEP 2: Create indexes for performance
-- ========================================================================

-- Index for efficient bulk_order_id queries
-- Used when fetching all design requests in a bulk order
-- Partial index (WHERE bulk_order_id IS NOT NULL) saves space since most requests won't be bulk
CREATE INDEX IF NOT EXISTS idx_design_requests_bulk_order
ON design_requests(bulk_order_id)
WHERE bulk_order_id IS NOT NULL;

-- Composite index for team + bulk order queries
-- Used in admin dashboard to group requests by institution and bulk order
CREATE INDEX IF NOT EXISTS idx_design_requests_team_bulk
ON design_requests(team_id, bulk_order_id)
WHERE bulk_order_id IS NOT NULL;

-- ========================================================================
-- STEP 3: Add column comments for documentation
-- ========================================================================

COMMENT ON COLUMN design_requests.bulk_order_id IS
'Links design requests created together in a bulk submission. When an Athletic Director selects multiple teams/sports, all resulting design_requests share the same bulk_order_id UUID. NULL for single-team requests.';

COMMENT ON COLUMN design_requests.is_part_of_bulk IS
'Flag indicating if this design request is part of a multi-team bulk order. TRUE = part of bulk submission, FALSE/NULL = single team request. Used for UI grouping and analytics.';

-- ========================================================================
-- STEP 4: Verification
-- ========================================================================

DO $$
BEGIN
  -- Check bulk_order_id column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'design_requests'
      AND column_name = 'bulk_order_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: bulk_order_id column added to design_requests table';
  ELSE
    RAISE EXCEPTION 'FAILED: bulk_order_id column was not added';
  END IF;

  -- Check is_part_of_bulk column
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'design_requests'
      AND column_name = 'is_part_of_bulk'
  ) THEN
    RAISE NOTICE 'SUCCESS: is_part_of_bulk column added to design_requests table';
  ELSE
    RAISE EXCEPTION 'FAILED: is_part_of_bulk column was not added';
  END IF;

  -- Check indexes were created
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'design_requests'
      AND indexname = 'idx_design_requests_bulk_order'
  ) THEN
    RAISE NOTICE 'SUCCESS: idx_design_requests_bulk_order index created';
  ELSE
    RAISE EXCEPTION 'FAILED: idx_design_requests_bulk_order index was not created';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE tablename = 'design_requests'
      AND indexname = 'idx_design_requests_team_bulk'
  ) THEN
    RAISE NOTICE 'SUCCESS: idx_design_requests_team_bulk index created';
  ELSE
    RAISE EXCEPTION 'FAILED: idx_design_requests_team_bulk index was not created';
  END IF;

  RAISE NOTICE '✅ Migration completed successfully - design_requests table ready for bulk orders';
END $$;

-- ========================================================================
-- NOTES FOR FUTURE REFERENCE
-- ========================================================================

/*
USAGE EXAMPLE:

When creating a bulk order from the wizard:

1. Generate a bulk_order_id:
   const bulkOrderId = crypto.randomUUID();

2. Create multiple design_requests (one per team):
   INSERT INTO design_requests (
     team_id,
     sub_team_id,
     user_id,
     sport_slug,
     selected_apparel,
     primary_color,
     secondary_color,
     accent_color,
     status,
     bulk_order_id,       -- Same UUID for all teams in the bulk order
     is_part_of_bulk      -- TRUE
   ) VALUES
     ('inst-123', 'team-soccer-men', 'user-456', 'soccer', [...], '#e21c21', '#fff', '#000', 'pending', bulkOrderId, TRUE),
     ('inst-123', 'team-soccer-women', 'user-456', 'soccer', [...], '#e21c21', '#fff', '#ff1493', 'pending', bulkOrderId, TRUE),
     ('inst-123', 'team-basketball-men', 'user-456', 'basketball', [...], '#e21c21', '#fff', '#000', 'pending', bulkOrderId, TRUE),
     ('inst-123', 'team-basketball-women', 'user-456', 'basketball', [...], '#e21c21', '#fff', '#000', 'pending', bulkOrderId, TRUE);

3. Query all design requests in a bulk order:
   SELECT *
   FROM design_requests
   WHERE bulk_order_id = 'specific-bulk-order-uuid'
   ORDER BY created_at;

4. Query all bulk orders for an institution:
   SELECT bulk_order_id, COUNT(*) as team_count, MIN(created_at) as ordered_at
   FROM design_requests
   WHERE team_id = 'inst-123'
     AND bulk_order_id IS NOT NULL
   GROUP BY bulk_order_id
   ORDER BY ordered_at DESC;

ADMIN WORKFLOW:
- Each design_request appears as a separate card in the admin dashboard
- Cards with the same bulk_order_id can be visually grouped
- Admin can approve/upload mockups for each team independently
- Athletic Director sees all their submitted requests (grouped by bulk_order_id in UI)

BACKWARD COMPATIBILITY:
- All existing design_requests will have bulk_order_id = NULL and is_part_of_bulk = FALSE
- This is correct behavior (they're single-team requests from before bulk ordering was implemented)
- UI should handle NULL gracefully by showing requests without bulk grouping
- APIs should accept both single-team and multi-team payloads

DATA INTEGRITY:
- No foreign key constraints on bulk_order_id (it's just a grouping UUID)
- bulk_order_id can be NULL (single-team requests)
- is_part_of_bulk defaults to FALSE for backward compatibility
- Deleting one design_request in a bulk order does NOT affect others (no CASCADE)
*/
