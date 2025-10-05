# Final Migration 013 - Copy/Paste Ready

## ⚠️ IMPORTANT CORRECTION

The user noted that `orders.id` is **UUID** (not BIGINT). I've corrected the migration accordingly.

## ✅ Verified Schema Alignments

```sql
-- From migrations/003_orders.sql:
-- orders.id = UUID (primary key)
-- orders.user_id = UUID
-- orders.team_id = UUID
```

### Fixed Foreign Key Types:

1. **notifications_log.order_id** → `UUID` (matches orders.id UUID)
2. **manufacturer_order_assignments.order_id** → `UUID` (matches orders.id UUID)
3. **pricing_tiers.product_id** → `BIGINT` (matches products.id BIGINT)
4. **design_candidates.team_id** → `BIGINT` (matches teams.id BIGINT)
5. **design_votes.user_id** → `UUID` (matches profiles.id UUID)

---

## 🚀 Complete Migration - Ready to Run

**File:** `/Users/kukybustamantearaya/Desktop/Deserve/deserve-app/migrations/013_pricing_and_voting_FIXED.sql`

**Status:** ✅ All FK types corrected

**To apply:**
1. Copy the file contents
2. Supabase Dashboard → SQL Editor
3. Paste and run

---

## 📋 Next Steps After Migration

### 1. Update TypeScript Types

**Search for numeric orderId types:**
```bash
# Find files using number for order IDs
grep -r "orderId.*number" deserve-app/src --include="*.ts" --include="*.tsx"
grep -r "order_id.*bigint" deserve-app/src --include="*.ts"
```

**Update to string/UUID:**
```typescript
// ❌ Before
interface Order {
  id: number;
  order_id: number;
}

// ✅ After
interface Order {
  id: string; // UUID
  order_id: string; // UUID
}
```

### 2. Run Seed Script

```bash
cd /Users/kukybustamantearaya/Desktop/Deserve/deserve-app

# Ensure env vars set
export NEXT_PUBLIC_SUPABASE_URL="https://tirhnanxmjsasvhfphbq.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run seed
node scripts/seed-pricing.ts
```

### 3. Verify Endpoints

**Test Fabrics API:**
```bash
curl http://localhost:3000/api/fabrics
```

**Expected:**
```json
{
  "fabrics": [
    {
      "id": "uuid-here",
      "name": "Deserve",
      "composition": "100% polyester",
      "gsm": 150,
      "price_modifier_cents": 0
    }
  ]
}
```

**Test Pricing API:**
```bash
# Get a product ID first (BIGINT)
PRODUCT_ID=1

# Get a fabric ID (UUID)
FABRIC_ID="uuid-from-fabrics-api"

curl "http://localhost:3000/api/pricing/calculate?product_id=${PRODUCT_ID}&quantity=25&fabric_id=${FABRIC_ID}"
```

### 4. Design Flow Sanity Check

**As Captain (create candidate):**
```bash
curl -X POST http://localhost:3000/api/design-candidates \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": 1,
    "design_url": "https://storage.supabase.co/design.png"
  }'
```

**As Member (vote):**
```bash
curl -X POST http://localhost:3000/api/design-votes \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": 1,
    "vote": true
  }'
```

---

## 🔧 Code Tasks Remaining

### Task 1: Fix Order ID Types (TypeScript)

**Files to update:**
- `src/types/*` - Interface definitions
- `src/app/api/orders/**/*.ts` - API routes
- `src/app/api/notifications/**/*.ts` - Notifications API
- `src/app/api/admin/orders/**/*.ts` - Admin routes
- Components using `parseInt(orderId)`

**Example fix:**
```typescript
// ❌ Before
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const orderId = parseInt(params.id); // WRONG - orders.id is UUID
}

// ✅ After
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const orderId = params.id; // UUID string
}
```

### Task 2: Update Seed Script

**File:** `scripts/seed-pricing.ts`

**Requirements:**
- Use `SUPABASE_SERVICE_ROLE_KEY` env var
- Add clear logging
- Exit codes (0 success, 1 failure)
- Error handling

### Task 3: Create Design Candidates API

**File:** `src/app/api/design-candidates/route.ts`

