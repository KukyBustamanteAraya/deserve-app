-- Diagnostic: Check trigger and user status
-- Run this in Supabase SQL Editor

-- 1. Check if trigger exists and is enabled
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';

-- 2. Check if the email exists in auth.users
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'kuky@easyspeed.cl';

-- 3. Check if profile exists for that user
SELECT
  p.id,
  p.full_name,
  p.created_at,
  au.email
FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE au.email = 'kuky@easyspeed.cl';

-- 4. Check player submissions with that email (they shouldn't exist yet)
SELECT
  id,
  player_name,
  team_id,
  user_id,
  submission_token,
  created_at
FROM player_info_submissions
WHERE player_name LIKE '%kuky%' OR user_id IN (
  SELECT id FROM auth.users WHERE email = 'kuky@easyspeed.cl'
);
