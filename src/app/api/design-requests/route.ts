// Design requests API - GET list, POST create
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CreateDesignRequestSchema } from '@/types/design';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('teamId');

  let query = supabase
    .from('design_requests')
    .select('*')
    .order('created_at', { ascending: false });

  if (teamId) {
    query = query.eq('team_id', teamId);
  }

  const { data: requests, error, count } = await query;

  if (error) {
    console.error('Error fetching design requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch design requests' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      items: requests || [],
      total: count || 0
    }
  });
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const validated = CreateDesignRequestSchema.parse(body);

    // Verify user is team captain
    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', validated.teamId)
      .single();

    if (!team || team.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only team captain can create design requests' },
        { status: 403 }
      );
    }

    const { data: designRequest, error } = await supabase
      .from('design_requests')
      .insert({
        team_id: validated.teamId,
        requested_by: user.id,
        brief: validated.brief || null,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating design request:', error);
      return NextResponse.json(
        { error: 'Failed to create design request' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: designRequest }, { status: 201 });
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    );
  }
}
