import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Standard discount bands (fallback when no DB tier exists)
const DISCOUNT_BANDS = [
  { min: 1, max: 9, discount: 0 },
  { min: 10, max: 24, discount: 5 },
  { min: 25, max: 49, discount: 10 },
  { min: 50, max: 99, discount: 15 },
  { min: 100, max: null, discount: 20 },
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
  const supabase = createSupabaseServerClient();

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
    console.error('Pricing calculation error:', error);
    return NextResponse.json(
      { error: error.message || 'Pricing calculation failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/**
 * Get unit price for a product using pricing_tiers_product (product-based tiers)
 * Falls back to discount bands if no tier found
 * Returns price in CLP (integer pesos)
 */
async function getUnitPrice(
  supabase: any,
  productId: number,
  quantity: number
): Promise<number | null> {
  // Fetch product base price
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, price_cents, base_price_cents, retail_price_cents')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return null;
  }

  // Calculate base price (CLP integer)
  const basePrice = product.retail_price_cents ?? product.price_cents ?? product.base_price_cents ?? 0;

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
