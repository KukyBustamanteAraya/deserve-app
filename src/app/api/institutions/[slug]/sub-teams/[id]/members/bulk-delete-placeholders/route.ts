import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await params;
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch institution team
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Verify sub-team belongs to this institution
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select('id, name, head_coach_user_id')
      .eq('id', id)
      .eq('institution_team_id', institution.id)
      .single();

    if (subTeamError || !subTeam) {
      return NextResponse.json({ error: 'Sub-team not found' }, { status: 404 });
    }

    // Verify user has permission (Athletic Director, Head Coach, or Assistant)
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    const isAthleticDirector = membership?.institution_role === 'athletic_director';
    const isAssistant = membership?.institution_role === 'assistant';
    const isHeadCoach = subTeam.head_coach_user_id === user.id;

    if (!isAthleticDirector && !isHeadCoach && !isAssistant) {
      return NextResponse.json(
        { error: 'Only Athletic Directors, Head Coaches, and Assistants can delete placeholder players' },
        { status: 403 }
      );
    }

    logger.info('[BulkDeletePlaceholders] Deleting placeholders:', {
      subTeamId: id,
      userId: user.id,
    });

    // Delete all members with auto_generated flag
    // Using the additional_info JSONB column to filter
    const { data: deletedMembers, error: deleteError } = await supabase
      .from('institution_sub_team_members')
      .delete()
      .eq('sub_team_id', id)
      .contains('additional_info', { auto_generated: true })
      .select();

    if (deleteError) {
      logger.error('[BulkDeletePlaceholders] Delete failed:', toSupabaseError(deleteError));
      return NextResponse.json(
        { error: 'Failed to delete placeholder players', details: deleteError.message },
        { status: 500 }
      );
    }

    const deletedCount = deletedMembers?.length || 0;

    logger.info('[BulkDeletePlaceholders] Successfully deleted placeholders:', {
      subTeamId: id,
      count: deletedCount,
    });

    return NextResponse.json({
      success: true,
      count: deletedCount,
      message: `Deleted ${deletedCount} placeholder player(s)`,
    });

  } catch (error) {
    logger.error('[BulkDeletePlaceholders] Unexpected error:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
