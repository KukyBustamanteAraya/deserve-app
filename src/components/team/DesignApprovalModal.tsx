'use client';

import { useState, useEffect } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { formatCLP } from '@/types/payments';

interface DesignApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  designRequestId: number;
  teamId: string;
  teamSlug: string;
  defaultPaymentMode?: 'individual' | 'manager_pays_all';
}

type ExistingOrder = {
  id: string;
  total_amount_clp: number;
  status: string;
  payment_status: string;
  created_at: string;
  item_count: number;
};

export function DesignApprovalModal({
  isOpen,
  onClose,
  designRequestId,
  teamId,
  teamSlug,
  defaultPaymentMode = 'individual',
}: DesignApprovalModalProps) {
  const [orderSelection, setOrderSelection] = useState<'new' | string>('new');
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingOrders, setExistingOrders] = useState<ExistingOrder[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadExistingOrders();
    }
  }, [isOpen, teamId]);

  const loadExistingOrders = async () => {
    setLoadingOrders(true);
    try {
      const supabase = getBrowserClient();

      // Get orders that can be modified (not shipped, not cancelled)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount_clp, status, payment_status, created_at')
        .eq('team_id', teamId)
        .in('status', ['pending', 'paid', 'processing'])
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Get item counts for each order
      const ordersWithCounts = await Promise.all(
        (ordersData || []).map(async (order: any) => {
          const { count } = await supabase
            .from('order_items')
            .select('*', { count: 'exact', head: true })
            .eq('order_id', order.id);

          return {
            ...order,
            item_count: count || 0,
          };
        })
      );

      setExistingOrders(ordersWithCounts);
    } catch (err: any) {
      logger.error('[DesignApprovalModal] Error loading existing orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (!isOpen) return null;

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      logger.info('[DesignApprovalModal] Approving design request:', {
        designRequestId,
        teamId,
        orderSelection,
      });

      // Call API to approve design and create/update order
      const response = await fetch(`/api/design-requests/${designRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderSelection === 'new' ? null : orderSelection,
          team_id: teamId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Error al aprobar diseño';
        throw new Error(errorMessage);
      }

      const { order } = await response.json();
      logger.info('[DesignApprovalModal] Design approved successfully, order:', order);

      // Close modal and redirect
      onClose();

      // If added to existing order, go to that order's detail page
      // Otherwise go to payments page to see the new order
      if (orderSelection !== 'new') {
        window.location.href = `/mi-equipo/${teamSlug}/orders/${orderSelection}`;
      } else {
        window.location.href = `/mi-equipo/${teamSlug}/payments`;
      }
    } catch (err: any) {
      logger.error('[DesignApprovalModal] Error approving design:', err);
      setError(err.message || 'Error al aprobar diseño');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'paid':
        return 'Pagado';
      case 'processing':
        return 'En Proceso';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-2xl w-full border border-gray-700 overflow-hidden">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>

        <div className="relative p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Aprobar Diseño</h2>
          <p className="text-gray-400 text-sm mb-6">
            Selecciona si este producto será parte de una orden nueva o se agregará a una orden existente
          </p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">❌</span>
                <div>
                  <h4 className="font-bold text-red-400 mb-1">Error</h4>
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              ¿A qué orden pertenece este producto?
            </label>

            <div className="space-y-3">
              {/* New Order Option */}
              <button
                onClick={() => setOrderSelection('new')}
                className={`w-full p-4 rounded-lg border-2 transition-all text-left relative overflow-hidden group ${
                  orderSelection === 'new'
                    ? 'border-[#e21c21] bg-[#e21c21]/10'
                    : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="flex items-start gap-3 relative">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    orderSelection === 'new'
                      ? 'border-[#e21c21] bg-[#e21c21]'
                      : 'border-gray-500'
                  }`}>
                    {orderSelection === 'new' && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                      <span>✨</span>
                      Crear nueva orden
                    </h3>
                    <p className="text-sm text-gray-400">
                      Este producto iniciará una orden completamente nueva
                    </p>
                  </div>
                </div>
              </button>

              {/* Existing Orders */}
              {loadingOrders ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e21c21]"></div>
                </div>
              ) : existingOrders.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Órdenes existentes que pueden ser modificadas:</p>
                  {existingOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setOrderSelection(order.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left relative overflow-hidden group ${
                        orderSelection === order.id
                          ? 'border-[#e21c21] bg-[#e21c21]/10'
                          : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="flex items-start gap-3 relative">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                          orderSelection === order.id
                            ? 'border-[#e21c21] bg-[#e21c21]'
                            : 'border-gray-500'
                        }`}>
                          {orderSelection === order.id && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-white">
                              Orden #{order.id.slice(0, 8)}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>{order.item_count} {order.item_count === 1 ? 'producto' : 'productos'}</span>
                            <span>•</span>
                            <span>{formatCLP(order.total_amount_clp)}</span>
                            <span>•</span>
                            <span>{new Date(order.created_at).toLocaleDateString('es-CL')}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-gray-500 text-sm">
                  No hay órdenes disponibles para agregar productos
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 border border-gray-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleApprove}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Aprobando...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>{orderSelection === 'new' ? 'Aprobar y Crear Orden' : 'Aprobar y Agregar a Orden'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
