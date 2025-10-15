'use client';

import { useState } from 'react';
import Link from 'next/link';

interface UserTeam {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface UserSummary {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  team_count: number;
  teams: UserTeam[];
  order_count: number;
  completed_order_count: number;
  total_spent_cents: number;
}

interface UserDetailModalProps {
  user: UserSummary;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export default function UserDetailModal({ user, isOpen, onClose, onRefresh }: UserDetailModalProps) {
  const [updatingAdmin, setUpdatingAdmin] = useState(false);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleToggleAdmin = async () => {
    if (!confirm(`Are you sure you want to ${user.is_admin ? 'remove' : 'grant'} admin privileges for ${user.email}?`)) {
      return;
    }

    setUpdatingAdmin(true);
    try {
      const response = await fetch('/api/admin/users/toggle-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isAdmin: !user.is_admin }),
      });

      if (response.ok) {
        alert('Admin status updated successfully!');
        onRefresh();
        onClose();
      } else {
        alert('Failed to update admin status');
      }
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Error updating admin status');
    } finally {
      setUpdatingAdmin(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 flex items-center justify-center">
        <div className="relative w-full max-w-4xl h-full bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-700 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#e21c21]/20 to-[#a01519]/20 flex items-center justify-center flex-shrink-0 border-2 border-[#e21c21]/30">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || user.email}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[#e21c21] font-bold text-3xl">
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-2xl font-black text-white truncate">
                      {user.full_name || user.email}
                    </h2>
                    {user.is_admin && (
                      <span className="px-3 py-1 bg-[#e21c21]/20 text-[#e21c21] text-sm font-semibold rounded-lg border border-[#e21c21]/50">
                        ADMIN
                      </span>
                    )}
                  </div>
                  {user.full_name && (
                    <p className="text-gray-400 mb-1">{user.email}</p>
                  )}
                  <p className="text-gray-500 text-sm">
                    Joined {formatDate(user.created_at)}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Teams</div>
                <div className="text-white font-bold text-xl">{user.team_count}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Total Orders</div>
                <div className="text-white font-bold text-xl">{user.order_count}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Completed</div>
                <div className="text-green-500 font-bold text-xl">{user.completed_order_count}</div>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs">Total Spent</div>
                <div className="text-green-500 font-bold text-xl">{formatCurrency(user.total_spent_cents)}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Teams Section */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4">
                Teams ({user.teams.length})
              </h3>
              {user.teams.length > 0 ? (
                <div className="space-y-3">
                  {user.teams.map((team) => (
                    <Link
                      key={team.id}
                      href={`/admin/clients`}
                      className="block bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl p-4 hover:border-[#e21c21]/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-white font-semibold">{team.name}</h4>
                          <p className="text-gray-400 text-sm">/{team.slug}</p>
                        </div>
                        <span className="px-3 py-1 bg-gray-700/50 text-gray-300 text-xs font-semibold rounded-lg">
                          {team.role}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Not a member of any teams
                </div>
              )}
            </div>

            {/* Admin Actions */}
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl font-bold text-white mb-4">Admin Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={handleToggleAdmin}
                  disabled={updatingAdmin}
                  className={`w-full px-4 py-3 rounded-lg font-semibold transition-all ${
                    user.is_admin
                      ? 'bg-red-500/90 hover:bg-red-500 text-white'
                      : 'bg-green-500/90 hover:bg-green-500 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {updatingAdmin ? 'Updating...' : user.is_admin ? 'Remove Admin Privileges' : 'Grant Admin Privileges'}
                </button>

                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="text-yellow-500 font-semibold text-sm">Warning</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Admin users have full access to all features including user management, products, and settings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
