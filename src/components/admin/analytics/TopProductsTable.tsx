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
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M20 6L9 17l11 11m0-22v22m0-22l11 11L20 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="text-gray-500">No product sales data available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Units Sold
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product, index) => (
              <tr key={product.productId} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                    #{index + 1}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="text-sm font-medium text-gray-900">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {product.productId.slice(0, 8)}...
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm text-gray-900">
                    {product.units.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">units</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right">
                  <div className="text-sm font-medium text-gray-900">
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
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-700">
            📈 Showing top {products.length} product{products.length !== 1 ? 's' : ''} by revenue from paid orders.
          </p>
        </div>
      )}
    </div>
  );
}