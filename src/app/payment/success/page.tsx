'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface PaymentInfo {
  orderId: string;
  teamSlug: string;
  amountCents: number;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const paymentId = searchParams.get('payment_id');
  const externalRef = searchParams.get('external_reference');
  const status = searchParams.get('status');

  useEffect(() => {
    const verify = async () => {
      try {
        // If we have external reference, fetch the payment details
        if (externalRef) {
          const response = await fetch(`/api/payment-contributions/${externalRef}`);
          if (response.ok) {
            const data = await response.json();
            setPaymentInfo(data);
          }
        }

        // Wait a moment to show success message
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setVerifying(false);

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          setRedirecting(true);
          if (paymentInfo?.teamSlug) {
            router.push(`/mi-equipo/${paymentInfo.teamSlug}`);
          } else {
            router.push('/mi-equipo');
          }
        }, 3000);
      } catch (err) {
        setError('Error al verificar el pago');
        setVerifying(false);
      }
    };

    verify();
  }, [paymentId, externalRef, router, paymentInfo?.teamSlug]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600 mb-4" />
          <p className="text-gray-600 text-lg">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Pago exitoso!</h1>
        <p className="text-gray-600 mb-6">
          Tu pago ha sido procesado correctamente. {redirecting ? 'Redirigiendo...' : 'Serás redirigido en unos segundos.'}
        </p>

        {paymentInfo && (
          <div className="bg-green-50 rounded-lg p-4 mb-6 text-left border border-green-200">
            <p className="text-sm text-gray-700 font-semibold mb-2">Detalles del pago:</p>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Monto:</span> ${paymentInfo.amountCents.toLocaleString('es-CL')} CLP
            </p>
            {paymentId && (
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">ID de pago:</span> {paymentId}
              </p>
            )}
          </div>
        )}

        {!redirecting ? (
          <button
            onClick={() => {
              if (paymentInfo?.teamSlug) {
                router.push(`/mi-equipo/${paymentInfo.teamSlug}`);
              } else {
                router.push('/mi-equipo');
              }
            }}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Ir a Mi Equipo
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent" />
            <span className="font-medium">Redirigiendo...</span>
          </div>
        )}
      </div>
    </div>
  );
}
