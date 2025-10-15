-- =============================================================================
-- LIVE SUPABASE SCHEMA REFERENCE
-- =============================================================================
-- This is the SINGLE SOURCE OF TRUTH for the database schema.
-- Last updated: 2025-10-14 (Renamed all _cents columns to _clp - Chilean Pesos have no cents!)
-- Previous update: 2025-10-11 (Added payment_mode to team_settings & orders, opted_out to order_items)
-- Updated by: User via Supabase SQL migrations
--
-- IMPORTANT:
-- - DO NOT reference migration files for schema information
-- - This file reflects the ACTUAL live database state
-- - Update this file when schema changes are made in Supabase
-- - Use scripts/query-schema.mjs to get live data from specific tables
-- =============================================================================

-- WARNING: This schema is for REFERENCE ONLY and is not meant to be executed.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.sports (
  id bigint NOT NULL DEFAULT nextval('sports_id_seq'::regclass),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  display_name text,
  CONSTRAINT sports_pkey PRIMARY KEY (id)
);

-- LIVE DATA (as of 2025-10-11):
-- id | slug        | name        | display_name
-- ---+-------------+-------------+--------------
-- 1  | futbol      | Fútbol      | Fútbol
-- 2  | basquetbol  | Básquetbol  | Básquetbol
-- 3  | voleibol    | Vóleibol    | Vóleibol
-- 4  | rugby       | Rugby       | Rugby

CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sport_id bigint,                          -- FK to sports.id (ACTIVE - currently used)
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid NOT NULL,
  quorum_threshold integer DEFAULT 70 CHECK (quorum_threshold > 0 AND quorum_threshold <= 100),
  quorum_locked boolean DEFAULT false,
  voting_open boolean DEFAULT false,
  voting_closes_at timestamp with time zone,
  design_allowance_used integer DEFAULT 0,
  owner_id uuid,
  slug text UNIQUE,
  colors jsonb NOT NULL DEFAULT '{}'::jsonb,
  logo_url text,
  current_owner_id uuid,
  is_institutional boolean DEFAULT false,
  team_type text DEFAULT 'single_team'::text CHECK (team_type = ANY (ARRAY['single_team'::text, 'institution'::text])),
  sports ARRAY DEFAULT ARRAY[]::text[],    -- Array of sport slugs (currently NULL in data)
  setup_completed boolean DEFAULT false,
  sport text,                               -- Text sport field (currently NULL in data)
  institution_name text,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id),
  CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT teams_current_owner_id_fkey FOREIGN KEY (current_owner_id) REFERENCES auth.users(id)
);

-- TEAM SPORT FIELDS EXPLAINED:
-- 1. sport_id (bigint FK) - CURRENTLY ACTIVE - references sports.id
-- 2. sport (text) - Currently NULL, seems unused
-- 3. sports (text[]) - Currently NULL, for multi-sport institutions

CREATE TABLE public.product_types (
  id bigint NOT NULL DEFAULT nextval('product_types_id_seq'::regclass),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['Top'::text, 'Bottom'::text, 'Outerwear'::text, 'Socks'::text, 'Accessory'::text])),
  variant text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT product_types_pkey PRIMARY KEY (id)
);

-- LIVE DATA (as of 2025-10-11):
-- slug    | display_name | category
-- --------+--------------+----------
-- jersey  | Jersey       | Top
-- shorts  | Shorts       | Bottom

-- =============================================================================
-- PRODUCTS TABLE (Updated: 2025-10-11)
-- =============================================================================
-- Products are SKU templates that can span multiple sports
-- Example: "Premium Jersey" for Soccer, Basketball, Volleyball
-- Example: "Rugby Jersey" only for Rugby (more expensive build)
-- Example: "Team Hoodie" for ALL sports

