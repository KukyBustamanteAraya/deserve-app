import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateSubTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  level: z.string().optional(),
  head_coach_user_id: z.string().uuid().nullable().optional(),
  coordinator_user_id: z.string().uuid().nullable().optional(),
  colors: z.record(z.any()).optional(),
  logo_url: z.string().url().nullable().optional(),
  season_year: z.string().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch institution team
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', params.slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Fetch sub-team with related data
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select(`
        *,
        sports:sport_id(id, name, slug),
        head_coach:head_coach_user_id(id, email),
        coordinator:coordinator_user_id(id, email)
      `)
      .eq('id', params.id)
      .eq('institution_team_id', institution.id)
      .single();

    if (subTeamError || !subTeam) {
      logger.error('Error fetching sub-team:', subTeamError);
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    return NextResponse.json({ sub_team: subTeam });

  } catch (error) {
    logger.error('Error in sub-team GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch institution team
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', params.slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Fetch sub-team to verify it exists and belongs to this institution
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select('id, head_coach_user_id, institution_team_id')
      .eq('id', params.id)
      .eq('institution_team_id', institution.id)
      .single();

    if (subTeamError || !subTeam) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check permissions
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    const isAthleticDirector = membership?.institution_role === 'athletic_director';
    const isHeadCoach = subTeam.head_coach_user_id === user.id;

    if (!isAthleticDirector && !isHeadCoach) {
      return NextResponse.json(
        { error: 'Only Athletic Directors or the Head Coach can update this program' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = UpdateSubTeamSchema.parse(body);

    // Update sub-team
    const { data: updatedSubTeam, error: updateError } = await supabase
      .from('institution_sub_teams')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating sub-team:', updateError);

      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A program with this slug already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update program', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sub_team: updatedSubTeam });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error in sub-team PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch institution team
    const { data: institution, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', params.slug)
      .eq('team_type', 'institution')
      .single();

    if (teamError || !institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 });
    }

    // Verify user is Athletic Director (only ADs can delete programs)
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.institution_role !== 'athletic_director') {
      return NextResponse.json(
        { error: 'Only Athletic Directors can delete programs' },
        { status: 403 }
      );
    }

    // Delete sub-team (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('institution_sub_teams')
      .delete()
      .eq('id', params.id)
      .eq('institution_team_id', institution.id);

    if (deleteError) {
      logger.error('Error deleting sub-team:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete program', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    logger.error('Error in sub-team DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
