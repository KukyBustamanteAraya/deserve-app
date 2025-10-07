-- Migration: 029_fix_orders_customer_constraint.sql
-- Description: Fix customer_id constraint on orders table
-- Date: 2025-10-07

-- Option 1: If customers table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Allow users to view and manage their own customer record
CREATE POLICY IF NOT EXISTS "Users can view own customer record"
  ON public.customers FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can insert own customer record"
  ON public.customers FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY IF NOT EXISTS "Users can update own customer record"
  ON public.customers FOR UPDATE
  USING (auth.uid() = id);

-- Create a trigger to auto-create customer record when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customers (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_customer ON auth.users;
CREATE TRIGGER on_auth_user_created_customer
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_customer();

-- Backfill existing users as customers
INSERT INTO public.customers (id, email, full_name)
SELECT
  id,
  email,
  raw_user_meta_data->>'full_name' as full_name
FROM auth.users
ON CONFLICT (id) DO NOTHING;
