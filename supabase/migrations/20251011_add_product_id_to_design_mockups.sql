-- Add product_id column to design_mockups table
-- This allows design mockups to be associated with specific products (not just generic product types)
-- Migration created: 2025-10-11

-- Add product_id column (nullable for backward compatibility with existing mockups)
-- Note: products.id is bigint, not uuid
ALTER TABLE public.design_mockups
ADD COLUMN product_id bigint REFERENCES public.products(id) ON DELETE SET NULL;

-- Add index for efficient queries
CREATE INDEX idx_design_mockups_product_id ON public.design_mockups(product_id);

-- Notes:
-- - product_id is optional (NULL) for backward compatibility
-- - Keep product_type_slug for existing mockups that don't have a linked product
-- - New mockups should always link to a specific product via product_id
-- - products.id is bigint (auto-incrementing), not uuid
