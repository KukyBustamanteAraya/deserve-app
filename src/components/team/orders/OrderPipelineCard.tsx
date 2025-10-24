'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderOverview, OrderLifecycleStage } from '@/types/payments';
import { formatCLP, calculatePaymentProgress } from '@/types/payments';

interface OrderPipelineCardProps {
  order: OrderOverview;
  teamSlug: string;
}

export function OrderPipelineCard({ order, teamSlug }: OrderPipelineCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  // Determine lifecycle stage from order status
  const getLifecycleStage = (): OrderLifecycleStage => {
    switch (order.status) {
      case 'pending':
        return order.payment_status === 'paid' ? 'order_assembly' : 'payment_pending';
      case 'paid':
        return 'in_production';
      case 'processing':
        return 'in_production';
      case 'shipped':
        return 'shipping';
      case 'delivered':
        return 'delivered';
      default:
        return 'order_assembly';
    }
  };

  const stage = getLifecycleStage();

  // Get stage display info
  const getStageInfo = (stage: OrderLifecycleStage) => {
    switch (stage) {
      case 'design_review':
        return { label: 'Revisión de Diseño', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' };
      case 'order_assembly':
        return { label: 'Armando Orden', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' };
      case 'payment_pending':
        return { label: 'Esperando Pago', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' };
      case 'in_production':
        return { label: 'En Producción', color: 'bg-orange-500/20 text-orange-400 border-orange-500/50' };
      case 'quality_check':
        return { label: 'Control de Calidad', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' };
      case 'shipping':
        return { label: 'En Camino', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' };
      case 'delivered':
        return { label: 'Entregado', color: 'bg-green-500/20 text-green-400 border-green-500/50' };
      default:
        return { label: 'Desconocido', color: 'bg-gray-500/20 text-gray-400 border-gray-500/50' };
    }
  };

  const stageInfo = getStageInfo(stage);

  // Calculate payment progress (assuming total_paid is available from join)
  const totalPaid = 0; // TODO: Get from payment_contributions join
  const { percentage: paymentPercentage } = calculatePaymentProgress(
    order.total_amount_clp || 0,
    totalPaid
  );

  const handleClick = () => {
    // TODO: Open order detail modal
    router.push(`/mi-equipo/${teamSlug}/orders/${order.id}`);
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 text-left transition-all border border-gray-700 hover:border-[#e21c21]/50 overflow-hidden group w-full"
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-white">
                Orden #{order.id?.slice(0, 8) || 'Sin ID'}
              </span>
              {order.can_modify && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50">
                  Modificable
                </span>
              )}
            </div>
            <span
              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${stageInfo.color}`}
            >
              {stageInfo.label}
            </span>
          </div>
        </div>

        {/* Products Count */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Productos</div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white">{order.product_count}</span>
            <span className="text-xs text-gray-500">
              ({order.item_count} items totales)
            </span>
          </div>
        </div>

        {/* Payment Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Pago</span>
            <span className="font-semibold text-white">{paymentPercentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                paymentPercentage === 100
                  ? 'bg-green-500'
                  : paymentPercentage > 0
                  ? 'bg-yellow-500'
                  : 'bg-gray-500'
              }`}
              style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Total Amount */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-400">Total</span>
          <span className="text-lg font-bold text-white">
            {formatCLP(order.total_amount_clp || 0)}
          </span>
        </div>

        {/* Dates */}
        {order.estimated_delivery && (
          <div className="mt-2 text-xs text-gray-400">
            Entrega estimada: {new Date(order.estimated_delivery).toLocaleDateString('es-CL')}
          </div>
        )}

        {/* Can Add Products Indicator */}
        {order.can_modify && !order.locked_at && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Puedes agregar más productos</span>
          </div>
        )}

        {/* Locked Indicator */}
        {order.locked_at && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Orden bloqueada</span>
          </div>
        )}
      </div>
    </button>
  );
}
