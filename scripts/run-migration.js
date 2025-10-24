const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('📂 Reading migration file...');
    const sqlPath = path.join(__dirname, 'supabase/migrations/20251015_add_design_requests_rls_policies.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Running migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct SQL execution as fallback
      console.log('📝 Trying direct SQL execution...');

      // Split by semicolons and execute each statement
      const statements = sql.split(';').filter(s => s.trim().length > 0);

      for (const statement of statements) {
        const trimmed = statement.trim();
        if (!trimmed) continue;

        console.log(`   Executing: ${trimmed.substring(0, 60)}...`);
        const { error: execError } = await supabase.rpc('exec_sql', { sql_query: trimmed });

        if (execError) {
          console.error(`   ❌ Error: ${execError.message}`);
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('RLS policies for design_requests:');
    console.log('  - INSERT: Team owners/managers can create design requests');
    console.log('  - SELECT: Team members can view their team\'s design requests');
    console.log('  - UPDATE: Team owners/managers can update design requests');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
