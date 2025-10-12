import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

// Standard discount bands based on Deserve pricing CSV
const DISCOUNT_BANDS = [
  { min: 1, max: 4, discount: 0 },     // No discount
  { min: 5, max: 9, discount: 25 },    // 25% off (CSV: $70k → $52.5k)
  { min: 10, max: 24, discount: 50 },  // 50% off (CSV: $70k → $35k)
  { min: 25, max: 49, discount: 52.5 },// 52.5% off (CSV: $70k → $33.25k)
  { min: 50, max: 99, discount: 55 },  // 55% off (CSV: $70k → $31.5k)
  { min: 100, max: null, discount: 57.5 }, // 57.5% off (CSV: $70k → $29.75k)
];

interface BundleComponent {
  qty: number;
  type_slug: string;
}

interface ComponentPricing {
  type_slug: string;
  type_name: string;
  qty: number;
  original_unit_price: number;  // Base price without any discount
  unit_price: number;           // Price after quantity discount
  subtotal: number;             // Total after quantity discount
}

/**
 * GET /api/pricing/bundle
 *
 * Calculate comprehensive bundle pricing with fabric modifiers
 *
 * Query params:
 * - bundleCode (required): Bundle code (e.g., "B1")
 * - quantity (required): Number of bundle sets
 * - fabricModifier (optional): Fabric price modifier in cents (can be negative)
 * - sportSlug (required): Sport slug to find products by type
 *
 * Returns itemized pricing for each component in the bundle
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();

  try {
    const { searchParams } = new URL(request.url);
    const bundleCode = searchParams.get('bundleCode');
    const quantityParam = searchParams.get('quantity');
    const fabricModifierParam = searchParams.get('fabricModifier');
    const sportSlug = searchParams.get('sportSlug');

    const quantity = quantityParam ? parseInt(quantityParam, 10) : 0;
    const fabricModifier = fabricModifierParam ? parseInt(fabricModifierParam, 10) : 0;

    if (!bundleCode) {
      return NextResponse.json(
        { error: 'bundleCode is required' },
        { status: 400 }
      );
    }

    if (!sportSlug) {
      return NextResponse.json(
        { error: 'sportSlug is required' },
        { status: 400 }
      );
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Fetch bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('bundles')
      .select('*')
      .eq('code', bundleCode)
      .single();

    if (bundleError || !bundle) {
      return NextResponse.json(
        { error: 'Bundle not found' },
        { status: 404 }
      );
    }

    // Calculate pricing for each component
    const components: ComponentPricing[] = [];
    let originalTotal = 0;      // Total at original prices (no discounts)
    let afterQuantityDiscount = 0;  // Total after quantity discount only
    let grossTotal = 0;         // Total after quantity discount (for bundle discount calculation)

    // First get the sport ID (do this once, not in loop)
    const { data: sport } = await supabase
      .from('sports')
      .select('id')
      .eq('slug', sportSlug)
      .single();

    if (!sport) {
      return NextResponse.json(
        { error: 'Sport not found' },
        { status: 404 }
      );
    }

    // Find quantity discount band
    const band = DISCOUNT_BANDS.find(
      b => b.min <= quantity && (b.max === null || b.max >= quantity)
    );
    const quantityDiscountPct = band?.discount || 0;

    for (const comp of bundle.components as BundleComponent[]) {
      // Get component base price from component_pricing table
      const { data: componentPricing } = await supabase
        .from('component_pricing')
        .select('base_price_cents, component_name')
        .eq('component_type_slug', comp.type_slug)
        .single();

      if (!componentPricing) {
        logger.warn(`No pricing found for component type: ${comp.type_slug}`);
        continue;
      }

      // Base price without any discounts
      const basePrice = componentPricing.base_price_cents;
      const originalUnitPrice = basePrice + fabricModifier;
      const originalSubtotal = originalUnitPrice * comp.qty * quantity;

      // Apply quantity discount to base price
      let unitPriceAfterQtyDiscount = basePrice;
      if (band && band.discount > 0) {
        unitPriceAfterQtyDiscount = Math.round(basePrice * (1 - band.discount / 100));
      }

      // Apply fabric modifier
      const unitPriceWithFabric = unitPriceAfterQtyDiscount + fabricModifier;
      const componentSubtotal = unitPriceWithFabric * comp.qty * quantity;

      components.push({
        type_slug: comp.type_slug,
        type_name: componentPricing.component_name,
        qty: comp.qty,
        original_unit_price: originalUnitPrice,
        unit_price: unitPriceWithFabric,
        subtotal: componentSubtotal,
      });

      originalTotal += originalSubtotal;
      grossTotal += componentSubtotal;
    }

    // Calculate quantity discount amount
    const quantityDiscountAmount = originalTotal - grossTotal;

    // Apply bundle discount
    const bundleDiscountPct = bundle.discount_pct || 0;
    const total = Math.round(grossTotal * (100 - bundleDiscountPct) / 100);
    const bundleDiscountAmount = grossTotal - total;

    return NextResponse.json({
      bundle_code: bundleCode,
      bundle_name: bundle.name,
      quantity,
      components,
      original_total: originalTotal,
      quantity_discount_pct: quantityDiscountPct,
      quantity_discount_amount: quantityDiscountAmount,
      subtotal_after_quantity_discount: grossTotal,
      bundle_discount_pct: bundleDiscountPct,
      bundle_discount_amount: bundleDiscountAmount,
      total,
    });

  } catch (error: any) {
    logger.error('Bundle pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Pricing calculation failed' },
      { status: 500 }
    );
  }
}

