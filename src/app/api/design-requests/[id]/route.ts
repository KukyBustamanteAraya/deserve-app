// Design request status update API
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { UpdateDesignRequestStatusSchema } from '@/types/design';
import { logger } from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validated = UpdateDesignRequestStatusSchema.parse(body);

    // Get the design request and verify ownership
    const { data: designRequest } = await supabase
      .from('design_requests')
      .select('team_id, teams!inner(created_by)')
      .eq('id', params.id)
      .single();

    if (!designRequest || (designRequest.teams as any).created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only team captain can update design request status' },
        { status: 403 }
      );
    }

    const updateData: any = { status: validated.status };
    if (validated.selectedCandidateId) {
      updateData.selected_candidate_id = validated.selectedCandidateId;
    }

    const { data: updated, error } = await supabase
      .from('design_requests')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating design request:', error);
      return NextResponse.json(
        { error: 'Failed to update design request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error('Validation error:', error);
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
  { params }: { params: { id: string } }
) {
  const supabase = createSupabaseServer();

  try {
    const designRequestId = parseInt(params.id);

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
      logger.error('[DELETE Design Request] Auth error:', userError);
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Get design request details
    const { data: designRequest, error: requestError } = await supabase
      .from('design_requests')
      .select('id, team_id, requested_by')
      .eq('id', designRequestId)
      .single();

    if (requestError || !designRequest) {
      logger.error('[DELETE Design Request] Error fetching request:', requestError);
      return NextResponse.json(
        { error: 'Solicitud de diseño no encontrada' },
        { status: 404 }
      );
    }

    // Check if user is the author
    const isAuthor = designRequest.requested_by === user.id;

    // Check if user is team manager
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', designRequest.team_id)
      .eq('user_id', user.id)
      .single();

    const isManager = membership?.role === 'manager' || membership?.role === 'owner';

    // Authorization check: must be manager OR author
    if (!isManager && !isAuthor) {
      logger.warn('[DELETE Design Request] Unauthorized attempt:', {
        userId: user.id,
        designRequestId,
        isManager,
        isAuthor,
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
      logger.error('[DELETE Design Request] Error deleting:', deleteError);
      return NextResponse.json(
        { error: 'Error al eliminar la solicitud de diseño' },
        { status: 500 }
      );
    }

    logger.info('[DELETE Design Request] Successfully deleted:', {
      designRequestId,
      deletedBy: user.id,
      isManager,
      isAuthor,
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de diseño eliminada correctamente',
    });
  } catch (error: any) {
    logger.error('[DELETE Design Request] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
