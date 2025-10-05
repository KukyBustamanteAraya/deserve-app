-- Migration: 008_fix_rls_recursion.sql
-- Description: Fix infinite recursion in RLS policies between teams and team_members
-- Date: 2025-10-02
-- Instructions: Run this in Supabase SQL Editor or via psql

-- === RLS REWRITE TO AVOID RECURSION ===

-- TEAMS: created_by is the owner. We keep this SELECT policy using team_members.
alter table public.teams enable row level security;

drop policy if exists teams_owner_crud on public.teams;
drop policy if exists teams_members_select on public.teams;
drop policy if exists "Authenticated users can view teams" on public.teams;
drop policy if exists "Authenticated users can create teams" on public.teams;
drop policy if exists "Team creators can update their teams" on public.teams;
drop policy if exists "Team creators can delete their teams" on public.teams;

create policy teams_owner_crud
  on public.teams
  for all
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

-- SELECT allowed if creator OR current user is a member (via team_members)
create policy teams_members_select
  on public.teams
  for select
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.team_members m
      where m.team_id = teams.id and m.user_id = auth.uid()
    )
  );

-- TEAM_MEMBERS: ensure table + RLS
create table if not exists public.team_members (
  team_id uuid references public.teams(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text default 'member',
  created_at timestamptz default now(),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

-- Indexes and unique are safe/idempotent
alter table public.team_members
  drop constraint if exists team_members_unique;
alter table public.team_members
  add constraint team_members_unique unique (team_id, user_id);

create index if not exists idx_team_members_team on public.team_members(team_id);
create index if not exists idx_team_members_user on public.team_members(user_id);

-- Drop existing policies to recreate cleanly
drop policy if exists team_members_owner_manage on public.team_members;
drop policy if exists team_members_member_select_self on public.team_members;
drop policy if exists "Authenticated users can view team members" on public.team_members;
drop policy if exists "Team members can join teams" on public.team_members;
drop policy if exists "Users can leave teams" on public.team_members;

-- CRITICAL CHANGE:
-- 1) SELECT must NOT reference teams (to avoid recursion). Members can read their own rows.
create policy team_members_select_self
  on public.team_members
  for select
  using (user_id = auth.uid());

-- 2) Owner can mutate memberships (insert/update/delete) via reference to teams.
create policy team_members_owner_mutate
  on public.team_members
  for insert
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.created_by = auth.uid()
    )
  );

create policy team_members_owner_update
  on public.team_members
  for update
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.created_by = auth.uid()
    )
  );

create policy team_members_owner_delete
  on public.team_members
  for delete
  using (
    exists (
      select 1 from public.teams t
      where t.id = team_members.team_id and t.created_by = auth.uid()
    )
  );

-- === OWNER-AS-MEMBER SAFETY NET ===

-- Trigger to auto-add the creator as a member
create or replace function public.on_team_insert_add_owner_member()
returns trigger language plpgsql security definer as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict (team_id, user_id) do nothing;
  return new;
end; $$;

drop trigger if exists trg_team_add_owner_member on public.teams;
create trigger trg_team_add_owner_member
after insert on public.teams
for each row execute function public.on_team_insert_add_owner_member();

-- Backfill: ensure every existing team creator is a member
insert into public.team_members (team_id, user_id, role)
select t.id, t.created_by, 'owner'
from public.teams t
left join public.team_members m
  on m.team_id = t.id and m.user_id = t.created_by
where m.team_id is null
  and t.created_by is not null;
