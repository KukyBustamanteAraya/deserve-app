import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamSettings, UnifiedTeamMember, ProfileData } from '@/types/team-settings';
import type { AuthUser } from '@/types/common';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface Team {
  id: string;
  slug: string;
  name: string;
  sport?: string;
  team_type?: 'single_team' | 'institution';
  institution_name?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  owner_id: string;
  current_owner_id: string;
}

export function useTeamSettingsData(slug: string, supabase: SupabaseClient) {
  const router = useRouter();

  const [team, setTeam] = useState<Team | null>(null);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<UnifiedTeamMember[]>([]);

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
      const unifiedMembers: UnifiedTeamMember[] = [];
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
      logger.error('Error loading unified members:', toError(error));
      setMembers([]);
    }
  };

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser as any);

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
        .eq('slug', slug)
        .single();

      if (teamError) throw teamError;

      // Extract sport slug from joined data
      interface TeamDataWithSport extends Team {
        sports?: { id: string; slug: string; name: string } | null;
      }
      const teamWithSport = teamData as TeamDataWithSport;
      const sportSlug = teamWithSport.sports?.slug || null;
      setTeam({ ...teamData, sport: sportSlug });

      // Check if user is owner OR manager
      const isTeamOwner = teamData.current_owner_id === currentUser.id || teamData.owner_id === currentUser.id;

      // Also check team_memberships for manager/owner role
      const { data: membership } = await supabase
        .from('team_memberships')
        .select('role')
        .eq('team_id', teamData.id)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const isMembershipManager = membership?.role === 'owner' || membership?.role === 'manager';
      const hasAccess = isTeamOwner || isMembershipManager;

      setIsOwner(hasAccess);

      if (!hasAccess) {
        alert('Only team owners and managers can access settings');
        router.push(`/mi-equipo/${slug}`);
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
          logger.error('Error creating settings:', toError(createError));
          throw createError;
        }
        setSettings(newSettings);
      }

      // Load team members
      await loadMembers(teamData.id);
    } catch (error) {
      logger.error('Error loading settings:', toError(error));
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  return {
    team,
    setTeam,
    settings,
    setSettings,
    user,
    loading,
    isOwner,
    members,
    setMembers,
    loadData,
    loadMembers,
  };
}
