-- Migration: 031_order_status_workflow.sql
-- Description: Implement comprehensive order status workflow
-- Date: 2025-10-08

-- Update orders table with expanded status options
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pending',           -- Order created, awaiting payment
    'paid',              -- Payment received
    'design_review',     -- Design mockups ready for customer approval
    'design_approved',   -- Customer approved the design
    'design_changes',    -- Customer requested changes
    'production',        -- In production/manufacturing
    'quality_check',     -- Quality control
    'shipped',           -- Order shipped
    'delivered'          -- Order delivered to customer
  ));

-- Update payment_status options
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN (
    'unpaid',            -- No payment received
    'partial',           -- Partial payment (split payments)
    'paid',              -- Fully paid
    'refunded'           -- Payment refunded
  ));

-- Add new columns for tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS design_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS production_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS carrier TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE,
  ADD COLUMN IF NOT EXISTS customer_notes TEXT,
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Create order status history table for audit trail
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id
  ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at
  ON public.order_status_history(created_at DESC);

-- RLS for order_status_history
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Team members can read their order history
CREATE POLICY "order_history_team_read" ON public.order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.team_memberships tm ON tm.team_id = o.team_id
      WHERE o.id = order_status_history.order_id
      AND tm.user_id = auth.uid()
    )
  );

-- Only admins can insert/update order history
CREATE POLICY "order_history_admin_write" ON public.order_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (
      NEW.id,
      NEW.status,
      auth.uid(),
      'Status changed from ' || COALESCE(OLD.status, 'null') || ' to ' || NEW.status
    );

    -- Update status timestamp
    NEW.status_updated_at = NOW();

    -- Update specific timestamps based on status
    CASE NEW.status
      WHEN 'design_approved' THEN
        NEW.design_approved_at = NOW();
      WHEN 'production' THEN
        NEW.production_started_at = NOW();
      WHEN 'shipped' THEN
        NEW.shipped_at = NOW();
      WHEN 'delivered' THEN
        NEW.delivered_at = NOW();
      ELSE
        -- Do nothing for other statuses
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic status logging
DROP TRIGGER IF EXISTS trg_log_order_status_change ON public.orders;
CREATE TRIGGER trg_log_order_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Update existing orders to have initial status history
INSERT INTO public.order_status_history (order_id, status, notes, created_at)
SELECT
  id,
  status,
  'Initial status recorded during migration',
  created_at
FROM public.orders
ON CONFLICT DO NOTHING;

-- Add helpful comments
COMMENT ON TABLE public.order_status_history IS 'Tracks all status changes for orders, providing an audit trail';
COMMENT ON COLUMN public.orders.status IS 'Current order status: pending → paid → design_review → design_approved → production → quality_check → shipped → delivered';
COMMENT ON COLUMN public.orders.tracking_number IS 'Shipping tracking number from carrier';
COMMENT ON COLUMN public.orders.carrier IS 'Shipping carrier (e.g., Chilexpress, Correos Chile, Starken)';
