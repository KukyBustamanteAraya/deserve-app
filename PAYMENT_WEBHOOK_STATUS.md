# Payment Webhook Issue - Status Report
**Last Updated:** October 12, 2025 - 10:00 AM
**Status:** 🟡 DEBUGGING IN PROGRESS

---

## 🎯 Current Situation

### ✅ What's Working:
1. **Payment Flow (Frontend):**
   - Users can initiate payments ✅
   - Mercado Pago checkout loads correctly ✅
   - Payments succeed on Mercado Pago's side ✅
   - Users are redirected back to success page ✅
   - Success message displays in UI ✅

2. **Webhook Infrastructure:**
   - Mercado Pago sends webhook notifications ✅
   - Webhooks reach our server (Vercel) ✅
   - Webhooks return 200 status (appear successful) ✅
   - Signature verification works correctly ✅

3. **Database Structure:**
   - `payment_contributions` table exists ✅
   - Records are created with correct `external_reference` ✅
   - Service role client has full database access ✅

### ❌ What's NOT Working:
1. **Database Updates:**
   - Webhooks return 200 but database stays in `payment_status: "pending"` ❌
   - `mp_payment_id` remains `null` ❌
   - `paid_at` timestamp never gets set ❌
   - Team page doesn't reflect payments ❌

---

## 🔍 Root Cause Analysis

### The Problem:
**Silent Failure** - Webhook returns 200 (success) but doesn't update the database. This happens when:
- Line 112-115: `if (!contribution)` → returns 200 and exits
- Database query finds nothing even though the record exists

### Why This Happens:
**Most Likely:** Row Level Security (RLS) policies blocking the query

**Evidence:**
- Payment contribution EXISTS in database (confirmed by SQL query)
- Webhook can't find it (logs show "Payment contribution not found")
- Regular server client respects RLS and requires authentication
- Webhooks are unauthenticated server-to-server calls

---

## 🛠️ Fixes Applied

### Fix #1: Switch to Service Role Client (Commit `51e0f1d`)
**File:** `src/app/api/mercadopago/webhook/route.ts`

**Changes:**
```typescript
// BEFORE (Line 4):
import { createSupabaseServer } from '@/lib/supabase/server-client';

// AFTER:
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// BEFORE (Line 92):
const supabase = createSupabaseServer();

// AFTER (Line 93):
// Use service client to bypass RLS - webhooks are unauthenticated server-to-server calls
const supabase = createSupabaseServiceClient();
```

**Why:** Service client bypasses RLS policies and has full database access for admin operations.

**Deployed:** October 12, 2025 ~9:50 AM
**Status:** ✅ Deployed, ⚠️ Not confirmed working

---

### Fix #2: Add Comprehensive Debug Logging (Commit `dabc11f`)
**File:** `src/app/api/mercadopago/webhook/route.ts`

**Added Logging:**
- Line 90: Log external reference received from Mercado Pago
- Line 98-99: Log service client creation
- Line 101: Log database query attempt
- Line 108-110: Log query errors if any occur
- Line 117: Log contribution found with ID and current status
- Line 129: Log payment status mapping (MP status → our status)
- Line 132: Log when starting update
- Line 151-155: Log update success/failure with detailed error

**Example Log Output (Expected):**
```
[Webhook] External reference from MP: split_73de55c5-0c8a-4a7c-9038-d7be4999a117_d5d4dc19-5271-4496-9848-b3bc2530754e_1760273548875
[Webhook] Creating service client to query database
[Webhook] Querying payment_contributions for external_reference: split_...
[Webhook] Found contribution: { id: 'aee9913e-db33-433d-8314-018ab7a35ff0', current_status: 'pending' }
[Webhook] MP payment status: approved -> mapped to: approved
[Webhook] Status changed, updating contribution: aee9913e-db33-433d-8314-018ab7a35ff0
[Webhook] ✅ Successfully updated contribution aee9913e-db33-433d-8314-018ab7a35ff0 to approved
```

**Deployed:** October 12, 2025 ~10:00 AM
**Status:** ✅ Deployed, ⏳ Awaiting testing

