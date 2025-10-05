import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { formatCurrency } from '@/types/orders';
import type { OrderWithItems } from '@/types/orders';

interface OrderDetailPageProps {
  params: { id: string };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  try {
    const supabase = createSupabaseServer();
    const user = await requireAuth(supabase);

    const orderId = params.id;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      notFound();
    }

    // Get order with items
    const { data: order, error: orderError } = await supabase
      .from('orders_with_items')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError) {
      if (orderError.code === 'PGRST116') {
        notFound();
      }
      console.error('Error fetching order details:', orderError);
      throw new Error('Failed to fetch order details');
    }

    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <Link
                href="/orders"
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">
                Pedido #{order.id.slice(-8).toUpperCase()}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="text-gray-600">
              <p>Realizado el {new Date(order.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Productos pedidos
                  </h2>
                </div>

                <div className="divide-y divide-gray-200">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-2xl">📦</span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {item.name}
                          </h3>
                          <div className="text-sm text-gray-500 space-y-1">
                            <p>Precio unitario: {formatCurrency(item.unit_price_cents, order.currency)}</p>
                            <p>Cantidad: {item.quantity}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(item.line_total_cents, order.currency)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Notes */}
              {order.notes && (
                <div className="bg-white rounded-lg shadow-sm border p-6 mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Notas del pedido
                  </h3>
                  <p className="text-gray-700">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Resumen del pedido
                  </h3>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(order.subtotal_cents, order.currency)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Envío</span>
                      <span className="text-gray-900 font-medium">Gratis</span>
                    </div>

                    <hr className="my-3" />

                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-red-600">
                        {formatCurrency(order.total_cents, order.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      Información del pedido
                    </h4>
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>ID del pedido:</span>
                        <span className="font-mono text-xs">{order.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Estado:</span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="flex justify-between">
                        <span>Moneda:</span>
                        <span>{order.currency}</span>
                      </div>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        <strong>Pedido pendiente:</strong> Te contactaremos pronto para coordinar el pago y envío.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );

  } catch (error) {
    console.error('Order detail page error:', error);
    redirect('/login?redirect=/orders');
  }
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
  return {
    title: `Pedido #${params.id.slice(-8).toUpperCase()} | Deserve`,
    description: 'Detalles de tu pedido en Deserve.',
  };
}