'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

interface InviteData {
  id: string;
  team_id: string;
  player_submission_id: string | null;
  email: string | null;
  role: string;
  status: string;
  expires_at: string;
  team: {
    name: string;
    slug: string;
  };
  player: {
    player_name: string;
  } | null;
}

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    loadInviteData();
  }, [params.token]);

  const loadInviteData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      // Fetch invite by token (using service role would be better but we'll use a public endpoint)
      const response = await fetch(`/api/invites/${params.token}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invite not found');
        setLoading(false);
        return;
      }

      setInvite(data.invite);

      // If user is logged in, check if they're already a member of this team
      if (currentUser && data.invite?.team_id) {
        console.log('[Invite] Checking if user is already a member of team:', data.invite.team_id);

        const { data: membership, error: membershipError } = await supabase
          .from('team_memberships')
          .select('role')
          .eq('team_id', data.invite.team_id)
          .eq('user_id', currentUser.id)
          .maybeSingle();

        console.log('[Invite] Membership check result:', { membership, error: membershipError?.message });

        if (membership) {
          console.log('[Invite] User is already a member! Role:', membership.role);
          setAlreadyMember(true);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error('[Invite] Error loading invite:', err);
      setError('Failed to load invite');
      setLoading(false);
    }
  };

  const handleAcceptInvite = async () => {
    if (!invite || !user) return;

    setAccepting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please log in to accept this invite');
        router.push(`/login?redirect=/invite/${params.token}`);
        return;
      }

      const response = await fetch(`/api/invites/${params.token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to accept invite');
        setAccepting(false);
        return;
      }

      alert('Invite accepted! You are now a member of the team.');
      router.push(`/mi-equipo?team=${invite.team_id}`);
    } catch (error) {
      console.error('[Invite] Error accepting invite:', error);
      alert('Failed to accept invite');
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This invitation may have expired, been cancelled, or is invalid.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Check if invite is expired
  const isExpired = new Date(invite.expires_at) < new Date();
  const isAccepted = invite.status !== 'pending';

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-yellow-600 text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Expired</h1>
          <p className="text-gray-600 mb-6">
            This invitation expired on {new Date(invite.expires_at).toLocaleDateString()}.
            Please contact the team manager for a new invitation.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-green-600 text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite Already Accepted</h1>
          <p className="text-gray-600 mb-6">
            This invitation has already been accepted.
          </p>
          <button
            onClick={() => router.push(`/mi-equipo?team=${invite.team_id}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Go to Team
          </button>
        </div>
      </div>
    );
  }

  if (alreadyMember && invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">You're Already a Member!</h1>
          <p className="text-gray-600 mb-6">
            You're already part of <strong>{invite.team.name}</strong>. No need to accept this invitation again!
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push(`/mi-equipo/${invite.team.slug}`)}
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-blue-600 text-5xl mb-4">🎯</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            You're Invited!
          </h1>
          <p className="text-gray-600">
            Join <strong>{invite.team.name}</strong> as a {invite.role}
          </p>
        </div>

        {invite.player && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> This invitation is specifically for{' '}
              <strong>{invite.player.player_name}</strong>. By accepting, your account
              will be linked to this player's roster entry.
            </p>
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">Team:</span>
            <span className="font-medium text-gray-900">{invite.team.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">Role:</span>
            <span className="font-medium text-gray-900 capitalize">{invite.role}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b">
            <span className="text-gray-600">Expires:</span>
            <span className="font-medium text-gray-900">
              {new Date(invite.expires_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center mb-4">
              You need to sign in or create an account to accept this invitation
            </p>
            <button
              onClick={() => router.push(`/login?redirect=/invite/${params.token}`)}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => router.push(`/register?redirect=/invite/${params.token}`)}
              className="w-full px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center mb-4">
              Signed in as <strong>{user.email}</strong>
            </p>
            <button
              onClick={handleAcceptInvite}
              disabled={accepting}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
