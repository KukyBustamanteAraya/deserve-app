'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { PlayerInfoForm, type PlayerInfoData } from '@/components/team-hub/PlayerInfoForm';
import { SoccerFieldSelector } from '@/components/team-hub/SoccerFieldSelector';
import { MiniFieldMap } from '@/components/team/MiniFieldMap';
import { getFieldLayout } from '@/lib/sports/fieldLayouts';
import type { SportSlug } from '@/types/catalog';

type TeamInfo = {
  id: string;
  name: string;
  slug: string;
  sport: SportSlug; // Sport slug for technical lookups (e.g., getFieldLayout)
  sport_name: string; // Sport display name for profile storage (e.g., "Fútbol")
  design_request_id: number | null;
};

// Component for authenticated users who are NOT members yet
function AuthenticatedInviteUI({
  teamInfo,
  currentUser,
  teamPlayers,
  onSubmit
}: {
  teamInfo: TeamInfo;
  currentUser: any;
  teamPlayers: any[];
  onSubmit: (data: Omit<PlayerInfoData, 'email' | 'player_name' | 'size'>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    jersey_number: '',
    position: '',
    additional_notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[AuthenticatedInviteUI] Team sport received:', teamInfo.sport);
  const normalizedSport = teamInfo.sport || 'futbol';
  console.log('[AuthenticatedInviteUI] Normalized sport:', normalizedSport);

  // Get positions from field layout (same source as PlayerInfoForm for consistency)
  const fieldLayout = getFieldLayout(normalizedSport);
  const positions = fieldLayout.positions.map(pos => pos.name);
  console.log('[AuthenticatedInviteUI] Available positions from field layout:', positions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (positions.length > 0 && !formData.position) {
      setError('Please select a position');
      return;
    }

    // Validate that selected position is actually valid for this sport
    if (positions.length > 0 && formData.position && !positions.includes(formData.position)) {
      setError('Invalid position selected for this sport');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join team');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Invite Header */}
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 mb-6 text-center border border-gray-700">
          <div className="text-blue-500 text-5xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            You're Invited!
          </h1>
          <p className="text-lg text-gray-300 mb-4">
            Join <strong className="text-white">{teamInfo.name}</strong> as a player
          </p>
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-300">
              Signed in as <strong className="text-white">{currentUser.email}</strong>
            </p>
          </div>
        </div>

        {/* Mini Field Preview */}
        {teamInfo.sport && teamPlayers.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 mb-6 border border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-lg"></div>
            <div className="relative">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎯 Join Your Teammates!
                </h2>
                <p className="text-gray-300">
                  See who's already on the team
                </p>
              </div>
              <MiniFieldMap
                sport={teamInfo.sport}
                players={teamPlayers}
              />
            </div>
          </div>
        )}

        {/* Simplified Form */}
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">
            Complete Your Player Profile
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Jersey Number */}
            <div>
              <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-300 mb-2">
                Jersey Number
              </label>
              <input
                type="text"
                id="jersey_number"
                value={formData.jersey_number}
                onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                placeholder="e.g., 10"
                maxLength={3}
              />
            </div>

            {/* Position */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-2">
                Position <span className="text-red-500">*</span>
              </label>
              {(normalizedSport === 'soccer' || normalizedSport === 'futbol') ? (
                <SoccerFieldSelector
                  selectedPosition={formData.position}
                  onPositionChange={(position) => setFormData({ ...formData, position })}
                />
              ) : (
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 border border-gray-700 rounded-md text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  required
                >
                  <option value="" className="bg-black text-white">Select position</option>
                  {positions.map((pos) => (
                    <option key={pos} value={pos} className="bg-black text-white">
                      {pos}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-300 mb-2">
                Additional Notes
              </label>
              <textarea
                id="additional_notes"
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 hover:shadow-lg hover:shadow-green-600/50 text-white rounded-lg font-medium transition-all border border-green-600/50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Joining Team...' : 'Accept & Join Team'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function PlayerCollectionPage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [showAuthenticatedInvite, setShowAuthenticatedInvite] = useState(false);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);

  useEffect(() => {
    validateTokenAndLoadTeam();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function validateTokenAndLoadTeam() {
    try {
      const supabase = getBrowserClient();

      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[Collection Link] User check:', user ? `Logged in as ${user.email}` : 'Not logged in');
      setCurrentUser(user);

      // Find team by collection token
      const { data: settings, error: settingsError } = await supabase
        .from('team_settings')
        .select('team_id')
        .eq('info_collection_token', token)
        .single();

      if (settingsError || !settings) {
        throw new Error('Invalid or expired collection link');
      }

      // Get team info with sport via JOIN (teams.sport_id -> sports table)
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          slug,
          sports:sport_id (
            id,
            slug,
            name
          )
        `)
        .eq('id', settings.team_id)
        .single();

      if (teamError || !team) {
        throw new Error('Team not found');
      }

      // Extract sport slug and name from joined data
      const sportSlug = (team as any).sports?.slug || null;
      const sportName = (team as any).sports?.name || '';

      console.log('[Collection Link] Team found:', team.name, 'ID:', team.id);
      console.log('[Collection Link] Team sport from JOIN:', { slug: sportSlug, name: sportName }, 'Full sports data:', (team as any).sports);

      // Get current team players for field visualization
      const { data: players } = await supabase
        .from('team_players')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: true });

      console.log('[Collection Link] Loaded team players:', players?.length || 0);
      setTeamPlayers(players || []);

      // If user is logged in, check if they're already a member
      if (user) {
        console.log('[Collection Link] Checking membership for user:', user.id, 'in team:', team.id);

        const { data: membership, error: membershipError } = await supabase
          .from('team_memberships')
          .select('role')
          .eq('team_id', team.id)
          .eq('user_id', user.id)
          .maybeSingle();

        console.log('[Collection Link] Membership query result:', {
          membership,
          error: membershipError?.message
        });

        if (membership) {
          console.log('[Collection Link] User is already a member! Role:', membership.role);
          setAlreadyMember(true);
          setTeamInfo({
            id: team.id,
            name: team.name,
            slug: team.slug,
            sport: sportSlug,
            sport_name: sportName,
            design_request_id: null,
          });
          setLoading(false);
          return;
        } else {
          console.log('[Collection Link] User is NOT a member yet. Showing authenticated invite flow.');
          setShowAuthenticatedInvite(true);
        }
      }

      // Get latest design request for this team
      const { data: designRequest } = await supabase
        .from('design_requests')
        .select('id')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setTeamInfo({
        id: team.id,
        name: team.name,
        slug: team.slug,
        sport: sportSlug,
        sport_name: sportName,
        design_request_id: designRequest?.id || null,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthenticatedSubmit(data: Omit<PlayerInfoData, 'email' | 'player_name' | 'size'>) {
    if (!teamInfo || !currentUser) return;

    const supabase = getBrowserClient();

    try {
      console.log('[Collection Submit - Authenticated] Submitting player info for logged-in user');

      // Use sport name from teamInfo (already fetched during validation)
      const teamSportName = teamInfo.sport_name;
      console.log('[Collection Submit - Authenticated] Team sport name:', teamSportName);

      // Get user's full profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, user_type, athletic_profile')
        .eq('id', currentUser.id)
        .single();

      const playerName = profile?.full_name || currentUser.email?.split('@')[0] || 'Player';

      // If user doesn't have user_type, auto-set as player (they're joining via collection link)
      if (!profile?.user_type) {
        console.log('[Collection Submit - Authenticated] User has no user_type, auto-setting as player');

        // Create basic athletic_profile for new player with proper sport NAME
        const basicAthleticProfile = {
          sports: teamSportName ? [teamSportName] : [],
          primary_sport: teamSportName || '',
          default_positions: data.position && teamSportName ? [`${teamSportName} - ${data.position}`] : [],
          preferred_jersey_number: data.jersey_number || '',
          gender: null,
        };

        // Set user_type to player
        await supabase
          .from('profiles')
          .update({
            user_type: 'player',
            athletic_profile: basicAthleticProfile
          })
          .eq('id', currentUser.id);

        console.log('[Collection Submit - Authenticated] User auto-configured as player with sport:', teamSportName);
      }
      // If user is a manager/director joining as player, upgrade to hybrid
      else if (profile.user_type === 'manager' || profile.user_type === 'athletic_director') {
        console.log('[Collection Submit - Authenticated] Manager/Director joining as player, upgrading to hybrid');

        // Create basic athletic_profile with proper sport NAME and field names
        const basicAthleticProfile = {
          sports: teamSportName ? [teamSportName] : [],
          primary_sport: teamSportName || '',
          default_positions: data.position && teamSportName ? [`${teamSportName} - ${data.position}`] : [],
          preferred_jersey_number: data.jersey_number || '',
          gender: null, // Will be filled in profile update flow
        };

        // Upgrade to hybrid
        await supabase
          .from('profiles')
          .update({
            user_type: 'hybrid',
            athletic_profile: basicAthleticProfile
          })
          .eq('id', currentUser.id);

        console.log('[Collection Submit - Authenticated] User upgraded to hybrid successfully with sport:', teamSportName);
      }

      // Check if submission already exists for this user/team combo
      const { data: existingSubmission } = await supabase
        .from('player_info_submissions')
        .select('id')
        .eq('team_id', teamInfo.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const submissionData = {
        team_id: teamInfo.id,
        design_request_id: teamInfo.design_request_id,
        player_name: playerName,
        jersey_number: data.jersey_number || null,
        size: 'M', // Default size for authenticated users (size will be collected later)
        position: data.position,
        additional_notes: data.additional_notes || null,
        submitted_by_manager: false,
        submission_token: token,
        user_id: currentUser.id, // Link immediately
        confirmed_by_player: true, // Player confirmed via collection link
        confirmation_date: new Date().toISOString(),
        confirmation_method: 'collection_link',
      };

      console.log('[Collection Submit - Authenticated] Submission data:', JSON.stringify(submissionData, null, 2));
      console.log('[Collection Submit - Authenticated] Existing submission:', existingSubmission?.id || 'none');

      let submission;

      if (existingSubmission) {
        // Update existing submission (re-invite case)
        console.log('[Collection Submit - Authenticated] Updating existing submission');
        const { data: updated, error: updateError } = await supabase
          .from('player_info_submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id)
          .select()
          .single();

        if (updateError) {
          console.error('[Collection Submit - Authenticated] Update error:', updateError);
          throw new Error(`Failed to update submission: ${updateError.message}`);
        }
        submission = updated;
      } else {
        // Insert new submission
        console.log('[Collection Submit - Authenticated] Creating new submission');
        const { data: inserted, error: insertError } = await supabase
          .from('player_info_submissions')
          .insert(submissionData)
          .select()
          .single();

        if (insertError) {
          console.error('[Collection Submit - Authenticated] Insert error:', insertError);
          throw new Error(`Failed to submit: ${insertError.message}`);
        }
        submission = inserted;
      }

      console.log('[Collection Submit - Authenticated] Submission saved:', submission);

      // Create team membership
      const { error: membershipError } = await supabase
        .from('team_memberships')
        .insert({
          team_id: teamInfo.id,
          user_id: currentUser.id,
          role: 'player',
        });

      if (membershipError && membershipError.code !== '23505') {
        console.error('[Collection Submit - Authenticated] Membership error:', membershipError);
        throw new Error(`Failed to join team: ${membershipError.message}`);
      }

      // ALSO add to team_players (for mini field view)
      const { error: teamPlayerError } = await supabase
        .from('team_players')
        .upsert({
          team_id: teamInfo.id,
          user_id: currentUser.id,
          player_name: playerName,
          jersey_number: data.jersey_number || null,
          position: data.position || null,
          is_starter: false, // Default to bench, manager can adjust later
        }, {
          onConflict: 'team_id,user_id', // Update on conflict
          ignoreDuplicates: false,
        });

      if (teamPlayerError) {
        console.error('[Collection Submit - Authenticated] Team player error:', teamPlayerError);
        // Don't throw - this is not critical, they're already in roster and membership
      }

      console.log('[Collection Submit - Authenticated] Success! Redirecting to team page...');

      // Redirect to team page
      router.push(`/mi-equipo/${teamInfo.slug}`);
    } catch (error: any) {
      console.error('[Collection Submit - Authenticated] Fatal error:', error);
      throw error;
    }
  }

  async function handleSubmit(data: PlayerInfoData) {
    if (!teamInfo || !data.email) return;

    const supabase = getBrowserClient();

    try {
      // Step 1: Submit player info FIRST (before sending magic link)
      console.log('[Collection Submit] Submitting player information for:', data.email);

      const insertData = {
        team_id: teamInfo.id,
        design_request_id: teamInfo.design_request_id,
        player_name: data.player_name,
        jersey_number: data.jersey_number || null,
        size: data.size || null, // Size is optional in collection flow
        position: data.position,
        additional_notes: data.additional_notes || null,
        submitted_by_manager: false,
        submission_token: token,
        user_id: null, // Will be linked after they confirm email
      };

      const { data: submission, error: submitError } = await supabase
        .from('player_info_submissions')
        .insert(insertData)
        .select()
        .single();

      if (submitError) {
        console.error('[Collection Submit] Error details:', {
          message: submitError.message,
          details: submitError.details,
          hint: submitError.hint,
          code: submitError.code,
        });
        throw new Error(`Failed to submit player information: ${submitError.message}`);
      }

      console.log('[Collection Submit] Success! Submission:', submission);

      // Step 2: Send magic link (will create account if needed, or log in if exists)
      console.log('[Magic Link] Sending magic link to:', data.email);

      // DEBUG: Log the exact metadata being sent
      const metadataToSend = {
        player_name: data.player_name,
        team_id: teamInfo.id,
        team_slug: teamInfo.slug,
        submission_id: submission.id,
      };
      console.log('[Magic Link] Metadata being sent in OTP call:', JSON.stringify(metadataToSend, null, 2));

      // IMPORTANT: Pass team info via redirect URL for existing users
      // (metadata only works for NEW users, not existing ones)
      const redirectUrl = `${window.location.origin}/auth/callback?team_id=${teamInfo.id}&team_slug=${teamInfo.slug}&submission_id=${submission.id}`;
      console.log('[Magic Link] Redirect URL with params:', redirectUrl);

      const { data: otpData, error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true, // Allow new user creation
          emailRedirectTo: redirectUrl,
          data: metadataToSend, // Still include for new users
        },
      });

      console.log('[Magic Link] OTP Response:', { user: otpData?.user?.email, session: !!otpData?.session });

      if (magicLinkError) {
        console.error('[Magic Link] ERROR:', magicLinkError);

        // Check for rate limit error
        if (magicLinkError.message?.includes('can only request this after')) {
          // Extract the seconds from the error message
          const match = magicLinkError.message.match(/(\d+)\s+seconds/);
          const seconds = match ? match[1] : '60';

          throw new Error(
            `Your information has been saved successfully! However, please wait ${seconds} seconds before requesting another magic link. If you've already received a link in your email, please use that one.`
          );
        }

        // If it's a database error, it might be because trigger is missing
        if (magicLinkError.message?.includes('Database error')) {
          throw new Error(
            'There was a problem creating your account. Please contact your team manager. Error: ' +
            magicLinkError.message
          );
        }

        throw new Error('Failed to send magic link: ' + magicLinkError.message);
      }

      console.log('[Magic Link] SUCCESS! Check your email:', data.email);
      setSubmitted(true);

    } catch (error: any) {
      console.error('[Collection Submit] Fatal error:', error);
      throw error;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-300 mb-4">Validating link...</div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !teamInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Link</h1>
          <p className="text-gray-300 mb-6">
            {error || 'This collection link is invalid or has expired.'}
          </p>
          <p className="text-sm text-gray-500">
            Please contact your team manager for a new link.
          </p>
        </div>
      </div>
    );
  }

  if (alreadyMember && teamInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-white mb-4">You're Already a Member!</h1>
          <p className="text-gray-300 mb-6">
            You're already part of <strong className="text-white">{teamInfo.name}</strong>. No need to fill out the form again!
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/mi-equipo/${teamInfo.slug}`)}
              className="w-full px-6 py-3 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg hover:shadow-lg hover:shadow-blue-600/50 font-medium transition-all border border-blue-600/50"
            >
              Go to Team Page
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 text-gray-300 hover:text-white rounded-lg hover:bg-gray-700/50 font-medium transition-all border border-gray-700"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAuthenticatedInvite && teamInfo && currentUser) {
    return <AuthenticatedInviteUI teamInfo={teamInfo} currentUser={currentUser} teamPlayers={teamPlayers} onSubmit={handleAuthenticatedSubmit} />;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-white mb-4">Check Your Email!</h1>
          <p className="text-gray-300 mb-4">
            We've sent a magic link to your email address.
          </p>
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-300">
              <strong>📬 Next Steps:</strong>
            </p>
            <ol className="text-sm text-blue-300 text-left mt-2 space-y-2">
              <li>1. Check your email inbox</li>
              <li>2. Click the magic link we sent you</li>
              <li>3. You&apos;ll be automatically added to <strong className="text-white">{teamInfo.name}</strong></li>
              <li>4. View team updates, designs, and more!</li>
            </ol>
          </div>
          <p className="text-xs text-gray-500">
            Didn't receive the email? Check your spam folder or contact your team manager.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 mb-6 border border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-900/30 border border-blue-500/50 rounded-lg">
              <span className="text-3xl">👕</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{teamInfo.name}</h1>
              <p className="text-gray-300">Player Information Collection</p>
            </div>
          </div>

          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
            <p className="text-sm text-blue-300">
              <strong>📝 Instructions:</strong> Please fill in your information below.
              All fields marked with <span className="text-red-500">*</span> are required.
            </p>
          </div>
        </div>

        {/* Mini Field Preview */}
        {teamInfo.sport && teamPlayers.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 mb-6 border border-gray-700 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
            <div className="relative">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎯 Join Your Teammates!
                </h2>
                <p className="text-gray-300">
                  See who's already on the team
                </p>
              </div>
              <MiniFieldMap
                sport={teamInfo.sport}
                players={teamPlayers}
              />
            </div>
          </div>
        )}

        {/* Player Info Form */}
        <PlayerInfoForm
          teamId={teamInfo.id}
          userId="" // No user required for public submission
          sport={teamInfo.sport}
          onSubmit={handleSubmit}
          requireEmail={true}
          teamName={teamInfo.name}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This is a secure form provided by Deserve App</p>
          <p className="mt-2">Questions? Contact your team manager</p>
        </div>
      </div>
    </div>
  );
}
