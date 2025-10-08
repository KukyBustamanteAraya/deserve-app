import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixComponentPrices() {
  console.log('Fixing component base prices...\n');

  // Show current prices
  const { data: currentPrices } = await supabase
    .from('component_pricing')
    .select('*')
    .order('display_order');

  console.log('CURRENT PRICES:');
  currentPrices?.forEach(c => {
    console.log(`${c.component_name.padEnd(15)} ${c.component_type_slug.padEnd(10)} $${(c.base_price_cents / 100).toLocaleString('es-CL')}`);
  });

  // Update prices
  const updates = [
    { type_slug: 'socks', price: 3000000 },    // $30,000
    { type_slug: 'shorts', price: 4000000 },   // $40,000
    { type_slug: 'jersey', price: 7000000 },   // $70,000
    { type_slug: 'pants', price: 10000000 },   // $100,000
    { type_slug: 'jacket', price: 12000000 },  // $120,000
    { type_slug: 'bag', price: 12000000 }      // $120,000
  ];

  console.log('\nApplying updates...');

  for (const { type_slug, price } of updates) {
    const { error } = await supabase
      .from('component_pricing')
      .update({
        base_price_cents: price,
        updated_at: new Date().toISOString()
      })
      .eq('component_type_slug', type_slug);

    if (error) {
      console.error(`Error updating ${type_slug}:`, error.message);
    } else {
      console.log(`✓ Updated ${type_slug} to $${(price / 100).toLocaleString('es-CL')}`);
    }
  }

  // Show new prices
  const { data: newPrices } = await supabase
    .from('component_pricing')
    .select('*')
    .order('display_order');

  console.log('\nNEW PRICES:');
  newPrices?.forEach(c => {
    console.log(`${c.component_name.padEnd(15)} ${c.component_type_slug.padEnd(10)} $${(c.base_price_cents / 100).toLocaleString('es-CL')}`);
  });

  console.log('\n✅ Component prices fixed!');
}

fixComponentPrices();
