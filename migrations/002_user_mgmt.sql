-- Migration: 002_user_mgmt.sql
-- Description: User management enhancement with profiles, roles, and teams
-- Author: Claude Code
-- Date: 2025-09-28

-- Ensure extensions are available
create extension if not exists "pgcrypto";

-- =====================================================
-- TEAMS INVITES TABLE
-- =====================================================

-- Team invites table for join-by-code functionality
create table if not exists public.teams_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete restrict,
  max_uses int not null default 50 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists teams_invites_team_id_idx on public.teams_invites(team_id);
create index if not exists teams_invites_code_idx on public.teams_invites(code);
create index if not exists teams_invites_created_by_idx on public.teams_invites(created_by);
create index if not exists teams_invites_expires_at_idx on public.teams_invites(expires_at);

-- Trigger for updated_at
drop trigger if exists teams_invites_set_updated_at on public.teams_invites;
create trigger teams_invites_set_updated_at
  before update on public.teams_invites
  for each row execute function public.set_updated_at();

-- =====================================================
-- ENHANCED PROFILES TABLE
-- =====================================================

-- Add missing columns to profiles if they don't exist
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text;

-- Create index for better lookups
create index if not exists profiles_display_name_idx on public.profiles(display_name);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) FOR INVITES
-- =====================================================

-- Enable RLS on teams_invites
alter table public.teams_invites enable row level security;

-- Policy: Team creators and admins can view their invites
create policy "Team creators and admins can view invites"
  on public.teams_invites for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or exists (
      select 1 from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );

-- Policy: Team creators and admins can create invites
create policy "Team creators and admins can create invites"
  on public.teams_invites for insert
  with check (
    created_by = auth.uid()
    and (
      exists (
        select 1 from public.teams t
        where t.id = team_id and t.created_by = auth.uid()
      )
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    )
  );

-- Policy: Team creators and admins can update invites (for use tracking)
create policy "Team creators and admins can update invites"
  on public.teams_invites for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
    or exists (
      select 1 from public.teams t
      where t.id = team_id and t.created_by = auth.uid()
    )
  );

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to generate invite codes
create or replace function public.gen_invite_code()
returns text language sql as $$
  select upper(encode(gen_random_bytes(4), 'hex'))
$$;

-- Function to clean expired invites (maintenance)
create or replace function public.cleanup_expired_invites()
returns void language sql as $$
  delete from public.teams_invites
  where expires_at is not null and expires_at < now()
$$;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS (RPCs)
-- =====================================================

