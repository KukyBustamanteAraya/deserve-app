# DESERVE ATHLETICS - MASTER DEVELOPMENT PLAN
**Created:** October 24, 2025
**Status:** Ready for Implementation
**Goal:** Complete feature set for scale-ready production launch

---

## EXECUTIVE SUMMARY

Based on comprehensive system audits, we have identified **7 critical work streams** requiring completion before mass marketing launch.

**Current State:** 85% feature complete, production-ready for 20-30 teams
**Target State:** 100% feature complete, scale-ready for 500+ teams, 5,000+ users

**Total Estimated Effort:** 295 hours (~7.5 weeks for single engineer, ~4 weeks for team of 2)

---

## PRIORITY MATRIX

| Priority | Feature | Impact | Effort | ROI |
|----------|---------|--------|--------|-----|
| **P0** | Tiered Pricing System | CRITICAL | 25h | Unlock institutional deals |
| **P0** | Sizing Calculator Integration | CRITICAL | 35h | Prevent returns, improve UX |
| **P0** | Email Notification System | CRITICAL | 40h | Enable scale, reduce support |
| **P1** | Order Tracking & Timeline | HIGH | 30h | Customer satisfaction |
| **P1** | Team Reorder Flow | HIGH | 25h | Repeat revenue |
| **P2** | Institution Dashboard | MEDIUM | 35h | Large customer retention |
| **P2** | Admin Workflow Automation | MEDIUM | 50h | Operational efficiency |
| **P3** | Performance Optimization | MEDIUM | 25h | Handle 100+ concurrent users |
| **P3** | Self-Service Features | LOW | 30h | Reduce support burden |

---

# PHASE 1: CRITICAL FOUNDATIONS (Week 1-2)
**Duration:** 100 hours
**Goal:** Fix blocking issues preventing institutional sales and scale

---

## TASK 1: IMPLEMENT TIERED PRICING SYSTEM
**Priority:** P0 - CRITICAL
**Effort:** 25 hours
**Dependencies:** None
**Owner:** Backend + Frontend Engineer

### Current State Analysis
✅ **What exists:**
- Hardcoded discount bands (0%, 25%, 50%, 52.5%, 55%, 57.5%)
- Bundle discounts (5-10% off)
- `pricing_tiers_product` table (empty)
- `/api/pricing/calculate` endpoint (works with fallback)
- `/api/pricing/bundle` endpoint (works)

❌ **What's missing:**
- Per-product custom tiers
- Admin UI to manage pricing
- Tiered bundle discounts
- Component-fabric pricing matrix

### Implementation Plan

#### Step 1.1: Database Schema Enhancement (2 hours)
```sql
-- File: supabase/migrations/20251024_enhance_pricing_tiers.sql

-- 1. Add tiered bundle discounts
ALTER TABLE bundles ADD COLUMN discount_tiers JSONB;
COMMENT ON COLUMN bundles.discount_tiers IS
  'Quantity-based bundle discounts: {"1": 5, "5": 8, "10": 12}';

-- 2. Create component-fabric pricing matrix
CREATE TABLE component_fabric_pricing (
  id BIGSERIAL PRIMARY KEY,
  component_type_slug TEXT NOT NULL,
  fabric_id UUID,
  price_modifier_clp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(component_type_slug, fabric_id)
);

-- 3. Add RLS policies
ALTER TABLE component_fabric_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "component_fabric_pricing_public_read"
  ON component_fabric_pricing FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "component_fabric_pricing_admin_write"
  ON component_fabric_pricing FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Create pricing configuration table
CREATE TABLE pricing_configuration (
  id BIGSERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Seed default discount bands
INSERT INTO pricing_configuration (config_key, config_value, description)
VALUES (
  'default_quantity_discounts',
  '[
    {"min": 1, "max": 4, "discount": 0},
    {"min": 5, "max": 9, "discount": 25},
    {"min": 10, "max": 24, "discount": 50},
    {"min": 25, "max": 49, "discount": 52.5},
    {"min": 50, "max": 99, "discount": 55},
    {"min": 100, "max": null, "discount": 57.5}
  ]'::jsonb,
  'Default quantity discount bands applied when product-specific tiers not found'
);
```

**Files to create:**
- `supabase/migrations/20251024_enhance_pricing_tiers.sql`

**Testing:**
```bash
# Apply migration
supabase db push

# Verify tables created
psql -c "SELECT * FROM component_fabric_pricing LIMIT 1;"
psql -c "SELECT * FROM pricing_configuration;"
```

---

#### Step 1.2: Seed Pricing Data (3 hours)
```typescript
// File: scripts/seed-product-pricing-tiers.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedProductPricingTiers() {
  // 1. Get all products
  const { data: products } = await supabase
    .from('products')
    .select('id, base_price_clp, product_type_slug');

  // 2. For each product, create tiers based on default bands
  const { data: config } = await supabase
    .from('pricing_configuration')
    .select('config_value')
    .eq('config_key', 'default_quantity_discounts')
    .single();

  const bands = config.config_value;

  for (const product of products) {
    const tiers = bands.map((band: any) => ({
      product_id: product.id,
      min_quantity: band.min,
      max_quantity: band.max,
      unit_price: Math.round(product.base_price_clp * (100 - band.discount) / 100)
    }));

    await supabase.from('pricing_tiers_product').upsert(tiers);
  }

  // 3. Seed component-fabric pricing (example: premium fabrics cost more for jerseys)
  await supabase.from('component_fabric_pricing').upsert([
    { component_type_slug: 'jersey', fabric_id: null, price_modifier_clp: 0 },
    { component_type_slug: 'shorts', fabric_id: null, price_modifier_clp: 0 },
    { component_type_slug: 'socks', fabric_id: null, price_modifier_clp: 0 },
    // TODO: Add fabric-specific modifiers when fabric IDs known
  ]);

  console.log('✅ Pricing tiers seeded successfully');
}

seedProductPricingTiers();
```

**Files to create:**
- `scripts/seed-product-pricing-tiers.ts`

**Testing:**
```bash
npm run tsx scripts/seed-product-pricing-tiers.ts
```

---

#### Step 1.3: Update Pricing API (8 hours)

**File:** `src/app/api/pricing/calculate/route.ts`

**Changes:**
1. Support tiered bundle discounts
2. Use component-fabric pricing matrix
3. Return detailed pricing breakdown

```typescript
// Enhanced GET /api/pricing/calculate

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get('productId');
  const quantity = parseInt(searchParams.get('quantity') || '1');
  const bundleCode = searchParams.get('bundleCode');
  const fabricId = searchParams.get('fabricId');

  // ... existing validation ...

  // 1. Get product-specific tiers (if exist)
  const { data: tiers } = await supabase
    .from('pricing_tiers_product')
    .select('unit_price')
    .eq('product_id', productId)
    .lte('min_quantity', quantity)
    .or(`max_quantity.is.null,max_quantity.gte.${quantity}`)
    .order('min_quantity', { ascending: false })
    .limit(1);

  let unitPrice: number;

  if (tiers && tiers.length > 0) {
    unitPrice = tiers[0].unit_price;
  } else {
    // Fallback to default bands
    const { data: config } = await supabase
      .from('pricing_configuration')
      .select('config_value')
      .eq('config_key', 'default_quantity_discounts')
      .single();

    const bands = config.config_value;
    const band = bands.find((b: any) =>
      quantity >= b.min && (b.max === null || quantity <= b.max)
    );

    const { data: product } = await supabase
      .from('products')
      .select('base_price_clp')
      .eq('id', productId)
      .single();

    unitPrice = Math.round(
      product.base_price_clp * (100 - (band?.discount || 0)) / 100
    );
  }

  // 2. Apply fabric modifier (component-aware)
  if (fabricId) {
    const { data: product } = await supabase
      .from('products')
      .select('product_type_slug')
      .eq('id', productId)
      .single();

    const { data: fabricPricing } = await supabase
      .from('component_fabric_pricing')
      .select('price_modifier_clp')
      .eq('component_type_slug', product.product_type_slug)
      .eq('fabric_id', fabricId)
      .single();

    if (fabricPricing) {
      unitPrice += fabricPricing.price_modifier_clp;
    }
  }

  let subtotal = unitPrice * quantity;
  let bundleDiscountPct = 0;
  let bundleDiscountAmount = 0;

  // 3. Apply tiered bundle discount
  if (bundleCode) {
    const { data: bundle } = await supabase
      .from('bundles')
      .select('discount_pct, discount_tiers')
      .eq('code', bundleCode)
      .single();

    if (bundle.discount_tiers) {
      // Find best tier for this quantity
      const tiers = bundle.discount_tiers as Record<string, number>;
      const applicableTiers = Object.entries(tiers)
        .filter(([minQty]) => quantity >= parseInt(minQty))
        .sort(([a], [b]) => parseInt(b) - parseInt(a));

      bundleDiscountPct = applicableTiers[0]?.[1] || bundle.discount_pct || 0;
    } else {
      bundleDiscountPct = bundle.discount_pct || 0;
    }

    bundleDiscountAmount = Math.round(subtotal * bundleDiscountPct / 100);
  }

  const total = subtotal - bundleDiscountAmount;

  return NextResponse.json({
    success: true,
    data: {
      unit_price: unitPrice,
      quantity,
      subtotal,
      bundle_code: bundleCode || null,
      bundle_discount_pct: bundleDiscountPct,
      bundle_discount_amount: bundleDiscountAmount,
      total,
      currency: 'CLP'
    }
  });
}
```

**Files to modify:**
- `src/app/api/pricing/calculate/route.ts` (60 lines changed)
- `src/app/api/pricing/bundle/route.ts` (similar changes, 80 lines)

**Testing:**
```bash
# Test product-specific tiers
curl "http://localhost:3000/api/pricing/calculate?productId=14&quantity=25"

# Test tiered bundle discount
curl "http://localhost:3000/api/pricing/calculate?productId=14&quantity=10&bundleCode=B5"

# Test fabric modifier
curl "http://localhost:3000/api/pricing/calculate?productId=14&quantity=5&fabricId=abc-123"
```

---

#### Step 1.4: Admin Pricing Management UI (12 hours)

