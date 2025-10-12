-- Migration: 011_upgrade_products_for_gear_requests.sql
-- Description: Upgrade existing products schema for gear request flow with storage paths

-- Ensure uuid gen
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Status enum (replace boolean active)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='product_status') THEN
    CREATE TYPE public.product_status AS ENUM ('draft','active','archived');
  END IF;
END $$;

-- PRODUCTS: add columns we need
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category text,                                   -- e.g. 'camiseta'|'shorts'|'poleron'|...
  ADD COLUMN IF NOT EXISTS status public.product_status DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS hero_path text,                                   -- storage object path for hero
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill status from old boolean active if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='products' AND column_name='active') THEN
    UPDATE public.products
    SET status = CASE WHEN active THEN 'active' ELSE 'draft' END
    WHERE status IS NULL;
  END IF;
END $$;

-- Optional: drop old active column (skip if still used elsewhere)
-- ALTER TABLE public.products DROP COLUMN IF EXISTS active;

-- PRODUCT IMAGES: align column names
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='product_images' AND column_name='url') THEN
    ALTER TABLE public.product_images RENAME COLUMN url TO path;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='product_images' AND column_name='alt_text') THEN
    ALTER TABLE public.product_images RENAME COLUMN alt_text TO alt;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='product_images' AND column_name='sort_order') THEN
    ALTER TABLE public.product_images RENAME COLUMN sort_order TO position;
  END IF;
END $$;

-- Ensure constraints/types
ALTER TABLE public.product_images
  ALTER COLUMN position SET DEFAULT 0;

-- updated_at trigger for products
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_timestamp_products') THEN
    CREATE TRIGGER set_timestamp_products
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_sport_id ON public.products(sport_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- Category constraint
ALTER TABLE public.products
  ADD CONSTRAINT products_category_chk
  CHECK (category IN ('camiseta','shorts','poleron','medias','chaqueta'));

-- RLS (catalog is public read; writes via server/service)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public SELECT (products)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='products'
      AND policyname='Public can SELECT products'
  ) THEN
    CREATE POLICY "Public can SELECT products"
    ON public.products FOR SELECT
    USING ( true );
  END IF;
END $$;

-- Public SELECT (product_images)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='product_images'
      AND policyname='Public can SELECT product_images'
  ) THEN
    CREATE POLICY "Public can SELECT product_images"
    ON public.product_images FOR SELECT
    USING ( true );
  END IF;
END $$;

-- NOTE: No client-side INSERT/UPDATE/DELETE policies. We'll route admin writes through server using service role.

-- Nice-to-have backfill: set hero_path to the first image (position=0) if null
UPDATE public.products p
SET hero_path = i.path
FROM (
  SELECT DISTINCT ON (product_id) product_id, path
  FROM public.product_images
  ORDER BY product_id, position ASC
) i
WHERE p.id = i.product_id
  AND p.hero_path IS NULL;
