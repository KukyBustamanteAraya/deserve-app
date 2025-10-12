# How to Run Database Migration

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"
5. Copy the contents of `20251011_add_sport_ids_to_products.sql`
6. Paste into the SQL editor
7. Click "Run" button (or press Cmd+Enter / Ctrl+Enter)
8. Verify success message

## Option 2: Command Line (if psql is installed)

```bash
psql "$DATABASE_URL" < supabase/migrations/20251011_add_sport_ids_to_products.sql
```

## Verification

After running the migration, verify it worked:

```sql
-- Check that sport_ids column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'sport_ids';

-- Should return: sport_ids | ARRAY
```

## Next Steps

After the migration is complete, Claude will:
1. Update TypeScript types
2. Update ProductForm to show sport checkboxes
3. Update API endpoints to handle sport_ids array
