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
    <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Contribuciones</h3>
        <span className="text-sm text-gray-600">
          {paidContributions.length} de {totalContributors} pagados
        </span>
      </div>

      {/* Paid Contributions */}
      {paidContributions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Pagados</h4>
          <div className="space-y-2">
            {paidContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
                    <span className="text-green-700 font-semibold text-sm">
                      {contribution.user?.full_name?.charAt(0).toUpperCase() ||
                       contribution.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {contribution.user?.full_name || contribution.user?.email || 'Usuario'}
                    </div>
                    {contribution.paid_at && (
                      <div className="text-xs text-gray-600">
                        Pagado el {new Date(contribution.paid_at).toLocaleDateString('es-CL')}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-700">
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
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Pendientes</h4>
          <div className="space-y-2">
            {pendingContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                    <span className="text-yellow-700 font-semibold text-sm">
                      {contribution.user?.full_name?.charAt(0).toUpperCase() ||
                       contribution.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {contribution.user?.full_name || contribution.user?.email || 'Usuario'}
                    </div>
                    <div className="text-xs text-gray-600">
                      Creado el {new Date(contribution.created_at).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-yellow-700">
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
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Otros Estados</h4>
          <div className="space-y-2">
            {otherContributions.map((contribution) => (
              <div
                key={contribution.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-700 font-semibold text-sm">
                      {contribution.user?.full_name?.charAt(0).toUpperCase() ||
                       contribution.user?.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {contribution.user?.full_name || contribution.user?.email || 'Usuario'}
                    </div>
                    <div className="text-xs text-gray-600">
                      {new Date(contribution.created_at).toLocaleDateString('es-CL')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-700">
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
        <div className="text-center py-8 text-gray-500">
          <p>No hay contribuciones registradas aún.</p>
        </div>
      )}
    </div>
  );
}
