// POST /api/teams/leave - Leave current team
import { NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { LeaveTeamResponse } from '@/types/user';
import type { ApiResponse } from '@/types/api';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
export async function POST() {
  try {
    const supabase = await createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Get user's current team
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('team_id, role')
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      logger.error('Error finding team membership:', toError(membershipError));
      return NextResponse.json(
        { error: 'No team found to leave' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Don't allow team owners to leave
    if (membership.role === 'owner') {
      return NextResponse.json(
        { error: 'Team owners cannot leave their team. Please transfer ownership first.' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const teamId = membership.team_id;

    // Delete from team_players (mini field)
    const { error: playersError } = await supabase
      .from('team_players')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (playersError) {
      logger.error('Error removing from team_players:', playersError);
      // Continue anyway - not critical
    }

    // Delete from player_info_submissions (roster)
    const { error: submissionsError } = await supabase
      .from('player_info_submissions')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (submissionsError) {
      logger.error('Error removing from player_info_submissions:', submissionsError);
      // Continue anyway - not critical
    }

    // Finally, remove team membership
    const { error: deleteError } = await supabase
      .from('team_memberships')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (deleteError) {
      logger.error('Error removing team membership:', toSupabaseError(deleteError));
      return NextResponse.json(
        { error: 'Failed to leave team', message: deleteError.message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    logger.debug(`User ${user.id} successfully left team ${teamId}`);

    return NextResponse.json({
      data: {
        success: true,
        message: 'Successfully left the team'
      } as LeaveTeamResponse,
      message: 'Successfully left the team'
    } as ApiResponse<LeaveTeamResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    logger.error('Unexpected error in team leave:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}