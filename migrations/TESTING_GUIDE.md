# Institution Migration Testing Guide

**Purpose**: Verify the institution migration was successful and all features work correctly.

---

## Step 1: Run the Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `INSTITUTION_SETUP_MIGRATION.sql`
3. Click "Run"
4. Verify you see: `✅ Institution implementation migration completed successfully!`

---

## Step 2: Create Sample Institution

Run this in Supabase SQL Editor:

```sql
-- 1. Create Athletic Director user (use your existing user_id)
-- Replace 'YOUR_USER_ID' with actual user ID from auth.users table
DO $$
DECLARE
  v_ad_user_id uuid := 'YOUR_USER_ID'; -- ← REPLACE THIS
  v_institution_id uuid;
  v_soccer_sub_team_id uuid;
  v_basketball_sub_team_id uuid;
  v_volleyball_sub_team_id uuid;
BEGIN
  -- 2. Create institution team
  INSERT INTO public.teams (
    name,
    slug,
    team_type,
    institution_name,
    sports,
    created_by,
    owner_id,
    current_owner_id,
    colors,
    setup_completed
  ) VALUES (
    'Lincoln High School Athletics',
    'lincoln-hs',
    'institution',
    'Lincoln High School',
    ARRAY['soccer', 'basketball', 'volleyball'],
    v_ad_user_id,
    v_ad_user_id,
    v_ad_user_id,
    '{"primary": "#003366", "secondary": "#FFD700", "accent": "#FFFFFF"}'::jsonb,
    true
  )
  RETURNING id INTO v_institution_id;

  RAISE NOTICE 'Created institution: %', v_institution_id;

  -- 3. Add Athletic Director to team_memberships
  INSERT INTO public.team_memberships (
    team_id,
    user_id,
    role,
    institution_role
  ) VALUES (
    v_institution_id,
    v_ad_user_id,
    'manager',
    'athletic_director'
  );

  RAISE NOTICE 'Added Athletic Director membership';

  -- 4. Create team_settings
  INSERT INTO public.team_settings (
    team_id,
    approval_mode,
    player_info_mode,
    payment_mode,
    primary_color,
    require_ad_approval_for_orders,
    allow_program_autonomy,
    budget_tracking_enabled
  ) VALUES (
    v_institution_id,
    'owner_only',
    'manager_only',
    'manager_pays_all',
    '#003366',
    true,
    false,
    false
  );

  RAISE NOTICE 'Created team settings';

  -- 5. Get sport IDs
  DECLARE
    v_soccer_sport_id bigint;
    v_basketball_sport_id bigint;
    v_volleyball_sport_id bigint;
  BEGIN
    SELECT id INTO v_soccer_sport_id FROM public.sports WHERE slug = 'soccer' LIMIT 1;
    SELECT id INTO v_basketball_sport_id FROM public.sports WHERE slug = 'basketball' LIMIT 1;
    SELECT id INTO v_volleyball_sport_id FROM public.sports WHERE slug = 'volleyball' LIMIT 1;

    -- 6. Create sub-teams
    INSERT INTO public.institution_sub_teams (
      institution_team_id,
      name,
      slug,
      sport_id,
      level,
      active,
      season_year
    ) VALUES
    (v_institution_id, 'Varsity Soccer', 'varsity-soccer', v_soccer_sport_id, 'varsity', true, '2024-2025'),
    (v_institution_id, 'JV Basketball', 'jv-basketball', v_basketball_sport_id, 'jv', true, '2024-2025'),
    (v_institution_id, 'Varsity Volleyball', 'varsity-volleyball', v_volleyball_sport_id, 'varsity', true, '2024-2025')
    RETURNING id INTO v_soccer_sub_team_id, v_basketball_sub_team_id, v_volleyball_sub_team_id;

    RAISE NOTICE 'Created 3 sub-teams';
  END;

  -- 7. Add sample roster members to Varsity Soccer
  INSERT INTO public.institution_sub_team_members (
    sub_team_id,
    player_name,
    email,
    position,
    jersey_number,
    size,
    created_by
  ) VALUES
  (v_soccer_sub_team_id, 'Alex Rodriguez', 'alex.rodriguez@example.com', 'Forward', 10, 'M', v_ad_user_id),
  (v_soccer_sub_team_id, 'Jamie Chen', 'jamie.chen@example.com', 'Midfielder', 7, 'S', v_ad_user_id),
  (v_soccer_sub_team_id, 'Taylor Smith', 'taylor.smith@example.com', 'Defense', 5, 'L', v_ad_user_id),
  (v_soccer_sub_team_id, 'Jordan Lee', 'jordan.lee@example.com', 'Goalkeeper', 1, 'M', v_ad_user_id),
  (v_soccer_sub_team_id, 'Morgan Davis', 'morgan.davis@example.com', 'Forward', 11, 'M', v_ad_user_id);

  RAISE NOTICE 'Added 5 roster members to Varsity Soccer';

  RAISE NOTICE '';
  RAISE NOTICE '✅ Sample data created successfully!';
  RAISE NOTICE 'Institution ID: %', v_institution_id;
  RAISE NOTICE 'Access at: /mi-equipo/lincoln-hs';
END $$;
```

