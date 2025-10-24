/**
 * Custom hook to fetch team data
 * Extracts the common team data fetching logic used by both institution and single-team pages
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Team, TeamColors } from '../types';

interface InstitutionPermissions {
  canCreatePrograms: boolean;
  canCreateDesignRequests: boolean;
  canManageOrders: boolean;
  canViewAllPrograms: boolean;
}

interface UseTeamDataReturn {
  team: Team | null;
  colors: TeamColors;
  memberCount: number;
  isManager: boolean;

  // Institution-specific permissions
  institutionRole: 'athletic_director' | 'coach' | 'assistant' | 'player' | null;
  managedSubTeamIds: string[];
  permissions: InstitutionPermissions;

  currentUser: any;
  loading: boolean;
  error: string | null;
}

export function useTeamData(slug: string): UseTeamDataReturn {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [colors, setColors] = useState<TeamColors>({});
  const [memberCount, setMemberCount] = useState<number>(0);
  const [isManager, setIsManager] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Institution-specific state
  const [institutionRole, setInstitutionRole] = useState<'athletic_director' | 'coach' | 'assistant' | 'player' | null>(null);
  const [managedSubTeamIds, setManagedSubTeamIds] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<InstitutionPermissions>({
    canCreatePrograms: false,
    canCreateDesignRequests: false,
    canManageOrders: false,
    canViewAllPrograms: true,
  });

  useEffect(() => {
    async function fetchTeamData() {
      try {
        const supabase = getBrowserClient();

        // 1. Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          router.push('/login');
          return;
        }
        setCurrentUser(user);

        // 2. Get team with sport relationship
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            *,
            sport:sports!sport_id(id, slug, name)
          `)
          .eq('slug', slug)
          .single();

        if (teamError) throw teamError;

        console.log('[useTeamData] Team loaded:', teamData.name, 'Type:', teamData.team_type);
        setTeam(teamData);

        // 3. Get team settings (logo_url only - colors now come from teams.colors)
        const { data: settingsData } = await supabase
          .from('team_settings')
          .select('logo_url')
          .eq('team_id', teamData.id)
          .maybeSingle();

        // 3b. Extract colors from teams.colors JSONB (single source of truth)
        if (teamData.colors) {
          // Convert teams.colors JSONB to TeamColors format expected by UI
          setColors({
            primary_color: teamData.colors.primary || null,
            secondary_color: teamData.colors.secondary || null,
            tertiary_color: teamData.colors.accent || teamData.colors.tertiary || null,
          });
        }

        if (settingsData?.logo_url) {
          // Add logo_url to team object
          setTeam((prev) => prev ? { ...prev, logo_url: settingsData.logo_url } : prev);
        }

        // 4. Get member count
        const { count } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamData.id);

        setMemberCount(count || 0);

        // 5. Check if user is manager
        const { data: membership } = await supabase
          .from('team_memberships')
          .select('role, institution_role')
          .eq('team_id', teamData.id)
          .eq('user_id', user.id)
          .maybeSingle();

        const isMembershipOwner = membership?.role === 'owner' || membership?.role === 'manager';
        const isTeamOwner = teamData.owner_id === user.id || teamData.current_owner_id === user.id;

        console.log('[useTeamData] Manager check:', { isMembershipOwner, isTeamOwner });
        setIsManager(isMembershipOwner || isTeamOwner);

        // 6. Determine institution role and permissions (for institutions only)
        if (teamData.team_type === 'institution') {
          let role: 'athletic_director' | 'coach' | 'assistant' | 'player' = 'player';
          let subTeamIds: string[] = [];
          let perms: InstitutionPermissions = {
            canCreatePrograms: false,
            canCreateDesignRequests: false,
            canManageOrders: false,
            canViewAllPrograms: true,
          };

          // Check if Athletic Director
          if (membership?.institution_role === 'athletic_director') {
            role = 'athletic_director';
            perms = {
              canCreatePrograms: true,
              canCreateDesignRequests: true,
              canManageOrders: true,
              canViewAllPrograms: true,
            };

            // AD can manage all sub-teams
            const { data: allSubTeams } = await supabase
              .from('institution_sub_teams')
              .select('id')
              .eq('institution_team_id', teamData.id)
              .eq('active', true);

            subTeamIds = allSubTeams?.map((st: any) => st.id) || [];
            console.log('[useTeamData] Athletic Director - manages all sub-teams:', subTeamIds.length);
          }
          // Check if Coach (head_coach_user_id matches)
          else {
            const { data: coachedTeams } = await supabase
              .from('institution_sub_teams')
              .select('id, name')
              .eq('institution_team_id', teamData.id)
              .eq('head_coach_user_id', user.id)
              .eq('active', true);

            if (coachedTeams && coachedTeams.length > 0) {
              role = 'coach';
              subTeamIds = coachedTeams.map((st: any) => st.id);
              perms = {
                canCreatePrograms: false,  // Only AD can create programs
                canCreateDesignRequests: true,  // Can create for their sub-teams
                canManageOrders: true,  // Can manage their sub-team orders
                canViewAllPrograms: true,
              };
              console.log('[useTeamData] Coach - manages sub-teams:', coachedTeams.map((t: any) => t.name).join(', '));
            }
            // Check if Assistant
            else if (membership?.institution_role === 'assistant') {
              role = 'assistant';
              // Assistants can create design requests and manage orders, but not create programs
              perms = {
                canCreatePrograms: false,
                canCreateDesignRequests: true,
                canManageOrders: true,
                canViewAllPrograms: true,
              };
              console.log('[useTeamData] Assistant role detected');
            }
            else {
              console.log('[useTeamData] Player role (default)');
            }
          }

          setInstitutionRole(role);
          setManagedSubTeamIds(subTeamIds);
          setPermissions(perms);
        }

      } catch (err: any) {
        console.error('[useTeamData] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTeamData();
  }, [slug, router]);

  return {
    team,
    colors,
    memberCount,
    isManager,
    institutionRole,
    managedSubTeamIds,
    permissions,
    currentUser,
    loading,
    error,
  };
}
