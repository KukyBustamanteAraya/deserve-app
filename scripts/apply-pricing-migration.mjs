import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const migration = readFileSync('./supabase/migrations/016_pricing_tiers.sql', 'utf8');

console.log('Applying pricing_tiers migration...');

// Split migration into individual statements
const statements = migration
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  if (statement.trim()) {
    console.log('Executing:', statement.substring(0, 100) + '...');
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    if (error) {
      console.error('Error:', error);
    }
  }
}

console.log('Migration complete!');
