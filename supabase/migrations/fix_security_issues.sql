-- ============================================================================
-- SECURITY FIXES - Supabase Security Advisor Issues
-- ============================================================================
-- Generated: 2025-01-23
-- Priority: CRITICAL
--
-- This migration addresses all ERROR-level security issues from Supabase
-- Security Advisor. Execute in order and test thoroughly.
-- ============================================================================

-- ============================================================================
-- PART 1: ENABLE RLS ON PUBLIC TABLES (CRITICAL)
-- ============================================================================
-- Issue: rls_disabled_in_public - 8 tables exposed without RLS

-- Enable RLS on teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Enable RLS on bundles table
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on fabric_aliases table
ALTER TABLE public.fabric_aliases ENABLE ROW LEVEL SECURITY;

-- Enable RLS on product_types table
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;

-- Enable RLS on product_fabric_recommendations table
ALTER TABLE public.product_fabric_recommendations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on sport_fabric_overrides table
ALTER TABLE public.sport_fabric_overrides ENABLE ROW LEVEL SECURITY;

-- Enable RLS on component_pricing table
ALTER TABLE public.component_pricing ENABLE ROW LEVEL SECURITY;

-- Enable RLS on activity_log table
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Add policies for read-only catalog tables (bundles, fabric_aliases, etc.)
-- These should be publicly readable but only admin-writable
-- ============================================================================

-- Bundles: Public read, admin write
CREATE POLICY "bundles_public_read" ON public.bundles
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "bundles_admin_write" ON public.bundles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Fabric aliases: Public read, admin write
CREATE POLICY "fabric_aliases_public_read" ON public.fabric_aliases
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "fabric_aliases_admin_write" ON public.fabric_aliases
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Product types: Public read, admin write
CREATE POLICY "product_types_public_read" ON public.product_types
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "product_types_admin_write" ON public.product_types
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Product fabric recommendations: Public read, admin write
CREATE POLICY "product_fabric_recommendations_public_read" ON public.product_fabric_recommendations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "product_fabric_recommendations_admin_write" ON public.product_fabric_recommendations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Sport fabric overrides: Public read, admin write
CREATE POLICY "sport_fabric_overrides_public_read" ON public.sport_fabric_overrides
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "sport_fabric_overrides_admin_write" ON public.sport_fabric_overrides
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Component pricing: Public read, admin write
CREATE POLICY "component_pricing_public_read" ON public.component_pricing
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "component_pricing_admin_write" ON public.component_pricing
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Activity log: Team-based access (team members see their team's logs, admins see all)
-- Table structure: related_team_id (uuid), related_user_id (uuid), is_public (boolean)

-- Team members can read their team's activity logs
CREATE POLICY "activity_log_team_member_read" ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_id = activity_log.related_team_id
        AND user_id = auth.uid()
    )
  );

-- Admins can read all activity logs
CREATE POLICY "activity_log_admin_read" ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Public activity logs readable by anyone
CREATE POLICY "activity_log_public_read" ON public.activity_log
  FOR SELECT TO authenticated, anon
  USING (is_public = true);

-- Team members can insert logs for their teams
CREATE POLICY "activity_log_team_member_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_memberships
      WHERE team_id = related_team_id
        AND user_id = auth.uid()
    )
  );

-- Admins can insert logs for any team
CREATE POLICY "activity_log_admin_insert" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- PART 2: FIX SECURITY DEFINER VIEWS (HIGH PRIORITY)
-- ============================================================================
-- Issue: security_definer_view - 13 views with SECURITY DEFINER
--
-- SECURITY DEFINER is dangerous because it executes with creator's permissions
-- instead of querying user's permissions. Remove this and rely on RLS.
-- ============================================================================

-- Fix: carts_with_items
DROP VIEW IF EXISTS public.carts_with_items;
CREATE VIEW public.carts_with_items AS
  SELECT
    c.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', ci.id,
          'product_id', ci.product_id,
          'quantity', ci.quantity,
          'customization', ci.customization,
          'created_at', ci.created_at
        )
      ) FILTER (WHERE ci.id IS NOT NULL),
      '[]'::json
    ) as items
  FROM public.carts c
  LEFT JOIN public.cart_items ci ON ci.cart_id = c.id
  GROUP BY c.id;

