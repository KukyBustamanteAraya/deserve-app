'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { PlayerInfoForm, type PlayerInfoData } from '@/components/team-hub/PlayerInfoForm';
import { SoccerFieldSelector } from '@/components/team-hub/SoccerFieldSelector';
import type { SportSlug } from '@/types/catalog';

type TeamInfo = {
  id: string;
  name: string;
  slug: string;
  sport: SportSlug;
  design_request_id: number | null;
};

const SPORT_POSITIONS: Record<string, string[]> = {
  soccer: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  futbol: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'],
  basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
  basquetbol: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'], // Spanish alias for basketball
  volleyball: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite Hitter', 'Libero'],
  voleibol: ['Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite Hitter', 'Libero'], // Spanish alias for volleyball
  baseball: ['Pitcher', 'Catcher', 'First Base', 'Second Base', 'Third Base', 'Shortstop', 'Left Field', 'Center Field', 'Right Field'],
  rugby: ['Prop', 'Hooker', 'Lock', 'Flanker', 'Number 8', 'Scrum-half', 'Fly-half', 'Center', 'Wing', 'Fullback'],
  golf: ['Player'],
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Component for authenticated users who are NOT members yet
function AuthenticatedInviteUI({
  teamInfo,
  currentUser,
  onSubmit
}: {
  teamInfo: TeamInfo;
  currentUser: any;
  onSubmit: (data: Omit<PlayerInfoData, 'email' | 'player_name'>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    jersey_number: '',
    size: 'M',
    position: '',
    additional_notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[AuthenticatedInviteUI] Team sport received:', teamInfo.sport);
  const normalizedSport = teamInfo.sport || 'futbol';
  console.log('[AuthenticatedInviteUI] Normalized sport:', normalizedSport);
  const positions = SPORT_POSITIONS[normalizedSport] || SPORT_POSITIONS['futbol'] || [];
  console.log('[AuthenticatedInviteUI] Available positions:', positions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.size) {
      setError('Please select a jersey size');
      return;
    }

    if (positions.length > 0 && !formData.position) {
      setError('Please select a position');
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Invite Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center">
          <div className="text-blue-600 text-5xl mb-4">🎯</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Join <strong>{teamInfo.name}</strong> as a player
          </p>
          <div className="bg-blue-50 rounded-lg p-4 mt-6">
            <p className="text-sm text-blue-900">
              Signed in as <strong>{currentUser.email}</strong>
            </p>
          </div>
        </div>

        {/* Simplified Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Complete Your Player Profile
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Jersey Number */}
            <div>
              <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-700 mb-2">
                Jersey Number
              </label>
              <input
                type="text"
                id="jersey_number"
                value={formData.jersey_number}
                onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 10"
                maxLength={3}
              />
            </div>

            {/* Size */}
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                Jersey Size <span className="text-red-600">*</span>
              </label>
              <select
                id="size"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
                Position <span className="text-red-600">*</span>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select position</option>
                  {positions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Additional Notes */}
            <div>
              <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                id="additional_notes"
                value={formData.additional_notes}
                onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Any special requests or notes..."
                rows={3}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  const router = useRouter();
  const [teamInfo, setTeamInfo] = useState<TeamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [showAuthenticatedInvite, setShowAuthenticatedInvite] = useState(false);

  useEffect(() => {
    validateTokenAndLoadTeam();
  }, [params.token]);

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
        .eq('info_collection_token', params.token)
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

      // Extract sport slug from joined data
      const sportSlug = (team as any).sports?.slug || null;

      console.log('[Collection Link] Team found:', team.name, 'ID:', team.id);
      console.log('[Collection Link] Team sport from JOIN:', sportSlug, 'Full sports data:', (team as any).sports);

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
        design_request_id: designRequest?.id || null,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuthenticatedSubmit(data: Omit<PlayerInfoData, 'email' | 'player_name'>) {
    if (!teamInfo || !currentUser) return;

    const supabase = getBrowserClient();

    try {
      console.log('[Collection Submit - Authenticated] Submitting player info for logged-in user');

      // Get user's name from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUser.id)
        .single();

      const playerName = profile?.full_name || currentUser.email?.split('@')[0] || 'Player';

      // Create player info submission
      const insertData = {
        team_id: teamInfo.id,
        design_request_id: teamInfo.design_request_id,
        player_name: playerName,
        jersey_number: data.jersey_number || null,
        size: data.size,
        position: data.position,
        additional_notes: data.additional_notes || null,
        submitted_by_manager: false,
        submission_token: params.token,
        user_id: currentUser.id, // Link immediately
      };

      console.log('[Collection Submit - Authenticated] INSERT data:', JSON.stringify(insertData, null, 2));
      console.log('[Collection Submit - Authenticated] submission_token value:', params.token);
      console.log('[Collection Submit - Authenticated] user_id value:', currentUser.id);
      console.log('[Collection Submit - Authenticated] auth.uid() should be:', currentUser.id);

      const { data: submission, error: submitError } = await supabase
        .from('player_info_submissions')
        .insert(insertData)
        .select()
        .single();

      if (submitError) {
        console.error('[Collection Submit - Authenticated] Error:', submitError);
        throw new Error(`Failed to submit: ${submitError.message}`);
      }

      console.log('[Collection Submit - Authenticated] Submission created:', submission);

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
      // Step 1: Check if this email already has an account
      console.log('[Collection Submit] Checking for existing account with email:', data.email);

      // We can't directly query auth.users, but we can check if the email will create a conflict
      // by looking at player_info_submissions that are already linked to user accounts
      const { data: existingSubmissions } = await supabase
        .from('player_info_submissions')
        .select('id, user_id, player_name')
        .eq('team_id', teamInfo.id)
        .not('user_id', 'is', null);

      console.log('[Collection Submit] Found existing submissions:', existingSubmissions);

      // Step 2: Submit player info
      console.log('[Collection Submit] Submitting player information...');

      const insertData = {
        team_id: teamInfo.id,
        design_request_id: teamInfo.design_request_id,
        player_name: data.player_name,
        jersey_number: data.jersey_number || null,
        size: data.size,
        position: data.position,
        additional_notes: data.additional_notes || null,
        submitted_by_manager: false,
        submission_token: params.token,
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

      // Step 3: Send magic link
      console.log('[Magic Link] Sending magic link to:', data.email);

      const { data: otpData, error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          shouldCreateUser: true, // Allow new user creation
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            player_name: data.player_name,
            team_id: teamInfo.id,
            team_slug: teamInfo.slug,
            submission_id: submission.id,
          }
        },
      });

      if (magicLinkError) {
        console.error('[Magic Link] ERROR:', magicLinkError);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">Validating link...</div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !teamInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">You're Already a Member!</h1>
          <p className="text-gray-600 mb-6">
            You're already part of <strong>{teamInfo.name}</strong>. No need to fill out the form again!
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/mi-equipo/${teamInfo.slug}`)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Go to Team Page
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showAuthenticatedInvite && teamInfo && currentUser) {
    return <AuthenticatedInviteUI teamInfo={teamInfo} currentUser={currentUser} onSubmit={handleAuthenticatedSubmit} />;
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Check Your Email!</h1>
          <p className="text-gray-600 mb-4">
            We've sent a magic link to your email address.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>📬 Next Steps:</strong>
            </p>
            <ol className="text-sm text-blue-900 text-left mt-2 space-y-2">
              <li>1. Check your email inbox</li>
              <li>2. Click the magic link we sent you</li>
              <li>3. You'll be automatically added to <strong>{teamInfo.name}</strong></li>
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
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-3xl">👕</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{teamInfo.name}</h1>
              <p className="text-gray-600">Player Information Collection</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>📝 Instructions:</strong> Please fill in your information below.
              All fields marked with <span className="text-red-600">*</span> are required.
            </p>
          </div>
        </div>

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
