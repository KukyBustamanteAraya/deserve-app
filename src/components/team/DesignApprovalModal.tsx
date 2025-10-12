'use client';

import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface DesignApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  designRequestId: number;
  teamId: string;
  teamSlug: string;
  defaultPaymentMode?: 'individual' | 'manager_pays_all';
}

export function DesignApprovalModal({
  isOpen,
  onClose,
  designRequestId,
  teamId,
  teamSlug,
  defaultPaymentMode = 'individual',
}: DesignApprovalModalProps) {
  const [paymentMode, setPaymentMode] = useState<'individual' | 'manager_pays_all'>(defaultPaymentMode);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        paymentMode,
        saveAsDefault,
      });

      // Call API to approve design and create order
      const response = await fetch(`/api/design-requests/${designRequestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_mode: paymentMode,
          save_as_default: saveAsDefault,
          team_id: teamId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al aprobar diseño');
      }

      const { order } = await response.json();
      logger.info('[DesignApprovalModal] Design approved successfully, order created:', order);

      // Close modal and redirect to payments page
      onClose();
      window.location.href = `/mi-equipo/${teamSlug}/payments`;
    } catch (err: any) {
      logger.error('[DesignApprovalModal] Error approving design:', err);
      setError(err.message || 'Error al aprobar diseño');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Aprobar Diseño</h2>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">❌</span>
              <div>
                <h4 className="font-bold text-red-900 mb-1">Error</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-600 mb-6">
          Al aprobar este diseño, se creará automáticamente un pedido para todos los miembros del equipo.
        </p>

        {/* Payment Mode Selection */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            ¿Cómo se pagará este pedido?
          </label>

          <div className="space-y-3">
            {/* Individual Payments */}
            <button
              onClick={() => setPaymentMode('individual')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                paymentMode === 'individual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  paymentMode === 'individual'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {paymentMode === 'individual' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Cada jugador paga individualmente
                  </h3>
                  <p className="text-sm text-gray-600">
                    Cada miembro del equipo pagará su parte del pedido
                  </p>
                </div>
              </div>
            </button>

            {/* Manager Pays All */}
            <button
              onClick={() => setPaymentMode('manager_pays_all')}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                paymentMode === 'manager_pays_all'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  paymentMode === 'manager_pays_all'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {paymentMode === 'manager_pays_all' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Yo pagaré por todo el equipo
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tú pagarás el pedido completo por todos los miembros
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Save as Default Checkbox */}
        <div className="mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={saveAsDefault}
              onChange={(e) => setSaveAsDefault(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              Guardar como modo de pago predeterminado para este equipo
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Aprobando...
              </>
            ) : (
              <>
                ✅ Aprobar y Crear Pedido
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