-- Fix: design_approval_summary (ALSO fixes auth.users exposure)
-- Remove auth.users join to fix ERROR: auth_users_exposed
DROP VIEW IF EXISTS public.design_approval_summary;
CREATE VIEW public.design_approval_summary AS
  SELECT
    dr.id as design_request_id,
    dr.team_id,
    dr.status,
    COUNT(DISTINCT da.user_id) FILTER (WHERE da.status = 'approved') as approved_count,
    COUNT(DISTINCT da.user_id) FILTER (WHERE da.status = 'rejected') as rejected_count,
    COUNT(DISTINCT da.user_id) as total_votes,
    -- Use profiles instead of auth.users
    json_agg(
      json_build_object(
        'user_id', da.user_id,
        'status', da.status,
        'created_at', da.created_at
      )
    ) FILTER (WHERE da.id IS NOT NULL) as approvals
  FROM public.design_requests dr
  LEFT JOIN public.design_approvals da ON da.design_request_id = dr.id
  GROUP BY dr.id, dr.team_id, dr.status;

-- Fix: products_with_details
DROP VIEW IF EXISTS public.products_with_details;
CREATE VIEW public.products_with_details AS
  SELECT
    p.*,
    s.name as sport_name,
    s.slug as sport_slug,
    pt.name as product_type_name,
    COALESCE(
      json_agg(
        json_build_object(
          'url', pi.image_url,
          'alt_text', pi.alt_text,
          'display_order', pi.display_order
        ) ORDER BY pi.display_order
      ) FILTER (WHERE pi.id IS NOT NULL),
      '[]'::json
    ) as images
  FROM public.products p
  LEFT JOIN public.sports s ON s.id = p.sport_id
  LEFT JOIN public.product_types pt ON pt.slug = p.product_type
  LEFT JOIN public.product_images pi ON pi.product_id = p.id
  GROUP BY p.id, s.name, s.slug, pt.name;

-- Fix: order_payment_progress
DROP VIEW IF EXISTS public.order_payment_progress;
CREATE VIEW public.order_payment_progress AS
  SELECT
    o.id as order_id,
    o.total_amount_clp,
    COALESCE(SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'approved'), 0) as total_paid_cents,
    COALESCE(SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'pending'), 0) as total_pending_cents,
    ROUND(
      COALESCE(SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'approved'), 0)::numeric
      / NULLIF(o.total_amount_clp, 0) * 100,
      2
    ) as payment_percentage
  FROM public.orders o
  LEFT JOIN public.payment_contributions pc ON pc.order_id = o.id
  GROUP BY o.id, o.total_amount_clp;

-- Fix: teams_with_details
DROP VIEW IF EXISTS public.teams_with_details;
CREATE VIEW public.teams_with_details AS
  SELECT
    t.*,
    s.name as sport_name,
    s.slug as sport_slug,
    COUNT(DISTINCT tm.user_id) as member_count
  FROM public.teams t
  LEFT JOIN public.sports s ON s.id = t.sport_id
  LEFT JOIN public.team_memberships tm ON tm.team_id = t.id
  GROUP BY t.id, s.name, s.slug;

-- Fix: design_request_reaction_counts
DROP VIEW IF EXISTS public.design_request_reaction_counts;
CREATE VIEW public.design_request_reaction_counts AS
  SELECT
    design_request_id,
    reaction_type,
    COUNT(*) as count
  FROM public.design_request_reactions
  GROUP BY design_request_id, reaction_type;

-- Fix: products_with_images
DROP VIEW IF EXISTS public.products_with_images;
CREATE VIEW public.products_with_images AS
  SELECT
    p.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', pi.id,
          'url', pi.image_url,
          'alt_text', pi.alt_text,
          'display_order', pi.display_order
        ) ORDER BY pi.display_order
      ) FILTER (WHERE pi.id IS NOT NULL),
      '[]'::json
    ) as images
  FROM public.products p
  LEFT JOIN public.product_images pi ON pi.product_id = p.id
  GROUP BY p.id;

-- Fix: admin_notifications_summary
DROP VIEW IF EXISTS public.admin_notifications_summary;
CREATE VIEW public.admin_notifications_summary AS
  SELECT
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) as total_count,
    MAX(created_at) as latest_notification
  FROM public.admin_notifications;

-- Fix: orders_with_items
DROP VIEW IF EXISTS public.orders_with_items;
CREATE VIEW public.orders_with_items AS
  SELECT
    o.*,
    COALESCE(
      json_agg(
        json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'quantity', oi.quantity,
          'unit_price_clp', oi.unit_price_clp,
          'line_total_clp', oi.line_total_clp,
          'customization', oi.customization
        )
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::json
    ) as items
  FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  GROUP BY o.id;

