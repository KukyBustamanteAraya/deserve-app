import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for individual order card
 */
export function OrderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="space-y-3 mb-4">
        {/* Order items */}
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex gap-3 p-2">
            <Skeleton className="w-16 h-16 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4 border-t">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  );
}

/**
 * List of order card skeletons
 */
export function OrderListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <OrderCardSkeleton key={i} />
      ))}
    </div>
  );
}
