#!/usr/bin/env tsx
/**
 * Script to run migration 047: Diagnose and fix schema inconsistencies
 * Usage: npx tsx scripts/run-migration-047.ts
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
  console.log('🔍 Running migration 047: Diagnose and fix schema...\n');

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/047_diagnose_and_fix_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    });

    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('ℹ️  exec_sql RPC not available, trying direct query...');
      const { error: queryError } = await supabase
        .from('_migrations')
        .select('*')
        .limit(1);

      if (queryError) {
        throw new Error(`Cannot execute migration: ${queryError.message}`);
      }

      // For now, just log the migration content
      console.log('📄 Migration content loaded, but cannot execute automatically.');
      console.log('\n⚠️  Please apply this migration manually:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to SQL Editor');
      console.log('   3. Copy and run the SQL from: supabase/migrations/047_diagnose_and_fix_schema.sql');
      console.log('\nOr use the Supabase CLI if available.');
      return;
    }

    console.log('✅ Migration 047 executed successfully!');
    console.log('\n📊 Check the console output above for diagnostic information.');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
