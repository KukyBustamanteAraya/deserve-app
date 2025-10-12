// Design requests API - GET list, POST create
import { NextRequest } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { CreateDesignRequestSchema } from '@/types/design';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden, apiValidationError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();

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
    logger.error('Error fetching design requests:', error);
    return apiError('Failed to fetch design requests', 500);
  }

  return apiSuccess(requests || [], `Found ${count || 0} design requests`);
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return apiUnauthorized();
  }

  try {
    const body = await request.json();
    const validated = CreateDesignRequestSchema.parse(body);

    // Verify user is a team member
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role')
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
        status: 'pending'
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
    logger.error('Validation error:', error);
    return apiValidationError('Invalid request data');
  }
}
