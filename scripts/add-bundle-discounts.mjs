import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Adding discount_pct to bundles...');

const bundleDiscounts = [
  { code: 'B1', discount_pct: 5 },
  { code: 'B2', discount_pct: 7 },
  { code: 'B3', discount_pct: 5 },
  { code: 'B4', discount_pct: 6 },
  { code: 'B5', discount_pct: 8 },
  { code: 'B6', discount_pct: 10 },
];

for (const { code, discount_pct } of bundleDiscounts) {
  const { error } = await supabase
    .from('bundles')
    .update({ discount_pct })
    .eq('code', code);

  if (error) {
    console.error(`Error updating ${code}:`, error.message);
  } else {
    console.log(`✓ ${code} → ${discount_pct}%`);
  }
}

console.log('Done!');
