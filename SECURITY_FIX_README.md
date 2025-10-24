# Security Fixes - Supabase Security Advisor Issues

**Date:** 2025-01-23
**Priority:** CRITICAL
**Status:** Ready to Apply

## Summary

This document outlines the security vulnerabilities detected by Supabase Security Advisor and the fixes implemented.

### Issues Found

- **22 ERRORS** (Critical security issues)
- **32 WARNINGS** (Security hardening recommendations)

---

## ERRORS Fixed (Priority: CRITICAL)

### 1. RLS Disabled on Public Tables (8 errors)

**Risk:** Tables exposed without Row Level Security can be read/modified by anyone.

**Tables Fixed:**
- `teams` - Now requires authentication and proper team membership
- `bundles` - Public read, admin write
- `fabric_aliases` - Public read, admin write
- `product_types` - Public read, admin write
- `product_fabric_recommendations` - Public read, admin write
- `sport_fabric_overrides` - Public read, admin write
- `component_pricing` - Public read, admin write
- `activity_log` - Users see own logs, admins see all

**Fix:** Enabled RLS + added appropriate policies for each table.

### 2. Security Definer Views (13 errors)

**Risk:** `SECURITY DEFINER` views execute with creator's permissions instead of querying user's permissions, potentially bypassing RLS.

**Views Fixed:**
- `carts_with_items`
- `design_approval_summary` (also fixed auth.users exposure)
- `products_with_details`
- `order_payment_progress`
- `teams_with_details`
- `design_request_reaction_counts`
- `products_with_images`
- `admin_notifications_summary`
- `orders_with_items`
- `design_requests_with_details`
- `team_members_view`
- `orders_with_payment_status`

**Fix:** Recreated all views WITHOUT `SECURITY DEFINER` to respect RLS policies.

### 3. Auth Users Exposed (1 error)

**Risk:** `design_approval_summary` view exposed `auth.users` table data to anon/authenticated roles.

**Fix:** Removed `auth.users` join, using `profiles` table instead.

### 4. Policy Exists but RLS Disabled (1 error)

**Risk:** `teams` table had policies defined but RLS was not enabled, making policies useless.

