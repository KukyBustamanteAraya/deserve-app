-- Migration: 013_pricing_and_voting_FIXED.sql
-- Description: Add pricing tiers, fabrics, bundles, design voting, and team enhancements
-- Date: 2025-10-03
-- FIXED: Changed UUID foreign keys to BIGINT to match existing schema

-- ============================================================================
-- FABRICS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.fabrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- Deserve, Premium, Agile, etc.
  composition TEXT, -- "100% polyester" or "92% polyester / 8% spandex"
  gsm INTEGER, -- 150, 140, 180, etc.
  description TEXT, -- "Standard lightweight fabric"
  use_case TEXT, -- "Soccer, Basketball"
  price_modifier_cents INTEGER DEFAULT 0, -- 0 for Deserve, 3000 for Premium, etc.
  video_url TEXT, -- Supabase Storage link to fabric close-up video
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed fabrics from white paper
INSERT INTO public.fabrics (name, composition, gsm, description, use_case, price_modifier_cents, sort_order) VALUES
  ('Deserve', '100% polyester', 150, 'Standard lightweight fabric', 'All sports', 0, 1),
  ('Premium', '100% polyester', 140, 'Softer, lighter pro feel', 'All sports', 3000, 2),
  ('Primer', '100% polyester', 145, 'Balanced durability & breathability', 'All sports', 2000, 3),
  ('Agile', '92% polyester / 8% spandex', 180, 'Stretch fabric for mobility', 'Soccer, Basketball', 7000, 4),
  ('Lit', '87% polyester / 13% spandex', 210, 'Compression-like fit', 'Running, Training', 10000, 5),
  ('Firm', '95% polyester / 5% spandex', 280, 'Heavy-duty for contact sports', 'Rugby, Football', 15000, 6),
  ('Breather', '90% polyester / 10% spandex', 170, 'Mesh fabric for ventilation', 'Summer sports', 2000, 7),
  ('Fly', '92% polyester / 8% spandex', 170, 'Alternate mesh, soft feel', 'Summer sports', 2000, 8),
  ('Lightweight', '87% polyester / 13% spandex', 250, 'Mid-heavy versatile fabric', 'All weather', 5000, 9),
  ('Warm', '95% polyester / 5% spandex', 280, 'Warmth for jackets/hoodies', 'Cold weather', 8000, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- PRICING TIERS TABLE (FIXED: product_id is now BIGINT)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  max_quantity INTEGER, -- NULL = unlimited
  price_per_unit_cents INTEGER NOT NULL CHECK (price_per_unit_cents >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, min_quantity)
);

-- ============================================================================
-- UPDATE PRODUCTS TABLE
-- ============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS fabric_id UUID REFERENCES public.fabrics(id),
  ADD COLUMN IF NOT EXISTS base_price_cents INTEGER, -- Price before fabric modifier
  ADD COLUMN IF NOT EXISTS retail_price_cents INTEGER, -- Anchor price for slider
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS bundle_items JSONB; -- [{product_id, quantity}]

-- Migrate existing price_cents to base_price_cents
UPDATE public.products
SET base_price_cents = price_cents
WHERE base_price_cents IS NULL;

-- Set retail price same as base price for existing products
UPDATE public.products
SET retail_price_cents = price_cents
WHERE retail_price_cents IS NULL;

-- Set default fabric to Deserve for existing products
UPDATE public.products
SET fabric_id = (SELECT id FROM public.fabrics WHERE name = 'Deserve' LIMIT 1)
WHERE fabric_id IS NULL;

