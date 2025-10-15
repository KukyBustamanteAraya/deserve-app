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
    <div className="mt-8 pt-6 border-t-2 border-gray-700 relative">
      <div className="relative bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 backdrop-blur-sm rounded-lg p-6 border-2 border-red-500/50 shadow-lg shadow-red-500/20 overflow-hidden group/danger">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover/danger:opacity-100 transition-opacity pointer-events-none"></div>
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2 relative">
          <span>⚠️</span>
          Danger Zone
        </h2>
        <p className="text-sm text-gray-300 mb-4 relative">
          Once you delete your account, there is no going back. This action cannot be undone.
          All your data including teams, memberships, and submissions will be permanently deleted.
        </p>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="relative bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 backdrop-blur-md hover:from-red-700/90 hover:via-red-800/80 hover:to-red-900/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded border border-red-500/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/delete"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">{deleting ? 'Deleting Account...' : 'Delete Account Permanently'}</span>
        </button>
      </div>
    </div>
  );
}
