-- Migration: 006_fix_profile_updates.sql
-- Description: Fix profile update issues - RLS policies, backfill missing rows, auto-create trigger
-- Date: 2025-10-02

-- =====================================================
-- 1. BACKFILL MISSING PROFILE ROWS
-- =====================================================
-- Create missing profile rows for existing auth users
-- This is the most common cause of "Failed to update profile"
insert into public.profiles (id, email, created_at, updated_at)
select u.id, u.email, now(), now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- =====================================================
-- 2. FIX RLS POLICIES FOR PROFILE UPDATES
-- =====================================================

-- Ensure RLS is enabled
alter table public.profiles enable row level security;

-- Drop any existing conflicting update policies
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Create the correct self-update policy
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- =====================================================
-- 3. RE-APPLY COLUMN-LEVEL GRANTS
-- =====================================================
-- Ensure authenticated users can update their own data (but not role)
grant update (display_name, avatar_url, bio, team_id) on table public.profiles to authenticated;
revoke update (role) on table public.profiles from authenticated;

-- =====================================================
-- 4. UPDATED_AT TRIGGER
-- =====================================================
-- Ensure set_updated_at function exists
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Apply trigger to profiles table
drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- =====================================================
-- 5. AUTO-CREATE PROFILE ON USER SIGNUP
-- =====================================================
-- Function to create profile when new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, created_at, updated_at)
  values (new.id, new.email, now(), now());
  return new;
end;
$$;

-- Trigger to auto-create profile for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =====================================================
-- 6. VERIFY RLS POLICIES
-- =====================================================
-- Policy for reading own profile (should already exist, but verify)
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);

-- =====================================================
-- COMPLETION LOG
-- =====================================================
do $$
declare
  v_backfilled_count int;
begin
  select count(*) into v_backfilled_count
  from public.profiles
  where created_at >= (now() - interval '1 minute');

  raise notice '========================================';
  raise notice 'Migration 006_fix_profile_updates.sql completed!';
  raise notice '========================================';
  raise notice 'Backfilled profiles: %', v_backfilled_count;
  raise notice 'RLS policies: Updated for self-update';
  raise notice 'Column grants: display_name, avatar_url, bio, team_id';
  raise notice 'Auto-create: Trigger added for new signups';
  raise notice '========================================';
end $$;
