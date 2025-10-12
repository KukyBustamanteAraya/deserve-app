#!/usr/bin/env node

/**
 * Apply migration 054 directly to Supabase via SQL Editor
 *
 * This script outputs the exact SQL commands that need to be run
 * in the Supabase SQL Editor to apply migration 054.
 *
 * Usage: node scripts/apply-migration-054.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('');
console.log('========================================');
console.log('  Migration 054: Design Request Reactions');
console.log('========================================');
console.log('');
console.log('This migration adds:');
console.log('  • Reactions table (likes/dislikes on design requests)');
console.log('  • RLS policies for team-based reactions');
console.log('  • Updated INSERT policy to allow ANY team member to create design requests');
console.log('  • Helper view for reaction counts');
console.log('');
console.log('----------------------------------------');
console.log('OPTION 1: Apply via Supabase Dashboard (RECOMMENDED)');
console.log('----------------------------------------');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new');
console.log('2. Copy the SQL from: supabase/migrations/054_design_request_reactions.sql');
console.log('3. Paste into the SQL Editor');
console.log('4. Click "Run"');
console.log('');
console.log('----------------------------------------');
console.log('OPTION 2: Copy SQL to clipboard');
console.log('----------------------------------------');
console.log('');

// Read the migration file
const migrationPath = join(__dirname, '../supabase/migrations/054_design_request_reactions.sql');
let migrationSQL;
try {
  migrationSQL = readFileSync(migrationPath, 'utf8');
  console.log('✅ Migration file loaded successfully');
  console.log('');
  console.log('SQL content ready. Here are the key sections:');
  console.log('');

  // Parse and show sections
  const sections = [
    'PART 1: Create design_request_reactions table',
    'PART 2: RLS Policies for reactions',
    'PART 3: Update design_requests RLS to allow team members to create',
    'PART 4: Helper view for reaction counts'
  ];

  sections.forEach((section, index) => {
    console.log(`  ${index + 1}. ${section}`);
  });

  console.log('');
  console.log('Full SQL:');
  console.log('=========');
  console.log(migrationSQL);
  console.log('=========');
  console.log('');

} catch (error) {
  console.error('❌ Error reading migration file:', error.message);
  process.exit(1);
}

console.log('');
console.log('After running the migration:');
console.log('  1. Test creating a design request as a PLAYER');
console.log('  2. Test adding reactions (likes/dislikes)');
console.log('  3. Check team page shows all design requests');
console.log('');
