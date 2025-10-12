-- Remove constraint that requires active products to have hero images
-- Products display design mockups, not their own images
-- Migration created: 2025-10-11

-- Drop the constraint if it exists
ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS products_active_needs_hero;

-- Note: The hero_path field remains but is deprecated
-- Products will display design mockups instead of their own images
