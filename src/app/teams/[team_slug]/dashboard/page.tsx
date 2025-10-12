'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { TeamLayout } from '@/components/team-hub/TeamLayout';
import { ProgressOverviewCard } from '@/components/team-hub/ProgressOverviewCard';
import { NextStepCard } from '@/components/team-hub/NextStepCard';
import { ActivityPreviewCard } from '@/components/team-hub/ActivityPreviewCard';
import { useTeamWithDetails } from '@/hooks/team-hub/useTeamWithDetails';
import { useTeamMembers } from '@/hooks/team-hub/useTeamMembers';
import { useTeamStats } from '@/hooks/team-hub/useTeamStats';
import { useActivityLog } from '@/hooks/team-hub/useActivityLog';
import { calculatePermissions } from '@/lib/permissions';
import type { RoleType } from '@/types/team-hub';

interface TeamDashboardPageProps {
  params: { team_slug: string };
}

export default function TeamDashboardPage({ params }: TeamDashboardPageProps) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<RoleType>('member');
  const [isAdminMode, setIsAdminMode] = useState(false);

  // Fetch team data
  const { team, loading: teamLoading, error: teamError } = useTeamWithDetails(params.team_slug);
  const { members, loading: membersLoading } = useTeamMembers(team?.id || '');
  const { stats, loading: statsLoading } = useTeamStats(team?.id || '');
  const { activities, loading: activitiesLoading } = useActivityLog(team?.id || '', 5);

  // Get current user and their role
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      setCurrentUserId(user.id);

      // Check user's role in this team
      const userMember = members.find(m => m.user_id === user.id);
      if (userMember) {
        setUserRole(userMember.role_type);
      } else if (team && team.owner_id === user.id) {
        setUserRole('owner');
      }

      // Check if user is admin (from profiles table)
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (profile?.is_admin) {
        setIsAdminMode(true);
        setUserRole('admin');
      }
    };

    if (team && members.length > 0) {
      getCurrentUser();
    }
  }, [team, members]);

  // Calculate permissions
  const permissions = team ? calculatePermissions(userRole, team, isAdminMode) : null;

  // Loading state
  if (teamLoading || membersLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading team dashboard...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (teamError || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg font-semibold">Error loading team</p>
          <p className="text-gray-600 mt-2">{teamError?.message || 'Team not found'}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <TeamLayout
      team={team}
      currentSection="dashboard"
      currentUserRole={userRole}
      isAdminMode={isAdminMode}
    >
      {/* Dashboard Content */}
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
          <p className="text-gray-600 mt-1">
            Here's what's happening with {team.name}
          </p>
        </div>

        {/* Grid Layout: 2 columns on large screens, 1 on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ProgressOverviewCard stats={stats} />
            <ActivityPreviewCard
              activities={activities}
              teamSlug={team.slug}
            />
          </div>

          {/* Right Column */}
          <div>
            <NextStepCard
              stats={stats}
              role={userRole}
              teamSlug={team.slug}
            />
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total_members}</p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Info Submitted</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {stats.player_info_submitted}/{stats.player_info_total}
                </p>
              </div>
              <div className="text-4xl">📝</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Stage</p>
                <p className="text-lg font-bold text-gray-900 mt-1 capitalize">
                  {stats.current_stage}
                </p>
              </div>
              <div className="text-4xl">
                {stats.current_stage === 'design' && '🎨'}
                {stats.current_stage === 'roster' && '👕'}
                {stats.current_stage === 'payment' && '💳'}
                {stats.current_stage === 'production' && '🏭'}
                {stats.current_stage === 'shipping' && '🚚'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeamLayout>
  );
}
