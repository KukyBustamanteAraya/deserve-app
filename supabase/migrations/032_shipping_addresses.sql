-- Migration: 032_shipping_addresses.sql
-- Description: Add shipping addresses for Chilean regions
-- Date: 2025-10-08

-- Create shipping_addresses table
CREATE TABLE IF NOT EXISTS public.shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,

  -- Address details
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  street_address TEXT NOT NULL,
  address_line_2 TEXT,
  commune TEXT NOT NULL,
  city TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN (
    'Región de Arica y Parinacota',
    'Región de Tarapacá',
    'Región de Antofagasta',
    'Región de Atacama',
    'Región de Coquimbo',
    'Región de Valparaíso',
    'Región Metropolitana de Santiago',
    'Región del Libertador Gral. Bernardo O''Higgins',
    'Región del Maule',
    'Región de Ñuble',
    'Región del Biobío',
    'Región de La Araucanía',
    'Región de Los Ríos',
    'Región de Los Lagos',
    'Región de Aysén del Gral. Carlos Ibáñez del Campo',
    'Región de Magallanes y de la Antártica Chilena'
  )),
  postal_code TEXT,

  -- Metadata
  is_default BOOLEAN DEFAULT FALSE,
  delivery_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_user_id
  ON public.shipping_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_shipping_addresses_team_id
  ON public.shipping_addresses(team_id);

-- Add shipping address to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS shipping_address_id UUID REFERENCES public.shipping_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS shipping_recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS shipping_street_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_commune TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_region TEXT,
  ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

-- RLS
ALTER TABLE public.shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Users can manage their own addresses
CREATE POLICY "shipping_addresses_own" ON public.shipping_addresses
  FOR ALL USING (user_id = auth.uid());

-- Team owners/managers can view team addresses
CREATE POLICY "shipping_addresses_team_view" ON public.shipping_addresses
  FOR SELECT USING (
    team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = shipping_addresses.team_id
      AND tm.user_id = auth.uid()
      AND tm.role IN ('owner', 'manager')
    )
  );

-- Updated at trigger
DROP TRIGGER IF EXISTS trg_shipping_addresses_updated_at ON public.shipping_addresses;
CREATE TRIGGER trg_shipping_addresses_updated_at
  BEFORE UPDATE ON public.shipping_addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION ensure_single_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    -- Unset other default addresses for this user
    UPDATE public.shipping_addresses
    SET is_default = FALSE
    WHERE user_id = NEW.user_id
    AND id != NEW.id
    AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_default_address ON public.shipping_addresses;
CREATE TRIGGER trg_ensure_single_default_address
  BEFORE INSERT OR UPDATE ON public.shipping_addresses
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_address();

-- Helpful comments
COMMENT ON TABLE public.shipping_addresses IS 'Shipping addresses for Chilean deliveries with region validation';
COMMENT ON COLUMN public.shipping_addresses.region IS 'Chilean region - must match one of the 16 official regions';
COMMENT ON COLUMN public.shipping_addresses.commune IS 'Chilean commune (comuna)';
