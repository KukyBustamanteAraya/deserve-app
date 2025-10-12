// GET /api/teams/me - Get current user's team and profile
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { TeamMeResponse } from '@/types/user';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';

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
      logger.error('Error fetching profile:', profileError);
      return apiError('Failed to fetch profile', 500);
    }

    // If user has no team, return profile only
    if (!profile.team_id) {
      return apiSuccess(
        {
          team: null,
          profile: profile
        } as TeamMeResponse,
        'User is not in a team'
      );
    }

    // Get team details with members
    const { data: teamData, error: teamError } = await supabase
      .from('teams_with_details')
      .select('*')
      .eq('id', profile.team_id)
      .single();

    if (teamError) {
      logger.error('Error fetching team:', teamError);
      return apiError('Failed to fetch team details', 500);
    }

    return apiSuccess(
      {
        team: teamData,
        profile: profile
      } as TeamMeResponse,
      'Team and profile retrieved successfully'
    );

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in teams/me:', error);
    return apiError('Internal server error');
  }
}