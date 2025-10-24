'use client';

import { memo } from 'react';

interface SearchAndFiltersProps {
  searchQuery: string;
  statusFilter: string;
  sportFilter: string;
  sortBy: string;
  uniqueSports: string[];
  hasActiveFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSportChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onClearFilters: () => void;
}

const SearchAndFilters = memo(function SearchAndFilters({
  searchQuery,
  statusFilter,
  sportFilter,
  sortBy,
  uniqueSports,
  hasActiveFilters,
  onSearchChange,
  onStatusChange,
  onSportChange,
  onSortChange,
  onClearFilters,
}: SearchAndFiltersProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-3 sm:p-4 mb-3 sm:mb-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search designs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 pl-9 sm:pl-10 bg-black/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 placeholder-gray-500 text-xs sm:text-sm"
          />
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg text-xs sm:text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Draft</option>
          </select>

          {/* Sport Filter */}
          <select
            value={sportFilter}
            onChange={(e) => onSportChange(e.target.value)}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg text-xs sm:text-sm"
          >
            <option value="all">All Sports</option>
            {uniqueSports.map((sport) => (
              <option key={sport} value={sport}>
                {sport.charAt(0).toUpperCase() + sport.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg text-xs sm:text-sm"
          >
            <option value="newest">Newest</option>
            <option value="name-asc">A-Z</option>
            <option value="name-desc">Z-A</option>
            <option value="featured">Featured</option>
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-2 sm:px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/30 text-xs sm:text-sm font-medium whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default SearchAndFilters;
