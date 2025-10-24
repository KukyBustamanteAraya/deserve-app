'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderOverview, DesignRequestWithOrderInfo } from '@/types/payments';
import { OrderPipelineCard } from './OrderPipelineCard';
import { formatCLP } from '@/types/payments';

interface TeamOrderOverviewProps {
  teamId: string;
  teamSlug: string;
}

export function TeamOrderOverview({ teamId, teamSlug }: TeamOrderOverviewProps) {
  const [orders, setOrders] = useState<OrderOverview[]>([]);
  const [designRequests, setDesignRequests] = useState<DesignRequestWithOrderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalValue: 0,
    pendingDesigns: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    loadOrderData();
  }, [teamId]);

  async function loadOrderData() {
    try {
      setLoading(true);

      // Fetch orders directly from orders table (same as payments page)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error loading orders:', ordersError);
        setOrders([]);
      } else {
        // Enhance orders with aggregated data
        const enhancedOrders = await Promise.all(
          (ordersData || []).map(async (order: any) => {
            // Get order items count
            const { data: items, count: itemCount } = await supabase
              .from('order_items')
              .select('*', { count: 'exact' })
              .eq('order_id', order.id);

            // Get design requests count for this order
            const { count: designCount } = await supabase
              .from('design_requests')
              .select('*', { count: 'exact', head: true })
              .eq('order_id', order.id);

            // Get team info
            const { data: teamData } = await supabase
              .from('teams')
              .select('name, slug, logo_url')
              .eq('id', teamId)
              .single();

            return {
              ...order,
              item_count: itemCount || 0,
              product_count: items?.length || 0, // Distinct products
              design_request_count: designCount || 0,
              team_name: teamData?.name || null,
              team_slug: teamData?.slug || null,
              team_logo_url: teamData?.logo_url || null,
            };
          })
        );

        setOrders(enhancedOrders as any);

        // Calculate stats
        const activeOrdersData = enhancedOrders.filter(
          o => o.status !== 'delivered' && o.status !== 'cancelled'
        );

        setStats({
          totalOrders: enhancedOrders.length,
          activeOrders: activeOrdersData.length,
          totalValue: enhancedOrders.reduce((sum, o) => sum + (o.total_amount_clp || 0), 0),
          pendingDesigns: 0, // Will be updated with design requests
        });
      }

      // Fetch design requests with order information
      const { data: designsData, error: designsError } = await supabase
        .from('design_requests')
        .select(`
          id,
          team_id,
          product_name,
          product_slug,
          status,
          approval_status,
          order_id,
          created_at,
          approved_at,
          mockup_urls,
          primary_color,
          secondary_color,
          accent_color
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (designsError) {
        console.error('Error loading design requests:', designsError);
      } else {
        setDesignRequests(designsData || []);

        // Update pending designs count
        const pendingCount = (designsData || []).filter(
          (d: any) => d.approval_status === 'approved' && !d.order_id
        ).length;

        setStats(prev => ({ ...prev, pendingDesigns: pendingCount }));
      }
    } catch (error) {
      console.error('Error loading order data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando órdenes...</p>
        </div>
      </div>
    );
  }

  const activeOrders = orders.filter(
    o => o.status !== 'delivered' && o.status !== 'cancelled'
  );

  const completedOrders = orders.filter(
    o => o.status === 'delivered'
  );

  // Don't show anything if there are no orders at all
  if (activeOrders.length === 0 && stats.pendingDesigns === 0 && completedOrders.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Active Orders Section */}
      {activeOrders.length > 0 && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Órdenes Activas</h2>
              <span className="text-xs text-gray-400">
                {activeOrders.length} {activeOrders.length === 1 ? 'orden' : 'órdenes'}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map((order) => (
                <OrderPipelineCard
                  key={order.id}
                  order={order}
                  teamSlug={teamSlug}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Designs Section */}
      {stats.pendingDesigns > 0 && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Diseños Aprobados Sin Orden</h2>
              <span className="text-xs text-gray-400">
                {stats.pendingDesigns} {stats.pendingDesigns === 1 ? 'diseño' : 'diseños'}
              </span>
            </div>

            <div className="space-y-3">
              {designRequests
                .filter(d => d.approval_status === 'approved' && !d.order_id)
                .map((design) => (
                  <div
                    key={design.id}
                    className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30"
                  >
                    <div className="flex items-center gap-4">
                      {design.mockup_urls && design.mockup_urls.length > 0 && (
                        <div className="w-16 h-16 rounded-lg bg-gray-700 overflow-hidden">
                          <img
                            src={design.mockup_urls[0]}
                            alt={design.product_name || 'Design'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-white">
                          {design.product_name || 'Producto sin nombre'}
                        </div>
                        <div className="text-sm text-gray-300">
                          Aprobado {design.approved_at ? new Date(design.approved_at).toLocaleDateString('es-CL') : ''}
                        </div>
                      </div>
                    </div>
                    <button
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      onClick={() => {
                        // TODO: Open modal to add to existing order or create new order
                        console.log('Add to order:', design.id);
                      }}
                    >
                      Agregar a Orden
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeOrders.length === 0 && stats.pendingDesigns === 0 && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-12 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative text-center">
            <p className="text-gray-400 text-lg">No hay órdenes activas</p>
            <p className="text-gray-500 text-sm mt-2">
              Las órdenes aparecerán aquí cuando apruebes diseños
            </p>
          </div>
        </div>
      )}

      {/* Completed Orders (Collapsed) */}
      {completedOrders.length > 0 && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative">
            <details>
              <summary className="cursor-pointer text-white font-semibold hover:text-gray-300 transition-colors">
                Órdenes Completadas ({completedOrders.length})
              </summary>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedOrders.map((order) => (
                  <OrderPipelineCard
                    key={order.id}
                    order={order}
                    teamSlug={teamSlug}
                  />
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
