// Design requests API - GET list, POST create
import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { CreateDesignRequestSchema } from '@/types/design';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiValidationError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return apiUnauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('team_id') || searchParams.get('teamId');
  const status = searchParams.get('status');
  const userId = searchParams.get('user_id') || searchParams.get('userId');

  let query = supabase
    .from('design_requests')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters
  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (userId) {
    query = query.eq('requested_by', userId);
  }

  const { data: requests, error, count } = await query;

  if (error) {
    logger.error('Error fetching design requests:', toError(error));
    return apiError('Failed to fetch design requests', 500);
  }

  return apiSuccess(requests || [], `Found ${count || 0} design requests`);
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return apiUnauthorized();
  }

  try {
    const body = await request.json();
    const validated = CreateDesignRequestSchema.parse(body);

    // Get team details to check if it's an institution
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, team_type')
      .eq('id', validated.teamId)
      .single();

    if (teamError || !team) {
      logger.error('[DesignRequest] Team not found:', toError(teamError));
      return apiForbidden('Team not found');
    }

    // Verify user is a team member
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role, institution_role')
      .eq('team_id', validated.teamId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      logger.error('[DesignRequest] Membership check failed:', {
        error: membershipError,
        userId: user.id,
        teamId: validated.teamId,
        hasError: !!membershipError,
        hasMembership: !!membership
      });
      return apiForbidden('Only team members can create design requests');
    }

    // For institutions, verify user has permission to create design requests
    if (team.team_type === 'institution') {
      const isAthleticDirector = membership.institution_role === 'athletic_director';
      const isAssistant = membership.institution_role === 'assistant';

      // Check if user is a coach
      const { data: coachedTeams } = await supabase
        .from('institution_sub_teams')
        .select('id')
        .eq('institution_team_id', team.id)
        .eq('head_coach_user_id', user.id)
        .eq('active', true);

      const isCoach = coachedTeams && coachedTeams.length > 0;

      if (!isAthleticDirector && !isCoach && !isAssistant) {
        logger.warn('[DesignRequest] User not authorized to create design requests:', {
          userId: user.id,
          teamId: validated.teamId,
          institutionRole: membership.institution_role,
          isCoach
        });
        return apiForbidden('Only Athletic Directors, Coaches, and Assistants can create design requests for institutions');
      }

      logger.info('[DesignRequest] Institution role verified:', {
        userId: user.id,
        role: isAthleticDirector ? 'athletic_director' : isCoach ? 'coach' : 'assistant'
      });
    }

    // Get user's role to set user_type
    const userType = membership.role === 'player' ? 'player' : 'manager';

    logger.info('[DesignRequest] About to insert:', {
      userId: user.id,
      teamId: validated.teamId,
      userType,
      membershipRole: membership.role
    });

    const { data: designRequest, error } = await supabase
      .from('design_requests')
      .insert({
        team_id: validated.teamId,
        requested_by: user.id,
        user_id: user.id,
        user_type: userType,
        status: 'pending',
        estimated_roster_size: validated.estimatedRosterSize || null,
      })
      .select()
      .single();

    if (error) {
      logger.error('[DesignRequest] Insert failed:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
        userId: user.id,
        teamId: validated.teamId,
        userType
      });
      return apiError('Failed to create design request', 500);
    }

    return apiSuccess(designRequest, 'Design request created successfully', 201);
  } catch (error) {
    logger.error('Validation error:', toError(error));
    return apiValidationError('Invalid request data');
  }
}
