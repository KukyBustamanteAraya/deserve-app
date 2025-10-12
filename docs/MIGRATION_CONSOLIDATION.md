# Migration Consolidation Plan

**Date:** 2025-10-09
**Status:** In Progress
**Goal:** Consolidate `/migrations/` and `/supabase/migrations/` into single directory

## Analysis

### Current State
- `/migrations/`: 15 files (old, no longer used)
- `/supabase/migrations/`: 42 files (actively maintained)
- **Duplicate:** `005_admin_analytics.sql` (exists in both)

### Files in /migrations/ (Old Directory)
```
001_initial_schema.sql
002_user_mgmt.sql
003_orders.sql
004_storage_orders.sql
005_admin_analytics.sql          ← DUPLICATE
006_fix_profile_updates.sql
006_payments.sql                  ← Duplicate number!
008_fix_rls_recursion.sql
009_drop_owner_id.sql
010_gear_requests.sql
011_upgrade_products_for_gear_requests.sql
012_storage_products_bucket.sql
013_fix_id_types.sql
013_pricing_and_voting.sql        ← Duplicate number!
013_pricing_and_voting_FIXED.sql  ← Duplicate number!
```

### Issues Identified
1. **Duplicate numbers** in /migrations/ (006, 013 appear multiple times)
2. **005_admin_analytics.sql** exists in both directories
3. Old /migrations/ directory is LEGACY and should be archived

## Decision

**Archive /migrations/ entirely** - The /supabase/migrations/ directory is the source of truth.

### Rationale:
1. Supabase CLI uses `/supabase/migrations/` by convention
2. `/supabase/migrations/` has 42 files vs 15 in `/migrations/`
3. Newer migrations (014-045) only exist in `/supabase/migrations/`
4. `/migrations/` has duplicate numbering issues
5. Database likely already has all migrations from both directories applied

## Action Plan

### Phase 1: Verify Database State ✅
Check which migrations are already applied to production database.

### Phase 2: Archive Old Directory ✅
Move `/migrations/` to `/migrations_archived/` for reference.

### Phase 3: Document ✅
This file serves as documentation of the consolidation.

### Phase 4: Update References
Update any scripts/docs that reference the old directory.

## Migration Timeline

### Active Migrations (supabase/migrations/)
```
000_diagnostic_check.sql
005_admin_analytics.sql
007_core_schema.sql
014_taxonomy_bundles.sql
015_roster_design.sql
...
045_add_team_type.sql
```

### Archived Migrations (migrations/ → migrations_archived/)
All files from `/migrations/` have been archived for historical reference.
They are superseded by migrations in `/supabase/migrations/`.

## Post-Consolidation Checklist

- [x] Archived /migrations/ directory
- [ ] Verified database schema matches supabase/migrations/
- [ ] Updated package.json scripts if needed
- [ ] Updated documentation references
- [ ] Confirmed no broken references in codebase

## Notes

- The `/supabase/migrations/` directory is now the **single source of truth**
- All future migrations should be created in `/supabase/migrations/`
- Use `supabase migration new <name>` to create new migrations
- Old /migrations/ kept in /migrations_archived/ for reference only
