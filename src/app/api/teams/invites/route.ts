// POST /api/teams/invites - Create new team invite
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { CreateInviteRequest, CreateInviteResponse } from '@/types/user';
import type { ApiResponse } from '@/types/api';
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse request body
    const body: CreateInviteRequest = await request.json();
    const { team_id, max_uses = 50, expires_at } = body;

    // Validate inputs
    if (!team_id || typeof team_id !== 'string') {
      return NextResponse.json(
        { error: 'Team ID is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (max_uses && (typeof max_uses !== 'number' || max_uses < 1 || max_uses > 1000)) {
      return NextResponse.json(
        { error: 'max_uses must be between 1 and 1000' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate expires_at if provided
    let expiresDate: Date | null = null;
    if (expires_at) {
      expiresDate = new Date(expires_at);
      if (isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
        return NextResponse.json(
          { error: 'expires_at must be a valid future date' } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    // Check if user can create invites for this team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, created_by')
      .eq('id', team_id)
      .single();

    if (teamError || !team) {
      return NextResponse.json(
        { error: 'Team not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Check if user is team creator or admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isTeamCreator = team.created_by === user.id;
    const isAdmin = userProfile?.role === 'admin';

    if (!isTeamCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only team creators and admins can create invites' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Generate invite code
    const { data: inviteCode } = await supabase
      .rpc('gen_invite_code');

    if (!inviteCode) {
      return NextResponse.json(
        { error: 'Failed to generate invite code' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    // Create invite
    const { data: newInvite, error: inviteError } = await supabase
      .from('teams_invites')
      .insert({
        team_id: team_id,
        code: inviteCode,
        created_by: user.id,
        max_uses: max_uses,
        expires_at: expiresDate?.toISOString() || null
      })
      .select('*')
      .single();

    if (inviteError) {
      console.error('Error creating invite:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invite', message: inviteError.message } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: {
        invite: newInvite
      } as CreateInviteResponse,
      message: 'Invite created successfully'
    } as ApiResponse<CreateInviteResponse>);

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in invite creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}