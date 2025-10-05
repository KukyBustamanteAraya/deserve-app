/**
 * Seed pricing data from Deserve_Pricing_Spec_ALL.csv
 *
 * This script:
 * 1. Creates base products (Single Items)
 * 2. Creates bundle products
 * 3. Seeds pricing tiers for each product
 *
 * Run with: npx tsx scripts/seed-pricing.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!SUPABASE_URL) console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_SERVICE_KEY) console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nPlease set these in your .env.local file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Pricing data from CSV (Schools pricing in thousands of CLP)
const SINGLE_ITEMS = [
  { name: 'Socks', category: 'medias', price: 15000, retail: 15000 },
  { name: 'Shorts', category: 'shorts', price: 20000, retail: 20000 },
  { name: 'Jersey', category: 'camiseta', price: 35000, retail: 35000 },
  { name: 'Pants', category: 'pantalon', price: 50000, retail: 50000 },
];

const BUNDLES = [
  {
    name: 'Jersey + Shorts',
    items: [
      { name: 'Jersey', quantity: 1 },
      { name: 'Shorts', quantity: 1 }
    ],
    price: 50000, // Discounted from 55k (save 5k)
    retail: 55000
  },
  {
    name: 'Full Kit (Jersey + Shorts + Socks)',
    items: [
      { name: 'Jersey', quantity: 1 },
      { name: 'Shorts', quantity: 1 },
      { name: 'Socks', quantity: 1 }
    ],
    price: 65000, // Discounted from 70k (save 5k)
    retail: 70000
  },
  {
    name: 'Home + Away',
    items: [
      { name: 'Jersey', quantity: 2 }
    ],
    price: 70000,
    retail: 70000
  },
  {
    name: 'Home + Away + Shorts',
    items: [
      { name: 'Jersey', quantity: 2 },
      { name: 'Shorts', quantity: 1 }
    ],
    price: 90000,
    retail: 90000
  },
  {
    name: 'Jersey + Jacket',
    items: [
      { name: 'Jersey', quantity: 1 },
      { name: 'Jacket', quantity: 1 }
    ],
    price: 95000,
    retail: 95000
  },
  {
    name: 'Home + Away + Shorts + Socks',
    items: [
      { name: 'Jersey', quantity: 2 },
      { name: 'Shorts', quantity: 1 },
      { name: 'Socks', quantity: 1 }
    ],
    price: 105000,
    retail: 105000
  },
  {
    name: 'Full Kit + Jacket',
    items: [
      { name: 'Jersey', quantity: 1 },
      { name: 'Shorts', quantity: 1 },
      { name: 'Socks', quantity: 1 },
      { name: 'Jacket', quantity: 1 }
    ],
    price: 120000, // Discounted from 130k (save 10k)
    retail: 130000
  }
];

async function main() {
  console.log('🚀 Starting pricing seed...\n');

  try {
    // Get default sport (Soccer)
    const { data: sports, error: sportsError } = await supabase
      .from('sports')
      .select('id')
      .eq('name', 'Soccer')
      .single();

    if (sportsError || !sports) {
      console.error('❌ Soccer sport not found. Run migrations first.');
      console.error('   Error:', sportsError?.message);
      process.exit(1);
    }

    const sport_id = sports.id;

    // Get Deserve fabric (baseline)
    const { data: deserveFabric, error: fabricError } = await supabase
      .from('fabrics')
      .select('id')
      .eq('name', 'Deserve')
      .single();

    if (fabricError || !deserveFabric) {
      console.error('❌ Deserve fabric not found. Run migration 013 first.');
      console.error('   Error:', fabricError?.message);
      process.exit(1);
    }

  const fabric_id = deserveFabric.id;

  // Create admin user for created_by field
  const { data: { user } } = await supabase.auth.getUser();
  const created_by = user?.id || null;

  console.log('📦 Creating single items...');

  // Create single items
  for (const item of SINGLE_ITEMS) {
    const slug = item.name.toLowerCase().replace(/\s+/g, '-');

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        sport_id,
        category: item.category,
        name: item.name,
        slug,
        description: `High-quality ${item.name.toLowerCase()} for team sports`,
        base_price_cents: item.price,
        retail_price_cents: item.retail,
        price_cents: item.price,
        fabric_id,
        status: 'active',
        tags: ['team', 'soccer'],
        created_by
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`⚠️  ${item.name} already exists, skipping`);
      } else {
        console.error(`❌ Error creating ${item.name}:`, error.message);
      }
    } else {
      console.log(`✅ Created ${item.name} (${product.id})`);
    }
  }

  console.log('\n🎁 Creating bundles...');

  // Create bundles
  for (const bundle of BUNDLES) {
    const slug = bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    // Get product IDs for bundle items
    const bundleItemsData = [];
    for (const item of bundle.items) {
      const { data: itemProduct } = await supabase
        .from('products')
        .select('id')
        .eq('name', item.name)
        .single();

      if (itemProduct) {
        bundleItemsData.push({
          product_id: itemProduct.id,
          quantity: item.quantity
        });
      }
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        sport_id,
        category: 'camiseta', // Bundles use jersey category
        name: bundle.name,
        slug,
        description: `Bundle: ${bundle.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
        base_price_cents: bundle.price,
        retail_price_cents: bundle.retail,
        price_cents: bundle.price,
        fabric_id,
        status: 'active',
        is_bundle: true,
        bundle_items: bundleItemsData,
        tags: ['bundle', 'team', 'soccer'],
        created_by
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        console.log(`⚠️  ${bundle.name} already exists, skipping`);
      } else {
        console.error(`❌ Error creating ${bundle.name}:`, error.message);
      }
    } else {
      const savings = bundle.retail - bundle.price;
      console.log(`✅ Created ${bundle.name} (saves $${savings / 1000}k)`);
    }
  }

    console.log('\n✨ Pricing seed complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Visit: http://localhost:3000/catalog');
    console.log('3. Test quantity slider and fabric selector');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed with error:', error);
    process.exit(1);
  }
}

main();
