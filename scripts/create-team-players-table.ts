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

async function createTeamPlayersTable() {
  console.log('🔧 Creating team_players table and applying migrations...\n');

  const sql = `
    -- Create team_players table for storing team roster information
    CREATE TABLE IF NOT EXISTS team_players (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      player_name TEXT NOT NULL,
      jersey_number TEXT,
      position TEXT,
      size TEXT,
      is_starter BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      -- Ensure one player record per user per team
      UNIQUE(team_id, user_id)
    );

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON team_players(team_id);
    CREATE INDEX IF NOT EXISTS idx_team_players_user_id ON team_players(user_id);

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view team players if they are team members" ON team_players;
    DROP POLICY IF EXISTS "Users can insert their own player record" ON team_players;
    DROP POLICY IF EXISTS "Users can update their own player record" ON team_players;
    DROP POLICY IF EXISTS "Team managers can update any player record" ON team_players;

    -- Enable RLS
    ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;

    -- Users can view players on teams they're members of
    CREATE POLICY "Users can view team players if they are team members"
      ON team_players FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM team_memberships
          WHERE team_memberships.team_id = team_players.team_id
          AND team_memberships.user_id = auth.uid()
        )
      );

    -- Users can insert their own player record
    CREATE POLICY "Users can insert their own player record"
      ON team_players FOR INSERT
      WITH CHECK (user_id = auth.uid());

    -- Users can update their own player record
    CREATE POLICY "Users can update their own player record"
      ON team_players FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Team managers can update any player record on their team
    CREATE POLICY "Team managers can update any player record"
      ON team_players FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM team_memberships
          WHERE team_memberships.team_id = team_players.team_id
          AND team_memberships.user_id = auth.uid()
          AND team_memberships.role IN ('owner', 'manager')
        )
      );

    -- Add comment
    COMMENT ON TABLE team_players IS 'Stores player-specific information for team members (roster data)';
  `;

  try {
    // Use SQL execution via a direct query
    const { error } = await supabase.rpc('exec_sql' as any, { sql_query: sql } as any);

    if (error) {
      // If RPC doesn't exist, try to verify the table exists by querying it
      console.log('⚠️  Cannot execute SQL via RPC. Trying to verify table...');

      const { error: checkError } = await supabase
        .from('team_players')
        .select('id')
        .limit(1);

      if (checkError && checkError.message.includes('does not exist')) {
        console.error('❌ team_players table does not exist.');
        console.error('\n📋 Please run this SQL manually in your Supabase SQL Editor:');
        console.error('\n' + sql);
        console.error('\n📍 To access SQL Editor:');
        console.error('   1. Go to https://supabase.com/dashboard');
        console.error('   2. Select your project');
        console.error('   3. Click "SQL Editor" in the left sidebar');
        console.error('   4. Click "+ New query"');
        console.error('   5. Paste the SQL above and click "Run"');
        process.exit(1);
      } else {
        console.log('✅ team_players table already exists!');
      }
    } else {
      console.log('✅ team_players table created successfully!');
    }

    // Verify the table exists and is accessible
    const { data, error: selectError } = await supabase
      .from('team_players')
      .select('id')
      .limit(1);

    if (selectError) {
      console.error('❌ Error verifying team_players table:', selectError.message);
      console.error('\n📋 Please run the migration manually in Supabase Dashboard.');
      process.exit(1);
    }

    console.log('✅ Verified: team_players table exists and is accessible');
    console.log('\n🎉 Migration complete! The setup wizard should now work correctly.\n');

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    console.error('\n📋 Please run the migration manually in Supabase Dashboard SQL Editor:');
    console.error('\n' + sql);
    process.exit(1);
  }
}

createTeamPlayersTable();
