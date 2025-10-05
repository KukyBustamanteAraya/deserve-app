/**
 * Seed Pricing Tiers
 *
 * Idempotent script to create pricing tiers for all products based on standard discount bands:
 * - 1-9: 0% discount
 * - 10-24: 5% discount
 * - 25-49: 10% discount
 * - 50-99: 15% discount
 * - 100+: 20% discount
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Discount bands: [minQty, maxQty | null, discountPercent]
const DISCOUNT_BANDS = [
  { min: 1, max: 9, discount: 0 },
  { min: 10, max: 24, discount: 5 },
  { min: 25, max: 49, discount: 10 },
  { min: 50, max: 99, discount: 15 },
  { min: 100, max: null, discount: 20 },
] as const;

async function seedPricingTiers() {
  console.log('🌱 Seeding pricing tiers...\n');

  // 1. Fetch all products
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, slug, price_cents, base_price_cents, retail_price_cents');

  if (productsError) {
    console.error('❌ Error fetching products:', productsError);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('⚠️  No products found. Exiting.');
    return;
  }

  console.log(`📦 Found ${products.length} products\n`);

  let totalTiersCreated = 0;
  let totalProductsProcessed = 0;

  for (const product of products) {
    // Calculate display_price_cents
    const display_price_cents =
      product.retail_price_cents ??
      product.price_cents ??
      product.base_price_cents ??
      0;

    if (display_price_cents === 0) {
      console.log(`⚠️  Skipping ${product.name} (${product.slug}) - no price data`);
      continue;
    }

    // Check if tiers already exist for this product
    const { data: existingTiers } = await supabase
      .from('pricing_tiers')
      .select('id')
      .eq('product_id', product.id);

    if (existingTiers && existingTiers.length > 0) {
      console.log(`✓ ${product.name} - already has ${existingTiers.length} tiers`);
      continue;
    }

    // Create tiers for this product
    const tiersToInsert = DISCOUNT_BANDS.map(band => {
      const discountedPrice = Math.round(
        display_price_cents * (1 - band.discount / 100)
      );

      return {
        product_id: product.id,
        min_quantity: band.min,
        max_quantity: band.max,
        price_per_unit_cents: discountedPrice,
      };
    });

    const { error: insertError } = await supabase
      .from('pricing_tiers')
      .insert(tiersToInsert);

    if (insertError) {
      console.error(`❌ Error creating tiers for ${product.name}:`, insertError);
      continue;
    }

    console.log(`✅ ${product.name} - created ${DISCOUNT_BANDS.length} tiers`);
    totalTiersCreated += DISCOUNT_BANDS.length;
    totalProductsProcessed++;
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Products processed: ${totalProductsProcessed}`);
  console.log(`   Total tiers created: ${totalTiersCreated}`);
}

// Run the seeder
seedPricingTiers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