**IMPORTANT**: Replace `'YOUR_USER_ID'` with an actual user ID from your `auth.users` table.

---

## Step 3: Verify Data

```sql
-- Check institution was created
SELECT id, name, team_type, institution_name, sports
FROM public.teams
WHERE team_type = 'institution';

-- Check Athletic Director membership
SELECT tm.*, u.email
FROM public.team_memberships tm
JOIN auth.users u ON tm.user_id = u.id
WHERE tm.institution_role = 'athletic_director';

-- Check sub-teams
SELECT st.*, s.name as sport_name
FROM public.institution_sub_teams st
JOIN public.sports s ON st.sport_id = s.id;

-- Check roster members
SELECT m.*, st.name as sub_team_name
FROM public.institution_sub_team_members m
JOIN public.institution_sub_teams st ON m.sub_team_id = st.id;

-- Test helper function
SELECT * FROM get_institution_sub_teams(
  (SELECT id FROM public.teams WHERE slug = 'lincoln-hs')
);
```

**Expected Results**:
- 1 institution team
- 1 Athletic Director membership
- 3 sub-teams (Varsity Soccer, JV Basketball, Varsity Volleyball)
- 5 roster members in Varsity Soccer
- Helper function returns all 3 sub-teams with aggregated data

---

## Step 4: Test RLS Policies

```sql
-- Set current user context (replace with your user_id)
SET request.jwt.claims.sub = 'YOUR_USER_ID';

-- As Athletic Director, should see all sub-teams
SELECT * FROM public.institution_sub_teams;
-- Expected: 3 rows

-- As Athletic Director, should see all roster members
SELECT * FROM public.institution_sub_team_members;
-- Expected: 5 rows

-- Verify can insert roster member
INSERT INTO public.institution_sub_team_members (
  sub_team_id,
  player_name,
  position,
  jersey_number,
  size,
  created_by
) VALUES (
  (SELECT id FROM public.institution_sub_teams WHERE slug = 'varsity-soccer'),
  'Test Player',
  'Forward',
  99,
  'XL',
  'YOUR_USER_ID'
);
-- Expected: Success

-- Clean up test
DELETE FROM public.institution_sub_team_members WHERE player_name = 'Test Player';
```

---

## Step 5: Test Institution Role Checks

```sql
-- Test helper function
SELECT has_institution_role(
  (SELECT id FROM public.teams WHERE slug = 'lincoln-hs'),
  'YOUR_USER_ID',
  'athletic_director'
);
-- Expected: true

SELECT has_institution_role(
  (SELECT id FROM public.teams WHERE slug = 'lincoln-hs'),
  'YOUR_USER_ID',
  'head_coach'
);
-- Expected: false
```

---

## Step 6: Verify Schema Changes

