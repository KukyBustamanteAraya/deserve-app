'use client';

import { useRouter } from 'next/navigation';
import type { InstitutionOrder } from '@/lib/mockData/institutionData';

// Extend the InstitutionOrder type to include design request fields
interface ExtendedInstitutionOrder extends InstitutionOrder {
  is_design_request?: boolean;
  design_request_id?: string | number;
}

interface ActiveOrdersSummaryProps {
  orders: InstitutionOrder[];
  institutionSlug: string;
}

export function ActiveOrdersSummary({ orders, institutionSlug }: ActiveOrdersSummaryProps) {
  const router = useRouter();

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

  // Filter only active orders
  const activeOrders = orders.filter(order =>
    order.status === 'paid' || order.status === 'pending' || order.status === 'shipped'
  );

  // Group orders by order number
  const groupedOrders = activeOrders.reduce((groups, order) => {
    const key = order.orderNumber;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(order);
    return groups;
  }, {} as Record<string, InstitutionOrder[]>);

  if (activeOrders.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-8 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative text-center">
          <p className="text-gray-400">No hay órdenes activas</p>
        </div>
      </div>
    );
  }

  // Show first 6 order groups
  const displayOrderGroups = Object.entries(groupedOrders).slice(0, 6);

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Órdenes Activas</h2>
          <span className="text-xs text-gray-400">{Object.keys(groupedOrders).length} {Object.keys(groupedOrders).length === 1 ? 'orden' : 'órdenes'}</span>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {displayOrderGroups.map(([orderNumber, orderGroup]) => {
            const groupTotal = orderGroup.reduce((sum, o) => sum + o.totalCents, 0);
            const groupPaid = orderGroup.reduce((sum, o) => sum + (o.paidCents || o.totalCents), 0);
            const groupItems = orderGroup.reduce((sum, o) => sum + o.items, 0);
            const isMultiTeam = orderGroup.length > 1;

            // Check if this is a design request
            const isDesignRequest = orderGroup[0].is_design_request;
            const designRequestId = orderGroup[0].design_request_id;

            return (
              <button
                key={orderNumber}
                onClick={() => {
                  if (isDesignRequest && designRequestId) {
                    router.push(`/mi-equipo/${institutionSlug}/design-requests/${designRequestId}`);
                  } else {
                    router.push(`/mi-equipo/${institutionSlug}/orders`);
                  }
                }}
                className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-3 text-left transition-all border border-gray-700 hover:border-[#e21c21]/50 overflow-hidden group/card"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>

                <div className="relative">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">{orderNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(orderGroup[0].status)}`}
                        >
                          {getStatusText(orderGroup[0].status)}
                        </span>
                      </div>
                      {isMultiTeam ? (
                        <>
                          <h4 className="text-xs font-semibold text-gray-300">{orderGroup.length} equipos</h4>
                          <div className="text-xs text-gray-500 space-y-0.5 mt-1">
                            {orderGroup.map((order, idx) => (
                              <div key={order.id}>• {order.teamName}</div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>
                          <h4 className="text-xs font-semibold text-gray-300 truncate">{orderGroup[0].teamName}</h4>
                          <p className="text-xs text-gray-500">{orderGroup[0].sport}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Order Details */}
                  <div className="flex items-center justify-between text-xs mt-3 pt-3 border-t border-gray-700">
                    <div>
                      <span className="text-gray-400">{groupItems} items</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-white font-semibold">
                        ${(groupTotal / 100).toLocaleString('es-CL')}
                      </span>
                      {groupPaid < groupTotal && (
                        <span className="text-xs text-green-400">
                          ${(groupPaid / 100).toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* View All Orders Button */}
        <button
          onClick={() => {
            router.push(`/mi-equipo/${institutionSlug}/orders`);
          }}
          className="relative w-full px-4 py-3 bg-gradient-to-br from-gray-800/30 via-black/20 to-gray-900/30 text-gray-300 hover:text-white border border-gray-700 hover:border-[#e21c21]/50 rounded-lg font-medium overflow-hidden group/view transition-all"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative flex items-center justify-center gap-2">
            <span>Ver Todas las Órdenes</span>
            <span>→</span>
          </div>
        </button>
      </div>
    </div>
  );
}
