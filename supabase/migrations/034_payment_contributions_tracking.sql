-- Migration: 034_payment_contributions_tracking.sql
-- Description: Track individual payment contributions for split payments
-- Date: 2025-10-08

-- Enhance payment_contributions table (already exists from earlier migration)
-- Add tracking fields if they don't exist
ALTER TABLE public.payment_contributions
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'paid', 'failed', 'refunded')
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_contributions_order_id
  ON public.payment_contributions(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_contributions_user_id
  ON public.payment_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_contributions_status
  ON public.payment_contributions(payment_status);

-- View to see payment progress for orders
CREATE OR REPLACE VIEW public.order_payment_progress AS
SELECT
  o.id AS order_id,
  o.team_id,
  o.total_amount_cents,
  o.payment_status AS order_payment_status,

  -- Count of contributions
  COUNT(pc.id) AS total_contributions,
  COUNT(pc.id) FILTER (WHERE pc.payment_status = 'paid') AS paid_contributions,
  COUNT(pc.id) FILTER (WHERE pc.payment_status = 'pending') AS pending_contributions,

  -- Sum of amounts
  COALESCE(SUM(pc.amount_cents), 0) AS total_contributed_cents,
  COALESCE(SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'paid'), 0) AS total_paid_cents,
  COALESCE(SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'pending'), 0) AS total_pending_cents,

  -- Progress percentage
  CASE
    WHEN o.total_amount_cents > 0 THEN
      ROUND((COALESCE(SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'paid'), 0)::NUMERIC / o.total_amount_cents::NUMERIC * 100), 2)
    ELSE 0
  END AS payment_progress_percentage,

  -- Contributors list
  json_agg(
    json_build_object(
      'user_id', pc.user_id,
      'amount_cents', pc.amount_cents,
      'payment_status', pc.payment_status,
      'paid_at', pc.paid_at,
      'created_at', pc.created_at
    ) ORDER BY pc.created_at
  ) FILTER (WHERE pc.id IS NOT NULL) AS contributions

FROM public.orders o
LEFT JOIN public.payment_contributions pc ON pc.order_id = o.id
GROUP BY o.id, o.team_id, o.total_amount_cents, o.payment_status;

-- Grant access to view
GRANT SELECT ON public.order_payment_progress TO authenticated;

-- Function to update order payment status based on contributions
CREATE OR REPLACE FUNCTION update_order_payment_status()
RETURNS TRIGGER AS $$
DECLARE
  total_paid_cents INT;
  order_total_cents INT;
BEGIN
  -- Get the order's total amount
  SELECT total_amount_cents INTO order_total_cents
  FROM public.orders
  WHERE id = NEW.order_id;

  -- Calculate total paid so far
  SELECT COALESCE(SUM(amount_cents), 0) INTO total_paid_cents
  FROM public.payment_contributions
  WHERE order_id = NEW.order_id
  AND payment_status = 'paid';

  -- Update order payment status
  IF total_paid_cents >= order_total_cents THEN
    -- Fully paid
    UPDATE public.orders
    SET
      payment_status = 'paid',
      status = CASE
        WHEN status = 'pending' THEN 'paid'
        ELSE status
      END
    WHERE id = NEW.order_id;
  ELSIF total_paid_cents > 0 THEN
    -- Partially paid
    UPDATE public.orders
    SET payment_status = 'partial'
    WHERE id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update order payment status
DROP TRIGGER IF EXISTS trg_update_order_payment_status ON public.payment_contributions;
CREATE TRIGGER trg_update_order_payment_status
  AFTER INSERT OR UPDATE ON public.payment_contributions
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION update_order_payment_status();

-- Function to create contribution records for team members
CREATE OR REPLACE FUNCTION create_split_payment_contributions(
  p_order_id UUID,
  p_team_id UUID
)
RETURNS void AS $$
DECLARE
  v_member RECORD;
  v_member_count INT;
  v_amount_per_member INT;
  v_total_amount INT;
  v_remainder INT;
BEGIN
  -- Get order total
  SELECT total_amount_cents INTO v_total_amount
  FROM public.orders
  WHERE id = p_order_id;

  -- Count team members
  SELECT COUNT(*) INTO v_member_count
  FROM public.team_memberships
  WHERE team_id = p_team_id;

  -- Calculate amount per member
  v_amount_per_member := v_total_amount / v_member_count;
  v_remainder := v_total_amount % v_member_count;

  -- Create contribution records
  FOR v_member IN
    SELECT user_id FROM public.team_memberships WHERE team_id = p_team_id
  LOOP
    INSERT INTO public.payment_contributions (order_id, user_id, amount_cents, payment_status)
    VALUES (
      p_order_id,
      v_member.user_id,
      v_amount_per_member + CASE WHEN v_remainder > 0 THEN 1 ELSE 0 END,
      'pending'
    );

    v_remainder := v_remainder - 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON VIEW public.order_payment_progress IS 'Aggregated view of payment contributions and progress for each order';
COMMENT ON FUNCTION create_split_payment_contributions IS 'Helper function to automatically create split payment records for all team members';
