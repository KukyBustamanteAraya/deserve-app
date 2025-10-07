import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data: products } = await supabase
  .from('products')
  .select('id, name, product_type_slug, price_cents, retail_price_cents, base_price_cents')
  .eq('status', 'active')
  .order('id');

console.log('Product Price Fields Comparison:\n');
products?.forEach(p => {
  const hasDiscrepancy = p.price_cents !== p.retail_price_cents || p.retail_price_cents !== p.base_price_cents;
  if (hasDiscrepancy) {
    console.log(`❌ ID ${p.id}: ${p.name} (${p.product_type_slug})`);
    console.log(`   price_cents: $${(p.price_cents / 100).toLocaleString('es-CL')}`);
    console.log(`   retail_price_cents: $${(p.retail_price_cents / 100).toLocaleString('es-CL')}`);
    console.log(`   base_price_cents: $${(p.base_price_cents / 100).toLocaleString('es-CL')}\n`);
  } else {
    console.log(`✓ ID ${p.id}: ${p.name} - All fields match at $${(p.price_cents / 100).toLocaleString('es-CL')}`);
  }
});
