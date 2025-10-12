# Archived Migrations

**⚠️ This directory is ARCHIVED and no longer used.**

## Why Archived?

This directory contained legacy migrations from early development.
All migrations have been consolidated into `/supabase/migrations/`.

## What to Do

- **DO NOT** modify files in this directory
- **DO NOT** create new migrations here
- **DO** use `/supabase/migrations/` for all future migrations

## Creating New Migrations

```bash
# Correct way (uses supabase/migrations/)
supabase migration new my_migration_name

# Or via npm script
npm run db:migrate
```

## History

- **Created:** Early development (Sept 2024)
- **Archived:** October 9, 2025
- **Reason:** Consolidation into /supabase/migrations/
- **See:** /docs/MIGRATION_CONSOLIDATION.md for full details

## Files in This Archive

These migrations have been superseded by migrations in `/supabase/migrations/`:

- 001_initial_schema.sql → Replaced by 007_core_schema.sql
- 002_user_mgmt.sql → Integrated into 007_core_schema.sql
- 003_orders.sql → Integrated into 007_core_schema.sql
- 004_storage_orders.sql → Replaced by later storage migrations
- 005_admin_analytics.sql → Exists in supabase/migrations/
- 006_fix_profile_updates.sql → Superseded by 038_fix_profiles_infinite_recursion.sql
- 006_payments.sql → Replaced by 027_payment_contributions.sql
- 008_fix_rls_recursion.sql → Superseded by later RLS fixes
- 009_drop_owner_id.sql → Integrated into schema
- 010_gear_requests.sql → Replaced by 021_design_requests.sql
- 011_upgrade_products_for_gear_requests.sql → Integrated
- 012_storage_products_bucket.sql → Integrated into storage setup
- 013_fix_id_types.sql → Fixed in core schema
- 013_pricing_and_voting.sql → Replaced by 016_pricing_tiers.sql
- 013_pricing_and_voting_FIXED.sql → Replaced by 016_pricing_tiers.sql

## If You Need These Migrations

If you're setting up a new database from scratch, **ignore this directory entirely**.
Use only `/supabase/migrations/` which contains the complete, consolidated schema.
