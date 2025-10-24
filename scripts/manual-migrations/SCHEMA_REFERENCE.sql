-- ============================================================================
-- DESERVE ATHLETICS - DATABASE SCHEMA REFERENCE
-- ============================================================================
--
-- Purpose: Authoritative reference for the current production database schema
-- Source: Supabase production database export
-- Last Updated: 2025-10-23
-- Status: ✅ UP TO DATE
--
-- IMPORTANT NOTES:
-- - This schema is for REFERENCE ONLY and should NOT be executed directly
-- - Table order and some constraints may not be valid for standalone execution
-- - Use migrations in /supabase/migrations/ for actual schema changes
-- - All price fields use _clp naming (Chilean Pesos, not cents)
-- - Migration 20251014_rename_cents_to_clp.sql completed successfully
--
-- MIGRATION HISTORY:
-- - Oct 14, 2025: Renamed all _cents columns to _clp
-- - Oct 16, 2025: Added size_charts table and gender fields
-- - Oct 18, 2025: Added jersey_name columns
-- - Oct 20, 2025: Added bulk order and gender hierarchy support
-- - Oct 21, 2025: Consolidated team colors into JSONB
--
-- ============================================================================

-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

-- ============================================================================
-- ACTIVITY & LOGGING
-- ============================================================================

CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  related_team_id uuid NOT NULL,
  related_user_id uuid,
  action_type text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.admin_notifications (
  id bigint NOT NULL DEFAULT nextval('admin_notifications_id_seq'::regclass),
  notification_type text NOT NULL CHECK (notification_type = ANY (ARRAY['design_feedback'::text, 'design_approval'::text, 'design_changes_requested'::text, 'payment_completed'::text, 'order_status_change'::text])),
  title text NOT NULL,
  message text NOT NULL,
  link_url text,
  design_request_id bigint,
  order_id uuid,
  team_id uuid,
  user_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  read_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_design_request_id_fkey FOREIGN KEY (design_request_id) REFERENCES public.design_requests(id),
  CONSTRAINT admin_notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT admin_notifications_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT admin_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT admin_notifications_read_by_fkey FOREIGN KEY (read_by) REFERENCES auth.users(id)
);

CREATE TABLE public.notifications_log (
  id bigint NOT NULL DEFAULT nextval('notifications_log_id_seq'::regclass),
  user_id uuid,
  order_id uuid,
  type text NOT NULL,
  event text NOT NULL,
  recipient text NOT NULL,
  status text DEFAULT 'pending'::text,
  sent_at timestamp with time zone,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_log_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT notifications_log_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- ============================================================================
-- PAYMENTS & BILLING (⚠️ ALL PRICES IN CLP - NOT CENTS)
-- ============================================================================

CREATE TABLE public.bulk_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  total_amount_clp integer NOT NULL CHECK (total_amount_clp >= 0),
  currency character NOT NULL DEFAULT 'CLP'::bpchar,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'refunded'::text])),
  mp_payment_id text UNIQUE,
  mp_preference_id text,
  external_reference text UNIQUE,
  paid_at timestamp with time zone,
  raw_payment_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bulk_payments_pkey PRIMARY KEY (id),
  CONSTRAINT bulk_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.bulk_payment_orders (
  bulk_payment_id uuid NOT NULL,
  order_id uuid NOT NULL,
  CONSTRAINT bulk_payment_orders_pkey PRIMARY KEY (bulk_payment_id, order_id),
  CONSTRAINT bulk_payment_orders_bulk_payment_id_fkey FOREIGN KEY (bulk_payment_id) REFERENCES public.bulk_payments(id),
  CONSTRAINT bulk_payment_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE public.payment_contributions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid NOT NULL,
  team_id uuid,
  amount_clp integer NOT NULL CHECK (amount_clp >= 0),
  currency character NOT NULL DEFAULT 'CLP'::bpchar,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text, 'refunded'::text])),
  mp_payment_id text UNIQUE,
  mp_preference_id text,
  external_reference text UNIQUE,
  paid_at timestamp with time zone,
  raw_payment_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  mercadopago_payment_id text,
  payment_method text,
  payment_status text DEFAULT 'pending'::text CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])),
  CONSTRAINT payment_contributions_pkey PRIMARY KEY (id),
  CONSTRAINT payment_contributions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT payment_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT payment_contributions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  provider USER-DEFINED NOT NULL DEFAULT 'mercadopago'::payment_provider,
  provider_payment_id text UNIQUE,
  order_id text,
  user_id uuid,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::payment_status,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL'::text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.payment_events (
  id bigint NOT NULL DEFAULT nextval('payment_events_id_seq'::regclass),
  payment_id uuid NOT NULL,
  event_type USER-DEFINED NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payment_events_pkey PRIMARY KEY (id),
  CONSTRAINT payment_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);

