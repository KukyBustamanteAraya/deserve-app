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
  logo_url?: string;
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
  payment_mode?: string | null;
};

export default function TeamPaymentsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const [team, setTeam] = useState<Team | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState<string | null>(null);

  // Extract loadPaymentData as a refetchable function
  const loadPaymentData = async () => {
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
          .eq('slug', slug)
          .single();

        if (teamError) throw teamError;

        // Get team logo from settings
        const { data: settingsData } = await supabase
          .from('team_settings')
          .select('logo_url')
          .eq('team_id', teamData.id)
          .single();

        setTeam({ ...teamData, logo_url: settingsData?.logo_url });

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
          ordersData.map(async (order: any) => {
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
              ?.filter((c: any) => c.payment_status === 'approved')
              .reduce((sum: number, c: any) => sum + c.amount_cents, 0) || 0;

            const total_pending_cents = Math.max(0, order.total_amount_clp - total_paid_cents);

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
  };

  useEffect(() => {
    loadPaymentData();
  }, [slug]);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando información de pagos...</div>
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Error</h1>
          <p className="text-gray-300 mb-6">{error || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push(`/mi-equipo/${slug}`)}
            className="text-[#e21c21] hover:text-[#c11a1e] font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  // Calculate aggregate stats
  const totalOrders = orders.length;
  const totalAmountCents = orders.reduce((sum, o) => sum + o.total_amount_clp, 0);
  const totalPaidCents = orders.reduce((sum, o) => sum + o.total_paid_cents, 0);
  const totalPendingCents = orders.reduce((sum, o) => sum + o.total_pending_cents, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Team Header Banner */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow - Top Left */}
          <button
            onClick={() => router.push(`/mi-equipo/${slug}`)}
            className="absolute top-2 left-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="relative pt-2 pl-6">
            <div className="flex items-center gap-6">
              {/* Team Logo */}
              <div className="relative flex-shrink-0">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={`${team.name} logo`}
                    className="w-24 h-24 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                    <span className="text-4xl">🏆</span>
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                <p className="text-gray-300 text-lg">
                  Gestión de Pagos • {totalOrders} {totalOrders === 1 ? 'pedido' : 'pedidos'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Empty State */}
        {orders.length === 0 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-12 text-center border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="text-6xl mb-4 block relative">💳</span>
            <h2 className="text-2xl font-bold text-white mb-2 relative">No hay pedidos todavía</h2>
            <p className="text-gray-300 mb-6 relative">
              Crea un pedido desde un diseño aprobado para comenzar a gestionar pagos
            </p>
            <button
              onClick={() => router.push(`/mi-equipo/${slug}`)}
              className="relative px-6 py-3 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">← Volver al equipo</span>
            </button>
          </div>
        )}

        {/* Orders List */}
        {orders.map((order) => {
          const paidCount = order.contributions.filter((c: any) => c.payment_status === 'approved').length;
          const contributorCount = order.items.length; // One contributor per item/player

          return (
            <div key={order.id} className="space-y-4">
              {/* Order Header */}
              <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="flex items-center justify-between mb-4 relative">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Pedido #{order.id.slice(0, 8)}
                    </h2>
                    <p className="text-sm text-gray-300">
                      Creado el {new Date(order.created_at).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.payment_status === 'paid'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : order.payment_status === 'partial'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                          : 'bg-red-500/20 text-red-400 border border-red-500/50'
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
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : order.status === 'shipped'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                          : order.status === 'processing'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                          : 'bg-gray-700/50 text-gray-300 border border-gray-600/50'
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
                totalCents={order.total_amount_clp}
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
                    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-6 border border-green-500/50 overflow-hidden group/payment">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover/payment:opacity-100 transition-opacity pointer-events-none"></div>
                      <h3 className="text-lg font-semibold text-white mb-4 relative">
                        💳 Tu Pago
                      </h3>

                      {myContribution ? (
                        <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-green-500/50 overflow-hidden group/status">
                          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover/status:opacity-100 transition-opacity pointer-events-none"></div>
                          <div className="flex items-center justify-between relative">
                            <div>
                              <div className="text-sm text-gray-300 mb-1">Estado del Pago</div>
                              <div className="text-xl font-bold text-green-400">✅ Pagado</div>
                            </div>
                            <div>
                              <div className="text-sm text-gray-300 mb-1">Monto</div>
                              <div className="text-xl font-bold text-white">{formatCLP(myItem.line_total_clp || myItem.unit_price_clp)}</div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-300 mt-3 relative">
                            Gracias por tu pago. Tu pedido será procesado junto con el resto del equipo.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 relative">
                          <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700 overflow-hidden group/details">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/details:opacity-100 transition-opacity pointer-events-none"></div>
                            <div className="flex items-center justify-between mb-4 relative">
                              <div>
                                <div className="text-sm text-gray-300 mb-1">Tu Parte</div>
                                <div className="text-3xl font-bold text-white">{formatCLP(myItem.line_total_clp || myItem.unit_price_clp)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-300 mb-1">Producto</div>
                                <div className="font-semibold text-white">{myItem.product_name}</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-300 relative">
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
                                // Refresh data to show updated order
                                await loadPaymentData();
                              } catch (err: any) {
                                alert(`Error: ${err.message}`);
                              }
                            }}
                            className="relative w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-red-500/50 font-medium text-sm overflow-hidden group/optout"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover/optout:opacity-100 transition-opacity pointer-events-none"></div>
                            <span className="relative">❌ No quiero participar en este pedido</span>
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
                                    amountCents: myItem.line_total_clp || myItem.unit_price_clp,
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
                            className="relative w-full px-6 py-4 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 backdrop-blur-md text-white rounded-lg font-bold text-lg overflow-hidden group/pay disabled:opacity-50 disabled:cursor-not-allowed border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/pay:opacity-100 transition-opacity pointer-events-none"></div>
                            {processingPayment === order.id ? (
                              <span className="relative">Procesando...</span>
                            ) : (
                              <span className="relative">💳 Pagar Mi Parte ({formatCLP(myItem.line_total_clp || myItem.unit_price_clp)})</span>
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
                <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-6 border border-blue-500/50 overflow-hidden group/manager">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover/manager:opacity-100 transition-opacity pointer-events-none"></div>
                  <h3 className="text-lg font-semibold text-white mb-4 relative">
                    Acciones de Pago
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                    <button
                      onClick={() => handleSplitPaymentSetup(order.id)}
                      disabled={processingPayment !== null}
                      className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 text-left border border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/split hover:border-blue-400/70"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover/split:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="flex items-center gap-3 mb-2 relative">
                        <span className="text-2xl">👥</span>
                        <h4 className="font-semibold text-white">Pago Individual</h4>
                      </div>
                      <p className="text-sm text-gray-300 relative">
                        Cada miembro paga su parte individualmente
                      </p>
                    </button>

                    <button
                      onClick={() => handleFullOrderPayment(order.id, order.total_pending_cents)}
                      disabled={processingPayment !== null}
                      className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 text-left border border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/full hover:border-blue-400/70"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover/full:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="flex items-center gap-3 mb-2 relative">
                        <span className="text-2xl">💳</span>
                        <h4 className="font-semibold text-white">Pago Completo</h4>
                      </div>
                      <p className="text-sm text-gray-300 relative">
                        Paga {formatCLP(order.total_pending_cents)} ahora
                      </p>
                      {processingPayment === order.id && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg flex items-center justify-center border border-blue-500/50">
                          <div className="text-blue-400 font-medium">Procesando...</div>
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
