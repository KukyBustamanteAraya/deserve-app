'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Order, OrderItem, PaymentContribution } from '@/types/payments';
import { formatCLP } from '@/types/payments';
import { ProductSizeBreakdownCard, ProductSizeBreakdown } from '@/components/team/orders/ProductSizeBreakdownCard';
import { SizeAssignmentCard } from '@/components/team/orders/SizeAssignmentCard';
import { JerseyNameConfigCard } from '@/components/team/orders/JerseyNameConfigCard';
import { BulkNameInputCard } from '@/components/team/orders/BulkNameInputCard';
import { MockupCarousel } from '@/components/design/MockupCarousel';
import { KitDisplayCard } from '@/components/design/KitDisplayCard';
import { getSizeOrderIndex } from '@/constants/sizing';
import Image from 'next/image';

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
  const { slug, orderId } = params;
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productBreakdowns, setProductBreakdowns] = useState<ProductSizeBreakdown[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [jerseyNameStyle, setJerseyNameStyle] = useState<'player_name' | 'team_name' | 'none' | null>(null);
  const [jerseyTeamName, setJerseyTeamName] = useState<string | null>(null);
  const [rosterMembers, setRosterMembers] = useState<any[]>([]);

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

      // Apply jersey name configuration
      let displayName = playerName;
      if (jerseyNameStyle === 'team_name' && jerseyTeamName) {
        displayName = jerseyTeamName;
      } else if (jerseyNameStyle === 'none') {
        displayName = '-';
      }

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
      if (displayName) {
        sizeEntry.player_names.push(displayName);
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
      product.sizes.sort((a: any, b: any) => {
        // Sort by size using centralized size ordering
        const aIndex = getSizeOrderIndex(a.size);
        const bIndex = getSizeOrderIndex(b.size);

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

        // Check if this is a design request order (format: design-request-{id})
        const isDesignRequestOrder = orderId.startsWith('design-request-');

        if (isDesignRequestOrder) {
          // Extract design request ID
          const designRequestId = orderId.replace('design-request-', '');

          // Fetch design request instead of order
          const { data: designRequest, error: drError } = await supabase
            .from('design_requests')
            .select(`
              *,
              designs (
                id,
                name,
                slug,
                description,
                designer_name,
                design_mockups (
                  id,
                  mockup_url,
                  is_primary,
                  view_angle,
                  product_type_slug
                )
              ),
              institution_sub_teams (
                id,
                name,
                slug,
                jersey_name_style,
                jersey_team_name
              )
            `)
            .eq('id', designRequestId)
            .single();

          if (drError) throw drError;

          console.log('[Order Page] Design request loaded:', {
            id: designRequest.id,
            selected_apparel: designRequest.selected_apparel,
            estimated_roster_size: designRequest.estimated_roster_size
          });

          // Fetch team info
          const { data: teamData } = await supabase
            .from('teams')
            .select('name, slug')
            .eq('id', designRequest.team_id)
            .single();

          // Fetch player info for the sub-team to show sizing breakdown
          let playerInfos: any[] = [];
          if (designRequest.sub_team_id) {
            const { data: playerData, error: playerError } = await supabase
              .from('institution_sub_team_members')
              .select('*')
              .eq('sub_team_id', designRequest.sub_team_id);

            if (playerError) {
              console.error('Error fetching player info:', playerError);
            }

            // Sort by jersey number numerically
            playerInfos = (playerData || []).sort((a: any, b: any) => {
              const numA = parseInt(a.jersey_number) || 0;
              const numB = parseInt(b.jersey_number) || 0;
              return numA - numB;
            });
          }

          // Calculate pricing from selected_apparel and roster size
          const selectedApparel = designRequest.selected_apparel || { products: [] };
          const rosterSize = playerInfos.length || designRequest.estimated_roster_size || 0;

          // Calculate total cost: sum of (each product price × roster size)
          let totalClpPerPlayer = 0;
          (selectedApparel.products || []).forEach((product: any) => {
            totalClpPerPlayer += product.price_clp || 0;
          });

          const totalClp = totalClpPerPlayer * rosterSize;

          console.log('[Order Page] Pricing calculation:', {
            products: selectedApparel.products?.length || 0,
            totalClpPerPlayer,
            rosterSize,
            totalClp
          });

          // Create a mock order object from design request for consistency
          const mockOrder = {
            id: orderId,
            order_number: `DR-${designRequestId}`,
            team_id: designRequest.team_id,
            created_at: designRequest.created_at,
            updated_at: designRequest.updated_at,
            status: 'pending', // Design requests don't have order status yet
            total_amount_clp: totalClp,
            subtotal_clp: totalClp,
            tax_clp: 0,
            shipping_clp: 0,
            discount_clp: 0,
            is_design_request: true,
            design_request_data: designRequest,
            items: [],
            contributions: [],
            team: teamData || undefined,
          };

          setOrder(mockOrder as any);

          // Store jersey config
          setJerseyNameStyle(designRequest.institution_sub_teams?.jersey_name_style || null);
          setJerseyTeamName(designRequest.institution_sub_teams?.jersey_team_name || null);

          // Store roster members
          setRosterMembers(playerInfos);
          console.log('[Order Page] Updated roster members:', {
            count: playerInfos.length,
            sample: playerInfos.slice(0, 3).map(p => ({
              id: p.id,
              name: p.player_name,
              size: p.size,
              number: p.jersey_number
            })),
            subTeamId: designRequest.sub_team_id
          });

          // Process player info into size breakdown format
          if (playerInfos.length > 0) {
            const sizeMap = new Map<string, any>();

            // Get jersey config for this sub-team
            const jerseyStyle = designRequest.institution_sub_teams?.jersey_name_style;
            const teamNameForJersey = designRequest.institution_sub_teams?.jersey_team_name;

            playerInfos.forEach((player) => {
              const size = player.size || 'N/A';

              if (!sizeMap.has(size)) {
                sizeMap.set(size, {
                  size,
                  quantity: 0,
                  jersey_numbers: [],
                  player_names: [],
                  player_ids: [],
                  payment_statuses: [],
                });
              }

              const sizeEntry = sizeMap.get(size);
              sizeEntry.quantity += 1;
              if (player.jersey_number) {
                sizeEntry.jersey_numbers.push(player.jersey_number);
              }

              // Apply jersey name configuration
              let displayName = player.player_name;
              if (jerseyStyle === 'team_name' && teamNameForJersey) {
                displayName = teamNameForJersey;
              } else if (jerseyStyle === 'none') {
                displayName = '-';
              }

              if (displayName) {
                sizeEntry.player_names.push(displayName);
              }
              // Use member ID since institution_sub_team_members don't have user_id
              if (player.id) {
                sizeEntry.player_ids.push(player.id);
              }
              sizeEntry.payment_statuses.push(false); // No payments yet for design requests
            });

            // Sort sizes
            const sizes = Array.from(sizeMap.values()).sort((a: any, b: any) => {
              const aIndex = getSizeOrderIndex(a.size);
              const bIndex = getSizeOrderIndex(b.size);

              if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex;
              }
              return a.size.localeCompare(b.size);
            });

            // Create product breakdowns for each product in selected_apparel
            const selectedApparel = designRequest.selected_apparel || { products: [] };
            const teamName = designRequest.institution_sub_teams?.name || 'Equipo';
            const breakdowns: ProductSizeBreakdown[] = [];

            if (selectedApparel.products && selectedApparel.products.length > 0) {
              selectedApparel.products.forEach((product: any, index: number) => {
                const unitPriceClp = product.price_clp || 0;
                const totalPriceClp = unitPriceClp * playerInfos.length;

                breakdowns.push({
                  product_id: product.id || index,
                  product_name: product.name || `Producto ${index + 1}`,
                  product_type_name: product.category || 'Artículo',
                  images: [],
                  sizes: sizes,
                  total_quantity: playerInfos.length,
                  unit_price_clp: unitPriceClp,
                  total_price_clp: totalPriceClp,
                });
              });
            } else {
              // Fallback: single breakdown for the roster
              breakdowns.push({
                product_id: 1,
                product_name: `${teamName} Roster`,
                product_type_name: 'Uniforme',
                images: [],
                sizes: sizes,
                total_quantity: playerInfos.length,
                unit_price_clp: totalClpPerPlayer,
                total_price_clp: totalClp,
              });
            }

            setProductBreakdowns(breakdowns);
          } else {
            setProductBreakdowns([]);
          }

          setLoading(false);
          return;
        }

        // Regular order flow
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single();

        if (orderError) throw orderError;

        // Fetch order items
        const { data: items, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', orderId);

        if (itemsError) throw itemsError;

        // Fetch player info submissions for the team to get size and jersey number data
        const { data: playerInfos } = await supabase
          .from('player_info_submissions')
          .select('user_id, player_name, jersey_number, size, position')
          .eq('team_id', orderData.team_id);

        // Merge player info with order items
        const enrichedItems = (items || []).map((item: any) => {
          const playerInfo = playerInfos?.find((p: any) => p.user_id === item.player_id);

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
          .eq('order_id', orderId);

        if (contributionsError) {
          console.error('Error fetching contributions:', contributionsError);
          // Don't throw - continue without contributions
        }

        // If we have contributions, fetch user details separately
        const contributionsWithUsers = await Promise.all(
          (contributions || []).map(async (contrib: any) => {
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
  }, [orderId, refreshKey]);

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

  // Handler for size assignment completion
  const handleSizeAssignmentComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Handler for jersey config update
  const handleJerseyConfigUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Handler for name update completion
  const handleNameUpdateComplete = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Get design request data and current size distribution
  const designRequestData = (order as any).design_request_data;
  const subTeamId = designRequestData?.sub_team_id;
  const isDesignRequest = (order as any).is_design_request;

  // Calculate current size distribution from product breakdowns
  const currentSizes: Record<string, number> = {};
  if (productBreakdowns.length > 0) {
    productBreakdowns[0].sizes.forEach(sizeInfo => {
      if (sizeInfo.size && sizeInfo.size !== 'N/A') {
        currentSizes[sizeInfo.size] = sizeInfo.quantity;
      }
    });
  }

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

        {/* Legacy Design Request Notice - No Pricing Data */}
        {isDesignRequest && totalAmountClp === 0 && (
          <div className="relative bg-gradient-to-br from-yellow-800/30 via-yellow-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-4 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-yellow-300 mb-1">Información de Precios No Disponible</h3>
                <p className="text-xs text-yellow-200/80">
                  Esta solicitud de diseño fue creada antes de que el sistema de precios estuviera implementado.
                  Los precios finales serán calculados por el equipo administrativo.
                </p>
              </div>
            </div>
          </div>
        )}

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

        {/* Kit Display - Only for design requests with mockups */}
        {(order as any).is_design_request && (order as any).design_request_data && (() => {
          const designRequest = (order as any).design_request_data;

          // Parse structured mockups (new JSONB format)
          const structuredMockups = designRequest.mockups || {};
          const hasStructuredMockups = structuredMockups.home || structuredMockups.away;

          // Fallback to legacy mockup_urls array
          let legacyMockups: any = {};
          if (!hasStructuredMockups && designRequest.mockup_urls && designRequest.mockup_urls.length > 0) {
            // Assume first mockup is home front, second is away front if available
            legacyMockups = {
              home: {
                front: designRequest.mockup_urls[0] || undefined
              },
              away: {
                front: designRequest.mockup_urls[1] || undefined
              }
            };
          }

          // Final mockup data to pass to component
          const kitMockups = hasStructuredMockups ? structuredMockups : legacyMockups;
          const hasAnyMockups = kitMockups.home || kitMockups.away;

          // Team name for display
          const teamName = designRequest.institution_sub_teams?.name || order.team?.name || 'Equipo';

          return hasAnyMockups ? (
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="relative p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Diseño Listo para Producción</h2>

                <KitDisplayCard
                  mockups={kitMockups}
                  teamName={teamName}
                  onReorder={() => {
                    // TODO: Implement reorder functionality
                    console.log('Reorder clicked for:', teamName);
                  }}
                  onModify={() => {
                    // TODO: Implement modify functionality
                    console.log('Modify clicked for:', teamName);
                  }}
                  onNewKit={() => {
                    // TODO: Implement new kit functionality
                    console.log('New kit clicked for:', teamName);
                  }}
                  onDetails={() => {
                    // TODO: Implement details functionality
                    console.log('Details clicked for:', teamName);
                  }}
                />

                {/* Design Details - Below the kit containers */}
                {designRequest.designs && (
                  <div className="mt-6 p-4 bg-gray-900/30 rounded-lg border border-gray-700">
                    <h3 className="text-lg font-semibold text-white mb-2">{designRequest.designs.name}</h3>
                    {designRequest.designs.description && (
                      <p className="text-gray-400 text-sm mb-3">{designRequest.designs.description}</p>
                    )}
                    {designRequest.designs.designer_name && (
                      <p className="text-sm text-gray-500">Diseñador: {designRequest.designs.designer_name}</p>
                    )}

                    {/* Color Palette */}
                    {(designRequest.primary_color || designRequest.secondary_color || designRequest.accent_color) && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-2">Colores del Diseño</h4>
                        <div className="flex gap-3">
                          {designRequest.primary_color && (
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-12 h-12 rounded-lg border border-gray-600"
                                style={{ backgroundColor: designRequest.primary_color }}
                              ></div>
                              <span className="text-xs text-gray-500">Principal</span>
                            </div>
                          )}
                          {designRequest.secondary_color && (
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-12 h-12 rounded-lg border border-gray-600"
                                style={{ backgroundColor: designRequest.secondary_color }}
                              ></div>
                              <span className="text-xs text-gray-500">Secundario</span>
                            </div>
                          )}
                          {designRequest.accent_color && (
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-12 h-12 rounded-lg border border-gray-600"
                                style={{ backgroundColor: designRequest.accent_color }}
                              ></div>
                              <span className="text-xs text-gray-500">Acento</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null;
        })()}

        {/* Size Assignment Tool - Only for design requests with roster */}
        {isDesignRequest && subTeamId && productBreakdowns.length > 0 && (
          <SizeAssignmentCard
            subTeamId={subTeamId}
            institutionSlug={slug}
            rosterSize={productBreakdowns[0].total_quantity}
            currentSizes={currentSizes}
            onAssignmentComplete={handleSizeAssignmentComplete}
          />
        )}

        {/* Jersey Name Configuration - Only for design requests with roster */}
        {isDesignRequest && subTeamId && productBreakdowns.length > 0 && (
          <JerseyNameConfigCard
            subTeamId={subTeamId}
            institutionSlug={slug}
            currentStyle={jerseyNameStyle}
            currentTeamName={jerseyTeamName}
            onConfigUpdate={handleJerseyConfigUpdate}
          />
        )}

        {/* Bulk Name Input - Only when player_name style is selected */}
        {isDesignRequest && subTeamId && jerseyNameStyle === 'player_name' && rosterMembers.length > 0 && (
          <BulkNameInputCard
            subTeamId={subTeamId}
            institutionSlug={slug}
            rosterMembers={rosterMembers}
            onUpdateComplete={handleNameUpdateComplete}
          />
        )}

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
              <div className="relative text-center">
                <p className="text-gray-400 mb-2">
                  {(order as any).is_design_request
                    ? 'No hay jugadores registrados en este equipo todavía'
                    : 'No hay productos en esta orden'
                  }
                </p>
                {(order as any).is_design_request && (
                  <p className="text-sm text-gray-500">
                    Agrega jugadores al roster del equipo para ver el desglose de tallas
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
