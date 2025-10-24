# CRITICAL: Database Schema Mismatch Report

**Generated:** 2025-10-16
**Status:** 🔴 CRITICAL - TypeScript types completely out of sync with database

## Executive Summary

The `/src/types/database.types.ts` file is severely outdated and does not match the actual database schema. This is causing type errors and potential runtime bugs throughout the application.

---

## CRITICAL ISSUE #1: teams.team_type Field Mismatch

**Impact:** 🔴 CRITICAL - Breaks team creation from catalog wizard

### Actual Database Schema
```sql
-- From CURRENT_DATABASE_SCHEMA.md:51-52
team_type text DEFAULT 'single_team'
  CHECK (team_type IN ('single_team', 'institution'))
```

### TypeScript Types (WRONG)
```typescript
// database.types.ts:54,67,80
team_type: 'small' | 'large' | 'institution' | null
```

### Application Code (CORRECT)
```typescript
// src/store/quick-design-request.ts:4
export type OrganizationType = 'single_team' | 'institution';

// src/app/api/quick-design-request/route.ts:271
team_type: organizationType, // passes 'single_team' or 'institution'
```

### Impact
- TypeScript will throw errors when trying to set team_type to 'single_team'
- Type checking is broken
- This is likely the "term that wasn't correct" bug the user reported

---

## CRITICAL ISSUE #2: Price Field Naming (_cents → _clp)

**Impact:** 🔴 CRITICAL - All price-related operations using wrong field names

### Database Migration (Applied 2025-10-14)
```sql
-- Migration: 20251014_rename_cents_to_clp.sql
-- Renamed ALL *_cents columns to *_clp

-- products table
ALTER TABLE public.products RENAME COLUMN price_cents TO price_clp;
ALTER TABLE public.products RENAME COLUMN base_price_cents TO base_price_clp;
ALTER TABLE public.products RENAME COLUMN retail_price_cents TO retail_price_clp;

-- orders table
ALTER TABLE public.orders RENAME COLUMN subtotal_cents TO subtotal_clp;
ALTER TABLE public.orders RENAME COLUMN total_cents TO total_clp;
-- ... and more
```

### TypeScript Types (WRONG)
```typescript
// database.types.ts still uses:
price_cents: number
base_price_cents: number
subtotal_cents: number
total_cents: number
// etc.
```

### Impact
- 15+ files in src/ still reference *_cents fields
- Database queries will fail or return undefined
- All pricing operations are broken

---

## CRITICAL ISSUE #3: design_requests Table Missing Fields

**Impact:** 🔴 CRITICAL - Design request creation will fail

### Actual Database Schema
```sql
-- From CURRENT_DATABASE_SCHEMA.md:386-456
CREATE TABLE public.design_requests (
  id bigint PRIMARY KEY,
  team_id uuid NOT NULL,
  requested_by uuid NOT NULL,
  user_id uuid,                    -- MISSING IN TYPES
  user_type text,                  -- MISSING IN TYPES
  design_id uuid,                  -- MISSING IN TYPES
  sport_slug text,                 -- MISSING IN TYPES
  primary_color text,              -- MISSING IN TYPES
  secondary_color text,            -- MISSING IN TYPES
  accent_color text,               -- MISSING IN TYPES
  status text NOT NULL DEFAULT 'open',
  approval_status text,            -- MISSING IN TYPES
  order_id uuid,
  feedback text,
  mockup_urls text[],
  -- ... many more fields
);
```

### TypeScript Types (INCOMPLETE)
```typescript
// database.types.ts:162-199 - Only has 9 fields, missing 20+ fields!
design_requests: {
  Row: {
    id: string
    team_id: string
    requested_by: string
    status: string
    brief: string | null          // Database uses 'feedback', not 'brief'
    mockup_urls: string[] | null
    feedback: string | null
    order_id: string | null
    created_at: string
    updated_at: string
  }
}
```

### Impact
- API routes trying to insert user_id, user_type, colors will fail
- Type errors throughout design request workflow
- Quick design request API (route.ts:326-342) sets fields that don't exist in types

---

## CRITICAL ISSUE #4: orders Table Missing Fields

**Impact:** 🔴 CRITICAL - Order management broken

### Actual Database Schema (Enhanced 2025-10-14)
```sql
-- From migration: 20251014_enhance_orders_for_multi_product.sql
CREATE TABLE public.orders (
  id uuid PRIMARY KEY,
  order_number TEXT,               -- MISSING IN TYPES
  can_modify BOOLEAN DEFAULT true, -- MISSING IN TYPES
  locked_at TIMESTAMPTZ,           -- MISSING IN TYPES
  payment_status text,             -- MISSING IN TYPES
  payment_mode text,               -- MISSING IN TYPES
  shipped_at timestamptz,          -- MISSING IN TYPES
  delivered_at timestamptz,        -- MISSING IN TYPES
  status text NOT NULL,
  subtotal_clp integer,            -- Types say subtotal_cents
  total_clp integer,               -- Types say total_cents
  -- ... many more fields
);
```

### TypeScript Types (INCOMPLETE)
```typescript
// database.types.ts:200-237 - Only 11 fields, missing 30+ fields!
orders: {
  Row: {
    id: string
    user_id: string
    team_id: string | null
    status: string
    currency: string
    subtotal_cents: number         // WRONG - should be subtotal_clp
    total_cents: number            // WRONG - should be total_clp
    notes: string | null
    created_at: string
    updated_at: string
  }
}
```

---

## Root Cause

The `database.types.ts` file was last generated on **2025-10-09** (see line 2 comment), but multiple critical migrations were applied after that date:

- 2025-10-11: Multiple migrations (products, designs, RLS)
- 2025-10-14: Orders enhancement + price field renaming
- 2025-10-15: Design requests RLS
- 2025-10-16: Size charts, team settings

The types generation script was never re-run after these migrations.

---

## Affected Files

### Files using wrong team_type values:
- `/src/types/database.types.ts` (lines 54, 67, 80)
- `/scripts/generate-db-types.mjs` (lines 228, 241)

### Files using *_cents instead of *_clp:
1. `/src/store/design-request-wizard.ts`
2. `/src/app/api/admin/orders/route.ts`
3. `/src/app/api/admin/orders/[id]/route.ts`
4. `/src/app/api/admin/clients/[id]/route.ts`
5. `/src/app/api/admin/analytics/summary/route.ts`
6. `/src/types/products.ts`
7. `/src/types/clients.ts`
8. `/src/app/api/design-requests/[id]/approve/route.ts`
9. `/src/lib/mockData/institutionData.ts`
10. `/src/app/api/order-items/[id]/opt-out/route.ts`
11. `/src/app/api/pricing/bundle/route.ts`
12. `/src/app/api/orders/route.ts`
13. `/src/app/api/cart/items/route.ts`
14. `/src/app/api/catalog/products/[slug]/route.ts`
15. `/src/app/api/catalog/products/route.ts`

---

## Recommended Fix Priority

1. **HIGHEST PRIORITY**: Fix database.types.ts team_type field
2. **HIGH PRIORITY**: Regenerate entire database.types.ts from current schema
3. **HIGH PRIORITY**: Update all *_cents references to *_clp
4. **MEDIUM PRIORITY**: Add missing fields to design_requests types
5. **MEDIUM PRIORITY**: Add missing fields to orders types

---

## Next Steps

1. Update database.types.ts manually or regenerate from database
2. Run find-and-replace to update all *_cents to *_clp references
3. Test all affected API routes
4. Test catalog wizard team creation flow
5. Test design request submission flows
