'use client';

import { memo } from 'react';

interface ViewModeToggleProps {
  viewMode: 'grid' | 'list';
  onToggle: () => void;
  totalDesigns: number;
  filteredCount: number;
}

const ViewModeToggle = memo(function ViewModeToggle({
  viewMode,
  onToggle,
  totalDesigns,
  filteredCount,
}: ViewModeToggleProps) {
  return (
    <div className="mb-4 sm:mb-6 flex items-center justify-between">
      <div className="text-xs sm:text-sm text-gray-400">
        Showing {filteredCount} of {totalDesigns} design{totalDesigns !== 1 ? 's' : ''}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800/50 border border-gray-700 rounded-lg p-0.5 sm:p-1">
        <button
          onClick={onToggle}
          className={`p-1.5 sm:p-2 rounded transition-all ${
            viewMode === 'grid' ? 'bg-[#e21c21] text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Grid view"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
        <button
          onClick={onToggle}
          className={`p-1.5 sm:p-2 rounded transition-all ${
            viewMode === 'list' ? 'bg-[#e21c21] text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="List view"
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default ViewModeToggle;
