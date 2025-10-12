-- Migration 003: Orders System (Cart, Checkout, Order History)
-- Creates tables and functions for order management with price snapshots

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type cart_status as enum ('active','converted','abandoned');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending','paid','cancelled');
exception when duplicate_object then null; end $$;

-- Carts table
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status cart_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, status) -- enforces only one 'active' per user
);

-- Cart items table
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity int not null check (quantity > 0 and quantity <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index if not exists cart_items_cart_id_idx on public.cart_items(cart_id);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  team_id uuid references public.teams(id) on delete set null,
  status order_status not null default 'pending',
  currency char(3) not null default 'CLP',
  subtotal_cents int not null default 0 check (subtotal_cents >= 0),
  total_cents int not null default 0 check (total_cents >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists orders_created_at_idx on public.orders(created_at desc);

-- Order items table (price snapshot)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,                  -- snapshot
  unit_price_cents int not null check (unit_price_cents >= 0),
  quantity int not null check (quantity > 0 and quantity <= 200),
  line_total_cents int not null check (line_total_cents >= 0)
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- Triggers for updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at before update on public.carts
for each row execute function public.set_updated_at();

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at before update on public.cart_items
for each row execute function public.set_updated_at();

-- Row Level Security
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- RLS Policies: Carts & items only accessible by owner
create policy carts_crud_self on public.carts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy cart_items_crud_self on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
  );

-- Orders readable to owner; insert/update via RPC
create policy orders_owner_select on public.orders
  for select using (user_id = auth.uid());

create policy orders_owner_insert on public.orders
  for insert with check (user_id = auth.uid());

-- Allow updating order status by owner (for basic status transitions)
create policy orders_owner_update_status on public.orders
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Order items: readable if parent order belongs to user
create policy order_items_owner_select on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy order_items_owner_insert on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- Create cart with items view for easier querying
create or replace view public.carts_with_items as
select
  c.id,
  c.user_id,
  c.status,
  c.created_at,
  c.updated_at,
  coalesce(
    json_agg(
      json_build_object(
        'id', ci.id,
        'product_id', ci.product_id,
        'quantity', ci.quantity,
        'product_name', p.name,
        'product_price_cents', p.price_cents,
        'product_images', p.images,
        'line_total_cents', ci.quantity * p.price_cents,
        'created_at', ci.created_at,
        'updated_at', ci.updated_at
      )
    ) filter (where ci.id is not null),
    '[]'::json
  ) as items,
  coalesce(sum(ci.quantity * p.price_cents), 0) as total_cents,
  coalesce(sum(ci.quantity), 0) as total_items
from public.carts c
left join public.cart_items ci on c.id = ci.cart_id
left join public.products p on ci.product_id = p.id
group by c.id, c.user_id, c.status, c.created_at, c.updated_at;

-- Create orders with items view
create or replace view public.orders_with_items as
select
  o.id,
  o.user_id,
  o.team_id,
  o.status,
  o.currency,
  o.subtotal_cents,
  o.total_cents,
  o.notes,
  o.created_at,
  coalesce(
    json_agg(
      json_build_object(
        'id', oi.id,
        'product_id', oi.product_id,
        'name', oi.name,
        'unit_price_cents', oi.unit_price_cents,
        'quantity', oi.quantity,
        'line_total_cents', oi.line_total_cents
      )
    ) filter (where oi.id is not null),
    '[]'::json
  ) as items
from public.orders o
left join public.order_items oi on o.id = oi.order_id
group by o.id, o.user_id, o.team_id, o.status, o.currency, o.subtotal_cents, o.total_cents, o.notes, o.created_at;

-- RPC: Checkout creates order from active cart atomically
create or replace function public.checkout_create_order(p_cart_id uuid, p_notes text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cart record;
  v_order_id uuid;
  v_team_id uuid;
begin
  -- Check authentication
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Lock the cart
  select * into v_cart
  from public.carts
  where id = p_cart_id and user_id = v_user and status = 'active'
  for update;

  if not found then
    raise exception 'Cart not found or not active' using errcode = '22023';
  end if;

  -- Ensure cart has items
  if not exists (select 1 from public.cart_items ci where ci.cart_id = p_cart_id) then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;

  -- Get user's team_id if they have one
  select team_id into v_team_id
  from public.profiles
  where id = v_user;

  -- Create order
  insert into public.orders (user_id, team_id, status, currency, subtotal_cents, total_cents, notes)
  values (v_user, v_team_id, 'pending', 'CLP', 0, 0, p_notes)
  returning id into v_order_id;

  -- Snapshot items at current product prices
  insert into public.order_items (order_id, product_id, name, unit_price_cents, quantity, line_total_cents)
  select v_order_id,
         p.id,
         p.name,
         p.price_cents,
         ci.quantity,
         (ci.quantity * p.price_cents)
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = p_cart_id;

  -- Set order totals
  update public.orders o
  set subtotal_cents = (select coalesce(sum(line_total_cents),0) from public.order_items where order_id = v_order_id),
      total_cents = (select coalesce(sum(line_total_cents),0) from public.order_items where order_id = v_order_id)
  where o.id = v_order_id;

  -- Convert cart to completed
  update public.carts set status = 'converted' where id = p_cart_id;

  -- Create a new empty active cart for the user
  insert into public.carts (user_id, status) values (v_user, 'active')
  on conflict (user_id, status) do nothing;

  return v_order_id;
end
$$;

-- Helper function to get or create active cart
create or replace function public.get_or_create_active_cart()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_cart_id uuid;
begin
  -- Check authentication
  if v_user is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  -- Try to get existing active cart
  select id into v_cart_id
  from public.carts
  where user_id = v_user and status = 'active';

  -- If no active cart exists, create one
  if v_cart_id is null then
    insert into public.carts (user_id, status)
    values (v_user, 'active')
    returning id into v_cart_id;
  end if;

  return v_cart_id;
end
$$;