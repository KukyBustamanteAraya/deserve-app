-- ============================================================================
-- Migration: Add sport_ids array column to products table
-- Date: 2025-10-11
-- Purpose: Allow products to support multiple sports instead of just one
-- ============================================================================

-- Step 1: Add new sport_ids column as an array of bigint
ALTER TABLE public.products
ADD COLUMN sport_ids bigint[];

-- Step 2: Migrate existing data from sport_id to sport_ids
-- Convert single sport_id to array format
UPDATE public.products
SET sport_ids = ARRAY[sport_id]
WHERE sport_id IS NOT NULL;

-- Step 3: Add index on sport_ids for efficient querying
CREATE INDEX idx_products_sport_ids ON public.products USING GIN (sport_ids);

-- Step 4: Add check constraint to ensure sport_ids is not empty
ALTER TABLE public.products
ADD CONSTRAINT products_sport_ids_not_empty CHECK (array_length(sport_ids, 1) > 0);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN public.products.sport_ids IS 'Array of sport IDs that this product is available for. Allows products to span multiple sports (e.g., Team Hoodie for all sports, or Rugby Jersey only for rugby).';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- - The old sport_id column is kept for backward compatibility
-- - You can drop sport_id later once all code is updated to use sport_ids
-- - To drop sport_id in the future, run: ALTER TABLE products DROP COLUMN sport_id;
--
-- Example queries with sport_ids:
--
-- Get all products for soccer (sport_id = 1):
--   SELECT * FROM products WHERE 1 = ANY(sport_ids);
--
-- Get products available for multiple sports:
--   SELECT * FROM products WHERE array_length(sport_ids, 1) > 1;
--
-- Get products for soccer OR basketball (1 or 2):
--   SELECT * FROM products WHERE sport_ids && ARRAY[1, 2];
-- ============================================================================
