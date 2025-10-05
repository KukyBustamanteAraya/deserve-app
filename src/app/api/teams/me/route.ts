// GET /api/teams/me - Get current user's team and profile
import { NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { TeamMeResponse } from '@/types/user';
import type { ApiResponse } from '@/types/api';
export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Get user profile first
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch profile' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // If user has no team, return profile only
    if (!profile.team_id) {
      return NextResponse.json({
        data: {
          team: null,
          profile: profile
        } as TeamMeResponse,
        message: 'User is not in a team'
      } as ApiResponse<TeamMeResponse>);
    }

    // Get team details with members
    const { data: teamData, error: teamError } = await supabase
      .from('teams_with_details')
      .select('*')
      .eq('id', profile.team_id)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return NextResponse.json(
        { error: 'Failed to fetch team details' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        team: teamData,
        profile: profile
      } as TeamMeResponse,
      message: 'Team and profile retrieved successfully'
    } as ApiResponse<TeamMeResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in teams/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}