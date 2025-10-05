# Database Setup Guide

## Phase 1, Step 2: Supabase Database Setup

This guide will help you set up the minimal viable catalog with sports, products, and teams functionality.

## Prerequisites

1. Supabase project with authentication already configured
2. Project ID: `tirhnanxmjsasvhfphbq` (as configured in `.env.local`)
3. Supabase CLI installed globally or via npm (already added to package.json)

## Database Migration

### 1. Apply the Schema Migration

Copy the SQL from `migrations/001_initial_schema.sql` and run it in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Paste the contents of `migrations/001_initial_schema.sql`
5. Click "Run"

The migration will create:
- **Tables**: `sports`, `products`, `product_images`, `teams`, `profiles` (extended)
- **Types**: `user_role` enum
- **Indexes**: For performance optimization
- **RLS Policies**: Row-level security rules
- **Triggers**: Auto-update timestamps
- **Seed Data**: 5 sports, 10 products, product images
- **Views**: `products_with_details` for easier querying

### 2. Generate TypeScript Types

```bash
# Generate Supabase types
npm run gen:types
```

This creates `src/types/supabase.ts` with your database types.

### 3. Verify Setup

Check that the migration succeeded:

```sql
-- Run in Supabase SQL Editor to verify
SELECT COUNT(*) as sports_count FROM public.sports;
SELECT COUNT(*) as products_count FROM public.products;
SELECT COUNT(*) as images_count FROM public.product_images;
```

Expected results:
- Sports: 5 rows
- Products: 10 rows
- Images: 12 rows

## RLS (Row Level Security) Rules

The migration sets up these security rules:

### Sports & Products
- **Read**: Authenticated users can view all sports and products
- **Admin Write**: Only users with `role = 'admin'` can create/update/delete

### Teams
- **Create**: Any authenticated user can create a team (they become the owner)
- **Read**: Team creators and members can view teams
- **Update**: Only team creators can update their teams

### Profiles
- **Read/Write**: Users can only access their own profile data

## Testing the Setup

### 1. Test Authentication Required

```bash
# This should return 401 without auth
curl http://localhost:3000/api/catalog/preview
```

### 2. Test with Authentication

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/login`
3. Log in with your test account
4. Navigate to the home page
5. You should see the sports grid populated with real data
6. Click on a sport to see products

### 3. Test API Directly

With a valid session, test the API:
```bash
curl -H "Cookie: [session-cookie]" http://localhost:3000/api/catalog/preview
```

## Seed Data Overview

### Sports Created:
- Soccer (⚽)
- Basketball (🏀)
- Volleyball (🏐)
- Rugby (🏉)
- Golf (⛳)

### Sample Products:
- **Soccer**: Legacy Home Jersey ($350), Legacy Shorts ($200), etc.
- **Basketball**: Elevate Home Jersey ($350), Elevate Shorts ($220), etc.
- **Volleyball**: Spike Home Jersey ($320), Spike Shorts ($180)

### Product Images:
- Each product has 1-2 placeholder images from picsum.photos
- Images use product slug as seed for consistent generation

## Troubleshooting

### Migration Fails
- Check Supabase Dashboard > Settings > API for correct project URL/keys
- Ensure no naming conflicts with existing tables
- Check logs in Supabase Dashboard > Logs

### RLS Blocks Access
- Verify user is properly authenticated
- Check that auth.users table has the user record
- Ensure profiles table has corresponding row with correct role

### Types Generation Fails
```bash
# Install Supabase CLI globally if needed
npm install -g supabase

# Login to Supabase
supabase login

# Try generating types manually
supabase gen types typescript --project-id tirhnanxmjsasvhfphbq
```

### API Returns Empty Results
- Verify RLS policies are correctly applied
- Check that seed data was inserted properly
- Test direct database queries in Supabase SQL Editor

## Database Revert Instructions

If you need to completely reset the database:

```sql
-- WARNING: This will delete all data
-- Run each statement separately in Supabase SQL Editor

-- Drop views
DROP VIEW IF EXISTS public.products_with_details;

-- Drop tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.product_images;
DROP TABLE IF EXISTS public.products;
DROP TABLE IF EXISTS public.teams;
DROP TABLE IF EXISTS public.sports;

-- Remove columns from profiles (if you want to keep the table)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS role,
  DROP COLUMN IF EXISTS team_id;

-- Drop custom types
DROP TYPE IF EXISTS user_role;

-- Drop functions
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.generate_slug(text);
```

## Next Steps

After successful setup:
1. Test user registration and profile creation
2. Create some teams via the API
3. Add admin users by updating their role in profiles table
4. Consider adding product categories and more detailed product specs
5. Implement team management functionality