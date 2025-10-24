import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';

const BulkAddPlaceholdersSchema = z.object({
  count: z.number().int().min(1).max(50),
  startNumber: z.number().int().positive().optional(),
});

export async function POST(
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
        { error: 'Only Athletic Directors, Head Coaches, and Assistants can add placeholder players' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = BulkAddPlaceholdersSchema.parse(body);

    // Find the highest existing jersey number
    const { data: existingMembers, error: fetchError } = await supabase
      .from('institution_sub_team_members')
      .select('jersey_number')
      .eq('sub_team_id', id)
      .order('jersey_number', { ascending: false });

    if (fetchError) {
      logger.error('[BulkAddPlaceholders] Error fetching existing members:', toSupabaseError(fetchError));
      return NextResponse.json(
        { error: 'Failed to fetch existing roster' },
        { status: 500 }
      );
    }

    // Determine starting number
    let startNumber = validatedData.startNumber || 1;
    if (!validatedData.startNumber && existingMembers && existingMembers.length > 0) {
      // Find the highest numeric jersey number
      const maxNumber = Math.max(
        ...existingMembers
          .map(m => parseInt(m.jersey_number, 10))
          .filter(n => !isNaN(n))
      );
      startNumber = maxNumber + 1;
    }

    logger.info('[BulkAddPlaceholders] Adding placeholders:', {
      subTeamId: id,
      count: validatedData.count,
      startNumber,
      userId: user.id,
    });

    // Generate placeholder members
    const members = [];
    for (let i = 0; i < validatedData.count; i++) {
      const jerseyNumber = startNumber + i;
      members.push({
        sub_team_id: id,
        player_name: `Player ${jerseyNumber}`,
        jersey_number: jerseyNumber.toString(),
        size: null,
        position: null,
        email: null,
        additional_info: { auto_generated: true },
        created_by: user.id,
      });
    }

    // Batch insert
    const { data: insertedMembers, error: insertError } = await supabase
      .from('institution_sub_team_members')
      .insert(members)
      .select();

    if (insertError) {
      logger.error('[BulkAddPlaceholders] Insert failed:', toSupabaseError(insertError));
      return NextResponse.json(
        { error: 'Failed to add placeholder players', details: insertError.message },
        { status: 500 }
      );
    }

    logger.info('[BulkAddPlaceholders] Successfully added placeholders:', {
      subTeamId: id,
      count: insertedMembers?.length || 0,
      startNumber,
      endNumber: startNumber + validatedData.count - 1,
    });

    return NextResponse.json({
      success: true,
      count: insertedMembers?.length || 0,
      members: insertedMembers,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('[BulkAddPlaceholders] Unexpected error:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
