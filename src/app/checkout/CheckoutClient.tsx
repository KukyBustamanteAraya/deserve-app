'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import CartSummary from '@/components/orders/CartSummary';
import { formatCurrency } from '@/types/orders';
import type { CartWithItems } from '@/types/orders';

interface CheckoutClientProps {
  cart: CartWithItems;
}

export default function CheckoutClient({ cart }: CheckoutClientProps) {
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePlaceOrder = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartId: cart.id,
          notes: notes.trim() || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        router.push(`/orders/${result.data.orderId}`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to place order');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayWithMercadoPago = async () => {
    setPaymentProcessing(true);
    setError(null);

    try {
      // First create the order
      const orderResponse = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cartId: cart.id,
          notes: notes.trim() || undefined
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderResult = await orderResponse.json();
      const orderId = orderResult.data.orderId;

      // Then create Mercado Pago preference
      const paymentResponse = await fetch('/api/payments/mp/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderId
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const paymentResult = await paymentResponse.json();

      // Redirect to Mercado Pago checkout
      window.location.href = paymentResult.initPoint;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setPaymentProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Order Summary */}
      <div>
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Resumen de la orden
            </h2>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                    {item.product_images && item.product_images.length > 0 ? (
                      <Image
                        src={item.product_images[0]}
                        alt={item.product_name || 'Product'}
                        width={64}
                        height={64}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {item.product_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Cantidad: {item.quantity}
                    </p>
                  </div>

                  {/* Line Total */}
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.line_total_cents || 0, 'CLP')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Notes */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Notas del pedido (opcional)
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Agrega cualquier información adicional sobre tu pedido..."
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
          />
          <p className="text-sm text-gray-500 mt-2">
            {notes.length}/500 caracteres
          </p>
        </div>
      </div>

      {/* Payment Section */}
      <div>
        <div className="sticky top-8">
          <CartSummary cart={cart} className="mb-6" />

          {/* Payment Options */}
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Opciones de pago</h3>

            {/* Mercado Pago Option */}
            <button
              onClick={handlePayWithMercadoPago}
              disabled={paymentProcessing || cart.items.length === 0}
              className="w-full bg-blue-600 text-white py-4 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium text-lg flex items-center justify-center space-x-3"
            >
              {paymentProcessing ? (
                <span>Procesando...</span>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>Pagar con Mercado Pago</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>

            {/* Manual Payment Option */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">
                    Pago manual
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Confirma tu pedido y te contactaremos para coordinar el pago y envío.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={processing || cart.items.length === 0}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              {processing ? 'Procesando...' : 'Confirmar pedido (Pago manual)'}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <p className="text-xs text-gray-500 text-center mt-4">
            Al confirmar tu pedido, aceptas nuestros términos y condiciones.
          </p>

          <button
            onClick={() => router.push('/cart')}
            className="w-full text-gray-600 hover:text-gray-800 py-2 mt-4 transition-colors duration-200"
          >
            ← Volver al carrito
          </button>
        </div>
      </div>
    </div>
  );
}