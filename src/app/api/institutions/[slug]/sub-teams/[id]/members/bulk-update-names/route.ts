import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';

const BulkUpdateNamesSchema = z.object({
  updates: z.array(
    z.object({
      member_id: z.string().uuid(),
      player_name: z.string().min(1).max(50).trim()
    })
  ).min(1).max(200)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServer();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const validated = BulkUpdateNamesSchema.parse(body);

    logger.info('[Bulk Update Names] Request received:', {
      subTeamId: id,
      updateCount: validated.updates.length,
      userId: user.id,
      sampleUpdates: validated.updates.slice(0, 3).map(u => ({ id: u.member_id, name: u.player_name }))
    });

    // 3. Verify user has permission (Athletic Director, Assistant, or Head Coach)
    const { data: subTeam } = await supabase
      .from('institution_sub_teams')
      .select('institution_team_id, head_coach_user_id')
      .eq('id', id)
      .single();

    if (!subTeam) {
      return NextResponse.json({ error: 'Sub-team not found' }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from('team_memberships')
      .select('institution_role')
      .eq('team_id', subTeam.institution_team_id)
      .eq('user_id', user.id)
      .maybeSingle();

    const isAuthorized =
      membership?.institution_role === 'athletic_director' ||
      membership?.institution_role === 'assistant' ||
      subTeam.head_coach_user_id === user.id;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // 4. Verify all member IDs belong to this sub-team
    const memberIds = validated.updates.map(u => u.member_id);
    const { data: existingMembers, error: fetchError } = await supabase
      .from('institution_sub_team_members')
      .select('id')
      .eq('sub_team_id', id)
      .in('id', memberIds);

    if (fetchError) {
      logger.error('[Bulk Update Names] Error fetching members:', toSupabaseError(fetchError));
      return NextResponse.json({ error: 'Failed to verify members' }, { status: 500 });
    }

    const existingIds = new Set(existingMembers?.map(m => m.id) || []);
    const invalidIds = memberIds.filter(id => !existingIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: 'Invalid member IDs',
        invalid_ids: invalidIds
      }, { status: 400 });
    }

    // 5. Bulk update player names
    const updatePromises = validated.updates.map(update =>
      supabase
        .from('institution_sub_team_members')
        .update({ player_name: update.player_name })
        .eq('id', update.member_id)
        .select()
    );

    const results = await Promise.all(updatePromises);

    logger.info('[Bulk Update Names] Raw results:', {
      resultsCount: results.length,
      sample: results.slice(0, 3).map(r => ({
        error: r.error,
        data: r.data,
        count: r.count,
        status: r.status,
        statusText: r.statusText
      }))
    });

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      logger.error('[Bulk Update Names] Update errors:', errors);
      return NextResponse.json({
        error: 'Failed to update some members',
        details: errors
      }, { status: 500 });
    }

    // 6. Fetch updated roster to return
    const { data: updatedRoster, error: rosterError } = await supabase
      .from('institution_sub_team_members')
      .select('*')
      .eq('sub_team_id', id)
      .order('jersey_number', { ascending: true });

    if (rosterError) {
      logger.error('[Bulk Update Names] Error fetching updated roster:', rosterError);
    }

    logger.info('[Bulk Update Names] Successfully updated names:', {
      count: validated.updates.length,
      subTeamId: id,
      sampleFromDB: updatedRoster?.slice(0, 3).map(m => ({ id: m.id, name: m.player_name, number: m.jersey_number }))
    });

    return NextResponse.json({
      success: true,
      updated_count: validated.updates.length,
      roster: updatedRoster || []
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('[Bulk Update Names] Unexpected error:', toError(error));
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
