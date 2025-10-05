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

        {/* Admin Section - Only visible to admins */}
        {profile?.role === 'admin' && (
          <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200 p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 text-blue-900">Admin Panel</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a href="/admin/products" className="block p-4 border border-blue-300 bg-white rounded-lg hover:bg-blue-50">
                <h3 className="font-medium text-blue-900">Manage Products</h3>
                <p className="text-sm text-blue-700">View and edit all products</p>
              </a>
              <a href="/admin/products/new" className="block p-4 border border-blue-300 bg-white rounded-lg hover:bg-blue-50">
                <h3 className="font-medium text-blue-900">Add New Product</h3>
                <p className="text-sm text-blue-700">Create a new product</p>
              </a>
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