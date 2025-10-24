-- Check and Fix Admin Status
-- Run this to diagnose and fix the admin access issue

-- 1. Check if is_admin column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('is_admin', 'role');

-- 2. Check your current profile
SELECT id, email, is_admin, role, created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 10;

-- 3. If is_admin column doesn't exist, add it
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 4. Set YOUR account as admin (replace with your email)
-- UPDATE public.profiles
-- SET is_admin = TRUE
-- WHERE email = 'your-email@example.com';

-- 5. Check design requests to see if they exist
SELECT id, user_id, team_slug, product_name, status, created_at
FROM public.design_requests
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check if RLS policies are blocking the queries
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'design_requests', 'orders')
ORDER BY tablename, policyname;
