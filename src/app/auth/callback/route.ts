import { logger } from '@/lib/logger';
import { createRouteHandlerClient } from '@/lib/supabase/route'
import { NextRequest, NextResponse } from 'next/server'
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Collection link flow params (for existing users)
  const urlTeamId = searchParams.get('team_id')
  const urlTeamSlug = searchParams.get('team_slug')
  const urlSubmissionId = searchParams.get('submission_id')

  logger.debug('[auth/callback] Code:', { status: code ? 'present' : 'missing' })
  logger.debug('[auth/callback] URL params:', { team_id: urlTeamId, team_slug: urlTeamSlug, submission_id: urlSubmissionId })

  if (!code) {
    logger.debug('[auth/callback] No code - redirecting to error')
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  }

  // Create a temporary response to exchange code
  const tempResponse = NextResponse.redirect(`${origin}/dashboard`)
  const supabase = createRouteHandlerClient(request, tempResponse)

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    logger.error('[auth/callback] Exchange failed', { message: error.message })
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // Create profile for new user if it doesn't exist
  if (data.user) {
    // DEBUG: Log all user metadata to see what's being passed
    logger.debug('[auth/callback] Full user_metadata:', { metadata: JSON.stringify(data.user.user_metadata, null, 2) });

    // Handle collection link flow - auto-add to team
    // Read from user metadata (for new users) OR URL params (for existing users)
    const teamId = data.user.user_metadata?.team_id || urlTeamId;
    const teamSlug = data.user.user_metadata?.team_slug || urlTeamSlug;
    const submissionId = data.user.user_metadata?.submission_id || urlSubmissionId;

    // If this is a collection link flow, get player info to auto-setup profile
    let playerInfoForProfile = null;
    let teamSportName = null;

    if (submissionId) {
      const { data: submissionData } = await supabase
        .from('player_info_submissions')
        .select('player_name, position, jersey_number, team_id')
        .eq('id', submissionId)
        .single();

      playerInfoForProfile = submissionData;
      logger.debug('[auth/callback] Collection link flow - player info:', { playerInfo: playerInfoForProfile });

      // Get team sport info BEFORE creating profile
      if (playerInfoForProfile?.team_id) {
        const { data: teamData } = await supabase
          .from('teams')
          .select('sports:sport_id(name)')
          .eq('id', playerInfoForProfile.team_id)
          .single();

        teamSportName = (teamData as any)?.sports?.name;
        logger.debug('[auth/callback] Team sport name:', teamSportName);
      }
    }

    try {
      // If collection link flow, auto-setup as player with provided info
      if (playerInfoForProfile) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: playerInfoForProfile.player_name || 'New Player',
          user_type: 'player', // Auto-set as player since they're joining via collection link
          athletic_profile: {
            sports: teamSportName ? [teamSportName] : [],
            primary_sport: teamSportName || '',
            default_positions: playerInfoForProfile.position && teamSportName ? [`${teamSportName} - ${playerInfoForProfile.position}`] : [],
            preferred_jersey_number: playerInfoForProfile.jersey_number || '',
            gender: null, // Can be updated later if needed
          }
        }).select().single();

        // Ignore conflict errors (profile already exists)
        if (profileError && profileError.code !== '23505') {
          logger.error('[auth/callback] Profile creation failed', { message: profileError.message });
        } else {
          logger.debug('[auth/callback] Auto-created player profile with sport:', teamSportName);
        }
      } else {
        // Standard profile creation for non-collection link flows
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.player_name || 'New User',
        }).select().single();

        // Ignore conflict errors (profile already exists)
        if (profileError && profileError.code !== '23505') {
          logger.error('[auth/callback] Profile creation failed', { message: profileError.message });
        }
      }
    } catch (profileError) {
      logger.error('[auth/callback] Profile creation error', toError(profileError));
    }

    logger.debug('[auth/callback] Team info from metadata:', {
      team_id: data.user.user_metadata?.team_id,
      team_slug: data.user.user_metadata?.team_slug,
      submission_id: data.user.user_metadata?.submission_id
    });
    logger.debug('[auth/callback] Final values (with URL fallback):', { teamId, teamSlug, submissionId });

    if (teamId && submissionId) {
      logger.debug('[auth/callback] Collection link flow detected', { teamId, teamSlug, submissionId });

      try {
        // Note: Profile already created with complete sport info above
        // No need for separate update anymore

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
              logger.error('[auth/callback] Failed to delete duplicate submissions', toSupabaseError(deleteError));
            } else {
              logger.debug('[auth/callback] Deleted duplicate submissions:', { count: oldSubmissionIds.length });
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
            logger.error('[auth/callback] Failed to add team membership', toSupabaseError(membershipError));
          }
        } else {
          logger.debug('[auth/callback] Added user to team successfully');
        }

        // Link player_info_submission to user account and mark as confirmed
        const { error: linkError } = await supabase
          .from('player_info_submissions')
          .update({
            user_id: data.user.id,
            confirmed_by_player: true, // Player confirmed via collection link
            confirmation_date: new Date().toISOString(),
            confirmation_method: 'collection_link',
          })
          .eq('id', submissionId)
          .is('user_id', null); // Only update if not already linked

        if (linkError) {
          logger.error('[auth/callback] Failed to link player submission', toSupabaseError(linkError));
        } else {
          logger.debug('[auth/callback] Linked player submission to user');
        }

        // ALSO add to team_players (for mini field view)
        // Get player info from the submission
        const { data: playerInfo } = await supabase
          .from('player_info_submissions')
          .select('player_name, jersey_number, position')
          .eq('id', submissionId)
          .single();

        if (playerInfo) {
          const { error: teamPlayerError } = await supabase
            .from('team_players')
            .upsert({
              team_id: teamId,
              user_id: data.user.id,
              player_name: playerInfo.player_name,
              jersey_number: playerInfo.jersey_number || null,
              position: playerInfo.position || null,
              is_starter: false, // Default to bench, manager can adjust later
            }, {
              onConflict: 'team_id,user_id', // Update on conflict
              ignoreDuplicates: false,
            });

          if (teamPlayerError) {
            logger.error('[auth/callback] Team player error', toSupabaseError(teamPlayerError));
            // Don't throw - this is not critical, they're already in roster and membership
          } else {
            logger.debug('[auth/callback] Added player to team_players for mini field view');
          }
        } else {
          logger.warn('[auth/callback] Could not fetch player info for team_players insertion');
        }
      } catch (error) {
        logger.error('[auth/callback] Collection link flow error', toError(error));
        // Continue anyway - at least they have an account
      }
    }
  }

  // Determine redirect URL
  let redirectUrl = next;

  // HIGHEST PRIORITY: Collection link flow - redirect to team page
  // Check both metadata (new users) and URL params (existing users)
  const finalTeamSlug = data?.user?.user_metadata?.team_slug || urlTeamSlug;
  const finalTeamId = data?.user?.user_metadata?.team_id || urlTeamId;

  logger.debug('[auth/callback] Redirect decision - metadata team_slug:', { teamSlug: data?.user?.user_metadata?.team_slug });
  logger.debug('[auth/callback] Redirect decision - URL param team_slug:', { urlTeamSlug });
  logger.debug('[auth/callback] Redirect decision - finalTeamSlug:', { finalTeamSlug });
  logger.debug('[auth/callback] Redirect decision - finalTeamId:', { finalTeamId });

  // If we have a team but slug is missing, fetch it from the database
  if (finalTeamId && (!finalTeamSlug || finalTeamSlug === 'null' || finalTeamSlug === 'undefined')) {
    logger.warn('[auth/callback] Team ID exists but slug is missing/invalid, fetching from database');
    const { data: teamData } = await supabase
      .from('teams')
      .select('slug')
      .eq('id', finalTeamId)
      .single();

    if (teamData?.slug) {
      logger.debug('[auth/callback] Found team slug from database:', teamData.slug);
      redirectUrl = `/mi-equipo/${teamData.slug}`;
    } else {
      logger.error('[auth/callback] Team has no slug! Redirecting to dashboard instead');
      redirectUrl = '/dashboard';
    }
  } else if (finalTeamSlug && finalTeamSlug !== 'null' && finalTeamSlug !== 'undefined') {
    // Collection link flow detected - go straight to team page
    redirectUrl = `/mi-equipo/${finalTeamSlug}`;
    logger.debug('[auth/callback] Collection link flow - redirecting to team page:', { redirectUrl });
  } else {
    // Not a collection link - check if profile setup is needed
    logger.debug('[auth/callback] No collection link detected - checking if profile setup needed');
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', data.user.id)
      .single();

    logger.debug('[auth/callback] Profile data:', { profileData });
    if (!profileData?.user_type) {
      logger.debug('[auth/callback] User has no user_type, redirecting to profile setup');
      redirectUrl = '/profile/setup?welcome=true';
    }
  }

  logger.debug('[auth/callback] Success - session established, cookies set')
  logger.debug('[auth/callback] User:', { email: data?.user?.email })
  logger.debug('[auth/callback] Redirecting to:', { redirectUrl })

  // Create final response with correct redirect URL
  const finalResponse = NextResponse.redirect(`${origin}${redirectUrl}`)

  // Copy Set-Cookie headers from temp response (where Supabase set the auth cookies)
  const setCookieHeaders = tempResponse.headers.getSetCookie();
  setCookieHeaders.forEach(cookie => {
    finalResponse.headers.append('set-cookie', cookie);
  });

  return finalResponse
}
