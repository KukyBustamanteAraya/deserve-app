// Admin dashboard page
import { redirect } from 'next/navigation';
import { requireAdmin, AdminRequiredError, UserNotFoundError } from '@/lib/auth/requireAdmin';

export default async function AdminPage() {
  try {
    const { user, profile } = await requireAdmin();

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-600">
              Administrative tools and user management
            </p>
          </div>

          {/* Admin Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">
              Admin Information
            </h2>
            <div className="space-y-2 text-gray-600">
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Display Name:</strong> {profile.display_name || 'Not set'}</p>
              <p><strong>Role:</strong> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Admin</span></p>
            </div>
          </div>

          {/* Admin Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                User Management
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Manage user accounts, roles, and permissions
              </p>
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* Team Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Team Management
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                View and manage all teams and invitations
              </p>
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* Product Management */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Product Management
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Add, edit, and manage products in the catalog
              </p>
              <a
                href="/admin/products"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-medium hover:bg-blue-700 text-center block"
              >
                Manage Products
              </a>
            </div>

            {/* Analytics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Analytics
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                View usage statistics and platform metrics
              </p>
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* System Settings */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                System Settings
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Configure platform settings and preferences
              </p>
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Support Tools
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Customer support and troubleshooting tools
              </p>
              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 py-2 px-4 rounded-md font-medium cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Stats
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-sm text-gray-600">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-sm text-gray-600">Active Teams</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-sm text-gray-600">Products</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">-</div>
                <div className="text-sm text-gray-600">Orders</div>
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