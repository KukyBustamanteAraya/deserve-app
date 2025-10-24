import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface ApparelSelection {
  apparel_type: string;
  product_id: string;
  quantity: number;
}

interface GearRequestPayload {
  team_id: string;
  apparel_selections: ApparelSelection[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GearRequestPayload = await request.json();

    // Validate required fields
    if (!body.team_id) {
      return NextResponse.json(
        { error: 'team_id is required' },
        { status: 400 }
      );
    }

    if (!body.apparel_selections || !Array.isArray(body.apparel_selections) || body.apparel_selections.length === 0) {
      return NextResponse.json(
        { error: 'apparel_selections must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate each apparel selection
    for (const selection of body.apparel_selections) {
      if (!selection.apparel_type || !selection.product_id) {
        return NextResponse.json(
          { error: 'Each apparel selection must have apparel_type and product_id' },
          { status: 400 }
        );
      }

      if (!selection.quantity || selection.quantity < 1) {
        return NextResponse.json(
          { error: 'Each apparel selection must have a quantity of at least 1' },
          { status: 400 }
        );
      }
    }

    // Verify team exists and user has access
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, created_by')
      .eq('id', body.team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is team owner or member
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', body.team_id)
      .eq('user_id', user.id)
      .single();

    const isOwner = team.created_by === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: 'You do not have permission to create gear requests for this team' },
        { status: 403 }
      );
    }

    // Verify all products exist
    const productIds = body.apparel_selections.map(s => s.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id')
      .in('id', productIds);

    if (productsError) {
      return NextResponse.json(
        { error: 'Error validating products' },
        { status: 500 }
      );
    }

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { error: 'One or more product IDs are invalid' },
        { status: 400 }
      );
    }

    // Create gear request
    const { data: gearRequest, error: createError } = await supabase
      .from('gear_requests')
      .insert({
        team_id: body.team_id,
        requested_by: user.id,
        status: 'pending',
        apparel_selections: body.apparel_selections,
      })
      .select()
      .single();

    if (createError) {
      logger.error('Error creating gear request:', toSupabaseError(createError));
      return NextResponse.json(
        { error: 'Failed to create gear request', details: createError.message },
        { status: 500 }
      );
    }

    // Return success with created gear request
    return NextResponse.json({
      success: true,
      gear_request: gearRequest,
    }, { status: 201 });

  } catch (error: any) {
    logger.error('Unexpected error in gear-requests API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve gear requests for a team
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get team_id from query params
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id');

    if (!teamId) {
      return NextResponse.json(
        { error: 'team_id query parameter is required' },
        { status: 400 }
      );
    }

    // Verify team exists and user has access
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, created_by')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Check if user is team owner or member
    const { data: membership } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    const isOwner = team.created_by === user.id;
    const isMember = !!membership;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { error: 'You do not have permission to view gear requests for this team' },
        { status: 403 }
      );
    }

    // Fetch gear requests for the team
    const { data: gearRequests, error: fetchError } = await supabase
      .from('gear_requests')
      .select(`
        *,
        profiles!requested_by(id, full_name, email)
      `)
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (fetchError) {
      logger.error('Error fetching gear requests:', toSupabaseError(fetchError));
      return NextResponse.json(
        { error: 'Failed to fetch gear requests', details: fetchError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      gear_requests: gearRequests || [],
    });

  } catch (error: any) {
    logger.error('Unexpected error in gear-requests GET:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
