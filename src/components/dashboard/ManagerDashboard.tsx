'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { DesignApprovalCard } from '@/components/design/DesignApprovalCard';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { ProgressOverviewCard } from '@/components/team-hub/ProgressOverviewCard';
import { NextStepCard } from '@/components/team-hub/NextStepCard';
import { ActivityPreviewCard } from '@/components/team-hub/ActivityPreviewCard';
import { useTeamStats } from '@/hooks/team-hub/useTeamStats';
import { useActivityLog } from '@/hooks/team-hub/useActivityLog';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import type { Order } from '@/types/orders';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string };
  logo_url?: string;
}

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  sport_slug: string;
  created_at: string;
  mockup_urls?: string[];
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  order_id?: string;
  approval_status?: string;
}

interface Member {
  user_id: string;
  role: string;
  profiles?: { email: string; full_name?: string };
}

interface PlayerInfo {
  id: string;
  user_id: string | null;
  player_name: string;
  jersey_number: string | null;
  size: string;
  position: string | null;
  additional_notes: string | null;
  created_at: string;
}

interface Props {
  team: Team;
  designRequests: DesignRequest[];
  orders: Order[];
  members: Member[];
  currentUserId: string;
  shareLink: string;
  onInvite: (email: string) => Promise<void>;
}

/**
 * Manager/Club Dashboard
 * Optimized for large teams, clubs, schools
 * Focus: Multiple designs, bulk orders, roster management, order tracking
 */
