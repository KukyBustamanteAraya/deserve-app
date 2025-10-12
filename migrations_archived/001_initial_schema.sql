-- Migration: 001_initial_schema.sql
-- Description: Create minimal viable catalog with sports, products, teams, and RLS
-- Author: Claude Code
-- Date: 2025-09-28

-- Enable required extensions
create extension if not exists "pgcrypto";

-- Create custom types
create type user_role as enum ('customer', 'admin');

-- =====================================================
-- TABLES
-- =====================================================

-- Sports table
create table public.sports (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Products table
create table public.products (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Product images table
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Teams table
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sport_id uuid not null references public.sports(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend profiles table (assuming it exists from auth setup)
-- Note: If profiles table doesn't exist, create it first
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add new columns to profiles
alter table public.profiles
  add column if not exists role user_role not null default 'customer',
  add column if not exists team_id uuid references public.teams(id) on delete set null;

-- =====================================================
-- INDEXES
-- =====================================================

-- Sports indexes
create index if not exists sports_slug_idx on public.sports(slug);

-- Products indexes
create index if not exists products_sport_id_idx on public.products(sport_id);
create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_active_idx on public.products(active);

-- Product images indexes
create index if not exists product_images_product_id_idx on public.product_images(product_id);
create index if not exists product_images_sort_order_idx on public.product_images(sort_order);

-- Teams indexes
create index if not exists teams_sport_id_idx on public.teams(sport_id);
create index if not exists teams_created_by_idx on public.teams(created_by);
create index if not exists teams_slug_idx on public.teams(slug);

-- Profiles indexes
create index if not exists profiles_team_id_idx on public.profiles(team_id);
create index if not exists profiles_role_idx on public.profiles(role);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Triggers for updated_at
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists teams_set_updated_at on public.teams;
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.set_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Function to generate slug from name
create or replace function public.generate_slug(input_text text)
returns text language plpgsql as $$
begin
  return lower(trim(regexp_replace(input_text, '[^a-zA-Z0-9\s]', '', 'g')))
         || '-' || extract(epoch from now())::text;
end $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
alter table public.sports enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;

-- Sports policies (readable to authenticated users)
create policy "Sports are readable by authenticated users"
  on public.sports for select
  using (auth.role() = 'authenticated');

-- Products policies (readable to authenticated users)
create policy "Products are readable by authenticated users"
  on public.products for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage products"
  on public.products for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Product images policies (readable to authenticated users)
create policy "Product images are readable by authenticated users"
  on public.product_images for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage product images"
  on public.product_images for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Teams policies
create policy "Users can create teams"
  on public.teams for insert
  with check (auth.uid() = created_by);

create policy "Team creators and members can view teams"
  on public.teams for select
  using (
    created_by = auth.uid()
    or id in (
      select team_id from public.profiles
      where id = auth.uid() and team_id is not null
    )
  );

create policy "Team creators can update their teams"
  on public.teams for update
  using (created_by = auth.uid());

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert sports
insert into public.sports (slug, name) values
  ('soccer', 'Soccer'),
  ('basketball', 'Basketball'),
  ('volleyball', 'Volleyball'),
  ('rugby', 'Rugby'),
  ('golf', 'Golf')
on conflict (slug) do nothing;

-- Insert products with proper sport_id references
do $$
declare
  soccer_id uuid;
  basketball_id uuid;
  volleyball_id uuid;
begin
  -- Get sport IDs
  select id into soccer_id from public.sports where slug = 'soccer';
  select id into basketball_id from public.sports where slug = 'basketball';
  select id into volleyball_id from public.sports where slug = 'volleyball';

  -- Soccer products
  insert into public.products (sport_id, slug, name, description, price_cents, active) values
    (soccer_id, 'legacy-home-jersey-soccer', 'Legacy Home Jersey', 'Pro-quality sublimated soccer jersey with moisture-wicking fabric', 35000, true),
    (soccer_id, 'legacy-shorts-soccer', 'Legacy Shorts', 'Lightweight breathable soccer shorts with side panels', 20000, true),
    (soccer_id, 'legacy-socks-soccer', 'Legacy Socks', 'Cushioned soccer socks with arch support', 12000, true),
    (soccer_id, 'champion-away-jersey-soccer', 'Champion Away Jersey', 'Premium away jersey with advanced cooling technology', 42000, true)
  on conflict (slug) do nothing;

  -- Basketball products
  insert into public.products (sport_id, slug, name, description, price_cents, active) values
    (basketball_id, 'elevate-home-jersey-basketball', 'Elevate Home Jersey', 'Performance knit basketball jersey with moisture-wicking', 35000, true),
    (basketball_id, 'elevate-shorts-basketball', 'Elevate Shorts', 'Premium stretch fabric basketball shorts', 22000, true),
    (basketball_id, 'elevate-warmup-jacket', 'Elevate Warm-up Jacket', 'Lightweight warm-up jacket with team branding', 55000, true),
    (basketball_id, 'pro-series-reversible-jersey', 'Pro Series Reversible Jersey', 'Dual-sided jersey for practice and games', 48000, true)
  on conflict (slug) do nothing;

  -- Volleyball products
  insert into public.products (sport_id, slug, name, description, price_cents, active) values
    (volleyball_id, 'spike-home-jersey-volleyball', 'Spike Home Jersey', 'Lightweight volleyball jersey with UV protection', 32000, true),
    (volleyball_id, 'spike-shorts-volleyball', 'Spike Shorts', 'Flexible volleyball shorts with compression fit', 18000, true)
  on conflict (slug) do nothing;
end $$;

-- Insert product images (using placeholder service)
insert into public.product_images (product_id, url, alt_text, sort_order)
select
  p.id,
  'https://picsum.photos/seed/' || p.slug || '/800/800',
  p.name || ' - Main Image',
  0
from public.products p
on conflict do nothing;

-- Insert additional images for some products
insert into public.product_images (product_id, url, alt_text, sort_order)
select
  p.id,
  'https://picsum.photos/seed/' || p.slug || '-back/800/800',
  p.name || ' - Back View',
  1
from public.products p
where p.slug like '%jersey%'
on conflict do nothing;

-- =====================================================
-- UTILITY VIEWS (Optional - for easier querying)
-- =====================================================

-- View for products with sport and image info
create or replace view public.products_with_details as
select
  p.id,
  p.slug,
  p.name,
  p.description,
  p.price_cents,
  p.active,
  p.created_at,
  p.updated_at,
  s.slug as sport_slug,
  s.name as sport_name,
  coalesce(
    json_agg(
      json_build_object(
        'id', pi.id,
        'url', pi.url,
        'alt_text', pi.alt_text,
        'sort_order', pi.sort_order
      ) order by pi.sort_order
    ) filter (where pi.id is not null),
    '[]'::json
  ) as images
from public.products p
join public.sports s on s.id = p.sport_id
left join public.product_images pi on pi.product_id = p.id
group by p.id, p.slug, p.name, p.description, p.price_cents, p.active, p.created_at, p.updated_at, s.slug, s.name;

-- Grant permissions on the view
grant select on public.products_with_details to authenticated;

-- =====================================================
-- STORAGE (Optional - Product Images Bucket)
-- =====================================================

-- Note: Storage bucket creation is typically done via Supabase Dashboard or CLI
-- If you want to create via SQL, uncomment below:

/*
-- Create product-images bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload images
create policy "Allow authenticated uploads to product-images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
);

-- Allow public read access to product images
create policy "Allow public read access to product-images"
on storage.objects for select
using (bucket_id = 'product-images');

-- Allow authenticated users to update their uploads
create policy "Allow authenticated users to update product-images"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and auth.role() = 'authenticated'
);
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Log completion
do $$
begin
  raise notice 'Migration 001_initial_schema.sql completed successfully!';
  raise notice 'Created tables: sports, products, product_images, teams, profiles';
  raise notice 'Enabled RLS with appropriate policies';
  raise notice 'Inserted seed data for % sports and % products',
    (select count(*) from public.sports),
    (select count(*) from public.products);
end $$;