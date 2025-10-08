-- Migration: 033_design_approval_workflow_FIXED.sql
-- Description: Design approval workflow for customer feedback on mockups (FIXED for bigint)
-- Date: 2025-10-08

-- Add approval status to design_requests
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_review' CHECK (
    approval_status IN (
      'pending_review',    -- Awaiting customer review
      'approved',          -- Customer approved the design
      'changes_requested', -- Customer requested changes
      'revision_ready'     -- New revision ready for review
    )
  ),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_count INT DEFAULT 0;

-- Create design_feedback table for comments and change requests
CREATE TABLE IF NOT EXISTS public.design_feedback (
  id BIGSERIAL PRIMARY KEY,
  design_request_id BIGINT NOT NULL REFERENCES public.design_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  feedback_type TEXT NOT NULL CHECK (feedback_type IN (
    'approval',          -- Customer approved
    'changes_requested', -- Customer wants changes
    'comment',           -- General comment
    'admin_response'     -- Admin/designer response
  )),

  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment URLs

  -- If changes requested, what specifically?
  requested_changes JSONB DEFAULT '{}'::jsonb, -- { colors: true, logos: true, text: false, etc }

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_design_feedback_design_request
  ON public.design_feedback(design_request_id);
CREATE INDEX IF NOT EXISTS idx_design_feedback_user
  ON public.design_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_design_feedback_created_at
  ON public.design_feedback(created_at DESC);

-- RLS for design_feedback
ALTER TABLE public.design_feedback ENABLE ROW LEVEL SECURITY;

-- Team members can read feedback for their team's designs
CREATE POLICY "design_feedback_team_read" ON public.design_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_requests dr
      JOIN public.team_memberships tm ON tm.team_id = dr.team_id
      WHERE dr.id = design_feedback.design_request_id
      AND tm.user_id = auth.uid()
    )
  );

-- Team members can add feedback to their team's designs
CREATE POLICY "design_feedback_team_write" ON public.design_feedback
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.design_requests dr
      JOIN public.team_memberships tm ON tm.team_id = dr.team_id
      WHERE dr.id = design_feedback.design_request_id
      AND tm.user_id = auth.uid()
    )
  );

-- Admins can do everything
CREATE POLICY "design_feedback_admin_all" ON public.design_feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Function to update design_request approval status based on feedback
CREATE OR REPLACE FUNCTION update_design_approval_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the design_request based on feedback type
  IF NEW.feedback_type = 'approval' THEN
    UPDATE public.design_requests
    SET
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by = NEW.user_id,
      status = CASE
        WHEN status = 'pending' OR status = 'rendering' THEN 'ready'
        ELSE status
      END
    WHERE id = NEW.design_request_id;

    -- Also update order status to design_approved if it's in design_review
    UPDATE public.orders
    SET status = 'design_approved'
    WHERE id = (SELECT order_id FROM public.design_requests WHERE id = NEW.design_request_id)
    AND status = 'design_review';

  ELSIF NEW.feedback_type = 'changes_requested' THEN
    UPDATE public.design_requests
    SET
      approval_status = 'changes_requested',
      revision_count = revision_count + 1
    WHERE id = NEW.design_request_id;

    -- Update order status
    UPDATE public.orders
    SET status = 'design_changes'
    WHERE id = (SELECT order_id FROM public.design_requests WHERE id = NEW.design_request_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update approval status
DROP TRIGGER IF EXISTS trg_update_design_approval_status ON public.design_feedback;
CREATE TRIGGER trg_update_design_approval_status
  AFTER INSERT ON public.design_feedback
  FOR EACH ROW
  WHEN (NEW.feedback_type IN ('approval', 'changes_requested'))
  EXECUTE FUNCTION update_design_approval_status();

-- Create a view for easy querying of design approval status
CREATE OR REPLACE VIEW public.design_approval_summary AS
SELECT
  dr.id AS design_request_id,
  dr.team_id,
  dr.product_name,
  dr.approval_status,
  dr.revision_count,
  dr.approved_at,
  dr.approved_by,
  u.email AS approved_by_email,
  (
    SELECT COUNT(*)
    FROM public.design_feedback df
    WHERE df.design_request_id = dr.id
  ) AS total_feedback_count,
  (
    SELECT json_agg(
      json_build_object(
        'id', df.id,
        'type', df.feedback_type,
        'message', df.message,
        'created_at', df.created_at,
        'user_email', u2.email
      ) ORDER BY df.created_at DESC
    )
    FROM public.design_feedback df
    LEFT JOIN auth.users u2 ON u2.id = df.user_id
    WHERE df.design_request_id = dr.id
    LIMIT 5
  ) AS recent_feedback
FROM public.design_requests dr
LEFT JOIN auth.users u ON u.id = dr.approved_by;

-- Grant access to view
GRANT SELECT ON public.design_approval_summary TO authenticated;

-- Comments
COMMENT ON TABLE public.design_feedback IS 'Customer feedback and approval workflow for design mockups';
COMMENT ON COLUMN public.design_requests.approval_status IS 'Design approval workflow status';
COMMENT ON COLUMN public.design_requests.revision_count IS 'Number of revision requests made by customer';
