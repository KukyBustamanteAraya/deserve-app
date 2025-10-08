import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixAllProducts() {
  console.log('Fixing all products...\n');

  // Step 1: Get all products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('id');

  console.log(`Found ${products?.length || 0} products\n`);

  // Step 2: Update each product
  for (const product of products || []) {
    console.log(`\nProcessing ID ${product.id}: ${product.name}`);
    console.log(`  Current: category="${product.category}", type_slug="${product.product_type_slug}", price=${product.price_cents}`);

    // Determine the correct category from product_type_slug or vice versa
    let newCategory = product.category;
    let newTypeSlug = product.product_type_slug;

    // If category is old value, update it
    if (product.category === 'camiseta') {
      newCategory = 'jersey';
      newTypeSlug = 'jersey';
    } else if (product.category === 'poleron') {
      newCategory = 'jacket';
      newTypeSlug = 'jacket';
    } else if (product.category === 'medias') {
      newCategory = 'socks';
      newTypeSlug = 'socks';
    } else if (product.category === 'chaqueta') {
      newCategory = 'jacket';
      newTypeSlug = 'jacket';
    }

    // Ensure product_type_slug matches category
    if (!newTypeSlug) {
      newTypeSlug = newCategory;
    }

    // Get correct price from component_pricing
    const { data: componentPricing } = await supabase
      .from('component_pricing')
      .select('base_price_cents')
      .eq('component_type_slug', newTypeSlug)
      .single();

    if (!componentPricing) {
      console.log(`  ❌ No component pricing found for ${newTypeSlug}`);
      continue;
    }

    const correctPrice = componentPricing.base_price_cents;

    // Update the product
    const { error } = await supabase
      .from('products')
      .update({
        category: newCategory,
        product_type_slug: newTypeSlug,
        price_cents: correctPrice,
        retail_price_cents: correctPrice,
        base_price_cents: correctPrice
      })
      .eq('id', product.id);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✓ Updated: category="${newCategory}", type_slug="${newTypeSlug}", price=$${(correctPrice / 100).toLocaleString('es-CL')}`);
    }
  }

  console.log('\n✅ All products updated!');

  // Show final state
  const { data: finalProducts } = await supabase
    .from('products')
    .select('id, name, category, product_type_slug, price_cents')
    .order('id');

  console.log('\nFinal Product State:');
  finalProducts?.forEach(p => {
    console.log(`  ID ${p.id}: ${p.name.padEnd(20)} category=${p.category.padEnd(10)} type_slug=${p.product_type_slug.padEnd(10)} price=$${(p.price_cents / 100).toLocaleString('es-CL')}`);
  });
}

fixAllProducts();
