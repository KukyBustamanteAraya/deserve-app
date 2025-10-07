-- Migration: 028_link_design_requests_to_orders.sql
-- Description: Add order_id to design_requests and create orders for payment flow
-- Date: 2025-10-07

-- Add order_id column to design_requests
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_design_requests_order_id ON public.design_requests(order_id);

-- Add total_amount_cents column to orders if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'total_amount_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN total_amount_cents INT NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add team_id column to orders if it doesn't exist (for easier tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'team_id'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index on team_id
CREATE INDEX IF NOT EXISTS idx_orders_team_id ON public.orders(team_id);
