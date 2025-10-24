'use client';

import { formatCLP } from '@/types/payments';

export interface ProductSizeBreakdown {
  product_id: number;
  product_name: string;
  product_type_name?: string; // For the actual product type (e.g., "Camisetas")
  images: string[];
  sizes: {
    size: string;
    quantity: number;
    jersey_numbers: string[];
    player_names: string[];
    player_ids: string[];
    payment_statuses: boolean[];
  }[];
  total_quantity: number;
  unit_price_clp: number;
  total_price_clp: number;
}

interface ProductSizeBreakdownCardProps {
  product: ProductSizeBreakdown;
}

export function ProductSizeBreakdownCard({ product }: ProductSizeBreakdownCardProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="relative p-6">
        {/* Product Image and Name */}
        <div className="flex flex-col items-center mb-6">
          {/* Product Image */}
          {product.images && product.images.length > 0 && (
            <div className="w-32 h-32 rounded-lg bg-gray-700 overflow-hidden mb-3">
              <img
                src={product.images[0]}
                alt={product.product_name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          {/* Product Name */}
          <h3 className="text-lg font-bold text-white text-center">{product.product_name}</h3>
        </div>

        {/* Size Summary */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h4 className="text-sm font-semibold text-blue-300 mb-3">Resumen de Tallas</h4>
          <div className="grid grid-cols-3 gap-3">
            {product.sizes.map((sizeInfo) => (
              <div
                key={sizeInfo.size}
                className="bg-gray-800/50 rounded-lg p-3 text-center border border-gray-700"
              >
                <div className="text-xs text-gray-400 mb-1">Talla {sizeInfo.size}</div>
                <div className="text-2xl font-bold text-white">{sizeInfo.quantity}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {sizeInfo.quantity === 1 ? 'jugador' : 'jugadores'}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-blue-500/20 text-center">
            <span className="text-sm text-gray-400">Total: </span>
            <span className="text-lg font-bold text-blue-400">{product.total_quantity}</span>
            <span className="text-sm text-gray-400"> {product.total_quantity === 1 ? 'jugador' : 'jugadores'}</span>
          </div>
        </div>

        {/* Player Table */}
        <div className="border-t border-gray-700 pt-4">
          {/* Table Header */}
          <div className="grid grid-cols-3 gap-3 pb-3 border-b border-gray-600 mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase">Nombre en {product.product_type_name || product.product_name}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase">Talla</div>
            <div className="text-xs font-semibold text-gray-400 uppercase">Número</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {product.sizes.map((sizeInfo) =>
              sizeInfo.player_names.map((name, nameIndex) => {
                const number = sizeInfo.jersey_numbers[nameIndex];
                return (
                  <div
                    key={`${name}-${sizeInfo.size}-${nameIndex}`}
                    className="grid grid-cols-3 gap-3 py-2 text-sm border-b border-gray-700/50 last:border-0"
                  >
                    <div className="text-gray-300 truncate">{name}</div>
                    <div className="text-gray-300">{sizeInfo.size || 'N/A'}</div>
                    <div className="text-gray-300">{number ? `#${number}` : '-'}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
