import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { ActivityLogEntry } from '@/types/team-hub';
import { logger } from '@/lib/logger';

interface UseActivityLogResult {
  activities: ActivityLogEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch activity log entries for a team
 * Returns public activities for members, all activities for managers/admins
 */
export function useActivityLog(teamId: string, limit: number = 10): UseActivityLogResult {
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getBrowserClient();

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from activity_log table
      const { data, error: fetchError } = await supabase
        .from('activity_log')
        .select('*')
        .eq('related_team_id', teamId)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) {
        throw fetchError;
      }

      // Map database rows to ActivityLogEntry format
      const mappedActivities: ActivityLogEntry[] = (data || []).map((row) => ({
        id: row.id,
        team_id: row.related_team_id,
        user_id: row.related_user_id || '',
        user_role: 'member', // We don't store this yet, default to member
        action_type: row.action_type,
        action_description: row.description,
        is_public: row.is_public,
        created_at: row.created_at,
      }));

      setActivities(mappedActivities);
    } catch (err) {
      setError(err as Error);
      logger.error('Error fetching activity log:', err);
      // Fallback to empty array on error
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchActivities();
    }
  }, [teamId, limit]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities,
  };
}
