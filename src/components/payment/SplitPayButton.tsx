'use client';

import { useState } from 'react';
import { CreditCardIcon } from '@heroicons/react/24/outline';

interface SplitPayButtonProps {
  orderId: string;
  userId: string;
  amountCents: number;
  disabled?: boolean;
  onPaymentInitiated?: () => void;
}

/**
 * Button component for initiating a split payment (individual contribution)
 * When clicked, creates a Mercado Pago preference and redirects to checkout
 */
export function SplitPayButton({
  orderId,
  userId,
  amountCents,
  disabled = false,
  onPaymentInitiated,
}: SplitPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call API to create payment preference
      const response = await fetch('/api/mercadopago/create-split-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId,
          amountCents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el pago');
      }

      // Notify parent component
      onPaymentInitiated?.();

      // Redirect to Mercado Pago checkout
      window.location.href = data.initPoint;
    } catch (err: any) {
      console.error('Error initiating payment:', err);
      setError(err.message || 'Error al iniciar el pago');
      setLoading(false);
    }
  };

  const formatCLP = (cents: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(cents / 100);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handlePayment}
        disabled={disabled || loading}
        className={`
          w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold
          transition-colors duration-200
          ${
            disabled || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
          }
        `}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
            <span>Procesando...</span>
          </>
        ) : (
          <>
            <CreditCardIcon className="w-5 h-5" />
            <span>Pagar {formatCLP(amountCents)}</span>
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        Serás redirigido a Mercado Pago para completar el pago
      </p>
    </div>
  );
}
