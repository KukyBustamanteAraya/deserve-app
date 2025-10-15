-- Migration: Enhance Orders for Multi-Product Support
-- Created: 2025-10-14
-- Purpose: Add fields to support multiple products per order with dynamic assembly

-- =============================================================================
-- 1. Enhance orders table with order number and modification control
-- =============================================================================

-- Add order_number for grouping orders (human-readable identifier)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Add can_modify flag to control if products can be added to order
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS can_modify BOOLEAN DEFAULT true;

-- Add locked_at timestamp to track when order was locked for shipping
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Create index on order_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

-- Create index on can_modify for filtering modifiable orders
CREATE INDEX IF NOT EXISTS idx_orders_can_modify ON public.orders(can_modify) WHERE can_modify = true;

-- =============================================================================
-- 2. Enhance order_items table with design_request linkage
-- =============================================================================

-- Add design_request_id to directly link order items to design requests
ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS design_request_id BIGINT REFERENCES public.design_requests(id) ON DELETE SET NULL;

-- Create index on design_request_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_order_items_design_request_id ON public.order_items(design_request_id);

-- =============================================================================
-- 3. Add order lifecycle tracking to design_requests
-- =============================================================================

-- Add order_stage to track design request progress through order lifecycle
ALTER TABLE public.design_requests
ADD COLUMN IF NOT EXISTS order_stage TEXT DEFAULT 'design_phase'
  CHECK (order_stage IN ('design_phase', 'pending_order', 'in_order', 'order_locked'));

-- Create index on order_stage for filtering
CREATE INDEX IF NOT EXISTS idx_design_requests_order_stage ON public.design_requests(order_stage);

-- =============================================================================
-- 4. Create function to generate order numbers
-- =============================================================================

-- Function to generate sequential order numbers (ORD-YYYYMMDD-XXXX format)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
  new_order_number TEXT;
BEGIN
  -- Get today's date in YYYYMMDD format
  date_prefix := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD');

  -- Count existing orders with today's prefix
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE date_prefix || '%';

  -- Generate order number with 4-digit sequence
  new_order_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. Create trigger to auto-generate order numbers
-- =============================================================================

-- Function to set order number on insert if not provided
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- =============================================================================
-- 6. Create function to lock order (prevent modifications)
-- =============================================================================

-- Function to lock an order and all related design requests
CREATE OR REPLACE FUNCTION public.lock_order(order_id_param UUID)
RETURNS VOID AS $$
BEGIN
  -- Lock the order
  UPDATE public.orders
  SET can_modify = false,
      locked_at = NOW()
  WHERE id = order_id_param;

  -- Update all design requests linked to this order
  UPDATE public.design_requests
  SET order_stage = 'order_locked'
  WHERE order_id = order_id_param;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. Create function to add product to order
-- =============================================================================

-- Function to add a design request (product) to an existing order
CREATE OR REPLACE FUNCTION public.add_product_to_order(
  design_request_id_param BIGINT,
  order_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  order_can_modify BOOLEAN;
  order_locked TIMESTAMPTZ;
BEGIN
  -- Check if order can be modified
  SELECT can_modify, locked_at INTO order_can_modify, order_locked
  FROM public.orders
  WHERE id = order_id_param;

  -- Raise exception if order is locked
  IF order_can_modify = false OR order_locked IS NOT NULL THEN
    RAISE EXCEPTION 'Order is locked and cannot be modified';
  END IF;

  -- Update the design request
  UPDATE public.design_requests
  SET order_id = order_id_param,
      order_stage = 'in_order'
  WHERE id = design_request_id_param;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. Create view for order overview with product count
-- =============================================================================

CREATE OR REPLACE VIEW public.order_overview AS
SELECT
  o.id,
  o.order_number,
  o.team_id,
  o.status,
  o.payment_status,
  o.payment_mode,
  o.total_cents,
  o.can_modify,
  o.locked_at,
  o.created_at,
  o.updated_at,
  o.shipped_at,
  o.delivered_at,

  -- Aggregate product counts
  COUNT(DISTINCT oi.id) as item_count,
  COUNT(DISTINCT oi.design_request_id) as product_count,

  -- Aggregate design requests
  COUNT(DISTINCT dr.id) as design_request_count,

  -- Team info
  t.name as team_name,
  t.slug as team_slug,
  t.logo_url as team_logo_url

FROM public.orders o
LEFT JOIN public.order_items oi ON oi.order_id = o.id
LEFT JOIN public.design_requests dr ON dr.order_id = o.id
LEFT JOIN public.teams t ON t.id = o.team_id
GROUP BY o.id, t.name, t.slug, t.logo_url;

-- =============================================================================
-- 9. Add RLS policies for new fields (inherit from existing orders policies)
-- =============================================================================

-- Note: RLS policies are already set on orders, order_items, and design_requests tables
-- The new columns will automatically inherit the existing policies

-- =============================================================================
-- 10. Update existing orders with order numbers
-- =============================================================================

-- Generate order numbers for existing orders that don't have one
UPDATE public.orders
SET order_number = public.generate_order_number()
WHERE order_number IS NULL;

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================

-- Summary of changes:
-- ✅ Added order_number to orders table
-- ✅ Added can_modify flag to orders table
-- ✅ Added locked_at timestamp to orders table
-- ✅ Added design_request_id to order_items table
-- ✅ Added order_stage to design_requests table
-- ✅ Created generate_order_number() function
-- ✅ Created trigger to auto-generate order numbers
-- ✅ Created lock_order() function
-- ✅ Created add_product_to_order() function
-- ✅ Created order_overview view
-- ✅ Updated existing orders with order numbers