CREATE TABLE public.mercadopago_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  user_id uuid,
  preference_id text NOT NULL UNIQUE,
  init_point text NOT NULL,
  sandbox_init_point text,
  amount_cents bigint NOT NULL,
  description text,
  external_reference text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'cancelled'::text])),
  payment_type text DEFAULT 'split'::text CHECK (payment_type = ANY (ARRAY['split'::text, 'bulk'::text])),
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mercadopago_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT mercadopago_preferences_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT mercadopago_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.mercadopago_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  preference_id uuid,
  mp_payment_id bigint NOT NULL UNIQUE,
  mp_status text NOT NULL,
  mp_status_detail text,
  amount_cents bigint NOT NULL,
  currency text DEFAULT 'CLP'::text,
  payment_method_id text,
  payment_type_id text,
  payer_email text,
  payer_id bigint,
  transaction_amount_cents bigint,
  net_amount_cents bigint,
  mp_fee_cents bigint,
  date_approved timestamp with time zone,
  date_created timestamp with time zone,
  date_last_modified timestamp with time zone,
  webhook_received_at timestamp with time zone DEFAULT now(),
  raw_webhook_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT mercadopago_payments_pkey PRIMARY KEY (id),
  CONSTRAINT mercadopago_payments_preference_id_fkey FOREIGN KEY (preference_id) REFERENCES public.mercadopago_preferences(id)
);

CREATE TABLE public.pricing_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  reason text NOT NULL,
  discount_cents bigint NOT NULL DEFAULT 0,
  discount_percentage numeric,
  applied_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT pricing_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT pricing_overrides_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT pricing_overrides_applied_by_fkey FOREIGN KEY (applied_by) REFERENCES public.profiles(id)
);

-- ============================================================================
-- ORDERS
-- ============================================================================

CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'design_review'::text, 'design_approved'::text, 'design_changes'::text, 'production'::text, 'quality_check'::text, 'shipped'::text, 'delivered'::text])),
  payment_status text NOT NULL DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'partial'::text, 'paid'::text, 'refunded'::text])),
  currency text NOT NULL DEFAULT 'CLP'::text,
  subtotal_clp integer NOT NULL DEFAULT 0,
  discount_clp integer NOT NULL DEFAULT 0,
  tax_clp integer NOT NULL DEFAULT 0,
  shipping_clp integer NOT NULL DEFAULT 0,
  total_clp integer DEFAULT (((subtotal_clp - discount_clp) + tax_clp) + shipping_clp),
  shipping_name text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal text,
  shipping_country text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  production_start_date timestamp with time zone,
  estimated_delivery_date timestamp with time zone,
  current_stage text DEFAULT 'pending'::text CHECK (current_stage = ANY (ARRAY['pending'::text, 'design_review'::text, 'design_approved'::text, 'in_production'::text, 'qc'::text, 'ready'::text, 'in_transit'::text, 'delivered'::text])),
  tracking_number text,
  courier_name text,
  admin_notes text,
  estimated_delivery date,
  total_amount_clp integer NOT NULL DEFAULT 0,
  team_id uuid,
  status_updated_at timestamp with time zone DEFAULT now(),
  design_approved_at timestamp with time zone,
  production_started_at timestamp with time zone,
  shipped_at timestamp with time zone,
  delivered_at timestamp with time zone,
  carrier text,
  customer_notes text,
  internal_notes text,
  shipping_address_id uuid,
  shipping_recipient_name text,
  shipping_street_address text,
  shipping_commune text,
  shipping_postal_code text,
  delivery_instructions text,
  updated_at timestamp with time zone DEFAULT now(),
  payment_mode text DEFAULT 'individual'::text CHECK (payment_mode = ANY (ARRAY['individual'::text, 'manager_pays_all'::text])),
  sub_team_id uuid,
  has_unconfirmed_players boolean DEFAULT false,
  unconfirmed_player_count integer DEFAULT 0,
  division_group uuid,
  team_gender_category text CHECK (team_gender_category = ANY (ARRAY['male'::text, 'female'::text, 'both'::text])),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT orders_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT orders_shipping_address_id_fkey FOREIGN KEY (shipping_address_id) REFERENCES public.shipping_addresses(id),
  CONSTRAINT orders_sub_team_id_fkey FOREIGN KEY (sub_team_id) REFERENCES public.institution_sub_teams(id)
);

