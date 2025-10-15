'use client';

import { useState, useEffect } from 'react';
import type { DetailedOrder } from '@/lib/mockData/institutionData';

interface OrderDetailModalProps {
  order: DetailedOrder;
  onClose: () => void;
}

type Tab = 'summary' | 'sizes' | 'players' | 'timeline';

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('summary');

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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

  const paymentPercentage = Math.round(
    (order.payment_breakdown.paid_cents / order.payment_breakdown.total_cents) * 100
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Orden {order.orderNumber}</h2>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}
              >
                {getStatusText(order.status)}
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Order Meta */}
          <div className="mt-3 flex items-center gap-6 text-sm text-gray-400">
            <span>{order.teamName}</span>
            <span>•</span>
            <span>{order.sport}</span>
            <span>•</span>
            <span>Coach: {order.coach}</span>
            <span>•</span>
            <span>{new Date(order.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-2">
            {[
              { id: 'summary', label: 'Resumen' },
              { id: 'sizes', label: 'Tallas' },
              { id: 'players', label: 'Jugadores' },
              { id: 'timeline', label: 'Timeline' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all overflow-hidden ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-lg shadow-[#e21c21]/20'
                    : 'bg-gray-800/50 text-gray-300 border border-gray-700 hover:border-gray-600 hover:text-white'
                }`}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Payment Breakdown */}
              <div className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Estado de Pago</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Total</p>
                    <p className="text-xl font-bold text-white">
                      ${(order.payment_breakdown.total_cents / 100).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Pagado</p>
                    <p className="text-xl font-bold text-green-400">
                      ${(order.payment_breakdown.paid_cents / 100).toLocaleString('es-CL')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Pendiente</p>
                    <p className="text-xl font-bold text-yellow-400">
                      ${(order.payment_breakdown.pending_cents / 100).toLocaleString('es-CL')}
                    </p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Progreso de Pago</span>
                    <span className="font-semibold text-white">{paymentPercentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-500 via-green-500 to-green-400 transition-all duration-500"
                      style={{ width: `${paymentPercentage}%` }}
                    ></div>
                  </div>
                </div>
                {order.payment_breakdown.payment_method && (
                  <p className="text-sm text-gray-400 mt-3">
                    Método de pago: {order.payment_breakdown.payment_method}
                  </p>
                )}
              </div>

              {/* Line Items */}
              <div className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Productos</h3>
                <div className="space-y-2">
                  {order.line_items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{item.product_name}</p>
                        <p className="text-xs text-gray-400">
                          {item.quantity} unidades × ${(item.price_per_item_cents / 100).toLocaleString('es-CL')}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-white">
                        ${(item.total_cents / 100).toLocaleString('es-CL')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sizes' && (
            <div className="space-y-6">
              {order.size_breakdown.map((product, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700"
                >
                  <h3 className="text-lg font-bold text-white mb-4">{product.product_type}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">Talla</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Masculino</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Femenino</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.sizes.map((size, sIdx) => (
                          <tr key={sIdx} className="border-b border-gray-700/50 last:border-0">
                            <td className="px-3 py-2 text-sm font-medium text-white">{size.size}</td>
                            <td className="px-3 py-2 text-center text-sm text-blue-400">{size.male_count}</td>
                            <td className="px-3 py-2 text-center text-sm text-pink-400">{size.female_count}</td>
                            <td className="px-3 py-2 text-center text-sm font-semibold text-white">{size.total}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-gray-600">
                          <td className="px-3 py-2 text-sm font-bold text-white">Total</td>
                          <td className="px-3 py-2 text-center text-sm font-bold text-blue-400">
                            {product.sizes.reduce((sum, s) => sum + s.male_count, 0)}
                          </td>
                          <td className="px-3 py-2 text-center text-sm font-bold text-pink-400">
                            {product.sizes.reduce((sum, s) => sum + s.female_count, 0)}
                          </td>
                          <td className="px-3 py-2 text-center text-sm font-bold text-white">
                            {product.sizes.reduce((sum, s) => sum + s.total, 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'players' && (
            <div className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Roster del Equipo</h3>
                <span className="text-sm text-gray-400">{order.players.length} jugadores</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-300">Jugador</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Número</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Posición</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Talla</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Género</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-300">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.players.map((player) => (
                      <tr key={player.id} className="border-b border-gray-700/50 last:border-0">
                        <td className="px-3 py-2 text-sm font-medium text-white">{player.player_name}</td>
                        <td className="px-3 py-2 text-center text-sm text-gray-300">{player.jersey_number}</td>
                        <td className="px-3 py-2 text-center text-sm text-gray-400">{player.position || '-'}</td>
                        <td className="px-3 py-2 text-center text-sm text-gray-300">{player.size}</td>
                        <td className="px-3 py-2 text-center text-sm">
                          <span className={player.gender === 'M' ? 'text-blue-400' : 'text-pink-400'}>
                            {player.gender === 'M' ? 'M' : 'F'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                              player.payment_status === 'paid'
                                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                                : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                            }`}
                          >
                            {player.payment_status === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Historial de Orden</h3>
              <div className="space-y-4">
                {order.timeline.map((event, idx) => (
                  <div key={event.id} className="relative pl-6 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {idx < order.timeline.length - 1 && (
                      <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-700"></div>
                    )}

                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-[#e21c21] border-2 border-gray-900"></div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="text-sm font-semibold text-white">{event.event}</h4>
                        <span className="text-xs text-gray-500">{event.timestamp}</span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-400">{event.description}</p>
                      )}
                      {event.user && (
                        <p className="text-xs text-gray-500 mt-1">por {event.user}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
