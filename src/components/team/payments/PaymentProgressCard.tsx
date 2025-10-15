'use client';

import { formatCLP, calculatePaymentProgress, getOrderPaymentStatusColor, getOrderPaymentStatusLabel } from '@/types/payments';

type PaymentProgressCardProps = {
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  contributorCount: number;
  paidCount: number;
};

export function PaymentProgressCard({
  totalCents,
  paidCents,
  pendingCents,
  contributorCount,
  paidCount
}: PaymentProgressCardProps) {
  const { percentage, isPaid, isPartial } = calculatePaymentProgress(totalCents, paidCents);

  const status: 'unpaid' | 'partial' | 'paid' = isPaid ? 'paid' : isPartial ? 'partial' : 'unpaid';

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-lg font-semibold text-white">Estado de Pago</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderPaymentStatusColor(status)}`}>
          {getOrderPaymentStatusLabel(status)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 relative">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-300">Progreso</span>
          <span className="font-semibold text-white">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPaid ? 'bg-green-500' : isPartial ? 'bg-yellow-500' : 'bg-gray-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-2 gap-4 relative">
        <div>
          <div className="text-sm text-gray-300 mb-1">Total del Pedido</div>
          <div className="text-2xl font-bold text-white">{formatCLP(totalCents)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-300 mb-1">Monto Pagado</div>
          <div className="text-2xl font-bold text-green-400">{formatCLP(paidCents)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-300 mb-1">Pendiente</div>
          <div className="text-xl font-semibold text-orange-400">{formatCLP(pendingCents)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-300 mb-1">Pagado por</div>
          <div className="text-xl font-semibold text-white">
            {paidCount}/{contributorCount}
          </div>
        </div>
      </div>
    </div>
  );
}
