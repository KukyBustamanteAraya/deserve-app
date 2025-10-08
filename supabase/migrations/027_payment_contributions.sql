-- Migration: 027_payment_contributions.sql
-- Description: Add support for split payments (individual team member contributions)
-- Date: 2025-10-07

-- =====================================================
-- PAYMENT CONTRIBUTIONS TABLE (for split payments)
-- =====================================================

-- Track individual contributions towards an order
-- This supports the "split-pay" flow where each team member pays their share
create table if not exists public.payment_contributions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id uuid references public.teams(id) on delete cascade,

  -- Payment details
  amount_cents int not null check (amount_cents >= 0),
  currency char(3) not null default 'CLP',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),

  -- Mercado Pago integration
  mp_payment_id text unique,           -- MP payment ID once completed
  mp_preference_id text,               -- MP preference ID for this contribution
  external_reference text unique,      -- Our unique reference (e.g., "order_123_user_456")

  -- Metadata
  paid_at timestamptz,
  raw_payment_data jsonb,              -- Full MP payment object for reference

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- BULK PAYMENTS TABLE (for manager payments)
-- =====================================================

-- Track a single payment that covers multiple orders
-- This supports the "bulk payment" flow where managers pay for full orders at once
create table if not exists public.bulk_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Payment details
  total_amount_cents int not null check (total_amount_cents >= 0),
  currency char(3) not null default 'CLP',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),

  -- Mercado Pago integration
  mp_payment_id text unique,
  mp_preference_id text,
  external_reference text unique,      -- e.g., "bulkpay_789"

  -- Metadata
  paid_at timestamptz,
  raw_payment_data jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- JOIN TABLE: Bulk Payment → Orders
-- =====================================================

-- Links bulk payments to the orders they cover
create table if not exists public.bulk_payment_orders (
  bulk_payment_id uuid not null references public.bulk_payments(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  primary key (bulk_payment_id, order_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

create index if not exists payment_contributions_order_id_idx on public.payment_contributions(order_id);
create index if not exists payment_contributions_user_id_idx on public.payment_contributions(user_id);
create index if not exists payment_contributions_team_id_idx on public.payment_contributions(team_id);
create index if not exists payment_contributions_status_idx on public.payment_contributions(status);
create index if not exists payment_contributions_mp_payment_id_idx on public.payment_contributions(mp_payment_id);
create index if not exists payment_contributions_external_ref_idx on public.payment_contributions(external_reference);

create index if not exists bulk_payments_user_id_idx on public.bulk_payments(user_id);
create index if not exists bulk_payments_status_idx on public.bulk_payments(status);
create index if not exists bulk_payments_mp_payment_id_idx on public.bulk_payments(mp_payment_id);
create index if not exists bulk_payments_external_ref_idx on public.bulk_payments(external_reference);

create index if not exists bulk_payment_orders_bulk_payment_id_idx on public.bulk_payment_orders(bulk_payment_id);
create index if not exists bulk_payment_orders_order_id_idx on public.bulk_payment_orders(order_id);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

alter table public.payment_contributions enable row level security;
alter table public.bulk_payments enable row level security;
alter table public.bulk_payment_orders enable row level security;

-- Payment contributions policies
create policy "payment_contributions_select_own" on public.payment_contributions
  for select
  using (user_id = auth.uid());

create policy "payment_contributions_insert_own" on public.payment_contributions
  for insert
  with check (user_id = auth.uid());

-- Bulk payments policies
create policy "bulk_payments_select_own" on public.bulk_payments
  for select
  using (user_id = auth.uid());

create policy "bulk_payments_insert_own" on public.bulk_payments
  for insert
  with check (user_id = auth.uid());

-- Bulk payment orders policies (can see if you own the bulk payment)
create policy "bulk_payment_orders_select_own" on public.bulk_payment_orders
  for select
  using (
    exists (
      select 1 from public.bulk_payments bp
      where bp.id = bulk_payment_orders.bulk_payment_id
      and bp.user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
create or replace function public.update_payment_contributions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger payment_contributions_updated_at_trigger
  before update on public.payment_contributions
  for each row
  execute function public.update_payment_contributions_updated_at();

create or replace function public.update_bulk_payments_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bulk_payments_updated_at_trigger
  before update on public.bulk_payments
  for each row
  execute function public.update_bulk_payments_updated_at();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if an order is fully paid via contributions
create or replace function public.is_order_fully_paid_by_contributions(p_order_id uuid)
returns boolean as $$
declare
  v_order_total int;
  v_paid_total int;
begin
  -- Get order total
  select total_amount_cents into v_order_total
  from public.orders
  where id = p_order_id;

  -- Get sum of approved contributions
  select coalesce(sum(amount_cents), 0) into v_paid_total
  from public.payment_contributions
  where order_id = p_order_id
  and status = 'approved';

  -- Return true if paid amount >= order total
  return v_paid_total >= v_order_total;
end;
$$ language plpgsql security definer;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

do $$
begin
  raise notice 'Migration 027_payment_contributions.sql completed successfully!';
  raise notice 'Created tables:';
  raise notice '- payment_contributions (for split-pay by players)';
  raise notice '- bulk_payments (for manager bulk payments)';
  raise notice '- bulk_payment_orders (links bulk payments to orders)';
  raise notice 'Added RLS policies, indexes, and helper functions';
  raise notice 'Ready for Mercado Pago split and bulk payment flows';
end $$;
