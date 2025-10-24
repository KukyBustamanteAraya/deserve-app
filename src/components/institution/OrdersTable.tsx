'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { InstitutionOrder } from '@/lib/mockData/institutionData';
import { GenderBadge } from '@/components/team/orders/GenderBadge';

interface OrdersTableProps {
  orders: InstitutionOrder[];
  institutionSlug: string;
}

type SortField = 'orderNumber' | 'teamName' | 'sport' | 'totalCents' | 'status' | 'date';
type SortDirection = 'asc' | 'desc';

export function OrdersTable({ orders, institutionSlug }: OrdersTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedDivisions, setExpandedDivisions] = useState<Record<string, boolean>>({});

  const getStatusColor = (status: string) => {
    // Design request statuses
    if (status.startsWith('design_')) {
      switch (status) {
        case 'design_pending':
          return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
        case 'design_in_review':
          return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
        case 'design_changes_requested':
          return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
        case 'design_approved':
          return 'bg-green-500/20 text-green-400 border-green-500/50';
        case 'design_ready':
          return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
        default:
          return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      }
    }

    // Handle non-prefixed design request statuses
    if (status === 'ready' || status === 'design_ready') {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
    }

    // Order statuses
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
    // Design request statuses
    if (status.startsWith('design_')) {
      switch (status) {
        case 'design_pending':
          return 'Diseño Pendiente';
        case 'design_in_review':
          return 'En Revisión';
        case 'design_changes_requested':
          return 'Cambios Solicitados';
        case 'design_approved':
          return 'Diseño Aprobado';
        case 'design_ready':
          return 'Listo para Aprobar';
        default:
          return status.replace('design_', '');
      }
    }

    // Handle non-prefixed design request statuses
    if (status === 'ready' || status === 'design_ready') {
      return 'Listo para Aprobar';
    }

    // Order statuses
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOrders = [...orders].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle date sorting
    if (sortField === 'date') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // First, group by division_group (for gender-divided teams like Men/Women Basketball)
  // Then group by order number within each division group
  const divisionGroups: Record<string, InstitutionOrder[]> = {};

  sortedOrders.forEach((order) => {
    const divisionGroup = (order as any).division_group || (order as any).sub_team?.division_group;

    if (divisionGroup) {
      // This order is part of a gender-divided team - group by division_group
      if (!divisionGroups[divisionGroup]) {
        divisionGroups[divisionGroup] = [];
      }
      divisionGroups[divisionGroup].push(order);
    } else {
      // Single order or non-gendered team - use order ID as unique key
      const key = `single_${order.id}`;
      divisionGroups[key] = [order];
    }
  });

  // Group orders by order number (keep existing logic for compatibility)
  const groupedOrders = sortedOrders.reduce((groups, order) => {
    const key = order.orderNumber;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(order);
    return groups;
  }, {} as Record<string, InstitutionOrder[]>);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (orders.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-12 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="relative text-center">
          <p className="text-gray-400 text-lg">No se encontraron órdenes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left w-20">
                <span className="text-xs font-semibold text-gray-300">Vista</span>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('teamName')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Equipo</span>
                  <SortIcon field="teamName" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('sport')}
                  className="flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Deporte</span>
                  <SortIcon field="sport" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="text-xs font-semibold text-gray-300">Cantidad</span>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('totalCents')}
                  className="flex items-center gap-2 ml-auto text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Total / Pagado</span>
                  <SortIcon field="totalCents" />
                </button>
              </th>
              <th className="px-4 py-3 text-center">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 mx-auto text-xs font-semibold text-gray-300 hover:text-white transition-colors"
                >
                  <span>Estado</span>
                  <SortIcon field="status" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(divisionGroups).map(([divisionKey, divisionOrders], divisionIdx) => {
              const isDivisionGroup = !divisionKey.startsWith('single_');
              const isExpanded = expandedDivisions[divisionKey] !== false; // Default to expanded

              // Calculate division totals
              const divisionTotal = divisionOrders.reduce((sum, o) => sum + o.totalCents, 0);
              const divisionPaid = divisionOrders.reduce((sum, o) => sum + (o.paidCents || o.totalCents), 0);
              const divisionItems = divisionOrders.reduce((sum, o) => sum + o.items, 0);

              // Get division name from first order's team name (remove gender suffix)
              const firstOrder = divisionOrders[0];
              const divisionName = isDivisionGroup
                ? (firstOrder.teamName || 'División').replace(/\s+(Men|Women|Hombres|Mujeres)$/i, '').trim()
                : null;

              return (
                <React.Fragment key={divisionKey}>
                  {/* Division Group Header - Only for actual division groups */}
                  {isDivisionGroup && divisionOrders.length > 1 && (
                    <tr className="bg-gray-800/80 border-t-2 border-gray-600">
                      <td colSpan={6} className="px-4 py-3">
                        <button
                          onClick={() => setExpandedDivisions(prev => ({ ...prev, [divisionKey]: !isExpanded }))}
                          className="flex items-center gap-3 text-white font-semibold hover:text-gray-300 transition-colors w-full"
                        >
                          <span className="text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <span>{divisionName} División</span>
                          <span className="text-xs text-gray-400">
                            ({divisionOrders.length} equipos • {divisionItems} items • ${(divisionTotal / 100).toLocaleString('es-CL')} CLP)
                          </span>
                        </button>
                      </td>
                    </tr>
                  )}

                  {/* Render orders (collapsed if division is not expanded) */}
                  {(isExpanded || !isDivisionGroup) && Object.entries(
                    divisionOrders.reduce((groups, order) => {
                      const key = order.orderNumber;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(order);
                      return groups;
                    }, {} as Record<string, InstitutionOrder[]>)
                  ).map(([orderNumber, groupOrders], groupIdx) => {
                    const groupTotal = groupOrders.reduce((sum, o) => sum + o.totalCents, 0);
                    const groupPaid = groupOrders.reduce((sum, o) => sum + (o.paidCents || o.totalCents), 0);
                    const groupItems = groupOrders.reduce((sum, o) => sum + o.items, 0);
                    const isMultiTeam = groupOrders.length > 1;

                    return (
                      <React.Fragment key={orderNumber}>
                  {groupOrders.map((order, idx) => {
                    const paymentPercentage = order.paidCents
                      ? Math.round((order.paidCents / order.totalCents) * 100)
                      : 100;
                    const isFirstInGroup = idx === 0;
                    const isLastInGroup = idx === groupOrders.length - 1;

                    // Check if this is a design request
                    const isDesignRequest = (order as any).is_design_request;
                    const designRequestData = isDesignRequest ? (order as any).design_request_data : null;

                    // Get mockup image - prioritize structured mockups (home.front) over array format
                    const getMockupImage = () => {
                      if (!designRequestData) return null;

                      // Priority 1: Structured mockups (JSONB format) - show home front specifically
                      const mockups = (order as any).design_request_data?.mockups;
                      if (mockups?.home?.front) {
                        return mockups.home.front;
                      }

                      // Priority 2: Admin-uploaded mockups array (legacy format)
                      const mockupUrls = (order as any).mockup_urls;
                      if (mockupUrls && mockupUrls.length > 0) {
                        return mockupUrls[0]; // Use first admin-uploaded mockup
                      }

                      // Priority 3: Fallback to catalog design mockups
                      const designs = designRequestData.designs;
                      if (designs?.design_mockups && designs.design_mockups.length > 0) {
                        // Find primary mockup or use first one
                        const primaryMockup = designs.design_mockups.find((m: any) => m.is_primary);
                        return primaryMockup?.mockup_url || designs.design_mockups[0]?.mockup_url;
                      }

                      return null;
                    };

                    const mockupImage = getMockupImage();

                    const handleRowClick = () => {
                      // All rows navigate to unified order summary page
                      // Order summary page already handles both regular orders and design requests
                      router.push(`/mi-equipo/${institutionSlug}/orders/${order.id}`);
                    };

                    return (
                      <tr
                        key={order.id}
                        onClick={handleRowClick}
                        className={`border-b border-gray-700/50 hover:bg-gray-800/30 cursor-pointer transition-colors group/row ${
                          isMultiTeam ? 'bg-gray-900/20' : ''
                        } ${isLastInGroup && isMultiTeam ? '' : ''} ${isDesignRequest ? 'bg-blue-900/10' : ''}`}
                      >
                        <td className="px-4 py-3">
                          {mockupImage ? (
                            <div className="relative w-12 h-12 rounded overflow-hidden border border-gray-600">
                              <Image
                                src={mockupImage}
                                alt="Design mockup"
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded bg-gray-800 border border-gray-600 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-300">{order.teamName}</span>
                            {(order as any).sub_team?.gender_category && (
                              <GenderBadge gender={(order as any).sub_team.gender_category} size="sm" />
                            )}
                            {(order as any).team_gender_category && !(order as any).sub_team?.gender_category && (
                              <GenderBadge gender={(order as any).team_gender_category} size="sm" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">{order.sport}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-300">
                            {order.items > 0 ? order.items : <span className="text-gray-500 italic">-</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isDesignRequest ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm text-gray-500 italic">Pendiente cotización</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">
                                  ${(order.totalCents / 100).toLocaleString('es-CL')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-green-400">
                                  ${((order.paidCents || order.totalCents) / 100).toLocaleString('es-CL')}
                                </span>
                                {order.paidCents && order.paidCents < order.totalCents && (
                                  <>
                                    <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-yellow-500 to-green-500"
                                        style={{ width: `${paymentPercentage}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-xs text-gray-500">{paymentPercentage}%</span>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                          >
                            {getStatusText(order.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {isMultiTeam && (
                    <tr className="border-b-2 border-gray-600 bg-gray-800/50">
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right" colSpan={2}>
                        <span className="text-xs font-bold text-gray-300">Total de la Orden:</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <span className="text-sm font-bold text-white">{groupItems}</span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-bold text-[#e21c21]">
                            ${(groupTotal / 100).toLocaleString('es-CL')}
                          </span>
                          <span className="text-sm font-bold text-green-400">
                            ${(groupPaid / 100).toLocaleString('es-CL')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2"></td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="border-t border-gray-700 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-white">
          Orden {orders[0]?.orderNumber}
        </span>
        <span className="text-sm font-semibold text-white">
          Total: ${sortedOrders.reduce((sum, o) => sum + o.totalCents, 0) / 100} CLP
        </span>
      </div>
    </div>
  );
}
