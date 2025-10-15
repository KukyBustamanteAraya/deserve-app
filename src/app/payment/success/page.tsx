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
    let pollInterval: NodeJS.Timeout | null = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 20; // 20 attempts * 3 seconds = 60 seconds max
    const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds

    const checkPaymentStatus = async () => {
      try {
        if (!externalRef) {
          setError('Referencia de pago no encontrada');
          setVerifying(false);
          return;
        }

        const response = await fetch(`/api/payment-contributions/${externalRef}`);

        if (!response.ok) {
          throw new Error('Error al obtener información del pago');
        }

        const data = await response.json();
        setPaymentInfo(data);

        // Check if payment is approved
        if (data.paymentStatus === 'approved') {
          // Payment confirmed! Clear polling and redirect
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }

          setVerifying(false);

          // Redirect to team payments page after brief delay
          setTimeout(() => {
            setRedirecting(true);
            if (data.teamSlug) {
              router.push(`/mi-equipo/${data.teamSlug}/payments`);
            } else {
              router.push('/mi-equipo');
            }
          }, 2000);

          return true; // Payment approved
        }

        pollAttempts++;

        // Check if we've exceeded max attempts
        if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          setVerifying(false);
          setError(
            'El pago está siendo procesado. Por favor, verifica el estado en tu equipo en unos minutos.'
          );

          // Still redirect after timeout, but to payments page
          setTimeout(() => {
            if (data.teamSlug) {
              router.push(`/mi-equipo/${data.teamSlug}/payments`);
            } else {
              router.push('/mi-equipo');
            }
          }, 5000);

          return false;
        }

        return false; // Keep polling
      } catch (err: any) {
        console.error('Error checking payment status:', err);
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
        setError(err.message || 'Error al verificar el pago');
        setVerifying(false);
        return false;
      }
    };

    const startPolling = async () => {
      // Initial check
      const approved = await checkPaymentStatus();

      if (approved) {
        return; // Already approved, no need to poll
      }

      setVerifying(false); // Show the polling UI

      // Start polling interval
      pollInterval = setInterval(async () => {
        await checkPaymentStatus();
      }, POLL_INTERVAL_MS);
    };

    startPolling();

    // Cleanup on unmount
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [externalRef, router]);

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600 mb-4" />
          <p className="text-gray-600 text-lg font-semibold">Verificando tu pago...</p>
          <p className="text-gray-500 text-sm mt-2">Esperando confirmación de Mercado Pago</p>
        </div>
      </div>
    );
  }

  if (error) {
    const isTimeoutError = error.includes('siendo procesado');

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className={`w-16 h-16 ${isTimeoutError ? 'bg-yellow-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isTimeoutError ? (
              <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
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
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isTimeoutError ? 'Procesando Pago' : 'Error'}
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              if (paymentInfo?.teamSlug) {
                router.push(`/mi-equipo/${paymentInfo.teamSlug}/payments`);
              } else {
                router.push('/mi-equipo');
              }
            }}
            className={`px-6 py-3 ${isTimeoutError ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-900 hover:bg-gray-800'} text-white rounded-lg transition-colors`}
          >
            {isTimeoutError ? 'Ver Estado del Pago' : 'Volver al inicio'}
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
                router.push(`/mi-equipo/${paymentInfo.teamSlug}/payments`);
              } else {
                router.push('/mi-equipo');
              }
            }}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Ver Mis Pagos
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