---

## 🧪 Testing Status

### Test #1 (Before RLS Fix):
- **Time:** ~9:53 AM
- **Payment ID:** `split_6ba4eb0c-b430-4860-a0a9-316aa2ab62ae_..._1760271903005`
- **Result:** ❌ Database stayed pending
- **Reason:** Using regular server client, RLS blocked access

### Test #2 (After RLS Fix, Before Debug Logging):
- **Time:** ~9:55 AM
- **Payment ID:** `split_73de55c5-0c8a-4a7c-9038-d7be4999a117_..._1760273548875`
- **Contribution ID:** `aee9913e-db33-433d-8314-018ab7a35ff0`
- **Webhook Status:** 200 (success)
- **Result:** ❌ Database stayed pending
- **Database Query Result:**
  ```json
  {
    "id": "aee9913e-db33-433d-8314-018ab7a35ff0",
    "external_reference": "split_73de55c5-0c8a-4a7c-9038-d7be4999a117_d5d4dc19-5271-4496-9848-b3bc2530754e_1760273548875",
    "payment_status": "pending",
    "mp_payment_id": null,
    "paid_at": null,
    "amount_cents": 2000
  }
  ```
- **Issue:** No detailed logs available to see WHERE the webhook failed

### Test #3 (After Debug Logging):
- **Status:** ⏳ BLOCKED - Cannot test due to fraud detection
- **Reason:** Multiple test payments from same cards flagged by Mercado Pago
- **Next Steps:** Need to wait 24-48 hours or use different payment methods

---

## 🔧 Environment Configuration

### Required Environment Variables:
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  ← CRITICAL FOR WEBHOOKS

# Mercado Pago (Required)
MP_ACCESS_TOKEN=APP_USR-xxxx...
MP_WEBHOOK_SECRET=57983a9bc2e8bb45ddaa2542c180757f1d7af59871fc9ee1fd3f56574325526a
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-xxxx...
```

### Vercel Configuration Status:
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Confirmed set in Vercel
- ✅ `MP_ACCESS_TOKEN` - Production credentials
- ✅ `MP_WEBHOOK_SECRET` - Real secret from Mercado Pago
- ✅ Webhook URL: `https://deserve-app.vercel.app/api/mercadopago/webhook`

---

## 📊 Data Flow Diagram

```
User Pays
   ↓
Mercado Pago processes payment
   ↓
MP sends webhook → https://deserve-app.vercel.app/api/mercadopago/webhook
   ↓
Webhook receives:
   - payment_id (e.g., 129059095239)
   - external_reference (e.g., split_73de55c5-0c8a-4a7c-9038-d7be4999a117_..._1760273548875)
   ↓
Webhook queries database:
   SELECT * FROM payment_contributions
   WHERE external_reference = 'split_...'
   ↓
🚨 FAILURE POINT: Query returns nothing
   ↓
Webhook exits with 200 status (silent skip)
   ↓
Database stays in "pending" state
   ↓
Team page shows no payment
```

---

## 🎯 Next Steps

### IMMEDIATE (When Testing Resumes):

1. **Make Test Payment with New Cards or Wait 24-48h**
   - Use different payment method to avoid fraud detection
   - OR wait for fraud flags to clear

2. **Check Vercel Logs for Detailed Messages**
   - Go to: Vercel → Logs → Filter by "POST /api/mercadopago/webhook"
   - Click on webhook log entry
   - Look for the detailed log messages we added
   - Copy ALL log messages from one webhook call

3. **Analyze Logs to Find Exact Failure Point**
   - If see: `"[Webhook] Found contribution:"` → Good! Query works
   - If see: `"[Webhook] Payment contribution not found"` → Query failed
   - If see: `"[Webhook] Database query error:"` → RLS or permissions issue
   - If see: `"[Webhook] Failed to update contribution:"` → Update permission issue