CREATE TABLE public.order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  product_name text NOT NULL,
  collection text,
  images ARRAY NOT NULL DEFAULT '{}'::text[],
  unit_price_clp integer NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total_clp integer DEFAULT (unit_price_clp * quantity),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  product_id bigint NOT NULL,
  used_size_calculator boolean DEFAULT false,
  size_calculator_recommendation text,
  player_id uuid,
  player_name text,
  jersey_number text,
  customization jsonb,
  notes text,
  design_id uuid,
  opted_out boolean DEFAULT false,
  opted_out_at timestamp with time zone,
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT order_items_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id)
);

CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  changed_by uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- CART
-- ============================================================================

CREATE TABLE public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'active'::cart_status,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  product_id bigint,
  name text,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  unit_price_cents integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ============================================================================
-- PRODUCTS & CATALOG
-- ============================================================================

CREATE TABLE public.sports (
  id bigint NOT NULL DEFAULT nextval('sports_id_seq'::regclass),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  display_name text,
  CONSTRAINT sports_pkey PRIMARY KEY (id)
);

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

CREATE TABLE public.products (
  id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  name text NOT NULL,
  price text NOT NULL DEFAULT 0,
  sport text,
  category text DEFAULT 'jersey'::text CHECK (category IS NULL OR (category = ANY (ARRAY['camiseta'::text, 'shorts'::text, 'poleron'::text, 'medias'::text, 'chaqueta'::text]))),
  image_url text,
  image_filename text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  slug text,
  hero_path text,
  status text,
  created_by uuid,
  description text,
  price_clp integer NOT NULL DEFAULT 0 CHECK (price_clp >= 0),
  tags ARRAY DEFAULT '{}'::text[],
  sport_id bigint,
  fabric_id uuid,
  base_price_clp integer,
  retail_price_clp integer,
  is_bundle boolean DEFAULT false,
  bundle_items jsonb,
  product_type_slug text,
  product_type_name text,
  sort_order integer DEFAULT 0,
  sport_ids ARRAY CHECK (array_length(sport_ids, 1) > 0),
  icon_url text,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT products_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id),
  CONSTRAINT products_fabric_id_fkey FOREIGN KEY (fabric_id) REFERENCES public.fabrics(id)
);

