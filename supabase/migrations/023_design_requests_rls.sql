-- Ensure teams table has slug column
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Make slug unique if it's not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'teams_slug_key'
  ) THEN
    ALTER TABLE public.teams ADD CONSTRAINT teams_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Housekeeping for design_requests
ALTER TABLE public.design_requests
  ADD COLUMN IF NOT EXISTS team_slug TEXT;

-- Drop existing constraint if it exists
ALTER TABLE public.design_requests
  DROP CONSTRAINT IF EXISTS design_requests_team_slug_fkey;

-- Tie to teams via slug (we chose slug for simplicity)
ALTER TABLE public.design_requests
  ADD CONSTRAINT design_requests_team_slug_fkey
  FOREIGN KEY (team_slug) REFERENCES public.teams(slug) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dr_user ON public.design_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_dr_team_slug ON public.design_requests(team_slug);
CREATE INDEX IF NOT EXISTS idx_dr_status ON public.design_requests(status);

-- Drop existing policy if exists
DROP POLICY IF EXISTS "dr_team_member_read" ON public.design_requests;

-- Team members can read
CREATE POLICY "dr_team_member_read" ON public.design_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      JOIN public.team_memberships m ON m.team_id = t.id
      WHERE t.slug = design_requests.team_slug
        AND m.user_id = auth.uid()
    )
  );
