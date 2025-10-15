import { ProductGridSkeleton } from '@/components/ui/ProductCardSkeleton';

/**
 * Loading state for catalog page (server-side)
 * Shown while initial products are being fetched
 */
export default function CatalogLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Title skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* Product grid skeleton */}
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
