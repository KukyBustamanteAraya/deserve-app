import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const UpdateMemberSchema = z.object({
  player_name: z.string().min(1).max(255).optional(),
  email: z.string().email().nullable().optional(),
  position: z.string().nullable().optional(),
  jersey_number: z.number().int().min(1).max(999).nullable().optional(),
  size: z.string().nullable().optional(),
  additional_info: z.record(z.any()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string; memberId: string } }
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

    // Fetch sub-team and verify permissions
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select('id, head_coach_user_id')
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
        { error: 'Only Athletic Directors or Head Coaches can update roster members' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = UpdateMemberSchema.parse(body);

    // Update roster member
    const { data: member, error: updateError } = await supabase
      .from('institution_sub_team_members')
      .update(validatedData)
      .eq('id', params.memberId)
      .eq('sub_team_id', params.id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating roster member:', updateError);

      if (updateError.code === '23505') {
        return NextResponse.json(
          { error: 'A member with this email already exists in this program' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to update roster member', details: updateError.message },
        { status: 500 }
      );
    }

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ member });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error in roster member PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string; memberId: string } }
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

    // Fetch sub-team and verify permissions
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select('id, head_coach_user_id')
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
        { error: 'Only Athletic Directors or Head Coaches can remove roster members' },
        { status: 403 }
      );
    }

    // Delete roster member
    const { error: deleteError } = await supabase
      .from('institution_sub_team_members')
      .delete()
      .eq('id', params.memberId)
      .eq('sub_team_id', params.id);

    if (deleteError) {
      logger.error('Error deleting roster member:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove roster member', details: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Error in roster member DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
