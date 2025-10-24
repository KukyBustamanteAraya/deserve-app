// Design request status update API
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { UpdateDesignRequestStatusSchema } from '@/types/design';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServer();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validated = UpdateDesignRequestStatusSchema.parse(body);

    // Get the design request
    const { data: designRequest, error: drError } = await supabase
      .from('design_requests')
      .select('id, team_id, requested_by, sub_team_id')
      .eq('id', id)
      .single();

    if (drError || !designRequest) {
      return NextResponse.json(
        { error: 'Design request not found' },
        { status: 404 }
      );
    }

    // Get team info separately
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('created_by, team_type')
      .eq('id', designRequest.team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    const isTeamOwner = team.created_by === user.id;
    const isRequestAuthor = designRequest.requested_by === user.id;

    // Check permissions based on team type
    if (team.team_type === 'institution') {
      // For institutions, check institution_role
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('institution_role')
        .eq('team_id', designRequest.team_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isAthleticDirector = membership?.institution_role === 'athletic_director';
      const isAssistant = membership?.institution_role === 'assistant';

      // Check if user is the coach of this sub-team
      let isCoachOfTeam = false;
      if (designRequest.sub_team_id) {
        const { data: subTeam } = await supabase
          .from('institution_sub_teams')
          .select('head_coach_user_id')
          .eq('id', designRequest.sub_team_id)
          .single();

        isCoachOfTeam = subTeam?.head_coach_user_id === user.id;
      }

      if (!isAthleticDirector && !isCoachOfTeam && !isAssistant && !isRequestAuthor) {
        return NextResponse.json(
          { error: 'Only Athletic Directors, the assigned Coach, Assistants, or the request author can update this design request' },
          { status: 403 }
        );
      }
    } else {
      // For regular teams, use the old logic
      if (!isTeamOwner && !isRequestAuthor) {
        return NextResponse.json(
          { error: 'Only team captain or request author can update design request status' },
          { status: 403 }
        );
      }
    }

    const updateData: any = { status: validated.status };
    if (validated.selectedCandidateId) {
      updateData.selected_candidate_id = validated.selectedCandidateId;
    }
    if (validated.feedback !== undefined) {
      updateData.feedback = validated.feedback;
    }
    if (validated.design_id) {
      updateData.design_id = validated.design_id;
    }

    const { data: updated, error } = await supabase
      .from('design_requests')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating design request:', toError(error));
      return NextResponse.json(
        { error: 'Failed to update design request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('Validation error:', toError(error));
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/design-requests/[id]
 * Delete a design request
 *
 * Authorization:
 * - Team manager can delete any design request
 * - Author can delete their own design request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServer();

  try {
    const { id } = await params;
    const designRequestId = parseInt(id);

    if (isNaN(designRequestId)) {
      return NextResponse.json(
        { error: 'ID de solicitud inválido' },
        { status: 400 }
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error('[DELETE Design Request] Auth error:', toError(userError));
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get design request details with team info
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select('id, team_id, requested_by, sub_team_id, teams!team_id(team_type)')
      .eq('id', designRequestId)
      .single();

    if (requestError || !designRequest) {
      logger.error('[DELETE Design Request] Error fetching request:', requestError);
      return NextResponse.json(
        { error: 'Solicitud de diseño no encontrada' },
        { status: 404 }
      );
    }

    const team = (designRequest.teams as any);
    const isAuthor = designRequest.requested_by === user.id;

    // Check permissions based on team type
    let isAuthorized = false;

    if (team.team_type === 'institution') {
      // For institutions, check institution_role
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('role, institution_role')
        .eq('team_id', designRequest.team_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isAthleticDirector = membership?.institution_role === 'athletic_director';
      const isAssistant = membership?.institution_role === 'assistant';

      // Check if user is the coach of this sub-team
      let isCoachOfTeam = false;
      if (designRequest.sub_team_id) {
        const { data: subTeam } = await supabase
          .from('institution_sub_teams')
          .select('head_coach_user_id')
          .eq('id', designRequest.sub_team_id)
          .single();

        isCoachOfTeam = subTeam?.head_coach_user_id === user.id;
      }

      isAuthorized = isAthleticDirector || isCoachOfTeam || isAssistant || isAuthor;

      logger.info('[DELETE Design Request] Institution authorization check:', {
        userId: user.id,
        isAthleticDirector,
        isCoachOfTeam,
        isAssistant,
        isAuthor,
        isAuthorized
      });
    } else {
      // For regular teams, check if user is manager/owner
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('role')
        .eq('team_id', designRequest.team_id)
        .eq('user_id', user.id)
        .maybeSingle();

      const isManager = membership?.role === 'manager' || membership?.role === 'owner';
      isAuthorized = isManager || isAuthor;
    }

    // Authorization check
    if (!isAuthorized) {
      logger.warn('[DELETE Design Request] Unauthorized attempt:', {
        userId: user.id,
        designRequestId,
        teamType: team.team_type
      });
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar esta solicitud' },
        { status: 403 }
      );
    }

    // Delete the design request
    const { error: deleteError } = await supabase
      .from('design_requests')
      .delete()
      .eq('id', designRequestId);

    if (deleteError) {
      logger.error('[DELETE Design Request] Error deleting:', toSupabaseError(deleteError));
      return NextResponse.json(
        { error: 'Error al eliminar la solicitud de diseño' },
        { status: 500 }
      );
    }

    logger.info('[DELETE Design Request] Successfully deleted:', {
      designRequestId,
      deletedBy: user.id,
      teamType: team.team_type,
      isAuthorized,
      isAuthor,
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de diseño eliminada correctamente',
    });
  } catch (error: any) {
    logger.error('[DELETE Design Request] Unexpected error:', toError(error));
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
