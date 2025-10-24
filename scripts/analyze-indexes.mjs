import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function analyzeIndexes() {
  console.log('🔍 Analyzing database indexes...\n');

  // Query to get all indexes
  const { data: indexes, error: indexError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `
  });

  if (indexError) {
    console.error('Error querying indexes:', indexError);
    // Try alternative query method
    console.log('\nTrying alternative method...\n');

    // Get tables
    const { data: tables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    console.log('📋 Tables in database:');
    if (tables) {
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }
  } else {
    console.log('📊 Current Indexes:');
    console.log(JSON.stringify(indexes, null, 2));
  }
}

analyzeIndexes().catch(console.error);
