# Phase 1 Test Checklist

Copy and paste this checklist when testing the core functionality of the Deserve App.

## Setup

### 1. Environment Variables
Create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=https://tirhnanxmjsasvhfphbq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcmhuYW54bWpzYXN2aGZwaGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODc3MTUsImV4cCI6MjA3MzI2MzcxNX0.3vlfygjKY-9XU-JGTBmOqxPiv2pu2TEDsucVVZYHQU4
```

### 2. Database Setup
1. Open Supabase dashboard → SQL Editor
2. Run the contents of `supabase/migrations/phase1_profiles.sql`
3. Verify tables: `profiles` table exists with RLS policies

### 3. Start Development Server
```bash
npm run dev
```
Server should start at http://localhost:3000

## Core Authentication Flow

### 4. Test Magic Link Login
- [ ] Visit http://localhost:3000/login
- [ ] Enter a valid email address
- [ ] Click "Enviar enlace mágico"
- [ ] See success message: "Te enviamos un link a tu correo. Revísalo."
- [ ] Check email inbox for magic link
- [ ] Click magic link in email
- [ ] Should redirect to `/auth/callback` (loading spinner)
- [ ] Then automatically redirect to `/dashboard`

### 5. Verify Profile Creation
- [ ] Open Supabase dashboard → Table Editor → profiles
- [ ] New profile row should exist with your email
- [ ] Fields should be populated: email, user_type ('consumer'), created_at, updated_at

### 6. Test Authentication Protection
- [ ] From dashboard, copy URL and open in incognito window
- [ ] Should immediately redirect to `/login` (no loading flash)
- [ ] Try accessing `/dashboard` while signed out → redirects to `/login`

## Product Loading & Caching

### 7. Test SWR Caching
- [ ] Visit http://localhost:3000/productos/fútbol
- [ ] First load: should see skeleton cards briefly
- [ ] Products should load and display
- [ ] Open browser DevTools → Network tab
- [ ] Navigate away and back to the same page
- [ ] Second visit: no new API requests (served from cache)
- [ ] Products appear instantly without skeletons

### 8. Test Error Handling
- [ ] Temporarily break a fetch (edit `useProducts.ts`, change API endpoint)
- [ ] Visit a product page
- [ ] Should see ErrorBoundary with "Algo salió mal" message
- [ ] Click "Retry" button → should reload page
- [ ] Restore correct endpoint, verify page works again

## Logout Flow

### 9. Test Logout
- [ ] From dashboard, click "Cerrar Sesión" button
- [ ] Button should show "Cerrando..." temporarily
- [ ] Should redirect to `/login`
- [ ] Try accessing `/dashboard` again → should redirect to `/login`

## Build Verification

### 10. Production Build
```bash
npm run build
```
- [ ] TypeScript compilation should pass without errors
- [ ] Build should complete successfully

---

**Test Completed:** ✅ All items checked
**Date:** ___________
**Tester:** ___________
**Notes:** ___________