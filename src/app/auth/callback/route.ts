import { logger } from '@/lib/logger';
import { createRouteHandlerClient } from '@/lib/supabase/route'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  logger.debug('[auth/callback] Code:', code ? 'present' : 'missing')

  if (!code) {
    logger.debug('[auth/callback] No code - redirecting to error')
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Create a temporary response to exchange code
  const tempResponse = NextResponse.redirect(`${origin}/dashboard`)
  const supabase = createRouteHandlerClient(request, tempResponse)

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    logger.error('[auth/callback] Exchange failed:', error.message)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // Create profile for new user if it doesn't exist
  if (data.user) {
    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.player_name || 'New User',
      }).select().single();

      // Ignore conflict errors (profile already exists)
      if (profileError && profileError.code !== '23505') {
        logger.error('[auth/callback] Profile creation failed:', profileError.message);
      }
    } catch (profileError) {
      logger.error('[auth/callback] Profile creation error:', profileError);
    }

    // Handle collection link flow - auto-add to team
    // Read from user metadata (passed via signInWithOtp data option)
    const teamId = data.user.user_metadata?.team_id;
    const teamSlug = data.user.user_metadata?.team_slug;
    const submissionId = data.user.user_metadata?.submission_id;

    if (teamId && submissionId) {
      logger.debug('[auth/callback] Collection link flow detected', { teamId, teamSlug, submissionId });

      try {
        // Check if user already has submissions for this team
        const { data: existingSubmissions } = await supabase
          .from('player_info_submissions')
          .select('id')
          .eq('team_id', teamId)
          .eq('user_id', data.user.id);

        // If user already has submissions, delete them (except the new one)
        if (existingSubmissions && existingSubmissions.length > 0) {
          logger.debug('[auth/callback] User already has submissions for this team, cleaning up duplicates');

          const oldSubmissionIds = existingSubmissions
            .filter(sub => sub.id !== submissionId)
            .map(sub => sub.id);

          if (oldSubmissionIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('player_info_submissions')
              .delete()
              .in('id', oldSubmissionIds);

            if (deleteError) {
              logger.error('[auth/callback] Failed to delete duplicate submissions:', deleteError);
            } else {
              logger.debug('[auth/callback] Deleted', oldSubmissionIds.length, 'duplicate submissions');
            }
          }
        }

        // Add user to team as player
        const { error: membershipError } = await supabase
          .from('team_memberships')
          .insert({
            team_id: teamId,
            user_id: data.user.id,
            role: 'player',
          });

        if (membershipError) {
          // Ignore conflict error if already a member
          if (membershipError.code !== '23505') {
            logger.error('[auth/callback] Failed to add team membership:', membershipError);
          }
        } else {
          logger.debug('[auth/callback] Added user to team successfully');
        }

        // Link player_info_submission to user account
        const { error: linkError } = await supabase
          .from('player_info_submissions')
          .update({ user_id: data.user.id })
          .eq('id', submissionId)
          .is('user_id', null); // Only update if not already linked

        if (linkError) {
          logger.error('[auth/callback] Failed to link player submission:', linkError);
        } else {
          logger.debug('[auth/callback] Linked player submission to user');
        }
      } catch (error) {
        logger.error('[auth/callback] Collection link flow error:', error);
        // Continue anyway - at least they have an account
      }
    }
  }

  // Determine final redirect URL
  let redirectUrl = next;

  // If collection link flow, redirect to team page
  if (data?.user?.user_metadata?.team_slug) {
    redirectUrl = `/mi-equipo/${data.user.user_metadata.team_slug}`;
    logger.debug('[auth/callback] Collection link flow - redirecting to team page');
  }

  logger.debug('[auth/callback] Success - session established, cookies set')
  logger.debug('[auth/callback] User:', data?.user?.email)
  logger.debug('[auth/callback] Redirecting to:', redirectUrl)

  // Create final response with correct redirect URL
  const finalResponse = NextResponse.redirect(`${origin}${redirectUrl}`)

  // Copy Set-Cookie headers from temp response (where Supabase set the auth cookies)
  const setCookieHeaders = tempResponse.headers.getSetCookie();
  setCookieHeaders.forEach(cookie => {
    finalResponse.headers.append('set-cookie', cookie);
  });

  return finalResponse
}
