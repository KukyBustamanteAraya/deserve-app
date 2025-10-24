# Migration 013 - Pre-Flight Checklist ✅

Before running the migration, verify these key changes:

## ✅ Fixed Schema Alignments

### 1. **Pricing Tiers Table**
```sql
CREATE TABLE public.pricing_tiers (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES public.products(id) ON DELETE CASCADE, -- ✅ BIGINT matches products.id
  ...
);
```

### 2. **Design Candidates Table**
```sql
CREATE TABLE public.design_candidates (
  id BIGSERIAL PRIMARY KEY, -- ✅ BIGSERIAL for auto-increment
  team_id BIGINT REFERENCES public.teams(id) ON DELETE CASCADE, -- ✅ BIGINT matches teams.id
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- ✅ UUID matches profiles.id
  ...
);
```

### 3. **Design Votes Table**
```sql
CREATE TABLE public.design_votes (
  id BIGSERIAL PRIMARY KEY, -- ✅ BIGSERIAL for auto-increment
  candidate_id BIGINT REFERENCES public.design_candidates(id) ON DELETE CASCADE, -- ✅ BIGINT
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- ✅ UUID matches profiles.id
  ...
);
```

### 4. **Notifications Log**
```sql
CREATE TABLE public.notifications_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- ✅ UUID matches profiles.id
  order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE, -- ✅ BIGINT matches orders.id
  ...
);
```

### 5. **Manufacturer Tables**
```sql
CREATE TABLE public.manufacturer_users (
  id BIGSERIAL PRIMARY KEY, -- ✅ BIGSERIAL
  ...
);

CREATE TABLE public.manufacturer_order_assignments (
  id BIGSERIAL PRIMARY KEY,
  manufacturer_id BIGINT REFERENCES public.manufacturer_users(id), -- ✅ BIGINT
  order_id BIGINT REFERENCES public.orders(id), -- ✅ BIGINT
  ...
);
```

---

## ✅ Safety Features Included

1. **DROP IF EXISTS on triggers** - Prevents "already exists" errors
2. **DROP POLICY IF EXISTS** - Allows re-running migration safely
3. **CREATE TABLE IF NOT EXISTS** - Idempotent table creation
4. **ON CONFLICT DO NOTHING** - Safe fabric seeding

---

## 🚀 How to Run

### Step 1: Clean Up (if first migration failed)
```sql
-- Only run this if the first migration partially succeeded
DROP TABLE IF EXISTS public.pricing_tiers CASCADE;
DROP TABLE IF EXISTS public.design_votes CASCADE;
DROP TABLE IF EXISTS public.design_candidates CASCADE;
DROP TABLE IF EXISTS public.notifications_log CASCADE;
DROP TABLE IF EXISTS public.manufacturer_order_assignments CASCADE;
DROP TABLE IF EXISTS public.manufacturer_users CASCADE;
```

### Step 2: Run the Fixed Migration

1. Open Supabase Dashboard → SQL Editor
2. Open the file:
   ```
   /Users/kukybustamantearaya/Desktop/Deserve/deserve-app/migrations/013_pricing_and_voting_FIXED.sql
   ```
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **RUN** or press `Ctrl+Enter`

### Step 3: Verify Success

Run this verification query:
```sql
-- Check tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('fabrics', 'pricing_tiers', 'design_candidates', 'design_votes', 'notifications_log', 'manufacturer_users')
ORDER BY table_name;

-- Should return 6 rows

-- Check fabrics seeded
SELECT COUNT(*) as fabric_count,
       STRING_AGG(name, ', ' ORDER BY sort_order) as fabric_names
FROM public.fabrics;

-- Should return: fabric_count = 10, fabric_names = "Deserve, Premium, Primer..."

-- Verify foreign key types match
SELECT
  tc.table_name,
  kcu.column_name,
  col.data_type as column_type,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.columns AS col
  ON col.table_name = tc.table_name AND col.column_name = kcu.column_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('pricing_tiers', 'design_candidates', 'design_votes', 'notifications_log')
ORDER BY tc.table_name, kcu.column_name;
```

**Expected output:**
- `pricing_tiers.product_id` → `bigint` → `products.id`
- `design_candidates.team_id` → `bigint` → `teams.id`
- `design_candidates.uploaded_by` → `uuid` → `profiles.id`
- `design_votes.candidate_id` → `bigint` → `design_candidates.id`
- `design_votes.user_id` → `uuid` → `profiles.id`
- `notifications_log.user_id` → `uuid` → `profiles.id`
- `notifications_log.order_id` → `bigint` → `orders.id`

---

## 🔧 What Was Fixed

| Original Issue | Fix Applied |
|---------------|-------------|
| `pricing_tiers.product_id UUID` vs `products.id BIGINT` | Changed to `BIGINT` |
| `design_candidates.team_id UUID` vs `teams.id BIGINT` | Changed to `BIGINT` |
| All new tables using `UUID PRIMARY KEY` | Changed to `BIGSERIAL PRIMARY KEY` |
| References to `auth.users(id)` | Changed to `public.profiles(id)` for consistency |
| Missing `DROP IF EXISTS` on triggers | Added to all triggers |
| Missing `DROP POLICY IF EXISTS` | Added to all policies |

---

## 📝 Next Steps After Migration

1. ✅ Verify migration ran successfully (see Step 3 above)
2. ✅ Run seed script to populate products:
   ```bash
   cd /Users/kukybustamantearaya/Desktop/Deserve/deserve-app
   npx tsx scripts/seed-pricing.ts
   ```

   **Note:** You'll need `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

3. ✅ Start dev server:
   ```bash
   npm run dev
   ```

4. ✅ Test the new features:
   - Visit product detail page
   - Select different fabrics
   - Adjust quantity slider
   - Verify dynamic pricing updates

---

## 🆘 Troubleshooting

### Error: "relation already exists"
- Some tables were created in failed migration
- Run cleanup script from Step 1

### Error: "function handle_updated_at() does not exist"
- Migration creates it automatically
- If it still fails, run:
  ```sql
  CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
  BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
  END;
  $$;
  ```

### Error: "constraint already exists"
- Policies/constraints partially created
- Migration uses `DROP IF EXISTS` to handle this
- Verify and re-run

### Success Indicators
- ✅ No errors in SQL Editor output
- ✅ "Migration completed successfully!" notice appears
- ✅ 10 fabrics seeded message appears
- ✅ Verification queries return expected results

---

## 📊 What This Migration Adds

**New Tables:**
- `fabrics` - 10 fabric types with price modifiers
- `pricing_tiers` - Quantity-based pricing
- `design_candidates` - Team design voting
- `design_votes` - Individual votes
- `notifications_log` - Email/SMS audit trail
- `manufacturer_users` - Manufacturer accounts
- `manufacturer_order_assignments` - Order assignment tracking

**Enhanced Tables:**
- `products` - Added `fabric_id`, `base_price_cents`, `retail_price_cents`, `is_bundle`, `bundle_items`
- `teams` - Added `quorum_threshold`, `voting_open`, `design_allowance_used`
- `orders` - Added `current_stage`, `production_start_date`, `tracking_number`
- `order_items` - Added `used_size_calculator`, `size_calculator_recommendation`

**New Features Enabled:**
- ✅ Fabric selection with price modifiers
- ✅ Dynamic quantity-based pricing
- ✅ Design voting system
- ✅ Production pipeline tracking
- ✅ Manufacturer portal foundation
- ✅ Notification audit trail
