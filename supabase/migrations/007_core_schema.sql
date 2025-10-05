-- Migration: 007_core_schema.sql
-- Description: Core schema for Deserve app - profiles, sports, teams, orders, carts
-- Creates all missing tables, views, RPC functions, RLS policies, and seed data

-- ============================================================================
-- TABLES
-- ============================================================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sports table (lookup/reference data)
CREATE TABLE IF NOT EXISTS public.sports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport_id UUID REFERENCES public.sports(id) ON DELETE CASCADE,
  description TEXT,
  logo_url TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table (many-to-many)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- member, captain, admin
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, cancelled
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, refunded
  payment_method TEXT,
  shipping_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to existing orders table if needed
DO $$
BEGIN
  -- Check if user_id needs to be updated from TEXT to UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'user_id'
    AND data_type = 'text'
  ) THEN
    -- Disable RLS temporarily
    ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;

    -- Drop existing constraints and policies
    DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users can update own orders" ON public.orders;

    -- Change column type
    ALTER TABLE public.orders ALTER COLUMN user_id TYPE UUID USING user_id::UUID;

    -- Add foreign key if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'orders_user_id_fkey'
    ) THEN
      ALTER TABLE public.orders
      ADD CONSTRAINT orders_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- Add other missing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status') THEN
    ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
    ALTER TABLE public.orders ADD COLUMN payment_method TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_address') THEN
    ALTER TABLE public.orders ADD COLUMN shipping_address JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'notes') THEN
    ALTER TABLE public.orders ADD COLUMN notes TEXT;
  END IF;
END $$;

-- Carts table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- active, abandoned, converted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, status)
);

-- Cart items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL, -- Will reference products table when created
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Teams with member count and creator details
CREATE OR REPLACE VIEW public.teams_with_details AS
SELECT
  t.id,
  t.name,
  t.description,
  t.logo_url,
  t.sport_id,
  s.name AS sport_name,
  t.created_by,
  p.full_name AS creator_name,
  p.email AS creator_email,
  COUNT(tm.id) AS member_count,
  t.created_at,
  t.updated_at
FROM public.teams t
LEFT JOIN public.sports s ON t.sport_id = s.id
LEFT JOIN public.profiles p ON t.created_by = p.id
LEFT JOIN public.team_members tm ON t.id = tm.team_id
GROUP BY t.id, s.name, p.full_name, p.email;

-- Carts with items and total
CREATE OR REPLACE VIEW public.carts_with_items AS
SELECT
  c.id AS cart_id,
  c.user_id,
  c.status,
  c.created_at,
  c.updated_at,
  COUNT(ci.id) AS item_count,
  COALESCE(SUM(ci.quantity * ci.unit_price), 0) AS total_amount
FROM public.carts c
LEFT JOIN public.cart_items ci ON c.id = ci.cart_id
GROUP BY c.id;

-- ============================================================================
-- RPC FUNCTIONS
-- ============================================================================

-- Get or create active cart for the authenticated user
CREATE OR REPLACE FUNCTION public.get_or_create_active_cart()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cart_id UUID;
  v_user_id UUID;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Try to find existing active cart
  SELECT id INTO v_cart_id
  FROM public.carts
  WHERE user_id = v_user_id AND status = 'active'
  LIMIT 1;

  -- Create new cart if none exists
  IF v_cart_id IS NULL THEN
    INSERT INTO public.carts (user_id, status)
    VALUES (v_user_id, 'active')
    RETURNING id INTO v_cart_id;
  END IF;

  RETURN v_cart_id;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply updated_at triggers to all tables
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER sports_updated_at BEFORE UPDATE ON public.sports
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER carts_updated_at BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Sports policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view sports"
  ON public.sports FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Teams policies
CREATE POLICY "Authenticated users can view teams"
  ON public.teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = created_by);

CREATE POLICY "Team creators can update their teams"
  ON public.teams FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Team creators can delete their teams"
  ON public.teams FOR DELETE
  USING (auth.uid() = created_by);

-- Team members policies
CREATE POLICY "Authenticated users can view team members"
  ON public.team_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Team members can join teams"
  ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave teams"
  ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

-- Orders policies
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = user_id);

-- Carts policies
CREATE POLICY "Users can view own carts"
  ON public.carts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own carts"
  ON public.carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carts"
  ON public.carts FOR UPDATE
  USING (auth.uid() = user_id);

-- Cart items policies
CREATE POLICY "Users can view own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to own cart"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts
      WHERE carts.id = cart_items.cart_id
      AND carts.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert 5 sports
INSERT INTO public.sports (name, description, icon) VALUES
  ('Soccer', 'The beautiful game played with feet and a ball', '⚽'),
  ('Basketball', 'Fast-paced indoor court sport with hoops', '🏀'),
  ('Volleyball', 'Team sport played with a net and ball', '🏐'),
  ('Rugby', 'Physical contact sport with an oval ball', '🏉'),
  ('Golf', 'Precision club and ball sport on courses', '⛳')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.sports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.team_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.carts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;

-- Grant access to views
GRANT SELECT ON public.teams_with_details TO authenticated;
GRANT SELECT ON public.carts_with_items TO authenticated;

-- Grant execute on RPC functions
GRANT EXECUTE ON FUNCTION public.get_or_create_active_cart() TO authenticated;
