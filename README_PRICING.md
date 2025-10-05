# Pricing Calculator API

## Overview

The Pricing Calculator provides tiered pricing for products and bundles based on quantity, with support for fabric modifiers.

## Discount Tiers

Standard discount bands applied to all products:

| Quantity Range | Discount |
|---------------|----------|
| 1-9           | 0%       |
| 10-24         | 5%       |
| 25-49         | 10%      |
| 50-99         | 15%      |
| 100+          | 20%      |

## Bundle Discounts

Additional discounts applied to bundle totals:

| Bundle | Discount |
|--------|----------|
| B1     | 5%       |
| B2     | 7%       |
| B3     | 5%       |
| B4     | 6%       |
| B5     | 8%       |
| B6     | 10%      |

## Setup

### 1. Run Migration

```bash
# Apply the pricing_tiers migration
supabase db push
```

### 2. Seed Pricing Tiers

```bash
# Run the seeding script
NEXT_PUBLIC_SUPABASE_URL=<your-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key> \
npx tsx scripts/seed-pricing-tiers.ts
```

The script is idempotent - it won't create duplicate tiers if run multiple times.

## API Usage

### POST /api/pricing/calculate

Calculate pricing for a single product or bundle.

#### Single Product Request

```bash
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "productId": 14,
    "quantity": 25,
    "fabricId": "fabric-uuid-here"
  }'
```

#### Single Product Response

```json
{
  "data": {
    "unit_price_cents": 1800000,
    "quantity": 25,
    "subtotal_cents": 45000000,
    "fabric_modifier_cents": 50000,
    "tier_applied": {
      "min_quantity": 25,
      "max_quantity": 49,
      "price_per_unit_cents": 1800000,
      "discount_pct": 10
    }
  }
}
```

#### Bundle Request

```bash
curl -X POST http://localhost:3000/api/pricing/calculate \
  -H "Content-Type": application/json" \
  -d '{
    "bundleCode": "B5",
    "quantity": 12,
    "fabricId": "fabric-uuid-here"
  }'
```

#### Bundle Response

```json
{
  "data": {
    "quantity": 12,
    "lines": [
      {
        "type_slug": "jersey",
        "qty": 12,
        "unit_price_cents": 1900000,
        "subtotal_cents": 22800000,
        "tier_applied": {
          "min_quantity": 10,
          "max_quantity": 24,
          "price_per_unit_cents": 1900000,
          "discount_pct": 5
        }
      }
    ],
    "bundle_code": "B5",
    "bundle_discount_pct": 8,
    "fabric_modifier_cents": 600000,
    "subtotal_cents": 22800000,
    "discount_cents": 1824000,
    "total_cents": 20976000
  }
}
```

## React Hooks

### usePriceQuote

```typescript
import { usePriceQuote } from '@/hooks/usePricing';

function ProductPage() {
  const { quote, isLoading, error } = usePriceQuote({
    productId: 14,
    quantity: 25,
    fabricId: 'fabric-uuid',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Unit Price: ${quote.unit_price_cents / 100}</p>
      <p>Total: ${quote.subtotal_cents / 100}</p>
      {quote.tier_applied && (
        <p>Discount: {quote.tier_applied.discount_pct}%</p>
      )}
    </div>
  );
}
```

### useBundleQuote

```typescript
import { useBundleQuote } from '@/hooks/usePricing';

function BundlePage() {
  const { quote, isLoading, error } = useBundleQuote({
    bundleCode: 'B5',
    quantity: 12,
    fabricId: 'fabric-uuid',
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Subtotal: ${quote.subtotal_cents / 100}</p>
      <p>Bundle Discount ({quote.bundle_discount_pct}%): -${quote.discount_cents / 100}</p>
      <p>Total: ${quote.total_cents / 100}</p>
    </div>
  );
}
```

## Testing

Run integration tests:

```bash
# Make sure dev server is running
npm run dev

# Run tests (when test runner is configured)
npm test __tests__/api/pricing-calculate.test.ts
```

Manual test with curl:

```bash
# Test quantity tier discounts
for qty in 1 10 25 50 100; do
  echo "Testing quantity: $qty"
  curl -X POST http://localhost:3000/api/pricing/calculate \
    -H "Content-Type: application/json" \
    -d "{\"productId\": 14, \"quantity\": $qty}" | jq '.data.tier_applied'
done
```

## Files Changed

1. **supabase/migrations/016_pricing_tiers.sql** - Database schema
2. **scripts/seed-pricing-tiers.ts** - Seeding script
3. **src/app/api/pricing/calculate/route.ts** - API endpoint
4. **src/hooks/usePricing.ts** - React hooks
5. **__tests__/api/pricing-calculate.test.ts** - Integration tests
6. **README_PRICING.md** - This documentation