-- RPC: Join team by invite code
create or replace function public.team_join_by_code(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_max_uses int;
  v_uses int;
  v_expires timestamptz;
  v_team_record record;
  v_user_id uuid;
begin
  -- Get current user ID
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Fetch invite details
  select team_id, max_uses, uses, expires_at
  into v_team_id, v_max_uses, v_uses, v_expires
  from public.teams_invites
  where code = upper(trim(invite_code));

  if v_team_id is null then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;

  -- Check expiry
  if v_expires is not null and now() > v_expires then
    raise exception 'Invite code has expired' using errcode = '22023';
  end if;

  -- Check usage limit
  if v_uses >= v_max_uses then
    raise exception 'Invite code usage limit reached' using errcode = '22023';
  end if;

  -- Check if user is already in this team
  if exists (
    select 1 from public.profiles
    where id = v_user_id and team_id = v_team_id
  ) then
    raise exception 'You are already a member of this team' using errcode = '22023';
  end if;

  -- Update user's team_id
  update public.profiles
  set team_id = v_team_id, updated_at = now()
  where id = v_user_id;

  -- Increment invite usage count
  update public.teams_invites
  set uses = uses + 1, updated_at = now()
  where code = upper(trim(invite_code));

  -- Get team details to return
  select t.id, t.name, t.slug, s.name as sport_name, s.slug as sport_slug
  into v_team_record
  from public.teams t
  join public.sports s on s.id = t.sport_id
  where t.id = v_team_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Successfully joined team',
    'team', to_jsonb(v_team_record)
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end
$$;

-- RPC: Admin set user role
create or replace function public.admin_set_user_role(target_user_id uuid, new_role user_role)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_caller_id uuid;
begin
  -- Get caller ID
  v_caller_id := auth.uid();

  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Check if caller is admin
  select exists (
    select 1 from public.profiles p
    where p.id = v_caller_id and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Admin privileges required' using errcode = '42501';
  end if;

  -- Prevent admin from changing their own role (safety measure)
  if v_caller_id = target_user_id then
    raise exception 'Cannot change your own role' using errcode = '22023';
  end if;

  -- Check target user exists
  if not exists (select 1 from public.profiles where id = target_user_id) then
    raise exception 'Target user not found' using errcode = '22023';
  end if;

  -- Update target user role
  update public.profiles
  set role = new_role, updated_at = now()
  where id = target_user_id;

  return jsonb_build_object(
    'success', true,
    'message', 'User role updated successfully',
    'user_id', target_user_id,
    'new_role', new_role
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end
$$;

-- RPC: Leave team (with ownership check)
create or replace function public.team_leave()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_current_team_id uuid;
  v_is_team_creator boolean;
begin
  -- Get current user ID
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Get current team
  select team_id into v_current_team_id
  from public.profiles
  where id = v_user_id;

  if v_current_team_id is null then
    raise exception 'You are not currently in a team' using errcode = '22023';
  end if;

  -- Check if user is the team creator
  select exists (
    select 1 from public.teams
    where id = v_current_team_id and created_by = v_user_id
  ) into v_is_team_creator;

  if v_is_team_creator then
    raise exception 'Team creators cannot leave their team. Transfer ownership first.' using errcode = '22023';
  end if;

  -- Remove user from team
  update public.profiles
  set team_id = null, updated_at = now()
  where id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'message', 'Successfully left the team'
  );

exception
  when others then
    return jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
end
$$;

-- =====================================================
-- PERMISSIONS & SECURITY
-- =====================================================

-- Revoke direct role updates from authenticated users
-- This forces role changes to go through the admin RPC
do $$
begin
  if exists (
    select 1 from information_schema.column_privileges
    where table_name = 'profiles'
    and column_name = 'role'
    and grantee = 'authenticated'
    and privilege_type = 'UPDATE'
  ) then
    revoke update (role) on table public.profiles from authenticated;
  end if;
end
$$;

-- Ensure authenticated users can still update other profile fields
grant update (display_name, avatar_url, bio, team_id) on table public.profiles to authenticated;

-- Grant execute permissions on RPCs
grant execute on function public.team_join_by_code(text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, user_role) to authenticated;
grant execute on function public.team_leave() to authenticated;
grant execute on function public.gen_invite_code() to authenticated;

-- =====================================================
-- VIEWS FOR EASIER QUERYING
-- =====================================================

-- View for team details with member count
create or replace view public.teams_with_details as
select
  t.id,
  t.name,
  t.slug,
  t.sport_id,
  t.created_by,
  t.created_at,
  t.updated_at,
  s.name as sport_name,
  s.slug as sport_slug,
  count(p.id) as member_count,
  json_agg(
    json_build_object(
      'id', p.id,
      'email', p.email,
      'display_name', p.display_name,
      'role', p.role
    ) order by p.role desc, p.display_name
  ) filter (where p.id is not null) as members
from public.teams t
join public.sports s on s.id = t.sport_id
left join public.profiles p on p.team_id = t.id
group by t.id, t.name, t.slug, t.sport_id, t.created_by, t.created_at, t.updated_at, s.name, s.slug;

-- Grant access to the view
grant select on public.teams_with_details to authenticated;

-- =====================================================
-- SAMPLE DATA & SETUP
-- =====================================================

-- Create a sample admin user (optional - for testing)
-- Note: This should be done manually via Supabase dashboard in production
insert into public.profiles (id, email, role, display_name, created_at, updated_at)
select
  auth.uid(),
  'admin@example.com',
  'admin',
  'System Admin',
  now(),
  now()
where not exists (
  select 1 from public.profiles where role = 'admin'
) and auth.uid() is not null
on conflict (id) do nothing;

-- =====================================================
-- COMPLETION LOG
-- =====================================================

do $$
begin
  raise notice 'Migration 002_user_mgmt.sql completed successfully!';
  raise notice 'Added: teams_invites table, enhanced profiles, admin RPCs';
  raise notice 'Security: Role updates restricted, invite-based team joining enabled';
  raise notice 'Views: teams_with_details for easier querying';
end $$;