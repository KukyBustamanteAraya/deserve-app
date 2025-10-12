-- Migration: 010_gear_requests.sql
-- Description: Create gear_requests table for team apparel requests

-- ============================================================================
-- EXTENSIONS & FUNCTIONS
-- ============================================================================

-- Ensure uuid generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Updated_at trigger function (shared across tables)
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := timezone('utc', now());
  RETURN NEW;
END; $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- Gear requests table
CREATE TABLE IF NOT EXISTS public.gear_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled')),
  apparel_selections JSONB NOT NULL, -- Array of {apparel_type, product_id, quantity}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for faster lookups by team
CREATE INDEX IF NOT EXISTS idx_gear_requests_team_id ON public.gear_requests(team_id);

-- Index for faster lookups by requester
CREATE INDEX IF NOT EXISTS idx_gear_requests_requested_by ON public.gear_requests(requested_by);

-- Index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_gear_requests_status ON public.gear_requests(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Apply updated_at trigger
CREATE TRIGGER gear_requests_updated_at BEFORE UPDATE ON public.gear_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.gear_requests ENABLE ROW LEVEL SECURITY;

-- Team members and owners can view gear requests for their teams
CREATE POLICY "Team members can view team gear requests"
  ON public.gear_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = gear_requests.team_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = t.id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Team members and owners can create gear requests
CREATE POLICY "Team members can create gear requests"
  ON public.gear_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requested_by
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = gear_requests.team_id
      AND (
        t.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = t.id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Team owners can update gear requests (for status changes)
CREATE POLICY "Team owners can update gear requests"
  ON public.gear_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = gear_requests.team_id
      AND t.created_by = auth.uid()
    )
  );

-- Requesters can delete their own pending requests
CREATE POLICY "Requesters can delete pending requests"
  ON public.gear_requests FOR DELETE
  USING (
    auth.uid() = requested_by
    AND status = 'pending'
  );

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant access to gear_requests table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gear_requests TO authenticated;