CREATE TABLE public.product_images (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id integer NOT NULL,
  path text NOT NULL,
  alt text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  url text,
  alt_text text,
  sort_order integer DEFAULT 0,
  CONSTRAINT product_images_pkey PRIMARY KEY (id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ============================================================================
-- PRICING
-- ============================================================================

CREATE TABLE public.component_pricing (
  id integer NOT NULL DEFAULT nextval('component_pricing_id_seq'::regclass),
  component_type_slug text NOT NULL UNIQUE,
  component_name text NOT NULL,
  base_price_clp integer NOT NULL,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT component_pricing_pkey PRIMARY KEY (id)
);

CREATE TABLE public.pricing_tiers (
  id bigint NOT NULL DEFAULT nextval('pricing_tiers_id_seq'::regclass),
  fabric_code text NOT NULL,
  min_qty integer NOT NULL,
  max_qty integer NOT NULL,
  unit_price numeric NOT NULL,
  currency text DEFAULT 'CLP'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  min_quantity integer NOT NULL DEFAULT 1,
  max_quantity integer,
  price_per_unit_cents integer NOT NULL DEFAULT 0,
  product_id bigint,
  CONSTRAINT pricing_tiers_pkey PRIMARY KEY (id),
  CONSTRAINT pricing_tiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.pricing_tiers_product (
  id bigint NOT NULL DEFAULT nextval('pricing_tiers_product_id_seq'::regclass),
  product_id bigint NOT NULL,
  min_quantity integer NOT NULL CHECK (min_quantity > 0),
  max_quantity integer,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pricing_tiers_product_pkey PRIMARY KEY (id),
  CONSTRAINT pricing_tiers_product_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.bundles (
  id bigint NOT NULL DEFAULT nextval('bundles_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  components jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  discount_pct integer,
  CONSTRAINT bundles_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- FABRICS
-- ============================================================================

CREATE TABLE public.fabrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  composition text,
  gsm integer,
  stretch boolean,
  moisture_wicking boolean,
  colorfastness_rating integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  use_case text,
  video_url text,
  sort_order integer DEFAULT 0,
  price_modifier_cents integer DEFAULT 0,
  CONSTRAINT fabrics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.fabric_aliases (
  alias text NOT NULL,
  canonical_name text NOT NULL,
  CONSTRAINT fabric_aliases_pkey PRIMARY KEY (alias),
  CONSTRAINT fabric_aliases_canonical_name_fkey FOREIGN KEY (canonical_name) REFERENCES public.fabrics(name)
);

CREATE TABLE public.product_fabric_recommendations (
  id bigint NOT NULL DEFAULT nextval('product_fabric_recommendations_id_seq'::regclass),
  product_type_slug text NOT NULL,
  fabric_name text NOT NULL,
  suitability smallint NOT NULL CHECK (suitability >= 1 AND suitability <= 5),
  CONSTRAINT product_fabric_recommendations_pkey PRIMARY KEY (id),
  CONSTRAINT product_fabric_recommendations_product_type_slug_fkey FOREIGN KEY (product_type_slug) REFERENCES public.product_types(slug)
);

CREATE TABLE public.sport_fabric_overrides (
  id bigint NOT NULL DEFAULT nextval('sport_fabric_overrides_id_seq'::regclass),
  sport_slug text NOT NULL,
  product_type_slug text NOT NULL,
  fabric_name text NOT NULL,
  suitability smallint NOT NULL CHECK (suitability >= 1 AND suitability <= 5),
  CONSTRAINT sport_fabric_overrides_pkey PRIMARY KEY (id),
  CONSTRAINT sport_fabric_overrides_sport_slug_fkey FOREIGN KEY (sport_slug) REFERENCES public.sports(slug),
  CONSTRAINT sport_fabric_overrides_product_type_slug_fkey FOREIGN KEY (product_type_slug) REFERENCES public.product_types(slug)
);

-- ============================================================================
-- DESIGNS
-- ============================================================================

CREATE TABLE public.designs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  designer_name text,
  style_tags ARRAY DEFAULT ARRAY[]::text[],
  color_scheme ARRAY DEFAULT ARRAY[]::text[],
  is_customizable boolean DEFAULT true,
  allows_recoloring boolean DEFAULT true,
  featured boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT designs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.design_mockups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  design_id uuid NOT NULL,
  sport_id bigint NOT NULL,
  product_type_slug text NOT NULL,
  mockup_url text NOT NULL,
  view_angle text,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  product_id bigint,
  CONSTRAINT design_mockups_pkey PRIMARY KEY (id),
  CONSTRAINT design_mockups_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id),
  CONSTRAINT design_mockups_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id),
  CONSTRAINT design_mockups_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE public.design_products (
  design_id uuid NOT NULL,
  product_id bigint NOT NULL,
  is_recommended boolean DEFAULT true,
  preview_mockup_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_products_pkey PRIMARY KEY (design_id, product_id),
  CONSTRAINT design_products_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id),
  CONSTRAINT design_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT design_products_preview_mockup_id_fkey FOREIGN KEY (preview_mockup_id) REFERENCES public.design_mockups(id)
);

CREATE TABLE public.design_candidates (
  id bigint NOT NULL DEFAULT nextval('design_candidates_id_seq'::regclass),
  team_id uuid NOT NULL,
  title text,
  image_url text,
  notes text,
  status text DEFAULT 'proposed'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_candidates_pkey PRIMARY KEY (id),
  CONSTRAINT design_candidates_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- ============================================================================
-- DESIGN REQUESTS
-- ============================================================================

CREATE TABLE public.design_requests (
  id bigint NOT NULL DEFAULT nextval('design_requests_id_seq'::regclass),
  team_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  brief text,
  status text NOT NULL DEFAULT 'open'::text CHECK (status = ANY (ARRAY['pending'::text, 'rendering'::text, 'ready'::text, 'cancelled'::text, 'in_review'::text, 'changes_requested'::text, 'approved'::text, 'rejected'::text, 'design_ready'::text])),
  selected_candidate_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid,
  user_type text CHECK (user_type = ANY (ARRAY['player'::text, 'manager'::text])),
  team_slug text,
  primary_color text,
  secondary_color text,
  accent_color text,
  logo_url text,
  logo_placements jsonb DEFAULT '{}'::jsonb,
  selected_apparel jsonb DEFAULT '{}'::jsonb,
  uniform_details jsonb DEFAULT '{}'::jsonb,
  names_numbers boolean DEFAULT false,
  product_slug text,
  sport_slug text,
  product_name text,
  admin_comments jsonb DEFAULT '[]'::jsonb,
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])),
  mockup_urls ARRAY DEFAULT ARRAY[]::text[],
  version integer DEFAULT 1,
  render_spec jsonb,
  output_url text,
  order_id uuid,
  approval_status text DEFAULT 'pending_review'::text CHECK (approval_status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'changes_requested'::text, 'revision_ready'::text])),
  approved_at timestamp with time zone,
  approved_by uuid,
  revision_count integer DEFAULT 0,
  voting_enabled boolean DEFAULT false,
  design_options jsonb DEFAULT '[]'::jsonb,
  voting_closes_at timestamp with time zone,
  approval_votes_count integer DEFAULT 0,
  rejection_votes_count integer DEFAULT 0,
  required_approvals integer DEFAULT 1,
  feedback text,
  design_id uuid,
  sub_team_id uuid,
  estimated_roster_size integer CHECK (estimated_roster_size IS NULL OR estimated_roster_size >= 0 AND estimated_roster_size <= 200),
  mockup_preference text DEFAULT 'both'::text CHECK (mockup_preference = ANY (ARRAY['home'::text, 'away'::text, 'both'::text])),
  mockups jsonb DEFAULT '{}'::jsonb,
  bulk_order_id uuid,
  is_part_of_bulk boolean DEFAULT false,
  CONSTRAINT design_requests_pkey PRIMARY KEY (id),
  CONSTRAINT design_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT design_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id),
  CONSTRAINT design_requests_selected_candidate_id_fkey FOREIGN KEY (selected_candidate_id) REFERENCES public.design_candidates(id),
  CONSTRAINT design_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT design_requests_team_slug_fkey FOREIGN KEY (team_slug) REFERENCES public.teams(slug),
  CONSTRAINT design_requests_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT design_requests_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id),
  CONSTRAINT design_requests_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id),
  CONSTRAINT design_requests_sub_team_id_fkey FOREIGN KEY (sub_team_id) REFERENCES public.institution_sub_teams(id)
);

