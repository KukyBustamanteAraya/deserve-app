'use client';

import React from 'react';

interface TopProduct {
  productId: string;
  name: string;
  units: number;
  revenueCents: number;
}

interface Props {
  products: TopProduct[];
}

export default function TopProductsTable({ products }: Props) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('es-CL', { minimumFractionDigits: 0 })}`;
  };

  if (products.length === 0) {
    return (
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-6 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h3 className="text-lg font-semibold text-white mb-4 relative">Top Products</h3>
        <div className="text-center py-8 relative">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12 text-gray-600" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M20 6L9 17l11 11m0-22v22m0-22l11 11L20 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-gray-400">No product sales data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl p-6 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h3 className="text-lg font-semibold text-white mb-4 relative">Top Products</h3>
      <div className="overflow-x-auto relative">
        <table className="min-w-full">
          <thead className="bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Units Sold
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {products.map((product, index) => (
              <tr key={product.productId} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#e21c21]/20 text-[#e21c21] text-sm font-medium border border-[#e21c21]/50">
                    #{index + 1}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-white">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {product.productId.slice(0, 8)}...
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-white">
                    {product.units.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">units</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-medium text-white">
                    {formatCurrency(product.revenueCents)}
                  </div>
                  <div className="text-xs text-gray-500">revenue</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {products.length < 5 && (
        <div className="mt-4 p-3 bg-[#e21c21]/10 border border-[#e21c21]/30 rounded-md relative">
          <p className="text-sm text-[#e21c21]">
            📈 Showing top {products.length} product{products.length !== 1 ? 's' : ''} by revenue from paid orders.
          </p>
        </div>
      )}
    </div>
  );
}