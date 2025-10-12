'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { PaymentProgressCard } from '@/components/team/payments/PaymentProgressCard';
import { PaymentContributorsList } from '@/components/team/payments/PaymentContributorsList';
import { OrderItemsList } from '@/components/team/payments/OrderItemsList';
import type { Order, OrderItem, PaymentContribution } from '@/types/payments';
import { formatCLP } from '@/types/payments';

type Team = {
  id: string;
  name: string;
  slug: string;
  sport?: string;
};

type TeamColors = {
  primary_color?: string;
  secondary_color?: string;
  tertiary_color?: string;
};

type OrderWithDetails = Order & {
  items: OrderItem[];
  contributions: (PaymentContribution & {
    user?: {
      id: string;
      email: string;
      full_name: string | null;
    };
  })[];
  total_paid_cents: number;
  total_pending_cents: number;
};

export default function TeamPaymentsPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [colors, setColors] = useState<TeamColors>({});
  const [isManager, setIsManager] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  useEffect(() => {
    async function loadPaymentData() {
      try {
        const supabase = getBrowserClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        setCurrentUserId(user.id);

        // Get team
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('id, name, slug, sport')
          .eq('slug', params.slug)
          .single();

        if (teamError) throw teamError;
        setTeam(teamData);

        // Get team settings (colors)
        const { data: settingsData } = await supabase
          .from('team_settings')
          .select('primary_color, secondary_color, tertiary_color')
          .eq('team_id', teamData.id)
          .single();

        if (settingsData) {
          setColors(settingsData);
        }

        // Check if user is manager
        const { data: membership } = await supabase
          .from('team_memberships')
          .select('role')
          .eq('team_id', teamData.id)
          .eq('user_id', user.id)
          .single();

        const isMembershipOwner = membership?.role === 'owner' || membership?.role === 'manager';
        const isTeamOwner = teamData.owner_id === user.id || teamData.current_owner_id === user.id;
        setIsManager(isMembershipOwner || isTeamOwner);

        // Get all orders for this team
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('*')
          .eq('team_id', teamData.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          setOrders([]);
          return;
        }

        if (!ordersData || ordersData.length === 0) {
          setOrders([]);
          return;
        }

        // For each order, fetch items and contributions
        const ordersWithDetails = await Promise.all(
          ordersData.map(async (order) => {
            // Get order items
            const { data: items } = await supabase
              .from('order_items')
              .select('*')
              .eq('order_id', order.id);

            // Get payment contributions with user info
            const { data: contributions } = await supabase
              .from('payment_contributions')
              .select(`
                *,
                user:user_id (
                  id,
                  email,
                  full_name
                )
              `)
              .eq('order_id', order.id);

            // Calculate total paid and pending
            const total_paid_cents = contributions
              ?.filter(c => c.payment_status === 'approved')
              .reduce((sum, c) => sum + c.amount_cents, 0) || 0;

            const total_pending_cents = Math.max(0, order.total_amount_cents - total_paid_cents);

            return {
              ...order,
              items: items || [],
              contributions: contributions || [],
              total_paid_cents,
              total_pending_cents
            };
          })
        );

        setOrders(ordersWithDetails);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadPaymentData();
  }, [params.slug]);

  // Handler for full order payment (simplified - uses payment_contributions)
  const handleFullOrderPayment = async (orderId: string, totalAmountCents: number) => {
    try {
      setProcessingPayment(orderId);
      const supabase = getBrowserClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use the split payment API for ALL payments (simplified approach)
      // Whether paying full order or individual share, it's just a contribution
      const response = await fetch('/api/mercadopago/create-split-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          userId: user.id,
          amountCents: totalAmountCents, // Full order amount
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create payment');
      }

      // Redirect to Mercado Pago checkout
      window.location.href = result.initPoint;
    } catch (err: any) {
      alert(`Error al procesar el pago: ${err.message}`);
      setProcessingPayment(null);
    }
  };

  // Handler for split payment (each member pays individually)
  const handleSplitPaymentSetup = async (orderId: string) => {
    // TODO: Open modal or navigate to split payment setup page
    // For now, show a detailed alert explaining the flow
    alert(
      'Pago Individual:\n\n' +
      '1. Cada miembro del equipo recibirá un enlace de pago\n' +
      '2. Podrán pagar su parte individualmente\n' +
      '3. El pedido se marcará como pagado cuando todos hayan contribuido\n\n' +
      'Esta funcionalidad requiere una interfaz para generar enlaces individuales.\n' +
      'Por ahora, usa "Pago Completo" para pagar todo el pedido.'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando información de pagos...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Calculate aggregate stats
  const totalOrders = orders.length;
  const totalAmountCents = orders.reduce((sum, o) => sum + o.total_amount_cents, 0);
  const totalPaidCents = orders.reduce((sum, o) => sum + o.total_paid_cents, 0);
  const totalPendingCents = orders.reduce((sum, o) => sum + o.total_pending_cents, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Banner */}
      <div
        className="relative overflow-hidden"
        style={{
          background: colors.primary_color
            ? `linear-gradient(135deg, ${colors.primary_color} 0%, ${colors.secondary_color || colors.primary_color} 100%)`
            : 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="mb-4 text-white/90 hover:text-white font-medium flex items-center gap-2"
          >
            ← Volver al equipo
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm text-white/90 mb-3">
                💰 Pagos
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">Gestión de Pagos</h1>
              <p className="text-white/80 text-lg">{team.name}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{totalOrders}</div>
                <div className="text-white/80 text-sm">Pedidos</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Empty State */}
        {orders.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <span className="text-6xl mb-4 block">💳</span>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay pedidos todavía</h2>
            <p className="text-gray-600 mb-6">
              Crea un pedido desde un diseño aprobado para comenzar a gestionar pagos
            </p>
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ← Volver al equipo
            </button>
          </div>
        )}

        {/* Orders List */}
        {orders.map((order) => {
          const paidCount = order.contributions.filter(c => c.payment_status === 'approved').length;
          const contributorCount = order.items.length; // One contributor per item/player

          return (
            <div key={order.id} className="space-y-4">
              {/* Order Header */}
              <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Pedido #{order.id.slice(0, 8)}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Creado el {new Date(order.created_at).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : order.payment_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {order.payment_status === 'paid'
                        ? 'Pagado'
                        : order.payment_status === 'partial'
                        ? 'Pago Parcial'
                        : 'Sin Pagar'}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'shipped'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'processing'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status === 'delivered'
                        ? '✅ Entregado'
                        : order.status === 'shipped'
                        ? '🚚 Enviado'
                        : order.status === 'processing'
                        ? '⚙️ En Proceso'
                        : '📦 Pendiente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Progress */}
              <PaymentProgressCard
                totalCents={order.total_amount_cents}
                paidCents={order.total_paid_cents}
                pendingCents={order.total_pending_cents}
                contributorCount={contributorCount}
                paidCount={paidCount}
              />

              {/* Player Payment Section - Show for non-managers */}
              {!isManager && order.payment_mode === 'individual' && order.payment_status !== 'paid' && (() => {
                // Find player's order item
                const myItem = order.items.find(item => item.player_id === currentUserId);

                // Check if player has already paid
                const myContribution = order.contributions.find(c => c.user_id === currentUserId && c.payment_status === 'approved');

                if (myItem) {
                  return (
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border-2 border-green-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        💳 Tu Pago
                      </h3>

                      {myContribution ? (
                        <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Estado del Pago</div>
                              <div className="text-xl font-bold text-green-700">✅ Pagado</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Monto</div>
                              <div className="text-xl font-bold text-gray-900">{formatCLP(myItem.line_total_cents || myItem.unit_price_cents)}</div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mt-3">
                            Gracias por tu pago. Tu pedido será procesado junto con el resto del equipo.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div className="text-sm text-gray-600 mb-1">Tu Parte</div>
                                <div className="text-3xl font-bold text-gray-900">{formatCLP(myItem.line_total_cents || myItem.unit_price_cents)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-600 mb-1">Producto</div>
                                <div className="font-semibold text-gray-900">{myItem.product_name}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {myItem.player_name && <p>Jugador: {myItem.player_name}</p>}
                              {myItem.jersey_number && <p>Número: {myItem.jersey_number}</p>}
                            </div>
                          </div>

                          {/* Opt-out button */}
                          <button
                            onClick={async () => {
                              if (!confirm('¿Estás seguro de que quieres cancelar tu participación en este pedido? Esta acción no se puede deshacer.')) {
                                return;
                              }

                              try {
                                const response = await fetch(`/api/order-items/${myItem.id}/opt-out`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                });

                                const result = await response.json();

                                if (!response.ok || !result.success) {
                                  throw new Error(result.error || 'Failed to opt out');
                                }

                                alert('Has cancelado tu participación en este pedido. El total del pedido se ha actualizado.');
                                // Refresh the page to show updated data
                                window.location.reload();
                              } catch (err: any) {
                                alert(`Error: ${err.message}`);
                              }
                            }}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
                          >
                            ❌ No quiero participar en este pedido
                          </button>

                          <button
                            onClick={async () => {
                              try {
                                setProcessingPayment(order.id);
                                const response = await fetch('/api/mercadopago/create-split-payment', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    orderId: order.id,
                                    userId: currentUserId,
                                    amountCents: myItem.line_total_cents || myItem.unit_price_cents,
                                  }),
                                });

                                const result = await response.json();

                                if (!response.ok || !result.success) {
                                  throw new Error(result.error || 'Failed to create payment');
                                }

                                // Redirect to Mercado Pago checkout
                                window.location.href = result.initPoint;
                              } catch (err: any) {
                                alert(`Error al procesar el pago: ${err.message}`);
                                setProcessingPayment(null);
                              }
                            }}
                            disabled={processingPayment !== null}
                            className="w-full px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
                          >
                            {processingPayment === order.id ? (
                              <span>Procesando...</span>
                            ) : (
                              <span>💳 Pagar Mi Parte ({formatCLP(myItem.line_total_cents || myItem.unit_price_cents)})</span>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Manager Actions */}
              {isManager && order.payment_status !== 'paid' && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border-2 border-blue-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Acciones de Pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => handleSplitPaymentSetup(order.id)}
                      disabled={processingPayment !== null}
                      className="bg-white hover:bg-gray-50 rounded-lg p-4 text-left transition-all border-2 border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">👥</span>
                        <h4 className="font-semibold text-gray-900">Pago Individual</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Cada miembro paga su parte individualmente
                      </p>
                    </button>

                    <button
                      onClick={() => handleFullOrderPayment(order.id, order.total_pending_cents)}
                      disabled={processingPayment !== null}
                      className="bg-white hover:bg-gray-50 rounded-lg p-4 text-left transition-all border-2 border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed relative"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">💳</span>
                        <h4 className="font-semibold text-gray-900">Pago Completo</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Paga {formatCLP(order.total_pending_cents)} ahora
                      </p>
                      {processingPayment === order.id && (
                        <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
                          <div className="text-blue-600 font-medium">Procesando...</div>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Two Column Layout: Contributors and Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PaymentContributorsList
                  contributions={order.contributions}
                  totalContributors={contributorCount}
                />
                <OrderItemsList items={order.items} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
