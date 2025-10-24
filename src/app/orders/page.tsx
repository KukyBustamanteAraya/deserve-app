import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import OrderStatusBadge from '@/components/orders/OrderStatusBadge';
import { formatCurrency } from '@/types/orders';
import type { Order } from '@/types/orders';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface OrdersPageProps {
  searchParams: { page?: string; limit?: string };
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    const page = parseInt(searchParams.page || '1');
    const limit = parseInt(searchParams.limit || '20');
    const offset = (page - 1) * limit;

    // Get total count
    const { count, error: countError } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      logger.error('Error counting orders:', countError);
      throw new Error('Failed to count orders');
    }

    // Get orders with pagination
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, status, currency, subtotal_clp, total_clp, notes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      logger.error('Error fetching orders:', ordersError);
      throw new Error('Failed to fetch orders');
    }

    const totalPages = Math.ceil((count || 0) / limit);

    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">Mis pedidos</h1>
            <p className="text-gray-300 mt-2">
              Historial de tus pedidos y compras
            </p>
          </div>

          {!orders || orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                No tienes pedidos aún
              </h2>
              <p className="text-gray-300 mb-8">
                Explora nuestro catálogo y realiza tu primer pedido
              </p>
              <Link
                href="/catalog"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-[#e21c21] hover:bg-[#c11a1e] transition-colors duration-200"
              >
                Ir al catálogo
              </Link>
            </div>
          ) : (
            <>
              {/* Orders List */}
              <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
                <div className="divide-y divide-gray-700">
                  {orders.map((order) => (
                    <div key={order.id} className="p-6 hover:bg-gray-800/50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-2">
                            <h3 className="text-lg font-medium text-white">
                              Pedido #{order.id.slice(-8).toUpperCase()}
                            </h3>
                            <OrderStatusBadge status={order.status} />
                          </div>

                          <div className="text-sm text-gray-400 space-y-1">
                            <p>Fecha: {new Date(order.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</p>
                            {order.notes && (
                              <p>Notas: {order.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-2xl font-bold text-white mb-2">
                            {formatCurrency(order.total_clp, order.currency)}
                          </p>
                          <Link
                            href={`/orders/${order.id}`}
                            className="inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-200"
                          >
                            Ver detalles
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8">
                  <div className="text-sm text-gray-300">
                    Mostrando {offset + 1} a {Math.min(offset + limit, count || 0)} de {count || 0} pedidos
                  </div>

                  <div className="flex space-x-2">
                    {page > 1 && (
                      <Link
                        href={`/orders?page=${page - 1}&limit=${limit}`}
                        className="px-3 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        Anterior
                      </Link>
                    )}

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                      if (pageNum > totalPages) return null;

                      return (
                        <Link
                          key={pageNum}
                          href={`/orders?page=${pageNum}&limit=${limit}`}
                          className={`px-3 py-2 border text-sm font-medium rounded-md transition-colors duration-200 ${
                            pageNum === page
                              ? 'border-[#e21c21] bg-[#e21c21]/20 text-[#e21c21]'
                              : 'border-gray-700 text-gray-200 bg-gray-800/50 hover:bg-gray-700/50'
                          }`}
                        >
                          {pageNum}
                        </Link>
                      );
                    })}

                    {page < totalPages && (
                      <Link
                        href={`/orders?page=${page + 1}&limit=${limit}`}
                        className="px-3 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 transition-colors duration-200"
                      >
                        Siguiente
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    );

  } catch (error) {
    logger.error('Orders page error:', toError(error));
    redirect('/login?redirect=/orders');
  }
}

export const metadata = {
  title: 'Mis pedidos | Deserve',
  description: 'Historial de pedidos y compras en Deserve.',
};