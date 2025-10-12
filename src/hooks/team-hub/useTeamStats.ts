import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamStats } from '@/types/team-hub';
import { logger } from '@/lib/logger';

interface UseTeamStatsResult {
  stats: TeamStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Calculate team statistics for the dashboard
 * - Player info submission progress
 * - Payment progress
 * - Current stage in the workflow
 */
export function useTeamStats(teamId: string): UseTeamStatsResult {
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = getBrowserClient();

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch team members count
      const { count: membersCount } = await supabase
        .from('team_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      // Fetch player info submissions count
      const { count: submittedCount } = await supabase
        .from('player_info_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId);

      // Fetch latest design request
      const { data: designData } = await supabase
        .from('design_requests')
        .select('id, status, approval_status')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Fetch latest order
      const { data: orderData } = await supabase
        .from('orders')
        .select('id, status, payment_status, total_amount_cents')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine current stage
      let currentStage: TeamStats['current_stage'] = 'design';
      if (orderData) {
        if (orderData.status === 'shipped' || orderData.status === 'delivered') {
          currentStage = 'shipping';
        } else if (orderData.status === 'in_production' || orderData.status === 'quality_check') {
          currentStage = 'production';
        } else if (orderData.payment_status === 'complete') {
          currentStage = 'production';
        } else if (orderData.payment_status === 'pending' || orderData.payment_status === 'partial') {
          currentStage = 'payment';
        }
      } else if (designData?.approval_status === 'approved') {
        currentStage = 'roster';
      }

      const teamStats: TeamStats = {
        total_members: membersCount || 0,
        player_info_submitted: submittedCount || 0,
        player_info_total: membersCount || 0,
        payment_received_cents: 0, // TODO: Sum from payment_contributions
        payment_total_cents: orderData?.total_amount_cents || 0,
        current_stage: currentStage,
        design_status: designData?.status,
        order_status: orderData?.status,
      };

      setStats(teamStats);
    } catch (err) {
      setError(err as Error);
      logger.error('Error fetching team stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) {
      fetchStats();
    }
  }, [teamId]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}
