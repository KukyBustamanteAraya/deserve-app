-- Migration: Rename all _cents columns to _clp
-- Created: 2025-10-14
-- Purpose: Fix currency naming for Chilean Pesos (CLP has no cent subdivision)
--
-- IMPORTANT: Chilean Pesos (CLP) do not have cents. All amounts are stored
-- as full pesos (e.g., 40000 = $40.000 CLP, not $400.00)
--
-- This migration renames all columns from *_cents to *_clp for clarity and
-- correctness, without changing any data values.

-- =============================================================================
-- 1. PRODUCTS TABLE
-- =============================================================================

ALTER TABLE public.products
RENAME COLUMN price_cents TO price_clp;

ALTER TABLE public.products
RENAME COLUMN base_price_cents TO base_price_clp;

ALTER TABLE public.products
RENAME COLUMN retail_price_cents TO retail_price_clp;

-- Update comments
COMMENT ON COLUMN public.products.price_clp IS 'Custom price per product in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.products.base_price_clp IS 'Base price in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.products.retail_price_clp IS 'Retail price in Chilean Pesos (full pesos, not cents)';

-- =============================================================================
-- 2. ORDERS TABLE
-- =============================================================================

ALTER TABLE public.orders
RENAME COLUMN subtotal_cents TO subtotal_clp;

ALTER TABLE public.orders
RENAME COLUMN discount_cents TO discount_clp;

ALTER TABLE public.orders
RENAME COLUMN tax_cents TO tax_clp;

ALTER TABLE public.orders
RENAME COLUMN shipping_cents TO shipping_clp;

ALTER TABLE public.orders
RENAME COLUMN total_cents TO total_clp;

ALTER TABLE public.orders
RENAME COLUMN total_amount_cents TO total_amount_clp;

-- Update comments
COMMENT ON COLUMN public.orders.subtotal_clp IS 'Order subtotal in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.orders.discount_clp IS 'Discount amount in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.orders.tax_clp IS 'Tax amount in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.orders.shipping_clp IS 'Shipping cost in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.orders.total_clp IS 'Total order amount in Chilean Pesos (full pesos, not cents) - GENERATED column';
COMMENT ON COLUMN public.orders.total_amount_clp IS 'Total amount in Chilean Pesos (full pesos, not cents)';

-- =============================================================================
-- 3. ORDER_ITEMS TABLE
-- =============================================================================

ALTER TABLE public.order_items
RENAME COLUMN unit_price_cents TO unit_price_clp;

ALTER TABLE public.order_items
RENAME COLUMN line_total_cents TO line_total_clp;

-- Update comments
COMMENT ON COLUMN public.order_items.unit_price_clp IS 'Unit price in Chilean Pesos (full pesos, not cents)';
COMMENT ON COLUMN public.order_items.line_total_clp IS 'Line total in Chilean Pesos (full pesos, not cents) - GENERATED column';

-- =============================================================================
-- 4. PAYMENT_CONTRIBUTIONS TABLE
-- =============================================================================

ALTER TABLE public.payment_contributions
RENAME COLUMN amount_cents TO amount_clp;

-- Update comments
COMMENT ON COLUMN public.payment_contributions.amount_clp IS 'Contribution amount in Chilean Pesos (full pesos, not cents)';

-- =============================================================================
-- 5. CHECK FOR GENERATED COLUMNS AND UPDATE IF NEEDED
-- =============================================================================

-- Note: GENERATED columns automatically use the new column names after rename
-- PostgreSQL handles this transparently. No need to recreate them.

-- Verify total_clp in orders table (should be GENERATED ALWAYS AS)
-- Formula: ((subtotal_clp - discount_clp) + tax_clp) + shipping_clp

-- Verify line_total_clp in order_items table (should be GENERATED ALWAYS AS)
-- Formula: unit_price_clp * quantity