4. **Expected Outcomes:**

   **Scenario A: Service client works (EXPECTED)**
   ```
   [Webhook] Found contribution: {...}
   [Webhook] ✅ Successfully updated contribution
   ```
   → Payment reflects on team page ✅

   **Scenario B: Service client still blocked (UNEXPECTED)**
   ```
   [Webhook] Payment contribution not found
   ```
   → Need to investigate RLS policies or service role key

   **Scenario C: Query works but update fails (POSSIBLE)**
   ```
   [Webhook] Found contribution: {...}
   [Webhook] Failed to update contribution: {...}
   ```
   → Need to check table permissions for service role

### FALLBACK OPTIONS (If Service Client Doesn't Work):

#### Option A: Manual Webhook Resend
- Go to Mercado Pago dashboard
- Find successful payments
- Manually resend webhooks for each payment
- With new code, should update database

#### Option B: One-Time Sync Script
Create `/api/admin/sync-payments` endpoint:
```typescript
// Fetch all pending payment_contributions
// For each one, check status from Mercado Pago API
// Update database with real status
// Can be run manually by admin
```

#### Option C: Disable RLS for payment_contributions Table
```sql
-- NUCLEAR OPTION - removes security but allows webhooks
ALTER TABLE payment_contributions DISABLE ROW LEVEL SECURITY;
```
⚠️ Only use if all else fails - security risk

---

## 📝 Code Changes Summary

### Files Modified:

1. **`src/app/api/mercadopago/webhook/route.ts`**
   - Line 4: Import service client instead of server client
   - Line 90-117: Added extensive logging around query
   - Line 129-158: Added logging around status update
   - Purpose: Bypass RLS and debug silent failures

2. **`src/lib/supabase/server.ts`** (No changes needed)
   - Already has `createSupabaseServiceClient()` function
   - Uses `SUPABASE_SERVICE_ROLE_KEY` from env
   - Bypasses all RLS policies

### Related Files (Working Correctly):

- `src/app/mi-equipo/[slug]/page.tsx` - Team page that displays payments
- `src/components/admin/ProductForm.tsx` - Product management (fixed earlier)
- `src/app/api/admin/products/[id]/route.ts` - Product updates (fixed earlier)

---

## 🐛 Known Issues

### Critical:
1. **Webhook doesn't update database** (Main issue)
   - Status: 🔄 Investigating
   - Blocker: Cannot test due to fraud detection
   - ETA: Pending test results

### Resolved:
1. ✅ Admin product editing - Fixed
2. ✅ Price updates not saving - Fixed
3. ✅ Sport selection duplicates - Fixed
4. ✅ Team page 406 errors - Fixed
5. ✅ Webhook signature validation - Fixed
6. ✅ Webhook looking up wrong field - Fixed

---

## 💡 Hypothesis

**Most Likely Cause:**
The `SUPABASE_SERVICE_ROLE_KEY` environment variable might not be properly set in Vercel, OR there's a typo/formatting issue. When `createSupabaseServiceClient()` is called, it might:
1. Throw an error (line 54 in server.ts checks for the key)
2. Fall back to regular client silently
3. Use wrong credentials

**How Debug Logs Will Confirm:**
If we see `"Database query error: ..."` in logs, it will show the exact Supabase error message, which will tell us if it's:
- RLS policy blocking (shouldn't happen with service client)
- Missing credentials (would show auth error)
- Wrong table permissions (would show permission error)

**Alternative Theory:**
The external_reference format might be getting corrupted/modified somewhere in the flow, causing the query to not match even though the record exists.

---

## 📞 Support Contacts

- Vercel Support: https://vercel.com/support
- Mercado Pago Webhooks Docs: https://www.mercadopago.com.ar/developers/en/docs/your-integrations/webhooks
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security

---

## ✅ Testing Checklist (For Next Session)

- [ ] Confirm latest deployment (commit `dabc11f`) is live on Vercel
- [ ] Make test payment with different card or after 24-48h wait
- [ ] Immediately check Vercel logs after payment
- [ ] Copy all webhook log messages to text file
- [ ] Check database to see if payment_status changed
- [ ] Check team page to see if payment displays
- [ ] If still failing, review log messages for error details
- [ ] Consider fallback options if service client doesn't work

---

**End of Status Report**
