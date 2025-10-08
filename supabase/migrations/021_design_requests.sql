-- Create design_requests table for storing customization requests
CREATE TABLE IF NOT EXISTS public.design_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','rendering','ready','cancelled')),
  product_id UUID REFERENCES public.products(id),
  product_slug TEXT,
  product_name TEXT,
  sport_slug TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  accent_color TEXT,
  selected_apparel JSONB DEFAULT '{}'::jsonb,
  uniform_details JSONB DEFAULT '{}'::jsonb,
  logo_url TEXT,
  logo_placements JSONB DEFAULT '{}'::jsonb,
  names_numbers BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('player','manager'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_design_requests_team_id ON public.design_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_design_requests_user_id ON public.design_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_design_requests_status ON public.design_requests(status);

-- RLS
ALTER TABLE public.design_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "dr_user_select_own" ON public.design_requests;
DROP POLICY IF EXISTS "dr_user_insert_own" ON public.design_requests;
DROP POLICY IF EXISTS "dr_user_update_pending" ON public.design_requests;

-- Policy: Users can view their own design requests
CREATE POLICY "dr_user_select_own"
  ON public.design_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own design requests
CREATE POLICY "dr_user_insert_own"
  ON public.design_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending design requests
CREATE POLICY "dr_user_update_pending"
  ON public.design_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_design_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS design_requests_updated_at ON public.design_requests;
CREATE TRIGGER design_requests_updated_at
  BEFORE UPDATE ON public.design_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_design_requests_updated_at();
