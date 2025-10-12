import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch invite by token
    const { data: invite, error } = await supabase
      .from('team_invites')
      .select(`
        id,
        team_id,
        player_submission_id,
        email,
        role,
        status,
        expires_at,
        created_at
      `)
      .eq('token', params.token)
      .single();

    if (error || !invite) {
      console.error('[Invite GET] Error fetching invite:', error);
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Fetch team details
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, slug')
      .eq('id', invite.team_id)
      .single();

    if (teamError) {
      console.error('[Invite GET] Error fetching team:', teamError);
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Fetch player details if linked to a player submission
    let player = null;
    if (invite.player_submission_id) {
      const { data: playerData, error: playerError } = await supabase
        .from('player_info_submissions')
        .select('id, player_name')
        .eq('id', invite.player_submission_id)
        .single();

      if (!playerError && playerData) {
        player = playerData;
      }
    }

    return NextResponse.json({
      success: true,
      invite: {
        ...invite,
        team,
        player
      }
    });
  } catch (error: any) {
    console.error('[Invite GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
