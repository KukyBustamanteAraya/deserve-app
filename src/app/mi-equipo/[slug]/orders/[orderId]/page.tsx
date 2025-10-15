'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Order, OrderItem, PaymentContribution } from '@/types/payments';
import { formatCLP } from '@/types/payments';
import { ProductSizeBreakdownCard, ProductSizeBreakdown } from '@/components/team/orders/ProductSizeBreakdownCard';

type OrderWithDetails = Order & {
  items: OrderItem[];
  contributions: (PaymentContribution & {
    user?: {
      id: string;
      email: string;
      full_name: string | null;
    };
  })[];
  team?: {
    name: string;
    slug: string;
  };
};

export default function OrderSummaryPage({ params }: { params: { slug: string; orderId: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productBreakdowns, setProductBreakdowns] = useState<ProductSizeBreakdown[]>([]);

  // Process order items into product size breakdowns
  const processProductBreakdowns = (items: OrderItem[], contributions: any[]): ProductSizeBreakdown[] => {
    const productMap = new Map<number, ProductSizeBreakdown>();

    items.forEach((item) => {
      const productId = item.product_id;

      if (!productMap.has(productId)) {
        productMap.set(productId, {
          product_id: productId,
          product_name: item.product_name,
          images: item.images || [],
          sizes: [],
          total_quantity: 0,
          unit_price_clp: item.unit_price_clp || 0,
          total_price_clp: 0,
        });
      }

      const product = productMap.get(productId)!;

      // Get size from customization or default
      const size = item.customization?.size || 'N/A';
      const jerseyNumber = item.jersey_number || '';
      const playerName = item.player_name || '';
      const playerId = item.player_id || '';

      // Check if player has paid
      const playerContribution = contributions.find(
        (c) => c.user_id === playerId
      );
      const hasPaid = playerContribution?.status === 'completed' || playerContribution?.status === 'approved';

      // Find or create size entry
      let sizeEntry = product.sizes.find((s) => s.size === size);
      if (!sizeEntry) {
        sizeEntry = {
          size,
          quantity: 0,
          jersey_numbers: [],
          player_names: [],
          player_ids: [],
          payment_statuses: [],
        };
        product.sizes.push(sizeEntry);
      }

      // Add to size entry
      sizeEntry.quantity += item.quantity || 1;
      if (jerseyNumber) {
        sizeEntry.jersey_numbers.push(jerseyNumber);
      }
      if (playerName) {
        sizeEntry.player_names.push(playerName);
      }
      if (playerId) {
        sizeEntry.player_ids.push(playerId);
      }
      sizeEntry.payment_statuses.push(hasPaid);

      // Update product totals
      product.total_quantity += item.quantity || 1;
      product.total_price_clp += (item.unit_price_clp || 0) * (item.quantity || 1);
    });

    // Sort sizes within each product
    productMap.forEach((product) => {
      product.sizes.sort((a, b) => {
        // Sort by size (assuming standard sizes like S, M, L, XL, XXL)
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
        const aIndex = sizeOrder.indexOf(a.size.toUpperCase());
        const bIndex = sizeOrder.indexOf(b.size.toUpperCase());

        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }

        // If not standard sizes, sort alphabetically
        return a.size.localeCompare(b.size);
      });
    });

    return Array.from(productMap.values());
  };

  useEffect(() => {
    async function loadOrder() {
      try {
        const supabase = getBrowserClient();

        // Fetch order
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', params.orderId)
          .single();

        if (orderError) throw orderError;

        // Fetch order items
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', params.orderId);

        if (itemsError) throw itemsError;

        // Fetch player info submissions for the team to get size and jersey number data
        const { data: playerInfos } = await supabase
          .from('player_info_submissions')
          .select('user_id, player_name, jersey_number, size, position')
          .eq('team_id', orderData.team_id);

        // Merge player info with order items
        const enrichedItems = (items || []).map((item) => {
          const playerInfo = playerInfos?.find((p) => p.user_id === item.player_id);

          return {
            ...item,
            player_name: item.player_name || playerInfo?.player_name || null,
            jersey_number: item.jersey_number || playerInfo?.jersey_number || null,
            customization: {
              ...item.customization,
              size: item.customization?.size || playerInfo?.size || null,
              position: item.customization?.position || playerInfo?.position || null,
            },
          };
        });

        // Fetch payment contributions (without join for now)
        const { data: contributions, error: contributionsError } = await supabase
          .from('payment_contributions')
          .select('*')
          .eq('order_id', params.orderId);

        if (contributionsError) {
          console.error('Error fetching contributions:', contributionsError);
          // Don't throw - continue without contributions
        }

        // If we have contributions, fetch user details separately
        const contributionsWithUsers = await Promise.all(
          (contributions || []).map(async (contrib) => {
            if (contrib.user_id) {
              const { data: userData } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('id', contrib.user_id)
                .single();

              return { ...contrib, user: userData };
            }
            return { ...contrib, user: null };
          })
        );

        // Fetch team info
        const { data: teamData } = await supabase
          .from('teams')
          .select('name, slug')
          .eq('id', orderData.team_id)
          .single();

        const orderWithDetails = {
          ...orderData,
          items: enrichedItems || [],
          contributions: contributionsWithUsers || [],
          team: teamData || undefined,
        };

        setOrder(orderWithDetails);

        // Process product breakdowns
        const breakdowns = processProductBreakdowns(enrichedItems || [], contributionsWithUsers || []);
        setProductBreakdowns(breakdowns);
      } catch (err: any) {
        console.error('Error loading order:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [params.orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando orden...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Orden no encontrada</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-[#e21c21] hover:text-[#c11a1e] font-medium"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'shipped':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'delivered':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'shipped':
        return 'Enviado';
      case 'delivered':
        return 'Entregado';
      default:
        return status;
    }
  };

  // Calculate payment breakdown from contributions
  const totalAmountClp = order.total_amount_clp || 0;
  const paidClp = order.contributions.reduce(
    (sum, contrib) => sum + (contrib.status === 'completed' ? contrib.amount_clp : 0),
    0
  );
  const pendingClp = totalAmountClp - paidClp;
  const paymentPercentage = totalAmountClp > 0
    ? Math.round((paidClp / totalAmountClp) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-black">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header Glass Card */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          <div className="relative">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-4 flex-1">
                <h1 className="text-3xl font-bold text-white">
                  Orden #{order.order_number || order.id.slice(0, 8)}
                </h1>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}
                >
                  {getStatusText(order.status)}
                </span>
              </div>
            </div>

            <div className="ml-10 flex items-center gap-6 text-gray-400">
              <span className="text-white font-semibold">{order.team?.name || 'Equipo'}</span>
              <span>•</span>
              <span>{new Date(order.created_at).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>
        </div>
        {/* Order Overview - Always 2 Column Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Payment Summary */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-3 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="relative">
              <h2 className="text-base font-bold text-white mb-3">Pago</h2>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Total</p>
                  <p className="text-base font-bold text-white">
                    {formatCLP(totalAmountClp)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Pagado</p>
                  <p className="text-base font-bold text-green-400">
                    {formatCLP(paidClp)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Pendiente</p>
                  <p className="text-base font-bold text-yellow-400">
                    {formatCLP(pendingClp)}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Progreso</span>
                  <span className="font-semibold text-white">{paymentPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-500 via-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${paymentPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary - Receipt Style */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-3 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="relative">
              <h2 className="text-base font-bold text-white mb-3 pb-2 border-b border-gray-600">Resumen de Orden</h2>

              {/* Product Lines */}
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {productBreakdowns.map((product) => (
                  <div key={product.product_id} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[10px] text-gray-300 leading-tight flex-1">
                        {product.product_name}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400">
                        {product.total_quantity} × {formatCLP(product.unit_price_clp)}
                      </p>
                      <p className="text-xs font-semibold text-white">
                        {formatCLP(product.total_price_clp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal */}
              <div className="pt-2 border-t border-gray-600 space-y-1 mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Subtotal</span>
                  <span className="text-xs font-semibold text-white">
                    {formatCLP(order.subtotal_clp || totalAmountClp)}
                  </span>
                </div>
                {(order.discount_clp > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Descuento</span>
                    <span className="text-xs font-semibold text-green-400">
                      -{formatCLP(order.discount_clp)}
                    </span>
                  </div>
                )}
                {(order.tax_clp > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Impuestos</span>
                    <span className="text-xs font-semibold text-white">
                      {formatCLP(order.tax_clp)}
                    </span>
                  </div>
                )}
                {(order.shipping_clp > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Envío</span>
                    <span className="text-xs font-semibold text-white">
                      {formatCLP(order.shipping_clp)}
                    </span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="pt-2 border-t-2 border-gray-600 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-300">Total</span>
                <span className="text-lg font-bold text-[#e21c21]">
                  {formatCLP(totalAmountClp)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Product Size Breakdown Cards */}
        <div>
          {productBreakdowns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {productBreakdowns.map((product) => (
                <ProductSizeBreakdownCard
                  key={product.product_id}
                  product={product}
                />
              ))}
            </div>
          ) : (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="relative text-center text-gray-400">
                No hay productos en esta orden
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
