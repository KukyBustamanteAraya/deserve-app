-- Migration: 030_backfill_orders_for_design_requests.sql
-- Description: Create orders for existing design requests that don't have one
-- Date: 2025-10-07

-- Create orders for design requests that don't have an order_id
DO $$
DECLARE
  dr RECORD;
  new_order_id UUID;
BEGIN
  -- Loop through all design requests without an order
  FOR dr IN
    SELECT id, user_id, team_id, product_name, created_at
    FROM public.design_requests
    WHERE order_id IS NULL
  LOOP
    -- Create an order for this design request
    INSERT INTO public.orders (
      user_id,
      customer_id,
      team_id,
      status,
      total_amount_cents,
      payment_status,
      notes,
      created_at
    )
    VALUES (
      dr.user_id,
      dr.user_id,
      dr.team_id,
      'pending',
      50000, -- Test amount: CLP $500
      'unpaid',
      'Order for ' || COALESCE(dr.product_name, 'design request'),
      dr.created_at
    )
    RETURNING id INTO new_order_id;

    -- Link the order to the design request
    UPDATE public.design_requests
    SET order_id = new_order_id
    WHERE id = dr.id;

    RAISE NOTICE 'Created order % for design request %', new_order_id, dr.id;
  END LOOP;
END $$;
