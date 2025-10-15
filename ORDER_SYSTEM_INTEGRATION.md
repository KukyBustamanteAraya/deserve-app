# Order System Integration - Fixed

## Problem Identified

There were **two disconnected systems**:

### 1. Existing Payment System (Working)
- **Flow**: Design Approval → Create Order → Payments Page
- **Data Source**: Queries `orders` table directly
- **Location**: `/mi-equipo/[slug]/payments/page.tsx`
- **Status**: ✅ Working correctly

### 2. New Order Overview System (Not Connected)
- **Flow**: Should show same orders from #1
- **Data Source**: Was trying to query `order_overview` VIEW (doesn't exist yet)
- **Location**: `/src/components/team/orders/TeamOrderOverview.tsx`
- **Status**: ❌ Not showing orders

## Root Cause

The new TeamOrderOverview component was querying a database VIEW (`order_overview`) that only exists in the migration file but hasn't been applied to the actual database yet. Meanwhile, the existing payments system queries the `orders` table directly and works fine.

## Solution Applied

Updated `TeamOrderOverview.tsx` to:
1. **Query `orders` table directly** (same as payments page)
2. **Enhance orders with aggregated data** (manually fetch counts)
3. **Use correct field names** (`total_amount_cents` not `total_cents`)

### Changes Made:

#### Before:
```typescript
// Tried to query non-existent view
const { data: ordersData } = await supabase
  .from('order_overview')  // ❌ This view doesn't exist
  .select('*')
  .eq('team_id', teamId);
```

#### After:
```typescript
// Query actual orders table (like payments page does)
const { data: ordersData } = await supabase
  .from('orders')  // ✅ This table exists
  .select('*')
  .eq('team_id', teamId);

// Then enhance with aggregated data
const enhancedOrders = await Promise.all(
  (ordersData || []).map(async (order) => {
    const { count: itemCount } = await supabase
      .from('order_items')
      .select('*', { count: 'exact' })
      .eq('order_id', order.id);

    // ... fetch other counts
    return { ...order, item_count: itemCount, ... };
  })
);
```

## How It Works Now

### Design Approval Flow (Existing - Unchanged)

1. Manager approves design on team page
2. `DesignApprovalModal` calls `/api/design-requests/${id}/approve`
3. API creates an order in `orders` table
4. API creates order items in `order_items` table
5. Redirects to `/mi-equipo/${slug}/payments`

### Data Flow Now (Fixed)

```
┌─────────────────────────────────────────┐
│         orders TABLE (Database)         │
│  - id, team_id, status, payment_status  │
│  - total_amount_cents, payment_mode     │
│  - created_at, updated_at               │
└─────────────────────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │   BOTH SYSTEMS NOW    │
        │   QUERY THIS TABLE    │
        └───────────────────────┘
                    ↓
    ┌───────────────────────────────────┐
    │                                   │
    ↓                                   ↓
┌─────────────────────┐    ┌────────────────────────┐
│  Payments Page      │    │  Order Overview        │
│  (Existing)         │    │  (New - Now Fixed)     │
│                     │    │                        │
│  Shows detailed     │    │  Shows compact cards   │
│  payment info for   │    │  with order summary,   │
│  individual         │    │  stats, and quick      │
│  players            │    │  overview              │
└─────────────────────┘    └────────────────────────┘
```

## Where Orders Appear

After approval, the same order now appears in **TWO PLACES**:

### 1. Payments Page (`/mi-equipo/[slug]/payments`)
**Purpose**: Player-specific payment actions
- Detailed view with payment progress
- Player can pay their individual contribution
- Manager can pay full order or set up split payments
- Shows contributors list and order items

### 2. Team Page - Order Overview Section
**Purpose**: High-level order tracking
- Compact card view of all orders
- Shows order lifecycle stages (design → payment → production → shipping)
- Stats bar (active orders, total value, pending designs)
- Quick access to order details

## Database Fields Used

All queries now use the **actual database fields**:

| Field Name | Type | Description |
|------------|------|-------------|
| `id` | UUID | Order identifier |
| `team_id` | UUID | Team reference |
| `status` | TEXT | Order status (pending, paid, shipped, etc.) |
| `payment_status` | TEXT | Payment status (unpaid, partial, paid) |
| `payment_mode` | TEXT | How order is paid (individual vs manager_pays_all) |
| `total_amount_cents` | INTEGER | Total order amount in cents |
| `created_at` | TIMESTAMP | When order was created |

**Note**: The migration fields (`order_number`, `can_modify`, `locked_at`) will be available once the migration is applied, but are not required for basic functionality.

## Next Steps (Optional)

### To Enable Full Multi-Product Features:

1. **Apply the migration**: Run `20251014_enhance_orders_for_multi_product.sql`
   - This adds `order_number`, `can_modify`, `locked_at` fields
   - Creates helper functions for order assembly
   - Creates the `order_overview` view

2. **Implement "Add to Order" workflow**:
   - Allow managers to add approved designs to existing orders
   - Show modal to select target order when approving
   - Update order totals when products added

3. **Order Locking Logic**:
   - Automatically lock orders when status changes to "shipped"
   - Prevent modifications to locked orders
   - Show clear visual indicators for locked vs modifiable orders

## Testing Checklist

- [x] Approve a design and verify order appears in payments page
- [x] Verify same order appears in TeamOrderOverview section
- [x] Check that order displays correct total amount
- [x] Verify order status badges show correctly
- [ ] Test with multiple orders
- [ ] Test with different payment modes (individual vs manager_pays_all)
- [ ] Verify order stats calculate correctly

## Current Limitations

1. **Payment progress**: Shows 0% because payment tracking is not yet integrated
2. **Order number**: Shows first 8 chars of UUID instead of human-readable number (needs migration)
3. **Can modify flag**: Not yet functional (needs migration)
4. **Multi-product assembly**: Can't add multiple designs to one order yet (needs workflow implementation)

These limitations don't affect the basic functionality - orders are created, displayed, and payments work correctly. They're enhancements that can be added once the migration is applied.
