import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { randomBytes } from 'crypto';

// GET /api/teams/[id]/collection-link
// Returns the existing collection link or generates a new one
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is manager of this team
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .single();

    const { data: team } = await supabase
      .from('teams')
      .select('current_owner_id')
      .eq('id', params.id)
      .single();

    const isManager = membership?.role === 'owner' || membership?.role === 'manager' || team?.current_owner_id === user.id;

    if (!isManager) {
      return NextResponse.json(
        { error: 'Only team managers can access collection links' },
        { status: 403 }
      );
    }

    // Get or create team settings with collection token
    const { data: settings } = await supabase
      .from('team_settings')
      .select('info_collection_token')
      .eq('team_id', params.id)
      .maybeSingle();

    let token = settings?.info_collection_token;

    // If no settings record exists, create one with a new token
    if (!settings) {
      token = randomBytes(32).toString('hex');

      const { error: insertError } = await supabase
        .from('team_settings')
        .insert({
          team_id: params.id,
          info_collection_token: token,
          approval_mode: 'any_member',
          player_info_mode: 'hybrid',
          access_mode: 'invite_only',
          self_service_enabled: true,
        });

      if (insertError) {
        console.error('Failed to create team settings:', insertError);
        throw new Error('Failed to generate collection token');
      }
    }
    // If settings exist but no token, generate one
    else if (!token) {
      token = randomBytes(32).toString('hex');

      const { error: updateError } = await supabase
        .from('team_settings')
        .update({ info_collection_token: token })
        .eq('team_id', params.id);

      if (updateError) {
        throw new Error('Failed to generate collection token');
      }
    }

    // Get team info for the link
    const { data: teamData } = await supabase
      .from('teams')
      .select('name, slug')
      .eq('id', params.id)
      .single();

    const baseUrl = request.nextUrl.origin;
    const collectionUrl = `${baseUrl}/collect/${token}`;

    return NextResponse.json({
      token,
      url: collectionUrl,
      teamName: teamData?.name,
      teamSlug: teamData?.slug,
    });
  } catch (error: any) {
    console.error('Error generating collection link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate collection link' },
      { status: 500 }
    );
  }
}

// POST /api/teams/[id]/collection-link/regenerate
// Regenerates the collection token (invalidates old link)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseServer();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user is manager of this team
    const { data: membership } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .single();

    const { data: team } = await supabase
      .from('teams')
      .select('current_owner_id')
      .eq('id', params.id)
      .single();

    const isManager = membership?.role === 'owner' || membership?.role === 'manager' || team?.current_owner_id === user.id;

    if (!isManager) {
      return NextResponse.json(
        { error: 'Only team managers can regenerate collection links' },
        { status: 403 }
      );
    }

    // Generate new token
    const newToken = randomBytes(32).toString('hex');

    const { error: updateError } = await supabase
      .from('team_settings')
      .update({ info_collection_token: newToken })
      .eq('team_id', params.id);

    if (updateError) {
      throw new Error('Failed to regenerate collection token');
    }

    // Get team info
    const { data: teamData } = await supabase
      .from('teams')
      .select('name, slug')
      .eq('id', params.id)
      .single();

    const baseUrl = request.nextUrl.origin;
    const collectionUrl = `${baseUrl}/collect/${newToken}`;

    return NextResponse.json({
      token: newToken,
      url: collectionUrl,
      teamName: teamData?.name,
      teamSlug: teamData?.slug,
    });
  } catch (error: any) {
    console.error('Error regenerating collection link:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate collection link' },
      { status: 500 }
    );
  }
}
