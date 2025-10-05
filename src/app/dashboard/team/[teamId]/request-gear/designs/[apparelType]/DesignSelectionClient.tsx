'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Product {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  thumbnail_url: string | null;
  thumbnail_alt: string;
}

interface DesignSelectionClientProps {
  teamId: string;
  teamName: string;
  apparelType: string;
  apparelName: string;
  products: Product[];
}

export function DesignSelectionClient({
  teamId,
  teamName,
  apparelType,
  apparelName,
  products,
}: DesignSelectionClientProps) {
  const [selectedDesign, setSelectedDesign] = useState<string | null>(null);

  const handleSelectDesign = (productId: string) => {
    setSelectedDesign(productId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/dashboard/team/${teamId}/request-gear`}
              className="text-sm text-blue-600 hover:text-blue-800 inline-block mb-2"
            >
              ← Back to Gear Request
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              Select Design for {apparelName}
            </h1>
            <p className="text-gray-600 mt-1">Team: {teamName}</p>
          </div>
        </div>

        {/* Design Grid */}
        <div className="bg-white p-6 rounded-lg shadow">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No designs available for this sport yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectDesign(product.id)}
                  className={`group relative rounded-lg overflow-hidden border-2 transition-all ${
                    selectedDesign === product.id
                      ? 'border-blue-500 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  {/* Product Image */}
                  <div className="aspect-[3/4] bg-gray-100">
                    {product.thumbnail_url ? (
                      <img
                        src={product.thumbnail_url}
                        alt={product.thumbnail_alt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 text-gray-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Product Name and Price */}
                  <div className="p-3 bg-white">
                    <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                    <p className="text-xs text-gray-600 mt-1">${(product.price_cents / 100).toFixed(2)}</p>
                  </div>

                  {/* Selected Indicator */}
                  {selectedDesign === product.id && (
                    <div className="absolute top-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={3}
                        stroke="currentColor"
                        className="w-5 h-5 text-white"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {selectedDesign && (
          <div className="flex justify-end gap-3 bg-white p-4 rounded-lg shadow sticky bottom-6">
            <Link
              href={`/dashboard/team/${teamId}/request-gear`}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
            <Link
              href={`/dashboard/team/${teamId}/request-gear?${apparelType}=${selectedDesign}`}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Confirm Selection
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
