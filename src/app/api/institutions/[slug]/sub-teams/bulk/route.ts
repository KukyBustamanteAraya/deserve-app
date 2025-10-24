import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';
import { autoPopulateRoster } from '@/lib/roster/auto-populate';

const CreateBulkSubTeamsSchema = z.object({
  base_name: z.string().min(1).max(255),
  sport_id: z.number().int().positive(),
  level: z.string().optional(),
  mens_coach_name: z.string().optional(),
  womens_coach_name: z.string().optional(),
  colors: z.record(z.string(), z.any()).optional(),
  logo_url: z.string().url().optional(),
  season_year: z.string().optional(),
  notes: z.string().optional(),
  design_request_id: z.number().int().positive().optional(),
  auto_populate_roster: z.boolean().optional(),
  estimated_roster_sizes: z.object({
    male: z.number().int().positive().optional(),
    female: z.number().int().positive().optional(),
  }).optional(),
});

/**
 * POST /api/institutions/[slug]/sub-teams/bulk
 * Creates TWO sub-teams (male and female) with the same base name and linked via division_group
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
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
    const validatedData = CreateBulkSubTeamsSchema.parse(body);

    // Generate unique division_group identifier
    // Format: "{base_name}-{sport_id}-{timestamp}"
    const timestamp = Date.now().toString(36).slice(-6);
    const divisionGroup = `${validatedData.base_name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${validatedData.sport_id}-${timestamp}`;

    logger.info('[Bulk SubTeams POST] Creating teams with division_group:', { divisionGroup });

    // Generate base slug
    const baseSlug = validatedData.base_name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create male team
    const maleSlug = `${baseSlug}-men-${timestamp}`;
    const { data: maleTeam, error: maleError } = await supabase
      .from('institution_sub_teams')
      .insert({
        institution_team_id: institution.id,
        name: validatedData.base_name,
        slug: maleSlug,
        sport_id: validatedData.sport_id,
        gender_category: 'male',
        division_group: divisionGroup,
        level: validatedData.level,
        coach_name: validatedData.mens_coach_name,
        colors: validatedData.colors || {},
        logo_url: validatedData.logo_url,
        season_year: validatedData.season_year,
        notes: validatedData.notes,
      })
      .select()
      .single();

    if (maleError) {
      logger.error('[Bulk SubTeams POST] Error creating male team:', maleError);
      return NextResponse.json(
        { error: 'Failed to create men\'s team', details: maleError.message },
        { status: 500 }
      );
    }

    // Create female team
    const femaleSlug = `${baseSlug}-women-${timestamp}`;
    const { data: femaleTeam, error: femaleError } = await supabase
      .from('institution_sub_teams')
      .insert({
        institution_team_id: institution.id,
        name: validatedData.base_name,
        slug: femaleSlug,
        sport_id: validatedData.sport_id,
        gender_category: 'female',
        division_group: divisionGroup,
        level: validatedData.level,
        coach_name: validatedData.womens_coach_name,
        colors: validatedData.colors || {},
        logo_url: validatedData.logo_url,
        season_year: validatedData.season_year,
        notes: validatedData.notes,
      })
      .select()
      .single();

    if (femaleError) {
      logger.error('[Bulk SubTeams POST] Error creating female team:', femaleError);

      // Rollback: Delete the male team
      await supabase
        .from('institution_sub_teams')
        .delete()
        .eq('id', maleTeam.id);

      return NextResponse.json(
        { error: 'Failed to create women\'s team', details: femaleError.message },
        { status: 500 }
      );
    }

    logger.info('[Bulk SubTeams POST] Successfully created both teams:', {
      divisionGroup,
      maleTeamId: maleTeam.id,
      femaleTeamId: femaleTeam.id,
    });

    // Auto-populate rosters if requested
    if (validatedData.auto_populate_roster && validatedData.estimated_roster_sizes) {
      logger.info('[Bulk SubTeams POST] Auto-populating rosters');

      // Auto-populate male team roster
      if (validatedData.estimated_roster_sizes.male && validatedData.estimated_roster_sizes.male > 0) {
        const maleResult = await autoPopulateRoster(
          supabase,
          maleTeam.id,
          validatedData.estimated_roster_sizes.male,
          user.id
        );

        if (maleResult.success) {
          logger.info('[Bulk SubTeams POST] Male roster auto-population successful:', {
            subTeamId: maleTeam.id,
            playersCreated: maleResult.count,
          });
        } else {
          logger.error('[Bulk SubTeams POST] Male roster auto-population failed:', {
            subTeamId: maleTeam.id,
            error: maleResult.error,
          });
        }
      }

      // Auto-populate female team roster
      if (validatedData.estimated_roster_sizes.female && validatedData.estimated_roster_sizes.female > 0) {
        const femaleResult = await autoPopulateRoster(
          supabase,
          femaleTeam.id,
          validatedData.estimated_roster_sizes.female,
          user.id
        );

        if (femaleResult.success) {
          logger.info('[Bulk SubTeams POST] Female roster auto-population successful:', {
            subTeamId: femaleTeam.id,
            playersCreated: femaleResult.count,
          });
        } else {
          logger.error('[Bulk SubTeams POST] Female roster auto-population failed:', {
            subTeamId: femaleTeam.id,
            error: femaleResult.error,
          });
        }
      }
    }

    return NextResponse.json(
      {
        teams: [maleTeam, femaleTeam],
        division_group: divisionGroup,
        message: 'Successfully created men\'s and women\'s teams'
      },
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('[Bulk SubTeams POST] Error:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
