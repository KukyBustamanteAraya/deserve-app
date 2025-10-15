'use client';

import { useEffect, useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface PaymentContribution {
  user_id: string;
  amount_cents: number;
  payment_status: string;
  paid_at?: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface PaymentStatusTrackerProps {
  orderId: string;
  totalAmountCents: number;
  teamId: string;
}

export function PaymentStatusTracker({ orderId, totalAmountCents, teamId }: PaymentStatusTrackerProps) {
  const supabase = getBrowserClient();
  const [contributions, setContributions] = useState<PaymentContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadContributions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('payment-contributions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_contributions',
          filter: `order_id=eq.${orderId}`,
        },
        () => {
          loadContributions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const loadContributions = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_contributions')
        .select('user_id, amount_cents, payment_status, paid_at, profiles(email, full_name)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setContributions(data || []);

      // Calculate progress
      const paidAmount = (data || [])
        .filter((c) => c.payment_status === 'paid')
        .reduce((sum, c) => sum + c.amount_cents, 0);

      const progressPercent = totalAmountCents > 0 ? (paidAmount / totalAmountCents) * 100 : 0;
      setProgress(progressPercent);
    } catch (error) {
      logger.error('Error loading contributions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCLP = (cents: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(cents / 100);
  };

  const paidCount = contributions.filter((c) => c.payment_status === 'paid').length;
  const totalCount = contributions.length;

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-4 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <p className="text-sm text-gray-300 relative">Cargando estado de pagos...</p>
      </div>
    );
  }

  if (contributions.length === 0) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-lg font-bold text-white">Estado de Pagos</h3>
        <span className="text-sm font-semibold text-gray-300">
          {paidCount} / {totalCount} pagados
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 relative">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-300">Progreso</span>
          <span className="font-semibold text-white">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
          <span>{formatCLP((progress / 100) * totalAmountCents)}</span>
          <span>{formatCLP(totalAmountCents)}</span>
        </div>
      </div>

      {/* Contributors List */}
      <div className="space-y-2 relative">
        {contributions.map((contribution, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              contribution.payment_status === 'paid'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-gray-800/50 border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  contribution.payment_status === 'paid' ? 'bg-green-500' : 'bg-gray-600'
                }`}
              >
                {contribution.profiles?.full_name?.[0] || contribution.profiles?.email?.[0] || '?'}
              </div>

              {/* Name & Email */}
              <div>
                <p className="font-medium text-white">
                  {contribution.profiles?.full_name || contribution.profiles?.email?.split('@')[0] || 'Miembro'}
                </p>
                <p className="text-xs text-gray-300">{formatCLP(contribution.amount_cents)}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {contribution.payment_status === 'paid' ? (
                <>
                  <span className="text-xs text-green-400 font-medium">Pagado</span>
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                    ✓
                  </div>
                </>
              ) : contribution.payment_status === 'failed' ? (
                <>
                  <span className="text-xs text-red-400 font-medium">Fallido</span>
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                    ✕
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-400 font-medium">Pendiente</span>
                  <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm">
                    ⏱
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {progress >= 100 && (
        <div className="mt-4 pt-4 border-t border-green-500/30 bg-green-500/10 rounded-lg p-3 relative">
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
              ✓
            </div>
            <span className="font-semibold">¡Pago completado! Procederemos con tu orden.</span>
          </div>
        </div>
      )}
    </div>
  );
}
