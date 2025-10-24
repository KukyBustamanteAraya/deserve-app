import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';

const JerseyConfigSchema = z.object({
  jersey_name_style: z.enum(['player_name', 'team_name', 'none']),
  jersey_team_name: z.string().max(50).optional()
}).refine(
  (data) => {
    if (data.jersey_name_style === 'team_name') {
      return !!data.jersey_team_name && data.jersey_team_name.trim().length > 0;
    }
    return true;
  },
  {
    message: "jersey_team_name is required when jersey_name_style is 'team_name'",
    path: ['jersey_team_name']
  }
);

export async function PATCH(
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
    const validated = JerseyConfigSchema.parse(body);

    logger.info('[Jersey Config] Request received:', {
      subTeamId: id,
      config: validated,
      userId: user.id
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

    // 4. Update jersey configuration
    const updateData: {
      jersey_name_style: string;
      jersey_team_name?: string | null;
    } = {
      jersey_name_style: validated.jersey_name_style
    };

    if (validated.jersey_name_style === 'team_name') {
      updateData.jersey_team_name = validated.jersey_team_name;
    } else {
      updateData.jersey_team_name = null;
    }

    const { data: updatedSubTeam, error: updateError } = await supabase
      .from('institution_sub_teams')
      .update(updateData)
      .eq('id', id)
      .select('jersey_name_style, jersey_team_name')
      .single();

    if (updateError) {
      logger.error('[Jersey Config] Update error:', toSupabaseError(updateError));
      return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
    }

    logger.info('[Jersey Config] Successfully updated:', {
      subTeamId: id,
      config: updatedSubTeam
    });

    return NextResponse.json({
      success: true,
      config: updatedSubTeam
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    logger.error('[Jersey Config] Unexpected error:', toError(error));
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
