'use client';

import type { PaymentMode } from '@/types/team-settings';

interface PaymentSettingsCardProps {
  paymentMode: PaymentMode;
  onPaymentModeChange: (mode: PaymentMode) => void;
}

export function PaymentSettingsCard({
  paymentMode,
  onPaymentModeChange,
}: PaymentSettingsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Settings</h2>
      <p className="text-gray-600 text-sm mb-4">
        Configure how team orders are paid
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Default Payment Mode
          </label>

          <div className="space-y-3">
            {/* Individual Payments Option */}
            <button
              onClick={() => onPaymentModeChange('individual')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                paymentMode === 'individual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'individual'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {paymentMode === 'individual' && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">👥</span>
                    <h3 className="font-semibold text-gray-900">Individual Payments</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Each team member pays their own share. Perfect for teams where players manage their own payments.
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    <strong>How it works:</strong> Each player sees their individual share and payment button. Order is marked paid when all contributions total the order amount.
                  </div>
                </div>
              </div>
            </button>

            {/* Manager Pays All Option */}
            <button
              onClick={() => onPaymentModeChange('manager_pays_all')}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                paymentMode === 'manager_pays_all'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'manager_pays_all'
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {paymentMode === 'manager_pays_all' && (
                      <div className="w-2.5 h-2.5 bg-white rounded-full" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">💳</span>
                    <h3 className="font-semibold text-gray-900">Manager Pays All</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Manager pays for the entire team order at once. Best for clubs or organizations with centralized budgets.
                  </p>
                  <div className="mt-2 text-xs text-gray-500">
                    <strong>How it works:</strong> Only the manager sees the payment button for the full order amount. Players see "Paid by manager" status.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">💡</span>
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-semibold mb-1">Flexible Payment Options</p>
              <p>
                This is your team's default setting. You can override it for specific orders when approving designs.
                In individual mode, managers can still pay the remaining balance if needed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
