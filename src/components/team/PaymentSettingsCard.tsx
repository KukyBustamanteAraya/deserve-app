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
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4 relative">Payment Settings</h2>
      <p className="text-gray-300 text-sm mb-4 relative">
        Configure how team orders are paid
      </p>

      <div className="space-y-4 relative">
        <div>
          <label className="block text-sm font-medium text-white mb-3">
            Default Payment Mode
          </label>

          <div className="space-y-3">
            {/* Individual Payments Option */}
            <button
              onClick={() => onPaymentModeChange('individual')}
              className={`relative w-full text-left p-4 rounded-lg border-2 overflow-hidden group/option ${
                paymentMode === 'individual'
                  ? 'border-red-500/50 bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm'
                  : 'border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 hover:border-gray-600'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/option:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="flex items-start gap-3 relative">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'individual'
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-600'
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
                    <h3 className="font-semibold text-white">Individual Payments</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Each team member pays their own share. Perfect for teams where players manage their own payments.
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    <strong>How it works:</strong> Each player sees their individual share and payment button. Order is marked paid when all contributions total the order amount.
                  </div>
                </div>
              </div>
            </button>

            {/* Manager Pays All Option */}
            <button
              onClick={() => onPaymentModeChange('manager_pays_all')}
              className={`relative w-full text-left p-4 rounded-lg border-2 overflow-hidden group/option ${
                paymentMode === 'manager_pays_all'
                  ? 'border-red-500/50 bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm'
                  : 'border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 hover:border-gray-600'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/option:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="flex items-start gap-3 relative">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMode === 'manager_pays_all'
                        ? 'border-red-500 bg-red-500'
                        : 'border-gray-600'
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
                    <h3 className="font-semibold text-white">Manager Pays All</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Manager pays for the entire team order at once. Best for clubs or organizations with centralized budgets.
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    <strong>How it works:</strong> Only the manager sees the payment button for the full order amount. Players see "Paid by manager" status.
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Info Box */}
        <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm border border-gray-600 rounded-lg p-4 overflow-hidden group/info">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex items-start gap-3 relative">
            <span className="text-xl flex-shrink-0">💡</span>
            <div className="flex-1 text-sm text-gray-300">
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