CREATE TABLE public.products (
  id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),  -- Auto-incrementing ID
  sport_id bigint,                                 -- DEPRECATED: Use sport_ids instead
  sport_ids bigint[],                              -- Array of sport IDs (e.g., [1,2,3] for Soccer, Basketball, Volleyball)
  category text NOT NULL CHECK (category = ANY (ARRAY['camiseta'::text, 'short'::text, 'medias'::text, 'chaqueta'::text, 'pantalon'::text, 'bolso'::text])),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  price_clp integer NOT NULL,                      -- Custom price per product in CLP (Chilean Pesos - full pesos, NOT cents!)
  base_price_clp integer,                          -- Base price in CLP (Chilean Pesos - full pesos, NOT cents!)
  retail_price_clp integer,                        -- Retail price in CLP (Chilean Pesos - full pesos, NOT cents!)
  product_type_slug text,                          -- e.g., "jersey", "shorts", "hoodie"
  hero_path text,                                  -- DEPRECATED: Products display design mockups, not own images
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'active'::text, 'archived'::text])),
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_slug_key UNIQUE (slug),
  CONSTRAINT products_sport_ids_not_empty CHECK (array_length(sport_ids, 1) > 0),
  CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Indexes:
-- idx_products_sport_ids (GIN index for efficient array queries)

-- NOTES:
-- - sport_id is DEPRECATED, use sport_ids instead
-- - hero_path is DEPRECATED, products display design mockups
-- - price_clp is set per product, NOT inherited from component_pricing
-- - IMPORTANT: CLP (Chilean Pesos) has NO CENTS! All amounts stored as full pesos (e.g., 40000 = $40.000 CLP)
-- - A product can span multiple sports (e.g., Premium Jersey for Soccer, Basketball, Volleyball)
-- - Query example: SELECT * FROM products WHERE 1 = ANY(sport_ids); -- Get all products for soccer (id=1)
-- - REMOVED CONSTRAINT: products_active_needs_hero (2025-10-11) - Products display design mockups, not their own images

-- =============================================================================
-- DESIGN vs PRODUCT ARCHITECTURE (Added: 2025-10-11)
-- =============================================================================
-- Separates visual designs from physical products
-- Design can be applied to multiple products across multiple sports

CREATE TABLE public.designs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  designer_name text,
  style_tags text[] DEFAULT ARRAY[]::text[],      -- ["modern", "classic", "geometric"]
  color_scheme text[] DEFAULT ARRAY[]::text[],    -- ["blue", "red", "white"]
  is_customizable boolean DEFAULT true,
  allows_recoloring boolean DEFAULT true,
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT designs_pkey PRIMARY KEY (id),
  CONSTRAINT designs_slug_key UNIQUE (slug)
);

-- Indexes:
-- idx_designs_slug, idx_designs_active, idx_designs_featured,
-- idx_designs_style_tags (GIN), idx_designs_color_scheme (GIN)

CREATE TABLE public.design_mockups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  design_id uuid NOT NULL,
  sport_id bigint NOT NULL,
  product_type_slug text NOT NULL,                -- "jersey", "shorts", "hoodie" (kept for backward compatibility)
  product_id bigint,                               -- FK to products.id - Links to specific product (Added: 2025-10-11)
  mockup_url text NOT NULL,                        -- URL in Supabase Storage (stores design images, not mockups)
  view_angle text,                                 -- "front", "back", "side", "detail"
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_mockups_pkey PRIMARY KEY (id),
  CONSTRAINT design_mockups_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id) ON DELETE CASCADE,
  CONSTRAINT design_mockups_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id) ON DELETE CASCADE,
  CONSTRAINT design_mockups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL,
  CONSTRAINT design_mockups_unique_combo UNIQUE (design_id, sport_id, product_type_slug, view_angle)
);

-- Indexes:
-- idx_design_mockups_design_id, idx_design_mockups_sport_id,
-- idx_design_mockups_product_type, idx_design_mockups_primary,
-- idx_design_mockups_product_id (Added: 2025-10-11),
-- idx_design_mockups_composite (design_id, sport_id, product_type_slug)

-- NOTES:
-- - Table name is "design_mockups" for backward compatibility, but contains design images
-- - product_id links to specific products (e.g., "Premium Jersey" id=1)
-- - product_type_slug kept for backward compatibility with existing records
-- - New records should always include product_id

