'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export default function DeleteAccountButton({ user }: { user: User }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
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

  return (
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
  );
}
