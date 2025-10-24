'use client';

import { useEffect, useState } from 'react';
import UserDetailModal from './UserDetailModal';

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
  user_type?: 'player' | 'manager' | 'athletic_director' | 'hybrid' | null;
  created_at: string;
  updated_at: string;
  team_count: number;
  teams: UserTeam[];
  order_count: number;
  completed_order_count: number;
  total_spent_cents: number;
}

interface Stats {
  total_users: number;
  admin_users: number;
  users_with_teams: number;
  users_with_orders: number;
}

export default function UsersClient() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'admin' | 'with_teams' | 'with_orders' | 'player' | 'manager' | 'athletic_director' | 'hybrid'>('all');
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterType]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(term) ||
        user.full_name?.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'admin':
        filtered = filtered.filter(u => u.is_admin);
        break;
      case 'with_teams':
        filtered = filtered.filter(u => u.team_count > 0);
        break;
      case 'with_orders':
        filtered = filtered.filter(u => u.order_count > 0);
        break;
      case 'player':
        filtered = filtered.filter(u => u.user_type === 'player');
        break;
      case 'manager':
        filtered = filtered.filter(u => u.user_type === 'manager');
        break;
      case 'athletic_director':
        filtered = filtered.filter(u => u.user_type === 'athletic_director');
        break;
      case 'hybrid':
        filtered = filtered.filter(u => u.user_type === 'hybrid');
        break;
    }

    setFilteredUsers(filtered);
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getUserTypeBadge = (userType?: 'player' | 'manager' | 'athletic_director' | 'hybrid' | null) => {
    if (!userType) return null;

    const badges = {
      player: { label: 'PLAYER', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50' },
      manager: { label: 'MANAGER', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50' },
      athletic_director: { label: 'ATHLETIC DIR', color: 'bg-green-500/20 text-green-400 border-green-500/50' },
      hybrid: { label: 'HYBRID', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' },
    };

    const badge = badges[userType];
    return badge ? (
      <span className={`px-1.5 sm:px-2 py-0.5 ${badge.color} text-[10px] sm:text-xs font-semibold rounded border whitespace-nowrap`}>
        {badge.label}
      </span>
    ) : null;
  };

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl">
            <div className="text-gray-400 text-[10px] sm:text-xs mb-0.5">Total Users</div>
            <div className="text-white font-bold text-base sm:text-lg md:text-xl">{stats.total_users}</div>
          </div>
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl">
            <div className="text-gray-400 text-[10px] sm:text-xs mb-0.5">Admins</div>
            <div className="text-[#e21c21] font-bold text-base sm:text-lg md:text-xl">{stats.admin_users}</div>
          </div>
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl">
            <div className="text-gray-400 text-[10px] sm:text-xs mb-0.5">With Teams</div>
            <div className="text-blue-400 font-bold text-base sm:text-lg md:text-xl">{stats.users_with_teams}</div>
          </div>
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl">
            <div className="text-gray-400 text-[10px] sm:text-xs mb-0.5">With Orders</div>
            <div className="text-green-400 font-bold text-base sm:text-lg md:text-xl">{stats.users_with_orders}</div>
          </div>
        </div>
      )}

      {/* Search and Filter Bar */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-3 sm:p-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by email or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#e21c21]/50 text-sm"
            />
          </div>

          {/* Filter Buttons - General */}
          <div className="flex gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-[#e21c21] text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('admin')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                filterType === 'admin'
                  ? 'bg-[#e21c21] text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Admins
            </button>
            <button
              onClick={() => setFilterType('with_teams')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                filterType === 'with_teams'
                  ? 'bg-[#e21c21] text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setFilterType('with_orders')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
                filterType === 'with_orders'
                  ? 'bg-[#e21c21] text-white'
                  : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Orders
            </button>
          </div>
        </div>

        {/* User Type Filters */}
        <div className="flex gap-1.5 sm:gap-2 flex-wrap border-t border-gray-700/50 pt-3 sm:pt-4">
          <div className="text-gray-400 text-xs font-semibold w-full mb-1">User Types:</div>
          <button
            onClick={() => setFilterType('player')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              filterType === 'player'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Players
          </button>
          <button
            onClick={() => setFilterType('manager')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              filterType === 'manager'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Managers
          </button>
          <button
            onClick={() => setFilterType('athletic_director')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              filterType === 'athletic_director'
                ? 'bg-green-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Athletic Directors
          </button>
          <button
            onClick={() => setFilterType('hybrid')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm transition-all whitespace-nowrap ${
              filterType === 'hybrid'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Hybrid
          </button>
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-2 sm:space-y-3">
        {loading ? (
          <div className="space-y-2 sm:space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-xl p-3 sm:p-4 animate-pulse">
                <div className="h-5 sm:h-6 bg-gray-700/50 rounded w-1/3 mb-2"></div>
                <div className="h-3 sm:h-4 bg-gray-700/50 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-3 sm:p-4 shadow-2xl hover:border-[#e21c21]/50 transition-all cursor-pointer group"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                {/* User Info */}
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#e21c21]/20 to-[#a01519]/20 flex items-center justify-center flex-shrink-0 border-2 border-[#e21c21]/30">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.full_name || user.email}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[#e21c21] font-bold text-base sm:text-lg">
                        {(user.full_name || user.email).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-white font-semibold truncate text-sm sm:text-base">
                        {user.full_name || user.email}
                      </h3>
                      {user.is_admin && (
                        <span className="px-1.5 sm:px-2 py-0.5 bg-[#e21c21]/20 text-[#e21c21] text-[10px] sm:text-xs font-semibold rounded border border-[#e21c21]/50 whitespace-nowrap">
                          ADMIN
                        </span>
                      )}
                      {getUserTypeBadge(user.user_type)}
                    </div>
                    {user.full_name && (
                      <p className="text-gray-400 text-xs sm:text-sm truncate">{user.email}</p>
                    )}
                    <p className="text-gray-500 text-[10px] sm:text-xs mt-1">
                      Joined {formatDate(user.created_at)}
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 sm:gap-6 text-center justify-around sm:justify-start border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-700/50">
                  <div>
                    <div className="text-white font-bold text-base sm:text-lg">{user.team_count}</div>
                    <div className="text-gray-400 text-[10px] sm:text-xs">Teams</div>
                  </div>
                  <div>
                    <div className="text-white font-bold text-base sm:text-lg">{user.order_count}</div>
                    <div className="text-gray-400 text-[10px] sm:text-xs">Orders</div>
                  </div>
                  <div>
                    <div className="text-green-400 font-bold text-base sm:text-lg">
                      {formatCurrency(user.total_spent_cents)}
                    </div>
                    <div className="text-gray-400 text-[10px] sm:text-xs">Spent</div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            {searchTerm || filterType !== 'all' ? 'No users match your filters' : 'No users found'}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onRefresh={fetchUsers}
        />
      )}
    </div>
  );
}
