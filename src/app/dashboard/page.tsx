'use client';

import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LogoutButton from "./LogoutButton";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user && !redirecting) {
      console.log('Dashboard: Not authenticated, redirecting to login');
      setRedirecting(true);
      router.replace('/login');
    }
  }, [loading, user, router, redirecting]);

  // Show loading state
  if (loading || redirecting) {
    return (
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600">{loading ? 'Loading...' : 'Redirecting...'}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Don't render if no user (prevents flash before redirect)
  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <LogoutButton />
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">
            Welcome, {user.email}!
          </h2>
          <div className="space-y-2 text-gray-600">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Member since:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Quick Actions</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Profile Settings</h3>
                <p className="text-sm text-gray-600">Update your personal information</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <h3 className="font-medium text-gray-900">Account Security</h3>
                <p className="text-sm text-gray-600">Manage your password and security</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
