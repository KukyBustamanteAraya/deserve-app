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
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get display name with fallback logic
  const displayName = profile?.display_name || user.email?.split('@')[0] || 'User';

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Welcome, {displayName}!
          </h2>
          <div className="space-y-2 text-gray-600">
            {profile?.display_name && (
              <p><strong>Display Name:</strong> {profile.display_name}</p>
            )}
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Member since:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        {/* Admin Portal Entry - Only visible to admins */}
        {profile?.role === 'admin' && (
          <div className="bg-gradient-to-br from-red-50 to-gray-50 rounded-lg shadow-md border-2 border-red-200 p-8 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <h2 className="text-2xl font-bold text-red-900">Admin Portal</h2>
                </div>
                <p className="text-gray-700 text-sm">
                  Access administrative tools, manage products, view analytics, and oversee platform operations
                </p>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
                ADMIN ACCESS
              </span>
            </div>

            <a
              href="/admin"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:from-red-700 hover:to-red-800 overflow-hidden"
            >
              <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Enter Admin Dashboard</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>

            <div className="mt-6 pt-6 border-t border-red-200">
              <p className="text-xs text-gray-600 mb-3 font-semibold">Quick Links:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <a href="/admin/products" className="text-sm text-red-700 hover:text-red-900 hover:underline font-medium">
                  → Products
                </a>
                <a href="/admin/analytics" className="text-sm text-red-700 hover:text-red-900 hover:underline font-medium">
                  → Analytics
                </a>
                <a href="/admin/orders" className="text-sm text-red-700 hover:text-red-900 hover:underline font-medium">
                  → Orders
                </a>
                <a href="/admin/design-requests" className="text-sm text-red-700 hover:text-red-900 hover:underline font-medium">
                  → Design Requests
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Quick Actions</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a href="/dashboard/account" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Profile Settings</h3>
                <p className="text-sm text-gray-600">Update your personal information</p>
              </a>
              <a href="/dashboard/team" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Team Management</h3>
                <p className="text-sm text-gray-600">Create or join teams</p>
              </a>
              <a href="/dashboard/security" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Account Security</h3>
                <p className="text-sm text-gray-600">Manage your password and security</p>
              </a>
              <a href="/catalog" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Browse Catalog</h3>
                <p className="text-sm text-gray-600">Explore our products</p>
              </a>
              <a href="/cart" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Shopping Cart</h3>
                <p className="text-sm text-gray-600">View your cart items</p>
              </a>
              <a href="/orders" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">My Orders</h3>
                <p className="text-sm text-gray-600">View order history</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}