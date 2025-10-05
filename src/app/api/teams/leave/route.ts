// POST /api/teams/leave - Leave current team
import { NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { LeaveTeamResponse } from '@/types/user';
import type { ApiResponse } from '@/types/api';
export async function POST() {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Use the RPC function to leave the team
    const { data: result, error } = await supabase
      .rpc('team_leave');

    if (error) {
      console.error('Error leaving team:', error);
      return NextResponse.json(
        { error: 'Failed to leave team', message: error.message } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check if the RPC returned an error
    if (result && !result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to leave team',
          message: result.error
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: {
        success: true,
        message: result.message || 'Successfully left the team'
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

    console.error('Unexpected error in team leave:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}