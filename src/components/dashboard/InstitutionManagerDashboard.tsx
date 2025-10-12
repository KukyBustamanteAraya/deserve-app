'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string };
  logo_url?: string;
  sports?: string[];
}

interface SportStats {
  sport: string;
  memberCount: number;
  playerInfoSubmissions: number;
  designRequestCount: number;
}

interface Member {
  user_id: string;
  role: string;
  profiles?: { email: string; full_name?: string };
}

interface Props {
  team: Team; // Single team (the institution)
  currentUserId: string;
  shareLink: string;
  onInvite: (email: string) => Promise<void>;
  members: Member[];
}

/**
 * Institution Manager Dashboard
 * For managers of institutions with multiple sports (schools, clubs, organizations)
 * Shows one team (e.g., "Eagles") with different sport categories
 */
export function InstitutionManagerDashboard({ team, currentUserId, shareLink, onInvite, members }: Props) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [sportStats, setSportStats] = useState<Record<string, SportStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSportStats = async () => {
      setLoading(true);
      const stats: Record<string, SportStats> = {};

      // For each sport in the institution's sports array
      for (const sport of team.sports || []) {
        // Get design requests for this sport
        const { data: designRequests } = await supabase
          .from('design_requests')
          .select('id, sport_slug')
          .eq('team_id', team.id)
          .eq('sport_slug', sport);

        // Get player info submissions for this sport (we'll need to add sport_slug to player_info_submissions)
        const { count: playerInfoCount } = await supabase
          .from('player_info_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);

        stats[sport] = {
          sport,
          memberCount: members.length, // All members can participate in any sport
          playerInfoSubmissions: playerInfoCount || 0,
          designRequestCount: designRequests?.length || 0,
        };
      }

      setSportStats(stats);
      setLoading(false);
    };

    fetchSportStats();
  }, [team, members]);

  const handleSportClick = (sport: string) => {
    // Navigate to sport-specific view (we'll add ?sport= param)
    router.push(`/mi-equipo?sport=${sport}`);
  };

  const SPORT_EMOJIS: Record<string, string> = {
    soccer: '⚽',
    basketball: '🏀',
    volleyball: '🏐',
    rugby: '🏉',
    golf: '⛳',
  };

  const SPORT_NAMES: Record<string, string> = {
    soccer: 'Soccer',
    basketball: 'Basketball',
    volleyball: 'Volleyball',
    rugby: 'Rugby',
    golf: 'Golf',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Banner - Same as single team */}
      <CustomizeBanner
        teamName={team.name}
        customColors={team.colors}
        customLogoUrl={team.logo_url}
        readonly={true}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 pt-40">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Institution Management</h1>
          <p className="text-gray-600">Manage all sports programs under {team.name}</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Sports</p>
            <p className="text-3xl font-bold text-gray-900">{team.sports?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Members</p>
            <p className="text-3xl font-bold text-gray-900">{members.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Info Submitted</p>
            <p className="text-3xl font-bold text-gray-900">
              {Object.values(sportStats).reduce((sum, stat) => sum + stat.playerInfoSubmissions, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Active Orders</p>
            <p className="text-3xl font-bold text-gray-900">
              {Object.values(sportStats).reduce((sum, stat) => sum + stat.designRequestCount, 0)}
            </p>
          </div>
        </div>

        {/* Sport Categories */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Sport Programs</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="text-gray-600 mt-4">Loading sports...</p>
            </div>
          ) : team.sports && team.sports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {team.sports.map((sport) => {
                const stats = sportStats[sport] || {
                  memberCount: 0,
                  playerInfoSubmissions: 0,
                  designRequestCount: 0,
                };

                return (
                  <div
                    key={sport}
                    onClick={() => handleSportClick(sport)}
                    className="border-2 border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Sport Header */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="text-5xl">{SPORT_EMOJIS[sport] || '🏆'}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                          {team.name} {SPORT_NAMES[sport] || sport}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">{sport}</p>
                      </div>
                    </div>

                    {/* Sport Stats */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Members</span>
                        <span className="font-medium text-gray-900">{stats.memberCount}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Info Submitted</span>
                        <span className="font-medium text-gray-900">
                          {stats.playerInfoSubmissions}/{stats.memberCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Active Orders</span>
                        <span className="font-medium text-gray-900">{stats.designRequestCount}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Submission Progress</span>
                        <span>
                          {stats.memberCount > 0
                            ? Math.round((stats.playerInfoSubmissions / stats.memberCount) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            backgroundColor: team.colors.primary,
                            width: `${
                              stats.memberCount > 0
                                ? (stats.playerInfoSubmissions / stats.memberCount) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Action Hint */}
                    <div className="mt-4 text-center">
                      <span className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                        Click to manage sport →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No sports added yet</p>
              <button
                onClick={() => router.push('/catalog')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Sport
              </button>
            </div>
          )}
        </div>

        {/* Team Members Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Team Members ({members.length})</h2>
            <button
              onClick={() => {
                const email = prompt('Email del compañero:');
                if (email) onInvite(email);
              }}
              className="px-4 py-2 text-sm rounded-lg text-white"
              style={{ backgroundColor: team.colors.primary }}
            >
              + Invitar
            </button>
          </div>

          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    {m.profiles?.full_name?.[0] || m.profiles?.email?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {m.user_id === currentUserId ? (
                        <span>
                          Tú <span className="text-xs text-gray-500">(tú)</span>
                        </span>
                      ) : (
                        m.profiles?.full_name || m.profiles?.email || `Miembro ${m.user_id.substring(0, 8)}`
                      )}
                    </p>
                    {m.profiles?.email && m.user_id !== currentUserId && (
                      <p className="text-xs text-gray-500">{m.profiles.email}</p>
                    )}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{m.role}</span>
              </div>
            ))}
          </div>

          {/* Share Link */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Invitar por enlace:</p>
            <div className="flex gap-2">
              <input type="text" value={shareLink} readOnly className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('¡Enlace copiado!');
                }}
                className="px-4 py-2 text-sm rounded-lg text-white"
                style={{ backgroundColor: team.colors.primary }}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200">
          <h3 className="font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/catalog')}
              className="px-6 py-3 bg-white border-2 border-blue-300 rounded-lg font-medium text-blue-900 hover:bg-blue-50 transition-colors"
            >
              🎨 Create New Order
            </button>
            <button
              onClick={() => router.push(`/mi-equipo/${team.slug}/settings`)}
              className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              ⚙️ Team Settings
            </button>
            <button
              onClick={() => {/* TODO: Add bulk invite functionality */}}
              className="px-6 py-3 bg-white border-2 border-gray-300 rounded-lg font-medium text-gray-900 hover:bg-gray-50 transition-colors"
            >
              📧 Bulk Invite Players
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
