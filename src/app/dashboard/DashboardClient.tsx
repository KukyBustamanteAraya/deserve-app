'use client';

import React from 'react';
import LogoutButton from './LogoutButton';
import type { UserProfile } from '@/types/user';

type Props = {
  user: { id: string; email?: string | null; created_at?: string | null } | null;
  profile: UserProfile | null;
};

export default function DashboardClient({ user, profile }: Props) {
  if (!user) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#e21c21] mb-4"></div>
              <p className="text-gray-300">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get display name with fallback logic
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Configuración</h1>
          <LogoutButton />
        </div>

        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6 mb-6">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <h2 className="text-2xl font-bold text-white relative text-center">
            Welcome, {displayName}!
          </h2>
        </div>

        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6 mb-6">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <h2 className="text-xl font-semibold mb-4 text-white relative">Quick Actions</h2>
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <a href="/dashboard/account" className="relative block p-6 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm hover:border-[#e21c21]/50 transition-all overflow-hidden group/card" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="font-medium text-white relative">Profile Settings</h3>
                <p className="text-sm text-gray-400 relative">Update your personal information</p>
              </a>
              <a href="/mi-equipo" className="relative block p-6 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm hover:border-[#e21c21]/50 transition-all overflow-hidden group/card" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="font-medium text-white relative">Team Management</h3>
                <p className="text-sm text-gray-400 relative">Create or join teams</p>
              </a>
              <a href="/dashboard/security" className="relative block p-6 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm hover:border-[#e21c21]/50 transition-all overflow-hidden group/card" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="font-medium text-white relative">Account Security</h3>
                <p className="text-sm text-gray-400 relative">Manage your password and security</p>
              </a>
              <a href="/cart" className="relative block p-6 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm hover:border-[#e21c21]/50 transition-all overflow-hidden group/card" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="font-medium text-white relative">Shopping Cart</h3>
                <p className="text-sm text-gray-400 relative">View your cart items</p>
              </a>
              <a href="/orders" className="relative block p-6 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm hover:border-[#e21c21]/50 transition-all overflow-hidden group/card" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="font-medium text-white relative">My Orders</h3>
                <p className="text-sm text-gray-400 relative">View order history</p>
              </a>
              <a href="/dashboard/addresses" className="relative block p-6 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm hover:border-[#e21c21]/50 transition-all overflow-hidden group/card" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="font-medium text-white relative">Shipping Addresses</h3>
                <p className="text-sm text-gray-400 relative">Manage delivery addresses</p>
              </a>
            </div>
          </div>
        </div>

        {/* Admin Portal Entry - Only visible to admins */}
        {profile?.is_admin === true && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border-2 border-[#e21c21]/50 rounded-lg shadow-2xl shadow-[#e21c21]/20 overflow-hidden group p-8 mb-6">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#e21c21]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex items-start justify-between mb-6 relative">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-white">Admin Portal</h2>
                </div>
                <p className="text-gray-300 text-sm">
                  Access administrative tools, manage products, view analytics, and oversee platform operations
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#e21c21]/20 text-[#e21c21] border border-[#e21c21]/50 backdrop-blur-sm">
                ADMIN ACCESS
              </span>
            </div>

            <a
              href="/admin"
              className="relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
              <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="relative">Enter Admin Dashboard</span>
              <svg className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform duration-200 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            <div className="mt-6 pt-6 border-t border-gray-700 relative">
              <p className="text-xs text-gray-400 mb-3 font-semibold uppercase">Quick Links:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <a href="/admin/products" className="text-sm text-gray-300 hover:text-[#e21c21] hover:underline font-medium transition-colors">
                  → Products
                </a>
                <a href="/admin/analytics" className="text-sm text-gray-300 hover:text-[#e21c21] hover:underline font-medium transition-colors">
                  → Analytics
                </a>
                <a href="/admin/orders" className="text-sm text-gray-300 hover:text-[#e21c21] hover:underline font-medium transition-colors">
                  → Orders
                </a>
                <a href="/admin/design-requests" className="text-sm text-gray-300 hover:text-[#e21c21] hover:underline font-medium transition-colors">
                  → Design Requests
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}