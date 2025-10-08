'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { ClockIcon } from '@heroicons/react/24/solid';

export default function PaymentPendingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('payment_id');
  const externalRef = searchParams.get('external_reference');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <ClockIcon className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pago pendiente</h1>
        <p className="text-gray-600 mb-6">
          Tu pago está siendo procesado. Te notificaremos por email cuando se complete la transacción.
        </p>

        {paymentId && (
          <div className="bg-yellow-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">ID de pago:</span> {paymentId}
            </p>
            {externalRef && (
              <p className="text-sm text-yellow-800 mt-1">
                <span className="font-semibold">Referencia:</span> {externalRef}
              </p>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>¿Qué significa esto?</strong><br />
            Algunos métodos de pago (como transferencias bancarias) pueden tardar unos días en procesarse.
            Te avisaremos cuando tu pago sea confirmado.
          </p>
        </div>

        <button
          onClick={() => router.push('/mi-equipo')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          Ir a Mi Equipo
        </button>
      </div>
    </div>
  );
}
