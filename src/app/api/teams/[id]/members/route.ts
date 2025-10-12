// GET /api/teams/[id]/members - Get members for a specific team
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';

interface TeamMember {
  user_id: string;
  role: string;
  profiles?: {
    email?: string;
    full_name?: string;
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    const teamId = params.id;

    // Verify user is a member of this team (or is admin)
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.is_admin || false;

    if (!membership && !isAdmin) {
      logger.warn('User not authorized to view team members', { userId: user.id, teamId });
      return apiError('Not authorized to view this team', 403);
    }

    // Use the team_members_view for efficient querying
    const { data: members, error: membersError } = await supabase
      .from('team_members_view')
      .select('user_id, membership_role, full_name, avatar_url')
      .eq('team_id', teamId);

    if (membersError) {
      logger.error('Error fetching team members:', membersError);
      return apiError('Failed to fetch team members', 500);
    }

    // Transform to match expected format
    const formattedMembers: TeamMember[] = (members || []).map((m) => ({
      user_id: m.user_id,
      role: m.membership_role,
      profiles: {
        full_name: m.full_name || undefined,
      },
    }));

    return apiSuccess(formattedMembers, `Found ${formattedMembers.length} team members`);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in teams/[id]/members:', error);
    return apiError('Internal server error');
  }
}
