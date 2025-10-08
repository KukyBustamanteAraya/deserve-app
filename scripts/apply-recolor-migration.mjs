import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = join(__dirname, '../supabase/migrations/026_recolor_system.sql');
    const sql = readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying recolor system migration...');
    console.log('This will add:');
    console.log('  - render_spec, output_url, mockup_urls to design_requests');
    console.log('  - priority, version, admin_comments to design_requests');
    console.log('  - design_request_activity table');
    console.log('  - admin_notes, tracking_number, estimated_delivery to orders');
    console.log('  - renders storage bucket\n');

    // Note: Supabase JS client doesn't support raw SQL directly
    // You'll need to run this via Supabase Studio SQL Editor or CLI
    console.log('⚠️  Please apply this migration via:');
    console.log('   1. Supabase Studio → SQL Editor');
    console.log('   2. Copy contents of: supabase/migrations/026_recolor_system.sql');
    console.log('   3. Run the SQL\n');

    console.log('📄 Migration file location:');
    console.log(`   ${migrationPath}\n`);

    console.log('✅ Migration file is ready to apply!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

applyMigration();
