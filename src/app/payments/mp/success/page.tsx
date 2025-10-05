'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface OrderStatus {
  id: string;
  status: 'pending' | 'paid' | 'cancelled';
  total_cents: number;
  currency: string;
}

export default function PaymentSuccessPage() {
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

    let pollInterval: NodeJS.Timeout;

    const checkOrderStatus = async () => {
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

        // If payment is confirmed, stop polling
        if (data.status === 'paid') {
          setLoading(false);
          if (pollInterval) clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error checking order status:', err);
        setError('Failed to check order status');
        setLoading(false);
      }
    };

    // Check immediately
    checkOrderStatus();

    // Then poll every 3 seconds for updates
    pollInterval = setInterval(checkOrderStatus, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => {
      if (pollInterval) clearInterval(pollInterval);
      setLoading(false);
    }, 120000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderId]);

  const formatCurrency = (cents: number, currency: string) => {
    return `$${(cents / 100).toLocaleString('es-CL', { minimumFractionDigits: 0 })} ${currency}`;
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
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment</h1>
          <p className="text-gray-600 mb-4">
            We're confirming your payment with Mercado Pago. This usually takes a few seconds...
          </p>
          <div className="text-sm text-gray-500">
            Please wait while we verify your payment status.
          </div>
        </div>
      </div>
    );
  }

  if (order.status === 'paid') {
    return (
      <div className="max-w-md mx-auto p-6 mt-8">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-4">
            Your payment of {formatCurrency(order.total_cents, order.currency)} has been confirmed.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => router.push(`/orders/${order.id}`)}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              View Order Details
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

  // Order is still pending
  return (
    <div className="max-w-md mx-auto p-6 mt-8">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Payment Pending</h1>
        <p className="text-gray-600 mb-4">
          Your payment is being processed. We'll update the status shortly.
        </p>
        <div className="space-y-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Refresh Status
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