import { OrderListSkeleton } from '@/components/ui/OrderListSkeleton';

/**
 * Loading state for orders page (server-side)
 * Shown while orders are being fetched
 */
export default function OrdersLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          {/* Title skeleton */}
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* Orders list skeleton */}
        <OrderListSkeleton count={5} />
      </div>
    </main>
  );
}
