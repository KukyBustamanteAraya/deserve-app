'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamSettings, ApprovalMode, PlayerInfoMode, AccessMode, PaymentMode } from '@/types/team-settings';
import { logger } from '@/lib/logger';
import { useSports } from '@/hooks/api/useSports';
import { getSportInfo } from '@/lib/sports/sportsMapping';
import { PaymentSettingsCard } from '@/components/team/PaymentSettingsCard';

interface Team {
  id: string;
  slug: string;
  name: string;
  sport?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  owner_id: string;
  current_owner_id: string;
}

export default function TeamSettingsPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const { sports, isLoading: sportsLoading } = useSports();

  const [team, setTeam] = useState<Team | null>(null);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'player'>('player');
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.slug]);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // Get team with sport info (join with sports table)
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          sports:sport_id (
            id,
            slug,
            name
          )
        `)
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;

      // Extract sport slug from joined data
      const sportSlug = (teamData as any).sports?.slug || null;
      setTeam({ ...teamData, sport: sportSlug });

      // Check if user is owner
      const owner = teamData.current_owner_id === currentUser.id || teamData.owner_id === currentUser.id;
      setIsOwner(owner);

      if (!owner) {
        alert('Only team owners can access settings');
        router.push(`/mi-equipo?team=${teamData.id}`);
        return;
      }

      // Get team settings - use maybeSingle() instead of single() to avoid 406 errors
      const { data: settingsData, error: settingsError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', teamData.id)
        .maybeSingle();

      if (settingsError) {
        logger.error('Error fetching settings:', settingsError);
        throw settingsError;
      }

      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings if they don't exist
        const defaultSettings: Partial<TeamSettings> = {
          team_id: teamData.id,
          approval_mode: 'any_member',
          min_approvals_required: 1,
          player_info_mode: 'hybrid',
          self_service_enabled: true,
          access_mode: 'invite_only',
          allow_member_invites: false,
          payment_mode: 'individual',
          notify_on_design_ready: true,
          notify_on_vote_required: true,
        };

        // Use upsert to avoid conflicts if settings were created elsewhere
        const { data: newSettings, error: createError } = await supabase
          .from('team_settings')
          .upsert(defaultSettings, { onConflict: 'team_id' })
          .select()
          .single();

        if (createError) {
          logger.error('Error creating settings:', createError);
          throw createError;
        }
        setSettings(newSettings);
      }

      // Load team members
      await loadMembers(teamData.id);
    } catch (error) {
      logger.error('Error loading settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (teamId: string) => {
    try {
      console.log('[loadMembers] Loading unified member list for team:', teamId);

      // 1. Fetch all team memberships (active members)
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('team_memberships')
        .select('role, user_id, created_at')
        .eq('team_id', teamId);

      if (membershipsError) {
        console.error('[loadMembers] Error fetching memberships:', membershipsError);
        throw membershipsError;
      }

      // 2. Fetch all player info submissions (roster)
      const { data: playersData, error: playersError } = await supabase
        .from('player_info_submissions')
        .select('id, player_name, user_id, created_at')
        .eq('team_id', teamId);

      if (playersError) {
        console.error('[loadMembers] Error fetching players:', playersError);
        throw playersError;
      }

      // 3. Fetch all pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('team_invites')
        .select('id, player_submission_id, email, status, created_at')
        .eq('team_id', teamId);

      if (invitesError) {
        console.error('[loadMembers] Error fetching invites:', invitesError);
        throw invitesError;
      }

      console.log('[loadMembers] Fetched:', {
        memberships: membershipsData?.length || 0,
        players: playersData?.length || 0,
        invites: invitesData?.length || 0
      });
      console.log('[loadMembers] membershipsData:', membershipsData);
      console.log('[loadMembers] playersData:', playersData);
      console.log('[loadMembers] invitesData:', invitesData);

      // Create unified member list
      const unifiedMembers: any[] = [];
      const processedUserIds = new Set<string>();
      const processedPlayerIds = new Set<string>();

      // First: Add all active members (from team_memberships)
      if (membershipsData) {
        for (const membership of membershipsData) {
          processedUserIds.add(membership.user_id);

          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', membership.user_id)
            .single();

          // Check if this user also has a player submission
          const playerSubmission = playersData?.find(p => p.user_id === membership.user_id);
          if (playerSubmission) {
            processedPlayerIds.add(playerSubmission.id);
          }

          unifiedMembers.push({
            id: membership.user_id,
            type: 'active_member',
            display_name: profile?.full_name || 'Unknown User',
            role: membership.role,
            status: 'Active Member',
            user_id: membership.user_id,
            player_submission_id: playerSubmission?.id || null,
            created_at: membership.created_at
          });
        }
      }

      // Second: Add roster-only players (no user_id) and players with accounts but not members
      if (playersData) {
        for (const player of playersData) {
          // Skip if already processed
          if (processedPlayerIds.has(player.id)) continue;

          // Check for pending invite
          const invite = invitesData?.find(
            inv => inv.player_submission_id === player.id && inv.status === 'pending'
          );

          if (!player.user_id) {
            // Roster-only player (no account)
            unifiedMembers.push({
              id: player.id,
              type: 'roster_only',
              display_name: player.player_name,
              role: null,
              status: invite ? 'Invited (Pending)' : 'Roster Only',
              user_id: null,
              player_submission_id: player.id,
              invite_id: invite?.id || null,
              created_at: player.created_at
            });
          } else if (!processedUserIds.has(player.user_id)) {
            // Has account but not a member of this team
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', player.user_id)
              .single();

            unifiedMembers.push({
              id: player.user_id,
              type: 'has_account_not_member',
              display_name: profile?.full_name || player.player_name,
              role: null,
              status: 'Has Account (Not Member)',
              user_id: player.user_id,
              player_submission_id: player.id,
              created_at: player.created_at
            });
          }

          processedPlayerIds.add(player.id);
        }
      }

      // Sort: Active members first, then by name
      unifiedMembers.sort((a, b) => {
        const statusOrder = {
          'Active Member': 0,
          'Has Account (Not Member)': 1,
          'Invited (Pending)': 2,
          'Roster Only': 3
        };
        const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 999) -
                          (statusOrder[b.status as keyof typeof statusOrder] || 999);
        if (statusDiff !== 0) return statusDiff;
        return a.display_name.localeCompare(b.display_name);
      });

      console.log('[loadMembers] Unified members:', unifiedMembers);
      setMembers(unifiedMembers);
    } catch (error) {
      console.error('[loadMembers] Error loading unified members:', error);
      logger.error('Error loading unified members:', error);
      setMembers([]);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'owner' | 'manager' | 'player') => {
    if (!team) return;

    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ role: newRole })
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;

      alert('Role updated successfully!');
      await loadMembers(team.id);
    } catch (error) {
      logger.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;

      alert('Member removed successfully!');
      await loadMembers(team.id);
    } catch (error) {
      logger.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateTeamInfo = async (field: 'name' | 'sport', value: string) => {
    if (!team) return;

    try {
      let updateData: any = {};

      if (field === 'sport') {
        // Find the sport_id from the sports list
        const selectedSport = sports.find(s => s.slug === value);
        if (!selectedSport) {
          alert('Invalid sport selected');
          return;
        }
        // Update both sport (text) and sport_id (FK)
        updateData = {
          sport: value,
          sport_id: parseInt(selectedSport.id)
        };
      } else {
        updateData = { [field]: value };
      }

      const { error } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', team.id);

      if (error) throw error;

      setTeam({ ...team, ...updateData });
      alert(`Team ${field} updated successfully!`);
    } catch (error) {
      logger.error(`Error updating team ${field}:`, error);
      alert(`Failed to update team ${field}`);
    }
  };

  const handleSave = async () => {
    if (!settings || !team) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_settings')
        .update({
          approval_mode: settings.approval_mode,
          min_approvals_required: settings.min_approvals_required,
          player_info_mode: settings.player_info_mode,
          self_service_enabled: settings.self_service_enabled,
          access_mode: settings.access_mode,
          allow_member_invites: settings.allow_member_invites,
          payment_mode: settings.payment_mode,
          notify_on_design_ready: settings.notify_on_design_ready,
          notify_on_vote_required: settings.notify_on_vote_required,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', team.id);

      if (error) throw error;

      alert('Settings saved successfully!');
    } catch (error) {
      logger.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!team || !settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Settings not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push(`/mi-equipo?team=${team.id}`)}
                className="text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-2"
              >
                ← Back to Team
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{team.name} Settings</h1>
              <p className="text-gray-600 mt-1">Manage your team's approval modes, player info collection, and access control</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-6">

          {/* Team Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Information</h2>
            <p className="text-gray-600 text-sm mb-4">Basic team details</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => setTeam({ ...team, name: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleUpdateTeamInfo('name', team.name)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Update
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sport
                </label>
                <div className="flex gap-2">
                  <select
                    value={team.sport || ''}
                    onChange={(e) => setTeam({ ...team, sport: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sportsLoading}
                  >
                    <option value="">Select a sport</option>
                    {sports.map((sport) => {
                      const sportInfo = getSportInfo(sport.slug);
                      return (
                        <option key={sport.id} value={sport.slug}>
                          {sportInfo.emoji} {sport.name}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={() => handleUpdateTeamInfo('sport', team.sport || '')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    disabled={sportsLoading}
                  >
                    Update
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sets the sport for field visualization and available positions
                </p>
              </div>
            </div>
          </div>

          {/* Team Members & Roles */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Team Members & Roles</h2>
                <p className="text-gray-600 text-sm mt-1">Manage who has access to your team and their permissions</p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
              >
                <span>+</span>
                Invite Member
              </button>
            </div>

            {/* Members List */}
            <div className="mt-4 space-y-3">
              {members.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No members or players yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {member.display_name}
                        {member.user_id === user?.id && (
                          <span className="ml-2 text-xs text-gray-500">(You)</span>
                        )}
                      </div>
                      {/* Status Badge */}
                      <div className="mt-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            member.status === 'Active Member'
                              ? 'bg-green-100 text-green-800'
                              : member.status === 'Invited (Pending)'
                              ? 'bg-yellow-100 text-yellow-800'
                              : member.status === 'Roster Only'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Active Member Actions */}
                      {member.status === 'Active Member' && (
                        <>
                          {/* Role Selector */}
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.user_id, e.target.value as 'owner' | 'manager' | 'player')}
                            disabled={member.user_id === user?.id}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="owner">Manager (Owner)</option>
                            <option value="manager">Manager</option>
                            <option value="player">Player</option>
                          </select>

                          {/* Role Badge */}
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              member.role === 'owner'
                                ? 'bg-purple-100 text-purple-800'
                                : member.role === 'manager'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {member.role === 'owner' ? '👑 Owner' : member.role === 'manager' ? '⚙️ Manager' : '⚽ Player'}
                          </span>

                          {/* Remove Button */}
                          {member.user_id !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}

                      {/* Roster Only - Show Invite Button */}
                      {member.status === 'Roster Only' && (
                        <button
                          onClick={() => {
                            setInvitingPlayerId(member.player_submission_id);
                            setShowInviteModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                        >
                          📧 Invite to App
                        </button>
                      )}

                      {/* Invited (Pending) - Show Resend Button */}
                      {member.status === 'Invited (Pending)' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Invitation sent</span>
                          <button
                            onClick={() => {
                              setInvitingPlayerId(member.player_submission_id);
                              setShowInviteModal(true);
                            }}
                            className="px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Resend
                          </button>
                        </div>
                      )}

                      {/* Has Account (Not Member) - Show Add to Team Button */}
                      {member.status === 'Has Account (Not Member)' && (
                        <button
                          onClick={() => {
                            // TODO: Add to team membership
                            alert('Add to team functionality coming soon');
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm"
                        >
                          ➕ Add to Team
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Understanding Member Status:</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div><strong>🟢 Active Member:</strong> Has app account and is part of your team. Can access team features based on their role.</div>
                <div><strong>🟡 Invited (Pending):</strong> Invitation sent but not yet accepted. Can resend invitation.</div>
                <div><strong>⚪ Roster Only:</strong> Player on your roster but hasn't created an app account yet. Click "Invite to App" to send them an invitation link.</div>
                <div><strong>🔵 Has Account (Not Member):</strong> Player has an app account but isn't a team member yet. Click "Add to Team" to add them.</div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Role Permissions:</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <div><strong>👑 Owner/Manager:</strong> Full control - manage settings, approve designs, manage members</div>
                  <div><strong>⚽ Player:</strong> Submit player info, view designs, participate in votes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Design Approval Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Design Approval</h2>
            <p className="text-gray-600 text-sm mb-4">Control how designs are approved for your team</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Mode
                </label>
                <select
                  value={settings.approval_mode}
                  onChange={(e) => setSettings({ ...settings, approval_mode: e.target.value as ApprovalMode })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="owner_only">Owner Only - Only team owner/managers can approve</option>
                  <option value="any_member">Any Member - First approval wins</option>
                  <option value="voting">Voting - Requires X number of approvals</option>
                  <option value="multi_design_vote">Multi-Design Vote - Team votes on multiple options</option>
                </select>
              </div>

              {settings.approval_mode === 'voting' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Approvals Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.min_approvals_required}
                    onChange={(e) => setSettings({ ...settings, min_approvals_required: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Player Info Collection Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Player Information Collection</h2>
            <p className="text-gray-600 text-sm mb-4">How players submit their jersey info (name, number, size)</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Mode
                </label>
                <select
                  value={settings.player_info_mode}
                  onChange={(e) => setSettings({ ...settings, player_info_mode: e.target.value as PlayerInfoMode })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="self_service">Self-Service - Players fill out their own info</option>
                  <option value="manager_only">Manager Only - Manager enters all player data</option>
                  <option value="hybrid">Hybrid - Manager can enable/disable player self-service</option>
                </select>
              </div>

              {(settings.player_info_mode === 'self_service' || settings.player_info_mode === 'hybrid') && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.self_service_enabled}
                    onChange={(e) => setSettings({ ...settings, self_service_enabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label className="ml-2 text-sm text-gray-700">
                    Enable player self-service (players can submit their own info)
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Payment Settings */}
          <PaymentSettingsCard
            paymentMode={settings.payment_mode}
            onPaymentModeChange={(mode) => setSettings({ ...settings, payment_mode: mode })}
          />

          {/* Access Control Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Control</h2>
            <p className="text-gray-600 text-sm mb-4">Who can join your team</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Mode
                </label>
                <select
                  value={settings.access_mode}
                  onChange={(e) => setSettings({ ...settings, access_mode: e.target.value as AccessMode })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="open">Open - Anyone can join</option>
                  <option value="invite_only">Invite Only - Requires invitation</option>
                  <option value="private">Private - Strictly controlled access</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allow_member_invites}
                  onChange={(e) => setSettings({ ...settings, allow_member_invites: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Allow team members to invite others
                </label>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Notifications</h2>
            <p className="text-gray-600 text-sm mb-4">Email notification preferences</p>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notify_on_design_ready}
                  onChange={(e) => setSettings({ ...settings, notify_on_design_ready: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Notify when design is ready for approval
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notify_on_vote_required}
                  onChange={(e) => setSettings({ ...settings, notify_on_vote_required: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">
                  Notify when vote is required
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => router.push(`/mi-equipo?team=${team.id}`)}
              className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Invite Team Member</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteRole('player');
                  setInvitingPlayerId(null);
                  setGeneratedInviteLink(null);
                  setLinkCopied(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {!generatedInviteLink ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Optional - for record keeping. Email sending not yet implemented.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'manager' | 'player')}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="manager">⚙️ Manager - Can manage settings and approve designs</option>
                      <option value="player">⚽ Player - Can submit info and view team</option>
                    </select>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      🔗 You'll receive an invite link to share with the player via WhatsApp, text, etc.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✅</span>
                      <h3 className="font-semibold text-green-900">Invite Created Successfully!</h3>
                    </div>
                    <p className="text-sm text-green-800">
                      Share this link with the player. It expires in 7 days.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invite Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedInviteLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedInviteLink);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                          linkCopied
                            ? 'bg-green-600 text-white'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {linkCopied ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const message = encodeURIComponent(
                        `🎯 ${team?.name}\n\nYou're invited to join the team!\n\nClick here to accept: ${generatedInviteLink}`
                      );
                      window.open(`https://wa.me/?text=${message}`, '_blank');
                    }}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                  >
                    <span>📱</span>
                    Share via WhatsApp
                  </button>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">
                      💡 <strong>Tip:</strong> You can also copy the link and share it via email, text message, or any other messaging app.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                {!generatedInviteLink ? (
                  <>
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteEmail('');
                        setInviteRole('player');
                        setInvitingPlayerId(null);
                        setGeneratedInviteLink(null);
                        setLinkCopied(false);
                      }}
                      className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                    if (!team) return;

                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        alert('Please log in to send invites');
                        return;
                      }

                      const response = await fetch(`/api/teams/${team.id}/invite`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                          playerSubmissionId: invitingPlayerId || undefined,
                          email: inviteEmail || undefined,
                          role: inviteRole
                        })
                      });

                      const data = await response.json();

                      console.log('[Invite] Response:', data);

                      if (!response.ok) {
                        alert(data.error || 'Failed to send invite');
                        return;
                      }

                      console.log('[Invite] Generated link:', data.invite.link);

                      // Show the generated link in the modal
                      setGeneratedInviteLink(data.invite.link);

                      // Reload members to show updated status
                      await loadMembers(team.id);
                    } catch (error) {
                      console.error('[Invite] Error:', error);
                      alert('Failed to send invite');
                    }
                  }}
                      className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Send Invite
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail('');
                      setInviteRole('player');
                      setInvitingPlayerId(null);
                      setGeneratedInviteLink(null);
                      setLinkCopied(false);
                    }}
                    className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