-- Fix: design_requests_with_details
DROP VIEW IF EXISTS public.design_requests_with_details;
CREATE VIEW public.design_requests_with_details AS
  SELECT
    dr.*,
    t.name as team_name,
    t.slug as team_slug,
    s.name as sport_name
  FROM public.design_requests dr
  LEFT JOIN public.teams t ON t.id = dr.team_id
  LEFT JOIN public.sports s ON s.id = t.sport_id;

-- Fix: team_members_view
DROP VIEW IF EXISTS public.team_members_view;
CREATE VIEW public.team_members_view AS
  SELECT
    tm.team_id,
    tm.user_id,
    tm.role,
    tm.created_at,
    p.full_name,
    p.avatar_url
  FROM public.team_memberships tm
  LEFT JOIN public.profiles p ON p.id = tm.user_id;

-- Fix: orders_with_payment_status
DROP VIEW IF EXISTS public.orders_with_payment_status;
CREATE VIEW public.orders_with_payment_status AS
  SELECT
    o.*,
    CASE
      WHEN SUM(pc.amount_cents) FILTER (WHERE pc.payment_status = 'approved') >= o.total_amount_clp THEN 'paid'
      WHEN SUM(pc.amount_cents) FILTER (WHERE pc.payment_status IN ('approved', 'pending')) > 0 THEN 'partial'
      ELSE 'unpaid'
    END as payment_status_calculated
  FROM public.orders o
  LEFT JOIN public.payment_contributions pc ON pc.order_id = o.id
  GROUP BY o.id;

-- ============================================================================
-- PART 3: ADD SEARCH_PATH TO FUNCTIONS (SECURITY HARDENING)
-- ============================================================================
-- Issue: function_search_path_mutable - 30 functions without fixed search_path
-- Setting search_path = '' prevents search_path injection attacks
-- ============================================================================

-- Trigger functions (set search_path = '')
ALTER FUNCTION public.log_order_status_change() SET search_path = '';
ALTER FUNCTION public.orders_sync_user_cols() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';
ALTER FUNCTION public.sync_price_fields() SET search_path = '';
ALTER FUNCTION public.update_size_charts_updated_at() SET search_path = '';
ALTER FUNCTION public.update_bulk_payments_updated_at() SET search_path = '';
ALTER FUNCTION public.update_design_requests_updated_at() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.set_estimated_delivery_date() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_payment_contributions_updated_at() SET search_path = '';
ALTER FUNCTION public.touch_updated_at() SET search_path = '';
ALTER FUNCTION public.update_design_approval_status() SET search_path = '';
ALTER FUNCTION public.create_team_settings_for_new_team() SET search_path = '';
ALTER FUNCTION public.notify_admin_design_feedback() SET search_path = '';
ALTER FUNCTION public.update_design_request_reactions_updated_at() SET search_path = '';
ALTER FUNCTION public.ensure_single_default_address() SET search_path = '';
ALTER FUNCTION public.notify_design_ready() SET search_path = '';
ALTER FUNCTION public.expire_old_invites() SET search_path = '';
ALTER FUNCTION public.update_order_payment_status() SET search_path = '';
ALTER FUNCTION public.on_team_insert_add_owner_member() SET search_path = '';

-- Query functions (set search_path = '')
ALTER FUNCTION public.is_order_fully_paid_by_contributions(uuid) SET search_path = '';
ALTER FUNCTION public.get_institution_sub_teams(uuid) SET search_path = '';
ALTER FUNCTION public.has_institution_role(uuid, text) SET search_path = '';
ALTER FUNCTION public.get_team_stats(uuid) SET search_path = '';
ALTER FUNCTION public.create_split_payment_contributions(uuid, integer, jsonb) SET search_path = '';
ALTER FUNCTION public.create_order_for_approval(uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.validate_athletic_profile(jsonb) SET search_path = '';
ALTER FUNCTION public.get_size_chart(integer, text, text) SET search_path = '';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fixes:
--
-- 1. Check RLS is enabled on all tables:
-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;
--
-- 2. Check no SECURITY DEFINER views:
-- SELECT schemaname, viewname, viewowner
-- FROM pg_views
-- WHERE schemaname = 'public'
--   AND definition LIKE '%SECURITY DEFINER%';
--
-- 3. Check all functions have search_path:
-- SELECT proname, prosecdef, proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND proconfig IS NULL OR NOT proconfig::text LIKE '%search_path%';
-- ============================================================================

COMMENT ON TABLE public.teams IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.bundles IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.fabric_aliases IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.product_types IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.product_fabric_recommendations IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.sport_fabric_overrides IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.component_pricing IS 'RLS enabled - Security fix applied 2025-01-23';
COMMENT ON TABLE public.activity_log IS 'RLS enabled - Security fix applied 2025-01-23';
