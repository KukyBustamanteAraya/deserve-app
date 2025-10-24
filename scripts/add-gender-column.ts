import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function addGenderColumn() {
  console.log('🔧 Adding gender column to teams table...\n');

  const sql = `
    -- Add gender column to teams table
    ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'mixed'));

    -- Add comment to document the column
    COMMENT ON COLUMN teams.gender IS 'Team gender (male/female/mixed) - used for product filtering';
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct approach if RPC doesn't exist
      console.log('Trying direct SQL execution...');
      const { error: directError } = await supabase
        .from('teams')
        .select('gender')
        .limit(1);

      if (directError && directError.message.includes("column") && directError.message.includes("does not exist")) {
        console.error('❌ Cannot add column directly via Supabase client.');
        console.error('   Please run the migration manually via Supabase Dashboard:');
        console.error('\n   SQL to execute:');
        console.error('   ' + sql.trim().split('\n').join('\n   '));
        console.error('\n   Or use: npm run db:migrate');
        process.exit(1);
      } else {
        console.log('✅ Gender column already exists or was added successfully!');
      }
    } else {
      console.log('✅ Gender column added successfully!');
    }

    // Verify the column exists
    const { data: teams, error: selectError } = await supabase
      .from('teams')
      .select('id, gender')
      .limit(1);

    if (selectError) {
      console.error('❌ Error verifying gender column:', selectError.message);
      process.exit(1);
    }

    console.log('✅ Verified: gender column exists and is accessible');
    console.log('\n🎉 Migration complete! You can now create teams with gender selection.\n');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    console.error('\nPlease run the migration manually via Supabase Dashboard SQL Editor:');
    console.error('\n' + sql);
    process.exit(1);
  }
}

addGenderColumn();
