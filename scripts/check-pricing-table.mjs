import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking for pricing_tiers table...');

const { data, error } = await supabase
  .from('pricing_tiers')
  .select('*')
  .limit(1);

if (error) {
  console.log('Table does not exist or has no data:', error.message);
} else {
  console.log('Table exists! Sample data:', data);
}