**Create new admin page:** `src/app/admin/pricing/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function AdminPricingPage() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [tiers, setTiers] = useState([]);

  // Load products on mount
  useEffect(() => {
    async function loadProducts() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from('products')
        .select('id, name, base_price_clp, product_type_slug');
      setProducts(data || []);
    }
    loadProducts();
  }, []);

  // Load tiers when product selected
  useEffect(() => {
    if (!selectedProduct) return;
    async function loadTiers() {
      const supabase = createBrowserClient();
      const { data } = await supabase
        .from('pricing_tiers_product')
        .select('*')
        .eq('product_id', selectedProduct.id)
        .order('min_quantity');
      setTiers(data || []);
    }
    loadTiers();
  }, [selectedProduct]);

  async function saveTiers() {
    const supabase = createBrowserClient();
    await supabase.from('pricing_tiers_product').upsert(tiers);
    alert('Pricing tiers saved!');
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pricing Management</h1>

      {/* Product Selector */}
      <div className="mb-6">
        <label className="block mb-2">Select Product:</label>
        <select
          className="border p-2 rounded"
          onChange={(e) => {
            const product = products.find(p => p.id === parseInt(e.target.value));
            setSelectedProduct(product);
          }}
        >
          <option value="">-- Select --</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name} (Base: ${product.base_price_clp.toLocaleString()} CLP)
            </option>
          ))}
        </select>
      </div>

      {/* Pricing Tiers Editor */}
      {selectedProduct && (
        <div className="border p-4 rounded">
          <h2 className="text-xl mb-4">
            Pricing Tiers for {selectedProduct.name}
          </h2>

          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Min Qty</th>
                <th className="text-left p-2">Max Qty</th>
                <th className="text-left p-2">Unit Price (CLP)</th>
                <th className="text-left p-2">Discount %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">
                    <input
                      type="number"
                      className="border p-1 w-20"
                      value={tier.min_quantity}
                      onChange={(e) => {
                        const newTiers = [...tiers];
                        newTiers[idx].min_quantity = parseInt(e.target.value);
                        setTiers(newTiers);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="border p-1 w-20"
                      value={tier.max_quantity || ''}
                      placeholder="∞"
                      onChange={(e) => {
                        const newTiers = [...tiers];
                        newTiers[idx].max_quantity = e.target.value ? parseInt(e.target.value) : null;
                        setTiers(newTiers);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      className="border p-1 w-32"
                      value={tier.unit_price}
                      onChange={(e) => {
                        const newTiers = [...tiers];
                        newTiers[idx].unit_price = parseInt(e.target.value);
                        setTiers(newTiers);
                      }}
                    />
                  </td>
                  <td className="p-2">
                    {Math.round((1 - tier.unit_price / selectedProduct.base_price_clp) * 100)}%
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => setTiers(tiers.filter((_, i) => i !== idx))}
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex gap-4">
            <button
              onClick={() => setTiers([...tiers, {
                product_id: selectedProduct.id,
                min_quantity: tiers.length > 0 ? tiers[tiers.length - 1].max_quantity + 1 : 1,
                max_quantity: null,
                unit_price: selectedProduct.base_price_clp
              }])}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Add Tier
            </button>

            <button
              onClick={saveTiers}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Save Tiers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Files to create:**
- `src/app/admin/pricing/page.tsx` (150 lines)
- `src/app/admin/pricing/PricingTiersEditor.tsx` (component, 100 lines)
- `src/app/admin/pricing/BundleDiscountEditor.tsx` (component, 80 lines)

**Add route to admin nav:**
- `src/app/admin/page.tsx` - Add "Pricing Management" card

---

### Deliverables
- [x] Database migration with new tables
- [x] Seeding script for product tiers
- [x] Enhanced pricing API with tiered bundle support
- [x] Admin UI for pricing management
- [x] Integration tests for pricing calculations
- [x] Documentation update

### Success Criteria
- ✅ Product-specific pricing tiers configurable per product
- ✅ Tiered bundle discounts (e.g., 5 bundles = 12% off vs 1 bundle = 8% off)
- ✅ Component-fabric pricing matrix functional
- ✅ Admin can manage all pricing via UI
- ✅ API returns detailed pricing breakdown
- ✅ All tests pass

---

## TASK 2: INTEGRATE SIZING CALCULATOR
**Priority:** P0 - CRITICAL
**Effort:** 35 hours
**Dependencies:** None
**Owner:** Full-Stack Engineer

### Current State Analysis
✅ **What exists:**
- SizingCalculator component (full functionality)
- `/api/sizing/calculate` endpoint (works)
- `size_charts` table (has data)
- Risk-based scoring system (BMI, height, measurements)

❌ **What's missing:**
- Integration into product pages
- Integration into checkout flow
- Persistent storage of measurements
- Sizing data in order items

### Implementation Plan

#### Step 2.1: Database Schema for Sizing (3 hours)

```sql
-- File: supabase/migrations/20251024_add_sizing_system.sql

-- 1. Create player measurements table
CREATE TABLE player_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- Measurements
  height_cm NUMERIC(5,2) NOT NULL CHECK (height_cm BETWEEN 120 AND 250),
  weight_kg NUMERIC(5,2) CHECK (weight_kg BETWEEN 20 AND 200),
  jersey_length_cm NUMERIC(5,2),
  jersey_width_cm NUMERIC(5,2),

  -- Preferences
  fit_preference TEXT CHECK (fit_preference IN ('slim', 'regular', 'relaxed')),
  gender TEXT NOT NULL CHECK (gender IN ('boys', 'girls', 'men', 'women', 'unisex')),

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, team_id)
);

-- 2. Extend order_items with sizing data
ALTER TABLE order_items ADD COLUMN sizing_input JSONB;
ALTER TABLE order_items ADD COLUMN sizing_recommendation JSONB;

COMMENT ON COLUMN order_items.sizing_input IS
  'User input: {height_cm, weight_kg, jersey_length_cm, jersey_width_cm, fit_preference}';
COMMENT ON COLUMN order_items.sizing_recommendation IS
  'Calculator output: {primary_size, alternate_sizes, confidence_score, risk_level, rationale}';

-- 3. Add RLS policies
ALTER TABLE player_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_measurements_own"
  ON player_measurements FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "player_measurements_team"
  ON player_measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_memberships
      WHERE team_id = player_measurements.team_id
        AND user_id = auth.uid()
    )
  );

CREATE POLICY "player_measurements_admin"
  ON player_measurements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- 4. Create index for performance
CREATE INDEX idx_player_measurements_user_id ON player_measurements(user_id);
CREATE INDEX idx_player_measurements_team_id ON player_measurements(team_id);
```

**Files to create:**
- `supabase/migrations/20251024_add_sizing_system.sql`

---

#### Step 2.2: Sizing Data API (5 hours)

**Create:** `src/app/api/player/measurements/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { requireAuth } from '@/lib/auth/requireUser';
import { z } from 'zod';

