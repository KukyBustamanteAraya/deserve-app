# Pricing Calculator v2 - Product-Based Tiers + Bundle Discounts (CLP)

## Overview

The pricing calculator uses product-based tiers with fallback to discount bands:

1. **Product-Based Tiers**: Queries `pricing_tiers_product` table for product-specific quantity pricing
2. **Fallback Bands**: Uses hardcoded discount bands (0/5/10/15/20%) if no DB tier exists
3. **Bundle Discounts**: Applies `discount_pct` from `bundles` table (MVP: applies to base product)
4. **Currency**: All prices in CLP (integer pesos, zero decimals)

## Discount Bands (Fallback)

| Quantity Range | Discount |
|---------------|----------|
| 1-9           | 0%       |
| 10-24         | 5%       |
| 25-49         | 10%      |
| 50-99         | 15%      |
| 100+          | 20%      |

## Bundle Discounts

| Bundle | Discount |
|--------|----------|
| B1     | 5%       |
| B2     | 7%       |
| B3     | 5%       |
| B4     | 6%       |
| B5     | 8%       |
| B6     | 10%      |

## Setup

### 1. Apply Migrations

**pricing_tiers_product table** (product-based tiers, optional - fallback works without it):
```sql
-- Table should exist with columns:
-- product_id BIGINT, min_quantity INT, max_quantity INT, unit_price INT
-- Seed with product-specific pricing tiers
```

**bundles.discount_pct column** (required for bundle pricing):
```sql
-- Apply migration 017_bundles_discount_pct.sql via Supabase dashboard
```

Or manually via Supabase SQL Editor:
```sql
ALTER TABLE public.bundles
ADD COLUMN IF NOT EXISTS discount_pct INT DEFAULT 0 CHECK (discount_pct >= 0 AND discount_pct <= 100);

UPDATE public.bundles SET discount_pct = 5 WHERE code = 'B1';
UPDATE public.bundles SET discount_pct = 7 WHERE code = 'B2';
UPDATE public.bundles SET discount_pct = 5 WHERE code = 'B3';
UPDATE public.bundles SET discount_pct = 6 WHERE code = 'B4';
UPDATE public.bundles SET discount_pct = 8 WHERE code = 'B5';
UPDATE public.bundles SET discount_pct = 10 WHERE code = 'B6';
```

## API Usage

### GET /api/pricing/calculate

Calculate pricing for a product with optional bundle discount.

**Query Params:**
- `productId` (required): Product ID
- `quantity` (required): Quantity (min: 1)
- `bundleCode` (optional): Bundle code for discount

#### Single Product Request

```bash
curl "http://localhost:3000/api/pricing/calculate?productId=18&quantity=25" | jq
```

**Response:**
```json
{
  "unit_price": 1800000,
  "quantity": 25,
  "total": 45000000
}
```

#### Bundle Request (with discount)

```bash
curl "http://localhost:3000/api/pricing/calculate?productId=18&quantity=25&bundleCode=B5" | jq
```

**Response:**
```json
{
  "unit_price": 1800000,
  "discount_pct": 8,
  "quantity": 25,
  "total": 41400000
}
```

**Note:** `total` = `ROUND(unit_price * quantity * (100 - discount_pct) / 100)`

## Response Format

All values are integers (CLP pesos):

**Single Product:**
```typescript
{
  unit_price: number;    // CLP integer
  quantity: number;
  total: number;         // unit_price * quantity
}
```

**Bundle (with discount):**
```typescript
{
  unit_price: number;    // CLP integer
  discount_pct: number;  // 0-100
  quantity: number;
  total: number;         // After bundle discount
}
```

**Error:**
```typescript
{
  error: string;
}
```

## Testing

```bash
# Test quantity tier discounts
curl "http://localhost:3000/api/pricing/calculate?productId=18&quantity=1" | jq
curl "http://localhost:3000/api/pricing/calculate?productId=18&quantity=25" | jq
curl "http://localhost:3000/api/pricing/calculate?productId=18&quantity=100" | jq

# Test bundle discount (after migration)
curl "http://localhost:3000/api/pricing/calculate?productId=18&quantity=25&bundleCode=B5" | jq
```

## Migration Status

- ✅ **pricing_tiers_product table**: Product-based tiers (fallback bands work without it)
- ⚠️ **bundles.discount_pct**: Required for bundle pricing (needs manual migration)

## Files Changed

1. `src/app/api/pricing/calculate/route.ts` - Uses pricing_tiers_product with fallback
2. `supabase/migrations/017_bundles_discount_pct.sql` - Bundle discount column
3. `__tests__/api/pricing-calculate.test.ts` - Updated tests for pricing_tiers_product
4. `README_PRICING_V2.md` - This file
