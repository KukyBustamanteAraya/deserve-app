import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://tirhnanxmjsasvhfphbq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcmhuYW54bWpzYXN2aGZwaGJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODc3MTUsImV4cCI6MjA3MzI2MzcxNX0.3vlfygjKY-9XU-JGTBmOqxPiv2pu2TEDsucVVZYHQU4'
);

const sql = readFileSync('./scripts/apply-core-schema.sql', 'utf8');

console.log('Applying core schema migration...');

// Split SQL by semicolons and execute each statement
const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0 && !s.startsWith('--'));

for (const statement of statements) {
  if (statement) {
    console.log(`\nExecuting: ${statement.substring(0, 60)}...`);
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      console.error(`Error:`, error);
      // Continue on IF NOT EXISTS / IF EXISTS errors
      if (!error.message?.includes('already exists') && !error.message?.includes('does not exist')) {
        process.exit(1);
      }
    } else {
      console.log('✓ Success');
    }
  }
}

console.log('\n✅ Migration completed!');