-- =============================================================================
-- 6. CHECK IF COMPONENT_PRICING TABLE EXISTS
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'component_pricing'
    AND column_name = 'base_price_cents'
  ) THEN
    ALTER TABLE public.component_pricing RENAME COLUMN base_price_cents TO base_price_clp;
    COMMENT ON COLUMN public.component_pricing.base_price_clp IS 'Base price in Chilean Pesos (full pesos, not cents)';
    RAISE NOTICE 'Renamed component_pricing.base_price_cents to base_price_clp';
  ELSE
    RAISE NOTICE 'component_pricing.base_price_cents does not exist, skipping';
  END IF;
END $$;

-- =============================================================================
-- 7. CHECK IF PRICING_TIERS_PRODUCT TABLE EXISTS
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'pricing_tiers_product'
    AND column_name = 'unit_price'
  ) THEN
    -- Note: unit_price doesn't have _cents suffix, but let's document it correctly
    COMMENT ON COLUMN public.pricing_tiers_product.unit_price IS 'Unit price in Chilean Pesos (full pesos, not cents)';
    RAISE NOTICE 'Updated comment for pricing_tiers_product.unit_price';
  ELSE
    RAISE NOTICE 'pricing_tiers_product.unit_price does not exist, skipping';
  END IF;
END $$;

-- =============================================================================
-- 8. CHECK IF BULK_PAYMENTS TABLE EXISTS
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bulk_payments'
    AND column_name = 'total_amount_cents'
  ) THEN
    ALTER TABLE public.bulk_payments RENAME COLUMN total_amount_cents TO total_amount_clp;
    COMMENT ON COLUMN public.bulk_payments.total_amount_clp IS 'Total amount in Chilean Pesos (full pesos, not cents)';
    RAISE NOTICE 'Renamed bulk_payments.total_amount_cents to total_amount_clp';
  ELSE
    RAISE NOTICE 'bulk_payments.total_amount_cents does not exist, skipping';
  END IF;
END $$;

-- =============================================================================
-- 9. VERIFICATION
-- =============================================================================

-- List all columns that still have '_cents' in their name (should be empty)
DO $$
DECLARE
  cents_column RECORD;
  found_cents BOOLEAN := FALSE;
BEGIN
  FOR cents_column IN
    SELECT table_schema, table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name LIKE '%_cents%'
    ORDER BY table_name, column_name
  LOOP
    RAISE WARNING 'Found column still using _cents: %.%.%',
      cents_column.table_schema,
      cents_column.table_name,
      cents_column.column_name;
    found_cents := TRUE;
  END LOOP;

  IF NOT found_cents THEN
    RAISE NOTICE '✅ SUCCESS: All _cents columns have been renamed to _clp';
  ELSE
    RAISE WARNING '⚠️  Some columns with _cents still exist (see warnings above)';
  END IF;
END $$;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- =============================================================================

-- To rollback this migration, run:
--
-- ALTER TABLE public.products RENAME COLUMN price_clp TO price_cents;
-- ALTER TABLE public.products RENAME COLUMN base_price_clp TO base_price_cents;
-- ALTER TABLE public.products RENAME COLUMN retail_price_clp TO retail_price_cents;
-- ALTER TABLE public.orders RENAME COLUMN subtotal_clp TO subtotal_cents;
-- ALTER TABLE public.orders RENAME COLUMN discount_clp TO discount_cents;
-- ALTER TABLE public.orders RENAME COLUMN tax_clp TO tax_cents;
-- ALTER TABLE public.orders RENAME COLUMN shipping_clp TO shipping_cents;
-- ALTER TABLE public.orders RENAME COLUMN total_clp TO total_cents;
-- ALTER TABLE public.orders RENAME COLUMN total_amount_clp TO total_amount_cents;
-- ALTER TABLE public.order_items RENAME COLUMN unit_price_clp TO unit_price_cents;
-- ALTER TABLE public.order_items RENAME COLUMN line_total_clp TO line_total_cents;
-- ALTER TABLE public.payment_contributions RENAME COLUMN amount_clp TO amount_cents;
-- -- Add other tables if they were renamed

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
