#!/usr/bin/env node
/**
 * Audit existing products table to understand data for migration
 * This helps us identify unique designs vs products for Phase A.2
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditProducts() {
  console.log('🔍 AUDITING PRODUCTS TABLE\n');
  console.log('='.repeat(80));

  // 1. Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      category,
      price_cents,
      status,
      hero_path,
      sport_id,
      sport_ids,
      product_type_slug,
      created_at
    `)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('❌ Error fetching products:', error);
    return;
  }

  if (!products || products.length === 0) {
    console.log('✅ No products found in database.');
    console.log('   This is actually GOOD - you can start fresh with the new architecture!');
    console.log('   You can create products and designs directly in the admin panel.\n');
    return;
  }

  console.log(`📦 TOTAL PRODUCTS: ${products.length}\n`);

  // 2. Analyze products by category
  const byCategory = {};
  const bySport = {};
  const byProductType = {};

  products.forEach(p => {
    // By category
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;

    // By sport (handle both sport_id and sport_ids)
    if (p.sport_ids && p.sport_ids.length > 0) {
      p.sport_ids.forEach(sportId => {
        bySport[sportId] = (bySport[sportId] || 0) + 1;
      });
    } else if (p.sport_id) {
      bySport[p.sport_id] = (bySport[p.sport_id] || 0) + 1;
    }

    // By product type
    if (p.product_type_slug) {
      byProductType[p.product_type_slug] = (byProductType[p.product_type_slug] || 0) + 1;
    }
  });

  console.log('📊 BREAKDOWN BY CATEGORY:');
  Object.entries(byCategory).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
  console.log('');

  console.log('📊 BREAKDOWN BY SPORT:');
  Object.entries(bySport).forEach(([sportId, count]) => {
    console.log(`   Sport ID ${sportId}: ${count}`);
  });
  console.log('');

  console.log('📊 BREAKDOWN BY PRODUCT TYPE:');
  Object.entries(byProductType).forEach(([type, count]) => {
    console.log(`   ${type || 'null'}: ${count}`);
  });
  console.log('');

  // 3. Analyze images
  const withImages = products.filter(p => p.hero_path);
  const withoutImages = products.filter(p => !p.hero_path);

  console.log('🖼️  IMAGE ANALYSIS:');
  console.log(`   Products WITH images: ${withImages.length}`);
  console.log(`   Products WITHOUT images: ${withoutImages.length}`);
  console.log('');

  // 4. List all products
  console.log('📝 DETAILED PRODUCT LIST:\n');
  console.log('='.repeat(80));

  products.forEach((p, idx) => {
    console.log(`\n${idx + 1}. ${p.name} (${p.slug})`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Category: ${p.category}`);
    console.log(`   Price: $${p.price_cents.toLocaleString()} CLP`);
    console.log(`   Status: ${p.status}`);
    console.log(`   Sport IDs: ${p.sport_ids ? JSON.stringify(p.sport_ids) : p.sport_id || 'none'}`);
    console.log(`   Product Type: ${p.product_type_slug || 'none'}`);
    console.log(`   Has Image: ${p.hero_path ? 'YES' : 'NO'}`);
    if (p.hero_path) {
      console.log(`   Image Path: ${p.hero_path}`);
    }
  });

  console.log('\n' + '='.repeat(80));

  // 5. Recommendations
  console.log('\n💡 MIGRATION RECOMMENDATIONS:\n');

  if (products.length === 0) {
    console.log('✅ No products exist - start fresh with new architecture!');
  } else if (withImages.length === 0) {
    console.log('✅ No products have images - safe to keep as pure SKU templates!');
    console.log('   Products are already acting as SKU templates (no designs mixed in).');
    console.log('   You can start adding designs separately in the admin panel.');
  } else {
    console.log('⚠️  Some products have images. These need review:');
    console.log('   Option 1: If images are product photos (fabric, sizing), keep them.');
    console.log('   Option 2: If images are design mockups, migrate to design_mockups table.');
    console.log('\n   Products with images:');
    withImages.forEach(p => {
      console.log(`   - ${p.name} (${p.slug}): ${p.hero_path}`);
    });
  }

  console.log('\n✅ Audit complete!\n');
}

// Run audit
auditProducts().catch(console.error);
