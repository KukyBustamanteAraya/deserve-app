/**
 * Script to check database column names and apply the _cents to _clp migration if needed
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixColumns() {
  console.log('🔍 Checking database column names...\n');

  try {
    // Test query to see which columns exist
    console.log('Testing orders table columns...');
    const { data: testOrder, error: testError } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
      .single();

    if (testError && testError.code !== 'PGRST116') {
      console.error('❌ Error querying orders:', testError);
      return;
    }

    if (testOrder) {
      console.log('Sample order columns:', Object.keys(testOrder));

      // Check if we have _cents or _clp columns
      const hasCentsColumns = 'total_amount_cents' in testOrder || 'subtotal_cents' in testOrder;
      const hasClpColumns = 'total_amount_clp' in testOrder || 'subtotal_clp' in testOrder;

      console.log('\n📊 Column naming status:');
      console.log(`  Has _cents columns: ${hasCentsColumns}`);
      console.log(`  Has _clp columns: ${hasClpColumns}`);

      if (hasCentsColumns && !hasClpColumns) {
        console.log('\n⚠️  Database still uses _cents columns. Migration needs to be applied.');
        console.log('\n📝 To apply the migration:');
        console.log('   1. Go to your Supabase dashboard');
        console.log('   2. Navigate to SQL Editor');
        console.log('   3. Run the migration file: supabase/migrations/20251014_rename_cents_to_clp.sql');
      } else if (hasClpColumns) {
        console.log('\n✅ Database is using _clp columns correctly!');

        // If we have _clp columns but seeing $0, check if there's actual data
        if (testOrder) {
          console.log('\n💰 Sample order pricing:');
          console.log(`  total_amount_clp: ${testOrder.total_amount_clp}`);
          console.log(`  subtotal_clp: ${testOrder.subtotal_clp}`);
          console.log(`  discount_clp: ${testOrder.discount_clp}`);
          console.log(`  tax_clp: ${testOrder.tax_clp}`);
          console.log(`  shipping_clp: ${testOrder.shipping_clp}`);

          if (testOrder.total_amount_clp === 0 || testOrder.total_amount_clp === null) {
            console.log('\n⚠️  Total amount is 0 or null. This order may not have pricing set.');
          }
        }
      }
    } else {
      console.log('ℹ️  No orders found in database yet.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndFixColumns();
