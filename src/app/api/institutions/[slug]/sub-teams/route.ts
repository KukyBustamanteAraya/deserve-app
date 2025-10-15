import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const CreateSubTeamSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  sport_id: z.number().int().positive(),
  gender_category: z.enum(['male', 'female', 'both']).optional(),
  level: z.string().optional(),
  head_coach_user_id: z.string().uuid().optional(),
  coordinator_user_id: z.string().uuid().optional(),
  colors: z.record(z.any()).optional(),
  logo_url: z.string().url().optional(),
  season_year: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    // Verify user has access
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role, institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch sub-teams with related data
    const { data: subTeams, error: subTeamsError } = await supabase
      .from('institution_sub_teams')
      .select(`
        *,
        sports:sport_id(id, name, slug),
        head_coach:head_coach_user_id(id, email),
        coordinator:coordinator_user_id(id, email)
      `)
      .eq('institution_team_id', institution.id)
      .order('name');

    if (subTeamsError) {
      logger.error('Error fetching sub-teams:', subTeamsError);
      return NextResponse.json(
        { error: 'Failed to fetch programs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sub_teams: subTeams || [] });

  } catch (error) {
    logger.error('Error in sub-teams GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
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

    // Verify user is Athletic Director
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('institution_role')
      .eq('team_id', institution.id)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.institution_role !== 'athletic_director') {
      return NextResponse.json(
        { error: 'Only Athletic Directors can create programs' },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const validatedData = CreateSubTeamSchema.parse(body);

    // Generate slug if not provided
    const slug = validatedData.slug || validatedData.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create sub-team
    const { data: subTeam, error: createError } = await supabase
      .from('institution_sub_teams')
      .insert({
        institution_team_id: institution.id,
        name: validatedData.name,
        slug,
        sport_id: validatedData.sport_id,
        gender_category: validatedData.gender_category || 'male',
        level: validatedData.level,
        head_coach_user_id: validatedData.head_coach_user_id,
        coordinator_user_id: validatedData.coordinator_user_id,
        colors: validatedData.colors || {},
        logo_url: validatedData.logo_url,
        season_year: validatedData.season_year,
        notes: validatedData.notes,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating sub-team:', createError);

      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A program with this slug already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create program', details: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ sub_team: subTeam }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('Error in sub-teams POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
