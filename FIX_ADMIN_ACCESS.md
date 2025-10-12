# Fix Admin Access Issue

## Problem
- Admin orders page redirects with "admin_required" error
- Design requests not showing up in admin panel
- Your account needs `is_admin = TRUE` in the database

## Root Cause
The `profiles` table might not have the `is_admin` column, or your account doesn't have it set to `TRUE`.

---

## Solution

### Step 1: Run Migration 036
```bash
cd /Users/kukybustamantearaya/Desktop/Deserve/deserve-app
psql $DATABASE_URL -f supabase/migrations/036_fix_admin_access.sql
```

### Step 2: Set Your Account as Admin

**Option A: Using Supabase Dashboard (EASIEST)**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Paste this query (replace with YOUR email):

```sql
UPDATE public.profiles
SET is_admin = TRUE
WHERE email = 'YOUR_EMAIL_HERE@example.com';
```

5. Click "Run"
6. You should see "Success. 1 rows affected."

**Option B: Using psql**
```bash
psql $DATABASE_URL -c "UPDATE public.profiles SET is_admin = TRUE WHERE email = 'YOUR_EMAIL_HERE@example.com';"
```

### Step 3: Verify Admin Status

Run this query to check:
```sql
SELECT id, email, is_admin, created_at
FROM public.profiles
WHERE is_admin = TRUE;
```

You should see your account with `is_admin = t` (true).

### Step 4: Clear Browser Cache & Logout

1. Logout of the app: http://localhost:3000/logout
2. Clear your browser cache (Cmd+Shift+Delete on Mac)
3. Login again
4. Try accessing admin orders: http://localhost:3000/admin/orders

---

## Check If Design Requests Exist

If you still don't see design requests in the admin panel, check if they exist in the database:

```sql
-- Count total design requests
SELECT COUNT(*) FROM public.design_requests;

-- See recent design requests
SELECT
  id,
  user_id,
  team_slug,
  product_name,
  sport_slug,
  status,
  created_at
FROM public.design_requests
ORDER BY created_at DESC
LIMIT 10;
```

If design requests exist but don't show in the admin panel, the issue might be **RLS policies**.

---

## Check RLS Policies for Admin Access

Run this to see if admin policies exist:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'design_requests'
  AND (policyname ILIKE '%admin%' OR qual ILIKE '%is_admin%')
ORDER BY tablename, policyname;
```

### If Admin Policies Are Missing

Add this policy to allow admins to see all design requests:

```sql
-- Allow admins to read all design requests
DROP POLICY IF EXISTS "design_requests_admin_read" ON public.design_requests;
CREATE POLICY "design_requests_admin_read" ON public.design_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Allow admins to update design requests
DROP POLICY IF EXISTS "design_requests_admin_update" ON public.design_requests;
CREATE POLICY "design_requests_admin_update" ON public.design_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
```

---

## Check Orders RLS Policies

Same for orders table:

```sql
-- Allow admins to read all orders
DROP POLICY IF EXISTS "orders_admin_read" ON public.orders;
CREATE POLICY "orders_admin_read" ON public.orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

-- Allow admins to update orders
DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );
```

---

## Quick Diagnostic Script

Run this all at once to diagnose:

```sql
-- 1. Check if is_admin column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name = 'is_admin';

-- 2. Check your admin status
SELECT email, is_admin
FROM public.profiles
WHERE email = 'YOUR_EMAIL_HERE@example.com';

-- 3. Count design requests
SELECT COUNT(*) as total_design_requests
FROM public.design_requests;

-- 4. Count orders
SELECT COUNT(*) as total_orders
FROM public.orders;

-- 5. Check if admin policies exist
SELECT COUNT(*) as admin_policies
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname ILIKE '%admin%' OR qual ILIKE '%is_admin%');
```

---

## Still Not Working?

If after all this it still doesn't work:

1. **Check Supabase service role key is set in Vercel**
   - Go to Vercel → Your Project → Settings → Environment Variables
   - Verify `SUPABASE_SERVICE_ROLE_KEY` exists

2. **Restart your Next.js dev server**
   ```bash
   # Kill all node processes
   pkill -f "next dev"

   # Start fresh
   rm -rf .next
   npm run dev
   ```

3. **Check the browser console for errors**
   - Open DevTools (F12)
   - Look for Supabase auth errors
   - Look for RLS policy errors

---

## Summary Checklist

- [ ] Run migration 036
- [ ] Set your email's `is_admin = TRUE`
- [ ] Verify with SELECT query
- [ ] Logout and login again
- [ ] Clear browser cache
- [ ] Check design_requests exist in DB
- [ ] Add admin RLS policies if missing
- [ ] Restart Next.js dev server

After completing these steps, you should be able to access `/admin/orders` and see all design requests in `/admin/design-requests`!
