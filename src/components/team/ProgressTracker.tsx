'use client';

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { CompletionBar } from './CompletionBar';

type ProgressTrackerProps = {
  teamId: string;
  designRequestId?: number;
};

type ProgressStats = {
  totalPlayers: number;
  playersPaid: number;
  playersPending: number;
  designApproved: boolean;
  playerInfoComplete: boolean;
  paymentsComplete: boolean;
  orderPlaced: boolean;
};

export function ProgressTracker({ teamId, designRequestId }: ProgressTrackerProps) {
  const [stats, setStats] = useState<ProgressStats>({
    totalPlayers: 0,
    playersPaid: 0,
    playersPending: 0,
    designApproved: false,
    playerInfoComplete: false,
    paymentsComplete: false,
    orderPlaced: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const supabase = getBrowserClient();

        // Get team member count
        const { count: memberCount } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', teamId);

        // Check design approval
        let designApproved = false;
        if (designRequestId) {
          const { data: designRequest } = await supabase
            .from('design_requests')
            .select('status')
            .eq('id', designRequestId)
            .single();

          designApproved = designRequest?.status === 'approved';
        }

        // Check player info submissions
        let playerInfoComplete = false;
        let submissionCount = 0;
        if (designRequestId) {
          const { count } = await supabase
            .from('player_info_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('design_request_id', designRequestId);

          submissionCount = count || 0;
          // Consider complete if at least some players have submitted
          playerInfoComplete = submissionCount > 0;
        }

        // Check payment status (tables may not exist yet)
        let playersPaid = 0;
        let paymentsComplete = false;
        if (designRequestId) {
          try {
            // Check payment contributions
            const { count: paidCount, error: contributionsError } = await supabase
              .from('payment_contributions')
              .select('*', { count: 'exact', head: true })
              .eq('design_request_id', designRequestId)
              .eq('status', 'approved');

            if (!contributionsError) {
              playersPaid = paidCount || 0;
            }

            // Check if bulk payment exists
            const { data: bulkPayment, error: bulkError } = await supabase
              .from('bulk_payments')
              .select('status')
              .eq('team_id', teamId)
              .eq('status', 'approved')
              .single();

            if (!bulkError && bulkPayment) {
              playersPaid = memberCount || 0;
              paymentsComplete = true;
            } else {
              paymentsComplete = playersPaid > 0 && playersPaid >= (memberCount || 0);
            }
          } catch (paymentError) {
            // Payment tables may not exist yet - that's okay
            console.log('[ProgressTracker] Payment tables not yet available');
          }
        }

        // Check order status
        let orderPlaced = false;
        if (designRequestId) {
          const { data: designRequest } = await supabase
            .from('design_requests')
            .select('order_id')
            .eq('id', designRequestId)
            .single();

          if (designRequest?.order_id) {
            const { data: order } = await supabase
              .from('orders')
              .select('status')
              .eq('id', designRequest.order_id)
              .single();

            orderPlaced = order?.status !== 'pending';
          }
        }

        setStats({
          totalPlayers: memberCount || 0,
          playersPaid,
          playersPending: (memberCount || 0) - playersPaid,
          designApproved,
          playerInfoComplete,
          paymentsComplete,
          orderPlaced,
        });
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProgress();
  }, [teamId, designRequestId]);

  // Calculate overall completion percentage
  const calculateCompletion = () => {
    let completion = 0;
    if (stats.designApproved) completion += 25;
    if (stats.playerInfoComplete) completion += 25;
    if (stats.paymentsComplete) completion += 25;
    if (stats.orderPlaced) completion += 25;
    return completion;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-6"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const completion = calculateCompletion();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">⚡</span>
          Progreso del Equipo
        </h2>

        <CompletionBar
          percentage={completion}
          label={`${completion}% Completado`}
          showPercentage={true}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-700">{stats.totalPlayers}</div>
          <div className="text-sm text-blue-600 font-medium mt-1">👥 Jugadores</div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-700">{stats.playersPaid}</div>
          <div className="text-sm text-green-600 font-medium mt-1">✅ Pagados</div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-orange-700">{stats.playersPending}</div>
          <div className="text-sm text-orange-600 font-medium mt-1">⏳ Pendientes</div>
        </div>
      </div>

      {/* Milestone Checklist */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Hitos del Equipo</h3>

        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          stats.designApproved ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
        }`}>
          <span className="text-2xl">
            {stats.designApproved ? '✅' : '⏳'}
          </span>
          <span className="font-medium">Diseño Aprobado</span>
        </div>

        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          stats.playerInfoComplete ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
        }`}>
          <span className="text-2xl">
            {stats.playerInfoComplete ? '✅' : '⏳'}
          </span>
          <span className="font-medium">Información de Jugadores</span>
        </div>

        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          stats.paymentsComplete ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
        }`}>
          <span className="text-2xl">
            {stats.paymentsComplete ? '✅' : '⏳'}
          </span>
          <span className="font-medium">Pagos Completados</span>
        </div>

        <div className={`flex items-center gap-3 p-3 rounded-lg ${
          stats.orderPlaced ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-600'
        }`}>
          <span className="text-2xl">
            {stats.orderPlaced ? '✅' : '⏳'}
          </span>
          <span className="font-medium">Pedido Realizado</span>
        </div>
      </div>
    </div>
  );
}