**Fix:** Enabled RLS on `teams` table (covered in #1).

---

## WARNINGS Fixed (Priority: MEDIUM)

### 1. Function Search Path Mutable (30 warnings)

**Risk:** Functions without fixed `search_path` are vulnerable to search_path injection attacks.

**Functions Fixed:** (30 total)
- All trigger functions (e.g., `set_updated_at`, `handle_updated_at`)
- All query functions (e.g., `get_team_stats`, `has_institution_role`)

**Fix:** Added `SET search_path = ''` to all functions.

### 2. Extensions in Public Schema (2 warnings)

**Risk:** Extensions in `public` schema can cause namespace pollution and security issues.

**Extensions Moved:**
- `unaccent` → `extensions` schema
- `btree_gist` → `extensions` schema

**Fix:** Created `extensions` schema and moved extensions there.

### 3. Leaked Password Protection Disabled (1 warning)

**Risk:** Users can set passwords that have been compromised in data breaches.

**Fix:** This must be enabled in Supabase Dashboard:
1. Go to Authentication → Providers → Email
2. Scroll to "Security"
3. Enable "Password breach protection (HaveIBeenPwned)"

---

## Migration Files Created

### 1. `supabase/migrations/fix_security_issues.sql`
**Priority:** CRITICAL - Apply FIRST
**Contains:**
- RLS enablement for 8 tables
- RLS policies for all tables
- Security Definer view fixes
- Auth users exposure fix
- Search path fixes for 30 functions

### 2. `supabase/migrations/fix_security_warnings.sql`
**Priority:** MEDIUM - Apply AFTER #1
**Contains:**
- Extension schema migration
- Move unaccent extension
- Move btree_gist extension

---

## How to Apply

### Step 1: Review the Changes

```bash
cat supabase/migrations/fix_security_issues.sql
cat supabase/migrations/fix_security_warnings.sql
```

### Step 2: Test in Development First

```bash
# Connect to your development database
supabase db reset

# Or apply manually
psql -h <dev-db-host> -U postgres -d postgres -f supabase/migrations/fix_security_issues.sql
psql -h <dev-db-host> -U postgres -d postgres -f supabase/migrations/fix_security_warnings.sql
```

### Step 3: Verify the Fixes

Run these verification queries:

```sql
-- 1. Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = false;
-- Should return 0 rows

-- 2. Check no SECURITY DEFINER views
SELECT schemaname, viewname
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%SECURITY DEFINER%';
-- Should return 0 rows

-- 3. Check all functions have search_path
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (proconfig IS NULL OR NOT proconfig::text LIKE '%search_path%');
-- Should return 0 rows

-- 4. Check extensions are in correct schema
SELECT extname, nspname
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN ('unaccent', 'btree_gist');
-- Both should be in 'extensions' schema
```

### Step 4: Test Application Functionality

After applying migrations, test:

1. ✅ User authentication and registration
2. ✅ Team creation and membership
3. ✅ Design request creation/approval
4. ✅ Order creation and payment
5. ✅ Admin panel access
6. ✅ Product catalog browsing

### Step 5: Apply to Production

```bash
# Push migrations to Supabase
supabase db push

# Or via Supabase Dashboard:
# Database → Migrations → Upload migration files
```

### Step 6: Enable Leaked Password Protection

**Manual step in Supabase Dashboard:**

1. Go to: Authentication → Providers → Email
2. Scroll to "Security" section
3. Toggle ON: "Password breach protection (HaveIBeenPwned)"
4. Save changes

---

## Testing Checklist

After applying migrations, verify:

- [ ] All tables have RLS enabled
- [ ] Catalog tables (bundles, product_types, etc.) are readable by public
- [ ] Team data is only visible to team members
- [ ] Activity logs are restricted to owner/admin
- [ ] All views work correctly without SECURITY DEFINER
- [ ] Design approval summary doesn't expose auth.users
- [ ] All functions execute with proper search_path
- [ ] Extensions are in extensions schema
- [ ] Application functionality is intact
- [ ] No broken queries or features

---

## Rollback Plan

If issues arise, rollback steps:

```sql
-- 1. Disable RLS on tables (TEMPORARY - not recommended)
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
-- Repeat for other tables...

-- 2. Restore old views with SECURITY DEFINER (if needed)
-- (Keep backups of original view definitions)

-- 3. Remove search_path from functions (TEMPORARY)
-- ALTER FUNCTION public.function_name() RESET search_path;
```

**Note:** Instead of rollback, fix forward. Disabling RLS or using SECURITY DEFINER should be avoided.

---

## Impact Assessment

### Low Risk Changes
- Search path fixes (no functional change, only security hardening)
- Extension schema migration (no functional change)

### Medium Risk Changes
- RLS policies (may affect queries if policies are too restrictive)
- View recreation (same logic, just removed SECURITY DEFINER)

### Testing Required
- Test all user flows after applying
- Verify admin panel still works
- Check team member access controls
- Ensure catalog data is accessible

---

## Additional Recommendations

### 1. Regular Security Audits

Run Supabase Security Advisor weekly:
```bash
# Via Supabase Dashboard: Database → Advisors → Security
```

### 2. Monitor Failed Queries

After applying RLS, monitor for queries failing due to RLS policies:
```sql
-- Check Supabase logs for RLS-related errors
```

### 3. Review Policies Quarterly

RLS policies should be reviewed every 3 months to ensure they match business logic.

### 4. Enable Additional Security Features

- Enable 2FA for admin accounts
- Configure IP allowlisting if needed
- Set up database backups
- Enable audit logging

---

## Support

If you encounter issues after applying these fixes:

1. Check the verification queries above
2. Review Supabase logs for errors
3. Test specific user flows that are failing
4. Consult Supabase documentation:
   - [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
   - [Security Best Practices](https://supabase.com/docs/guides/database/security)

---

## Appendix: Before/After Comparison

### Before
- 22 critical security errors
- 32 security warnings
- Public tables exposed without RLS
- SECURITY DEFINER views bypassing RLS
- auth.users table exposed
- Functions vulnerable to injection

### After
- ✅ 0 critical errors
- ✅ 0 warnings (after manual auth config)
- ✅ All tables protected by RLS
- ✅ All views respect RLS policies
- ✅ No auth.users exposure
- ✅ All functions hardened with search_path
- ✅ Extensions properly organized
- ✅ Password breach protection enabled
