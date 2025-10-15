'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { InstitutionOrder } from '@/lib/mockData/institutionData';

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

  // Group orders by order number
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
                <span className="text-xs font-semibold text-gray-300">Items</span>
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
            {Object.entries(groupedOrders).map(([orderNumber, groupOrders], groupIdx) => {
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

                    return (
                      <tr
                        key={order.id}
                        onClick={() => router.push(`/mi-equipo/${institutionSlug}/orders/${order.id}`)}
                        className={`border-b border-gray-700/50 hover:bg-gray-800/30 cursor-pointer transition-colors group/row ${
                          isMultiTeam ? 'bg-gray-900/20' : ''
                        } ${isLastInGroup && isMultiTeam ? '' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-300">{order.teamName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-400">{order.sport}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-300">{order.items}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
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
