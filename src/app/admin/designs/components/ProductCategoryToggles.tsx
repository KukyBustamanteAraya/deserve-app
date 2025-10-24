'use client';

import { memo } from 'react';
import Link from 'next/link';

interface ProductCategoryTogglesProps {
  productTypeFilter: string;
  uniqueProductTypes: string[];
  onProductTypeChange: (type: string) => void;
  onBulkUpload: () => void;
}

const ProductCategoryToggles = memo(function ProductCategoryToggles({
  productTypeFilter,
  uniqueProductTypes,
  onProductTypeChange,
  onBulkUpload,
}: ProductCategoryTogglesProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Category Toggles */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <button
            onClick={() => onProductTypeChange('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              productTypeFilter === 'all'
                ? 'bg-[#e21c21] text-white'
                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700'
            }`}
          >
            All
          </button>
          {uniqueProductTypes.map((type) => (
            <button
              key={type}
              onClick={() => onProductTypeChange(type)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium capitalize transition-all ${
                productTypeFilter === type
                  ? 'bg-[#e21c21] text-white'
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 border border-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onBulkUpload}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-700/50 text-white rounded-lg text-xs sm:text-sm font-medium transition-all hover:bg-gray-700 border border-gray-600 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Bulk Upload
          </button>
          <Link
            href="/admin/designs/new"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-[#e21c21] text-white rounded-lg text-xs sm:text-sm font-medium transition-all hover:bg-[#c11a1e] flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Design
          </Link>
        </div>
      </div>
    </div>
  );
});

export default ProductCategoryToggles;
