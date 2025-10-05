-- Migration: 005_admin_analytics.sql
-- Description: Admin analytics functions with security definer and admin checks
-- Author: Claude Code
-- Date: 2025-09-29

create extension if not exists "pgcrypto";

-- =====================================================
-- ADMIN ANALYTICS FUNCTIONS
-- =====================================================

-- Helper function to assert admin role
create or replace function public._assert_admin()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
end $$;

-- Get order counts by status
create or replace function public.admin_order_counts()
returns table(pending int, paid int, cancelled int, total int)
language plpgsql security definer set search_path = public
as $$
begin
  perform public._assert_admin();
  return query
  with c as (
    select
      count(*) filter (where status = 'pending') as pending,
      count(*) filter (where status = 'paid') as paid,
      count(*) filter (where status = 'cancelled') as cancelled,
      count(*) as total
    from public.orders
  )
  select c.pending::int, c.paid::int, c.cancelled::int, c.total::int from c;
end $$;

-- Get revenue for last 7 days (America/Sao_Paulo timezone), PAID orders only
create or replace function public.admin_revenue_last_7_days()
returns table(day date, total_cents int)
language plpgsql security definer set search_path = public
as $$
begin
  perform public._assert_admin();
  return query
  with days as (
    select generate_series(
      (date_trunc('day', (now() at time zone 'America/Sao_Paulo')) - interval '6 day')::date,
      (date_trunc('day', (now() at time zone 'America/Sao_Paulo')))::date,
      interval '1 day'
    )::date as d
  ),
  r as (
    select (o.created_at at time zone 'America/Sao_Paulo')::date as d,
           sum(o.total_cents)::int as total_cents
    from public.orders o
    where o.status = 'paid'
      and o.created_at >= (now() - interval '7 day')
    group by 1
  )
  select days.d as day, coalesce(r.total_cents, 0) as total_cents
  from days
  left join r on r.d = days.d
  order by day;
end $$;

-- TEMP STUB: fix type mismatch later (products.id bigint vs order_items.product_id uuid)
create or replace function public.admin_top_products(p_limit int default 5)
returns table(product_id text, name text, units int, revenue_cents int)
language sql security definer set search_path = public
as $$
  select public._assert_admin(); -- keep admin check
  -- empty result until we align types
  select null::text, null::text, 0::int, 0::int where false;
$$;

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Create indexes to help with analytics queries (if not already present)
create index if not exists orders_created_at_idx on public.orders(created_at);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_status_created_at_idx on public.orders(status, created_at);
create index if not exists order_items_order_id_idx on public.order_items(order_id);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Log completion
do $$
begin
  raise notice 'Migration 005_admin_analytics.sql completed successfully!';
  raise notice 'Created admin analytics functions:';
  raise notice '- admin_order_counts() - Order counts by status';
  raise notice '- admin_revenue_last_7_days() - Revenue trend with timezone support';
  raise notice '- admin_top_products() - TEMP STUB (type mismatch to fix later)';
  raise notice 'All functions use SECURITY DEFINER with admin role verification';
end $$;