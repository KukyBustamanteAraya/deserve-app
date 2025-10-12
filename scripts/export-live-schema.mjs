#!/usr/bin/env node
/**
 * Export Live Schema from Supabase
 * Queries the actual database to get current state
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
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

async function exportSchema() {
  console.log('🔍 Querying live database schema...\n');

  const report = {
    timestamp: new Date().toISOString(),
    database_url: SUPABASE_URL,
    tables: {}
  };

  try {
    // 1. Get all sports
    console.log('📊 Querying sports table...');
    const { data: sports, error: sportsError } = await supabase
      .from('sports')
      .select('*')
      .order('slug');

    if (sportsError) {
      console.error('❌ Error querying sports:', sportsError.message);
    } else {
      report.tables.sports = {
        count: sports?.length || 0,
        data: sports
      };
      console.log(`✅ Found ${sports?.length || 0} sports:`);
      sports?.forEach(sport => console.log(`   - ${sport.slug}: ${sport.display_name}`));
    }

    // 2. Get teams table structure
    console.log('\n📊 Querying teams table...');
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('*')
      .limit(5);

    if (teamsError) {
      console.error('❌ Error querying teams:', teamsError.message);
    } else {
      report.tables.teams = {
        count: teams?.length || 0,
        sample_columns: teams?.[0] ? Object.keys(teams[0]) : [],
        sample_data: teams
      };
      console.log(`✅ Teams table columns:`, Object.keys(teams?.[0] || {}));
    }

    // 3. Get product_types
    console.log('\n📊 Querying product_types table...');
    const { data: productTypes, error: ptError } = await supabase
      .from('product_types')
      .select('slug, display_name, category')
      .order('slug');

    if (ptError) {
      console.error('❌ Error querying product_types:', ptError.message);
    } else {
      report.tables.product_types = {
        count: productTypes?.length || 0,
        data: productTypes
      };
      console.log(`✅ Found ${productTypes?.length || 0} product types`);
    }

    // 4. Get table list from information_schema
    console.log('\n📊 Querying table list...');
    const { data: tablesInfo, error: tablesInfoError } = await supabase
      .rpc('get_public_tables');

    if (tablesInfoError) {
      console.log('⚠️  Could not query table list (RPC not available)');
    } else {
      report.all_tables = tablesInfo;
    }

    // 5. Write report to file
    const reportPath = join(__dirname, '../LIVE_SCHEMA.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');

    console.log('\n✅ Schema export complete!');
    console.log(`📄 Report saved to: LIVE_SCHEMA.json`);
    console.log('\n📋 Summary:');
    console.log(`   Sports: ${report.tables.sports?.count || 0}`);
    console.log(`   Product Types: ${report.tables.product_types?.count || 0}`);
    console.log(`   Teams (sample): ${report.tables.teams?.count || 0}`);

  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportSchema();
