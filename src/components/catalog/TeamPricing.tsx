'use client';

import React, { useState } from 'react';
import { usePricing } from '@/hooks/usePricing';
import { formatCLPInteger } from '@/lib/currency';

interface Bundle {
  id: number;
  code: string;
  name: string;
  discount_pct: number;
}

interface TeamPricingProps {
  productId: number;
  bundles?: Bundle[];
}

export function TeamPricing({ productId, bundles = [] }: TeamPricingProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedBundle, setSelectedBundle] = useState<string>('');

  const { data, isLoading, error } = usePricing({
    productId,
    quantity,
    bundleCode: selectedBundle || undefined,
  });

  return (
    <div className="bg-gray-50 p-6 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Precios para Equipos</h3>

      {/* Quantity Input */}
      <div>
        <label htmlFor="team-quantity" className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad
        </label>
        <input
          id="team-quantity"
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        />
      </div>

      {/* Bundle Selector */}
      {bundles.length > 0 && (
        <div>
          <label htmlFor="bundle-select" className="block text-sm font-medium text-gray-700 mb-2">
            Paquete (opcional)
          </label>
          <select
            id="bundle-select"
            value={selectedBundle}
            onChange={(e) => setSelectedBundle(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
          >
            <option value="">Sin paquete</option>
            {bundles.map((bundle) => (
              <option key={bundle.code} value={bundle.code}>
                {bundle.name} ({bundle.discount_pct}% descuento)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pricing Display */}
      <div className="border-t border-gray-200 pt-4 space-y-3">
        {isLoading && (
          <div className="text-sm text-gray-500">Calculando...</div>
        )}

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        {data && !isLoading && (
          <>
            {/* Unit Price */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Precio unitario:</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCLPInteger(data.unit_price)}
              </span>
            </div>

            {/* Bundle Discount */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Descuento paquete:</span>
              <span className="text-sm font-medium text-gray-900">
                {data.discount_pct || 0}%
              </span>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <span className="text-base font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-red-600">
                {formatCLPInteger(data.total)}
              </span>
            </div>

            {/* Quantity Info */}
            <div className="text-xs text-gray-500">
              {quantity} {quantity === 1 ? 'unidad' : 'unidades'} × {formatCLPInteger(data.unit_price)}
              {data.discount_pct && data.discount_pct > 0 && (
                <> - {data.discount_pct}% descuento</>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
