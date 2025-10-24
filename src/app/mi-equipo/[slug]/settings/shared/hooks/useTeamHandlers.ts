import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamSettings, UnifiedTeamMember } from '@/types/team-settings';
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

interface Sport {
  id: string;
  name: string;
  slug: string;
}

interface UseTeamHandlersProps {
  team: Team | null;
  setTeam: (team: Team) => void;
  settings: TeamSettings | null;
  sports: Sport[];
  members: UnifiedTeamMember[];
  loadMembers: (teamId: string) => Promise<void>;
  supabase: SupabaseClient;
}

export function useTeamHandlers({
  team,
  setTeam,
  settings,
  sports,
  members,
  loadMembers,
  supabase,
}: UseTeamHandlersProps) {
  const [saving, setSaving] = useState(false);

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
      logger.error('Error updating role:', toError(error));
      alert('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      logger.debug('[Remove Member] Removing user from team:', { userId, teamId: team.id });

      // Find member in current members list to get their email
      const member = members.find(m => m.user_id === userId);
      const userEmail = member?.email;
      logger.debug('[Remove Member] User email:', { userEmail });

      // 1. Remove from team_memberships (team access)
      const { error: membershipError } = await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (membershipError) {
        logger.error('[Remove Member] Error removing from team_memberships:', membershipError);
        throw membershipError;
      }

      // 2. Remove from team_players (mini field)
      const { error: teamPlayerError } = await supabase
        .from('team_players')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (teamPlayerError) {
        logger.error('[Remove Member] Error removing from team_players:', teamPlayerError);
        // Don't throw - continue with removal
      } else {
        logger.debug('[Remove Member] Removed from team_players');
      }

      // 3. Remove from player_info_submissions (roster)
      // Try deleting by user_id first
      const { error: submissionError1 } = await supabase
        .from('player_info_submissions')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (submissionError1) {
        logger.error('[Remove Member] Error removing from player_info_submissions by user_id:', submissionError1);
      } else {
        logger.debug('[Remove Member] Removed from player_info_submissions by user_id');
      }

      // Also try deleting by email (to catch submissions that weren't properly linked)
      if (userEmail) {
        const { error: submissionError2 } = await supabase
          .from('player_info_submissions')
          .delete()
          .eq('team_id', team.id)
          .eq('email', userEmail);

        if (submissionError2) {
          logger.error('[Remove Member] Error removing from player_info_submissions by email:', submissionError2);
        } else {
          logger.debug('[Remove Member] Removed from player_info_submissions by email');
        }
      }

      logger.debug('[Remove Member] Successfully removed member from all tables');
      alert('Member removed successfully!');
      await loadMembers(team.id);
    } catch (error) {
      logger.error('Error removing member:', toError(error));
      alert('Failed to remove member');
    }
  };

  const handleUpdateTeamInfo = async (field: 'name' | 'sport', value: string) => {
    if (!team) return;

    try {
      let updateData: { name?: string; sport?: string; sport_id?: number } = {};

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
      logger.error(`Error updating team ${field}:`, toError(error));
      alert(`Failed to update team ${field}`);
    }
  };

  const handleSave = async () => {
    if (!settings || !team) return;

    setSaving(true);
    try {
      // PRIMARY: Update teams.colors (single source of truth)
      const colorsObject = {
        primary: settings.primary_color || null,
        secondary: settings.secondary_color || null,
        accent: settings.tertiary_color || null,
        tertiary: settings.tertiary_color || null, // Backwards compatibility
      };

      const { error: colorsError } = await supabase
        .from('teams')
        .update({
          colors: colorsObject,
        })
        .eq('id', team.id);

      if (colorsError) {
        logger.error('Error updating team colors:', colorsError);
        throw colorsError;
      }

      // SECONDARY: Update team_settings (for backwards compatibility and other settings)
      const { error: settingsError } = await supabase
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
          // Branding fields (deprecated for colors, kept for compatibility)
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          tertiary_color: settings.tertiary_color,
          logo_url: settings.logo_url,
          banner_url: settings.banner_url,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', team.id);

      if (settingsError) {
        logger.error('Error updating team settings:', settingsError);
        throw settingsError;
      }

      // INSTITUTION-SPECIFIC: Propagate colors to all sub-teams
      if (team.team_type === 'institution') {
        logger.info('[Settings] Institution detected - propagating colors to all sub-teams');

        const { data: subTeams, error: subTeamsError } = await supabase
          .from('institution_sub_teams')
          .select('id')
          .eq('institution_team_id', team.id);

        if (subTeamsError) {
          logger.error('[Settings] Error fetching sub-teams:', subTeamsError);
          // Don't throw - parent colors are already saved
        } else if (subTeams && subTeams.length > 0) {
          logger.info(`[Settings] Found ${subTeams.length} sub-teams to update`);

          // Update each sub-team with the same colors
          for (const subTeam of subTeams) {
            const { error: subTeamColorError } = await supabase
              .from('institution_sub_teams')
              .update({ colors: colorsObject })
              .eq('id', subTeam.id);

            if (subTeamColorError) {
              logger.error(`[Settings] Error updating sub-team ${subTeam.id} colors:`, subTeamColorError);
              // Don't throw - continue updating other sub-teams
            }
          }

          logger.info('[Settings] Successfully propagated colors to all sub-teams');
        }
      }

      alert('Settings saved successfully!');
    } catch (error) {
      logger.error('Error saving settings:', toError(error));
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return {
    saving,
    handleChangeRole,
    handleRemoveMember,
    handleUpdateTeamInfo,
    handleSave,
  };
}
