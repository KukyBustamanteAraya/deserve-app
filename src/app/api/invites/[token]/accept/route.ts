import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
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

    // Fetch invite
    const { data: invite, error: inviteError } = await supabase
      .from('team_invites')
      .select('*')
      .eq('token', params.token)
      .single();

    if (inviteError || !invite) {
      console.error('[Accept Invite] Invite not found:', inviteError);
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Verify invite is still pending
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: 'Invite has already been processed' },
        { status: 400 }
      );
    }

    // Verify invite is not expired
    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 400 }
      );
    }

    // Check if user is already a member of this team
    const { data: existingMembership } = await supabase
      .from('team_memberships')
      .select('*')
      .eq('team_id', invite.team_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMembership) {
      // Update invite status to accepted anyway
      await supabase
        .from('team_invites')
        .update({
          status: 'accepted',
          accepted_by: user.id,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invite.id);

      return NextResponse.json(
        { error: 'You are already a member of this team' },
        { status: 400 }
      );
    }

    // Check if user has completed profile setup
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, athletic_profile, manager_profile')
      .eq('id', user.id)
      .single();

    // If user doesn't have user_type, they need to complete profile setup first
    if (!profile?.user_type) {
      console.log('[Accept Invite] User has no user_type, needs profile setup');
      return NextResponse.json(
        {
          error: 'profile_setup_required',
          message: 'Please complete your profile setup first',
          redirect_to: `/profile/setup?welcome=true&next=${encodeURIComponent(`/api/invites/${params.token}/accept`)}`
        },
        { status: 400 }
      );
    }

    // If user is being invited as 'player' but is manager/director, upgrade to hybrid
    if (invite.role === 'player' && (profile.user_type === 'manager' || profile.user_type === 'athletic_director')) {
      console.log('[Accept Invite] Manager/Director invited as player, upgrading to hybrid');

      // Get team info to get sport
      const { data: team } = await supabase
        .from('teams')
        .select('sports:sport_id(slug, name)')
        .eq('id', invite.team_id)
        .single();

      const teamSport = (team as any)?.sports?.name || '';

      // Create basic athletic_profile if they don't have one
      const basicAthleticProfile = profile.athletic_profile || {
        sports: teamSport ? [teamSport] : [],
        primary_sport: teamSport,
        positions: [],
        jersey_number: '',
        gender: null,
      };

      // Upgrade to hybrid
      await supabase
        .from('profiles')
        .update({
          user_type: 'hybrid',
          athletic_profile: basicAthleticProfile
        })
        .eq('id', user.id);

      console.log('[Accept Invite] User upgraded to hybrid successfully');
    }

    // Auto-link: If invite is linked to a player submission, link the user_id
    if (invite.player_submission_id) {
      const { error: linkError } = await supabase
        .from('player_info_submissions')
        .update({ user_id: user.id })
        .eq('id', invite.player_submission_id)
        .is('user_id', null); // Only update if not already linked

      if (linkError) {
        console.error('[Accept Invite] Error linking player:', linkError);
        // Continue anyway - not critical
      }
    }

    // Add user to team_memberships
    const { error: membershipError } = await supabase
      .from('team_memberships')
      .insert({
        team_id: invite.team_id,
        user_id: user.id,
        role: invite.role,
      });

    if (membershipError) {
      console.error('[Accept Invite] Error creating membership:', membershipError);
      return NextResponse.json(
        { error: 'Failed to add you to the team' },
        { status: 500 }
      );
    }

    // Mark invite as accepted
    const { error: updateError } = await supabase
      .from('team_invites')
      .update({
        status: 'accepted',
        accepted_by: user.id,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('[Accept Invite] Error updating invite status:', updateError);
      // Continue anyway - the important parts succeeded
    }

    return NextResponse.json({
      success: true,
      message: 'Invite accepted successfully!',
      team_id: invite.team_id
    });
  } catch (error: any) {
    console.error('[Accept Invite] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
