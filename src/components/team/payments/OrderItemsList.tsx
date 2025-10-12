'use client';

import { formatCLP } from '@/types/payments';
import type { OrderItem } from '@/types/payments';
import Image from 'next/image';

type OrderItemsListProps = {
  items: OrderItem[];
};

export function OrderItemsList({ items }: OrderItemsListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Artículos del Pedido ({items.length})
      </h3>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
          >
            {/* Product Image */}
            {item.images && item.images.length > 0 && (
              <div className="flex-shrink-0">
                <div className="w-20 h-20 relative rounded-lg overflow-hidden bg-gray-200">
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
                  <h4 className="font-semibold text-gray-900">{item.product_name}</h4>
                  {item.collection && (
                    <p className="text-sm text-gray-600">{item.collection}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-gray-900">{formatCLP(item.line_total_cents || 0)}</div>
                  <div className="text-xs text-gray-600">
                    {formatCLP(item.unit_price_cents)} × {item.quantity}
                  </div>
                </div>
              </div>

              {/* Player Assignment */}
              {item.player_name && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-200">
                    <span className="text-sm font-medium text-blue-900">
                      {item.player_name}
                    </span>
                    {item.jersey_number && (
                      <>
                        <span className="text-blue-400">•</span>
                        <span className="text-sm font-bold text-blue-700">
                          #{item.jersey_number}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Customization Details */}
              {item.customization && (
                <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                  {item.customization.size && (
                    <span className="px-2 py-1 bg-white rounded border border-gray-200">
                      Talla: <span className="font-medium text-gray-900">{item.customization.size}</span>
                    </span>
                  )}
                  {item.customization.position && (
                    <span className="px-2 py-1 bg-white rounded border border-gray-200">
                      Posición: <span className="font-medium text-gray-900">{item.customization.position}</span>
                    </span>
                  )}
                  {item.customization.additional_notes && (
                    <span className="px-2 py-1 bg-white rounded border border-gray-200 max-w-xs truncate">
                      Nota: {item.customization.additional_notes}
                    </span>
                  )}
                </div>
              )}

              {/* Size Calculator Badge */}
              {item.used_size_calculator && item.size_calculator_recommendation && (
                <div className="mt-2 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded inline-block">
                  📏 Talla recomendada: {item.size_calculator_recommendation}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="mt-2 text-sm text-gray-600 italic">
                  💬 {item.notes}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No hay artículos en este pedido.</p>
        </div>
      )}

      {/* Summary */}
      {items.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total de Artículos:</span>
            <span className="text-lg font-bold text-gray-900">
              {items.reduce((sum, item) => sum + item.quantity, 0)} unidades
            </span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm font-medium text-gray-700">Monto Total:</span>
            <span className="text-xl font-bold text-gray-900">
              {formatCLP(items.reduce((sum, item) => sum + (item.line_total_cents || 0), 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
