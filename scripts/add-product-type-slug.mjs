import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

console.log('Checking and updating product_type_slug for all products...');

// Get all products
const { data: products, error: fetchError } = await supabase
  .from('products')
  .select('id, category');

if (fetchError) {
  console.error('Error fetching products:', fetchError);
  process.exit(1);
}

console.log(`Found ${products.length} products`);

// Map category to product_type_slug
const categoryMap = {
  'camiseta': 'jersey',
  'short': 'shorts',
  'calcetines': 'socks',
  'pantalon': 'pants',
  'poleron': 'jacket',
  'bolso': 'bag'
};

// Update each product
for (const product of products) {
  const product_type_slug = categoryMap[product.category] || product.category;

  const { error: updateError } = await supabase
    .from('products')
    .update({ product_type_slug })
    .eq('id', product.id);

  if (updateError) {
    console.error(`Error updating product ${product.id}:`, updateError);
  } else {
    console.log(`✓ Updated product ${product.id}: ${product.category} → ${product_type_slug}`);
  }
}

console.log('Done!');
