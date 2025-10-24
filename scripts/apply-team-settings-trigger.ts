#!/usr/bin/env tsx
/**
 * Script to apply team_settings auto-create trigger
 * Fixes the 406 error for new teams by automatically creating team_settings records
 * Usage: npx tsx scripts/apply-team-settings-trigger.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function runMigration() {
  console.log('🔧 Applying team_settings auto-create trigger...\n');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251016_auto_create_team_settings.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // If exec_sql doesn't exist, provide manual instructions
      console.log('ℹ️  exec_sql RPC not available, manual application required.');
      console.log('\n📋 Please apply this migration manually:');
      console.log('   1. Go to your Supabase dashboard (https://supabase.com/dashboard)');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy and run the SQL from: supabase/migrations/20251016_auto_create_team_settings.sql');
      console.log('\n📄 Migration summary:');
      console.log('   - Creates function: create_team_settings_for_new_team()');
      console.log('   - Creates trigger: create_team_settings_trigger');
      console.log('   - Backfills existing teams without settings');
      console.log('   - Verifies trigger installation');
      console.log('\n✅ After applying, new teams will automatically get team_settings records');
      console.log('✅ This eliminates the 406 error when querying team_settings');
      return;
    }

    console.log('✅ Migration applied successfully!');
    console.log('\n📊 What changed:');
    console.log('   ✓ Auto-create function created');
    console.log('   ✓ Trigger installed on teams table');
    console.log('   ✓ Existing teams backfilled');
    console.log('\n🧪 Test by creating a new team - team_settings should be auto-created');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.log('\n💡 Fallback: Apply manually through Supabase Dashboard');
    process.exit(1);
  }
}

// Run the migration
runMigration();
