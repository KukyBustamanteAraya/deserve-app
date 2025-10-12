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

/**
 * GET /api/pricing/calculate
 *
 * Calculate pricing for products using product-based tiers
 *
 * Data sources (in order):
 * 1. pricing_tiers_product (product-based tiers by quantity)
 * 2. Fallback discount bands (0/5/10/15/20% at 1/10/25/50/100)
 * 3. bundles.discount_pct (optional bundle discount)
 *
 * Query params:
 * - productId (required): Product ID
 * - quantity (required): Quantity (min: 1)
 * - bundleCode (optional): Bundle code for additional discount
 *
 * All prices in CLP (integer pesos, zero decimals)
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();

  try {
    const { searchParams } = new URL(request.url);
    const productIdParam = searchParams.get('productId');
    const bundleCodeParam = searchParams.get('bundleCode');
    const quantityParam = searchParams.get('quantity');

    const productId = productIdParam ? parseInt(productIdParam, 10) : null;
    const quantity = quantityParam ? parseInt(quantityParam, 10) : 0;
    const bundleCode = bundleCodeParam;

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Calculate base unit price using DB tiers first, fallback to bands
    const unitPrice = await getUnitPrice(supabase, productId, quantity);

    if (unitPrice === null) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // If bundleCode is provided, apply bundle discount
    if (bundleCode) {
      const bundleResult = await applyBundleDiscount(
        supabase,
        bundleCode,
        unitPrice,
        quantity
      );

      return NextResponse.json(
        bundleResult,
        { status: bundleResult.error ? 404 : 200, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Single product response
    return NextResponse.json(
      {
        unit_price: unitPrice,
        quantity,
        total: unitPrice * quantity,
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (error: any) {
    logger.error('Pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Pricing calculation failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/**
 * Get unit price for a product using component_pricing table
 * Falls back to product table price if component pricing not found
 * Applies quantity-based discount bands
 * Returns price in CLP (integer pesos)
 */
async function getUnitPrice(
  supabase: any,
  productId: number,
  quantity: number
): Promise<number | null> {
  // Fetch product to get product_type_slug
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, product_type_slug, price_cents, base_price_cents, retail_price_cents')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return null;
  }

  let basePrice = 0;

  // Try to get base price from component_pricing table first
  if (product.product_type_slug) {
    const { data: componentPricing } = await supabase
      .from('component_pricing')
      .select('base_price_cents')
      .eq('component_type_slug', product.product_type_slug)
      .single();

    if (componentPricing) {
      basePrice = componentPricing.base_price_cents;
    }
  }

  // Fallback to product table if component pricing not found
  if (basePrice === 0) {
    basePrice = product.retail_price_cents ?? product.price_cents ?? product.base_price_cents ?? 0;
  }

  if (basePrice === 0) {
    return null;
  }

  // Try to get product-based tier from pricing_tiers_product
  const { data: tiers } = await supabase
    .from('pricing_tiers_product')
    .select('unit_price')
    .eq('product_id', productId)
    .lte('min_quantity', quantity)
    .or(`max_quantity.is.null,max_quantity.gte.${quantity}`)
    .order('min_quantity', { ascending: false })
    .limit(1);

  if (tiers && tiers.length > 0) {
    return tiers[0].unit_price;
  }

  // Fallback to discount bands
  const band = DISCOUNT_BANDS.find(
    b => b.min <= quantity && (b.max === null || b.max >= quantity)
  );

  if (band && band.discount > 0) {
    return Math.round(basePrice * (1 - band.discount / 100));
  }

  return basePrice;
}

/**
 * Apply bundle discount to unit price
 * Returns bundle pricing response in CLP (integer pesos)
 */
async function applyBundleDiscount(
  supabase: any,
  bundleCode: string,
  unitPrice: number,
  quantity: number
) {
  // Fetch bundle with discount_pct
  const { data: bundle, error: bundleError } = await supabase
    .from('bundles')
    .select('code, discount_pct')
    .eq('code', bundleCode)
    .single();

  if (bundleError || !bundle) {
    return { error: 'Bundle not found' };
  }

  const discountPct = bundle.discount_pct || 0;
  const grossTotal = unitPrice * quantity;
  const total = Math.round(grossTotal * (100 - discountPct) / 100);

  return {
    unit_price: unitPrice,
    discount_pct: discountPct,
    quantity,
    total,
  };
}
