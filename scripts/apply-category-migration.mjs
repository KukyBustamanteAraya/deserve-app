import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applyMigration() {
  console.log('Applying category constraint migration...\n');

  try {
    // Step 1: Drop existing constraint
    console.log('Step 1: Dropping old constraint...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_allowed;'
    });

    // Step 2: Add temporary constraint
    console.log('Step 2: Adding temporary constraint...');
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE products ADD CONSTRAINT products_category_allowed
            CHECK (category IN ('jersey', 'shorts', 'socks', 'jacket', 'pants', 'bag', 'camiseta', 'poleron', 'medias', 'chaqueta'));`
    });

    // Step 3: Update existing products
    console.log('Step 3: Migrating existing product categories...');

    const updates = [
      { from: 'camiseta', to: 'jersey' },
      { from: 'chaqueta', to: 'jacket' },
      { from: 'medias', to: 'socks' },
      { from: 'poleron', to: 'jacket' },
    ];

    for (const { from, to } of updates) {
      const { error } = await supabase
        .from('products')
        .update({ category: to })
        .eq('category', from);

      if (error) {
        console.error(`Error updating ${from} to ${to}:`, error.message);
      } else {
        console.log(`✓ Updated ${from} → ${to}`);
      }
    }

    // Step 4: Drop temp constraint and add final one
    console.log('Step 4: Updating constraint to final values...');
    await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_allowed;'
    });

    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE products ADD CONSTRAINT products_category_allowed
            CHECK (category IN ('jersey', 'shorts', 'socks', 'jacket', 'pants', 'bag'));`
    });

    // Verify
    const { data: products } = await supabase
      .from('products')
      .select('id, name, category, product_type_slug')
      .order('id');

    console.log('\nMigrated products:');
    products?.forEach(p => {
      console.log(`ID ${p.id}: ${p.name.padEnd(20)} category=${p.category.padEnd(10)} type_slug=${p.product_type_slug || 'null'}`);
    });

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

applyMigration();
