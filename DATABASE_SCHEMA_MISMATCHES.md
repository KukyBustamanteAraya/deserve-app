# 🚨 CRITICAL DATABASE SCHEMA MISMATCHES

**Date**: October 16, 2025
**Issue**: App crashing with 500 errors due to schema mismatches

---

## CRITICAL MISMATCHES (Causing 500 Errors)

### 1. ❌ products.category - CONSTRAINT MISMATCH

**Local Schema** (SCHEMA_REFERENCE.sql):
```sql
category text NOT NULL CHECK (category = ANY (ARRAY[
  'camiseta'::text,
  'short'::text,       -- SINGULAR
  'medias'::text,
  'chaqueta'::text,
  'pantalon'::text,
  'bolso'::text
]))
```

**Live Database**:
```sql
category text DEFAULT 'jersey'::text CHECK (category IS NULL OR (category = ANY (ARRAY[
  'camiseta'::text,
  'shorts'::text,      -- PLURAL ❌
  'poleron'::text,     -- EXTRA ❌
  'medias'::text,
  'chaqueta'::text
])))
```

**Impact**:
- Code trying to insert 'short' will FAIL
- Code trying to insert 'pantalon' or 'bolso' will FAIL
- Missing 'poleron' in local schema

---

### 2. ❌ teams.gender_category - COLUMN MISSING FROM LOCAL SCHEMA

**Local Schema**: Column does NOT exist

**Live Database**:
```sql
gender_category text CHECK (gender_category = ANY (ARRAY[
  'male'::text,
  'female'::text,
  'both'::text
]))
```

**Impact**:
- If app code tries to read/write gender_category, it will fail
- Queries expecting this column will error

---

### 3. ❌ institution_sub_teams.gender_category - SAME ISSUE

**Local Schema**: Column does NOT exist

**Live Database**:
```sql
gender_category text DEFAULT 'male'::text CHECK (gender_category = ANY (ARRAY[
  'male'::text,
  'female'::text,
  'both'::text
]))
```

---

### 4. ⚠️ payment_contributions - NAMING INCONSISTENCY

**Live Database**:
```sql
amount_clp integer NOT NULL CHECK (amount_clp >= 0),
```

**But also has**:
```sql
amount_cents integer NOT NULL DEFAULT 0,  -- ❌ SHOULD BE amount_clp
```

**Note**: The schema shows BOTH columns exist! This is confusing and could cause issues.

---

### 5. ⚠️ bulk_payments - NAMING INCONSISTENCY

**Live Database**:
```sql
total_amount_clp integer NOT NULL CHECK (total_amount_clp >= 0),
```

**Note**: But file says "Updated: 2025-10-14 (Renamed all _cents columns to _clp)"

Check if migration was actually applied!

---

### 6. ⚠️ orders - GENERATED COLUMNS ISSUE

**Live Database**:
```sql
total_clp integer DEFAULT (((subtotal_clp - discount_clp) + tax_clp) + shipping_clp),
```

**Local Schema** says:
```sql
total_clp is GENERATED ALWAYS AS (...)
```

**Issue**: Your live DB has `DEFAULT` not `GENERATED ALWAYS AS`!

This means:
- Code can INSERT total_clp values (shouldn't be allowed)
- total_clp won't auto-recalculate when other columns change

---

### 7. ⚠️ order_items - GENERATED COLUMN ISSUE

**Live Database**:
```sql
line_total_clp integer DEFAULT (unit_price_clp * quantity),
```

**Should be**:
```sql
line_total_clp integer GENERATED ALWAYS AS (unit_price_clp * quantity) STORED,
```

---

## ROOT CAUSE ANALYSIS

**The database schema is INCONSISTENT** due to:

1. **Incomplete migration**: The rename from `_cents` to `_clp` was NOT fully applied
2. **Missing columns**: `gender_category` exists in live DB but not in local schema reference
3. **Wrong constraints**: `products.category` has different values
4. **Generated columns**: Using `DEFAULT` instead of `GENERATED ALWAYS AS`

---

## IMMEDIATE FIXES REQUIRED

### Fix #1: Sync products.category constraint

```sql
-- Remove old constraint
ALTER TABLE products DROP CONSTRAINT products_category_check;

-- Add unified constraint
ALTER TABLE products ADD CONSTRAINT products_category_check
CHECK (category IS NULL OR category = ANY (ARRAY[
  'camiseta'::text,
  'shorts'::text,     -- PLURAL (standard)
  'poleron'::text,
  'medias'::text,
  'chaqueta'::text,
  'pantalon'::text,
  'bolso'::text
]));
```

### Fix #2: Add gender_category to teams (if app needs it)

```sql
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS gender_category text
CHECK (gender_category = ANY (ARRAY['male'::text, 'female'::text, 'both'::text]));
```

### Fix #3: Fix generated columns in orders

```sql
-- Drop existing column
ALTER TABLE orders DROP COLUMN total_clp;

-- Re-add as generated column
ALTER TABLE orders ADD COLUMN total_clp integer
GENERATED ALWAYS AS (((subtotal_clp - discount_clp) + tax_clp) + shipping_clp) STORED;
```

### Fix #4: Fix generated columns in order_items

```sql
-- Drop existing column
ALTER TABLE order_items DROP COLUMN line_total_clp;

-- Re-add as generated column
ALTER TABLE order_items ADD COLUMN line_total_clp integer
GENERATED ALWAYS AS (unit_price_clp * quantity) STORED;
```

---

## VERIFICATION QUERIES

Run these to verify current state:

```sql
-- Check products constraint
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%products%category%';

-- Check if gender_category exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'teams' AND column_name = 'gender_category';

-- Check generated columns
SELECT column_name, is_generated, generation_expression
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'total_clp';

SELECT column_name, is_generated, generation_expression
FROM information_schema.columns
WHERE table_name = 'order_items' AND column_name = 'line_total_clp';
```

---

## NEXT STEPS

1. **Backup database** before making any changes
2. Run verification queries to confirm current state
3. Apply fixes one by one
4. Test each fix
5. Update SCHEMA_REFERENCE.sql to match live database

---

**Priority**: 🔴 CRITICAL - Fix immediately before app launch
