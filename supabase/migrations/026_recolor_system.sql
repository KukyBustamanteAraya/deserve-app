-- Migration 026: Add OpenAI Recolor System columns
-- This enables automated mockup generation for design requests

-- Add recolor-specific columns to design_requests
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS render_spec JSONB,
  ADD COLUMN IF NOT EXISTS output_url TEXT,
  ADD COLUMN IF NOT EXISTS mockup_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS admin_comments JSONB DEFAULT '[]'::JSONB;

-- Create activity log table for audit trail
CREATE TABLE IF NOT EXISTS public.design_request_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_request_id UUID REFERENCES public.design_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for activity queries
CREATE INDEX IF NOT EXISTS idx_design_request_activity_request_id
  ON public.design_request_activity(design_request_id);

-- RLS for activity table
ALTER TABLE public.design_request_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all activity
CREATE POLICY "activity_admin_all"
  ON public.design_request_activity FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  );

-- Policy: Users can view activity on their own requests
CREATE POLICY "activity_user_select_own"
  ON public.design_request_activity FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.design_requests
      WHERE design_requests.id = design_request_activity.design_request_id
        AND design_requests.user_id = auth.uid()
    )
  );

-- Add orders enhancement columns (if not already exist)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery DATE;

-- Create storage bucket for rendered mockups (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('renders', 'renders', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for renders bucket
CREATE POLICY "renders_admin_all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'renders' AND (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE
    )
  ));

CREATE POLICY "renders_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'renders');

COMMENT ON TABLE public.design_request_activity IS 'Audit trail for design request status changes and admin actions';
COMMENT ON COLUMN public.design_requests.render_spec IS 'JSON spec for OpenAI image rendering (colors, masks, rules)';
COMMENT ON COLUMN public.design_requests.output_url IS 'Final rendered mockup URL from OpenAI';
COMMENT ON COLUMN public.design_requests.mockup_urls IS 'Array of all generated mockup variations';
COMMENT ON COLUMN public.design_requests.priority IS 'Request urgency for admin queue management';
COMMENT ON COLUMN public.design_requests.version IS 'Version number for design iterations';
COMMENT ON COLUMN public.design_requests.admin_comments IS 'Internal admin notes and communication';
