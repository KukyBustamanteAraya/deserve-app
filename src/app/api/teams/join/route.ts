// POST /api/teams/join - Join team by invite code
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { JoinTeamRequest, JoinTeamResponse } from '@/types/user';
import type { ApiResponse } from '@/types/api';
import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse request body
    const body: JoinTeamRequest = await request.json();
    const { code } = body;

    // Validate input
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invite code is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check if user is already in a team
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (userProfile?.team_id) {
      return NextResponse.json(
        { error: 'You are already in a team. Leave your current team first.' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Use the RPC function to join the team
    const { data: result, error } = await supabase
      .rpc('team_join_by_code', { invite_code: code.trim().toUpperCase() });

    if (error) {
      logger.error('Error joining team:', error);
      return NextResponse.json(
        { error: 'Failed to join team', message: error.message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check if the RPC returned an error
    if (result && !result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to join team',
          message: result.error
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Get updated team details
    const { data: teamData, error: teamError } = await supabase
      .from('teams_with_details')
      .select('*')
      .eq('id', result.team.id)
      .single();

    if (teamError) {
      logger.error('Error fetching team details:', teamError);
      // Still return success since the join operation succeeded
      return NextResponse.json({
        data: {
          success: true,
          team: result.team
        } as JoinTeamResponse,
        message: 'Successfully joined team'
      } as ApiResponse<JoinTeamResponse>);
    }

    return NextResponse.json({
      data: {
        success: true,
        team: teamData
      } as JoinTeamResponse,
      message: 'Successfully joined team'
    } as ApiResponse<JoinTeamResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    logger.error('Unexpected error in team join:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}