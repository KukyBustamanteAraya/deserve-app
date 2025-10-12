import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function applyPolicyFix() {
  console.log('🔧 Applying RLS policy fix for authenticated collection submissions...\n');

  try {
    // Drop existing policy
    console.log('1. Dropping existing policy...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP POLICY IF EXISTS "player_info_authenticated_insert" ON public.player_info_submissions;'
    });

    if (dropError && !dropError.message.includes('does not exist')) {
      throw dropError;
    }
    console.log('✅ Policy dropped\n');

    // Create new policy
    console.log('2. Creating new policy with collection link support...');
    const createPolicySQL = `
      CREATE POLICY "player_info_authenticated_insert"
        ON public.player_info_submissions
        FOR INSERT
        TO authenticated
        WITH CHECK (
          submission_token IS NOT NULL
          OR
          (user_id = auth.uid() OR user_id IS NULL)
          OR
          submitted_by_manager = true
        );
    `;

    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: createPolicySQL
    });

    if (createError) {
      throw createError;
    }
    console.log('✅ Policy created\n');

    console.log('🎉 RLS policy fix applied successfully!');
    console.log('\nThe policy now allows:');
    console.log('  - Collection link submissions (even if user is logged in)');
    console.log('  - Self-inserts for authenticated users');
    console.log('  - Manager inserts for players');

  } catch (error) {
    console.error('❌ Error applying policy fix:', error);
    console.error('\nPlease run this SQL manually in Supabase Dashboard SQL Editor:');
    console.error('\n' + fs.readFileSync(join(__dirname, 'fix_rls_policy.sql'), 'utf8'));
    process.exit(1);
  }
}

applyPolicyFix();
