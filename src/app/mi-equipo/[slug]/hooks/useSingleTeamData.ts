/**
 * Custom hook to fetch single-team-specific data
 * Fetches design requests, players, and payment summary for single teams
 */

import { useState, useEffect, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import type { DesignRequest, Player, PaymentSummary } from '../types';

interface SingleTeamDataReturn {
  designRequests: DesignRequest[];
  players: Player[];
  paymentSummary: PaymentSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useSingleTeamData(
  teamId: string | undefined,
  userId: string | undefined
): SingleTeamDataReturn {
  const [designRequests, setDesignRequests] = useState<DesignRequest[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create refetchable function
  const fetchSingleTeamData = useCallback(async () => {
    if (!teamId || !userId) return;

    setLoading(true);
    try {
      const supabase = getBrowserClient();

      console.log('[useSingleTeamData] Fetching data for team:', teamId);

        // 1. Get ALL design requests with reactions
        const { data: designData } = await supabase
          .from('design_requests')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        if (designData && designData.length > 0) {
          // For each design request, get reaction counts and user's reaction
          const requestsWithReactions = await Promise.all(
            designData.map(async (request: any) => {
              // Get reaction counts
              const { data: reactions } = await supabase
                .from('design_request_reactions')
                .select('reaction, user_id')
                .eq('design_request_id', request.id);

              const likes_count = reactions?.filter((r: any) => r.reaction === 'like').length || 0;
              const dislikes_count = reactions?.filter((r: any) => r.reaction === 'dislike').length || 0;
              const user_reaction = reactions?.find((r: any) => r.user_id === userId)?.reaction || null;

              return {
                ...request,
                likes_count,
                dislikes_count,
                user_reaction
              };
            })
          );

          setDesignRequests(requestsWithReactions);
        } else {
          setDesignRequests([]);
        }

        // 2. Load ALL team players from player_info_submissions (single source of truth)
        // This ensures consistency between mini field and roster page
        const { data: playersData } = await supabase
          .from('player_info_submissions')
          .select('*')
          .eq('team_id', teamId)
          .order('created_at', { ascending: false });

        if (playersData) {
          setPlayers(playersData);
        }

        // 3. Load payment summary
        // NOTE: orders table may not exist yet - gracefully handle
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, total_amount_clp, payment_status')
          .eq('team_id', teamId);

        if (ordersError) {
          console.warn('[useSingleTeamData] Orders table not accessible (this is normal if orders feature not set up yet):', ordersError.message);
        }

        if (ordersData && ordersData.length > 0) {
          // Get all payment contributions for these orders
          const orderIds = ordersData.map((o: any) => o.id);
          const { data: contributionsData } = await supabase
            .from('payment_contributions')
            .select('order_id, amount_clp, payment_status, user_id')
            .in('order_id', orderIds);

          // Calculate payment summary
          const totalOrders = ordersData.length;
          const totalAmountClp = ordersData.reduce((sum: number, o: any) => sum + o.total_amount_clp, 0);
          const totalPaidClp = contributionsData
            ?.filter((c: any) => c.payment_status === 'approved')
            .reduce((sum: number, c: any) => sum + c.amount_clp, 0) || 0;
          const totalPendingClp = totalAmountClp - totalPaidClp;

          // Count pending payments for current user
          const { data: myItemsData } = await supabase
            .from('order_items')
            .select('id, order_id')
            .in('order_id', orderIds)
            .eq('player_id', userId)
            .eq('opted_out', false);

          let myPendingPayments = 0;
          if (myItemsData) {
            for (const item of myItemsData) {
              const hasPaid = contributionsData?.some(
                (c: any) => c.order_id === item.order_id && c.user_id === userId && c.payment_status === 'approved'
              );
              if (!hasPaid) {
                myPendingPayments++;
              }
            }
          }

          setPaymentSummary({
            totalOrders,
            totalAmountClp,
            totalPaidClp,
            totalPendingClp,
            myPendingPayments
          });
        }

        console.log('[useSingleTeamData] Data loaded successfully');
      } catch (err: any) {
        console.error('[useSingleTeamData] Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
  }, [teamId, userId]);

  // Call fetch on mount and when deps change
  useEffect(() => {
    fetchSingleTeamData();
  }, [fetchSingleTeamData]);

  return {
    designRequests,
    players,
    paymentSummary,
    loading,
    error,
    refetch: fetchSingleTeamData,
  };
}