CREATE TABLE public.design_request_activity (
  id bigint NOT NULL DEFAULT nextval('design_request_activity_id_seq'::regclass),
  design_request_id bigint,
  action text NOT NULL,
  description text,
  metadata jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_request_activity_pkey PRIMARY KEY (id),
  CONSTRAINT design_request_activity_design_request_id_fkey FOREIGN KEY (design_request_id) REFERENCES public.design_requests(id),
  CONSTRAINT design_request_activity_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE TABLE public.design_request_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  design_request_id integer NOT NULL,
  user_id uuid NOT NULL,
  reaction text NOT NULL CHECK (reaction = ANY (ARRAY['like'::text, 'dislike'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT design_request_reactions_pkey PRIMARY KEY (id),
  CONSTRAINT design_request_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT design_request_reactions_design_request_id_fkey FOREIGN KEY (design_request_id) REFERENCES public.design_requests(id)
);

CREATE TABLE public.design_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  design_request_id bigint NOT NULL,
  user_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote = ANY (ARRAY['approve'::text, 'reject'::text, 'abstain'::text])),
  design_option_index integer DEFAULT 0,
  comment text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_votes_pkey PRIMARY KEY (id),
  CONSTRAINT design_votes_design_request_id_fkey FOREIGN KEY (design_request_id) REFERENCES public.design_requests(id),
  CONSTRAINT design_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.design_feedback (
  id bigint NOT NULL DEFAULT nextval('design_feedback_id_seq'::regclass),
  design_request_id bigint NOT NULL,
  user_id uuid NOT NULL,
  feedback_type text NOT NULL CHECK (feedback_type = ANY (ARRAY['approval'::text, 'changes_requested'::text, 'comment'::text, 'admin_response'::text])),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  requested_changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT design_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT design_feedback_design_request_id_fkey FOREIGN KEY (design_request_id) REFERENCES public.design_requests(id),
  CONSTRAINT design_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- TEAMS & INSTITUTIONS
-- ============================================================================

CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sport_id bigint,
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
  sports ARRAY DEFAULT ARRAY[]::text[],
  setup_completed boolean DEFAULT false,
  sport text,
  institution_name text,
  gender_category text CHECK (gender_category = ANY (ARRAY['male'::text, 'female'::text, 'both'::text])),
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'mixed'::text])),
  manager_only_team boolean DEFAULT false,
  CONSTRAINT teams_pkey PRIMARY KEY (id),
  CONSTRAINT teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id),
  CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id),
  CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id),
  CONSTRAINT teams_current_owner_id_fkey FOREIGN KEY (current_owner_id) REFERENCES auth.users(id)
);

