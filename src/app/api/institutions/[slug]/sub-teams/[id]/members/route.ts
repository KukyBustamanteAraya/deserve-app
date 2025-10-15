import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateMemberSchema = z.object({
  player_name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  position: z.string().optional(),
  jersey_number: z.number().int().min(1).max(999).optional(),
  size: z.string().optional(),
  additional_info: z.record(z.any()).optional(),
});

const UpdateMemberSchema = CreateMemberSchema.partial();

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

    // Verify sub-team belongs to this institution
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select('id, name')
      .eq('id', params.id)
      .eq('institution_team_id', institution.id)
      .single();

    if (subTeamError || !subTeam) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Fetch roster members
    const { data: members, error: membersError } = await supabase
      .from('institution_sub_team_members')
      .select('*')
      .eq('sub_team_id', params.id)
      .order('player_name');

    if (membersError) {
      logger.error('Error fetching roster members:', membersError);
      return NextResponse.json(
        { error: 'Failed to fetch roster members' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sub_team: subTeam,
      members: members || [],
      total: (members || []).length,
    });

  } catch (error) {
    logger.error('Error in roster GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    // Fetch sub-team and verify permissions
    const { data: subTeam, error: subTeamError } = await supabase
      .from('institution_sub_teams')
      .select('id, head_coach_user_id, institution_team_id')
      .eq('id', params.id)
      .eq('institution_team_id', institution.id)
      .single();

    if (subTeamError || !subTeam) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    // Check permissions (Athletic Director or Head Coach)
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
        { error: 'Only Athletic Directors or Head Coaches can add roster members' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = CreateMemberSchema.parse(body);

    // Create roster member
    const { data: member, error: createError } = await supabase
      .from('institution_sub_team_members')
      .insert({
        sub_team_id: params.id,
        player_name: validatedData.player_name,
        email: validatedData.email,
        position: validatedData.position,
        jersey_number: validatedData.jersey_number,
        size: validatedData.size,
        additional_info: validatedData.additional_info || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating roster member:', createError);

      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A member with this email already exists in this program' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to add roster member', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ member }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error in roster POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
