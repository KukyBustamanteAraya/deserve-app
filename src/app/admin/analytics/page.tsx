import React from 'react';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import StatCard from '@/components/admin/analytics/StatCard';
import RevenueChart from '@/components/admin/analytics/RevenueChart';
import TopProductsTable from '@/components/admin/analytics/TopProductsTable';

interface AnalyticsData {
  counts: {
    pending: number;
    paid: number;
    cancelled: number;
    total: number;
  };
  revenue7d: {
    day: string;
    totalCents: number;
  }[];
  topProducts: {
    productId: string;
    name: string;
    units: number;
    revenueCents: number;
  }[];
}

async function fetchAnalyticsData(): Promise<AnalyticsData> {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/analytics/summary`,
    {
      headers: {
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store', // Disable Next.js caching
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch analytics data: ${response.status}`);
  }

  return response.json();
}

export default async function AnalyticsPage() {
  await requireAdmin();

  let data: AnalyticsData | null = null;
  let error: string | null = null;

  try {
    data = await fetchAnalyticsData();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load analytics data';
  }

  if (error) {
    return (
      <div className="px-3 sm:px-4 py-4 sm:py-5 md:py-6">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Overview of your store's performance</p>
        </div>

        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 sm:p-4">
          <div className="flex">
            <div className="ml-2 sm:ml-3">
              <h3 className="text-xs sm:text-sm font-medium text-red-300">
                Error loading analytics data
              </h3>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-red-400">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-3 sm:px-4 py-4 sm:py-5 md:py-6">
        <div className="mb-4 sm:mb-5 md:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Overview of your store's performance</p>
        </div>

        <div className="flex items-center justify-center h-48 sm:h-56 md:h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-[#e21c21]"></div>
        </div>
      </div>
    );
  }

  const { counts, revenue7d, topProducts } = data;

  // Calculate total revenue for the last 7 days
  const totalRevenue7d = revenue7d.reduce((sum, day) => sum + day.totalCents, 0);

  return (
    <div className="px-3 sm:px-4 py-4 sm:py-5 md:py-6 space-y-4 sm:space-y-5 md:space-y-6">
      {/* Header */}
      <div className="mb-4 sm:mb-5 md:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Analytics Dashboard</h1>
        <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Overview of your store's performance</p>
      </div>

      {/* Order Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <StatCard
          label="Total Orders"
          value={counts.total}
          color="default"
        />
        <StatCard
          label="Paid Orders"
          value={counts.paid}
          subValue={`${counts.total > 0 ? Math.round((counts.paid / counts.total) * 100) : 0}% of total`}
          color="green"
        />
        <StatCard
          label="Pending Orders"
          value={counts.pending}
          subValue={`${counts.total > 0 ? Math.round((counts.pending / counts.total) * 100) : 0}% of total`}
          color="yellow"
        />
        <StatCard
          label="Cancelled Orders"
          value={counts.cancelled}
          subValue={`${counts.total > 0 ? Math.round((counts.cancelled / counts.total) * 100) : 0}% of total`}
          color="red"
        />
      </div>

      {/* Revenue Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue7d} />
        </div>
        <div className="lg:col-span-1">
          <StatCard
            label="7-Day Revenue"
            value={`$${(totalRevenue7d / 100).toLocaleString('es-CL', { minimumFractionDigits: 0 })}`}
            subValue={`From ${revenue7d.length} days of data`}
            color="blue"
          />
        </div>
      </div>

      {/* Top Products */}
      <div>
        <TopProductsTable products={topProducts} />
      </div>

      {/* Data freshness info */}
      <div className="relative mt-6 sm:mt-7 md:mt-8 p-3 sm:p-4 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="flex items-start relative">
          <div className="flex-shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#e21c21]" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-2 sm:ml-3">
            <h3 className="text-xs sm:text-sm font-medium text-white">Data Information</h3>
            <div className="mt-1 text-xs sm:text-sm text-gray-400">
              <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
                <li>Analytics data is cached for 1 minute for performance</li>
                <li>Revenue data uses America/Sao_Paulo timezone</li>
                <li>Only paid orders are included in revenue and product calculations</li>
                <li>Top products are ranked by total revenue from paid orders</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}