import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const { email, teamSlug, teamName, inviterName, token } = await request.json();

    if (!email || !teamSlug || !teamName || !token) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate the invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_SITE_URL}/join/${teamSlug}?token=${token}`;

    // Send email using Supabase Auth's built-in email
    // This creates a magic link that also accepts the team invite
    const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        team_slug: teamSlug,
        team_name: teamName,
        inviter_name: inviterName,
        invite_token: token,
      },
      redirectTo: inviteLink,
    });

    if (authError) {
      logger.error('Error sending invite:', toError(authError));
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully'
    });
  } catch (error: any) {
    logger.error('Error in send-team-invite:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
