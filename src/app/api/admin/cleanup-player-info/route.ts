import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Delete duplicate submissions (keep most recent per user per team)
    const { error: deleteError } = await supabase.rpc('delete_duplicate_player_info');

    if (deleteError) {
      logger.error('Error deleting duplicates:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Step 2: Apply unique constraint
    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE UNIQUE INDEX IF NOT EXISTS idx_player_info_unique_user_team
          ON public.player_info_submissions(user_id, team_id)
          WHERE user_id IS NOT NULL;
      `
    });

    if (constraintError) {
      logger.error('Error adding constraint:', constraintError);
    }

    // Step 3: Add UPDATE policy if not exists
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "Users can update own player info" ON public.player_info_submissions;

        CREATE POLICY "Users can update own player info"
          ON public.player_info_submissions
          FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
      `
    });

    if (policyError) {
      logger.error('Error adding policy:', policyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Duplicates cleaned and constraint applied'
    });
  } catch (error: any) {
    logger.error('Cleanup error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
