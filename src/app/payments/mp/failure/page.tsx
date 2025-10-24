'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface OrderStatus {
  id: string;
  status: 'pending' | 'paid' | 'cancelled';
  total_cents: number;
  currency: string;
}

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError('Order ID is missing');
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('orders')
          .select('id, status, total_cents, currency')
          .eq('id', orderId)
          .single();

        if (error) {
          setError('Order not found');
          setLoading(false);
          return;
        }

        setOrder(data);
        setLoading(false);
      } catch (err) {
        logger.error('Error fetching order:', toError(err));
        setError('Failed to fetch order details');
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  const formatCurrency = (cents: number, currency: string) => {
    return `$${(cents / 100).toLocaleString('es-CL', { minimumFractionDigits: 0 })} ${currency}`;
  };

  const handleRetryPayment = () => {
    if (order) {
      router.push(`/checkout/${order.id}`);
    }
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6 mt-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading || !order) {
    return (
      <div className="max-w-md mx-auto p-6 mt-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Loading...</h1>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 mt-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-600 mb-4">
          Unfortunately, your payment of {formatCurrency(order.total_cents, order.currency)} could not be processed.
        </p>
        <div className="text-sm text-gray-500 mb-6">
          Don't worry, no charge was made to your account. You can try again with a different payment method.
        </div>
        <div className="space-y-2">
          <button
            onClick={handleRetryPayment}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}