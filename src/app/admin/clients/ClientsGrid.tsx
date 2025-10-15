'use client';

import { useState, useMemo } from 'react';
import ClientCard from './ClientCard';
import type { ClientSummary } from '@/types/clients';

interface ClientsGridProps {
  initialClients: ClientSummary[];
}

type SortOption = 'name' | 'orders' | 'revenue' | 'created';
type FilterOption = 'all' | 'active' | 'pending' | 'completed';

export default function ClientsGrid({ initialClients }: ClientsGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('created');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  // Filter clients
  const filteredClients = useMemo(() => {
    let filtered = initialClients;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.sport_name.toLowerCase().includes(query) ||
          client.manager_email?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterBy !== 'all') {
      filtered = filtered.filter((client) => {
        if (filterBy === 'active') return client.active_orders > 0;
        if (filterBy === 'pending') return client.pending_orders > 0;
        if (filterBy === 'completed') return client.completed_orders > 0;
        return true;
      });
    }

    // Apply sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'orders':
          return b.total_orders - a.total_orders;
        case 'revenue':
          return b.total_revenue_cents - a.total_revenue_cents;
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [initialClients, searchQuery, sortBy, filterBy]);

  return (
    <div className="space-y-4 sm:space-y-5 md:space-y-6">
      {/* Controls */}
      <div className="bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search clients by name, sport, or manager..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 text-xs sm:text-sm"
            >
              <option value="all">All Clients</option>
              <option value="active">Active Orders</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 text-xs sm:text-sm"
            >
              <option value="created">Newest First</option>
              <option value="name">Name (A-Z)</option>
              <option value="orders">Most Orders</option>
              <option value="revenue">Highest Revenue</option>
            </select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="text-gray-400">
            <span className="text-white font-semibold">{filteredClients.length}</span> clients
          </div>
          <div className="text-gray-400">
            <span className="text-white font-semibold">
              {filteredClients.reduce((sum, c) => sum + c.total_orders, 0)}
            </span>{' '}
            total orders
          </div>
          <div className="text-gray-400">
            <span className="text-white font-semibold">
              ${(filteredClients.reduce((sum, c) => sum + c.total_revenue_cents, 0) / 100).toLocaleString()}
            </span>{' '}
            total revenue
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-500 text-base sm:text-lg">No clients found</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-3 sm:mt-4 text-[#e21c21] hover:text-[#ff2428] transition-colors text-sm sm:text-base"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}
