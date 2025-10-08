'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { XCircleIcon } from '@heroicons/react/24/solid';

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentId = searchParams.get('payment_id');
  const status = searchParams.get('status');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <XCircleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Pago no completado</h1>
        <p className="text-gray-600 mb-6">
          Tu pago no pudo ser procesado. Por favor, intenta nuevamente o contacta a tu banco si el problema persiste.
        </p>

        {status && (
          <div className="bg-red-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Estado:</span> {status}
            </p>
            {paymentId && (
              <p className="text-sm text-red-800 mt-1">
                <span className="font-semibold">ID de pago:</span> {paymentId}
              </p>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
