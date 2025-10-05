'use client';

import React from 'react';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import type { ProductListItem } from '@/types/catalog';

interface ProductGridProps {
  items: ProductListItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
  emptyMessage?: string;
  skeletonCount?: number;
}

export function ProductGrid({
  items,
  loading = false,
  error = null,
  onRetry,
  className = '',
  emptyMessage = 'No se encontraron productos',
  skeletonCount = 12,
}: ProductGridProps) {
  // Error state
  if (error && !loading) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-red-500 text-5xl mb-4" role="img" aria-label="Error">
            ⚠️
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Error al cargar productos
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && items.length === 0) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 ${className}`}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (!loading && items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="max-w-md mx-auto">
          <div className="text-gray-400 text-5xl mb-4" role="img" aria-label="Empty">
            📦
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Sin productos
          </h3>
          <p className="text-gray-600">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  // Products grid
  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            priority={index < 4} // Prioritize loading for first 4 images
          />
        ))}
      </div>

      {/* Loading more indicator */}
      {loading && items.length > 0 && (
        <div className="flex justify-center items-center py-8">
          <div className="flex items-center space-x-2 text-gray-600">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
            <span>Cargando más productos...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact grid for smaller spaces
interface CompactProductGridProps {
  items: ProductListItem[];
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
  className?: string;
}

export function CompactProductGrid({
  items,
  maxItems = 6,
  showViewAll = false,
  onViewAll,
  className = '',
}: CompactProductGridProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className={className}>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {displayItems.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {showViewAll && items.length > maxItems && (
        <div className="text-center mt-6">
          <button
            onClick={onViewAll}
            className="inline-flex items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
          >
            Ver todos los productos ({items.length})
          </button>
        </div>
      )}
    </div>
  );
}

// Grid with infinite scroll support
interface InfiniteProductGridProps extends ProductGridProps {
  hasMore?: boolean;
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

export function InfiniteProductGrid({
  items,
  loading = false,
  error = null,
  onRetry,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  className = '',
  emptyMessage = 'No se encontraron productos',
}: InfiniteProductGridProps) {
  const handleLoadMore = () => {
    if (hasMore && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div className={className}>
      <ProductGrid
        items={items}
        loading={loading}
        error={error}
        onRetry={onRetry}
        emptyMessage={emptyMessage}
      />

      {/* Load more button */}
      {hasMore && items.length > 0 && !error && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {loadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cargando...
              </>
            ) : (
              'Cargar más productos'
            )}
          </button>
        </div>
      )}
    </div>
  );
}