const measurementSchema = z.object({
  height_cm: z.number().min(120).max(250),
  weight_kg: z.number().min(20).max(200).optional(),
  jersey_length_cm: z.number().positive().optional(),
  jersey_width_cm: z.number().positive().optional(),
  fit_preference: z.enum(['slim', 'regular', 'relaxed']).optional(),
  gender: z.enum(['boys', 'girls', 'men', 'women', 'unisex']),
  team_id: z.string().uuid().optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  const supabase = createRouteClient();
  const user = await requireAuth(supabase);

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  const query = supabase
    .from('player_measurements')
    .select('*')
    .eq('user_id', user.id);

  if (teamId) {
    query.eq('team_id', teamId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const supabase = createRouteClient();
  const user = await requireAuth(supabase);

  const body = await request.json();
  const validation = measurementSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: 'Invalid measurement data',
      details: validation.error.errors
    }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('player_measurements')
    .upsert({
      ...validation.data,
      user_id: user.id
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
```

**Files to create:**
- `src/app/api/player/measurements/route.ts` (70 lines)

---

#### Step 2.3: Product Page Integration (10 hours)

**Modify:** `src/app/products/[slug]/ProductDetailClient.tsx`

Add sizing calculator widget to product page:

```typescript
import SizingCalculator from '@/components/sizing/SizingCalculator';
import { useState } from 'react';

export default function ProductDetailClient({ product }: Props) {
  const [showSizingCalculator, setShowSizingCalculator] = useState(false);
  const [sizingRecommendation, setSizingRecommendation] = useState(null);

  // ... existing code ...

  return (
    <div>
      {/* ... existing product info ... */}

      {/* ADD: Sizing Calculator Section */}
      <div className="mt-8 border-t pt-8">
        <h3 className="text-lg font-semibold mb-4">Need help choosing your size?</h3>

        {!showSizingCalculator && (
          <button
            onClick={() => setShowSizingCalculator(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Use Sizing Calculator
          </button>
        )}

        {showSizingCalculator && (
          <SizingCalculator
            sportId={product.sport_id}
            productTypeSlug={product.product_type_slug}
            onRecommendation={(recommendation) => {
              setSizingRecommendation(recommendation);
              // Auto-select recommended size
              // TODO: Update product variant selection
            }}
          />
        )}

        {sizingRecommendation && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="font-semibold">Recommended Size: {sizingRecommendation.primary_size}</p>
            <p className="text-sm text-gray-600">
              Confidence: {sizingRecommendation.confidence_score}%
            </p>
            {sizingRecommendation.alternate_sizes?.length > 0 && (
              <p className="text-sm mt-2">
                Alternatives: {sizingRecommendation.alternate_sizes.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ADD: Size Chart Table */}
      <div className="mt-6">
        <h4 className="font-semibold mb-2">Size Chart</h4>
        {/* Render size chart from size_charts table */}
      </div>
    </div>
  );
}
```

**Files to modify:**
- `src/app/products/[slug]/ProductDetailClient.tsx` (+80 lines)

**Files to create:**
- `src/components/sizing/SizingHelperWidget.tsx` (embeddable widget, 60 lines)
- `src/components/sizing/SizeChartTable.tsx` (display component, 50 lines)

---

#### Step 2.4: Checkout Integration (8 hours)

**Modify:** `src/app/checkout/CheckoutClient.tsx`

Add sizing confirmation step:

```typescript
export default function CheckoutClient() {
  const [currentStep, setCurrentStep] = useState<'cart' | 'sizing' | 'shipping' | 'payment'>('cart');
  const [orderItemSizes, setOrderItemSizes] = useState<Record<string, any>>({});

  // ... existing code ...

  return (
    <div>
      {/* Step indicator */}
      <div className="flex justify-between mb-8">
        <Step label="Cart" active={currentStep === 'cart'} />
        <Step label="Sizing" active={currentStep === 'sizing'} />
        <Step label="Shipping" active={currentStep === 'shipping'} />
        <Step label="Payment" active={currentStep === 'payment'} />
      </div>

      {/* Sizing step */}
      {currentStep === 'sizing' && (
        <div>
          <h2 className="text-2xl mb-6">Confirm Sizes</h2>
          {cartItems.map(item => (
            <div key={item.id} className="border p-4 rounded mb-4">
              <h3>{item.product_name}</h3>
              <p>Current size: {item.size || 'Not selected'}</p>

              <button
                onClick={() => {
                  // Open sizing calculator modal for this item
                }}
                className="text-blue-600 hover:underline"
              >
                Use sizing calculator
              </button>

              {orderItemSizes[item.id]?.recommendation && (
                <div className="mt-2 p-2 bg-blue-50 rounded">
                  <p className="text-sm">
                    Recommended: {orderItemSizes[item.id].recommendation.primary_size}
                  </p>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => setCurrentStep('shipping')}
            className="bg-green-600 text-white px-6 py-3 rounded"
          >
            Confirm Sizes & Continue
          </button>
        </div>
      )}

      {/* ... existing shipping/payment steps ... */}
    </div>
  );
}
```

**Files to modify:**
- `src/app/checkout/CheckoutClient.tsx` (+150 lines)

---

#### Step 2.5: Store Sizing with Orders (4 hours)

**Modify:** `src/app/api/orders/route.ts`

Update order creation to include sizing data:

```typescript
export async function POST(request: NextRequest) {
  // ... existing validation ...

  const orderItems = items.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    size: item.size,

    // ADD: Sizing data
    sizing_input: item.sizing_input || null,  // User measurements
    sizing_recommendation: item.sizing_recommendation || null,  // Calculator output

    // ... other fields ...
  }));

  // ... insert order and items ...
}
```

**Files to modify:**
- `src/app/api/orders/route.ts` (+20 lines)
- `src/types/orders.ts` (add sizing fields to OrderItem type)

---

#### Step 2.6: Admin Sizing Review (5 hours)

**Create:** `src/components/admin/OrderSizingReview.tsx`

Admin component to see sizing rationale:

```typescript
export default function OrderSizingReview({ orderItem }: Props) {
  if (!orderItem.sizing_recommendation) {
    return <p className="text-gray-500">No sizing data available</p>;
  }

  const rec = orderItem.sizing_recommendation;

  return (
    <div className="border p-4 rounded">
      <h4 className="font-semibold mb-2">Sizing Details</h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Input</p>
          {orderItem.sizing_input && (
            <ul className="text-sm">
              <li>Height: {orderItem.sizing_input.height_cm} cm</li>
              {orderItem.sizing_input.weight_kg && (
                <li>Weight: {orderItem.sizing_input.weight_kg} kg</li>
              )}
              {orderItem.sizing_input.fit_preference && (
                <li>Fit: {orderItem.sizing_input.fit_preference}</li>
              )}
            </ul>
          )}
        </div>

        <div>
          <p className="text-sm text-gray-600">Recommendation</p>
          <ul className="text-sm">
            <li>Size: {rec.primary_size}</li>
            <li>Confidence: {rec.confidence_score}%</li>
            <li>Risk: {rec.risk_level}</li>
          </ul>
        </div>
      </div>

      {rec.rationale && (
        <div className="mt-4 p-2 bg-gray-50 rounded">
          <p className="text-xs">{rec.rationale}</p>
        </div>
      )}
    </div>
  );
}
```

**Files to create:**
- `src/components/admin/OrderSizingReview.tsx` (80 lines)

**Files to modify:**
- `src/app/admin/orders/[id]/page.tsx` (add OrderSizingReview component)

---

### Deliverables
- [x] Database schema for player measurements
- [x] API endpoints for saving/retrieving measurements
- [x] Sizing calculator integration in product pages
- [x] Sizing confirmation step in checkout
- [x] Sizing data stored with order items
- [x] Admin view of sizing rationale
- [x] Size chart display component

### Success Criteria
- ✅ Users can use sizing calculator on product pages
- ✅ Measurements are saved to database
- ✅ Checkout shows sizing recommendations
- ✅ Order items include sizing data
- ✅ Admin can see why sizes were chosen
- ✅ Reduces return rate by 30%+

---

## TASK 3: EMAIL NOTIFICATION SYSTEM
**Priority:** P0 - CRITICAL
**Effort:** 40 hours
**Dependencies:** None
**Owner:** Backend Engineer

### Current State Analysis
✅ **What exists:**
- Supabase auth (magic links work)
- User preferences in profiles table

❌ **What's missing:**
- Email service integration
- Email templates
- Notification triggers
- Background queue

### Implementation Plan

#### Step 3.1: Email Service Setup (4 hours)

**Choose: Resend** ($20/month for 3,000 emails)

```bash
npm install resend
```

**Create:** `src/lib/email/client.ts`

```typescript
import { Resend } from 'resend';

export const resendClient = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  from = 'Deserve Athletics <noreply@deserveathletics.com>'
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}) {
  try {
    const { data, error } = await resendClient.emails.send({
      from,
      to,
      subject,
      html
    });

    if (error) {
      console.error('Email send failed:', error);
      return { success: false, error };
    }

    console.log('Email sent:', data);
    return { success: true, data };
  } catch (err) {
    console.error('Email exception:', err);
    return { success: false, error: err };
  }
}
```

**Environment variables:**
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

#### Step 3.2: Email Templates (10 hours)

**Create:** `src/lib/email/templates/`

8 email templates needed:

1. **Team Invitation** (`teamInvitation.tsx`)
2. **Payment Confirmation** (`paymentConfirmation.tsx`)
3. **Design Approved** (`designApproved.tsx`)
4. **Design Needs Changes** (`designNeedsChanges.tsx`)
5. **Order Status Update** (`orderStatusUpdate.tsx`)
6. **Payment Failed** (`paymentFailed.tsx`)
7. **Player Added to Roster** (`playerAdded.tsx`)
8. **Admin Alert** (`adminAlert.tsx`)

**Example:** `src/lib/email/templates/teamInvitation.tsx`

```typescript
export function teamInvitationEmail({
  teamName,
  inviterName,
  inviteToken
}: {
  teamName: string;
  inviterName: string;
  inviteToken: string;
}) {
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; }
          .button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
          }
          .footer { color: #666; font-size: 12px; padding: 20px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Deserve Athletics</h1>
          </div>
          <div class="content">
            <h2>You've been invited to join ${teamName}!</h2>
            <p>${inviterName} has invited you to join their team on Deserve Athletics.</p>
            <p>Click the button below to accept the invitation and join the team:</p>
            <a href="${acceptUrl}" class="button">Accept Invitation</a>
            <p><small>Or copy this link: ${acceptUrl}</small></p>
          </div>
          <div class="footer">
            <p>© 2025 Deserve Athletics. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
```

**Files to create (8 templates):**
- `src/lib/email/templates/teamInvitation.tsx`
- `src/lib/email/templates/paymentConfirmation.tsx`
- `src/lib/email/templates/designApproved.tsx`
- `src/lib/email/templates/designNeedsChanges.tsx`
- `src/lib/email/templates/orderStatusUpdate.tsx`
- `src/lib/email/templates/paymentFailed.tsx`
- `src/lib/email/templates/playerAdded.tsx`
- `src/lib/email/templates/adminAlert.tsx`

---

#### Step 3.3: Notification Triggers (16 hours)

Add email sending to 8 key endpoints:

**1. Team Invitation** - `src/app/api/teams/[id]/invite/route.ts`

```typescript
import { sendEmail } from '@/lib/email/client';
import { teamInvitationEmail } from '@/lib/email/templates/teamInvitation';

export async function POST(request: NextRequest) {
  // ... create invite logic ...

  // ADD: Send email
  await sendEmail({
    to: email,
    subject: `You've been invited to join ${team.name}`,
    html: teamInvitationEmail({
      teamName: team.name,
      inviterName: user.full_name || user.email,
      inviteToken: invite.token
    })
  });

  return NextResponse.json({ success: true, data: invite });
}
```

**2. Payment Confirmation** - `src/app/api/webhooks/mercadopago/route.ts`

```typescript
import { sendEmail } from '@/lib/email/client';
import { paymentConfirmationEmail } from '@/lib/email/templates/paymentConfirmation';

// After payment approved
if (payment.status === 'approved') {
  const { data: user } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', contribution.user_id)
    .single();

  await sendEmail({
    to: user.email,
    subject: 'Payment Confirmed - Deserve Athletics',
    html: paymentConfirmationEmail({
      userName: user.full_name,
      amount: contribution.amount_clp,
      orderNumber: order.id.slice(-8)
    })
  });
}
```

**3-8. Similar integration for remaining triggers**

**Files to modify:**
- `src/app/api/teams/[id]/invite/route.ts` (+15 lines)
- `src/app/api/webhooks/mercadopago/route.ts` (+20 lines)
- `src/app/api/design-requests/[id]/status/route.ts` (+25 lines)
- `src/app/api/admin/orders/[id]/route.ts` (+20 lines)
- `src/app/api/roster/commit/route.ts` (+15 lines)
- Plus 3 more endpoints

---

#### Step 3.4: Background Queue (Optional but recommended) (10 hours)

**Install Bull + Redis:**
```bash
npm install bull
npm install -D @types/bull
```

**Create:** `src/lib/queue/emailQueue.ts`

```typescript
import Queue from 'bull';

const emailQueue = new Queue('email', process.env.REDIS_URL);

emailQueue.process(async (job) => {
  const { to, subject, html } = job.data;
  return await sendEmail({ to, subject, html });
});

export function queueEmail({ to, subject, html }: {
  to: string;
  subject: string;
  html: string;
}) {
  return emailQueue.add(
    { to, subject, html },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    }
  );
}
```

**Use in endpoints:**
```typescript
// Instead of:
await sendEmail({ to, subject, html });

// Use:
await queueEmail({ to, subject, html });
```

---

### Deliverables
- [x] Resend email service integration
- [x] 8 email templates (HTML)
- [x] Email triggers in 8 endpoints
- [x] Background queue for reliability
- [x] Email logging/monitoring
- [x] Retry logic for failed sends

### Success Criteria
- ✅ Team invitations send emails
- ✅ Payment confirmations sent automatically
- ✅ Design status updates emailed to team
- ✅ Order updates notify customers
- ✅ Failed emails retry 3 times
- ✅ Email delivery rate >98%

---

# PHASE 2: CUSTOMER EXPERIENCE (Week 3-4)
**Duration:** 90 hours
**Goal:** Improve post-purchase experience and enable repeat business

---

## TASK 4: ORDER TRACKING & PRODUCTION TIMELINE
**Priority:** P1 - HIGH
**Effort:** 30 hours
**Dependencies:** None
**Owner:** Full-Stack Engineer

### Current State Analysis
✅ **What exists:**
- OrderStatusTimeline component (8 hardcoded stages)
- `orders` table with `status` column (6 values)
- `current_stage` field exists

❌ **What's missing:**
- Order stage history table
- Status/stage mismatch (6 DB statuses vs 8 UI stages)
- No production queue for admin
- Estimated delivery dates not calculated
- No customer-facing tracking page

### Database Status vs UI Stage Mismatch
**Current DB statuses:** pending, paid, processing, shipped, delivered, cancelled
**Current UI stages:** Pending, Payment, Confirmed, Design, Production, Quality Check, Shipped, Delivered

**Problem:** `current_stage` field exists but is NEVER populated. No way to track production progress.

### Implementation Plan

#### Step 4.1: Database Schema for Order Tracking (3 hours)

```sql
-- File: supabase/migrations/20251024_order_tracking_system.sql

-- 1. Create order stage history table
CREATE TABLE order_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Stage tracking
  stage TEXT NOT NULL CHECK (stage IN (
    'pending',           -- Order created
    'payment_pending',   -- Awaiting payment
    'payment_confirmed', -- Fully paid
    'design_review',     -- Design needs approval
    'design_approved',   -- Design approved, ready for production
    'production_queue',  -- In production queue
    'in_production',     -- Currently being manufactured
    'quality_check',     -- QC in progress
    'shipped',           -- Shipped to customer
    'delivered',         -- Delivered
    'cancelled'          -- Cancelled
  )),

  previous_stage TEXT,

  -- Metadata
  notes TEXT,
  changed_by UUID REFERENCES profiles(id),
  automated BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes
CREATE INDEX idx_order_stage_history_order_id ON order_stage_history(order_id);
CREATE INDEX idx_order_stage_history_stage ON order_stage_history(stage);
CREATE INDEX idx_order_stage_history_created_at ON order_stage_history(created_at);

-- 3. Update orders table
ALTER TABLE orders ADD COLUMN current_stage TEXT CHECK (current_stage IN (
  'pending', 'payment_pending', 'payment_confirmed', 'design_review',
  'design_approved', 'production_queue', 'in_production',
  'quality_check', 'shipped', 'delivered', 'cancelled'
));

ALTER TABLE orders ADD COLUMN estimated_delivery_date DATE;
ALTER TABLE orders ADD COLUMN actual_delivery_date DATE;
ALTER TABLE orders ADD COLUMN production_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN shipped_at TIMESTAMPTZ;

-- 4. Backfill current_stage based on status
UPDATE orders
SET current_stage = CASE
  WHEN status = 'pending' THEN 'payment_pending'
  WHEN status = 'paid' THEN 'design_review'
  WHEN status = 'processing' THEN 'in_production'
  WHEN status = 'shipped' THEN 'shipped'
  WHEN status = 'delivered' THEN 'delivered'
  WHEN status = 'cancelled' THEN 'cancelled'
  ELSE 'pending'
END
WHERE current_stage IS NULL;

-- 5. Create trigger to log stage changes
CREATE OR REPLACE FUNCTION log_order_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.current_stage IS DISTINCT FROM NEW.current_stage) THEN
    INSERT INTO order_stage_history (
      order_id,
      stage,
      previous_stage,
      automated,
      notes
    ) VALUES (
      NEW.id,
      NEW.current_stage,
      OLD.current_stage,
      true,
      'Stage changed from ' || COALESCE(OLD.current_stage, 'null') || ' to ' || NEW.current_stage
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE TRIGGER order_stage_change_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_stage_change();

-- 6. RLS policies
ALTER TABLE order_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_stage_history_customer_read"
  ON order_stage_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_stage_history.order_id
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "order_stage_history_admin_all"
  ON order_stage_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

**Files to create:**
- `supabase/migrations/20251024_order_tracking_system.sql`

---

#### Step 4.2: Order Tracking API (4 hours)

**Create:** `src/app/api/orders/[id]/tracking/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();

  // Get order with full stage history
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      order_stage_history (
        stage,
        previous_stage,
        notes,
        created_at
      )
    `)
    .eq('id', params.id)
    .single();

  if (orderError) {
    return NextResponse.json({ success: false, error: orderError.message }, { status: 404 });
  }

  // Calculate timeline
  const timeline = buildTimeline(order);

  return NextResponse.json({
    success: true,
    data: {
      order_id: order.id,
      current_stage: order.current_stage,
      estimated_delivery: order.estimated_delivery_date,
      timeline,
      history: order.order_stage_history
    }
  });
}

function buildTimeline(order: any) {
  const stages = [
    { key: 'pending', label: 'Order Placed', icon: 'check' },
    { key: 'payment_confirmed', label: 'Payment Confirmed', icon: 'credit-card' },
    { key: 'design_approved', label: 'Design Approved', icon: 'palette' },
    { key: 'in_production', label: 'In Production', icon: 'hammer' },
    { key: 'quality_check', label: 'Quality Check', icon: 'shield-check' },
    { key: 'shipped', label: 'Shipped', icon: 'truck' },
    { key: 'delivered', label: 'Delivered', icon: 'package' }
  ];

  const history = order.order_stage_history || [];
  const currentStageIndex = stages.findIndex(s => s.key === order.current_stage);

  return stages.map((stage, idx) => {
    const historyEntry = history.find((h: any) => h.stage === stage.key);

    return {
      ...stage,
      status: idx < currentStageIndex ? 'completed'
              : idx === currentStageIndex ? 'current'
              : 'pending',
      completed_at: historyEntry?.created_at || null,
      notes: historyEntry?.notes || null
    };
  });
}
```

**Create:** `src/app/api/admin/orders/[id]/advance-stage/route.ts`

```typescript
// Admin endpoint to manually advance order stage
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();
  const user = await requireAuth(supabase);
  const { stage, notes } = await request.json();

  // Verify admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  // Update order stage
  const { error } = await supabase
    .from('orders')
    .update({
      current_stage: stage,
      ...(stage === 'in_production' && { production_started_at: new Date().toISOString() }),
      ...(stage === 'shipped' && { shipped_at: new Date().toISOString() })
    })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  // Manually log if needed (trigger will also log)
  if (notes) {
    await supabase
      .from('order_stage_history')
      .insert({
        order_id: params.id,
        stage,
        notes,
        changed_by: user.id,
        automated: false
      });
  }

  // TODO: Send email notification to customer

  return NextResponse.json({ success: true });
}
```

**Files to create:**
- `src/app/api/orders/[id]/tracking/route.ts` (100 lines)
- `src/app/api/admin/orders/[id]/advance-stage/route.ts` (80 lines)

---

#### Step 4.3: Customer Tracking Page (8 hours)

**Create:** `src/app/orders/[id]/tracking/page.tsx`

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import OrderTrackingClient from './OrderTrackingClient';

export default async function OrderTrackingPage({
  params
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_stage_history (*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !order) {
    return notFound();
  }

  return <OrderTrackingClient order={order} />;
}
```

**Create:** `src/app/orders/[id]/tracking/OrderTrackingClient.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function OrderTrackingClient({ order: initialOrder }: Props) {
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    async function fetchTracking() {
      const res = await fetch(`/api/orders/${initialOrder.id}/tracking`);
      const json = await res.json();
      if (json.success) {
        setTimeline(json.data.timeline);
      }
    }
    fetchTracking();
  }, [initialOrder.id]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-2">Order Tracking</h1>
      <p className="text-gray-600 mb-8">Order #{initialOrder.id.slice(-8)}</p>

      {/* Visual Timeline */}
      <div className="relative">
        {timeline.map((stage, idx) => (
          <div key={stage.key} className="flex items-start mb-8">
            {/* Timeline line */}
            {idx < timeline.length - 1 && (
              <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-300" />
            )}

            {/* Icon */}
            <div className={`
              flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center z-10
              ${stage.status === 'completed' ? 'bg-green-600 text-white'
                : stage.status === 'current' ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-400'}
            `}>
              {stage.status === 'completed' ? '✓' : idx + 1}
            </div>

            {/* Content */}
            <div className="ml-6 flex-1">
              <h3 className={`text-lg font-semibold ${
                stage.status === 'current' ? 'text-blue-600' : ''
              }`}>
                {stage.label}
              </h3>

              {stage.completed_at && (
                <p className="text-sm text-gray-500">
                  {new Date(stage.completed_at).toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              )}

              {stage.notes && (
                <p className="text-sm text-gray-600 mt-1">{stage.notes}</p>
              )}

              {stage.status === 'current' && (
                <p className="text-sm text-blue-600 mt-2">
                  Currently at this stage
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Estimated Delivery */}
      {initialOrder.estimated_delivery_date && (
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">Estimated Delivery</h3>
          <p className="text-lg">
            {new Date(initialOrder.estimated_delivery_date).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Files to create:**
- `src/app/orders/[id]/tracking/page.tsx` (40 lines)
- `src/app/orders/[id]/tracking/OrderTrackingClient.tsx` (120 lines)

---

#### Step 4.4: Admin Production Queue Dashboard (10 hours)

**Create:** `src/app/admin/production-queue/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function ProductionQueuePage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState<'all' | 'design' | 'production' | 'qa'>('all');

  useEffect(() => {
    loadOrders();
  }, [filter]);

  async function loadOrders() {
    const supabase = createBrowserClient();

    let query = supabase
      .from('orders')
      .select(`
        *,
        team:teams(name),
        order_items(count)
      `)
      .order('created_at', { ascending: false });

    if (filter === 'design') {
      query = query.in('current_stage', ['design_review', 'design_approved']);
    } else if (filter === 'production') {
      query = query.in('current_stage', ['production_queue', 'in_production']);
    } else if (filter === 'qa') {
      query = query.eq('current_stage', 'quality_check');
    }

    const { data } = await query;
    setOrders(data || []);
  }

  async function advanceStage(orderId: string, newStage: string) {
    const supabase = createBrowserClient();

    const notes = prompt('Add notes (optional):');

    await fetch(`/api/admin/orders/${orderId}/advance-stage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage, notes })
    });

    loadOrders();
  }

  const stageTransitions = {
    'design_review': { next: 'design_approved', label: 'Approve Design' },
    'design_approved': { next: 'production_queue', label: 'Add to Queue' },
    'production_queue': { next: 'in_production', label: 'Start Production' },
    'in_production': { next: 'quality_check', label: 'Move to QC' },
    'quality_check': { next: 'shipped', label: 'Ship Order' }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Production Queue</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All Orders
        </button>
        <button
          onClick={() => setFilter('design')}
          className={`px-4 py-2 rounded ${filter === 'design' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Design Review
        </button>
        <button
          onClick={() => setFilter('production')}
          className={`px-4 py-2 rounded ${filter === 'production' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Production
        </button>
        <button
          onClick={() => setFilter('qa')}
          className={`px-4 py-2 rounded ${filter === 'qa' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Quality Check
        </button>
      </div>

      {/* Orders Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">Order ID</th>
            <th className="text-left p-3">Team</th>
            <th className="text-left p-3">Items</th>
            <th className="text-left p-3">Current Stage</th>
            <th className="text-left p-3">Created</th>
            <th className="text-left p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => {
            const transition = stageTransitions[order.current_stage];

            return (
              <tr key={order.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-mono text-sm">
                  {order.id.slice(-8)}
                </td>
                <td className="p-3">{order.team?.name || 'N/A'}</td>
                <td className="p-3">{order.order_items?.[0]?.count || 0}</td>
                <td className="p-3">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {order.current_stage}
                  </span>
                </td>
                <td className="p-3 text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  {transition && (
                    <button
                      onClick={() => advanceStage(order.id, transition.next)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      {transition.label}
                    </button>
                  )}
                  <button
                    onClick={() => window.location.href = `/admin/orders/${order.id}`}
                    className="ml-2 text-blue-600 hover:underline text-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {orders.length === 0 && (
        <p className="text-center text-gray-500 py-8">No orders in this stage</p>
      )}
    </div>
  );
}
```

**Files to create:**
- `src/app/admin/production-queue/page.tsx` (180 lines)

---

#### Step 4.5: Delivery Date Calculation (5 hours)

**Create:** `src/lib/orders/deliveryEstimate.ts`

```typescript
export function calculateEstimatedDelivery(order: any): Date {
  const now = new Date();

  // Base production time: 3 weeks
  const productionDays = 21;

  // Shipping time: 1 week (Chile domestic)
  const shippingDays = 7;

  // Add buffer for design approval (if not yet approved)
  let designDays = 0;
  if (['design_review', 'pending', 'payment_pending', 'payment_confirmed'].includes(order.current_stage)) {
    designDays = 7; // 1 week for design approval
  }

  const totalDays = designDays + productionDays + shippingDays;

  // Calculate business days (skip weekends)
  let deliveryDate = new Date(now);
  let addedDays = 0;

  while (addedDays < totalDays) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);

    // Skip weekends
    if (deliveryDate.getDay() !== 0 && deliveryDate.getDay() !== 6) {
      addedDays++;
    }
  }

  return deliveryDate;
}

// Auto-calculate on order creation
export async function updateOrderDeliveryEstimate(orderId: string) {
  const supabase = createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order) return;

  const estimatedDelivery = calculateEstimatedDelivery(order);

  await supabase
    .from('orders')
    .update({ estimated_delivery_date: estimatedDelivery.toISOString().split('T')[0] })
    .eq('id', orderId);
}
```

**Files to create:**
- `src/lib/orders/deliveryEstimate.ts` (60 lines)

**Integrate into order creation:** `src/app/api/orders/route.ts`
```typescript
import { updateOrderDeliveryEstimate } from '@/lib/orders/deliveryEstimate';

// After order created
await updateOrderDeliveryEstimate(newOrder.id);
```

---

### Deliverables
- [x] Database schema for order stage tracking
- [x] Order tracking API endpoints
- [x] Customer-facing tracking page
- [x] Admin production queue dashboard
- [x] Delivery date calculation
- [x] Email notifications on stage changes
- [x] Stage history audit trail

### Success Criteria
- ✅ Customers can track orders in real-time
- ✅ Admin can advance orders through production stages
- ✅ Estimated delivery dates calculated automatically
- ✅ Order history maintained for audit
- ✅ Email sent on each stage change
- ✅ Production queue dashboard functional

---

## TASK 5: TEAM REORDER FLOW
**Priority:** P1 - HIGH
**Effort:** 25 hours
**Dependencies:** None
**Owner:** Full-Stack Engineer

### Current State Analysis
✅ **What exists:**
- Order history visible in team dashboard
- Cart system functional
- Product catalog complete

❌ **What's missing:**
- Reorder button on completed orders
- Duplicate order functionality
- Roster update during reorder
- Seasonal template system

### Implementation Plan

#### Step 5.1: Database Schema for Order Templates (2 hours)

```sql
-- File: supabase/migrations/20251024_reorder_system.sql

-- 1. Add template flag to orders
ALTER TABLE orders ADD COLUMN is_template BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN template_name TEXT;

COMMENT ON COLUMN orders.is_template IS 'True if this order should be saved as a reusable template';
COMMENT ON COLUMN orders.template_name IS 'Display name for template (e.g., "2024 Fall Season")';

-- 2. Create index for templates
CREATE INDEX idx_orders_is_template ON orders(team_id, is_template) WHERE is_template = true;
```

**Files to create:**
- `supabase/migrations/20251024_reorder_system.sql`

---

#### Step 5.2: Reorder API (5 hours)

**Create:** `src/app/api/orders/[id]/reorder/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';
import { requireAuth } from '@/lib/auth/requireUser';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteClient();
  const user = await requireAuth(supabase);

  const body = await request.json();
  const { update_roster, new_sizes } = body;

  // 1. Get original order
  const { data: originalOrder, error: orderError } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .eq('id', params.id)
    .single();

  if (orderError || !originalOrder) {
    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  }

  // 2. Verify user is team member
  const { data: membership } = await supabase
    .from('team_memberships')
    .select('role')
    .eq('team_id', originalOrder.team_id)
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ success: false, error: 'Not a team member' }, { status: 403 });
  }

  // 3. Duplicate order
  const { data: newOrder, error: createError } = await supabase
    .from('orders')
    .insert({
      team_id: originalOrder.team_id,
      user_id: user.id,
      status: 'pending',
      current_stage: 'pending',
      shipping_address: originalOrder.shipping_address,
      notes: `Reorder from #${originalOrder.id.slice(-8)}`,
      total_amount_clp: 0 // Will be recalculated
    })
    .select()
    .single();

  if (createError) {
    return NextResponse.json({ success: false, error: createError.message }, { status: 500 });
  }

  // 4. Duplicate order items
  const newItems = originalOrder.order_items.map((item: any) => ({
    order_id: newOrder.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    size: new_sizes?.[item.product_id] || item.size, // Allow size updates
    unit_price_clp: item.unit_price_clp,
    line_total_clp: item.line_total_clp,
    customization: item.customization
  }));

  await supabase.from('order_items').insert(newItems);

  // 5. Recalculate total
  const total = newItems.reduce((sum, item) => sum + item.line_total_clp, 0);
  await supabase
    .from('orders')
    .update({ total_amount_clp: total })
    .eq('id', newOrder.id);

  // 6. If update_roster, sync with current roster
  if (update_roster) {
    // TODO: Implement roster sync
    // - Get current team roster
    // - Match players to original order items
    // - Update sizes if changed
  }

  return NextResponse.json({
    success: true,
    data: {
      order_id: newOrder.id,
      message: 'Order duplicated successfully'
    }
  });
}
```

**Files to create:**
- `src/app/api/orders/[id]/reorder/route.ts` (120 lines)

---

#### Step 5.3: Reorder UI Components (8 hours)

**Modify:** `src/app/mi-equipo/[slug]/orders/OrderHistoryClient.tsx`

Add reorder button to completed orders:

```typescript
'use client';

export default function OrderHistoryClient({ orders }: Props) {
  async function handleReorder(orderId: string) {
    const confirmReorder = confirm(
      'Create a new order with the same items? You can update sizes before checkout.'
    );

    if (!confirmReorder) return;

    const res = await fetch(`/api/orders/${orderId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ update_roster: true })
    });

    const json = await res.json();

    if (json.success) {
      window.location.href = `/checkout?order_id=${json.data.order_id}`;
    } else {
      alert('Failed to create reorder: ' + json.error);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Order History</h2>

      {orders.map(order => (
        <div key={order.id} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">Order #{order.id.slice(-8)}</h3>
              <p className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleDateString()}
              </p>
              <p className="text-sm">
                Status: <span className="font-medium">{order.status}</span>
              </p>
              <p className="text-lg font-bold mt-2">
                ${order.total_amount_clp.toLocaleString()} CLP
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => window.location.href = `/orders/${order.id}/tracking`}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Track Order
              </button>

              {['delivered', 'cancelled'].includes(order.status) && (
                <button
                  onClick={() => handleReorder(order.id)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Reorder
                </button>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold mb-2">Items:</h4>
            {order.order_items?.map(item => (
              <div key={item.id} className="text-sm text-gray-700">
                {item.product_name} - Size {item.size} - Qty: {item.quantity}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Files to modify:**
- `src/app/mi-equipo/[slug]/orders/OrderHistoryClient.tsx` (+60 lines)

---

#### Step 5.4: Roster Update During Reorder (6 hours)

**Create:** `src/components/orders/ReorderRosterSync.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';

interface Player {
  id: string;
  full_name: string;
  current_size?: string;
  original_size: string;
}

export default function ReorderRosterSync({
  originalOrderId,
  teamId,
  onConfirm
}: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRosterComparison();
  }, []);

  async function loadRosterComparison() {
    // 1. Get original order items
    const orderRes = await fetch(`/api/orders/${originalOrderId}`);
    const orderData = await orderRes.json();

    // 2. Get current roster
    const rosterRes = await fetch(`/api/teams/${teamId}/roster`);
    const rosterData = await rosterRes.json();

    // 3. Match players
    const matched = matchPlayersToItems(
      orderData.data.order_items,
      rosterData.data
    );

    setPlayers(matched);
    setLoading(false);
  }

  function updatePlayerSize(playerId: string, newSize: string) {
    setPlayers(prev => prev.map(p =>
      p.id === playerId ? { ...p, current_size: newSize } : p
    ));
  }

  function handleConfirm() {
    const sizeUpdates = players.reduce((acc, p) => {
      acc[p.id] = p.current_size || p.original_size;
      return acc;
    }, {} as Record<string, string>);

    onConfirm(sizeUpdates);
  }

  if (loading) return <div>Loading roster...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Update Roster Sizes</h3>
      <p className="text-gray-600 mb-6">
        Review and update player sizes before reordering
      </p>

      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">Player</th>
            <th className="text-left p-2">Original Size</th>
            <th className="text-left p-2">New Size</th>
          </tr>
        </thead>
        <tbody>
          {players.map(player => (
            <tr key={player.id} className="border-b">
              <td className="p-2">{player.full_name}</td>
              <td className="p-2">{player.original_size}</td>
              <td className="p-2">
                <select
                  value={player.current_size || player.original_size}
                  onChange={(e) => updatePlayerSize(player.id, e.target.value)}
                  className="border rounded p-1"
                >
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                  <option>2XL</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end gap-4">
        <button
          onClick={handleConfirm}
          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Confirm & Reorder
        </button>
      </div>
    </div>
  );
}

function matchPlayersToItems(orderItems: any[], rosterPlayers: any[]) {
  // Match by name or other logic
  return rosterPlayers.map(player => ({
    id: player.id,
    full_name: player.full_name,
    original_size: 'M', // TODO: Get from order item matching
    current_size: undefined
  }));
}
```

**Files to create:**
- `src/components/orders/ReorderRosterSync.tsx` (140 lines)

---

#### Step 5.5: Seasonal Templates (4 hours)

**Create:** `src/app/api/teams/[id]/order-templates/route.ts`

```typescript
// Save completed order as template
export async function POST(request: NextRequest) {
  const { order_id, template_name } = await request.json();

  await supabase
    .from('orders')
    .update({
      is_template: true,
      template_name
    })
    .eq('id', order_id);

  return NextResponse.json({ success: true });
}

// Get team templates
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { data: templates } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .eq('team_id', params.id)
    .eq('is_template', true)
    .order('created_at', { ascending: false });

  return NextResponse.json({ success: true, data: templates });
}
```

**Files to create:**
- `src/app/api/teams/[id]/order-templates/route.ts` (60 lines)

---

### Deliverables
- [x] Database schema for order templates
- [x] Reorder API endpoint
- [x] Reorder button in order history
- [x] Roster size update UI
- [x] Seasonal template system
- [x] Size recalculation during reorder

### Success Criteria
- ✅ Teams can reorder with one click
- ✅ Roster sizes updated before reorder
- ✅ Templates save successful orders
- ✅ Reorder flow takes <3 minutes
- ✅ Increases repeat order rate by 40%

---

## TASK 6: INSTITUTION DASHBOARD ENHANCEMENTS
**Priority:** P2 - MEDIUM
**Effort:** 35 hours
**Dependencies:** Task 4 (Order Tracking)
**Owner:** Full-Stack Engineer

### Current State Analysis
✅ **What exists:**
- Institution sub-teams listing
- Basic sub-team creation
- Institution roles (athletic_director)

❌ **What's missing:**
- Consolidated payment view across all teams
- Bulk operations (approve designs, export orders)
- Production timeline for all teams
- Financial reporting/exports
- Bulk roster management

### Implementation Plan

#### Step 6.1: Consolidated Dashboard Data API (8 hours)

**Create:** `src/app/api/institutions/[slug]/dashboard/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '@/lib/supabase/route';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createRouteClient();

  // 1. Get institution
  const { data: institution } = await supabase
    .from('teams')
    .select('id, name')
    .eq('slug', params.slug)
    .eq('team_type', 'institution')
    .single();

  if (!institution) {
    return NextResponse.json({ success: false, error: 'Institution not found' }, { status: 404 });
  }

  // 2. Get all sub-teams
  const { data: subTeams } = await supabase
    .from('teams')
    .select('id, name, slug, sport_id')
    .eq('institution_id', institution.id);

  const subTeamIds = subTeams.map(t => t.id);

  // 3. Get orders for all sub-teams
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,
      team_id,
      status,
      current_stage,
      total_amount_clp,
      created_at,
      estimated_delivery_date
    `)
    .in('team_id', subTeamIds)
    .order('created_at', { ascending: false });

  // 4. Get payment contributions
  const orderIds = orders.map(o => o.id);
  const { data: contributions } = await supabase
    .from('payment_contributions')
    .select('order_id, amount_clp, payment_status')
    .in('order_id', orderIds);

  // 5. Calculate aggregates
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total_amount_clp, 0);
  const totalPaid = contributions
    .filter(c => c.payment_status === 'approved')
    .reduce((sum, c) => sum + c.amount_clp, 0);
  const totalPending = totalRevenue - totalPaid;

  const ordersByStage = orders.reduce((acc, o) => {
    acc[o.current_stage] = (acc[o.current_stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const ordersByTeam = subTeams.map(team => ({
    team_id: team.id,
    team_name: team.name,
    team_slug: team.slug,
    orders: orders.filter(o => o.team_id === team.id).length,
    revenue: orders
      .filter(o => o.team_id === team.id)
      .reduce((sum, o) => sum + o.total_amount_clp, 0)
  }));

  return NextResponse.json({
    success: true,
    data: {
      institution,
      sub_teams: subTeams.length,
      summary: {
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        total_paid: totalPaid,
        total_pending: totalPending,
        payment_completion_pct: totalRevenue > 0 ? (totalPaid / totalRevenue * 100).toFixed(1) : 0
      },
      orders_by_stage: ordersByStage,
      orders_by_team: ordersByTeam,
      recent_orders: orders.slice(0, 10)
    }
  });
}
```

**Files to create:**
- `src/app/api/institutions/[slug]/dashboard/route.ts` (140 lines)

---

#### Step 6.2: Institution Dashboard UI (12 hours)

**Create:** `src/app/institutions/[slug]/dashboard/page.tsx`

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import InstitutionDashboardClient from './InstitutionDashboardClient';

export default async function InstitutionDashboardPage({
  params
}: {
  params: { slug: string };
}) {
  const supabase = createServerClient();

  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/institutions/${params.slug}/dashboard`);
  const data = await res.json();

  if (!data.success) {
    return notFound();
  }

  return <InstitutionDashboardClient data={data.data} />;
}
```

**Create:** `src/app/institutions/[slug]/dashboard/InstitutionDashboardClient.tsx`

```typescript
'use client';

export default function InstitutionDashboardClient({ data }: Props) {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-8">{data.institution.name} Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <SummaryCard
          title="Total Orders"
          value={data.summary.total_orders}
          icon="📦"
        />
        <SummaryCard
          title="Total Revenue"
          value={`$${data.summary.total_revenue.toLocaleString()} CLP`}
          icon="💰"
        />
        <SummaryCard
          title="Amount Paid"
          value={`$${data.summary.total_paid.toLocaleString()} CLP`}
          subtitle={`${data.summary.payment_completion_pct}% complete`}
          icon="✅"
        />
        <SummaryCard
          title="Pending Payment"
          value={`$${data.summary.total_pending.toLocaleString()} CLP`}
          icon="⏳"
        />
      </div>

      {/* Orders by Stage */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Orders by Production Stage</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(data.orders_by_stage).map(([stage, count]) => (
            <div key={stage} className="text-center p-4 bg-gray-50 rounded">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-gray-600">{stage.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Orders by Team */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Orders by Team</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Orders</th>
              <th className="text-left p-3">Revenue</th>
              <th className="text-left p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.orders_by_team.map(team => (
              <tr key={team.team_id} className="border-b hover:bg-gray-50">
                <td className="p-3">{team.team_name}</td>
                <td className="p-3">{team.orders}</td>
                <td className="p-3">${team.revenue.toLocaleString()} CLP</td>
                <td className="p-3">
                  <a
                    href={`/mi-equipo/${team.team_slug}`}
                    className="text-blue-600 hover:underline"
                  >
                    View Team
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Orders */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3">Order ID</th>
              <th className="text-left p-3">Team</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Amount</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.map(order => {
              const team = data.orders_by_team.find(t => t.team_id === order.team_id);
              return (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-sm">{order.id.slice(-8)}</td>
                  <td className="p-3">{team?.team_name || 'Unknown'}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {order.current_stage}
                    </span>
                  </td>
                  <td className="p-3">${order.total_amount_clp.toLocaleString()} CLP</td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, subtitle, icon }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
```

**Files to create:**
- `src/app/institutions/[slug]/dashboard/page.tsx` (30 lines)
- `src/app/institutions/[slug]/dashboard/InstitutionDashboardClient.tsx` (180 lines)

---

#### Step 6.3: Bulk Operations API (8 hours)

**Create:** `src/app/api/institutions/[slug]/bulk-operations/route.ts`

```typescript
// Bulk approve designs for institution
export async function POST(request: NextRequest) {
  const { operation, team_ids, design_request_ids } = await request.json();

  const supabase = createRouteClient();
  const user = await requireAuth(supabase);

  // Verify athletic director role
  const hasRole = await verifyInstitutionRole(supabase, user.id, params.slug, 'athletic_director');
  if (!hasRole) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  switch (operation) {
    case 'approve_designs':
      // Bulk approve multiple design requests
      await supabase
        .from('design_requests')
        .update({ status: 'approved' })
        .in('id', design_request_ids);

      return NextResponse.json({ success: true, message: `${design_request_ids.length} designs approved` });

    case 'export_orders':
      // Export all orders for selected teams
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          *,
          team:teams(name),
          order_items(*)
        `)
        .in('team_id', team_ids);

      // Generate CSV
      const csv = generateOrdersCSV(orders);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="orders-export.csv"'
        }
      });

    case 'send_payment_reminders':
      // Send reminders to all users with pending payments
      const { data: pendingContributions } = await supabase
        .from('payment_contributions')
        .select('user_id, order_id, amount_clp')
        .in('order_id', /* order IDs from teams */)
        .eq('payment_status', 'pending');

      for (const contrib of pendingContributions) {
        // Send email reminder
        await queueEmail({
          to: contrib.user_email,
          subject: 'Payment Reminder - Deserve Athletics',
          html: paymentReminderEmail(contrib)
        });
      }

      return NextResponse.json({ success: true, message: `Reminders sent to ${pendingContributions.length} users` });

    default:
      return NextResponse.json({ success: false, error: 'Invalid operation' }, { status: 400 });
  }
}

function generateOrdersCSV(orders: any[]): string {
  const headers = 'Order ID,Team,Date,Status,Total (CLP),Items\n';
  const rows = orders.map(order => {
    const items = order.order_items.map(i => `${i.product_name} (${i.size})`).join('; ');
    return `${order.id},${order.team.name},${order.created_at},${order.status},${order.total_amount_clp},"${items}"`;
  }).join('\n');

  return headers + rows;
}
```

**Files to create:**
- `src/app/api/institutions/[slug]/bulk-operations/route.ts` (120 lines)

---

#### Step 6.4: Financial Reporting (7 hours)

**Create:** `src/components/institutions/FinancialReport.tsx`

```typescript
'use client';

import { useState } from 'react';

export default function FinancialReport({ institutionSlug }: Props) {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [reportData, setReportData] = useState(null);

  async function generateReport() {
    const res = await fetch(`/api/institutions/${institutionSlug}/financial-report?range=${dateRange}`);
    const json = await res.json();
    setReportData(json.data);
  }

  async function exportPDF() {
    // Generate PDF report
    const res = await fetch(`/api/institutions/${institutionSlug}/financial-report/pdf?range=${dateRange}`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${dateRange}.pdf`;
    a.click();
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Financial Report</h2>

      <div className="flex gap-4 mb-6">
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="border rounded p-2"
        >
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
          <option value="quarter">Last Quarter</option>
          <option value="year">Last Year</option>
        </select>

        <button
          onClick={generateReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Report
        </button>

        {reportData && (
          <button
            onClick={exportPDF}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Export PDF
          </button>
        )}
      </div>

      {reportData && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{reportData.total_orders}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold">${reportData.total_revenue.toLocaleString()} CLP</p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold">${reportData.avg_order_value.toLocaleString()} CLP</p>
            </div>
          </div>

          {/* Detailed breakdown table */}
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Team</th>
                <th className="text-left p-3">Orders</th>
                <th className="text-left p-3">Revenue</th>
                <th className="text-left p-3">Avg Order</th>
              </tr>
            </thead>
            <tbody>
              {reportData.by_team.map(team => (
                <tr key={team.team_id} className="border-b">
                  <td className="p-3">{team.team_name}</td>
                  <td className="p-3">{team.orders}</td>
                  <td className="p-3">${team.revenue.toLocaleString()} CLP</td>
                  <td className="p-3">${team.avg_order.toLocaleString()} CLP</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Files to create:**
- `src/components/institutions/FinancialReport.tsx` (120 lines)
- `src/app/api/institutions/[slug]/financial-report/route.ts` (80 lines)
- `src/app/api/institutions/[slug]/financial-report/pdf/route.ts` (60 lines, using PDFKit or similar)

---

### Deliverables
- [x] Consolidated dashboard API
- [x] Institution dashboard UI
- [x] Bulk operations API (approve, export, reminders)
- [x] Financial reporting with PDF export
- [x] Payment summary across all teams
- [x] Production timeline view

### Success Criteria
- ✅ Athletic directors see all sub-teams at once
- ✅ Bulk approve designs with one click
- ✅ Export orders to CSV
- ✅ Financial reports generated automatically
- ✅ Payment reminders sent in bulk
- ✅ Reduces admin time by 60%

---

# PHASE 3: SCALE READINESS (Week 5-6)
**Duration:** 105 hours
**Goal:** Prepare application for 500+ teams, 5,000+ users

---

## TASK 7: ADMIN WORKFLOW AUTOMATION
**Priority:** P2 - MEDIUM
**Effort:** 50 hours
**Dependencies:** Task 3 (Email System), Task 4 (Order Tracking)
**Owner:** Full-Stack Engineer

### Current State Analysis
✅ **What exists:**
- Admin panel with manual operations
- Design approval workflow
- Order management
- Payment tracking

❌ **What's missing:**
- Automated design revision requests
- Automated order status updates
- Admin notification system
- Bulk payment collection
- Automated production scheduling

### Implementation Plan

#### Step 7.1: Automated Design Revision System (12 hours)

**Create:** `src/app/api/admin/design-requests/[id]/request-revision/route.ts`

```typescript
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { revision_notes, auto_notify } = await request.json();

  const supabase = createRouteClient();
  const admin = await requireAuth(supabase);

  // Update design request status
  await supabase
    .from('design_requests')
    .update({
      status: 'revision_needed',
      admin_notes: revision_notes
    })
    .eq('id', params.id);

  if (auto_notify) {
    // Get team owner
    const { data: designRequest } = await supabase
      .from('design_requests')
      .select('team:teams(owner_id, name)')
      .eq('id', params.id)
      .single();

    // Send email to team owner
    await queueEmail({
      to: designRequest.team.owner_email,
      subject: `Design Revision Needed - ${designRequest.team.name}`,
      html: designRevisionEmail({
        teamName: designRequest.team.name,
        revisionNotes: revision_notes,
        designRequestId: params.id
      })
    });
  }

  return NextResponse.json({ success: true });
}
```

**Create:** `src/components/admin/QuickRevisionModal.tsx`

Pre-defined revision templates for common issues:
- Colors not matching specs
- Logo placement incorrect
- Size/proportion issues
- Missing team information

**Files to create:**
- `src/app/api/admin/design-requests/[id]/request-revision/route.ts` (80 lines)
- `src/components/admin/QuickRevisionModal.tsx` (120 lines)

---

#### Step 7.2: Automated Order Status Updates (10 hours)

**Create:** `src/lib/automation/orderStatusAutomation.ts`

```typescript
// Automatically advance orders based on external triggers

export async function autoAdvanceOrdersInProduction() {
  const supabase = createServiceClient();

  // Find orders that have been "in_production" for 3 weeks
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('current_stage', 'in_production')
    .lt('production_started_at', threeWeeksAgo.toISOString());

  // Auto-advance to quality_check
  for (const order of orders) {
    await supabase
      .from('orders')
      .update({ current_stage: 'quality_check' })
      .eq('id', order.id);

    // Send notification
    await queueEmail({
      to: order.user_email,
      subject: 'Your Order is Ready for Quality Check',
      html: orderStatusUpdateEmail(order)
    });
  }

  return { advanced: orders.length };
}

// Run as cron job
export async function runOrderAutomation() {
  await autoAdvanceOrdersInProduction();
  await autoSendPaymentReminders();
  await autoExpireInvites();
}
```

**Set up Vercel Cron:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/order-automation",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Files to create:**
- `src/lib/automation/orderStatusAutomation.ts` (150 lines)
- `src/app/api/cron/order-automation/route.ts` (40 lines)
- `vercel.json` (update with cron config)

---

#### Step 7.3: Admin Notification Dashboard (8 hours)

**Create:** `src/app/admin/notifications/page.tsx`

Real-time admin notifications for:
- New orders placed
- Design requests submitted
- Payment failures
- Low inventory alerts
- Customer support inquiries

```typescript
'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/browser';

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();

    // Subscribe to real-time updates
    const supabase = createBrowserClient();
    const channel = supabase
      .channel('admin_notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_notifications'
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  async function loadNotifications() {
    const res = await fetch('/api/admin/notifications');
    const json = await res.json();
    setNotifications(json.data);
  }

  async function markAsRead(id: string) {
    await fetch(`/api/admin/notifications/${id}/read`, { method: 'POST' });
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Notifications</h1>

      <div className="space-y-4">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.read ? 'bg-white' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{notification.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-2">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>

              {!notification.read && (
                <button
                  onClick={() => markAsRead(notification.id)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Mark as read
                </button>
              )}
            </div>

            {notification.action_url && (
              <a
                href={notification.action_url}
                className="inline-block mt-3 text-sm text-blue-600 hover:underline"
              >
                View Details →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Files to create:**
- `src/app/admin/notifications/page.tsx` (120 lines)
- `src/app/api/admin/notifications/route.ts` (60 lines)

---

#### Step 7.4: Bulk Payment Collection (10 hours)

**Create:** `src/components/admin/BulkPaymentCollector.tsx`

```typescript
export default function BulkPaymentCollector({ orderId }: Props) {
  const [teamMembers, setTeamMembers] = useState([]);

  async function sendPaymentLinks() {
    const res = await fetch(`/api/admin/orders/${orderId}/send-payment-links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_per_player: calculatedAmount,
        custom_message: message
      })
    });

    if (res.ok) {
      alert('Payment links sent to all team members!');
    }
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h3 className="text-xl font-semibold mb-4">Collect Payments from Team</h3>

      <div className="mb-6">
        <label className="block mb-2">Amount per player</label>
        <input
          type="number"
          className="border rounded p-2"
          placeholder="e.g., 25000"
        />
        <p className="text-sm text-gray-500 mt-1">CLP</p>
      </div>

      <div className="mb-6">
        <label className="block mb-2">Custom message (optional)</label>
        <textarea
          className="border rounded p-2 w-full"
          rows={3}
          placeholder="Add a message for team members..."
        />
      </div>

      <button
        onClick={sendPaymentLinks}
        className="bg-green-600 text-white px-6 py-3 rounded hover:bg-green-700"
      >
        Send Payment Links to {teamMembers.length} Members
      </button>
    </div>
  );
}
```

**Files to create:**
- `src/components/admin/BulkPaymentCollector.tsx` (100 lines)
- `src/app/api/admin/orders/[id]/send-payment-links/route.ts` (90 lines)

---

#### Step 7.5: Production Scheduling System (10 hours)

**Create:** `src/app/admin/production-schedule/page.tsx`

Calendar view showing production capacity and order deadlines:

```typescript
'use client';

import { Calendar } from '@/components/ui/Calendar';

export default function ProductionSchedule() {
  const [schedule, setSchedule] = useState([]);

  // Show production capacity per day
  // Mark overbooked days in red
  // Allow drag-and-drop to reschedule orders
  // Auto-calculate delivery dates based on schedule

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Production Schedule</h1>

      <div className="flex gap-6">
        {/* Calendar View */}
        <div className="flex-1">
          <Calendar
            events={schedule}
            onEventDrop={handleReschedule}
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 space-y-4">
          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">Today's Production</h3>
            <p className="text-2xl font-bold">8 orders</p>
            <p className="text-sm text-gray-600">Capacity: 10/day</p>
          </div>

          <div className="p-4 bg-white rounded-lg shadow">
            <h3 className="font-semibold mb-2">Upcoming Deadlines</h3>
            {/* List urgent orders */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Files to create:**
- `src/app/admin/production-schedule/page.tsx` (200 lines)
- `src/app/api/admin/production-schedule/route.ts` (100 lines)

---

### Deliverables
- [x] Automated design revision requests
- [x] Auto order status advancement
- [x] Admin notification dashboard with real-time updates
- [x] Bulk payment collection
- [x] Production scheduling calendar
- [x] Cron jobs for automation

### Success Criteria
- ✅ Admins notified within 1 minute of new orders
- ✅ Orders auto-advance after production time
- ✅ Payment reminders sent automatically
- ✅ Production capacity visualized
- ✅ Reduces admin workload by 70%

---

## TASK 8: PERFORMANCE OPTIMIZATION
**Priority:** P3 - MEDIUM
**Effort:** 25 hours
**Dependencies:** None
**Owner:** Backend Engineer

### Current State Analysis
✅ **What exists:**
- Server-side rendering
- Supabase connection pooling
- Image optimization (Next.js)

❌ **What's missing:**
- N+1 query optimizations
- API pagination
- Database indexes on slow queries
- Redis caching layer
- Image CDN

### Implementation Plan

#### Step 8.1: Fix N+1 Queries (8 hours)

**Identified N+1 patterns:**

1. **Product catalog** - `/api/catalog/[sport]/products`
   - Currently: Fetches products, then images per product (N+1)
   - Fix: Use single join query

```typescript
// Before (N+1)
const products = await supabase.from('products').select('*');
for (const product of products) {
  const images = await supabase.from('product_images').select('*').eq('product_id', product.id);
}

// After (optimized)
const products = await supabase
  .from('products')
  .select(`
    *,
    product_images (*)
  `);
```

2. **Team dashboard** - `/api/teams/[id]`
   - Fix: Single query with joins for team, members, orders

3. **Admin orders list** - `/admin/orders`
   - Fix: Join orders + team + user in one query

**Files to modify:**
- `src/app/api/catalog/[sport]/products/route.ts`
- `src/app/api/teams/[id]/route.ts`
- `src/app/api/admin/orders/route.ts`

---

#### Step 8.2: Add API Pagination (6 hours)

**Create:** `src/lib/api/pagination.ts`

```typescript
export function parsePaginationParams(searchParams: URLSearchParams) {
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1
    }
  };
}
```

**Apply to:**
- Admin orders list
- Product catalog
- Team listings
- Order history

---

#### Step 8.3: Database Indexes (4 hours)

```sql
-- File: supabase/migrations/20251024_performance_indexes.sql

-- Orders table
CREATE INDEX idx_orders_team_id_created ON orders(team_id, created_at DESC);
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX idx_orders_current_stage ON orders(current_stage) WHERE current_stage IS NOT NULL;

-- Payment contributions
CREATE INDEX idx_payment_contributions_order_status ON payment_contributions(order_id, payment_status);
CREATE INDEX idx_payment_contributions_user ON payment_contributions(user_id, created_at DESC);

-- Design requests
CREATE INDEX idx_design_requests_team_status ON design_requests(team_id, status);

-- Team memberships
CREATE INDEX idx_team_memberships_user ON team_memberships(user_id);

-- Product images
CREATE INDEX idx_product_images_product_display ON product_images(product_id, display_order);

-- Analyze tables for query planner
ANALYZE orders;
ANALYZE payment_contributions;
ANALYZE design_requests;
ANALYZE team_memberships;
```

**Files to create:**
- `supabase/migrations/20251024_performance_indexes.sql`

---

#### Step 8.4: Redis Caching Layer (7 hours)

**Install:**
```bash
npm install ioredis
```

**Create:** `src/lib/cache/redis.ts`

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getCached<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number = 300) {
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// Cache wrappers
export async function cacheQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const cached = await getCached<T>(key);
  if (cached) return cached;

  const result = await queryFn();
  await setCache(key, result, ttl);
  return result;
}
```

**Apply to:**
- Product catalog (5min cache)
- Sports list (1hr cache)
- Size charts (30min cache)
- Bundle pricing (10min cache)

**Files to create:**
- `src/lib/cache/redis.ts` (100 lines)

---

### Deliverables
- [x] N+1 queries eliminated
- [x] API pagination implemented
- [x] Database indexes created
- [x] Redis caching layer
- [x] Performance monitoring

### Success Criteria
- ✅ Product catalog loads in <500ms
- ✅ Admin dashboard loads in <1s
- ✅ API response times <200ms (p95)
- ✅ Database query count reduced by 60%
- ✅ Cache hit rate >80%

---

## TASK 9: SELF-SERVICE FEATURES
**Priority:** P3 - LOW
**Effort:** 30 hours
**Dependencies:** Task 3 (Email System)
**Owner:** Full-Stack Engineer

### Current State Analysis
✅ **What exists:**
- Basic support contact form
- FAQ section (static)

❌ **What's missing:**
- Knowledge base
- Customer support ticket system
- Order modification requests
- Cancel/refund self-service
- Live chat integration

### Implementation Plan

#### Step 9.1: Knowledge Base (10 hours)

**Create:** `src/app/help/page.tsx`

Searchable knowledge base with categories:
- Getting Started
- Ordering & Payment
- Design Process
- Sizing & Fit
- Shipping & Delivery
- Team Management

```typescript
'use client';

import { useState } from 'react';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);

  async function search() {
    const res = await fetch(`/api/help/search?q=${searchQuery}`);
    const json = await res.json();
    setResults(json.data);
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">How can we help?</h1>

      <div className="mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search for answers..."
          className="w-full p-4 border rounded-lg text-lg"
        />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {categories.map(category => (
          <a
            key={category.slug}
            href={`/help/${category.slug}`}
            className="p-6 border rounded-lg hover:shadow-lg transition"
          >
            <h3 className="text-xl font-semibold mb-2">{category.name}</h3>
            <p className="text-gray-600">{category.description}</p>
          </a>
        ))}
      </div>

      {/* Popular Articles */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Popular Articles</h2>
        {popularArticles.map(article => (
          <a
            key={article.slug}
            href={`/help/articles/${article.slug}`}
            className="block p-4 border-b hover:bg-gray-50"
          >
            <h4 className="font-semibold">{article.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{article.preview}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
```

**Files to create:**
- `src/app/help/page.tsx` (150 lines)
- `src/app/help/[category]/page.tsx` (100 lines)
- `src/app/help/articles/[slug]/page.tsx` (80 lines)
- `src/app/api/help/search/route.ts` (60 lines)

---

#### Step 9.2: Support Ticket System (12 hours)

**Database schema:**

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  order_id UUID REFERENCES orders(id),

  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('order', 'payment', 'design', 'sizing', 'other')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),

  assigned_to UUID REFERENCES profiles(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),

  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Create:** `src/app/support/new/page.tsx`

```typescript
export default function NewSupportTicket() {
  async function submitTicket(formData: FormData) {
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      body: JSON.stringify({
        subject: formData.get('subject'),
        description: formData.get('description'),
        category: formData.get('category'),
        order_id: formData.get('order_id')
      })
    });

    if (res.ok) {
      window.location.href = '/support/tickets';
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Submit Support Request</h1>

      <form onSubmit={submitTicket}>
        {/* Form fields */}
        <button type="submit">Submit Ticket</button>
      </form>
    </div>
  );
}
```

**Files to create:**
- `src/app/support/new/page.tsx` (120 lines)
- `src/app/support/tickets/page.tsx` (customer ticket list, 100 lines)
- `src/app/support/tickets/[id]/page.tsx` (ticket thread view, 150 lines)
- `src/app/admin/support/page.tsx` (admin ticket queue, 180 lines)
- `src/app/api/support/tickets/route.ts` (100 lines)

---

#### Step 9.3: Order Modification Requests (8 hours)

Allow customers to request changes to pending orders:

**Create:** `src/app/orders/[id]/request-change/page.tsx`

```typescript
export default function RequestOrderChange({ params }: { params: { id: string } }) {
  async function submitChangeRequest(changeType: string, details: string) {
    await fetch(`/api/orders/${params.id}/request-change`, {
      method: 'POST',
      body: JSON.stringify({ change_type: changeType, details })
    });

    alert('Change request submitted. Our team will review it shortly.');
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Request Order Change</h1>

      <div className="space-y-4">
        <div>
          <label>What would you like to change?</label>
          <select>
            <option value="size">Player sizes</option>
            <option value="quantity">Quantity</option>
            <option value="design">Design modifications</option>
            <option value="shipping">Shipping address</option>
            <option value="cancel">Cancel order</option>
          </select>
        </div>

        <div>
          <label>Details</label>
          <textarea rows={5} placeholder="Explain the changes you need..." />
        </div>

        <button onClick={() => submitChangeRequest(/* ... */)}>
          Submit Request
        </button>
      </div>
    </div>
  );
}
```

**Files to create:**
- `src/app/orders/[id]/request-change/page.tsx` (100 lines)
- `src/app/api/orders/[id]/request-change/route.ts` (80 lines)

---

### Deliverables
- [x] Searchable knowledge base
- [x] Support ticket system
- [x] Order modification requests
- [x] Self-service help center
- [x] Admin support queue

### Success Criteria
- ✅ 60% of questions answered via knowledge base
- ✅ Support tickets resolved in <24 hours
- ✅ Order change requests processed automatically
- ✅ Reduces support load by 50%

---

# TESTING & QA

## Unit Testing Strategy

### Priority Test Coverage

**P0 - Critical Business Logic:**
- `src/lib/pricing/calculator.ts` - Tiered pricing calculations
- `src/lib/sizing/calculator.ts` - Size recommendations
- `src/lib/orders/deliveryEstimate.ts` - Delivery date calculations
- `src/lib/automation/orderStatusAutomation.ts` - Order automation logic

**Example test:**
```typescript
// __tests__/pricing/calculator.test.ts
import { calculateTieredPrice } from '@/lib/pricing/calculator';

describe('Tiered Pricing Calculator', () => {
  test('applies correct discount for quantity 25', () => {
    const result = calculateTieredPrice({
      basePrice: 10000,
      quantity: 25,
      productId: 'test-id'
    });

    expect(result.unitPrice).toBe(4750); // 52.5% discount
    expect(result.total).toBe(118750);
  });

  test('applies tiered bundle discount', () => {
    // Test tiered bundle logic
  });
});
```

**Tools:**
- Jest for unit tests
- React Testing Library for components
- Supertest for API endpoint testing

**Target Coverage:** 80% for critical paths

---

## Integration Testing

### API Endpoint Tests

**Critical endpoints to test:**
1. `/api/pricing/calculate` - All pricing scenarios
2. `/api/sizing/calculate` - Risk scoring edge cases
3. `/api/orders` - Order creation workflow
4. `/api/admin/orders/[id]/advance-stage` - Status transitions
5. `/api/webhooks/mercadopago` - Payment webhooks

**Example:**
```typescript
// __tests__/api/orders.integration.test.ts
import { createMocks } from 'node-mocks-http';

describe('POST /api/orders', () => {
  test('creates order with split payment', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        team_id: 'test-team-id',
        items: [/* ... */],
        split_payment: true
      }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toMatchObject({
      success: true,
      data: expect.objectContaining({
        order_id: expect.any(String)
      })
    });
  });
});
```

---

## End-to-End Testing (E2E)

### Critical User Flows

**Flow 1: Team Order Creation**
```typescript
// e2e/team-order-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete team order flow', async ({ page }) => {
  // 1. Login
  await page.goto('/auth/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('button:has-text("Login")');

  // 2. Select product
  await page.goto('/catalogo/soccer');
  await page.click('.product-card:first-child');

  // 3. Customize design
  await page.click('button:has-text("Customize")');
  await page.fill('[name="team-name"]', 'Test Team');

  // 4. Add to cart
  await page.click('button:has-text("Add to Cart")');

  // 5. Checkout
  await page.goto('/checkout');
  await page.fill('[name="quantity"]', '25');
  await page.click('button:has-text("Place Order")');

  // 6. Verify order created
  await expect(page.locator('text=Order placed successfully')).toBeVisible();
});
```

**Key flows to test:**
- New user registration → team creation → first order
- Design request submission → approval → order
- Split payment → multiple contributors → order completion
- Reorder flow → roster update → checkout
- Admin: order management → stage advancement → delivery

**Tools:**
- Playwright for E2E tests
- Run against staging environment

---

## Manual QA Checklist

### Before Launch

**Functional Testing:**
- [ ] All pricing tiers calculate correctly
- [ ] Sizing calculator returns appropriate recommendations
- [ ] Email notifications sent for all triggers
- [ ] Order tracking updates in real-time
- [ ] Payment webhooks process correctly
- [ ] Admin can advance orders through all stages
- [ ] Bulk operations work (exports, reminders, approvals)
- [ ] Reorder preserves customizations
- [ ] Institution dashboard shows correct aggregates

**Cross-Browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**Performance Testing:**
- [ ] Product catalog loads <500ms
- [ ] Checkout flow completes <3min
- [ ] Admin dashboard loads <1s
- [ ] API endpoints respond <200ms (p95)

**Security Testing:**
- [ ] Run Supabase Security Advisor (0 errors)
- [ ] All RLS policies tested
- [ ] No auth.users exposure
- [ ] CORS configured correctly
- [ ] Rate limiting in place

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] WCAG 2.1 AA compliance
- [ ] Color contrast ratios meet standards

---

# DEPLOYMENT CHECKLIST

## Pre-Deployment

### Database Migrations

**Apply in order:**
```bash
# 1. Security fixes (if not already applied)
psql -f supabase/migrations/fix_security_issues.sql

# 2. New feature migrations
psql -f supabase/migrations/20251024_enhance_pricing_tiers.sql
psql -f supabase/migrations/20251024_add_sizing_system.sql
psql -f supabase/migrations/20251024_order_tracking_system.sql
psql -f supabase/migrations/20251024_reorder_system.sql
psql -f supabase/migrations/20251024_performance_indexes.sql

# 3. Verify
psql -f scripts/verify-security-fixes.sql
```

**Backup database first:**
```bash
pg_dump -h <db-host> -U postgres -d postgres > backup-$(date +%Y%m%d).sql
```

---

### Environment Variables

**Required for production:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (server-only)

# Email (Resend)
RESEND_API_KEY=re_...

# Payment (MercadoPago)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
MERCADOPAGO_PUBLIC_KEY=APP_USR-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=APP_USR-...

# Redis (for caching & queues)
REDIS_URL=redis://...

# App
NEXT_PUBLIC_APP_URL=https://deserveathletics.com

# Feature Flags
NEXT_PUBLIC_ENABLE_SIZING_CALCULATOR=true
NEXT_PUBLIC_ENABLE_REORDER=true
```

---

### Seed Data

**Production data to seed:**
```bash
# 1. Pricing tiers
npm run tsx scripts/seed-product-pricing-tiers.ts

# 2. Default configuration
npm run tsx scripts/seed-pricing-configuration.ts

# 3. Help articles (knowledge base)
npm run tsx scripts/seed-help-articles.ts
```

---

## Deployment Steps

### Vercel Deployment

```bash
# 1. Build locally first
npm run build

# 2. Fix any build errors

# 3. Deploy to staging
vercel --prod=false

# 4. Test staging thoroughly

# 5. Deploy to production
vercel --prod

# 6. Verify deployment
curl https://deserveathletics.com/api/health
```

---

### Post-Deployment Verification

**Smoke Tests:**
```bash
# 1. Homepage loads
curl -I https://deserveathletics.com

# 2. API health check
curl https://deserveathletics.com/api/health

# 3. Product catalog
curl https://deserveathletics.com/api/catalog/soccer/products

# 4. Pricing calculation
curl "https://deserveathletics.com/api/pricing/calculate?productId=14&quantity=25"
```

**Manual Checks:**
- [ ] Can login
- [ ] Can view products
- [ ] Can create team
- [ ] Can submit design request
- [ ] Can place order
- [ ] Can make payment
- [ ] Email notifications working
- [ ] Admin panel accessible
- [ ] Order tracking visible

---

### Monitoring Setup

**Vercel Analytics:**
- Enable Web Analytics
- Enable Speed Insights
- Monitor Core Web Vitals

**Supabase Monitoring:**
- Check Database Stats
- Monitor RLS policy performance
- Review API usage

**Error Tracking:**
- Set up Sentry or similar
- Configure error alerts

**Uptime Monitoring:**
- Set up ping monitoring (UptimeRobot, Pingdom)
- Alert on >5min downtime

---

## Rollback Plan

**If critical issues arise:**

1. **Immediate rollback:**
```bash
# Revert to previous Vercel deployment
vercel rollback
```

2. **Database rollback (if needed):**
```bash
# Restore from backup
psql -h <db-host> -U postgres -d postgres < backup-YYYYMMDD.sql
```

3. **Disable new features via environment:**
```env
NEXT_PUBLIC_ENABLE_SIZING_CALCULATOR=false
NEXT_PUBLIC_ENABLE_REORDER=false
```

---

# POST-LAUNCH TASKS

## Week 1: Monitor & Fix

- [ ] Monitor error rates (target: <0.1%)
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Fix any critical bugs
- [ ] Optimize slow queries if needed

## Week 2: User Training

- [ ] Create video tutorials
- [ ] Email existing teams about new features
- [ ] Update help documentation
- [ ] Host Q&A session for athletic directors

## Week 3: Optimization

- [ ] Review analytics data
- [ ] Identify bottlenecks
- [ ] A/B test key flows
- [ ] Implement quick wins

## Month 2: Scale Testing

- [ ] Simulate 100+ concurrent users
- [ ] Test with 50+ teams
- [ ] Load test payment system
- [ ] Verify production capacity tracking

---

# APPENDIX: RISK MITIGATION

## High-Risk Areas

### 1. Payment Processing
**Risk:** Split payment failures could block orders
**Mitigation:**
- Implement payment retry logic
- Add manual payment override for admins
- Monitor webhook failures closely

### 2. Email Delivery
**Risk:** Critical notifications not delivered
**Mitigation:**
- Use reliable provider (Resend)
- Implement retry queue (Bull + Redis)
- Monitor delivery rates (target >98%)
- Provide in-app notifications as backup

### 3. Database Performance
**Risk:** Slow queries under load
**Mitigation:**
- Add database indexes (Task 8)
- Implement Redis caching
- Set up query performance monitoring
- Have database scaling plan ready

### 4. Production Scheduling
**Risk:** Overcommitting production capacity
**Mitigation:**
- Production calendar with capacity limits (Task 7)
- Buffer time in delivery estimates
- Admin alerts for overbooked periods

---

# FINAL SUMMARY

## Total Effort Breakdown

| Phase | Tasks | Hours | Weeks (1 engineer) |
|-------|-------|-------|---------------------|
| Phase 1: Critical Foundations | 3 | 100 | 2.5 |
| Phase 2: Customer Experience | 3 | 90 | 2.25 |
| Phase 3: Scale Readiness | 3 | 105 | 2.6 |
| **TOTAL** | **9** | **295** | **~7.5 weeks** |

**With 2 engineers in parallel:** ~4 weeks

---

## Success Metrics

**Before:**
- 85% feature complete
- Ready for 20-30 teams
- Manual workflows
- Limited automation

**After (All Tasks Complete):**
- 100% feature complete
- Scale-ready for 500+ teams, 5,000+ users
- Automated workflows
- Self-service capabilities
- <200ms API response times
- 70% reduction in admin workload
- 40% increase in repeat orders
- 30% reduction in returns (sizing)
- 60% of support via self-service

---

## Priority Recommendation

**Minimum Viable for Launch:**
- Task 1: Tiered Pricing (P0)
- Task 2: Sizing Calculator (P0)
- Task 3: Email Notifications (P0)

**Complete These:** 100 hours (~2.5 weeks)

**Launch with limited scale** → Gather feedback → Iterate

**Scale-Ready (All Tasks):** 295 hours (~7.5 weeks)

---

## Next Steps

1. **Review this plan with stakeholders**
2. **Prioritize based on partner meeting feedback**
3. **Assign tasks to engineers**
4. **Set up project tracking (Jira, Linear, etc.)**
5. **Begin Phase 1 immediately**
6. **Schedule daily standups for first 2 weeks**
7. **Plan weekly demos to show progress**

---

**Document Version:** 1.0
**Last Updated:** October 24, 2025
**Status:** Ready for Implementation

---

*This plan was generated with comprehensive system analysis and professional software engineering best practices. All estimates are based on single full-stack engineer working full-time. Adjust timeline based on team size and availability.*
