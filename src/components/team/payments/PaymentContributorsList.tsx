'use client';

import { formatCLP, getPaymentStatusColor, getPaymentStatusLabel } from '@/types/payments';
import type { PaymentContribution } from '@/types/payments';

type PaymentContributorsListProps = {
  contributions: (PaymentContribution & {
    user?: {
      id: string;
      email: string;
      full_name: string | null;
    };
  })[];
  totalContributors: number;
};

export function PaymentContributorsList({
  contributions,
  totalContributors
}: PaymentContributorsListProps) {
  const paidContributions = contributions.filter(c => c.payment_status === 'approved');
  const pendingContributions = contributions.filter(c => c.payment_status === 'pending');
  const otherContributions = contributions.filter(
    c => c.payment_status !== 'approved' && c.payment_status !== 'pending'
  );

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="text-lg font-semibold text-white">Contribuciones</h3>
        <span className="text-sm text-gray-300">
          {paidContributions.length} de {totalContributors} pagados
        </span>
      </div>

      {/* Paid Contributions */}
      {paidContributions.length > 0 && (
        <div className="mb-6 relative">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Pagados</h4>
          <div className="space-y-2">
            {paidContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {contribution.user?.full_name?.charAt(0).toUpperCase() ||
                       contribution.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {contribution.user?.full_name || contribution.user?.email || 'Usuario'}
                    </div>
                    {contribution.paid_at && (
                      <div className="text-xs text-gray-300">
                        Pagado el {new Date(contribution.paid_at).toLocaleDateString('es-CL')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-400">
                    {formatCLP(contribution.amount_cents)}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusColor(contribution.payment_status)}`}>
                    {getPaymentStatusLabel(contribution.payment_status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Contributions */}
      {pendingContributions.length > 0 && (
        <div className="mb-6 relative">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Pendientes</h4>
          <div className="space-y-2">
            {pendingContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {contribution.user?.full_name?.charAt(0).toUpperCase() ||
                       contribution.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {contribution.user?.full_name || contribution.user?.email || 'Usuario'}
                    </div>
                    <div className="text-xs text-gray-300">
                      Creado el {new Date(contribution.created_at).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-yellow-400">
                    {formatCLP(contribution.amount_cents)}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusColor(contribution.payment_status)}`}>
                    {getPaymentStatusLabel(contribution.payment_status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Other Status Contributions */}
      {otherContributions.length > 0 && (
        <div className="relative">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Otros Estados</h4>
          <div className="space-y-2">
            {otherContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {contribution.user?.full_name?.charAt(0).toUpperCase() ||
                       contribution.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">
                      {contribution.user?.full_name || contribution.user?.email || 'Usuario'}
                    </div>
                    <div className="text-xs text-gray-300">
                      {new Date(contribution.created_at).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-300">
                    {formatCLP(contribution.amount_cents)}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentStatusColor(contribution.payment_status)}`}>
                    {getPaymentStatusLabel(contribution.payment_status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {contributions.length === 0 && (
        <div className="text-center py-8 text-gray-400 relative">
          <p>No hay contribuciones registradas aún.</p>
        </div>
      )}
    </div>
  );
}