```typescript
// POST - Captain only
export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { team_id, design_url } = await request.json();

  // Verify captain
  const { data: team } = await supabase
    .from('teams')
    .select('created_by')
    .eq('id', team_id)
    .single();

  if (team?.created_by !== user?.id) {
    return NextResponse.json(
      { error: 'Only team captain can add designs' },
      { status: 403 }
    );
  }

  // Insert (RLS also enforces this)
  const { data, error } = await supabase
    .from('design_candidates')
    .insert({ team_id, design_url, uploaded_by: user?.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### Task 4: Create Design Votes API

**File:** `src/app/api/design-votes/route.ts`

```typescript
// POST - Team members only, UNIQUE constraint enforced
export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  const { candidate_id, vote } = await request.json();

  // Verify team membership
  const { data: candidate } = await supabase
    .from('design_candidates')
    .select('team_id, teams!inner(created_by)')
    .eq('id', candidate_id)
    .single();

  const { data: membership } = await supabase
    .from('team_members')
    .select('user_id')
    .eq('team_id', candidate.team_id)
    .eq('user_id', user?.id)
    .single();

  const isCaptain = candidate.teams.created_by === user?.id;

  if (!isCaptain && !membership) {
    return NextResponse.json(
      { error: 'Only team members can vote' },
      { status: 403 }
    );
  }

  // Insert vote (UNIQUE enforced by DB)
  const { data, error } = await supabase
    .from('design_votes')
    .insert({ candidate_id, user_id: user?.id, vote })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      return NextResponse.json(
        { error: 'Already voted on this design' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

### Task 5: Manufacturer Assignment Utility

**File:** `src/lib/manufacturer.ts`

```typescript
import { createSupabaseServer } from './supabase/server-client';

export async function assignManufacturerToOrder(
  orderId: string, // UUID
  manufacturerId: number // BIGINT
) {
  const supabase = createSupabaseServer();

  // Verify order exists
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Verify manufacturer exists
  const { data: manufacturer, error: mfgError } = await supabase
    .from('manufacturer_users')
    .select('id')
    .eq('id', manufacturerId)
    .single();

  if (mfgError || !manufacturer) {
    throw new Error(`Manufacturer ${manufacturerId} not found`);
  }

  // Assign
  const { data, error } = await supabase
    .from('manufacturer_order_assignments')
    .insert({ manufacturer_id: manufacturerId, order_id: orderId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new Error('Order already assigned to this manufacturer');
    }
    throw error;
  }

  return data;
}
```

### Task 6: Update Documentation

**File:** `README.md` (add section)

```markdown
## API Endpoints

### Fabrics

**GET /api/fabrics**

Returns all available fabrics with pricing modifiers.

\`\`\`bash
curl http://localhost:3000/api/fabrics
\`\`\`

Response:
\`\`\`json
{
  "fabrics": [
    {
      "id": "uuid",
      "name": "Deserve",
      "composition": "100% polyester",
      "gsm": 150,
      "price_modifier_cents": 0,
      "sort_order": 1
    }
  ]
}
\`\`\`

### Pricing Calculator

**GET /api/pricing/calculate**

Calculate dynamic pricing based on quantity and fabric.

Query params:
- `product_id` (BIGINT) - Product ID
- `quantity` (number) - Quantity (1-100)
- `fabric_id` (UUID) - Fabric ID

\`\`\`bash
curl "http://localhost:3000/api/pricing/calculate?product_id=1&quantity=25&fabric_id=<fabric-uuid>"
\`\`\`

Response:
\`\`\`json
{
  "base_price_cents": 35000,
  "fabric_modifier_cents": 3000,
  "unit_price_cents": 38000,
  "total_price_cents": 950000,
  "savings_cents": 50000,
  "tier": {
    "min_quantity": 16,
    "max_quantity": null,
    "price_per_unit_cents": 35000
  }
}
\`\`\`

## Data Seeding

\`\`\`bash
# Set environment variables
export NEXT_PUBLIC_SUPABASE_URL="your-url"
export SUPABASE_SERVICE_ROLE_KEY="your-key"

# Run pricing seed
node scripts/seed-pricing.ts
\`\`\`

## Important Notes

- **Order IDs are UUIDs** everywhere (orders.id, notifications_log.order_id, manufacturer_order_assignments.order_id)
- **Product IDs are BIGINT** (products.id, pricing_tiers.product_id)
- **Team IDs are BIGINT** (teams.id, design_candidates.team_id)
- **User IDs are UUID** (profiles.id references auth.users.id)
\`\`\`

---

## Summary of Corrections

| Table | Column | Type | References |
|-------|--------|------|------------|
| notifications_log | order_id | UUID | orders.id (UUID) |
| manufacturer_order_assignments | order_id | UUID | orders.id (UUID) |
| pricing_tiers | product_id | BIGINT | products.id (BIGINT) |
| design_candidates | team_id | BIGINT | teams.id (BIGINT) |
| design_votes | user_id | UUID | profiles.id (UUID) |

✅ Migration file updated and ready to run!
