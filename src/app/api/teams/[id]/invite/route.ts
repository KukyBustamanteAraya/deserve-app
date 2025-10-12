import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const InviteSchema = z.object({
  playerSubmissionId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  role: z.enum(['player', 'manager', 'coach']).default('player'),
}).refine(data => data.playerSubmissionId || data.email, {
  message: 'Either playerSubmissionId or email must be provided'
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get current user
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is manager/owner of the team
    const { data: membership, error: membershipError } = await supabase
      .from('team_memberships')
      .select('role')
      .eq('team_id', params.id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only team managers can send invites' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validated = InviteSchema.parse(body);

    // Generate unique invite token
    const inviteToken = uuidv4();

    // If playerSubmissionId is provided, get player info
    let playerEmail: string | undefined = validated.email;
    if (validated.playerSubmissionId) {
      const { data: playerData, error: playerError } = await supabase
        .from('player_info_submissions')
        .select('id, player_name, user_id')
        .eq('id', validated.playerSubmissionId)
        .eq('team_id', params.id)
        .single();

      if (playerError || !playerData) {
        return NextResponse.json(
          { error: 'Player not found' },
          { status: 404 }
        );
      }

      // Check if player already has an active invite
      const { data: existingInvite } = await supabase
        .from('team_invites')
        .select('id, status')
        .eq('team_id', params.id)
        .eq('player_submission_id', validated.playerSubmissionId)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvite) {
        return NextResponse.json(
          { error: 'Player already has a pending invite' },
          { status: 400 }
        );
      }
    }

    // Create invite record
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .insert({
        team_id: params.id,
        player_submission_id: validated.playerSubmissionId || null,
        email: playerEmail || null,
        token: inviteToken,
        role: validated.role,
        status: 'pending',
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single();

    if (inviteError) {
      console.error('[Invite API] Error creating invite:', inviteError);
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      );
    }

    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${inviteToken}`;

    console.log('[Invite API] Generated invite link:', inviteLink);

    // TODO: Send email with invite link
    // For now, just return the link

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        token: inviteToken,
        link: inviteLink,
        expiresAt: invite.expires_at,
      },
      message: 'Invite created successfully'
    });
  } catch (error: any) {
    console.error('[Invite API] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET route to check invite status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get all invites for this team
    const { data: invites, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Invite API] Error fetching invites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch invites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invites
    });
  } catch (error: any) {
    console.error('[Invite API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
