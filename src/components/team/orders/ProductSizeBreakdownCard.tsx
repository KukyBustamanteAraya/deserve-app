'use client';

import { formatCLP } from '@/types/payments';

export interface ProductSizeBreakdown {
  product_id: number;
  product_name: string;
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

        {/* Player Table */}
        <div className="border-t border-gray-700 pt-4">
          {/* Table Header */}
          <div className="grid grid-cols-5 gap-3 pb-3 border-b border-gray-600 mb-3">
            <div className="text-xs font-semibold text-gray-400 uppercase">Jugador</div>
            <div className="text-xs font-semibold text-gray-400 uppercase">Nombre en {product.product_name}</div>
            <div className="text-xs font-semibold text-gray-400 uppercase">Talla</div>
            <div className="text-xs font-semibold text-gray-400 uppercase">Número</div>
            <div className="text-xs font-semibold text-gray-400 uppercase text-center">Pago</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {product.sizes.map((sizeInfo) =>
              sizeInfo.player_names.map((name, nameIndex) => {
                const number = sizeInfo.jersey_numbers[nameIndex];
                const hasPaid = sizeInfo.payment_statuses[nameIndex];
                return (
                  <div
                    key={`${name}-${sizeInfo.size}-${nameIndex}`}
                    className="grid grid-cols-5 gap-3 py-2 text-sm border-b border-gray-700/50 last:border-0"
                  >
                    <div className="text-gray-300 truncate">{name}</div>
                    <div className="text-gray-300 truncate">{name}</div>
                    <div className="text-gray-300">{sizeInfo.size || 'N/A'}</div>
                    <div className="text-gray-300">{number ? `#${number}` : '-'}</div>
                    <div className="text-center">
                      {hasPaid ? (
                        <span className="text-green-400 font-bold">✓</span>
                      ) : (
                        <span className="text-red-400 font-bold">✗</span>
                      )}
                    </div>
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
