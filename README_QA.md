# Phase 3 QA Guide

## Prerequisites

Ensure environment variables are set in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://tirhnanxmjsasvhfphbq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Running Smoke Tests

### 1. Start the dev server:
```bash
npm run dev
```

### 2. Run the automated smoke script:
```bash
node scripts/smoke.mjs
```

Expected output:
```
✅ Smoke API wrappers OK
```

### 3. Manual API Tests

Test each Phase 3 endpoint:

```bash
# Sports taxonomy
curl -s http://localhost:3000/api/sports | jq .
# Expected: { "data": { "items": [...] } }

# Bundles
curl -s http://localhost:3000/api/bundles | jq .
# Expected: { "data": { "items": [...] } }

# Fabric recommendations
curl -s "http://localhost:3000/api/fabrics/recommendations?type=jersey&sport=rugby" | jq .
# Expected: { "data": { "items": [...] } }
```

## Testing UI Pages

### Roster Upload

1. Navigate to `/dashboard/teams/[teamId]/roster` (requires logged-in team captain)
2. Upload the sample CSV: `fixtures/roster-sample.csv`
3. Verify 4-step wizard works:
   - Upload → Preview → Map columns → Commit
4. Check data appears in Supabase `roster_members` table

### Design Requests

1. Navigate to `/dashboard/teams/[teamId]/design` (requires logged-in team captain)
2. Create a new design request
3. Verify status updates work (open → voting → approved/rejected)
4. Check data appears in Supabase `design_requests` table

## Phase 3 Endpoints Checklist

- ✅ GET `/api/sports` → `{ data: { items } }`
- ✅ GET `/api/bundles` → `{ data: { items } }`
- ✅ GET `/api/fabrics` → `{ data: { items } }`
- ✅ GET `/api/fabrics/recommendations` → `{ data: { items } }`
- ✅ POST `/api/roster/preview` → `{ data: { headers, rows, totalRows } }`
- ✅ POST `/api/roster/commit` → `{ data: { inserted, skipped, errors } }`
- ✅ GET `/api/design-requests` → `{ data: { items, total } }`
- ✅ POST `/api/design-requests` → `{ data: designRequest }`
- ✅ PATCH `/api/design-requests/[id]/status` → `{ data: updated }`

## Database Setup

Phase 3 requires these migrations to be applied:
- `014_taxonomy_bundles.sql` - Product types, sports, bundles, fabric recommendations
- `015_roster_design.sql` - Roster members, design requests

To apply migrations manually (if needed):
```bash
# Connect to Supabase and run the SQL files
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/014_taxonomy_bundles.sql
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/015_roster_design.sql
```

## Troubleshooting

### Server won't start
- Check port 3000 isn't in use: `lsof -ti:3000 | xargs kill -9`
- Verify `.env.local` has correct Supabase credentials

### API returns 401 Unauthorized
- Endpoints requiring auth: roster/*, design-requests/*
- Login as a team captain to test protected routes

### Smoke tests fail
- Ensure migrations have been applied to database
- Check dev server is running on port 3000
- Verify Supabase URL is accessible

## E2E Testing (Optional)

If Playwright is configured:
```bash
E2E_TEAM_ID=<your-test-team-id> npm run playwright test e2e/roster.spec.ts
```
