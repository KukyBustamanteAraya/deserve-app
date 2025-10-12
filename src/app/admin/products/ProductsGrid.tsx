'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DeleteButton } from './DeleteButton';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  status: string;
  hero_path: string | null;
  hero_url: string | null;
  sport_id?: string;
  sport_ids: number[];
  sports?: { name: string };
  sport_names?: string[];
}

interface ProductsGridProps {
  products: Product[];
}

export default function ProductsGrid({ products }: ProductsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Simple search filter
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="text-gray-400 mt-1">Manage your product catalog</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all shadow-lg hover:shadow-blue-500/50 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Product
        </Link>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500"
        />
      </div>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-12 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">No products found</h3>
          <p className="text-gray-400 mb-6">
            {searchQuery ? 'Try adjusting your search query' : 'Get started by creating your first product'}
          </p>
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-6 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-bold text-xl text-white">{product.name}</h3>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        product.status === 'active'
                          ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                          : product.status === 'draft'
                          ? 'bg-gray-500/20 text-gray-300 border border-gray-500/50'
                          : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                      }`}
                    >
                      {product.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                    <span>/{product.slug}</span>
                    <span>•</span>
                    <span className="capitalize">{product.category}</span>
                    {product.sport_names && product.sport_names.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-2">
                          {product.sport_names.map((sportName, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50"
                            >
                              {sportName}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="text-2xl font-bold text-blue-400">
                    ${product.price_cents.toLocaleString()} CLP
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/${product.id}/edit`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Edit
                  </Link>
                  <DeleteButton productId={product.id} productName={product.name} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
