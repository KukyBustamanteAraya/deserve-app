import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';
import { SIZES_WITH_XXXL } from '@/constants/sizing';

const BulkAssignSizesSchema = z.object({
  sub_team_id: z.string().uuid(),
  size_distribution: z.record(z.string(), z.number().min(0).max(200))
});

interface RosterMember {
  id: string;
  player_name: string;
  jersey_number: number;
  size: string | null;
}

function buildSizeAssignments(
  roster: RosterMember[],
  distribution: Record<string, number>
): Array<{ id: string; size: string }> {
  const assignments: Array<{ id: string; size: string }> = [];
  let currentIndex = 0;

  // Import size order from constants (includes XXXL notation)
  const sizes = SIZES_WITH_XXXL;

  for (const size of sizes) {
    const count = distribution[size] || 0;

    for (let i = 0; i < count; i++) {
      if (currentIndex >= roster.length) break;

      assignments.push({
        id: roster[currentIndex].id,
        size: size
      });

      currentIndex++;
    }
  }

  return assignments;
}

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
    const validated = BulkAssignSizesSchema.parse(body);

    logger.info('[Bulk Assign Sizes] Request received:', {
      subTeamId: validated.sub_team_id,
      distribution: validated.size_distribution,
      userId: user.id
    });

    // 3. Verify user has permission (Athletic Director, Assistant, or Head Coach)
    const { data: subTeam } = await supabase
      .from('institution_sub_teams')
      .select('institution_team_id, head_coach_user_id')
      .eq('id', validated.sub_team_id)
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

    // 4. Fetch current roster (sorted by jersey_number)
    const { data: roster, error: rosterError } = await supabase
      .from('institution_sub_team_members')
      .select('id, player_name, jersey_number, size')
      .eq('sub_team_id', validated.sub_team_id)
      .order('jersey_number', { ascending: true });

    if (rosterError) {
      logger.error('[Bulk Assign Sizes] Error fetching roster:', rosterError);
      return NextResponse.json({ error: 'Failed to fetch roster' }, { status: 500 });
    }

    if (!roster || roster.length === 0) {
      return NextResponse.json({ error: 'No roster members found' }, { status: 404 });
    }

    // 5. Validate total matches roster size
    const totalAssigned = Object.values(validated.size_distribution).reduce((sum, val) => sum + val, 0);
    if (totalAssigned !== roster.length) {
      return NextResponse.json({
        error: `Size distribution total (${totalAssigned}) does not match roster size (${roster.length})`
      }, { status: 400 });
    }

    // 6. Build size assignments
    const assignments = buildSizeAssignments(roster as RosterMember[], validated.size_distribution);

    logger.info('[Bulk Assign Sizes] Assignments built:', {
      totalAssignments: assignments.length,
      preview: assignments.slice(0, 3),
      rosterBefore: roster.slice(0, 3).map(m => ({
        id: m.id,
        number: m.jersey_number,
        currentSize: m.size
      }))
    });

    // 7. Bulk update using individual updates in a loop
    // (Supabase doesn't support unnest directly, so we'll do batch updates)
    const updatePromises = assignments.map(assignment =>
      supabase
        .from('institution_sub_team_members')
        .update({ size: assignment.size })
        .eq('id', assignment.id)
        .select()
    );

    const results = await Promise.all(updatePromises);

    logger.info('[Bulk Assign Sizes] Raw results:', {
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
      logger.error('[Bulk Assign Sizes] Update errors:', errors);
      return NextResponse.json({
        error: 'Failed to update some roster members',
        details: errors
      }, { status: 500 });
    }

    // 8. Fetch updated roster to return
    const { data: updatedRoster, error: fetchError } = await supabase
      .from('institution_sub_team_members')
      .select('*')
      .eq('sub_team_id', validated.sub_team_id)
      .order('jersey_number', { ascending: true });

    if (fetchError) {
      logger.error('[Bulk Assign Sizes] Error fetching updated roster:', toSupabaseError(fetchError));
    }

    logger.info('[Bulk Assign Sizes] Successfully assigned sizes:', {
      count: assignments.length,
      subTeamId: validated.sub_team_id,
      sampleFromDB: updatedRoster?.slice(0, 3).map(m => ({
        id: m.id,
        number: m.jersey_number,
        size: m.size
      }))
    });

    return NextResponse.json({
      success: true,
      updated_count: assignments.length,
      roster: updatedRoster || []
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('[Bulk Assign Sizes] Unexpected error:', toError(error));
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
