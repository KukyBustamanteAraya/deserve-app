import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

/**
 * GET /api/design-candidates
 * List design candidates for a team
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();
  const { searchParams } = new URL(request.url);
  const team_id = searchParams.get('team_id');

  if (!team_id) {
    return NextResponse.json(
      { error: 'team_id is required' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('design_candidates')
      .select('*')
      .eq('team_id', parseInt(team_id))
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ candidates: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch design candidates' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/design-candidates
 * Create new design candidate (captain only)
 */
export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();

  try {
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { team_id, design_url } = body;

    if (!team_id || !design_url) {
      return NextResponse.json(
        { error: 'team_id and design_url are required' },
        { status: 400 }
      );
    }

    // Verify user is team captain
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    if (team.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only team captain can add design candidates' },
        { status: 403 }
      );
    }

    // Insert design candidate
    const { data, error } = await supabase
      .from('design_candidates')
      .insert({
        team_id,
        design_url,
        uploaded_by: user.id
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logger.error('Design candidate creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create design candidate' },
      { status: 500 }
    );
  }
}
