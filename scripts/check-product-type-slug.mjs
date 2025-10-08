import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data: products } = await supabase
  .from('products')
  .select('id, name, product_type_slug, category, price_cents, retail_price_cents')
  .eq('status', 'active')
  .order('id');

console.log('Product type_slug status:\n');
products?.forEach(p => {
  const hasTypeSlug = !!p.product_type_slug;
  const symbol = hasTypeSlug ? '✓' : '❌';
  console.log(`${symbol} ID ${p.id}: ${p.name.padEnd(20)} type_slug=${(p.product_type_slug || 'NULL').padEnd(10)} category=${p.category.padEnd(10)} retail_price=$${(p.retail_price_cents / 100).toLocaleString('es-CL')}`);
});