```sql
-- Check team_memberships has institution_role column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'team_memberships'
  AND column_name = 'institution_role';
-- Expected: 1 row

-- Check orders has sub_team_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name = 'sub_team_id';
-- Expected: 1 row

-- Check design_requests has sub_team_id column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'design_requests'
  AND column_name = 'sub_team_id';
-- Expected: 1 row

-- Check team_settings has institution columns
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'team_settings'
  AND column_name IN (
    'allow_program_autonomy',
    'require_ad_approval_for_orders',
    'budget_tracking_enabled',
    'budget_per_program_cents',
    'fiscal_year_start_month'
  );
-- Expected: 5 rows
```

---

## Step 7: Test in Application

1. Navigate to: `http://localhost:3000/mi-equipo/lincoln-hs`
2. Should see institution dashboard (if implemented) OR redirect to team page
3. Verify team type is detected correctly

---

## Rollback (if needed)

If migration fails or you need to start over:

```sql
-- WARNING: This will delete all institution data!

-- Drop RLS policies
DROP POLICY IF EXISTS "athletic_directors_view_all_subteams" ON public.institution_sub_teams;
DROP POLICY IF EXISTS "athletic_directors_manage_all_subteams" ON public.institution_sub_teams;
DROP POLICY IF EXISTS "head_coaches_view_own_subteam" ON public.institution_sub_teams;
DROP POLICY IF EXISTS "head_coaches_update_own_subteam" ON public.institution_sub_teams;
DROP POLICY IF EXISTS "coordinators_view_coordinated_subteams" ON public.institution_sub_teams;
DROP POLICY IF EXISTS "coordinators_update_coordinated_subteams" ON public.institution_sub_teams;
DROP POLICY IF EXISTS "head_coaches_manage_own_roster" ON public.institution_sub_team_members;
DROP POLICY IF EXISTS "athletic_directors_view_all_rosters" ON public.institution_sub_team_members;
DROP POLICY IF EXISTS "coordinators_view_coordinated_rosters" ON public.institution_sub_team_members;

-- Drop functions
DROP FUNCTION IF EXISTS get_institution_sub_teams(uuid);
DROP FUNCTION IF EXISTS has_institution_role(uuid, uuid, text);

-- Drop tables (CASCADE will drop dependent foreign keys)
DROP TABLE IF EXISTS public.institution_sub_team_members CASCADE;
DROP TABLE IF EXISTS public.institution_sub_teams CASCADE;

-- Remove columns from existing tables
ALTER TABLE public.team_memberships DROP COLUMN IF EXISTS institution_role;
ALTER TABLE public.orders DROP COLUMN IF EXISTS sub_team_id;
ALTER TABLE public.design_requests DROP COLUMN IF EXISTS sub_team_id;
ALTER TABLE public.team_settings
  DROP COLUMN IF EXISTS allow_program_autonomy,
  DROP COLUMN IF EXISTS require_ad_approval_for_orders,
  DROP COLUMN IF EXISTS budget_tracking_enabled,
  DROP COLUMN IF EXISTS budget_per_program_cents,
  DROP COLUMN IF EXISTS fiscal_year_start_month;

-- Delete test data
DELETE FROM public.teams WHERE team_type = 'institution';
```

---

## Success Criteria

✅ Migration runs without errors
✅ All tables and columns created
✅ Sample institution and sub-teams created
✅ RLS policies allow Athletic Director to see all data
✅ RLS policies would restrict Head Coach (once assigned)
✅ Helper functions return correct data
✅ No errors in Supabase logs

---

## Next Steps After Successful Migration

1. ✅ Update `CURRENT_DATABASE_SCHEMA.md` with "Migration Applied: 2025-10-12"
2. ✅ Begin Phase 1 Implementation (API Routes)
3. ✅ Create first institution dashboard component
4. ✅ Test with real user flows

---

**Migration Status**: Ready to run
**Estimated Time**: 2-3 minutes
**Risk Level**: Low (all changes are additive, no breaking changes)