CREATE TABLE public.team_settings (
  team_id uuid NOT NULL,
  approval_mode text NOT NULL DEFAULT 'owner_only'::text,
  min_approvals_required integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  voting_deadline timestamp with time zone,
  designated_voters ARRAY DEFAULT ARRAY[]::uuid[],
  player_info_mode text DEFAULT 'hybrid'::text,
  self_service_enabled boolean DEFAULT true,
  info_collection_link text,
  info_collection_token text,
  info_collection_expires_at timestamp with time zone,
  access_mode text DEFAULT 'invite_only'::text,
  allow_member_invites boolean DEFAULT false,
  notify_on_design_ready boolean DEFAULT true,
  notify_on_vote_required boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  primary_color text,
  secondary_color text,
  tertiary_color text,
  payment_mode text DEFAULT 'individual'::text CHECK (payment_mode = ANY (ARRAY['individual'::text, 'manager_pays_all'::text])),
  logo_url text,
  banner_url text,
  allow_program_autonomy boolean DEFAULT false,
  require_ad_approval_for_orders boolean DEFAULT true,
  budget_tracking_enabled boolean DEFAULT false,
  budget_per_program_cents integer,
  fiscal_year_start_month integer DEFAULT 1 CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12),
  CONSTRAINT team_settings_pkey PRIMARY KEY (team_id),
  CONSTRAINT team_settings_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

CREATE TABLE public.team_memberships (
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'player'::text])),
  created_at timestamp with time zone DEFAULT now(),
  institution_role text CHECK (institution_role = ANY (ARRAY['athletic_director'::text, 'program_coordinator'::text, 'head_coach'::text, 'assistant'::text])),
  CONSTRAINT team_memberships_pkey PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.team_members (
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id),
  CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.team_players (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  player_name text NOT NULL,
  jersey_number text,
  position text,
  size text,
  is_starter boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  jersey_name text,
  CONSTRAINT team_players_pkey PRIMARY KEY (id),
  CONSTRAINT team_players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_players_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.team_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  player_submission_id uuid,
  email text,
  token text NOT NULL UNIQUE,
  role text DEFAULT 'player'::text CHECK (role = ANY (ARRAY['player'::text, 'manager'::text, 'coach'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'cancelled'::text])),
  invited_by uuid,
  accepted_by uuid,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  created_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  CONSTRAINT team_invites_pkey PRIMARY KEY (id),
  CONSTRAINT team_invites_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_invites_player_submission_id_fkey FOREIGN KEY (player_submission_id) REFERENCES public.player_info_submissions(id),
  CONSTRAINT team_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id),
  CONSTRAINT team_invites_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES auth.users(id)
);

