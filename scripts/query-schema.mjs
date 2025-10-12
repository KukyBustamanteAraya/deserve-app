#!/usr/bin/env node
/**
 * Query Live Schema Utility
 *
 * Safely queries the live Supabase database for schema information
 * Usage: node scripts/query-schema.mjs [table_name]
 *
 * Examples:
 *   node scripts/query-schema.mjs sports
 *   node scripts/query-schema.mjs teams
 *   node scripts/query-schema.mjs all
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '../.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Get table name from command line
const tableName = process.argv[2];

if (!tableName) {
  console.error('❌ Usage: node scripts/query-schema.mjs [table_name]');
  console.error('   Examples: sports, teams, product_types, all');
  process.exit(1);
}

async function queryTable(table) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 TABLE: ${table}`);
  console.log('='.repeat(80));

  try {
    // Get all data from table
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('id', { ascending: true })
      .limit(100);

    if (error) {
      console.error(`❌ Error querying ${table}:`, error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.log(`⚠️  Table ${table} is empty or does not exist`);
      return;
    }

    console.log(`✅ Found ${data.length} row(s)\n`);

    // Show column names
    const columns = Object.keys(data[0]);
    console.log('📋 Columns:', columns.join(', '));
    console.log('');

    // Show data as table
    console.table(data);

    // Show CREATE TABLE hint
    console.log(`\n💡 To get the CREATE TABLE statement, run:`);
    console.log(`   SELECT column_name, data_type, is_nullable, column_default`);
    console.log(`   FROM information_schema.columns`);
    console.log(`   WHERE table_name = '${table}' AND table_schema = 'public'`);
    console.log(`   ORDER BY ordinal_position;`);

  } catch (err) {
    console.error(`❌ Unexpected error:`, err);
  }
}

async function main() {
  console.log('🔍 Querying live Supabase database...');
  console.log(`📍 Database: ${SUPABASE_URL}`);

  if (tableName === 'all') {
    // Query key tables
    const tables = ['sports', 'teams', 'product_types', 'team_settings', 'player_info_submissions'];
    for (const table of tables) {
      await queryTable(table);
    }
  } else {
    await queryTable(tableName);
  }

  console.log('\n✅ Query complete!\n');
}

main();
