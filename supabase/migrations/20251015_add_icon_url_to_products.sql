-- ============================================================================
-- Migration: Add icon_url column to products table
-- Date: 2025-10-15
-- Purpose: Store product symbol/icon URLs for use in product selection grids
-- ============================================================================

-- Step 1: Add icon_url column to products table
ALTER TABLE public.products
ADD COLUMN icon_url text;

-- Step 2: Add comment for documentation
COMMENT ON COLUMN public.products.icon_url IS 'URL to product symbol/icon image. Used in product selection grids throughout the application. Unlike hero images which display design mockups, icons represent the product type itself (e.g., jersey icon, shorts icon).';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- - icon_url is nullable as not all products may have custom icons initially
-- - Icons are stored in Supabase Storage, similar to sport icons
-- - These icons replace emoji placeholders in product selection grids
-- - Examples: jersey icon, shorts icon, hoodie icon, socks icon, etc.
-- ============================================================================
