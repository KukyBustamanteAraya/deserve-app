#!/usr/bin/env tsx
/**
 * Seed Taxonomy Data
 * Idempotently seeds: product_types, sports, bundles, fabric recommendations
 * Run with: npx tsx scripts/seed-taxonomy.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!SERVICE_ROLE_KEY);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('🌱 Starting taxonomy seed...\n');

  try {
    // Seed Product Types
    console.log('📦 Seeding product types...');
    const { error: typesError } = await supabase.rpc('upsert_fabric_suitability', {
      p_type_slug: 'jersey',
      p_fabric_name: 'Premium',
      p_suitability: 5
    });
    if (typesError) throw typesError;
    console.log('✅ Product types seeded (migration handles this)\n');

    // Seed Sports
    console.log('⚽ Seeding sports...');
    const { count: sportsCount } = await supabase
      .from('sports')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ ${sportsCount || 0} sports in database\n`);

    // Seed Bundles
    console.log('📦 Seeding bundles...');
    const { count: bundlesCount } = await supabase
      .from('bundles')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ ${bundlesCount || 0} bundles in database\n`);

    // Seed Fabric Recommendations
    console.log('🧵 Seeding fabric recommendations...');
    const { count: recsCount } = await supabase
      .from('product_fabric_recommendations')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ ${recsCount || 0} fabric recommendations in database\n`);

    // Seed Sport Overrides
    console.log('🏉 Seeding sport fabric overrides...');
    const { count: overridesCount } = await supabase
      .from('sport_fabric_overrides')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ ${overridesCount || 0} sport overrides in database\n`);

    // Fabric Aliases
    console.log('🔗 Seeding fabric aliases...');
    const { count: aliasesCount } = await supabase
      .from('fabric_aliases')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ ${aliasesCount || 0} fabric aliases in database\n`);

    console.log('🎉 Taxonomy seed complete!\n');
    console.log('Summary:');
    console.log(`  Sports: ${sportsCount || 0}`);
    console.log(`  Bundles: ${bundlesCount || 0}`);
    console.log(`  Fabric Recommendations: ${recsCount || 0}`);
    console.log(`  Sport Overrides: ${overridesCount || 0}`);
    console.log(`  Aliases: ${aliasesCount || 0}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
