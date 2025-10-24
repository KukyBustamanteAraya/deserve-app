'use client';

import { formatCLP } from '@/types/payments';
import type { OrderItem } from '@/types/payments';
import Image from 'next/image';

type OrderItemsListProps = {
  items: OrderItem[];
};

export function OrderItemsList({ items }: OrderItemsListProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h3 className="text-lg font-semibold text-white mb-4 relative">
        Artículos del Pedido ({items.length})
      </h3>

      <div className="space-y-4 relative">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
          >
            {/* Product Image */}
            {item.images && item.images.length > 0 && (
              <div className="flex-shrink-0">
                <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-gray-700">
                  <Image
                    src={item.images[0]}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            {/* Item Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h4 className="font-semibold text-white">{item.product_name}</h4>
                  {item.collection && (
                    <p className="text-sm text-gray-300">{item.collection}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-white">{formatCLP(item.line_total_clp || 0)}</div>
                  <div className="text-xs text-gray-400">
                    {formatCLP(item.unit_price_clp)} × {item.quantity}
                  </div>
                </div>
              </div>

              {/* Player Assignment */}
              {item.player_name && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                    <span className="text-sm font-medium text-blue-300">
                      {item.player_name}
                    </span>
                    {item.jersey_number && (
                      <>
                        <span className="text-blue-500">•</span>
                        <span className="text-sm font-bold text-blue-400">
                          #{item.jersey_number}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Customization Details */}
              {item.customization && (
                <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                  {item.customization.size && (
                    <span className="px-2 py-1 bg-gray-700 rounded border border-gray-600">
                      Talla: <span className="font-medium text-white">{item.customization.size}</span>
                    </span>
                  )}
                  {item.customization.position && (
                    <span className="px-2 py-1 bg-gray-700 rounded border border-gray-600">
                      Posición: <span className="font-medium text-white">{item.customization.position}</span>
                    </span>
                  )}
                  {item.customization.additional_notes && (
                    <span className="px-2 py-1 bg-gray-700 rounded border border-gray-600 max-w-xs truncate">
                      Nota: {item.customization.additional_notes}
                    </span>
                  )}
                </div>
              )}

              {/* Size Calculator Badge */}
              {item.used_size_calculator && item.size_calculator_recommendation && (
                <div className="mt-2 text-xs text-purple-300 bg-purple-500/20 px-2 py-1 rounded inline-block border border-purple-500/30">
                  📏 Talla recomendada: {item.size_calculator_recommendation}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="mt-2 text-sm text-gray-300 italic">
                  💬 {item.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-400 relative">
          <p>No hay artículos en este pedido.</p>
        </div>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-700 relative">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-300">Total de Artículos:</span>
            <span className="text-lg font-bold text-white">
              {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm font-medium text-gray-300">Monto Total:</span>
            <span className="text-xl font-bold text-white">
              {formatCLP(items.reduce((sum, item) => sum + (item.line_total_clp || 0), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