CREATE TABLE public.team_ownership_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  previous_owner_id uuid,
  new_owner_id uuid,
  transferred_by uuid,
  transfer_reason text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT team_ownership_history_pkey PRIMARY KEY (id),
  CONSTRAINT team_ownership_history_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT team_ownership_history_previous_owner_id_fkey FOREIGN KEY (previous_owner_id) REFERENCES auth.users(id),
  CONSTRAINT team_ownership_history_new_owner_id_fkey FOREIGN KEY (new_owner_id) REFERENCES auth.users(id),
  CONSTRAINT team_ownership_history_transferred_by_fkey FOREIGN KEY (transferred_by) REFERENCES auth.users(id)
);

CREATE TABLE public.roster_members (
  id bigint NOT NULL DEFAULT nextval('roster_members_id_seq'::regclass),
  team_id uuid NOT NULL,
  full_name text NOT NULL,
  number text,
  size text,
  email text,
  phone text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roster_members_pkey PRIMARY KEY (id),
  CONSTRAINT roster_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- ============================================================================
-- INSTITUTIONS (ATHLETIC DIRECTORS)
-- ============================================================================

CREATE TABLE public.institution_sub_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  institution_team_id uuid NOT NULL,
  name text NOT NULL,
  slug text,
  sport_id bigint NOT NULL,
  level text,
  head_coach_user_id uuid,
  coordinator_user_id uuid,
  colors jsonb DEFAULT '{}'::jsonb,
  logo_url text,
  active boolean DEFAULT true,
  season_year text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gender_category text DEFAULT 'male'::text CHECK (gender_category = ANY (ARRAY['male'::text, 'female'::text, 'both'::text])),
  jersey_name_style text CHECK (jersey_name_style = ANY (ARRAY['player_name'::text, 'team_name'::text, 'none'::text])),
  jersey_team_name text,
  coach_name text,
  division_group text,
  CONSTRAINT institution_sub_teams_pkey PRIMARY KEY (id),
  CONSTRAINT institution_sub_teams_institution_team_id_fkey FOREIGN KEY (institution_team_id) REFERENCES public.teams(id),
  CONSTRAINT institution_sub_teams_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id),
  CONSTRAINT institution_sub_teams_head_coach_user_id_fkey FOREIGN KEY (head_coach_user_id) REFERENCES auth.users(id),
  CONSTRAINT institution_sub_teams_coordinator_user_id_fkey FOREIGN KEY (coordinator_user_id) REFERENCES auth.users(id)
);

CREATE TABLE public.institution_sub_team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sub_team_id uuid NOT NULL,
  player_name text NOT NULL,
  email text,
  position text,
  jersey_number integer CHECK (jersey_number > 0 AND jersey_number <= 999),
  size text,
  additional_info jsonb DEFAULT '{}'::jsonb,
  joined_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT institution_sub_team_members_pkey PRIMARY KEY (id),
  CONSTRAINT institution_sub_team_members_sub_team_id_fkey FOREIGN KEY (sub_team_id) REFERENCES public.institution_sub_teams(id),
  CONSTRAINT institution_sub_team_members_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- ============================================================================
-- PLAYER INFO & SUBMISSIONS
-- ============================================================================

CREATE TABLE public.player_info_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  design_request_id bigint,
  user_id uuid,
  player_name text NOT NULL,
  jersey_number text,
  size text NOT NULL,
  position text,
  additional_notes text,
  submitted_by_manager boolean DEFAULT false,
  submission_token text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  confirmed_by_player boolean DEFAULT false,
  confirmation_date timestamp without time zone,
  confirmation_method character varying,
  jersey_name text,
  CONSTRAINT player_info_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT player_info_submissions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT player_info_submissions_design_request_id_fkey FOREIGN KEY (design_request_id) REFERENCES public.design_requests(id),
  CONSTRAINT player_info_submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- ============================================================================
-- SHIPPING
-- ============================================================================

CREATE TABLE public.shipping_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid,
  recipient_name text NOT NULL,
  recipient_phone text NOT NULL,
  street_address text NOT NULL,
  address_line_2 text,
  commune text NOT NULL,
  city text NOT NULL,
  region text NOT NULL CHECK (region = ANY (ARRAY['Región de Arica y Parinacota'::text, 'Región de Tarapacá'::text, 'Región de Antofagasta'::text, 'Región de Atacama'::text, 'Región de Coquimbo'::text, 'Región de Valparaíso'::text, 'Región Metropolitana de Santiago'::text, 'Región del Libertador Gral. Bernardo O''Higgins'::text, 'Región del Maule'::text, 'Región de Ñuble'::text, 'Región del Biobío'::text, 'Región de La Araucanía'::text, 'Región de Los Ríos'::text, 'Región de Los Lagos'::text, 'Región de Aysén del Gral. Carlos Ibáñez del Campo'::text, 'Región de Magallanes y de la Antártica Chilena'::text])),
  postal_code text,
  is_default boolean DEFAULT false,
  delivery_instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shipping_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT shipping_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT shipping_addresses_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);

