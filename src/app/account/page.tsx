'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const supabase = getBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
    setLoading(false);
  }

  async function handleSignOut() {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleDeleteAccount() {
    if (!user) return;

    const confirmMessage = `⚠️ WARNING: This will permanently delete your account and all associated data!\n\nThis includes:\n- Your profile\n- Team memberships\n- Player information submissions\n- All other account data\n\nType "${user.email}" to confirm deletion:`;

    const confirmation = prompt(confirmMessage);

    if (confirmation !== user.email) {
      if (confirmation !== null) {
        alert('Email did not match. Account deletion cancelled.');
      }
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to delete account');
      }

      alert('Account deleted successfully. You will be redirected to the login page.');

      // Use window.location instead of router.push to force a full page reload
      // This ensures all cookies and state are cleared properly
      window.location.href = '/login';
    } catch (error: any) {
      console.error('Delete account error:', error);
      alert(`Failed to delete account: ${error.message}`);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600 mb-4">Loading account...</div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-3xl font-bold text-gray-900">Account</h1>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Sign out
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">User ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{user.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(user.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Last sign in</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleDateString()
                      : 'N/A'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Authentication Details
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t-2 border-red-200">
              <div className="bg-red-50 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <span>⚠️</span>
                  Danger Zone
                </h2>
                <p className="text-sm text-red-700 mb-4">
                  Once you delete your account, there is no going back. This action cannot be undone.
                  All your data including teams, memberships, and submissions will be permanently deleted.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {deleting ? 'Deleting Account...' : 'Delete Account Permanently'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
