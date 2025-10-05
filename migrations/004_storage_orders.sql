-- Migration: 004_storage_orders.sql
-- Description: Setup product images storage and order status management
-- Author: Claude Code
-- Date: 2025-09-29

create extension if not exists "pgcrypto";

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies
create policy if not exists "product_images_read_public" on storage.objects
  for select using (bucket_id = 'product-images');

create policy if not exists "product_images_admin_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

create policy if not exists "product_images_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'product-images' and
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admin audit (if not created)
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete set null,
  action text not null,           -- 'product-image.upload', 'order.status.update'
  entity text not null,           -- 'product_images', 'orders'
  entity_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_created_at_idx on public.admin_audit_logs(created_at);

-- Enable RLS on audit logs
alter table public.admin_audit_logs enable row level security;

-- Audit logs policy (admin read-only)
create policy "admin_audit_logs_admin_read" on public.admin_audit_logs
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Helper view for image counts per product
create or replace view public.product_image_counts as
select
  p.id as product_id,
  p.name as product_name,
  count(pi.id) as image_count
from public.products p
left join public.product_images pi on pi.product_id = p.id
group by p.id, p.name;

-- Grant permissions on the view
grant select on public.product_image_counts to authenticated;

-- =====================================================
-- ADMIN ORDER POLICIES
-- =====================================================

-- Allow admins to view all orders
create policy if not exists "admin_orders_select" on public.orders
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Allow admins to update order status
create policy if not exists "admin_orders_update" on public.orders
  for update to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

-- Log completion
do $$
begin
  raise notice 'Migration 004_storage_orders.sql completed successfully!';
  raise notice 'Created storage bucket: product-images (public read, admin write/delete)';
  raise notice 'Created admin_audit_logs table for tracking admin actions';
  raise notice 'Created product_image_counts view for analytics';
end $$;