-- ============================================================================
-- SIZE CHARTS (SIZING CALCULATOR)
-- ============================================================================

CREATE TABLE public.size_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sport_id integer,
  product_type_slug text NOT NULL,
  gender USER-DEFINED NOT NULL,
  size USER-DEFINED NOT NULL,
  height_min_cm integer NOT NULL CHECK (height_min_cm > 0 AND height_min_cm <= 250),
  height_max_cm integer NOT NULL CHECK (height_max_cm > 0 AND height_max_cm <= 250),
  chest_width_cm numeric NOT NULL CHECK (chest_width_cm > 0::numeric),
  jersey_length_cm numeric NOT NULL CHECK (jersey_length_cm > 0::numeric),
  shorts_length_cm numeric CHECK (shorts_length_cm IS NULL OR shorts_length_cm > 0::numeric),
  sleeve_length_cm numeric CHECK (sleeve_length_cm IS NULL OR sleeve_length_cm > 0::numeric),
  waist_width_cm numeric CHECK (waist_width_cm IS NULL OR waist_width_cm > 0::numeric),
  hip_width_cm numeric CHECK (hip_width_cm IS NULL OR hip_width_cm > 0::numeric),
  weight_min_kg integer CHECK (weight_min_kg IS NULL OR weight_min_kg > 0),
  weight_max_kg integer CHECK (weight_max_kg IS NULL OR weight_max_kg > 0),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT size_charts_pkey PRIMARY KEY (id),
  CONSTRAINT size_charts_sport_id_fkey FOREIGN KEY (sport_id) REFERENCES public.sports(id)
);

-- ============================================================================
-- USER PROFILES
-- ============================================================================

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false,
  role USER-DEFINED NOT NULL DEFAULT 'customer'::user_role,
  user_type text CHECK (user_type IS NULL OR (user_type = ANY (ARRAY['player'::text, 'manager'::text, 'athletic_director'::text, 'hybrid'::text]))),
  athletic_profile jsonb DEFAULT '{}'::jsonb,
  manager_profile jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{"language": "es", "notifications": {"email": true}}'::jsonb,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- ============================================================================
-- GEAR REQUESTS (LEGACY/UNUSED?)
-- ============================================================================

CREATE TABLE public.gear_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'pending'::gear_request_status,
  apparel_selections jsonb NOT NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gear_requests_pkey PRIMARY KEY (id),
  CONSTRAINT gear_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT gear_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.profiles(id)
);

-- ============================================================================
-- MANUFACTURER (LEGACY/UNUSED?)
-- ============================================================================

CREATE TABLE public.manufacturer_users (
  id bigint NOT NULL DEFAULT nextval('manufacturer_users_id_seq'::regclass),
  email text NOT NULL UNIQUE,
  company_name text,
  role text DEFAULT 'manufacturer'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT manufacturer_users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.manufacturer_order_assignments (
  id bigint NOT NULL DEFAULT nextval('manufacturer_order_assignments_id_seq'::regclass),
  manufacturer_id bigint NOT NULL,
  order_id uuid NOT NULL,
  assigned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT manufacturer_order_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT manufacturer_order_assignments_manufacturer_id_fkey FOREIGN KEY (manufacturer_id) REFERENCES public.manufacturer_users(id),
  CONSTRAINT manufacturer_order_assignments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

-- ============================================================================
-- NOTES
-- ============================================================================

-- USER-DEFINED types referenced above:
--   - cart_status
--   - gear_request_status
--   - payment_provider
--   - payment_status
--   - payment_event_type
--   - user_role
--   - gender (for size_charts)
--   - size (for size_charts)

-- These enum types would be defined separately with CREATE TYPE statements

-- ============================================================================
-- END OF SCHEMA REFERENCE
-- ============================================================================
