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
    <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Estado de Pago</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getOrderPaymentStatusColor(status)}`}>
          {getOrderPaymentStatusLabel(status)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-600">Progreso</span>
          <span className="font-semibold text-gray-900">{percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPaid ? 'bg-green-500' : isPartial ? 'bg-yellow-500' : 'bg-gray-400'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Payment Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">Total del Pedido</div>
          <div className="text-2xl font-bold text-gray-900">{formatCLP(totalCents)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Monto Pagado</div>
          <div className="text-2xl font-bold text-green-600">{formatCLP(paidCents)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Pendiente</div>
          <div className="text-xl font-semibold text-orange-600">{formatCLP(pendingCents)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Pagado por</div>
          <div className="text-xl font-semibold text-gray-900">
            {paidCount}/{contributorCount}
          </div>
        </div>
      </div>
    </div>
  );
}
