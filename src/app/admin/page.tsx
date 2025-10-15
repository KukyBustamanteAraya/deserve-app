// Admin dashboard page
import { redirect } from 'next/navigation';
import { requireAdmin, AdminRequiredError, UserNotFoundError } from '@/lib/auth/requireAdmin';

export default async function AdminPage() {
  try {
    const { user, profile } = await requireAdmin();

    return (
      <div className="min-h-screen">
        {/* Admin Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4 md:gap-6">
          {/* Clients */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 sm:p-5 md:p-6 shadow-2xl group hover:border-[#e21c21]/50 transition-all">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3 min-h-[20px] sm:min-h-[28px]">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#e21c21] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="text-sm sm:text-lg font-semibold text-white leading-none">
                Clients
              </h3>
            </div>
            <p className="text-gray-400 text-[10px] leading-tight sm:text-sm mb-2 sm:mb-4 relative">
              Manage teams, orders, and design requests
            </p>
            <a
              href="/admin/clients"
              className="relative w-full bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg font-semibold text-center block transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-[10px] sm:text-sm"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Manage Clients</span>
            </a>
          </div>

          {/* Product Management */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 sm:p-5 md:p-6 shadow-2xl group hover:border-[#e21c21]/50 transition-all">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3 min-h-[20px] sm:min-h-[28px]">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#e21c21] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <h3 className="text-sm sm:text-lg font-semibold text-white leading-none">
                Product Management
              </h3>
            </div>
            <p className="text-gray-400 text-[10px] leading-tight sm:text-sm mb-2 sm:mb-4 relative">
              Add, edit, and manage products in the catalog
            </p>
            <a
              href="/admin/products"
              className="relative w-full bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg font-semibold text-center block transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-[10px] sm:text-sm"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Manage Products</span>
            </a>
          </div>

          {/* Design Library */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 sm:p-5 md:p-6 shadow-2xl group hover:border-[#e21c21]/50 transition-all">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3 min-h-[20px] sm:min-h-[28px]">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#e21c21] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3 className="text-sm sm:text-lg font-semibold text-white leading-none">
                Design Library
              </h3>
            </div>
            <p className="text-gray-400 text-[10px] leading-tight sm:text-sm mb-2 sm:mb-4 relative">
              Manage design catalog, mockups, and template library
            </p>
            <a
              href="/admin/designs"
              className="relative w-full bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg font-semibold text-center block transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-[10px] sm:text-sm"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Manage Designs</span>
            </a>
          </div>

          {/* Analytics */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 sm:p-5 md:p-6 shadow-2xl group hover:border-[#e21c21]/50 transition-all">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3 min-h-[20px] sm:min-h-[28px]">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#e21c21] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-sm sm:text-lg font-semibold text-white leading-none">
                Analytics
              </h3>
            </div>
            <p className="text-gray-400 text-[10px] leading-tight sm:text-sm mb-2 sm:mb-4 relative">
              View usage statistics and platform metrics
            </p>
            <a
              href="/admin/analytics"
              className="relative w-full bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg font-semibold text-center block transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-[10px] sm:text-sm"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">View Analytics</span>
            </a>
          </div>

          {/* User Management */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 sm:p-5 md:p-6 shadow-2xl group hover:border-[#e21c21]/50 transition-all">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3 min-h-[20px] sm:min-h-[28px]">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#e21c21] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-sm sm:text-lg font-semibold text-white leading-none">
                User Management
              </h3>
            </div>
            <p className="text-gray-400 text-[10px] leading-tight sm:text-sm mb-2 sm:mb-4 relative">
              Manage user accounts, roles, and permissions
            </p>
            <a
              href="/admin/users"
              className="relative w-full bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg font-semibold text-center block transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-[10px] sm:text-sm"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Manage Users</span>
            </a>
          </div>

          {/* Theme Manager */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-3 sm:p-5 md:p-6 shadow-2xl group hover:border-[#e21c21]/50 transition-all">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative flex items-center gap-1 sm:gap-2 mb-1.5 sm:mb-3 min-h-[20px] sm:min-h-[28px]">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-[#e21c21] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3 className="text-sm sm:text-lg font-semibold text-white leading-none">
                Theme Manager
              </h3>
            </div>
            <p className="text-gray-400 text-[10px] leading-tight sm:text-sm mb-2 sm:mb-4 relative">
              Customize logos, banners, and sport icons
            </p>
            <a
              href="/admin/theme"
              className="relative w-full bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white py-1.5 px-2.5 sm:py-2 sm:px-4 rounded-lg font-semibold text-center block transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn text-[10px] sm:text-sm"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Manage Theme</span>
            </a>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative mt-3 sm:mt-5 md:mt-6 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 p-3 sm:p-5 md:p-6 group">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <h3 className="text-sm sm:text-lg font-semibold text-white mb-2 sm:mb-4 relative">
            Quick Stats
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 relative">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">-</div>
              <div className="text-[10px] sm:text-sm text-gray-400">Total Users</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">-</div>
              <div className="text-[10px] sm:text-sm text-gray-400">Active Teams</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">-</div>
              <div className="text-[10px] sm:text-sm text-gray-400">Products</div>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">-</div>
              <div className="text-[10px] sm:text-sm text-gray-400">Orders</div>
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

    redirect('/login?redirect=/admin');
  }
}

export const metadata = {
  title: 'Admin Dashboard | Deserve',
  description: 'Administrative tools and user management for Deserve platform.',
};
