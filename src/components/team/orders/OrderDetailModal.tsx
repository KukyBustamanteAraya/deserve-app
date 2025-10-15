'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { createClient } from '@/lib/supabase/client';
import type { Order, OrderItem, PaymentContributionWithUser } from '@/types/payments';
import { formatCLP, calculatePaymentProgress } from '@/types/payments';

interface OrderDetailModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'summary' | 'items' | 'payments' | 'timeline';

export function OrderDetailModal({ orderId, isOpen, onClose }: OrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [payments, setPayments] = useState<PaymentContributionWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (orderId && isOpen) {
      loadOrderDetails();
    }
  }, [orderId, isOpen]);

  async function loadOrderDetails() {
    if (!orderId) return;

    try {
      setLoading(true);

      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (itemsError) throw itemsError;
      setOrderItems(itemsData || []);

      // Fetch payment contributions with user info
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_contributions')
        .select(`
          *,
          user:profiles (
            id,
            email,
            full_name
          )
        `)
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData as any || []);
    } catch (error) {
      console.error('Error loading order details:', error);
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'summary', label: 'Resumen' },
    { id: 'items', label: 'Artículos' },
    { id: 'payments', label: 'Pagos' },
    { id: 'timeline', label: 'Historial' },
  ];

  const totalPaid = payments
    .filter(p => p.payment_status === 'approved')
    .reduce((sum, p) => sum + p.amount_cents, 0);

  const { percentage: paymentPercentage, isPaid } = calculatePaymentProgress(
    order?.total_cents || 0,
    totalPaid
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md border border-gray-700 p-6 text-left align-middle shadow-2xl transition-all">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-300">Cargando detalles...</p>
                  </div>
                ) : order ? (
                  <>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <Dialog.Title className="text-2xl font-bold text-white">
                          {order.order_number || `Orden ${order.id.slice(0, 8)}`}
                        </Dialog.Title>
                        <p className="text-gray-400 text-sm mt-1">
                          Creada el {new Date(order.created_at).toLocaleDateString('es-CL')}
                        </p>
                      </div>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-700 mb-6">
                      <div className="flex gap-4">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                              activeTab === tab.id
                                ? 'border-blue-500 text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
                      {/* Summary Tab */}
                      {activeTab === 'summary' && (
                        <div className="space-y-6">
                          {/* Order Status */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Estado</div>
                              <div className="text-lg font-semibold text-white capitalize">
                                {order.status}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-400 mb-1">Estado de Pago</div>
                              <div className="text-lg font-semibold text-white capitalize">
                                {order.payment_status}
                              </div>
                            </div>
                          </div>

                          {/* Payment Progress */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-300">Progreso de Pago</span>
                              <span className="text-sm font-bold text-white">{paymentPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isPaid ? 'bg-green-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Financial Summary */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Subtotal</span>
                              <span className="text-white font-medium">{formatCLP(order.subtotal_cents)}</span>
                            </div>
                            {order.discount_cents > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Descuento</span>
                                <span className="text-green-400 font-medium">-{formatCLP(order.discount_cents)}</span>
                              </div>
                            )}
                            {order.tax_cents > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Impuestos</span>
                                <span className="text-white font-medium">{formatCLP(order.tax_cents)}</span>
                              </div>
                            )}
                            {order.shipping_cents > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400">Envío</span>
                                <span className="text-white font-medium">{formatCLP(order.shipping_cents)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                              <span className="text-lg font-bold text-white">Total</span>
                              <span className="text-2xl font-bold text-white">
                                {formatCLP(order.total_cents || order.total_amount_cents)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-400">Pagado</span>
                              <span className="text-lg font-semibold text-green-400">{formatCLP(totalPaid)}</span>
                            </div>
                          </div>

                          {/* Shipping Info */}
                          {order.shipping_recipient_name && (
                            <div>
                              <div className="text-sm font-semibold text-white mb-2">Información de Envío</div>
                              <div className="bg-gray-800/50 rounded-lg p-4 space-y-1 text-sm">
                                <div className="text-white font-medium">{order.shipping_recipient_name}</div>
                                {order.shipping_street_address && (
                                  <div className="text-gray-300">{order.shipping_street_address}</div>
                                )}
                                <div className="text-gray-300">
                                  {[order.shipping_commune, order.shipping_city, order.shipping_region]
                                    .filter(Boolean)
                                    .join(', ')}
                                </div>
                                {order.tracking_number && (
                                  <div className="pt-2 border-t border-gray-700 mt-2">
                                    <span className="text-gray-400">Tracking: </span>
                                    <span className="text-blue-400 font-mono">{order.tracking_number}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Items Tab */}
                      {activeTab === 'items' && (
                        <div className="space-y-4">
                          {orderItems.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                              No hay artículos en esta orden
                            </div>
                          ) : (
                            orderItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                              >
                                {item.images && item.images.length > 0 && (
                                  <div className="w-20 h-20 rounded-lg bg-gray-700 overflow-hidden flex-shrink-0">
                                    <img
                                      src={item.images[0]}
                                      alt={item.product_name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-semibold text-white">{item.product_name}</div>
                                  {item.collection && (
                                    <div className="text-sm text-gray-400">{item.collection}</div>
                                  )}
                                  {item.player_name && (
                                    <div className="text-sm text-blue-400 mt-1">
                                      {item.player_name}
                                      {item.jersey_number && ` #${item.jersey_number}`}
                                    </div>
                                  )}
                                  {item.customization && (
                                    <div className="text-xs text-gray-400 mt-1">
                                      {JSON.stringify(item.customization)}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-white">
                                    {formatCLP(item.line_total_cents || 0)}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {formatCLP(item.unit_price_cents)} × {item.quantity}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Payments Tab */}
                      {activeTab === 'payments' && (
                        <div className="space-y-4">
                          {payments.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                              No hay pagos registrados
                            </div>
                          ) : (
                            payments.map((payment) => (
                              <div
                                key={payment.id}
                                className={`flex items-center justify-between p-4 rounded-lg border ${
                                  payment.payment_status === 'approved'
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : payment.payment_status === 'pending'
                                    ? 'bg-yellow-500/10 border-yellow-500/30'
                                    : 'bg-gray-800/50 border-gray-700'
                                }`}
                              >
                                <div>
                                  <div className="font-medium text-white">
                                    {payment.user?.full_name || payment.user?.email || 'Usuario'}
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(payment.created_at).toLocaleDateString('es-CL')}
                                  </div>
                                  {payment.paid_at && (
                                    <div className="text-xs text-green-400 mt-1">
                                      Pagado el {new Date(payment.paid_at).toLocaleDateString('es-CL')}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-white">{formatCLP(payment.amount_cents)}</div>
                                  <div
                                    className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                                      payment.payment_status === 'approved'
                                        ? 'bg-green-500/20 text-green-400'
                                        : payment.payment_status === 'pending'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}
                                  >
                                    {payment.payment_status}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Timeline Tab */}
                      {activeTab === 'timeline' && (
                        <div className="space-y-4">
                          <div className="space-y-4">
                            {order.created_at && (
                              <div className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                                <div>
                                  <div className="font-medium text-white">Orden Creada</div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(order.created_at).toLocaleString('es-CL')}
                                  </div>
                                </div>
                              </div>
                            )}
                            {order.design_approved_at && (
                              <div className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
                                <div>
                                  <div className="font-medium text-white">Diseño Aprobado</div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(order.design_approved_at).toLocaleString('es-CL')}
                                  </div>
                                </div>
                              </div>
                            )}
                            {order.production_started_at && (
                              <div className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-orange-500 mt-2"></div>
                                <div>
                                  <div className="font-medium text-white">Producción Iniciada</div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(order.production_started_at).toLocaleString('es-CL')}
                                  </div>
                                </div>
                              </div>
                            )}
                            {order.shipped_at && (
                              <div className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2"></div>
                                <div>
                                  <div className="font-medium text-white">Enviado</div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(order.shipped_at).toLocaleString('es-CL')}
                                  </div>
                                </div>
                              </div>
                            )}
                            {order.delivered_at && (
                              <div className="flex gap-4">
                                <div className="w-2 h-2 rounded-full bg-green-600 mt-2"></div>
                                <div>
                                  <div className="font-medium text-white">Entregado</div>
                                  <div className="text-sm text-gray-400">
                                    {new Date(order.delivered_at).toLocaleString('es-CL')}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-700 pt-4">
                      {order.can_modify && !order.locked_at && (
                        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                          Agregar Producto
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        Cerrar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    No se pudo cargar la orden
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
