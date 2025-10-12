#!/usr/bin/env node
/**
 * Fix Basketball mockup to be primary
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixBasketballMockup() {
  console.log('🔧 Fixing Basketball mockup to be primary...\n');

  // Update the Basketball mockup to be primary
  const { data, error } = await supabase
    .from('design_mockups')
    .update({ is_primary: true })
    .eq('id', '5b31d81a-fda6-4fcb-8abe-023051a73356')
    .eq('sport_id', 2)
    .select();

  if (error) {
    console.error('❌ Error updating mockup:', error);
    process.exit(1);
  }

  console.log('✅ Successfully updated Basketball mockup to primary');
  console.log('Updated row:', data);
  console.log('\n✅ Done! Basketball designs should now appear in the catalog.');
}

fixBasketballMockup().catch(console.error);