-- ============================================================================
-- DESIGN CANDIDATES TABLE (FIXED: team_id is now BIGINT, user IDs are UUID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.design_candidates (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  design_url TEXT NOT NULL, -- Supabase Storage path to 3D render
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- References profiles, not auth.users
  votes_yes INTEGER DEFAULT 0,
  votes_no INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.design_votes (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES public.design_candidates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, -- References profiles for consistency
  vote BOOLEAN NOT NULL, -- true = yes, false = no
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, user_id)
);

-- Indexes for voting performance
CREATE INDEX IF NOT EXISTS idx_design_candidates_team_id ON public.design_candidates(team_id);
CREATE INDEX IF NOT EXISTS idx_design_votes_candidate_id ON public.design_votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_design_votes_user_id ON public.design_votes(user_id);

-- ============================================================================
-- UPDATE TEAMS TABLE
-- ============================================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS quorum_threshold INTEGER DEFAULT 70 CHECK (quorum_threshold > 0 AND quorum_threshold <= 100),
  ADD COLUMN IF NOT EXISTS quorum_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voting_open BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS voting_closes_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS design_allowance_used INTEGER DEFAULT 0; -- Track free render rounds

-- ============================================================================
-- UPDATE ORDERS TABLE (for pipeline tracking)
-- ============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS production_start_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS courier_name TEXT;

-- Add check constraint for valid stages (drop first if exists to avoid conflict)
DO $$
BEGIN
  ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS valid_order_stage;
  ALTER TABLE public.orders
    ADD CONSTRAINT valid_order_stage CHECK (
      current_stage IN (
        'pending',
        'design_review',
        'design_approved',
        'in_production',
        'qc',
        'ready',
        'in_transit',
        'delivered'
      )
    );
END $$;

-- ============================================================================
-- NOTIFICATIONS LOG TABLE (FIXED: user_id is UUID, order_id is UUID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- References profiles for consistency
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- email, whatsapp, sms
  event TEXT NOT NULL, -- order.confirmed, payment.received, stage.updated, etc.
  recipient TEXT NOT NULL, -- email address or phone number
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_log_user_id ON public.notifications_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_order_id ON public.notifications_log(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_log_status ON public.notifications_log(status);

-- ============================================================================
-- MANUFACTURER USERS & ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.manufacturer_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  role TEXT DEFAULT 'manufacturer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.manufacturer_order_assignments (
  id BIGSERIAL PRIMARY KEY,
  manufacturer_id BIGINT NOT NULL REFERENCES public.manufacturer_users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manufacturer_id, order_id)
);

-- ============================================================================
-- ORDER ITEMS ENHANCEMENTS (track calculator usage)
-- ============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS used_size_calculator BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS size_calculator_recommendation TEXT;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Fabrics (public read)
ALTER TABLE public.fabrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Fabrics are readable by all authenticated users" ON public.fabrics;
CREATE POLICY "Fabrics are readable by all authenticated users"
  ON public.fabrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Pricing tiers (public read)
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Pricing tiers are readable by all authenticated users" ON public.pricing_tiers;
CREATE POLICY "Pricing tiers are readable by all authenticated users"
  ON public.pricing_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Design candidates (team members can view)
ALTER TABLE public.design_candidates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can view design candidates" ON public.design_candidates;
CREATE POLICY "Team members can view design candidates"
  ON public.design_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = design_candidates.team_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = t.id AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Design candidates (captain can insert)
DROP POLICY IF EXISTS "Team captains can add design candidates" ON public.design_candidates;
CREATE POLICY "Team captains can add design candidates"
  ON public.design_candidates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = design_candidates.team_id
      AND t.created_by = auth.uid()
    )
  );

-- Design votes (team members can vote)
ALTER TABLE public.design_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members can vote on designs" ON public.design_votes;
CREATE POLICY "Team members can vote on designs"
  ON public.design_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.design_candidates dc
      JOIN public.teams t ON dc.team_id = t.id
      WHERE dc.id = design_votes.candidate_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = t.id AND tm.user_id = auth.uid()
        )
      )
    )
  );

DROP POLICY IF EXISTS "Team members can view votes" ON public.design_votes;
CREATE POLICY "Team members can view votes"
  ON public.design_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.design_candidates dc
      JOIN public.teams t ON dc.team_id = t.id
      WHERE dc.id = design_votes.candidate_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = t.id AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Notifications log (users can view their own)
ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications_log;
CREATE POLICY "Users can view their own notifications"
  ON public.notifications_log FOR SELECT
  USING (auth.uid() = user_id);

-- Manufacturer users (admin only - note: checking profiles table for is_admin)
ALTER TABLE public.manufacturer_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage manufacturer users" ON public.manufacturer_users;
CREATE POLICY "Admins can manage manufacturer users"
  ON public.manufacturer_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Manufacturer assignments (admin only)
ALTER TABLE public.manufacturer_order_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage manufacturer assignments" ON public.manufacturer_order_assignments;
CREATE POLICY "Admins can manage manufacturer assignments"
  ON public.manufacturer_order_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Create handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Auto-update fabric updated_at
DROP TRIGGER IF EXISTS fabrics_updated_at ON public.fabrics;
CREATE TRIGGER fabrics_updated_at BEFORE UPDATE ON public.fabrics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update design_candidates updated_at
DROP TRIGGER IF EXISTS design_candidates_updated_at ON public.design_candidates;
CREATE TRIGGER design_candidates_updated_at BEFORE UPDATE ON public.design_candidates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-update manufacturer_users updated_at
DROP TRIGGER IF EXISTS manufacturer_users_updated_at ON public.manufacturer_users;
CREATE TRIGGER manufacturer_users_updated_at BEFORE UPDATE ON public.manufacturer_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-calculate estimated delivery date when production starts
CREATE OR REPLACE FUNCTION public.set_estimated_delivery_date()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_stage = 'in_production' AND (OLD.current_stage IS NULL OR OLD.current_stage != 'in_production') THEN
    NEW.production_start_date := NOW();
    NEW.estimated_delivery_date := NOW() + INTERVAL '28 days';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_set_delivery_date ON public.orders;
CREATE TRIGGER orders_set_delivery_date BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_estimated_delivery_date();

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.fabrics TO authenticated;
GRANT SELECT ON public.pricing_tiers TO authenticated;
GRANT SELECT, INSERT ON public.design_candidates TO authenticated;
GRANT SELECT, INSERT ON public.design_votes TO authenticated;
GRANT SELECT ON public.notifications_log TO authenticated;
GRANT SELECT ON public.manufacturer_users TO authenticated;
GRANT SELECT ON public.manufacturer_order_assignments TO authenticated;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 013_pricing_and_voting.sql completed successfully!';
  RAISE NOTICE 'Created tables: fabrics, pricing_tiers, design_candidates, design_votes, notifications_log, manufacturer_users';
  RAISE NOTICE 'Seeded % fabrics', (SELECT COUNT(*) FROM public.fabrics);
END $$;
