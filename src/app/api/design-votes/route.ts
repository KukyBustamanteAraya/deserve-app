import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

/**
 * GET /api/design-votes
 * Get votes for a specific design candidate
 */
export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();
  const { searchParams } = new URL(request.url);
  const candidate_id = searchParams.get('candidate_id');

  if (!candidate_id) {
    return NextResponse.json(
      { error: 'candidate_id is required' },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from('design_votes')
      .select('*')
      .eq('candidate_id', parseInt(candidate_id));

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Calculate vote summary
    const yesVotes = data.filter(v => v.vote === true).length;
    const noVotes = data.filter(v => v.vote === false).length;

    return NextResponse.json({
      votes: data,
      summary: {
        yes: yesVotes,
        no: noVotes,
        total: data.length
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch votes' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/design-votes
 * Cast a vote on a design candidate (team members only, one vote per user)
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
    const { candidate_id, vote } = body;

    if (candidate_id === undefined || vote === undefined) {
      return NextResponse.json(
        { error: 'candidate_id and vote (boolean) are required' },
        { status: 400 }
      );
    }

    // Get candidate and verify team membership
    const { data: candidate, error: candidateError } = await supabase
      .from('design_candidates')
      .select(`
        id,
        team_id,
        teams!inner(created_by)
      `)
      .eq('id', candidate_id)
      .single();

    if (candidateError || !candidate) {
      return NextResponse.json(
        { error: 'Design candidate not found' },
        { status: 404 }
      );
    }

    // Check if user is captain
    const isCaptain = (candidate.teams as any).created_by === user.id;

    // Check if user is team member
    const { data: membership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', candidate.team_id)
      .eq('user_id', user.id)
      .single();

    if (!isCaptain && !membership) {
      return NextResponse.json(
        { error: 'Only team members can vote on designs' },
        { status: 403 }
      );
    }

    // Insert vote (UNIQUE constraint enforces one vote per user per candidate)
    const { data, error } = await supabase
      .from('design_votes')
      .insert({
        candidate_id: parseInt(candidate_id),
        user_id: user.id,
        vote: Boolean(vote)
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted on this design' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Update vote tallies on design_candidates
    await updateVoteTally(supabase, parseInt(candidate_id));

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    logger.error('Design vote error:', error);
    return NextResponse.json(
      { error: 'Failed to cast vote' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to update vote tallies
 */
async function updateVoteTally(supabase: any, candidateId: number) {
  const { data: votes } = await supabase
    .from('design_votes')
    .select('vote')
    .eq('candidate_id', candidateId);

  if (votes) {
    const yesCount = votes.filter((v: any) => v.vote === true).length;
    const noCount = votes.filter((v: any) => v.vote === false).length;

    await supabase
      .from('design_candidates')
      .update({
        votes_yes: yesCount,
        votes_no: noCount
      })
      .eq('id', candidateId);
  }
}
