-- =====================================================================
-- FIX: Allow Athletic Directors and Assistants to UPDATE roster members
-- =====================================================================
-- Created: 2025-10-19
-- Purpose: Fix RLS policies so Athletic Directors and Assistants can
--          update roster data (player names, sizes, etc.), not just view
--
-- ISSUE: Currently Athletic Directors can only SELECT roster members,
--        but cannot UPDATE them. This causes size/name assignments to
--        silently fail with empty result arrays.
-- =====================================================================

-- Add UPDATE and INSERT policies for Athletic Directors
CREATE POLICY "athletic_directors_manage_all_rosters"
ON public.institution_sub_team_members
FOR ALL
USING (
  sub_team_id IN (
    SELECT st.id
    FROM public.institution_sub_teams st
    INNER JOIN public.team_memberships tm
      ON st.institution_team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND tm.institution_role = 'athletic_director'
  )
)
WITH CHECK (
  sub_team_id IN (
    SELECT st.id
    FROM public.institution_sub_teams st
    INNER JOIN public.team_memberships tm
      ON st.institution_team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND tm.institution_role = 'athletic_director'
  )
);

-- Add UPDATE and INSERT policies for Assistants
CREATE POLICY "assistants_manage_institution_rosters"
ON public.institution_sub_team_members
FOR ALL
USING (
  sub_team_id IN (
    SELECT st.id
    FROM public.institution_sub_teams st
    INNER JOIN public.team_memberships tm
      ON st.institution_team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND tm.institution_role = 'assistant'
  )
)
WITH CHECK (
  sub_team_id IN (
    SELECT st.id
    FROM public.institution_sub_teams st
    INNER JOIN public.team_memberships tm
      ON st.institution_team_id = tm.team_id
    WHERE tm.user_id = auth.uid()
      AND tm.institution_role = 'assistant'
  )
);

-- Add comment explaining the fix
COMMENT ON POLICY "athletic_directors_manage_all_rosters" ON public.institution_sub_team_members IS
  'Allows Athletic Directors to manage (INSERT, UPDATE, DELETE) all roster members in their institution';

COMMENT ON POLICY "assistants_manage_institution_rosters" ON public.institution_sub_team_members IS
  'Allows Assistants to manage (INSERT, UPDATE, DELETE) all roster members in their institution';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies updated successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'New policies added:';
  RAISE NOTICE '  - athletic_directors_manage_all_rosters (FOR ALL)';
  RAISE NOTICE '  - assistants_manage_institution_rosters (FOR ALL)';
  RAISE NOTICE '';
  RAISE NOTICE 'Athletic Directors and Assistants can now:';
  RAISE NOTICE '  ✓ INSERT new roster members';
  RAISE NOTICE '  ✓ UPDATE existing roster members (names, sizes, etc.)';
  RAISE NOTICE '  ✓ DELETE roster members';
  RAISE NOTICE '  ✓ SELECT/view all roster members';
END $$;
