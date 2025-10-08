'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile, TeamDetails } from '@/types/user';
import TeamCreateForm from './TeamCreateForm';
import TeamJoinForm from './TeamJoinForm';
import TeamDetails from './TeamDetails';

interface TeamManagementProps {
  user: any;
  profile: UserProfile;
  team: TeamDetails | null;
}

export default function TeamManagement({ user, profile, team }: TeamManagementProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);

  // If user has a team, show team details
  if (team) {
    return <TeamDetails user={user} profile={profile} team={team} />;
  }

  // If no team, show tabs to create or join
  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Tab Headers */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('create')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'create'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Create Team
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'join'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Join via Code
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'create' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Create New Team</h2>
              <p className="text-gray-600">
                Start a new team for your sport. You'll be the team creator and can invite others to join.
              </p>
            </div>
            <TeamCreateForm user={user} profile={profile} />
          </div>
        )}

        {activeTab === 'join' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Join Existing Team</h2>
              <p className="text-gray-600">
                Enter an invite code to join an existing team. Ask your team creator for the code.
              </p>
            </div>
            <TeamJoinForm user={user} profile={profile} />
          </div>
        )}
      </div>
    </div>
  );
}