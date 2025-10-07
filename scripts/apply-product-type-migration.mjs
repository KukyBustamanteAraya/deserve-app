import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const migration = readFileSync('./supabase/migrations/018_product_type_slug.sql', 'utf8');

console.log('Applying product_type_slug migration...');

// Split by semicolon and execute each statement
const statements = migration.split(';').filter(s => s.trim());

for (const statement of statements) {
  if (statement.trim()) {
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
    if (error) {
      console.error('Error executing statement:', error);
      console.log('Statement was:', statement);
    } else {
      console.log('✓ Statement executed successfully');
    }
  }
}

console.log('Migration complete!');
