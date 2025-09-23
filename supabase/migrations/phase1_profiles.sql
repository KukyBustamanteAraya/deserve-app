-- create profiles table linked to auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone_number text,
  user_type text not null default 'consumer' check (user_type in ('consumer','provider')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (email);

-- RLS
alter table public.profiles enable row level security;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert self" on public.profiles for insert with check (auth.uid() = id);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger language plpgsql as $
begin
  new.updated_at = now();
  return new;
end $;
drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- auto-insert profile when a new auth user is created
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, null)
  on conflict (id) do nothing;
  return new;
end $;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();