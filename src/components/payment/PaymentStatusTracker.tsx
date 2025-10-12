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
      <div className="bg-white rounded-lg p-4 border">
        <p className="text-sm text-gray-600">Cargando estado de pagos...</p>
      </div>
    );
  }

  if (contributions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Estado de Pagos</h3>
        <span className="text-sm font-semibold text-gray-600">
          {paidCount} / {totalCount} pagados
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Progreso</span>
          <span className="font-semibold text-gray-900">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              progress >= 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
          <span>{formatCLP((progress / 100) * totalAmountCents)}</span>
          <span>{formatCLP(totalAmountCents)}</span>
        </div>
      </div>

      {/* Contributors List */}
      <div className="space-y-2">
        {contributions.map((contribution, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg border-2 ${
              contribution.payment_status === 'paid'
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  contribution.payment_status === 'paid' ? 'bg-green-500' : 'bg-gray-400'
                }`}
              >
                {contribution.profiles?.full_name?.[0] || contribution.profiles?.email?.[0] || '?'}
              </div>

              {/* Name & Email */}
              <div>
                <p className="font-medium text-gray-900">
                  {contribution.profiles?.full_name || contribution.profiles?.email?.split('@')[0] || 'Miembro'}
                </p>
                <p className="text-xs text-gray-600">{formatCLP(contribution.amount_cents)}</p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              {contribution.payment_status === 'paid' ? (
                <>
                  <span className="text-xs text-green-700 font-medium">Pagado</span>
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm">
                    ✓
                  </div>
                </>
              ) : contribution.payment_status === 'failed' ? (
                <>
                  <span className="text-xs text-red-700 font-medium">Fallido</span>
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm">
                    ✕
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-gray-600 font-medium">Pendiente</span>
                  <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white text-sm">
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
        <div className="mt-4 pt-4 border-t border-green-200 bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-800">
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
