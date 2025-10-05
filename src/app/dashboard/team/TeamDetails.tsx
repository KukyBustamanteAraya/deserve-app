// @ts-nocheck
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile, TeamDetails as TeamDetailsType } from '@/types/user';

interface TeamDetailsProps {
  user: any;
  profile: UserProfile;
  team: TeamDetailsType;
}

export default function TeamDetails({ user, profile, team }: TeamDetailsProps) {
  const router = useRouter();
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    max_uses: 50,
    expires_at: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isTeamCreator = team.created_by === user.id;

  const handleLeaveTeam = async () => {
    if (!confirm('Are you sure you want to leave this team? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/teams/leave', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to leave team');
      }

      // Success - redirect to team page
      router.push('/dashboard/team');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: any = {
        team_id: team.id,
        max_uses: inviteFormData.max_uses
      };

      if (inviteFormData.expires_at) {
        payload.expires_at = new Date(inviteFormData.expires_at).toISOString();
      }

      const response = await fetch('/api/teams/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create invite');
      }

      setSuccess(`Invite code created: ${result.data.invite.code}`);
      setShowCreateInvite(false);
      router.refresh(); // Refresh to show new invite
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Team Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
            {/* @ts-ignore */}
            <p className="text-gray-600">{team.sport}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isTeamCreator ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {isTeamCreator ? 'Creator' : 'Member'}
          </span>
        </div>

        {team.description && (
          <p className="text-gray-700 mb-4">{team.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Members:</span>
            <span className="ml-1 text-gray-600">{team.member_count}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Created:</span>
            <span className="ml-1 text-gray-600">
              {new Date(team.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Slug:</span>
            <span className="ml-1 text-gray-600 font-mono">{team.slug}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Active Invites:</span>
            <span className="ml-1 text-gray-600">{team.active_invites_count}</span>
          </div>
        </div>
      </div>

      {/* Team Actions */}
      {isTeamCreator && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Management</h3>

          <div className="space-y-4">
            <div>
              <button
                onClick={() => setShowCreateInvite(!showCreateInvite)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Create New Invite
              </button>
            </div>

            {showCreateInvite && (
              <form onSubmit={handleCreateInvite} className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="font-medium text-gray-900">Create Invite Code</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Uses
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={inviteFormData.max_uses}
                    onChange={(e) => setInviteFormData(prev => ({ ...prev, max_uses: parseInt(e.target.value) || 50 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expires At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={inviteFormData.expires_at}
                    onChange={(e) => setInviteFormData(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Invite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateInvite(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Leave Team */}
      {!isTeamCreator && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Actions</h3>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
            <p className="text-sm text-yellow-700">
              You can leave this team at any time. This action cannot be undone and you'll need a new invite code to rejoin.
            </p>
          </div>

          <button
            onClick={handleLeaveTeam}
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Leaving...' : 'Leave Team'}
          </button>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}
    </div>
  );
}