CREATE TABLE public.design_products (
  design_id uuid NOT NULL,
  product_id bigint NOT NULL,
  is_recommended boolean DEFAULT true,
  preview_mockup_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_products_pkey PRIMARY KEY (design_id, product_id),
  CONSTRAINT design_products_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id) ON DELETE CASCADE,
  CONSTRAINT design_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT design_products_preview_mockup_id_fkey FOREIGN KEY (preview_mockup_id) REFERENCES public.design_mockups(id) ON DELETE SET NULL
);

-- Indexes:
-- idx_design_products_design_id, idx_design_products_product_id

-- =============================================================================
-- MODIFIED TABLES FOR DESIGN ARCHITECTURE
-- =============================================================================

-- products table - Added columns:
--   - product_type_name TEXT  (Human-readable product type, e.g., "Camiseta de Fútbol")
--   - sort_order INT DEFAULT 0  (Display order in catalog)

-- design_requests table - Added columns:
--   - design_id UUID REFERENCES designs(id)  (Reference to selected design)

-- order_items table - Added columns:
--   - design_id UUID REFERENCES designs(id)  (Reference to design ordered)

-- =============================================================================
-- PAYMENT SETTINGS & ORDER MANAGEMENT (Updated: 2025-10-14)
-- =============================================================================

-- team_settings table - Added payment_mode column:
--   - payment_mode TEXT DEFAULT 'individual' CHECK (payment_mode IN ('individual', 'manager_pays_all'))
--   - Purpose: Team-wide default for how orders are paid
--   - 'individual': Each player pays their own share
--   - 'manager_pays_all': Manager pays for entire team order

-- orders table - Added payment_mode column:
--   - payment_mode TEXT DEFAULT 'individual' CHECK (payment_mode IN ('individual', 'manager_pays_all'))
--   - Purpose: Per-order payment mode (can override team default)
--   - Set when manager approves design and creates order
--
-- IMPORTANT - GENERATED COLUMNS:
--   - total_clp is GENERATED ALWAYS AS (((subtotal_clp - discount_clp) + tax_clp) + shipping_clp)
--   - Do NOT include total_clp in INSERT statements - database calculates it automatically
--   - All amounts in CLP (Chilean Pesos) - full pesos, NOT cents! (40000 = $40.000 CLP, NOT $400.00)

-- order_items table - Added opt-out columns:
--   - opted_out BOOLEAN DEFAULT false
--   - opted_out_at TIMESTAMPTZ
--   - Purpose: Allow players to opt-out of specific orders
--   - When player opts out, order total recalculates automatically
--
-- IMPORTANT - GENERATED COLUMNS:
--   - line_total_clp is GENERATED ALWAYS AS (unit_price_clp * quantity)
--   - Do NOT include line_total_clp in INSERT statements - database calculates it automatically
--   - All amounts in CLP (Chilean Pesos) - full pesos, NOT cents! (40000 = $40.000 CLP, NOT $400.00)

-- Add other important tables from the full schema as needed...
-- (Keeping this file focused on the most critical tables for now)

-- =============================================================================
-- STORAGE BUCKET RLS POLICIES (Updated: 2025-10-11)
-- =============================================================================
-- Bucket: designs
-- Purpose: Stores design images uploaded by admin users

-- Policy 1: Allow authenticated uploads to designs bucket
CREATE POLICY "Allow authenticated uploads to designs bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'designs');

-- Policy 2: Allow public read access to designs bucket
CREATE POLICY "Allow public read access to designs bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'designs');

-- Policy 3: Allow authenticated updates to designs bucket
CREATE POLICY "Allow authenticated updates to designs bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'designs')
WITH CHECK (bucket_id = 'designs');

-- Policy 4: Allow authenticated deletes from designs bucket
CREATE POLICY "Allow authenticated deletes from designs bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'designs');

-- NOTES:
-- - Authenticated users (admins) can upload, update, and delete design images
-- - Public users can view design images (for customer-facing catalog)
-- - All images stored in path format: design-images/{design_id}/{timestamp}-{random}.{ext}

-- =============================================================================
-- HOW TO UPDATE THIS FILE:
-- =============================================================================
-- 1. Make schema changes in Supabase Dashboard/SQL Editor
-- 2. Run: node scripts/query-schema.mjs [table_name]
-- 3. Copy the output and update this file
-- 4. Commit the changes with a note about what changed
-- =============================================================================
