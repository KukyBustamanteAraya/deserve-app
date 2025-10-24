/**
 * Custom hook to fetch institution-specific data
 * Fetches stats, orders, programs, activity for institutions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { getEmojiForSport } from '../utils';

interface InstitutionDataReturn {
  institutionStats: any;
  institutionOrders: any[];
  institutionPrograms: any[];
  institutionActivity: any[];
  institutionDesignRequests: any[];
  loading: boolean;
  error: string | null;
  refetchPrograms: () => Promise<void>;
}

export function useInstitutionData(
  slug: string,
  teamId: string | undefined,
  teamSports: string[] | undefined
): InstitutionDataReturn {
  const [institutionStats, setInstitutionStats] = useState<any>(null);
  const [institutionOrders, setInstitutionOrders] = useState<any[]>([]);
  const [institutionPrograms, setInstitutionPrograms] = useState<any[]>([]);
  const [institutionActivity, setInstitutionActivity] = useState<any[]>([]);
  const [institutionDesignRequests, setInstitutionDesignRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stabilize teamSports array reference to prevent infinite loops
  const stableTeamSports = useMemo(() => teamSports, [JSON.stringify(teamSports)]);

  // Function to transform sub-teams into grouped programs
  const transformProgramsData = async (overviewData: any, selectedSportSlugs: string[]) => {
    const supabase = getBrowserClient();

    // Fetch sport info for selected sports
    const { data: sportsData } = await supabase
      .from('sports')
      .select('id, name, slug')
      .in('slug', selectedSportSlugs);

    // Transform sub-teams into grouped programs by sport
    const subTeams = overviewData.programs || [];
    const programsMap = new Map<string, any>();

    // Fetch member counts for all sub-teams
    const subTeamIds = subTeams.map((st: any) => st.id);
    let memberCounts: Record<string, number> = {};

    if (subTeamIds.length > 0) {
      const { data: memberData } = await supabase
        .from('institution_sub_team_members')
        .select('sub_team_id')
        .in('sub_team_id', subTeamIds);

      // Count members per sub-team
      if (memberData) {
        memberCounts = memberData.reduce((acc: Record<string, number>, member: any) => {
          acc[member.sub_team_id] = (acc[member.sub_team_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // First, add all sub-teams to their respective sports
    subTeams.forEach((subTeam: any) => {
      const sportName = subTeam.sports?.name || 'Unknown';
      const sportSlug = subTeam.sports?.slug || 'unknown';

      if (!programsMap.has(sportSlug)) {
        programsMap.set(sportSlug, {
          sport: sportName,
          sportSlug: sportSlug,
          sportId: subTeam.sport_id,
          emoji: getEmojiForSport(sportSlug),
          teams: []
        });
      }

      programsMap.get(sportSlug).teams.push({
        id: subTeam.id,
        name: subTeam.name,
        slug: subTeam.slug,
        coach: 'Sin asignar',
        members: memberCounts[subTeam.id] || 0, // ✅ Use actual member count
        gender_category: subTeam.gender_category || 'male',
        colors: subTeam.colors || {} // ✅ Include colors from database
      });
    });

    // Then, add any selected sports that don't have sub-teams yet (empty programs)
    sportsData?.forEach((sport: any) => {
      if (!programsMap.has(sport.slug)) {
        programsMap.set(sport.slug, {
          sport: sport.name,
          sportSlug: sport.slug,
          sportId: sport.id,
          emoji: getEmojiForSport(sport.slug),
          teams: [] // Empty program
        });
      }
    });

    return Array.from(programsMap.values());
  };

  const fetchInstitutionData = useCallback(async () => {
    if (!teamId || !slug) {
      console.log('[useInstitutionData] Skipping fetch - missing teamId or slug');
      return;
    }

    setLoading(true);
    try {
      console.log('[useInstitutionData] Fetching data for:', slug);

      // Fetch all institution data from APIs in parallel
      const [overviewRes, ordersRes, activityRes] = await Promise.all([
        fetch(`/api/institutions/${slug}/overview`),
        fetch(`/api/institutions/${slug}/orders?status=pending,paid,shipped`),
        fetch(`/api/institutions/${slug}/activity?limit=10`)
      ]);

      // Process overview data
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setInstitutionStats(overviewData.stats);
        setInstitutionDesignRequests(overviewData.design_requests || []);

        // Transform programs data
        const selectedSportSlugs = stableTeamSports || [];
        const programsGroupedBySport = await transformProgramsData(overviewData, selectedSportSlugs);
        setInstitutionPrograms(programsGroupedBySport);
      }

      // Process orders data
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setInstitutionOrders(ordersData.orders || []);
      }

      // Process activity data
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setInstitutionActivity(activityData.activities || []);
      }

      console.log('[useInstitutionData] Data loaded successfully');
    } catch (err: any) {
      console.error('[useInstitutionData] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug, teamId, stableTeamSports]);

  // Refetch programs (used after adding new programs)
  const refetchPrograms = async () => {
    if (!slug || !teamSports) return;

    try {
      const overviewRes = await fetch(`/api/institutions/${slug}/overview`);
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        const programsGroupedBySport = await transformProgramsData(overviewData, teamSports);
        setInstitutionPrograms(programsGroupedBySport);
        setInstitutionStats(overviewData.stats);
        setInstitutionDesignRequests(overviewData.design_requests || []);
      }
    } catch (err) {
      console.error('[useInstitutionData] Error refetching programs:', err);
    }
  };

  useEffect(() => {
    fetchInstitutionData();
  }, [fetchInstitutionData]);

  return {
    institutionStats,
    institutionOrders,
    institutionPrograms,
    institutionActivity,
    institutionDesignRequests,
    loading,
    error,
    refetchPrograms,
  };
}
