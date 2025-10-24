'use client';

import { memo } from 'react';
import Link from 'next/link';

interface EmptyStateProps {
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

const EmptyState = memo(function EmptyState({ hasActiveFilters, onClearFilters }: EmptyStateProps) {
  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-6 sm:p-8 md:p-12 text-center overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <div className="max-w-md mx-auto relative">
        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#e21c21]/10 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 border border-[#e21c21]/30">
          <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">No designs found</h3>
        <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6">
          {hasActiveFilters ? 'Try adjusting your filters or search query' : 'Get started by creating your first design'}
        </p>
        {hasActiveFilters ? (
          <button
            onClick={onClearFilters}
            className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">Clear All Filters</span>
          </button>
        ) : (
          <Link
            href="/admin/designs/new"
            className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="relative">Create your first design</span>
          </Link>
        )}
      </div>
    </div>
  );
});

export default EmptyState;
