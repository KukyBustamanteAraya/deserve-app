// Admin dashboard page
import { redirect } from 'next/navigation';
import { requireAdmin, AdminRequiredError, UserNotFoundError } from '@/lib/auth/requireAdmin';

export default async function AdminPage() {
  try {
    const { user, profile } = await requireAdmin();

    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-400">
              Administrative tools and user management
            </p>
          </div>

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Product Management */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-blue-500/30 p-6 hover:border-blue-500/50 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Product Management
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Add, edit, and manage products in the catalog
              </p>
              <a
                href="/admin/products"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 text-center block transition-all shadow-lg group-hover:shadow-blue-500/50"
              >
                Manage Products
              </a>
            </div>

            {/* Design Requests */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-purple-500/30 p-6 hover:border-purple-500/50 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Design Requests
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Manage and process custom design requests from teams
              </p>
              <a
                href="/admin/design-requests"
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md font-medium hover:bg-purple-700 text-center block transition-all shadow-lg group-hover:shadow-purple-500/50"
              >
                View Requests
              </a>
            </div>

            {/* Design Library */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-pink-500/30 p-6 hover:border-pink-500/50 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Design Library
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Manage design catalog, mockups, and template library
              </p>
              <a
                href="/admin/designs"
                className="w-full bg-pink-600 text-white py-2 px-4 rounded-md font-medium hover:bg-pink-700 text-center block transition-all shadow-lg group-hover:shadow-pink-500/50"
              >
                Manage Designs
              </a>
            </div>

            {/* Analytics */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-green-500/30 p-6 hover:border-green-500/50 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Analytics
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                View usage statistics and platform metrics
              </p>
              <a
                href="/admin/analytics"
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium hover:bg-green-700 text-center block transition-all shadow-lg group-hover:shadow-green-500/50"
              >
                View Analytics
              </a>
            </div>

            {/* Orders */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-orange-500/30 p-6 hover:border-orange-500/50 transition-all group">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Orders
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                View and manage all customer orders
              </p>
              <a
                href="/admin/orders"
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md font-medium hover:bg-orange-700 text-center block transition-all shadow-lg group-hover:shadow-orange-500/50"
              >
                Manage Orders
              </a>
            </div>

            {/* User Management */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-indigo-500/30 p-6 opacity-75">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  User Management
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                Manage user accounts, roles, and permissions
              </p>
              <button
                disabled
                className="w-full bg-gray-700 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* Team Management */}
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-cyan-500/30 p-6 opacity-75">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-white">
                  Team Management
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                View and manage all teams and invitations
              </p>
              <button
                disabled
                className="w-full bg-gray-700 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg shadow-xl border border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">-</div>
                <div className="text-sm text-gray-400">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">-</div>
                <div className="text-sm text-gray-400">Active Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">-</div>
                <div className="text-sm text-gray-400">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">-</div>
                <div className="text-sm text-gray-400">Orders</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

  } catch (error) {
    if (error instanceof AdminRequiredError) {
      redirect('/dashboard?error=admin_required');
    }

    if (error instanceof UserNotFoundError) {
      redirect('/login?error=profile_not_found');
    }

    // For any other authentication errors
    redirect('/login?redirect=/admin');
  }
}

// Metadata
export const metadata = {
  title: 'Admin Dashboard | Deserve',
  description: 'Administrative tools and user management for Deserve platform.',
};