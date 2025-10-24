'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ClientDetail, OrderWithDetails } from '@/types/clients';
import OrderDetailPanel from './OrderDetailPanel';
import DesignRequestCard from './DesignRequestCard';

interface ClientDetailModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClientDetailModal({ clientId, isOpen, onClose }: ClientDetailModalProps) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'designs'>('designs');
  const [expandedDesignRequestId, setExpandedDesignRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && clientId) {
      fetchClientDetail();
    }
  }, [isOpen, clientId]);

  const fetchClientDetail = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setClient(data.client);
      }
    } catch (error) {
      console.error('Error fetching client detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  if (!isOpen) return null;

  const primaryColor = client?.colors?.primary || '#e21c21';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 flex items-center justify-center">
        <div className="relative w-full h-full bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Team Logo */}
                {client && (
                  <div
                    className="w-20 h-20 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{
                      backgroundColor: `${primaryColor}20`,
                      borderColor: `${primaryColor}40`,
                      borderWidth: '2px',
                    }}
                  >
                    {client.logo_url ? (
                      <Image
                        src={client.logo_url}
                        alt={client.name}
                        width={80}
                        height={80}
                        className="object-contain w-full h-full"
                      />
                    ) : (
                      <span
                        className="text-3xl font-black"
                        style={{ color: primaryColor }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                {/* Client Info */}
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-8 bg-gray-700/50 rounded w-1/2 animate-pulse"></div>
                      <div className="h-4 bg-gray-700/50 rounded w-1/3 animate-pulse"></div>
                    </div>
                  ) : client ? (
                    <>
                      <h2 className="text-2xl font-black text-white truncate">{client.name}</h2>
                      <p className="text-gray-400">{client.sport_name}</p>
                      {client.manager_email && (
                        <p className="text-sm text-gray-500 mt-1">Manager: {client.manager_email}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {client.colors.primary && (
                          <div
                            className="w-8 h-8 rounded border border-gray-600"
                            style={{ backgroundColor: client.colors.primary }}
                          ></div>
                        )}
                        {client.colors.secondary && (
                          <div
                            className="w-8 h-8 rounded border border-gray-600"
                            style={{ backgroundColor: client.colors.secondary }}
                          ></div>
                        )}
                        {client.colors.tertiary && (
                          <div
                            className="w-8 h-8 rounded border border-gray-600"
                            style={{ backgroundColor: client.colors.tertiary }}
                          ></div>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats Bar */}
            {client && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs">Members</div>
                  <div className="text-white font-bold text-xl">{client.member_count}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs">Total Orders</div>
                  <div className="text-white font-bold text-xl">{client.total_orders}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs">Revenue</div>
                  <div className="text-green-500 font-bold text-xl">{formatCurrency(client.total_revenue_cents)}</div>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs">Unpaid</div>
                  <div className="text-orange-500 font-bold text-xl">{formatCurrency(client.unpaid_amount_cents)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          {client && (
            <div className="flex-shrink-0 border-b border-gray-700 px-6">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('designs')}
                  className={`px-4 py-3 font-semibold transition-all ${
                    activeTab === 'designs'
                      ? 'text-white border-b-2 border-[#e21c21]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Design Requests ({client.design_requests?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`px-4 py-3 font-semibold transition-all ${
                    activeTab === 'orders'
                      ? 'text-white border-b-2 border-[#e21c21]'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  Orders ({client.orders?.length || 0})
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-900/50 rounded-lg p-4 animate-pulse">
                    <div className="h-6 bg-gray-700/50 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : client ? (
              activeTab === 'designs' ? (
                // Design Requests Tab
                client.design_requests && client.design_requests.length > 0 ? (
                  <div className="space-y-4">
                    {client.design_requests.map((request) => (
                      <DesignRequestCard
                        key={request.id}
                        request={request}
                        onRefresh={fetchClientDetail}
                        isExpanded={expandedDesignRequestId === request.id}
                        onToggleExpand={() => setExpandedDesignRequestId(
                          expandedDesignRequestId === request.id ? null : request.id
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No design requests yet</p>
                  </div>
                )
              ) : (
                // Orders Tab
                client.orders && client.orders.length > 0 ? (
                  <div className="space-y-4">
                    {client.orders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-white font-semibold">
                                Order #{order.id.slice(0, 8)}
                              </h4>
                              <span className="text-xs px-2 py-1 rounded bg-gray-700/50 text-gray-300">
                                {order.status}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' :
                                order.payment_status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {order.payment_status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 space-y-1">
                              <div>{order.items.length} items • {order.total_units} units</div>
                              <div>Created {new Date(order.created_at).toLocaleDateString()}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-bold text-lg">{formatCurrency(order.total_amount_cents)}</div>
                            {order.paid_amount_cents > 0 && (
                              <div className="text-green-500 text-sm">
                                {formatCurrency(order.paid_amount_cents)} paid
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">No orders yet</p>
                  </div>
                )
              )
            ) : null}
          </div>
        </div>
      </div>

      {/* Order Detail Panel */}
      {selectedOrder && (
        <OrderDetailPanel
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