export function ManagerDashboard({
  team,
  designRequests,
  orders,
  members,
  currentUserId,
  shareLink,
  onInvite,
}: Props) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'designs' | 'orders' | 'roster'>('overview');
  const [expandedDesign, setExpandedDesign] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [playerInfos, setPlayerInfos] = useState<PlayerInfo[]>([]);
  const [loadingPlayerInfo, setLoadingPlayerInfo] = useState(false);

  // Fetch team stats and activity for overview tab
  const { stats, loading: statsLoading } = useTeamStats(team.id);
  const { activities, loading: activitiesLoading } = useActivityLog(team.id, 5);

  // Fetch player info submissions
  useEffect(() => {
    const fetchPlayerInfos = async () => {
      setLoadingPlayerInfo(true);
      const { data, error } = await supabase
        .from('player_info_submissions')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching player infos:', error);
      } else {
        setPlayerInfos(data || []);
      }
      setLoadingPlayerInfo(false);
    };

    fetchPlayerInfos();
  }, [team.id]);

  const getOrderForDesignRequest = (designRequestId: string) => {
    const dr = designRequests.find((d) => d.id === designRequestId);
    if (!dr || !dr.order_id) return null;
    return orders.find((o) => o.id === dr.order_id);
  };

  // Group designs by sport
  const designsBySport = designRequests.reduce((acc, dr) => {
    const sport = dr.sport_slug || 'other';
    if (!acc[sport]) acc[sport] = [];
    acc[sport].push(dr);
    return acc;
  }, {} as Record<string, DesignRequest[]>);

  const totalPendingPayments = orders.filter((o) => o.payment_status === 'unpaid').length;
  const totalCompletedOrders = orders.filter((o) => o.payment_status === 'paid').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b">
          <nav className="flex justify-between items-center">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-current text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Resumen
              </button>
              <button
                onClick={() => setActiveTab('designs')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'designs'
                    ? 'border-current text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Diseños y Pedidos
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'border-current text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Seguimiento de Órdenes
              </button>
              <button
                onClick={() => setActiveTab('roster')}
                className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                  activeTab === 'roster'
                    ? 'border-current text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                Gestión de Plantel
              </button>
            </div>
            <button
              onClick={() => router.push('/catalog')}
              className="mr-4 px-4 py-2 rounded-lg text-white font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: team.colors.primary }}
            >
              + Nuevo Pedido
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {statsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
                </div>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ProgressOverviewCard stats={stats} />
                    <NextStepCard
                      stats={stats}
                      role="owner"
                      teamSlug={team.slug}
                      onActionClick={() => setActiveTab('designs')}
                    />
                  </div>
                  <ActivityPreviewCard activities={activities} teamSlug={team.slug} />
                </>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No se pudieron cargar las estadísticas del equipo.</p>
                </div>
              )}
            </div>
          )}

          {/* Designs Tab */}
          {activeTab === 'designs' && (
            <div>
              {designRequests.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-bold mb-2">No hay diseños aún</h3>
                  <p className="text-gray-600 mb-6">Comienza creando tu primer pedido de uniformes</p>
                  <button
                    onClick={() => router.push('/catalog')}
                    className="px-6 py-3 rounded-lg text-white font-semibold"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    Ver Catálogo
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Group by Sport */}
                  {Object.entries(designsBySport).map(([sport, designs]) => (
                    <div key={sport}>
                      <h3 className="text-lg font-bold mb-3 capitalize flex items-center gap-2">
                        <span className="text-2xl">
                          {sport === 'football' ? '⚽' : sport === 'basketball' ? '🏀' : sport === 'volleyball' ? '🏐' : '🏃'}
                        </span>
                        {sport} ({designs.length})
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {designs.map((dr) => {
                          const order = getOrderForDesignRequest(dr.id);
                          return (
                            <div key={dr.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-bold text-lg">{dr.product_name}</h4>
                                  <p className="text-sm text-gray-500">{new Date(dr.created_at).toLocaleDateString('es-CL')}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                      dr.status === 'ready'
                                        ? 'bg-green-100 text-green-800'
                                        : dr.status === 'rendering'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}
                                  >
                                    {dr.status === 'ready' ? 'Listo' : dr.status === 'rendering' ? 'Generando' : 'Pendiente'}
                                  </span>
                                  {order && (
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        order.payment_status === 'paid'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-yellow-100 text-yellow-800'
                                      }`}
                                    >
                                      {order.payment_status === 'paid' ? '✓ Pagado' : 'Pago pendiente'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Colors */}
                              <div className="flex gap-2 mb-3">
                                <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: dr.primary_color }} />
                                <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: dr.secondary_color }} />
                                <div className="w-8 h-8 rounded border-2" style={{ backgroundColor: dr.accent_color }} />
                              </div>

                              {/* Mockup Preview */}
                              {dr.status === 'ready' && dr.mockup_urls && dr.mockup_urls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mb-3">
                                  {dr.mockup_urls.slice(0, 3).map((url, i) => (
                                    <Image
                                      key={i}
                                      src={url}
                                      alt={`Mockup ${i + 1}`}
                                      width={150}
                                      height={150}
                                      className="rounded border w-full object-cover"
                                    />
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => setExpandedDesign(expandedDesign === dr.id ? null : dr.id)}
                                  className="flex-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 font-medium"
                                >
                                  {expandedDesign === dr.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                                </button>
                                {order && order.payment_status !== 'paid' && (
                                  <button
                                    className="flex-1 px-3 py-2 text-sm rounded-lg text-white font-medium"
                                    style={{ backgroundColor: team.colors.primary }}
                                  >
                                    Pagar Orden
                                  </button>
                                )}
                              </div>

                              {/* Expanded Details */}
                              {expandedDesign === dr.id && (
                                <div className="mt-4 pt-4 border-t space-y-4">
                                  {/* Design Approval Card */}
                                  {dr.status === 'ready' && dr.mockup_urls && dr.mockup_urls.length > 0 && (
                                    <DesignApprovalCard
                                      designRequestId={dr.id}
                                      mockupUrls={dr.mockup_urls}
                                      approvalStatus={dr.approval_status || 'pending_review'}
                                    />
                                  )}

                                  {/* Payment Status Tracker */}
                                  {order && order.payment_status !== 'paid' && (
                                    <PaymentStatusTracker
                                      orderId={order.id}
                                      totalAmountCents={order.total_amount_cents}
                                      teamId={team.id}
                                    />
                                  )}

                                  {/* Order Status Timeline */}
                                  {order && (
                                    <OrderStatusTimeline
                                      currentStatus={order.status}
                                      trackingNumber={order.tracking_number}
                                      carrier={order.carrier}
                                      estimatedDeliveryDate={order.estimated_delivery_date}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📦</div>
                  <h3 className="text-xl font-bold mb-2">No hay órdenes aún</h3>
                  <p className="text-gray-600">Las órdenes aparecerán aquí una vez que se creen los diseños</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">Orden #{order.id.slice(0, 8)}</p>
                          <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleDateString('es-CL')}</p>
                          <p className="text-sm font-medium mt-1">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(
                              order.total_amount_cents / 100
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              order.status === 'delivered'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'shipped'
                                ? 'bg-blue-100 text-blue-800'
                                : order.status === 'production'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {order.status === 'delivered'
                              ? 'Entregado'
                              : order.status === 'shipped'
                              ? 'Enviado'
                              : order.status === 'production'
                              ? 'En Producción'
                              : 'Pendiente'}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {order.payment_status === 'paid' ? 'Pagado' : 'No pagado'}
                          </span>
                          <button
                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                            className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 font-medium"
                          >
                            {expandedOrder === order.id ? 'Ocultar' : 'Ver Detalles'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Order Details */}
                      {expandedOrder === order.id && (
                        <div className="mt-4 pt-4 border-t space-y-4">
                          {/* Payment Status Tracker */}
                          {order.payment_status !== 'paid' && (
                            <PaymentStatusTracker orderId={order.id} totalAmountCents={order.total_amount_cents} teamId={team.id} />
                          )}

                          {/* Order Status Timeline */}
                          <OrderStatusTimeline
                            currentStatus={order.status}
                            trackingNumber={order.tracking_number}
                            carrier={order.carrier}
                            estimatedDeliveryDate={order.estimated_delivery_date}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Roster Tab */}
          {activeTab === 'roster' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">
                  Plantel ({playerInfos.length} con info / {members.length} miembros)
                </h3>
                <button
                  onClick={() => {
                    const email = prompt('Email del nuevo miembro:');
                    if (email) onInvite(email);
                  }}
                  className="px-4 py-2 rounded-lg text-white font-medium"
                  style={{ backgroundColor: team.colors.primary }}
                >
                  + Agregar Miembro
                </button>
              </div>

              {loadingPlayerInfo ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando información...</p>
                </div>
              ) : playerInfos.length === 0 ? (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <div className="text-5xl mb-4">📝</div>
                  <h4 className="text-lg font-bold mb-2">No hay información de jugadores aún</h4>
                  <p className="text-gray-600">Los jugadores aparecerán aquí cuando envíen su información</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Número</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Talla</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Posición</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notas</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {playerInfos.map((info) => (
                        <tr key={info.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{info.player_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-sm font-bold bg-gray-100 rounded">
                              {info.jersey_number || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 text-sm font-medium bg-blue-50 text-blue-700 rounded">
                              {info.size}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{info.position || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {info.additional_notes ? (
                              <span className="max-w-xs truncate block" title={info.additional_notes}>
                                {info.additional_notes}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(info.created_at).toLocaleDateString('es-CL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Share Link */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">Enlace de invitación:</p>
                <div className="flex gap-2">
                  <input type="text" value={shareLink} readOnly className="flex-1 px-3 py-2 text-sm border rounded-lg bg-white" />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareLink);
                      alert('¡Enlace copiado!');
                    }}
                    className="px-4 py-2 text-sm rounded-lg text-white font-medium"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
