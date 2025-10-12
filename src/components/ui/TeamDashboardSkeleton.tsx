import { Skeleton } from './Skeleton';

/**
 * Skeleton loader for team dashboard
 */
export function TeamDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner skeleton */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latest design card */}
            <div className="bg-white rounded-xl shadow-lg p-8">
              <Skeleton className="h-7 w-48 mb-4" />
              <div className="space-y-4">
                <div className="flex gap-3 mb-6">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <Skeleton className="w-12 h-12 rounded-lg" />
                </div>
                <Skeleton className="h-64 w-full rounded-lg" />
                <div className="flex gap-3">
                  <Skeleton className="h-12 flex-1 rounded-lg" />
                  <Skeleton className="h-12 flex-1 rounded-lg" />
                </div>
              </div>
            </div>

            {/* Team members card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Skeleton className="h-6 w-40 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick actions */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
              </div>
            </div>

            {/* Stats card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <Skeleton className="h-6 w-24 mb-4" />
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
